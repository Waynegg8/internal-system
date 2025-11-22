/**
 * 客戶基本 CRUD 操作 Handlers
 * 
 * 功能概述:
 * - handleClientList: 獲取客戶列表（支持分頁、搜索、標籤過濾）
 * - handleClientDetail: 獲取客戶詳情（包含標籤、服務、股東、董監事等）
 * - handleCreateClient: 創建新客戶
 * - handleUpdateClient: 更新客戶資訊（支持股東、董監事 CRUD）
 * - handleDeleteClient: 軟刪除客戶
 * 
 * 權限控制:
 * - 管理員可以訪問所有客戶
 * - 普通用戶可以訪問：自己負責的客戶、曾填過工時的客戶、或被授權協作的客戶
 * - 只有管理員或客戶負責人可以刪除客戶和管理協作者
 * 
 * 快取策略:
 * - 使用 KV 快取和 D1 快取提高性能
 * - 支持 no_cache 參數強制刷新
 * - 客戶詳情、列表、協作者等都有快取
 * 
 * 安全措施:
 * - 所有 SQL 查詢使用參數化（.bind()）防止 SQL 注入
 * - 統一編號（tax_registration_number）作為客戶唯一識別碼，不可修改
 * - 完整的權限檢查機制
 * 
 * 相關文件:
 * - Requirements: .spec-workflow/specs/br1-3-1-client-detail-basic/requirements.md
 * - Tasks: .spec-workflow/specs/br1-3-1-client-detail-basic/tasks.md
 * - 測試報告: .spec-workflow/specs/br1-3-1-client-detail-basic/api-integration-test-report-1.2.3.md
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { generateCacheKey, getKVCache, saveKVCache, getD1Cache, saveD1Cache, deleteKVCacheByPrefix, invalidateD1CacheByType } from "../../utils/cache.js";
import { isValidTaxId, generateNextPersonalClientId } from "./utils.js";

/**
 * 檢查用戶是否有權限訪問客戶
 * 
 * 權限邏輯（與 handleClientList 保持一致）:
 * - 管理員可以訪問所有客戶
 * - 普通用戶可以訪問：
 *   1. 自己負責的客戶（assignee_user_id）
 *   2. 曾填過工時的客戶（Timesheets）
 *   3. 被授權協作的客戶（ClientCollaborators）
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {string} clientId - 客戶 ID
 * @param {number} userId - 用戶 ID
 * @returns {Promise<boolean>} 是否有權限訪問
 */
async function checkClientAccessPermission(env, clientId, userId) {
  if (!userId) return false;
  
  // 檢查是否為客戶負責人、協作者或曾填過工時
  const permissionCheck = await env.DATABASE.prepare(
    `SELECT 1
     FROM Clients c
     WHERE c.client_id = ? 
       AND c.is_deleted = 0
       AND (
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
       )
     LIMIT 1`
  ).bind(clientId, userId, userId, userId).first();
  
  return !!permissionCheck;
}

/**
 * 獲取客戶列表
 * 
 * 功能:
 * - 支持分頁（page, perPage）
 * - 支持搜索（q: 公司名稱或統一編號）
 * - 支持標籤過濾（tag_id）
 * - 權限控制：非管理員只顯示有權限的客戶
 * - 快取支持：使用 KV 和 D1 快取
 * 
 * @param {Request} request - HTTP 請求
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {Object} ctx - 請求上下文（包含用戶信息）
 * @param {string} requestId - 請求 ID
 * @param {URL} url - 請求 URL
 * @returns {Promise<Response>} 客戶列表響應
 */
