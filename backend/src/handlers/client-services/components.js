/**
 * 客戶服務組件（兼容舊版 API）
 */

import { successResponse, errorResponse } from "../../utils/response.js";

/**
 * GET /api/v2/client-services/:clientServiceId/components
 * 用於舊版前端的兼容，將新的 ClientServiceTaskConfigs 結構映射回舊的 ServiceComponents 格式
 */
export async function handleGetClientServiceComponents(request, env, ctx, requestId, match) {
  const clientServiceId = parseInt(match?.[1] || 0, 10);

  if (!clientServiceId) {
    return errorResponse(400, "BAD_REQUEST", "client_service_id 無效", null, requestId);
  }

  // 取得客戶服務資料
  const clientService = await env.DATABASE.prepare(
    `SELECT client_service_id, client_id, service_id
     FROM ClientServices
     WHERE client_service_id = ? AND is_deleted = 0`
  ).bind(clientServiceId).first();

  if (!clientService) {
    return errorResponse(404, "NOT_FOUND", "客戶服務不存在", null, requestId);
  }

  // 取得任務配置（新的資料來源）
  const configs = await env.DATABASE.prepare(
    `SELECT config_id, task_name, task_description, assignee_user_id,
            estimated_hours, advance_days, due_rule, due_value, stage_order,
            execution_frequency, execution_months, auto_generate, notes, updated_at
     FROM ClientServiceTaskConfigs
     WHERE client_service_id = ? AND is_deleted = 0
     ORDER BY stage_order ASC, config_id ASC`
  ).bind(clientServiceId).all();

  const configResults = configs.results || [];

  // 取得任務相關 SOP
  const sopMap = new Map();
  if (configResults.length > 0) {
    const sopPromises = configResults.map(async (config) => {
      const sopRows = await env.DATABASE.prepare(
        `SELECT s.sop_id, s.title, s.category, s.scope
         FROM TaskConfigSOPs tcs
         JOIN SOPDocuments s ON tcs.sop_id = s.sop_id
         WHERE tcs.config_id = ?
         ORDER BY tcs.sort_order ASC`
      ).bind(config.config_id).all();
      sopMap.set(config.config_id, sopRows.results || []);
    });
    await Promise.all(sopPromises);
  }

  // 取得服務層級 SOP
  const serviceSopsResult = await env.DATABASE.prepare(
    `SELECT s.sop_id, s.title, s.category, s.scope
     FROM ClientServiceSOPs css
     JOIN SOPDocuments s ON css.sop_id = s.sop_id
     WHERE css.client_service_id = ?
     ORDER BY css.sort_order ASC`
  ).bind(clientServiceId).all();

  const serviceSops = serviceSopsResult.results || [];

  // 解析 user 名稱
  const assigneeIds = Array.from(
    new Set(
      configResults
        .map((config) => config.assignee_user_id)
        .filter((id) => id !== null && id !== undefined)
    )
  );

  let assigneeMap = new Map();
  if (assigneeIds.length > 0) {
    const placeholders = assigneeIds.map(() => "?").join(",");
    const assignees = await env.DATABASE.prepare(
      `SELECT user_id, name, username
       FROM Users
       WHERE user_id IN (${placeholders})`
    ).bind(...assigneeIds).all();

    assigneeMap = new Map(
      (assignees.results || []).map((user) => [
        user.user_id,
        {
          user_id: user.user_id,
          name: user.name || "",
          username: user.username || "",
        },
      ])
    );
  }

  // 映射為舊版結構
  const components = configResults.map((config, index) => {
    const executionMonths =
      typeof config.execution_months === "string"
        ? JSON.parse(config.execution_months || "[]")
        : config.execution_months || [];

    const assigneeInfo = assigneeMap.get(config.assignee_user_id) || null;
    const sops = sopMap.get(config.config_id) || [];

    const component = {
      component_id: config.config_id,
      client_service_id: clientServiceId,
      service_id: clientService.service_id,
      component_name: config.task_name,
      component_description: config.task_description,
      delivery_frequency: config.execution_frequency || "monthly",
      delivery_months: executionMonths,
      auto_generate_task: config.auto_generate === 1,
      stage_order: config.stage_order ?? index + 1,
      estimated_hours: config.estimated_hours,
      advance_days: config.advance_days ?? 7,
      due_rule: config.due_rule || "end_of_month",
      due_value: config.due_value,
      assignee_user_id: config.assignee_user_id,
      assignee_name: assigneeInfo?.name || null,
      notes: config.notes,
      updated_at: config.updated_at,
      sops,
    };

    // 舊版結構包含 tasks 陣列，這裡維持兼容
    component.tasks = [
      {
        task_config_id: config.config_id,
        task_name: config.task_name,
        task_description: config.task_description,
        assignee_user_id: config.assignee_user_id,
        assignee_name: assigneeInfo?.name || null,
        estimated_hours: config.estimated_hours,
        advance_days: config.advance_days ?? 7,
        due_rule: config.due_rule || "end_of_month",
        due_value: config.due_value,
        stage_order: config.stage_order ?? index + 1,
        execution_frequency: config.execution_frequency || "monthly",
        execution_months: executionMonths,
        auto_generate: config.auto_generate === 1,
        notes: config.notes,
        sops,
      },
    ];

    return component;
  });

  return successResponse(
    {
      client_service_id: clientServiceId,
      client_id: clientService.client_id,
      service_id: clientService.service_id,
      components,
      service_sops: serviceSops,
    },
    "查詢成功",
    requestId
  );
}




