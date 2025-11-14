/**
 * 自动化规则管理
 */

import { successResponse, errorResponse } from "../../utils/response.js";

/**
 * 验证排程格式
 */
function isValidSchedule(type, value) {
  if (!['daily', 'weekly', 'monthly', 'cron'].includes(type)) return false;
  if (type === 'daily') return /^\d{2}:\d{2}$/.test(value || '');
  if (type === 'weekly') return /^([A-Z][a-z]{2})\s+\d{2}:\d{2}$/.test(value || ''); // e.g. Mon 03:00
  if (type === 'monthly') return /^(\d{1,2})\s+\d{2}:\d{2}$/.test(value || ''); // e.g. 1 02:00
  if (type === 'cron') return typeof value === 'string' && value.trim().length > 0;
  return false;
}

function parseJsonSafe(s, def = null) {
  try {
    return JSON.parse(String(s || 'null'));
  } catch (_) {
    return def;
  }
}

/**
 * 获取自动化规则列表
 */
export async function handleGetAutomationRules(request, env, ctx, requestId, match, url) {
  const params = url.searchParams;
  const q = (params.get('q') || '').trim();
  const enabled = params.get('enabled');
  const page = Math.max(1, parseInt(params.get('page') || '1', 10));
  const perPage = Math.min(100, Math.max(1, parseInt(params.get('perPage') || '20', 10)));
  const offset = (page - 1) * perPage;
  
  const where = ["is_deleted = 0"];
  const binds = [];
  
  if (q) {
    where.push("rule_name LIKE ?");
    binds.push(`%${q}%`);
  }
  if (enabled === '0' || enabled === '1') {
    where.push("is_enabled = ?");
    binds.push(parseInt(enabled, 10));
  }
  
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  
  const totalRow = await env.DATABASE.prepare(
    `SELECT COUNT(1) AS total FROM AutomationRules ${whereSql}`
  ).bind(...binds).first();
  
  const rows = await env.DATABASE.prepare(
    `SELECT rule_id, rule_name, schedule_type, schedule_value, is_enabled, last_run_at, created_at, updated_at
     FROM AutomationRules ${whereSql} ORDER BY updated_at DESC, rule_id DESC LIMIT ? OFFSET ?`
  ).bind(...binds, perPage, offset).all();
  
  const data = (rows?.results || []).map(r => ({
    id: r.rule_id,
    name: r.rule_name,
    scheduleType: r.schedule_type,
    scheduleValue: r.schedule_value,
    isEnabled: r.is_enabled === 1,
    lastRunAt: r.last_run_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));
  
  return successResponse(data, "查詢成功", requestId, {
    page,
    perPage,
    total: Number(totalRow?.total || 0)
  });
}

/**
 * 获取单个自动化规则详情
 */
export async function handleGetAutomationRuleDetail(request, env, ctx, requestId, match, url) {
  const id = parseInt(match[1], 10);
  
  const row = await env.DATABASE.prepare(
    `SELECT rule_id, rule_name, schedule_type, schedule_value, condition_json, action_json, is_enabled, last_run_at, created_at, updated_at
     FROM AutomationRules WHERE rule_id = ? AND is_deleted = 0`
  ).bind(id).first();
  
  if (!row) {
    return errorResponse(404, "NOT_FOUND", "規則不存在", null, requestId);
  }
  
  const data = {
    id: row.rule_id,
    name: row.rule_name,
    scheduleType: row.schedule_type,
    scheduleValue: row.schedule_value,
    condition: parseJsonSafe(row.condition_json, {}),
    action: parseJsonSafe(row.action_json, {}),
    isEnabled: row.is_enabled === 1,
    lastRunAt: row.last_run_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
  
  return successResponse(data, "查詢成功", requestId);
}

/**
 * 创建自动化规则
 */
export async function handleCreateAutomationRule(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  const body = await request.json();
  
  const name = String(body?.rule_name || body?.name || '').trim();
  const scheduleType = String(body?.schedule_type || body?.scheduleType || '').trim();
  const scheduleValue = String(body?.schedule_value || body?.scheduleValue || '').trim();
  const condition = body?.condition_json ?? body?.condition ?? null;
  const action = body?.action_json ?? body?.action ?? null;
  
  const errors = [];
  if (!name) errors.push({ field: 'rule_name', message: '必填' });
  if (!isValidSchedule(scheduleType, scheduleValue)) {
    errors.push({ field: 'schedule', message: '排程不合法' });
  }
  if (!action) errors.push({ field: 'action', message: '必填' });
  
  if (errors.length) {
    return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
  }
  
  await env.DATABASE.prepare(
    `INSERT INTO AutomationRules (rule_name, schedule_type, schedule_value, condition_json, action_json, is_enabled) VALUES (?, ?, ?, ?, ?, 1)`
  ).bind(name, scheduleType, scheduleValue, JSON.stringify(condition ?? {}), JSON.stringify(action ?? {})).run();
  
  const idRow = await env.DATABASE.prepare(`SELECT last_insert_rowid() AS id`).first();
  
  return successResponse({ id: Number(idRow?.id || 0) }, "已建立", requestId);
}

/**
 * 更新自动化规则
 */
export async function handleUpdateAutomationRule(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  const id = parseInt(match[1], 10);
  const body = await request.json();
  
  const name = body?.rule_name !== undefined ? String(body.rule_name).trim() : undefined;
  const scheduleType = body?.schedule_type !== undefined ? String(body.schedule_type).trim() : undefined;
  const scheduleValue = body?.schedule_value !== undefined ? String(body.schedule_value).trim() : undefined;
  const isEnabled = body?.is_enabled;
  const condition = body?.condition_json !== undefined ? JSON.stringify(parseJsonSafe(body.condition_json, {})) : undefined;
  const action = body?.action_json !== undefined ? JSON.stringify(parseJsonSafe(body.action_json, {})) : undefined;
  
  const sets = [];
  const binds = [];
  
  if (name !== undefined) {
    if (!name) {
      return errorResponse(422, "VALIDATION_ERROR", "名稱必填", null, requestId);
    }
    sets.push('rule_name = ?');
    binds.push(name);
  }
  
  if (scheduleType !== undefined || scheduleValue !== undefined) {
    // 需要获取当前值来验证
    const current = await env.DATABASE.prepare(
      `SELECT schedule_type, schedule_value FROM AutomationRules WHERE rule_id = ?`
    ).bind(id).first();
    
    const t = scheduleType ?? current?.schedule_type;
    const v = scheduleValue ?? current?.schedule_value;
    
    if (!isValidSchedule(t, v)) {
      return errorResponse(422, "VALIDATION_ERROR", "排程不合法", null, requestId);
    }
    
    if (scheduleType !== undefined) {
      sets.push('schedule_type = ?');
      binds.push(scheduleType);
    }
    if (scheduleValue !== undefined) {
      sets.push('schedule_value = ?');
      binds.push(scheduleValue);
    }
  }
  
  if (condition !== undefined) {
    sets.push('condition_json = ?');
    binds.push(condition);
  }
  if (action !== undefined) {
    sets.push('action_json = ?');
    binds.push(action);
  }
  if (isEnabled === 0 || isEnabled === 1 || isEnabled === true || isEnabled === false) {
    sets.push('is_enabled = ?');
    binds.push((isEnabled === 1 || isEnabled === true) ? 1 : 0);
  }
  
  if (!sets.length) {
    return errorResponse(400, "BAD_REQUEST", "無可更新欄位", null, requestId);
  }
  
  sets.push('updated_at = datetime(\'now\')');
  binds.push(id);
  
  await env.DATABASE.prepare(
    `UPDATE AutomationRules SET ${sets.join(', ')} WHERE rule_id = ?`
  ).bind(...binds).run();
  
  return successResponse({ id }, "已更新", requestId);
}

/**
 * 删除自动化规则
 */
export async function handleDeleteAutomationRule(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  const id = parseInt(match[1], 10);
  
  await env.DATABASE.prepare(
    `UPDATE AutomationRules SET is_deleted = 1 WHERE rule_id = ?`
  ).bind(id).run();
  
  return successResponse({ id }, "已刪除", requestId);
}

/**
 * 测试自动化规则执行（dry run）
 */
export async function handleTestAutomationRule(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  const id = parseInt(match[1], 10);
  
  const row = await env.DATABASE.prepare(
    `SELECT rule_id, rule_name, schedule_type, schedule_value, condition_json, action_json, is_enabled 
     FROM AutomationRules WHERE rule_id = ? AND is_deleted = 0`
  ).bind(id).first();
  
  if (!row) {
    return errorResponse(404, "NOT_FOUND", "規則不存在", null, requestId);
  }
  
  const condition = parseJsonSafe(row.condition_json, {});
  const action = parseJsonSafe(row.action_json, {});
  
  // 这里仅返回将执行的动作摘要（干跑）；实际执行交由排程器
  const summary = {
    ruleId: row.rule_id,
    ruleName: row.rule_name,
    willExecute: !!row.is_enabled,
    condition,
    action
  };
  
  return successResponse(summary, "測試成功", requestId);
}

