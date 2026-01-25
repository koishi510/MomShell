// frontend/components/coach/PoseOverlay.tsx
/**
 * 姿态骨骼覆盖层组件
 * 在视频上绘制平滑的骨骼关键点和连接线
 * 支持颜色编码反馈和高亮特定身体部位
 */

'use client';

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useMemo } from 'react';

// MediaPipe 33 landmarks 连接关系
const POSE_CONNECTIONS: [number, number][] = [
  // 面部
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  // 躯干
  [11, 12],
  // 左臂
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  // 右臂
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  // 躯干到腿
  [11, 23], [12, 24], [23, 24],
  // 左腿
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  // 右腿
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
];

// 身体部位分组（用于高亮）
const BODY_PARTS = {
  face: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  torso: [11, 12, 23, 24],
  leftArm: [11, 13, 15, 17, 19, 21],
  rightArm: [12, 14, 16, 18, 20, 22],
  leftLeg: [23, 25, 27, 29, 31],
  rightLeg: [24, 26, 28, 30, 32],
  core: [11, 12, 23, 24], // 核心区域
  pelvis: [23, 24, 25, 26], // 骨盆区域
};

// 骨骼颜色映射
const SKELETON_COLORS: Record<string, string> = {
  green: '#8bc99b',
  yellow: '#f5c869',
  red: '#e67e7e',
  white: '#ffffff',
  pink: '#e8a4b8',
  blue: '#7eb8da',
};

// 关键点类型
export interface Keypoint {
  x: number;
  y: number;
  visibility: number;
}

export interface PoseOverlayProps {
  width?: number;
  height?: number;
  smoothingFactor?: number;
  glowEnabled?: boolean;
  highlightParts?: (keyof typeof BODY_PARTS)[];
  highlightColor?: string;
}

export interface PoseOverlayHandle {
  drawSkeleton: (
    keypoints: Record<string, Keypoint>,
    color?: keyof typeof SKELETON_COLORS
  ) => void;
  clear: () => void;
  getCanvas: () => HTMLCanvasElement | null;
}

