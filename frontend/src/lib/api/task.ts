import apiClient from "@/lib/apiClient";

export interface UserTaskItem {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: number;
  status: string;
  score: number | null;
  comment: string | null;
  completed_at: string | null;
  scored_at: string | null;
  date: string;
}

export interface TaskStats {
  xp: number;
  level: number;
}

export function getDailyTasks(): Promise<UserTaskItem[]> {
  return apiClient.get("/api/v1/tasks/daily").then((r) => r.data);
}

export function completeTask(id: string): Promise<UserTaskItem> {
  return apiClient.post(`/api/v1/tasks/${id}/complete`).then((r) => r.data);
}

export function getPartnerTasks(): Promise<UserTaskItem[]> {
  return apiClient.get("/api/v1/tasks/partner").then((r) => r.data);
}

export function scoreTask(
  id: string,
  data: { score: number; comment?: string },
): Promise<UserTaskItem> {
  return apiClient.post(`/api/v1/tasks/${id}/score`, data).then((r) => r.data);
}

export function getTaskStats(): Promise<TaskStats> {
  return apiClient.get("/api/v1/tasks/stats").then((r) => r.data);
}
