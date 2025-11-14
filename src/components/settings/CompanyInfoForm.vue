<template>
  <a-form
    ref="formRef"
    :model="localFormData"
    :rules="formRules"
    :label-col="{ span: 6 }"
    :wrapper-col="{ span: 18 }"
  >
    <a-form-item label="公司中文名稱" name="name">
      <a-input
        v-model:value="localFormData.name"
        placeholder="請輸入公司中文名稱"
        :maxlength="100"
        show-count
      />
    </a-form-item>

    <a-form-item label="公司英文名稱" name="name_en">
      <a-input
        v-model:value="localFormData.name_en"
        placeholder="請輸入公司英文名稱（可選）"
        :maxlength="100"
        show-count
      />
    </a-form-item>

    <a-form-item label="統一編號" name="tax_id">
      <a-input
        v-model:value="localFormData.tax_id"
        placeholder="請輸入統一編號"
        :maxlength="20"
      />
    </a-form-item>

    <a-form-item label="公司地址（第一行）" name="address">
      <a-input
        v-model:value="localFormData.address"
        placeholder="請輸入公司地址"
        :maxlength="200"
        show-count
      />
    </a-form-item>

    <a-form-item label="公司地址（第二行）" name="address_line2">
      <a-input
        v-model:value="localFormData.address_line2"
        placeholder="請輸入公司地址第二行（可選）"
        :maxlength="200"
        show-count
      />
    </a-form-item>

    <a-form-item label="聯絡電話" name="phone">
      <a-input
        v-model:value="localFormData.phone"
        placeholder="請輸入聯絡電話"
        :maxlength="50"
      />
    </a-form-item>

    <a-form-item label="銀行名稱" name="bank">
      <a-input
        v-model:value="localFormData.bank"
        placeholder="請輸入銀行名稱"
        :maxlength="100"
        show-count
      />
    </a-form-item>

    <a-form-item label="銀行代號" name="bank_code">
      <a-input
        v-model:value="localFormData.bank_code"
        placeholder="請輸入銀行代號"
        :maxlength="20"
      />
    </a-form-item>

    <a-form-item label="銀行帳號" name="account_number">
      <a-input
        v-model:value="localFormData.account_number"
        placeholder="請輸入銀行帳號"
        :maxlength="50"
      />
    </a-form-item>
  </a-form>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'

const props = defineProps({
  formData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:formData'])

const formRef = ref(null)

// 表單驗證規則
const formRules = {
  name: [
    { required: true, message: '請輸入公司中文名稱', trigger: 'blur' },
    { max: 100, message: '公司中文名稱不能超過 100 個字符', trigger: 'blur' }
  ],
  name_en: [
    { max: 100, message: '公司英文名稱不能超過 100 個字符', trigger: 'blur' }
  ],
  tax_id: [
    { required: true, message: '請輸入統一編號', trigger: 'blur' },
    { max: 20, message: '統一編號不能超過 20 個字符', trigger: 'blur' }
  ],
  address: [
    { required: true, message: '請輸入公司地址', trigger: 'blur' },
    { max: 200, message: '公司地址不能超過 200 個字符', trigger: 'blur' }
  ],
  address_line2: [
    { max: 200, message: '公司地址第二行不能超過 200 個字符', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '請輸入聯絡電話', trigger: 'blur' },
    { max: 50, message: '聯絡電話不能超過 50 個字符', trigger: 'blur' }
  ],
  bank: [
    { required: true, message: '請輸入銀行名稱', trigger: 'blur' },
    { max: 100, message: '銀行名稱不能超過 100 個字符', trigger: 'blur' }
  ],
  bank_code: [
    { required: true, message: '請輸入銀行代號', trigger: 'blur' },
    { max: 20, message: '銀行代號不能超過 20 個字符', trigger: 'blur' }
  ],
  account_number: [
    { required: true, message: '請輸入銀行帳號', trigger: 'blur' },
    { max: 50, message: '銀行帳號不能超過 50 個字符', trigger: 'blur' }
  ]
}

// 內部表單數據
const localFormData = reactive({
  name: props.formData?.name || '',
  name_en: props.formData?.name_en || '',
  tax_id: props.formData?.tax_id || '',
  address: props.formData?.address || '',
  address_line2: props.formData?.address_line2 || '',
  phone: props.formData?.phone || '',
  bank: props.formData?.bank || '',
  bank_code: props.formData?.bank_code || '',
  account_number: props.formData?.account_number || ''
})

// 監聽 props.formData 變化，同步到內部狀態
watch(
  () => props.formData,
  (newData) => {
    if (newData) {
      Object.keys(localFormData).forEach(key => {
        if (newData.hasOwnProperty(key)) {
          localFormData[key] = newData[key] || ''
        }
      })
    }
  },
  { deep: true, immediate: true }
)

// 監聽內部狀態變化，通知父組件
watch(
  () => localFormData,
  (newData) => {
    emit('update:formData', { ...newData })
  },
  { deep: true }
)

// 驗證表單
const validate = async () => {
  try {
    await formRef.value.validate()
    return true
  } catch (error) {
    return false
  }
}

// 重置表單
const resetFields = () => {
  formRef.value?.resetFields()
}

// 暴露方法供父組件調用
defineExpose({
  validate,
  resetFields
})
</script>

<style scoped>
/* 表單樣式已由 Ant Design Vue 提供 */
</style>

