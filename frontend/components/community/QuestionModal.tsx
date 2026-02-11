"use client";

// frontend/components/community/QuestionModal.tsx
/**
 * 发布问题弹窗
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type ChannelType, CHANNEL_CONFIG } from "../../types/community";

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, content: string, channel: ChannelType) => void;
  defaultChannel: ChannelType;
}

export default function QuestionModal({
  isOpen,
  onClose,
  onSubmit,
  defaultChannel,
}: QuestionModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [channel, setChannel] = useState<ChannelType>(defaultChannel);

  // 同步 defaultChannel 变化
  useEffect(() => {
    setChannel(defaultChannel);
  }, [defaultChannel]);

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    onSubmit(title.trim(), content.trim(), channel);
    setTitle("");
    setContent("");
  };

  const handleClose = () => {
    setTitle("");
    setContent("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* 弹窗内容 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-white rounded-2xl shadow-2xl z-50 flex flex-col max-h-[90vh]"
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <h2 className="text-lg font-medium text-stone-700">发布问题</h2>
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors"
              >
                <CloseIcon />
              </button>
            </div>

            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* 频道选择 */}
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-2">
                  选择频道
                </label>
                <div className="flex gap-2">
                  {(["professional", "experience"] as ChannelType[]).map(
                    (ch) => {
                      const config = CHANNEL_CONFIG[ch];
                      const isActive = channel === ch;
                      return (
                        <button
                          key={ch}
                          onClick={() => setChannel(ch)}
                          className={`
                          flex-1 px-4 py-3 rounded-xl text-sm font-medium
                          transition-all duration-200
                          ${
                            isActive
                              ? `${config.color.bg} ${config.color.text} ring-2 ring-offset-1`
                              : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                          }
                        `}
                          style={
                            isActive
                              ? ({
                                  "--tw-ring-color": config.color.accent,
                                } as React.CSSProperties)
                              : {}
                          }
                        >
                          <div>{config.label}</div>
                          <div className="text-xs opacity-70 mt-0.5">
                            {config.subtitle}
                          </div>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              {/* 标题输入 */}
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-2">
                  问题标题
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="用一句话描述你的问题"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 transition-all"
                  maxLength={100}
                />
                <p className="text-xs text-stone-400 mt-1 text-right">
                  {title.length}/100
                </p>
              </div>

              {/* 内容输入 */}
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-2">
                  详细描述
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="详细描述你的问题，包括相关背景、已尝试的方法等..."
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 transition-all resize-none"
                  maxLength={2000}
                />
                <p className="text-xs text-stone-400 mt-1 text-right">
                  {content.length}/2000
                </p>
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="p-5 border-t border-stone-100">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={!title.trim() || !content.trim()}
                className="w-full px-4 py-3 rounded-full bg-[#e8a4b8] text-white font-medium hover:bg-[#d88a9f] transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed"
              >
                发布问题
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-stone-400"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
