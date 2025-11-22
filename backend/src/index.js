/**
 * Cloudflare Worker 入口文件
 */

import { matchRoute } from "./router/index.js";
import { generateRequestId } from "./utils/response.js";
import { errorResponse } from "./utils/response.js";
import { addCorsHeaders } from "./middleware/cors.js";
import { generateTasksForMonth } from "./handlers/task-generator/generator-new.js";
import { rebuildDailyDashboardSummary } from "./handlers/dashboard/daily-summary.js";
import { precomputeReportCaches } from "./handlers/reports/precompute.js";

const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;

export default {
  async fetch(request, env, ctx) {
    const requestId = request.headers.get("X-Request-Id") || generateRequestId();
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    
    // 處理 CORS 預檢請求（在路由匹配之前）
    if (request.method === "OPTIONS") {
      const corsHeaders = new Headers();
      if (origin) {
        corsHeaders.set("Access-Control-Allow-Origin", origin);
        corsHeaders.set("Access-Control-Allow-Credentials", "true");
        corsHeaders.set("Vary", "Origin");
      } else {
        corsHeaders.set("Access-Control-Allow-Origin", "*");
      }
      corsHeaders.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      corsHeaders.set("Access-Control-Allow-Headers", request.headers.get("Access-Control-Request-Headers") || "Content-Type, X-Request-Id");
      corsHeaders.set("Access-Control-Max-Age", "600");
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    
    // 只处理 /api/v2/* 路径
    if (!url.pathname.startsWith("/api/v2/")) {
      // 即使是 404，也要添加 CORS 頭
      const corsHeaders = new Headers();
      if (origin) {
        corsHeaders.set("Access-Control-Allow-Origin", origin);
        corsHeaders.set("Access-Control-Allow-Credentials", "true");
      } else {
        corsHeaders.set("Access-Control-Allow-Origin", "*");
      }
      return new Response("Not Found", { status: 404, headers: corsHeaders });
    }
    
    try {
      const response = await matchRoute(request, env, ctx, requestId);
      // 確保所有響應都添加 CORS 頭
      return addCorsHeaders(response, request);
    } catch (error) {
      console.error(`[Worker] Unhandled error:`, error);
      const corsHeaders = new Headers();
      if (origin) {
        corsHeaders.set("Access-Control-Allow-Origin", origin);
        corsHeaders.set("Access-Control-Allow-Credentials", "true");
      } else {
        corsHeaders.set("Access-Control-Allow-Origin", "*");
      }
      corsHeaders.set("Content-Type", "application/json; charset=utf-8");
      return new Response(JSON.stringify({
        ok: false,
        code: "INTERNAL_ERROR",
        message: "伺服器錯誤",
        meta: { requestId },
      }), { status: 500, headers: corsHeaders });
    }
  },
  
  async scheduled(event, env, ctx) {
    const requestId = crypto.randomUUID();
    console.log(JSON.stringify({
      level: "info",
      requestId,
      event: "cron_triggered",
      scheduledTime: new Date(event.scheduledTime).toISOString(),
      cron: event.cron,
    }));
    
    try {
      const now = new Date(event.scheduledTime);
      const taipeiNow = new Date(now.getTime() + TAIPEI_OFFSET_MS);

      // 判斷是哪個 cron 任務
      if (event.cron === "0 18 * * *") {
        // 每天 18:00 UTC（台灣 02:00）：任務自動生成 + 所有預先計算任務
        console.log(`[Cron] 開始執行所有定時任務 (台灣時間: ${taipeiNow.toISOString()})`);
        
        // 1. 自動生成當月任務
        await handleTaskAutoGeneration(env, now, requestId);
        
        // 2. 薪資計算
        await handleDailyPayrollCalculation(env, now, taipeiNow, requestId);
        
        // 3. 補休檢查（每月1日）
        if (taipeiNow.getUTCDate() === 1) {
          await handleCompLeaveExpiry(env, taipeiNow, requestId);
        }
        
        // 4. 年度薪資計算
        await handleAnnualPayrollCalculation(env, taipeiNow, requestId);
        
        // 5. 報表快取預先計算
        await precomputeReportCaches(env, ctx, taipeiNow);
        
        // 6. 儀表板每日摘要重建
        await handleDashboardDailySummary(env, now, requestId);
        
        // 7. 任務通知檢查和發送
        await handleTaskNotifications(env, taipeiNow, requestId);
        
        // 8. 預先計算所有用戶的儀表板數據（異步執行，不阻塞）
        const { precomputeDashboardData } = await import("./handlers/dashboard/precompute.js");
        ctx.waitUntil(
          precomputeDashboardData(env, taipeiNow).catch((err) => {
            console.error("[Cron] 預先計算儀表板數據失敗:", err);
          })
        );
      }

    } catch (err) {
      console.error(JSON.stringify({
        level: "error",
        requestId,
        event: "cron_failed",
        error: String(err),
      }));
      
      try {
        await env.DATABASE.prepare(
          `INSERT INTO CronJobExecutions 
           (job_name, status, executed_at, error_message)
           VALUES (?, 'failed', datetime('now'), ?)`
        ).bind("unknown_cron", String(err)).run();
      } catch (_) {
        // Ignore logging errors
      }
    }
  },
};

async function handleTaskAutoGeneration(env, now, requestId) {
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;

  try {
    // 免費版限制：
    // - Cron Trigger (間隔 >= 1小時): 最多 15 分鐘 wall-clock time
    // - D1 查詢次數: 每次 Worker 呼叫最多 50 次
    // 如果還有未處理的服務，繼續處理直到時間或查詢次數接近限制
    const MAX_TOTAL_TIME_MS = 14 * 60 * 1000; // 14 分鐘（留 1 分鐘緩衝）
    const MAX_TOTAL_QUERIES = 50; // 每次 Worker 呼叫最多 50 次查詢
    const startTime = Date.now();
    let totalGenerated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let totalProcessed = 0;
    let totalServices = 0;
    let iteration = 0;
    let isComplete = false;

    // 多次調用直到完成或時間/查詢次數接近限制
    let totalQueries = 0;
    while (true) {
      iteration++;
      const elapsed = Date.now() - startTime;
      
      // 檢查是否接近時間限制
      if (elapsed > MAX_TOTAL_TIME_MS) {
        console.log(`[TaskAutoGeneration] 執行時間接近限制（${elapsed}ms），停止處理。已處理 ${totalProcessed} 個服務，總共使用 ${totalQueries} 次 D1 查詢`);
        break;
      }
      
      // 檢查是否接近查詢次數限制
      if (totalQueries >= MAX_TOTAL_QUERIES) {
        console.log(`[TaskAutoGeneration] 已達到 D1 查詢次數限制（${totalQueries}/${MAX_TOTAL_QUERIES}），停止處理。已處理 ${totalProcessed} 個服務`);
        break;
      }

      const result = await generateTasksForMonth(env, currentYear, currentMonth, {
        now,
      });

      totalGenerated += result.generatedCount || 0;
      totalSkipped += result.skippedCount || 0;
      totalErrors += result.errors || 0;
      totalProcessed += result.processedServices || 0;
      totalServices = result.totalServices || 0;
      isComplete = result.isComplete || false;
      totalQueries += result.queryCount || 0;

      console.log(`[TaskAutoGeneration] 第 ${iteration} 次調用完成：處理 ${result.processedServices || 0} 個服務，生成 ${result.generatedCount || 0} 個任務，使用 ${result.queryCount || 0} 次 D1 查詢（累計 ${totalQueries} 次）`);

      // 如果已完成所有服務，退出循環
      if (isComplete) {
        console.log(`[TaskAutoGeneration] 所有服務處理完成（共 ${totalProcessed} 個）`);
        break;
      }

      // 如果沒有處理任何服務（可能所有服務都已處理），退出循環
      if ((result.processedServices || 0) === 0) {
        console.log(`[TaskAutoGeneration] 沒有更多服務需要處理`);
        break;
      }
    }

    // 更新生成狀態到 KV
    if (isComplete) {
      // 生成完成，清除鎖定
      await env.CACHE.delete(lockKey).catch(err => 
        console.warn("[TaskAutoGeneration] 清除生成鎖定失敗", err)
      );
      console.log(`[TaskAutoGeneration] 任務生成完成，已清除鎖定狀態`);
    } else {
      // 生成未完成，記錄狀態供下次 Cron 繼續處理
      await env.CACHE.put(lockKey, JSON.stringify({
        status: 'partial',
        year: currentYear,
        month: currentMonth,
        processedServices: totalProcessed,
        totalServices: totalServices,
        remainingServices: totalServices - totalProcessed,
        lastUpdated: now.toISOString(),
        requestId
      }), { expirationTtl: 86400 * 2 }).catch(err => 
        console.warn("[TaskAutoGeneration] 記錄生成狀態失敗", err)
      );
      console.log(`[TaskAutoGeneration] 任務生成部分完成（${totalProcessed}/${totalServices}），已記錄狀態供下次繼續處理`);
    }

    const jobStatus = isComplete ? 'success' : 'partial';
    await env.DATABASE.prepare(
      `INSERT INTO CronJobExecutions 
       (job_name, status, executed_at, details)
       VALUES (?, ?, datetime('now'), ?)`
    )
      .bind(
        "task_auto_generation",
        jobStatus,
        JSON.stringify({
          year: currentYear,
          month: currentMonth,
          generated: totalGenerated,
          skipped: totalSkipped,
          errors: totalErrors,
          processedServices: totalProcessed,
          totalServices: totalServices,
          remainingServices: totalServices - totalProcessed,
          isComplete: isComplete,
          iterations: iteration,
          totalQueries: totalQueries,
          triggeredAt: now.toISOString(),
          requestId,
        })
      )
      .run();

    console.log(
      JSON.stringify({
        level: "info",
        requestId,
        event: "cron_completed",
        job: "task_auto_generation",
        year: currentYear,
        month: currentMonth,
        generated: result.generatedCount,
        skipped: result.skippedCount,
      })
    );
  } catch (err) {
    console.error("[Cron] task_auto_generation failed", err);
    await env.DATABASE.prepare(
      `INSERT INTO CronJobExecutions 
       (job_name, status, executed_at, error_message)
       VALUES (?, 'failed', datetime('now'), ?)`
    )
      .bind("task_auto_generation", String(err))
      .run()
      .catch(() => {});
    throw err;
  }
}

async function handleDashboardDailySummary(env, now, requestId) {
  try {
    const summary = await rebuildDailyDashboardSummary(env, now);

    await env.DATABASE.prepare(
      `INSERT INTO CronJobExecutions 
       (job_name, status, executed_at, details)
       VALUES (?, 'success', datetime('now'), ?)`
    )
      .bind(
        "dashboard_daily_summary",
        JSON.stringify({
          summaryDate: summary.date,
          stats: summary.stats,
          triggeredAt: now.toISOString(),
          requestId,
        })
      )
      .run();

    console.log(
      JSON.stringify({
        level: "info",
        requestId,
        event: "cron_completed",
        job: "dashboard_daily_summary",
        summaryDate: summary.date,
        stats: summary.stats,
      })
    );
  } catch (err) {
    console.error("[Cron] dashboard_daily_summary failed", err);
    await env.DATABASE.prepare(
      `INSERT INTO CronJobExecutions 
       (job_name, status, executed_at, error_message)
       VALUES (?, 'failed', datetime('now'), ?)`
    )
      .bind("dashboard_daily_summary", String(err))
      .run()
      .catch(() => {});
    throw err;
  }
}

/**
 * 處理補休到期轉加班費
 */
async function handleCompLeaveExpiry(env, now, requestId) {
  const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const lastDayOfLastMonth = new Date(Date.UTC(lastMonth.getUTCFullYear(), lastMonth.getUTCMonth() + 1, 0));
  const expiryDate = `${lastDayOfLastMonth.getUTCFullYear()}-${String(lastDayOfLastMonth.getUTCMonth() + 1).padStart(2, "0")}-${String(lastDayOfLastMonth.getUTCDate()).padStart(2, "0")}`;
  const payrollMonth = `${lastMonth.getUTCFullYear()}-${String(lastMonth.getUTCMonth() + 1).padStart(2, "0")}`;
  
  const expiredGrants = await env.DATABASE.prepare(
    `SELECT g.grant_id, g.user_id, g.hours_remaining, g.original_rate, u.base_salary
     FROM CompensatoryLeaveGrants g
     LEFT JOIN Users u ON g.user_id = u.user_id
     WHERE g.expiry_date = ? AND g.status = 'active' AND g.hours_remaining > 0`
  ).bind(expiryDate).all();
  
  let processedCount = 0;
  const grantIds = [];
  
  for (const grant of (expiredGrants?.results || [])) {
    const baseSalary = Number(grant.base_salary || 0);
    const hourlyRate = baseSalary / 240;
    const hours = Number(grant.hours_remaining || 0);
    const rate = Number(grant.original_rate || 1);
    const amountCents = Math.round(hours * hourlyRate * rate * 100);
    
    await env.DATABASE.prepare(
      `INSERT INTO CompensatoryOvertimePay 
       (user_id, year_month, hours_expired, amount_cents, source_grant_ids)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(
      String(grant.user_id),
      payrollMonth,
      hours,
      amountCents,
      JSON.stringify([grant.grant_id])
    ).run();
    
    await env.DATABASE.prepare(
      `UPDATE CompensatoryLeaveGrants SET status = 'expired' WHERE grant_id = ?`
    ).bind(grant.grant_id).run();
    
    grantIds.push(grant.grant_id);
    processedCount++;
  }
  
  await env.DATABASE.prepare(
    `INSERT INTO CronJobExecutions 
     (job_name, status, executed_at, details)
     VALUES (?, 'success', datetime('now'), ?)`
  ).bind("comp_leave_expiry", JSON.stringify({
    expiryDate,
    processedCount,
    grantIds,
    payrollMonth,
    triggeredBy: "cron",
  })).run();
  
  console.log(JSON.stringify({
    level: "info",
    requestId,
    event: "cron_completed",
    job: "comp_leave_expiry",
    processedCount,
    expiryDate,
    payrollMonth,
  }));
}

/**
 * 處理每天自動計算當月薪資
 */
async function handleDailyPayrollCalculation(env, now, taipeiNow, requestId) {
  const { recalculateAllEmployeesPayroll, getCurrentMonth, processPayrollRecalcQueue } = await import("./utils/payroll-recalculate.js");
  
  const currentMonth = getCurrentMonth(taipeiNow);
  console.log(`[Cron] 開始處理 ${currentMonth} 的薪資重算佇列 (local=TPE)`);
  
  try {
    const queueResult = await processPayrollRecalcQueue(env, { month: currentMonth, limit: 50, requestId });
    const result = await recalculateAllEmployeesPayroll(env, currentMonth);
    
    await env.DATABASE.prepare(
      `INSERT INTO CronJobExecutions 
       (job_name, status, executed_at, details)
       VALUES (?, 'success', datetime('now'), ?)`
    ).bind("daily_payroll_calculation", JSON.stringify({
      month: currentMonth,
      total: result.total,
      success: result.success,
      failed: result.failed,
      queueProcessed: queueResult.processed,
      triggeredBy: "cron",
      triggeredAtUtc: now.toISOString(),
      triggeredAtTaipei: taipeiNow.toISOString(),
    })).run();
    
    console.log(JSON.stringify({
      level: "info",
      requestId,
      event: "cron_completed",
      job: "daily_payroll_calculation",
      month: currentMonth,
      success: result.success,
      total: result.total,
      queueProcessed: queueResult.processed,
      triggeredAtTaipei: taipeiNow.toISOString(),
    }));
  } catch (err) {
    await env.DATABASE.prepare(
      `INSERT INTO CronJobExecutions 
       (job_name, status, executed_at, error_message)
       VALUES (?, 'failed', datetime('now'), ?)`
    ).bind("daily_payroll_calculation", String(err)).run();
    throw err;
  }
}

async function handleAnnualPayrollCalculation(env, taipeiNow, requestId) {
  const { recalculateAllEmployeesPayroll, processPayrollRecalcQueue } = await import("./utils/payroll-recalculate.js");
  
  const targetYear = taipeiNow.getUTCFullYear();
  const months = Array.from({ length: 12 }, (_, idx) => `${targetYear}-${String(idx + 1).padStart(2, "0")}`);
  const monthSummaries = [];
  
  for (const month of months) {
    const summary = {
      month,
      status: "success",
      total: 0,
      success: 0,
      failed: 0,
      queueProcessed: 0,
    };
    
    try {
      let queueProcessed = 0;
      while (true) {
        const queueResult = await processPayrollRecalcQueue(env, { month, limit: 50, requestId });
        queueProcessed += queueResult.processed;
        if (queueResult.processed < 50) break;
      }
      summary.queueProcessed = queueProcessed;
      
      const result = await recalculateAllEmployeesPayroll(env, month);
      summary.total = result.total;
      summary.success = result.success;
      summary.failed = result.failed;
    } catch (err) {
      summary.status = "error";
      summary.error = String(err);
      console.error(JSON.stringify({
        level: "error",
        requestId,
        event: "annual_payroll_month_failed",
        month,
        error: String(err),
      }));
    }
    
    monthSummaries.push(summary);
  }
  
  const failedMonths = monthSummaries.filter((item) => item.status === "error").map((item) => item.month);
  const status = failedMonths.length ? "failed" : "success";
  
  await env.DATABASE.prepare(
    `INSERT INTO CronJobExecutions 
     (job_name, status, executed_at, details)
     VALUES (?, ?, datetime('now'), ?)`
  ).bind("annual_payroll_calculation", status, JSON.stringify({
    year: targetYear,
    results: monthSummaries,
    failedMonths,
    triggeredBy: "cron",
    triggeredAtTaipei: taipeiNow.toISOString(),
  })).run();
  
  console.log(JSON.stringify({
    level: "info",
    requestId,
    event: "cron_completed",
    job: "annual_payroll_calculation",
    year: targetYear,
    failedMonths,
  }));
  
  if (failedMonths.length) {
    throw new Error(`annual payroll calculation failed for months: ${failedMonths.join(",")}`);
  }
}

/**
 * 處理任務通知檢查和發送
 * 每日 02:00（台灣時間）執行，檢查並發送任務通知
 */
async function handleTaskNotifications(env, taipeiNow, requestId) {
  try {
    console.log(`[Cron] 開始執行任務通知檢查 (台灣時間: ${taipeiNow.toISOString()})`);

    // 導入任務檢查和發送函數
    const {
      checkOverdueTasks,
      checkUpcomingTasks,
      checkPredecessorTaskDelays,
      checkFixedDeadlineConflicts
    } = await import("./handlers/task-notifications/task-checkers.js");
    
    const { sendTaskNotification } = await import("./handlers/task-notifications/notification-sender.js");

    const stats = {
      overdue: { checked: 0, sent: 0, errors: 0 },
      upcoming: { checked: 0, sent: 0, errors: 0 },
      delay: { checked: 0, sent: 0, errors: 0 },
      conflict: { checked: 0, sent: 0, errors: 0 }
    };

    // 1. 檢查逾期任務
    try {
      const overdueNotifications = await checkOverdueTasks(env, taipeiNow);
      stats.overdue.checked = overdueNotifications.length;

      for (const notification of overdueNotifications) {
        try {
          const result = await sendTaskNotification(
            env,
            notification.task.task_id,
            'overdue',
            notification.recipients,
            notification.notificationData,
            taipeiNow
          );

          if (result.success) {
            stats.overdue.sent += result.sentCount;
          } else {
            stats.overdue.errors++;
            console.warn(`[TaskNotifications] 逾期通知發送失敗 (taskId: ${notification.task.task_id}):`, result.reason || result.errors);
          }
        } catch (error) {
          stats.overdue.errors++;
          console.error(`[TaskNotifications] 逾期通知發送異常 (taskId: ${notification.task.task_id}):`, error);
        }
      }
    } catch (error) {
      console.error("[TaskNotifications] 檢查逾期任務失敗:", error);
      stats.overdue.errors++;
    }

    // 2. 檢查即將到期任務
    try {
      const upcomingNotifications = await checkUpcomingTasks(env, taipeiNow);
      stats.upcoming.checked = upcomingNotifications.length;

      for (const notification of upcomingNotifications) {
        try {
          const result = await sendTaskNotification(
            env,
            notification.task.task_id,
            'upcoming',
            notification.recipients,
            notification.notificationData,
            taipeiNow
          );

          if (result.success) {
            stats.upcoming.sent += result.sentCount;
          } else {
            stats.upcoming.errors++;
            console.warn(`[TaskNotifications] 即將到期通知發送失敗 (taskId: ${notification.task.task_id}):`, result.reason || result.errors);
          }
        } catch (error) {
          stats.upcoming.errors++;
          console.error(`[TaskNotifications] 即將到期通知發送異常 (taskId: ${notification.task.task_id}):`, error);
        }
      }
    } catch (error) {
      console.error("[TaskNotifications] 檢查即將到期任務失敗:", error);
      stats.upcoming.errors++;
    }

    // 3. 檢查前置任務延誤
    try {
      const delayNotifications = await checkPredecessorTaskDelays(env, taipeiNow);
      stats.delay.checked = delayNotifications.length;

      for (const notification of delayNotifications) {
        try {
          // 對於前置任務延誤通知，使用前置任務的 task_id
          const result = await sendTaskNotification(
            env,
            notification.task.task_id,
            'delay',
            notification.recipients,
            notification.notificationData,
            taipeiNow
          );

          if (result.success) {
            stats.delay.sent += result.sentCount;
          } else {
            stats.delay.errors++;
            console.warn(`[TaskNotifications] 前置任務延誤通知發送失敗 (taskId: ${notification.task.task_id}):`, result.reason || result.errors);
          }
        } catch (error) {
          stats.delay.errors++;
          console.error(`[TaskNotifications] 前置任務延誤通知發送異常 (taskId: ${notification.task.task_id}):`, error);
        }
      }
    } catch (error) {
      console.error("[TaskNotifications] 檢查前置任務延誤失敗:", error);
      stats.delay.errors++;
    }

    // 4. 檢查固定期限任務衝突
    try {
      const conflictNotifications = await checkFixedDeadlineConflicts(env, taipeiNow);
      stats.conflict.checked = conflictNotifications.length;

      for (const notification of conflictNotifications) {
        try {
          // 對於固定期限任務衝突通知，使用固定期限任務的 task_id
          const result = await sendTaskNotification(
            env,
            notification.task.task_id,
            'conflict',
            notification.recipients,
            notification.notificationData,
            taipeiNow
          );

          if (result.success) {
            stats.conflict.sent += result.sentCount;
          } else {
            stats.conflict.errors++;
            console.warn(`[TaskNotifications] 固定期限任務衝突通知發送失敗 (taskId: ${notification.task.task_id}):`, result.reason || result.errors);
          }
        } catch (error) {
          stats.conflict.errors++;
          console.error(`[TaskNotifications] 固定期限任務衝突通知發送異常 (taskId: ${notification.task.task_id}):`, error);
        }
      }
    } catch (error) {
      console.error("[TaskNotifications] 檢查固定期限任務衝突失敗:", error);
      stats.conflict.errors++;
    }

    // 記錄執行結果到 CronJobExecutions 表
    const totalChecked = stats.overdue.checked + stats.upcoming.checked + stats.delay.checked + stats.conflict.checked;
    const totalSent = stats.overdue.sent + stats.upcoming.sent + stats.delay.sent + stats.conflict.sent;
    const totalErrors = stats.overdue.errors + stats.upcoming.errors + stats.delay.errors + stats.conflict.errors;
    const status = totalErrors === 0 ? 'success' : (totalSent > 0 ? 'partial' : 'failed');

    await env.DATABASE.prepare(
      `INSERT INTO CronJobExecutions 
       (job_name, status, executed_at, details)
       VALUES (?, ?, datetime('now'), ?)`
    ).bind(
      "task_notifications",
      status,
      JSON.stringify({
        stats,
        totalChecked,
        totalSent,
        totalErrors,
        triggeredAt: taipeiNow.toISOString(),
        requestId,
      })
    ).run();

    console.log(JSON.stringify({
      level: "info",
      requestId,
      event: "cron_completed",
      job: "task_notifications",
      stats,
      totalChecked,
      totalSent,
      totalErrors,
      status,
    }));

  } catch (err) {
    console.error("[Cron] task_notifications failed", err);
    await env.DATABASE.prepare(
      `INSERT INTO CronJobExecutions 
       (job_name, status, executed_at, error_message)
       VALUES (?, 'failed', datetime('now'), ?)`
    )
      .bind("task_notifications", String(err))
      .run()
      .catch(() => {});
    // 不拋出錯誤，避免影響其他 cron 任務
  }
}

