<template>
  <div class="client-add-basic">
    <a-form
      :model="store.formData"
      :rules="clientFormRules"
      layout="vertical"
      ref="formRef"
    >
      <!-- 公司名稱和客戶編號 -->
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="公司名稱（必填）" name="company_name">
            <a-input
              v-model:value="store.formData.company_name"
              placeholder="請輸入公司名稱"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="客戶編號（必填，8位數字）" name="client_id">
            <a-input
              v-model:value="store.formData.client_id"
              placeholder="8位數字"
              :maxlength="8"
            />
            <div class="form-help-text" style="margin-top: 4px; color: #6b7280; font-size: 12px;">
              <strong>公司客戶：</strong>使用統一編號<br>
              <strong>個人客戶：</strong>點擊下方按鈕自動生成（智能避開合法統編）
            </div>
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 統一編號和產生個人客戶編號按鈕 -->
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="統一編號（選填，個人客戶可不填）" name="tax_id">
            <a-input
              v-model:value="store.formData.tax_id"
              placeholder="8位數字"
              :maxlength="8"
            />
            <div class="form-help-text" style="margin-top: 4px; color: #6b7280; font-size: 12px;">
              填寫統編時會自動同步到客戶編號
            </div>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="&nbsp;">
            <a-button
              type="default"
              block
              @click="handleGenerateClientId"
              :loading="store.loading"
            >
              🔢 產生個人客戶編號
            </a-button>
            <div class="form-help-text" style="margin-top: 4px; color: #6b7280; font-size: 12px;">
              智能生成編號（自動避開合法統編，100%不衝突）
            </div>
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 聯絡人1和聯絡人2 -->
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="公司聯絡人1">
            <a-input
              v-model:value="store.formData.contact_person"
              placeholder="例如：張先生"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="公司聯絡人2">
            <a-input
              v-model:value="store.formData.contact_person_2"
              placeholder="例如：李小姐"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 負責人員和聯絡電話 -->
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="負責人員">
            <a-select
              v-model:value="store.formData.assignee_user_id"
              placeholder="請選擇負責人員"
              :options="userOptions"
              :field-names="{ label: 'name', value: 'id' }"
              allow-clear
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="聯絡電話">
            <a-input
              v-model:value="store.formData.phone"
              placeholder="請輸入聯絡電話"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <!-- Email 和標籤管理 -->
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Email" name="email">
            <a-input
              v-model:value="store.formData.email"
              type="email"
              placeholder="請輸入 Email"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="標籤管理">
            <a-button @click="isTagsModalVisible = true">
              + 管理標籤
            </a-button>
            <!-- 顯示已選標籤 -->
            <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 8px">
              <template v-if="selectedTagObjects.length === 0">
                <span style="color: #9ca3af; font-size: 12px">尚未設定標籤</span>
              </template>
              <template v-else>
                <a-tag
                  v-for="tag in selectedTagObjects"
                  :key="tag.tag_id"
                  :color="getTagColor(tag.tag_color)"
                >
                  {{ tag.tag_name }}
                </a-tag>
              </template>
            </div>
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 客戶備註 -->
      <a-row>
        <a-col :span="24">
          <a-form-item label="客戶備註">
            <a-textarea
              v-model:value="store.formData.notes"
              :rows="3"
              placeholder="請輸入客戶備註"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 收款備註 -->
      <a-row>
        <a-col :span="24">
          <a-form-item label="收款備註">
            <a-textarea
              v-model:value="store.formData.billing_notes"
              :rows="3"
              placeholder="請輸入收款備註"
            />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <!-- 標籤管理 Modal -->
    <ClientAddTagsModal v-model:visible="isTagsModalVisible" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useClientAddStore } from '@/stores/clientAdd'
import { clientFormRules } from '@/utils/validation'
import { usePageAlert } from '@/composables/usePageAlert'
import ClientAddTagsModal from '@/components/clients/ClientAddTagsModal.vue'

const store = useClientAddStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()
const formRef = ref(null)

// 標籤 Modal 顯示狀態
const isTagsModalVisible = ref(false)

// 用戶選項（用於下拉選單）
const userOptions = computed(() => {
  return store.supportData.users || []
})

// 已選標籤對象（computed）
const selectedTagObjects = computed(() => {
  return store.supportData.tags.filter(tag => 
    store.formData.selected_tags.includes(tag.tag_id)
  )
})

// 顏色映射（將顏色名稱轉換為 hex 值）
const colorMap = {
  blue: '#3b82f6',
  green: '#10b981',
  red: '#ef4444',
  orange: '#f59e0b',
  purple: '#8b5cf6',
  pink: '#ec4899',
  cyan: '#06b6d4',
  lime: '#84cc16',
  gray: '#6b7280'
}

// 獲取標籤顏色（如果是顏色名稱則轉換，否則直接返回）
const getTagColor = (color) => {
  if (!color) return colorMap.blue
  return colorMap[color] || color
}

// 處理產生個人客戶編號
const handleGenerateClientId = async () => {
  try {
    await store.getNextClientId()
    showSuccess('客戶編號已生成')
  } catch (error) {
    showError(error.message || '生成客戶編號失敗')
  }
}

// 監聽統一編號變化，自動同步到客戶編號
watch(
  () => store.formData.tax_id,
  (newTaxId) => {
    // 如果統一編號是8位數字，且客戶編號為空，則自動同步
    if (newTaxId && newTaxId.length === 8 && /^\d{8}$/.test(newTaxId)) {
      if (!store.formData.client_id || store.formData.client_id === '') {
        store.formData.client_id = newTaxId
      }
    }
  }
)

// 監聽客戶編號變化，自動同步到統編（公司客戶）
watch(
  () => store.formData.client_id,
  (newClientId) => {
    // 如果客戶編號是8位數字（公司統編格式），且統編為空，則自動同步
    if (newClientId && newClientId.length === 8 && /^\d{8}$/.test(newClientId)) {
      if (!store.formData.tax_id || store.formData.tax_id === '') {
        store.formData.tax_id = newClientId
      }
    }
  }
)

// 組件掛載時載入支持數據
onMounted(() => {
  store.fetchSupportData()
})
</script>

<style scoped>
.client-add-basic {
  padding: 0;
}

.form-help-text {
  margin-top: 4px;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.5;
}
</style>
