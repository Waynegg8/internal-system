# TaskConfiguration 模板選擇功能分析報告

## 檢查日期
2025-11-20

## 需求對照
**需求編號**: BR2.4.6  
**需求標題**: 任務模板套用

### 需求要求
1. ✅ 允許選擇任務模板
2. ❌ **優先顯示客戶專屬模板，其次顯示統一模板**（缺失）
3. ✅ 自動填充任務配置
4. ✅ 允許修改任務配置，修改不會影響原始模板

## 當前實現分析

### 已實現功能

#### 1. 模板選擇 UI（✅ 已實現）
- **位置**: `src/components/clients/TaskConfiguration.vue:3-18`
- **實現**: 使用 `a-select` 組件提供模板選擇下拉框
- **狀態**: ✅ 完整實現

```vue
<a-form-item v-if="!hideTemplateSelect" label="從模板選擇（可選）">
  <a-select
    v-model:value="selectedTemplate"
    placeholder="選擇任務模板，或手動配置"
    allow-clear
    @change="handleTemplateChange"
    :options="templateOptions"
    :loading="loadingTemplates"
  />
</a-form-item>
```

#### 2. 模板載入邏輯（✅ 已實現）
- **位置**: `src/components/clients/TaskConfiguration.vue:1494-1513`
- **實現**: 在 `onMounted` 時調用 `fetchTaskTemplates()` 載入所有模板
- **狀態**: ✅ 完整實現

#### 3. 模板套用邏輯（✅ 已實現）
- **位置**: `src/components/clients/TaskConfiguration.vue:717-797`
- **實現**: `handleTemplateChange` 函數處理模板選擇，自動填充任務配置
- **狀態**: ✅ 完整實現

#### 4. 模板修改不影響原始模板（✅ 已實現）
- **位置**: `src/components/clients/TaskConfiguration.vue:736-780`
- **實現**: 模板任務載入時設置 `fromTemplate: true`，但任務數據是獨立的副本
- **狀態**: ✅ 完整實現

### 缺失功能

#### 1. 客戶專屬模板優先級（❌ 缺失）
- **位置**: `src/components/clients/TaskConfiguration.vue:645-677`
- **問題**: `templateOptions` computed 屬性只根據 `service_code` 篩選模板，沒有：
  - 根據 `client_id` 過濾模板
  - 優先顯示客戶專屬模板
  - 排序邏輯（客戶專屬優先，統一模板其次）

**當前實現**:
```javascript
const templateOptions = computed(() => {
  // 只根據 service_code 篩選，沒有考慮 client_id 和優先級
  return allTemplates.value
    .filter(t => {
      // 只檢查 service_code，沒有檢查 client_id
      return templateService.service_code === currentServiceCode
    })
    .map(t => ({
      label: t.template_name,
      value: getId(t, 'template_id', 'id')
    }))
})
```

**應該實現**:
```javascript
const templateOptions = computed(() => {
  // 1. 根據 service_code 篩選模板
  // 2. 根據 client_id 過濾（只顯示統一模板或當前客戶的專屬模板）
  // 3. 排序（客戶專屬優先，統一模板其次）
  // 4. 在 label 中標註模板類型（統一模板/客戶專屬）
})
```

#### 2. 模板類型標註（❌ 缺失）
- **問題**: 下拉選項中沒有標註模板類型（統一模板 vs 客戶專屬模板）
- **影響**: 用戶無法區分模板類型

#### 3. 客戶 ID 過濾（❌ 缺失）
- **問題**: 沒有根據 `props.clientId` 過濾模板
- **影響**: 可能顯示不屬於當前客戶的專屬模板

## 參考實現

### TaskSOPSelector 組件的優先級實現
**位置**: `src/components/clients/TaskSOPSelector.vue:192-206`

```javascript
// 排序後的服務層級 SOP（客戶專屬優先）
const sortedServiceLevelSOPs = computed(() => {
  const sops = [...serviceLevelSOPs.value]
  return sops.sort((a, b) => {
    const aIsClientSpecific = isClientSpecificSOP(a)
    const bIsClientSpecific = isClientSpecificSOP(b)
    
    // 客戶專屬優先
    if (aIsClientSpecific && !bIsClientSpecific) return -1
    if (!aIsClientSpecific && bIsClientSpecific) return 1
    
    // 否則按標題排序
    return getSOPTitle(a).localeCompare(getSOPTitle(b), 'zh-TW')
  })
})
```

