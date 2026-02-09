// frontend/components/shell/AISticker.tsx
/**
 * AI 生成贴纸组件 - 展示记忆贴纸
 */

'use client';

import { motion } from 'framer-motion';
import { SHELL_COLORS, SPRING_CONFIGS } from '../../lib/design-tokens';

interface AIStickerProps {
  id: string;
  imageUrl: string;
  title?: string;
  memoryText?: string;
  createdAt?: string;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  isNew?: boolean;
  className?: string;
}

export function AISticker({
  id,
  imageUrl,
  title,
  memoryText,
  createdAt,
  size = 'medium',
  onClick,
  isNew = false,
  className = '',
}: AIStickerProps) {
  const sizeMap = {
    small: 'w-20 h-20',
    medium: 'w-28 h-28',
    large: 'w-40 h-40',
  };

  // 占位符图片 - 当没有真实图片时使用
  const placeholderUrl = `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#FFE082"/>
          <stop offset="100%" style="stop-color:#FFA726"/>
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill="url(#grad)" rx="20"/>
      <text x="100" y="110" text-anchor="middle" font-size="60">🌟</text>
    </svg>
  `)}`;

  return (
    <motion.div
      className={`relative ${className}`}
      onClick={onClick}
      whileHover={{ scale: 1.05, rotate: [-1, 1, -1] }}
      whileTap={{ scale: 0.95 }}
      transition={SPRING_CONFIGS.gentle}
    >
      {/* 贴纸图片 */}
      <motion.div
        className={`${sizeMap[size]} rounded-2xl overflow-hidden shadow-lg cursor-pointer`}
        style={{
          boxShadow: `0 8px 24px ${SHELL_COLORS.mom.shadow}`,
        }}
      >
        <img
          src={imageUrl || placeholderUrl}
          alt={title || '记忆贴纸'}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = placeholderUrl;
          }}
        />

        {/* 新贴纸标记 */}
        {isNew && (
          <motion.div
            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <span className="text-white text-xs">新</span>
          </motion.div>
        )}
      </motion.div>

      {/* 标题 */}
      {title && (
        <p
          className="text-xs text-center mt-2 font-medium line-clamp-1"
          style={{ color: SHELL_COLORS.mom.text }}
        >
          {title}
        </p>
      )}
    </motion.div>
  );
}

interface AIStickerGridProps {
  stickers: Array<{
    id: string;
    image_url: string;
    title?: string;
    memory_text?: string;
    created_at?: string;
    is_new?: boolean;
  }>;
  onStickerClick?: (id: string) => void;
  emptyMessage?: string;
  className?: string;
}

export function AIStickerGrid({
  stickers,
  onStickerClick,
  emptyMessage = '还没有收集到贴纸',
  className = '',
}: AIStickerGridProps) {
  if (stickers.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
        <motion.div
          className="text-6xl mb-4"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          🐚
        </motion.div>
        <p className="text-sm" style={{ color: `${SHELL_COLORS.mom.text}80` }}>
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-3 gap-4 ${className}`}>
      {stickers.map((sticker, index) => (
        <motion.div
          key={sticker.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <AISticker
            id={sticker.id}
            imageUrl={sticker.image_url}
            title={sticker.title}
            memoryText={sticker.memory_text}
            createdAt={sticker.created_at}
            isNew={sticker.is_new}
            onClick={() => onStickerClick?.(sticker.id)}
          />
        </motion.div>
      ))}
    </div>
  );
}
