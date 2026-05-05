import {IKnowledgeManager, KnowledgeBaseConfig, KnowledgeSearchParams, KnowledgeSearchResult} from './types';
import {safeSerializeForIPC} from '../../utils/ipc-serialization';
import {KnowledgeBaseError} from './errors';

/**
 * Electron环境下的KnowledgeManager代理
 * 通过IPC调用主进程中的真实KnowledgeManager实例
 */
export class ElectronKnowledgeManagerProxy implements IKnowledgeManager {
    private electronAPI: any;

    constructor() {
        if (typeof window === 'undefined' || !(window as any).electronAPI) {
            throw new KnowledgeBaseError('ElectronKnowledgeManagerProxy can only be used in Electron renderer process');
        }
        this.electronAPI = (window as any).electronAPI;
    }

    async ensureInitialized(): Promise<void> {
        await this.electronAPI.knowledge.ensureInitialized();
    }

    async getAllConfigs(): Promise<KnowledgeBaseConfig[]> {
        return this.electronAPI.knowledge.getAllConfigs();
    }

    async getConfig(id: string): Promise<KnowledgeBaseConfig | undefined> {
        return this.electronAPI.knowledge.getConfig(id);
    }

    async saveConfig(config: KnowledgeBaseConfig): Promise<void> {
        const safeConfig = safeSerializeForIPC(config);
        await this.electronAPI.knowledge.saveConfig(safeConfig);
    }

    async deleteConfig(id: string): Promise<void> {
        await this.electronAPI.knowledge.deleteConfig(id);
    }

    async testConnection(config: KnowledgeBaseConfig): Promise<boolean> {
        const safeConfig = safeSerializeForIPC(config);
        return this.electronAPI.knowledge.testConnection(safeConfig);
    }

    async search(params: KnowledgeSearchParams): Promise<KnowledgeSearchResult[]> {
        const safeParams = safeSerializeForIPC(params);
        return this.electronAPI.knowledge.search(safeParams);
    }
}
