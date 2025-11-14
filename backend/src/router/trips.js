/**
 * 外出登记路由
 */

import { handleTrips } from "../handlers/trips.js";
import { withAuth } from "../middleware/auth.js";

export const tripsRoutes = [
  {
    pattern: /^\/api\/v2\/trips$/,
    methods: ["GET", "POST"],
    handler: withAuth(handleTrips),
  },
  {
    pattern: /^\/api\/v2\/trips\/summary$/,
    methods: ["GET"],
    handler: withAuth(handleTrips),
  },
  {
    pattern: /^\/api\/v2\/trips\/(\d+)$/,
    methods: ["GET", "PUT", "DELETE"],
    handler: withAuth(handleTrips),
  },
];

