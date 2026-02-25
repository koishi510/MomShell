<template>
  <div class="seagull-layer layer" ref="layerEl">
    <div
      v-for="(gull, i) in gullStyles"
      :key="i"
      class="seagull"
      :id="'gull' + i"
      :style="gull"
      v-once
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, inject } from 'vue'
import { PARALLAX_KEY } from '@/composables/useParallax'
import { LAYERS } from '@/constants/layers'
import { SEAGULL_DATA } from '@/constants/seagulls'

const layerEl = ref<HTMLElement | null>(null)
const ctx = inject(PARALLAX_KEY)!

const injectedStyles: HTMLStyleElement[] = []

const gullStyles = SEAGULL_DATA.map((g, i) => {
  const delay = (i * 4 + Math.random() * 3).toFixed(1)
  return {
    left: `${g.x}%`,
    top: `${g.y}%`,
    width: `${g.s * 2}px`,
    height: `${g.s}px`,
    color: g.c,
    animation: `gullFly${i} ${g.fd}s linear ${delay}s infinite`,
  }
})

onMounted(() => {
  if (layerEl.value) {
    ctx.registerLayer(layerEl.value, LAYERS.seagulls.speed)
  }

  // Inject dynamic flight path keyframes
  SEAGULL_DATA.forEach((g, i) => {
    const amp = 15 + Math.random() * 30
    const freq = 1.5 + Math.random() * 2
    const phase = Math.random() * Math.PI * 2
    const waypoints = [0, 12, 24, 37, 50, 63, 76, 88, 100]

    let kf = `@keyframes gullFly${i} {\n`
    waypoints.forEach(pct => {
      const t = pct / 100
      const xVw = (t * 133).toFixed(1)
      const yPx = (pct === 0 || pct === 100) ? 0
        : Math.round(Math.sin(t * Math.PI * freq * 2 + phase) * amp)
      const rot = (pct === 0 || pct === 100) ? '0'
        : (Math.cos(t * Math.PI * freq * 2 + phase) * 1.5).toFixed(1)
      kf += `  ${pct}% { transform: translateX(${xVw}vw) translateY(${yPx}px) rotate(${rot}deg); }\n`
    })
    kf += `}`

    const style = document.createElement('style')
    style.textContent = kf + `
      #gull${i}::before { animation: gullWing ${g.wd}s ease-in-out infinite; transform-origin: right center; }
      #gull${i}::after  { animation: gullWingR ${g.wd}s ease-in-out infinite; transform-origin: left center; }
    `
    document.head.appendChild(style)
    injectedStyles.push(style)
  })
})

onUnmounted(() => {
  injectedStyles.forEach(s => s.remove())
  injectedStyles.length = 0
})
</script>

<style scoped>
.seagull-layer {
  width: 400vw;
  z-index: 7;
  top: 0;
  height: 40%;
  pointer-events: none;
}

.seagull {
  position: absolute;
  pointer-events: none;
  will-change: transform;
}

.seagull::before,
.seagull::after {
  content: '';
  position: absolute;
  top: 0;
  width: 100%;
  height: 60%;
  border-top: 1.5px solid currentColor;
  border-radius: 50% 50% 0 0;
}

.seagull::before {
  right: 50%;
  transform-origin: right center;
  transform: rotate(-8deg);
}

.seagull::after {
  left: 50%;
  transform-origin: left center;
  transform: rotate(8deg);
}
</style>
