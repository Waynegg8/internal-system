/**
 * 工时管理路由
 */

import { handleTimesheets } from "../handlers/timesheets.js";
import { withAuth } from "../middleware/auth.js";

export const timesheetsRoutes = [
  {
    pattern: /^\/api\/v2\/timesheets\/my-stats$/,
    methods: ["GET"],
    handler: withAuth(handleTimesheets),
  },
  {
    pattern: /^\/api\/v2\/timesheets\/monthly-summary$/,
    methods: ["GET"],
    handler: withAuth(handleTimesheets),
  },
  {
    pattern: /^\/api\/v2\/timesheets\/(\d+)$/,
    methods: ["GET", "PUT", "DELETE"],
    handler: withAuth(handleTimesheets),
  },
  {
    pattern: /^\/api\/v2\/timesheets$/,
    methods: ["GET", "POST"],
    handler: withAuth(handleTimesheets),
  },
];

