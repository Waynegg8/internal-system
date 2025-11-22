/**
 * 文件驗證工具函數
 * 提供統一的文件大小和類型驗證邏輯
 * 與後端驗證保持一致（backend/src/handlers/attachments/index.js）
 */

// 最大文件大小：25MB
export const MAX_FILE_SIZE = 25 * 1024 * 1024

// 允許的文件擴展名
export const ALLOWED_FILE_EXTENSIONS = [
  'pdf',
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp',
  'xlsx', 'xls',
  'docx', 'doc',
  'ppt', 'pptx'
]

// 允許的 MIME 類型
export const ALLOWED_MIME_TYPES = [
  // PDF
  'application/pdf',
  // 圖片
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/bmp',
  'image/webp',
  // Excel
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  // Word
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  // PowerPoint
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint'
]

// 文件擴展名到 MIME 類型的映射
export const EXTENSION_TO_MIME_TYPE = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  bmp: 'image/bmp',
  webp: 'image/webp',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt: 'application/vnd.ms-powerpoint'
}

/**
 * 從文件名獲取文件擴展名
 * @param {string} filename - 文件名
 * @returns {string} 文件擴展名（小寫，不含點號）
 */
export function getFileExtension(filename) {
  if (!filename || typeof filename !== 'string') {
    return ''
  }
  const match = filename.toLowerCase().match(/\.([a-z0-9]{1,10})$/)
  return match ? match[1] : ''
}

/**
 * 根據文件名獲取 MIME 類型
 * @param {string} filename - 文件名
 * @returns {string} MIME 類型，如果無法確定則返回空字符串
 */
export function getFileMimeType(filename) {
  const ext = getFileExtension(filename)
  return EXTENSION_TO_MIME_TYPE[ext] || ''
}

/**
 * 檢查文件類型是否允許
 * @param {string} filename - 文件名
 * @returns {boolean} 是否允許
 */
export function isAllowedFileType(filename) {
  if (!filename) {
    return false
  }
  const ext = getFileExtension(filename)
  return ALLOWED_FILE_EXTENSIONS.includes(ext)
}

/**
 * 驗證文件大小
 * @param {File} file - 文件對象
 * @param {number} maxSize - 最大文件大小（字節），默認為 MAX_FILE_SIZE
 * @returns {{ valid: boolean, error?: string }} 驗證結果
 */
export function validateFileSize(file, maxSize = MAX_FILE_SIZE) {
  if (!file) {
    return { valid: false, error: '文件對象不存在' }
  }

  if (!(file instanceof File)) {
    return { valid: false, error: '無效的文件對象' }
  }

  if (typeof file.size !== 'number' || file.size < 0) {
    return { valid: false, error: '無法獲取文件大小' }
  }

  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024))
    return { 
      valid: false, 
      error: `文件大小不能超過 ${maxSizeMB}MB` 
    }
  }

  return { valid: true }
}

/**
 * 驗證文件類型
 * @param {File|string} fileOrFilename - 文件對象或文件名
 * @param {string[]} allowedTypes - 允許的類型（可選，默認為 ALLOWED_FILE_EXTENSIONS）
 * @returns {{ valid: boolean, error?: string }} 驗證結果
 */
export function validateFileType(fileOrFilename, allowedTypes = ALLOWED_FILE_EXTENSIONS) {
  let filename = ''
  let mimeType = ''

  // 處理不同類型的輸入
  if (typeof fileOrFilename === 'string') {
    filename = fileOrFilename
  } else if (fileOrFilename instanceof File) {
    filename = fileOrFilename.name
    mimeType = fileOrFilename.type || ''
  } else if (fileOrFilename && typeof fileOrFilename === 'object') {
    // 處理 Ant Design Vue Upload 的文件對象
    filename = fileOrFilename.name || fileOrFilename.fileName || ''
    mimeType = fileOrFilename.type || fileOrFilename.contentType || ''
  }

  if (!filename) {
    return { valid: false, error: '無法獲取文件名' }
  }

  // 檢查文件擴展名
  const ext = getFileExtension(filename)
  if (!ext) {
    return { valid: false, error: '文件沒有擴展名' }
  }

  if (!allowedTypes.includes(ext)) {
    return { valid: false, error: '不支持的文件類型' }
  }

  // 如果提供了 MIME 類型，也進行驗證
  if (mimeType) {
    const expectedMimeType = EXTENSION_TO_MIME_TYPE[ext]
    // 允許 MIME 類型匹配或為空（某些瀏覽器可能不提供 MIME 類型）
    if (expectedMimeType && mimeType !== expectedMimeType) {
      // 對於圖片類型，允許 image/* 通配符
      if (ext.match(/^(jpg|jpeg|png|gif|bmp|webp)$/) && mimeType.startsWith('image/')) {
        // 允許
      } else if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        return { valid: false, error: '不支持的文件 MIME 類型' }
      }
    }
  }

  return { valid: true }
}

/**
 * 綜合驗證文件（大小和類型）
 * @param {File} file - 文件對象
 * @param {number} maxSize - 最大文件大小（字節），默認為 MAX_FILE_SIZE
 * @param {string[]} allowedTypes - 允許的類型，默認為 ALLOWED_FILE_EXTENSIONS
 * @returns {{ valid: boolean, error?: string }} 驗證結果
 */
export function validateFile(file, maxSize = MAX_FILE_SIZE, allowedTypes = ALLOWED_FILE_EXTENSIONS) {
  // 先驗證文件大小
  const sizeValidation = validateFileSize(file, maxSize)
  if (!sizeValidation.valid) {
    return sizeValidation
  }

  // 再驗證文件類型
  const typeValidation = validateFileType(file, allowedTypes)
  if (!typeValidation.valid) {
    return typeValidation
  }

  return { valid: true }
}

/**
 * 獲取接受的文件類型字符串（用於 HTML input accept 屬性）
 * @returns {string} 接受的文件類型字符串
 */
export function getAcceptFileTypes() {
  return [
    '.pdf',
    '.doc', '.docx',
    '.xls', '.xlsx',
    '.ppt', '.pptx',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'
  ].join(',')
}

/**
 * 獲取接受的文件 MIME 類型字符串（用於 HTML input accept 屬性）
 * @returns {string} 接受的文件 MIME 類型字符串
 */
export function getAcceptMimeTypes() {
  return ALLOWED_MIME_TYPES.join(',')
}


