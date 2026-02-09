// frontend/components/shell/SandGrainTag.tsx
/**
 * 记忆砂砾标签组件 - 用于青春回忆页面
 */

'use client';

import { motion } from 'framer-motion';
import { SHELL_COLORS, SPRING_CONFIGS } from '../../lib/design-tokens';

interface SandGrainTagProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  variant?: 'preset' | 'custom';
  className?: string;
}

export function SandGrainTag({
  label,
  selected = false,
  onClick,
  variant = 'preset',
  className = '',
}: SandGrainTagProps) {
  return (
    <motion.button
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${className}`}
      style={{
        background: selected
          ? `linear-gradient(135deg, ${SHELL_COLORS.mom.accent} 0%, #FFA726 100%)`
          : 'rgba(255, 255, 255, 0.7)',
        color: selected ? 'white' : SHELL_COLORS.mom.text,
        border: variant === 'custom' ? '2px dashed rgba(93, 64, 55, 0.3)' : 'none',
        boxShadow: selected ? `0 4px 12px ${SHELL_COLORS.mom.shadow}` : 'none',
      }}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={SPRING_CONFIGS.gentle}
    >
      {/* 砂砾图标 */}
      <span className="text-xs" style={{ opacity: selected ? 1 : 0.6 }}>
        {variant === 'custom' ? '✨' : '🏖️'}
      </span>
      {label}
    </motion.button>
  );
}

interface SandGrainTagGroupProps {
  tags: string[];
  selectedTags: string[];
  onTagSelect: (tag: string) => void;
  allowCustom?: boolean;
  onAddCustom?: (tag: string) => void;
  className?: string;
}

export function SandGrainTagGroup({
  tags,
  selectedTags,
  onTagSelect,
  allowCustom = true,
  onAddCustom,
  className = '',
}: SandGrainTagGroupProps) {
  const [customInput, setCustomInput] = React.useState('');
  const [showInput, setShowInput] = React.useState(false);

  const handleAddCustom = () => {
    if (customInput.trim() && onAddCustom) {
      onAddCustom(customInput.trim());
      setCustomInput('');
      setShowInput(false);
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag) => (
        <SandGrainTag
          key={tag}
          label={tag}
          selected={selectedTags.includes(tag)}
          onClick={() => onTagSelect(tag)}
        />
      ))}

      {allowCustom && (
        <>
          {showInput ? (
            <motion.div
              className="flex items-center gap-2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                placeholder="自定义..."
                className="px-3 py-1.5 rounded-full text-sm border-2 focus:outline-none"
                style={{
                  borderColor: SHELL_COLORS.mom.accent,
                  color: SHELL_COLORS.mom.text,
                }}
                autoFocus
                maxLength={10}
              />
              <motion.button
                onClick={handleAddCustom}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                style={{ background: SHELL_COLORS.mom.accent }}
                whileTap={{ scale: 0.9 }}
              >
                ✓
              </motion.button>
              <motion.button
                onClick={() => {
                  setShowInput(false);
                  setCustomInput('');
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                style={{
                  background: 'rgba(0,0,0,0.1)',
                  color: SHELL_COLORS.mom.text,
                }}
                whileTap={{ scale: 0.9 }}
              >
                ✕
              </motion.button>
            </motion.div>
          ) : (
            <SandGrainTag
              label="添加..."
              variant="custom"
              onClick={() => setShowInput(true)}
            />
          )}
        </>
      )}
    </div>
  );
}

import React from 'react';
