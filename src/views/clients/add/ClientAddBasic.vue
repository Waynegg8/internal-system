<template>
  <div class="client-add-basic">
    <a-form
      :model="store.formData"
      :rules="clientFormRules"
      layout="vertical"
      ref="formRef"
    >
      <!-- 公司名稱和統一編號 -->
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
          <a-form-item label="統一編號（必填）" name="tax_id">
            <a-input
              v-model:value="store.formData.tax_id"
              placeholder="企業客戶：8碼數字；個人客戶：10碼身分證"
              :maxlength="10"
              style="font-family: monospace"
            />
            <div class="form-help-text" style="margin-top: 4px; color: #6b7280; font-size: 12px;">
              <strong>企業客戶：</strong>輸入8碼統一編號（系統自動加前綴00）<br>
              <strong>個人客戶：</strong>輸入10碼身分證號
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

      <!-- Email 和主要聯絡方式 -->
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
          <a-form-item label="主要聯絡方式">
            <a-select
              v-model:value="store.formData.primary_contact_method"
              placeholder="請選擇主要聯絡方式"
              allow-clear
            >
              <a-select-option value="line">LINE</a-select-option>
              <a-select-option value="phone">電話</a-select-option>
              <a-select-option value="email">Email</a-select-option>
              <a-select-option value="other">其他</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>

      <!-- LINE ID 和標籤管理 -->
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="LINE ID">
            <a-input
              v-model:value="store.formData.line_id"
              placeholder="請輸入 LINE ID"
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

      <!-- 公司負責人和公司地址 -->
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="公司負責人">
            <a-input
              v-model:value="store.formData.company_owner"
              placeholder="請輸入公司負責人姓名"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="公司地址">
            <a-input
              v-model:value="store.formData.company_address"
              placeholder="請輸入公司地址"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 資本額 -->
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="資本額（新台幣元）">
            <a-input-number
              v-model:value="store.formData.capital_amount"
              :min="0"
              :precision="0"
              placeholder="請輸入資本額"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 股東持股資訊 -->
      <a-row>
        <a-col :span="24">
          <a-form-item>
            <ShareholdersEditor v-model="store.formData.shareholders" />
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 董監事資訊 -->
      <a-row>
        <a-col :span="24">
          <a-form-item>
            <DirectorsSupervisorsEditor v-model="store.formData.directors_supervisors" />
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

    <!-- 保存按鈕 -->
    <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #f0f0f0; display: flex; justify-content: flex-end; gap: 12px">
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :loading="store.loading" @click="handleSave">
        保存基本資訊
      </a-button>
    </div>

    <!-- 標籤管理 Modal -->
    <ClientAddTagsModal v-model:visible="isTagsModalVisible" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useClientAddStore } from '@/stores/clientAdd'
import { clientFormRules } from '@/utils/validation'
import { usePageAlert } from '@/composables/usePageAlert'
import ClientAddTagsModal from '@/components/clients/ClientAddTagsModal.vue'
import ShareholdersEditor from '@/components/clients/ShareholdersEditor.vue'
import DirectorsSupervisorsEditor from '@/components/clients/DirectorsSupervisorsEditor.vue'

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


// 處理保存基本資訊
const handleSave = async () => {
  try {
    // 驗證表單
    await formRef.value?.validate()
    
    // 保存基本資訊
    const clientId = await store.saveBasicInfo()
    
    showSuccess('基本資訊保存成功！')
    
    // 如果客戶已創建，可以選擇跳轉到客戶詳情頁或繼續編輯其他分頁
    // 這裡我們讓用戶繼續編輯，不自動跳轉
  } catch (error) {
    if (error.errorFields) {
      // 表單驗證錯誤
      showError('請檢查表單輸入')
    } else {
      showError(error.message || '保存失敗')
    }
  }
}

// 處理取消
const handleCancel = () => {
  // 可以選擇清除表單或返回列表
  // 這裡我們返回列表
  window.history.back()
}

// 統一編號就是客戶編號，不需要同步邏輯

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
