/**
 * 報表相關工具函數
 */

/**
 * 計算薪資構成分析
 * @param {Object} data - 報表數據對象（包含 summary 和 composition）
 * @returns {Array} 薪資構成分析項目數組
 */
export function calculatePayrollComposition(data) {
  if (!data || !data.composition || !data.summary) {
    return []
  }

  const { composition, summary } = data
  const totalGrossSalary = summary.totalGrossSalary || 0

  // 構建項目數組（參考原始代碼第 738-749 行）
  const items = [
    {
      name: '底薪',
      value: composition.baseSalary || 0,
      key: 'baseSalary'
    },
    {
      name: '加給',
      value: composition.regularAllowance || 0,
      key: 'regularAllowance'
    },
    {
      name: '津貼',
      value: composition.irregularAllowance || 0,
      key: 'irregularAllowance'
    },
    {
      name: '全勤獎金',
      value: composition.fullAttendanceBonus || 0,
      key: 'fullAttendanceBonus'
    },
    {
      name: '加班費',
      value: composition.overtimePay || 0,
      key: 'overtimePay'
    },
    {
      name: '誤餐費',
      value: composition.mealAllowance || 0,
      key: 'mealAllowance'
    },
    {
      name: '交通補貼',
      value: composition.transportSubsidy || 0,
      key: 'transportSubsidy'
    },
    {
      name: '績效獎金',
      value: composition.performanceBonus || 0,
      key: 'performanceBonus'
    },
  {
    name: '其他獎金',
    value: composition.bonusAmount || 0,
    key: 'otherBonus'
  },
    {
      name: '年終獎金',
      value: composition.yearEndBonus || 0,
      key: 'yearEndBonus'
    },
    {
      name: '請假扣款',
      value: -(composition.leaveDeduction || 0),
      key: 'leaveDeduction'
    },
    {
      name: '固定扣款',
      value: -(composition.fixedDeduction || 0),
      key: 'fixedDeduction'
    }
  ]

  // 計算占比（item.value / totalGrossSalary × 100）
  return items.map(item => ({
    ...item,
    percentage: totalGrossSalary > 0 ? (item.value / totalGrossSalary) * 100 : 0
  }))
}



