// frontend/lib/api/community.ts
/**
 * 社区 API 服务
 * 使用 Bearer token 认证，兼容 X-User-ID 开发模式
 */

import type { Question, Answer, ChannelType } from '../../types/community';
import apiClient from '../apiClient';

const COMMUNITY_API = '/api/v1/community';

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
  channel: ChannelType;
  tag_ids?: string[];
  image_urls?: string[];
}

export interface AnswerCreateParams {
  content: string;
  image_urls?: string[];
}

export interface QuestionUpdateParams {
  title?: string;
  content?: string;
  tag_ids?: string[];
  image_urls?: string[];
}

export interface AnswerUpdateParams {
  content?: string;
  image_urls?: string[];
}

export interface LikeStatus {
  is_liked: boolean;
  like_count: number;
}

/**
 * 获取问题列表
 */
export async function getQuestions(params?: {
  channel?: ChannelType;
  page?: number;
  page_size?: number;
  sort_by?: 'created_at' | 'view_count' | 'answer_count' | 'like_count';
  order?: 'asc' | 'desc';
}): Promise<PaginatedResponse<Question>> {
  const response = await apiClient.get(`${COMMUNITY_API}/questions`, { params });
  return response.data;
}

/**
 * 按频道获取问题列表
 */
export async function getQuestionsByChannel(
  channel: ChannelType,
  page: number = 1,
  page_size: number = 20
): Promise<PaginatedResponse<Question>> {
  const response = await apiClient.get(`${COMMUNITY_API}/questions/channel/${channel}`, {
    params: { page, page_size },
  });
  return response.data;
}

/**
 * 获取热门问题
 */
export async function getHotQuestions(
  page: number = 1,
  page_size: number = 20
): Promise<PaginatedResponse<Question>> {
  const response = await apiClient.get(`${COMMUNITY_API}/questions/hot`, {
    params: { page, page_size },
  });
  return response.data;
}

/**
 * 获取问题详情
 */
export async function getQuestion(questionId: string): Promise<Question> {
  const response = await apiClient.get(`${COMMUNITY_API}/questions/${questionId}`);
  return response.data;
}

/**
 * 创建问题
 */
export async function createQuestion(params: QuestionCreateParams): Promise<Question> {
  const response = await apiClient.post(`${COMMUNITY_API}/questions`, {
    title: params.title,
    content: params.content,
    channel: params.channel,
    tag_ids: params.tag_ids || [],
    image_urls: params.image_urls || [],
  });
  return response.data;
}

/**
 * 点赞问题（toggle）
 */
export async function toggleLike(
  targetType: 'question' | 'answer' | 'comment',
  targetId: string
): Promise<LikeStatus> {
  const response = await apiClient.post(`${COMMUNITY_API}/likes`, {
    target_type: targetType,
    target_id: targetId,
  });
  return response.data;
}

/**
 * 收藏问题（toggle）
 */
export async function toggleCollection(questionId: string): Promise<{ is_collected: boolean; collection_count: number }> {
  const response = await apiClient.post(`${COMMUNITY_API}/collections`, {
    question_id: questionId,
  });
  return response.data;
}

/**
 * 获取问题的回答列表
 */
export async function getAnswers(
  questionId: string,
  params?: {
    page?: number;
    page_size?: number;
    sort_by?: 'created_at' | 'like_count';
    order?: 'asc' | 'desc';
  }
): Promise<PaginatedResponse<Answer>> {
  const response = await apiClient.get(`${COMMUNITY_API}/questions/${questionId}/answers`, { params });
  return response.data;
}

/**
 * 创建回答
 */
export async function createAnswer(
  questionId: string,
  params: AnswerCreateParams
): Promise<Answer> {
  const response = await apiClient.post(`${COMMUNITY_API}/questions/${questionId}/answers`, {
    content: params.content,
    image_urls: params.image_urls || [],
  });
  return response.data;
}

/**
 * 删除问题
 */
export async function deleteQuestion(questionId: string): Promise<void> {
  await apiClient.delete(`${COMMUNITY_API}/questions/${questionId}`);
}

/**
 * 更新问题
 */
export async function updateQuestion(questionId: string, params: QuestionUpdateParams): Promise<Question> {
  const response = await apiClient.put(`${COMMUNITY_API}/questions/${questionId}`, params);
  return response.data;
}

/**
 * 删除回答
 */
export async function deleteAnswer(answerId: string): Promise<void> {
  await apiClient.delete(`${COMMUNITY_API}/answers/${answerId}`);
}

/**
 * 更新回答
 */
export async function updateAnswer(answerId: string, params: AnswerUpdateParams): Promise<Answer> {
  const response = await apiClient.put(`${COMMUNITY_API}/answers/${answerId}`, params);
  return response.data;
}

/**
 * 获取标签列表
 */
export async function getTags(): Promise<Array<{ id: string; name: string; slug: string }>> {
  try {
    const response = await apiClient.get(`${COMMUNITY_API}/tags`);
    const data = response.data;
    return data.items || data || [];
  } catch {
    return [];
  }
}

export interface CollectionItem {
  id: string;
  question: Question;
  folder_name: string | null;
  note: string | null;
  created_at: string;
}

