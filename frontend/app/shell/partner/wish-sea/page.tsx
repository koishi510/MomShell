// frontend/app/shell/partner/wish-sea/page.tsx
/**
 * 心愿海域 - 妈妈的漂流瓶列表
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../../contexts/AuthContext';
import {
  BeachBackground,
  TopHeader,
} from '../../../../components/shell';
import { SHELL_COLORS, SPRING_CONFIGS } from '../../../../lib/design-tokens';

interface WishBottle {
  id: string;
  content: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'fulfilled';
  momName?: string;
}

export default function WishSeaPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [wishes, setWishes] = useState<WishBottle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWish, setSelectedWish] = useState<WishBottle | null>(null);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);

  useEffect(() => {
    const loadWishes = async () => {
      setIsLoading(true);
      await new Promise((r) => setTimeout(r, 500));

      // 模拟数据
      const mockWishes: WishBottle[] = [
        {
          id: '1',
          content: '想吃草莓蛋糕',
          createdAt: '2 小时前',
          status: 'pending',
          momName: '她',
        },
        {
          id: '2',
          content: '想去公园晒太阳',
          createdAt: '昨天',
          status: 'pending',
          momName: '她',
        },
        {
          id: '3',
          content: '想看一场电影',
          createdAt: '3 天前',
          status: 'accepted',
          momName: '她',
        },
        {
          id: '4',
          content: '想喝奶茶',
          createdAt: '上周',
          status: 'fulfilled',
          momName: '她',
        },
      ];

      setWishes(mockWishes);
      setIsLoading(false);
    };

    loadWishes();
  }, []);

  const handleAcceptWish = async (wish: WishBottle) => {
    setSelectedWish(wish);
    setShowAcceptConfirm(true);
  };

  const confirmAccept = async () => {
    if (!selectedWish) return;

    // 更新状态
    setWishes((prev) =>
      prev.map((w) =>
        w.id === selectedWish.id ? { ...w, status: 'accepted' as const } : w
      )
    );

    setShowAcceptConfirm(false);
    setSelectedWish(null);

    // 跳转到任务页
    router.push(`/shell/partner/task/${selectedWish.id}`);
  };

  const getStatusBadge = (status: WishBottle['status']) => {
    switch (status) {
      case 'pending':
        return { text: '待接住', color: SHELL_COLORS.shell.golden };
      case 'accepted':
        return { text: '已接住', color: SHELL_COLORS.partner.accent };
      case 'fulfilled':
        return { text: '已完成', color: '#4CAF50' };
    }
  };

  return (
    <BeachBackground theme="night">
      <TopHeader
        title="心愿海域"
        theme="night"
        showBack
        avatarUrl={user?.avatar_url}
      />

      <main className="relative min-h-[calc(100vh-60px)] px-4 pt-6 pb-8">
        {/* 说明文字 */}
        <motion.p
          className="text-center text-sm mb-6"
          style={{ color: `${SHELL_COLORS.partner.text}99` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          她的心愿漂流到了这里
        </motion.p>

        {/* 漂流瓶列表 */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <motion.div
              animate={{ y: [0, -10, 0], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-5xl"
            >
              🍾
            </motion.div>
          </div>
        ) : wishes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <motion.div
              className="text-5xl mb-4"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              🌊
            </motion.div>
            <p style={{ color: `${SHELL_COLORS.partner.text}80` }}>
              海域平静，暂无漂流瓶
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {wishes.map((wish, index) => {
              const badge = getStatusBadge(wish.status);
              return (
                <motion.div
                  key={wish.id}
                  className="rounded-2xl p-4 relative overflow-hidden"
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(12px)',
                  }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  {/* 漂流瓶图标 */}
                  <div className="flex gap-4">
                    <motion.div
                      className="text-3xl"
                      animate={wish.status === 'pending' ? {
                        rotate: [0, 10, -10, 0],
                        y: [0, -3, 0],
                      } : {}}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      🍾
                    </motion.div>

                    <div className="flex-1">
                      {/* 状态标签 */}
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs"
                          style={{
                            background: `${badge.color}30`,
                            color: badge.color,
                          }}
                        >
                          {badge.text}
                        </span>
                        <span
                          className="text-xs"
                          style={{ color: `${SHELL_COLORS.partner.text}60` }}
                        >
                          {wish.createdAt}
                        </span>
                      </div>

                      {/* 心愿内容 */}
                      <p
                        className="text-sm"
                        style={{ color: SHELL_COLORS.partner.text }}
                      >
                        {wish.content}
                      </p>
                    </div>

                    {/* 操作按钮 */}
                    {wish.status === 'pending' && (
                      <motion.button
                        onClick={() => handleAcceptWish(wish)}
                        className="self-center px-4 py-2 rounded-full text-sm font-medium"
                        style={{
                          background: `linear-gradient(135deg, ${SHELL_COLORS.shell.golden} 0%, #FFA726 100%)`,
                          color: SHELL_COLORS.mom.text,
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        接住
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* 接受确认弹窗 */}
        <AnimatePresence>
          {showAcceptConfirm && selectedWish && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setShowAcceptConfirm(false)}
              />

              <motion.div
                className="relative rounded-3xl p-6 shadow-xl text-center max-w-sm"
                style={{
                  background: `linear-gradient(180deg, ${SHELL_COLORS.partner.background} 0%, #0D1B2A 100%)`,
                }}
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 50 }}
                transition={SPRING_CONFIGS.bouncy}
              >
                <motion.div
                  className="text-5xl mb-4"
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  🍾
                </motion.div>

                <h3
                  className="text-lg font-medium mb-2"
                  style={{ color: SHELL_COLORS.partner.text }}
                >
                  接住这个心愿？
                </h3>

                <p
                  className="text-sm mb-6 px-4"
                  style={{ color: `${SHELL_COLORS.partner.text}99` }}
                >
                  &ldquo;{selectedWish.content}&rdquo;
                </p>

                <p
                  className="text-xs mb-6"
                  style={{ color: `${SHELL_COLORS.partner.text}60` }}
                >
                  接住后将创建一枚金色任务贝壳
                </p>

                <div className="flex gap-3 justify-center">
                  <motion.button
                    onClick={() => setShowAcceptConfirm(false)}
                    className="px-6 py-2.5 rounded-full text-sm"
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      color: SHELL_COLORS.partner.text,
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    再想想
                  </motion.button>

                  <motion.button
                    onClick={confirmAccept}
                    className="px-6 py-2.5 rounded-full text-sm font-medium"
                    style={{
                      background: `linear-gradient(135deg, ${SHELL_COLORS.shell.golden} 0%, #FFA726 100%)`,
                      color: SHELL_COLORS.mom.text,
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    我已接住
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </BeachBackground>
  );
}
