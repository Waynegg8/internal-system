/**
 * 表單驗證工具
 */

// 客戶編號驗證（8位數字）
export function validateClientId(clientId) {
  return /^\d{8}$/.test(clientId)
}

// 統一編號驗證（台灣統編）
export function validateTaxId(taxId) {
  // 台灣統一編號驗證邏輯
  if (!taxId || taxId.length !== 8) return false
  
  const weights = [1, 2, 1, 2, 1, 2, 4, 1]
  let sum = 0
  
  for (let i = 0; i < 8; i++) {
    const digit = parseInt(taxId[i])
    const product = digit * weights[i]
    sum += Math.floor(product / 10) + (product % 10)
  }
  
  return sum % 10 === 0
}

// 郵箱驗證
export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// 帳號格式驗證（英文字母、數字和底線）
export function validateUsername(username) {
  return /^[a-zA-Z0-9_]+$/.test(username)
}

// 密碼強度驗證
export function validatePassword(password) {
  return password.length >= 6
}

// 表單驗證規則生成器
export function createRules(rules) {
  return rules
}

// Ant Design Vue 表單驗證規則
export const clientFormRules = {
  company_name: [
    { required: true, message: '請輸入公司名稱', trigger: 'blur' }
  ],
  client_id: [
    { required: true, message: '請輸入客戶編號', trigger: 'blur' },
    { 
      validator: (rule, value, callback) => {
        if (!value || value.trim() === '') {
          callback(new Error('請輸入客戶編號'))
        } else if (!validateClientId(value)) {
          callback(new Error('客戶編號必須為8位數字'))
        } else {
          callback()
        }
      }, 
      trigger: 'blur' 
    }
  ],
  tax_id: [
    { 
      validator: (rule, value, callback) => {
        // 統一編號為選填，但如果填寫了則需要驗證格式
        if (value && value.trim() !== '') {
          if (!validateTaxId(value)) {
            callback(new Error('統一編號格式不正確'))
          } else {
            callback()
          }
        } else {
          callback()
        }
      }, 
      trigger: 'blur' 
    }
  ],
  email: [
    { type: 'email', message: '請輸入有效的郵箱地址', trigger: 'blur' }
  ]
}

export const passwordFormRules = {
  current_password: [
    { required: true, message: '請輸入目前密碼', trigger: 'blur' }
  ],
  new_password: [
    { required: true, message: '請輸入新密碼', trigger: 'blur' },
    { min: 6, message: '密碼長度至少 6 個字元', trigger: 'blur' }
  ],
  confirm_password: [
    { required: true, message: '請確認新密碼', trigger: 'blur' },
    {
      validator: (rule, value, callback, formData) => {
        // 驗證新密碼與確認密碼一致
        if (value !== formData?.new_password) {
          callback(new Error('兩次輸入的密碼不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

