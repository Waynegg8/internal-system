/**
 * 客户管理路由
 */

import { handleClients } from "../handlers/clients.js";
import { withAuth } from "../middleware/auth.js";

export const clientsRoutes = [
  {
    pattern: /^\/api\/v2\/clients\/next-personal-id$/,
    methods: ["GET"],
    handler: withAuth(handleClients),
  },
  {
    pattern: /^\/api\/v2\/clients\/batch-assign$/,
    methods: ["POST"],
    handler: withAuth(handleClients),
  },
  {
    pattern: /^\/api\/v2\/clients\/([^\/]+)\/tags$/,
    methods: ["PUT"],
    handler: withAuth(handleClients),
  },
  {
    pattern: /^\/api\/v2\/clients\/([^\/]+)\/collaborators\/(\d+)$/,
    methods: ["DELETE"],
    handler: withAuth(handleClients),
  },
  {
    pattern: /^\/api\/v2\/clients\/([^\/]+)\/collaborators$/,
    methods: ["GET", "POST"],
    handler: withAuth(handleClients),
  },
  {
    pattern: /^\/api\/v2\/clients\/([^\/]+)\/services\/(\d+)\/items$/,
    methods: ["GET"],
    handler: withAuth(handleClients),
  },
  {
    pattern: /^\/api\/v2\/clients\/([^\/]+)\/services\/(\d+)$/,
    methods: ["PUT", "DELETE"],
    handler: withAuth(handleClients),
  },
  {
    pattern: /^\/api\/v2\/clients\/([^\/]+)\/services$/,
    methods: ["GET", "POST"],
    handler: withAuth(handleClients),
  },
  {
    pattern: /^\/api\/v2\/clients\/([^\/]+)$/,
    methods: ["GET", "PUT", "DELETE"],
    handler: withAuth(handleClients),
  },
  {
    pattern: /^\/api\/v2\/clients$/,
    methods: ["GET", "POST"],
    handler: withAuth(handleClients),
  },
];

