/**
 * 用户管理
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { hashPasswordPBKDF2 } from "../../utils/auth.js";

/**
 * 获取所有员工列表
 */
export async function handleGetUsers(request, env, ctx, requestId, url) {
  const rows = await env.DATABASE.prepare(
    `SELECT user_id, username, name, email, is_admin, gender, start_date, base_salary, is_deleted
     FROM Users
     WHERE is_deleted = 0
     ORDER BY user_id ASC`
  ).all();
  
  const data = (rows?.results || []).map(r => {
    // 轉換資料庫格式到前端格式
    const frontendGender = r.gender === 'M' ? 'male' : r.gender === 'F' ? 'female' : r.gender;
    
    return {
      id: r.user_id, // 前端下拉選單需要的欄位（Ant Design Select 使用）
      user_id: r.user_id, // snake_case 格式
      userId: r.user_id, // camelCase 格式（向後兼容）
      username: r.username,
      name: r.name || r.username,
      email: r.email || null,
      isAdmin: Boolean(r.is_admin),
      is_admin: Boolean(r.is_admin), // 同時提供 snake_case
      gender: frontendGender,
      hire_date: r.start_date,
      startDate: r.start_date,
      start_date: r.start_date, // 同時提供 snake_case
      base_salary: r.base_salary || 0, // 底薪（以元為單位）
      baseSalary: r.base_salary || 0, // camelCase 格式（向後兼容）
      isDeleted: Boolean(r.is_deleted),
      is_deleted: Boolean(r.is_deleted) // 同時提供 snake_case
    };
  });
  
  return successResponse(data, "查詢成功", requestId);
}

/**
 * 创建新用户
 */
export async function handleCreateUser(request, env, ctx, requestId, url) {
  const body = await request.json();
  const { name, username, password, is_admin, email } = body;
  
  if (!name || !username || !password) {
    return errorResponse(422, "VALIDATION_ERROR", "姓名、帳號和密碼為必填項", null, requestId);
  }
  
  if (password.length < 6) {
    return errorResponse(422, "VALIDATION_ERROR", "密碼長度至少需要 6 個字元", null, requestId);
  }
  
  // 检查用户名是否已存在
  const existing = await env.DATABASE.prepare(
    `SELECT user_id FROM Users WHERE username = ?`
  ).bind(username).first();
  
  if (existing) {
    return errorResponse(422, "VALIDATION_ERROR", "此帳號已存在", null, requestId);
  }
  
  const hashedPassword = await hashPasswordPBKDF2(password);
  const safeEmail = (email && String(email).trim() !== '') ? email : `${username}@example.com`;
  
  // 嘗試插入（帶 plain_password 欄位）；如失敗則回退到無該欄位的結構，提升相容性
  try {
    const result = await env.DATABASE.prepare(
      `INSERT INTO Users (username, password_hash, plain_password, name, email, is_admin, gender, start_date, is_deleted) 
       VALUES (?, ?, ?, ?, ?, ?, 'M', datetime('now'), 0)`
    ).bind(username, hashedPassword, password, name, safeEmail, is_admin ? 1 : 0).run();
    return successResponse({ user_id: result.meta?.last_row_id }, "已創建", requestId);
  } catch (e1) {
    try {
      const result2 = await env.DATABASE.prepare(
        `INSERT INTO Users (username, password_hash, name, email, is_admin, gender, start_date, is_deleted) 
         VALUES (?, ?, ?, ?, ?, 'M', datetime('now'), 0)`
      ).bind(username, hashedPassword, name, safeEmail, is_admin ? 1 : 0).run();
      return successResponse({ user_id: result2.meta?.last_row_id }, "已創建", requestId);
    } catch (e2) {
      return errorResponse(500, "INTERNAL_ERROR", `建立用戶失敗: ${e2?.message || e2}`, null, requestId);
    }
  }
}

/**
 * 更新用户信息
 */
export async function handleUpdateUser(request, env, ctx, requestId, match, url) {
  const userId = match[1];
  const body = await request.json();
  const { name, username, is_admin, email, gender, hire_date } = body;
  
  if (!name || !username) {
    return errorResponse(422, "VALIDATION_ERROR", "姓名和帳號為必填項", null, requestId);
  }
  
  // 性別驗證
  const errors = [];
  if (gender !== undefined) {
    if (!gender || gender === "") {
      errors.push({ field: "gender", message: "請選擇性別" });
    } else if (!["male", "female"].includes(gender)) {
      errors.push({ field: "gender", message: "性別必須為 male 或 female" });
    }
  }
  
  if (errors.length > 0) {
    return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
  }
  
  // 检查用户是否存在
  const existingUser = await env.DATABASE.prepare(
    `SELECT user_id FROM Users WHERE user_id = ? AND is_deleted = 0`
  ).bind(userId).first();
  
  if (!existingUser) {
    return errorResponse(404, "NOT_FOUND", "用戶不存在", null, requestId);
  }
  
  // 检查用户名是否被其他用户占用
  const duplicate = await env.DATABASE.prepare(
    `SELECT user_id FROM Users WHERE username = ? AND user_id != ?`
  ).bind(username, userId).first();
  
  if (duplicate) {
    return errorResponse(422, "VALIDATION_ERROR", "此帳號已被其他用戶使用", null, requestId);
  }
  
  // 動態構建 UPDATE 語句
  const updates = [];
  const binds = [];
  
  updates.push("name = ?");
  binds.push(name);
  
  updates.push("username = ?");
  binds.push(username);
  
  updates.push("is_admin = ?");
  binds.push(is_admin ? 1 : 0);
  
  updates.push("email = ?");
  binds.push(email || '');
  
  if (gender !== undefined) {
    updates.push("gender = ?");
    // 轉換 male/female 為 M/F 格式
    const dbGender = gender === 'male' ? 'M' : gender === 'female' ? 'F' : gender;
    binds.push(dbGender);
  }
  
  if (hire_date !== undefined) {
    updates.push("start_date = ?");
    binds.push(hire_date || null);
  }
  
  binds.push(userId);
  
  await env.DATABASE.prepare(
    `UPDATE Users SET ${updates.join(", ")} WHERE user_id = ?`
  ).bind(...binds).run();
  
  return successResponse({ userId }, "已更新", requestId);
}

/**
 * 删除用户（软删除）
 */
export async function handleDeleteUser(request, env, ctx, requestId, match, url) {
  const userId = match[1];
  
  // 不允许删除admin用户（user_id = 1）
  if (userId === "1") {
    return errorResponse(403, "FORBIDDEN", "不能刪除管理員帳號", null, requestId);
  }
  
  // 检查用户是否存在
  const existingUser = await env.DATABASE.prepare(
    `SELECT user_id FROM Users WHERE user_id = ? AND is_deleted = 0`
  ).bind(userId).first();
  
  if (!existingUser) {
    return errorResponse(404, "NOT_FOUND", "用戶不存在", null, requestId);
  }
  
  // 软删除
  await env.DATABASE.prepare(
    `UPDATE Users SET is_deleted = 1 WHERE user_id = ?`
  ).bind(userId).run();
  
  return successResponse({ userId }, "已刪除", requestId);
}

