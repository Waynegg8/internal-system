/**
 * 客户基本CRUD操作
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { generateCacheKey, getKVCache, saveKVCache, getD1Cache, saveD1Cache, deleteKVCacheByPrefix, invalidateD1CacheByType } from "../../utils/cache.js";
import { isValidTaxId, generateNextPersonalClientId } from "./utils.js";

/**
 * 获取客户列表
 */
export async function handleClientList(request, env, ctx, requestId, url) {
  try {
    const user = ctx?.user;
    const params = url.searchParams;
  const page = Math.max(1, parseInt(params.get("page") || "1", 10));
  const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "50", 10)));
  const offset = (page - 1) * perPage;
  const searchQuery = (params.get("q") || "").trim();
  const tagId = params.get("tag_id") || "";
  const noCache = params.get("no_cache") === "1" || request.headers.get('x-no-cache') === '1';
  
  // 如果不是管理員，需要根據用戶篩選客戶
  const userId = user?.user_id;
  const isAdmin = user?.is_admin || false;
  
  const cacheKey = generateCacheKey('clients_list', { page, perPage, q: searchQuery, tag_id: tagId, userId: isAdmin ? null : userId, v: 'v4' });
  
  if (!noCache) {
    const kvCached = await getKVCache(env, cacheKey);
    if (kvCached?.data) {
      return successResponse(kvCached.data.list, "成功（KV缓存）", requestId, {
        ...kvCached.data.meta,
        cache_source: 'kv'
      });
    }
    
    const d1Cached = await getD1Cache(env, cacheKey);
    if (d1Cached?.data) {
      saveKVCache(env, cacheKey, 'clients_list', d1Cached.data, { ttl: 3600 }).catch(() => {});
      return successResponse(d1Cached.data.list, "成功（D1缓存）", requestId, {
        ...d1Cached.data.meta,
        cache_source: 'd1'
      });
    }
  }
  
  const where = ["c.is_deleted = 0"];
  const binds = [];
  
  // 如果不是管理員，只顯示該員工負責的客戶、曾經填過工時的客戶、或被授權協作的客戶
  if (!isAdmin && userId) {
    where.push(`(
      c.assignee_user_id = ? 
      OR EXISTS (
        SELECT 1 FROM Timesheets t 
        WHERE t.client_id = c.client_id 
          AND t.user_id = ? 
          AND t.is_deleted = 0
        LIMIT 1
      )
      OR EXISTS (
        SELECT 1 FROM ClientCollaborators cc
        WHERE cc.client_id = c.client_id
          AND cc.user_id = ?
      )
    )`);
    binds.push(userId, userId, userId);
  }
  
  if (searchQuery) {
    where.push("(c.company_name LIKE ? OR c.tax_registration_number LIKE ?)");
    binds.push(`%${searchQuery}%`, `%${searchQuery}%`);
  }
  
  if (tagId) {
    where.push("EXISTS (SELECT 1 FROM ClientTagAssignments cta2 WHERE cta2.client_id = c.client_id AND cta2.tag_id = ?)");
    binds.push(tagId);
  }
  
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const countRow = await env.DATABASE.prepare(
    `SELECT COUNT(*) as total FROM Clients c ${whereSql}`
  ).bind(...binds).first();
  const total = Number(countRow?.total || 0);
  
  const rows = await env.DATABASE.prepare(
    `SELECT c.client_id, c.company_name, c.tax_registration_number, 
            c.phone, c.email, c.created_at, c.assignee_user_id
     FROM Clients c
     ${whereSql}
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(...binds, perPage, offset).all();
  
  const clientIds = (rows?.results || []).map(r => r.client_id);
  const usersMap = {};
  const tagsMap = {};
  const serviceCountMap = {};
  const yearTotalMap = {};
  
  if (clientIds.length > 0) {
    // 批量获取负责人
    const assigneeIds = [...new Set((rows?.results || []).map(r => r.assignee_user_id).filter(Boolean))];
    if (assigneeIds.length > 0) {
      const placeholders = assigneeIds.map(() => '?').join(',');
      const usersRows = await env.DATABASE.prepare(
        `SELECT user_id, name FROM Users WHERE user_id IN (${placeholders}) AND is_deleted = 0`
      ).bind(...assigneeIds).all();
      
      usersRows.results?.forEach(u => {
        usersMap[u.user_id] = u.name;
      });
    }
    
    // 批量获取标签
    const placeholders = clientIds.map(() => '?').join(',');
    const tagsRows = await env.DATABASE.prepare(
      `SELECT cta.client_id, t.tag_id, t.tag_name, t.tag_color
       FROM ClientTagAssignments cta
       JOIN CustomerTags t ON t.tag_id = cta.tag_id
       WHERE cta.client_id IN (${placeholders})`
    ).bind(...clientIds).all();
    
    tagsRows.results?.forEach(row => {
      if (!tagsMap[row.client_id]) {
        tagsMap[row.client_id] = [];
      }
      tagsMap[row.client_id].push({
        tag_id: row.tag_id,
        tag_name: row.tag_name,
        tag_color: row.tag_color || null
      });
    });
    
    // 批量获取服务数量
    const svcCountRows = await env.DATABASE.prepare(
      `SELECT cs.client_id, COUNT(1) AS svc_count
       FROM ClientServices cs
       WHERE cs.client_id IN (${placeholders}) AND cs.is_deleted = 0
       GROUP BY cs.client_id`
    ).bind(...clientIds).all();
    svcCountRows.results?.forEach(r => { serviceCountMap[r.client_id] = Number(r.svc_count || 0); });
    
    // 批量汇总全年收费总额
    const yearTotalRows = await env.DATABASE.prepare(
      `SELECT cs.client_id, SUM(COALESCE(sbs.billing_amount, 0)) AS total_amount
       FROM ClientServices cs
       LEFT JOIN ServiceBillingSchedule sbs ON sbs.client_service_id = cs.client_service_id
       WHERE cs.client_id IN (${placeholders}) AND cs.is_deleted = 0
       GROUP BY cs.client_id`
    ).bind(...clientIds).all();
    yearTotalRows.results?.forEach(r => { yearTotalMap[r.client_id] = Number(r.total_amount || 0); });
  }
  
  const data = (rows?.results || []).map(r => ({
    clientId: r.client_id,
    companyName: r.company_name,
    taxId: r.tax_registration_number,
    contact_person_1: "", // Clients表没有contact_person_1字段
    assigneeName: r.assignee_user_id ? (usersMap[r.assignee_user_id] || "未分配") : "未分配",
    tags: tagsMap[r.client_id] || [],
    services_count: serviceCountMap[r.client_id] || 0,
    phone: r.phone || "",
    email: r.email || "",
    createdAt: r.created_at,
    year_total: yearTotalMap[r.client_id] || 0
  }));
  
  const meta = { page, perPage, total, hasNext: offset + perPage < total };
  const cacheData = { list: data, meta };
  
  if (!noCache) {
    await Promise.all([
      saveKVCache(env, cacheKey, 'clients_list', cacheData, { ttl: 3600 }),
      saveD1Cache(env, cacheKey, 'clients_list', cacheData, {})
    ]).catch(() => {});
  }
  
  return successResponse(data, "成功", requestId, meta);
  } catch (err) {
    console.error(`[ClientList] Error:`, err);
    const errorMessage = err?.message || String(err);
    const errorStack = err?.stack || '';
    const errorDetail = env.APP_ENV && env.APP_ENV !== "prod" ? { error: errorMessage, stack: errorStack } : null;
    return errorResponse(500, "INTERNAL_ERROR", `獲取客戶列表失敗: ${errorMessage}`, errorDetail, requestId);
  }
}

/**
 * 获取客户详情
 */
export async function handleClientDetail(request, env, ctx, requestId, match, url) {
  const clientId = match[1];
  const params = url.searchParams;
  const noCache = params.get("no_cache") === "1" || request.headers.get('x-no-cache') === '1';
  
  const cacheKey = generateCacheKey('client_detail', { clientId });
  
  if (!noCache) {
    const kvCached = await getKVCache(env, cacheKey);
    
    if (kvCached?.data) {
      return successResponse(kvCached.data, "查詢成功（KV缓存）", requestId);
    }
  }
  
  const row = await env.DATABASE.prepare(
    `SELECT c.client_id, c.company_name, c.tax_registration_number, 
            c.phone, c.email, c.client_notes, c.payment_notes, c.created_at, c.updated_at,
            u.user_id as assignee_id, u.name as assignee_name,
            GROUP_CONCAT(t.tag_id || ':' || t.tag_name || ':' || COALESCE(t.tag_color, ''), '|') as tags
     FROM Clients c
     LEFT JOIN Users u ON u.user_id = c.assignee_user_id
     LEFT JOIN ClientTagAssignments a ON a.client_id = c.client_id
     LEFT JOIN CustomerTags t ON t.tag_id = a.tag_id
     WHERE c.client_id = ? AND c.is_deleted = 0
     GROUP BY c.client_id`
  ).bind(clientId).first();
  
  if (!row) {
    return errorResponse(404, "NOT_FOUND", "客戶不存在", null, requestId);
  }
  
  // 解析标签
  const tags = [];
  if (row.tags) {
    String(row.tags).split('|').forEach(part => {
      const [id, name, color] = part.split(':');
      if (id && name) {
        tags.push({
          tag_id: parseInt(id),
          tag_name: name,
          tag_color: color || null
        });
      }
    });
  }
  
  // 查询客户服務列表（包含完整資訊）
  const servicesRows = await env.DATABASE.prepare(
    `SELECT cs.client_service_id, cs.service_id, cs.status, cs.service_cycle,
            cs.task_template_id, cs.auto_generate_tasks, cs.start_date, cs.end_date,
            cs.task_configs_count, cs.created_at, cs.updated_at,
            s.service_name, s.service_code
     FROM ClientServices cs
     LEFT JOIN Services s ON s.service_id = cs.service_id
     WHERE cs.client_id = ? AND cs.is_deleted = 0
     ORDER BY cs.client_service_id ASC`
  ).bind(clientId).all();
  
  console.log('[ClientDetail] Services query result:', {
    clientId,
    rowCount: servicesRows?.results?.length || 0,
    hasResults: !!servicesRows?.results,
    results: servicesRows?.results
  });
  
  const services = await Promise.all((servicesRows?.results || []).map(async (svc) => {
    // 查詢計費排程
    const billingRows = await env.DATABASE.prepare(
      `SELECT billing_month, billing_amount, payment_due_days, notes
       FROM ServiceBillingSchedule
       WHERE client_service_id = ?
       ORDER BY billing_month ASC`
    ).bind(svc.client_service_id).all();
    
    const billing_schedule = (billingRows?.results || []).map(b => ({
      billing_month: b.billing_month,
      billing_amount: Number(b.billing_amount || 0),
      payment_due_days: Number(b.payment_due_days || 30),
      notes: b.notes || ""
    }));
    
    // 查詢任務配置數量（如果 task_configs_count 不準確）
    const taskConfigsCount = await env.DATABASE.prepare(
      `SELECT COUNT(*) as count
       FROM ClientServiceTaskConfigs
       WHERE client_service_id = ? AND is_deleted = 0`
    ).bind(svc.client_service_id).first();
    
    const actualTaskConfigsCount = Number(taskConfigsCount?.count || 0);
    
    // 如果資料表中的計數不準確，更新它
    if (actualTaskConfigsCount !== (svc.task_configs_count || 0)) {
      await env.DATABASE.prepare(
        `UPDATE ClientServices SET task_configs_count = ? WHERE client_service_id = ?`
      ).bind(actualTaskConfigsCount, svc.client_service_id).run().catch(() => {});
    }
    
    // 返回駝峰命名格式的數據（前端期望的格式）
    return {
      client_service_id: svc.client_service_id,
      clientServiceId: svc.client_service_id,  // 駝峰格式
      service_id: svc.service_id,
      serviceId: svc.service_id,  // 駝峰格式
      service_name: svc.service_name || "",
      serviceName: svc.service_name || "",  // 駝峰格式
      service_code: svc.service_code || "",
      serviceCode: svc.service_code || "",  // 駝峰格式
      status: svc.status || "active",
      service_cycle: svc.service_cycle || "monthly",
      serviceCycle: svc.service_cycle || "monthly",  // 駝峰格式
      task_template_id: svc.task_template_id || null,
      taskTemplateId: svc.task_template_id || null,  // 駝峰格式
      auto_generate_tasks: Boolean(svc.auto_generate_tasks),
      autoGenerateTasks: Boolean(svc.auto_generate_tasks),  // 駝峰格式
      start_date: svc.start_date || null,
      startDate: svc.start_date || null,  // 駝峰格式
      end_date: svc.end_date || null,
      endDate: svc.end_date || null,  // 駝峰格式
      task_configs_count: actualTaskConfigsCount,
      taskConfigsCount: actualTaskConfigsCount,  // 駝峰格式
      billing_schedule: billing_schedule,
      billingSchedule: billing_schedule,  // 駝峰格式
      year_total: billing_schedule.reduce((sum, b) => sum + b.billing_amount, 0),
      yearTotal: billing_schedule.reduce((sum, b) => sum + b.billing_amount, 0),  // 駝峰格式
      created_at: svc.created_at,
      createdAt: svc.created_at,  // 駝峰格式
      updated_at: svc.updated_at,
      updatedAt: svc.updated_at  // 駝峰格式
    };
  }));
  
  const data = {
    client_id: row.client_id,  // 保留下劃線格式以確保兼容性
    clientId: row.client_id,
    companyName: row.company_name,
    taxId: row.tax_registration_number,
    contact_person_1: "", // Clients表没有contact_person_1字段
    contact_person_2: "", // Clients表没有contact_person_2字段
    assigneeUserId: row.assignee_id,
    assigneeName: row.assignee_name || "",
    phone: row.phone || "",
    email: row.email || "",
    clientNotes: row.client_notes || "",
    paymentNotes: row.payment_notes || "",
    tags: tags,
    services: services,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
  
  await saveKVCache(env, cacheKey, 'client_detail', data, { ttl: 3600 }).catch(() => {});
  
  return successResponse(data, "查詢成功", requestId);
}

/**
 * 创建客户
 */
export async function handleCreateClient(request, env, ctx, requestId, url) {
  const body = await request.json();
  
  // 支持駝峰和下劃線兩種命名方式
  const companyName = body.companyName || body.company_name;
  const assigneeUserId = body.assigneeUserId || body.assignee_user_id;
  const clientId = body.clientId || body.client_id;
  const taxId = body.taxId || body.tax_registration_number || body.tax_id;
  const phone = body.phone;
  const email = body.email;
  const clientNotes = body.clientNotes || body.client_notes || body.notes;
  const paymentNotes = body.paymentNotes || body.payment_notes || body.billing_notes;
  const contactPerson1 = body.contactPerson1 || body.contact_person_1 || body.contact_person;
  const contactPerson2 = body.contactPerson2 || body.contact_person_2;
  
  const errors = [];
  if (!companyName) errors.push({ field: "companyName", message: "必填" });
  if (!assigneeUserId) errors.push({ field: "assigneeUserId", message: "必填" });
  
  if (errors.length > 0) {
    return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
  }
  
  // 生成客户ID
  let finalClientId = clientId;
  if (!finalClientId) {
    if (taxId && isValidTaxId(taxId)) {
      finalClientId = taxId;
    } else {
      finalClientId = await generateNextPersonalClientId(env);
    }
  }
  
  await env.DATABASE.prepare(
    `INSERT INTO Clients (client_id, company_name, tax_registration_number,
                         phone, email, assignee_user_id, client_notes, payment_notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  ).bind(
    finalClientId,
    companyName,
    taxId || null,
    phone || null,
    email || null,
    assigneeUserId,
    clientNotes || null,
    paymentNotes || null
  ).run();
  
  // 清除缓存
  await Promise.all([
    deleteKVCacheByPrefix(env, 'clients_list'),
    invalidateD1CacheByType(env, 'clients_list')
  ]).catch(() => {});
  
  // 返回駝峰和下劃線兩種格式以保持兼容性
  return successResponse({ 
    clientId: finalClientId,
    client_id: finalClientId 
  }, "客戶已創建", requestId);
}

