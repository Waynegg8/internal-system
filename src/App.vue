<template>
  <router-view v-slot="{ Component, route }">
    <!-- 登入頁不需要布局 -->
    <component v-if="route.path === '/login'" :is="Component" />
    <!-- 其他頁面使用布局 -->
    <MainLayout v-else>
      <component :is="Component" />
    </MainLayout>
  </router-view>
</template>

<script setup>
import MainLayout from '@/components/layout/MainLayout.vue'
</script>

<style>
#app {
  width: 100%;
  height: 100%;
}

/* 為有布局的頁面統一高度設定 */
.main-layout .layout-content {
  margin-top: 0;
  min-height: calc(100vh - 64px);
}
</style>

