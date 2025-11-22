/**
 * 客戶服務組件（舊版兼容）路由
 */

import { withAuth } from "../middleware/auth.js";
import { handleGetClientServiceComponents } from "../handlers/client-services/components.js";

export const clientServiceComponentsRoutes = [
  {
    pattern: /^\/api\/v2\/client-services\/(\d+)\/components$/,
    methods: ["GET"],
    handler: withAuth(handleGetClientServiceComponents),
  },
];











