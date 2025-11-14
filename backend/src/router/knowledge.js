/**
 * 知识库路由
 */

import { handleKnowledge } from "../handlers/knowledge.js";
import { withAuth } from "../middleware/auth.js";

export const knowledgeRoutes = [
  {
    pattern: /^\/api\/v2\/sop$/,
    methods: ["GET", "POST"],
    handler: withAuth(handleKnowledge),
  },
  {
    pattern: /^\/api\/v2\/sop\/(\d+)$/,
    methods: ["GET", "PUT", "DELETE"],
    handler: withAuth(handleKnowledge),
  },
  {
    pattern: /^\/api\/v2\/faq$/,
    methods: ["GET", "POST"],
    handler: withAuth(handleKnowledge),
  },
  {
    pattern: /^\/api\/v2\/faq\/(\d+)$/,
    methods: ["GET", "PUT", "DELETE"],
    handler: withAuth(handleKnowledge),
  },
  {
    pattern: /^\/api\/v2\/documents$/,
    methods: ["GET"],
    handler: withAuth(handleKnowledge),
  },
  {
    pattern: /^\/api\/v2\/documents\/upload$/,
    methods: ["POST"],
    handler: withAuth(handleKnowledge),
  },
  {
    pattern: /^\/api\/v2\/documents\/(\d+)$/,
    methods: ["GET", "PUT", "DELETE"],
    handler: withAuth(handleKnowledge),
  },
  {
    pattern: /^\/api\/v2\/documents\/(\d+)\/download$/,
    methods: ["GET"],
    handler: withAuth(handleKnowledge),
  },
  {
    pattern: /^\/api\/v2\/settings\/sops$/,
    methods: ["GET"],
    handler: withAuth(handleKnowledge),
  },
  {
    pattern: /^\/api\/v2\/settings\/documents$/,
    methods: ["GET"],
    handler: withAuth(handleKnowledge),
  },
];

