// frontend/lib/api/community.ts
/**
 * 社区 API 服务
 */

import type { Question, Answer, ChannelType } from '../../types/community';
import { getUserId } from '../user';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
const COMMUNITY_API = `${API_BASE}/api/v1/community`;

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
  const searchParams = new URLSearchParams();

  if (params?.channel) searchParams.set('channel', params.channel);
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
  if (params?.sort_by) searchParams.set('sort_by', params.sort_by);
  if (params?.order) searchParams.set('order', params.order);

  const url = `${COMMUNITY_API}/questions/${searchParams.toString() ? '?' + searchParams.toString() : ''}`;

  const response = await fetch(url, {
    headers: {
      'X-User-ID': getUserId(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch questions');
  }

  return response.json();
}

/**
 * 按频道获取问题列表
 */
export async function getQuestionsByChannel(
  channel: ChannelType,
  page: number = 1,
  page_size: number = 20
): Promise<PaginatedResponse<Question>> {
  const url = `${COMMUNITY_API}/questions/channel/${channel}?page=${page}&page_size=${page_size}`;

  const response = await fetch(url, {
    headers: {
      'X-User-ID': getUserId(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch questions');
  }

  return response.json();
}

/**
 * 获取热门问题
 */
export async function getHotQuestions(
  page: number = 1,
  page_size: number = 20
): Promise<PaginatedResponse<Question>> {
  const url = `${COMMUNITY_API}/questions/hot?page=${page}&page_size=${page_size}`;

  const response = await fetch(url, {
    headers: {
      'X-User-ID': getUserId(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch hot questions');
  }

  return response.json();
}

/**
 * 获取问题详情
 */
export async function getQuestion(questionId: string): Promise<Question> {
  const url = `${COMMUNITY_API}/questions/${questionId}`;

  const response = await fetch(url, {
    headers: {
      'X-User-ID': getUserId(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch question');
  }

  return response.json();
}

/**
 * 创建问题
 */
export async function createQuestion(params: QuestionCreateParams): Promise<Question> {
  const url = `${COMMUNITY_API}/questions/`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-ID': getUserId(),
    },
    body: JSON.stringify({
      title: params.title,
      content: params.content,
      channel: params.channel,
      tag_ids: params.tag_ids || [],
      image_urls: params.image_urls || [],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '发布失败' }));
    throw new Error(error.detail || '发布失败');
  }

  return response.json();
}

/**
 * 点赞问题（toggle）
 */
export async function toggleLike(
  targetType: 'question' | 'answer' | 'comment',
  targetId: string
): Promise<LikeStatus> {
  const url = `${COMMUNITY_API}/likes`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-ID': getUserId(),
    },
    body: JSON.stringify({
      target_type: targetType,
      target_id: targetId,
    }),
  });

  if (!response.ok) {
    throw new Error('操作失败');
  }

  return response.json();
}

/**
 * 收藏问题（toggle）
 */
export async function toggleCollection(questionId: string): Promise<{ is_collected: boolean; collection_count: number }> {
  const url = `${COMMUNITY_API}/collections`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-ID': getUserId(),
    },
    body: JSON.stringify({
      question_id: questionId,
    }),
  });

  if (!response.ok) {
    throw new Error('操作失败');
  }

  return response.json();
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
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
  if (params?.sort_by) searchParams.set('sort_by', params.sort_by);
  if (params?.order) searchParams.set('order', params.order);

  const url = `${COMMUNITY_API}/questions/${questionId}/answers${searchParams.toString() ? '?' + searchParams.toString() : ''}`;

  const response = await fetch(url, {
    headers: {
      'X-User-ID': getUserId(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch answers');
  }

  return response.json();
}

/**
 * 创建回答
 */
export async function createAnswer(
  questionId: string,
  params: AnswerCreateParams
): Promise<Answer> {
  const url = `${COMMUNITY_API}/questions/${questionId}/answers`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-ID': getUserId(),
    },
    body: JSON.stringify({
      content: params.content,
      image_urls: params.image_urls || [],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '回复失败' }));
    throw new Error(error.detail || '回复失败');
  }

  return response.json();
}

/**
 * 删除问题
 */
export async function deleteQuestion(questionId: string): Promise<void> {
  const url = `${COMMUNITY_API}/questions/${questionId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'X-User-ID': getUserId(),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '删除失败' }));
    throw new Error(error.detail || '删除失败');
  }
}

/**
 * 删除回答
 */
export async function deleteAnswer(answerId: string): Promise<void> {
  const url = `${COMMUNITY_API}/answers/${answerId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'X-User-ID': getUserId(),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '删除失败' }));
    throw new Error(error.detail || '删除失败');
  }
}

