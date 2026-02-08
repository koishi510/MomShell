// frontend/components/echo/partner/MemoryInjector.tsx
/**
 * 记忆注入表单组件
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ECHO_COLORS, GLASS_STYLES } from '../../../lib/design-tokens';
import type { MemoryInjectRequest } from '../../../types/echo';

interface MemoryInjectorProps {
  currentClarity: number;
  onSubmit: (data: MemoryInjectRequest) => void;
  onCancel: () => void;
  submitting: boolean;
}

export function MemoryInjector({
  currentClarity,
  onSubmit,
  onCancel,
  submitting,
}: MemoryInjectorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [revealAt, setRevealAt] = useState(50);

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;

    onSubmit({
      title: title.trim(),
      content: content.trim(),
      reveal_at_clarity: revealAt,
    });
  };

  // 预设揭示等级选项
  const revealOptions = [
    { value: 30, label: '尽早', desc: '30% 即可揭示' },
    { value: 50, label: '中等', desc: '50% 揭示' },
    { value: 70, label: '较高', desc: '70% 揭示' },
    { value: 90, label: '惊喜', desc: '90% 揭示' },
  ];

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: `linear-gradient(135deg, ${ECHO_COLORS.partner.gradient[0]} 0%, ${ECHO_COLORS.partner.gradient[1]} 100%)`,
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <h3
          className="text-lg font-semibold"
          style={{ color: ECHO_COLORS.partner.text }}
        >
          注入一段记忆
        </h3>
        <button
          onClick={onCancel}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          style={{ color: ECHO_COLORS.partner.text }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p
        className="text-sm opacity-70 mb-6"
        style={{ color: ECHO_COLORS.partner.text }}
      >
        写下一段你和她共同的美好回忆，当窗户变得足够清晰时，她就能看到
      </p>

      {/* 标题输入 */}
      <div className="mb-4">
        <label
          className="block text-sm mb-2 opacity-80"
          style={{ color: ECHO_COLORS.partner.text }}
        >
          记忆标题
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例如：我们的第一次约会"
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 outline-none placeholder:text-white/40"
          style={{ color: ECHO_COLORS.partner.text }}
          disabled={submitting}
        />
      </div>

      {/* 内容输入 */}
      <div className="mb-4">
        <label
          className="block text-sm mb-2 opacity-80"
          style={{ color: ECHO_COLORS.partner.text }}
        >
          记忆内容
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="描述这段美好的记忆..."
          rows={4}
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 outline-none resize-none placeholder:text-white/40"
          style={{ color: ECHO_COLORS.partner.text }}
          disabled={submitting}
        />
      </div>

      {/* 揭示时机选择 */}
      <div className="mb-6">
        <label
          className="block text-sm mb-2 opacity-80"
          style={{ color: ECHO_COLORS.partner.text }}
        >
          何时揭示？
        </label>
        <div className="grid grid-cols-4 gap-2">
          {revealOptions.map((option) => (
            <motion.button
              key={option.value}
              whileTap={{ scale: 0.95 }}
              onClick={() => setRevealAt(option.value)}
              className={`p-2 rounded-lg text-center transition-colors ${
                revealAt === option.value
                  ? 'bg-white/30'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
              disabled={submitting}
            >
              <p
                className="font-medium text-sm"
                style={{ color: ECHO_COLORS.partner.text }}
              >
                {option.label}
              </p>
              <p
                className="text-xs opacity-60"
                style={{ color: ECHO_COLORS.partner.text }}
              >
                {option.desc}
              </p>
            </motion.button>
          ))}
        </div>
        <p
          className="text-xs opacity-50 mt-2 text-center"
          style={{ color: ECHO_COLORS.partner.text }}
        >
          当前清晰度: {currentClarity}%
          {currentClarity >= revealAt && ' - 立即可见'}
        </p>
      </div>

      {/* 提交按钮 */}
      <motion.button
        whileHover={{ scale: submitting ? 1 : 1.02 }}
        whileTap={{ scale: submitting ? 1 : 0.98 }}
        onClick={handleSubmit}
        disabled={submitting || !title.trim() || !content.trim()}
        className="w-full py-3 rounded-xl font-medium disabled:opacity-50"
        style={{
          backgroundColor: ECHO_COLORS.partner.accent,
          color: ECHO_COLORS.partner.text,
        }}
      >
        {submitting ? '正在保存...' : '注入记忆'}
      </motion.button>
    </div>
  );
}
