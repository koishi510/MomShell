import type { LayerConfig } from '@/types/scene'

export const LAYERS: Record<string, LayerConfig> = {
  sky:            { speed: 0.05, zIndex: 1,  width: '300vw' },
  clouds:         { speed: 0.15, zIndex: 5,  width: '400vw', top: '0', height: '45%' },
  seagulls:       { speed: 0.18, zIndex: 7,  width: '400vw', top: '0', height: '40%' },
  sun:            { speed: 0.08, zIndex: 6,  width: '300vw' },
  ocean:          { speed: 0.3,  zIndex: 10, width: '400vw', top: '33%', height: '67%' },
  sunReflection:  { speed: 0.08, zIndex: 11, width: '300vw', top: '33%', height: '67%' },
  waveFar:        { speed: 0.32, zIndex: 24, width: '400vw', top: '33%', height: '18%' },
  waveMid:        { speed: 0.35, zIndex: 26, width: '400vw', top: '35%', height: '16%' },
  waveNear:       { speed: 0.48, zIndex: 28, width: '400vw', top: '36%', height: '16%' },
  sand:           { speed: 0.55, zIndex: 20, width: '400vw' },
  sprites:        { speed: 0.55, zIndex: 22, width: '400vw' },
}

export const PARALLAX_EASE = 0.14
export const SCROLL_SPEED = 24
