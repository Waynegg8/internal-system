<template>
  <a-modal
    :visible="visible"
    :title="`薪資條 - ${monthDisplay}`"
    width="900px"
    :centered="true"
    :footer="null"
    @cancel="handleCancel"
    :maskClosable="false"
  >
    <div class="payslip-container">
      <!-- 頂部操作欄 -->
      <div class="payslip-toolbar">
        <a-button size="small" @click="handlePrint" :loading="loading">
          列印
        </a-button>
      </div>

      <!-- 加載狀態 -->
      <a-spin :spinning="loading" tip="載入薪資詳情中...">
        <div id="payslip-content" class="payslip-content">
          <!-- 錯誤提示 -->
          <a-alert
            v-if="error"
            type="error"
            :message="error"
            show-icon
            style="margin-bottom: 16px"
          />

          <!-- 薪資條內容 -->
          <div v-if="payslipData && !error" class="payslip-body">
            <!-- 頁首區域 -->
            <div class="payslip-header">
              <div class="company-name">霍爾果斯會計師事務所</div>
              <div class="document-title">薪資條</div>
            </div>

            <!-- 員工信息區域 -->
            <div class="employee-info">
              <div class="info-item">
                <span class="info-label">員工姓名：</span>
                {{ employeeName }}
              </div>
              <div class="info-item">
                <span class="info-label">薪資月份：</span>
                {{ monthDisplay }}
              </div>
              <div class="info-item">
                <span class="info-label">列印日期：</span>
                {{ printDate }}
              </div>
            </div>

            <!-- 收入明細表格 -->
            <div class="section-title">收入明細</div>
            <table class="payslip-table">
              <thead>
                <tr>
                  <th style="width: 50%;">項目</th>
                  <th style="width: 30%;">金額</th>
                  <th style="width: 20%;">類別</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in incomeItems" :key="`income-${index}`" class="income-row">
                  <td>
                    {{ item.name }}
                    <div v-if="item.detail" class="item-detail">{{ item.detail }}</div>
                  </td>
                  <td class="amount">{{ item.amount }}</td>
                  <td>{{ item.category }}</td>
                </tr>
                <tr v-if="incomeItems.length === 0">
                  <td colspan="3" style="text-align: center; color: #666;">本月無收入項目</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="subtotal-row">
                  <td colspan="2">收入小計</td>
                  <td class="amount">{{ grossSalary }}</td>
                </tr>
              </tfoot>
            </table>

            <!-- 扣款明細表格 -->
            <div class="section-title">扣款明細</div>
            <table class="payslip-table">
              <thead>
                <tr>
                  <th style="width: 50%;">項目</th>
                  <th style="width: 30%;">金額</th>
                  <th style="width: 20%;">類別</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in deductionItems" :key="`deduction-${index}`" class="deduction-row">
                  <td>
                    {{ item.name }}
                    <div v-if="item.detail" class="item-detail">{{ item.detail }}</div>
                  </td>
                  <td class="amount">{{ item.amount }}</td>
                  <td>{{ item.category }}</td>
                </tr>
                <tr v-if="deductionItems.length === 0">
                  <td colspan="3" style="text-align: center; color: #666;">本月無扣款</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="subtotal-row">
                  <td colspan="2">扣款小計</td>
                  <td class="amount">-{{ totalDeduction }}</td>
                </tr>
              </tfoot>
            </table>

            <!-- 匯總區域 -->
            <div class="summary-section">
              <div class="section-title">薪資總結</div>
              <table class="payslip-table summary-table">
                <thead>
                  <tr>
                    <th style="width: 60%;">項目</th>
                    <th style="width: 40%;">金額</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>應發工資</td>
                    <td class="amount">{{ grossSalary }}</td>
                  </tr>
                  <tr>
                    <td>總扣款</td>
                    <td class="amount deduction">-{{ totalDeduction }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="total-row">
                    <td>實發工資</td>
                    <td class="amount net">{{ netSalary }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- 頁尾區域 -->
            <div class="payslip-footer">
              <div>霍爾果斯會計師事務所 | www.horgoscpa.com</div>
            </div>
          </div>
        </div>
      </a-spin>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePayrollApi } from '@/api/payroll'
import { centsToTwd, formatMonthToROC } from '@/utils/payrollUtils'
import { formatHours } from '@/utils/formatters'

const PRINT_STYLES = `
  @page {
    size: A4;
    margin: 12mm;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    padding: 0;
    font-family: "Microsoft JhengHei", "微軟正黑體", Arial, sans-serif;
    line-height: 1.4;
    color: #1f2937;
    background: #fff;
  }

  .payslip-print-wrapper {
    width: 100%;
  }

  .payslip-body {
    padding: 8px 12px;
  }

  .payslip-header {
    text-align: center;
    margin-bottom: 8px;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 6px;
  }

  .payslip-header .company-name {
    font-size: 14pt;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 2px;
  }

  .payslip-header .document-title {
    font-size: 12pt;
    font-weight: 600;
    margin: 2px 0;
    color: #6b7280;
  }

  .employee-info {
    display: flex;
    justify-content: space-between;
    margin: 10px 0;
    padding: 6px 10px;
    background: #fafafa;
    border-radius: 2px;
    border: 1px solid #e5e7eb;
    font-size: 9pt;
  }

  .employee-info .info-label {
    color: #6b7280;
    font-weight: 500;
    margin-right: 4px;
  }

  .section-title {
    font-size: 10pt;
    font-weight: 600;
    color: #374151;
    margin: 10px 0 4px 0;
    padding-bottom: 2px;
    border-bottom: 1px solid #e5e7eb;
  }

  .payslip-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
    font-size: 9pt;
  }

  .payslip-table thead {
    background: #f9fafb;
  }

  .payslip-table th,
  .payslip-table td {
    border: 1px solid #e5e7eb;
    padding: 4px 6px;
  }

  .payslip-table th {
    text-align: center;
    font-weight: 600;
    color: #374151;
  }

  .payslip-table td {
    text-align: left;
  }

  .payslip-table td.amount {
    text-align: right;
    font-family: "Courier New", monospace;
    font-weight: 500;
  }

  .item-detail {
    font-size: 9pt;
    color: #6b7280;
    margin-top: 2px;
  }

  .summary-section {
    margin: 12px 0 0;
  }

  .summary-table {
    margin-bottom: 0;
  }

  .summary-table tbody tr th {
    width: 130px;
    text-align: left;
    background: #f9fafb;
    font-weight: 600;
    color: #374151;
  }

  .summary-table tbody tr td.amount {
    font-family: "Courier New", monospace;
    font-weight: 600;
  }

  .summary-table tbody tr td.deduction {
    color: #dc2626;
  }

  .summary-table tbody tr td.net {
    color: #059669;
    font-size: 10pt;
  }

  .summary-table tbody tr.total-row th,
  .summary-table tbody tr.total-row td {
    border-top-width: 2px;
  }

  .payslip-footer {
    text-align: center;
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px solid #e5e7eb;
    color: #9ca3af;
    font-size: 8pt;
  }

  @media print {
    body {
      margin: 0;
      padding: 0;
    }
  }
`

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  userId: {
    type: Number,
    default: null
  },
  month: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['cancel'])

