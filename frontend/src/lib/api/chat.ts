import apiClient from '@/lib/apiClient'

export interface ChatRequest {
  content: string
  session_id?: string | null
}

export interface VisualMetadata {
  effect_type: 'ripple' | 'sunlight' | 'calm' | 'warm_glow' | 'gentle_wave'
  intensity: number
  color_tone: string
}

export interface ChatResponse {
  text: string
  visual_metadata: VisualMetadata
  memory_updated: boolean
}

export interface ChatProfile {
  preferred_name: string | null
  has_pets: boolean
  pet_details: string | null
  interests: string[]
  concerns: string[]
  important_dates: string[]
  baby_age_weeks: number | null
  community_interactions: string[]
}

export interface MemoryFact {
  id: string
  content: string
  category: string
  created_at: string
  last_referenced_at: string | null
}

export interface MemoryFactsResponse {
  facts: MemoryFact[]
  total: number
}

export interface ConversationTurn {
  user_input: string
  assistant_response: string
}

export interface ConversationHistoryResponse {
  turns: ConversationTurn[]
  summary: string
}

export function sendChatMessage(data: ChatRequest): Promise<ChatResponse> {
  return apiClient.post('/api/v1/companion/chat', data).then((r) => r.data)
}

export function getChatProfile(): Promise<ChatProfile> {
  return apiClient.get('/api/v1/companion/profile').then((r) => r.data)
}

export function getMemories(): Promise<MemoryFactsResponse> {
  return apiClient.get('/api/v1/companion/memories').then((r) => r.data)
}

export function deleteMemory(id: string): Promise<void> {
  return apiClient.delete(`/api/v1/companion/memories/${id}`).then(() => undefined)
}

export function getConversationHistory(): Promise<ConversationHistoryResponse> {
  return apiClient.get('/api/v1/companion/history').then((r) => r.data)
}

export function clearConversationHistory(): Promise<void> {
  return apiClient.delete('/api/v1/companion/history').then(() => undefined)
}