/**
 * 更新客户
 */
export async function handleUpdateClient(request, env, ctx, requestId, match, url) {
  const clientId = match[1];
  const user = ctx?.user;
  const body = await request.json();
  
  // 檢查客戶是否存在並獲取負責人信息
  const client = await env.DATABASE.prepare(
    `SELECT client_id, assignee_user_id FROM Clients WHERE client_id = ? AND is_deleted = 0`
  ).bind(clientId).first();
  
  if (!client) {
    return errorResponse(404, "NOT_FOUND", "客戶不存在", null, requestId);
  }
  
  // 權限檢查：只有管理員或客戶負責人可以修改客戶資料
  if (!user.is_admin && client.assignee_user_id !== user.user_id) {
    return errorResponse(403, "FORBIDDEN", "無權限修改此客戶資料", null, requestId);
  }
  
  await env.DATABASE.prepare(
    `UPDATE Clients 
     SET company_name = ?, tax_registration_number = ?,
         phone = ?, email = ?, assignee_user_id = ?, client_notes = ?, payment_notes = ?,
         updated_at = datetime('now')
     WHERE client_id = ? AND is_deleted = 0`
  ).bind(
    body.company_name,
    body.tax_registration_number || null,
    body.phone || null,
    body.email || null,
    body.assignee_user_id || null,
    body.client_notes || null,
    body.payment_notes || null,
    clientId
  ).run();
  
  // 清除缓存
  await Promise.all([
    deleteKVCacheByPrefix(env, 'clients_list'),
    deleteKVCacheByPrefix(env, `client_detail:clientId=${clientId}`),
    invalidateD1CacheByType(env, 'clients_list'),
    invalidateD1CacheByType(env, 'client_detail')
  ]).catch(() => {});
  
  return successResponse({ clientId }, "客戶已更新", requestId);
}

