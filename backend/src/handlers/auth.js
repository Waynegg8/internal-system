/**
 * 认证处理器
 */

import { jsonResponse, errorResponse, successResponse } from "../utils/response.js";
import { getCorsHeaders } from "../utils/cors.js";
import { getCookie, setCookie, clearCookie } from "../utils/cookie.js";
import { getSessionUser, generateSessionId, verifyPasswordPBKDF2 } from "../utils/auth.js";

export async function handleLogin(request, env, ctx, requestId) {
  if (request.method.toUpperCase() !== "POST") {
    return errorResponse(405, "METHOD_NOT_ALLOWED", "方法不允許", null, requestId);
  }
  
  let payload;
  try {
    payload = await request.json();
  } catch (_) {
    return errorResponse(400, "BAD_REQUEST", "請求格式錯誤", null, requestId);
  }
  
  const username = (payload?.username || "").trim().toLowerCase();
  const password = payload?.password || "";
  
  const errors = [];
  if (!username) errors.push({ field: "username", message: "必填" });
  if (!password) errors.push({ field: "password", message: "必填" });
  
  if (errors.length > 0) {
    return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
  }
  
  if (!env.DATABASE) {
    return errorResponse(500, "INTERNAL_ERROR", "資料庫未綁定", null, requestId);
  }
  
  try {
    const userRow = await env.DATABASE.prepare(
      "SELECT user_id, username, password_hash, name, email, is_admin, is_deleted FROM Users WHERE LOWER(username) = ? LIMIT 1"
    ).bind(username).first();
    
    const unauthorized = () => errorResponse(401, "UNAUTHORIZED", "帳號或密碼錯誤", null, requestId);
    
    if (!userRow || userRow.is_deleted === 1) {
      return unauthorized();
    }
    
    const passOk = await verifyPasswordPBKDF2(password, userRow.password_hash || "");
    if (!passOk) {
      return unauthorized();
    }
    
    // 更新最后登录时间
    await env.DATABASE.prepare(
      "UPDATE Users SET last_login = ? WHERE user_id = ?"
    ).bind(new Date().toISOString(), userRow.user_id).run();
    
    // 创建会话
    const sessionId = generateSessionId();
    const ttlSec = parseInt(env.SESSION_TTL_SECONDS || "2592000", 10);
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + ttlSec * 1000);
    
    await env.DATABASE.prepare(
      "INSERT INTO sessions (id, user_id, created_at, expires_at, meta_json) VALUES (?, ?, ?, ?, ?)"
    ).bind(
      sessionId,
      String(userRow.user_id),
      createdAt.toISOString(),
      expiresAt.toISOString(),
      JSON.stringify({ ua: request.headers.get("User-Agent") || "" })
    ).run();
    
    // 设置 Cookie
    const cookieName = String(env.SESSION_COOKIE_NAME || "session");
    // 判断是否同域访问
    const origin = request.headers.get("Origin") || "";
    const isSameDomain = origin.includes("v2.horgoscpa.com") || origin.includes("v2.www.horgoscpa.com");
    
    // 同域访问：使用 Lax，设置 domain
    // 跨域访问：使用 None 和 Secure
    const cookie = setCookie(cookieName, sessionId, { 
      maxAge: ttlSec,
      domain: isSameDomain ? ".horgoscpa.com" : null,
      sameSite: isSameDomain ? "Lax" : "None",
      secure: true
    });
    
    const data = {
      userId: String(userRow.user_id),
      username: userRow.username,
      name: userRow.name,
      email: userRow.email,
      isAdmin: userRow.is_admin === 1,
    };
    
    // 使用上面已聲明的 origin 變量
    const corsHeaders = getCorsHeaders(origin);
    
    // 合併所有 headers
    const allHeaders = {
      "Set-Cookie": cookie,
      ...corsHeaders
    };
    
    return jsonResponse(200, {
      ok: true,
      code: "OK",
      message: "成功",
      data,
      meta: { requestId },
    }, allHeaders);
    
  } catch (err) {
    console.error(`[Auth] Login error:`, err);
    const body = {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "伺服器錯誤",
      meta: { requestId },
    };
    if (env.APP_ENV && env.APP_ENV !== "prod") {
      body.error = String(err);
    }
    const origin = request.headers.get("Origin") || "";
    const corsHeaders = getCorsHeaders(origin);
    return jsonResponse(500, body, corsHeaders);
  }
}

export async function handleAuthMe(request, env, ctx, requestId, match, url) {
  // user信息已由withAuth中间件设置到ctx中
  const user = ctx?.user;
  if (!user) {
    return errorResponse(401, "UNAUTHORIZED", "未登入", null, requestId);
  }
  
  const data = {
    userId: String(user.user_id || user.id),
    id: String(user.user_id || user.id), // 兼容前端使用的id字段
    username: user.username,
    name: user.name,
    email: user.email,
    isAdmin: user.is_admin === 1 || user.isAdmin === true,
    is_admin: user.is_admin === 1 || user.isAdmin === true,
    gender: user.gender || "M",
  };
  
  const origin = request.headers.get("Origin") || "";
  const corsHeaders = getCorsHeaders(origin);
  return jsonResponse(200, {
    ok: true,
    code: "OK",
    message: "成功",
    data,
    meta: { requestId },
  }, corsHeaders);
}

export async function handleLogout(request, env, ctx, requestId) {
  if (request.method.toUpperCase() !== "POST") {
    return errorResponse(405, "METHOD_NOT_ALLOWED", "方法不允許", null, requestId);
  }
  
  try {
    const cookieName = String(env.SESSION_COOKIE_NAME || "session");
    const sessionId = getCookie(request, cookieName);
    
    if (sessionId && env.DATABASE) {
      await env.DATABASE.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
    }
    
    const clearCookieHeader = clearCookie(cookieName, {
      domain: null,
      sameSite: "None",
      secure: true
    });
    const origin = request.headers.get("Origin") || "";
    const corsHeaders = getCorsHeaders(origin);
    
    return jsonResponse(200, {
      ok: true,
      code: "OK",
      message: "已登出",
      meta: { requestId },
    }, { "Set-Cookie": clearCookieHeader, ...corsHeaders });
    
  } catch (err) {
    console.error(`[Auth] Logout error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

