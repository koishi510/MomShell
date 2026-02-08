// frontend/app/echo/mom/page.tsx
/**
 * 妈妈模式主页 - 自我之境
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthGuard } from '../../../components/AuthGuard';
import { ECHO_COLORS, SPRING_CONFIGS, GLASS_STYLES } from '../../../lib/design-tokens';
import {
  getEchoStatus,
  getIdentityTags,
  matchScenes,
  getMeditationStats,
  getRevealedMemories,
  getMemoirs,
} from '../../../lib/api/echo';
import { IdentityTagEditor } from '../../../components/echo/mom/IdentityTagEditor';
import { GlassWindow } from '../../../components/echo/GlassWindow';
import { MemoirCard } from '../../../components/echo/mom/MemoirCard';
import type { EchoStatus, IdentityTagList, Scene, MeditationStats, Memoir, RevealedMemories } from '../../../types/echo';

function MomModePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<EchoStatus | null>(null);
  const [tags, setTags] = useState<IdentityTagList | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [meditationStats, setMeditationStats] = useState<MeditationStats | null>(null);
  const [memoirs, setMemoirs] = useState<Memoir[]>([]);
  const [revealedMemories, setRevealedMemories] = useState<RevealedMemories | null>(null);
  const [activeTab, setActiveTab] = useState<'identity' | 'scenes' | 'memoirs'>('identity');
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statusData, tagsData, scenesData, statsData, memoirsData] = await Promise.all([
        getEchoStatus(),
        getIdentityTags(),
        matchScenes(5),
        getMeditationStats(),
        getMemoirs(5),
      ]);

      setStatus(statusData);
      setTags(tagsData);
      setScenes(scenesData);
      setMeditationStats(statsData);
      setMemoirs(memoirsData.memoirs);

      // 尝试获取已揭示的记忆（如果有绑定）
      if (statusData.has_binding) {
        try {
          const memoriesData = await getRevealedMemories();
          setRevealedMemories(memoriesData);
        } catch {
          // 可能没有权限，忽略
        }
      }
    } catch (error) {
      console.error('Failed to load mom mode data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTagsUpdate = async () => {
    const [newTags, newScenes] = await Promise.all([
      getIdentityTags(),
      matchScenes(5),
    ]);
    setTags(newTags);
    setScenes(newScenes);
  };

  const handleStartMeditation = () => {
    router.push('/echo/mom/meditation');
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${ECHO_COLORS.mom.gradient[0]} 0%, ${ECHO_COLORS.mom.gradient[1]} 100%)`,
        }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-lg"
          style={{ color: ECHO_COLORS.mom.text }}
        >
          正在准备你的自我空间...
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-20"
      style={{
        background: `linear-gradient(135deg, ${ECHO_COLORS.mom.gradient[0]} 0%, ${ECHO_COLORS.mom.gradient[1]} 100%)`,
      }}
    >
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 px-4 py-4">
        <div className={`${GLASS_STYLES.medium} rounded-2xl px-4 py-3 flex items-center justify-between`}>
          <button
            onClick={() => router.push('/echo')}
            className="p-2 rounded-full hover:bg-white/30 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1
            className="text-xl font-bold"
            style={{ color: ECHO_COLORS.mom.text }}
          >
            自我之境
          </h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </header>

      {/* 冥想统计卡片 */}
      <section className="px-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${GLASS_STYLES.medium} rounded-2xl p-6`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg font-semibold"
              style={{ color: ECHO_COLORS.mom.text }}
            >
              冥想记录
            </h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStartMeditation}
              className="px-4 py-2 rounded-full text-white font-medium"
              style={{ backgroundColor: ECHO_COLORS.mom.accent }}
            >
              开始冥想
            </motion.button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: ECHO_COLORS.mom.text }}>
                {meditationStats?.total_minutes || 0}
              </p>
              <p className="text-sm opacity-70" style={{ color: ECHO_COLORS.mom.text }}>
                总分钟数
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: ECHO_COLORS.mom.text }}>
                {meditationStats?.completed_sessions || 0}
              </p>
              <p className="text-sm opacity-70" style={{ color: ECHO_COLORS.mom.text }}>
                完成次数
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: ECHO_COLORS.mom.text }}>
                {meditationStats?.current_streak || 0}
              </p>
              <p className="text-sm opacity-70" style={{ color: ECHO_COLORS.mom.text }}>
                连续天数
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 标签页切换 */}
      <section className="px-4 mb-4">
        <div className="flex gap-2">
          {[
            { key: 'identity', label: '身份标签', icon: '🏷️' },
            { key: 'scenes', label: '场景画卷', icon: '🖼️' },
            { key: 'memoirs', label: '青春回忆录', icon: '📔' },
          ].map((tab) => (
            <motion.button
              key={tab.key}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-white/80 shadow-md'
                  : 'bg-white/30 hover:bg-white/50'
              }`}
              style={{
                color: activeTab === tab.key ? ECHO_COLORS.mom.text : ECHO_COLORS.mom.text + '99',
              }}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </motion.button>
          ))}
        </div>
      </section>

      {/* 内容区域 */}
      <section className="px-4">
        <AnimatePresence mode="wait">
          {activeTab === 'identity' && (
            <motion.div
              key="identity"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <IdentityTagEditor
                tags={tags}
                onUpdate={handleTagsUpdate}
              />
            </motion.div>
          )}

          {activeTab === 'scenes' && (
            <motion.div
              key="scenes"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className={`${GLASS_STYLES.medium} rounded-2xl p-6`}>
                <h3
                  className="text-lg font-semibold mb-4"
                  style={{ color: ECHO_COLORS.mom.text }}
                >
                  为你匹配的场景
                </h3>

                {scenes.length === 0 ? (
                  <p className="text-center opacity-70 py-8" style={{ color: ECHO_COLORS.mom.text }}>
                    添加身份标签后，将为你匹配专属场景
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {scenes.map((scene, index) => (
                      <motion.div
                        key={scene.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => setSelectedScene(scene)}
                        className="cursor-pointer"
                      >
                        <GlassWindow
                          scene={scene}
                          clarityLevel={100}
                          size="small"
                        />
                        <p
                          className="mt-2 text-sm text-center"
                          style={{ color: ECHO_COLORS.mom.text }}
                        >
                          {scene.title}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'memoirs' && (
            <motion.div
              key="memoirs"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <MemoirCard
                memoirs={memoirs}
                onGenerate={async () => {
                  const newMemoirs = await getMemoirs(5);
                  setMemoirs(newMemoirs.memoirs);
                }}
              />

              {/* 伴侣注入的记忆 */}
              {revealedMemories && revealedMemories.memories.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${GLASS_STYLES.medium} rounded-2xl p-6 mt-4`}
                >
                  <h3
                    className="text-lg font-semibold mb-4 flex items-center gap-2"
                    style={{ color: ECHO_COLORS.mom.text }}
                  >
                    <span>💝</span>
                    来自他的回忆
                  </h3>
                  <div className="space-y-4">
                    {revealedMemories.memories.map((memory) => (
                      <div
                        key={memory.id}
                        className="p-4 bg-white/40 rounded-xl"
                      >
                        <h4
                          className="font-medium mb-2"
                          style={{ color: ECHO_COLORS.mom.text }}
                        >
                          {memory.title}
                        </h4>
                        <p
                          className="text-sm opacity-80"
                          style={{ color: ECHO_COLORS.mom.text }}
                        >
                          {memory.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* 场景详情模态框 */}
      <AnimatePresence>
        {selectedScene && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setSelectedScene(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${GLASS_STYLES.heavy} rounded-3xl p-6 max-w-md w-full`}
              onClick={(e) => e.stopPropagation()}
            >
              <GlassWindow
                scene={selectedScene}
                clarityLevel={100}
                size="large"
              />
              <h3
                className="text-xl font-semibold mt-4 mb-2"
                style={{ color: ECHO_COLORS.mom.text }}
              >
                {selectedScene.title}
              </h3>
              <p
                className="text-sm opacity-80 mb-4"
                style={{ color: ECHO_COLORS.mom.text }}
              >
                {selectedScene.description}
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSelectedScene(null);
                  router.push(`/echo/mom/meditation?scene=${selectedScene.id}`);
                }}
                className="w-full py-3 rounded-xl text-white font-medium"
                style={{ backgroundColor: ECHO_COLORS.mom.accent }}
              >
                在此场景中冥想
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function EchoMomPage() {
  return (
    <AuthGuard>
      <MomModePage />
    </AuthGuard>
  );
}
