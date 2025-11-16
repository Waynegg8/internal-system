/**
 * 時間選項生成工具
 */

/**
 * 生成時間選項數組（用於下拉選單）
 * @returns {Array<{ value: string, label: string }>} 時間選項數組
 */
export function generateTimeOptions() {
  const options = []
  
  // 上午：08:30, 09:00, 09:30, 10:00, 10:30, 11:00, 11:30, 12:00, 12:30
  const morningTimes = [
    '08:30',
    '09:00', '09:30',
    '10:00', '10:30',
    '11:00', '11:30',
    '12:00', '12:30'
  ]
  
  // 下午：13:30, 14:00, 14:30, 15:00, 15:30, 16:00, 16:30, 17:00, 17:30
  const afternoonTimes = [
    '13:30',
    '14:00', '14:30',
    '15:00', '15:30',
    '16:00', '16:30',
    '17:00', '17:30'
  ]
  
  // 合併所有時間選項
  const allTimes = [...morningTimes, ...afternoonTimes]
  
  allTimes.forEach(time => {
    options.push({
      value: time,
      label: time
    })
  })
  
  return options
}






