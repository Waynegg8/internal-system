/**
 * 认证路由
 */

import { handleLogin, handleAuthMe, handleLogout } from "../handlers/auth.js";
import { withAuth } from "../middleware/auth.js";

export const authRoutes = [
  {
    pattern: /^\/api\/v2\/auth\/login$/,
    methods: ["POST", "OPTIONS"],
    handler: handleLogin,
  },
  {
    pattern: /^\/api\/v2\/auth\/me$/,
    methods: ["GET", "OPTIONS"],
    handler: withAuth(handleAuthMe),
  },
  {
    pattern: /^\/api\/v2\/auth\/logout$/,
    methods: ["POST", "OPTIONS"],
    handler: handleLogout,
  },
];

