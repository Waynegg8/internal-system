/**
 * 外出登记统计功能
 */

import { successResponse } from "../../utils/response.js";

/**
 * 获取外出登记统计
 */
export async function handleGetTripSummary(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  const params = url.searchParams;
  const userId = params.get("user_id");
  const month = params.get("month");
  
  let targetUserId = user.is_admin && userId ? userId : String(user.user_id);
  
  const conditions = ["t.is_deleted = 0", "t.status = 'approved'"];
  const bindings = [];
  
  if (!user.is_admin || !userId) {
    conditions.push("t.user_id = ?");
    bindings.push(targetUserId);
  } else if (userId) {
    conditions.push("t.user_id = ?");
    bindings.push(userId);
  }
  
  if (month) {
    conditions.push("strftime('%Y-%m', t.trip_date) = ?");
    bindings.push(month);
  }
  
  const whereClause = conditions.join(" AND ");
  
  const summary = await env.DATABASE.prepare(
    `SELECT 
      COUNT(*) as total_trips,
      SUM(distance_km) as total_km,
      SUM(transport_subsidy_cents) as total_subsidy_cents
     FROM BusinessTrips t
     WHERE ${whereClause}`
  ).bind(...bindings).first();
  
  const data = {
    trip_count: Number(summary?.total_trips || 0),
    total_distance_km: Number(summary?.total_km || 0),
    total_subsidy_twd: Number(summary?.total_subsidy_cents || 0) / 100
  };
  
  return successResponse(data, "查詢成功", requestId);
}

