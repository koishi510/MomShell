import apiClient from '@/lib/apiClient'
import type { PaginatedResponse } from './community'

export interface UserProfile {
  id: string
  nickname: string
  email: string
  avatar_url: string | null
  role: string
  is_certified: boolean
  certification_title: string | null
  stats: UserStats
  created_at: string
}

export interface UserStats {
  question_count: number
  answer_count: number
  like_received_count: number
  collection_count: number
}

export interface MyQuestionListItem {
  id: string
  title: string
  content_preview: string
  channel: string
  tags: Array<{ id: string; name: string; slug: string }>
  view_count: number
  answer_count: number
  like_count: number
  collection_count: number
  status: string
  has_accepted_answer: boolean
  is_liked: boolean
  is_collected: boolean
  created_at: string
}

export interface MyAnswerListItem {
  id: string
  content_preview: string
  question: { id: string; title: string; channel: string }
  is_professional: boolean
  is_accepted: boolean
  like_count: number
  comment_count: number
  status: string
  is_liked: boolean
  created_at: string
}

export function getUserProfile(): Promise<UserProfile> {
  return apiClient.get('/api/v1/community/users/me').then((r) => r.data)
}

export function updateUserProfile(data: {
  nickname?: string
  email?: string
  avatar_url?: string
  role?: string
}): Promise<UserProfile> {
  return apiClient.put('/api/v1/community/users/me', data).then((r) => r.data)
}

export function getMyQuestions(params?: {
  page?: number
  page_size?: number
}): Promise<PaginatedResponse<MyQuestionListItem>> {
  return apiClient
    .get('/api/v1/community/users/me/questions', { params })
    .then((r) => r.data)
}

export function getMyAnswers(params?: {
  page?: number
  page_size?: number
}): Promise<PaginatedResponse<MyAnswerListItem>> {
  return apiClient
    .get('/api/v1/community/users/me/answers', { params })
    .then((r) => r.data)
}

export function changePassword(data: {
  old_password: string
  new_password: string
}): Promise<{ message: string }> {
  return apiClient
    .post('/api/v1/auth/change-password', data)
    .then((r) => r.data)
}
