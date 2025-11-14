/**
 * 請假計算工具
 */

/**
 * 計算請假時數（扣除午休時間 12:30-13:30）
 * @param {string} startTime - 開始時間（格式：'HH:mm'）
 * @param {string} endTime - 結束時間（格式：'HH:mm'）
 * @returns {number} 小時數
 */
export function calculateHours(startTime, endTime) {
  if (!startTime || !endTime) return 0
  
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  
  const startMinutes = sh * 60 + sm
  const endMinutes = eh * 60 + em
  
  // 如果結束時間早於或等於開始時間，返回 0
  if (endMinutes <= startMinutes) return 0
  
  const lunchStart = 12 * 60 + 30 // 12:30
  const lunchEnd = 13 * 60 + 30   // 13:30
  
  let totalMinutes = endMinutes - startMinutes
  
  // 如果時間範圍跨越午休時間（12:30-13:30），扣除午休時間
  if (startMinutes < lunchEnd && endMinutes > lunchStart) {
    const lunchOverlap = Math.min(endMinutes, lunchEnd) - Math.max(startMinutes, lunchStart)
    if (lunchOverlap > 0) {
      totalMinutes -= lunchOverlap
    }
  }
  
  // 返回小時數（分鐘數 / 60）
  return totalMinutes / 60
}

