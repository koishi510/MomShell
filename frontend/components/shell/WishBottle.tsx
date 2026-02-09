// frontend/components/shell/WishBottle.tsx
/**
 * 心愿漂流瓶组件 - 妈妈发送心愿给伴侣
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { SHELL_COLORS, SPRING_CONFIGS } from '../../lib/design-tokens';

interface WishBottleProps {
  onSend?: (wish: string) => void;
  disabled?: boolean;
  className?: string;
}

export function WishBottle({
  onSend,
  disabled = false,
  className = '',
}: WishBottleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [wish, setWish] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!wish.trim() || isSending) return;

    setIsSending(true);
    await onSend?.(wish.trim());

    // 发送动画
    setTimeout(() => {
      setWish('');
      setIsOpen(false);
      setIsSending(false);
    }, 1500);
  };

  return (
    <>
      {/* 漂流瓶图标按钮 */}
      <motion.button
        className={`relative ${className}`}
        onClick={() => !disabled && setIsOpen(true)}
        whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
        whileTap={{ scale: 0.95 }}
        disabled={disabled}
      >
        <svg width="48" height="64" viewBox="0 0 48 64" fill="none">
          {/* 瓶身 */}
          <path
            d="M12 20 Q8 25 8 40 Q8 58 24 60 Q40 58 40 40 Q40 25 36 20 L36 14 L12 14 Z"
            fill={SHELL_COLORS.bottle.glass}
            stroke="#87CEEB"
            strokeWidth="1.5"
          />
          {/* 软木塞 */}
          <rect
            x="14"
            y="8"
            width="20"
            height="8"
            rx="2"
            fill={SHELL_COLORS.bottle.cork}
          />
          {/* 瓶内纸条 */}
          <rect
            x="18"
            y="30"
            width="12"
            height="16"
            rx="1"
            fill={SHELL_COLORS.bottle.message}
            transform="rotate(-10 24 38)"
          />
          {/* 高光 */}
          <ellipse cx="16" cy="35" rx="2" ry="8" fill="white" opacity="0.4" />
        </svg>

        {/* 发光效果 */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(135,206,235,0.3) 0%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.button>

      {/* 输入弹窗 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* 背景遮罩 */}
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isSending && setIsOpen(false)}
            />

            {/* 弹窗内容 */}
            <motion.div
              className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl"
              style={{
                background: `linear-gradient(135deg, ${SHELL_COLORS.bottle.message} 0%, #FFF 100%)`,
              }}
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              transition={SPRING_CONFIGS.bouncy}
            >
              {/* 装饰贝壳 */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                <svg width="40" height="32" viewBox="0 0 40 32">
                  <path
                    d="M5 20 Q5 5 20 2 Q35 5 35 20 Q35 28 20 30 Q5 28 5 20"
                    fill={SHELL_COLORS.shell.clean}
                    stroke="#DDD"
                    strokeWidth="1"
                  />
                </svg>
              </div>

              <h3 className="text-lg font-medium text-center mb-4" style={{ color: SHELL_COLORS.mom.text }}>
                写下你的心愿
              </h3>

              <textarea
                value={wish}
                onChange={(e) => setWish(e.target.value)}
                placeholder="告诉 TA 你想要什么..."
                className="w-full h-32 p-4 rounded-2xl border-2 border-amber-100 focus:border-amber-300 focus:outline-none resize-none text-sm"
                style={{
                  background: 'rgba(255,255,255,0.8)',
                  color: SHELL_COLORS.mom.text,
                }}
                disabled={isSending}
                maxLength={200}
              />

              <div className="flex justify-between items-center mt-3">
                <span className="text-xs text-gray-400">{wish.length}/200</span>

                <div className="flex gap-2">
                  <motion.button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 rounded-full text-sm"
                    style={{ color: SHELL_COLORS.mom.text }}
                    whileTap={{ scale: 0.95 }}
                    disabled={isSending}
                  >
                    取消
                  </motion.button>

                  <motion.button
                    onClick={handleSend}
                    className="px-6 py-2 rounded-full text-sm font-medium text-white"
                    style={{
                      background: `linear-gradient(135deg, ${SHELL_COLORS.mom.accent} 0%, #FFA726 100%)`,
                    }}
                    whileTap={{ scale: 0.95 }}
                    disabled={!wish.trim() || isSending}
                  >
                    {isSending ? (
                      <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        漂向远方...
                      </motion.span>
                    ) : (
                      '放入瓶中'
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* 发送动画 - 漂流瓶飞走 */}
            {isSending && (
              <motion.div
                className="absolute"
                initial={{ x: 0, y: 0, rotate: 0 }}
                animate={{
                  x: [0, 50, 150, 300],
                  y: [0, -30, -20, -50],
                  rotate: [0, 10, -5, 15],
                  opacity: [1, 1, 0.8, 0],
                }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              >
                <svg width="32" height="42" viewBox="0 0 48 64" fill="none">
                  <path
                    d="M12 20 Q8 25 8 40 Q8 58 24 60 Q40 58 40 40 Q40 25 36 20 L36 14 L12 14 Z"
                    fill={SHELL_COLORS.bottle.glass}
                    stroke="#87CEEB"
                    strokeWidth="1.5"
                  />
                  <rect x="14" y="8" width="20" height="8" rx="2" fill={SHELL_COLORS.bottle.cork} />
                </svg>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
