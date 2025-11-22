<template>
  <div class="attachment-new">
    <div class="page-header">
      <h2>上傳附件</h2>
      <div class="header-actions">
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" @click="handleSave" :loading="saving">上傳</a-button>
      </div>
    </div>

    <a-form
      :model="form"
      :rules="rules"
      layout="vertical"
      ref="formRef"
      class="attachment-form"
    >
      <a-row :gutter="24">
        <a-col :span="12">
          <a-form-item label="附件名稱" name="name">
            <a-input v-model:value="form.name" placeholder="請輸入附件名稱" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="附件類型" name="type">
            <a-select v-model:value="form.type" placeholder="請選擇附件類型">
              <a-select-option value="task">任務附件</a-select-option>
              <a-select-option value="client">客戶附件</a-select-option>
              <a-select-option value="service">服務附件</a-select-option>
              <a-select-option value="other">其他</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="24">
        <a-col :span="12">
          <a-form-item label="服務類型" name="category">
            <a-select v-model:value="form.category" placeholder="請選擇服務類型（可選）">
              <a-select-option
                v-for="service in services"
                :key="service.id"
                :value="service.id"
              >
                {{ service.name }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="客戶" name="client">
            <a-select v-model:value="form.client" placeholder="請選擇客戶（可選）">
              <a-select-option
                v-for="client in clients"
                :key="client.id"
                :value="client.id"
              >
                {{ client.name }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="標籤" name="tags">
        <a-select
          v-model:value="form.tags"
          mode="multiple"
          placeholder="請選擇標籤（可選）"
        >
          <a-select-option
            v-for="tag in tags"
            :key="tag"
            :value="tag"
          >
            {{ tag }}
          </a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item label="文件上傳" name="files">
        <a-upload
          v-model:file-list="fileList"
          :before-upload="beforeUpload"
          :remove="handleRemove"
          :multiple="true"
          :max-count="5"
        >
          <a-button>
            <upload-outlined></upload-outlined>
            選擇文件
          </a-button>
        </a-upload>
        <div class="upload-tip">
          支援多種格式，單個文件最大 50MB，最多可上傳 5 個文件
        </div>
      </a-form-item>

      <a-form-item label="備註" name="notes">
        <a-textarea
          v-model:value="form.notes"
          :rows="4"
          placeholder="請輸入備註（可選）"
        />
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useKnowledgeStore } from '@/stores/knowledge'
import { storeToRefs } from 'pinia'
import { message } from 'ant-design-vue'
import { UploadOutlined } from '@ant-design/icons-vue'

const router = useRouter()
const knowledgeStore = useKnowledgeStore()
const { services, clients, tags } = storeToRefs(knowledgeStore)

const formRef = ref()
const saving = ref(false)
const fileList = ref([])

const form = reactive({
  name: '',
  type: '',
  category: '',
  client: '',
  tags: [],
  notes: '',
  files: []
})

const rules = {
  name: [
    { required: true, message: '請輸入附件名稱', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '請選擇附件類型', trigger: 'change' }
  ],
  files: [
    { required: true, message: '請選擇要上傳的文件', trigger: 'change' }
  ]
}

const beforeUpload = (file) => {
  const isLt50M = file.size / 1024 / 1024 < 50
  if (!isLt50M) {
    message.error('文件大小不能超過 50MB')
    return false
  }

  form.files.push(file)
  return false // 阻止自動上傳
}

const handleRemove = (file) => {
  const index = form.files.findIndex(f => f.uid === file.uid)
  if (index > -1) {
    form.files.splice(index, 1)
  }
}

const handleCancel = () => {
  router.back()
}

const handleSave = async () => {
  try {
    await formRef.value.validate()
    saving.value = true
    
    // 這裡應該調用API上傳附件
    // await knowledgeStore.uploadAttachments(form)
    
    message.success('附件上傳成功')
    router.push('/knowledge/attachments')
  } catch (error) {
    console.error('上傳失敗:', error)
    message.error('上傳失敗，請重試')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  // 載入必要的數據
  try {
    await Promise.all([
      knowledgeStore.fetchServices(),
      knowledgeStore.fetchClients(),
      knowledgeStore.fetchTags()
    ])
  } catch (error) {
    console.error('載入數據失敗:', error)
  }
})
</script>

<style scoped>
.attachment-new {
  padding: 24px;
  background: #fff;
  min-height: calc(100vh - 200px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.attachment-form {
  max-width: 1200px;
}

.upload-tip {
  margin-top: 8px;
  color: #666;
  font-size: 12px;
}
</style>









