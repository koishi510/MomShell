import type { WispData, GlowBlockData } from '@/types/scene'

export const WISP_DATA: WispData[] = [
  { x: 5,  y: 24,   w: 700,  h: 4.5, color: 'rgba(215, 135, 125, 0.55)', blur: 6 },
  { x: 22, y: 27,   w: 550,  h: 4,   color: 'rgba(220, 140, 130, 0.50)', blur: 5 },
  { x: 72, y: 25,   w: 580,  h: 4,   color: 'rgba(218, 138, 128, 0.48)', blur: 6 },
  { x: 85, y: 26,   w: 500,  h: 3.5, color: 'rgba(216, 136, 126, 0.45)', blur: 5.5 },
  { x: 0,  y: 28.5, w: 620,  h: 4,   color: 'rgba(222, 142, 132, 0.48)', blur: 7 },
  { x: 62, y: 29,   w: 450,  h: 3.5, color: 'rgba(212, 132, 122, 0.45)', blur: 6 },
  /* Through-sun wisps */
  { x: 41, y: 29,   w: 1000, h: 12,  color: 'linear-gradient(to right, transparent 0%, rgba(210, 120, 110, 0.80) 35%, rgba(195, 100, 95, 0.95) 50%, rgba(210, 120, 110, 0.80) 65%, transparent 100%)', blur: 5, behind: true },
  { x: 43, y: 30.5, w: 800,  h: 8,   color: 'linear-gradient(to right, transparent 0%, rgba(215, 128, 118, 0.65) 30%, rgba(205, 110, 105, 0.82) 50%, rgba(215, 128, 118, 0.65) 70%, transparent 100%)', blur: 4, behind: true },
]

export const GLOW_BLOCKS: GlowBlockData[] = [
  { top: 1,  h: 22, w: 160, alpha: 0.45, blur: 20, dur: 6   },
  { top: 12, h: 28, w: 240, alpha: 0.38, blur: 25, dur: 7.5 },
  { top: 30, h: 26, w: 300, alpha: 0.30, blur: 22, dur: 5.5 },
  { top: 48, h: 22, w: 250, alpha: 0.22, blur: 20, dur: 8   },
  { top: 62, h: 18, w: 180, alpha: 0.15, blur: 18, dur: 6.5 },
]

export const REFLECTION_WIDTH_CURVE = [9,8,7,6,5,3,3,5,4,7,2,4,4,6,3,3,3,5,4,2,2,3,3,5,6,6,7,7,8]
export const REFLECTION_STREAK_COUNT = 45
