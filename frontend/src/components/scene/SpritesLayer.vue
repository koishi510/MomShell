<template>
  <div class="sprites-layer layer" ref="layerEl">
    <img
      v-for="s in SPRITES"
      :key="s.id"
      :src="s.src"
      :alt="s.id"
      :class="['sprite', { clickable: isSpriteClickable(s.id) }]"
      :style="{
        left: s.left,
        top: s.top,
        width: s.width,
        transform: [
          s.rotate ? `rotate(${s.rotate}deg)` : '',
          s.scaleX ? `scaleX(${s.scaleX})` : '',
          s.scaleY ? `scaleY(${s.scaleY})` : '',
        ].filter(Boolean).join(' ') || undefined,
      }"
      draggable="false"
      @click="onSpriteClick(s.id)"
    />

    <Transition name="bubble-fade">
      <div v-if="showBubble" class="speech-bubble" :style="bubblePosition">
        去吧台买点饮料，谈天说地吧
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { PARALLAX_KEY } from '@/composables/useParallax'
import { LAYERS } from '@/constants/layers'
import { SPRITES } from '@/constants/sprites'
import { useUiStore } from '@/stores/ui'

const layerEl = ref<HTMLElement | null>(null)
const ctx = inject(PARALLAX_KEY)!
const uiStore = useUiStore()

const showBubble = ref(false)

const CLICKABLE_SPRITES = new Set(['car', 'shell1', 'shell3', 'shell4', 'bar', 'stone', 'community'])

function isSpriteClickable(id: string): boolean {
  return CLICKABLE_SPRITES.has(id)
}

const communitySprite = SPRITES.find(s => s.id === 'community')!

const bubblePosition = computed(() => ({
  left: `calc(${communitySprite.left} + 12vw)`,
  top: `calc(${communitySprite.top} - 3em)`,
}))

function onSpriteClick(id: string) {
  if (ctx.wasDrag()) return
  if (id === 'car') uiStore.openFeature('car')
  else if (id.startsWith('shell')) uiStore.openFeature('memory')
  else if (id === 'bar') uiStore.openFeature('community')
  else if (id === 'stone') uiStore.openFeature('chat')
  else if (id === 'community') {
    showBubble.value = true
    setTimeout(() => {
      showBubble.value = false
      // Scroll to make bar visible (bar is at left:18% of a 400vw layer)
      // With speed 0.55 and centerShift centering 400vw, offset ≈ -(vw * 0.82)
      ctx.scrollTo(-(window.innerWidth * 1.5))
    }, 2000)
  }
}

onMounted(() => {
  if (layerEl.value) {
    ctx.registerLayer(layerEl.value, LAYERS.sprites.speed)
  }
})
</script>

<style scoped>
.sprites-layer {
  width: 400vw;
  z-index: 30;
  top: calc(42% - 2px);
  height: calc(58% + 2px);
}

.sprite {
  position: absolute;
  height: auto;
  pointer-events: none;
}

.sprite.clickable {
  pointer-events: auto;
  cursor: pointer;
  transition: filter 0.25s;
}

.sprite.clickable:hover {
  filter: brightness(1.15) drop-shadow(0 0 12px rgba(255, 210, 140, 0.4));
}

.sprite.clickable:active {
  filter: brightness(0.9);
}

.speech-bubble {
  position: absolute;
  background: rgba(255, 255, 255, 0.92);
  color: #5a3e2b;
  font-size: 1rem;
  padding: 0.6em 1em;
  border-radius: 1em;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 50;
}

.speech-bubble::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 2em;
  border-width: 8px 6px 0;
  border-style: solid;
  border-color: rgba(255, 255, 255, 0.92) transparent transparent;
}

.bubble-fade-enter-active,
.bubble-fade-leave-active {
  transition: opacity 0.35s ease;
}

.bubble-fade-enter-from,
.bubble-fade-leave-to {
  opacity: 0;
}
</style>