const loading = ref(false)
const error = ref(null)
const payslipData = ref(null)

// 月份顯示（民國年格式）
const monthDisplay = computed(() => {
  return formatMonthToROC(props.month)
})

// 列印日期
const printDate = computed(() => {
  return new Date().toLocaleDateString('zh-TW')
})

// 員工姓名
const employeeName = computed(() => {
  return payslipData.value?.name || '未知員工'
})

// 獲取字段值（支持 snake_case 和 camelCase）
const getField = (camelKey, snakeKey) => {
  if (!payslipData.value) return null
  return payslipData.value[camelKey] ?? payslipData.value[snakeKey] ?? null
}

// 收入明細項目
const incomeItems = computed(() => {
  if (!payslipData.value) return []
  
  const items = []
  
  // 基本薪資
  const baseSalaryCents = getField('baseSalaryCents', 'base_salary_cents') || 0
  if (baseSalaryCents > 0) {
    items.push({
      name: '基本薪資',
      amount: centsToTwd(baseSalaryCents),
      category: '底薪'
    })
  }
  
  // 加給
  const regularAllowanceItems = getField('regularAllowanceItems', 'regular_allowance_items') || []
  regularAllowanceItems.forEach(item => {
    const amount = item.amountCents || item.amount_cents || 0
    if (amount > 0) {
      items.push({
        name: item.name,
        amount: centsToTwd(amount),
        category: '加給'
      })
    }
  })
  
  // 津貼
  const irregularAllowanceItems = getField('irregularAllowanceItems', 'irregular_allowance_items') || []
  irregularAllowanceItems.forEach(item => {
    const amount = item.amountCents || item.amount_cents || 0
    if (amount > 0) {
      items.push({
        name: item.name,
        amount: centsToTwd(amount),
        category: '津貼'
      })
    }
  })
  
  // 月度獎金（只顯示 shouldPay=true 的）
  const regularBonusItems = getField('regularBonusItems', 'regular_bonus_items') || []
  regularBonusItems.forEach(item => {
    const shouldPay = item.shouldPay || item.should_pay
    if (shouldPay) {
      const amount = item.amountCents || item.amount_cents || 0
      if (amount > 0) {
        let category = '獎金'
        if (item.isFullAttendanceBonus || item.is_full_attendance_bonus) {
          category = '✓ 全勤達標，發放'
        }
        items.push({
          name: item.name,
          amount: centsToTwd(amount),
          category
        })
      }
    }
  })
  
  // 年終獎金（只顯示 shouldPay=true 的）
  const yearEndBonusItems = getField('yearEndBonusItems', 'year_end_bonus_items') || []
  yearEndBonusItems.forEach(item => {
    const shouldPay = item.shouldPay || item.should_pay
    if (shouldPay) {
      const amount = item.amountCents || item.amount_cents || 0
      if (amount > 0) {
        items.push({
          name: item.name,
          amount: centsToTwd(amount),
          category: '年終獎金'
        })
      }
    }
  })
  
  // 加班費
  const effectiveHours = getField('effectiveWeightedHours', 'effective_weighted_hours') || 0
  const overtimeCents = getField('overtimeCents', 'overtime_cents') || 0
  
  if (effectiveHours > 0 && overtimeCents > 0) {
    items.push({
      name: '加班費',
      detail: `有效加權工時：${formatHours(effectiveHours)}h（補休轉換計算）`,
      amount: centsToTwd(overtimeCents),
      category: '加班費'
    })
  }
  
  // 誤餐費
  const mealAllowanceCents = getField('mealAllowanceCents', 'meal_allowance_cents') || 0
  if (mealAllowanceCents > 0) {
    const days = getField('overtimeDays', 'overtime_days') || 0
    items.push({
      name: '誤餐費',
      detail: `${days}天`,
      amount: centsToTwd(mealAllowanceCents),
      category: '津貼'
    })
  }
  
  // 交通補貼
  const transportCents = getField('transportCents', 'transport_cents') || 0
  if (transportCents > 0) {
    const km = getField('totalKm', 'total_km') || 0
    items.push({
      name: '交通補貼',
      detail: `${km} km`,
      amount: centsToTwd(transportCents),
      category: '津貼'
    })
  }
  
  // 績效獎金
  const performanceBonusCents = getField('performanceBonusCents', 'performance_bonus_cents') || 0
  if (performanceBonusCents > 0) {
    items.push({
      name: '績效獎金（月度調整）',
      amount: centsToTwd(performanceBonusCents),
      category: '獎金'
    })
  }
  
  // 注意：年終獎金已在上面處理，這裡不再重複添加
  
  return items
})

