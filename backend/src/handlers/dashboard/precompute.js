/**
 * 預先計算儀表板數據
 */

import { saveKVCache } from "../../utils/cache.js";
import { ymToday, todayYmd } from "./utils.js";
import { getEmployeeMetrics } from "./dashboard-employee.js";
import { getAdminMetrics } from "./dashboard-admin.js";

/**
 * 預先計算所有用戶的儀表板數據
 * @param {Object} env - Cloudflare 環境變量
 * @param {Date} targetDate - 目標日期（用於計算當月）
 */
export async function precomputeDashboardData(env, targetDate = new Date()) {
  const ym = ymToday(targetDate);
  const today = todayYmd(targetDate);
  
  console.log(`[DashboardPrecompute] 開始預先計算儀表板數據 (${ym})`);
  
  try {
    // 獲取所有用戶
    const users = await env.DATABASE.prepare(
      `SELECT user_id, is_admin FROM Users WHERE is_deleted = 0`
    ).all();
    
    const userList = users?.results || [];
    let successCount = 0;
    let errorCount = 0;
    
    // 為每個用戶預先計算儀表板數據
    for (const user of userList) {
      try {
        const userId = user.user_id;
        const isAdmin = user.is_admin === 1;
        
        // 管理員：預先計算多種配置
        if (isAdmin) {
          // 預先計算管理員儀表板（使用默認參數）
          const financeYm = ym;
          const financeMode = 'month';
          const activityDays = '3';
          const activityUserId = '';
          const activityType = '';
          
          const adminData = await getAdminMetrics(env, ym, financeYm, financeMode, today, new URLSearchParams());
          const data = {
            role: 'admin',
            admin: adminData
          };
          
          const cacheKey = `dashboard:userId=${userId}&ym=${ym}&financeYm=${financeYm}&financeMode=${financeMode}&role=admin&actDays=${activityDays}&actUser=${activityUserId}&actType=${activityType}`;
          await saveKVCache(env, cacheKey, 'dashboard', data, { ttl: 28800 }).catch(() => {}); // 8小時，從凌晨2點到早上10點都有效
          
          successCount++;
        } else {
          // 員工：預先計算員工儀表板
          // 構建 user 對象（getEmployeeMetrics 需要的格式）
          const userObj = {
            user_id: userId,
            is_admin: 0
          };
          const employeeData = await getEmployeeMetrics(env, userObj, ym, today);
          const data = {
            role: 'employee',
            employee: employeeData
          };
          
          const cacheKey = `dashboard:userId=${userId}&ym=${ym}&financeYm=${ym}&financeMode=month&role=employee&actDays=3&actUser=&actType=`;
          await saveKVCache(env, cacheKey, 'dashboard', data, { ttl: 28800 }).catch(() => {}); // 8小時，從凌晨2點到早上10點都有效
          
          successCount++;
        }
      } catch (err) {
        console.error(`[DashboardPrecompute] 預先計算用戶 ${user.user_id} 失敗:`, err);
        errorCount++;
      }
    }
    
    console.log(`[DashboardPrecompute] 完成預先計算 (${ym}): 成功 ${successCount}, 失敗 ${errorCount}, 總計 ${userList.length}`);
    
    return {
      month: ym,
      total: userList.length,
      success: successCount,
      failed: errorCount
    };
  } catch (err) {
    console.error(`[DashboardPrecompute] 預先計算失敗 (${ym}):`, err);
    throw err;
  }
}

