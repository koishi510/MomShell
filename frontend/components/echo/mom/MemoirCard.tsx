// frontend/components/echo/mom/MemoirCard.tsx
/**
 * 青春回忆录卡片组件
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ECHO_COLORS, GLASS_STYLES } from '../../../lib/design-tokens';
import { generateMemoir, rateMemoir } from '../../../lib/api/echo';
import type { Memoir } from '../../../types/echo';

interface MemoirCardProps {
  memoirs: Memoir[];
  onGenerate: () => void;
}

export function MemoirCard({ memoirs, onGenerate }: MemoirCardProps) {
  const [generating, setGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [theme, setTheme] = useState('');

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateMemoir(theme ? { theme } : undefined);
      setTheme('');
      onGenerate();
    } catch (error) {
      console.error('Failed to generate memoir:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleRate = async (memoirId: string, rating: number) => {
    try {
      await rateMemoir(memoirId, rating);
      onGenerate();
    } catch (error) {
      console.error('Failed to rate memoir:', error);
    }
  };

  return (
    <div className={`${GLASS_STYLES.medium} rounded-2xl p-6`}>
      <h3
        className="text-lg font-semibold mb-4"
        style={{ color: ECHO_COLORS.mom.text }}
      >
        青春回忆录
      </h3>

      {/* 生成区域 */}
      <div className="mb-6">
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="输入主题（可选）"
            className="flex-1 px-4 py-2 rounded-xl bg-white/50 border-0 outline-none placeholder:text-gray-400"
            style={{ color: ECHO_COLORS.mom.text }}
            disabled={generating}
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 rounded-xl text-white font-medium disabled:opacity-50"
            style={{ backgroundColor: ECHO_COLORS.mom.accent }}
          >
            {generating ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                ⏳
              </motion.span>
            ) : (
              '生成'
            )}
          </motion.button>
        </div>
        <p
          className="text-xs opacity-60"
          style={{ color: ECHO_COLORS.mom.text }}
        >
          基于你的身份标签，AI 将为你生成一段青春回忆
        </p>
      </div>

      {/* 回忆录列表 */}
      {memoirs.length === 0 ? (
        <p
          className="text-center opacity-50 py-8"
          style={{ color: ECHO_COLORS.mom.text }}
        >
          还没有回忆录，点击生成按钮创建第一篇
        </p>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {memoirs.map((memoir) => (
              <motion.div
                key={memoir.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white/40 rounded-xl overflow-hidden"
              >
                {/* 标题栏 */}
                <div
                  className="p-4 cursor-pointer flex items-center justify-between"
                  onClick={() =>
                    setExpandedId(expandedId === memoir.id ? null : memoir.id)
                  }
                >
                  <div>
                    <h4
                      className="font-medium"
                      style={{ color: ECHO_COLORS.mom.text }}
                    >
                      {memoir.title}
                    </h4>
                    <p className="text-xs opacity-60" style={{ color: ECHO_COLORS.mom.text }}>
                      {new Date(memoir.created_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <motion.div
                    animate={{ rotate: expandedId === memoir.id ? 180 : 0 }}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      style={{ color: ECHO_COLORS.mom.text }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </motion.div>
                </div>

                {/* 展开内容 */}
                <AnimatePresence>
                  {expandedId === memoir.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4">
                        <p
                          className="text-sm whitespace-pre-line mb-4"
                          style={{ color: ECHO_COLORS.mom.text }}
                        >
                          {memoir.content}
                        </p>

                        {/* 评分 */}
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm"
                            style={{ color: ECHO_COLORS.mom.text }}
                          >
                            评价：
                          </span>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => handleRate(memoir.id, star)}
                              className="text-xl transition-transform hover:scale-110"
                            >
                              {memoir.user_rating && star <= memoir.user_rating
                                ? '⭐'
                                : '☆'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
