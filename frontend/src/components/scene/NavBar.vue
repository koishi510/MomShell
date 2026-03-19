<template>
  <Transition name="nav-fade">
    <div v-if="showNav" class="nav-wrapper">
      <!-- Collapsed toggle button -->
      <button class="nav-toggle" :class="{ expanded }" @click="expanded = !expanded" aria-label="导航菜单">
        <svg v-if="!expanded" class="nav-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
        <svg v-else class="nav-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <!-- Expanded nav panel -->
      <Transition name="nav-expand">
        <nav v-if="expanded" class="nav-panel">
          <button
            v-for="item in NAV_ITEMS"
            :key="item.spriteId"
            class="nav-item"
            :aria-label="item.label"
            @click="scrollToSprite(item.spriteId)"
          >
            <component :is="item.iconComponent" class="nav-icon" />
            <span class="nav-label">{{ item.label }}</span>
          </button>
        </nav>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, h, type FunctionalComponent } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { computeOffsetForSprite } from '@/utils/spriteOffset'

const uiStore = useUiStore()
const authStore = useAuthStore()
const expanded = ref(false)

// SVG icon components (monochrome, outline style)
const iconProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }

const IconChat: FunctionalComponent = () =>
  h('svg', iconProps, [
    h('path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' }),
  ])

const IconCar: FunctionalComponent = () =>
  h('svg', iconProps, [
    h('path', { d: 'M5 17h14M5 17a2 2 0 0 1-2-2v-4l2-5h14l2 5v4a2 2 0 0 1-2 2M5 17a2 2 0 1 0 4 0M15 17a2 2 0 1 0 4 0' }),
  ])

const IconBoard: FunctionalComponent = () =>
  h('svg', iconProps, [
    h('rect', { x: '3', y: '3', width: '18', height: '18', rx: '2' }),
    h('line', { x1: '8', y1: '8', x2: '16', y2: '8' }),
    h('line', { x1: '8', y1: '12', x2: '16', y2: '12' }),
    h('line', { x1: '8', y1: '16', x2: '12', y2: '16' }),
  ])

const IconConque: FunctionalComponent = () =>
  h('svg', iconProps, [
    h('path', { d: 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z' }),
    h('path', { d: 'M19 10v2a7 7 0 0 1-14 0v-2' }),
    h('line', { x1: '12', y1: '19', x2: '12', y2: '23' }),
    h('line', { x1: '8', y1: '23', x2: '16', y2: '23' }),
  ])

const IconStar: FunctionalComponent = () =>
  h('svg', iconProps, [
    h('polygon', { points: '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' }),
  ])

interface NavItem {
  iconComponent: FunctionalComponent
  label: string
  spriteId: string
}

const NAV_ITEMS: NavItem[] = [
  { iconComponent: IconBoard, label: '智育社区', spriteId: 'bar' },
  { iconComponent: IconCar, label: '个人中心', spriteId: 'car' },
  { iconComponent: IconConque, label: '心语信箱', spriteId: 'mailbox' },
  { iconComponent: IconStar, label: '行动回执', spriteId: 'chair' },
  { iconComponent: IconChat, label: '智聊助手', spriteId: 'stone' },
]

function highlightSprite(spriteId: string) {
  const el = document.getElementById(`sprite-${spriteId}`)
  if (!el) return
  el.classList.remove('sprite-highlight')
  // Force reflow so re-adding the class restarts the animation
  el.offsetWidth // eslint-disable-line @typescript-eslint/no-unused-expressions
  el.classList.add('sprite-highlight')
  const onEnd = () => {
    el.classList.remove('sprite-highlight')
    el.removeEventListener('animationend', onEnd)
  }
  el.addEventListener('animationend', onEnd)
}

function scrollToSprite(spriteId: string) {
  const offset = computeOffsetForSprite(spriteId)
  if (offset !== null) {
    uiStore.parallaxScrollTo(offset)
    // Wait for parallax scroll animation to settle, then highlight
    setTimeout(() => highlightSprite(spriteId), 500)
  }
  expanded.value = false
}

const showNav = computed(() => {
  return (
    !uiStore.activePanel &&
    (authStore.isAuthenticated || authStore.isGuest)
  )
})
</script>

<style scoped>
.nav-wrapper {
  position: fixed;
  top: 14px;
  right: 14px;
  z-index: 90;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.nav-toggle {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, transform 0.15s, border-color 0.2s;
  color: rgba(90, 62, 43, 0.7);
}

.nav-toggle:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.4);
}

.nav-toggle:active {
  transform: scale(0.93);
}

.nav-toggle.expanded {
  background: rgba(255, 255, 255, 0.25);
}

.nav-toggle-icon {
  width: 20px;
  height: 20px;
}

.nav-panel {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border: none;
  background: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
  white-space: nowrap;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.2);
}

.nav-item:active {
  transform: scale(0.97);
}

.nav-icon {
  width: 20px;
  height: 20px;
  color: rgba(90, 62, 43, 0.65);
  flex-shrink: 0;
}

.nav-label {
  font-size: 13px;
  color: rgba(90, 62, 43, 0.8);
  font-weight: 500;
}

/* Transitions */
.nav-fade-enter-active,
.nav-fade-leave-active {
  transition: opacity 0.3s ease;
}

.nav-fade-enter-from,
.nav-fade-leave-to {
  opacity: 0;
}

.nav-expand-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.nav-expand-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.nav-expand-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}

.nav-expand-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .nav-toggle {
    width: 44px;
    height: 44px;
  }

  .nav-item {
    padding: 12px 16px;
    min-height: 44px;
  }

  .nav-label {
    font-size: 14px;
  }

  .nav-icon {
    width: 22px;
    height: 22px;
  }
}
</style>

<!-- Global (non-scoped) styles for sprite highlight animation -->
<style>
.sprite-highlight {
  animation: sprite-pulse 1.2s ease-out;
  filter: drop-shadow(0 0 12px rgba(255, 214, 140, 0.9)) drop-shadow(0 0 24px rgba(255, 180, 80, 0.5));
  z-index: 100 !important;
}

@keyframes sprite-pulse {
  0% {
    transform: scale(1);
    filter: drop-shadow(0 0 0 rgba(255, 214, 140, 0));
  }
  15% {
    transform: scale(1.15);
    filter: drop-shadow(0 0 18px rgba(255, 214, 140, 1)) drop-shadow(0 0 36px rgba(255, 180, 80, 0.7));
  }
  30% {
    transform: scale(1.05);
    filter: drop-shadow(0 0 12px rgba(255, 214, 140, 0.8)) drop-shadow(0 0 24px rgba(255, 180, 80, 0.4));
  }
  50% {
    transform: scale(1.12);
    filter: drop-shadow(0 0 16px rgba(255, 214, 140, 0.9)) drop-shadow(0 0 30px rgba(255, 180, 80, 0.6));
  }
  100% {
    transform: scale(1);
    filter: drop-shadow(0 0 0 rgba(255, 214, 140, 0));
  }
}
</style>
