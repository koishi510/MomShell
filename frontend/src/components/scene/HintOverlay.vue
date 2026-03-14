<template>
  <div class="hint" :class="{ hidden: isHidden }">
    {{ isMobile ? '滑动探索海岸线' : '拖拽或按方向键探索海岸线' }}
  </div>
</template>

<script setup lang="ts">
import { useIsMobile } from '@/composables/useIsMobile'

defineProps<{
  isHidden: boolean
}>()

const { isMobile } = useIsMobile()
</script>

<style scoped>
.hint {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  color: rgba(180, 130, 80, 0.6);
  font-family: inherit;
  font-size: 14px;
  letter-spacing: 1px;
  pointer-events: none;
  transition: opacity 2s ease;
}
.hint.hidden {
  opacity: 0;
}

@media (max-width: 768px) {
  .hint {
    font-size: 12px;
    bottom: 16px;
    max-width: 80vw;
    text-align: center;
  }
}
</style>
