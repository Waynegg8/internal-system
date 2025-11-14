/**
 * 收据管理路由
 */

import { handleReceipts } from "../handlers/receipts.js";
import { withAuth } from "../middleware/auth.js";

export const receiptsRoutes = [
  {
    pattern: /^\/api\/v2\/receipts$/,
    methods: ["GET", "POST"],
    handler: withAuth(handleReceipts),
  },
  {
    pattern: /^\/api\/v2\/receipts\/reminders$/,
    methods: ["GET"],
    handler: withAuth(handleReceipts),
  },
  {
    pattern: /^\/api\/v2\/receipts\/reminders\/postpone$/,
    methods: ["POST"],
    handler: withAuth(handleReceipts),
  },
  {
    pattern: /^\/api\/v2\/receipts\/suggest-amount$/,
    methods: ["GET"],
    handler: withAuth(handleReceipts),
  },
  {
    pattern: /^\/api\/v2\/receipts\/([^\/]+)\/cancel$/,
    methods: ["POST"],
    handler: withAuth(handleReceipts),
  },
  {
    pattern: /^\/api\/v2\/receipts\/([^\/]+)\/payments$/,
    methods: ["GET", "POST"],
    handler: withAuth(handleReceipts),
  },
  {
    pattern: /^\/api\/v2\/receipts\/([^\/]+)\/payments\/(\d+)$/,
    methods: ["PUT", "DELETE"],
    handler: withAuth(handleReceipts),
  },
  {
    pattern: /^\/api\/v2\/receipts\/([^\/]+)$/,
    methods: ["GET", "PUT", "DELETE"],
    handler: withAuth(handleReceipts),
  },
];

