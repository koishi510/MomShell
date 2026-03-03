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

export function sendChatMessage(data: ChatRequest): Promise<ChatResponse> {
  return apiClient.post('/api/v1/companion/chat', data).then((r) => r.data)
}
