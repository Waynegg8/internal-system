/**
 * 任务管理路由
 */

import { handleTasks } from "../handlers/tasks.js";
import { withAuth } from "../middleware/auth.js";

export const tasksRoutes = [
  {
    pattern: /^\/api\/v2\/tasks$/,
    methods: ["GET", "POST"],
    handler: withAuth(handleTasks),
  },
  {
    pattern: /^\/api\/v2\/tasks\/batch$/,
    methods: ["POST"],
    handler: withAuth(handleTasks),
  },
  {
    pattern: /^\/api\/v2\/tasks\/stats$/,
    methods: ["GET"],
    handler: withAuth(handleTasks),
  },
  {
    pattern: /^\/api\/v2\/tasks\/default-date-range$/,
    methods: ["GET"],
    handler: withAuth(handleTasks),
  },
  {
    pattern: /^\/api\/v2\/tasks\/overview$/,
    methods: ["GET"],
    handler: withAuth(handleTasks),
  },
  {
    pattern: /^\/api\/v2\/tasks\/preview$/,
    methods: ["GET"],
    handler: withAuth(handleTasks),
  },
  {
    pattern: /^\/api\/v2\/tasks\/(\d+)$/,
    methods: ["GET", "PUT", "DELETE"],
    handler: withAuth(handleTasks),
  },
  {
    pattern: /^\/api\/v2\/tasks\/(\d+)\/status$/,
    methods: ["PUT"],
    handler: withAuth(handleTasks),
  },
  {
    pattern: /^\/api\/v2\/tasks\/(\d+)\/assignee$/,
    methods: ["PUT"],
    handler: withAuth(handleTasks),
  },
  {
    pattern: /^\/api\/v2\/tasks\/(\d+)\/due-date$/,
    methods: ["PUT"],
    handler: withAuth(handleTasks),
  },
  {
    pattern: /^\/api\/v2\/tasks\/(\d+)\/sops$/,
    methods: ["GET", "PUT"],
    handler: withAuth(handleTasks),
  },
  {
    pattern: /^\/api\/v2\/tasks\/(\d+)\/documents$/,
    methods: ["GET", "POST"],
    handler: withAuth(handleTasks),
  },
  {
    pattern: /^\/api\/v2\/tasks\/(\d+)\/documents\/(\d+)\/download$/,
    methods: ["GET"],
    handler: withAuth(handleTasks),
  },
  {
    pattern: /^\/api\/v2\/tasks\/(\d+)\/documents\/(\d+)$/,
    methods: ["DELETE"],
    handler: withAuth(handleTasks),
  },
  {
    pattern: /^\/api\/v2\/tasks\/(\d+)\/stages\/(\d+)$/,
    methods: ["PUT"],
    handler: withAuth(handleTasks),
  },
  {
    pattern: /^\/api\/v2\/tasks\/(\d+)\/adjustment-history$/,
    methods: ["GET"],
    handler: withAuth(handleTasks),
  },
];

