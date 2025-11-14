import { calculateWeightedHours } from "./work-types.js";

/**
 * 取得某月份各客戶的應計收入總額（依 service_month 欄位）
 */
export async function getMonthlyRevenueByClient(targetMonth, env) {
  const rows = await env.DATABASE.prepare(
    `SELECT client_id, SUM(total_amount) AS total_amount
     FROM Receipts
     WHERE is_deleted = 0
       AND status != 'cancelled'
       AND service_month = ?
     GROUP BY client_id`
  ).bind(targetMonth).all();

  const result = {};
  for (const row of rows?.results || []) {
    if (!row.client_id) continue;
    result[row.client_id] = Number(row.total_amount || 0);
  }
  return result;
}

/**
 * 取得某年度各客戶的應計收入總額（依 service_month 欄位）
 */
export async function getAnnualRevenueByClient(year, env) {
  const rows = await env.DATABASE.prepare(
    `SELECT client_id, SUM(total_amount) AS total_amount
     FROM Receipts
     WHERE is_deleted = 0
       AND status != 'cancelled'
       AND substr(service_month, 1, 4) = ?
     GROUP BY client_id`
  ).bind(String(year)).all();

  const result = {};
  for (const row of rows?.results || []) {
    if (!row.client_id) continue;
    result[row.client_id] = Number(row.total_amount || 0);
  }
  return result;
}

/**
 * 按服務類型分攤客戶收入（依加權工時比例）
 */
export async function allocateRevenueByServiceType(clientId, targetMonth, totalRevenue, env) {
  const rows = await env.DATABASE.prepare(
    `SELECT 
        t.service_id,
        t.work_type,
        t.work_date,
        SUM(t.hours) AS total_hours,
        COALESCE(s.service_name, '未分類') AS service_name
     FROM Timesheets t
     LEFT JOIN Services s ON t.service_id = s.service_id
     WHERE t.client_id = ?
       AND substr(t.work_date, 1, 7) = ?
       AND t.is_deleted = 0
     GROUP BY t.service_id, t.work_type, t.work_date`
  ).bind(clientId, targetMonth).all();

  const timesheets = rows?.results || [];
  const serviceMap = new Map();
  const processedFixed = new Set();
  let totalWeightedHours = 0;

  for (const ts of timesheets) {
    const serviceId = ts.service_id || 0;
    const serviceName = ts.service_name;
    const hours = Number(ts.total_hours || 0);
    const workTypeId = parseInt(ts.work_type) || 1;
    const workDate = ts.work_date;

    let weightedHours;
    if (workTypeId === 7 || workTypeId === 10) {
      const key = `${workDate}:${workTypeId}`;
      if (!processedFixed.has(key)) {
        weightedHours = 8.0;
        processedFixed.add(key);
      } else {
        weightedHours = 0;
      }
    } else {
      weightedHours = calculateWeightedHours(workTypeId, hours);
    }

    if (!serviceMap.has(serviceId)) {
      serviceMap.set(serviceId, {
        serviceId,
        serviceName,
        hours: 0,
        weightedHours: 0,
      });
    }

    const service = serviceMap.get(serviceId);
    service.hours += hours;
    service.weightedHours += weightedHours;
    totalWeightedHours += weightedHours;
  }

  if (totalWeightedHours === 0 || totalRevenue === 0) {
    return [];
  }

  const serviceDetails = [];
  for (const [serviceId, service] of serviceMap) {
    const ratio = service.weightedHours / totalWeightedHours;
    const revenue = totalRevenue * ratio;

    serviceDetails.push({
      serviceId,
      serviceName: service.serviceName,
      hours: Number(service.hours.toFixed(1)),
      weightedHours: Number(service.weightedHours.toFixed(1)),
      revenue: Number(revenue.toFixed(2)),
      revenuePercentage: Number((ratio * 100).toFixed(1)),
    });
  }

  serviceDetails.sort((a, b) => b.revenue - a.revenue);
  return serviceDetails;
}



