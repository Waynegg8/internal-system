/**
 * 报表路由
 */

import { handleReports } from "../handlers/reports.js";
import { withAuth } from "../middleware/auth.js";

export const reportsRoutes = [
  {
    pattern: /^\/api\/v2\/reports\/monthly\/revenue$/,
    methods: ["GET"],
    handler: withAuth(handleReports),
  },
  {
    pattern: /^\/api\/v2\/reports\/monthly\/payroll$/,
    methods: ["GET"],
    handler: withAuth(handleReports),
  },
  {
    pattern: /^\/api\/v2\/reports\/monthly\/employee-performance$/,
    methods: ["GET"],
    handler: withAuth(handleReports),
  },
  {
    pattern: /^\/api\/v2\/reports\/monthly\/client-profitability$/,
    methods: ["GET"],
    handler: withAuth(handleReports),
  },
  {
    pattern: /^\/api\/v2\/reports\/annual\/revenue$/,
    methods: ["GET"],
    handler: withAuth(handleReports),
  },
  {
    pattern: /^\/api\/v2\/reports\/annual\/payroll$/,
    methods: ["GET"],
    handler: withAuth(handleReports),
  },
  {
    pattern: /^\/api\/v2\/reports\/annual\/employee-performance$/,
    methods: ["GET"],
    handler: withAuth(handleReports),
  },
  {
    pattern: /^\/api\/v2\/reports\/annual\/client-profitability$/,
    methods: ["GET"],
    handler: withAuth(handleReports),
  },
];

