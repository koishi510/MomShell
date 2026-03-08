import apiClient from "@/lib/apiClient";

export interface WhisperItem {
  id: string;
  content: string;
  created_at: string;
}

export interface WhisperTips {
  tips: string;
  whispers: WhisperItem[];
}

export function createWhisper(content: string): Promise<WhisperItem> {
  return apiClient.post("/api/v1/whisper", { content }).then((r) => r.data);
}

export function getWhispers(): Promise<WhisperItem[]> {
  return apiClient.get("/api/v1/whisper").then((r) => r.data);
}

export function getWhisperTips(): Promise<WhisperTips> {
  return apiClient.get("/api/v1/whisper/tips").then((r) => r.data);
}
