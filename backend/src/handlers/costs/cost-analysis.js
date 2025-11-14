/**
 * 成本分析功能
 */

import { successResponse, errorResponse } from "../../utils/response.js";

/**
 * 获取成本分析
 */
export async function handleGetCostAnalysis(request, env, ctx, requestId, url) {
  const params = url.searchParams;
  const year = parseInt(params.get("year") || String(new Date().getFullYear()), 10);
  const month = params.get("month") ? parseInt(params.get("month"), 10) : null;
  
  try {
    // 获取总成本
    const costWhere = ["oc.is_deleted = 0", "oc.year = ?"];
    const costBinds = [year];
    if (month) {
      costWhere.push("oc.month = ?");
      costBinds.push(month);
    }
    
    const costRows = await env.DATABASE.prepare(
      `SELECT SUM(oc.amount) as total_cost
       FROM MonthlyOverheadCosts oc
       WHERE ${costWhere.join(" AND ")}`
    ).bind(...costBinds).first();
    
    const totalCosts = Number(costRows?.total_cost || 0);
    
    // 获取总收入（从收据）
    const revenueWhere = ["r.is_deleted = 0", "r.status = 'paid'", "substr(r.receipt_date, 1, 4) = ?"];
    const revenueBinds = [String(year)];
    if (month) {
      revenueWhere.push("substr(r.receipt_date, 6, 2) = ?");
      revenueBinds.push(String(month).padStart(2, '0'));
    }
    
    const revenueRows = await env.DATABASE.prepare(
      `SELECT SUM(r.total_amount) as total_revenue
       FROM Receipts r
       WHERE ${revenueWhere.join(" AND ")}`
    ).bind(...revenueBinds).first();
    
    const totalRevenue = Number(revenueRows?.total_revenue || 0);
    
    // 计算利润和利润率
    const profit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? Math.round((profit / totalRevenue) * 10000) / 100 : 0;
    
    // 按类型分组统计成本
    const typeRows = await env.DATABASE.prepare(
      `SELECT 
        ot.cost_type_id, ot.cost_name, ot.category,
        SUM(oc.amount) as type_total
       FROM MonthlyOverheadCosts oc
       JOIN OverheadCostTypes ot ON ot.cost_type_id = oc.cost_type_id
       WHERE ${costWhere.join(" AND ")}
       GROUP BY ot.cost_type_id, ot.cost_name, ot.category
       ORDER BY type_total DESC`
    ).bind(...costBinds).all();
    
    const costByType = (typeRows?.results || []).map(r => ({
      cost_type_id: r.cost_type_id,
      type_name: r.cost_name || "",
      category: r.category || "",
      amount: Number(r.type_total || 0),
      percentage: totalCosts > 0 ? Math.round((Number(r.type_total || 0) / totalCosts) * 10000) / 100 : 0
    }));
    
    return successResponse({
      year,
      month,
      total_revenue: totalRevenue,
      total_costs: totalCosts,
      profit: profit,
      profit_margin: profitMargin,
      cost_by_type: costByType
    }, "查詢成功", requestId);
    
  } catch (err) {
    console.error(`[Cost Analysis] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "計算失敗", null, requestId);
  }
}

