<template>
  <div class="overtime-rules-panel">
    <a-table
      :columns="ruleColumns"
      :data-source="ruleData"
      :pagination="false"
      size="small"
      :bordered="false"
      style="margin-bottom: 8px;"
    />

    <div style="font-size: 0.85em; color: #6b7280; line-height: 1.6;">
      <div style="margin-bottom: 4px;"><strong>重要說明：</strong></div>
      <div style="margin-bottom: 2px;">• "加倍發給"指總共給2日工資（原本1日+加班1日），月薪已含原本1日，加班費只計算額外1日</div>
      <div style="margin-bottom: 2px;">• 國定假日/例假日8h內：即使只工作1小時，也必須給付完整8h加權+8h補休</div>
      <div style="margin-bottom: 4px;">• 多客戶成本核算：同一天服務多個客戶時，固定8h加權按比例分配</div>
      <div><strong>補休規則：</strong>FIFO（先進先出），使用補休不計入加班費，未使用轉換為加班費發放</div>
    </div>
  </div>
</template>

<script setup>
const ruleColumns = [
  {
    title: '類型',
    dataIndex: 'type',
    key: 'type',
    width: '30%'
  },
  {
    title: '倍率',
    dataIndex: 'multiplier',
    key: 'multiplier',
    width: '15%',
    align: 'center'
  },
  {
    title: '說明',
    dataIndex: 'description',
    key: 'description',
    width: '55%'
  }
]

const ruleData = [
  {
    key: '1',
    type: '平日加班（前2h）',
    multiplier: '1.34倍',
    description: '勞基法第24條：加給1/3以上',
    bgColor: '#e0f2fe'
  },
  {
    key: '2',
    type: '平日加班（後2h）',
    multiplier: '1.67倍',
    description: '勞基法第24條：加給2/3以上',
    bgColor: '#ffffff'
  },
  {
    key: '3',
    type: '休息日（前2h）',
    multiplier: '1.34倍',
    description: '勞基法第24條：加給1/3以上',
    bgColor: '#fef3c7'
  },
  {
    key: '4',
    type: '休息日（3-8h）',
    multiplier: '1.67倍',
    description: '勞基法第24條：加給2/3以上',
    bgColor: '#fef3c7'
  },
  {
    key: '5',
    type: '休息日（9-12h）',
    multiplier: '2.67倍',
    description: '勞基法第24條：加給5/3以上',
    bgColor: '#fef3c7'
  },
  {
    key: '6',
    type: '國定假日（8h內）',
    multiplier: '1.0倍',
    description: '不論工時，固定8h加權+8h補休',
    bgColor: '#fef2f2',
    highlight: true
  },
  {
    key: '7',
    type: '國定假日（9-10h）',
    multiplier: '1.34倍',
    description: '按平日延長工時計算',
    bgColor: '#ffffff'
  },
  {
    key: '8',
    type: '國定假日（11-12h）',
    multiplier: '1.67倍',
    description: '按平日延長工時計算',
    bgColor: '#ffffff'
  },
  {
    key: '9',
    type: '例假日（8h內）',
    multiplier: '1.0倍',
    description: '不論工時，固定8h加權+8h補休',
    bgColor: '#fee2e2',
    highlight: true
  },
  {
    key: '10',
    type: '例假日（9-10h）',
    multiplier: '1.34倍',
    description: '與國定假日相同',
    bgColor: '#fee2e2'
  },
  {
    key: '11',
    type: '例假日（11-12h）',
    multiplier: '1.67倍',
    description: '與國定假日相同',
    bgColor: '#fee2e2'
  }
]
</script>

<style scoped>
:deep(.ant-table-tbody > tr) {
  background: #ffffff;
}

:deep(.ant-table-tbody > tr:nth-child(1)) {
  background: #e0f2fe;
}

:deep(.ant-table-tbody > tr:nth-child(3)),
:deep(.ant-table-tbody > tr:nth-child(4)),
:deep(.ant-table-tbody > tr:nth-child(5)) {
  background: #fef3c7;
}

:deep(.ant-table-tbody > tr:nth-child(6)) {
  background: #fef2f2;
}

:deep(.ant-table-tbody > tr:nth-child(9)),
:deep(.ant-table-tbody > tr:nth-child(10)),
:deep(.ant-table-tbody > tr:nth-child(11)) {
  background: #fee2e2;
}

:deep(.ant-table-tbody > tr:nth-child(6) td),
:deep(.ant-table-tbody > tr:nth-child(9) td) {
  font-weight: 600;
}

:deep(.ant-table-tbody > tr:nth-child(6) td:nth-child(2)),
:deep(.ant-table-tbody > tr:nth-child(9) td:nth-child(2)) {
  color: #dc2626;
}
</style>


