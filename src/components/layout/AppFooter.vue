<template>
  <a-layout-footer class="app-footer">
    <span>© {{ currentYear }} 霍爾果斯內部系統</span>
  </a-layout-footer>
</template>

<script setup>
import { computed } from 'vue'

const currentYear = computed(() => {
  return new Date().getFullYear()
})
</script>

<style scoped>
.app-footer {
  text-align: center;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  padding: 16px 24px;
  color: rgba(0, 0, 0, 0.65);
  font-size: 14px;
}
</style>

