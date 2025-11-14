/**
 * 用户资料管理
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { hashPasswordPBKDF2, verifyPasswordPBKDF2 } from "../../utils/auth.js";

/**
 * 获取用户详情
 */
export async function handleGetUserProfile(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  
  // 验证用户身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  const userId = parseInt(match[1], 10);
  
  // 权限检查：只能查看自己的资料，或管理员可以查看任何人
  if (!user.is_admin && user.user_id !== userId) {
    return errorResponse(403, "FORBIDDEN", "沒有權限查看此用戶資料", null, requestId);
  }
  
  const userData = await env.DATABASE.prepare(
    `SELECT user_id, username, name, email, is_admin, start_date as hire_date, gender, 
            birth_date, phone, address, emergency_contact_name, emergency_contact_phone,
            created_at, last_login
     FROM Users 
     WHERE user_id = ? AND is_deleted = 0`
  ).bind(userId).first();
  
  if (!userData) {
    return errorResponse(404, "NOT_FOUND", "用戶不存在", null, requestId);
  }
  
  // 轉換資料庫格式到前端格式
  const frontendGender = userData.gender === 'M' ? 'male' : userData.gender === 'F' ? 'female' : userData.gender;
  
  const data = {
    user_id: userData.user_id,
    username: userData.username,
    name: userData.name || userData.username,
    email: userData.email,
    is_admin: Boolean(userData.is_admin),
    hire_date: userData.hire_date || null,
    gender: frontendGender || null,
    birth_date: userData.birth_date || null,
    phone: userData.phone || null,
    address: userData.address || null,
    emergency_contact_name: userData.emergency_contact_name || null,
    emergency_contact_phone: userData.emergency_contact_phone || null,
    created_at: userData.created_at,
    last_login: userData.last_login
  };
  
  return successResponse(data, "查詢成功", requestId);
}

/**
 * 更新用户个人资料
 */
export async function handleUpdateUserProfile(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  
  // 验证用户身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  const userId = parseInt(match[1], 10);
  const body = await request.json();
  
  // 权限检查：只能更新自己的资料，或管理员可以更新任何人
  if (!user.is_admin && user.user_id !== userId) {
    return errorResponse(403, "FORBIDDEN", "沒有權限修改此用戶資料", null, requestId);
  }
  
  const { hire_date, gender, birth_date, phone, address, emergency_contact_name, emergency_contact_phone } = body;
  
  // 验证
  const errors = [];
  if (hire_date && !/^\d{4}-\d{2}-\d{2}$/.test(hire_date)) {
    errors.push({ field: "hire_date", message: "日期格式錯誤（應為 YYYY-MM-DD）" });
  }
  // 性別驗證：如果提供了 gender 欄位（不是 undefined），則必須是有效值
  if (gender !== undefined) {
    if (!gender || gender === "") {
      errors.push({ field: "gender", message: "請選擇性別" });
    } else if (!["male", "female"].includes(gender)) {
      errors.push({ field: "gender", message: "性別必須為 male 或 female" });
    }
  }
  if (birth_date && !/^\d{4}-\d{2}-\d{2}$/.test(birth_date)) {
    errors.push({ field: "birth_date", message: "日期格式錯誤（應為 YYYY-MM-DD）" });
  }
  
  if (errors.length > 0) {
    return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
  }
  
  // 检查用户是否存在
  const existing = await env.DATABASE.prepare(
    "SELECT 1 FROM Users WHERE user_id = ? AND is_deleted = 0"
  ).bind(userId).first();
  
  if (!existing) {
    return errorResponse(404, "NOT_FOUND", "用戶不存在", null, requestId);
  }
  
  // 更新资料
  const now = new Date().toISOString();
  const updates = [];
  const binds = [];
  
  if (hire_date !== undefined) {
    updates.push("start_date = ?");
    binds.push(hire_date || null);
  }
  if (gender !== undefined) {
    updates.push("gender = ?");
    // 轉換 male/female 為 M/F 格式
    const dbGender = gender === 'male' ? 'M' : gender === 'female' ? 'F' : gender;
    binds.push(dbGender || null);
  }
  if (birth_date !== undefined) {
    updates.push("birth_date = ?");
    binds.push(birth_date || null);
  }
  if (phone !== undefined) {
    updates.push("phone = ?");
    binds.push(phone || null);
  }
  if (address !== undefined) {
    updates.push("address = ?");
    binds.push(address || null);
  }
  if (emergency_contact_name !== undefined) {
    updates.push("emergency_contact_name = ?");
    binds.push(emergency_contact_name || null);
  }
  if (emergency_contact_phone !== undefined) {
    updates.push("emergency_contact_phone = ?");
    binds.push(emergency_contact_phone || null);
  }
  
  if (updates.length > 0) {
    updates.push("updated_at = ?");
    binds.push(now);
    binds.push(userId);
    
    await env.DATABASE.prepare(
      `UPDATE Users SET ${updates.join(", ")} WHERE user_id = ?`
    ).bind(...binds).run();
  }
  
  return successResponse({ user_id: userId }, "更新成功", requestId);
}

