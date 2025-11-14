/**
 * 工时管理工具函数
 */

/**
 * 工时类型定义（符合劳基法规定）
 */
export const WORK_TYPES = {
  1: { name: '正常工时', multiplier: 1.0, isOvertime: false },
  2: { name: '平日加班（前2小时）', multiplier: 1.34, isOvertime: true, maxHours: 2 },
  3: { name: '平日加班（后2小时）', multiplier: 1.67, isOvertime: true, maxHours: 2, requiresTypes: [2] },
  4: { name: '休息日加班（前2小时）', multiplier: 1.34, isOvertime: true, maxHours: 2 },
  5: { name: '休息日加班（第3-8小时）', multiplier: 1.67, isOvertime: true, maxHours: 6, requiresTypes: [4] },
  6: { name: '休息日加班（第9-12小时）', multiplier: 2.67, isOvertime: true, maxHours: 4, requiresTypes: [4, 5] },
  7: { name: '国定假日加班（8小时内）', multiplier: 1.0, isOvertime: true, maxHours: 8, special: 'fixed_8h' },
  8: { name: '国定假日加班（第9-10小时）', multiplier: 1.34, isOvertime: true, maxHours: 2, requiresTypes: [7] },
  9: { name: '国定假日加班（第11-12小时）', multiplier: 1.67, isOvertime: true, maxHours: 2, requiresTypes: [8] },
  10: { name: '例假日加班（8小时内）', multiplier: 1.0, isOvertime: true, maxHours: 8, special: 'fixed_8h' },
  11: { name: '例假日加班（第9-12小时）', multiplier: 1.0, isOvertime: true, maxHours: 4, requiresTypes: [10] },
};

/**
 * 计算加权工时
 */
export function calculateWeightedHours(workTypeId, hours) {
  const workType = WORK_TYPES[workTypeId];
  if (!workType) return hours;
  
  if (workType.special === 'fixed_8h') {
    return 8.0;
  }
  
  return hours * workType.multiplier;
}

/**
 * 判断日期类型
 */
export async function getDateType(env, workDate) {
  const holidayRow = await env.DATABASE.prepare(
    `SELECT is_national_holiday FROM Holidays WHERE holiday_date = ?`
  ).bind(workDate).first();
  
  const date = new Date(workDate + 'T00:00:00');
  const dow = date.getDay();
  
  if (holidayRow?.is_national_holiday === 1) {
    return 'national_holiday';
  } else if (dow === 0) {
    return 'weekly_restday';
  } else if (dow === 6) {
    return 'restday';
  }
  return 'workday';
}

/**
 * 验证工时类型是否适用于该日期类型
 */
export function validateWorkTypeForDateType(workTypeId, dateType) {
  const allowedTypes = {
    'workday': [1, 2, 3],
    'restday': [4, 5, 6],
    'weekly_restday': [10, 11],
    'national_holiday': [7, 8, 9]
  };
  
  return allowedTypes[dateType]?.includes(workTypeId) || false;
}