**可以參考此實現模式**:
1. 判斷是否為客戶專屬（檢查 `client_id`）
2. 排序時客戶專屬優先
3. 在 label 中標註類型

## 需要修改的地方

### 1. 修改 `templateOptions` computed 屬性
**文件**: `src/components/clients/TaskConfiguration.vue:645-677`

**需要添加**:
- 根據 `props.clientId` 過濾模板（只顯示統一模板或當前客戶的專屬模板）
- 排序邏輯（客戶專屬優先，統一模板其次）
- 在 label 中標註模板類型

### 2. 添加輔助函數
**需要添加**:
- `isClientSpecificTemplate(template)`: 判斷是否為客戶專屬模板
- 模板排序邏輯

## 建議實現方案

### 方案 1: 修改 `templateOptions` computed 屬性

```javascript
// 判斷是否為客戶專屬模板
const isClientSpecificTemplate = (template) => {
  return template.client_id !== null && template.client_id !== undefined
}

// 選項 - 根據 service_code 篩選模板，優先顯示客戶專屬模板
const templateOptions = computed(() => {
  const currentService = allServices.value.find(s => getId(s, 'service_id', 'id') == props.serviceId)
  const currentServiceCode = currentService?.service_code || ''
  
  if (!currentServiceCode) {
    // 如果無法獲取 service_code，回退到只匹配 service_id
    let templates = allTemplates.value.filter(t => t.service_id == props.serviceId)
    
    // 根據 client_id 過濾
    if (props.clientId) {
      templates = templates.filter(t => 
        !t.client_id || String(t.client_id) === String(props.clientId)
      )
    } else {
      // 如果沒有 clientId，只顯示統一模板
      templates = templates.filter(t => !t.client_id)
    }
    
    // 排序：客戶專屬優先
    templates.sort((a, b) => {
      const aIsClientSpecific = isClientSpecificTemplate(a)
      const bIsClientSpecific = isClientSpecificTemplate(b)
      
      if (aIsClientSpecific && !bIsClientSpecific) return -1
      if (!aIsClientSpecific && bIsClientSpecific) return 1
      
      return (a.template_name || '').localeCompare(b.template_name || '', 'zh-TW')
    })
    
    return templates.map(t => ({
      label: `${t.template_name}${isClientSpecificTemplate(t) ? ' (客戶專屬)' : ' (統一模板)'}`,
      value: getId(t, 'template_id', 'id')
    }))
  }
  
  // 根據 service_code 篩選模板
  let templates = allTemplates.value.filter(t => {
    if (!t.service_id) return false
    
    const templateService = allServices.value.find(s => getId(s, 'service_id', 'id') == t.service_id)
    if (!templateService) return false
    
    return templateService.service_code === currentServiceCode
  })
  
  // 根據 client_id 過濾
  if (props.clientId) {
    templates = templates.filter(t => 
      !t.client_id || String(t.client_id) === String(props.clientId)
    )
  } else {
    // 如果沒有 clientId，只顯示統一模板
    templates = templates.filter(t => !t.client_id)
  }
  
  // 排序：客戶專屬優先
  templates.sort((a, b) => {
    const aIsClientSpecific = isClientSpecificTemplate(a)
    const bIsClientSpecific = isClientSpecificTemplate(b)
    
    if (aIsClientSpecific && !bIsClientSpecific) return -1
    if (!aIsClientSpecific && bIsClientSpecific) return 1
    
    return (a.template_name || '').localeCompare(b.template_name || '', 'zh-TW')
  })
  
  return templates.map(t => ({
    label: `${t.template_name}${isClientSpecificTemplate(t) ? ' (客戶專屬)' : ' (統一模板)'}`,
    value: getId(t, 'template_id', 'id')
  }))
})
```

## 總結

### 已實現功能 ✅
1. 模板選擇 UI
2. 模板載入邏輯
3. 模板套用邏輯
4. 模板修改不影響原始模板

### 缺失功能 ❌
1. **客戶專屬模板優先級**（關鍵缺失）
2. **客戶 ID 過濾**（關鍵缺失）
3. **模板類型標註**（次要缺失）

### 優先級
- **高優先級**: 客戶專屬模板優先級、客戶 ID 過濾
- **中優先級**: 模板類型標註

### 建議
需要實現任務 3.6.2 來補充缺失的功能。



