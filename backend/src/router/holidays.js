/**
 * 假日管理路由
 */

import { handleHolidays } from "../handlers/holidays.js";
import { withAuth } from "../middleware/auth.js";

export const holidaysRoutes = [
  {
    pattern: /^\/api\/v2\/holidays\/([^\/]+)$/,
    methods: ["PUT", "DELETE"],
    handler: withAuth(handleHolidays),
  },
  {
    pattern: /^\/api\/v2\/holidays$/,
    methods: ["GET", "POST"],
    handler: withAuth(handleHolidays),
  },
  // 别名路由：支持 /settings/holidays 路径
  {
    pattern: /^\/api\/v2\/settings\/holidays$/,
    methods: ["GET", "POST"],
    handler: withAuth(handleHolidays),
  },
  {
    pattern: /^\/api\/v2\/settings\/holidays\/([^\/]+)$/,
    methods: ["PUT", "DELETE"],
    handler: withAuth(handleHolidays),
  },
  {
    pattern: /^\/api\/v2\/settings\/holidays\/batch$/,
    methods: ["POST"],
    handler: withAuth(handleHolidays),
  },
];

