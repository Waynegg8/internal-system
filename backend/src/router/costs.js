/**
 * 成本管理路由
 */

import { handleCosts } from "../handlers/costs.js";
import { withAdmin } from "../middleware/auth.js";

export const costsRoutes = [
  // 成本类型管理 - 别名路由
  {
    pattern: /^\/api\/v2\/costs\/types$/,
    methods: ["GET", "POST"],
    handler: withAdmin(handleCosts),
  },
  {
    pattern: /^\/api\/v2\/costs\/types\/(\d+)$/,
    methods: ["PUT", "DELETE"],
    handler: withAdmin(handleCosts),
  },
  {
    pattern: /^\/api\/v2\/admin\/cost-types$/,
    methods: ["GET", "POST"],
    handler: withAdmin(handleCosts),
  },
  {
    pattern: /^\/api\/v2\/admin\/cost-types\/(\d+)$/,
    methods: ["PUT", "DELETE"],
    handler: withAdmin(handleCosts),
  },
  // 月度成本管理 - 别名路由
  {
    pattern: /^\/api\/v2\/costs\/overhead\/(\d+)\/(\d+)$/,
    methods: ["GET"],
    handler: withAdmin(handleCosts),
  },
  {
    pattern: /^\/api\/v2\/costs\/overhead$/,
    methods: ["POST"],
    handler: withAdmin(handleCosts),
  },
  {
    pattern: /^\/api\/v2\/costs\/overhead\/(\d+)$/,
    methods: ["PUT", "DELETE"],
    handler: withAdmin(handleCosts),
  },
  {
    pattern: /^\/api\/v2\/costs\/overhead\/generate$/,
    methods: ["POST"],
    handler: withAdmin(handleCosts),
  },
  {
    pattern: /^\/api\/v2\/costs\/overhead\/preview\/(\d+)\/(\d+)$/,
    methods: ["GET"],
    handler: withAdmin(handleCosts),
  },
  {
    pattern: /^\/api\/v2\/costs\/overhead-templates\/(\d+)$/,
    methods: ["GET", "PUT"],
    handler: withAdmin(handleCosts),
  },
  // 舊系統路徑別名
  {
    pattern: /^\/api\/v2\/admin\/overhead-templates\/by-type\/(\d+)$/,
    methods: ["GET", "PUT"],
    handler: withAdmin(handleCosts),
  },
  {
    pattern: /^\/api\/v2\/admin\/costs$/,
    methods: ["GET", "POST"],
    handler: withAdmin(handleCosts),
  },
  {
    pattern: /^\/api\/v2\/admin\/costs\/(\d+)$/,
    methods: ["PUT", "DELETE"],
    handler: withAdmin(handleCosts),
  },
  // 成本分析 - 别名路由
  {
    pattern: /^\/api\/v2\/costs\/employee\/(\d+)\/(\d+)$/,
    methods: ["GET"],
    handler: withAdmin(handleCosts),
  },
  {
    pattern: /^\/api\/v2\/costs\/client-summary\/(\d+)\/(\d+)$/,
    methods: ["GET"],
    handler: withAdmin(handleCosts),
  },
  {
    pattern: /^\/api\/v2\/costs\/task\/(\d+)\/(\d+)$/,
    methods: ["GET"],
    handler: withAdmin(handleCosts),
  },
  {
    pattern: /^\/api\/v2\/admin\/cost-analysis$/,
    methods: ["GET"],
    handler: withAdmin(handleCosts),
  },
  {
    pattern: /^\/api\/v2\/admin\/employee-costs$/,
    methods: ["GET"],
    handler: withAdmin(handleCosts),
  },
  {
    pattern: /^\/api\/v2\/admin\/task-costs$/,
    methods: ["GET"],
    handler: withAdmin(handleCosts),
  },
  {
    pattern: /^\/api\/v2\/admin\/client-costs$/,
    methods: ["GET"],
    handler: withAdmin(handleCosts),
  },
];

