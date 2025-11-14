/**
 * 请假管理路由
 */

import { handleLeaves } from "../handlers/leaves.js";
import { handleDeleteMarriageLeaves } from "../handlers/admin/delete-marriage-leaves.js";
import { handleCheckMarriageLeaves } from "../handlers/admin/check-marriage-leaves.js";
import { withAuth, withAdmin } from "../middleware/auth.js";

export const leavesRoutes = [
  {
    pattern: /^\/api\/v2\/leaves$/,
    methods: ["GET", "POST"],
    handler: withAuth(handleLeaves),
  },
  {
    pattern: /^\/api\/v2\/leaves\/balances$/,
    methods: ["GET"],
    handler: withAuth(handleLeaves),
  },
  {
    pattern: /^\/api\/v2\/leaves\/life-events$/,
    methods: ["GET", "POST"],
    handler: withAuth(handleLeaves),
  },
  {
    pattern: /^\/api\/v2\/leaves\/life-events\/(\d+)$/,
    methods: ["DELETE"],
    handler: withAuth(handleLeaves),
  },
  {
    pattern: /^\/api\/v2\/leaves\/recalculate-balances\/(\d+)$/,
    methods: ["POST"],
    handler: withAuth(handleLeaves),
  },
  {
    pattern: /^\/api\/v2\/leaves\/(\d+)$/,
    methods: ["GET", "PUT", "DELETE"],
    handler: withAuth(handleLeaves),
  },
  // 臨時管理端點：檢查婚假餘額（診斷用）
  {
    pattern: /^\/api\/v2\/admin\/check-marriage-leaves$/,
    methods: ["GET"],
    handler: withAuth(handleCheckMarriageLeaves),
  },
  // 臨時管理端點：刪除婚假餘額（完成後應刪除此路由）
  {
    pattern: /^\/api\/v2\/admin\/delete-marriage-leaves$/,
    methods: ["DELETE"],
    handler: withAuth(handleDeleteMarriageLeaves),
  },
];

