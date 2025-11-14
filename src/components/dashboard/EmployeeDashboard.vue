<template>
  <a-row :gutter="[12, 12]">
    <a-col :xs="24" :sm="24" :md="12" :lg="8">
      <MyHours :hours="employeeData?.myHours" />
    </a-col>
    <a-col :xs="24" :sm="24" :md="12" :lg="8">
      <MyLeaves :leaves="employeeData?.myLeaves" />
    </a-col>
    <a-col :xs="24" :sm="24" :md="24" :lg="16">
      <MyTasks :tasks="tasks" />
    </a-col>
    <a-col
      v-if="receipts && receipts.length > 0"
      :xs="24"
      :sm="24"
      :md="24"
      :lg="24"
    >
      <ReceiptsPending :receipts="receipts" />
    </a-col>
  </a-row>
</template>

<script setup>
import { computed } from 'vue'
import MyHours from './MyHours.vue'
import MyLeaves from './MyLeaves.vue'
import MyTasks from './MyTasks.vue'
import ReceiptsPending from './ReceiptsPending.vue'

const props = defineProps({
  employeeData: {
    type: Object,
    default: () => ({})
  }
})

const tasks = computed(() => {
  return Array.isArray(props.employeeData?.myTasks?.items)
    ? props.employeeData.myTasks.items
    : []
})

const receipts = computed(() => {
  return Array.isArray(props.employeeData?.receiptsPendingTasks)
    ? props.employeeData.receiptsPendingTasks
    : []
})
</script>

<style scoped>
/* 组件样式由子组件处理 */
</style>

