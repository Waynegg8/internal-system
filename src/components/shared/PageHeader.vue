<template>
  <div class="page-header">
    <div class="page-header-content">
      <div class="page-header-title-section">
        <h1 class="page-header-title">{{ title }}</h1>
        <p v-if="description" class="page-header-description">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="page-header-actions">
        <slot name="actions"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.page-header {
  margin-bottom: 24px;
}

.page-header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
}

.page-header-title-section {
  flex: 1;
  min-width: 0;
}

.page-header-title {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--color-text-primary);
  margin: 0;
  padding: 0;
}

.page-header-description {
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text-secondary);
  margin: 8px 0 0 0;
  padding: 0;
}

.page-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* 响应式 */
@media (max-width: 768px) {
  .page-header-content {
    flex-direction: column;
    align-items: stretch;
  }

  .page-header-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>












