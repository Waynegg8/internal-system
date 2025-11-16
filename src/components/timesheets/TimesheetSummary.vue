<template>
  <div class="timesheet-summary-container">
    <a-row :gutter="16">
      <!-- 本週統計 -->
      <a-col :span="12">
        <a-card title="本週統計" :bordered="false">
          <a-row :gutter="16">
            <a-col :span="6">
              <a-statistic
                title="本週總工時"
                :value="weeklySummary.totalHours"
                suffix="小時"
                :precision="1"
              />
            </a-col>
            <a-col :span="6">
              <a-statistic
                title="本週加班工時"
                :value="weeklySummary.overtimeHours"
                suffix="小時"
                :precision="1"
              />
            </a-col>
            <a-col :span="6">
              <a-statistic
                title="本週加權工時"
                :value="weeklySummary.weightedHours"
                suffix="小時"
                :precision="1"
              />
            </a-col>
            <a-col :span="6">
              <a-statistic
                title="本週請假時數"
                :value="weeklySummary.leaveHours"
                suffix="小時"
                :precision="1"
              />
            </a-col>
          </a-row>
        </a-card>
      </a-col>
      
      <!-- 本月統計 -->
      <a-col :span="12">
        <a-card title="本月統計" :bordered="false">
          <a-row :gutter="16">
            <a-col :span="6">
              <a-statistic
                title="本月總工時"
                :value="monthlySummary.totalHours"
                suffix="小時"
                :precision="1"
              />
            </a-col>
            <a-col :span="6">
              <a-statistic
                title="本月加班工時"
                :value="monthlySummary.overtimeHours"
                suffix="小時"
                :precision="1"
              />
            </a-col>
            <a-col :span="6">
              <a-statistic
                title="本月加權工時"
                :value="monthlySummary.weightedHours"
                suffix="小時"
                :precision="1"
              />
            </a-col>
            <a-col :span="6">
              <a-statistic
                title="本月請假時數"
                :value="monthlySummary.leaveHours"
                suffix="小時"
                :precision="1"
              />
            </a-col>
          </a-row>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
const props = defineProps({
  weeklySummary: {
    type: Object,
    default: () => ({
      totalHours: 0,
      overtimeHours: 0,
      weightedHours: 0,
      leaveHours: 0
    })
  },
  monthlySummary: {
    type: Object,
    default: () => ({
      totalHours: 0,
      overtimeHours: 0,
      weightedHours: 0,
      leaveHours: 0
    })
  }
})
</script>

<style scoped>
.timesheet-summary-container {
  margin-top: 24px;
}

:deep(.ant-statistic-title) {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.65);
}

:deep(.ant-statistic-content) {
  font-size: 24px;
  color: rgba(0, 0, 0, 0.85);
}
</style>






