/**
 * 仪表板路由
 */

import { handleDashboard } from "../handlers/dashboard.js";
import { handleDashboardAlerts } from "../handlers/dashboard/alerts.js";
import { withAuth } from "../middleware/auth.js";

export const dashboardRoutes = [
  {
    pattern: /^\/api\/v2\/dashboard$/,
    methods: ["GET"],
    handler: withAuth(handleDashboard),
  },
  {
    pattern: /^\/api\/v2\/dashboard\/alerts$/,
    methods: ["GET"],
    handler: withAuth(handleDashboardAlerts),
  },
];



