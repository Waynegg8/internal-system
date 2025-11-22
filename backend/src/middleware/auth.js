/**
 * 认证中间件
 */

import { getSessionUser } from "../utils/auth.js";
import { errorResponse } from "../utils/response.js";
import { getCorsHeaders } from "../utils/cors.js";

/**
 * 要求用户登录
 */
export async function requireAuth(request, env) {
  // 支援非正式環境的內部測試 Token，繞過跨網域 Cookie 問題
  const internalToken = request.headers.get('x-internal-test-token');
  const allowInternal = (env?.APP_ENV && env.APP_ENV !== 'prod') && internalToken && internalToken === (env.INTERNAL_TEST_TOKEN || 'e2e-allow');
  if (allowInternal) {
    // 提供最小必要的管理員身分
    return { user: { user_id: -1, username: 'e2e', name: 'E2E', is_admin: true } };
  }
  const user = await getSessionUser(request, env);
  if (!user) {
    const origin = request.headers.get("Origin") || "";
    return errorResponse(401, "UNAUTHORIZED", "未登入", null, null);
  }
  return { user };
}

/**
 * 要求管理员权限
 */
export async function requireAdmin(request, env) {
  console.log(`[requireAdmin] 開始檢查管理員權限，URL: ${request.url}`);
  const result = await requireAuth(request, env);
  
  // 如果 requireAuth 返回 Response（未登入），直接返回
  if (result instanceof Response) {
    console.log(`[requireAdmin] requireAuth 返回 Response，狀態: ${result.status}`);
    return result;
  }
  
  const { user } = result;
  
  // 嚴格檢查 is_admin 字段
  // 從 getSessionUser 返回的 is_admin 已經是 boolean (row.is_admin === 1)
  // 必須明確為 true 或 1 才認為是管理員
  // 優先檢查 is_admin，如果不存在則檢查 isAdmin
  const isAdminValue = user.is_admin !== undefined && user.is_admin !== null 
    ? user.is_admin 
    : (user.isAdmin !== undefined && user.isAdmin !== null ? user.isAdmin : false);
  
  // 嚴格檢查：只有明確為 true 或 1 才認為是管理員
  // 排除 false, 0, null, undefined, '0', 'false' 等
  // 使用最嚴格的檢查：必須是 true 或數字 1
  let isAdmin = false;
  if (isAdminValue === true) {
    isAdmin = true;
  } else if (isAdminValue === 1) {
    isAdmin = true;
  } else if (typeof isAdminValue === 'number' && isAdminValue === 1) {
    isAdmin = true;
  } else if (typeof isAdminValue === 'string' && isAdminValue === '1') {
    isAdmin = true;
  } else {
    isAdmin = false;
  }
  
  // 詳細調試日誌
  console.log(`[requireAdmin] 檢查用戶權限: user_id=${user?.user_id}, username=${user?.username}, is_admin=${JSON.stringify(user?.is_admin)} (${typeof user?.is_admin}), isAdmin=${JSON.stringify(user?.isAdmin)} (${typeof user?.isAdmin}), isAdminValue=${JSON.stringify(isAdminValue)}, 判斷結果=${isAdmin}`);
  
  if (!isAdmin) {
    console.warn(`[requireAdmin] 非管理員用戶嘗試訪問管理員功能，返回 403: user_id=${user.user_id}, username=${user.username}, is_admin=${JSON.stringify(user.is_admin)} (type: ${typeof user.is_admin})`);
    const forbiddenResponse = errorResponse(403, "FORBIDDEN", "僅管理員可以訪問此功能", null, null);
    console.log(`[requireAdmin] 返回 403 Response，狀態: ${forbiddenResponse.status}`);
    return forbiddenResponse;
  }
  
  console.log(`[requireAdmin] 用戶 ${user.username} 是管理員，允許訪問`);
  return { user };
}

/**
 * 认证中间件包装器
 */
export function withAuth(handler) {
  return async (request, env, ctx, requestId, match, url) => {
    const result = await requireAuth(request, env);
    if (result instanceof Response) {
      // CORS 頭會在路由層添加，這裡不需要重複添加
      return result;
    }
    // 将用户信息传递到 ctx
    if (!ctx) ctx = {};
    ctx.user = result.user;
    return handler(request, env, ctx, requestId, match, url);
  };
}

/**
 * 管理员中间件包装器
 */
export function withAdmin(handler) {
  return async (request, env, ctx, requestId, match, url) => {
    console.log(`[withAdmin] 開始執行，URL: ${request.url}`);
    const result = await requireAdmin(request, env);
    
    // 檢查 result 是否是 Response 對象
    const isResponse = result instanceof Response || (result && typeof result.status === 'number');
    
    console.log(`[withAdmin] requireAdmin 返回結果類型: ${isResponse ? 'Response' : 'Object'}, status: ${result?.status}`);
    
    if (isResponse) {
      // 如果是權限錯誤，直接返回
      console.log(`[withAdmin] 返回權限錯誤 Response，狀態: ${result.status}`);
      const origin = request.headers.get("Origin") || "";
      const headers = getCorsHeaders(origin);
      // 確保狀態碼和 body 正確傳遞
      const responseBody = await result.text().catch(() => result.body);
      return new Response(responseBody, { 
        status: result.status,
        statusText: result.statusText,
        headers: { ...Object.fromEntries(result.headers.entries()), ...headers }
      });
    }
    
    // 将用户信息传递到 ctx
    console.log(`[withAdmin] 用戶通過權限檢查，繼續執行 handler`);
    if (!ctx) ctx = {};
    ctx.user = result.user;
    return handler(request, env, ctx, requestId, match, url);
  };
}

