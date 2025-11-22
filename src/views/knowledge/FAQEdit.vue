<template>
  <div class="faq-edit">
    <div class="page-header">
      <h2>編輯 FAQ</h2>
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
      class="faq-form"
    >
      <a-row :gutter="24">
        <a-col :span="12">
          <a-form-item label="問題" name="question">
            <a-input v-model:value="form.question" placeholder="請輸入常見問題" />
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

      <a-form-item label="答案" name="answer">
        <RichTextEditor
          v-model="form.answer"
          :height="400"
          placeholder="請輸入問題答案"
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
import RichTextEditor from '@/components/knowledge/RichTextEditor.vue'

const router = useRouter()
const route = useRoute()
const knowledgeStore = useKnowledgeStore()
const { services, clients, tags } = storeToRefs(knowledgeStore)

const formRef = ref()
const saving = ref(false)

const form = reactive({
  question: '',
  category: '',
  scope: '',
  client: '',
  tags: [],
  answer: ''
})

const rules = {
  question: [
    { required: true, message: '請輸入常見問題', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '請選擇服務類型', trigger: 'change' }
  ],
  scope: [
    { required: true, message: '請選擇層級', trigger: 'change' }
  ],
  answer: [
    { required: true, message: '請輸入問題答案', trigger: 'blur' }
  ]
}

const handleCancel = () => {
  router.back()
}

const handleSave = async () => {
  try {
    await formRef.value.validate()
    saving.value = true
    
    // 這裡應該調用API更新FAQ
    // await knowledgeStore.updateFAQ(route.params.id, form)
    
    message.success('FAQ 更新成功')
    router.push('/knowledge/faq')
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
    
    // 載入FAQ數據
    // const faq = await knowledgeStore.fetchFAQ(route.params.id)
    // Object.assign(form, faq)
  } catch (error) {
    console.error('載入數據失敗:', error)
  }
})
</script>

<style scoped>
.faq-edit {
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

.faq-form {
  max-width: 1200px;
}
</style>









