/**
 * 服务项目路由
 */

import { handleServices } from "../handlers/services.js";
import { withAuth } from "../middleware/auth.js";

export const servicesRoutes = [
  {
    pattern: /^\/api\/v2\/services$/,
    methods: ["GET", "POST"],
    handler: withAuth(handleServices),
  },
  {
    pattern: /^\/api\/v2\/services\/(\d+)$/,
    methods: ["GET", "PUT", "DELETE"],
    handler: withAuth(handleServices),
  },
  // 别名路由：支持 /settings/services 路径
  {
    pattern: /^\/api\/v2\/settings\/services$/,
    methods: ["GET", "POST"],
    handler: withAuth(handleServices),
  },
  {
    pattern: /^\/api\/v2\/settings\/services\/(\d+)$/,
    methods: ["GET", "PUT", "DELETE"],
    handler: withAuth(handleServices),
  },
  {
    pattern: /^\/api\/v2\/settings\/services\/sops$/,
    methods: ["GET"],
    handler: withAuth(handleServices),
  },
  {
    pattern: /^\/api\/v2\/services\/items$/,
    methods: ["GET"],
    handler: withAuth(handleServices),
  },
  {
    pattern: /^\/api\/v2\/settings\/services\/(\d+)\/items$/,
    methods: ["GET", "POST"],
    handler: withAuth(handleServices),
  },
  {
    pattern: /^\/api\/v2\/settings\/services\/(\d+)\/items\/(\d+)$/,
    methods: ["PUT", "DELETE"],
    handler: withAuth(handleServices),
  },
];