// 扣款明細項目
const deductionItems = computed(() => {
  if (!payslipData.value) return []
  
  const items = []
  
  // 固定扣款
  const deductionItems = getField('deductionItems', 'deduction_items') || []
  deductionItems.forEach(item => {
    const amount = item.amountCents || item.amount_cents || 0
    if (amount > 0) {
      items.push({
        name: item.name,
        amount: `-${centsToTwd(amount)}`,
        category: '固定扣款'
      })
    }
  })
  
  // 請假扣款
  const leaveDeductionCents = getField('leaveDeductionCents', 'leave_deduction_cents') || 0
  if (leaveDeductionCents > 0) {
    const sickH = getField('sickHours', 'sick_hours') || 0
    const personalH = getField('personalHours', 'personal_hours') || 0
    const menstrualH = getField('menstrualHours', 'menstrual_hours') || 0
    const leaveDetailParts = []
    if (sickH > 0) leaveDetailParts.push(`病假${sickH}h`)
    if (personalH > 0) leaveDetailParts.push(`事假${personalH}h`)
    if (menstrualH > 0) leaveDetailParts.push(`生理假${menstrualH}h`)
    
    items.push({
      name: '請假扣款',
      detail: leaveDetailParts.join(' '),
      amount: `-${centsToTwd(leaveDeductionCents)}`,
      category: '請假扣款'
    })
  }
  
  return items
})

