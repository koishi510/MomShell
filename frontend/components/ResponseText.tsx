// frontend/components/ResponseText.tsx
/**
 * 响应文字展示组件
 * 淡入淡出效果，居中显示
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface ResponseTextProps {
  text: string | null;
  isLoading: boolean;
}

export function ResponseText({ text, isLoading }: ResponseTextProps) {
  return (
    <div className="flex-1 flex items-center justify-center px-8">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-2 h-2 rounded-full bg-stone-400"
                animate={{
                  y: [0, -8, 0],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </motion.div>
        ) : text ? (
          <motion.p
            key="response"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="text-center text-xl md:text-2xl text-stone-700 leading-relaxed max-w-2xl font-light"
          >
            {text}
          </motion.p>
        ) : (
          <motion.p
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            className="text-center text-lg text-stone-400 font-light"
          >
            在这里，你并不孤单
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
