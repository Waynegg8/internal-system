/**
 * 任務通知 CRUD 操作
 */

import { successResponse, errorResponse } from "../../utils/response.js";

/**
 * 解析 payload_json
 */
function parsePayload(row) {
  if (!row.payload_json) return {};
  try {
    return JSON.parse(row.payload_json);
  } catch (err) {
    console.warn("[Notifications] 無法解析 payload", err);
    return {};
  }
}

/**
 * 映射通知行數據為 API 響應格式
 */
function mapNotificationRow(row) {
  const payload = parsePayload(row);
  return {
    notification_id: row.alert_id,
    alert_id: row.alert_id, // 兼容字段
    notification_type: row.alert_type,
    alert_type: row.alert_type, // 兼容字段
    title: row.title || '',
    content: row.description || payload.description || '',
    description: row.description || payload.description || '', // 兼容字段
    related_url: row.link || payload.taskDetailLink || null,
    link: row.link || payload.taskDetailLink || null, // 兼容字段
    is_read: row.is_read === 1 || row.is_read === true,
    read_at: row.read_at || null,
    created_at: row.created_at,
    payload: payload
  };
}

/**
 * 獲取通知列表
 */
export async function handleGetNotifications(request, env, ctx, requestId, match, url) {
  if (request.method.toUpperCase() !== "GET") {
    return errorResponse(405, "METHOD_NOT_ALLOWED", "不支援的 HTTP 方法", null, requestId);
  }

  const user = ctx?.user;
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "請先登入", null, requestId);
  }

  try {
    const params = url.searchParams;
    
    // 解析查詢參數
    const page = Math.max(1, parseInt(params.get("page") || "1", 10));
    const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "20", 10)));
    const offset = (page - 1) * perPage;
    
    // 篩選條件
    const alertType = params.get("alert_type") || params.get("notification_type");
    const isRead = params.get("is_read"); // "true", "false", 或 null
    
    // 構建 WHERE 條件
    const where = ["user_id = ?"];
    const binds = [user.user_id];
    
    // 只查詢任務通知（is_admin_alert = 0）
    where.push("is_admin_alert = 0");
    
    // 篩選通知類型
    if (alertType) {
      const validTypes = ['overdue', 'upcoming', 'delay', 'conflict'];
      if (validTypes.includes(alertType)) {
        where.push("alert_type = ?");
        binds.push(alertType);
      }
    }
    
    // 篩選已讀/未讀狀態
    if (isRead === "true") {
      where.push("is_read = 1");
    } else if (isRead === "false") {
      where.push("is_read = 0");
    }
    
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    
    // 查詢總數
    const countRow = await env.DATABASE.prepare(
      `SELECT COUNT(1) AS total FROM DashboardAlerts ${whereSql}`
    ).bind(...binds).first();
    const total = Number(countRow?.total || 0);
    
    // 查詢通知列表（按 created_at DESC 排序）
    const rows = await env.DATABASE.prepare(
      `SELECT 
        alert_id,
        user_id,
        alert_type,
        title,
        description,
        link,
        payload_json,
        is_admin_alert,
        is_read,
        read_at,
        created_at
       FROM DashboardAlerts
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(...binds, perPage, offset).all();
    
    // 映射數據
    const notifications = (rows?.results || []).map(mapNotificationRow);
    
    // 查詢未讀通知數量（用於響應）
    const unreadCountRow = await env.DATABASE.prepare(
      `SELECT COUNT(1) AS total 
       FROM DashboardAlerts 
       WHERE user_id = ? AND is_admin_alert = 0 AND is_read = 0`
    ).bind(user.user_id).first();
    const unreadCount = Number(unreadCountRow?.total || 0);
    
    return successResponse(
      {
        notifications: notifications,
        unreadCount: unreadCount,
        pagination: {
          page,
          perPage,
          total,
          totalPages: Math.ceil(total / perPage)
        }
      },
      "查詢成功",
      requestId
    );
  } catch (err) {
    console.error("[Notifications] 查詢通知列表失敗:", err);
    return errorResponse(500, "INTERNAL_ERROR", `查詢失敗: ${err.message || String(err)}`, null, requestId);
  }
}

/**
 * 標記通知為已讀
 */
export async function handleMarkNotificationAsRead(request, env, ctx, requestId, match, url) {
  if (request.method.toUpperCase() !== "PUT") {
    return errorResponse(405, "METHOD_NOT_ALLOWED", "不支援的 HTTP 方法", null, requestId);
  }

  const user = ctx?.user;
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "請先登入", null, requestId);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const notificationId = match?.[1]; // 從路由參數獲取通知 ID（單個標記）
    const notificationIds = body.notification_ids || body.ids || (notificationId ? [notificationId] : []); // 支持批量標記

    // 驗證輸入
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return errorResponse(400, "BAD_REQUEST", "請提供要標記的通知 ID 列表", null, requestId);
    }

    // 驗證所有 ID 都是有效的數字
    const validIds = notificationIds
      .map(id => {
        const numId = typeof id === 'string' ? parseInt(id, 10) : id;
        return isNaN(numId) ? null : numId;
      })
      .filter(id => id !== null);

    if (validIds.length === 0) {
      return errorResponse(400, "BAD_REQUEST", "無效的通知 ID", null, requestId);
    }

    // 構建 WHERE 條件：確保通知屬於當前用戶
    const placeholders = validIds.map(() => '?').join(',');
    const nowIso = new Date().toISOString();

    // 第一步：驗證所有通知都屬於當前用戶
    const existingNotifications = await env.DATABASE.prepare(
      `SELECT alert_id, user_id, is_read
       FROM DashboardAlerts
       WHERE alert_id IN (${placeholders})
         AND user_id = ?
         AND is_admin_alert = 0`
    ).bind(...validIds, user.user_id).all();

    const existingIds = (existingNotifications.results || []).map(row => row.alert_id);
    
    if (existingIds.length === 0) {
      return errorResponse(404, "NOT_FOUND", "未找到屬於當前用戶的通知", null, requestId);
    }

    // 檢查是否有部分通知不屬於當前用戶
    if (existingIds.length < validIds.length) {
      const notFoundIds = validIds.filter(id => !existingIds.includes(id));
      console.warn(`[Notifications] 部分通知不屬於當前用戶: ${notFoundIds.join(', ')}`);
    }

    // 第二步：更新通知為已讀（只更新未讀的通知）
    const updateResult = await env.DATABASE.prepare(
      `UPDATE DashboardAlerts
       SET is_read = 1,
           read_at = ?
       WHERE alert_id IN (${placeholders})
         AND user_id = ?
         AND is_read = 0
         AND is_admin_alert = 0`
    ).bind(nowIso, ...existingIds, user.user_id).run();

    const updatedCount = updateResult.meta?.changes || 0;

    // 查詢更新後的通知信息
    const updatedNotifications = await env.DATABASE.prepare(
      `SELECT alert_id, is_read, read_at
       FROM DashboardAlerts
       WHERE alert_id IN (${placeholders})
         AND user_id = ?`
    ).bind(...existingIds, user.user_id).all();

    return successResponse(
      {
        updatedCount: updatedCount,
        notificationIds: existingIds,
        notifications: (updatedNotifications.results || []).map(row => ({
          notification_id: row.alert_id,
          alert_id: row.alert_id, // 兼容字段
          is_read: row.is_read === 1 || row.is_read === true,
          read_at: row.read_at
        }))
      },
      updatedCount > 0 ? `已標記 ${updatedCount} 條通知為已讀` : "所有通知已是已讀狀態",
      requestId
    );
  } catch (err) {
    console.error("[Notifications] 標記通知為已讀失敗:", err);
    return errorResponse(500, "INTERNAL_ERROR", `標記失敗: ${err.message || String(err)}`, null, requestId);
  }
}

