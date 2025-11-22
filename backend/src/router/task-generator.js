/**
 * 任务生成器路由
 */

import { handleManualTaskGeneration, handleTaskGenerationPreview, handleGenerateTasksForOneTimeService } from "../handlers/task-generator/index.js";
import { handleGetTaskGenerationHistory } from "../handlers/task-generator/task-generation-history.js";
import { withAdmin, withAuth } from "../middleware/auth.js";

export const taskGeneratorRoutes = [
  {
    pattern: /^\/api\/v2\/admin\/tasks\/generate$/,
    methods: ["POST"],
    handler: withAdmin(handleManualTaskGeneration),
  },
  {
    pattern: /^\/api\/v2\/admin\/tasks\/generate\/preview$/,
    methods: ["GET"],
    handler: withAdmin(handleTaskGenerationPreview),
  },
  // 别名路由：支持 /settings/automation/preview 路径
  {
    pattern: /^\/api\/v2\/settings\/automation\/preview$/,
    methods: ["GET"],
    handler: withAdmin(handleTaskGenerationPreview),
  },
  // 一次性服務任務生成
  {
    pattern: /^\/api\/v2\/tasks\/generate\/one-time$/,
    methods: ["POST"],
    handler: withAuth(handleGenerateTasksForOneTimeService),
  },
  // 任務生成歷史記錄查詢
  {
    pattern: /^\/api\/v2\/admin\/tasks\/generate\/history$/,
    methods: ["GET"],
    handler: withAdmin(handleGetTaskGenerationHistory),
  },
];

