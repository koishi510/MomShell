// frontend/lib/api/echo.ts
/**
 * Echo Domain API 服务
 */

import apiClient from '../apiClient';
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
  // Dad Mode 2.0
  TaskShell,
  TaskShellList,
  ShellWashResponse,
  WishBottle,
  WishBottleList,
  WishBottleCreate,
  WishCatchResponse,
  WishConfirmRequest,
  MemoryShell,
  MemoryShellList,
  MemoryShellCreate,
  MemoryReactRequest,
  EchoNotification,
  NotificationList,
  ArchiveData,
  PoolStatus,
  TaskCreateRequest,
  TaskAcceptRejectRequest,
} from '../../types/echo';

const ECHO_API = '/api/v1/echo';

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
  data: IdentityTagCreate
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
  data: MeditationStartRequest
): Promise<MeditationStartResponse> {
  const response = await apiClient.post(`${ECHO_API}/meditation/start`, data);
  return response.data;
}

/**
 * 结束冥想
 */
export async function endMeditation(
  data: MeditationEndRequest
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
  data: MemoryInjectRequest
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
  offset: number = 0
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
  data?: MemoirGenerateRequest
): Promise<Memoir> {
  const response = await apiClient.post(`${ECHO_API}/memoirs/generate`, data || {});
  return response.data;
}

/**
 * 评价回忆录
 */
export async function rateMemoir(
  memoirId: string,
  rating: number
): Promise<Memoir> {
  const response = await apiClient.post(`${ECHO_API}/memoirs/${memoirId}/rate`, {
    rating,
  });
  return response.data;
}

// ============================================================
// Dad Mode 2.0: Task Shells
// ============================================================

/**
 * 获取所有任务贝壳
 */
export async function getTaskShells(includeArchived = false): Promise<TaskShellList> {
  const response = await apiClient.get(`${ECHO_API}/shells`, {
    params: { include_archived: includeArchived },
  });
  return response.data;
}

/**
 * 开始洗涤贝壳
 */
export async function startWashingShell(shellId: string): Promise<TaskShell> {
  const response = await apiClient.post(`${ECHO_API}/shells/${shellId}/wash`);
  return response.data;
}

/**
 * 确认完成洗涤贝壳
 */
export async function confirmShellWashing(shellId: string): Promise<ShellWashResponse> {
  const response = await apiClient.post(`${ECHO_API}/shells/${shellId}/confirm`);
  return response.data;
}

/**
 * 创建任务（共建）
 */
export async function createTask(data: TaskCreateRequest): Promise<TaskShell> {
  const response = await apiClient.post(`${ECHO_API}/tasks/create`, data);
  return response.data;
}

/**
 * 接受妈妈创建的任务
 */
export async function acceptTaskShell(shellId: string): Promise<TaskShell> {
  const response = await apiClient.post(`${ECHO_API}/tasks/${shellId}/accept`);
  return response.data;
}

/**
 * 拒绝妈妈创建的任务
 */
export async function rejectTaskShell(shellId: string): Promise<{ message: string }> {
  const response = await apiClient.post(`${ECHO_API}/tasks/${shellId}/reject`);
  return response.data;
}

// ============================================================
// Dad Mode 2.0: Wish Bottles
// ============================================================

/**
 * 获取所有心愿瓶
 */
export async function getWishBottles(): Promise<WishBottleList> {
  const response = await apiClient.get(`${ECHO_API}/wishes`);
  return response.data;
}

/**
 * 妈妈创建心愿瓶
 */
export async function createWishBottle(data: WishBottleCreate): Promise<WishBottle> {
  const response = await apiClient.post(`${ECHO_API}/wishes`, data);
  return response.data;
}

/**
 * 爸爸接住心愿瓶
 */
export async function catchWishBottle(wishId: string): Promise<WishCatchResponse> {
  const response = await apiClient.post(`${ECHO_API}/wishes/${wishId}/catch`);
  return response.data;
}

/**
 * 妈妈确认心愿完成
 */
export async function confirmWishGranted(
  wishId: string,
  data: WishConfirmRequest
): Promise<WishBottle> {
  const response = await apiClient.post(`${ECHO_API}/wishes/${wishId}/confirm`, data);
  return response.data;
}

// ============================================================
// Dad Mode 2.0: Memory Shells
// ============================================================

/**
 * 爸爸创建记忆贝壳
 */
export async function createMemoryShell(data: MemoryShellCreate): Promise<MemoryShell> {
  const response = await apiClient.post(`${ECHO_API}/memories/create`, data);
  return response.data;
}

/**
 * 妈妈打开记忆贝壳
 */
export async function openMemoryShell(memoryId: string): Promise<MemoryShell> {
  const response = await apiClient.post(`${ECHO_API}/memories/${memoryId}/open`);
  return response.data;
}

/**
 * 妈妈对记忆做出反应
 */
export async function reactToMemory(
  memoryId: string,
  data: MemoryReactRequest
): Promise<MemoryShell> {
  const response = await apiClient.post(`${ECHO_API}/memories/${memoryId}/react`, data);
  return response.data;
}

// ============================================================
// Dad Mode 2.0: Notifications
// ============================================================

/**
 * 获取通知列表
 */
export async function getNotifications(unreadOnly = false): Promise<NotificationList> {
  const response = await apiClient.get(`${ECHO_API}/notifications`, {
    params: { unread_only: unreadOnly },
  });
  return response.data;
}

/**
 * 标记通知为已读
 */
export async function markNotificationRead(notificationId: string): Promise<EchoNotification> {
  const response = await apiClient.post(`${ECHO_API}/notifications/${notificationId}/read`);
  return response.data;
}

/**
 * 标记所有通知为已读
 */
export async function markAllNotificationsRead(): Promise<{ marked_count: number }> {
  const response = await apiClient.post(`${ECHO_API}/notifications/read-all`);
  return response.data;
}

// ============================================================
// Dad Mode 2.0: Archive & Pool Status
// ============================================================

/**
 * 获取归档数据（记）
 */
export async function getArchive(): Promise<ArchiveData> {
  const response = await apiClient.get(`${ECHO_API}/archive`);
  return response.data;
}

/**
 * 获取记忆池和任务池状态
 */
export async function getPoolStatus(): Promise<PoolStatus> {
  const response = await apiClient.get(`${ECHO_API}/pools/status`);
  return response.data;
}
