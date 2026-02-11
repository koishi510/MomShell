/**
 * Community API Client
 * Handles all community-related API requests
 */

import apiClient from '../apiClient';

// Types
export type ChannelType = 'professional' | 'experience';
export type UserRole = 'guest' | 'mom' | 'dad' | 'family' | 'certified_doctor' | 'certified_therapist' | 'certified_nurse' | 'admin' | 'ai_assistant';

export interface AuthorInfo {
  id: string;
  nickname: string;
  avatar_url: string | null;
  role: UserRole;
  is_certified: boolean;
  certification_title: string | null;
}

export interface TagInfo {
  id: string;
  name: string;
  slug: string;
}

export interface QuestionListItem {
  id: string;
  title: string;
  content_preview: string;
  channel: ChannelType;
  author: AuthorInfo;
  tags: TagInfo[];
  view_count: number;
  answer_count: number;
  like_count: number;
  collection_count: number;
  is_pinned: boolean;
  is_featured: boolean;
  has_accepted_answer: boolean;
  is_liked: boolean;
  is_collected: boolean;
  created_at: string;
}

export interface QuestionDetail extends QuestionListItem {
  content: string;
  status: string;
  image_urls: string[];
  accepted_answer_id: string | null;
  professional_answer_count: number;
  experience_answer_count: number;
  updated_at: string;
  published_at: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface QuestionCreateParams {
  title: string;
  content: string;
  channel?: ChannelType;
  tag_ids?: string[];
  image_urls?: string[];
}

export interface AnswerInfo {
  id: string;
  question_id: string;
  content: string;
  content_preview?: string;
  author: AuthorInfo;
  like_count: number;
  comment_count: number;
  is_professional: boolean;
  is_accepted: boolean;
  is_liked: boolean;
  created_at: string;
}

// API Functions

export async function getQuestions(params?: {
  channel?: ChannelType;
  tag_id?: string;
  sort_by?: 'created_at' | 'view_count' | 'answer_count' | 'like_count';
  order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}): Promise<PaginatedResponse<QuestionListItem>> {
  const response = await apiClient.get('/api/v1/community/questions', { params });
  return response.data;
}

export async function getHotQuestions(params?: {
  page?: number;
  page_size?: number;
}): Promise<PaginatedResponse<QuestionListItem>> {
  const response = await apiClient.get('/api/v1/community/questions/hot', { params });
  return response.data;
}

export async function getQuestion(questionId: string): Promise<QuestionDetail> {
  const response = await apiClient.get(`/api/v1/community/questions/${questionId}`);
  return response.data;
}

export async function createQuestion(params: QuestionCreateParams): Promise<QuestionDetail> {
  const response = await apiClient.post('/api/v1/community/questions', params);
  return response.data;
}

export async function getQuestionAnswers(questionId: string, params?: {
  page?: number;
  page_size?: number;
}): Promise<PaginatedResponse<AnswerInfo>> {
  const response = await apiClient.get(`/api/v1/community/questions/${questionId}/answers`, { params });
  return response.data;
}

export async function createAnswer(questionId: string, content: string): Promise<AnswerInfo> {
  const response = await apiClient.post(`/api/v1/community/questions/${questionId}/answers`, { content });
  return response.data;
}

export async function likeQuestion(questionId: string): Promise<void> {
  await apiClient.post(`/api/v1/community/questions/${questionId}/like`);
}

export async function unlikeQuestion(questionId: string): Promise<void> {
  await apiClient.delete(`/api/v1/community/questions/${questionId}/like`);
}

export async function collectQuestion(questionId: string): Promise<void> {
  await apiClient.post(`/api/v1/community/questions/${questionId}/collect`);
}

export async function uncollectQuestion(questionId: string): Promise<void> {
  await apiClient.delete(`/api/v1/community/questions/${questionId}/collect`);
}

// Format relative time (handles UTC dates from backend)
export function formatRelativeTime(dateStr: string): string {
  // Ensure the date is treated as UTC if no timezone specified
  let date: Date;
  if (dateStr.endsWith('Z') || dateStr.includes('+') || dateStr.includes('-', 10)) {
    date = new Date(dateStr);
  } else {
    // Backend returns UTC without 'Z' suffix, append it
    date = new Date(dateStr + 'Z');
  }

  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;

  return date.toLocaleDateString('zh-CN');
}
