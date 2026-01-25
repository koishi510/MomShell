// frontend/components/coach/CoachBackground.tsx
/**
 * 康复教练页面背景组件
 * 使用静态模糊渐变 blob，暖粉与大地色调
 */

'use client';

// 颜色方案 (淡化版)
const COACH_COLORS = {
  pink: '#F5D8E0', // 基于 #e8a4b8 淡化
  mint: '#D4EBE0', // 基于 #8bc99b 淡化
  gold: '#FAF0D7', // 基于 #f5c869 淡化
  cream: '#FFF9F5', // 温暖奶白底色
};

export function CoachBackground() {
  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ backgroundColor: COACH_COLORS.cream }}
    >
      {/* 左上粉色 blob */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-[80px] opacity-30"
        style={{
          background: `radial-gradient(circle, ${COACH_COLORS.pink} 0%, transparent 70%)`,
          top: '-10%',
          left: '-5%',
        }}
      />

      {/* 右下薄荷绿 blob */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full blur-[60px] opacity-25"
        style={{
          background: `radial-gradient(circle, ${COACH_COLORS.mint} 0%, transparent 70%)`,
          bottom: '-5%',
          right: '-5%',
        }}
      />

      {/* 中央金色 blob */}
      <div
        className="absolute w-[300px] h-[300px] rounded-full blur-[50px] opacity-20"
        style={{
          background: `radial-gradient(circle, ${COACH_COLORS.gold} 0%, transparent 70%)`,
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
    </div>
  );
}
