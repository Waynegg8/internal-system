/**
 * 收费明细路由
 */

import { handleBilling } from "../handlers/billing.js";
import { withAuth } from "../middleware/auth.js";

export const billingRoutes = [
  {
    pattern: /^\/api\/v2\/billing\/service\/(\d+)$/,
    methods: ["GET"],
    handler: withAuth(handleBilling),
  },
  {
    pattern: /^\/api\/v2\/billing\/(\d+)$/,
    methods: ["PUT"],
    handler: withAuth(handleBilling),
  },
  {
    pattern: /^\/api\/v2\/billing$/,
    methods: ["POST"],
    handler: withAuth(handleBilling),
  },
];

