export interface SpriteData {
  id: string
  src: string
  left: string
  top: string
  width: string
  rotate?: number
}

import carImg from '@/assets/car.png'
import barImg from '@/assets/bar.png'
import stoneImg from '@/assets/stone.png'
import crabImg from '@/assets/crab.png'
import shellImg from '@/assets/shell.png'

export const SPRITES: SpriteData[] = [
  // car: 往右移一点 50→54%，大小翻倍 18→36vw
  { id: 'car',   src: carImg,   left: '38%', top: '10%', width: '45vw' },
  // bar: 往右移一点 18→24%，大小翻倍 22→44vw
  { id: 'bar', src: barImg, left: '24%', top: '28%', width: '44vw' },
  // stone: 往左移一点 80→72%
  { id: 'stone', src: stoneImg, left: '72%', top: '5%',  width: '14vw' },
  // crab: 放在 car 左边，位置再往下一点点
  { id: 'crab',  src: crabImg,  left: '60%', top: '12%', width: '6vw' },

  // --- car 周围的贝壳 ---
  { id: 'shell-0',  src: shellImg, left: '50%', top: '25%', width: '4vw',   rotate: 0 },
  { id: 'shell-1',  src: shellImg, left: '48.5%', top: '43%', width: '4vw',   rotate: -7.5 },
  { id: 'shell-2',  src: shellImg, left: '49.6%', top: '70%', width: '4vw',   rotate: 30 },
  { id: 'shell-3',  src: shellImg, left: '55%', top: '25%', width: '3.5vw', rotate: 20 },
  { id: 'shell-4',  src: shellImg, left: '60%', top: '35%', width: '4.5vw', rotate: -30 },
  { id: 'shell-5',  src: shellImg, left: '65%', top: '35%', width: '3.8vw', rotate: 45 },
  { id: 'shell-6',  src: shellImg, left: '70%', top: '40%', width: '4.2vw', rotate: 10 },
  { id: 'shell-7',  src: shellImg, left: '75%', top: '45%', width: '3.5vw', rotate: -25 },

  // --- car 周围新增贝壳 ---
  { id: 'shell-6',  src: shellImg, left: '58%', top: '45%', width: '3.8vw', rotate: 35 },
  { id: 'shell-7',  src: shellImg, left: '68%', top: '38%', width: '4vw',   rotate: -10 },
  { id: 'shell-8',  src: shellImg, left: '53%', top: '60%', width: '4.3vw', rotate: 50 },

  // --- bar 旁边的贝壳 ---
  { id: 'shell-9',  src: shellImg, left: '22%', top: '32%', width: '4vw',   rotate: 15 },
  { id: 'shell-10', src: shellImg, left: '30%', top: '45%', width: '3.5vw', rotate: -40 },
  { id: 'shell-11', src: shellImg, left: '26%', top: '55%', width: '4.2vw', rotate: 25 },
]
