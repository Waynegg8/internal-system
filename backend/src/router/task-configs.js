/**
 * 任務配置路由
 */

import { handleTaskConfigs, handleBatchSaveTaskConfigsDirect } from "../handlers/task-configs/index.js";
import { withAuth } from "../middleware/auth.js";

export const taskConfigsRoutes = [
  // 批量保存路由 - 必須在前面優先匹配，使用專用 handler
  {
    pattern: /^\/api\/v2\/clients\/([^\/]+)\/services\/(\d+)\/task-configs\/batch$/,
    methods: ["POST"],
    handler: withAuth(handleBatchSaveTaskConfigsDirect),
  },
  // 單個配置的 PUT/DELETE
  {
    pattern: /^\/api\/v2\/clients\/([^\/]+)\/services\/(\d+)\/task-configs\/(\d+)$/,
    methods: ["PUT", "DELETE"],
    handler: withAuth(handleTaskConfigs),
  },
  // GET 和普通 POST（不包含 /batch）
  {
    pattern: /^\/api\/v2\/clients\/([^\/]+)\/services\/(\d+)\/task-configs$/,
    methods: ["GET", "POST"],
    handler: withAuth(handleTaskConfigs),
  },
];

