/**
 * 守护之滨 - Dad Mode Beach Page
 * Layout 2.0: Dark beach with deep ocean gradients, task shells, catch bottles, inject memories
 * Design: Calm-inspired glassmorphism, soft gradients
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import BottomNav from '../../../components/BottomNav';
import {
  getBeachView,
  completeShell,
  getBottles,
  catchBottle,
  completeBottle,
  createInjection,
  Shell,
  DriftBottle,
  BeachView,
} from '../../../lib/api/beach';

// Calm-inspired Theme colors
const THEME = {
  bg: 'linear-gradient(180deg, #0D1B2A 0%, #1B2838 50%, #1F3044 100%)',
  text: '#E8EEF4',
  textLight: '#8BA4BC',
  accent: '#64B5F6',
  accentGradient: 'linear-gradient(135deg, #64B5F6 0%, #90CAF9 100%)',
  card: 'rgba(27, 40, 56, 0.75)',
  cardBorder: 'rgba(100, 181, 246, 0.18)',
  headerBg: 'rgba(13, 27, 42, 0.92)',
  inputBg: 'rgba(27, 40, 56, 0.5)',
  glow: 'rgba(100, 181, 246, 0.3)',
};

// Default tasks for dad
const DEFAULT_TASKS = [
  '给宝宝洗澡',
  '清理散落的玩具',
  '半夜喂奶',
  '换尿布',
  '陪宝宝玩耍',
  '准备辅食',
];

export default function DadBeachPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [beachView, setBeachView] = useState<BeachView | null>(null);
  const [driftingBottles, setDriftingBottles] = useState<DriftBottle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [selectedShell, setSelectedShell] = useState<Shell | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showBottleModal, setShowBottleModal] = useState(false);
  const [showConchModal, setShowConchModal] = useState(false);

  // Form states
  const [injectionContent, setInjectionContent] = useState('');
  const [injectionTitle, setInjectionTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Memoize star positions to prevent hydration mismatch
  const starPositions = useMemo(() => {
    return [...Array(25)].map((_, i) => ({
      left: `${8 + (i * 17) % 84}%`,
      top: `${3 + (i * 7) % 28}%`,
      size: 1 + (i % 3) * 0.5,
      duration: 2.5 + (i % 4),
      delay: (i % 6) * 0.3,
    }));
  }, []);

  // Load beach view
  const loadBeachView = useCallback(async () => {
    try {
      setIsLoading(true);
      const [view, bottlesData] = await Promise.all([
        getBeachView(),
        getBottles().catch(() => ({ bottles: [] })),
      ]);
      setBeachView(view);
      setDriftingBottles(
        bottlesData.bottles.filter((b) => b.status === 'drifting' || b.status === 'caught')
      );
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

  // Handle shell click (task shell)
  const handleShellClick = (shell: Shell) => {
    setSelectedShell(shell);
    setShowTaskModal(true);
  };

  // Handle task completion
  const handleCompleteTask = async () => {
    if (!selectedShell) return;

    setIsSubmitting(true);
    try {
      await completeShell(selectedShell.id);
      await loadBeachView();
      setShowTaskModal(false);
      setSelectedShell(null);
    } catch (err) {
      console.error('Failed to complete task:', err);
      alert('完成失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle bottle catch
  const handleCatchBottle = async (bottle: DriftBottle) => {
    setIsSubmitting(true);
    try {
      await catchBottle(bottle.id);
      await loadBeachView();
    } catch (err) {
      console.error('Failed to catch bottle:', err);
      alert('拦截失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle wish completion
  const handleCompleteWish = async (bottle: DriftBottle) => {
    setIsSubmitting(true);
    try {
      await completeBottle(bottle.id);
      await loadBeachView();
    } catch (err) {
      console.error('Failed to complete wish:', err);
      alert('标记失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle memory injection
  const handleInjectMemory = async () => {
    if (!injectionContent.trim()) return;

    setIsSubmitting(true);
    try {
      await createInjection({
        content_type: 'text',
        content: injectionContent,
        title: injectionTitle || undefined,
        generate_sticker: true,
      });
      setShowConchModal(false);
      setInjectionContent('');
      setInjectionTitle('');
    } catch (err) {
      console.error('Failed to inject memory:', err);
      alert('注入失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: THEME.bg }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="text-4xl"
          style={{
            filter: `drop-shadow(0 0 12px ${THEME.glow})`,
          }}
        >
          🐚
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: THEME.bg }}>
      {/* Dark Beach Background */}
      <DadBeachBackground starPositions={starPositions} />

      {/* Top Bar */}
      <div
        className="fixed top-0 left-0 right-0 z-40 px-4 py-4 flex items-center justify-between backdrop-blur-xl"
        style={{ backgroundColor: THEME.headerBg, borderBottom: `1px solid ${THEME.cardBorder}` }}
      >
        <motion.button
          onClick={() => router.push('/profile')}
          className="p-2.5 rounded-xl"
          style={{ backgroundColor: THEME.inputBg }}
          whileTap={{ scale: 0.95 }}
        >
          <svg className="w-5 h-5" fill="none" stroke={THEME.text} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </motion.button>

        <div className="text-center">
          <h1 className="text-xl font-serif font-medium" style={{ color: THEME.text }}>
            守护之滨
          </h1>
          <p className="text-xs mt-0.5" style={{ color: THEME.textLight }}>守望她的流光</p>
        </div>

        <motion.button
          className="p-2.5 rounded-xl relative"
          style={{ backgroundColor: THEME.inputBg }}
          whileTap={{ scale: 0.95 }}
        >
          <svg className="w-5 h-5" fill="none" stroke={THEME.text} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {driftingBottles.length > 0 && (
            <span
              className="absolute -top-1 -right-1 w-5 h-5 text-xs rounded-full flex items-center justify-center font-medium"
              style={{
                background: THEME.accentGradient,
                color: '#0D1B2A',
              }}
            >
              {driftingBottles.length}
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
          animate={{ opacity: 0.8, y: 0 }}
        >
          <p className="text-lg font-serif" style={{ color: THEME.text }}>
            濯洗尘埃，守望她的流光
          </p>
        </motion.div>

        {/* Task Shells on Beach */}
        <div className="relative w-full h-[50vh] overflow-visible">
          {beachView?.shells.map((shell, index) => (
            <TaskShellComponent
              key={shell.id}
              shell={shell}
              onClick={() => handleShellClick(shell)}
              position={{
                left: `${20 + (index * 20) % 60}%`,
                top: `${25 + (index * 15) % 45}%`,
              }}
            />
          ))}
        </div>

        {/* Drift Bottle */}
        <motion.button
          onClick={() => setShowBottleModal(true)}
          className="fixed right-6 top-1/3 text-5xl relative"
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
          {driftingBottles.length > 0 && (
            <span
              className="absolute -top-2 -right-2 w-6 h-6 text-xs rounded-full flex items-center justify-center font-bold"
              style={{
                background: THEME.accentGradient,
                color: '#0D1B2A',
              }}
            >
              {driftingBottles.length}
            </span>
          )}
        </motion.button>

        {/* Conch (Memory Injection) */}
        <motion.button
          onClick={() => setShowConchModal(true)}
          className="fixed right-6 top-1/2 text-4xl flex flex-col items-center"
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          whileHover={{ scale: 1.1 }}
          style={{
            filter: `drop-shadow(0 0 8px ${THEME.glow})`,
          }}
        >
          🐚
          <span className="text-xs mt-1 whitespace-nowrap" style={{ color: THEME.textLight }}>
            注入记忆
          </span>
        </motion.button>
      </div>

      {/* Bottom Navigation */}
      <BottomNav currentPage="beach" identity="guardian" />

      {/* Task Modal */}
      <AnimatePresence>
        {showTaskModal && selectedShell && (
          <TaskModal
            shell={selectedShell}
            onComplete={handleCompleteTask}
            onClose={() => {
              setShowTaskModal(false);
              setSelectedShell(null);
            }}
            isSubmitting={isSubmitting}
          />
        )}
      </AnimatePresence>

      {/* Bottle Modal */}
      <AnimatePresence>
        {showBottleModal && (
          <BottleListModal
            bottles={driftingBottles}
            onCatch={handleCatchBottle}
            onComplete={handleCompleteWish}
            onClose={() => setShowBottleModal(false)}
            isSubmitting={isSubmitting}
          />
        )}
      </AnimatePresence>

      {/* Conch Modal (Memory Injection) */}
      <AnimatePresence>
        {showConchModal && (
          <ConchModal
            content={injectionContent}
            setContent={setInjectionContent}
            title={injectionTitle}
            setTitle={setInjectionTitle}
            onInject={handleInjectMemory}
            onClose={() => setShowConchModal(false)}
            isSubmitting={isSubmitting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DadBeachBackground({ starPositions }: { starPositions: Array<{ left: string; top: string; size: number; duration: number; delay: number }> }) {
  return (
    <div className="fixed inset-0 -z-10">
      {/* Night sky gradient - deep ocean tones */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, #0D1B2A 0%, #1B2838 40%, #1F3044 100%)' }}
      />

      {/* Moonlight glow - soft blue */}
      <div
        className="absolute top-[8%] right-[18%] w-28 h-28 rounded-full"
        style={{
          background: `radial-gradient(circle, ${THEME.glow} 0%, transparent 70%)`,
          filter: 'blur(20px)',
        }}
      />

      {/* Secondary moon halo */}
      <div
        className="absolute top-[6%] right-[16%] w-40 h-40 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(100, 181, 246, 0.12) 0%, transparent 70%)',
          filter: 'blur(30px)',
        }}
      />

      {/* Moonlight reflection on water */}
      <motion.div
        className="absolute top-[32%] left-1/2 -translate-x-1/2 w-6 h-36"
        style={{
          background: `linear-gradient(180deg, ${THEME.glow} 0%, transparent 100%)`,
          filter: 'blur(10px)',
        }}
        animate={{
          scaleY: [1, 1.15, 1],
          opacity: [0.25, 0.45, 0.25],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Ocean horizon line */}
      <motion.div
        className="absolute top-[30%] left-0 right-0 h-8"
        style={{
          background: 'linear-gradient(180deg, rgba(13,27,42,0.85) 0%, rgba(27,40,56,0.5) 100%)',
        }}
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Dark sand beach */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[65%]"
        style={{
          background: 'linear-gradient(180deg, #1F3044 0%, #1B2838 50%, #0D1B2A 100%)',
        }}
      />

      {/* Stars - using pre-computed deterministic positions */}
      {starPositions.map((star, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            background: i % 4 === 0 ? THEME.accent : '#E8EEF4',
          }}
          animate={{
            opacity: [0.2, 0.9, 0.2],
            scale: [0.8, 1.3, 0.8],
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

function TaskShellComponent({
  shell,
  onClick,
  position,
}: {
  shell: Shell;
  onClick: () => void;
  position: { left: string; top: string };
}) {
  const isMuddy = shell.status === 'dusty';
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
          filter: isMuddy ? 'brightness(0.5) saturate(0.5)' : 'none',
        }}
        animate={
          isCompleted
            ? {
                filter: [
                  `drop-shadow(0 0 8px ${THEME.glow})`,
                  `drop-shadow(0 0 18px rgba(100, 181, 246, 0.5))`,
                  `drop-shadow(0 0 8px ${THEME.glow})`,
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

function TaskModal({
  shell,
  onComplete,
  onClose,
  isSubmitting,
}: {
  shell: Shell;
  onComplete: () => void;
  onClose: () => void;
  isSubmitting: boolean;
}) {
  const isCompleted = shell.status === 'completed';

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative rounded-3xl p-6 w-full max-w-md glass-card-dark backdrop-blur-xl"
        style={{
          backgroundColor: THEME.card,
          border: `1px solid ${THEME.cardBorder}`,
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 ${THEME.cardBorder}`,
        }}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <div className="text-center mb-6">
          <motion.span
            className="text-6xl block"
            style={{
              filter: `drop-shadow(0 0 12px ${THEME.glow})`,
            }}
          >
            {isCompleted ? '🦪' : '🐚'}
          </motion.span>
          <h2 className="text-xl mt-4 font-serif font-medium" style={{ color: THEME.text }}>
            濯贝任务
          </h2>
        </div>

        <div
          className="p-4 rounded-2xl mb-6"
          style={{ backgroundColor: THEME.inputBg }}
        >
          <h3 className="text-lg mb-2 font-medium" style={{ color: THEME.text }}>
            {shell.title}
          </h3>
          {shell.content && (
            <p className="break-words" style={{ color: THEME.textLight, wordBreak: 'break-word' }}>
              {shell.content}
            </p>
          )}
        </div>

        {!isCompleted ? (
          <>
            <p className="text-sm text-center mb-6" style={{ color: THEME.textLight }}>
              完成现实任务后，滑动确认完成
            </p>
            <div className="flex gap-3">
              <motion.button
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl font-medium"
                style={{
                  backgroundColor: THEME.inputBg,
                  color: THEME.textLight,
                  border: `1px solid ${THEME.cardBorder}`,
                }}
                whileTap={{ scale: 0.95 }}
              >
                稍后
              </motion.button>
              <motion.button
                onClick={onComplete}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-2xl font-medium disabled:opacity-50"
                style={{
                  background: THEME.accentGradient,
                  color: '#0D1B2A',
                  boxShadow: `0 4px 15px ${THEME.glow}`,
                }}
                whileTap={{ scale: 0.95 }}
              >
                {isSubmitting ? '完成中...' : '确认完成'}
              </motion.button>
            </div>
          </>
        ) : (
          <div className="text-center">
            <p className="mb-4" style={{ color: THEME.accent }}>
              因为你的守护，她找回了这一段流光
            </p>
            <motion.button
              onClick={onClose}
              className="px-8 py-3 rounded-2xl font-medium"
              style={{
                background: THEME.accentGradient,
                color: '#0D1B2A',
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

function BottleListModal({
  bottles,
  onCatch,
  onComplete,
  onClose,
  isSubmitting,
}: {
  bottles: DriftBottle[];
  onCatch: (bottle: DriftBottle) => void;
  onComplete: (bottle: DriftBottle) => void;
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative rounded-3xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto glass-card-dark backdrop-blur-xl"
        style={{
          backgroundColor: THEME.card,
          border: `1px solid ${THEME.cardBorder}`,
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 ${THEME.cardBorder}`,
        }}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <div className="text-center mb-6">
          <span className="text-5xl">🍾</span>
          <h2 className="text-xl mt-2 font-serif font-medium" style={{ color: THEME.text }}>
            心愿海域
          </h2>
        </div>

        {bottles.length === 0 ? (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="text-5xl block mb-4 opacity-50">🌊</span>
            <p style={{ color: THEME.textLight }}>暂无漂流瓶</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {bottles.map((bottle, index) => (
              <motion.div
                key={bottle.id}
                className="p-5 rounded-2xl"
                style={{ backgroundColor: THEME.inputBg }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <p className="mb-4 break-words" style={{ color: THEME.text, wordBreak: 'break-word' }}>
                  &quot;{bottle.wish_content}&quot;
                </p>
                <div className="flex justify-between items-center">
                  <span
                    className="text-xs px-3 py-1 rounded-full"
                    style={{
                      backgroundColor: THEME.inputBg,
                      color: THEME.textLight,
                      border: `1px solid ${THEME.cardBorder}`,
                    }}
                  >
                    {bottle.status === 'drifting' ? '漂流中' : '已拦截'}
                  </span>
                  {bottle.status === 'drifting' && (
                    <motion.button
                      onClick={() => onCatch(bottle)}
                      disabled={isSubmitting}
                      className="px-5 py-2 rounded-2xl text-sm font-medium disabled:opacity-50"
                      style={{
                        background: THEME.accentGradient,
                        color: '#0D1B2A',
                      }}
                      whileTap={{ scale: 0.95 }}
                    >
                      拦截
                    </motion.button>
                  )}
                  {bottle.status === 'caught' && (
                    <motion.button
                      onClick={() => onComplete(bottle)}
                      disabled={isSubmitting}
                      className="px-5 py-2 rounded-2xl text-sm font-medium disabled:opacity-50"
                      style={{
                        background: THEME.accentGradient,
                        color: '#0D1B2A',
                      }}
                      whileTap={{ scale: 0.95 }}
                    >
                      我已接住
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <motion.button
          onClick={onClose}
          className="w-full mt-6 py-3 rounded-2xl font-medium"
          style={{
            backgroundColor: THEME.inputBg,
            color: THEME.textLight,
            border: `1px solid ${THEME.cardBorder}`,
          }}
          whileTap={{ scale: 0.95 }}
        >
          关闭
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

function ConchModal({
  content,
  setContent,
  title,
  setTitle,
  onInject,
  onClose,
  isSubmitting,
}: {
  content: string;
  setContent: (v: string) => void;
  title: string;
  setTitle: (v: string) => void;
  onInject: () => void;
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative rounded-3xl p-6 w-full max-w-md glass-card-dark backdrop-blur-xl"
        style={{
          backgroundColor: THEME.card,
          border: `1px solid ${THEME.cardBorder}`,
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 ${THEME.cardBorder}`,
        }}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <div className="text-center mb-6">
          <motion.span
            className="text-5xl block"
            animate={{
              filter: [
                `drop-shadow(0 0 10px ${THEME.glow})`,
                `drop-shadow(0 0 22px rgba(100, 181, 246, 0.5))`,
                `drop-shadow(0 0 10px ${THEME.glow})`,
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            🐚
          </motion.span>
          <h2 className="text-xl mt-2 font-serif font-medium" style={{ color: THEME.text }}>
            注入记忆
          </h2>
          <p className="text-sm mt-1" style={{ color: THEME.textLight }}>
            写下你想分享给她的话或回忆
          </p>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题（可选）"
          className="w-full px-4 py-3 rounded-2xl mb-4 focus:outline-none focus:ring-2 transition-all"
          style={{
            backgroundColor: THEME.inputBg,
            border: `1px solid ${THEME.cardBorder}`,
            color: THEME.text,
          }}
        />

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="那年我们..."
          className="w-full h-32 p-4 rounded-2xl resize-none focus:outline-none focus:ring-2 mb-6 transition-all"
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
              backgroundColor: THEME.inputBg,
              color: THEME.textLight,
              border: `1px solid ${THEME.cardBorder}`,
            }}
            whileTap={{ scale: 0.95 }}
          >
            取消
          </motion.button>
          <motion.button
            onClick={onInject}
            disabled={isSubmitting || !content.trim()}
            className="flex-1 py-3 rounded-2xl font-medium disabled:opacity-50"
            style={{
              background: THEME.accentGradient,
              color: '#0D1B2A',
              boxShadow: `0 4px 15px ${THEME.glow}`,
            }}
            whileTap={{ scale: 0.95 }}
          >
            {isSubmitting ? '注入中...' : '发送'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
