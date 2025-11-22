/**
 * 富文本渲染和 XSS 防護工具
 */

// 簡單的 XSS 防護函數（如果沒有 DOMPurify）
function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return ''

  // 移除危險的標籤和屬性
  const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'link', 'meta']
  const dangerousAttrs = ['onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout', 'onkeydown', 'onkeyup', 'onkeypress']

  let sanitized = html

  // 移除危險標籤
  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>|<${tag}[^>]*/>`, 'gi')
    sanitized = sanitized.replace(regex, '')
  })

  // 移除危險屬性
  dangerousAttrs.forEach(attr => {
    const regex = new RegExp(`${attr}\\s*=\\s*["'][^"']*["']`, 'gi')
    sanitized = sanitized.replace(regex, '')
  })

  return sanitized
}

/**
 * 渲染富文本內容，包含 XSS 防護
 * @param {string} html - HTML 內容
 * @returns {string} 安全的 HTML 內容
 */
export function renderRichText(html) {
  if (!html || typeof html !== 'string') return ''

  try {
    // 如果有 DOMPurify，使用它；否則使用簡單的防護
    if (typeof window !== 'undefined' && window.DOMPurify) {
      return window.DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'strike',
          'ul', 'ol', 'li',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'img', 'a', 'blockquote', 'pre', 'code',
          'span', 'div'
        ],
        ALLOWED_ATTR: [
          'src', 'alt', 'href', 'target', 'rel',
          'colspan', 'rowspan', 'style'
        ],
        ALLOW_DATA_ATTR: false
      })
    } else {
      // 簡單的防護（用於服務端渲染或沒有 DOMPurify 的環境）
      return sanitizeHtml(html)
    }
  } catch (error) {
    console.error('富文本渲染錯誤:', error)
    // 如果渲染失敗，返回純文本版本
    return html.replace(/<[^>]*>/g, '').substring(0, 200) + '...'
  }
}

/**
 * 檢查內容是否包含 HTML
 * @param {string} content - 內容
 * @returns {boolean} 是否包含 HTML
 */
export function isHtmlContent(content) {
  if (!content || typeof content !== 'string') return false
  return /<[^>]+>/.test(content)
}

/**
 * 將純文本轉換為簡單的 HTML（保留換行）
 * @param {string} text - 純文本
 * @returns {string} HTML 內容
 */
export function textToHtml(text) {
  if (!text || typeof text !== 'string') return ''
  return text
    .replace(/\n/g, '<br>')
    .replace(/\s/g, '&nbsp;')
}


