/**
 * 附件路由
 */

import { handleAttachments } from "../handlers/attachments/index.js";
import { withAuth } from "../middleware/auth.js";

export const attachmentsRoutes = [
  {
    pattern: /^\/api\/v2\/attachments\/upload-direct$/,
    methods: ["PUT"],
    handler: withAuth(handleAttachments),
  },
  {
    pattern: /^\/api\/v2\/attachments\/upload-sign$/,
    methods: ["POST"],
    handler: withAuth(handleAttachments),
  },
  {
    pattern: /^\/api\/v2\/attachments\/(\d+)\/download$/,
    methods: ["GET"],
    handler: withAuth(handleAttachments),
  },
  {
    pattern: /^\/api\/v2\/attachments\/(\d+)$/,
    methods: ["GET", "DELETE"],
    handler: withAuth(handleAttachments),
  },
  {
    pattern: /^\/api\/v2\/attachments$/,
    methods: ["GET", "POST"],
    handler: withAuth(handleAttachments),
  },
];