/**
 * 修改密码（需要提供当前密码）
 */
export async function handleChangePassword(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  
  // 验证用户身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  const body = await request.json();
  const { current_password, new_password } = body;
  
  // 验证
  const errors = [];
  if (!current_password) {
    errors.push({ field: "current_password", message: "請輸入當前密碼" });
  }
  if (!new_password) {
    errors.push({ field: "new_password", message: "請輸入新密碼" });
  }
  if (new_password && new_password.length < 6) {
    errors.push({ field: "new_password", message: "密碼長度至少需要 6 個字元" });
  }
  
  if (errors.length > 0) {
    return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
  }
  
  // 获取当前用户的密码哈希
  const userData = await env.DATABASE.prepare(
    "SELECT password_hash FROM Users WHERE user_id = ? AND is_deleted = 0"
  ).bind(user.user_id).first();
  
  if (!userData) {
    return errorResponse(404, "NOT_FOUND", "用戶不存在", null, requestId);
  }
  
  // 验证当前密码
  const isValid = await verifyPasswordPBKDF2(current_password, userData.password_hash);
  if (!isValid) {
    return errorResponse(401, "UNAUTHORIZED", "當前密碼錯誤", null, requestId);
  }
  
  // 生成新密码哈希
  const newHash = await hashPasswordPBKDF2(new_password);
  
  // 更新密码（包含明文密碼）
  const now = new Date().toISOString();
  await env.DATABASE.prepare(
    "UPDATE Users SET password_hash = ?, plain_password = ?, updated_at = ? WHERE user_id = ?"
  ).bind(newHash, new_password, now, user.user_id).run();
  
  return successResponse({ user_id: user.user_id }, "密碼修改成功", requestId);
}

/**
 * 管理员查看用户密码（明文）
 */
export async function handleGetUserPassword(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  
  // 验证用户身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  // 权限检查：仅管理员
  if (!user.is_admin) {
    return errorResponse(403, "FORBIDDEN", "此功能僅限管理員使用", null, requestId);
  }
  
  const userId = parseInt(match[1], 10);
  
  // 查询用户密码
  const userData = await env.DATABASE.prepare(
    "SELECT user_id, username, name, plain_password FROM Users WHERE user_id = ? AND is_deleted = 0"
  ).bind(userId).first();
  
  if (!userData) {
    return errorResponse(404, "NOT_FOUND", "用戶不存在", null, requestId);
  }
  
  // 如果密碼為空（舊用戶可能沒有明文密碼）
  if (!userData.plain_password) {
    return successResponse({ 
      user_id: userId, 
      username: userData.username,
      name: userData.name,
      password: null,
      message: "此用戶密碼創建於舊系統，無明文記錄。請使用「重置密碼」功能重設密碼。"
    }, "查詢成功", requestId);
  }
  
  return successResponse({ 
    user_id: userId,
    username: userData.username,
    name: userData.name,
    password: userData.plain_password
  }, "查詢成功", requestId);
}

/**
 * 管理员重置用户密码
 */
export async function handleResetUserPassword(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  
  // 验证用户身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  const userId = parseInt(match[1], 10);
  const body = await request.json();
  
  // 权限检查：仅管理员
  if (!user.is_admin) {
    return errorResponse(403, "FORBIDDEN", "此功能僅限管理員使用", null, requestId);
  }
  
  const { new_password } = body;
  
  // 验证
  const errors = [];
  if (!new_password) {
    errors.push({ field: "new_password", message: "請輸入新密碼" });
  }
  if (new_password && new_password.length < 6) {
    errors.push({ field: "new_password", message: "密碼長度至少需要 6 個字元" });
  }
  
  if (errors.length > 0) {
    return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
  }
  
  // 检查用户是否存在
  const userData = await env.DATABASE.prepare(
    "SELECT user_id, name FROM Users WHERE user_id = ? AND is_deleted = 0"
  ).bind(userId).first();
  
  if (!userData) {
    return errorResponse(404, "NOT_FOUND", "用戶不存在", null, requestId);
  }
  
  // 生成新密码哈希
  const newHash = await hashPasswordPBKDF2(new_password);
  
  // 更新密码（包含明文密碼，供管理員查看）
  const now = new Date().toISOString();
  await env.DATABASE.prepare(
    "UPDATE Users SET password_hash = ?, plain_password = ?, updated_at = ? WHERE user_id = ?"
  ).bind(newHash, new_password, now, userId).run();
  
  return successResponse({ user_id: userId, user_name: userData.name }, "已重置密碼", requestId);
}

