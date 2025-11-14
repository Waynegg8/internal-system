<template>
  <a-modal
    :open="visible"
    :title="isEdit ? '編輯外出登記' : '新增外出登記'"
    :width="600"
    :confirm-loading="confirmLoading"
    @ok="handleSubmit"
    @cancel="handleCancel"
    @update:open="handleVisibleChange"
  >
    <a-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 18 }"
    >
      <!-- 外出日期 -->
      <a-form-item label="外出日期" name="trip_date">
        <a-date-picker
          v-model:value="formData.trip_date"
          format="YYYY-MM-DD"
          style="width: 100%"
          placeholder="請選擇外出日期"
        />
      </a-form-item>
      
      <!-- 目的地 -->
      <a-form-item label="目的地" name="destination">
        <a-input
          v-model:value="formData.destination"
          placeholder="請輸入目的地"
          :maxlength="200"
          show-count
        />
      </a-form-item>
      
      <!-- 距離（公里） -->
      <a-form-item label="距離（公里）" name="distance_km">
        <a-input-number
          v-model:value="formData.distance_km"
          :min="0.1"
          :step="0.1"
          :precision="1"
          style="width: 100%"
          placeholder="請輸入距離"
        />
        <div style="margin-top: 4px; font-size: 12px; color: #6b7280">
          補貼計算：0.1-5km=60元、5.1-10km=120元、依此類推
        </div>
      </a-form-item>
      
      <!-- 交通補貼預覽 -->
      <a-form-item v-if="subsidy > 0" label="交通補貼">
        <a-alert
          type="info"
          :message="`預估補貼：${formatCurrency(subsidy)}`"
          show-icon
        />
      </a-form-item>
      
      <!-- 客戶 -->
      <a-form-item label="客戶" name="client_id">
        <a-select
          v-model:value="formData.client_id"
          placeholder="請選擇客戶（可選）"
          allow-clear
          style="width: 100%"
          show-search
          :filter-option="filterClientOption"
        >
          <a-select-option
            v-for="client in clients"
            :key="getClientId(client)"
            :value="getClientId(client)"
          >
            {{ getClientName(client) }}
          </a-select-option>
        </a-select>
      </a-form-item>
      
      <!-- 外出目的 -->
      <a-form-item label="外出目的" name="purpose">
        <a-textarea
          v-model:value="formData.purpose"
          placeholder="請輸入外出目的（可選）"
          :rows="3"
        />
      </a-form-item>
      
      <!-- 備註 -->
      <a-form-item label="備註" name="notes">
        <a-textarea
          v-model:value="formData.notes"
          placeholder="請輸入備註（可選）"
          :rows="3"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import dayjs from 'dayjs'
import { formatCurrency } from '@/utils/formatters'
import { calculateSubsidy } from '@/utils/subsidyCalculator'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  editingTrip: {
    type: Object,
    default: null
  },
  clients: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['submit', 'cancel'])

// 表單引用
const formRef = ref(null)

// 確認按鈕加載狀態
const confirmLoading = ref(false)

// 是否為編輯模式
const isEdit = computed(() => !!props.editingTrip)

// 表單數據
const formData = ref({
  trip_date: null,
  destination: '',
  distance_km: null,
  client_id: null,
  purpose: '',
  notes: ''
})

// 表單驗證規則
const rules = {
  trip_date: [
    { required: true, message: '請選擇外出日期', trigger: 'change' }
  ],
  destination: [
    { required: true, message: '請輸入目的地', trigger: 'blur' },
    { max: 200, message: '目的地不能超過200個字符', trigger: 'blur' }
  ],
  distance_km: [
    { required: true, message: '請輸入距離', trigger: 'blur' },
    { type: 'number', min: 0.1, message: '距離必須大於0.1公里', trigger: 'blur' }
  ]
}

// 補貼計算
const subsidy = computed(() => {
  if (!formData.value.distance_km || formData.value.distance_km <= 0) {
    return 0
  }
  return calculateSubsidy(formData.value.distance_km)
})

// 監聽 visible 變化，初始化表單
watch(() => props.visible, (val) => {
  if (val) {
    if (props.editingTrip) {
      // 編輯模式：填充現有數據
      const tripDate = props.editingTrip.trip_date || props.editingTrip.tripDate
      formData.value = {
        trip_date: tripDate ? dayjs(tripDate) : null,
        destination: props.editingTrip.destination || '',
        distance_km: props.editingTrip.distance_km || props.editingTrip.distanceKm || null,
        client_id: props.editingTrip.client_id || props.editingTrip.clientId || null,
        purpose: props.editingTrip.purpose || '',
        notes: props.editingTrip.notes || ''
      }
    } else {
      // 新增模式：重置表單，默認日期為今天
      formData.value = {
        trip_date: dayjs(),
        destination: '',
        distance_km: null,
        client_id: null,
        purpose: '',
        notes: ''
      }
    }
    // 清除驗證狀態
    nextTick(() => {
      formRef.value?.clearValidate()
    })
  }
})

// 處理提交
const handleSubmit = async () => {
  try {
    // 驗證表單
    await formRef.value.validate()
    
    confirmLoading.value = true
    
    // 構建提交數據
    const submitData = {
      trip_date: formData.value.trip_date ? dayjs(formData.value.trip_date).format('YYYY-MM-DD') : null,
      destination: formData.value.destination,
      distance_km: formData.value.distance_km,
      client_id: formData.value.client_id || null,
      purpose: formData.value.purpose || null,
      notes: formData.value.notes || null
    }
    
    // 移除空值
    Object.keys(submitData).forEach(key => {
      if (submitData[key] === null || submitData[key] === '') {
        delete submitData[key]
      }
    })
    
    emit('submit', submitData, isEdit.value)
  } catch (error) {
    console.error('表單驗證失敗:', error)
  } finally {
    confirmLoading.value = false
  }
}

// 處理取消
const handleCancel = () => {
  formRef.value?.resetFields()
  emit('cancel')
}

// 處理 visible 變化
const handleVisibleChange = (open) => {
  if (!open) {
    handleCancel()
  }
}

// 客戶過濾函數
const filterClientOption = (input, option) => {
  const clientName = option.children?.[0]?.children || option.children || ''
  return clientName.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

// 獲取客戶ID（處理不同字段名）
const getClientId = (client) => {
  return client.clientId || client.client_id || client.id
}

// 獲取客戶名稱（處理不同字段名）
const getClientName = (client) => {
  return client.name || client.clientName || client.client_name || '未命名'
}
</script>

