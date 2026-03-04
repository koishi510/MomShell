import type {
  ShimmerStyle,
  WaveLineStyle,
  ReflectionStreakStyle,
  ReflectionGlowStyle,
  WaveParticleStyle,
} from '@/types/scene'
import { GLOW_BLOCKS, REFLECTION_WIDTH_CURVE, REFLECTION_STREAK_COUNT } from '@/constants/reflections'

export function generateShimmers(count: number): ShimmerStyle[] {
  const items: ShimmerStyle[] = []
  for (let i = 0; i < count; i++) {
    items.push({
      top: `${10 + Math.random() * 80}%`,
      left: `${Math.random() * 100}%`,
      width: `${30 + Math.random() * 80}px`,
      animationDelay: `${Math.random() * 5}s`,
      animationDuration: `${3 + Math.random() * 4}s`,
    })
  }
  return items
}

export function generateWaveLines(count: number): WaveLineStyle[] {
  const items: WaveLineStyle[] = []
  for (let i = 0; i < count; i++) {
    items.push({
      top: `${5 + i * 8}%`,
      animationDelay: `${i * 0.5}s`,
      opacity: `${0.2 + Math.random() * 0.3}`,
    })
  }
  return items
}

export function generateReflectionGlows(): ReflectionGlowStyle[] {
  return GLOW_BLOCKS.map((b, i) => ({
    top: `${b.top}%`,
    width: `${b.w}px`,
    height: `${b.h}%`,
    background: `radial-gradient(ellipse, rgba(255,215,140,${b.alpha}) 0%, rgba(255,200,120,${(b.alpha * 0.5).toFixed(3)}) 40%, transparent 70%)`,
    filter: `blur(${b.blur}px)`,
    animation: `glowShimmer ${b.dur}s ease-in-out ${(i * 1.3).toFixed(1)}s infinite`,
    animationFillMode: 'backwards',
  }))
}

export function generateReflectionStreaks(): ReflectionStreakStyle[] {
  const items: ReflectionStreakStyle[] = []
  for (let i = 0; i < REFLECTION_STREAK_COUNT; i++) {
    const t = i / REFLECTION_STREAK_COUNT
    const ci = t * (REFLECTION_WIDTH_CURVE.length - 1)
    const lo = Math.floor(ci)
    const hi = Math.min(lo + 1, REFLECTION_WIDTH_CURVE.length - 1)
    const wFactor = REFLECTION_WIDTH_CURVE[lo] + (REFLECTION_WIDTH_CURVE[hi] - REFLECTION_WIDTH_CURVE[lo]) * (ci - lo)
    const w = 30 + wFactor * 27 + Math.random() * 20
    const h = 1.5 + t * 3.5 + Math.random() * 1.5
    const offsetX = (Math.random() - 0.5) * (8 + wFactor * 5)
    const brightness = 0.72 - t * 0.52
    const r = 255
    const g = 190 + Math.floor(Math.random() * 30)
    const b = 80 + Math.floor(Math.random() * 40)

    let animName: string
    let animDur: string
    let animDir: string

    if (t > 0.55) {
      animName = 'streakWaveStrong'
      animDur = (4 + Math.random() * 3).toFixed(1)
      animDir = 'normal'
    } else if (t > 0.3) {
      animName = 'streakWaveMid'
      animDur = (5 + Math.random() * 3).toFixed(1)
      animDir = 'normal'
    } else if (t > 0.12) {
      animName = 'streakWaveGentle'
      animDur = (6 + Math.random() * 3).toFixed(1)
      animDir = 'normal'
    } else {
      animName = 'streakCalm'
      animDur = (2.5 + Math.random() * 2.5).toFixed(1)
      animDir = 'alternate'
    }

    items.push({
      top: `${1 + t * 72}%`,
      marginLeft: `${offsetX}px`,
      width: `${w}px`,
      height: `${h}px`,
      background: `rgba(${r},${g},${b},${brightness.toFixed(2)})`,
      animation: `${animName} ${animDur}s ease-in-out infinite ${animDir}`,
      animationDelay: `${(Math.random() * 4).toFixed(1)}s`,
      animationFillMode: 'backwards',
    })
  }
  return items
}

export function generateWaveParticles(count: number, topMin: number, topMax: number): WaveParticleStyle[] {
  const items: WaveParticleStyle[] = []
  const colors = [
    (a: number) => `rgba(255,245,220,${a.toFixed(2)})`,
    (a: number) => `rgba(255,235,200,${a.toFixed(2)})`,
    (a: number) => `rgba(255,225,180,${a.toFixed(2)})`,
    (a: number) => `rgba(255,255,240,${a.toFixed(2)})`,
  ]
  const alphaRanges = [
    [0.3, 0.5],
    [0.25, 0.45],
    [0.2, 0.4],
    [0.35, 0.45],
  ]

  for (let i = 0; i < count; i++) {
    const size = 2 + Math.random() * 3
    const x = Math.random() * 100
    const y = topMin + Math.random() * (topMax - topMin)
    const dur = 3 + Math.random() * 5
    const delay = Math.random() * dur
    const ci = Math.floor(Math.random() * colors.length)
    const [aMin, aRange] = alphaRanges[ci]
    const alpha = aMin + Math.random() * aRange
    const color = colors[ci](alpha)

    items.push({
      left: `${x.toFixed(1)}%`,
      top: `${y.toFixed(1)}%`,
      width: `${size.toFixed(1)}px`,
      height: `${size.toFixed(1)}px`,
      background: `radial-gradient(circle,${color} 0%,transparent 70%)`,
      boxShadow: `0 0 ${(size * 1.5).toFixed(0)}px ${color}`,
      animation: `particleGlow ${dur.toFixed(1)}s ease-in-out ${delay.toFixed(1)}s infinite`,
    })
  }
  return items
}
