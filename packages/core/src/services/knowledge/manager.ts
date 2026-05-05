import {IKnowledgeManager, KnowledgeBaseConfig, KnowledgeSearchParams, KnowledgeSearchResult} from './types';
import {IStorageProvider} from '../storage/types';
import {StorageAdapter} from '../storage/adapter';
import {CORE_SERVICE_KEYS} from '../../constants/storage-keys';
import {KnowledgeBaseError} from './errors';
import {testConnection as apiTestConnection, search as apiSearch} from './api';

/**
 * 知识库管理器实现
 */
export class KnowledgeManager implements IKnowledgeManager {
    private readonly storageKey = CORE_SERVICE_KEYS.KNOWLEDGE_BASES;
    private readonly storage: IStorageProvider;
    private initPromise: Promise<void>;

    constructor(storageProvider: IStorageProvider) {
        this.storage = new StorageAdapter(storageProvider);
        this.initPromise = this.init().catch(err => {
            console.error('[KnowledgeManager] Initialization failed:', err);
            throw err;
        });
    }

    /**
     * 确保初始化完成
     */
    public async ensureInitialized(): Promise<void> {
        await this.initPromise;
    }

    /**
     * 初始化知识库管理器
     */
    private async init(): Promise<void> {
        console.log('[KnowledgeManager] Initializing...');

        // 确保存储中有默认结构
        const storedData = await this.storage.getItem(this.storageKey);
        if (!storedData) {
            await this.storage.setItem(this.storageKey, JSON.stringify([]));
            console.log('[KnowledgeManager] Created default empty config');
        }
    }

    /**
     * 获取所有知识库配置
     */
    async getAllConfigs(): Promise<KnowledgeBaseConfig[]> {
        await this.ensureInitialized();
        const storedData = await this.storage.getItem(this.storageKey);
        if (!storedData) {
            return [];
        }

        try {
            const configs = JSON.parse(storedData) as Record<string, KnowledgeBaseConfig>;
            return Object.values(configs);
        } catch (error) {
            console.error('[KnowledgeManager] Failed to parse stored configs:', error);
            return [];
        }
    }

    /**
     * 获取指定知识库配置
     */
    async getConfig(id: string): Promise<KnowledgeBaseConfig | undefined> {
        await this.ensureInitialized();
        const configs = await this.getAllConfigs();
        return configs.find(config => config.id === id);
    }

    /**
     * 保存知识库配置（新增或更新）
     */
    async saveConfig(config: KnowledgeBaseConfig): Promise<void> {
        await this.ensureInitialized();
        console.log('[KnowledgeManager] Save config:', config);

        if (!config.id) {
            throw new KnowledgeBaseError('Knowledge base ID is required');
        }

        if (!config.accessKeyId || !config.accessKeySecret) {
            throw new KnowledgeBaseError('AccessKey ID and Secret are required');
        }

        if (!config.spaceId) {
            throw new KnowledgeBaseError('SpaceId is required');
        }

        // 使用默认值
        const configToSave: KnowledgeBaseConfig = {
            ...config,
            defaultTopK: config.defaultTopK ?? 5,
            defaultMinScore: config.defaultMinScore ?? 0.5,
            defaultRegion: config.defaultRegion ?? 'cn-beijing',
        };

        const configs = await this.getAllConfigs();
        const existingIndex = configs.findIndex(c => c.id === config.id);

        if (existingIndex >= 0) {
            configs[existingIndex] = configToSave;
        } else {
            configs.push(configToSave);
        }

        const configsMap: Record<string, KnowledgeBaseConfig> = {};
        for (const c of configs) {
            configsMap[c.id] = c;
        }

        await this.storage.setItem(this.storageKey, JSON.stringify(configsMap));
        console.log(`[KnowledgeManager] Saved config for: ${config.id}`);
    }

    /**
     * 删除知识库配置
     */
    async deleteConfig(id: string): Promise<void> {
        await this.ensureInitialized();
        const configs = await this.getAllConfigs();
        const filteredConfigs = configs.filter(c => c.id !== id);

        const configsMap: Record<string, KnowledgeBaseConfig> = {};
        for (const c of filteredConfigs) {
            configsMap[c.id] = c;
        }

        await this.storage.setItem(this.storageKey, JSON.stringify(configsMap));
        console.log(`[KnowledgeManager] Deleted config: ${id}`);
    }

    /**
     * 测试知识库连接
     */
    async testConnection(config: KnowledgeBaseConfig): Promise<boolean> {
        return apiTestConnection(config);
    }

    /**
     * 检索知识库
     */
    async search(params: KnowledgeSearchParams): Promise<KnowledgeSearchResult[]> {
        const config = await this.getConfig(params.knowledgeBaseId);
        if (!config) {
            throw new KnowledgeBaseError(`Knowledge base not found: ${params.knowledgeBaseId}`);
        }

        if (!config.enabled) {
            throw new KnowledgeBaseError('Knowledge base is disabled');
        }

        return apiSearch({
            ...params,
            accessKeyId: config.accessKeyId,
            accessKeySecret: config.accessKeySecret,
            spaceId: config.spaceId,
            knowledgeBaseId: config.knowledgeBaseId,
            topK: config.defaultTopK,
            minScore: config.defaultMinScore,
            enableReranking: config.rerank
        });
    }
}

export function createKnowledgeManager(storageProvider: IStorageProvider): KnowledgeManager {
    return new KnowledgeManager(storageProvider);
}
