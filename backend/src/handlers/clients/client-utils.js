/**
 * 客户工具功能
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { generateNextPersonalClientId, isValidTaxId } from "./utils.js";
import { deleteKVCacheByPrefix, invalidateD1CacheByType } from "../../utils/cache.js";

/**
 * 获取下一个个人客户ID
 */
export async function handleGetNextPersonalClientId(request, env, ctx, requestId, url) {
  const nextId = await generateNextPersonalClientId(env);
  
  return successResponse({
    next_id: nextId,
    is_safe: !isValidTaxId(nextId)
  }, "已生成下一個個人客戶編號", requestId);
}

/**
 * 批量分配负责人（支持快速移转功能）
 */
export async function handleBatchAssign(request, env, ctx, requestId, url) {
  const body = await request.json();
  const clientIds = Array.isArray(body?.client_ids) ? body.client_ids.map(String) : [];
  const assigneeUserId = Number(body?.assignee_user_id || 0);
  const fromAssigneeUserId = body?.from_assignee_user_id != null ? Number(body.from_assignee_user_id) : null;
  const includeUnassigned = Boolean(body?.include_unassigned);
  const tagIds = Array.isArray(body?.tag_ids) ? body.tag_ids.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0) : [];
  const keyword = (body?.q || '').trim();
  const dryRun = body?.dry_run === true;
  
  // 验证：至少需要 client_ids、from_assignee_user_id 或 include_unassigned 之一
  if (clientIds.length === 0 && !includeUnassigned && (fromAssigneeUserId == null || !Number.isInteger(fromAssigneeUserId) || fromAssigneeUserId <= 0)) {
    return errorResponse(422, "VALIDATION_ERROR", "請選擇客戶、或指定目前負責人、或勾選包含未分配", null, requestId);
  }
  
  // 验证新负责人（预览模式允许 -1）
  if (!dryRun && (!Number.isInteger(assigneeUserId) || assigneeUserId <= 0)) {
    return errorResponse(422, "VALIDATION_ERROR", "請選擇負責人員", null, requestId);
  }
  
  // 验证：新负责人不能和目前负责人相同
  if (fromAssigneeUserId && fromAssigneeUserId === assigneeUserId) {
    return errorResponse(422, "VALIDATION_ERROR", "新負責人不得與目前負責人相同", null, requestId);
  }
  
  // 验证负责人存在（预览模式跳过）
  if (!dryRun) {
    const userExists = await env.DATABASE.prepare(
      `SELECT 1 FROM Users WHERE user_id = ? AND is_deleted = 0 LIMIT 1`
    ).bind(assigneeUserId).first();
    if (!userExists) {
      return errorResponse(422, "VALIDATION_ERROR", "負責人不存在", null, requestId);
    }
  }
  
  // 构建查询条件，获取目标客户ID列表
  let targetClientIds = [...clientIds];
  
  if (targetClientIds.length === 0) {
    // 需要根据 from_assignee_user_id、include_unassigned、tag_ids、keyword 筛选客户
    const conditions = [];
    const binds = [];
    
    // 基础条件：未删除
    conditions.push("is_deleted = 0");
    
    // 负责人筛选
    if (fromAssigneeUserId && Number.isInteger(fromAssigneeUserId) && fromAssigneeUserId > 0) {
      if (includeUnassigned) {
        // 包含未分配：目前负责人为指定ID或NULL
        conditions.push("(assignee_user_id = ? OR assignee_user_id IS NULL)");
        binds.push(fromAssigneeUserId);
      } else {
        // 只筛选指定负责人
        conditions.push("assignee_user_id = ?");
        binds.push(fromAssigneeUserId);
      }
    } else if (includeUnassigned) {
      // 只包含未分配
      conditions.push("assignee_user_id IS NULL");
    }
    
    // 关键字筛选
    if (keyword) {
      conditions.push("(company_name LIKE ? OR tax_registration_number LIKE ?)");
      const keywordPattern = `%${keyword}%`;
      binds.push(keywordPattern, keywordPattern);
    }
    
    // 标签筛选
    if (tagIds.length > 0) {
      const tagPlaceholders = tagIds.map(() => '?').join(',');
      conditions.push(`client_id IN (
        SELECT client_id FROM ClientTagAssignments 
        WHERE tag_id IN (${tagPlaceholders})
        GROUP BY client_id
        HAVING COUNT(DISTINCT tag_id) = ?
      )`);
      binds.push(...tagIds, tagIds.length);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT client_id FROM Clients ${whereClause}`;
    
    const rows = await env.DATABASE.prepare(query).bind(...binds).all();
    targetClientIds = rows.results?.map(r => String(r.client_id)) || [];
  }
  
  if (targetClientIds.length === 0) {
    return successResponse({
      match_count: 0,
      sample: [],
      updated_count: 0
    }, dryRun ? "預覽完成（無符合條件的客戶）" : "無符合條件的客戶", requestId);
  }
  
  if (dryRun) {
    // 预览模式：返回将要更新的客户列表（最多返回20个样本）
    const placeholders = targetClientIds.map(() => '?').join(',');
    const rows = await env.DATABASE.prepare(
      `SELECT client_id, company_name, assignee_user_id 
       FROM Clients 
       WHERE client_id IN (${placeholders}) AND is_deleted = 0
       LIMIT 20`
    ).bind(...targetClientIds).all();
    
    return successResponse({
      match_count: targetClientIds.length,
      sample: rows.results?.map(r => ({
        client_id: r.client_id,
        company_name: r.company_name
      })) || []
    }, "預覽完成", requestId);
  }
  
  // 执行批量更新
  const placeholders = targetClientIds.map(() => '?').join(',');
  const result = await env.DATABASE.prepare(
    `UPDATE Clients 
     SET assignee_user_id = ?, updated_at = datetime('now')
     WHERE client_id IN (${placeholders}) AND is_deleted = 0`
  ).bind(assigneeUserId, ...targetClientIds).run();
  
  // 清除缓存
  await Promise.all([
    deleteKVCacheByPrefix(env, 'clients_list'),
    invalidateD1CacheByType(env, 'clients_list')
  ]).catch(() => {});
  
  return successResponse({
    updated_count: result.meta?.changes || targetClientIds.length,
    assignee_user_id: assigneeUserId
  }, "批量分配完成", requestId);
}