/**
 * 删除客户
 */
export async function handleDeleteClient(request, env, ctx, requestId, match, url) {
  const clientId = match[1];
  const user = ctx?.user;
  
  // 檢查客戶是否存在
  const client = await env.DATABASE.prepare(
    `SELECT client_id FROM Clients WHERE client_id = ? AND is_deleted = 0`
  ).bind(clientId).first();
  
  if (!client) {
    return errorResponse(404, "NOT_FOUND", "客戶不存在", null, requestId);
  }
  
  // 權限檢查：只有管理員可以刪除客戶
  if (!user.is_admin) {
    return errorResponse(403, "FORBIDDEN", "只有管理員可以刪除客戶", null, requestId);
  }
  
  await env.DATABASE.prepare(
    `UPDATE Clients SET is_deleted = 1, deleted_at = datetime('now'), deleted_by = ? WHERE client_id = ?`
  ).bind(user.user_id, clientId).run();
  
  // 清除缓存
  await Promise.all([
    deleteKVCacheByPrefix(env, 'clients_list'),
    deleteKVCacheByPrefix(env, `client_detail:clientId=${clientId}`),
    invalidateD1CacheByType(env, 'clients_list'),
    invalidateD1CacheByType(env, 'client_detail')
  ]).catch(() => {});
  
  return successResponse({ clientId }, "客戶已刪除", requestId);
}

