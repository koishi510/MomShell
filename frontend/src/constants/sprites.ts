export interface SpriteData {
  id: string
  src: string
  left: string
  top: string
  width: string
  rotate?: number
  scaleX?: number
  scaleY?: number
  zIndex?: number
  label?: string
  labelSize?: string   // e.g. '1rem', '0.9rem'
  labelOffsetY?: string // e.g. '-20%', '4px'
}

import carImg from '@/assets/images/car.png'
import barImg from '@/assets/images/bar.png'
import stoneImg from '@/assets/images/stone.png'
import crabImg from '@/assets/images/crab.png'
import shellImg from '@/assets/images/shell.png'
import chairImg from '@/assets/images/chairs.png'
import mailboxImg from '@/assets/images/mailbox.png'

export const SPRITES: SpriteData[] = [

  { id: 'car',   src: carImg,   left: '40%', top: '-2.5%', width: '50vw', label: '个人中心', labelSize: '1.2rem', labelOffsetY: '-7%' },

  { id: 'bar', src: barImg, left: '24%', top: '-15%', width: '60vw', label: '智育社区', labelSize: '1.2rem', labelOffsetY: '-9%' },

  { id: 'stone', src: stoneImg, left: '68%', top: '20%',  width: '30vw', label: '智聊助手', labelSize: '1.2rem', labelOffsetY: '-18%' },

  { id: 'crab', src: crabImg, left: '55%', top: '12%', width: '6vw', zIndex: 10 },

  { id: 'shell', src: shellImg, left: '50.75%', top: '60%', width: '5vw', rotate: 0, zIndex: 10, label: '生成相片', labelSize: '1.2rem' },

  { id: 'chair', src: chairImg, left: '56%', top: '2.5%', width: '40vw', rotate: 0, label: '同频任务', labelSize: '1.2rem', labelOffsetY: '-6%' },

  { id: 'mailbox', src: mailboxImg, left: '51.5%', top: '22%', width: '12vw', rotate: 0, label: '心愿签', labelSize: '1.2rem' },

]
