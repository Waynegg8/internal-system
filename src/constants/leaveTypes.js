/**
 * 請假相關常量定義
 */

// 假別翻譯映射
export const LEAVE_TYPES = {
  annual: '特休',
  sick: '病假',
  personal: '事假',
  comp: '補休',
  menstrual: '生理假',
  maternity: '產假',
  prenatal_checkup: '產檢假',
  paternity: '陪產檢及陪產假',
  marriage: '婚假',
  funeral: '喪假',
  public: '公假'
}

// 狀態翻譯映射
export const LEAVE_STATUS = {
  pending: '待審',
  approved: '已核准',
  rejected: '已駁回'
}

// 生活事件類型翻譯映射
export const LIFE_EVENT_TYPES = {
  marriage: '結婚',
  funeral_parent: '喪假（父母/養父母/繼父母/配偶）',
  funeral_grandparent: '喪假（祖父母/子女/配偶之父母）',
  funeral_sibling: '喪假（曾祖父母/兄弟姊妹/配偶之祖父母）',
  maternity: '分娩',
  miscarriage: '流產',
  pregnancy: '妊娠',
  paternity: '配偶分娩或懷孕'
}

/**
 * 獲取假別中文名稱
 * @param {string} type - 假別類型
 * @returns {string} 假別中文名稱
 */
export function getLeaveTypeText(type) {
  return LEAVE_TYPES[type] || type
}

/**
 * 獲取狀態中文名稱
 * @param {string} status - 狀態類型
 * @returns {string} 狀態中文名稱
 */
export function getLeaveStatusText(status) {
  return LEAVE_STATUS[status] || status
}

/**
 * 獲取生活事件類型中文名稱
 * @param {string} type - 生活事件類型
 * @returns {string} 生活事件類型中文名稱
 */
export function getLifeEventTypeText(type) {
  return LIFE_EVENT_TYPES[type] || type
}


