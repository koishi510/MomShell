import apiClient from '@/lib/apiClient'

// ==================== Types ====================

export interface Author {
  id: string
  nickname: string
  avatar_url: string | null
  role: string
  display_tag: string
  is_certified: boolean
  certification_title: string | null
}

export interface TagInfo {
  id: string
  name: string
  slug: string
}

export interface TagListItem {
  id: string
  name: string
  slug: string
  description: string | null
  question_count: number
  follower_count: number
  is_active: boolean
  is_featured: boolean
}

export interface QuestionListItem {
  id: string
  title: string
  content_preview: string
  channel: string
  author: Author
  tags: TagInfo[]
  view_count: number
  answer_count: number
  like_count: number
  collection_count: number
  is_pinned: boolean
  is_featured: boolean
  has_accepted_answer: boolean
  is_liked: boolean
  is_collected: boolean
  created_at: string
}

export interface QuestionDetail {
  id: string
  title: string
  content: string
  content_preview: string
  channel: string
  status: string
  author: Author
  tags: TagInfo[]
  image_urls: string[]
  view_count: number
  answer_count: number
  like_count: number
  collection_count: number
  is_pinned: boolean
  is_featured: boolean
  has_accepted_answer: boolean
  accepted_answer_id: string | null
  is_liked: boolean
  is_collected: boolean
  professional_answer_count: number
  experience_answer_count: number
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface AnswerListItem {
  id: string
  question_id: string
  author: Author
  content: string
  content_preview: string
  is_professional: boolean
  is_accepted: boolean
  like_count: number
  comment_count: number
  is_liked: boolean
  created_at: string
}

export interface CommentListItem {
  id: string
  answer_id: string
  author: Author
  content: string
  parent_id: string | null
  reply_to_user: Author | null
  like_count: number
  is_liked: boolean
  created_at: string
  replies: CommentListItem[]
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// ==================== Questions ====================

export function getQuestions(params?: {
  channel?: string
  tag_id?: string
  page?: number
  page_size?: number
  sort_by?: string
  order?: string
}): Promise<PaginatedResponse<QuestionListItem>> {
  return apiClient.get('/api/v1/community/questions', { params }).then((r) => r.data)
}

export function getHotQuestions(params?: {
  page?: number
  page_size?: number
}): Promise<PaginatedResponse<QuestionListItem>> {
  return apiClient.get('/api/v1/community/questions/hot', { params }).then((r) => r.data)
}

export function getQuestion(id: string): Promise<QuestionDetail> {
  return apiClient.get(`/api/v1/community/questions/${id}`).then((r) => r.data)
}

export function createQuestion(data: {
  title: string
  content: string
  channel: string
  image_urls?: string[]
  tag_ids?: string[]
}): Promise<{ id: string; status: string }> {
  return apiClient.post('/api/v1/community/questions', data).then((r) => r.data)
}

export function updateQuestion(
  id: string,
  data: { title?: string; content?: string; tag_ids?: string[] },
): Promise<{ id: string; status: string }> {
  return apiClient.put(`/api/v1/community/questions/${id}`, data).then((r) => r.data)
}

export function deleteQuestion(id: string): Promise<{ message: string }> {
  return apiClient.delete(`/api/v1/community/questions/${id}`).then((r) => r.data)
}

// ==================== Answers ====================

export function getAnswers(
  questionId: string,
  params?: { page?: number; page_size?: number; sort_by?: string; order?: string },
): Promise<PaginatedResponse<AnswerListItem>> {
  return apiClient
    .get(`/api/v1/community/questions/${questionId}/answers`, { params })
    .then((r) => r.data)
}

export function createAnswer(
  questionId: string,
  content: string,
): Promise<AnswerListItem> {
  return apiClient
    .post(`/api/v1/community/questions/${questionId}/answers`, { content })
    .then((r) => r.data)
}

export function updateAnswer(
  answerId: string,
  content: string,
): Promise<{ id: string }> {
  return apiClient
    .put(`/api/v1/community/answers/${answerId}`, { content })
    .then((r) => r.data)
}

export function deleteAnswer(answerId: string): Promise<{ message: string }> {
  return apiClient.delete(`/api/v1/community/answers/${answerId}`).then((r) => r.data)
}

// ==================== Comments ====================

export function getComments(answerId: string): Promise<CommentListItem[]> {
  return apiClient
    .get(`/api/v1/community/answers/${answerId}/comments`)
    .then((r) => r.data)
}

export function createComment(
  answerId: string,
  data: { content: string; parent_id?: string },
): Promise<CommentListItem> {
  return apiClient
    .post(`/api/v1/community/answers/${answerId}/comments`, data)
    .then((r) => r.data)
}

export function deleteComment(commentId: string): Promise<{ message: string }> {
  return apiClient.delete(`/api/v1/community/comments/${commentId}`).then((r) => r.data)
}

// ==================== Likes ====================

export function toggleLike(
  target_type: 'question' | 'answer' | 'comment',
  target_id: string,
  isLiked: boolean,
): Promise<{ is_liked: boolean; new_count: number }> {
  if (isLiked) {
    return apiClient
      .delete('/api/v1/community/likes', { data: { target_type, target_id } })
      .then((r) => r.data)
  }
  return apiClient
    .post('/api/v1/community/likes', { target_type, target_id })
    .then((r) => r.data)
}

// ==================== Collections ====================

export function toggleCollection(
  question_id: string,
  isCollected: boolean,
): Promise<{ is_collected: boolean; new_count: number }> {
  if (isCollected) {
    return apiClient
      .delete(`/api/v1/community/collections/${question_id}`)
      .then((r) => r.data)
  }
  return apiClient
    .post('/api/v1/community/collections', { question_id })
    .then((r) => r.data)
}

export function getMyCollections(params?: {
  page?: number
  page_size?: number
}): Promise<PaginatedResponse<{ id: string; question: QuestionListItem; folder_name: string | null; note: string | null; created_at: string }>> {
  return apiClient
    .get('/api/v1/community/collections/my', { params })
    .then((r) => r.data)
}

// ==================== Tags ====================

export function getTags(): Promise<TagListItem[]> {
  return apiClient.get('/api/v1/community/tags').then((r) => r.data)
}

export function getHotTags(): Promise<TagListItem[]> {
  return apiClient.get('/api/v1/community/tags/hot').then((r) => r.data)
}