// 應發工資
const grossSalary = computed(() => {
  const gross = getField('grossSalaryCents', 'gross_salary_cents') || 0
  return centsToTwd(gross)
})

// 總扣款
const totalDeduction = computed(() => {
  const deduction = getField('deductionCents', 'deduction_cents') || 0
  const leaveDeduction = getField('leaveDeductionCents', 'leave_deduction_cents') || 0
  return centsToTwd(deduction + leaveDeduction)
})

// 實發工資
const netSalary = computed(() => {
  const net = getField('netSalaryCents', 'net_salary_cents') || 0
  return centsToTwd(net)
})

// 載入薪資詳情
const loadPayslipData = async () => {
  if (!props.userId || !props.month) {
    error.value = '缺少必要參數'
    return
  }
  
  loading.value = true
  error.value = null
  payslipData.value = null
  
  try {
    const response = await usePayrollApi().calculateEmployeePayroll(props.userId, props.month)
    
    if (response.ok && response.data) {
      payslipData.value = response.data
    } else {
      error.value = response.message || '載入薪資詳情失敗'
    }
  } catch (err) {
    error.value = err.message || '載入薪資詳情失敗'
    console.error('載入薪資詳情失敗:', err)
  } finally {
    loading.value = false
  }
}

// 監聽 visible 和 userId、month 變化
watch(
  () => [props.visible, props.userId, props.month],
  ([newVisible, newUserId, newMonth]) => {
    if (newVisible && newUserId && newMonth) {
      loadPayslipData()
    } else if (!newVisible) {
      // 關閉時重置狀態
      payslipData.value = null
      error.value = null
    }
  },
  { immediate: true }
)

// 列印功能
const handlePrint = () => {
  if (!payslipData.value) {
    console.warn('[PayslipPrint] 嘗試列印時缺少薪資資料')
    return
  }

  const payslipBody = document.querySelector('.payslip-body')
  if (!payslipBody) {
    console.warn('[PayslipPrint] 找不到薪資列印內容節點')
    return
  }

  const printFrame = document.createElement('iframe')
  printFrame.style.position = 'fixed'
  printFrame.style.right = '0'
  printFrame.style.bottom = '0'
  printFrame.style.width = '0'
  printFrame.style.height = '0'
  printFrame.style.border = '0'
  printFrame.setAttribute('aria-hidden', 'true')

  document.body.appendChild(printFrame)

  const printDocument = printFrame.contentWindow?.document
  if (!printDocument) {
    console.error('[PayslipPrint] 無法建立列印文檔')
    document.body.removeChild(printFrame)
    return
  }

  const clonedContent = payslipBody.cloneNode(true)
  const html = `
    <!DOCTYPE html>
    <html lang="zh-Hant">
      <head>
        <meta charset="utf-8" />
        <title>薪資條 - ${monthDisplay.value}</title>
        <style>${PRINT_STYLES}</style>
      </head>
      <body>
        <div class="payslip-print-wrapper">
          ${clonedContent.outerHTML}
        </div>
      </body>
    </html>
  `

  printDocument.open()
  printDocument.write(html)
  printDocument.close()

  const cleanup = () => {
    setTimeout(() => {
      if (printFrame.parentNode) {
        printFrame.parentNode.removeChild(printFrame)
      }
    }, 100)
  }

  const handleLoad = () => {
    try {
      printFrame.contentWindow?.focus()
      printFrame.contentWindow?.print()
    } catch (err) {
      console.error('[PayslipPrint] 列印失敗:', err)
    } finally {
      cleanup()
    }
  }

  if (printDocument.readyState === 'complete') {
    handleLoad()
  } else {
    printDocument.addEventListener('DOMContentLoaded', handleLoad, { once: true })
    printFrame.onload = handleLoad
  }
}

