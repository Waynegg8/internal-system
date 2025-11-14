<template>
  <a-card title="批量上傳國定假日" class="batch-upload-card">
    <!-- 成功提示 -->
    <a-alert
      v-if="successMessage"
      type="success"
      :message="successMessage"
      show-icon
      closable
      @close="successMessage = ''"
      style="margin-bottom: 16px"
    />
    
    <!-- 警告提示 -->
    <a-alert
      v-if="warningMessage"
      type="warning"
      :message="warningMessage"
      show-icon
      closable
      @close="warningMessage = ''"
      style="margin-bottom: 16px"
    />
    
    <!-- 錯誤提示 -->
    <a-alert
      v-if="errorMessage"
      type="error"
      :message="errorMessage"
      show-icon
      closable
      @close="errorMessage = ''"
      style="margin-bottom: 16px"
    />
    
    <a-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 18 }"
    >
      <a-form-item label="上傳方式" name="uploadType">
        <a-radio-group v-model:value="formData.uploadType">
          <a-radio value="file">CSV 檔案</a-radio>
          <a-radio value="text">文字貼上</a-radio>
        </a-radio-group>
      </a-form-item>

      <!-- CSV 檔案上傳區域 -->
      <a-form-item
        v-if="formData.uploadType === 'file'"
        label="選擇檔案"
        name="file"
      >
        <a-upload
          v-model:file-list="fileList"
          :before-upload="handleBeforeUpload"
          accept=".csv"
          :max-count="1"
        >
          <a-button>
            <template #icon>
              <upload-outlined />
            </template>
            選擇 CSV 檔案
          </a-button>
        </a-upload>
        <template #extra>
          <span style="color: #666; font-size: 12px">
            支持拖拽上傳，檔案格式：CSV
          </span>
        </template>
      </a-form-item>

      <!-- 文字貼上區域 -->
      <a-form-item
        v-if="formData.uploadType === 'text'"
        label="貼上內容"
        name="text"
      >
        <a-textarea
          v-model:value="formData.text"
          :rows="10"
          placeholder="請貼上 CSV 格式的內容，每行格式：日期,名稱"
        />
        <template #extra>
          <div style="color: #666; font-size: 12px; margin-top: 8px">
            <div>格式說明：</div>
            <div>• 每行格式：日期,名稱</div>
            <div>• 日期格式：YYYY-MM-DD（例如：2024-01-01）</div>
            <div>• 第一行可以是標題行（會自動跳過）</div>
            <div>• 範例：</div>
            <div style="background: #f5f5f5; padding: 8px; margin-top: 4px; font-family: monospace">
              日期,名稱<br />
              2024-01-01,元旦<br />
              2024-02-10,春節
            </div>
          </div>
        </template>
      </a-form-item>

      <a-form-item :wrapper-col="{ offset: 6, span: 18 }">
        <a-space>
          <a-button type="primary" :loading="loading" @click="handleSubmit">
            上傳
          </a-button>
          <a-button @click="handleCancel">取消</a-button>
        </a-space>
      </a-form-item>
    </a-form>
  </a-card>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { usePageAlert } from '@/composables/usePageAlert'
import { UploadOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'

const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit', 'cancel'])

const { successMessage, errorMessage, warningMessage, showSuccess, showError, showWarning } = usePageAlert()

const formRef = ref(null)
const fileList = ref([])

// 表單數據
const formData = reactive({
  uploadType: 'file',
  file: null,
  text: ''
})

// 表單驗證規則
const formRules = {
  file: [
    {
      validator: (rule, value) => {
        if (formData.uploadType === 'file' && fileList.value.length === 0) {
          return Promise.reject(new Error('請選擇 CSV 檔案'))
        }
        return Promise.resolve()
      },
      trigger: 'change'
    }
  ],
  text: [
    {
      validator: (rule, value) => {
        if (formData.uploadType === 'text' && !value?.trim()) {
          return Promise.reject(new Error('請輸入 CSV 內容'))
        }
        return Promise.resolve()
      },
      trigger: 'blur'
    }
  ]
}

// 監聽上傳方式變化，重置驗證
watch(
  () => formData.uploadType,
  () => {
    fileList.value = []
    formData.text = ''
    formRef.value?.clearValidate()
  }
)

// 處理檔案上傳前
const handleBeforeUpload = (file) => {
  // 驗證檔案類型
  const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv')
  if (!isCSV) {
    showError('只能上傳 CSV 檔案！')
    return false
  }
  
  // 驗證檔案大小（限制 5MB）
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isLt5M) {
    showError('檔案大小不能超過 5MB！')
    return false
  }
  
  // 讀取檔案內容
  const reader = new FileReader()
  reader.onload = (e) => {
    formData.text = e.target.result
  }
  reader.readAsText(file, 'UTF-8')
  
  return false // 阻止自動上傳
}

