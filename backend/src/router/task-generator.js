/**
 * 任务生成器路由
 */

import { handleManualTaskGeneration, handleTaskGenerationPreview } from "../handlers/task-generator.js";
import { withAdmin } from "../middleware/auth.js";

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
];

