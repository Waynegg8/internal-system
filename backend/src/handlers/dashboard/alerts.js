/**
 * 儀表板提醒與摘要 API
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { todayYmd } from "./utils.js";
import { rebuildDailyDashboardSummary } from "./daily-summary.js";

function parseScope(searchParams) {
  const scope = (searchParams.get("scope") || "assigned").toLowerCase();
  return scope === "all" ? "all" : "assigned";
}

function buildAlertTitle(row) {
  switch (row.event_type) {
    case "stage_auto_start":
      return `${row.company_name || "未命名客戶"} - ${row.task_type || "任務"} 的新階段已啟動`;
    case "stage_delay_adjust":
      return `${row.company_name || "未命名客戶"} - ${row.task_type || "任務"} 已順延`;
    case "service_all_completed":
      return `${row.company_name || "未命名客戶"} 所有任務完成`;
    case "auto_generated":
    default:
      return `${row.company_name || "未命名客戶"} - ${row.task_type || "任務"} 已自動建立`;
  }
}

function parsePayload(row) {
  if (!row.payload_json) return {};
  try {
    return JSON.parse(row.payload_json);
  } catch (err) {
    console.warn("[DashboardAlerts] 無法解析 payload", err);
    return {};
  }
}

function mapAlertRow(row) {
  const payload = parsePayload(row);
  return {
    id: row.event_id,
    type: row.event_type,
    title: buildAlertTitle(row),
    taskId: row.task_id,
    configId: row.config_id,
    clientName: row.company_name,
    serviceName: row.service_name,
    assignee: row.assignee_name
      ? { id: row.assignee_user_id, name: row.assignee_name }
      : null,
    dueDate: row.due_date,
    delayDays: payload.delayDays ?? payload.delay_days ?? null,
    createdAt: row.created_at,
    payload,
  };
}

function mapDashboardAlertRow(row) {
  const payload = parsePayload(row);
  return {
    id: `alert-${row.alert_id}`,
    type: row.alert_type,
    title: row.title || buildAlertTitle({ event_type: row.alert_type, company_name: payload.clientName, task_type: payload.taskName }),
    taskId: payload.taskId || payload.task_id || null,
    configId: payload.configId || null,
    clientName: payload.clientName || row.client_name || null,
    serviceName: payload.serviceName || payload.service_name || null,
    assignee: payload.assignee
      ? { id: payload.assignee.id || payload.assignee_user_id, name: payload.assignee.name || payload.assignee_username }
      : null,
    dueDate: payload.dueDate || payload.due_date || null,
    delayDays: payload.delayDays ?? payload.delay_days ?? null,
    createdAt: row.created_at,
    description: row.description || payload.description || null,
    link: row.link || payload.link || null,
    payload,
  };
}

async function fetchRealtimeAlerts(env, scope, userId) {
  const alerts = await env.DATABASE.prepare(
    `SELECT l.event_id, l.task_id, l.config_id, l.event_type, l.triggered_by, l.payload_json, l.created_at,
            t.task_type, t.due_date, t.status, t.assignee_user_id,
            c.company_name, s.service_name,
            u.username AS assignee_name
     FROM TaskEventLogs l
     LEFT JOIN ActiveTasks t ON l.task_id = t.task_id
     LEFT JOIN Clients c ON t.client_id = c.client_id
     LEFT JOIN Services s ON t.service_id = s.service_id
     LEFT JOIN Users u ON t.assignee_user_id = u.user_id
     WHERE l.created_at >= datetime('now', '-1 day')
     ORDER BY l.created_at DESC
     LIMIT 40`
  ).all();

  const list = (alerts.results || []).filter((row) => {
    if (scope === "all") return true;
    if (!row.assignee_user_id) return false;
    return Number(row.assignee_user_id) === Number(userId);
  });

  return list.map(mapAlertRow);
}

async function fetchDashboardTargetedAlerts(env, user) {
  const rows = await env.DATABASE.prepare(
    `SELECT alert_id, user_id, alert_type, title, description, link, payload_json, is_admin_alert, created_at
     FROM DashboardAlerts
     WHERE (user_id = ?)
        OR (is_admin_alert = 1 AND ? = 1)
     ORDER BY created_at DESC
     LIMIT 40`
  ).bind(user.user_id, user.is_admin ? 1 : 0).all();

  return (rows.results || []).map(mapDashboardAlertRow);
}

async function fetchDailySummary(env) {
  const summaryDate = todayYmd();
  const existing = await env.DATABASE.prepare(
    `SELECT payload_json, generated_at FROM DashboardSummary
     WHERE summary_date = ? AND scope = 'global'
     LIMIT 1`
  )
    .bind(summaryDate)
    .first();

  if (existing?.payload_json) {
    try {
      const payload = JSON.parse(existing.payload_json);
      payload.generatedAt = existing.generated_at || payload.generatedAt;
      return payload;
    } catch (err) {
      console.warn("[DashboardAlerts] 無法解析 DashboardSummary payload", err);
    }
  }

  return rebuildDailyDashboardSummary(env);
}

export async function handleDashboardAlerts(request, env, ctx, requestId, match, url) {
  if (request.method.toUpperCase() !== "GET") {
    return errorResponse(405, "METHOD_NOT_ALLOWED", "不支援的 HTTP 方法", null, requestId);
  }

  const user = ctx?.user;
  if (!user) {
    return errorResponse(401, "UNAUTHORIZED", "請先登入", null, requestId);
  }

  try {
    const scope = parseScope(url.searchParams);
    const [realtimeAlerts, targetedAlerts, dailySummary] = await Promise.all([
      fetchRealtimeAlerts(env, scope, user.user_id),
      fetchDashboardTargetedAlerts(env, user).catch((err) => {
        console.error("[DashboardAlerts] Targeted alert fetch error", err);
        return [];
      }),
      fetchDailySummary(env),
    ]);

    const mergedAlerts = [...targetedAlerts, ...realtimeAlerts].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return successResponse(
      {
        realtimeAlerts: mergedAlerts,
        dailySummary,
      },
      "查詢成功",
      requestId
    );
  } catch (err) {
    console.error("[DashboardAlerts] Error", err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

