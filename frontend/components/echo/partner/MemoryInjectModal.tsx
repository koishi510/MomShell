// components/echo/partner/MemoryInjectModal.tsx
/**
 * MemoryInjectModal - Modal for creating memory shells
 *
 * Features:
 * - Text input for memory content
 * - Optional photo upload
 * - Sticker style selection
 * - Async generation with loading state
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Palette, Sparkles, Send } from 'lucide-react';
import { ECHO_COLORS } from '../../../lib/design-tokens';
import type { StickerStyle } from '../../../types/echo';

interface MemoryInjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    content: string;
    photo_url?: string;
    sticker_style: StickerStyle;
  }) => Promise<void>;
  submitting?: boolean;
}

const STICKER_STYLES: { value: StickerStyle; label: string; emoji: string; desc: string }[] = [
  { value: 'watercolor', label: '水彩', emoji: '🎨', desc: '柔和的水彩风格' },
  { value: 'sketch', label: '素描', emoji: '✏️', desc: '手绘素描风格' },
  { value: 'pixel', label: '像素', emoji: '👾', desc: '复古像素风格' },
];

export function MemoryInjectModal({
  isOpen,
  onClose,
  onSubmit,
  submitting = false,
}: MemoryInjectModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<StickerStyle>('watercolor');

  const handleSubmit = async () => {
    if (title.trim() && content.trim() && !submitting) {
      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        photo_url: photoUrl.trim() || undefined,
        sticker_style: selectedStyle,
      });
      // Reset form
      setTitle('');
      setContent('');
      setPhotoUrl('');
      setSelectedStyle('watercolor');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-full max-w-md rounded-3xl overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${ECHO_COLORS.beach.sand} 0%, ${ECHO_COLORS.beach.sandWet} 100%)`,
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles size={20} style={{ color: ECHO_COLORS.beach.lightString.bulb }} />
                <h2
                  className="text-lg font-bold"
                  style={{ color: ECHO_COLORS.beach.lightString.bulb }}
                >
                  创建回忆贝壳
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                style={{ color: 'white' }}
                disabled={submitting}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Title input */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  标题
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="给这段回忆起个标题..."
                  maxLength={200}
                  disabled={submitting}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 transition-colors"
                />
              </div>

              {/* Content input */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  回忆内容
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="记录这段美好的回忆..."
                  maxLength={2000}
                  rows={4}
                  disabled={submitting}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 transition-colors resize-none"
                />
              </div>

              {/* Photo URL (optional) */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  <span className="flex items-center gap-1">
                    <ImageIcon size={14} />
                    照片链接（可选）
                  </span>
                </label>
                <input
                  type="text"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  disabled={submitting}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 transition-colors"
                />
              </div>

              {/* Sticker style selection */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  <span className="flex items-center gap-1">
                    <Palette size={14} />
                    贴纸风格
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {STICKER_STYLES.map((style) => (
                    <motion.button
                      key={style.value}
                      onClick={() => setSelectedStyle(style.value)}
                      disabled={submitting}
                      className={`p-3 rounded-xl text-center transition-all ${
                        selectedStyle === style.value
                          ? 'ring-2 ring-yellow-400 bg-yellow-400/20'
                          : 'bg-white/10 hover:bg-white/20'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="text-2xl mb-1">{style.emoji}</div>
                      <div className="text-xs text-white font-medium">{style.label}</div>
                      <div className="text-xs text-white/50">{style.desc}</div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10">
              <motion.button
                onClick={handleSubmit}
                disabled={!title.trim() || !content.trim() || submitting}
                className="w-full py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: ECHO_COLORS.beach.lightString.bulb,
                }}
                whileHover={(!title.trim() || !content.trim() || submitting) ? {} : { scale: 1.02 }}
                whileTap={(!title.trim() || !content.trim() || submitting) ? {} : { scale: 0.98 }}
              >
                {submitting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Sparkles size={18} />
                    </motion.div>
                    <span>正在生成贴纸...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>创建回忆</span>
                  </>
                )}
              </motion.button>

              {submitting && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-xs text-white/60 mt-2"
                >
                  记忆正在孕育中，完成后将通知您
                </motion.p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
