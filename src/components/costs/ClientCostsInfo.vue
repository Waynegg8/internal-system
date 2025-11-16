<template>
  <a-alert
    type="info"
    show-icon
    style="margin-bottom: 16px"
  >
    <template #message>
      <strong>計算說明：</strong>
    </template>
    <template #description>
      <div v-if="viewType === 'client'" style="line-height: 1.8;">
        <div><strong>客戶總成本</strong> = Σ(每位員工在該客戶的加權工時 × 該員工的實際時薪)</div>
        <div><strong>實際時薪</strong>：已包含薪資成本 + 管理費分攤（與員工成本分析一致）</div>
        <div><strong>利潤</strong> = 本月收入 - 總成本</div>
        <div><strong>利潤率</strong> = 利潤 ÷ 本月收入 × 100%</div>
        <div style="margin-top: 8px;">💡 點擊客戶名稱可展開/收起員工明細</div>
      </div>
      <div v-else style="line-height: 1.8;">
        <div><strong>實際時薪</strong>：已包含薪資成本 + 管理費分攤（與員工成本分析一致）</div>
        <div><strong>總成本</strong> = 加權工時 × 實際時薪</div>
      </div>
    </template>
  </a-alert>
</template>

<script setup>
defineProps({
  viewType: {
    type: String,
    default: 'client',
    validator: (value) => ['client', 'task'].includes(value)
  }
})
</script>






