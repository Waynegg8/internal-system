/**
 * 表單驗證工具
 */

// 統一編號驗證（支持企業8碼和個人10碼）
export function validateTaxId(taxId) {
  if (!taxId || taxId.trim() === '') return false // 必填
  
  const trimmed = taxId.trim()
  
  // 企業客戶：8碼數字
  if (/^\d{8}$/.test(trimmed)) {
    return true
  }
  
  // 個人客戶：10碼（字母+數字組合，第一碼是字母）
  if (/^[A-Z][A-Z0-9]{9}$/.test(trimmed)) {
    return true
  }
  
  return false
}

// 客戶編號驗證（已廢棄，統一編號就是客戶編號）
export function validateClientId(clientId) {
  return validateTaxId(clientId)
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
  tax_id: [
    { required: true, message: '請輸入統一編號', trigger: 'blur' },
    { 
      validator: (rule, value, callback) => {
        // 統一編號為必填，需要驗證格式
        if (!value || value.trim() === '') {
          callback(new Error('請輸入統一編號'))
          return
        }
        
        const trimmed = value.trim()
        
        // 企業客戶：8碼數字
        if (/^\d{8}$/.test(trimmed)) {
          callback()
          return
        }
        
        // 個人客戶：10碼（字母+數字組合，第一碼是字母）
        if (/^[A-Z][A-Z0-9]{9}$/.test(trimmed)) {
          callback()
          return
        }
        
        callback(new Error('統一編號格式不正確：企業客戶需8碼數字，個人客戶需10碼身分證'))
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

