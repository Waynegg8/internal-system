/**
 * 常量定義
 */

// 假別翻譯
export const LEAVE_TYPES = {
  'annual': '特休',
  'sick': '病假',
  'personal': '事假',
  'compensatory': '補休',
  'marriage': '婚假',
  'maternity': '產假',
  'paternity': '陪產假',
  'funeral': '喪假'
}

// 狀態翻譯
export const LEAVE_STATUS = {
  'pending': '待審核',
  'approved': '已核准',
  'rejected': '已拒絕'
}

// 事件類型翻譯
export const EVENT_TYPES = {
  'birth': '生育',
  'marriage': '結婚',
  'death': '死亡'
}

// 任務狀態
export const TASK_STATUS = {
  'pending': '待處理',
  'in_progress': '進行中',
  'completed': '已完成',
  'cancelled': '已取消'
}

// 收據狀態
export const RECEIPT_STATUS = {
  'draft': '草稿',
  'issued': '已開立',
  'paid': '已收款',
  'overdue': '逾期',
  'cancelled': '已作廢'
}

// 收據類型
export const RECEIPT_TYPE = {
  'invoice': '請款單',
  'receipt': '收據'
}

// 收款方式
export const PAYMENT_METHOD = {
  'cash': '現金',
  'transfer': '轉帳',
  'check': '支票'
}

// 工時類型
export const WORK_TYPES = {
  'normal': '一般',
  'overtime_before_2h': '平日OT前2h',
  'overtime_after_2h': '平日OT後2h',
  'weekend_overtime_before_2h': '休息日前2h',
  'weekend_overtime_after_2h': '休息日後2h'
}