export const PoseOverlay = forwardRef<PoseOverlayHandle, PoseOverlayProps>(
  function PoseOverlay(
    {
      width = 480,
      height = 360,
      smoothingFactor = 0.25,
      glowEnabled = true,
      highlightParts = [],
      highlightColor = 'pink',
    },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const prevKeypointsRef = useRef<Record<string, Keypoint> | null>(null);

    // 获取高亮的关键点索引集合（使用 useMemo 避免每次渲染创建新对象）
    const highlightedIndices = useMemo(
      () => new Set(highlightParts.flatMap((part) => BODY_PARTS[part] || [])),
      [highlightParts]
    );

    // 平滑关键点
    const smoothKeypoints = useCallback(
      (keypoints: Record<string, Keypoint>): Record<string, Keypoint> => {
        if (!prevKeypointsRef.current) {
          prevKeypointsRef.current = keypoints;
          return keypoints;
        }

        const smoothed: Record<string, Keypoint> = {};
        for (const [idx, point] of Object.entries(keypoints)) {
          const prevPoint = prevKeypointsRef.current[idx];
          if (prevPoint && prevPoint.visibility > 0.3) {
            smoothed[idx] = {
              x: point.x * (1 - smoothingFactor) + prevPoint.x * smoothingFactor,
              y: point.y * (1 - smoothingFactor) + prevPoint.y * smoothingFactor,
              visibility: point.visibility,
            };
          } else {
            smoothed[idx] = point;
          }
        }
        prevKeypointsRef.current = smoothed;
        return smoothed;
      },
      [smoothingFactor]
    );

    // 绘制骨骼
    const drawSkeleton = useCallback(
      (
        keypoints: Record<string, Keypoint>,
        color: keyof typeof SKELETON_COLORS = 'white'
      ) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 设置画布尺寸
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 平滑关键点
        const smoothed = smoothKeypoints(keypoints);
        const strokeColor = SKELETON_COLORS[color] || SKELETON_COLORS.white;
        const highlightStrokeColor = SKELETON_COLORS[highlightColor] || SKELETON_COLORS.pink;

        // 绘制光晕效果
        if (glowEnabled) {
          ctx.shadowColor = strokeColor;
          ctx.shadowBlur = 8;
        }

        // 绘制连接线
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
          const start = smoothed[startIdx.toString()];
          const end = smoothed[endIdx.toString()];

          if (start && end && start.visibility > 0.5 && end.visibility > 0.5) {
            const isHighlighted =
              highlightedIndices.has(startIdx) && highlightedIndices.has(endIdx);

            ctx.beginPath();
            ctx.strokeStyle = isHighlighted ? highlightStrokeColor : strokeColor;
            ctx.lineWidth = isHighlighted ? 4 : 3;

            if (glowEnabled && isHighlighted) {
              ctx.shadowColor = highlightStrokeColor;
              ctx.shadowBlur = 12;
            }

            ctx.moveTo(start.x * width, start.y * height);
            ctx.lineTo(end.x * width, end.y * height);
            ctx.stroke();

            if (glowEnabled) {
              ctx.shadowBlur = 8;
              ctx.shadowColor = strokeColor;
            }
          }
        }

        // 绘制关键点
        for (const [idx, point] of Object.entries(smoothed)) {
          if (point.visibility > 0.5) {
            const x = point.x * width;
            const y = point.y * height;
            const isHighlighted = highlightedIndices.has(parseInt(idx));
            const pointColor = isHighlighted ? highlightStrokeColor : strokeColor;

            // 外圈（白色描边）
            ctx.beginPath();
            ctx.arc(x, y, isHighlighted ? 7 : 6, 0, 2 * Math.PI);
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 内圈（填充）
            ctx.beginPath();
            ctx.arc(x, y, isHighlighted ? 5 : 4, 0, 2 * Math.PI);
            ctx.fillStyle = pointColor;
            ctx.fill();

            // 高亮点的额外光晕
            if (isHighlighted && glowEnabled) {
              ctx.beginPath();
              ctx.arc(x, y, 10, 0, 2 * Math.PI);
              ctx.fillStyle = `${highlightStrokeColor}40`;
              ctx.fill();
            }
          }
        }

        // 重置阴影
        ctx.shadowBlur = 0;
      },
      [width, height, smoothKeypoints, glowEnabled, highlightedIndices, highlightColor]
    );

    // 清除画布
    const clear = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      prevKeypointsRef.current = null;
    }, []);

    // 暴露方法给父组件
    useImperativeHandle(
      ref,
      () => ({
        drawSkeleton,
        clear,
        getCanvas: () => canvasRef.current,
      }),
      [drawSkeleton, clear]
    );

    // 组件卸载时清理
    useEffect(() => {
      return () => {
        prevKeypointsRef.current = null;
      };
    }, []);

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ imageRendering: 'crisp-edges' }}
      />
    );
  }
);

// 用于显示姿态提示的辅助组件
interface PoseGuideProps {
  currentPhase: string;
  targetPose?: string;
  showGuide?: boolean;
}

export function PoseGuide({ currentPhase, targetPose, showGuide = true }: PoseGuideProps) {
  if (!showGuide || !targetPose) return null;

  return (
    <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-xl p-3 text-white text-sm">
      <div className="flex items-center gap-2">
        <span className="text-[#e8a4b8]">当前阶段:</span>
        <span className="font-medium">{currentPhase}</span>
      </div>
      {targetPose && (
        <div className="text-stone-300 text-xs mt-1">
          目标姿态: {targetPose}
        </div>
      )}
    </div>
  );
}

// 姿态质量指示器
interface PoseQualityIndicatorProps {
  score: number | null;
  size?: 'sm' | 'md' | 'lg';
}

export function PoseQualityIndicator({ score, size = 'md' }: PoseQualityIndicatorProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
  };

  const getColor = (s: number | null) => {
    if (s === null) return 'bg-stone-500';
    if (s >= 80) return 'bg-emerald-500';
    if (s >= 60) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getGlow = (s: number | null) => {
    if (s === null) return '';
    if (s >= 80) return 'shadow-emerald-500/50 shadow-lg';
    if (s >= 60) return 'shadow-amber-500/50 shadow-lg';
    return 'shadow-rose-500/50 shadow-lg';
  };

  return (
    <div
      className={`
        ${sizeClasses[size]} ${getColor(score)} ${getGlow(score)}
        rounded-full flex items-center justify-center text-white font-bold
        transition-all duration-300
      `}
    >
      {score ?? '--'}
    </div>
  );
}
