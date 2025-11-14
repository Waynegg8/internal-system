<template>
  <a-layout class="main-layout">
    <AppNavbar />
    <a-layout-content class="layout-content">
      <slot />
    </a-layout-content>
    <AppFooter />
  </a-layout>
</template>

<script setup>
import AppNavbar from './AppNavbar.vue'
import AppFooter from './AppFooter.vue'
</script>

<style scoped>
.main-layout {
  min-height: 100vh;
}

.layout-content {
  flex: 1;
  background: #f0f2f5;
}
</style>

