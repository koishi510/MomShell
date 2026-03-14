import { ref, onMounted, onUnmounted } from 'vue'

export function useIsMobile() {
  const isMobile = ref(false)
  const isSmall = ref(false)

  function update() {
    isMobile.value = window.matchMedia('(max-width: 768px)').matches
    isSmall.value = window.matchMedia('(max-width: 480px)').matches
  }

  let mql768: MediaQueryList
  let mql480: MediaQueryList

  onMounted(() => {
    mql768 = window.matchMedia('(max-width: 768px)')
    mql480 = window.matchMedia('(max-width: 480px)')
    update()
    mql768.addEventListener('change', update)
    mql480.addEventListener('change', update)
  })

  onUnmounted(() => {
    mql768?.removeEventListener('change', update)
    mql480?.removeEventListener('change', update)
  })

  return { isMobile, isSmall }
}
