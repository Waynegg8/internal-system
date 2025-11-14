import axios from 'axios'
// ❌ 移除這行：import { message } from 'ant-design-vue'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'
import { getApiBase } from '@/utils/api'

// 創建 axios 實例
const request = axios.create({
  baseURL: getApiBase(),
  timeout: 90000, // 增加到 90 秒，支援長時間運行的請求（報表、薪資計算等）
  withCredentials: true
})

// 為特殊請求（報表、薪資等）創建延長超時的實例
export const longRunningRequest = axios.create({
  baseURL: getApiBase(),
  timeout: 180000, // 3 分鐘，用於薪資計算、年度報表等耗時操作
  withCredentials: true
})

const applyInterceptors = (instance) => {
  // 請求攔截器
  instance.interceptors.request.use(
    (config) => {
      // 可以在這裡添加 token 等
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  // 響應攔截器
  instance.interceptors.response.use(
    (response) => {
      return response.data
    },
    (error) => {
      if (error.response?.status === 401) {
        const authStore = useAuthStore()
        authStore.logout()
        router.push('/login')
      } else if (error.response?.status === 403) {
        console.error('沒有權限')
      } else {
        console.error('請求失敗:', error.response?.data?.message || error.message)
      }
      return Promise.reject(error)
    }
  )
}

applyInterceptors(request)
applyInterceptors(longRunningRequest)

export default request

