<template>
  <a-card v-if="summary" title="統計摘要" :bordered="false" style="margin-bottom: 12px">
    <a-row :gutter="16">
      <a-col :xs="24" :sm="8" :md="8">
        <a-statistic
          title="本月外出次數"
          :value="summary.trip_count || 0"
          suffix="次"
        />
      </a-col>
      <a-col :xs="24" :sm="8" :md="8">
        <a-statistic
          title="總距離"
          :value="summary.total_distance_km || 0"
          suffix="公里"
          :precision="1"
        />
      </a-col>
      <a-col :xs="24" :sm="8" :md="8">
        <a-statistic
          title="交通補貼總額"
          :value="summary.total_subsidy_twd || 0"
        />
      </a-col>
    </a-row>
  </a-card>
</template>

<script setup>
const props = defineProps({
  summary: {
    type: Object,
    default: null
  }
})
</script>

<style scoped>
:deep(.ant-statistic-title) {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.65);
}

:deep(.ant-statistic-content) {
  font-size: 24px;
  color: rgba(0, 0, 0, 0.85);
}
</style>


