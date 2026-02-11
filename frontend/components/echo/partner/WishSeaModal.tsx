// components/echo/partner/WishSeaModal.tsx
/**
 * WishSeaModal - Ocean view modal for catching wishes
 *
 * Features:
 * - Animated ocean background
 * - Drifting wish bottles
 * - "我已接住" button to catch wish
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Waves, Heart } from 'lucide-react';
import { ECHO_COLORS } from '../../../lib/design-tokens';
import type { WishBottle as WishBottleType } from '../../../types/echo';

interface WishSeaModalProps {
  isOpen: boolean;
  wishes: WishBottleType[];
  onClose: () => void;
  onCatch: (wishId: string) => Promise<void>;
  catching?: boolean;
}

export function WishSeaModal({
  isOpen,
  wishes,
  onClose,
  onCatch,
  catching = false,
}: WishSeaModalProps) {
  const [selectedWish, setSelectedWish] = useState<WishBottleType | null>(null);
  const [caughtWishId, setCaughtWishId] = useState<string | null>(null);

  // Guard against undefined/null wishes
  const driftingWishes = (wishes || []).filter((w) => w.status === 'drifting');

  const handleCatch = async () => {
    if (selectedWish && !catching) {
      setCaughtWishId(selectedWish.id);
      await onCatch(selectedWish.id);
      setSelectedWish(null);
      setCaughtWishId(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: `linear-gradient(180deg, ${ECHO_COLORS.beach.skyTop} 0%, ${ECHO_COLORS.beach.skyMiddle} 40%, ${ECHO_COLORS.beach.ocean} 100%)`,
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-full hover:bg-white/10 transition-colors"
            style={{ color: 'white' }}
          >
            <X size={24} />
          </button>

          {/* Ocean waves */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute bottom-0 left-0 right-0 opacity-30"
                style={{
                  height: 100 + i * 20,
                  background: `linear-gradient(180deg, ${ECHO_COLORS.beach.wave} 0%, transparent 100%)`,
                }}
                animate={{
                  x: ['-5%', '5%', '-5%'],
                }}
                transition={{
                  duration: 6 + i * 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          {/* Content */}
          <div className="relative z-10 w-full max-w-2xl">
            {/* Title */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-center mb-6"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Waves className="text-blue-300" size={24} />
                <h2 className="text-2xl font-bold text-white">心愿海域</h2>
              </div>
              <p className="text-white/70 text-sm">
                她发送了 {driftingWishes.length} 个心愿漂流瓶
              </p>
            </motion.div>

            {/* Drifting bottles */}
            <div className="relative min-h-[300px]">
              {driftingWishes.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <motion.div
                    animate={{
                      opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                    }}
                  >
                    <p className="text-white/60">海面平静，暂无漂流瓶</p>
                  </motion.div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {driftingWishes.map((wish, index) => (
                    <motion.div
                      key={wish.id}
                      className="relative"
                      onClick={() => setSelectedWish(wish)}
                      animate={{
                        y: [0, -15, 0],
                        x: [0, index % 2 === 0 ? 10 : -10, 0],
                      }}
                      transition={{
                        duration: 4 + index * 0.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    >
                      {/* Bottle */}
                      <div
                        className={`p-4 rounded-2xl cursor-pointer transition-all ${
                          selectedWish?.id === wish.id
                            ? 'ring-2 ring-yellow-400'
                            : 'hover:scale-105'
                        }`}
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(10px)',
                        }}
                      >
                        <div className="text-4xl text-center mb-2">🍾</div>
                        <p className="text-white text-xs text-center line-clamp-2">
                          {wish.content}
                        </p>
                        {wish.emoji_hint && (
                          <div className="text-center mt-1">
                            <span className="text-sm">{wish.emoji_hint}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected wish detail */}
            <AnimatePresence>
              {selectedWish && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  className="mt-6 p-4 rounded-2xl backdrop-blur-md"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    border: `1px solid ${ECHO_COLORS.beach.lightString.bulb}40`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Heart className="text-red-400 mt-1" size={20} />
                    <div className="flex-1">
                      <p className="text-white font-medium mb-1">
                        {selectedWish.content}
                      </p>
                      {selectedWish.emoji_hint && (
                        <span className="text-2xl">{selectedWish.emoji_hint}</span>
                      )}
                    </div>
                  </div>

                  {/* Catch button */}
                  <motion.button
                    onClick={handleCatch}
                    disabled={catching}
                    className="w-full mt-4 py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: ECHO_COLORS.beach.lightString.bulb,
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    animate={
                      catching
                        ? { opacity: [0.7, 1, 0.7] }
                        : {}
                    }
                    transition={
                      catching
                        ? { duration: 1, repeat: Infinity }
                        : {}
                    }
                  >
                    {catching ? (
                      <>接住中...</>
                    ) : (
                      <>我已接住</>
                    )}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Cancel button */}
            {!selectedWish && (
              <motion.button
                onClick={onClose}
                className="w-full mt-6 py-3 rounded-xl font-medium text-white/70 hover:bg-white/5 transition-colors"
              >
                关闭
              </motion.button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
