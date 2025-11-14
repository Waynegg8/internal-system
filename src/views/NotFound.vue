<template>
  <a-result
    status="404"
    title="404"
    sub-title="抱歉，您訪問的頁面不存在。"
  >
    <template #extra>
      <a-space>
        <a-button type="primary" @click="goHome">
          返回首頁
        </a-button>
        <a-button @click="goBack">
          返回上一頁
        </a-button>
      </a-space>
    </template>
  </a-result>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/dashboard')
}

const goBack = () => {
  router.back()
}
</script>

<style scoped>
/* 可以添加自定義樣式 */
</style>

