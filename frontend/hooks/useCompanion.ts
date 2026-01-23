// frontend/hooks/useCompanion.ts
/**
 * Soulful Companion 状态管理 Hook
 */

import { useState, useCallback } from 'react';
import { sendMessage } from '@/lib/api';
import type { VisualResponse, VisualMetadata } from '@/types/companion';

interface UseCompanionReturn {
  isLoading: boolean;
  response: VisualResponse | null;
  visualState: VisualMetadata | null;
  error: string | null;
  sessionId: string | null;
  send: (content: string) => Promise<void>;
  triggerRipple: () => void;
  isRippling: boolean;
}

export function useCompanion(): UseCompanionReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<VisualResponse | null>(null);
  const [visualState, setVisualState] = useState<VisualMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isRippling, setIsRippling] = useState(false);

  const triggerRipple = useCallback(() => {
    setIsRippling(true);
    setTimeout(() => setIsRippling(false), 2000);
  }, []);

  const send = useCallback(async (content: string) => {
    if (!content.trim()) return;

    setIsLoading(true);
    setError(null);
    triggerRipple();

    try {
      const result = await sendMessage({
        content,
        session_id: sessionId,
      });

      setResponse(result);
      setVisualState(result.visual_metadata);

      // 首次对话时保存 session_id（后端会生成）
      if (!sessionId) {
        // 使用固定 session_id 或从响应中获取
        setSessionId(`session-${Date.now()}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败，请稍后再试');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, triggerRipple]);

  return {
    isLoading,
    response,
    visualState,
    error,
    sessionId,
    send,
    triggerRipple,
    isRippling,
  };
}
