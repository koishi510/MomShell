/* Scene type definitions */
import type { CSSProperties } from 'vue'

export interface LayerConfig {
  speed: number
  zIndex: number
  width: string
  top?: string
  height?: string
}

export interface CloudData {
  x: number
  y: number
  w: number
  h: number
  bright: boolean
}

export interface SeagullData {
  x: number
  y: number
  s: number
  c: string
  fd: number
  wd: number
}

export interface WispData {
  x: number
  y: number
  w: number
  h: number
  color: string
  blur: number
  behind?: boolean
}

export interface GlowBlockData {
  top: number
  h: number
  w: number
  alpha: number
  blur: number
  dur: number
}

export interface WavefrontConfig {
  rows: number
  cycle: number
  segs: number
  phaseSpread: number
  phaseSeed: number
  vertSpread: number
  startTop: number
  hMin: number
  hVar: number
  r: number
  g: number
  b: number
  alphaMin: number
  alphaVar: number
  blur: number
  anims: string[]
}

export interface WaveLayerVariant {
  className: string
  speed: number
  filterId: string
  blurPx: number
  config: WavefrontConfig
  showShoreWash: boolean
}

export type WavefrontStyle = CSSProperties
export type ShimmerStyle = CSSProperties
export type WaveLineStyle = CSSProperties
export type ReflectionStreakStyle = CSSProperties
export type ReflectionGlowStyle = CSSProperties
export type WaveParticleStyle = CSSProperties

export interface ParallaxState {
  targetOffset: number
  currentOffset: number
  maxOffset: number
}
