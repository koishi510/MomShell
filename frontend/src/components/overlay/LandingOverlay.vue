<template>
  <Transition name="landing">
    <div v-if="uiStore.showLanding" class="landing-overlay">
      <div class="landing-center">
        <div class="landing-glow" />
        <button class="landing-btn" @click="onOpen">
          <span class="landing-btn-text">开启回响</span>
        </button>
        <p class="landing-subtitle">MomShell · 贝壳回响</p>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'

const uiStore = useUiStore()
const authStore = useAuthStore()

function onOpen() {
  uiStore.closeLanding()
  if (authStore.isAuthenticated) return
  uiStore.openAuth('login')
}
</script>

<style scoped>
.landing-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 100%);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

.landing-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.landing-glow {
  position: absolute;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 225, 160, 0.25) 0%, transparent 70%);
  animation: landingPulse 3.5s ease-in-out infinite;
  pointer-events: none;
}

.landing-btn {
  position: relative;
  z-index: 1;
  padding: 18px 48px;
  background: var(--glass-bg-heavy);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--glass-border-strong);
  border-radius: 60px;
  box-shadow: var(--glass-shadow), var(--glass-inner-glow),
    0 0 40px rgba(255, 210, 140, 0.15);
  cursor: pointer;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s;
}

.landing-btn:hover {
  transform: scale(1.05);
  box-shadow: var(--glass-shadow), var(--glass-inner-glow),
    0 0 60px rgba(255, 210, 140, 0.25);
}

.landing-btn:active {
  transform: scale(0.98);
}

.landing-btn-text {
  font-size: 20px;
  font-weight: 500;
  letter-spacing: 4px;
  color: var(--text-primary);
  text-shadow: 0 1px 8px rgba(255, 210, 140, 0.3);
}

.landing-subtitle {
  font-size: 13px;
  letter-spacing: 2px;
  color: var(--text-secondary);
}

@keyframes landingPulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.15); opacity: 1; }
}

/* Transition */
.landing-enter-active { transition: opacity 0.5s ease; }
.landing-leave-active { transition: opacity 0.6s ease; }
.landing-enter-from, .landing-leave-to { opacity: 0; }

/* ── Mobile ── */
@media (max-width: 768px) {
  .landing-glow {
    width: 200px;
    height: 200px;
  }

  .landing-btn {
    padding: 16px 40px;
  }

  .landing-btn-text {
    font-size: 18px;
    letter-spacing: 3px;
  }

  .landing-subtitle {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .landing-glow {
    width: 160px;
    height: 160px;
  }

  .landing-btn-text {
    font-size: 16px;
  }
}
</style>
