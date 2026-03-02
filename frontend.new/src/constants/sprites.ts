export interface SpriteData {
  id: string
  src: string
  left: string
  top: string
  width: string
  rotate?: number
  scaleX?: number
  scaleY?: number
}

import carImg from '@/assets/car.png'
import barImg from '@/assets/bar.png'
import stoneImg from '@/assets/stone.png'
import crabImg from '@/assets/crab.png'
import shellImg from '@/assets/shell.png'

export const SPRITES: SpriteData[] = [

  { id: 'car',   src: carImg,   left: '38%', top: '9%', width: '48vw' },

  { id: 'bar', src: barImg, left: '18%', top: '6.5%', width: '44vw' },

  { id: 'stone', src: stoneImg, left: '75%', top: '0.5%',  width: '20vw' },

  { id: 'crab',  src: crabImg,  left: '60%', top: '12%', width: '6vw' },

  { id: 'shell1', src: shellImg, left: '48%', top: '45%', width: '6vw',   rotate: 15 },
  { id: 'shell2', src: shellImg, left: '56%', top: '60%', width: '5.5vw', rotate: -10, scaleX: -1 },
  { id: 'shell3', src: shellImg, left: '50%', top: '75%', width: '5vw',   rotate: 45,  scaleY: 1 },
  { id: 'shell4', src: shellImg, left: '52.5%', top: '48%', width: '5.2vw', rotate: 30, scaleX: -1, scaleY: -1 },

]
