/**
 * 任務通知路由
 */

import { handleNotifications } from "../handlers/task-notifications/index.js";
import { withAuth } from "../middleware/auth.js";

export const notificationsRoutes = [
  {
    pattern: /^\/api\/v2\/notifications$/,
    methods: ["GET"],
    handler: withAuth(handleNotifications),
  },
  {
    pattern: /^\/api\/v2\/notifications\/read$/,
    methods: ["PUT"],
    handler: withAuth(handleNotifications),
  },
  {
    pattern: /^\/api\/v2\/notifications\/(\d+)\/read$/,
    methods: ["PUT"],
    handler: withAuth(handleNotifications),
  },
];



