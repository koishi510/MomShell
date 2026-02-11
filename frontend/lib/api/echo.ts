// frontend/lib/api/echo.ts
/**
 * Echo Domain API 服务
 */

import apiClient from "../apiClient";
import type {
  EchoStatus,
  IdentityTag,
  IdentityTagCreate,
  IdentityTagList,
  Scene,
  Audio,
  MeditationStartRequest,
  MeditationStartResponse,
  MeditationEndRequest,
  MeditationEndResponse,
  MeditationStats,
  WindowClarity,
  MemoryInjectRequest,
  PartnerMemory,
  RevealedMemories,
  MemoirGenerateRequest,
  Memoir,
  MemoirList,
} from "../../types/echo";

const ECHO_API = "/api/v1/echo";

// ============================================================
// Echo 状态
// ============================================================

/**
 * 获取 Echo 状态
 */
export async function getEchoStatus(): Promise<EchoStatus> {
  const response = await apiClient.get(`${ECHO_API}/status`);
  return response.data;
}

// ============================================================
// 身份标签
// ============================================================

/**
 * 获取身份标签列表（按类型分组）
 */
export async function getIdentityTags(): Promise<IdentityTagList> {
  const response = await apiClient.get(`${ECHO_API}/identity-tags`);
  return response.data;
}

/**
 * 创建身份标签
 */
export async function createIdentityTag(
  data: IdentityTagCreate,
): Promise<IdentityTag> {
  const response = await apiClient.post(`${ECHO_API}/identity-tags`, data);
  return response.data;
}

/**
 * 删除身份标签
 */
export async function deleteIdentityTag(tagId: string): Promise<void> {
  await apiClient.delete(`${ECHO_API}/identity-tags/${tagId}`);
}

// ============================================================
// 场景与音频匹配
// ============================================================

/**
 * 匹配场景
 */
export async function matchScenes(limit: number = 5): Promise<Scene[]> {
  const response = await apiClient.get(`${ECHO_API}/scenes/match`, {
    params: { limit },
  });
  return response.data;
}

/**
 * 匹配音频
 */
export async function matchAudio(limit: number = 5): Promise<Audio[]> {
  const response = await apiClient.get(`${ECHO_API}/audio/match`, {
    params: { limit },
  });
  return response.data;
}

// ============================================================
// 冥想
// ============================================================

/**
 * 开始冥想
 */
export async function startMeditation(
  data: MeditationStartRequest,
): Promise<MeditationStartResponse> {
  const response = await apiClient.post(`${ECHO_API}/meditation/start`, data);
  return response.data;
}

/**
 * 结束冥想
 */
export async function endMeditation(
  data: MeditationEndRequest,
): Promise<MeditationEndResponse> {
  const response = await apiClient.post(`${ECHO_API}/meditation/end`, data);
  return response.data;
}

/**
 * 获取冥想统计
 */
export async function getMeditationStats(): Promise<MeditationStats> {
  const response = await apiClient.get(`${ECHO_API}/meditation/stats`);
  return response.data;
}

// ============================================================
// 窗户清晰度
// ============================================================

/**
 * 获取窗户清晰度（伴侣模式）
 */
export async function getWindowClarity(): Promise<WindowClarity> {
  const response = await apiClient.get(`${ECHO_API}/window/clarity`);
  return response.data;
}

// ============================================================
// 伴侣记忆
// ============================================================

/**
 * 注入记忆（伴侣）
 */
export async function injectMemory(
  data: MemoryInjectRequest,
): Promise<PartnerMemory> {
  const response = await apiClient.post(`${ECHO_API}/memories`, data);
  return response.data;
}

/**
 * 获取已揭示的记忆（妈妈）
 */
export async function getRevealedMemories(): Promise<RevealedMemories> {
  const response = await apiClient.get(`${ECHO_API}/memories/revealed`);
  return response.data;
}

// ============================================================
// 青春回忆录
// ============================================================

/**
 * 获取回忆录列表
 */
export async function getMemoirs(
  limit: number = 10,
  offset: number = 0,
): Promise<MemoirList> {
  const response = await apiClient.get(`${ECHO_API}/memoirs`, {
    params: { limit, offset },
  });
  return response.data;
}

/**
 * 生成回忆录
 */
export async function generateMemoir(
  data?: MemoirGenerateRequest,
): Promise<Memoir> {
  const response = await apiClient.post(
    `${ECHO_API}/memoirs/generate`,
    data || {},
  );
  return response.data;
}

/**
 * 评价回忆录
 */
export async function rateMemoir(
  memoirId: string,
  rating: number,
): Promise<Memoir> {
  const response = await apiClient.post(
    `${ECHO_API}/memoirs/${memoirId}/rate`,
    {
      rating,
    },
  );
  return response.data;
}
