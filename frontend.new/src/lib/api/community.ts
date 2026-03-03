import apiClient from '@/lib/apiClient'

export interface Author {
  id: string
  nickname: string
  avatar_url: string | null
  is_certified: boolean
  certification_title: string | null
}

export interface QuestionListItem {
  id: string
  title: string
  content_preview: string
  channel: string
  author: Author
  tags: Array<{ id: string; name: string }>
  view_count: number
  answer_count: number
  like_count: number
  collection_count: number
  is_liked: boolean
  is_collected: boolean
  created_at: string
}

export interface QuestionDetail extends QuestionListItem {
  content: string
  image_urls: string[]
}

export interface AnswerListItem {
  id: string
  question_id: string
  author: Author
  content: string
  content_preview: string
  is_professional: boolean
  like_count: number
  comment_count: number
  is_liked: boolean
  created_at: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

export function getQuestions(params?: {
  channel?: string
  page?: number
  page_size?: number
  sort_by?: string
}): Promise<PaginatedResponse<QuestionListItem>> {
  return apiClient.get('/api/v1/community/questions', { params }).then((r) => r.data)
}

export function getQuestion(id: string): Promise<QuestionDetail> {
  return apiClient.get(`/api/v1/community/questions/${id}`).then((r) => r.data)
}

export function createQuestion(data: {
  title: string
  content: string
  channel?: string
}): Promise<QuestionDetail> {
  return apiClient.post('/api/v1/community/questions', data).then((r) => r.data)
}

export function getAnswers(
  questionId: string,
  params?: { page?: number; page_size?: number },
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

export function toggleLike(
  target_type: 'question' | 'answer' | 'comment',
  target_id: string,
  isLiked: boolean,
): Promise<{ is_liked: boolean; like_count: number }> {
  if (isLiked) {
    return apiClient.delete('/api/v1/community/likes', { data: { target_type, target_id } }).then((r) => r.data)
  }
  return apiClient.post('/api/v1/community/likes', { target_type, target_id }).then((r) => r.data)
}
