<template>
  <div class="payroll-settings-form">
    <!-- 誤餐費設定卡片 -->
    <a-card
      class="setting-card"
      title="誤餐費設定"
    >
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="誤餐費單價（元/次）">
            <a-input-number
              :value="getSettingValue('meal_allowance_per_time')"
              :min="0"
              :step="1"
              style="width: 100%"
              @change="(value) => handleSettingChange('meal_allowance_per_time', value)"
            />
            <a-typography-text type="secondary" style="font-size: 12px; display: block; margin-top: 4px">
              平日加班滿條件時發放的誤餐費金額
            </a-typography-text>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="最低加班時數（小時）">
            <a-input-number
              :value="getSettingValue('meal_allowance_min_overtime_hours')"
              :min="0"
              :step="0.5"
              style="width: 100%"
              @change="(value) => handleSettingChange('meal_allowance_min_overtime_hours', value)"
            />
            <a-typography-text type="secondary" style="font-size: 12px; display: block; margin-top: 4px">
              達到此加班時數才發放誤餐費
            </a-typography-text>
          </a-form-item>
        </a-col>
      </a-row>
    </a-card>

    <!-- 交通補貼設定卡片 -->
    <a-card
      class="setting-card"
      title="交通補貼設定（區間制）"
    >
      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="每個區間公里數">
            <a-input-number
              :value="getSettingValue('transport_km_per_interval')"
              :min="1"
              :step="1"
              style="width: 100%"
              @change="(value) => handleSettingChange('transport_km_per_interval', value)"
            />
            <a-typography-text type="secondary" style="font-size: 12px; display: block; margin-top: 4px">
              例如：5 公里為 1 個區間
            </a-typography-text>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="每個區間金額（元）">
            <a-input-number
              :value="getSettingValue('transport_amount_per_interval')"
              :min="0"
              :step="1"
              style="width: 100%"
              @change="(value) => handleSettingChange('transport_amount_per_interval', value)"
            />
            <a-typography-text type="secondary" style="font-size: 12px; display: block; margin-top: 4px">
              例如：每區間 60 元
            </a-typography-text>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-typography-text type="secondary" style="font-size: 12px; display: block; margin-top: 32px">
            範例：6-10公里 = 2個區間 = 120元
          </a-typography-text>
        </a-col>
      </a-row>
    </a-card>

    <!-- 請假扣款設定卡片 -->
    <a-card
      class="setting-card"
      title="請假扣款設定"
    >
      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="病假扣款比例">
            <a-input-number
              :value="getSettingValue('sick_leave_deduction_rate')"
              :min="0"
              :max="1"
              :step="0.1"
              style="width: 100%"
              @change="(value) => handleSettingChange('sick_leave_deduction_rate', value)"
            />
            <a-typography-text type="secondary" style="font-size: 12px; display: block; margin-top: 4px">
              1.0 = 全額扣除，0.5 = 扣除50%
            </a-typography-text>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="事假扣款比例">
            <a-input-number
              :value="getSettingValue('personal_leave_deduction_rate')"
              :min="0"
              :max="1"
              :step="0.1"
              style="width: 100%"
              @change="(value) => handleSettingChange('personal_leave_deduction_rate', value)"
            />
            <a-typography-text type="secondary" style="font-size: 12px; display: block; margin-top: 4px">
              通常為 1.0（全額扣除）
            </a-typography-text>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="日薪計算除數">
            <a-input-number
              :value="getSettingValue('leave_daily_salary_divisor')"
              :min="1"
              :step="1"
              style="width: 100%"
              @change="(value) => handleSettingChange('leave_daily_salary_divisor', value)"
            />
            <a-typography-text type="secondary" style="font-size: 12px; display: block; margin-top: 4px">
              日薪 = 底薪 ÷ 此數字（通常為30）
            </a-typography-text>
          </a-form-item>
        </a-col>
      </a-row>
    </a-card>

    <!-- 時薪計算設定卡片 -->
    <a-card
      class="setting-card"
      title="時薪計算設定"
    >
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="時薪計算除數">
            <a-input-number
              :value="getSettingValue('hourly_rate_divisor')"
              :min="1"
              :step="1"
              style="width: 100%"
              @change="(value) => handleSettingChange('hourly_rate_divisor', value)"
            />
            <a-typography-text type="secondary" style="font-size: 12px; display: block; margin-top: 4px">
              依勞基法為 240 小時/月
            </a-typography-text>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-typography-text type="secondary" style="font-size: 12px; display: block; margin-top: 32px">
            時薪 = (底薪 + 經常性給與) ÷ 除數，用於計算加班費基準
          </a-typography-text>
        </a-col>
      </a-row>
    </a-card>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  settings: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['save'])

// 獲取設定值（根據 settingKey）
const getSettingValue = (settingKey) => {
  if (!props.settings || props.settings.length === 0) {
    return undefined
  }
  
  const setting = props.settings.find(s => {
    const key = s.settingKey || s.setting_key
    return key === settingKey
  })
  
  if (!setting) {
    return undefined
  }
  
  const value = setting.settingValue || setting.setting_value || ''
  if (value === '' || value === null || value === undefined) {
    return undefined
  }
  
  // 轉換為數字
  const numValue = Number(value)
  return isNaN(numValue) ? undefined : numValue
}

// 處理設定變化（本地更新，不立即保存）
const handleSettingChange = (settingKey, value) => {
  // 構建設定數據
  const settingData = {
    settingKey: settingKey,
    setting_key: settingKey,
    settingValue: value !== null && value !== undefined ? String(value) : '',
    setting_value: value !== null && value !== undefined ? String(value) : ''
  }
  
  // 觸發 change 事件，讓父組件處理
  emit('change', settingData)
}
</script>

<style scoped>
.payroll-settings-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-card {
  margin-bottom: 0;
}
</style>

