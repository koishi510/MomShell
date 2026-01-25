// frontend/lib/api.ts
/**
 * API 客户端
 * 处理与后端的通信
 */

import axios from 'axios';
import type { UserMessage, VisualResponse } from '../types/companion';

// API 基础 URL - 使用相对路径（前后端同域部署）
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 发送消息到 Soulful Companion
 */
export async function sendMessage(message: UserMessage): Promise<VisualResponse> {
  const response = await apiClient.post<VisualResponse>('/api/v1/companion/chat', message);
  return response.data;
}

/**
 * 获取用户画像
 */
export async function getUserProfile(sessionId: string) {
  const response = await apiClient.get(`/api/v1/companion/profile/${sessionId}`);
  return response.data;
}
