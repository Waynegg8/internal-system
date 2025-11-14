<template>
  <div class="action-bar" :class="{ 'action-bar-fixed': fixed }">
    <a-space :size="size">
      <slot></slot>
    </a-space>
  </div>
</template>

<script setup>
defineProps({
  size: {
    type: String,
    default: 'middle' // small, middle, large
  },
  fixed: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
.action-bar {
  display: flex;
  align-items: center;
  transition: var(--transition-base);
}

.action-bar-fixed {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: var(--color-bg-card);
  padding: 12px 16px;
  margin: -16px -16px 16px -16px;
  border-bottom: 1px solid var(--color-border-divider);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}
</style>





