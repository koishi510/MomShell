import apiClient from '@/lib/apiClient'
import type { PaginatedResponse } from './community'

export interface PartnerInfo {
  id: string
  nickname: string
  avatar_url: string | null
  role: string
}

export interface UserProfile {
  id: string
  username: string
  nickname: string
  email: string
  avatar_url: string | null
  role: string
  shell_code: string | null
  partner: PartnerInfo | null
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
  username?: string
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

export function uploadAvatar(file: File): Promise<UserProfile> {
  const form = new FormData()
  form.append('avatar', file)
  return apiClient
    .post('/api/v1/community/users/me/avatar', form)
    .then((r) => r.data)
}

export function generateShellCode(): Promise<UserProfile> {
  return apiClient
    .post('/api/v1/community/users/me/shell-code')
    .then((r) => r.data)
}

export function bindPartner(shellCode: string): Promise<UserProfile> {
  return apiClient
    .post('/api/v1/community/users/me/bind', { shell_code: shellCode })
    .then((r) => r.data)
}

export function unbindPartner(): Promise<UserProfile> {
  return apiClient
    .delete('/api/v1/community/users/me/bind')
    .then((r) => r.data)
}
