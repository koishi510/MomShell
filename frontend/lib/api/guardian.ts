// frontend/lib/api/guardian.ts
/**
 * Guardian Partner API 服务
 */

import apiClient from "../apiClient";
import type {
  InviteInfo,
  BindingStatusResponse,
  DailyStatusCreate,
  DailyStatusResponse,
  StatusNotification,
  DailyTask,
  ProgressInfo,
  Badge,
  Memory,
  MemoryCreate,
  Album,
} from "../../types/guardian";

const GUARDIAN_API = "/api/v1/guardian";

/**
 * 生成邀请链接 (妈妈)
 */
export async function createInvite(): Promise<InviteInfo> {
  const response = await apiClient.post(`${GUARDIAN_API}/invite`);
  return response.data;
}

/**
 * 绑定为伴侣
 */
export async function acceptBind(inviteCode: string): Promise<void> {
  await apiClient.post(`${GUARDIAN_API}/bind`, { invite_code: inviteCode });
}

/**
 * 解除绑定
 */
export async function unbind(): Promise<void> {
  await apiClient.delete(`${GUARDIAN_API}/unbind`);
}

/**
 * 获取绑定状态
 */
export async function getBindingStatus(): Promise<BindingStatusResponse> {
  const response = await apiClient.get(`${GUARDIAN_API}/status`);
  return response.data;
}

/**
 * 记录今日状态 (妈妈)
 */
export async function recordDailyStatus(
  data: DailyStatusCreate,
): Promise<DailyStatusResponse> {
  const response = await apiClient.post(`${GUARDIAN_API}/daily-status`, data);
  return response.data;
}

/**
 * 获取今日状态 (伴侣)
 */
export async function getDailyStatus(
  targetDate?: string,
): Promise<StatusNotification | null> {
  const params = targetDate ? { target_date: targetDate } : {};
  const response = await apiClient.get(`${GUARDIAN_API}/daily-status`, {
    params,
  });
  return response.data;
}

/**
 * 获取每日任务 (伴侣)
 */
export async function getDailyTasks(): Promise<DailyTask[]> {
  const response = await apiClient.get(`${GUARDIAN_API}/tasks`);
  return response.data;
}

/**
 * 完成任务 (伴侣)
 */
export async function completeTask(
  taskId: string,
  notes?: string,
): Promise<DailyTask> {
  const response = await apiClient.post(
    `${GUARDIAN_API}/tasks/${taskId}/complete`,
    notes ? { notes } : {},
  );
  return response.data;
}

/**
 * 确认任务 (妈妈)
 */
export async function confirmTask(
  taskId: string,
  feedback: string,
): Promise<{ task: DailyTask; points_awarded: number; message: string }> {
  const response = await apiClient.post(
    `${GUARDIAN_API}/tasks/${taskId}/confirm`,
    {
      feedback,
    },
  );
  return response.data;
}

/**
 * 拒绝任务 - 标记为没完成 (妈妈)
 */
export async function rejectTask(taskId: string): Promise<DailyTask> {
  const response = await apiClient.post(
    `${GUARDIAN_API}/tasks/${taskId}/reject`,
  );
  return response.data;
}

/**
 * 获取进度信息 (伴侣)
 */
export async function getProgress(): Promise<ProgressInfo> {
  const response = await apiClient.get(`${GUARDIAN_API}/progress`);
  return response.data;
}

/**
 * 获取徽章列表 (伴侣)
 */
export async function getBadges(): Promise<Badge[]> {
  const response = await apiClient.get(`${GUARDIAN_API}/badges`);
  return response.data;
}

/**
 * 添加时光记录 (伴侣)
 */
export async function addMemory(data: MemoryCreate): Promise<Memory> {
  const response = await apiClient.post(`${GUARDIAN_API}/memories`, data);
  return response.data;
}

/**
 * 获取时光记录
 */
export async function getMemories(
  limit: number = 30,
  offset: number = 0,
): Promise<Memory[]> {
  const response = await apiClient.get(`${GUARDIAN_API}/memories`, {
    params: { limit, offset },
  });
  return response.data;
}

/**
 * 生成回忆录
 */
export async function generateAlbum(milestone?: string): Promise<Album> {
  const params = milestone ? { milestone } : {};
  const response = await apiClient.get(`${GUARDIAN_API}/memories/album`, {
    params,
  });
  return response.data;
}
