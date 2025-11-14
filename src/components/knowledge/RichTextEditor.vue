<template>
  <div class="rich-text-editor">
    <a-modal
      v-model:open="tableSizeModalVisible"
      title="選擇表格大小"
      :width="400"
      @ok="handleInsertTable"
      @cancel="tableSizeModalVisible = false"
    >
      <a-form :model="tableSize" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="行數">
              <a-input-number
                v-model:value="tableSize.rows"
                :min="1"
                :max="20"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="列數">
              <a-input-number
                v-model:value="tableSize.cols"
                :min="1"
                :max="10"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="快速選擇">
          <a-space>
            <a-button size="small" @click="tableSize = { rows: 2, cols: 2 }">2x2</a-button>
            <a-button size="small" @click="tableSize = { rows: 3, cols: 3 }">3x3</a-button>
            <a-button size="small" @click="tableSize = { rows: 4, cols: 4 }">4x4</a-button>
            <a-button size="small" @click="tableSize = { rows: 5, cols: 5 }">5x5</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-modal>
    <div ref="editorContainer" class="quill-editor-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

// Props
const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '請輸入內容...'
  }
})

// Emits
const emit = defineEmits(['update:modelValue'])

// Editor instance
const editorContainer = ref(null)
let quillInstance = null
let Quill = null

// 表格大小選擇
const tableSizeModalVisible = ref(false)
const tableSize = ref({ rows: 3, cols: 3 })

// 插入表格
const insertTable = (rows = 3, cols = 3) => {
  if (!quillInstance) return
  // 直接使用 HTML 表格插入
  insertTableHTML(rows, cols)
}

// HTML 表格插入
const insertTableHTML = (rows = 3, cols = 3) => {
  if (!quillInstance) return
  
  // 獲取當前游標位置
  const range = quillInstance.getSelection(true)
  if (!range) {
    // 如果沒有選中位置，將游標移動到文檔末尾
    const length = quillInstance.getLength()
    quillInstance.setSelection(length - 1, 'user')
    return insertTableHTML(rows, cols)
  }
  
  // 在當前游標位置插入換行符（如果需要）
  const currentContent = quillInstance.getContents(range.index, range.length)
  const isEmpty = currentContent.ops.every(op => !op.insert || (typeof op.insert === 'string' && op.insert.trim() === ''))
  
  // 如果當前位置不在行首，先插入換行
  let insertIndex = range.index
  if (!isEmpty && range.index > 0) {
    const beforeContent = quillInstance.getContents(range.index - 1, 1)
    const isNewline = beforeContent.ops[0] && beforeContent.ops[0].insert === '\n'
    if (!isNewline) {
      quillInstance.insertText(insertIndex, '\n', 'user')
      insertIndex += 1
    }
  }
  
  // 先插入一個換行符，然後插入表格
  quillInstance.insertText(insertIndex, '\n', 'user')
  insertIndex += 1
  
  // 創建表格元素 - 使用 DOM API 確保結構正確
  const table = document.createElement('table')
  table.style.borderCollapse = 'collapse'
  table.style.width = '100%'
  table.style.margin = '10px 0'
  table.style.border = '1px solid #d9d9d9'
  table.style.tableLayout = 'fixed'
  
  const tbody = document.createElement('tbody')
  
  for (let i = 0; i < rows; i++) {
    const tr = document.createElement('tr')
    for (let j = 0; j < cols; j++) {
      let cell
      if (i === 0) {
        // 第一行作為表頭
        cell = document.createElement('th')
        cell.style.backgroundColor = '#fafafa'
        cell.style.fontWeight = '600'
      } else {
        cell = document.createElement('td')
      }
      
      // 設置單元格樣式
      cell.style.border = '1px solid #d9d9d9'
      cell.style.padding = '8px 12px'
      cell.style.minWidth = '80px'
      cell.style.verticalAlign = 'top'
      cell.style.display = 'table-cell'
      cell.setAttribute('contenteditable', 'true')
      
      // 添加一個空文本節點，確保單元格可編輯
      const br = document.createElement('br')
      cell.appendChild(br)
      
      tr.appendChild(cell)
    }
    tbody.appendChild(tr)
  }
  
  table.appendChild(tbody)
  
  // 將表格 HTML 轉換為 Delta
  const tableHTML = table.outerHTML
  const delta = quillInstance.clipboard.convert({ html: tableHTML })
  
  // 在指定位置插入表格
  const Delta = Quill.import('delta')
  const insertDelta = new Delta().retain(insertIndex).concat(delta)
  quillInstance.updateContents(insertDelta, 'user')
  
  // 移動游標到表格的第一個單元格
  setTimeout(() => {
    const tableElement = quillInstance.root.querySelector('table')
    if (tableElement) {
      const firstRow = tableElement.querySelector('tr')
      if (firstRow) {
        const cells = firstRow.querySelectorAll('th, td')
        if (cells.length > 0) {
          const firstCell = cells[0]
          // 確保單元格是可編輯的
          firstCell.setAttribute('contenteditable', 'true')
          // 將焦點設置到第一個單元格
          firstCell.focus()
          // 創建一個範圍並設置到第一個單元格內
          const selection = window.getSelection()
          const range = document.createRange()
          // 移動到 br 標籤之前
          const br = firstCell.querySelector('br')
          if (br) {
            range.setStartBefore(br)
            range.setEndBefore(br)
          } else {
            range.selectNodeContents(firstCell)
            range.collapse(true)
          }
          selection.removeAllRanges()
          selection.addRange(range)
        }
      }
    }
  }, 150)
}

