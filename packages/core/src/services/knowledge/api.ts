/**
 * 知识库 API 调用层
 * 基于阿里云 ACS3-HMAC-SHA256 签名机制实现百炼知识库检索 API 调用
 * 参考: https://help.aliyun.com/zh/model-studio/user-guide/roa-style-request-body-signature-mechanism
 */
import type { KnowledgeBaseConfig, KnowledgeSearchParams, KnowledgeSearchResult } from './types';
import { KnowledgeBaseError } from './errors';

const BAILIAN_API_ENDPOINT = 'https://bailian.cn-beijing.aliyuncs.com';
const API_VERSION = '2023-12-29';
const SIGNATURE_ALGORITHM = 'ACS3-HMAC-SHA256';

/**
 * SHA256 哈希计算
 */
async function sha256Hex(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 计算 HMAC-SHA256 签名 (返回小写十六进制)
 */
async function hmac256(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 生成随机 UUID
 */
function generateUUID(): string {
  return crypto.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 构造规范化的查询字符串 (CanonicalQueryString)
 * 参数按 key 字典序排序，URL 编码后用 = 连接，参数之间用 & 连接
 */
function buildCanonicalQueryString(queryParams: Record<string, string> = {}): string {
  const sortedKeys = Object.keys(queryParams).sort((a, b) => a.localeCompare(b));
  const parts: string[] = [];
  for (const key of sortedKeys) {
    const encodedKey = encodeURIComponent(key).replace(/\+/g, '%20').replace(/\*/g, '%2A').replace(/~/g, '%7E');
    const encodedValue = encodeURIComponent(queryParams[key] || '').replace(/\+/g, '%20').replace(/\*/g, '%2A').replace(/~/g, '%7E');
    parts.push(`${encodedKey}=${encodedValue}`);
  }
  return parts.join('&');
}

/**
 * 构造规范化的请求串 (CanonicalRequest)
 * 格式: HTTPMethod + "\n" + CanonicalUri + "\n" + CanonicalQueryString + "\n" + CanonicalHeaders + "\n" + SignedHeaders + "\n" + HashedRequestPayload
 */
function buildCanonicalRequest(
  httpMethod: string,
  canonicalUri: string,
  queryParams: Record<string, string>,
  headers: Record<string, string>,
  hashedPayload: string,
): string {
  const canonicalQueryString = buildCanonicalQueryString(queryParams);
  const signedHeadersStr = Object.keys(headers)
    .filter((k) => k.startsWith('x-acs-') || k === 'host' || k === 'content-type')
    .sort()
    .join(';');
  const canonicalHeaders = Object.keys(headers)
    .filter((k) => k.startsWith('x-acs-') || k === 'host' || k === 'content-type')
    .sort()
    .map((k) => `${k}:${headers[k]}`)
    .join('\n') + '\n';

  return [
    httpMethod.toUpperCase(),
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeadersStr,
    hashedPayload,
  ].join('\n');
}

/**
 * 使用阿里云 ACS3-HMAC-SHA256 签名机制发起请求
 * path 格式: /{workspaceId}/index/retrieve
 */
async function signedFetch(
  accessKeyId: string,
  accessKeySecret: string,
  method: string,
  path: string,
  headers: Record<string, string>,
  body: string | null,
): Promise<Response> {
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const signatureNonce = generateUUID();

  // 计算 content SHA256 (小写十六进制)
  const hashedPayload = await sha256Hex(body || '');

  // 构造完整的 headers (key 小写化)
  const allHeaders: Record<string, string> = {
    ...headers,
    'host': 'bailian.cn-beijing.aliyuncs.com',
    'x-acs-action': headers['x-acs-action'] || 'Retrieve',
    'x-acs-version': API_VERSION,
    'x-acs-date': timestamp,
    'x-acs-signature-nonce': signatureNonce,
    'x-acs-content-sha256': hashedPayload,
    'content-type': 'application/json',
  };

  // Key 小写化
  const lowerCaseHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(allHeaders)) {
    lowerCaseHeaders[key.toLowerCase()] = value;
  }

  // 构造 CanonicalRequest
  const canonicalRequest = buildCanonicalRequest(method, path, {}, lowerCaseHeaders, hashedPayload);

  // 构造 StringToSign = Algorithm + "\n" + SHA256(canonicalRequest)
  const hashedCanonicalRequest = await sha256Hex(canonicalRequest);
  const stringToSign = `${SIGNATURE_ALGORITHM}\n${hashedCanonicalRequest}`;

  // 计算签名: HMAC-SHA256(accessKeySecret, stringToSign)
  const signature = await hmac256(accessKeySecret, stringToSign);

  // 构造 SignedHeaders 字符串
  const signedHeadersStr = Object.keys(lowerCaseHeaders)
    .filter((k) => k.startsWith('x-acs-') || k === 'host' || k === 'content-type')
    .sort()
    .join(';');

  // 构造 Authorization 头
  const authorization = `${SIGNATURE_ALGORITHM} Credential=${accessKeyId},SignedHeaders=${signedHeadersStr},Signature=${signature}`;

  // 构造完整 URL
  const url = `${BAILIAN_API_ENDPOINT}${path}`;

  // 构造请求
  const requestHeaders: Record<string, string> = {
    ...lowerCaseHeaders,
    'authorization': authorization,
  };

  const requestInit: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body) {
    requestInit.body = body;
  }

  const response = await fetch(url, requestInit);
  return response;
}

export async function testConnection(config: KnowledgeBaseConfig): Promise<boolean> {
  const body = JSON.stringify({
    IndexId: config.knowledgeBaseId,
    Query: '连接测试',
    DenseSimilarityTopK: 1,
    RerankMinScore: 0,
  });

  const response = await signedFetch(
    config.accessKeyId,
    config.accessKeySecret,
    'POST',
    `/${config.spaceId}/index/retrieve`,
    { 'x-acs-action': 'Retrieve' },
    body,
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new KnowledgeBaseError(`Connection test failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  if (result.Status !== 200 && !result.Success) {
    throw new KnowledgeBaseError(`Connection test failed: ${result.Code || 'Unknown error'} - ${result.Message || ''}`);
  }

  return true;
}

export async function search(params: KnowledgeSearchParams & Pick<KnowledgeBaseConfig, 'accessKeyId' | 'accessKeySecret' | 'spaceId'>): Promise<KnowledgeSearchResult[]> {
  const body = JSON.stringify({
    IndexId: params.knowledgeBaseId,
    Query: params.query,
    DenseSimilarityTopK: params.topK || 5,
    RerankMinScore: params.minScore ?? 0.5,
    EnableReranking: params.enableReranking,
    RerankTopN: params.topK || 5,
  });

  const response = await signedFetch(
    params.accessKeyId,
    params.accessKeySecret,
    'POST',
    `/${params.spaceId}/index/retrieve`,
    { 'x-acs-action': 'Retrieve' },
    body,
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new KnowledgeBaseError(`Search failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  if (result.Status !== 200 && !result.Success) {
    throw new KnowledgeBaseError(`Search failed: ${result.Code || 'Unknown error'} - ${result.Message || ''}`);
  }

  const nodes = result.Data?.Nodes || [];
  return nodes.map((node: any) => ({
    id: node.Metadata?.doc_id || node.Metadata?._id || '',
    content: node.Text || '',
    score: node.Score ?? 0,
    metadata: node.Metadata,
  }));
}
