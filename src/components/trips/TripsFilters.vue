<template>
  <a-card title="篩選條件" :bordered="false" style="margin-bottom: 24px">
    <a-row :gutter="[16, 16]">
      <!-- 員工篩選（僅管理員可見） -->
      <a-col :xs="24" :sm="12" :md="8" :lg="6" v-if="isAdmin">
        <a-select
          v-model:value="localSelectedUserId"
          placeholder="選擇員工"
          allow-clear
          style="width: 100%"
          show-search
          :filter-option="filterUserOption"
          @change="handleUserIdChange"
        >
          <a-select-option
            v-for="user in users"
            :key="getUserId(user)"
            :value="getUserId(user)"
          >
            {{ getUserName(user) }}
          </a-select-option>
        </a-select>
      </a-col>
      
      <!-- 客戶篩選 -->
      <a-col :xs="24" :sm="12" :md="8" :lg="6">
        <a-select
          v-model:value="localSelectedClientId"
          placeholder="選擇客戶"
          allow-clear
          style="width: 100%"
          show-search
          :filter-option="filterClientOption"
          @change="handleClientIdChange"
        >
          <a-select-option
            v-for="client in clients"
            :key="getClientId(client)"
            :value="getClientId(client)"
          >
            {{ getClientName(client) }}
          </a-select-option>
        </a-select>
      </a-col>
      
      <!-- 重置篩選按鈕 -->
      <a-col :xs="24" :sm="12" :md="8" :lg="6">
        <a-button @click="handleReset">
          重置篩選
        </a-button>
      </a-col>
    </a-row>
  </a-card>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  users: {
    type: Array,
    default: () => []
  },
  clients: {
    type: Array,
    default: () => []
  },
  selectedUserId: {
    type: [String, Number],
    default: null
  },
  selectedClientId: {
    type: [String, Number],
    default: null
  },
  isAdmin: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:user-id', 'update:client-id', 'reset'])

// 本地狀態
const localSelectedUserId = ref(props.selectedUserId)
const localSelectedClientId = ref(props.selectedClientId)

// 監聽 props 變化
watch(() => props.selectedUserId, (val) => {
  localSelectedUserId.value = val
})

watch(() => props.selectedClientId, (val) => {
  localSelectedClientId.value = val
})

// 處理用戶篩選變化
const handleUserIdChange = (value) => {
  localSelectedUserId.value = value
  emit('update:user-id', value)
}

// 處理客戶篩選變化
const handleClientIdChange = (value) => {
  localSelectedClientId.value = value
  emit('update:client-id', value)
}

// 處理重置篩選
const handleReset = () => {
  localSelectedUserId.value = null
  localSelectedClientId.value = null
  emit('reset')
}

// 用戶過濾函數
const filterUserOption = (input, option) => {
  const userName = option.children?.[0]?.children || option.children || ''
  return userName.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

// 客戶過濾函數
const filterClientOption = (input, option) => {
  const clientName = option.children?.[0]?.children || option.children || ''
  return clientName.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

// 獲取用戶ID（處理不同字段名）
const getUserId = (user) => {
  return user.userId || user.user_id || user.id
}

// 獲取用戶名稱（處理不同字段名）
const getUserName = (user) => {
  return user.name || user.userName || user.user_name || '未命名'
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






