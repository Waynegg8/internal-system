/**
 * 系统设置路由
 */

import { handleSettings } from "../handlers/settings.js";
import { withAdmin } from "../middleware/auth.js";

export const settingsRoutes = [
  {
    pattern: /^\/api\/v2\/admin\/settings$/,
    methods: ["GET", "PUT"],
    handler: withAdmin(handleSettings),
  },
  {
    pattern: /^\/api\/v2\/users\/(\d+)$/,
    methods: ["PUT", "DELETE"],
    handler: withAdmin(handleSettings),
  },
  {
    pattern: /^\/api\/v2\/users$/,
    methods: ["GET", "POST"],
    handler: withAdmin(handleSettings),
  },
  // 别名路由：支持 /settings/users 路径
  {
    pattern: /^\/api\/v2\/settings\/users$/,
    methods: ["GET", "POST"],
    handler: withAdmin(handleSettings),
  },
  {
    pattern: /^\/api\/v2\/settings\/users\/(\d+)$/,
    methods: ["GET", "PUT", "DELETE"],
    handler: withAdmin(handleSettings),
  },
  {
    pattern: /^\/api\/v2\/settings\/users\/(\d+)\/reset-password$/,
    methods: ["POST"],
    handler: withAdmin(handleSettings),
  },
  {
    pattern: /^\/api\/v2\/settings\/company\/([^\/]+)$/,
    methods: ["GET", "PUT"],
    handler: withAdmin(handleSettings),
  },
  {
    pattern: /^\/api\/v2\/settings\/sops$/,
    methods: ["GET"],
    handler: withAdmin(handleSettings),
  },
  {
    pattern: /^\/api\/v2\/settings\/documents$/,
    methods: ["GET"],
    handler: withAdmin(handleSettings),
  },
];

