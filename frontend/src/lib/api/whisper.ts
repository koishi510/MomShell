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

export interface FutureLetterOption {
  id: string;
  label: string;
  hint: string;
}

export interface FutureLetterQuestion {
  id: string;
  prompt: string;
  options: FutureLetterOption[];
}

export interface FutureLetterAdviceItem {
  title: string;
  description: string;
  kind: string;
}

export interface FutureLetterAdviceSource {
  label: string;
  detail: string;
}

export interface FutureLetterResponseItem {
  id: string;
  letter_code: string;
  stage_tag: string;
  stage_label: string;
  state_tag: string;
  state_label: string;
  wish_content: string | null;
  dad_plan_code: string;
  dad_plan_title: string;
  dad_headline: string;
  dad_summary: string;
  dad_advice_items: FutureLetterAdviceItem[];
  dad_advice_sources: FutureLetterAdviceSource[];
  image_prompt: string;
  created_at: string;
}

export interface FutureLetterView {
  letter_code: string;
  title: string;
  intro: string;
  outro: string;
  signature: string;
  wish_prompt: string;
  paper_theme: string;
  scene_hint: string;
  questions: FutureLetterQuestion[];
  latest_response: FutureLetterResponseItem | null;
  recent_responses: FutureLetterResponseItem[];
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

export function getFutureLetter(): Promise<FutureLetterView> {
  return apiClient.get("/api/v1/whisper/future-letter").then((r) => r.data);
}

export function respondFutureLetter(data: {
  letter_code: string;
  stage_option_id: string;
  state_option_id: string;
  stage_option_label: string;
  state_option_label: string;
  wish_content?: string;
}): Promise<FutureLetterResponseItem> {
  return apiClient
    .post("/api/v1/whisper/future-letter/respond", data)
    .then((r) => r.data);
}

export function regenerateFutureLetter(): Promise<FutureLetterResponseItem> {
  return apiClient
    .post("/api/v1/whisper/future-letter/regenerate")
    .then((r) => r.data);
}
