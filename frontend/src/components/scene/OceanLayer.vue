<template>
  <div class="ocean layer" ref="layerEl">
    <div class="ocean-body"></div>
    <div class="ocean-horizon-glow"></div>
    <div
      v-for="(s, i) in shimmers"
      :key="'sh-' + i"
      class="shimmer"
      :style="s"
      v-once
    />
    <div
      v-for="(wl, i) in waveLines"
      :key="'wl-' + i"
      class="wave-line"
      :style="wl"
      v-once
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'
import { PARALLAX_KEY } from '@/composables/useParallax'
import { LAYERS } from '@/constants/layers'
import { generateShimmers, generateWaveLines } from '@/composables/useProceduralElements'

const layerEl = ref<HTMLElement | null>(null)
const ctx = inject(PARALLAX_KEY)!

const shimmers = generateShimmers(25)
const waveLines = generateWaveLines(12)

onMounted(() => {
  if (layerEl.value) {
    ctx.registerLayer(layerEl.value, LAYERS.ocean.speed)
  }
})
</script>

<style scoped>
.ocean {
  width: 400vw;
  z-index: 10;
  top: 33%;
  height: 67%;
}

.ocean-body {
  position: absolute;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    to bottom,
    #2a6ea8 0%,
    #2d72a4 8%,
    #3278a8 18%,
    #3880b0 30%,
    #4088b4 42%,
    #4a92b8 55%,
    #589ec0 68%,
    #68acc8 80%,
    #7cbad0 92%,
    #90c8d8 100%
  );
}

.ocean-horizon-glow {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 30%;
  background: linear-gradient(
    to bottom,
    rgba(255, 195, 140, 0.30) 0%,
    rgba(245, 175, 130, 0.12) 40%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 2;
}

.shimmer {
  position: absolute;
  height: 2px;
  background: rgba(255, 225, 160, 0.4);
  border-radius: 50%;
  filter: blur(1px);
  animation: shimmerFloat 4s ease-in-out infinite;
  z-index: 1;
}

.wave-line {
  position: absolute;
  width: 100%;
  height: 3px;
  background: repeating-linear-gradient(
    90deg,
    transparent 0,
    transparent 40px,
    rgba(140, 195, 215, 0.14) 40px,
    rgba(140, 195, 215, 0.14) 80px,
    transparent 80px,
    transparent 140px
  );
  animation: waveLineDrift 8s linear infinite;
  z-index: 1;
}
</style>
