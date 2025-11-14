/**
 * 儀表板每日摘要重建
 */

import { todayYmd } from "./utils.js";

function formatTaskRow(row) {
  return {
    taskId: row.task_id,
    taskName: row.task_type,
    clientName: row.company_name,
    serviceName: row.service_name,
    assignee: row.assignee_name
      ? { id: row.assignee_user_id, name: row.assignee_name }
      : null,
    dueDate: row.due_date,
    status: row.status,
  };
}

export async function rebuildDailyDashboardSummary(env, targetDate = new Date()) {
  const summaryDate = todayYmd(targetDate);

  const overdueRows = await env.DATABASE.prepare(
    `SELECT t.task_id, t.task_type, t.due_date, t.status,
            t.assignee_user_id, u.username AS assignee_name,
            c.company_name, s.service_name
     FROM ActiveTasks t
     LEFT JOIN Clients c ON t.client_id = c.client_id
     LEFT JOIN Services s ON t.service_id = s.service_id
     LEFT JOIN Users u ON t.assignee_user_id = u.user_id
     WHERE t.is_deleted = 0
       AND t.status != 'completed'
       AND t.due_date IS NOT NULL
       AND t.due_date < ?
     ORDER BY t.due_date ASC
     LIMIT 20`
  )
    .bind(summaryDate)
    .all();

  const dueTodayRows = await env.DATABASE.prepare(
    `SELECT t.task_id, t.task_type, t.due_date, t.status,
            t.assignee_user_id, u.username AS assignee_name,
            c.company_name, s.service_name
     FROM ActiveTasks t
     LEFT JOIN Clients c ON t.client_id = c.client_id
     LEFT JOIN Services s ON t.service_id = s.service_id
     LEFT JOIN Users u ON t.assignee_user_id = u.user_id
     WHERE t.is_deleted = 0
       AND t.status != 'completed'
       AND t.due_date = ?
     ORDER BY t.task_id ASC
     LIMIT 20`
  )
    .bind(summaryDate)
    .all();

  const waitingRows = await env.DATABASE.prepare(
    `SELECT t.task_id, t.task_type, t.due_date, t.status,
            t.assignee_user_id, u.username AS assignee_name,
            c.company_name, s.service_name
     FROM ActiveTasks t
     LEFT JOIN Clients c ON t.client_id = c.client_id
     LEFT JOIN Services s ON t.service_id = s.service_id
     LEFT JOIN Users u ON t.assignee_user_id = u.user_id
     WHERE t.is_deleted = 0
       AND t.status IN ('pending', 'in_progress')
       AND (t.due_date IS NULL OR t.due_date >= ?)
     ORDER BY t.updated_at DESC
     LIMIT 20`
  )
    .bind(summaryDate)
    .all();

  const sections = {
    overdue: (overdueRows.results || []).map(formatTaskRow),
    dueToday: (dueTodayRows.results || []).map(formatTaskRow),
    waitingForUpdate: (waitingRows.results || []).map(formatTaskRow),
  };

  const summaryPayload = {
    date: summaryDate,
    generatedAt: new Date().toISOString(),
    stats: {
      overdue: overdueRows.results?.length || 0,
      dueToday: dueTodayRows.results?.length || 0,
      waitingForUpdate: waitingRows.results?.length || 0,
    },
    items: [
      ...sections.overdue,
      ...sections.dueToday,
      ...sections.waitingForUpdate,
    ].slice(0, 50),
    sections,
  };

  await env.DATABASE.prepare(
    `INSERT INTO DashboardSummary (summary_date, scope, payload_json)
     VALUES (?, 'global', ?)
     ON CONFLICT(summary_date, scope) DO UPDATE
     SET payload_json = excluded.payload_json,
         generated_at = datetime('now')`
  )
    .bind(summaryDate, JSON.stringify(summaryPayload))
    .run();

  return summaryPayload;
}

