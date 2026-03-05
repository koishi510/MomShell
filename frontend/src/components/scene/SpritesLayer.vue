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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'
import { PARALLAX_KEY } from '@/composables/useParallax'
import { LAYERS } from '@/constants/layers'
import { SPRITES } from '@/constants/sprites'
import { useUiStore } from '@/stores/ui'

const layerEl = ref<HTMLElement | null>(null)
const ctx = inject(PARALLAX_KEY)!
const uiStore = useUiStore()

const CLICKABLE_SPRITES = new Set(['car', 'shell1', 'shell2', 'shell3', 'shell4', 'bar', 'stone'])

function isSpriteClickable(id: string): boolean {
  return CLICKABLE_SPRITES.has(id)
}

function onSpriteClick(id: string) {
  if (ctx.wasDrag()) return
  if (id === 'car') uiStore.openFeature('car')
  else if (id.startsWith('shell')) uiStore.openFeature('memory')
  else if (id === 'bar') uiStore.openFeature('community')
  else if (id === 'stone') uiStore.openFeature('chat')
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
</style>
