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
  const result = await requireAuth(request, env);
  if (result instanceof Response) return result;
  
  const { user } = result;
  if (!user.is_admin) {
    return errorResponse(403, "FORBIDDEN", "沒有權限", null, null);
  }
  
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
    const result = await requireAdmin(request, env);
    if (result instanceof Response) {
      const origin = request.headers.get("Origin") || "";
      const headers = getCorsHeaders(origin);
      return new Response(result.body, { ...result, headers });
    }
    // 将用户信息传递到 ctx
    if (!ctx) ctx = {};
    ctx.user = result.user;
    return handler(request, env, ctx, requestId, match, url);
  };
}

