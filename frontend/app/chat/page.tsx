/**
 * Chat Page - 愈
 * AI emotional support chat (贝壳姐姐)
 * Design: Calm-inspired soft gradients, glassmorphism
 */

"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { getIdentity, UserIdentity } from '../../lib/api/beach';
import BottomNav from '../../components/BottomNav';
import apiClient from '../../lib/apiClient';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Calm-inspired Theme colors
const THEME = {
  mom: {
    bg: 'linear-gradient(180deg, #F8F6FF 0%, #F3EFFF 50%, #EDE7FF 100%)',
    text: '#4A4063',
    textLight: '#7B6F99',
    accent: '#B8A9E8',
    accentGradient: 'linear-gradient(135deg, #B8A9E8 0%, #D4C8F0 100%)',
    card: 'rgba(255, 255, 255, 0.72)',
    cardBorder: 'rgba(184, 169, 232, 0.25)',
    headerBg: 'rgba(248, 246, 255, 0.92)',
    inputBg: 'rgba(255, 255, 255, 0.5)',
    glow: 'rgba(184, 169, 232, 0.35)',
    userBubble: 'linear-gradient(135deg, #B8A9E8 0%, #D4C8F0 100%)',
    assistantBubble: 'rgba(255, 255, 255, 0.85)',
  },
  dad: {
    bg: 'linear-gradient(180deg, #0D1B2A 0%, #1B2838 50%, #1F3044 100%)',
    text: '#E8EEF4',
    textLight: '#8BA4BC',
    accent: '#64B5F6',
    accentGradient: 'linear-gradient(135deg, #64B5F6 0%, #90CAF9 100%)',
    card: 'rgba(27, 40, 56, 0.75)',
    cardBorder: 'rgba(100, 181, 246, 0.18)',
    headerBg: 'rgba(13, 27, 42, 0.92)',
    inputBg: 'rgba(27, 40, 56, 0.5)',
    glow: 'rgba(100, 181, 246, 0.3)',
    userBubble: 'linear-gradient(135deg, #64B5F6 0%, #90CAF9 100%)',
    assistantBubble: 'rgba(27, 40, 56, 0.85)',
  },
};

export default function ChatPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isMom = identity === 'origin_seeker';
  const theme = isMom ? THEME.mom : THEME.dad;

  useEffect(() => {
    async function init() {
      if (!authLoading) {
        if (!isAuthenticated) {
          router.push('/');
          return;
        }
        try {
          const data = await getIdentity();
          setIdentity(data.identity);
          // Add welcome message
          const welcomeText = data.identity === 'origin_seeker'
            ? '你好亲爱的，我是贝壳姐姐 🐚\n\n有什么想聊的吗？无论是开心的事还是烦心的事，我都愿意倾听。'
            : '你好，我是贝壳姐姐 🐚\n\n作为一位守护者，你承担着重要的责任。有什么想聊的吗？关于如何更好地支持你的伴侣，或者你自己的感受，我都愿意倾听。';

          setMessages([
            {
              id: '1',
              role: 'assistant',
              content: welcomeText,
              timestamp: new Date(),
            },
          ]);
        } catch {
          router.push('/');
        } finally {
          setIsLoading(false);
        }
      }
    }
    init();
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsSending(true);

    try {
      // Backend expects { content: string, session_id?: string }
      const response = await apiClient.post('/api/v1/companion/chat', {
        content: userMessage.content,
      });

      // Backend returns { text: string, visual_metadata: {...}, memory_updated: bool }
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.text || '抱歉，我暂时无法回应。',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，出了点问题。请稍后再试。',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.bg }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="text-4xl"
        >
          🐚
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: theme.bg }}>
      {/* Header */}
      <div
        className="sticky top-0 z-40 px-6 py-4 backdrop-blur-xl border-b"
        style={{
          backgroundColor: theme.headerBg,
          borderColor: theme.cardBorder,
        }}
      >
        <div className="flex items-center justify-center gap-3">
          <motion.span
            className="text-3xl"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🐚
          </motion.span>
          <div className="text-center">
            <h1 className="text-xl font-serif font-medium" style={{ color: theme.text }}>贝壳姐姐</h1>
            <p className="text-xs mt-0.5" style={{ color: theme.textLight }}>
              你的情感支持伙伴
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-40">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex mb-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center mr-2 flex-shrink-0"
                  style={{
                    background: isMom
                      ? 'linear-gradient(135deg, #D4C8F0 0%, #B8A9E8 100%)'
                      : 'linear-gradient(135deg, rgba(100,181,246,0.3) 0%, rgba(144,202,249,0.3) 100%)',
                  }}
                >
                  <span className="text-lg">🐚</span>
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 backdrop-blur-md ${
                  message.role === 'user'
                    ? 'rounded-br-md'
                    : 'rounded-bl-md'
                } ${isMom ? 'glass-card' : 'glass-card-dark'}`}
                style={{
                  background: message.role === 'user'
                    ? theme.userBubble
                    : theme.assistantBubble,
                  color: message.role === 'user'
                    ? (isMom ? '#4A4063' : '#0D1B2A')
                    : theme.text,
                  border: `1px solid ${theme.cardBorder}`,
                  boxShadow: message.role === 'assistant'
                    ? `0 4px 20px ${theme.glow}`
                    : `0 4px 15px ${theme.glow}`,
                }}
              >
                <p
                  className="whitespace-pre-wrap text-sm leading-relaxed break-words"
                  style={{
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                  }}
                >
                  {message.content}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isSending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start mb-4"
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center mr-2 flex-shrink-0"
              style={{
                background: isMom
                  ? 'linear-gradient(135deg, #D4C8F0 0%, #B8A9E8 100%)'
                  : 'linear-gradient(135deg, rgba(100,181,246,0.3) 0%, rgba(144,202,249,0.3) 100%)',
              }}
            >
              <span className="text-lg">🐚</span>
            </div>
            <div
              className={`rounded-2xl rounded-bl-md px-4 py-3 backdrop-blur-md ${isMom ? 'glass-card' : 'glass-card-dark'}`}
              style={{
                background: theme.assistantBubble,
                border: `1px solid ${theme.cardBorder}`,
              }}
            >
              <motion.div
                className="flex gap-1.5"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.accent }} />
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.accent }} />
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.accent }} />
              </motion.div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area with backdrop blur */}
      <div
        className="fixed bottom-20 left-0 right-0 px-4 py-3 backdrop-blur-xl border-t"
        style={{
          backgroundColor: theme.headerBg,
          borderColor: theme.cardBorder,
        }}
      >
        <div className="flex gap-3 max-w-2xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="说点什么..."
            className={`flex-1 px-5 py-3 rounded-2xl border focus:outline-none focus:ring-2 transition-all text-sm backdrop-blur-md ${isMom ? 'glass-card' : 'glass-card-dark'}`}
            style={{
              backgroundColor: theme.inputBg,
              borderColor: theme.cardBorder,
              color: theme.text,
            }}
            disabled={isSending}
          />
          <motion.button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="px-6 py-3 rounded-2xl font-medium disabled:opacity-50 transition-all"
            style={{
              background: theme.accentGradient,
              color: isMom ? '#4A4063' : '#0D1B2A',
              boxShadow: `0 4px 15px ${theme.glow}`,
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            发送
          </motion.button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav currentPage="chat" identity={identity} />
    </div>
  );
}
