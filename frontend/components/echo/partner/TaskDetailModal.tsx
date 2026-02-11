// components/echo/partner/TaskDetailModal.tsx
/**
 * TaskDetailModal - Modal for viewing task details with confirmation slider
 *
 * Features:
 * - Shows task title and description
 * - Slider to confirm completion
 * - Task difficulty and points display
 * - Wash button
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Check } from 'lucide-react';
import { ECHO_COLORS } from '../../../lib/design-tokens';
import type { TaskShell as TaskShellType } from '../../../types/echo';

interface TaskDetailModalProps {
  shell: TaskShellType;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  confirming?: boolean;
}

export function TaskDetailModal({
  shell,
  isOpen,
  onClose,
  onConfirm,
  confirming = false,
}: TaskDetailModalProps) {
  const [sliderValue, setSliderValue] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Guard clause - don't render if shell is null
  if (!shell) {
    return null;
  }

  const title = shell.custom_title || shell.template_title || '未知任务';
  const description =
    shell.custom_description ||
    shell.template_description ||
    '完成这个任务来守护她';
  const points = shell.template_points || 10;
  const difficulty = shell.template_difficulty || 'easy';

  const difficultyColor = {
    easy: 'bg-green-500/30 text-green-200',
    medium: 'bg-yellow-500/30 text-yellow-200',
    hard: 'bg-red-500/30 text-red-200',
  }[difficulty] || 'bg-gray-500/30 text-gray-200';

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setSliderValue(value);

    if (value >= 95 && !confirming) {
      onConfirm().then(() => {
        setSliderValue(0);
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-full max-w-md rounded-3xl overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${ECHO_COLORS.beach.sand} 0%, ${ECHO_COLORS.beach.sandWet} 100%)`,
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2
                className="text-lg font-bold"
                style={{ color: ECHO_COLORS.beach.lightString.bulb }}
              >
                任务详情
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                style={{ color: 'white' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Task info */}
              <div className="mb-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold text-white">{title}</h3>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${difficultyColor}`}
                  >
                    +{points} 分
                  </span>
                </div>
                <p className="text-white/70 text-sm leading-relaxed">
                  {description}
                </p>
              </div>

              {/* Wish indicator (if from wish) */}
              {shell.shell_type === 'golden_conch' && (
                <div
                  className="mb-6 p-3 rounded-xl flex items-center gap-2"
                  style={{
                    backgroundColor: `${ECHO_COLORS.beach.shell.golden}20`,
                    border: `1px solid ${ECHO_COLORS.beach.shell.golden}40`,
                  }}
                >
                  <span className="text-2xl">💝</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: ECHO_COLORS.beach.shell.golden }}>
                      来自她的心愿
                    </p>
                    <p className="text-xs text-white/60">完成这个心愿来守护她</p>
                  </div>
                </div>
              )}

              {/* Memory pool indicator */}
              {shell.bound_memoir_id && (
                <div
                  className="mb-6 p-3 rounded-xl flex items-center gap-2"
                  style={{
                    backgroundColor: `${ECHO_COLORS.beach.lightString.bulb}20`,
                    border: `1px solid ${ECHO_COLORS.beach.lightString.bulb}40`,
                  }}
                >
                  <Sparkles size={16} style={{ color: ECHO_COLORS.beach.lightString.bulb }} />
                  <p className="text-sm text-white/80">
                    洗净这个贝壳，解锁一段美好回忆
                  </p>
                </div>
              )}

              {/* Confirmation slider */}
              <div className="mt-8">
                <label className="block text-sm font-medium text-white/80 mb-3">
                  {confirming ? '正在确认...' : '滑动确认完成'}
                </label>
                <div className="relative h-12 rounded-full overflow-hidden bg-white/10">
                  {/* Slider track */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-100"
                    style={{
                      width: `${sliderValue}%`,
                      background: `linear-gradient(90deg, ${ECHO_COLORS.beach.lightString.bulb} 0%, #FFA500 100%)`,
                    }}
                  />

                  {/* Slider icon */}
                  <motion.div
                    className="absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                    style={{
                      left: `${sliderValue}%`,
                      backgroundColor: sliderValue >= 95 ? '#4CAF50' : 'white',
                      transform: 'translate(-50%, -50%)',
                    }}
                    animate={{
                      scale: isDragging ? 1.1 : 1,
                    }}
                  >
                    {sliderValue >= 95 ? (
                      <Check size={20} color="white" />
                    ) : (
                      <Sparkles size={20} color={sliderValue > 50 ? '#FFD700' : '#666'} />
                    )}
                  </motion.div>

                  {/* Hidden input */}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderValue}
                    onChange={handleSliderChange}
                    onMouseDown={() => setIsDragging(true)}
                    onMouseUp={() => setIsDragging(false)}
                    onTouchStart={() => setIsDragging(true)}
                    onTouchEnd={() => setIsDragging(false)}
                    disabled={confirming}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />

                  {/* Helper text */}
                  {sliderValue < 50 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-sm text-white/40">→ 滑动确认</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10">
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl font-medium text-white/70 hover:bg-white/5 transition-colors"
                disabled={confirming}
              >
                取消
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
