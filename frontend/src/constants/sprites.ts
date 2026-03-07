export interface SpriteData {
  id: string
  src: string
  left: string
  top: string
  width: string
  rotate?: number
  scaleX?: number
  scaleY?: number
  bubbleOffsetX?: string
  bubbleOffsetY?: string
}

import carImg from '@/assets/images/car.png'
import barImg from '@/assets/images/bar.png'
import stoneImg from '@/assets/images/stone.png'
import crabImg from '@/assets/images/crab.png'
import shellImg from '@/assets/images/shell.png'
import starImg from '@/assets/images/star.png'
import conqueImg from '@/assets/images/conque.png'

export const SPRITES: SpriteData[] = [

  { id: 'car',   src: carImg,   left: '38%', top: '-2.5%', width: '50vw' },

  { id: 'bar', src: barImg, left: '18%', top: '-15%', width: '60vw' },

  { id: 'stone', src: stoneImg, left: '68%', top: '-10%',  width: '30vw' },

  {
    id: 'crab',
    src: crabImg,
    left: '60%',
    top: '12%',
    width: '6vw',
    bubbleOffsetX: '-1vw',
    bubbleOffsetY: '-5.1rem',
  },

  { id: 'shell', src: shellImg, left: '48%', top: '45%', width: '5vw', rotate: 0 },

  { id: 'star', src: starImg, left: '50%', top: '75%', width: '5vw', rotate: 0 },

  { id: 'conque', src: conqueImg, left: '52.5%', top: '48%', width: '5vw', rotate: 0 },

]
