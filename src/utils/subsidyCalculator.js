/**
 * 交通補貼計算工具
 */

// 計算交通補貼（每 5 公里 60 元，向上取整）
export function calculateSubsidy(distanceKm) {
  if (!distanceKm || distanceKm <= 0) return 0
  const intervals = Math.ceil(distanceKm / 5)
  return intervals * 60
}

