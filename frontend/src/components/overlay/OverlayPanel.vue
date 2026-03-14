<template>
  <Transition name="overlay">
    <div v-if="visible" class="overlay-backdrop" @click.self="onBackdropClick">
      <div :class="['overlay-panel', `overlay-${position}`]">
        <button v-if="showClose" class="overlay-close" @click="$emit('close')" aria-label="关闭">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>
        <div class="overlay-content">
          <slot />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    visible: boolean
    position?: 'center' | 'right' | 'fullscreen'
    showClose?: boolean
    dismissible?: boolean
  }>(),
  {
    position: 'center',
    showClose: true,
    dismissible: true,
  },
)

const emit = defineEmits<{
  close: []
}>()

function onBackdropClick() {
  emit('close')
}
</script>

<style scoped>
.overlay-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--overlay-backdrop);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.overlay-panel {
  position: relative;
  background: var(--glass-bg-heavy);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius);
  box-shadow: var(--glass-shadow), var(--glass-inner-glow);
  overflow: hidden;
}

/* ── Center (default modal) ── */
.overlay-center {
  width: min(720px, 88vw);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

/* ── Right slide panel — also centered & large ── */
.overlay-right {
  width: min(780px, 90vw);
  max-height: 92vh;
  display: flex;
  flex-direction: column;
}

/* ── Fullscreen ── */
.overlay-fullscreen {
  width: 100vw;
  height: 100vh;
  border-radius: 0;
}

.overlay-close {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
}

.overlay-close:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.08);
}

.overlay-content {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

/* ── Transitions ── */
.overlay-enter-active {
  transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.overlay-enter-active .overlay-panel {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease;
}
.overlay-leave-active {
  transition: opacity 0.25s ease;
}
.overlay-leave-active .overlay-panel {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.overlay-enter-from {
  opacity: 0;
}
.overlay-enter-from .overlay-center {
  transform: scale(0.92) translateY(20px);
  opacity: 0;
}
.overlay-enter-from .overlay-right {
  transform: scale(0.92) translateY(20px);
  opacity: 0;
}
.overlay-enter-from .overlay-fullscreen {
  transform: scale(0.96);
  opacity: 0;
}

.overlay-leave-to {
  opacity: 0;
}
.overlay-leave-to .overlay-center {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}
.overlay-leave-to .overlay-right {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}
.overlay-leave-to .overlay-fullscreen {
  transform: scale(0.97);
  opacity: 0;
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .overlay-center {
    width: 100vw;
    height: 100dvh;
    height: 100vh;
    max-height: 100dvh;
    max-height: 100vh;
    border-radius: 0;
  }

  .overlay-right {
    width: 100vw;
    height: 100dvh;
    height: 100vh;
    max-height: 100dvh;
    max-height: 100vh;
    border-radius: 0;
  }

  .overlay-fullscreen {
    height: 100dvh;
    height: 100vh;
  }

  .overlay-panel {
    border-radius: 0;
  }

  .overlay-close {
    width: 44px;
    height: 44px;
    top: 12px;
    right: 12px;
  }
}

/* ── Mobile landscape ── */
@media (max-height: 500px) and (orientation: landscape) {
  .overlay-center,
  .overlay-right {
    width: 80vw;
    max-height: 100dvh;
    max-height: 100vh;
    border-radius: 12px;
  }

  .overlay-panel {
    border-radius: 12px;
  }
}
</style>
