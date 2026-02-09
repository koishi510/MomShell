// frontend/lib/api/shell.ts
/**
 * Shell UI API client - 贝壳/沙滩功能 API
 */

import apiClient from '../apiClient';

const ECHO_API = '/api/v1/echo';

// ============================================================
// Types
// ============================================================

export type ShellState = 'dusty' | 'muddy' | 'clean' | 'golden';
export type WishStatus = 'pending' | 'accepted' | 'fulfilled';
export type StickerType = 'memory' | 'wish' | 'injected';

export interface ShellData {
  id: string;
  label: string;
  state: ShellState;
  position_x: number;
  position_y: number;
  is_task: boolean;
  is_wish: boolean;
  sticker_id: string | null;
  wish_id: string | null;
  created_at: string;
}

export interface BeachShellsResponse {
  shells: ShellData[];
  dusty_count: number;
  muddy_count: number;
  clean_count: number;
  golden_count: number;
}

export interface WishBottle {
  id: string;
  content: string;
  status: WishStatus;
  created_at: string;
  accepted_at: string | null;
  fulfilled_at: string | null;
  confirmed_at: string | null;
  sender_nickname?: string;
}

export interface WishSeaResponse {
  wishes: WishBottle[];
  pending_count: number;
  accepted_count: number;
  fulfilled_count: number;
}

export interface MemorySticker {
  id: string;
  title: string;
  memory_text: string;
  image_url: string;
  tags_used: string[];
  sticker_type: StickerType;
  is_new: boolean;
  created_at: string;
}

export interface StickerListResponse {
  stickers: MemorySticker[];
  total: number;
  new_count: number;
}

export interface InjectMemoryResponse {
  id: string;
  shell_id: string;
  message: string;
}

// ============================================================
// API Functions
// ============================================================

/**
 * Get all shells on the user's beach
 */
export async function getBeachShells(): Promise<BeachShellsResponse> {
  const response = await apiClient.get(`${ECHO_API}/shells`);
  return response.data;
}

/**
 * Send a wish bottle to partner (Mom mode)
 */
export async function sendWish(content: string): Promise<WishBottle> {
  const response = await apiClient.post(`${ECHO_API}/wish`, { content });
  return response.data;
}

/**
 * Get wish sea with all wish bottles (Partner mode)
 */
export async function getWishSea(): Promise<WishSeaResponse> {
  const response = await apiClient.get(`${ECHO_API}/wish-sea`);
  return response.data;
}

/**
 * Accept a wish bottle (Partner mode)
 */
export async function acceptWish(wishId: string): Promise<{ message: string }> {
  const response = await apiClient.post(`${ECHO_API}/wish/${wishId}/accept`);
  return response.data;
}

/**
 * Mark a wish as fulfilled (Partner mode)
 */
export async function fulfillWish(wishId: string, note?: string): Promise<WishBottle> {
  const response = await apiClient.post(`${ECHO_API}/wish/${wishId}/fulfill`, { note });
  return response.data;
}

/**
 * Confirm wish was fulfilled (Mom mode)
 */
export async function confirmWishFulfilled(wishId: string): Promise<WishBottle> {
  const response = await apiClient.post(`${ECHO_API}/wish/${wishId}/confirm`);
  return response.data;
}

/**
 * Create a memory sticker from shell cleaning (Mom mode)
 */
export async function createMemorySticker(
  tags: string[],
  memoryText?: string
): Promise<MemorySticker> {
  const response = await apiClient.post(`${ECHO_API}/memory`, {
    tags,
    memory_text: memoryText,
  });
  return response.data;
}

/**
 * Get memory sticker collection
 */
export async function getStickers(
  limit: number = 20,
  offset: number = 0
): Promise<StickerListResponse> {
  const response = await apiClient.get(`${ECHO_API}/stickers`, {
    params: { limit, offset },
  });
  return response.data;
}

/**
 * Mark a sticker as viewed (remove 'new' flag)
 */
export async function markStickerViewed(stickerId: string): Promise<{ message: string }> {
  const response = await apiClient.post(`${ECHO_API}/stickers/${stickerId}/view`);
  return response.data;
}

/**
 * Inject a memory to create a golden shell on mom's beach (Partner mode)
 */
export async function injectMemory(
  content: string,
  imageUrl?: string
): Promise<InjectMemoryResponse> {
  const response = await apiClient.post(`${ECHO_API}/inject-memory`, {
    content,
    image_url: imageUrl,
  });
  return response.data;
}