// 處理插入表格
const handleInsertTable = () => {
  insertTable(tableSize.value.rows, tableSize.value.cols)
  tableSizeModalVisible.value = false
}

// 初始化編輯器
const initEditor = async () => {
  if (!editorContainer.value) return

  try {
    // 動態加載 Quill 和相關 CSS
    if (!Quill) {
      // 加載 Quill CSS
      if (!document.querySelector('link[href*="quill.snow.css"]')) {
        const quillCSS = document.createElement('link')
        quillCSS.rel = 'stylesheet'
        quillCSS.href = 'https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.snow.css'
        document.head.appendChild(quillCSS)
      }

      // 加載 Quill JS
      if (!window.Quill) {
        const quillJS = document.createElement('script')
        quillJS.src = 'https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.js'
        quillJS.type = 'text/javascript'
        
        await new Promise((resolve, reject) => {
          quillJS.onload = () => {
            Quill = window.Quill
            resolve()
          }
          quillJS.onerror = reject
          document.head.appendChild(quillJS)
        })
      } else {
        Quill = window.Quill
      }
    }

    // 動態加載 quill-better-table（如果需要的話）
    // 目前使用 HTML 表格插入，不需要 quill-better-table

    // 等待 DOM 準備好
    await nextTick()

    // 創建 Quill 實例
    quillInstance = new Quill(editorContainer.value, {
      theme: 'snow',
      placeholder: props.placeholder,
      modules: {
        toolbar: {
          container: [
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'align': [] }],
            ['link', 'image'],
            ['clean']
          ],
          handlers: {
            // 自定義表格處理器
            'table': () => {
              tableSize.value = { rows: 3, cols: 3 }
              tableSizeModalVisible.value = true
            }
          }
        }
      }
    })

    // 添加表格按鈕到工具欄
    await nextTick()
    const toolbarContainer = editorContainer.value.previousElementSibling
    if (toolbarContainer && toolbarContainer.classList.contains('ql-toolbar')) {
      // 創建表格按鈕容器
      const tableButtonContainer = document.createElement('span')
      tableButtonContainer.className = 'ql-formats'
      
      // 創建表格按鈕
      const tableButton = document.createElement('button')
      tableButton.type = 'button'
      tableButton.className = 'ql-table'
      tableButton.innerHTML = '<svg viewBox="0 0 18 18"><rect class="ql-stroke" height="12" width="12" x="3" y="3"></rect><line class="ql-stroke" x1="9" x2="9" y1="3" y2="15"></line><line class="ql-stroke" x1="3" x2="15" y1="9" y2="9"></line></svg>'
      tableButton.title = '插入表格'
      tableButton.onclick = (e) => {
        e.preventDefault()
        tableSize.value = { rows: 3, cols: 3 }
        tableSizeModalVisible.value = true
      }
      
      tableButtonContainer.appendChild(tableButton)
      
      // 插入到 clean 按鈕之前
      const cleanButton = toolbarContainer.querySelector('.ql-clean')
      if (cleanButton && cleanButton.parentNode) {
        cleanButton.parentNode.insertBefore(tableButtonContainer, cleanButton.parentNode.lastElementChild)
      } else {
        toolbarContainer.appendChild(tableButtonContainer)
      }
    }

    // 設置初始內容
    if (props.modelValue) {
      quillInstance.root.innerHTML = props.modelValue
    }

    // 監聽內容變化
    quillInstance.on('text-change', () => {
      const content = quillInstance.root.innerHTML
      emit('update:modelValue', content)
    })
  } catch (error) {
    console.error('初始化富文本編輯器失敗:', error)
  }
}

