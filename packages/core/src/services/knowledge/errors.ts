/**
 * 知识库相关错误
 */
export class KnowledgeBaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KnowledgeBaseError';
  }
}