/**
 * 外出登记工具函数
 */

/**
 * 计算交通补贴（分）
 * 规则：每5公里60元（向上取整）
 */
export function calculateTransportSubsidy(distanceKm) {
  if (!distanceKm || distanceKm <= 0) return 0;
  return Math.ceil(distanceKm / 5) * 60 * 100; // 向上取整，转换为分
}





