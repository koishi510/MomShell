// frontend/app/shell/museum/page.tsx
/**
 * 珍珠馆页 - 记
 * 贴纸收藏与心愿历史
 */

'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import {
  BeachBackground,
  TopHeader,
} from '../../../components/shell';
import { AIStickerGrid } from '../../../components/shell/AISticker';
import { SHELL_COLORS, SPRING_CONFIGS } from '../../../lib/design-tokens';

type TabType = 'stickers' | 'wishes';

interface Sticker {
  id: string;
  image_url: string;
  title?: string;
  memory_text?: string;
  created_at?: string;
  is_new?: boolean;
}

interface WishRecord {
  id: string;
  content: string;
  status: 'pending' | 'accepted' | 'fulfilled';
  createdAt: string;
  fulfilledAt?: string;
}

export default function MuseumPage() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<TabType>('stickers');
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [wishes, setWishes] = useState<WishRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSticker, setSelectedSticker] = useState<Sticker | null>(null);

  // 根据来源判断主题
  const isPartnerMode = pathname.includes('/partner');
  const theme = isPartnerMode ? 'night' : 'day';
  const colors = theme === 'day' ? SHELL_COLORS.mom : SHELL_COLORS.partner;

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await new Promise((r) => setTimeout(r, 500));

      // 模拟贴纸数据
      const mockStickers: Sticker[] = [
        { id: '1', image_url: '', title: '青春校园', memory_text: '那年夏天的蝉鸣...', is_new: true },
        { id: '2', image_url: '', title: '初恋时光', memory_text: '第一次牵手...' },
        { id: '3', image_url: '', title: '毕业季', memory_text: '离别的车站...' },
        { id: '4', image_url: '', title: '新生活', memory_text: '遇见你的那天...' },
      ];

      // 模拟心愿数据
      const mockWishes: WishRecord[] = [
        { id: '1', content: '想吃草莓蛋糕', status: 'fulfilled', createdAt: '3 天前', fulfilledAt: '昨天' },
        { id: '2', content: '想去公园晒太阳', status: 'accepted', createdAt: '2 天前' },
        { id: '3', content: '想看一场电影', status: 'pending', createdAt: '今天' },
      ];

      setStickers(mockStickers);
      setWishes(mockWishes);
      setIsLoading(false);
    };

    loadData();
  }, []);

  const handleStickerClick = (id: string) => {
    const sticker = stickers.find((s) => s.id === id);
    if (sticker) {
      setSelectedSticker(sticker);
    }
  };

  const getStatusText = (status: WishRecord['status']) => {
    switch (status) {
      case 'pending': return '等待中';
      case 'accepted': return '已接住';
      case 'fulfilled': return '已实现';
    }
  };

  const getStatusColor = (status: WishRecord['status']) => {
    switch (status) {
      case 'pending': return SHELL_COLORS.shell.golden;
      case 'accepted': return colors.accent;
      case 'fulfilled': return '#4CAF50';
    }
  };

  return (
    <BeachBackground theme={theme}>
      <TopHeader
        title="珍珠馆"
        theme={theme}
        avatarUrl={user?.avatar_url}
      />

      <main className="relative min-h-[calc(100vh-120px)] px-4 pt-4 pb-24">
        {/* Tab 切换 */}
        <motion.div
          className="flex gap-2 mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {[
            { id: 'stickers' as TabType, label: '记忆贴纸', icon: '🌟' },
            { id: 'wishes' as TabType, label: '心愿记录', icon: '💝' },
          ].map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
              style={{
                background: activeTab === tab.id
                  ? `linear-gradient(135deg, ${colors.accent} 0%, ${theme === 'day' ? '#FFA726' : '#5C6BC0'} 100%)`
                  : theme === 'day'
                    ? 'rgba(255, 255, 255, 0.7)'
                    : 'rgba(255, 255, 255, 0.1)',
                color: activeTab === tab.id ? 'white' : colors.text,
              }}
              whileTap={{ scale: 0.98 }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* 内容区 */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-4xl"
            >
              💎
            </motion.div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'stickers' ? (
              <motion.div
                key="stickers"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <AIStickerGrid
                  stickers={stickers}
                  onStickerClick={handleStickerClick}
                  emptyMessage="还没有收集到记忆贴纸"
                />
              </motion.div>
            ) : (
              <motion.div
                key="wishes"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                {wishes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <motion.div
                      className="text-5xl mb-4"
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      🍾
                    </motion.div>
                    <p style={{ color: `${colors.text}80` }}>
                      还没有许过心愿
                    </p>
                  </div>
                ) : (
                  wishes.map((wish, index) => (
                    <motion.div
                      key={wish.id}
                      className="rounded-2xl p-4"
                      style={{
                        background: theme === 'day'
                          ? 'rgba(255, 255, 255, 0.8)'
                          : 'rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(12px)',
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm" style={{ color: colors.text }}>
                          {wish.content}
                        </p>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs shrink-0 ml-2"
                          style={{
                            background: `${getStatusColor(wish.status)}30`,
                            color: getStatusColor(wish.status),
                          }}
                        >
                          {getStatusText(wish.status)}
                        </span>
                      </div>
                      <div className="flex gap-3 text-xs" style={{ color: `${colors.text}60` }}>
                        <span>许愿: {wish.createdAt}</span>
                        {wish.fulfilledAt && <span>实现: {wish.fulfilledAt}</span>}
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* 贴纸详情弹窗 */}
        <AnimatePresence>
          {selectedSticker && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSticker(null)}
            >
              <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

              <motion.div
                className="relative bg-white rounded-3xl p-6 shadow-xl text-center max-w-sm"
                style={{
                  background: theme === 'day'
                    ? 'white'
                    : `linear-gradient(180deg, ${colors.background} 0%, #0D1B2A 100%)`,
                }}
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 50 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* 贴纸图片 */}
                <motion.div
                  className="w-40 h-40 mx-auto rounded-2xl mb-4 flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${SHELL_COLORS.mom.accent} 0%, #FFA726 100%)`,
                    boxShadow: `0 8px 32px ${SHELL_COLORS.mom.shadow}`,
                  }}
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: 360 }}
                  transition={{ duration: 0.8 }}
                >
                  <span className="text-6xl">🌟</span>
                </motion.div>

                <h3 className="text-lg font-medium mb-2" style={{ color: colors.text }}>
                  {selectedSticker.title}
                </h3>

                {selectedSticker.memory_text && (
                  <p className="text-sm mb-4" style={{ color: `${colors.text}80` }}>
                    &ldquo;{selectedSticker.memory_text}&rdquo;
                  </p>
                )}

                <motion.button
                  onClick={() => setSelectedSticker(null)}
                  className="px-6 py-2 rounded-full text-sm"
                  style={{
                    background: `${colors.accent}30`,
                    color: colors.text,
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  收好
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </BeachBackground>
  );
}
