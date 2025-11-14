<template>
  <div class="payroll-settings-content">
    <!-- 頁面提示 -->
    <PageAlerts
      v-model:success="successMessage"
      v-model:error="errorMessage"
    />
    
    <!-- 頁面標題區域 -->
    <div class="page-header">
      <div class="header-left">
        <a-typography-text type="secondary" style="font-size: 14px">
          調整薪資計算的核心參數
        </a-typography-text>
      </div>
      <div class="header-right">
        <a-button
          type="primary"
          :loading="saving"
          @click="handleSave"
        >
          <template #icon>
            <SaveOutlined />
          </template>
          儲存
        </a-button>
      </div>
    </div>

    <!-- 設定表單 -->
    <PayrollSettingsForm
      :settings="settingsList"
      @change="handleSettingChange"
    />

    <!-- 重要提示區域 -->
    <a-alert
      type="warning"
      message="重要提示"
      description="修改系統設定會影響未來所有的薪資計算，請謹慎操作。建議在修改前先備份當前設定。"
      show-icon
      style="margin-top: 24px"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePayrollStore } from '@/stores/payroll'
import { SaveOutlined } from '@ant-design/icons-vue'
import { usePageAlert } from '@/composables/usePageAlert'
import { getField } from '@/utils/fieldHelper'
import PageAlerts from '@/components/shared/PageAlerts.vue'
import PayrollSettingsForm from '@/components/payroll/PayrollSettingsForm.vue'

const payrollStore = usePayrollStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

// 保存狀態
const saving = ref(false)

// 本地設定數據（用於臨時存儲修改）
const localSettings = ref({})

// 從 store 獲取數據
const payrollSettings = computed(() => payrollStore.payrollSettings)
const loading = computed(() => payrollStore.loading)

// 設定列表
const settingsList = computed(() => {
  if (!payrollSettings.value) return []
  
  const settings = payrollSettings.value.settings || payrollSettings.value
  if (!Array.isArray(settings)) return []
  
  return settings.map(setting => {
    const key = getField(setting, 'settingKey', 'setting_key')
    const localValue = localSettings.value[key]
    const originalValue = getField(setting, 'settingValue', 'setting_value', '')
    const value = localValue !== undefined ? localValue : originalValue
    
    return {
      ...setting,
      settingKey: key,
      setting_key: key,
      settingValue: value,
      setting_value: value
    }
  })
})

// 處理設定變化（本地更新）
const handleSettingChange = (settingData) => {
  const key = getField(settingData, 'settingKey', 'setting_key')
  const value = getField(settingData, 'settingValue', 'setting_value', '')
  localSettings.value[key] = value
}

// 處理保存
const handleSave = async () => {
  saving.value = true
  
  try {
    // 構建要保存的設定列表
    const settingsToSave = settingsList.value.map(setting => {
      const key = getField(setting, 'settingKey', 'setting_key')
      const localValue = localSettings.value[key]
      const originalValue = getField(setting, 'settingValue', 'setting_value', '')
      const value = localValue !== undefined ? localValue : originalValue
      
      return {
        settingKey: key,
        setting_key: key,
        settingValue: value,
        setting_value: value
      }
    })
    
    // 提交設定
    await payrollStore.updatePayrollSettings(settingsToSave)
    
    // 清空本地修改
    localSettings.value = {}
    
    showSuccess('儲存成功')
  } catch (error) {
    showError(error.message || '儲存失敗')
  } finally {
    saving.value = false
  }
}

// 載入數據
onMounted(() => {
  payrollStore.loadPayrollSettings().catch(err => {
    showError(err.message || '載入系統設定失敗')
  })
})
</script>

<style scoped>
.payroll-settings-content {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-left {
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
}
</style>

