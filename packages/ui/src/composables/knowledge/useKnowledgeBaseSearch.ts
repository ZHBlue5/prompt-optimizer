import { ref, computed, inject, type Ref } from 'vue'
import type { AppServices } from '../../types/services'
import type { KnowledgeBaseConfig, KnowledgeSearchResult } from '@prompt-optimizer/core'

/**
 * 知识库检索 composable
 * 用于在工作区中管理知识库选择和检索功能
 */
export function useKnowledgeBaseSearch() {
  const services = inject<Ref<AppServices | null>>('services')
  if (!services?.value) {
    throw new Error('Services not provided!')
  }

  const knowledgeManager = computed(() => services.value?.knowledgeManager)

  // 状态
  const selectedKnowledgeBaseId = ref<string>('')
  const searchQuery = ref<string>('')
  const searchResult = ref<string>('') // 检索结果（用于注入上下文的文本）
  const isSearching = ref(false)
  const searchResults = ref<KnowledgeSearchResult[]>([])

  // 已配置的知识库列表
  const configs = ref<KnowledgeBaseConfig[]>([])

  // 加载知识库配置列表
  const loadConfigs = async () => {
    if (!knowledgeManager.value) return
    try {
      configs.value = await knowledgeManager.value.getAllConfigs()
    } catch (error) {
      console.error('[useKnowledgeBaseSearch] Failed to load configs:', error)
    }
  }

  // 执行检索
  const search = async (query: string, knowledgeBaseId?: string) => {
    const kbId = knowledgeBaseId || selectedKnowledgeBaseId.value
    if (!kbId || !query) return

    isSearching.value = true
    searchResult.value = ''
    searchResults.value = []

    try {
      const config = configs.value.find(c => c.id === kbId)
      if (!config) {
        throw new Error('Knowledge base not found')
      }

      const results = await knowledgeManager.value?.search({
        query,
        knowledgeBaseId: kbId,
        topK: config.defaultTopK ?? 5,
        minScore: config.defaultMinScore ?? 0.5,
      })

      searchResults.value = results || []

      // 将结果转换为可注入上下文的文本
      if (searchResults.value.length > 0) {
        const contextText = searchResults.value
          .map((r, index) => `[${index + 1}] ${r.content}`)
          .join('\n\n')
        searchResult.value = contextText
      }
    } catch (error) {
      console.error('[useKnowledgeBaseSearch] Search failed:', error)
      throw error
    } finally {
      isSearching.value = false
    }
  }

  // 选择知识库
  const selectKnowledgeBase = (id: string) => {
    selectedKnowledgeBaseId.value = id
  }

  // 清除检索结果
  const clearSearchResult = () => {
    searchResult.value = ''
    searchResults.value = []
    searchQuery.value = ''
  }

  // 获取当前选中的知识库配置
  const selectedConfig = computed(() => {
    return configs.value.find(c => c.id === selectedKnowledgeBaseId.value)
  })

  // 是否有已启用的知识库
  const hasEnabledKnowledgeBase = computed(() => {
    return configs.value.some(c => c.enabled)
  })

  return {
    // 状态
    selectedKnowledgeBaseId,
    searchQuery,
    searchResult,
    isSearching,
    searchResults,
    configs,
    selectedConfig,
    hasEnabledKnowledgeBase,

    // 方法
    loadConfigs,
    search,
    selectKnowledgeBase,
    clearSearchResult,
  }
}

export type UseKnowledgeBaseSearchReturn = ReturnType<typeof useKnowledgeBaseSearch>