/**
 * 自动化规则路由
 */

import { handleAutomation } from "../handlers/automation.js";
import { withAdmin } from "../middleware/auth.js";

export const automationRoutes = [
  {
    pattern: /^\/api\/v2\/admin\/automation-rules$/,
    methods: ["GET", "POST"],
    handler: withAdmin(handleAutomation),
  },
  {
    pattern: /^\/api\/v2\/admin\/automation-rules\/(\d+)$/,
    methods: ["GET", "PUT", "DELETE"],
    handler: withAdmin(handleAutomation),
  },
  {
    pattern: /^\/api\/v2\/admin\/automation-rules\/(\d+)\/test$/,
    methods: ["POST"],
    handler: withAdmin(handleAutomation),
  },
  // 别名路由：支持 /settings/automation 路径
  {
    pattern: /^\/api\/v2\/settings\/automation\/components$/,
    methods: ["GET"],
    handler: withAdmin(handleAutomation),
  },
  {
    pattern: /^\/api\/v2\/settings\/automation\/components\/(\d+)\/tasks$/,
    methods: ["GET"],
    handler: withAdmin(handleAutomation),
  },
  // 注意：/api/v2/settings/automation/preview 路由由 task-generator.js 處理
];