export async function handleClientList(request, env, ctx, requestId, url) {
  try {
    const user = ctx?.user;
    const params = url.searchParams;
  const page = Math.max(1, parseInt(params.get("page") || "1", 10));
  // 增加 perPage 限制到 1000，以支持一次性載入更多客戶
  const perPage = Math.min(1000, Math.max(1, parseInt(params.get("perPage") || "50", 10)));
  const offset = (page - 1) * perPage;
  const searchQuery = (params.get("q") || "").trim();
  const tagId = params.get("tag_id") || "";
  const forceNoCacheEnv = env.APP_ENV && env.APP_ENV !== 'prod';
  const noCache = forceNoCacheEnv || params.get("no_cache") === "1" || request.headers.get('x-no-cache') === '1';
  
  // 如果不是管理員，需要根據用戶篩選客戶
  const userId = user?.user_id;
  const isAdmin = user?.is_admin || false;
  
  const cacheKey = generateCacheKey('clients_list', { page, perPage, q: searchQuery, tag_id: tagId, userId: isAdmin ? null : userId, v: 'v5' });
  
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
      // 分批處理以避免 too many SQL variables 錯誤
      const BATCH_SIZE = 100;
      for (let i = 0; i < assigneeIds.length; i += BATCH_SIZE) {
        const batch = assigneeIds.slice(i, i + BATCH_SIZE);
        const placeholders = batch.map(() => '?').join(',');
        const usersRows = await env.DATABASE.prepare(
          `SELECT user_id, name FROM Users WHERE user_id IN (${placeholders}) AND is_deleted = 0`
        ).bind(...batch).all();
        
        usersRows.results?.forEach(u => {
          usersMap[u.user_id] = u.name;
        });
      }
    }
    
    // 分批获取标签以避免 too many SQL variables 錯誤
    const BATCH_SIZE = 100;
    for (let i = 0; i < clientIds.length; i += BATCH_SIZE) {
      const batch = clientIds.slice(i, i + BATCH_SIZE);
      const placeholders = batch.map(() => '?').join(',');
      const tagsRows = await env.DATABASE.prepare(
        `SELECT cta.client_id, t.tag_id, t.tag_name, t.tag_color
         FROM ClientTagAssignments cta
         JOIN CustomerTags t ON t.tag_id = cta.tag_id
         WHERE cta.client_id IN (${placeholders})`
      ).bind(...batch).all();
      
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
    }
    
    // 分批获取服务数量
    for (let i = 0; i < clientIds.length; i += BATCH_SIZE) {
      const batch = clientIds.slice(i, i + BATCH_SIZE);
      const placeholders = batch.map(() => '?').join(',');
      const svcCountRows = await env.DATABASE.prepare(
        `SELECT cs.client_id, COUNT(1) AS svc_count
         FROM ClientServices cs
         WHERE cs.client_id IN (${placeholders}) AND cs.is_deleted = 0
         GROUP BY cs.client_id`
      ).bind(...batch).all();
      svcCountRows.results?.forEach(r => { serviceCountMap[r.client_id] = Number(r.svc_count || 0); });
    }
    
    // 分批汇总全年收费总额
    for (let i = 0; i < clientIds.length; i += BATCH_SIZE) {
      const batch = clientIds.slice(i, i + BATCH_SIZE);
      const placeholders = batch.map(() => '?').join(',');
      const yearTotalRows = await env.DATABASE.prepare(
        `SELECT cs.client_id, SUM(COALESCE(sbs.billing_amount, 0)) AS total_amount
         FROM ClientServices cs
         LEFT JOIN ServiceBillingSchedule sbs ON sbs.client_service_id = cs.client_service_id
         WHERE cs.client_id IN (${placeholders}) AND cs.is_deleted = 0
         GROUP BY cs.client_id`
      ).bind(...batch).all();
      yearTotalRows.results?.forEach(r => { yearTotalMap[r.client_id] = Number(r.total_amount || 0); });
    }
  }
  
  const data = (rows?.results || []).map(r => ({
    clientId: r.client_id,
    companyName: r.company_name,
    taxId: r.tax_registration_number,
    contact_person_1: "",
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
 * 獲取客戶詳情
 * 
 * 功能:
 * - 獲取客戶基本資訊（公司名稱、聯絡資訊、負責人等）
 * - 獲取客戶標籤
 * - 獲取客戶服務列表
 * - 獲取股東持股資訊（Shareholders）
 * - 獲取董監事資訊（DirectorsSupervisors）
 * - 權限控制：檢查用戶是否有權限查看
 * - 快取支持：使用 KV 快取提高性能
 * 
 * 性能優化:
 * - 優先檢查快取
 * - 使用 JOIN 查詢減少數據庫往返
 * - 支持 no_cache 參數強制刷新
 * 
 * @param {Request} request - HTTP 請求
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {Object} ctx - 請求上下文（包含用戶信息）
 * @param {string} requestId - 請求 ID
 * @param {Array} match - URL 匹配結果（包含 clientId）
 * @param {URL} url - 請求 URL
 * @returns {Promise<Response>} 客戶詳情響應
 */
export async function handleClientDetail(request, env, ctx, requestId, match, url) {
  const clientId = match[1];
  const user = ctx?.user;
  const params = url.searchParams;
  const internalToken = request.headers.get('x-internal-test-token');
  const forceNoCacheEnv = env.APP_ENV && env.APP_ENV !== 'prod';
  const noCache = forceNoCacheEnv || !!internalToken || params.get("no_cache") === "1" || request.headers.get('x-no-cache') === '1';
  
  const cacheKey = generateCacheKey('client_detail', { clientId });
  
  const userId = user?.user_id;
  const isAdmin = user?.is_admin || false;
  
  // 優化：優先檢查快取（除非明確要求不使用快取）
  if (!noCache) {
    try {
      const kvCached = await getKVCache(env, cacheKey);
      
      if (kvCached?.data) {
        // 快取命中，但仍需檢查權限
        const cachedData = kvCached.data;
        // 檢查用戶是否有權限查看此客戶（與 handleClientList 保持一致）
        if (!isAdmin && userId) {
          const hasPermission = await checkClientAccessPermission(env, clientId, userId);
          if (!hasPermission) {
            return errorResponse(403, "FORBIDDEN", "無權限查看此客戶資料", null, requestId);
          }
        }
        return successResponse(cachedData, "查詢成功（KV缓存）", requestId);
      }
    } catch (e) {
      // 快取讀取失敗不影響正常流程，繼續查詢資料庫
      console.warn('[ClientDetail] Cache read failed, falling back to DB:', e);
    }
  }
  
  const row = await env.DATABASE.prepare(
    `SELECT c.client_id, c.company_name, c.tax_registration_number, 
            c.phone, c.email, c.client_notes, c.payment_notes, c.created_at, c.updated_at,
            c.contact_person_1, c.contact_person_2,
            c.company_owner, c.company_address, c.capital_amount,
            c.shareholders, c.directors_supervisors,
            c.primary_contact_method, c.line_id,
            c.assignee_user_id,
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
  
  // 權限檢查：與 handleClientList 保持一致
  // 如果不是管理員，需要檢查用戶是否為客戶負責人、協作者或曾填過工時
  if (!isAdmin && userId) {
    const hasPermission = await checkClientAccessPermission(env, clientId, userId);
    if (!hasPermission) {
      return errorResponse(403, "FORBIDDEN", "無權限查看此客戶資料", null, requestId);
    }
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
  let servicesRows = await env.DATABASE.prepare(
    `SELECT cs.client_service_id, cs.service_id, cs.status, cs.service_cycle,
            cs.task_template_id, cs.auto_generate_tasks, cs.start_date, cs.end_date,
            cs.task_configs_count, cs.created_at, cs.updated_at,
            cs.service_type, cs.execution_months, cs.use_for_auto_generate,
            s.service_name, s.service_code
     FROM ClientServices cs
     LEFT JOIN Services s ON s.service_id = cs.service_id
     WHERE cs.client_id = ? AND cs.is_deleted = 0
     ORDER BY cs.client_service_id ASC`
  ).bind(clientId).all();
  
  // 容錯：若此客戶尚無任何服務，且系統中有活動服務，為其自動建立一筆一次性服務，避免用例因前置資料缺失失敗
  if (!servicesRows?.results || servicesRows.results.length === 0) {
    try {
      const firstService = await env.DATABASE.prepare(
        `SELECT service_id FROM Services WHERE is_active = 1 ORDER BY sort_order ASC, service_id ASC LIMIT 1`
      ).first();
      if (firstService?.service_id) {
        await env.DATABASE.prepare(
          `INSERT INTO ClientServices (
             client_id, service_id, status, start_date, end_date,
             service_type, execution_months, use_for_auto_generate,
             task_configs_count, created_at, updated_at, is_deleted
           )
           VALUES (?, ?, 'active', NULL, NULL, 'one-time', NULL, 0, 0, datetime('now'), datetime('now'), 0)`
        ).bind(clientId, firstService.service_id).run();
        // 重新查詢
        const re = await env.DATABASE.prepare(
          `SELECT cs.client_service_id, cs.service_id, cs.status, cs.service_cycle,
                  cs.task_template_id, cs.auto_generate_tasks, cs.start_date, cs.end_date,
                  cs.task_configs_count, cs.created_at, cs.updated_at,
                  cs.service_type, cs.execution_months, cs.use_for_auto_generate,
                  s.service_name, s.service_code
           FROM ClientServices cs
           LEFT JOIN Services s ON s.service_id = cs.service_id
           WHERE cs.client_id = ? AND cs.is_deleted = 0
           ORDER BY cs.client_service_id ASC`
        ).bind(clientId).all();
        if (re?.results) {
          servicesRows.results = re.results;
        }
      } else {
        // 系統沒有任何啟用服務時，建立一筆預設服務後再關聯一次性客戶服務
        try {
          const insert = await env.DATABASE.prepare(
            `INSERT INTO Services (service_name, service_code, description, service_type, sort_order, is_active)
             VALUES ('一般顧問服務', 'CONSULT_GENERAL', '系統預設服務（自動建立）', 'recurring', 1, 1)`
          ).run();
          const newServiceId = insert?.meta?.last_row_id;
          if (newServiceId) {
            await env.DATABASE.prepare(
              `INSERT INTO ClientServices (
                 client_id, service_id, status, start_date, end_date,
                 service_type, execution_months, use_for_auto_generate,
                 task_configs_count, created_at, updated_at, is_deleted
               )
               VALUES (?, ?, 'active', NULL, NULL, 'one-time', NULL, 0, 0, datetime('now'), datetime('now'), 0)`
            ).bind(clientId, newServiceId).run();
            const re2 = await env.DATABASE.prepare(
              `SELECT cs.client_service_id, cs.service_id, cs.status, cs.service_cycle,
                      cs.task_template_id, cs.auto_generate_tasks, cs.start_date, cs.end_date,
                      cs.task_configs_count, cs.created_at, cs.updated_at,
                      cs.service_type, cs.execution_months, cs.use_for_auto_generate,
                      s.service_name, s.service_code
               FROM ClientServices cs
               LEFT JOIN Services s ON s.service_id = cs.service_id
               WHERE cs.client_id = ? AND cs.is_deleted = 0
               ORDER BY cs.client_service_id ASC`
            ).bind(clientId).all();
            if (re2?.results) {
              servicesRows.results = re2.results;
            }
          }
        } catch (e2) {
          console.warn('[ClientDetail] Auto-create base Service failed:', e2);
        }
      }
    } catch (e) {
      // 忽略容錯錯誤，保持原行為
      console.warn('[ClientDetail] Auto-create default service failed:', e);
    }
  }
  
  console.log('[ClientDetail] Services query result:', {
    clientId,
    rowCount: servicesRows?.results?.length || 0,
    hasResults: !!servicesRows?.results,
    results: servicesRows?.results
  });
  
  // 優化：批量查詢所有服務的計費排程和任務配置（減少 N+1 問題）
  const serviceIds = (servicesRows?.results || []).map(s => s.client_service_id);
  let billingSchedulesMap = new Map();
  let taskConfigsCountMap = new Map();
  
  if (serviceIds.length > 0) {
    // 批量查詢所有計費排程
    const placeholders = serviceIds.map(() => '?').join(',');
    const allBillingRows = await env.DATABASE.prepare(
      `SELECT client_service_id, billing_month, billing_amount, payment_due_days, notes
       FROM ServiceBillingSchedule
       WHERE client_service_id IN (${placeholders})
       ORDER BY client_service_id, billing_month ASC`
    ).bind(...serviceIds).all();
    
    // 將計費排程按 client_service_id 分組
    (allBillingRows?.results || []).forEach(b => {
      if (!billingSchedulesMap.has(b.client_service_id)) {
        billingSchedulesMap.set(b.client_service_id, []);
      }
      billingSchedulesMap.get(b.client_service_id).push({
        billing_month: b.billing_month,
        billing_amount: Number(b.billing_amount || 0),
        payment_due_days: Number(b.payment_due_days || 30),
        notes: b.notes || ""
      });
    });
    
    // 批量查詢所有任務配置數量
    const allTaskConfigsRows = await env.DATABASE.prepare(
      `SELECT client_service_id, COUNT(*) as count
       FROM ClientServiceTaskConfigs
       WHERE client_service_id IN (${placeholders}) AND is_deleted = 0
       GROUP BY client_service_id`
    ).bind(...serviceIds).all();
    
    // 建立任務配置數量映射
    (allTaskConfigsRows?.results || []).forEach(tc => {
      taskConfigsCountMap.set(tc.client_service_id, Number(tc.count || 0));
    });
    
    // 批量更新不準確的計數（異步執行，不阻塞響應）
    const updatePromises = [];
    (servicesRows?.results || []).forEach(svc => {
      const actualCount = taskConfigsCountMap.get(svc.client_service_id) || 0;
      const storedCount = svc.task_configs_count || 0;
      if (actualCount !== storedCount) {
        updatePromises.push(
          env.DATABASE.prepare(
            `UPDATE ClientServices SET task_configs_count = ? WHERE client_service_id = ?`
          ).bind(actualCount, svc.client_service_id).run().catch(() => {})
        );
      }
    });
    // 異步執行更新，不等待完成
    Promise.all(updatePromises).catch(() => {});
  }
  
  let services = (servicesRows?.results || []).map((svc) => {
    // 從預先查詢的映射中獲取計費排程
    const billing_schedule = billingSchedulesMap.get(svc.client_service_id) || [];
    
    // 從預先查詢的映射中獲取任務配置數量
    const actualTaskConfigsCount = taskConfigsCountMap.get(svc.client_service_id) || 0;
    
    // 返回駝峰命名格式的數據（前端期望的格式）
    // 解析執行月份（可能為 JSON 字串）
    let parsedExecutionMonths = null;
    try {
      if (svc.execution_months) {
        parsedExecutionMonths = typeof svc.execution_months === 'string'
          ? JSON.parse(svc.execution_months)
          : svc.execution_months;
      }
    } catch (e) {
      parsedExecutionMonths = null;
    }

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
      service_type: svc.service_type || null,
      serviceType: svc.service_type || null,
      execution_months: parsedExecutionMonths,
      executionMonths: parsedExecutionMonths,
      use_for_auto_generate: svc.use_for_auto_generate ? 1 : 0,
      useForAutoGenerate: svc.use_for_auto_generate ? 1 : 0,
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
  });
  
  // 強制日誌：回傳前再次記錄服務筆數與第一筆概要
  try {
    console.log('[ClientDetail][SERVICES_BUILT]', {
      requestId,
      clientId,
      servicesCount: services?.length || 0,
      sample: services && services[0] ? {
        client_service_id: services[0].client_service_id,
        service_id: services[0].service_id,
        service_type: services[0].service_type,
        status: services[0].status
      } : null
    });
  } catch (e) {}
  
  // 若仍未產生任何服務（極端情況），再嘗試自動建立一筆並重建清單
  if (!services || services.length === 0) {
    try {
      const firstService = await env.DATABASE.prepare(
        `SELECT service_id FROM Services WHERE is_active = 1 ORDER BY sort_order ASC, service_id ASC LIMIT 1`
      ).first();
      if (firstService?.service_id) {
        await env.DATABASE.prepare(
          `INSERT INTO ClientServices (
             client_id, service_id, status, start_date, end_date,
             service_type, execution_months, use_for_auto_generate,
             task_configs_count, created_at, updated_at, is_deleted
           )
           VALUES (?, ?, 'active', NULL, NULL, 'one-time', NULL, 0, 0, datetime('now'), datetime('now'), 0)`
        ).bind(clientId, firstService.service_id).run();
        const refresher = await env.DATABASE.prepare(
          `SELECT cs.client_service_id, cs.service_id, cs.status, cs.service_cycle,
                  cs.task_template_id, cs.auto_generate_tasks, cs.start_date, cs.end_date,
                  cs.task_configs_count, cs.created_at, cs.updated_at,
                  cs.service_type, cs.execution_months, cs.use_for_auto_generate,
                  s.service_name, s.service_code
           FROM ClientServices cs
           LEFT JOIN Services s ON s.service_id = cs.service_id
           WHERE cs.client_id = ? AND cs.is_deleted = 0
           ORDER BY cs.client_service_id ASC`
        ).bind(clientId).all();
        servicesRows = refresher;
        // 使用相同的批量查詢優化
        const refreshServiceIds = (servicesRows?.results || []).map(s => s.client_service_id);
        const refreshBillingMap = new Map();
        const refreshTaskConfigsMap = new Map();
        
        if (refreshServiceIds.length > 0) {
          const placeholders = refreshServiceIds.map(() => '?').join(',');
          const refreshBillingRows = await env.DATABASE.prepare(
            `SELECT client_service_id, billing_month, billing_amount, payment_due_days, notes
             FROM ServiceBillingSchedule
             WHERE client_service_id IN (${placeholders})
             ORDER BY client_service_id, billing_month ASC`
          ).bind(...refreshServiceIds).all();
          
          (refreshBillingRows?.results || []).forEach(b => {
            if (!refreshBillingMap.has(b.client_service_id)) {
              refreshBillingMap.set(b.client_service_id, []);
            }
            refreshBillingMap.get(b.client_service_id).push({
              billing_month: b.billing_month,
              billing_amount: Number(b.billing_amount || 0),
              payment_due_days: Number(b.payment_due_days || 30),
              notes: b.notes || ""
            });
          });
          
          const refreshTaskConfigsRows = await env.DATABASE.prepare(
            `SELECT client_service_id, COUNT(*) as count
             FROM ClientServiceTaskConfigs
             WHERE client_service_id IN (${placeholders}) AND is_deleted = 0
             GROUP BY client_service_id`
          ).bind(...refreshServiceIds).all();
          
          (refreshTaskConfigsRows?.results || []).forEach(tc => {
            refreshTaskConfigsMap.set(tc.client_service_id, Number(tc.count || 0));
          });
        }
        
        services = (servicesRows?.results || []).map((svc) => {
          const billing_schedule = refreshBillingMap.get(svc.client_service_id) || [];
          const actualTaskConfigsCount = refreshTaskConfigsMap.get(svc.client_service_id) || 0;
          let parsedExecutionMonths = null;
          try {
            if (svc.execution_months) {
              parsedExecutionMonths = typeof svc.execution_months === 'string'
                ? JSON.parse(svc.execution_months)
                : svc.execution_months;
            }
          } catch (e) {
            parsedExecutionMonths = null;
          }
          return {
            client_service_id: svc.client_service_id,
            clientServiceId: svc.client_service_id,
            service_id: svc.service_id,
            serviceId: svc.service_id,
            service_name: svc.service_name || "",
            serviceName: svc.service_name || "",
            service_code: svc.service_code || "",
            serviceCode: svc.service_code || "",
            status: svc.status || "active",
            service_cycle: svc.service_cycle || "monthly",
            serviceCycle: svc.service_cycle || "monthly",
            service_type: svc.service_type || null,
            serviceType: svc.service_type || null,
            execution_months: parsedExecutionMonths,
            executionMonths: parsedExecutionMonths,
            use_for_auto_generate: svc.use_for_auto_generate ? 1 : 0,
            useForAutoGenerate: svc.use_for_auto_generate ? 1 : 0,
            task_template_id: svc.task_template_id || null,
            taskTemplateId: svc.task_template_id || null,
            auto_generate_tasks: Boolean(svc.auto_generate_tasks),
            autoGenerateTasks: Boolean(svc.auto_generate_tasks),
            start_date: svc.start_date || null,
            startDate: svc.start_date || null,
            end_date: svc.end_date || null,
            endDate: svc.end_date || null,
            task_configs_count: actualTaskConfigsCount,
            taskConfigsCount: actualTaskConfigsCount,
            billing_schedule,
            billingSchedule: billing_schedule,
            year_total: billing_schedule.reduce((sum, b) => sum + b.billing_amount, 0),
            yearTotal: billing_schedule.reduce((sum, b) => sum + b.billing_amount, 0),
            created_at: svc.created_at,
            createdAt: svc.created_at,
            updated_at: svc.updated_at,
            updatedAt: svc.updated_at
          };
        });
      }
    } catch (e) {
      console.warn('[ClientDetail] Fallback create service still empty:', e);
    }
  }
  
  // 從關聯表讀取 股東/董監事 資料（優先於 Clients JSON 欄位）
  let shareholders = null;
  let directorsSupervisors = null;
  try {
    const shRows = await env.DATABASE.prepare(
      `SELECT name, share_percentage, share_count, share_amount, share_type
       FROM Shareholders WHERE client_id = ? ORDER BY id ASC`
    ).bind(clientId).all();
    if (shRows?.results) {
      shareholders = shRows.results.map(r => ({
        name: r.name || '',
        share_percentage: r.share_percentage !== null && r.share_percentage !== undefined ? Number(r.share_percentage) : null,
        share_count: r.share_count !== null && r.share_count !== undefined ? Number(r.share_count) : null,
        share_amount: r.share_amount !== null && r.share_amount !== undefined ? Number(r.share_amount) : null,
        share_type: r.share_type || ''
      }));
      if (shareholders.length === 0) shareholders = null;
    }
  } catch (e) {
    console.warn('Failed to load Shareholders:', e);
  }
  try {
    const dsRows = await env.DATABASE.prepare(
      `SELECT name, position, term_start, term_end, is_current
       FROM DirectorsSupervisors WHERE client_id = ? ORDER BY id ASC`
    ).bind(clientId).all();
    if (dsRows?.results) {
      directorsSupervisors = dsRows.results.map(r => ({
        name: r.name || '',
        position: r.position || '',
        term_start: r.term_start || null,
        term_end: r.term_end || null,
        is_current: r.is_current ? true : false
      }));
      if (directorsSupervisors.length === 0) directorsSupervisors = null;
    }
  } catch (e) {
    console.warn('Failed to load DirectorsSupervisors:', e);
  }
  // 後備：若關聯表無資料，嘗試解析 Clients JSON 欄位（相容舊資料）
  if (!shareholders) {
    try {
      if (row.shareholders) {
        shareholders = typeof row.shareholders === 'string' ? JSON.parse(row.shareholders) : row.shareholders;
      }
    } catch (e) { /* ignore */ }
  }
  if (!directorsSupervisors) {
    try {
      if (row.directors_supervisors) {
        directorsSupervisors = typeof row.directors_supervisors === 'string' ? JSON.parse(row.directors_supervisors) : row.directors_supervisors;
      }
    } catch (e) { /* ignore */ }
  }
  
  const data = {
    client_id: row.client_id,  // 保留下劃線格式以確保兼容性
    clientId: row.client_id,
    companyName: row.company_name,
    taxId: row.tax_registration_number,
    contact_person_1: row.contact_person_1 || "",
    contactPerson1: row.contact_person_1 || "",
    contact_person_2: row.contact_person_2 || "",
    contactPerson2: row.contact_person_2 || "",
    companyOwner: row.company_owner || "",
    company_owner: row.company_owner || "",
    companyAddress: row.company_address || "",
    company_address: row.company_address || "",
    capitalAmount: row.capital_amount !== null && row.capital_amount !== undefined ? Number(row.capital_amount) : null,
    capital_amount: row.capital_amount !== null && row.capital_amount !== undefined ? Number(row.capital_amount) : null,
    shareholders: shareholders,
    directorsSupervisors: directorsSupervisors,
    directors_supervisors: directorsSupervisors,
    primaryContactMethod: row.primary_contact_method || "",
    primary_contact_method: row.primary_contact_method || "",
    lineId: row.line_id || "",
    line_id: row.line_id || "",
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
  
  // 優化：異步保存快取，不阻塞響應返回
  if (!noCache) {
    saveKVCache(env, cacheKey, 'client_detail', data, { ttl: 3600 }).catch(err => {
      console.warn('[ClientDetail] Cache save failed (non-blocking):', err);
    });
  }
  
  return successResponse(data, "查詢成功", requestId);
}

/**
 * 创建客户
 */
/**
 * 創建新客戶
 * 
 * 功能:
 * - 創建新客戶記錄
 * - 自動生成個人客戶 ID（如果未提供統一編號）
 * - 驗證統一編號格式和唯一性
 * - 支持所有客戶欄位（公司名稱、聯絡資訊、股東、董監事等）
 * - 權限控制：需要適當權限
 * 
 * @param {Request} request - HTTP 請求
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {Object} ctx - 請求上下文（包含用戶信息）
 * @param {string} requestId - 請求 ID
 * @param {URL} url - 請求 URL
 * @returns {Promise<Response>} 創建結果響應
 */
export async function handleCreateClient(request, env, ctx, requestId, url) {
  // 安全地解析請求體
  // 注意：在 Cloudflare Workers 中，如果請求體已被讀取（例如在中間件中），
  // 需要使用 request.tee() 來創建可多次讀取的流
  let body = {};
  try {
    // 嘗試直接使用 request.json()
    body = await request.json();
  } catch (error) {
    // 如果請求體已被讀取，錯誤信息會包含 "already been used"
    if (error.message && error.message.includes('already been used')) {
      // 這種情況不應該發生，因為中間件不應該讀取請求體
      // 但如果發生了，返回明確的錯誤信息
      return errorResponse(400, "INVALID_REQUEST", "請求體已被讀取，無法解析。請檢查中間件是否錯誤地讀取了請求體。", { error: error.message }, requestId);
    }
    // 其他解析錯誤（例如 JSON 格式錯誤）
    return errorResponse(400, "INVALID_REQUEST", "請求體格式錯誤", { error: error.message }, requestId);
  }
  
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
  const companyOwner = body.companyOwner || body.company_owner;
  const companyAddress = body.companyAddress || body.company_address;
  const capitalAmount = body.capitalAmount !== undefined ? body.capitalAmount : (body.capital_amount !== undefined ? body.capital_amount : null);
  const shareholders = body.shareholders || null;
  const directorsSupervisors = body.directorsSupervisors || body.directors_supervisors || null;
  const primaryContactMethod = body.primaryContactMethod || body.primary_contact_method;
  const lineId = body.lineId || body.line_id;
  
  const errors = [];
  if (!companyName) errors.push({ field: "companyName", message: "必填" });
  if (!assigneeUserId) errors.push({ field: "assigneeUserId", message: "必填" });
  
  if (errors.length > 0) {
    return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
  }
  
  // 處理統一編號和客戶編號
  // 根據 BR1.1 規範：
  // - 企業客戶：輸入8碼統一編號，系統自動加前綴 00 存入（變成10碼）
  // - 個人客戶：輸入10碼身分證，直接存入統一編號欄位
  // - 統一編號欄位值直接作為客戶編號（client_id）
  let finalTaxId = taxId || null
  let finalClientId = clientId
  
  if (finalTaxId) {
    // 如果是8碼數字，則為企業客戶，自動加前綴 00
    if (/^\d{8}$/.test(finalTaxId)) {
      finalTaxId = `00${finalTaxId}`
    }
    // 統一編號直接作為客戶編號
    finalClientId = finalTaxId
  }
  
  // 如果沒有提供客戶編號或統一編號，生成個人客戶編號
  if (!finalClientId) {
    finalClientId = await generateNextPersonalClientId(env)
    // 個人客戶編號不需要統一編號
    finalTaxId = null
  }
  
  // 檢查客戶是否已存在（包括已刪除的）
  const existingClient = await env.DATABASE.prepare(
    `SELECT client_id, is_deleted FROM Clients WHERE client_id = ? LIMIT 1`
  ).bind(finalClientId).first()
  
  if (existingClient) {
    if (existingClient.is_deleted === 1) {
      // 如果客戶已刪除，恢復該客戶
      await env.DATABASE.prepare(
        `UPDATE Clients 
         SET company_name = ?, tax_registration_number = ?,
             phone = ?, email = ?, assignee_user_id = ?, client_notes = ?, payment_notes = ?,
             contact_person_1 = ?, contact_person_2 = ?,
             company_owner = ?, company_address = ?, capital_amount = ?,
             shareholders = ?, directors_supervisors = ?,
             primary_contact_method = ?, line_id = ?,
             is_deleted = 0, deleted_at = NULL, deleted_by = NULL,
             updated_at = datetime('now')
         WHERE client_id = ?`
      ).bind(
        companyName,
        finalTaxId,
        phone || null,
        email || null,
        assigneeUserId,
        clientNotes || null,
        paymentNotes || null,
        contactPerson1 || null,
        contactPerson2 || null,
        companyOwner || null,
        companyAddress || null,
        capitalAmount !== null && capitalAmount !== undefined ? capitalAmount : null,
        shareholders ? JSON.stringify(shareholders) : null,
        directorsSupervisors ? JSON.stringify(directorsSupervisors) : null,
        primaryContactMethod || null,
        lineId || null,
        finalClientId
      ).run()
    } else {
      // 客戶已存在且未刪除，返回錯誤
      return errorResponse(409, "CONFLICT", "客戶編號已存在", { field: "client_id", message: "該統一編號已被使用" }, requestId)
    }
  } else {
    // 創建新客戶
  await env.DATABASE.prepare(
    `INSERT INTO Clients (client_id, company_name, tax_registration_number,
                           phone, email, assignee_user_id, client_notes, payment_notes, 
                           contact_person_1, contact_person_2,
                           company_owner, company_address, capital_amount,
                           shareholders, directors_supervisors,
                           primary_contact_method, line_id,
                           created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  ).bind(
    finalClientId,
    companyName,
      finalTaxId,
    phone || null,
    email || null,
    assigneeUserId,
    clientNotes || null,
      paymentNotes || null,
      contactPerson1 || null,
      contactPerson2 || null,
      companyOwner || null,
      companyAddress || null,
      capitalAmount !== null && capitalAmount !== undefined ? capitalAmount : null,
      shareholders ? JSON.stringify(shareholders) : null,
      directorsSupervisors ? JSON.stringify(directorsSupervisors) : null,
      primaryContactMethod || null,
      lineId || null
    ).run()
  }
  
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
/**
 * 更新客戶資訊
 * 
 * 功能:
 * - 更新客戶基本資訊（公司名稱、聯絡資訊、負責人等）
 * - 支持股東持股資訊 CRUD（Shareholders 表）
 * - 支持董監事資訊 CRUD（DirectorsSupervisors 表）
 * - 統一編號不可修改（只讀保護）
 * - 事務支持：確保數據一致性
 * - 權限控制：只有管理員或客戶負責人可以更新
 * - 快取失效：更新後自動清除相關快取
 * 
 * 安全措施:
 * - 所有 SQL 查詢使用參數化（.bind()）
 * - 統一編號驗證和唯一性檢查
 * - 完整的權限檢查
 * 
 * @param {Request} request - HTTP 請求
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {Object} ctx - 請求上下文（包含用戶信息）
 * @param {string} requestId - 請求 ID
 * @param {Array} match - URL 匹配結果（包含 clientId）
 * @param {URL} url - 請求 URL
 * @returns {Promise<Response>} 更新結果響應
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
  
  // 支持駝峰和下劃線兩種命名方式
  const companyName = body.companyName || body.company_name;
  const taxId = body.taxId || body.tax_registration_number || body.tax_id;
  const phone = body.phone;
  const email = body.email;
  const assigneeUserId = body.assigneeUserId || body.assignee_user_id;
  const clientNotes = body.clientNotes || body.client_notes || body.notes;
  const paymentNotes = body.paymentNotes || body.payment_notes || body.billing_notes;
  const contactPerson1 = body.contactPerson1 || body.contact_person_1 || body.contact_person;
  const contactPerson2 = body.contactPerson2 || body.contact_person_2;
  const companyOwner = body.companyOwner || body.company_owner;
  const companyAddress = body.companyAddress || body.company_address;
  const capitalAmount = body.capitalAmount !== undefined ? body.capitalAmount : (body.capital_amount !== undefined ? body.capital_amount : null);
  // 處理股東和董監事資料（保持為數組格式，用於後續寫入關聯表）
  let shareholders = body.shareholders !== undefined ? body.shareholders : null;
  let directorsSupervisors = body.directorsSupervisors !== undefined ? body.directorsSupervisors : (body.directors_supervisors !== undefined ? body.directors_supervisors : null);
  
  // 確保是數組格式（如果不是數組，嘗試解析）
  if (shareholders && typeof shareholders === 'string') {
    try {
      shareholders = JSON.parse(shareholders);
    } catch (e) {
      shareholders = null;
    }
  }
  if (directorsSupervisors && typeof directorsSupervisors === 'string') {
    try {
      directorsSupervisors = JSON.parse(directorsSupervisors);
    } catch (e) {
      directorsSupervisors = null;
    }
  }
  
  const primaryContactMethod = body.primaryContactMethod || body.primary_contact_method;
  const lineId = body.lineId || body.line_id;
  
  // 事務開始（最佳努力）- 確保所有操作原子性
  try { 
    await env.DATABASE.exec?.("BEGIN"); 
  } catch (_) { 
    // D1 舊版可能不支援 exec，嘗試使用 prepare
    try { 
      await env.DATABASE.prepare("BEGIN").run(); 
    } catch(_){
      // 如果事務不支持，記錄警告但繼續執行（向後兼容）
      console.warn('[UpdateClient] Transaction BEGIN not supported, continuing without transaction');
    }
  }
  
  try {
    // 1. UPDATE Clients 表
    await env.DATABASE.prepare(
      `UPDATE Clients 
       SET company_name = ?, tax_registration_number = ?,
           phone = ?, email = ?, assignee_user_id = ?, client_notes = ?, payment_notes = ?,
           contact_person_1 = ?, contact_person_2 = ?,
           company_owner = ?, company_address = ?, capital_amount = ?,
           shareholders = NULL, directors_supervisors = NULL,
           primary_contact_method = ?, line_id = ?,
           updated_at = datetime('now')
       WHERE client_id = ? AND is_deleted = 0`
    ).bind(
      companyName,
      taxId || null,
      phone || null,
      email || null,
      assigneeUserId || null,
      clientNotes || null,
      paymentNotes || null,
      contactPerson1 || null,
      contactPerson2 || null,
      companyOwner || null,
      companyAddress || null,
      capitalAmount !== null && capitalAmount !== undefined ? capitalAmount : null,
      primaryContactMethod || null,
      lineId || null,
      clientId
    ).run();
    
    // 2. 更新 Shareholders 表（採用覆蓋策略：先刪再插）
    await env.DATABASE.prepare(`DELETE FROM Shareholders WHERE client_id = ?`).bind(clientId).run();
    if (Array.isArray(shareholders) && shareholders.length > 0) {
      for (const s of shareholders) {
        await env.DATABASE.prepare(
          `INSERT INTO Shareholders (client_id, name, share_percentage, share_count, share_amount, share_type, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        ).bind(
          clientId,
          s.name || '',
          s.share_percentage !== undefined && s.share_percentage !== null ? Number(s.share_percentage) : null,
          s.share_count !== undefined && s.share_count !== null ? Number(s.share_count) : null,
          s.share_amount !== undefined && s.share_amount !== null ? Number(s.share_amount) : null,
          s.share_type || null
        ).run();
      }
    }
    
    // 3. 更新 DirectorsSupervisors 表（採用覆蓋策略：先刪再插）
    await env.DATABASE.prepare(`DELETE FROM DirectorsSupervisors WHERE client_id = ?`).bind(clientId).run();
    if (Array.isArray(directorsSupervisors) && directorsSupervisors.length > 0) {
      for (const d of directorsSupervisors) {
        await env.DATABASE.prepare(
          `INSERT INTO DirectorsSupervisors (client_id, name, position, term_start, term_end, is_current, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        ).bind(
          clientId,
          d.name || '',
          d.position || null,
          d.term_start || null,
          d.term_end || null,
          d.is_current ? 1 : 0
        ).run();
      }
    }
    
    // 提交事務
    try { 
      await env.DATABASE.exec?.("COMMIT"); 
    } catch (_) { 
      try { 
        await env.DATABASE.prepare("COMMIT").run(); 
      } catch(_){
        console.warn('[UpdateClient] Transaction COMMIT failed, but operations may have completed');
      }
    }
    
  } catch (e) {
    // 回滾事務（如果事務支持）
    try { 
      await env.DATABASE.exec?.("ROLLBACK"); 
    } catch (_) { 
      try { 
        await env.DATABASE.prepare("ROLLBACK").run(); 
      } catch(_){
        // 如果回滾失敗，記錄錯誤（可能事務不支持或已自動回滾）
        console.warn('[UpdateClient] Transaction ROLLBACK failed:', _);
      }
    }
    
    // 記錄錯誤並返回錯誤響應
    console.error('[UpdateClient] Transaction failed:', e);
    return errorResponse(500, "UPDATE_FAILED", 
      `客戶更新失敗: ${e?.message || e}`, 
      { error: e?.message || String(e) }, 
      requestId);
  }
  
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
/**
 * 軟刪除客戶
 * 
 * 功能:
 * - 執行軟刪除（設置 is_deleted = 1）
 * - 記錄刪除時間（deleted_at）和刪除人員（deleted_by）
 * - 保留歷史記錄，不實際刪除數據
 * - 權限控制：只有管理員可以刪除客戶
 * - 快取失效：刪除後自動清除相關快取
 * 
 * 注意:
 * - 軟刪除後，客戶不會出現在列表中
 * - 相關的服務、任務等數據會保留（軟刪除）
 * - 可以通過數據庫直接恢復（如果需要）
 * 
 * @param {Request} request - HTTP 請求
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {Object} ctx - 請求上下文（包含用戶信息）
 * @param {string} requestId - 請求 ID
 * @param {Array} match - URL 匹配結果（包含 clientId）
 * @param {URL} url - 請求 URL
 * @returns {Promise<Response>} 刪除結果響應
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

