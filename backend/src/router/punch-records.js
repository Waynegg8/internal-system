/**
 * 打卡记录路由
 */

import { handlePunchRecords } from "../handlers/punch-records.js";
import { withAuth } from "../middleware/auth.js";

export const punchRecordsRoutes = [
  {
    pattern: /^\/api\/v2\/payroll\/punch-records\/upload$/,
    methods: ["POST"],
    handler: withAuth(handlePunchRecords),
  },
  {
    pattern: /^\/api\/v2\/payroll\/punch-records\/(\d+)\/(download|preview)$/,
    methods: ["GET"],
    handler: withAuth(handlePunchRecords),
  },
  {
    pattern: /^\/api\/v2\/payroll\/punch-records\/(\d+)$/,
    methods: ["GET", "DELETE"],
    handler: withAuth(handlePunchRecords),
  },
  {
    pattern: /^\/api\/v2\/payroll\/punch-records$/,
    methods: ["GET"],
    handler: withAuth(handlePunchRecords),
  }
];

