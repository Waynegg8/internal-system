/**
 * 用户资料管理主入口
 */

import { errorResponse } from "../../utils/response.js";
import { handleGetUserProfile, handleUpdateUserProfile, handleChangePassword, handleResetUserPassword, handleGetUserPassword } from "./profile-crud.js";

export async function handleUserProfile(request, env, ctx, requestId, match, url) {
  const method = request.method.toUpperCase();
  const path = url.pathname;
  
  try {
    // GET /api/v2/users/:id - 获取单个用户详情
    if (method === "GET" && path.match(/^\/api\/v2\/users\/(\d+)$/)) {
      return await handleGetUserProfile(request, env, ctx, requestId, match, url);
    }
    
    // PUT /api/v2/users/:id/profile - 更新用户个人资料
    if (method === "PUT" && path.match(/^\/api\/v2\/users\/(\d+)\/profile$/)) {
      return await handleUpdateUserProfile(request, env, ctx, requestId, match, url);
    }
    
    // POST /api/v2/auth/change-password - 修改密码
    if (method === "POST" && path === "/api/v2/auth/change-password") {
      return await handleChangePassword(request, env, ctx, requestId, url);
    }
    
    // POST /api/v2/admin/users/:id/reset-password 或 /api/v2/settings/users/:id/reset-password - 管理员重置密码
    if (method === "POST" && (path.match(/^\/api\/v2\/admin\/users\/(\d+)\/reset-password$/) || path.match(/^\/api\/v2\/settings\/users\/(\d+)\/reset-password$/))) {
      return await handleResetUserPassword(request, env, ctx, requestId, match, url);
    }
    
    // GET /api/v2/admin/users/:id/password 或 /api/v2/settings/users/:id/password - 管理员查看用户密码
    const getPasswordMatch = path.match(/^\/api\/v2\/(?:admin|settings)\/users\/(\d+)\/password$/);
    if (method === "GET" && getPasswordMatch) {
      return await handleGetUserPassword(request, env, ctx, requestId, getPasswordMatch, url);
    }
    
    return errorResponse(404, "NOT_FOUND", "路由不存在", null, requestId);
    
  } catch (err) {
    console.error(`[User Profile] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