// 解析 CSV 內容
const parseCSV = (text) => {
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  const holidays = []
  const errors = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // 跳過空行
    if (!line) continue
    
    // 跳過標題行（包含「日期」或「date」）
    if (i === 0 && (line.includes('日期') || line.toLowerCase().includes('date'))) {
      continue
    }
    
    // 解析 CSV 行（支持逗號分隔）
    const parts = line.split(',').map(part => part.trim())
    
    if (parts.length < 2) {
      errors.push(`第 ${i + 1} 行：格式不正確，應為「日期,名稱」`)
      continue
    }
    
    let date = parts[0].trim()
    const name = parts.slice(1).join(',').trim() // 支持名稱中包含逗號的情況
    
    // 嘗試解析並標準化日期格式（支持 YYYY-MM-DD 和 YYYY/M/D）
    let parsedDate = dayjs(date, 'YYYY-MM-DD', true)
    if (!parsedDate.isValid()) {
      // 嘗試 YYYY/M/D 格式
      parsedDate = dayjs(date, 'YYYY/M/D', true)
      if (!parsedDate.isValid()) {
        // 嘗試 YYYY-M-D 格式
        parsedDate = dayjs(date, 'YYYY-M-D', true)
      }
    }
    
    if (!parsedDate.isValid()) {
      errors.push(`第 ${i + 1} 行：日期格式不正確（${date}），應為 YYYY-MM-DD 或 YYYY/M/D`)
      continue
    }
    
    // 標準化為 YYYY-MM-DD 格式
    date = parsedDate.format('YYYY-MM-DD')
    
    // 驗證名稱
    if (!name) {
      errors.push(`第 ${i + 1} 行：假日名稱不能為空`)
      continue
    }
    
    holidays.push({
      holiday_date: date,
      name: name,
      is_national_holiday: true
    })
  }
  
  return { holidays, errors }
}

// 提交表單
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    
    let csvText = ''
    
    if (formData.uploadType === 'file') {
      if (fileList.value.length === 0) {
        showError('請選擇 CSV 檔案')
        return
      }
      csvText = formData.text
    } else {
      csvText = formData.text
    }
    
    if (!csvText.trim()) {
      showError('請提供 CSV 內容')
      return
    }
    
    // 解析 CSV
    const { holidays, errors } = parseCSV(csvText)
    
    if (errors.length > 0) {
      showWarning(`解析完成，但有 ${errors.length} 個錯誤：\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`)
    }
    
    if (holidays.length === 0) {
      showError('沒有有效的假日數據')
      return
    }
    
    emit('submit', holidays, errors)
  } catch (error) {
    console.error('表單驗證失敗:', error)
  }
}

// 取消操作
const handleCancel = () => {
  fileList.value = []
  formData.uploadType = 'file'
  formData.text = ''
  formRef.value?.resetFields()
  emit('cancel')
}

// 暴露下載範例方法
const downloadSample = () => {
  const sampleData = [
    ['日期', '名稱'],
    ['2024-01-01', '元旦'],
    ['2024-02-10', '春節'],
    ['2024-02-11', '春節'],
    ['2024-02-12', '春節'],
    ['2024-04-04', '清明節'],
    ['2024-05-01', '勞動節'],
    ['2024-06-10', '端午節'],
    ['2024-09-17', '中秋節'],
    ['2024-10-10', '國慶日']
  ]
  
  const csvContent = sampleData.map(row => row.join(',')).join('\n')
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', '國定假日範例.csv')
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // 釋放 Blob URL
  URL.revokeObjectURL(url)
}

// 暴露方法供父組件調用
defineExpose({
  downloadSample
})
</script>

<style scoped>
.batch-upload-card {
  margin-bottom: 24px;
}
</style>

