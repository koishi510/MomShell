// frontend/components/shell/Onboarding.tsx
/**
 * 新手指引组件 - 引导用户了解功能
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { SHELL_COLORS, SPRING_CONFIGS } from '../../lib/design-tokens';

interface OnboardingStep {
  title: string;
  description: string;
  emoji: string;
  highlight?: 'shell' | 'bottle' | 'conch' | 'tab';
}

interface OnboardingProps {
  mode: 'mom' | 'partner';
  onComplete: () => void;
}

const MOM_STEPS: OnboardingStep[] = [
  {
    title: '欢迎来到溯源之境',
    description: '这里是你的专属沙滩，每一枚贝壳都承载着你的回忆',
    emoji: '🏖️',
  },
  {
    title: '点击蒙尘的贝壳',
    description: '选择一段想要回忆的时光，我们会帮你生成专属贴纸',
    emoji: '🐚',
    highlight: 'shell',
  },
  {
    title: '发送心愿漂流瓶',
    description: '点击右侧漂流瓶，写下你的心愿，它会飘向你的伴侣',
    emoji: '🍾',
    highlight: 'bottle',
  },
  {
    title: '开始你的旅程',
    description: '在底部导航可以访问社区、AI对话和珍珠馆',
    emoji: '✨',
    highlight: 'tab',
  },
];

const PARTNER_STEPS: OnboardingStep[] = [
  {
    title: '欢迎来到守护之滨',
    description: '这里是你守护她的地方，每完成一个任务，就能解锁她的回忆',
    emoji: '🌙',
  },
  {
    title: '点击泥泞的贝壳',
    description: '完成贝壳中的任务，濯洗它让它重新发光',
    emoji: '🐚',
    highlight: 'shell',
  },
  {
    title: '接住她的心愿',
    description: '点击漂流瓶查看她的心愿，帮她实现吧',
    emoji: '🍾',
    highlight: 'bottle',
  },
  {
    title: '注入你的记忆',
    description: '点击海螺，写下想对她说的话，给她一个惊喜',
    emoji: '🐌',
    highlight: 'conch',
  },
  {
    title: '开始守护',
    description: '在底部导航可以访问社区、AI对话和珍珠馆',
    emoji: '✨',
    highlight: 'tab',
  },
];

const ONBOARDING_KEY_PREFIX = 'momshell_onboarding_';

export function Onboarding({ mode, onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const steps = mode === 'mom' ? MOM_STEPS : PARTNER_STEPS;
  const colors = mode === 'mom' ? SHELL_COLORS.mom : SHELL_COLORS.partner;
  const storageKey = `${ONBOARDING_KEY_PREFIX}${mode}`;

  useEffect(() => {
    // 检查是否已完成引导
    const completed = localStorage.getItem(storageKey);
    if (!completed) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => setIsVisible(true), 0);
    }
  }, [storageKey]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem(storageKey, 'true');
    setIsVisible(false);
    onComplete();
  };

  if (!isVisible) return null;

  const step = steps[currentStep];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* 背景遮罩 */}
        <motion.div
          className="absolute inset-0"
          style={{ background: `${colors.background}E8` }}
        />

        {/* 高亮区域指示器 */}
        {step.highlight && (
          <motion.div
            className="absolute"
            style={{
              ...(step.highlight === 'shell' && {
                top: '40%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }),
              ...(step.highlight === 'bottle' && {
                top: '50%',
                right: '5%',
              }),
              ...(step.highlight === 'conch' && {
                top: '60%',
                right: '5%',
              }),
              ...(step.highlight === 'tab' && {
                bottom: '80px',
                left: '50%',
                transform: 'translateX(-50%)',
              }),
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <div
              className="w-20 h-20 rounded-full"
              style={{
                background: `radial-gradient(circle, ${colors.accent}60 0%, transparent 70%)`,
              }}
            />
          </motion.div>
        )}

        {/* 引导卡片 */}
        <motion.div
          className="relative bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center"
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          transition={SPRING_CONFIGS.bouncy}
          key={currentStep}
        >
          {/* 表情 */}
          <motion.div
            className="text-6xl mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, ...SPRING_CONFIGS.bouncy }}
          >
            {step.emoji}
          </motion.div>

          {/* 标题 */}
          <motion.h2
            className="text-xl font-medium mb-3"
            style={{ color: colors.text }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {step.title}
          </motion.h2>

          {/* 描述 */}
          <motion.p
            className="text-sm text-gray-500 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {step.description}
          </motion.p>

          {/* 进度指示器 */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, index) => (
              <motion.div
                key={index}
                className="w-2 h-2 rounded-full"
                style={{
                  background: index === currentStep ? colors.accent : `${colors.text}30`,
                }}
                animate={{
                  scale: index === currentStep ? 1.2 : 1,
                }}
              />
            ))}
          </div>

          {/* 按钮 */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-sm text-gray-400"
            >
              跳过
            </button>

            <motion.button
              onClick={handleNext}
              className="px-8 py-3 rounded-full text-sm font-medium text-white"
              style={{
                background: `linear-gradient(135deg, ${colors.accent} 0%, ${mode === 'mom' ? '#FFA726' : '#5C6BC0'} 100%)`,
              }}
              whileTap={{ scale: 0.95 }}
            >
              {currentStep === steps.length - 1 ? '开始体验' : '下一步'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * 重置引导状态（用于测试）
 */
export function resetOnboarding(mode?: 'mom' | 'partner') {
  if (mode) {
    localStorage.removeItem(`${ONBOARDING_KEY_PREFIX}${mode}`);
  } else {
    localStorage.removeItem(`${ONBOARDING_KEY_PREFIX}mom`);
    localStorage.removeItem(`${ONBOARDING_KEY_PREFIX}partner`);
  }
}
