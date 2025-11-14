<template>
  <a-card title="個人資料" class="profile-info-card">
    <a-descriptions bordered :column="1">
      <a-descriptions-item label="姓名">{{ user?.name || '-' }}</a-descriptions-item>
      <a-descriptions-item label="帳號">{{ user?.username || '-' }}</a-descriptions-item>
      <a-descriptions-item label="角色">{{ roleText }}</a-descriptions-item>
      <a-descriptions-item label="到職日">{{ user?.hire_date || '未設定' }}</a-descriptions-item>
      <a-descriptions-item label="性別">{{ genderText }}</a-descriptions-item>
    </a-descriptions>
  </a-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  user: {
    type: Object,
    default: null
  }
})

// 角色文字
const roleText = computed(() => {
  if (!props.user) return '-'
  const isAdmin = props.user.isAdmin || props.user.is_admin
  return isAdmin ? '管理員' : '員工'
})

// 性別文字
const genderText = computed(() => {
  if (!props.user || !props.user.gender) return '未設定'
  return props.user.gender === 'male' ? '男性' : props.user.gender === 'female' ? '女性' : props.user.gender
})
</script>

<style scoped>
.profile-info-card {
  margin-bottom: 16px;
}
</style>
