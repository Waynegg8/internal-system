/**
 * 任務生成器主入口（重構版）
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { generateTasksForMonth } from "./generator-new.js";

/**
 * 手動觸發任務生成
 */
export async function handleManualTaskGeneration(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  
  // 僅管理員可以手動觸發任務生成
  if (!user || !user.is_admin) {
    return errorResponse(403, "FORBIDDEN", "僅管理員可以手動觸發任務生成", null, requestId);
  }
  
  try {
    const params = url.searchParams;
    const targetMonth = params.get("target_month"); // 格式：YYYY-MM
    
    let targetYear, targetMonthNum;
    
    if (targetMonth) {
      const [year, month] = targetMonth.split('-');
      targetYear = parseInt(year);
      targetMonthNum = parseInt(month);
    } else {
      const now = new Date();
      targetYear = now.getFullYear();
      targetMonthNum = now.getMonth() + 1;
    }
    
    const result = await generateTasksForMonth(env, targetYear, targetMonthNum);
    
    return successResponse(result, "任務生成完成", requestId);
    
  } catch (err) {
    console.error(`[Task Generator] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "任務生成失敗", null, requestId);
  }
}

/**
 * 任務生成預覽
 */
export async function handleTaskGenerationPreview(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  
  // 僅管理員可以預覽任務生成
  if (!user || !user.is_admin) {
    return errorResponse(403, "FORBIDDEN", "僅管理員可以預覽任務生成", null, requestId);
  }
  
  try {
    const params = url.searchParams;
    const targetMonth = params.get("target_month"); // YYYY-MM
    
    let now;
    if (targetMonth) {
      const [year, month] = targetMonth.split('-');
      now = new Date(parseInt(year), parseInt(month) - 1, 1);
    } else {
      now = new Date();
    }
    
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // 獲取所有啟用的客戶服務和任務配置
    const configs = await env.DATABASE.prepare(`
      SELECT 
        tc.config_id,
        tc.task_name,
        tc.delivery_frequency,
        tc.delivery_months,
        tc.auto_generate,
        cs.client_id,
        cs.service_id,
        cs.client_service_id,
        c.company_name,
        s.service_name
      FROM ClientServiceTaskConfigs tc
      JOIN ClientServices cs ON tc.client_service_id = cs.client_service_id
      JOIN Clients c ON cs.client_id = c.client_id
      JOIN Services s ON cs.service_id = s.service_id
      WHERE tc.is_deleted = 0 
        AND cs.is_deleted = 0
        AND c.is_deleted = 0
        AND tc.auto_generate = 1
        AND cs.status = 'active'
      ORDER BY c.company_name, s.service_name, tc.stage_order
    `).all();
    
    const preview = [];
    
    for (const config of (configs.results || [])) {
      // 檢查是否應該在這個月生成
      const deliveryMonths = config.delivery_months ? JSON.parse(config.delivery_months) : null;
      let shouldGenerate = false;
      
      if (deliveryMonths && Array.isArray(deliveryMonths)) {
        shouldGenerate = deliveryMonths.includes(currentMonth);
      } else {
        const frequency = config.delivery_frequency;
        switch (frequency) {
          case 'monthly':
            shouldGenerate = true;
            break;
          case 'bi-monthly':
            shouldGenerate = currentMonth % 2 === 1;
            break;
          case 'quarterly':
            shouldGenerate = [1, 4, 7, 10].includes(currentMonth);
            break;
          case 'yearly':
            shouldGenerate = currentMonth === 1;
            break;
        }
      }
      
      if (!shouldGenerate) continue;
      
      // 檢查是否已經生成過
      const existing = await env.DATABASE.prepare(`
        SELECT task_id FROM ActiveTasks
        WHERE client_service_id = ?
          AND task_config_id = ?
          AND service_year = ?
          AND service_month = ?
          AND is_deleted = 0
      `).bind(
        config.client_service_id,
        config.config_id,
        currentYear,
        currentMonth
      ).first();
      
      preview.push({
        config_id: config.config_id,
        task_name: config.task_name,
        client_id: config.client_id,
        client_name: config.company_name,
        service_id: config.service_id,
        service_name: config.service_name,
        already_generated: !!existing
      });
    }
    
    return successResponse({
      year: currentYear,
      month: currentMonth,
      preview: preview,
      summary: {
        total_configs: preview.length,
        will_generate: preview.filter(p => !p.already_generated).length,
        already_generated: preview.filter(p => p.already_generated).length
      }
    }, "預覽成功", requestId);
    
  } catch (err) {
    console.error(`[Task Generator Preview] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "預覽失敗", null, requestId);
  }
}
