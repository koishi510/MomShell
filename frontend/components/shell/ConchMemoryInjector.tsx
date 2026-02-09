// frontend/components/shell/ConchMemoryInjector.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef } from 'react';

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
      {/* 按钮 */}
      <motion.button
        className={`relative w-14 h-14 rounded-full flex items-center justify-center ${className}`}
        style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 0 20px rgba(255,183,77,0.3)',
        }}
        onClick={() => !disabled && setIsOpen(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        disabled={disabled}
      >
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,183,77,0.4) 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <span className="text-2xl relative z-10">🐚</span>
      </motion.button>

      {/* 弹窗 */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pr-12">
            <div className="absolute inset-0 bg-black/40" onClick={() => !isInjecting && setIsOpen(false)} />

            <motion.div
              className="relative bg-slate-800 rounded-2xl p-6 w-80 shadow-xl"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="text-center mb-5">
                <span className="text-4xl">🐚</span>
                <h3 className="text-lg font-medium mt-2 text-gray-100">注入记忆</h3>
                <p className="text-xs text-gray-400 mt-1">写下你想让她回忆的时光</p>
              </div>

              {/* 图片预览 */}
              {imagePreview && (
                <div className="relative mb-3">
                  <img
                    src={imagePreview}
                    alt="预览"
                    className="w-full h-32 object-cover rounded-xl"
                  />
                  <button
                    onClick={clearImage}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="描述一段你们共同的记忆..."
                disabled={isInjecting}
                maxLength={300}
                className="w-full h-28 p-3 rounded-xl border-2 border-slate-600 bg-slate-700 text-sm text-gray-100 resize-none outline-none placeholder-gray-500"
              />

              <div className="flex items-center gap-2 mt-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  disabled={isInjecting}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isInjecting}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-700 text-xl"
                >
                  📷
                </button>
                <span className="text-xs text-gray-500">{content.length}/300</span>
              </div>

              <button
                onClick={handleInject}
                disabled={!content.trim() || isInjecting}
                className="w-full mt-3 py-3 rounded-full bg-indigo-500 text-white text-sm font-medium disabled:opacity-50"
              >
                {isInjecting ? '注入中...' : '注入记忆'}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                disabled={isInjecting}
                className="w-full mt-4 text-sm text-gray-500"
              >
                关闭
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
