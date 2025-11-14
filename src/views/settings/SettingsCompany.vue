<template>
  <div class="settings-company">
    <p class="page-description">管理公司基本資料，包括公司名稱、地址、聯絡方式和銀行資訊</p>

    <!-- 成功提示 -->
    <a-alert
      v-if="successMessage"
      type="success"
      :message="successMessage"
      show-icon
      closable
      @close="successMessage = ''"
      style="margin-bottom: 8px"
    />
    
    <!-- 錯誤提示 -->
    <a-alert
      v-if="errorMessage || error"
      type="error"
      :message="errorMessage || error"
      show-icon
      closable
      @close="errorMessage = ''; handleCloseError()"
      style="margin-bottom: 8px"
    />
    
    <a-card>
      <!-- 子標籤切換 -->
      <div class="tab-switcher" style="margin-bottom: 12px">
        <a-radio-group v-model:value="currentSetNumber" @change="handleSetNumberChange">
          <a-radio-button :value="1">公司資料 1</a-radio-button>
          <a-radio-button :value="2">公司資料 2</a-radio-button>
        </a-radio-group>
      </div>

      <!-- 表單 -->
      <a-spin :spinning="loading">
        <CompanyInfoForm
          ref="companyFormRef"
          :form-data="formData"
          @update:form-data="handleFormDataChange"
        />

        <!-- 保存按鈕 -->
        <div class="form-actions" style="margin-top: 12px">
          <a-button type="primary" :loading="store.loading" @click="handleSave">
            儲存
          </a-button>
        </div>
      </a-spin>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { usePageAlert } from '@/composables/usePageAlert'
import { useSettingsStore } from '@/stores/settings'
import CompanyInfoForm from '@/components/settings/CompanyInfoForm.vue'

const store = useSettingsStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

// 從 store 獲取響應式狀態
const { error } = storeToRefs(store)

// 本地狀態
const currentSetNumber = ref(1)
const loading = ref(false)
const companyFormRef = ref(null)

// 表單數據
const formData = reactive({
  name: '',
  name_en: '',
  tax_id: '',
  address: '',
  address_line2: '',
  phone: '',
  bank: '',
  bank_code: '',
  account_number: ''
})

// 初始化表單數據
const initFormData = () => {
  Object.keys(formData).forEach(key => {
    formData[key] = ''
  })
}

// 載入公司設定
const loadCompanySettings = async (setNumber) => {
  loading.value = true
  try {
    const response = await store.getCompanySettings(setNumber)
    if (response.ok && response.formData) {
      // 更新表單數據
      Object.keys(formData).forEach(key => {
        formData[key] = response.formData[key] || ''
      })
    } else {
      // 如果沒有數據，初始化為空
      initFormData()
    }
  } catch (err) {
    console.error('載入公司設定失敗:', err)
    // 錯誤已由 store 處理
    initFormData()
  } finally {
    loading.value = false
  }
}

// 切換標籤變化
const handleSetNumberChange = (e) => {
  const setNumber = e.target.value
  loadCompanySettings(setNumber)
}

// 處理表單數據變化
const handleFormDataChange = (data) => {
  Object.keys(formData).forEach(key => {
    if (data.hasOwnProperty(key)) {
      formData[key] = data[key]
    }
  })
}

// 處理保存
const handleSave = async () => {
  // 驗證表單
  const isValid = await companyFormRef.value?.validate()
  if (!isValid) {
    showError('請檢查表單輸入')
    return
  }

  try {
    const response = await store.saveCompanySettings(currentSetNumber.value, formData)
    if (response.ok) {
      showSuccess('保存成功')
    } else {
      showError(response.message || '保存失敗')
    }
  } catch (err) {
    console.error('保存公司設定失敗:', err)
    showError(err.message || '保存失敗')
  }
}

// 清除錯誤
const handleCloseError = () => {
  store.clearError()
}

// 載入
onMounted(async () => {
  await loadCompanySettings(1)
})
</script>

<style scoped>
.settings-company {
  padding: 12px 0;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
}

.page-description {
  color: #666;
  font-size: 14px;
  margin-bottom: 12px;
}

.tab-switcher {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.form-actions {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}
</style>

