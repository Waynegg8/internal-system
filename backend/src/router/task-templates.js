/**
 * 任务模板路由
 */

import { handleTaskTemplates } from "../handlers/task-templates.js";
import { withAuth } from "../middleware/auth.js";

export const taskTemplatesRoutes = [
  {
    pattern: /^\/api\/v2\/task-templates$/,
    methods: ["GET", "POST"],
    handler: withAuth(handleTaskTemplates),
  },
  {
    pattern: /^\/api\/v2\/task-templates\/(\d+)$/,
    methods: ["GET", "PUT", "DELETE"],
    handler: withAuth(handleTaskTemplates),
  },
  // 别名路由：支持 /settings/task-templates 路径
  {
    pattern: /^\/api\/v2\/settings\/task-templates$/,
    methods: ["GET", "POST"],
    handler: withAuth(handleTaskTemplates),
  },
  {
    pattern: /^\/api\/v2\/settings\/task-templates\/(\d+)$/,
    methods: ["GET", "PUT", "DELETE"],
    handler: withAuth(handleTaskTemplates),
  },
  {
    pattern: /^\/api\/v2\/settings\/task-templates\/(\d+)\/stages$/,
    methods: ["GET", "POST"],
    handler: withAuth(handleTaskTemplates),
  },
  {
    pattern: /^\/api\/v2\/settings\/task-templates\/(\d+)\/stages\/(\d+)$/,
    methods: ["PUT", "DELETE"],
    handler: withAuth(handleTaskTemplates),
  },
];

