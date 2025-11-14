import request from './request'

/**
 * 假日相關 API
 */
export function useHolidayApi() {
  // 假日列表
  const fetchHolidays = async (params = {}) => {
    const response = await request.get('/holidays', { params })
    return response
  }

  return {
    fetchHolidays
  }
}

