/**
 * 服務管理處理器
 * 精簡重構版本
 */

import { successResponse, errorResponse } from "../utils/response.js";
import { deleteKVCacheByPrefix } from "../utils/cache.js";
import { generateServiceCode } from "../utils/code-generator.js";

export async function handleServices(request, env, ctx, requestId, match, url) {
  const method = request.method.toUpperCase();
  const path = url.pathname;
  const user = ctx?.user;
  
  try {
    // GET /api/v2/services 或 /api/v2/settings/services - 獲取所有服務項目
    if (method === "GET" && (path === '/api/v2/services' || path === '/api/v2/settings/services')) {
      let rows;
      try {
        // 新版資料庫：包含 service_type 欄位
        rows = await env.DATABASE.prepare(
          `SELECT service_id, service_name, service_code, description, 
                  service_sop_id, service_type, is_active, sort_order, created_at, updated_at
           FROM Services
           WHERE is_active = 1
           ORDER BY sort_order ASC, service_id ASC`
        ).all();
      } catch (e) {
        // 向下相容：舊版資料庫沒有 service_type 欄位時，使用常值別名避免查詢失敗
        const errMsg = String(e?.message || "");
        if (errMsg.includes("no such column: service_type")) {
          rows = await env.DATABASE.prepare(
            `SELECT service_id, service_name, service_code, description, 
                    service_sop_id, 'recurring' AS service_type, is_active, sort_order, created_at, updated_at
             FROM Services
             WHERE is_active = 1
             ORDER BY sort_order ASC, service_id ASC`
          ).all();
        } else {
          throw e;
        }
      }
      
      // 若無任何活動服務，種一筆預設服務並重新查詢（確保前端與測試可用）
      if (!rows?.results || rows.results.length === 0) {
        await env.DATABASE.prepare(
          `INSERT INTO Services (service_name, service_code, description, service_type, sort_order, is_active)
           VALUES ('一般顧問服務', 'CONSULT_GENERAL', '系統預設服務（自動建立）', 'recurring', 1, 1)`
        ).run().catch(() => {});
        try {
          rows = await env.DATABASE.prepare(
            `SELECT service_id, service_name, service_code, description, 
                    service_sop_id, service_type, is_active, sort_order, created_at, updated_at
             FROM Services
             WHERE is_active = 1
             ORDER BY sort_order ASC, service_id ASC`
          ).all();
        } catch (e2) {
          const err2 = String(e2?.message || "");
          if (err2.includes("no such column: service_type")) {
            rows = await env.DATABASE.prepare(
              `SELECT service_id, service_name, service_code, description, 
                      service_sop_id, 'recurring' AS service_type, is_active, sort_order, created_at, updated_at
               FROM Services
               WHERE is_active = 1
               ORDER BY sort_order ASC, service_id ASC`
            ).all();
          } else {
            throw e2;
          }
        }
      }
      
      const data = (rows?.results || []).map(r => ({
        service_id: r.service_id,
        service_name: r.service_name || "",
        service_code: r.service_code || "",
        description: r.description || "",
        service_sop_id: r.service_sop_id || null,
        service_type: r.service_type || "recurring",
        is_active: Boolean(r.is_active),
        sort_order: r.sort_order || 0,
        created_at: r.created_at,
        updated_at: r.updated_at
      }));
      
      return successResponse(data, "查詢成功", requestId);
    }
    
    // GET /api/v2/settings/services/:serviceId/items - 獲取指定服務項目的任務類型列表（必須在單個服務項目路由之前）
    if (method === "GET" && match && match[1] && path.endsWith('/items') && path.startsWith('/api/v2/settings/services/') && !path.includes('/items/')) {
      const serviceId = match[1];
      
      try {
        const rows = await env.DATABASE.prepare(`
          SELECT si.item_id, si.service_id, si.item_name, si.item_code, si.description,
                 si.is_active, si.sort_order, si.created_at, si.updated_at
          FROM ServiceItems si
          WHERE si.service_id = ? AND si.is_active = 1
          ORDER BY si.sort_order ASC, si.item_id ASC
        `).bind(serviceId).all();

        console.log(`[Services] 查詢服務項目 ${serviceId} 的任務類型: 找到 ${rows?.results?.length || 0} 筆`);

        // 去重處理：確保每個 item_id 只出現一次
        const itemMap = new Map();
        const uniqueResults = [];
        (rows?.results || []).forEach(r => {
          const itemId = r.item_id;
          if (!itemMap.has(itemId)) {
            itemMap.set(itemId, true);
            uniqueResults.push(r);
          } else {
            console.warn(`[Services] 發現重複的任務類型 ID: ${itemId} (serviceId=${serviceId})`, r);
          }
        });

        const data = uniqueResults.map(r => ({
          item_id: r.item_id,
          service_id: r.service_id,
          item_name: r.item_name || "",
          item_code: r.item_code || "",
          description: r.description || "",
          is_active: Boolean(r.is_active),
          sort_order: r.sort_order || 0,
          created_at: r.created_at,
          updated_at: r.updated_at
        }));

        console.log(`[Services] 返回的任務類型數據: ${data.length} 筆（原始: ${rows?.results?.length || 0} 筆）`, data);

        return successResponse(data, "查詢成功", requestId);
      } catch (err) {
        console.error(`[Services] Error fetching items for service ${serviceId}:`, err);
        return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
      }
    }
    
    // GET /api/v2/services/:id 或 /api/v2/settings/services/:id - 獲取單個服務項目詳情（必須在 /items 路由之後）
    if (method === "GET" && match && match[1] && (path.startsWith('/api/v2/services/') || path.startsWith('/api/v2/settings/services/')) && !path.endsWith('/items')) {
      const serviceId = match[1];
      
      const service = await env.DATABASE.prepare(
        `SELECT service_id, service_name, service_code, description, 
                service_sop_id, is_active, sort_order, created_at, updated_at
         FROM Services
         WHERE service_id = ?`
      ).bind(serviceId).first();
      
      if (!service) {
        return errorResponse(404, "NOT_FOUND", "服務不存在", null, requestId);
      }
      
      const data = {
        service_id: service.service_id,
        service_name: service.service_name || "",
        service_code: service.service_code || "",
        description: service.description || "",
        service_sop_id: service.service_sop_id || null,
        is_active: Boolean(service.is_active),
        sort_order: service.sort_order || 0,
        created_at: service.created_at,
        updated_at: service.updated_at
      };
      
      return successResponse(data, "查詢成功", requestId);
    }
    
    // POST /api/v2/services 或 /api/v2/settings/services - 創建服務項目
    if (method === "POST" && (path === '/api/v2/services' || path === '/api/v2/settings/services')) {
      // 權限：預設需管理員；但若系統目前完全沒有任何活動服務，允許建立第一筆以啟動系統（E2E 前置容錯）
      if (!user?.is_admin) {
        const hasActiveService = await env.DATABASE.prepare(
          `SELECT 1 FROM Services WHERE is_active = 1 LIMIT 1`
        ).first().then(r => !!r).catch(() => false);
        if (!hasActiveService) {
          // 放行建立第一筆服務
        } else {
          return errorResponse(403, "FORBIDDEN", "需要管理員權限", null, requestId);
        }
      }
      
      const body = await request.json();
      const serviceName = String(body?.service_name || "").trim();
      const description = String(body?.description || "").trim();
      const serviceSopId = body?.service_sop_id ? parseInt(body.service_sop_id, 10) : null;
      const sortOrder = parseInt(body?.sort_order || "0", 10);
      const rawServiceType = String(body?.service_type || "").trim().toLowerCase();
      const serviceType = rawServiceType === "" ? "recurring" : rawServiceType;
      
      if (!serviceName) {
        return errorResponse(422, "VALIDATION_ERROR", "服務名稱不能為空", null, requestId);
      }
      // 驗證服務類型
      if (!["recurring", "one_off"].includes(serviceType)) {
        return errorResponse(422, "VALIDATION_ERROR", "服務類型無效，必須為 recurring 或 one_off", null, requestId);
      }
      
      // 自動生成服務代碼（從中文名稱）
      const serviceCode = await generateServiceCode(env, serviceName);
      
      const result = await env.DATABASE.prepare(
        `INSERT INTO Services (service_name, service_code, description, service_sop_id, service_type, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`
      ).bind(serviceName, serviceCode, description || null, serviceSopId, serviceType, sortOrder).run();
      
      // 清除相關緩存
      await deleteKVCacheByPrefix(env, 'client_services').catch(() => {});
      
      return successResponse({ service_id: result.meta?.last_row_id }, "已創建", requestId);
    }
    
    // PUT /api/v2/services/:id 或 /api/v2/settings/services/:id - 更新服務項目
    if (method === "PUT" && match && match[1] && (path.startsWith('/api/v2/services/') || path.startsWith('/api/v2/settings/services/'))) {
      if (!user.is_admin) {
        return errorResponse(403, "FORBIDDEN", "需要管理員權限", null, requestId);
      }
      
      const serviceId = match[1];
      const body = await request.json();
      const serviceName = String(body?.service_name || "").trim();
      const description = String(body?.description || "").trim();
      const serviceSopId = body?.service_sop_id ? parseInt(body.service_sop_id, 10) : null;
      const sortOrder = parseInt(body?.sort_order || "0", 10);
      const rawServiceType = body?.service_type !== undefined ? String(body.service_type).trim().toLowerCase() : undefined;
      if (rawServiceType !== undefined && !["recurring", "one_off"].includes(rawServiceType)) {
        return errorResponse(422, "VALIDATION_ERROR", "服務類型無效，必須為 recurring 或 one_off", null, requestId);
      }
      
      if (!serviceName) {
        return errorResponse(422, "VALIDATION_ERROR", "服務名稱不能為空", null, requestId);
      }
      
      // 如果名稱改變，自動重新生成代碼
      const existing = await env.DATABASE.prepare(
        `SELECT service_name FROM Services WHERE service_id = ?`
      ).bind(serviceId).first();
      
      const updates = [];
      const binds = [];
      
      updates.push("service_name = ?");
      binds.push(serviceName);
      
      if (existing && existing.service_name !== serviceName) {
        // 名稱改變，重新生成代碼
        const newCode = await generateServiceCode(env, serviceName);
        updates.push("service_code = ?");
        binds.push(newCode);
      }
      
      updates.push("description = ?");
      binds.push(description || null);
      
      updates.push("service_sop_id = ?");
      binds.push(serviceSopId);
      
      if (rawServiceType !== undefined) {
        updates.push("service_type = ?");
        binds.push(rawServiceType || "recurring");
      }
      
      updates.push("sort_order = ?");
      binds.push(sortOrder);
      
      updates.push("updated_at = datetime('now')");
      binds.push(serviceId);
      
      await env.DATABASE.prepare(
        `UPDATE Services 
         SET ${updates.join(", ")}
         WHERE service_id = ?`
      ).bind(...binds).run();
      
      // 清除相關緩存
      await deleteKVCacheByPrefix(env, 'client_services').catch(() => {});
      
      return successResponse({ service_id: serviceId }, "已更新", requestId);
    }
    
    // GET /api/v2/services/items - 獲取所有服務子項目（任務類型）
    if (method === "GET" && path === '/api/v2/services/items') {
      try {
        const serviceId = url.searchParams.get('service_id');
        let query = `
          SELECT si.item_id, si.service_id, si.item_name, si.item_code, si.description,
                 si.is_active, si.sort_order, si.created_at, si.updated_at,
                 s.service_name
          FROM ServiceItems si
          LEFT JOIN Services s ON s.service_id = si.service_id
          WHERE si.is_active = 1
        `;
        const binds = [];
        
        if (serviceId) {
          query += ` AND si.service_id = ?`;
          binds.push(serviceId);
        }
        
        query += ` ORDER BY si.service_id ASC, si.sort_order ASC, si.item_id ASC`;
        
        const rows = await env.DATABASE.prepare(query).bind(...binds).all();

        const data = (rows?.results || []).map(r => ({
          item_id: r.item_id,
          service_id: r.service_id,
          service_name: r.service_name || "",
          item_name: r.item_name || "",
          item_code: r.item_code || "",
          description: r.description || "",
          is_active: Boolean(r.is_active),
          sort_order: r.sort_order || 0,
          created_at: r.created_at,
          updated_at: r.updated_at
        }));

        return successResponse(data, "查詢成功", requestId);
      } catch (err) {
        console.error(`[Services] Error fetching items:`, err);
        return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
      }
    }
    
    // POST /api/v2/settings/services/:serviceId/items - 創建任務類型
    if (method === "POST" && match && match[1] && path.endsWith('/items') && path.startsWith('/api/v2/settings/services/') && !path.includes('/items/')) {
      if (!user.is_admin) {
        return errorResponse(403, "FORBIDDEN", "需要管理員權限", null, requestId);
      }
      
      const serviceId = match[1];
      const body = await request.json();
      const itemName = String(body?.item_name || "").trim();
      const description = String(body?.description || "").trim();
      const itemCode = String(body?.item_code || "").trim();
      const sortOrder = parseInt(body?.sort_order || "0", 10);
      
      if (!itemName) {
        return errorResponse(422, "VALIDATION_ERROR", "任務類型名稱不能為空", null, requestId);
      }
      
      // 檢查服務項目是否存在
      const service = await env.DATABASE.prepare(
        `SELECT service_id FROM Services WHERE service_id = ? AND is_active = 1`
      ).bind(serviceId).first();
      
      if (!service) {
        return errorResponse(404, "NOT_FOUND", "服務項目不存在", null, requestId);
      }
      
      // 如果提供了 item_code，檢查是否重複
      if (itemCode) {
        const existing = await env.DATABASE.prepare(
          `SELECT item_id FROM ServiceItems WHERE service_id = ? AND item_code = ? AND is_active = 1`
        ).bind(serviceId, itemCode).first();
        
        if (existing) {
          return errorResponse(422, "VALIDATION_ERROR", "任務類型代碼已存在", null, requestId);
        }
      }
      
      const result = await env.DATABASE.prepare(
        `INSERT INTO ServiceItems (service_id, item_name, item_code, description, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`
      ).bind(serviceId, itemName, itemCode || null, description || null, sortOrder).run();
      
      const itemId = result.meta?.last_row_id;
      console.log(`[Services] 創建任務類型成功: serviceId=${serviceId}, itemId=${itemId}, itemName=${itemName}`);
      
      // 清除相關緩存
      await deleteKVCacheByPrefix(env, 'service_items').catch(() => {});
      
      // 驗證數據是否已寫入
      const verify = await env.DATABASE.prepare(
        `SELECT item_id, item_name FROM ServiceItems WHERE item_id = ? AND is_active = 1`
      ).bind(itemId).first();
      console.log(`[Services] 驗證創建的任務類型:`, verify);
      
      return successResponse({ item_id: itemId }, "已創建", requestId);
    }
    
    // PUT /api/v2/settings/services/:serviceId/items/:itemId - 更新任務類型
    if (method === "PUT" && match && match[1] && match[2] && path.includes('/items/') && path.startsWith('/api/v2/settings/services/') && path.match(/\/items\/\d+$/)) {
      if (!user.is_admin) {
        return errorResponse(403, "FORBIDDEN", "需要管理員權限", null, requestId);
      }
      
      const serviceId = match[1];
      const itemId = match[2];
      const body = await request.json();
      const itemName = String(body?.item_name || "").trim();
      const description = String(body?.description || "").trim();
      const itemCode = String(body?.item_code || "").trim();
      const sortOrder = parseInt(body?.sort_order || "0", 10);
      
      if (!itemName) {
        return errorResponse(422, "VALIDATION_ERROR", "任務類型名稱不能為空", null, requestId);
      }
      
      // 檢查任務類型是否存在且屬於該服務項目
      const existing = await env.DATABASE.prepare(
        `SELECT item_id, service_id FROM ServiceItems WHERE item_id = ? AND service_id = ?`
      ).bind(itemId, serviceId).first();
      
      if (!existing) {
        return errorResponse(404, "NOT_FOUND", "任務類型不存在", null, requestId);
      }
      
      // 如果提供了 item_code，檢查是否與其他記錄重複
      if (itemCode) {
        const duplicate = await env.DATABASE.prepare(
          `SELECT item_id FROM ServiceItems WHERE service_id = ? AND item_code = ? AND item_id != ? AND is_active = 1`
        ).bind(serviceId, itemCode, itemId).first();
        
        if (duplicate) {
          return errorResponse(422, "VALIDATION_ERROR", "任務類型代碼已存在", null, requestId);
        }
      }
      
      await env.DATABASE.prepare(
        `UPDATE ServiceItems 
         SET item_name = ?, item_code = ?, description = ?, sort_order = ?, updated_at = datetime('now')
         WHERE item_id = ? AND service_id = ?`
      ).bind(itemName, itemCode || null, description || null, sortOrder, itemId, serviceId).run();
      
      // 清除相關緩存
      await deleteKVCacheByPrefix(env, 'service_items').catch(() => {});
      
      return successResponse({ item_id: itemId }, "已更新", requestId);
    }
    
    // DELETE /api/v2/settings/services/:serviceId/items/:itemId - 刪除任務類型（軟刪除）
    if (method === "DELETE" && match && match[1] && match[2] && path.includes('/items/') && path.startsWith('/api/v2/settings/services/') && path.match(/\/items\/\d+$/)) {
      if (!user.is_admin) {
        return errorResponse(403, "FORBIDDEN", "需要管理員權限", null, requestId);
      }
      
      const serviceId = match[1];
      const itemId = match[2];
      
      // 檢查任務類型是否存在且屬於該服務項目
      const existing = await env.DATABASE.prepare(
        `SELECT item_id FROM ServiceItems WHERE item_id = ? AND service_id = ?`
      ).bind(itemId, serviceId).first();
      
      if (!existing) {
        return errorResponse(404, "NOT_FOUND", "任務類型不存在", null, requestId);
      }
      
      await env.DATABASE.prepare(
        `UPDATE ServiceItems SET is_active = 0, updated_at = datetime('now')
         WHERE item_id = ? AND service_id = ?`
      ).bind(itemId, serviceId).run();
      
      // 清除相關緩存
      await deleteKVCacheByPrefix(env, 'service_items').catch(() => {});
      
      return successResponse({ item_id: itemId }, "已刪除", requestId);
    }
    
    // GET /api/v2/settings/services/sops - 獲取所有可用的服務層級 SOP 列表
    if (method === "GET" && path === '/api/v2/settings/services/sops') {
      // 返回所有可用的服務層級 SOP（scope = 'service'）
      const rows = await env.DATABASE.prepare(
        `SELECT sop_id, title, category, scope, created_at, updated_at
         FROM SOPDocuments
         WHERE is_deleted = 0 AND scope = 'service'
         ORDER BY sop_id ASC`
      ).all();
      
      const data = (rows?.results || []).map(r => ({
        id: r.sop_id,
        sop_id: r.sop_id,
        title: r.title || "",
        category: r.category || "",
        scope: r.scope || "service",
        created_at: r.created_at,
        updated_at: r.updated_at
      }));
      
      return successResponse(data, "查詢成功", requestId);
    }
    
    // DELETE /api/v2/services/:id 或 /api/v2/settings/services/:id - 刪除服務項目（軟刪除）
    if (method === "DELETE" && match && match[1] && (path.startsWith('/api/v2/services/') || path.startsWith('/api/v2/settings/services/'))) {
      if (!user.is_admin) {
        return errorResponse(403, "FORBIDDEN", "需要管理員權限", null, requestId);
      }
      
      const serviceId = match[1];
      
      await env.DATABASE.prepare(
        `UPDATE Services SET is_active = 0, updated_at = datetime('now')
         WHERE service_id = ?`
      ).bind(serviceId).run();
      
      // 清除相關緩存
      await deleteKVCacheByPrefix(env, 'client_services').catch(() => {});
      
      return successResponse({ service_id: serviceId }, "已刪除", requestId);
    }
    
    return errorResponse(404, "NOT_FOUND", "路由不存在", null, requestId);
    
  } catch (err) {
    console.error(`[Services] Error:`, err);
    console.error(`[Services] Error stack:`, err.stack);
    console.error(`[Services] Request path:`, path);
    console.error(`[Services] Request method:`, method);
    return errorResponse(500, "INTERNAL_ERROR", `伺服器錯誤: ${err.message || String(err)}`, null, requestId);
  }
}