/**
 * 获取我的收藏列表
 */
export async function getMyCollections(params?: {
  folder_name?: string;
  page?: number;
  page_size?: number;
}): Promise<PaginatedResponse<CollectionItem>> {
  const response = await apiClient.get(`${COMMUNITY_API}/collections/my`, { params });
  return response.data;
}

// ==================== User Profile APIs ====================

export interface UserStats {
  question_count: number;
  answer_count: number;
  like_received_count: number;
  collection_count: number;
}

export interface UserProfile {
  id: string;
  nickname: string;
  email: string;
  avatar_url: string | null;
  role: string;
  is_certified: boolean;
  certification_title: string | null;
  stats: UserStats;
  created_at: string;
}

export interface UserProfileUpdateParams {
  nickname?: string;
  email?: string;
  avatar_url?: string;
  role?: 'mom' | 'dad' | 'family';
}

export interface MyQuestionItem {
  id: string;
  title: string;
  content_preview: string;
  channel: string;
  tags: Array<{ id: string; name: string; slug: string }>;
  view_count: number;
  answer_count: number;
  like_count: number;
  collection_count: number;
  status: string;
  has_accepted_answer: boolean;
  is_liked: boolean;
  is_collected: boolean;
  created_at: string;
}

export interface QuestionBrief {
  id: string;
  title: string;
  channel: string;
}

export interface MyAnswerItem {
  id: string;
  content_preview: string;
  question: QuestionBrief;
  is_professional: boolean;
  is_accepted: boolean;
  like_count: number;
  comment_count: number;
  status: string;
  is_liked: boolean;
  created_at: string;
}

/**
 * 获取当前用户资料
 */
export async function getMyProfile(): Promise<UserProfile> {
  const response = await apiClient.get(`${COMMUNITY_API}/users/me`);
  return response.data;
}

/**
 * 更新当前用户资料
 */
export async function updateMyProfile(params: UserProfileUpdateParams): Promise<UserProfile> {
  const response = await apiClient.put(`${COMMUNITY_API}/users/me`, params);
  return response.data;
}

/**
 * 获取我的提问列表
 */
export async function getMyQuestions(params?: {
  page?: number;
  page_size?: number;
}): Promise<PaginatedResponse<MyQuestionItem>> {
  const response = await apiClient.get(`${COMMUNITY_API}/users/me/questions`, { params });
  return response.data;
}

/**
 * 获取我的回答列表
 */
export async function getMyAnswers(params?: {
  page?: number;
  page_size?: number;
}): Promise<PaginatedResponse<MyAnswerItem>> {
  const response = await apiClient.get(`${COMMUNITY_API}/users/me/answers`, { params });
  return response.data;
}

// ==================== Comment APIs ====================

export interface CommentAuthor {
  id: string;
  nickname: string;
  avatar_url: string | null;
  role: string;
  is_certified: boolean;
  certification_title?: string;
}

export interface Comment {
  id: string;
  answer_id: string;
  author: CommentAuthor;
  content: string;
  parent_id: string | null;
  reply_to_user: CommentAuthor | null;
  like_count: number;
  is_liked: boolean;
  created_at: string;
  replies: Comment[];
}

/**
 * 获取回答的评论列表
 */
export async function getComments(answerId: string): Promise<Comment[]> {
  const response = await apiClient.get(`${COMMUNITY_API}/answers/${answerId}/comments`);
  return response.data;
}

/**
 * 创建评论
 */
export async function createComment(
  answerId: string,
  params: { content: string; parent_id?: string }
): Promise<Comment> {
  const response = await apiClient.post(`${COMMUNITY_API}/answers/${answerId}/comments`, params);
  return response.data;
}

/**
 * 删除评论
 */
export async function deleteComment(commentId: string): Promise<void> {
  await apiClient.delete(`${COMMUNITY_API}/comments/${commentId}`);
}

// ==================== Certification APIs ====================

export type CertificationType = 'certified_doctor' | 'certified_therapist' | 'certified_nurse';
export type CertificationStatusType = 'pending' | 'approved' | 'rejected' | 'expired';

export interface CertificationCreate {
  certification_type: CertificationType;
  real_name: string;
  id_card_number?: string;
  license_number: string;
  hospital_or_institution: string;
  department?: string;
  title?: string;
  license_image_url: string;
  id_card_image_url?: string;
  additional_docs_urls?: string[];
}

export interface CertificationStatus {
  id: string;
  user_id: string;
  certification_type: CertificationType;
  real_name: string;
  license_number: string;
  hospital_or_institution: string;
  department: string | null;
  title: string | null;
  status: CertificationStatusType;
  review_comment: string | null;
  reviewed_at: string | null;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 获取我的认证状态
 */
export async function getMyCertification(): Promise<CertificationStatus | null> {
  const response = await apiClient.get(`${COMMUNITY_API}/certifications/my`);
  return response.data;
}

/**
 * 提交认证申请
 */
export async function createCertification(data: CertificationCreate): Promise<CertificationStatus> {
  const response = await apiClient.post(`${COMMUNITY_API}/certifications`, data);
  return response.data;
}
