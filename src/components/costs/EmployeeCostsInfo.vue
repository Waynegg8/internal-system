<template>
  <a-alert
    type="info"
    show-icon
    style="margin-bottom: 16px"
  >
    <template #message>
      <strong>計算說明（完全成本法）：</strong>
    </template>
    <template #description>
      <div style="line-height: 1.8;">
        <div><strong>薪資成本</strong> = 應發工資（底薪 + 固定津貼 + 非固定津貼 + 固定獎金 + 績效獎金 + 年終獎金 + 加班費 + 伙食津貼 + 交通補貼）</div>
        <div><strong>分攤管理費</strong>：根據各成本項目設定的分攤方式（按員工數/按工時/按營收）計算</div>
        <div><strong>總成本</strong> = 薪資成本 + 分攤管理費用</div>
        <div><strong style="color:#0ea5e9;">實際時薪</strong> = 總成本 ÷ 實際工時（含直接成本+間接成本，用於任務成本分析）</div>
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #d9d9d9;">
          <div><strong>補休規則</strong>：加班先全部轉為補休，本月未使用的補休才轉為加班費</div>
          <div><strong>產生補休</strong>：一般加班 1:1 產生補休；國定假日/例假日（8小時內）產生8小時補休並支付雙倍工資，超過8小時部分按平日加班倍率</div>
          <div><strong>未使用補休</strong> = 本月產生補休 - 本月使用補休</div>
        </div>
      </div>
    </template>
  </a-alert>
</template>

<script setup>
</script>





