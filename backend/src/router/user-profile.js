/**
 * 用户资料路由
 */

import { handleUserProfile } from "../handlers/user-profile.js";
import { withAuth, withAdmin } from "../middleware/auth.js";

export const userProfileRoutes = [
  {
    pattern: /^\/api\/v2\/users\/(\d+)$/,
    methods: ["GET"],
    handler: withAuth(handleUserProfile),
  },
  {
    pattern: /^\/api\/v2\/users\/(\d+)\/profile$/,
    methods: ["PUT"],
    handler: withAuth(handleUserProfile),
  },
  {
    pattern: /^\/api\/v2\/auth\/change-password$/,
    methods: ["POST"],
    handler: withAuth(handleUserProfile),
  },
  {
    pattern: /^\/api\/v2\/admin\/users\/(\d+)\/reset-password$/,
    methods: ["POST"],
    handler: withAdmin(handleUserProfile),
  },
  // 别名路由：支持 /settings/users/:id/reset-password 路径
  {
    pattern: /^\/api\/v2\/settings\/users\/(\d+)\/reset-password$/,
    methods: ["POST"],
    handler: withAdmin(handleUserProfile),
  },
  // 管理员查看用户密码
  {
    pattern: /^\/api\/v2\/admin\/users\/(\d+)\/password$/,
    methods: ["GET"],
    handler: withAdmin(handleUserProfile),
  },
  // 别名路由：支持 /settings/users/:id/password 路径
  {
    pattern: /^\/api\/v2\/settings\/users\/(\d+)\/password$/,
    methods: ["GET"],
    handler: withAdmin(handleUserProfile),
  },
];

