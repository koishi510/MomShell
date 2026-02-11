/**
 * Beach API client for Shell Beach system v2.0
 */

import apiClient from '../apiClient';

export type UserIdentity = 'origin_seeker' | 'guardian';
export type ShellType = 'memory' | 'task' | 'wish' | 'gift';
export type ShellStatus = 'dusty' | 'opened' | 'completed';
export type BottleStatus = 'drifting' | 'caught' | 'completed';

export interface IdentityResponse {
  identity: UserIdentity | null;
  identity_locked: boolean;
  shell_code: string | null;
}

export interface Shell {
  id: string;
  shell_type: ShellType;
  status: ShellStatus;
  title: string;
  content: string | null;
  memory_tag: string | null;
  sticker_id: string | null;
  sticker_url: string | null;
  position_x: number | null;
  position_y: number | null;
  created_at: string;
  opened_at: string | null;
  completed_at: string | null;
}

export interface Sticker {
  id: string;
  prompt: string;
  style: string;
  memory_text: string;
  image_url: string;
  thumbnail_url: string | null;
  generation_status: string;
  created_at: string;
}

export interface DriftBottle {
  id: string;
  wish_content: string;
  status: BottleStatus;
  sender_nickname: string | null;
  receiver_nickname: string | null;
  created_at: string;
  caught_at: string | null;
  completed_at: string | null;
  mom_confirmed: boolean;
}

export interface MemoryInjection {
  id: string;
  content_type: 'text' | 'photo';
  content: string;
  title: string | null;
  status: 'pending' | 'seen' | 'converted';
  sticker_id: string | null;
  sticker_url: string | null;
  created_at: string;
  seen_at: string | null;
}

export interface BeachView {
  shells: Shell[];
  pending_bottles: number;
  pending_injections: number;
  partner_nickname: string | null;
  partner_avatar_url: string | null;
}

// Identity API
export async function getIdentity(): Promise<IdentityResponse> {
  const response = await apiClient.get<IdentityResponse>('/api/v1/beach/identity');
  return response.data;
}

export async function selectIdentity(identity: UserIdentity): Promise<IdentityResponse> {
  const response = await apiClient.post<IdentityResponse>('/api/v1/beach/identity/select', { identity });
  return response.data;
}

export async function getShellCode(): Promise<{ shell_code: string }> {
  const response = await apiClient.get<{ shell_code: string }>('/api/v1/beach/identity/shell-code');
  return response.data;
}

export async function pairWithPartner(partnerShellCode: string): Promise<{
  success: boolean;
  partner_nickname?: string;
  partner_avatar_url?: string;
  message: string;
}> {
  const response = await apiClient.post('/api/v1/beach/identity/pair', {
    partner_shell_code: partnerShellCode,
  });
  return response.data;
}

// Shell API
export async function getShells(shellType?: ShellType): Promise<{ shells: Shell[]; total: number }> {
  const params = shellType ? { shell_type: shellType } : {};
  const response = await apiClient.get('/api/v1/beach/shells', { params });
  return response.data;
}

export async function createShell(data: {
  title: string;
  content?: string;
  memory_tag?: string;
}): Promise<Shell> {
  const response = await apiClient.post<Shell>('/api/v1/beach/shells', data);
  return response.data;
}

export async function openShell(shellId: string, content: string): Promise<Shell> {
  const response = await apiClient.patch<Shell>(`/api/v1/beach/shells/${shellId}/open`, { content });
  return response.data;
}

export async function completeShell(shellId: string): Promise<Shell> {
  const response = await apiClient.patch<Shell>(`/api/v1/beach/shells/${shellId}/complete`);
  return response.data;
}

// Sticker API
export async function getStickers(): Promise<{ stickers: Sticker[]; total: number }> {
  const response = await apiClient.get('/api/v1/beach/stickers');
  return response.data;
}

export async function generateSticker(memoryText: string, style = 'sticker'): Promise<Sticker> {
  const response = await apiClient.post<Sticker>('/api/v1/beach/stickers/generate', {
    memory_text: memoryText,
    style,
  });
  return response.data;
}

// Drift Bottle API
export async function getBottles(): Promise<{ bottles: DriftBottle[]; total: number }> {
  const response = await apiClient.get('/api/v1/beach/bottles');
  return response.data;
}

export async function createBottle(wishContent: string): Promise<DriftBottle> {
  const response = await apiClient.post<DriftBottle>('/api/v1/beach/bottles', { wish_content: wishContent });
  return response.data;
}

export async function catchBottle(bottleId: string): Promise<{
  success: boolean;
  bottle?: DriftBottle;
  message: string;
}> {
  const response = await apiClient.patch(`/api/v1/beach/bottles/${bottleId}/catch`);
  return response.data;
}

export async function completeBottle(bottleId: string): Promise<DriftBottle> {
  const response = await apiClient.patch<DriftBottle>(`/api/v1/beach/bottles/${bottleId}/complete`);
  return response.data;
}

export async function confirmBottle(bottleId: string): Promise<DriftBottle> {
  const response = await apiClient.patch<DriftBottle>(`/api/v1/beach/bottles/${bottleId}/confirm`);
  return response.data;
}

// Memory Injection API
export async function getInjections(): Promise<{ injections: MemoryInjection[]; total: number }> {
  const response = await apiClient.get('/api/v1/beach/injections');
  return response.data;
}

export async function createInjection(data: {
  content_type: 'text' | 'photo';
  content: string;
  title?: string;
  generate_sticker?: boolean;
}): Promise<MemoryInjection> {
  const response = await apiClient.post<MemoryInjection>('/api/v1/beach/injections', data);
  return response.data;
}

export async function markInjectionSeen(injectionId: string): Promise<MemoryInjection> {
  const response = await apiClient.patch<MemoryInjection>(`/api/v1/beach/injections/${injectionId}/seen`);
  return response.data;
}

// Beach View API
export async function getBeachView(): Promise<BeachView> {
  const response = await apiClient.get<BeachView>('/api/v1/beach/view');
  return response.data;
}
