<template>
  <div class="sand-layer layer" ref="layerEl">
    <img :src="sandTexture" class="sand-texture" alt="">
    <div
      v-for="(p, i) in particles"
      :key="i"
      class="wave-particle"
      :style="p"
      v-once
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'
import { PARALLAX_KEY } from '@/composables/useParallax'
import { LAYERS } from '@/constants/layers'
import { generateWaveParticles } from '@/composables/useProceduralElements'
import sandTexture from '@/assets/sand.png'

const layerEl = ref<HTMLElement | null>(null)
const ctx = inject(PARALLAX_KEY)!

const particles = generateWaveParticles(35, 1, 16)

onMounted(() => {
  if (layerEl.value) {
    ctx.registerLayer(layerEl.value, LAYERS.sand.speed)
  }
})
</script>

<style scoped>
.sand-layer {
  width: 400vw;
  z-index: 20;
  top: calc(42% - 2px);
  height: calc(58% + 2px);
}

.sand-texture {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}

.wave-particle {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
</style>