// 監聽 modelValue 變化（外部更新）
watch(
  () => props.modelValue,
  (newValue) => {
    if (quillInstance && quillInstance.root.innerHTML !== newValue) {
      quillInstance.root.innerHTML = newValue || ''
    }
  }
)

// 組件掛載時初始化
onMounted(() => {
  initEditor()
})

// 組件卸載時清理
onUnmounted(() => {
  if (quillInstance) {
    quillInstance = null
  }
})
</script>

<style scoped>
.rich-text-editor {
  width: 100%;
}

.quill-editor-container {
  min-height: 300px;
}

/* Quill 編輯器樣式 */
:deep(.ql-container) {
  font-size: 14px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

:deep(.ql-editor) {
  min-height: 300px;
}

:deep(.ql-editor.ql-blank::before) {
  font-style: normal;
  color: #bfbfbf;
}

/* 表格樣式優化 */
:deep(.ql-editor table) {
  border-collapse: collapse;
  margin: 16px 0;
  width: 100%;
  table-layout: fixed;
  border: 1px solid #d9d9d9;
}

:deep(.ql-editor table td),
:deep(.ql-editor table th) {
  border: 1px solid #d9d9d9 !important;
  padding: 8px 12px !important;
  min-width: 80px;
  width: auto;
  min-height: 32px;
  position: relative;
  vertical-align: top;
  display: table-cell !important;
  contenteditable: true;
}

:deep(.ql-editor table th) {
  background-color: #fafafa;
  font-weight: 600;
  text-align: left;
}

:deep(.ql-editor table td:focus),
:deep(.ql-editor table th:focus) {
  outline: 2px solid #1890ff;
  outline-offset: -2px;
  background-color: #f0f7ff;
}

/* 確保表格行和單元格結構正確 */
:deep(.ql-editor table tr) {
  display: table-row !important;
}

:deep(.ql-editor table tbody) {
  display: table-row-group !important;
}

/* Better Table 操作菜單樣式 */
:deep(.bt-operation-menu) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  background: #fff;
  border: 1px solid #d9d9d9;
}

:deep(.bt-operation-menu-item) {
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

:deep(.bt-operation-menu-item:hover) {
  background-color: #f5f5f5;
}

/* 工具欄按鈕樣式 */
:deep(.ql-toolbar .ql-table) {
  position: relative;
}

:deep(.ql-toolbar .ql-table button) {
  width: 24px;
  height: 24px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* 響應式表格 */
@media (max-width: 768px) {
  :deep(.ql-editor table) {
    font-size: 12px;
  }
  
  :deep(.ql-editor table td),
  :deep(.ql-editor table th) {
    padding: 6px 8px;
    min-width: 60px;
  }
}
</style>
