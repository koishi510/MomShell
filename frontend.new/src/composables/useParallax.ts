import { ref, reactive, onMounted, onUnmounted, provide, type InjectionKey, type Ref } from 'vue'
import { PARALLAX_EASE, SCROLL_SPEED } from '@/constants/layers'
import { useAnimationLoop } from './useAnimationLoop'

export interface ParallaxContext {
  currentOffset: Ref<number>
  registerLayer: (el: HTMLElement, speed: number) => void
  startLoop: () => void
  hideHint: () => void
}

export const PARALLAX_KEY: InjectionKey<ParallaxContext> = Symbol('parallax')

export function useParallax() {
  const targetOffset = ref(0)
  const currentOffset = ref(0)
  const maxOffset = ref(0)
  const hintHidden = ref(false)

  const keys = reactive({ ArrowLeft: false, ArrowRight: false })
  let dragging = false

  interface LayerMeta {
    el: HTMLElement
    speed: number
    centerShift: number
  }
  const layerMeta: LayerMeta[] = []

  function recalcParallax() {
    const vw = window.innerWidth
    maxOffset.value = vw * 1.5
    layerMeta.forEach(m => {
      m.centerShift = -(m.el.offsetWidth - vw) / 2
    })
    targetOffset.value = Math.max(-maxOffset.value, Math.min(maxOffset.value, targetOffset.value))
    currentOffset.value = Math.max(-maxOffset.value, Math.min(maxOffset.value, currentOffset.value))
  }

  function applyParallax() {
    const offset = currentOffset.value
    layerMeta.forEach(m => {
      m.el.style.transform = `translateX(${m.centerShift - offset * m.speed}px)`
    })
  }

  const { start: startLoop } = useAnimationLoop((_dt: number) => {
    if (keys.ArrowLeft) targetOffset.value -= SCROLL_SPEED
    if (keys.ArrowRight) targetOffset.value += SCROLL_SPEED
    targetOffset.value = Math.max(-maxOffset.value, Math.min(maxOffset.value, targetOffset.value))
    currentOffset.value += (targetOffset.value - currentOffset.value) * PARALLAX_EASE
    applyParallax()

    if (
      Math.abs(targetOffset.value - currentOffset.value) < 0.5 &&
      !keys.ArrowLeft &&
      !keys.ArrowRight &&
      !dragging
    ) {
      currentOffset.value = targetOffset.value
      applyParallax()
      return false
    }
    return true
  })

  function registerLayer(el: HTMLElement, speed: number) {
    const vw = window.innerWidth
    layerMeta.push({
      el,
      speed,
      centerShift: -(el.offsetWidth - vw) / 2,
    })
  }

  function hideHint() {
    hintHidden.value = true
  }

  /* --- Input handlers --- */
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      keys[e.key] = true
      startLoop()
      hideHint()
    }
  }
  function onKeyUp(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      keys[e.key] = false
    }
  }

  let dragStartX = 0
  let offsetAtDragStart = 0

  function onMouseDown(e: MouseEvent) {
    dragging = true
    dragStartX = e.clientX
    offsetAtDragStart = targetOffset.value
    document.body.classList.add('dragging')
    startLoop()
    hideHint()
  }
  function onMouseMove(e: MouseEvent) {
    if (!dragging) return
    const dx = e.clientX - dragStartX
    targetOffset.value = offsetAtDragStart - dx * 1.8
  }
  function onMouseUp() {
    dragging = false
    document.body.classList.remove('dragging')
  }
  function onBlur() {
    dragging = false
    document.body.classList.remove('dragging')
    keys.ArrowLeft = false
    keys.ArrowRight = false
  }

  let touchStartX = 0
  let touchOffsetStart = 0

  function onTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX
    touchOffsetStart = targetOffset.value
    startLoop()
    hideHint()
  }
  function onTouchMove(e: TouchEvent) {
    const dx = e.touches[0].clientX - touchStartX
    targetOffset.value = touchOffsetStart - dx * 1.8
  }

  let resizeRaf = 0

  onMounted(() => {
    recalcParallax()
    applyParallax()
    startLoop()

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    window.addEventListener('blur', onBlur)
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('resize', () => {
      cancelAnimationFrame(resizeRaf)
      resizeRaf = requestAnimationFrame(recalcParallax)
    })

    setTimeout(() => { hintHidden.value = true }, 6000)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', onKeyDown)
    document.removeEventListener('keyup', onKeyUp)
    document.removeEventListener('mousedown', onMouseDown)
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    window.removeEventListener('blur', onBlur)
    document.removeEventListener('touchstart', onTouchStart)
    document.removeEventListener('touchmove', onTouchMove)
  })

  const ctx: ParallaxContext = {
    currentOffset,
    registerLayer,
    startLoop,
    hideHint,
  }

  provide(PARALLAX_KEY, ctx)

  return { currentOffset, hintHidden, registerLayer, startLoop, hideHint }
}
