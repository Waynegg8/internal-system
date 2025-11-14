import { ref } from 'vue'

/**
 * 頁面內提示管理 Composable
 * 用於替代 message.* 和 Modal.confirm，使用頁面內 Alert 顯示提示
 */
export function usePageAlert() {
  const successMessage = ref('')
  const errorMessage = ref('')
  const warningMessage = ref('')
  const infoMessage = ref('')

  /**
   * 顯示成功提示
   * @param {string} message - 提示訊息
   * @param {number} duration - 自動消失時間（毫秒），0 表示不自動消失
   */
  const showSuccess = (message, duration = 3000) => {
    // 清除其他類型的提示
    errorMessage.value = ''
    warningMessage.value = ''
    infoMessage.value = ''
    
    successMessage.value = message
    if (duration > 0) {
      setTimeout(() => {
        successMessage.value = ''
      }, duration)
    }
  }

  /**
   * 顯示錯誤提示
   * @param {string} message - 提示訊息
   * @param {number} duration - 自動消失時間（毫秒），0 表示不自動消失
   */
  const showError = (message, duration = 5000) => {
    // 清除其他類型的提示
    successMessage.value = ''
    warningMessage.value = ''
    infoMessage.value = ''
    
    errorMessage.value = message
    if (duration > 0) {
      setTimeout(() => {
        errorMessage.value = ''
      }, duration)
    }
  }

  /**
   * 顯示警告提示
   * @param {string} message - 提示訊息
   * @param {number} duration - 自動消失時間（毫秒），0 表示不自動消失
   */
  const showWarning = (message, duration = 4000) => {
    // 清除其他類型的提示
    successMessage.value = ''
    errorMessage.value = ''
    infoMessage.value = ''
    
    warningMessage.value = message
    if (duration > 0) {
      setTimeout(() => {
        warningMessage.value = ''
      }, duration)
    }
  }

  /**
   * 顯示信息提示
   * @param {string} message - 提示訊息
   * @param {number} duration - 自動消失時間（毫秒），0 表示不自動消失
   */
  const showInfo = (message, duration = 3000) => {
    // 清除其他類型的提示
    successMessage.value = ''
    errorMessage.value = ''
    warningMessage.value = ''
    
    infoMessage.value = message
    if (duration > 0) {
      setTimeout(() => {
        infoMessage.value = ''
      }, duration)
    }
  }

  /**
   * 清除所有提示
   */
  const clearAll = () => {
    successMessage.value = ''
    errorMessage.value = ''
    warningMessage.value = ''
    infoMessage.value = ''
  }

  return {
    successMessage,
    errorMessage,
    warningMessage,
    infoMessage,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAll
  }
}





