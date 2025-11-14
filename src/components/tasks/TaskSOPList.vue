<template>
  <a-card style="margin-bottom: 24px">
    <template #title>
      <span>關聯的 SOP</span>
    </template>
    <template #extra>
      <a-button type="primary" size="small" @click="handleManageSOP">
        管理 SOP
      </a-button>
    </template>

    <a-spin :spinning="loading">
      <a-empty v-if="!loading && sops.length === 0" description="此任務尚未關聯任何 SOP" />

      <a-list v-else :data-source="sops" :bordered="false">
        <template #renderItem="{ item }">
          <a-list-item>
            <a-list-item-meta>
              <template #title>
                {{ item.title || '未命名' }}
              </template>
              <template #description>
                {{ getCategoryText(item.category) }} • v{{ item.version || '1' }}
              </template>
            </a-list-item-meta>
            <template #actions>
              <a-button type="link" size="small" @click="handleViewSOP(item.id || item.sopId)">
                查看
              </a-button>
            </template>
          </a-list-item>
        </template>
      </a-list>
    </a-spin>

    <!-- 管理 SOP 彈窗 -->
    <ManageSOPModal
      v-model:visible="manageSOPModalVisible"
      :task-id="taskId"
      :selected-sop-ids="selectedSOPIds"
      :all-sops="allSOPs"
      @success="handleSOPUpdateSuccess"
    />
  </a-card>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getCategoryText } from '@/utils/formatters'
import ManageSOPModal from './ManageSOPModal.vue'

const props = defineProps({
  taskId: {
    type: [String, Number],
    required: true
  },
  sops: {
    type: Array,
    default: () => []
  },
  allSOPs: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update'])

const router = useRouter()

// 管理 SOP 彈窗顯示狀態
const manageSOPModalVisible = ref(false)

// 已選中的 SOP ID 列表
const selectedSOPIds = computed(() => {
  return props.sops.map(sop => sop.id || sop.sopId || sop.sop_id)
})

// 處理管理 SOP
const handleManageSOP = () => {
  manageSOPModalVisible.value = true
}

// 處理查看 SOP
const handleViewSOP = (sopId) => {
  router.push(`/knowledge/sop?id=${sopId}`)
}

// 處理 SOP 更新成功
const handleSOPUpdateSuccess = () => {
  manageSOPModalVisible.value = false
  emit('update')
}
</script>

