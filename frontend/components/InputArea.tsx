// frontend/components/InputArea.tsx
/**
 * 输入区域组件
 * 底部固定，简洁的输入体验
 */

"use client";

import { useState, useCallback, KeyboardEvent } from "react";
import { motion } from "framer-motion";

interface InputAreaProps {
  onSend: (content: string) => void;
  isLoading: boolean;
}

export function InputArea({ onSend, isLoading }: InputAreaProps) {
  const [input, setInput] = useState("");

  const handleSend = useCallback(() => {
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput("");
    }
  }, [input, isLoading, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white/80 to-transparent backdrop-blur-sm z-20"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="max-w-2xl mx-auto">
        <div className="relative flex items-center">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="说说你的心情..."
            disabled={isLoading}
            rows={1}
            className="w-full px-6 py-4 pr-14 text-lg bg-white/70 backdrop-blur-md border border-stone-200 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent placeholder:text-stone-400 text-stone-700 shadow-lg transition-all"
            style={{ minHeight: "56px", maxHeight: "120px" }}
          />
          <motion.button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-3 w-10 h-10 flex items-center justify-center rounded-full bg-stone-700 text-white disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isLoading ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                ◌
              </motion.span>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