// 關閉模態框
const handleCancel = () => {
  emit('cancel')
}
</script>

<style scoped>
.payslip-container {
  min-height: 400px;
}

.payslip-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.payslip-content {
  min-height: 300px;
}

.payslip-body {
  font-family: "Microsoft JhengHei", "微軟正黑體", Arial, sans-serif;
  line-height: 1.3;
  color: #1f2937;
}

/* 頁首區域 */
.payslip-header {
  text-align: center;
  margin-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 6px;
}

.company-name {
  font-size: 14pt;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 2px;
}

.document-title {
  font-size: 12pt;
  font-weight: 600;
  margin: 2px 0;
  color: #6b7280;
}

/* 員工信息區域 */
.employee-info {
  display: flex;
  justify-content: space-between;
  margin: 8px 0;
  padding: 6px 10px;
  background: #fafafa;
  border-radius: 2px;
  border: 1px solid #e5e7eb;
}

.info-item {
  font-size: 9pt;
}

.info-label {
  color: #6b7280;
  font-weight: 500;
  margin-right: 4px;
}

/* 區塊標題 */
.section-title {
  font-size: 10pt;
  font-weight: 600;
  color: #374151;
  margin: 8px 0 4px 0;
  padding-bottom: 2px;
  border-bottom: 1px solid #e5e7eb;
}

/* 表格樣式 */
.payslip-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
  font-size: 10pt;
}

.payslip-table thead {
  background: #f9fafb;
}

.payslip-table th {
  padding: 4px 6px;
  text-align: center;
  border: 1px solid #e5e7eb;
  font-weight: 600;
  background: #f9fafb;
  color: #374151;
  font-size: 9pt;
}

.payslip-table td {
  padding: 4px 6px;
  border: 1px solid #e5e7eb;
  text-align: left;
  font-size: 9pt;
}

.subtotal-row td {
  font-weight: 600;
  background: #f3f4f6;
}

.income-row {
  background: #ffffff;
}

.deduction-row {
  background: #ffffff;
}

.amount {
  text-align: right;
  font-family: "Courier New", monospace;
  font-weight: 500;
}

.item-detail {
  font-size: 9pt;
  color: #6b7280;
  margin-top: 2px;
}

/* 匯總區域 */
.summary-section {
  margin: 12px 0 0;
}

.summary-table {
  margin-bottom: 0;
}

.summary-table tbody tr td,
.summary-table tfoot tr td {
  font-weight: 600;
}

.summary-table tbody tr td.amount,
.summary-table tfoot tr td.amount {
  font-family: "Courier New", monospace;
}

.summary-table tbody tr td.deduction {
  color: #dc2626;
}

.summary-table .amount {
  text-align: center;
}

.summary-table tfoot tr.total-row td {
  border-top-width: 2px;
  font-size: 11pt;
  color: #059669;
}

/* 頁尾區域 */
.payslip-footer {
  text-align: center;
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid #e5e7eb;
  color: #9ca3af;
  font-size: 8pt;
}

/* 列印樣式 */
@page {
  size: A4;
  margin: 15mm;
}

@media print {
  .payslip-toolbar {
    display: none !important;
  }
  
  .payslip-body {
    padding: 5px;
    margin: 0;
  }
  
  .payslip-header {
    page-break-after: avoid;
  }
  
  .payslip-table {
    page-break-inside: avoid;
  }
  
  .summary-section {
    page-break-inside: avoid;
  }
  
  @page {
    size: A4;
    margin: 10mm;
  }
}
</style>

