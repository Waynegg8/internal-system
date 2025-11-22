<template>
  <div class="notifications-page">
    <PageHeader title="任務通知" />
    <NotificationsList />
  </div>
</template>

<script setup>
import PageHeader from '@/components/shared/PageHeader.vue'
import NotificationsList from '@/components/notifications/NotificationsList.vue'
</script>

<style scoped>
.notifications-page {
  padding: 24px;
}
</style>



