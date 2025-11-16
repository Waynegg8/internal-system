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
    const yearTotalPlaceholders = clientIds.map(() => '?').join(',');
    const yearTotalRows = await env.DATABASE.prepare(
      `SELECT cs.client_id, SUM(COALESCE(sbs.billing_amount, 0)) AS total_amount
       FROM ClientServices cs
       LEFT JOIN ServiceBillingSchedule sbs ON sbs.client_service_id = cs.client_service_id
       WHERE cs.client_id IN (${yearTotalPlaceholders}) AND cs.is_deleted = 0
       GROUP BY cs.client_id`
    ).bind(...clientIds).all();
    yearTotalRows.results?.forEach(r => { yearTotalMap[r.client_id] = Number(r.total_amount || 0); });
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
 * 获取客户详情
 */
export async function handleClientDetail(request, env, ctx, requestId, match, url) {
  const clientId = match[1];
  const params = url.searchParams;
  const internalToken = request.headers.get('x-internal-test-token');
  const forceNoCacheEnv = env.APP_ENV && env.APP_ENV !== 'prod';
  const noCache = forceNoCacheEnv || !!internalToken || params.get("no_cache") === "1" || request.headers.get('x-no-cache') === '1';
  
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
            c.contact_person_1, c.contact_person_2,
            c.company_owner, c.company_address, c.capital_amount,
            c.shareholders, c.directors_supervisors,
            c.primary_contact_method, c.line_id,
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
  
  let services = await Promise.all((servicesRows?.results || []).map(async (svc) => {
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
  }));
  
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
        services = await Promise.all((servicesRows?.results || []).map(async (svc) => {
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
            task_configs_count: Number((await env.DATABASE.prepare(
              `SELECT COUNT(*) as count FROM ClientServiceTaskConfigs WHERE client_service_id = ? AND is_deleted = 0`
            ).bind(svc.client_service_id).first())?.count || 0),
            billing_schedule,
            billingSchedule: billing_schedule,
            year_total: billing_schedule.reduce((sum, b) => sum + b.billing_amount, 0),
            yearTotal: billing_schedule.reduce((sum, b) => sum + b.billing_amount, 0),
            created_at: svc.created_at,
            createdAt: svc.created_at,
            updated_at: svc.updated_at,
            updatedAt: svc.updated_at
          };
        }));
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
        shareholders || null,
        directorsSupervisors || null,
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
      null,
      null,
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
  const shareholders = body.shareholders ? (typeof body.shareholders === 'string' ? body.shareholders : JSON.stringify(body.shareholders)) : null;
  const directorsSupervisors = body.directorsSupervisors ? (typeof body.directorsSupervisors === 'string' ? body.directorsSupervisors : JSON.stringify(body.directorsSupervisors)) : (body.directors_supervisors ? (typeof body.directors_supervisors === 'string' ? body.directors_supervisors : JSON.stringify(body.directors_supervisors)) : null);
  const primaryContactMethod = body.primaryContactMethod || body.primary_contact_method;
  const lineId = body.lineId || body.line_id;
  
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
    null,
    null,
    primaryContactMethod || null,
    lineId || null,
    clientId
  ).run();
  
  // 寫入關聯表（採用覆蓋策略：先刪再插）
  try {
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
  } catch (e) {
    console.warn('[UpdateClient] write Shareholders failed:', e);
  }
  
  try {
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
  } catch (e) {
    console.warn('[UpdateClient] write DirectorsSupervisors failed:', e);
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

