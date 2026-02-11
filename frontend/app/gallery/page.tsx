/**
 * Pearl Gallery Page - 记
 * View all generated stickers, wishes, and memory records
 * Design: Calm-inspired soft gradients, glassmorphism
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { getIdentity, UserIdentity, getStickers, getBottles, Sticker, DriftBottle } from '../../lib/api/beach';
import BottomNav from '../../components/BottomNav';

type TabType = 'stickers' | 'wishes';

// Calm-inspired theme colors
const THEME = {
  mom: {
    bg: 'linear-gradient(180deg, #F8F6FF 0%, #F3EFFF 50%, #EDE7FF 100%)',
    text: '#4A4063',
    textLight: '#7B6F99',
    accent: '#B8A9E8',
    accentGradient: 'linear-gradient(135deg, #B8A9E8 0%, #D4C8F0 100%)',
    card: 'rgba(255, 255, 255, 0.72)',
    cardBorder: 'rgba(184, 169, 232, 0.25)',
    headerBg: 'rgba(248, 246, 255, 0.92)',
    glow: 'rgba(184, 169, 232, 0.35)',
  },
  dad: {
    bg: 'linear-gradient(180deg, #0D1B2A 0%, #1B2838 50%, #1F3044 100%)',
    text: '#E8EEF4',
    textLight: '#8BA4BC',
    accent: '#64B5F6',
    accentGradient: 'linear-gradient(135deg, #64B5F6 0%, #90CAF9 100%)',
    card: 'rgba(27, 40, 56, 0.75)',
    cardBorder: 'rgba(100, 181, 246, 0.18)',
    headerBg: 'rgba(13, 27, 42, 0.92)',
    glow: 'rgba(100, 181, 246, 0.3)',
  },
};

export default function GalleryPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('stickers');
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [bottles, setBottles] = useState<DriftBottle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSticker, setSelectedSticker] = useState<Sticker | null>(null);

  const isMom = identity === 'origin_seeker';
  const theme = isMom ? THEME.mom : THEME.dad;

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [stickersData, bottlesData] = await Promise.all([
        getStickers().catch(() => ({ stickers: [] })),
        getBottles().catch(() => ({ bottles: [] })),
      ]);
      setStickers(stickersData.stickers);
      setBottles(bottlesData.bottles);
    } catch (err) {
      console.error('Failed to load gallery:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      if (!authLoading) {
        if (!isAuthenticated) {
          router.push('/');
          return;
        }
        try {
          const data = await getIdentity();
          setIdentity(data.identity);
          await loadData();
        } catch {
          router.push('/');
        }
      }
    }
    init();
  }, [authLoading, isAuthenticated, router, loadData]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.bg }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="text-4xl"
        >
          🦪
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: theme.bg }}>
      {/* Header */}
      <div
        className="sticky top-0 z-40 px-4 pt-5 pb-4 backdrop-blur-xl"
        style={{ backgroundColor: theme.headerBg }}
      >
        <div className="flex items-center justify-between mb-5">
          <motion.button
            onClick={() => router.back()}
            className="p-2.5 rounded-xl"
            style={{
              backgroundColor: isMom ? 'rgba(184,169,232,0.15)' : 'rgba(100,181,246,0.15)',
            }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-lg" style={{ color: theme.text }}>←</span>
          </motion.button>
          <div className="text-center">
            <h1 className="text-xl font-serif font-medium" style={{ color: theme.text }}>
              珍珠馆
            </h1>
            <p className="text-xs mt-0.5" style={{ color: theme.textLight }}>
              珍藏你的回忆
            </p>
          </div>
          <div className="w-10" />
        </div>

        {/* Tabs */}
        <div className="flex gap-3">
          <TabButton
            label="记忆贴纸"
            icon="🎨"
            active={activeTab === 'stickers'}
            onClick={() => setActiveTab('stickers')}
            theme={theme}
            isMom={isMom}
          />
          <TabButton
            label="心愿记录"
            icon="🍾"
            active={activeTab === 'wishes'}
            onClick={() => setActiveTab('wishes')}
            theme={theme}
            isMom={isMom}
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        <AnimatePresence mode="wait">
          {activeTab === 'stickers' && (
            <motion.div
              key="stickers"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {stickers.length === 0 ? (
                <EmptyState
                  icon="🦪"
                  text="还没有记忆贴纸"
                  subtext="去沙滩上捡起一枚贝壳，记录你的回忆吧"
                  theme={theme}
                />
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {stickers.map((sticker, index) => (
                    <motion.button
                      key={sticker.id}
                      onClick={() => setSelectedSticker(sticker)}
                      className={`aspect-square rounded-3xl overflow-hidden relative backdrop-blur-sm ${isMom ? 'glass-card' : 'glass-card-dark'}`}
                      style={{
                        backgroundColor: theme.card,
                        border: `1px solid ${theme.cardBorder}`,
                        boxShadow: `0 4px 20px ${theme.glow}`,
                      }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {sticker.image_url ? (
                        <img
                          src={sticker.image_url}
                          alt={sticker.memory_text}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl">
                          🎨
                        </div>
                      )}
                      <div
                        className="absolute bottom-0 left-0 right-0 p-3"
                        style={{
                          background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                        }}
                      >
                        <p className="text-xs text-white truncate font-medium">
                          {sticker.memory_text}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'wishes' && (
            <motion.div
              key="wishes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {bottles.length === 0 ? (
                <EmptyState
                  icon="🍾"
                  text="还没有心愿记录"
                  subtext={isMom ? '去发送一个心愿漂流瓶吧' : '去拦截妈妈的漂流瓶吧'}
                  theme={theme}
                />
              ) : (
                bottles.map((bottle, index) => (
                  <motion.div
                    key={bottle.id}
                    className={`p-5 rounded-3xl backdrop-blur-sm ${isMom ? 'glass-card' : 'glass-card-dark'}`}
                    style={{
                      backgroundColor: theme.card,
                      border: `1px solid ${theme.cardBorder}`,
                      boxShadow: `0 4px 20px ${theme.glow}`,
                    }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{
                          background: isMom
                            ? 'linear-gradient(135deg, #D4C8F0 0%, #B8A9E8 100%)'
                            : 'linear-gradient(135deg, rgba(100,181,246,0.3) 0%, rgba(144,202,249,0.3) 100%)',
                        }}
                      >
                        {bottle.status === 'completed' && bottle.mom_confirmed
                          ? '✨'
                          : bottle.status === 'completed'
                          ? '💛'
                          : bottle.status === 'caught'
                          ? '🎯'
                          : '🌊'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="leading-relaxed mb-3 break-words" style={{ color: theme.text, wordBreak: 'break-word' }}>
                          &quot;{bottle.wish_content}&quot;
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-xs px-3 py-1 rounded-full font-medium"
                            style={{
                              background: getStatusColor(bottle.status, bottle.mom_confirmed, isMom).bg,
                              color: getStatusColor(bottle.status, bottle.mom_confirmed, isMom).text,
                            }}
                          >
                            {getStatusText(bottle.status, bottle.mom_confirmed)}
                          </span>
                          <span className="text-xs" style={{ color: theme.textLight }}>
                            {new Date(bottle.created_at).toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <BottomNav currentPage="gallery" identity={identity} />

      {/* Sticker Detail Modal */}
      <AnimatePresence>
        {selectedSticker && (
          <StickerDetailModal
            sticker={selectedSticker}
            onClose={() => setSelectedSticker(null)}
            isMom={isMom}
            theme={theme}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({
  label,
  icon,
  active,
  onClick,
  theme,
  isMom,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
  theme: typeof THEME.mom;
  isMom: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="flex-1 py-2.5 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
      style={{
        background: active
          ? theme.accentGradient
          : 'transparent',
        color: active ? (isMom ? '#4A4063' : '#0D1B2A') : theme.textLight,
        border: active ? 'none' : `1px solid ${theme.cardBorder}`,
        boxShadow: active ? `0 4px 15px ${theme.glow}` : 'none',
      }}
      whileTap={{ scale: 0.95 }}
    >
      <span>{icon}</span>
      {label}
    </motion.button>
  );
}

function EmptyState({
  icon,
  text,
  subtext,
  theme,
}: {
  icon: string;
  text: string;
  subtext: string;
  theme: typeof THEME.mom;
}) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.span
        className="text-7xl mb-6 opacity-50"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {icon}
      </motion.span>
      <p className="text-lg font-medium mb-2" style={{ color: theme.text }}>{text}</p>
      <p className="text-sm text-center max-w-xs" style={{ color: theme.textLight }}>{subtext}</p>
    </motion.div>
  );
}

function getStatusColor(status: string, confirmed: boolean, isMom: boolean) {
  if (status === 'completed' && confirmed) {
    return { bg: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)', text: 'white' };
  }
  if (status === 'completed') {
    return {
      bg: isMom ? 'linear-gradient(135deg, #B8A9E8 0%, #D4C8F0 100%)' : 'linear-gradient(135deg, #64B5F6 0%, #90CAF9 100%)',
      text: isMom ? '#4A4063' : '#0D1B2A'
    };
  }
  if (status === 'caught') {
    return { bg: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)', text: 'white' };
  }
  return {
    bg: isMom ? 'rgba(184,169,232,0.2)' : 'rgba(100,181,246,0.2)',
    text: isMom ? '#7B6F99' : '#8BA4BC'
  };
}

function getStatusText(status: string, confirmed: boolean) {
  if (status === 'completed' && confirmed) return '已达成';
  if (status === 'completed') return '待确认';
  if (status === 'caught') return '已拦截';
  return '漂流中';
}

function StickerDetailModal({
  sticker,
  onClose,
  isMom,
  theme,
}: {
  sticker: Sticker;
  onClose: () => void;
  isMom: boolean;
  theme: typeof THEME.mom;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        className={`relative w-full max-w-sm rounded-3xl overflow-hidden backdrop-blur-md ${isMom ? 'glass-card' : 'glass-card-dark'}`}
        style={{
          backgroundColor: theme.card,
          border: `1px solid ${theme.cardBorder}`,
          boxShadow: `0 8px 32px ${theme.glow}`,
        }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {sticker.image_url ? (
          <img
            src={sticker.image_url}
            alt={sticker.memory_text}
            className="w-full aspect-square object-cover"
          />
        ) : (
          <div
            className="w-full aspect-square flex items-center justify-center"
            style={{ background: theme.bg }}
          >
            <span className="text-8xl">🎨</span>
          </div>
        )}
        <div className="p-5">
          <p className="mb-2 leading-relaxed break-words" style={{ color: theme.text, wordBreak: 'break-word' }}>
            {sticker.memory_text}
          </p>
          <p className="text-xs" style={{ color: theme.textLight }}>
            {new Date(sticker.created_at).toLocaleDateString('zh-CN')}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
