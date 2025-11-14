<template>
  <div class="templates-table">
    <a-collapse v-model:activeKey="activeKeys" :bordered="false">
      <a-collapse-panel
        v-for="group in groupedTemplates"
        :key="group.serviceId"
        :header="groupHeader(group)"
      >
        <a-table
          :columns="columns"
          :data-source="group.templates"
          :loading="loading"
          :pagination="false"
          row-key="template_id"
          size="middle"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'template_name'">
              <strong>{{ record.template_name || record.templateName }}</strong>
            </template>

            <template v-else-if="column.key === 'service_name'">
              {{ record.service_name || record.serviceName || '—' }}
            </template>

            <template v-else-if="column.key === 'client_name'">
              <span v-if="record.client_name || record.clientName">
                {{ record.client_name || record.clientName }}
              </span>
              <span v-else style="color: #999">通用</span>
            </template>

            <template v-else-if="column.key === 'stages_count'">
              <span style="text-align: center; display: block">
                {{ record.stages_count || record.stagesCount || 0 }}
              </span>
            </template>

            <template v-else-if="column.key === 'actions'">
              <a-space>
                <a-button size="small" @click="handleView(record)">查看</a-button>
                <a-button size="small" @click="handleEdit(record)">編輯</a-button>
                <a-button size="small" danger @click="handleDelete(getTemplateId(record))">刪除</a-button>
              </a-space>
            </template>
          </template>

          <template #emptyText>
            <a-empty description="暫無模板" />
          </template>
        </a-table>
      </a-collapse-panel>
    </a-collapse>

    <div v-if="!groupedTemplates || groupedTemplates.length === 0" class="empty-state">
      <a-empty description="暫無模板" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { QuestionCircleOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  templates: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['view', 'edit', 'delete'])

// 展開的分組 keys
const activeKeys = ref([])

// 表格列定義
const columns = [
  {
    title: '模板名稱',
    key: 'template_name',
    dataIndex: 'template_name'
  },
  {
    title: '服務類型',
    key: 'service_name',
    dataIndex: 'service_name',
    width: 200
  },
  {
    title: '綁定客戶',
    key: 'client_name',
    dataIndex: 'client_name',
    width: 200
  },
  {
    title: '任務階段數',
    key: 'stages_count',
    dataIndex: 'stages_count',
    width: 120,
    align: 'center'
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    align: 'center'
  }
]

// 按服務類型分組模板
const groupedTemplates = computed(() => {
  const groups = {}
  
  props.templates.forEach(template => {
    const serviceId = template.service_id || template.serviceId
    const serviceName = template.service_name || template.serviceName || '未分類'
    
    if (!groups[serviceId]) {
      groups[serviceId] = {
        serviceId: serviceId || 'uncategorized',
        serviceName,
        templates: []
      }
    }
    
    groups[serviceId].templates.push(template)
  })
  
  // 轉換為數組並排序
  const result = Object.values(groups).sort((a, b) => {
    if (a.serviceId === 'uncategorized') return 1
    if (b.serviceId === 'uncategorized') return -1
    return (a.serviceName || '').localeCompare(b.serviceName || '')
  })
  
  return result
})

// 監控分組變化，自動展開所有分組
watch(
  () => groupedTemplates.value,
  (newGroups) => {
    if (newGroups && newGroups.length > 0) {
      // 自動展開所有服務類別
      activeKeys.value = newGroups.map(g => g.serviceId)
    }
  },
  { immediate: true }
)

// 分組標題
const groupHeader = (group) => {
  const count = group.templates.length
  return `${group.serviceName} (${count} 個模板)`
}

// 獲取模板 ID（處理字段名差異）
const getTemplateId = (template) => {
  return template.template_id || template.templateId
}

// 處理查看
const handleView = (template) => {
  emit('view', template)
}

// 處理編輯
const handleEdit = (template) => {
  emit('edit', template)
}

// 處理刪除
const handleDelete = (templateId) => {
  emit('delete', templateId)
}
</script>

<style scoped>
.templates-table {
  width: 100%;
}

.empty-state {
  padding: 40px 0;
  text-align: center;
}

:deep(.ant-collapse-header) {
  font-weight: 500;
}

:deep(.ant-table) {
  background: transparent;
}
</style>

