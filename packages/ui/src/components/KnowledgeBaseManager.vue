<template>
  <ToastUI>
    <NModal
        :show="show"
        preset="card"
        :style="{ width: '90vw', maxWidth: '1000px', maxHeight: '90vh' }"
        content-style="padding: 0; display: flex; flex-direction: column; height: min(75vh, 800px); overflow: hidden;"
        :title="t('knowledge.title')"
        size="large"
        :bordered="false"
        :segmented="true"
        @update:show="(value) => !value && close()"
    >
      <template #header-extra>
        <NButton type="primary" @click="openAddModal" ghost>
          <template #icon>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-4 w-4"
            >
              <path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/>
              <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
              <path d="M3 15h6"/>
              <path d="M6 12v6"/>
            </svg>
          </template>
          {{ t('knowledge.add') }}
        </NButton>
      </template>

      <div class="knowledge-base-manager-content">
        <NTabs v-model:value="activeTab" type="segment" size="small" animated>
          <NTabPane name="list" :tab="t('knowledge.list')"/>
          <NTabPane name="test" :tab="t('knowledge.connectionTest')"/>
          <NTabPane name="templates" :tab="t('testKnowledgeBase.template')"/>
        </NTabs>

        <div class="knowledge-base-panel">
          <!-- 知识库列表 -->
          <div v-show="activeTab === 'list'" class="list-panel">
            <div v-if="loading" class="loading-container">
              <NSpin size="medium"/>
            </div>
            <div v-else-if="configs.length === 0" class="empty-container">
              <NEmpty :description="t('knowledge.noResults')">
                <template #extra>
                  <NButton size="small" type="primary" @click="openAddModal">
                    {{ t('knowledge.add') }}
                  </NButton>
                </template>
              </NEmpty>
            </div>
            <div v-else class="config-list">
              <NCard
                  v-for="config in configs"
                  :key="config.id"
                  hoverable
                  class="config-card"
                  :style="{ opacity: config.enabled ? 1 : 0.6 }"
              >
                <div class="config-card-header">
                  <div class="config-name">
                    <span class="name-text">{{ config.name }}</span>
                    <NTag v-if="config.enabled" type="success" size="small" round>
                      {{ t('knowledge.enabled') }}
                    </NTag>
                    <NTag v-else type="default" size="small" round>
                      {{ t('knowledge.disabled') }}
                    </NTag>
                  </div>
                  <div class="config-actions">
                    <NButton
                        size="small"
                        quaternary
                        @click="handleTestConnection(config)"
                        :loading="testingId === config.id"
                    >
                      {{ t('knowledge.testConnection') }}
                    </NButton>
                    <NButton
                        size="small"
                        quaternary
                        @click="handleEdit(config)"
                    >
                      {{ t('common.edit') }}
                    </NButton>
                    <NPopconfirm
                        @positive-click="handleDelete(config.id)"
                        positive-text="{{ t('common.confirm') }}"
                        negative-text="{{ t('common.cancel') }}"
                    >
                      <template #trigger>
                        <NButton size="small" quaternary type="error">
                          {{ t('knowledge.delete') }}
                        </NButton>
                      </template>
                      {{ t('knowledge.deleteConfirm') }}
                    </NPopconfirm>
                  </div>
                </div>
                <div class="config-info">
                  <div class="info-item">
                    <span class="info-label">{{ t('knowledge.spaceId') }}:</span>
                    <span class="info-value">{{ config.spaceId }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">{{ t('knowledge.knowledgeBaseId') }}:</span>
                    <span class="info-value">{{ config.knowledgeBaseId }}</span>
                  </div>
                </div>
              </NCard>
            </div>
          </div>

          <!-- 测试面板 -->
          <div v-show="activeTab === 'test'" class="test-panel">
            <NCard embedded size="small" :bordered="false">
              <div class="test-section">
                <h4 class="test-section-title">{{ t('knowledge.connectionTest') }}</h4>
                <p class="test-section-hint">{{ t('knowledge.connectionTestHint') }}</p>
                <div class="test-form">
                  <NFormItem :label="t('knowledge.name')">
                    <NInput v-model:value="testForm.name" :placeholder="t('knowledge.namePlaceholder')"/>
                  </NFormItem>
                  <NFormItem :label="t('knowledge.accessKeyId')">
                    <NInput v-model:value="testForm.accessKeyId" :placeholder="t('knowledge.accessKeyIdPlaceholder')"/>
                  </NFormItem>
                  <NFormItem :label="t('knowledge.accessKeySecret')">
                    <NInput v-model:value="testForm.accessKeySecret" type="password"
                            :placeholder="t('knowledge.accessKeySecretPlaceholder')" show-password-on="click"/>
                  </NFormItem>
                  <NFormItem :label="t('knowledge.spaceId')">
                    <NInput v-model:value="testForm.spaceId" :placeholder="t('knowledge.spaceIdPlaceholder')"/>
                  </NFormItem>
                  <NFormItem :label="t('knowledge.knowledgeBaseId')">
                    <NInput v-model:value="testForm.knowledgeBaseId"
                            :placeholder="t('knowledge.knowledgeBaseIdPlaceholder')"/>
                  </NFormItem>
                  <NButton
                      type="primary"
                      @click="handleTestConnectionForm"
                      :loading="testingForm"
                      :disabled="!testForm.accessKeyId || !testForm.accessKeySecret || !testForm.spaceId"
                  >
                    {{ t('knowledge.testConnection') }}
                  </NButton>
                </div>
              </div>

              <NDivider/>

              <div class="test-section">
                <h4 class="test-section-title">{{ t('knowledge.searchTest') }}</h4>
                <p class="test-section-hint">{{ t('knowledge.searchTestHint') }}</p>
                <div class="test-form">
                  <NFormItem :label="t('knowledge.searchPlaceholder')">
                    <NInput
                        v-model:value="testSearchQuery"
                        type="textarea"
                        :placeholder="t('knowledge.searchPlaceholder')"
                        :rows="3"
                    />
                  </NFormItem>
                  <NButton
                      type="primary"
                      @click="handleTestSearch"
                      :loading="searching"
                      :disabled="!testSearchQuery || !testForm.accessKeyId || !testForm.accessKeySecret || !testForm.spaceId"
                  >
                    {{ t('knowledge.testSearch') }}
                  </NButton>
                </div>
              </div>

              <NDivider v-if="searchResults.length > 0"/>

              <div v-if="searchResults.length > 0" class="search-results">
                <h4 class="test-section-title">{{ t('knowledge.searchResults') }}</h4>
                <div
                    v-for="result in searchResults"
                    :key="result.id"
                    class="search-result-item"
                >
                  <div class="result-score">Score: {{ (result.score * 100).toFixed(1) }}%</div>
                  <div class="result-content">{{ result.content }}</div>
                </div>
              </div>
            </NCard>
          </div>

          <!-- 模板配置面板 -->
          <div v-show="activeTab === 'templates'" class="templates-panel">
            <NCard embedded size="small" :bordered="false">
              <div class="templates-header">
                <NText depth="2">{{ t('testKnowledgeBase.template') }}</NText>
                <NButton size="small" type="primary" @click="addTemplate">
                  {{ t('common.add') }}
                </NButton>
              </div>
              <NDivider/>
              <NFlex vertical :size="12">
                <div
                    v-for="opt in globalSettings.state.knowledgeBaseTemplateOptions"
                    :key="opt.value"
                    class="template-item"
                >
                  <div class="template-item-header">
                    <NText strong>{{ opt.label }}</NText>
                    <NFlex :size="4">
                      <NButton size="tiny" quaternary @click="editTemplate(opt)">
                        <NIcon>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path
                                d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                          </svg>
                        </NIcon>
                      </NButton>
                      <NButton
                          size="tiny"
                          quaternary
                          type="error"
                          :disabled="globalSettings.state.knowledgeBaseTemplateOptions.length <= 1"
                          @click="deleteTemplate(opt)"
                      >
                        <NIcon>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd"
                                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                  clip-rule="evenodd"/>
                          </svg>
                        </NIcon>
                      </NButton>
                    </NFlex>
                  </div>
                  <NText depth="3" style="font-size: 12px; white-space: pre-wrap; word-break: break-all;">
                    {{ opt.value }}
                  </NText>
                </div>
              </NFlex>
            </NCard>
          </div>
        </div>
      </div>
    </NModal>

    <!-- 编辑弹窗 -->
    <NModal
        v-model:show="showEditModal"
        preset="card"
        :style="{ width: '700px' }"
        :title="editingConfig ? t('knowledge.edit') : t('knowledge.add')"
        size="small"
        :bordered="false"
    >
      <div class="edit-form">
        <NForm label-placement="left">
          <NFormItem :label="t('knowledge.name')" required>
            <NInput v-model:value="editForm.name" :placeholder="t('knowledge.namePlaceholder')"/>
          </NFormItem>
          <NFormItem :label="t('knowledge.enabled')">
            <NSwitch :value="editForm.enabled" @update:value="val => { editForm.enabled = val }"/>
          </NFormItem>
          <NFormItem :label="t('knowledge.rerank')">
            <NSwitch :value="editForm.rerank" @update:value="val => { editForm.rerank = val }"/>
          </NFormItem>
          <NFormItem :label="t('knowledge.accessKeyId')" required>
            <NInput v-model:value="editForm.accessKeyId" :placeholder="t('knowledge.accessKeyIdPlaceholder')"/>
          </NFormItem>
          <NFormItem :label="t('knowledge.accessKeySecret')" required>
            <NInput v-model:value="editForm.accessKeySecret" type="password"
                    :placeholder="t('knowledge.accessKeySecretPlaceholder')" show-password-on="click"/>
          </NFormItem>
          <NFormItem :label="t('knowledge.spaceId')" required>
            <NInput v-model:value="editForm.spaceId" :placeholder="t('knowledge.spaceIdPlaceholder')"/>
          </NFormItem>
          <NFormItem :label="t('knowledge.knowledgeBaseId')" required>
            <NInput v-model:value="editForm.knowledgeBaseId" :placeholder="t('knowledge.knowledgeBaseIdPlaceholder')"/>
          </NFormItem>
          <NFormItem :label="t('knowledge.defaultRegion')">
            <NInput v-model:value="editForm.defaultRegion" :placeholder="t('knowledge.defaultRegionPlaceholder')"
                    readonly/>
          </NFormItem>
          <NFormItem :label="t('knowledge.defaultTopK')">
            <NInputNumber v-model:value="editForm.defaultTopK" :min="1" :max="20"/>
          </NFormItem>
          <NFormItem :label="t('knowledge.defaultMinScore')">
            <NInputNumber v-model:value="editForm.defaultMinScore" :min="0" :max="1" :step="0.1"/>
          </NFormItem>
        </NForm>
      </div>
      <template #footer>
        <div class="edit-form-actions">
          <NButton @click="showEditModal = false">{{ t('common.cancel') }}</NButton>
          <NButton type="primary" @click="handleSave" :loading="saving">
            {{ t('common.save') }}
          </NButton>
        </div>
      </template>
    </NModal>

    <!-- 模板编辑弹窗 -->
    <NModal
        v-model:show="showTemplateEditModal"
        preset="card"
        :style="{ width: '600px', maxWidth: '90vw;' }"
        :title="editingTemplate ? t('common.edit') : t('common.add')"
    >
      <NForm label-placement="top">
        <NFormItem :label="t('testKnowledgeBase.template') + ' Name'">
          <NInput v-model:value="templateEditLabel" placeholder="Template name"/>
        </NFormItem>
        <NFormItem :label="t('testKnowledgeBase.template')">
          <NInput
              v-model:value="templateEditValue"
              type="textarea"
              :rows="6"
              placeholder="{context}&#10;&#10;---&#10;&#10;{query}"
          />
        </NFormItem>
        <NText depth="3" style="font-size: 12px;">
          {context} = Knowledge base result, {query} = User input
        </NText>
      </NForm>
      <template #footer>
        <NFlex justify="end" :size="8">
          <NButton @click="showTemplateEditModal = false">{{ t('common.cancel') }}</NButton>
          <NButton type="primary" @click="saveTemplate">{{ t('common.save') }}</NButton>
        </NFlex>
      </template>
    </NModal>
  </ToastUI>
</template>

<script setup lang="ts">
import {inject, onMounted, ref, reactive, computed, type Ref} from 'vue'
import {useI18n} from 'vue-i18n';
import {
  NButton,
  NCard,
  NModal,
  NTabs,
  NTabPane,
  NEmpty,
  NSpin,
  NTag,
  NPopconfirm,
  NFormItem,
  NInput,
  NSwitch,
  NInputNumber,
  NDivider,
  NIcon,
  NText,
  NFlex,
  NForm
} from 'naive-ui'
import type {KnowledgeBaseConfig} from '@prompt-optimizer/core'
import type {AppServices} from '../types/services'


import {useToast} from '@/composables';
import {useGlobalSettings} from '@/stores/settings/useGlobalSettings';

interface Props {
  show: boolean
}

interface Emits {
  (e: 'close'): void

  (e: 'update:show', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const {t} = useI18n()
const message = useToast();

const services = inject<Ref<AppServices | null>>('services')
if (!services?.value) {
  throw new Error('Services not provided!')
}

const knowledgeManager = computed(() => services.value?.knowledgeManager)

const activeTab = ref<'list' | 'test' | 'templates'>('list')
const loading = ref(false)
const configs = ref<KnowledgeBaseConfig[]>([])
const testingId = ref<string | null>(null)
const testingForm = ref(false)
const searching = ref(false)
const showEditModal = ref(false)
const editingConfig = ref<KnowledgeBaseConfig | null>(null)
const saving = ref(false)

const searchResults = ref<Array<{ id: string; content: string; score: number; metadata?: Record<string, unknown> }>>([])

// Global settings store for template management
const globalSettings = useGlobalSettings()

// Template editing state
const showTemplateEditModal = ref(false)
const editingTemplate = ref<{ label: string; value: string } | null>(null)
const templateEditLabel = ref('')
const templateEditValue = ref('')

const testSearchQuery = ref('')

const testForm = reactive({
  name: '',
  accessKeyId: '',
  accessKeySecret: '',
  spaceId: '',
  knowledgeBaseId: '',
  defaultRegion: 'cn-beijing',
})

const editForm = reactive({
  id: '',
  name: '',
  enabled: true,
  accessKeyId: '',
  accessKeySecret: '',
  spaceId: '',
  knowledgeBaseId: '',
  defaultRegion: 'cn-beijing',
  defaultTopK: 5,
  defaultMinScore: 0.5,
  rerank: false,
})

const loadConfigs = async () => {
  if (!knowledgeManager.value) return
  loading.value = true
  try {
    configs.value = await knowledgeManager.value.getAllConfigs()
  } catch (error) {
    console.error('[KnowledgeBaseManager] Failed to load configs:', error)
    message.error(String(error))
  } finally {
    loading.value = false
  }
}

const openAddModal = () => {
  editingConfig.value = null
  editForm.id = ''
  editForm.name = ''
  editForm.enabled = true
  editForm.accessKeyId = ''
  editForm.accessKeySecret = ''
  editForm.spaceId = ''
  editForm.knowledgeBaseId = ''
  editForm.defaultRegion = 'cn-beijing'
  editForm.defaultTopK = 5
  editForm.defaultMinScore = 0.5
  editForm.rerank = false
  showEditModal.value = true
}

const handleEdit = (config: KnowledgeBaseConfig) => {
  // 深拷贝以避免响应式问题
  const configCopy = JSON.parse(JSON.stringify(config))
  editingConfig.value = configCopy
  editForm.id = configCopy.id
  editForm.name = configCopy.name
  editForm.enabled = configCopy.enabled
  editForm.accessKeyId = configCopy.accessKeyId
  editForm.accessKeySecret = configCopy.accessKeySecret
  editForm.spaceId = configCopy.spaceId
  editForm.knowledgeBaseId = configCopy.knowledgeBaseId
  editForm.defaultRegion = configCopy.defaultRegion || 'cn-beijing'
  editForm.defaultTopK = configCopy.defaultTopK ?? 5
  editForm.defaultMinScore = configCopy.defaultMinScore ?? 0.5
  editForm.rerank = configCopy.rerank ?? false
  showEditModal.value = true
}

const handleSave = async () => {
  if (!editForm.name || !editForm.accessKeyId || !editForm.accessKeySecret || !editForm.spaceId || !editForm.knowledgeBaseId) {
    message.warning('Please fill in all required fields')
    return
  }

  saving.value = true
  try {
    const configToSave: KnowledgeBaseConfig = {
      id: editForm.id || `kb_${Date.now()}`,
      name: editForm.name,
      enabled: editForm.enabled,
      accessKeyId: editForm.accessKeyId,
      accessKeySecret: editForm.accessKeySecret,
      spaceId: editForm.spaceId,
      knowledgeBaseId: editForm.knowledgeBaseId,
      defaultRegion: editForm.defaultRegion,
      defaultTopK: editForm.defaultTopK,
      defaultMinScore: editForm.defaultMinScore,
      rerank: editForm.rerank,
    }

    await knowledgeManager.value?.saveConfig(configToSave)
    showEditModal.value = false
    await loadConfigs()
    message.success('保存成功')
  } catch (error) {
    console.error('[KnowledgeBaseManager] Failed to save config:', error)
    message.error(String(error))
  } finally {
    saving.value = false
  }
}

const handleDelete = async (id: string) => {
  try {
    await knowledgeManager.value?.deleteConfig(id)
    await loadConfigs()
    message.success('Deleted successfully')
  } catch (error) {
    console.error('[KnowledgeBaseManager] Failed to delete config:', error)
    message.error(String(error))
  }
}

const handleTestConnection = async (config: KnowledgeBaseConfig) => {
  testingId.value = config.id
  try {
    await knowledgeManager.value?.testConnection(config)
    message.success(t('knowledge.testSuccess'))
  } catch (error) {
    console.error('[KnowledgeBaseManager] Connection test failed:', error)
    message.error(t('knowledge.testFailed', {error: String(error)}))
  } finally {
    testingId.value = null
  }
}

const handleTestConnectionForm = async () => {
  testingForm.value = true
  try {
    const config: KnowledgeBaseConfig = {
      id: 'test',
      name: testForm.name,
      enabled: true,
      accessKeyId: testForm.accessKeyId,
      accessKeySecret: testForm.accessKeySecret,
      spaceId: testForm.spaceId,
      knowledgeBaseId: testForm.knowledgeBaseId,
      defaultRegion: testForm.defaultRegion,
      defaultTopK: 5,
      defaultMinScore: 0.5,
    }
    await knowledgeManager.value?.testConnection(config)
    message.success(t('knowledge.testSuccess'))
  } catch (error) {
    console.error('[KnowledgeBaseManager] Connection test failed:', error)
    message.error(t('knowledge.testFailed', {error: String(error)}))
  } finally {
    testingForm.value = false
  }
}

const handleTestSearch = async () => {
  if (!testSearchQuery.value || !testForm.accessKeyId || !testForm.accessKeySecret || !testForm.spaceId) return

  searching.value = true
  searchResults.value = []
  try {
    // First save a temp config to get an ID, then search
    const tempId = `temp_${Date.now()}`
    const tempConfig: KnowledgeBaseConfig = {
      id: tempId,
      name: testForm.name || 'Test',
      enabled: true,
      accessKeyId: testForm.accessKeyId,
      accessKeySecret: testForm.accessKeySecret,
      spaceId: testForm.spaceId,
      knowledgeBaseId: testForm.knowledgeBaseId,
      defaultRegion: testForm.defaultRegion,
      defaultTopK: 5,
      defaultMinScore: 0.5,
    }
    await knowledgeManager.value?.saveConfig(tempConfig)

    const results = await knowledgeManager.value?.search({
      query: testSearchQuery.value,
      knowledgeBaseId: tempId,
      topK: 5,
      minScore: 0.5,
    })

    searchResults.value = results || []
    if (searchResults.value.length === 0) {
      message.info(t('knowledge.noResults'))
    }
  } catch (error) {
    console.error('[KnowledgeBaseManager] Search failed:', error)
    message.error(String(error))
  } finally {
    searching.value = false
  }
}

// Template management methods
const editTemplate = (template: { label: string; value: string }) => {
  editingTemplate.value = template
  templateEditLabel.value = template.label
  templateEditValue.value = template.value
  showTemplateEditModal.value = true
}

const addTemplate = () => {
  editingTemplate.value = null
  templateEditLabel.value = ''
  templateEditValue.value = '{context}\n\n---\n\n{query}'
  showTemplateEditModal.value = true
}

const saveTemplate = () => {
  const options = [...globalSettings.state.knowledgeBaseTemplateOptions]
  const newTemplate = {label: templateEditLabel.value, value: templateEditValue.value}

  if (editingTemplate.value) {
    // Edit existing template
    const index = options.findIndex(opt => opt.value === editingTemplate.value!.value)
    if (index !== -1) {
      options[index] = newTemplate
      // If currently selected template was modified, update selected value too
      if (globalSettings.state.knowledgeBaseTemplate === editingTemplate.value.value) {
        globalSettings.updateKnowledgeBaseTemplate(newTemplate.value)
      }
    }
  } else {
    // Add new template
    options.push(newTemplate)
  }

  globalSettings.updateKnowledgeBaseTemplateOptions(options)
  showTemplateEditModal.value = false
}

const deleteTemplate = (template: { label: string; value: string }) => {
  const options = globalSettings.state.knowledgeBaseTemplateOptions.filter(opt => opt.value !== template.value)
  globalSettings.updateKnowledgeBaseTemplateOptions(options)
  // If deleted template was selected, switch to first option
  if (globalSettings.state.knowledgeBaseTemplate === template.value && options.length > 0) {
    globalSettings.updateKnowledgeBaseTemplate(options[0].value)
  }
}

const close = () => {
  emit('update:show', false)
  emit('close')
}

onMounted(() => {
  loadConfigs()
})
</script>

<style scoped>
.knowledge-base-manager-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.knowledge-base-panel {
  flex: 1;
  overflow: hidden;
  padding: 16px;
}

.list-panel {
  height: 100%;
  overflow-y: auto;
}

.loading-container,
.empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.config-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.config-card {
  cursor: default;
}

.config-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.config-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name-text {
  font-weight: 600;
  font-size: 16px;
}

.config-actions {
  display: flex;
  gap: 8px;
}

.config-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item {
  display: flex;
  gap: 8px;
  font-size: 13px;
}

.info-label {
  color: var(--n-text-color-3);
}

.info-value {
  color: var(--n-text-color-2);
  word-break: break-all;
}

.test-panel {
  height: 100%;
  overflow-y: auto;
}

.test-section {
  margin-bottom: 16px;
}

.test-section-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.test-section-hint {
  font-size: 12px;
  color: var(--n-text-color-3);
  margin: 0 0 16px 0;
}

.test-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-results {
  margin-top: 16px;
}

.search-result-item {
  padding: 12px;
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  background: var(--n-color-embedded);
  margin-bottom: 8px;
}

.result-score {
  font-size: 12px;
  color: var(--n-text-color-3);
  margin-bottom: 6px;
}

.result-content {
  font-size: 14px;
  line-height: 1.5;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.templates-panel {
  height: 100%;
  overflow-y: auto;
}

.templates-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.template-item {
  padding: 12px;
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  background: var(--n-color-embedded);
}

.template-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
</style>
