/**
 * 假別過濾工具
 */
import { LEAVE_TYPES, LIFE_EVENT_TYPES } from '@/constants/leaveTypes'

/**
 * 根據性別和生活事件餘額返回可選的假別選項
 * @param {string|null} gender - 用戶性別（'male' 或 'female'）
 * @param {Array} balances - 假期餘額數組
 * @returns {Array<{ value: string, label: string, disabled: boolean, dataGender?: string, isLifeEvent?: boolean }>}
 */
export function getLeaveTypeOptions(gender, balances = []) {
  const options = []
  const balanceMap = new Map()
  
  // 建立餘額映射表
  balances.forEach(balance => {
    balanceMap.set(balance.type, balance)
  })

  // 基本假別（所有用戶可用）
  const basicTypes = ['annual', 'sick', 'personal', 'comp', 'public']
  basicTypes.forEach(type => {
    options.push({
      value: type,
      label: LEAVE_TYPES[type] || type,
      disabled: false
    })
  })

  // 性別相關假別
  // 生理假：僅女性可用
  options.push({
    value: 'menstrual',
    label: LEAVE_TYPES.menstrual,
    disabled: gender !== 'female',
    dataGender: 'female'
  })

  // 產假、產檢假：僅女性可用
  options.push({
    value: 'maternity',
    label: LEAVE_TYPES.maternity,
    disabled: gender !== 'female',
    dataGender: 'female',
    isLifeEvent: true
  })

  options.push({
    value: 'prenatal_checkup',
    label: LEAVE_TYPES.prenatal_checkup,
    disabled: gender !== 'female',
    dataGender: 'female',
    isLifeEvent: true
  })

  // 陪產檢及陪產假：僅男性可用
  options.push({
    value: 'paternity',
    label: LEAVE_TYPES.paternity,
    disabled: gender !== 'male',
    dataGender: 'male',
    isLifeEvent: true
  })

  // 生活事件相關假別（婚假、喪假）
  // 婚假：需要檢查餘額
  const marriageBalance = balanceMap.get('marriage')
  options.push({
    value: 'marriage',
    label: LEAVE_TYPES.marriage,
    disabled: !marriageBalance || marriageBalance.remain <= 0,
    isLifeEvent: true
  })

  // 喪假：需要檢查餘額
  const funeralBalance = balanceMap.get('funeral')
  options.push({
    value: 'funeral',
    label: LEAVE_TYPES.funeral,
    disabled: !funeralBalance || funeralBalance.remain <= 0,
    isLifeEvent: true
  })

  // 生活事件相關假別（產假、產檢假、陪產檢及陪產假）需要檢查餘額
  // 產假
  const maternityBalance = balanceMap.get('maternity')
  if (maternityBalance) {
    const option = options.find(opt => opt.value === 'maternity')
    if (option) {
      option.disabled = option.disabled || maternityBalance.remain <= 0
    }
  }

  // 產檢假
  const prenatalBalance = balanceMap.get('prenatal_checkup')
  if (prenatalBalance) {
    const option = options.find(opt => opt.value === 'prenatal_checkup')
    if (option) {
      option.disabled = option.disabled || prenatalBalance.remain <= 0
    }
  }

  // 陪產檢及陪產假
  const paternityBalance = balanceMap.get('paternity')
  if (paternityBalance) {
    const option = options.find(opt => opt.value === 'paternity')
    if (option) {
      option.disabled = option.disabled || paternityBalance.remain <= 0
    }
  }

  return options
}

/**
 * 根據性別返回可選的生活事件類型選項
 * @param {string|null} gender - 用戶性別（'male' 或 'female'）
 * @returns {Array<{ value: string, label: string, disabled: boolean }>}
 */
export function getLifeEventTypeOptions(gender) {
  const options = []

  // 結婚：所有性別可用
  options.push({
    value: 'marriage',
    label: LIFE_EVENT_TYPES.marriage,
    disabled: false
  })

  // 喪假：所有性別可用
  options.push({
    value: 'funeral_parent',
    label: LIFE_EVENT_TYPES.funeral_parent,
    disabled: false
  })

  options.push({
    value: 'funeral_grandparent',
    label: LIFE_EVENT_TYPES.funeral_grandparent,
    disabled: false
  })

  options.push({
    value: 'funeral_sibling',
    label: LIFE_EVENT_TYPES.funeral_sibling,
    disabled: false
  })

  // 分娩、流產、妊娠：僅女性可用
  options.push({
    value: 'maternity',
    label: LIFE_EVENT_TYPES.maternity,
    disabled: gender !== 'female'
  })

  options.push({
    value: 'miscarriage',
    label: LIFE_EVENT_TYPES.miscarriage,
    disabled: gender !== 'female'
  })

  options.push({
    value: 'pregnancy',
    label: LIFE_EVENT_TYPES.pregnancy,
    disabled: gender !== 'female'
  })

  // 配偶分娩或懷孕：僅男性可用
  options.push({
    value: 'paternity',
    label: LIFE_EVENT_TYPES.paternity,
    disabled: gender !== 'male'
  })

  return options
}


