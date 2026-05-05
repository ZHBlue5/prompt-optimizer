/**
 * 知识库配置
 */
export interface KnowledgeBaseConfig {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 是否启用 */
  enabled: boolean;
  /** 阿里云 AccessKey ID */
  accessKeyId: string;
  /** 阿里云 AccessKey Secret */
  accessKeySecret: string;
  /** 百炼空间 ID (SpaceId，URL路径参数) */
  spaceId: string;
  /** 百炼知识库 ID */
  knowledgeBaseId: string;
  /** 默认区域 */
  defaultRegion?: string;
  /** 默认返回数量 */
  defaultTopK: number;
  /** 最低相似度阈值 */
  defaultMinScore: number;
  /** 是否开启重排 */
  rerank?: boolean;
}

/**
 * 知识库检索结果
 */
export interface KnowledgeSearchResult {
  /** 文档ID */
  id: string;
  /** 文档片段内容 */
  content: string;
  /** 相似度分数 */
  score: number;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 知识库检索参数
 */
export interface KnowledgeSearchParams {
  /** 检索query */
  query: string;
  /** 知识库ID */
  knowledgeBaseId: string;
  /** 返回数量限制 */
  topK?: number;
  /** 相似度阈值 */
  minScore?: number;
  enableReranking?: boolean;
}

/**
 * 知识库管理器接口
 */
export interface IKnowledgeManager {
  /** 获取所有知识库配置 */
  getAllConfigs(): Promise<KnowledgeBaseConfig[]>;

  /** 获取指定知识库配置 */
  getConfig(id: string): Promise<KnowledgeBaseConfig | undefined>;

  /** 保存知识库配置（新增或更新） */
  saveConfig(config: KnowledgeBaseConfig): Promise<void>;

  /** 删除知识库配置 */
  deleteConfig(id: string): Promise<void>;

  /** 测试知识库连接 */
  testConnection(config: KnowledgeBaseConfig): Promise<boolean>;

  /** 检索知识库 */
  search(params: KnowledgeSearchParams): Promise<KnowledgeSearchResult[]>;
}
