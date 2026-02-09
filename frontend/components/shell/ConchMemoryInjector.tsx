// frontend/components/shell/ConchMemoryInjector.tsx
/**
 * 海螺记忆注入组件 - 伴侣为妈妈注入记忆
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef } from 'react';
import { SHELL_COLORS, SPRING_CONFIGS } from '../../lib/design-tokens';

interface ConchMemoryInjectorProps {
  onInject?: (content: string, imageFile?: File) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function ConchMemoryInjector({
  onInject,
  disabled = false,
  className = '',
}: ConchMemoryInjectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isInjecting, setIsInjecting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInject = async () => {
    if (!content.trim() || isInjecting) return;

    setIsInjecting(true);
    await onInject?.(content.trim(), imageFile || undefined);

    setTimeout(() => {
      setContent('');
      setImagePreview(null);
      setImageFile(null);
      setIsOpen(false);
      setIsInjecting(false);
    }, 1500);
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      {/* 海螺图标按钮 */}
      <motion.button
        className={`relative ${className}`}
        onClick={() => !disabled && setIsOpen(true)}
        whileHover={{ scale: 1.1, rotate: [0, 5, -5, 0] }}
        whileTap={{ scale: 0.95 }}
        disabled={disabled}
      >
        <svg width="56" height="48" viewBox="0 0 56 48" fill="none">
          {/* 海螺主体 */}
          <path
            d="M8 32 Q2 24 8 16 Q16 8 28 8 Q44 8 50 20 Q54 28 48 36 Q40 44 24 44 Q12 44 8 32"
            fill={SHELL_COLORS.conch.outer}
            stroke="#D7CCC8"
            strokeWidth="1.5"
          />
          {/* 螺旋纹理 */}
          <path
            d="M20 28 Q24 22 32 22 Q40 24 42 30"
            fill="none"
            stroke={SHELL_COLORS.conch.inner}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M26 26 Q30 24 34 26"
            fill="none"
            stroke={SHELL_COLORS.conch.inner}
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* 海螺口 */}
          <ellipse
            cx="14"
            cy="28"
            rx="6"
            ry="10"
            fill={SHELL_COLORS.conch.inner}
          />
        </svg>

        {/* 发光效果 */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle, ${SHELL_COLORS.conch.glow} 0%, transparent 70%)`,
          }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 3, repeat: Infinity }}
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
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => !isInjecting && setIsOpen(false)}
            />

            {/* 弹窗内容 */}
            <motion.div
              className="relative rounded-3xl p-6 w-full max-w-sm shadow-xl"
              style={{
                background: `linear-gradient(135deg, ${SHELL_COLORS.partner.background} 0%, #0D1B2A 100%)`,
              }}
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              transition={SPRING_CONFIGS.bouncy}
            >
              {/* 装饰海螺 */}
              <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                <svg width="36" height="30" viewBox="0 0 56 48" fill="none">
                  <path
                    d="M8 32 Q2 24 8 16 Q16 8 28 8 Q44 8 50 20 Q54 28 48 36 Q40 44 24 44 Q12 44 8 32"
                    fill={SHELL_COLORS.conch.outer}
                    stroke="#D7CCC8"
                    strokeWidth="1"
                  />
                </svg>
              </div>

              <h3 className="text-lg font-medium text-center mb-4" style={{ color: SHELL_COLORS.partner.text }}>
                注入一段记忆
              </h3>

              <p className="text-xs text-center mb-4" style={{ color: `${SHELL_COLORS.partner.text}80` }}>
                写下你想让她回忆的时光
              </p>

              {/* 图片预览 */}
              {imagePreview && (
                <div className="relative mb-3">
                  <img
                    src={imagePreview}
                    alt="预览"
                    className="w-full h-32 object-cover rounded-xl"
                  />
                  <motion.button
                    onClick={clearImage}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white text-xs"
                    whileTap={{ scale: 0.9 }}
                  >
                    ✕
                  </motion.button>
                </div>
              )}

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="描述一段你们共同的记忆..."
                className="w-full h-28 p-4 rounded-2xl border-2 focus:outline-none resize-none text-sm"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderColor: 'rgba(255,255,255,0.2)',
                  color: SHELL_COLORS.partner.text,
                }}
                disabled={isInjecting}
                maxLength={300}
              />

              <div className="flex justify-between items-center mt-3">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    disabled={isInjecting}
                  />
                  <motion.button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      color: SHELL_COLORS.partner.text,
                    }}
                    whileTap={{ scale: 0.95 }}
                    disabled={isInjecting}
                  >
                    📷
                  </motion.button>
                  <span className="text-xs" style={{ color: `${SHELL_COLORS.partner.text}60` }}>
                    {content.length}/300
                  </span>
                </div>

                <div className="flex gap-2">
                  <motion.button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 rounded-full text-sm"
                    style={{ color: SHELL_COLORS.partner.text }}
                    whileTap={{ scale: 0.95 }}
                    disabled={isInjecting}
                  >
                    取消
                  </motion.button>

                  <motion.button
                    onClick={handleInject}
                    className="px-6 py-2 rounded-full text-sm font-medium"
                    style={{
                      background: `linear-gradient(135deg, ${SHELL_COLORS.partner.accent} 0%, #5C6BC0 100%)`,
                      color: 'white',
                    }}
                    whileTap={{ scale: 0.95 }}
                    disabled={!content.trim() || isInjecting}
                  >
                    {isInjecting ? (
                      <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        注入中...
                      </motion.span>
                    ) : (
                      '注入记忆'
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* 注入动画 - 金色光点飞向沙滩 */}
            {isInjecting && (
              <>
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-3 h-3 rounded-full"
                    style={{ background: SHELL_COLORS.shell.golden }}
                    initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                    animate={{
                      x: [0, -50 - i * 20, -150 - i * 30],
                      y: [0, -20 - i * 10, 50 + i * 20],
                      scale: [1, 1.2, 0.5],
                      opacity: [1, 1, 0],
                    }}
                    transition={{
                      duration: 1.2,
                      delay: i * 0.1,
                      ease: 'easeOut',
                    }}
                  />
                ))}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
