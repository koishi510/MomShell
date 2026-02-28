<template>
  <div class="sprites-layer layer" ref="layerEl">
    <img
      v-for="s in SPRITES"
      :key="s.id"
      :src="s.src"
      :alt="s.id"
      class="sprite"
      :style="{
        left: s.left,
        top: s.top,
        width: s.width,
        transform: s.rotate ? `rotate(${s.rotate}deg)` : undefined,
      }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'
import { PARALLAX_KEY } from '@/composables/useParallax'
import { LAYERS } from '@/constants/layers'
import { SPRITES } from '@/constants/sprites'

const layerEl = ref<HTMLElement | null>(null)
const ctx = inject(PARALLAX_KEY)!

onMounted(() => {
  if (layerEl.value) {
    ctx.registerLayer(layerEl.value, LAYERS.sprites.speed)
  }
})
</script>

<style scoped>
.sprites-layer {
  width: 400vw;
  z-index: 22;
  top: calc(42% - 2px);
  height: calc(58% + 2px);
}

.sprite {
  position: absolute;
  height: auto;
  pointer-events: none;
}
</style>
