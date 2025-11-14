<template>
  <a-modal
    v-model:visible="visible"
    title="批量分配負責人"
    :confirm-loading="loading"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <div style="margin-bottom: 16px">
      <a-typography-text type="secondary">
        已選擇 {{ selectedCount }} 個任務
      </a-typography-text>
    </div>

    <a-form :model="form" layout="vertical">
      <a-form-item label="選擇負責人">
        <a-select
          v-model:value="form.assigneeId"
          placeholder="請選擇負責人（可選）"
          allow-clear
          show-search
          :filter-option="filterUserOption"
          style="width: 100%"
        >
          <a-select-option :value="null">未指派</a-select-option>
          <a-select-option
            v-for="user in users"
            :key="getUserId(user)"
            :value="getUserId(user)"
          >
            {{ getUserName(user) }}
          </a-select-option>
        </a-select>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  selectedCount: {
    type: Number,
    default: 0
  },
  users: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['submit', 'cancel', 'update:visible'])

const loading = ref(false)
const form = ref({
  assigneeId: null
})

const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

watch(() => props.visible, (newVal) => {
  if (newVal) {
    form.value.assigneeId = null
  }
})

const getUserId = (user) => {
  return user.user_id || user.id || user.userId
}

const getUserName = (user) => {
  return user.name || user.username || user.user_name || '未知用戶'
}

const filterUserOption = (input, option) => {
  const user = props.users.find(u => getUserId(u) === option.value)
  if (!user) return false
  const name = getUserName(user).toLowerCase()
  return name.includes(input.toLowerCase())
}

const handleSubmit = () => {
  loading.value = true
  emit('submit', form.value.assigneeId)
  setTimeout(() => {
    loading.value = false
  }, 500)
}

const handleCancel = () => {
  emit('cancel')
  emit('update:visible', false)
}
</script>





