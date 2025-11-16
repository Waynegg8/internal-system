/**
 * 系统设置主入口
 * 模块化路由到各个处理器
 */

import { errorResponse } from "../../utils/response.js";
import { handleGetSystemSettings, handleUpdateSystemSettings } from "./system-settings.js";
import { handleGetUsers, handleCreateUser, handleUpdateUser, handleDeleteUser } from "./user-management.js";
import { handleGetCompanySettings, handleSaveCompanySettings } from "./company-settings.js";
import { handleGetUserProfile, handleResetUserPassword } from "../user-profile/profile-crud.js";

export async function handleSettings(request, env, ctx, requestId, match, url) {
  const method = request.method.toUpperCase();
  const path = url.pathname;
  const user = ctx?.user;
  
  try {
    // GET /api/v2/users 或 /users - 获取所有员工列表（所有登录用户都可访问）
    if (method === "GET" && (path === '/api/v2/users' || path === '/api/v2/settings/users' || path === '/users' || path === '/settings/users')) {
      return await handleGetUsers(request, env, ctx, requestId, url);
    }
    
    // 以下功能需要管理员权限
    if (!user.is_admin) {
      return errorResponse(403, "FORBIDDEN", "沒有權限", null, requestId);
    }
    
    // GET /api/v2/admin/settings - 获取系统设置
    if (method === "GET" && path === '/api/v2/admin/settings') {
      return await handleGetSystemSettings(request, env, ctx, requestId, url);
    }
    
    // PUT /api/v2/admin/settings - 批量更新系统设置
    if (method === "PUT" && path === '/api/v2/admin/settings') {
      return await handleUpdateSystemSettings(request, env, ctx, requestId, url);
    }
    
    // POST /api/v2/admin/users 或 /api/v2/settings/users 或 /settings/users - 创建新用户
    if (method === "POST" && (path === '/api/v2/admin/users' || path === '/api/v2/settings/users' || path === '/settings/users')) {
      return await handleCreateUser(request, env, ctx, requestId, url);
    }
    
    // GET /api/v2/settings/users/:id 或 /settings/users/:id - 获取用户详情
    const getUserMatch = path.match(/^\/api\/v2\/settings\/users\/(\d+)$/) || path.match(/^\/settings\/users\/(\d+)$/);
    if (method === "GET" && getUserMatch) {
      return await handleGetUserProfile(request, env, ctx, requestId, getUserMatch, url);
    }
    
    // PUT /api/v2/users/:id 或 /api/v2/settings/users/:id 或 /settings/users/:id - 更新用户信息
    const updateUserMatch = path.match(/^\/api\/v2\/users\/(\d+)$/) || path.match(/^\/api\/v2\/settings\/users\/(\d+)$/) || path.match(/^\/settings\/users\/(\d+)$/);
    if (method === "PUT" && updateUserMatch) {
      return await handleUpdateUser(request, env, ctx, requestId, updateUserMatch, url);
    }
    
    // DELETE /api/v2/users/:id 或 /api/v2/settings/users/:id 或 /settings/users/:id - 删除用户（软删除）
    const deleteUserMatch = path.match(/^\/api\/v2\/users\/(\d+)$/) || path.match(/^\/api\/v2\/settings\/users\/(\d+)$/) || path.match(/^\/settings\/users\/(\d+)$/);
    if (method === "DELETE" && deleteUserMatch) {
      return await handleDeleteUser(request, env, ctx, requestId, deleteUserMatch, url);
    }
    
    // POST /api/v2/settings/users/:id/reset-password - 管理员重置密码
    const resetPasswordMatch = path.match(/^\/api\/v2\/settings\/users\/(\d+)\/reset-password$/);
    if (method === "POST" && resetPasswordMatch) {
      return await handleResetUserPassword(request, env, ctx, requestId, resetPasswordMatch, url);
    }
    
    // GET /api/v2/settings/company/:setNumber - 获取公司信息
    const getCompanyMatch = path.match(/^\/api\/v2\/settings\/company\/([^\/]+)$/);
    if (method === "GET" && getCompanyMatch) {
      return await handleGetCompanySettings(request, env, ctx, requestId, getCompanyMatch, url);
    }
    
    // PUT /api/v2/settings/company/:setNumber - 更新公司信息
    const updateCompanyMatch = path.match(/^\/api\/v2\/settings\/company\/([^\/]+)$/);
    if (method === "PUT" && updateCompanyMatch) {
      return await handleSaveCompanySettings(request, env, ctx, requestId, updateCompanyMatch, url);
    }
    
    // GET /api/v2/settings/sops - 获取SOP列表（用于系统设定）
    if (method === "GET" && path === '/api/v2/settings/sops') {
      // 这个功能应该在 knowledge handler 中处理
      return errorResponse(404, "NOT_FOUND", "路由不存在", null, requestId);
    }
    
    // GET /api/v2/settings/documents - 获取文档列表（用于系统设定）
    if (method === "GET" && path === '/api/v2/settings/documents') {
      // 这个功能应该在 knowledge handler 中处理
      return errorResponse(404, "NOT_FOUND", "路由不存在", null, requestId);
    }
    
    return errorResponse(404, "NOT_FOUND", "路由不存在", null, requestId);
    
  } catch (err) {
    console.error(`[Settings] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

