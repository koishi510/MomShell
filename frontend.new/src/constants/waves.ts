import type { WavefrontConfig, WaveLayerVariant } from '@/types/scene'

export const WAVE_FAR_CONFIG: WavefrontConfig = {
  rows: 2, cycle: 34, segs: 12,
  phaseSpread: 5, phaseSeed: 0.7,
  vertSpread: 6,
  startTop: 55,
  hMin: 6, hVar: 6,
  r: 170, g: 205, b: 215,
  alphaMin: 0.22, alphaVar: 0.18,
  blur: 2, anims: ['advanceFarS', 'advanceFarM', 'advanceFarL'],
}

export const WAVE_MID_CONFIG: WavefrontConfig = {
  rows: 2, cycle: 26, segs: 14,
  phaseSpread: 4.5, phaseSeed: 2.1,
  vertSpread: 7,
  startTop: 65,
  hMin: 8, hVar: 7,
  r: 155, g: 198, b: 210,
  alphaMin: 0.28, alphaVar: 0.22,
  blur: 1.2, anims: ['advanceMidS', 'advanceMidM', 'advanceMidL'],
}

export const WAVE_NEAR_CONFIG: WavefrontConfig = {
  rows: 2, cycle: 20, segs: 16,
  phaseSpread: 4, phaseSeed: 4.3,
  vertSpread: 8,
  startTop: 72,
  hMin: 10, hVar: 8,
  r: 185, g: 220, b: 230,
  alphaMin: 0.35, alphaVar: 0.28,
  blur: 0.6, anims: ['advanceNearS', 'advanceNearM', 'advanceNearL'],
}

export const WAVE_LAYERS: WaveLayerVariant[] = [
  {
    className: 'wave-layer-far',
    speed: 0.32,
    filterId: 'watercolor-far',
    blurPx: 1.5,
    config: WAVE_FAR_CONFIG,
    showShoreWash: false,
  },
  {
    className: 'wave-layer-mid',
    speed: 0.35,
    filterId: 'watercolor-mid',
    blurPx: 0.8,
    config: WAVE_MID_CONFIG,
    showShoreWash: false,
  },
  {
    className: 'wave-layer-near',
    speed: 0.48,
    filterId: 'watercolor-near',
    blurPx: 0.3,
    config: WAVE_NEAR_CONFIG,
    showShoreWash: true,
  },
]
