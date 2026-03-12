import apiClient from '@/lib/apiClient'

export interface Photo {
  id: string
  title: string
  description: string
  tags: string[]
  image_url: string
  is_on_wall: boolean
  wall_position: number | null
  source: 'upload' | 'ai_generated'
  owner_id: string
  owner_nickname: string
  created_at: string
  updated_at: string
}

export interface PhotoListResponse {
  photos: Photo[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export function getPhotos(page = 1, pageSize = 50): Promise<PhotoListResponse> {
  return apiClient
    .get('/api/v1/photos', { params: { page, page_size: pageSize } })
    .then((r) => r.data)
}

export function uploadPhoto(file: File, title?: string): Promise<Photo> {
  const formData = new FormData()
  formData.append('photo', file)
  if (title) formData.append('title', title)
  return apiClient.post('/api/v1/photos/upload', formData).then((r) => r.data)
}

export function generatePhoto(prompt: string): Promise<Photo> {
  return apiClient.post('/api/v1/photos/generate', { prompt }).then((r) => r.data)
}

export function updatePhoto(
  id: string,
  data: { title?: string; description?: string; tags?: string[] },
): Promise<Photo> {
  return apiClient.put(`/api/v1/photos/${id}`, data).then((r) => r.data)
}

export function deletePhoto(id: string): Promise<void> {
  return apiClient.delete(`/api/v1/photos/${id}`)
}

export function togglePhotoWall(
  id: string,
  isOnWall: boolean,
  wallPosition?: number,
): Promise<Photo> {
  return apiClient
    .put(`/api/v1/photos/${id}/wall`, {
      is_on_wall: isOnWall,
      wall_position: wallPosition ?? null,
    })
    .then((r) => r.data)
}

export function batchUpdateWall(
  photos: Array<{ photo_id: string; position: number }>,
): Promise<{ photos: Photo[] }> {
  return apiClient.put('/api/v1/photos/wall', { photos }).then((r) => r.data)
}
