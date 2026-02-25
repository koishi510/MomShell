import { inject, onMounted, type Ref } from 'vue'
import { PARALLAX_KEY, type ParallaxContext } from './useParallax'

export function useInputHandler() {
  // This composable is now merged into useParallax for simplicity.
  // If you need access to the parallax context from a child component, use this:
  const ctx = inject<ParallaxContext>(PARALLAX_KEY)

  function registerLayer(el: HTMLElement | null, speed: number) {
    if (el && ctx) {
      ctx.registerLayer(el, speed)
    }
  }

  return { registerLayer }
}
