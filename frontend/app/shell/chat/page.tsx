// frontend/app/shell/chat/page.tsx
/**
 * AI 对话页 - 愈
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import {
  BeachBackground,
  TopHeader,
} from '../../../components/shell';
import { SHELL_COLORS, SPRING_CONFIGS } from '../../../lib/design-tokens';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Helper to get initial welcome message
function getWelcomeMessage(isPartner: boolean): Message {
  return {
    id: '0',
    role: 'assistant',
    content: isPartner
      ? '你好，守护者。感谢你愿意陪伴她。如果你有任何疑惑或需要建议，我随时在这里。'
      : '你好，我是你的心灵伙伴。在这片温暖的沙滩上，你可以放心地分享任何感受。有什么想聊的吗？',
    timestamp: new Date(),
  };
}

export default function ChatPage() {
  const { user } = useAuth();
  const pathname = usePathname();

  // 根据来源判断主题
  const isPartnerMode = pathname.includes('/partner');
  const theme = isPartnerMode ? 'night' : 'day';
  const colors = theme === 'day' ? SHELL_COLORS.mom : SHELL_COLORS.partner;

  const [messages, setMessages] = useState<Message[]>(() => [getWelcomeMessage(isPartnerMode)]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // 模拟 AI 回复
    await new Promise((r) => setTimeout(r, 1500));

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: theme === 'day'
        ? '我理解你的感受。每一位妈妈都是独特的，你正在经历的一切都是正常的。记住，你已经做得很好了。'
        : '你对她的关心很珍贵。记住，陪伴是最好的支持，你不需要完美，只需要在她身边。',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, aiMessage]);
    setIsTyping(false);
  };

  return (
    <BeachBackground theme={theme}>
      <TopHeader
        title="愈"
        theme={theme}
        avatarUrl={user?.avatar_url}
      />

      <main className="relative min-h-[calc(100vh-120px)] flex flex-col">
        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-32">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                className={`flex mb-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'
                  }`}
                  style={{
                    background: message.role === 'user'
                      ? `linear-gradient(135deg, ${colors.accent} 0%, ${theme === 'day' ? '#FFA726' : '#5C6BC0'} 100%)`
                      : theme === 'day'
                        ? 'rgba(255, 255, 255, 0.9)'
                        : 'rgba(255, 255, 255, 0.1)',
                    color: message.role === 'user'
                      ? 'white'
                      : colors.text,
                  }}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* 输入指示器 */}
          {isTyping && (
            <motion.div
              className="flex justify-start mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div
                className="rounded-2xl rounded-bl-sm px-4 py-3"
                style={{
                  background: theme === 'day'
                    ? 'rgba(255, 255, 255, 0.9)'
                    : 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{ background: colors.accent }}
                      animate={{ y: [0, -6, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.15,
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <motion.div
          className="fixed bottom-20 left-0 right-0 p-4"
          style={{
            background: `linear-gradient(0deg, ${colors.background} 80%, transparent 100%)`,
          }}
          initial={{ y: 100 }}
          animate={{ y: 0 }}
        >
          <div
            className="flex items-center gap-2 rounded-full px-4 py-2"
            style={{
              background: theme === 'day'
                ? 'rgba(255, 255, 255, 0.9)'
                : 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="说出你的心声..."
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: colors.text }}
            />

            <motion.button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${colors.accent} 0%, ${theme === 'day' ? '#FFA726' : '#5C6BC0'} 100%)`,
              }}
              whileTap={{ scale: 0.95 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
              </svg>
            </motion.button>
          </div>
        </motion.div>
      </main>
    </BeachBackground>
  );
}
