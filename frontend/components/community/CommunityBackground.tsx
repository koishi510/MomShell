'use client';

// frontend/components/community/CommunityBackground.tsx
/**
 * 社区页面背景
 * 静态渐变背景，避免持续动画造成性能问题
 */

import { MESH_COLORS } from '../../lib/design-tokens';

export default function CommunityBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* 基础渐变层 */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${MESH_COLORS.warmWhite} 0%, #FFFBF7 50%, #F8FFF8 100%)`,
        }}
      />

      {/* 静态色块 1 - 奶油色 */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-[80px] opacity-25"
        style={{
          background: `radial-gradient(circle, ${MESH_COLORS.cream} 0%, transparent 70%)`,
          top: '-10%',
          left: '-5%',
        }}
      />

      {/* 静态色块 2 - 柔粉色 */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full blur-[60px] opacity-20"
        style={{
          background: `radial-gradient(circle, ${MESH_COLORS.softPink} 0%, transparent 70%)`,
          top: '40%',
          right: '-5%',
        }}
      />

      {/* 静态色块 3 - 薄荷绿 */}
      <div
        className="absolute w-[350px] h-[350px] rounded-full blur-[50px] opacity-15"
        style={{
          background: `radial-gradient(circle, ${MESH_COLORS.mintGreen} 0%, transparent 70%)`,
          bottom: '0%',
          left: '30%',
        }}
      />

      {/* 轻微的噪点纹理层 */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
