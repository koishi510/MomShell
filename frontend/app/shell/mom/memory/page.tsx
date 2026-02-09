// frontend/app/shell/mom/memory/page.tsx
/**
 * 青春回忆页 - 选择记忆砂砾
 */

'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../../contexts/AuthContext';
import {
  BeachBackground,
  TopHeader,
  Shell,
} from '../../../../components/shell';
import { SandGrainTag, SandGrainTagGroup } from '../../../../components/shell/SandGrainTag';
import { SHELL_COLORS, SPRING_CONFIGS } from '../../../../lib/design-tokens';

// 预设记忆标签（按文档要求）
const PRESET_TAGS = [
  '运动会最后一棒',
  '旧磁带',
  '风铃',
  '音乐会',
  '第一次出国',
  '摇滚乐',
  '毕业典礼',
  '初恋时光',
  '校园时代',
  '老照片',
];

function MemoryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const shellId = searchParams.get('shell');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [memoryText, setMemoryText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const allTags = [...PRESET_TAGS, ...customTags];

  const handleTagSelect = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag].slice(0, 3)
    );
  };

  const handleAddCustomTag = (tag: string) => {
    if (!customTags.includes(tag) && !PRESET_TAGS.includes(tag)) {
      setCustomTags((prev) => [...prev, tag]);
      setSelectedTags((prev) => [...prev, tag].slice(0, 3));
    }
  };

  const handleSubmit = async () => {
    if (selectedTags.length === 0) return;

    setIsGenerating(true);

    // 模拟 AI 生成贴纸
    await new Promise((r) => setTimeout(r, 2500));

    setIsGenerating(false);
    setShowResult(true);
  };

  const handleComplete = () => {
    router.push('/shell/mom');
  };

  return (
    <BeachBackground theme="day">
      <TopHeader
        title="青春回忆"
        theme="day"
        showBack
        avatarUrl={user?.avatar_url}
      />

      <main className="relative min-h-[calc(100vh-60px)] px-4 pt-6 pb-8">
        {/* 生成动画 */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center"
              style={{ background: `${SHELL_COLORS.mom.background}F0` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-center">
                {/* 贝壳变化动画 */}
                <motion.div
                  animate={{
                    rotate: [0, 5, -5, 0],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Shell
                    id="generating"
                    state="dusty"
                    size="large"
                  />
                </motion.div>

                <motion.p
                  className="mt-6 text-sm"
                  style={{ color: SHELL_COLORS.mom.text }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  正在洗净这枚贝壳...
                </motion.p>

                <motion.div
                  className="flex justify-center gap-1 mt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{ background: SHELL_COLORS.mom.accent }}
                      animate={{ y: [0, -8, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 结果展示 */}
        <AnimatePresence>
          {showResult && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

              <motion.div
                className="relative bg-white rounded-3xl p-8 shadow-xl text-center max-w-sm"
                initial={{ scale: 0.5, y: 100 }}
                animate={{ scale: 1, y: 0 }}
                transition={SPRING_CONFIGS.bouncy}
              >
                {/* 贝壳打开动画 */}
                <motion.div
                  initial={{ rotateX: 0 }}
                  animate={{ rotateX: -30 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <Shell
                    id="result"
                    state="clean"
                    size="large"
                    isOpen={true}
                  />
                </motion.div>

                {/* 贴纸 */}
                <motion.div
                  className="w-32 h-32 mx-auto my-4 rounded-2xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${SHELL_COLORS.mom.accent} 0%, #FFA726 100%)`,
                    boxShadow: `0 8px 32px ${SHELL_COLORS.mom.shadow}`,
                  }}
                  initial={{ opacity: 0, y: 30, scale: 0.5 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.5, ...SPRING_CONFIGS.bouncy }}
                >
                  <span className="text-5xl">🌸</span>
                </motion.div>

                <motion.h3
                  className="text-lg font-medium mb-2"
                  style={{ color: SHELL_COLORS.mom.text }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  记忆已被唤醒
                </motion.h3>

                <motion.p
                  className="text-sm text-gray-500 mb-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  {selectedTags.join(' · ')}
                </motion.p>

                <motion.button
                  onClick={handleComplete}
                  className="px-8 py-3 rounded-full text-sm font-medium text-white"
                  style={{
                    background: `linear-gradient(135deg, ${SHELL_COLORS.mom.accent} 0%, #FFA726 100%)`,
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  whileTap={{ scale: 0.95 }}
                >
                  收入珍珠馆
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 主要内容 */}
        {!isGenerating && !showResult && (
          <>
            {/* 标题 */}
            <motion.h2
              className="text-xl font-medium text-center mb-2"
              style={{ color: SHELL_COLORS.mom.text }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              哪段记忆在闪光？
            </motion.h2>

            <motion.p
              className="text-sm text-center mb-8"
              style={{ color: `${SHELL_COLORS.mom.text}80` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              请输入或选择记忆砂砾
            </motion.p>

            {/* 标签选择 */}
            <motion.div
              className="mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <SandGrainTagGroup
                tags={allTags}
                selectedTags={selectedTags}
                onTagSelect={handleTagSelect}
                onAddCustom={handleAddCustomTag}
              />
            </motion.div>

            {/* 补充描述 */}
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <textarea
                value={memoryText}
                onChange={(e) => setMemoryText(e.target.value)}
                placeholder="可以补充更多细节（选填）..."
                className="w-full h-24 p-4 rounded-2xl border-2 focus:outline-none resize-none text-sm"
                style={{
                  background: 'rgba(255,255,255,0.8)',
                  borderColor: `${SHELL_COLORS.mom.accent}40`,
                  color: SHELL_COLORS.mom.text,
                }}
                maxLength={200}
              />
              <p className="text-xs text-right mt-1" style={{ color: `${SHELL_COLORS.mom.text}60` }}>
                {memoryText.length}/200
              </p>
            </motion.div>

            {/* 提交按钮 */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <motion.button
                onClick={handleSubmit}
                disabled={selectedTags.length === 0}
                className="px-10 py-4 rounded-full text-lg font-medium text-white disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${SHELL_COLORS.mom.accent} 0%, #FFA726 100%)`,
                  boxShadow: `0 4px 20px ${SHELL_COLORS.mom.shadow}`,
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                唤醒这段记忆
              </motion.button>

              {selectedTags.length > 0 && (
                <p className="text-xs mt-3" style={{ color: `${SHELL_COLORS.mom.text}60` }}>
                  已选择: {selectedTags.join(', ')}
                </p>
              )}
            </motion.div>
          </>
        )}
      </main>
    </BeachBackground>
  );
}

export default function MemoryPage() {
  return (
    <Suspense fallback={
      <BeachBackground theme="day">
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-4xl"
          >
            🐚
          </motion.div>
        </div>
      </BeachBackground>
    }>
      <MemoryPageContent />
    </Suspense>
  );
}