/**
 * 获取标签列表
 */
export async function getTags(): Promise<Array<{ id: string; name: string; slug: string }>> {
  const url = `${COMMUNITY_API}/tags/`;

  const response = await fetch(url);

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return data.items || data || [];
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
  const searchParams = new URLSearchParams();

  if (params?.folder_name) searchParams.set('folder_name', params.folder_name);
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.page_size) searchParams.set('page_size', params.page_size.toString());

  const url = `${COMMUNITY_API}/collections/my${searchParams.toString() ? '?' + searchParams.toString() : ''}`;

  const response = await fetch(url, {
    headers: {
      'X-User-ID': getUserId(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch collections');
  }

  return response.json();
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
  avatar_url: string | null;
  role: string;
  is_certified: boolean;
  certification_title: string | null;
  stats: UserStats;
  created_at: string;
}

export interface UserProfileUpdateParams {
  nickname?: string;
  avatar_url?: string;
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
  const url = `${COMMUNITY_API}/users/me`;

  const response = await fetch(url, {
    headers: {
      'X-User-ID': getUserId(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }

  return response.json();
}

/**
 * 更新当前用户资料
 */
export async function updateMyProfile(params: UserProfileUpdateParams): Promise<UserProfile> {
  const url = `${COMMUNITY_API}/users/me`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-User-ID': getUserId(),
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '更新失败' }));
    throw new Error(error.detail || '更新失败');
  }

  return response.json();
}

/**
 * 获取我的提问列表
 */
export async function getMyQuestions(params?: {
  page?: number;
  page_size?: number;
}): Promise<PaginatedResponse<MyQuestionItem>> {
  const searchParams = new URLSearchParams();

  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.page_size) searchParams.set('page_size', params.page_size.toString());

  const url = `${COMMUNITY_API}/users/me/questions${searchParams.toString() ? '?' + searchParams.toString() : ''}`;

  const response = await fetch(url, {
    headers: {
      'X-User-ID': getUserId(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch my questions');
  }

  return response.json();
}

/**
 * 获取我的回答列表
 */
export async function getMyAnswers(params?: {
  page?: number;
  page_size?: number;
}): Promise<PaginatedResponse<MyAnswerItem>> {
  const searchParams = new URLSearchParams();

  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.page_size) searchParams.set('page_size', params.page_size.toString());

  const url = `${COMMUNITY_API}/users/me/answers${searchParams.toString() ? '?' + searchParams.toString() : ''}`;

  const response = await fetch(url, {
    headers: {
      'X-User-ID': getUserId(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch my answers');
  }

  return response.json();
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
  const url = `${COMMUNITY_API}/answers/${answerId}/comments`;

  const response = await fetch(url, {
    headers: {
      'X-User-ID': getUserId(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch comments');
  }

  return response.json();
}

/**
 * 创建评论
 */
export async function createComment(
  answerId: string,
  params: { content: string; parent_id?: string }
): Promise<Comment> {
  const url = `${COMMUNITY_API}/answers/${answerId}/comments`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-ID': getUserId(),
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '评论失败' }));
    throw new Error(error.detail || '评论失败');
  }

  return response.json();
}

/**
 * 删除评论
 */
export async function deleteComment(commentId: string): Promise<void> {
  const url = `${COMMUNITY_API}/comments/${commentId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'X-User-ID': getUserId(),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '删除失败' }));
    throw new Error(error.detail || '删除失败');
  }
}
