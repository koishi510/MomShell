// components/echo/partner/CelebrationAnimation.tsx
/**
 * CelebrationAnimation - Shell washing and opening animation
 *
 * Animation sequence:
 * 1. Water splash effect
 * 2. Shell cleans up (muddy → clean)
 * 3. Shell opens
 * 4. Sticker/photo revealed
 * 5. Photo rises to light string
 * 6. Celebration particles
 */

'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Droplets } from 'lucide-react';
import { ECHO_COLORS } from '../../../lib/design-tokens';

// Pre-computed particle animation patterns (deterministic)
const PARTICLE_PATTERNS = [
  { x: 0, y: -150 }, { x: 100, y: -120 }, { x: -100, y: -120 },
  { x: 140, y: -70 }, { x: -140, y: -70 }, { x: 70, y: -140 },
  { x: -70, y: -140 }, { x: 0, y: -170 }, { x: 150, y: -30 },
  { x: -150, y: -30 }, { x: 120, y: -100 }, { x: -120, y: -100 },
  { x: 50, y: -160 }, { x: -50, y: -160 }, { x: 0, y: -130 },
];

interface CelebrationAnimationProps {
  isOpen: boolean;
  stickerUrl: string;
  message: string;
  onComplete?: () => void;
  isEchoFragment?: boolean;
}

export function CelebrationAnimation({
  isOpen,
  stickerUrl,
  message,
  onComplete,
  isEchoFragment = false,
}: CelebrationAnimationProps) {
  const [stage, setStage] = useState<'washing' | 'opening' | 'revealed' | 'complete'>('washing');

  // Build particle animations from pre-computed patterns
  const particleAnimations = useMemo(() => {
    return PARTICLE_PATTERNS.map(pattern => ({
      x: [0, pattern.x],
      y: [0, pattern.y],
    }));
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Reset stage when opening (deferred to avoid sync setState)
      const resetTimer = setTimeout(() => setStage('washing'), 0);
      // Washing stage (2s)
      const washingTimer = setTimeout(() => setStage('opening'), 2000);
      // Opening stage (1s)
      const openingTimer = setTimeout(() => setStage('revealed'), 3000);
      // Complete stage
      const completeTimer = setTimeout(() => {
        setStage('complete');
        onComplete?.();
      }, 5000);

      return () => {
        clearTimeout(resetTimer);
        clearTimeout(washingTimer);
        clearTimeout(openingTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [isOpen, onComplete]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: `radial-gradient(circle at center, ${ECHO_COLORS.beach.sand} 0%, ${ECHO_COLORS.beach.skyBottom} 100%)`,
          }}
        >
          {/* Water splash effect (washing stage) */}
          <AnimatePresence>
            {stage === 'washing' && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 2, opacity: 0 }}
                transition={{ duration: 2 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute"
                    style={{
                      width: 20,
                      height: 20,
                      backgroundColor: '#4FC3F7',
                      borderRadius: '50%',
                    }}
                    animate={{
                      x: [0, Math.cos((i / 8) * Math.PI * 2) * 200],
                      y: [0, Math.sin((i / 8) * Math.PI * 2) * 200],
                      opacity: [1, 0],
                    }}
                    transition={{ duration: 2, ease: 'easeOut' }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Shell */}
          <motion.div
            className="relative z-10"
            animate={{
              scale: stage === 'opening' ? [1, 1.2, 1] : 1,
              rotate: stage === 'opening' ? [0, 5, -5, 0] : 0,
            }}
            transition={{ duration: 1 }}
          >
            {/* Shell halves */}
            <div className="relative w-32 h-32">
              {/* Left half */}
              <motion.div
                className="absolute top-0 left-0 w-16 h-16 rounded-tl-full"
                style={{
                  backgroundColor: ECHO_COLORS.beach.shell.washed,
                  boxShadow: `0 0 20px ${ECHO_COLORS.beach.shell.washedGlow}`,
                }}
                animate={
                  stage === 'opening'
                    ? {
                        rotate: [0, -30],
                        x: [0, -5],
                      }
                    : {}
                }
                transition={{ duration: 0.5 }}
              />

              {/* Right half */}
              <motion.div
                className="absolute top-0 right-0 w-16 h-16 rounded-tr-full"
                style={{
                  backgroundColor: ECHO_COLORS.beach.shell.washed,
                  boxShadow: `0 0 20px ${ECHO_COLORS.beach.shell.washedGlow}`,
                }}
                animate={
                  stage === 'opening'
                    ? {
                        rotate: [0, 30],
                        x: [0, 5],
                      }
                    : {}
                }
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>

          {/* Reveal sticker */}
          <AnimatePresence>
            {(stage === 'revealed' || stage === 'complete') && (
              <motion.div
                initial={{ scale: 0, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0, opacity: 0, y: -100 }}
                transition={{ type: 'spring', damping: 15 }}
                className="absolute z-20"
              >
                <div
                  className="relative rounded-2xl overflow-hidden shadow-2xl"
                  style={{
                    width: 200,
                    height: 200,
                    border: isEchoFragment
                      ? `3px solid silver`
                      : `3px solid ${ECHO_COLORS.beach.lightString.bulb}`,
                  }}
                >
                  {/* Sticker image */}
                  <img
                    src={stickerUrl}
                    alt="Revealed memory"
                    className="w-full h-full object-cover"
                  />

                  {/* Echo fragment badge */}
                  {isEchoFragment && (
                    <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg">
                      <Sparkles size={16} color="white" />
                    </div>
                  )}

                  {/* Glow effect */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at center, transparent 40%, ${ECHO_COLORS.beach.lightString.glow} 100%)`,
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Message */}
          <AnimatePresence>
            {stage === 'complete' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-20 left-4 right-4 text-center"
              >
                <motion.div
                  className="inline-block px-6 py-3 rounded-2xl backdrop-blur-md"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    border: `1px solid ${ECHO_COLORS.beach.lightString.bulb}40`,
                  }}
                >
                  <p className="text-white font-medium">{message}</p>
                  {isEchoFragment && (
                    <p className="text-sm text-white/60 mt-1">独自守护勋章</p>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Celebration particles */}
          <AnimatePresence>
            {stage === 'revealed' && (
              <div className="absolute inset-0 pointer-events-none">
                {particleAnimations.map((anim, i) => (
                  <motion.div
                    key={i}
                    className="absolute"
                    style={{
                      width: 8,
                      height: 8,
                      backgroundColor: ECHO_COLORS.beach.lightString.bulb,
                      borderRadius: '50%',
                      left: '50%',
                      top: '50%',
                    }}
                    animate={{
                      x: anim.x,
                      y: anim.y,
                      opacity: [1, 0],
                      scale: [1, 0],
                    }}
                    transition={{
                      duration: 1.5,
                      delay: i * 0.05,
                      ease: 'easeOut',
                    }}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>

          {/* Loading indicator (washing stage) */}
          {stage === 'washing' && (
            <div className="absolute bottom-20 left-0 right-0 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
              >
                <Droplets className="text-blue-400" size={16} />
                <span className="text-white text-sm">正在洗涤...</span>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
