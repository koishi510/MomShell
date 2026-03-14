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

import carImg from '@/assets/images/car.png'
import barImg from '@/assets/images/bar.png'
import stoneImg from '@/assets/images/stone.png'
import crabImg from '@/assets/images/crab.png'
import shellImg from '@/assets/images/shell.png'
import chairImg from '@/assets/images/chairs.png'
import mailboxImg from '@/assets/images/mailbox.png'

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
  },

  { id: 'shell', src: shellImg, left: '52.5%', top: '45%', width: '5vw', rotate: 0 },

  { id: 'chair', src: chairImg, left: '54.5%', top: '75%', width: '5vw', rotate: 0 },

  { id: 'mailbox', src: mailboxImg, left: '57%', top: '48%', width: '5vw', rotate: 0 },

]
