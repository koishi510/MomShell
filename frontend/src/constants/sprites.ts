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
import communityImg from '@/assets/community.png'

export const SPRITES: SpriteData[] = [

  { id: 'car',   src: carImg,   left: '38%', top: '-2.5%', width: '50vw' },

  { id: 'bar', src: barImg, left: '18%', top: '-15%', width: '60vw' },

  { id: 'stone', src: stoneImg, left: '68%', top: '-10%',  width: '30vw' },

  { id: 'crab',  src: crabImg,  left: '60%', top: '12%', width: '6vw' },

  { id: 'shell1', src: shellImg, left: '48%', top: '45%', width: '6vw',   rotate: 15 },
  { id: 'shell3', src: shellImg, left: '50%', top: '75%', width: '5vw',   rotate: 45,  scaleY: 1 },
  { id: 'shell4', src: shellImg, left: '52.5%', top: '48%', width: '5.2vw', rotate: 30, scaleX: -1, scaleY: -1 },

  { id: 'community', src: communityImg, left: '54%', top: '15%', width: '45vw' },

]
