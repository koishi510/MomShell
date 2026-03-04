<template>
  <div class="sun-layer layer" ref="layerEl">
    <!-- Behind-sun wisps (inserted before sun-anchor) -->
    <div
      v-for="(w, i) in behindWisps"
      :key="'bw-' + i"
      class="horizon-wisp"
      :style="w"
      v-once
    />
    <div class="sun-anchor">
      <div class="sun"></div>
    </div>
    <!-- Front wisps -->
    <div
      v-for="(w, i) in frontWisps"
      :key="'fw-' + i"
      class="horizon-wisp"
      :style="w"
      v-once
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'
import { PARALLAX_KEY } from '@/composables/useParallax'
import { LAYERS } from '@/constants/layers'
import { WISP_DATA } from '@/constants/reflections'

const layerEl = ref<HTMLElement | null>(null)
const ctx = inject(PARALLAX_KEY)!

function buildWispStyle(w: typeof WISP_DATA[number], i: number) {
  return {
    left: `${w.x}%`,
    top: `${w.y}%`,
    width: `${w.w}px`,
    height: `${w.h}px`,
    background: w.color,
    filter: `blur(${w.blur}px)`,
    animationDelay: `${i * 2.1}s`,
    animationDuration: `${18 + i * 1.5}s`,
  }
}

const behindWisps = WISP_DATA
  .map((w, i) => ({ w, i }))
  .filter(({ w }) => w.behind)
  .map(({ w, i }) => buildWispStyle(w, i))

const frontWisps = WISP_DATA
  .map((w, i) => ({ w, i }))
  .filter(({ w }) => !w.behind)
  .map(({ w, i }) => buildWispStyle(w, i))

onMounted(() => {
  if (layerEl.value) {
    ctx.registerLayer(layerEl.value, LAYERS.sun.speed)
  }
})
</script>

<style scoped>
.sun-layer {
  width: 300vw;
  z-index: 6;
  pointer-events: none;
}

.sun-anchor {
  position: absolute;
  top: 35%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.sun {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff5d0 0%, #ffe8a8 50%, #ffd880 100%);
}

.sun-anchor::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 900px;
  height: 900px;
  border-radius: 50%;
  background: radial-gradient(circle,
    rgba(255, 240, 200, 0.7) 0%,
    rgba(255, 225, 170, 0.5) 8%,
    rgba(255, 210, 140, 0.32) 18%,
    rgba(255, 195, 120, 0.16) 32%,
    rgba(250, 180, 110, 0.06) 50%,
    transparent 70%
  );
  z-index: -1;
  pointer-events: none;
  animation: glowPulse 5s ease-in-out infinite;
}

.sun-anchor::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 1600px;
  height: 1200px;
  border-radius: 50%;
  background: radial-gradient(ellipse,
    rgba(255, 230, 170, 0.38) 0%,
    rgba(255, 215, 150, 0.22) 15%,
    rgba(255, 200, 140, 0.10) 35%,
    rgba(250, 185, 130, 0.04) 55%,
    transparent 75%
  );
  z-index: -2;
  pointer-events: none;
}

.horizon-wisp {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  animation: wispDrift 20s ease-in-out infinite alternate;
}
</style>
