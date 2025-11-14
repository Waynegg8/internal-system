/**
 * 任务成本明细计算
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { calculateAllEmployeesActualHourlyRate } from "./cost-allocation.js";
import { calculateWeightedHours } from "../reports/work-types.js";
import { getMonthlyRevenueByClient, getAnnualRevenueByClient } from "../reports/revenue-allocation.js";

/**
 * 获取任务成本明细
 */
export async function handleGetTaskCosts(request, env, ctx, requestId, url) {
  const params = url.searchParams;
  const year = parseInt(params.get("year") || String(new Date().getFullYear()), 10);
  const month = parseInt(params.get("month") || String(new Date().getMonth() + 1), 10);
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
  const clientId = params.get("client_id");
  const taskId = params.get("task_id");
  
  try {
    // 计算所有员工的实际时薪
    const employeeActualHourlyRates = await calculateAllEmployeesActualHourlyRate(env, year, month, yearMonth);
    
    // 构建查询条件
    const where = ["t.is_deleted = 0", "substr(t.work_date, 1, 7) = ?"];
    const binds = [yearMonth];
    
    if (clientId) {
      where.push("t.client_id = ?");
      binds.push(parseInt(clientId));
    }
    if (taskId) {
      where.push("t.task_id = ?");
      binds.push(parseInt(taskId));
    }
    
    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    
    // 获取所有有工时记录的客户
    const clientRows = await env.DATABASE.prepare(
      `SELECT DISTINCT
        c.client_id,
        c.company_name
       FROM Clients c
       JOIN Timesheets ts ON ts.client_id = c.client_id AND substr(ts.work_date, 1, 7) = ? AND ts.is_deleted = 0
       WHERE c.is_deleted = 0
       ORDER BY c.company_name ASC`
    ).bind(yearMonth).all();
    const clientList = clientRows?.results || [];
    
    // 工時類型倍率對照表
    const WORK_TYPE_MULTIPLIERS = {
      1: 1.0, 2: 1.34, 3: 1.67, 4: 1.34, 5: 1.67, 
      6: 2.67, 7: 1.0, 8: 1.34, 9: 1.67, 10: 1.0, 11: 1.34, 12: 1.67
    };
    
    // 為每個客戶計算成本，並按服務子項目（任務）分組顯示
    const tasks = [];
    
    for (const client of clientList) {
      // 獲取該客戶的所有工時記錄，包含服務子項目信息
      const timesheetRows = await env.DATABASE.prepare(
        `SELECT 
          ts.user_id, 
          u.name as user_name, 
          ts.work_type, 
          ts.work_date, 
          ts.hours, 
          ts.service_id,
          ts.service_item_id,
          si.item_name as service_item_name,
          COALESCE(s.service_name, s2.service_name, ts.service_name, '未分類') as service_name_full
         FROM Timesheets ts
         LEFT JOIN Users u ON ts.user_id = u.user_id
         LEFT JOIN ServiceItems si ON ts.service_item_id = si.item_id
         LEFT JOIN Services s ON ts.service_id = s.service_id
         LEFT JOIN Services s2 ON si.service_id = s2.service_id
         WHERE ts.client_id = ? AND substr(ts.work_date, 1, 7) = ? AND ts.is_deleted = 0
         ORDER BY COALESCE(s.service_id, s2.service_id, 0), ts.service_item_id, u.name`
      ).bind(client.client_id, yearMonth).all();
      const timesheets = timesheetRows?.results || [];
      
      // 按服務子項目分組計算（這才是真正的"任務"）
      const taskGroups = {};
      for (const ts of timesheets) {
        // 使用 service_item_id 作為任務的唯一標識
        const taskKey = ts.service_item_id 
          ? `item_${ts.service_item_id}` 
          : `name_${ts.service_name_full || 'general'}`;
        
        if (!taskGroups[taskKey]) {
          const taskTitle = ts.service_item_name || '一般服務';
          
          taskGroups[taskKey] = {
            taskTitle: taskTitle,
            timesheets: [],
            userNames: new Set()
          };
        }
        taskGroups[taskKey].timesheets.push(ts);
        if (ts.user_name) {
          taskGroups[taskKey].userNames.add(ts.user_name);
        }
      }
      
      // 為每個服務子項目（任務）生成一筆記錄
      for (const [taskKey, group] of Object.entries(taskGroups)) {
        let hours = 0;
        let weightedHours = 0;
        const processedFixedKeys = new Set();
        
        // 第一遍：计算加权工时
        for (const ts of group.timesheets) {
          const tsHours = Number(ts.hours || 0);
          const date = ts.work_date || '';
          const workTypeId = parseInt(ts.work_type) || 1;
          const multiplier = WORK_TYPE_MULTIPLIERS[workTypeId] || 1.0;
          
          hours += tsHours;
          
          if (workTypeId === 7 || workTypeId === 10) {
            const key = `${date}:${workTypeId}`;
            if (!processedFixedKeys.has(key)) {
              weightedHours += 8.0;
              processedFixedKeys.add(key);
            }
          } else {
            weightedHours += tsHours * multiplier;
          }
        }
        
        // 第二遍：使用实际时薪计算总成本
        let totalCost = 0;
        processedFixedKeys.clear();
        
        for (const ts of group.timesheets) {
          const date = ts.work_date || '';
          const workTypeId = parseInt(ts.work_type) || 1;
          let tsWeightedHours;
          
          if (workTypeId === 7 || workTypeId === 10) {
            const key = `${date}:${workTypeId}`;
            if (!processedFixedKeys.has(key)) {
              tsWeightedHours = 8.0;
              processedFixedKeys.add(key);
            } else {
              tsWeightedHours = 0;
            }
          } else {
            tsWeightedHours = Number(ts.hours || 0) * (WORK_TYPE_MULTIPLIERS[workTypeId] || 1.0);
          }
          
          const empUserId = String(ts.user_id);
          const actualHourlyRate = Number(employeeActualHourlyRates[empUserId] || 0);
          totalCost += Math.round(actualHourlyRate * tsWeightedHours);
        }
        
        // 计算平均实际时薪
        const avgActualHourlyRate = weightedHours > 0 ? Math.round(totalCost / weightedHours) : 0;
        
        // 生成任務記錄
        const assigneeNames = Array.from(group.userNames).join(', ') || '未指定';
        const serviceName = group.timesheets[0]?.service_name_full || '未分類';
        
        tasks.push({
          clientId: client.client_id,
          clientName: client.company_name,
          client_name: client.company_name,
          serviceId: group.timesheets[0]?.service_id,
          serviceName: (serviceName && serviceName !== '未分類') ? serviceName : (group.taskTitle || '未分類'),
          service_name: (serviceName && serviceName !== '未分類') ? serviceName : (group.taskTitle || '未分類'),
          service_name_full: (serviceName && serviceName !== '未分類') ? serviceName : (group.taskTitle || '未分類'),
          serviceItemId: group.timesheets[0]?.service_item_id,
          service_item_id: group.timesheets[0]?.service_item_id,
          taskTitle: group.taskTitle,
          service_item_name: group.taskTitle,
          assigneeName: assigneeNames,
          assignee_name: assigneeNames,
          hours: Math.round(hours * 10) / 10,
          weightedHours: Math.round(weightedHours * 10) / 10,
          avgActualHourlyRate: avgActualHourlyRate,
          avgHourlyRate: avgActualHourlyRate,
          actualHourlyRate: avgActualHourlyRate,
          totalCost: totalCost
        });
      }
    }
    
    tasks.sort((a, b) => b.totalCost - a.totalCost);
    
    return successResponse({
      year,
      month,
      tasks: tasks
    }, "查詢成功", requestId);
    
  } catch (err) {
    console.error(`[Task Costs] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "計算失敗", null, requestId);
  }
}

/**
 * 获取客户成本汇总
 */
export async function handleGetClientCosts(request, env, ctx, requestId, url) {
  const params = url.searchParams;
  const year = parseInt(params.get("year") || String(new Date().getFullYear()), 10);
  const month = parseInt(params.get("month") || String(new Date().getMonth() + 1), 10);
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
  
  try {
    // 计算所有员工的实际时薪
    const employeeActualHourlyRates = await calculateAllEmployeesActualHourlyRate(env, year, month, yearMonth);
    
    // 获取工时记录
    const timesheetsRows = await env.DATABASE.prepare(
      `SELECT 
        t.user_id,
        t.client_id,
        t.work_type,
        t.hours,
        t.work_date,
        c.company_name as client_name,
        u.name as user_name,
        u.base_salary
      FROM Timesheets t
      LEFT JOIN Clients c ON c.client_id = t.client_id
      LEFT JOIN Users u ON u.user_id = t.user_id
      WHERE t.is_deleted = 0 AND substr(t.work_date, 1, 7) = ?
      ORDER BY t.client_id, t.work_date`
    ).bind(yearMonth).all();
    
    const timesheets = timesheetsRows?.results || [];
    
    // 按客户分组计算成本
    const clientCostMap = new Map();
    const userProcessedFixed = {}; // 追踪每位员工的fixed_8h类型
    
    for (const ts of timesheets) {
      const clientId = ts.client_id;
      if (!clientId) continue;
      
      const userId = String(ts.user_id);
      const workTypeId = parseInt(ts.work_type || 1);
      const hours = Number(ts.hours || 0);
      const workDate = ts.work_date;
      
      // 初始化員工的 fixed_8h 追蹤集合
      if (!userProcessedFixed[userId]) {
        userProcessedFixed[userId] = new Set();
      }
      
      // 计算加权工时（按每個員工每天只計算一次 fixed_8h）
      const weightedHours = calculateWeightedHours(workTypeId, hours, workDate, userProcessedFixed[userId]);
      
      // 获取员工实际时薪
      const actualHourlyRate = employeeActualHourlyRates[userId] || 0;
      
      // 计算成本
      const cost = Math.round(weightedHours * actualHourlyRate);
      
      // 初始化客户成本记录
      if (!clientCostMap.has(clientId)) {
        clientCostMap.set(clientId, {
          clientId: clientId,
          clientName: ts.client_name || "",
          totalHours: 0,
          totalWeightedHours: 0,
          totalCost: 0,
          laborCost: 0,
          overheadAllocation: 0,
          employeeDetails: []
        });
      }
      
      const clientCost = clientCostMap.get(clientId);
      clientCost.totalHours += hours;
      clientCost.totalWeightedHours += weightedHours;
      clientCost.totalCost += cost;
      
      // 计算薪资成本
      const baseSalary = Number(ts.base_salary || 0);
      const baseHourlyRate = baseSalary / 240;
      const laborCost = Math.round(weightedHours * baseHourlyRate);
      clientCost.laborCost += laborCost;
      
      // 管理费分摊
      const overheadCost = cost - laborCost;
      clientCost.overheadAllocation += overheadCost;
      
      // 添加员工明细
      let employeeDetail = clientCost.employeeDetails.find(e => e.userId === userId);
      if (!employeeDetail) {
        employeeDetail = {
          userId: userId,
          userName: ts.user_name || "",
          hours: 0,
          weightedHours: 0,
          cost: 0,
          laborCost: 0,
          overheadAllocation: 0
        };
        clientCost.employeeDetails.push(employeeDetail);
      }
      
      employeeDetail.hours += hours;
      employeeDetail.weightedHours += weightedHours;
      employeeDetail.cost += cost;
      employeeDetail.laborCost += laborCost;
      employeeDetail.overheadAllocation += overheadCost;
    }
    
    // 获取每个客户的收入（使用收入分配函数）
    const monthlyRevenues = await getMonthlyRevenueByClient(yearMonth, env);
    const clientRevenueMap = new Map();
    for (const [clientId, revenue] of Object.entries(monthlyRevenues)) {
      clientRevenueMap.set(parseInt(clientId), Number(revenue || 0));
    }
    
    // 转换为数组并排序，添加收入和利润信息
    const clientCosts = Array.from(clientCostMap.values()).map(client => {
      const revenue = clientRevenueMap.get(client.clientId) || 0;
      const profit = revenue - client.totalCost;
      const margin = revenue > 0 ? Math.round((profit / revenue) * 10000) / 100 : 0;
      const avgHourlyRate = client.totalWeightedHours > 0 
        ? Math.round((client.totalCost / client.totalWeightedHours) * 100) / 100 
        : 0;
      
      return {
        ...client,
        clientId: client.clientId,
        clientName: client.clientName,
        totalHours: Math.round(client.totalHours * 10) / 10,
        weightedHours: Math.round(client.totalWeightedHours * 10) / 10,
        avgActualHourlyRate: avgHourlyRate,
        avgHourlyRate: avgHourlyRate,
        totalCost: client.totalCost,
        revenue: revenue,
        profit: profit,
        margin: margin,
        employeeDetails: client.employeeDetails.map(emp => ({
          ...emp,
          hours: Math.round(emp.hours * 10) / 10,
          weightedHours: Math.round(emp.weightedHours * 10) / 10,
          actualHourlyRate: emp.weightedHours > 0 
            ? Math.round((emp.cost / emp.weightedHours) * 100) / 100 
            : 0,
          totalCost: emp.cost
        })).sort((a, b) => b.cost - a.cost)
      };
    }).sort((a, b) => b.totalCost - a.totalCost);
    
    // 计算汇总
    const totalCost = clientCosts.reduce((sum, c) => sum + c.totalCost, 0);
    const totalRevenue = clientCosts.reduce((sum, c) => sum + c.revenue, 0);
    const totalProfit = clientCosts.reduce((sum, c) => sum + c.profit, 0);
    const avgMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 10000) / 100 : 0;
    
    return successResponse({
      year,
      month,
      clients: clientCosts,
      totalCost,
      totalRevenue,
      totalProfit,
      avgMargin
    }, "查詢成功", requestId);
    
  } catch (err) {
    console.error(`[Client Costs] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "計算失敗", null, requestId);
  }
}


