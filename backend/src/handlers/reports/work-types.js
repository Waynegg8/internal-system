/**
 * 工时类型定义和工具函数
 */

export const WORK_TYPES = {
  1: { name: '正常工時', multiplier: 1.0, isOvertime: false },
  2: { name: '平日加班（前2h）', multiplier: 1.34, isOvertime: true },
  3: { name: '平日加班（後2h）', multiplier: 1.67, isOvertime: true },
  4: { name: '休息日（前2h）', multiplier: 1.34, isOvertime: true },
  5: { name: '休息日（3-8h）', multiplier: 1.67, isOvertime: true },
  6: { name: '休息日（9-12h）', multiplier: 2.67, isOvertime: true },
  7: { name: '國定假日（8h內）', multiplier: 1.0, isOvertime: true, special: 'fixed_8h' },
  8: { name: '國定假日（9-10h）', multiplier: 1.34, isOvertime: true },
  9: { name: '國定假日（11-12h）', multiplier: 1.67, isOvertime: true },
  10: { name: '例假日（8h內）', multiplier: 1.0, isOvertime: true, special: 'fixed_8h' },
  11: { name: '例假日（9-10h）', multiplier: 1.34, isOvertime: true },
  12: { name: '例假日（11-12h）', multiplier: 1.67, isOvertime: true },
};

/**
 * 计算加权工时
 * @param {number} workTypeId - 工时类型ID
 * @param {number} hours - 实际工时
 * @param {string} workDate - 工作日期（可选，用于fixed_8h类型）
 * @param {Set|Map} processedFixedKeys - 已处理的fixed_8h键集合（可选，用于fixed_8h类型）
 * @returns {number} 加权工时
 */
export function calculateWeightedHours(workTypeId, hours, workDate = null, processedFixedKeys = null) {
  const workType = WORK_TYPES[workTypeId];
  if (!workType) return hours;
  
  if (workType.special === 'fixed_8h') {
    // 如果提供了日期和已处理键集合，则按每日唯一性处理
    if (workDate && processedFixedKeys) {
      const key = `${workDate}:${workTypeId}`;
      if (processedFixedKeys.has && processedFixedKeys.has(key)) {
        return 0; // 该日期+类型已处理过，返回0
      }
      if (processedFixedKeys.add) {
        processedFixedKeys.add(key);
      } else if (processedFixedKeys.set) {
        processedFixedKeys.set(key, true);
      }
      return 8.0; // 固定8小时
    }
    // 如果没有提供日期和键集合，直接返回8小时（向后兼容）
    return 8.0;
  }
  
  return hours * workType.multiplier;
}


