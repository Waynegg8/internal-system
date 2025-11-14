<template>
  <a-modal
    v-model:open="modalVisible"
    title="新增客戶服務"
    @cancel="handleCancel"
    @ok="handleOk"
  >
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
    
    <a-form layout="vertical">
      <a-form-item label="選擇服務">
        <a-select
          v-model:value="selectedServiceId"
          placeholder="請選擇要添加的服務"
          :options="normalizedServices"
          :field-names="{ label: 'name', value: 'id' }"
          style="width: 100%"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePageAlert } from '@/composables/usePageAlert'
import { useClientAddStore } from '@/stores/clientAdd'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:visible', 'service-selected'])

// Store
const store = useClientAddStore()
const { errorMessage, warningMessage, showError, showWarning } = usePageAlert()

// Local state
const selectedServiceId = ref(null)

// Normalized services for select (handle both API format and normalized format)
const normalizedServices = computed(() => {
  return store.supportData.services.map(service => ({
    id: service.id || service.service_id,
    name: service.name || service.service_name,
    ...service // Keep all other properties
  }))
})

// Modal visibility (computed for v-model:open)
const modalVisible = computed({
  get: () => props.visible,
  set: (value) => {
    emit('update:visible', value)
  }
})

// Handle cancel
const handleCancel = () => {
  selectedServiceId.value = null
  emit('update:visible', false)
}

// Handle OK
const handleOk = () => {
  if (!selectedServiceId.value) {
    showWarning('請選擇一個服務')
    return
  }

  // Find the full master service object from normalized services
  const masterService = normalizedServices.value.find(s => s.id === selectedServiceId.value)

  if (!masterService) {
    showError('找不到選中的服務')
    return
  }

  // Create a new client service object based on the master service
  const newClientService = {
    id: `temp_${Date.now()}`, // Temporary ID
    service_id: masterService.id, // Use normalized id
    name: masterService.name, // Use normalized name
    status: 'pending',
    components: [] // Initialize empty array for component configuration
  }

  // Emit the new object
  emit('service-selected', newClientService)

  // Reset and close
  selectedServiceId.value = null
  emit('update:visible', false)
}
</script>

<style scoped>
</style>

