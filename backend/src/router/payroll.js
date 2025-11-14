/**
 * 薪资管理路由
 */

import { handlePayroll } from "../handlers/payroll.js";
import { withAdmin } from "../middleware/auth.js";

export const payrollRoutes = [
  {
    pattern: /^\/api\/v2\/payroll\/salary-item-types\/(\d+)$/,
    methods: ["PUT", "DELETE"],
    handler: withAdmin(handlePayroll),
  },
  {
    pattern: /^\/api\/v2\/payroll\/salary-item-types\/(\d+)\/toggle$/,
    methods: ["PUT"],
    handler: withAdmin(handlePayroll),
  },
  {
    pattern: /^\/api\/v2\/payroll\/preview\/(\d{4}-\d{2})$/,
    methods: ["GET"],
    handler: withAdmin(handlePayroll),
  },
  {
    pattern: /^\/api\/v2\/payroll\/salary-item-types$/,
    methods: ["GET", "POST"],
    handler: withAdmin(handlePayroll),
  },
  {
    pattern: /^\/api\/v2\/payroll\/settings$/,
    methods: ["GET", "PUT"],
    handler: withAdmin(handlePayroll),
  },
  {
    pattern: /^\/api\/v2\/payroll\/calculate$/,
    methods: ["POST"],
    handler: withAdmin(handlePayroll),
  },
  {
    pattern: /^\/api\/v2\/payroll\/yearly-bonus\/(\d+)$/,
    methods: ["GET", "PUT"],
    handler: withAdmin(handlePayroll),
  },
  {
    pattern: /^\/api\/v2\/payroll\/year-end-bonus\/(\d+)$/,
    methods: ["GET", "PUT"],
    handler: withAdmin(handlePayroll),
  },
  {
    pattern: /^\/api\/v2\/users\/(\d+)\/salary$/,
    methods: ["GET", "PUT"],
    handler: withAdmin(handlePayroll),
  },
];

