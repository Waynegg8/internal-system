import request from './request'

/**
 * 收據相關 API
 */
export function useReceiptApi() {
  // 收據列表
  const fetchAllReceipts = async (params = {}) => {
    const response = await request.get('/receipts', { params })
    return response
  }

  // 收據詳情
  const fetchReceiptDetail = async (receiptId) => {
    const response = await request.get(`/receipts/${receiptId}`)
    return response
  }

  // 創建收據
  const createReceipt = async (payload) => {
    const response = await request.post('/receipts', payload)
    return response
  }

  // 更新收據
  const updateReceipt = async (receiptId, payload) => {
    const response = await request.put(`/receipts/${receiptId}`, payload)
    return response
  }

  // 刪除/作廢收據
  const cancelReceipt = async (receiptId, payload = {}) => {
    const response = await request.post(`/receipts/${receiptId}/cancel`, payload)
    return response
  }

  // 收款記錄
  const createPayment = async (receiptId, payload) => {
    const response = await request.post(`/receipts/${receiptId}/payments`, payload)
    return response
  }

  // 收據提醒
  const fetchReceiptReminders = async () => {
    const response = await request.get('/receipts/reminders')
    return response
  }

  const postponeReminder = async (data) => {
    const response = await request.post('/receipts/reminders/postpone', data)
    return response
  }

  // 公司資料
  const loadCompanyInfo = async (setNumber) => {
    const response = await request.get(`/company/${setNumber}`)
    return response
  }

  return {
    fetchAllReceipts,
    fetchReceiptDetail,
    createReceipt,
    updateReceipt,
    cancelReceipt,
    createPayment,
    fetchReceiptReminders,
    postponeReminder,
    loadCompanyInfo
  }
}

