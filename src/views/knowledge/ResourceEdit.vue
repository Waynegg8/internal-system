<template>
  <div class="resource-edit">
    <div class="page-header">
      <h2>編輯資源</h2>
      <div class="header-actions">
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" @click="handleSave" :loading="saving">儲存</a-button>
      </div>
    </div>

    <a-form
      :model="form"
      :rules="rules"
      layout="vertical"
      ref="formRef"
      class="resource-form"
    >
      <a-row :gutter="24">
        <a-col :span="12">
          <a-form-item label="標題" name="title">
            <a-input v-model:value="form.title" placeholder="請輸入資源標題" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="服務類型" name="category">
            <a-select v-model:value="form.category" placeholder="請選擇服務類型">
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
      </a-row>

      <a-row :gutter="24">
        <a-col :span="12">
          <a-form-item label="層級" name="scope">
            <a-select v-model:value="form.scope" placeholder="請選擇層級">
              <a-select-option value="service">服務層級</a-select-option>
              <a-select-option value="task">任務層級</a-select-option>
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

      <a-form-item label="當前文件" v-if="currentFile">
        <div class="current-file">
          <FileOutlined style="margin-right: 8px" />
          {{ currentFile.name }}
          <a-button type="link" size="small" @click="downloadCurrentFile">下載</a-button>
        </div>
      </a-form-item>

      <a-form-item label="更換文件（可選）" name="file">
        <a-upload
          v-model:file-list="fileList"
          :before-upload="beforeUpload"
          :remove="handleRemove"
          :multiple="false"
          :max-count="1"
        >
          <a-button>
            <upload-outlined></upload-outlined>
            選擇新文件
          </a-button>
        </a-upload>
        <div class="upload-tip">
          支援格式：PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT（最大 10MB）
        </div>
      </a-form-item>

      <a-form-item label="描述" name="description">
        <a-textarea
          v-model:value="form.description"
          :rows="4"
          placeholder="請輸入資源描述（可選）"
        />
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useKnowledgeStore } from '@/stores/knowledge'
import { storeToRefs } from 'pinia'
import { message } from 'ant-design-vue'
import { UploadOutlined, FileOutlined } from '@ant-design/icons-vue'

const router = useRouter()
const route = useRoute()
const knowledgeStore = useKnowledgeStore()
const { services, clients, tags } = storeToRefs(knowledgeStore)

const formRef = ref()
const saving = ref(false)
const fileList = ref([])
const currentFile = ref(null)

const form = reactive({
  title: '',
  category: '',
  scope: '',
  client: '',
  tags: [],
  description: '',
  file: null
})

const rules = {
  title: [
    { required: true, message: '請輸入資源標題', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '請選擇服務類型', trigger: 'change' }
  ],
  scope: [
    { required: true, message: '請選擇層級', trigger: 'change' }
  ]
}

const beforeUpload = (file) => {
  const isValidType = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
  ].includes(file.type)

  if (!isValidType) {
    message.error('只能上傳 PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT 格式的文件')
    return false
  }

  const isLt10M = file.size / 1024 / 1024 < 10
  if (!isLt10M) {
    message.error('文件大小不能超過 10MB')
    return false
  }

  form.file = file
  return false // 阻止自動上傳
}

const handleRemove = () => {
  form.file = null
}

const downloadCurrentFile = () => {
  // 下載當前文件
  console.log('下載當前文件:', currentFile.value)
}

const handleCancel = () => {
  router.back()
}

const handleSave = async () => {
  try {
    await formRef.value.validate()
    saving.value = true
    
    // 這裡應該調用API更新資源
    // await knowledgeStore.updateResource(route.params.id, form)
    
    message.success('資源更新成功')
    router.push('/knowledge/resources')
  } catch (error) {
    console.error('更新失敗:', error)
    message.error('更新失敗，請重試')
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
    
    // 載入資源數據
    // const resource = await knowledgeStore.fetchResource(route.params.id)
    // Object.assign(form, resource)
    // currentFile.value = resource.file
  } catch (error) {
    console.error('載入數據失敗:', error)
  }
})
</script>

<style scoped>
.resource-edit {
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

.resource-form {
  max-width: 1200px;
}

.current-file {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 4px;
}

.upload-tip {
  margin-top: 8px;
  color: #666;
  font-size: 12px;
}
</style>









