/**
 * 标签管理路由
 */

import { handleTags } from "../handlers/tags.js";
import { withAuth } from "../middleware/auth.js";

export const tagsRoutes = [
  {
    pattern: /^\/api\/v2\/tags$/,
    methods: ["GET", "POST"],
    handler: withAuth(handleTags),
  },
  {
    pattern: /^\/api\/v2\/tags\/(\d+)$/,
    methods: ["GET", "PUT", "DELETE"],
    handler: withAuth(handleTags),
  },
];












