import { ref, onUnmounted } from 'vue'

export function useAnimationLoop(callback: (dt: number) => boolean) {
  const animating = ref(false)
  let rafId = 0
  let prevT = 0

  function loop(now: number) {
    const dt = Math.min((now - prevT) / 1000, 0.1)
    prevT = now

    const shouldContinue = callback(dt)
    if (shouldContinue) {
      rafId = requestAnimationFrame(loop)
    } else {
      animating.value = false
    }
  }

  function start() {
    if (!animating.value) {
      animating.value = true
      prevT = performance.now()
      rafId = requestAnimationFrame(loop)
    }
  }

  function stop() {
    animating.value = false
    cancelAnimationFrame(rafId)
  }

  onUnmounted(stop)

  return { animating, start, stop }
}
