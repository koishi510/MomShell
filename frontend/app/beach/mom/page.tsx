/**
 * 溯源之境 - Mom Mode Beach Page
 * Layout 2.0: Calm-inspired design with soft lavender gradients, dreamy ethereal beach
 * Design: Glassmorphism, soft gradients
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import BottomNav from '../../../components/BottomNav';
import {
  getBeachView,
  createShell,
  openShell,
  generateSticker,
  completeShell,
  createBottle,
  getBottles,
  markInjectionSeen,
  Shell,
  DriftBottle,
  BeachView,
  MemoryInjection,
  getInjections,
} from '../../../lib/api/beach';

// Calm-inspired lavender theme
const THEME = {
  bg: 'linear-gradient(180deg, #F8F6FF 0%, #F3EFFF 50%, #EDE7FF 100%)',
  text: '#4A4063',
  textLight: '#7B6F99',
  accent: '#B8A9E8',
  accentGradient: 'linear-gradient(135deg, #B8A9E8 0%, #D4C8F0 100%)',
  card: 'rgba(255, 255, 255, 0.72)',
  cardBorder: 'rgba(184, 169, 232, 0.25)',
  headerBg: 'rgba(248, 246, 255, 0.92)',
  inputBg: 'rgba(255, 255, 255, 0.5)',
  glow: 'rgba(184, 169, 232, 0.35)',
};

// Memory tags for selection
const MEMORY_TAGS = [
  '运动会最后一棒',
  '旧磁带',
  '风铃',
  '音乐会',
  '第一次出国',
  '摇滚乐',
  '毕业典礼',
  '青春旅行',
];

export default function MomBeachPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [beachView, setBeachView] = useState<BeachView | null>(null);
  const [injections, setInjections] = useState<MemoryInjection[]>([]);
  const [myBottles, setMyBottles] = useState<DriftBottle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [selectedShell, setSelectedShell] = useState<Shell | null>(null);
  const [showMemoryInput, setShowMemoryInput] = useState(false);
  const [showBottleModal, setShowBottleModal] = useState(false);
  const [showInjectionModal, setShowInjectionModal] = useState(false);
  const [selectedInjection, setSelectedInjection] = useState<MemoryInjection | null>(null);

  // Form states
  const [memoryContent, setMemoryContent] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [wishContent, setWishContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load beach view
  const loadBeachView = useCallback(async () => {
    try {
      setIsLoading(true);
      const [view, injectionsData, bottlesData] = await Promise.all([
        getBeachView(),
        getInjections().catch(() => ({ injections: [] })),
        getBottles().catch(() => ({ bottles: [] })),
      ]);
      setBeachView(view);
      setInjections(injectionsData.injections.filter(i => i.status === 'pending'));
      setMyBottles(bottlesData.bottles);
    } catch (err) {
      console.error('Failed to load beach view:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/');
        return;
      }
      loadBeachView();
    }
  }, [authLoading, isAuthenticated, router, loadBeachView]);

  // Handle shell click
  const handleShellClick = (shell: Shell) => {
    if (shell.status === 'dusty') {
      setSelectedShell(shell);
      setShowMemoryInput(true);
    } else {
      setSelectedShell(shell);
    }
  };

  // Create a new dusty shell
  const handleCreateShell = async () => {
    setIsSubmitting(true);
    try {
      await createShell({ title: '新的回忆' });
      await loadBeachView();
    } catch (err) {
      console.error('Failed to create shell:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle memory submission
  const handleMemorySubmit = async () => {
    if (!selectedShell || (!memoryContent.trim() && !selectedTag)) return;

    setIsSubmitting(true);
    try {
      const content = memoryContent.trim() || selectedTag || '';
      await openShell(selectedShell.id, content);

      try {
        await generateSticker(content);
      } catch (stickerErr) {
        console.warn('Sticker generation failed (optional):', stickerErr);
      }

      await completeShell(selectedShell.id);
      await loadBeachView();
      setShowMemoryInput(false);
      setSelectedShell(null);
      setMemoryContent('');
      setSelectedTag(null);
    } catch (err) {
      console.error('Failed to submit memory:', err);
      alert('记录失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle drift bottle send
  const handleSendBottle = async () => {
    if (!wishContent.trim()) return;

    setIsSubmitting(true);
    try {
      await createBottle(wishContent);
      setShowBottleModal(false);
      setWishContent('');
      await loadBeachView();
    } catch (err) {
      console.error('Failed to send bottle:', err);
      alert('发送失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle viewing injection from dad
  const handleViewInjection = async (injection: MemoryInjection) => {
    setSelectedInjection(injection);
    setShowInjectionModal(true);
    try {
      await markInjectionSeen(injection.id);
      await loadBeachView();
    } catch (err) {
      console.error('Failed to mark injection seen:', err);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: THEME.bg }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="text-4xl"
        >
          🐚
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: THEME.bg }}>
      {/* Beach Background */}
      <MomBeachBackground />

      {/* Top Bar */}
      <div
        className="fixed top-0 left-0 right-0 z-40 px-4 py-4 flex items-center justify-between backdrop-blur-xl"
        style={{ backgroundColor: THEME.headerBg, borderBottom: `1px solid ${THEME.cardBorder}` }}
      >
        <motion.button
          onClick={() => router.push('/profile')}
          className="p-2.5 rounded-xl"
          style={{ backgroundColor: 'rgba(184, 169, 232, 0.15)' }}
          whileTap={{ scale: 0.95 }}
        >
          <svg className="w-5 h-5" fill="none" stroke={THEME.text} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </motion.button>

        <div className="text-center">
          <h1 className="text-xl font-serif font-medium" style={{ color: THEME.text }}>
            溯源之境
          </h1>
          <p className="text-xs mt-0.5" style={{ color: THEME.textLight }}>回忆如潮</p>
        </div>

        <motion.button
          className="p-2.5 rounded-xl relative"
          style={{ backgroundColor: 'rgba(184, 169, 232, 0.15)' }}
          whileTap={{ scale: 0.95 }}
        >
          <svg className="w-5 h-5" fill="none" stroke={THEME.text} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {(beachView?.pending_injections || 0) > 0 && (
            <span
              className="absolute -top-1 -right-1 w-5 h-5 text-white text-xs rounded-full flex items-center justify-center font-medium"
              style={{ background: THEME.accentGradient }}
            >
              {beachView?.pending_injections}
            </span>
          )}
        </motion.button>
      </div>

      {/* Main Beach Area */}
      <div className="pt-24 pb-24 min-h-screen relative">
        {/* Center Text */}
        <motion.div
          className="text-center py-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-lg font-serif" style={{ color: THEME.text }}>
            捡起一枚贝壳，洗净一段时光
          </p>
        </motion.div>

        {/* Shells on Beach */}
        <div className="relative w-full h-[50vh] overflow-visible">
          {(!beachView?.shells || beachView.shells.length === 0) ? (
            <motion.button
              onClick={handleCreateShell}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-8 py-4 rounded-2xl font-medium backdrop-blur-sm glass-card"
              style={{
                background: THEME.accentGradient,
                color: THEME.text,
                boxShadow: `0 4px 20px ${THEME.glow}`,
                border: `1px solid ${THEME.cardBorder}`,
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? '创建中...' : '创建第一枚贝壳'}
            </motion.button>
          ) : (
            beachView?.shells.map((shell, index) => (
              <ShellComponent
                key={shell.id}
                shell={shell}
                onClick={() => handleShellClick(shell)}
                position={{
                  left: `${20 + (index * 20) % 60}%`,
                  top: `${20 + (index * 15) % 50}%`,
                }}
              />
            ))
          )}

          {/* Pending injections from dad (golden shells) */}
          {injections.map((injection, index) => (
            <motion.button
              key={injection.id}
              onClick={() => handleViewInjection(injection)}
              className="absolute text-5xl"
              style={{
                left: `${70 + (index * 10) % 20}%`,
                top: `${30 + (index * 10) % 30}%`,
                filter: `drop-shadow(0 0 15px ${THEME.glow})`,
              }}
              animate={{
                filter: [
                  `drop-shadow(0 0 10px rgba(184, 169, 232, 0.4))`,
                  `drop-shadow(0 0 20px rgba(184, 169, 232, 0.7))`,
                  `drop-shadow(0 0 10px rgba(184, 169, 232, 0.4))`,
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              whileHover={{ scale: 1.1 }}
            >
              ✨
            </motion.button>
          ))}
        </div>

        {/* Add Shell Button */}
        {beachView?.shells && beachView.shells.length > 0 && (
          <motion.button
            onClick={handleCreateShell}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl text-sm font-medium backdrop-blur-sm"
            style={{
              background: THEME.accentGradient,
              color: THEME.text,
              boxShadow: `0 4px 20px ${THEME.glow}`,
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={isSubmitting}
          >
            + 新的贝壳
          </motion.button>
        )}

        {/* Drift Bottle */}
        <motion.button
          onClick={() => setShowBottleModal(true)}
          className="fixed right-6 top-1/2 -translate-y-1/2 text-5xl"
          animate={{
            y: [0, -10, 0],
            rotate: [-5, 5, -5],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          whileHover={{ scale: 1.1 }}
        >
          🍾
        </motion.button>
      </div>

      {/* Bottom Navigation */}
      <BottomNav currentPage="beach" identity="origin_seeker" />

      {/* Memory Input Modal */}
      <AnimatePresence>
        {showMemoryInput && selectedShell && (
          <MemoryInputModal
            memoryContent={memoryContent}
            setMemoryContent={setMemoryContent}
            selectedTag={selectedTag}
            setSelectedTag={setSelectedTag}
            onSubmit={handleMemorySubmit}
            onClose={() => {
              setShowMemoryInput(false);
              setSelectedShell(null);
              setMemoryContent('');
              setSelectedTag(null);
            }}
            isSubmitting={isSubmitting}
          />
        )}
      </AnimatePresence>

      {/* Drift Bottle Modal */}
      <AnimatePresence>
        {showBottleModal && (
          <BottleModal
            wishContent={wishContent}
            setWishContent={setWishContent}
            myBottles={myBottles}
            onSend={handleSendBottle}
            onClose={() => setShowBottleModal(false)}
            isSubmitting={isSubmitting}
          />
        )}
      </AnimatePresence>

      {/* Injection View Modal */}
      <AnimatePresence>
        {showInjectionModal && selectedInjection && (
          <InjectionModal
            injection={selectedInjection}
            onClose={() => {
              setShowInjectionModal(false);
              setSelectedInjection(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function MomBeachBackground() {
  return (
    <div className="fixed inset-0 -z-10">
      {/* Sky gradient - dreamy lavender tones */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #E8E4F5 0%, #F3EFFF 30%, #F8F6FF 50%)',
        }}
      />

      {/* Soft ethereal glow */}
      <div
        className="absolute top-[15%] right-[25%] w-40 h-40 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(184, 169, 232, 0.3) 0%, transparent 70%)',
          filter: 'blur(30px)',
        }}
      />

      {/* Secondary glow */}
      <div
        className="absolute top-[25%] left-[15%] w-32 h-32 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(212, 200, 240, 0.4) 0%, transparent 70%)',
          filter: 'blur(25px)',
        }}
      />

      {/* Ocean at horizon - dreamy lavender-tinted */}
      <motion.div
        className="absolute top-[35%] left-0 right-0 h-4"
        style={{
          background: 'linear-gradient(180deg, rgba(184, 169, 232, 0.2) 0%, rgba(212, 200, 240, 0.1) 100%)',
        }}
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Sand/beach with soft lavender gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[65%]"
        style={{
          background: 'linear-gradient(180deg, #E8E4F5 0%, #F3EFFF 50%, #F8F6FF 100%)',
        }}
      />
    </div>
  );
}

function ShellComponent({
  shell,
  onClick,
  position,
}: {
  shell: Shell;
  onClick: () => void;
  position: { left: string; top: string };
}) {
  const isDusty = shell.status === 'dusty';
  const isCompleted = shell.status === 'completed';

  return (
    <motion.button
      onClick={onClick}
      className="absolute transform -translate-x-1/2 -translate-y-1/2"
      style={position}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className="text-5xl"
        style={{
          filter: isDusty ? 'grayscale(80%) brightness(0.7)' : 'none',
        }}
        animate={
          isCompleted
            ? {
                filter: [
                  'drop-shadow(0 0 8px rgba(184, 169, 232, 0.4))',
                  'drop-shadow(0 0 16px rgba(184, 169, 232, 0.6))',
                  'drop-shadow(0 0 8px rgba(184, 169, 232, 0.4))',
                ],
              }
            : {}
        }
        transition={{ duration: 2, repeat: Infinity }}
      >
        {isCompleted ? '🦪' : '🐚'}
      </motion.div>
      {shell.title && (
        <p className="text-xs mt-1 text-center max-w-[80px] truncate" style={{ color: THEME.textLight }}>
          {shell.title}
        </p>
      )}
    </motion.button>
  );
}

function MemoryInputModal({
  memoryContent,
  setMemoryContent,
  selectedTag,
  setSelectedTag,
  onSubmit,
  onClose,
  isSubmitting,
}: {
  memoryContent: string;
  setMemoryContent: (v: string) => void;
  selectedTag: string | null;
  setSelectedTag: (v: string | null) => void;
  onSubmit: () => void;
  onClose: () => void;
  isSubmitting: boolean;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative rounded-3xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto glass-card backdrop-blur-xl"
        style={{
          backgroundColor: THEME.card,
          border: `1px solid ${THEME.cardBorder}`,
          boxShadow: `0 8px 32px ${THEME.glow}`,
        }}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <h2 className="text-xl text-center mb-2 font-serif font-medium" style={{ color: THEME.text }}>
          青春回忆
        </h2>
        <p className="text-sm text-center mb-6" style={{ color: THEME.textLight }}>
          哪段记忆在闪光？
        </p>

        {/* Memory tags */}
        <div className="mb-6">
          <p className="text-xs mb-3" style={{ color: THEME.textLight }}>请输入或选择记忆砂砾：</p>
          <div className="flex flex-wrap gap-2">
            {MEMORY_TAGS.map((tag) => (
              <motion.button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className="px-4 py-2 rounded-2xl text-sm font-medium transition-all"
                style={{
                  background: selectedTag === tag
                    ? THEME.accentGradient
                    : 'rgba(184, 169, 232, 0.1)',
                  color: selectedTag === tag ? THEME.text : THEME.textLight,
                  border: `1px solid ${selectedTag === tag ? 'transparent' : THEME.cardBorder}`,
                }}
                whileTap={{ scale: 0.95 }}
              >
                {tag}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Text input */}
        <div className="mb-6">
          <textarea
            value={memoryContent}
            onChange={(e) => setMemoryContent(e.target.value)}
            placeholder="那年夏天，我..."
            className="w-full h-32 p-4 rounded-2xl resize-none focus:outline-none focus:ring-2 transition-all"
            style={{
              backgroundColor: THEME.inputBg,
              border: `1px solid ${THEME.cardBorder}`,
              color: THEME.text,
            }}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <motion.button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl font-medium"
            style={{
              backgroundColor: 'rgba(184, 169, 232, 0.1)',
              color: THEME.textLight,
              border: `1px solid ${THEME.cardBorder}`,
            }}
            whileTap={{ scale: 0.95 }}
          >
            取消
          </motion.button>
          <motion.button
            onClick={onSubmit}
            disabled={isSubmitting || (!memoryContent.trim() && !selectedTag)}
            className="flex-1 py-3 rounded-2xl font-medium disabled:opacity-50"
            style={{
              background: THEME.accentGradient,
              color: THEME.text,
              boxShadow: `0 4px 15px ${THEME.glow}`,
            }}
            whileTap={{ scale: 0.95 }}
          >
            {isSubmitting ? '生成中...' : '确认'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function BottleModal({
  wishContent,
  setWishContent,
  myBottles,
  onSend,
  onClose,
  isSubmitting,
}: {
  wishContent: string;
  setWishContent: (v: string) => void;
  myBottles: DriftBottle[];
  onSend: () => void;
  onClose: () => void;
  isSubmitting: boolean;
}) {
  const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative rounded-3xl p-6 w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col glass-card backdrop-blur-xl"
        style={{
          backgroundColor: THEME.card,
          border: `1px solid ${THEME.cardBorder}`,
          boxShadow: `0 8px 32px ${THEME.glow}`,
        }}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <div className="text-center mb-5">
          <span className="text-5xl">🍾</span>
          <h2 className="text-xl mt-2 font-serif font-medium" style={{ color: THEME.text }}>
            心愿漂流瓶
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {(['send', 'history'] as const).map((tab) => (
            <motion.button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2.5 rounded-2xl text-sm font-medium transition-all"
              style={{
                background: activeTab === tab
                  ? THEME.accentGradient
                  : 'transparent',
                color: activeTab === tab ? THEME.text : THEME.textLight,
                border: activeTab === tab ? 'none' : `1px solid ${THEME.cardBorder}`,
              }}
              whileTap={{ scale: 0.95 }}
            >
              {tab === 'send' ? '发送心愿' : '过往心愿'}
            </motion.button>
          ))}
        </div>

        {activeTab === 'send' ? (
          <>
            <p className="text-sm text-center mb-4" style={{ color: THEME.textLight }}>
              写下你的心愿，让它漂向远方
            </p>
            <textarea
              value={wishContent}
              onChange={(e) => setWishContent(e.target.value)}
              placeholder="我想要..."
              className="w-full h-32 p-4 rounded-2xl resize-none focus:outline-none focus:ring-2 mb-4"
              style={{
                backgroundColor: THEME.inputBg,
                border: `1px solid ${THEME.cardBorder}`,
                color: THEME.text,
              }}
            />
            <div className="flex gap-3">
              <motion.button
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl font-medium"
                style={{
                  backgroundColor: 'rgba(184, 169, 232, 0.1)',
                  color: THEME.textLight,
                  border: `1px solid ${THEME.cardBorder}`,
                }}
                whileTap={{ scale: 0.95 }}
              >
                取消
              </motion.button>
              <motion.button
                onClick={onSend}
                disabled={isSubmitting || !wishContent.trim()}
                className="flex-1 py-3 rounded-2xl font-medium disabled:opacity-50"
                style={{
                  background: THEME.accentGradient,
                  color: THEME.text,
                  boxShadow: `0 4px 15px ${THEME.glow}`,
                }}
                whileTap={{ scale: 0.95 }}
              >
                {isSubmitting ? '发送中...' : '发送'}
              </motion.button>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {myBottles.length === 0 ? (
              <p className="text-center py-8" style={{ color: THEME.textLight }}>暂无心愿记录</p>
            ) : (
              <div className="space-y-3">
                {myBottles.map((bottle) => (
                  <div
                    key={bottle.id}
                    className="p-4 rounded-2xl"
                    style={{ backgroundColor: 'rgba(184, 169, 232, 0.08)' }}
                  >
                    <p className="text-sm break-words" style={{ color: THEME.text, wordBreak: 'break-word' }}>
                      &quot;{bottle.wish_content}&quot;
                    </p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs" style={{ color: THEME.textLight }}>
                        {new Date(bottle.created_at).toLocaleDateString('zh-CN')}
                      </span>
                      <span
                        className="text-xs px-3 py-1 rounded-full font-medium"
                        style={{
                          background:
                            bottle.status === 'completed' && bottle.mom_confirmed
                              ? 'linear-gradient(135deg, #34D399 0%, #10B981 100%)'
                              : bottle.status === 'completed'
                              ? THEME.accentGradient
                              : bottle.status === 'caught'
                              ? 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)'
                              : 'rgba(184, 169, 232, 0.2)',
                          color:
                            bottle.status === 'drifting'
                              ? THEME.textLight
                              : bottle.status === 'completed' && !bottle.mom_confirmed
                              ? THEME.text
                              : 'white',
                        }}
                      >
                        {bottle.status === 'completed' && bottle.mom_confirmed
                          ? '已达成'
                          : bottle.status === 'completed'
                          ? '待确认'
                          : bottle.status === 'caught'
                          ? '已拦截'
                          : '漂流中'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <motion.button
              onClick={onClose}
              className="w-full mt-4 py-3 rounded-2xl font-medium"
              style={{
                backgroundColor: 'rgba(184, 169, 232, 0.1)',
                color: THEME.textLight,
                border: `1px solid ${THEME.cardBorder}`,
              }}
              whileTap={{ scale: 0.95 }}
            >
              关闭
            </motion.button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function InjectionModal({
  injection,
  onClose,
}: {
  injection: MemoryInjection;
  onClose: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative rounded-3xl p-6 w-full max-w-md glass-card backdrop-blur-xl"
        style={{
          backgroundColor: THEME.card,
          border: `1px solid ${THEME.cardBorder}`,
          boxShadow: `0 8px 32px ${THEME.glow}`,
        }}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <div className="text-center mb-6">
          <motion.span
            className="text-6xl block"
            animate={{
              filter: [
                'drop-shadow(0 0 10px rgba(184, 169, 232, 0.4))',
                'drop-shadow(0 0 20px rgba(184, 169, 232, 0.7))',
                'drop-shadow(0 0 10px rgba(184, 169, 232, 0.4))',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ✨
          </motion.span>
          <h2 className="text-xl mt-4 font-serif font-medium" style={{ color: THEME.text }}>
            来自守护者的记忆
          </h2>
          {injection.title && (
            <p className="mt-2" style={{ color: THEME.textLight }}>{injection.title}</p>
          )}
        </div>

        <div
          className="rounded-2xl p-4 mb-6"
          style={{ backgroundColor: 'rgba(184, 169, 232, 0.1)' }}
        >
          <p className="whitespace-pre-wrap break-words" style={{ color: THEME.text, wordBreak: 'break-word' }}>
            {injection.content}
          </p>
        </div>

        {injection.sticker_url && (
          <div className="mb-6">
            <img
              src={injection.sticker_url}
              alt="Memory sticker"
              className="w-full rounded-2xl"
            />
          </div>
        )}

        <motion.button
          onClick={onClose}
          className="w-full py-3 rounded-2xl font-medium"
          style={{
            background: THEME.accentGradient,
            color: THEME.text,
            boxShadow: `0 4px 15px ${THEME.glow}`,
          }}
          whileTap={{ scale: 0.95 }}
        >
          收下这份心意
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
