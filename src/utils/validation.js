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

/**
 * 任務配置表單驗證規則
 */
export function createTaskConfigRules(allTasks = [], currentIndex = -1) {
  return {
    name: [
      { required: true, message: '請選擇任務名稱', trigger: 'change' }
    ],
    stage_order: [
      { required: true, message: '請輸入階段編號', trigger: 'blur' },
      { type: 'number', min: 1, message: '階段編號必須大於等於 1', trigger: 'blur' },
      {
        validator: (rule, value, callback) => {
          if (!value || value < 1) {
            callback()
            return
          }
          
          // 檢查階段編號唯一性（同一服務下不能有重複的階段編號）
          const duplicateIndex = allTasks.findIndex((task, index) => 
            index !== currentIndex && 
            task.stage_order === value
          )
          
          if (duplicateIndex !== -1) {
            callback(new Error(`階段編號 ${value} 已被任務 #${duplicateIndex + 1} 使用`))
          } else {
            callback()
          }
        },
        trigger: 'blur'
      }
    ],
    estimated_hours: [
      {
        validator: (rule, value, callback) => {
          if (value === null || value === undefined || value === '') {
            callback()
            return
          }
          
          const hours = Number(value)
          if (isNaN(hours) || hours <= 0) {
            callback(new Error('預估工時必須大於 0'))
          } else {
            callback()
          }
        },
        trigger: 'blur'
      }
    ],
    advance_days: [
      {
        validator: (rule, value, callback) => {
          if (value === null || value === undefined || value === '') {
            callback()
            return
          }
          
          const days = Number(value)
          if (isNaN(days) || days < 0) {
            callback(new Error('提前生成天數必須大於等於 0'))
          } else {
            callback()
          }
        },
        trigger: 'blur'
      }
    ],
    days_due: [
      {
        validator: (rule, value, callback) => {
          if (value === null || value === undefined || value === '') {
            callback()
            return
          }
          
          const days = Number(value)
          if (isNaN(days) || days < 0) {
            callback(new Error('到期天數必須大於等於 0'))
          } else {
            callback()
          }
        },
        trigger: 'blur'
      }
    ],
    execution_frequency: [
      { required: true, message: '請選擇執行頻率', trigger: 'change' }
    ],
    execution_months: [
      {
        validator: (rule, value, callback, formData) => {
          // 如果執行頻率是自訂，則必須至少選擇一個月份
          if (formData?.execution_frequency === 'custom') {
            if (!value || !Array.isArray(value) || value.length === 0) {
              callback(new Error('自訂執行頻率必須至少選擇一個月份'))
            } else {
              callback()
            }
          } else {
            callback()
          }
        },
        trigger: 'change'
      }
    ]
  }
}

/**
 * 任務生成時間規則參數驗證規則
 */
export function createGenerationTimeRuleRules() {
  return {
    rule: [
      { required: true, message: '請選擇生成時間規則', trigger: 'change' }
    ],
    paramValue: [
      {
        validator: (rule, value, callback, formData) => {
          // 如果規則需要參數，則參數必填
          const needsParams = formData?.needsParams || false
          if (needsParams) {
            if (value === null || value === undefined || value === '') {
              callback(new Error('請輸入參數值'))
              return
            }
            
            const numValue = Number(value)
            if (isNaN(numValue)) {
              callback(new Error('參數值必須為數字'))
              return
            }
            
            // 根據參數類型驗證範圍
            const paramType = formData?.paramType
            if (paramType === 'days' || paramType === 'day') {
              if (numValue < 1 || numValue > 31) {
                callback(new Error('參數值必須在 1-31 之間'))
                return
              }
            }
          }
          
          callback()
        },
        trigger: 'blur'
      }
    ]
  }
}

/**
 * 任務到期日規則參數驗證規則
 */
export function createDueDateRuleRules() {
  return {
    daysDue: [
      {
        validator: (rule, value, callback) => {
          // days_due 是可選的，但如果填寫了，必須是有效的數字
          if (value !== null && value !== undefined && value !== '') {
            const numValue = Number(value)
            if (isNaN(numValue) || numValue < 0) {
              callback(new Error('到期天數必須大於等於 0'))
              return
            }
          }
          callback()
        },
        trigger: 'blur'
      }
    ],
    rule: [
      {
        validator: (rule, value, callback, formData) => {
          // 如果 days_due 未填寫，則必須選擇規則
          const daysDue = formData?.daysDue
          if ((daysDue === null || daysDue === undefined || daysDue === '') && !value) {
            callback(new Error('請選擇到期日規則或填寫到期天數'))
            return
          }
          callback()
        },
        trigger: 'change'
      }
    ],
    paramValue: [
      {
        validator: (rule, value, callback, formData) => {
          // 如果使用新規則（days_due），不需要驗證舊規則參數
          const daysDue = formData?.daysDue
          if (daysDue !== null && daysDue !== undefined && daysDue !== '') {
            callback()
            return
          }
          
          // 如果規則需要參數，則參數必填
          const needsParams = formData?.needsParams || false
          const selectedRule = formData?.rule
          
          // fixed_deadline 規則需要特殊處理（使用日期選擇器）
          if (selectedRule === 'fixed_deadline') {
            // fixed_deadline 的驗證在 fixedDeadlineDate 中處理
            callback()
            return
          }
          
          if (needsParams) {
            if (value === null || value === undefined || value === '') {
              callback(new Error('請輸入參數值'))
              return
            }
            
            const numValue = Number(value)
            if (isNaN(numValue)) {
              callback(new Error('參數值必須為數字'))
              return
            }
            
            // 根據參數類型驗證範圍
            const paramType = formData?.paramType
            if (paramType === 'days') {
              if (numValue < 0) {
                callback(new Error('天數必須大於等於 0'))
                return
              }
            } else if (paramType === 'day') {
              if (numValue < 1 || numValue > 31) {
                callback(new Error('日期必須在 1-31 之間'))
                return
              }
            } else if (paramType === 'months') {
              if (numValue < 1) {
                callback(new Error('月數必須大於等於 1'))
                return
              }
            }
          }
          
          callback()
        },
        trigger: 'blur'
      }
    ],
    fixedDeadlineDate: [
      {
        validator: (rule, value, callback, formData) => {
          // 如果使用新規則（days_due），不需要驗證
          const daysDue = formData?.daysDue
          if (daysDue !== null && daysDue !== undefined && daysDue !== '') {
            callback()
            return
          }
          
          // 如果選擇了 fixed_deadline 規則，則必須選擇日期
          const selectedRule = formData?.rule
          if (selectedRule === 'fixed_deadline') {
            if (!value) {
              callback(new Error('請選擇固定期限日期'))
              return
            }
          }
          
          callback()
        },
        trigger: 'change'
      }
    ]
  }
}

