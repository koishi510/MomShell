<template>
  <div class="clouds layer" ref="layerEl">
    <div
      v-for="(cloud, i) in cloudStyles"
      :key="i"
      :class="['cloud', { 'cloud-bright': cloud.bright }]"
      :style="cloud.style"
      v-once
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'
import { PARALLAX_KEY } from '@/composables/useParallax'
import { LAYERS } from '@/constants/layers'
import { CLOUD_DATA } from '@/constants/clouds'

const layerEl = ref<HTMLElement | null>(null)
const ctx = inject(PARALLAX_KEY)!

const cloudStyles = CLOUD_DATA.map((c, i) => ({
  bright: c.bright,
  style: {
    left: `${c.x}%`,
    top: `${c.y}%`,
    width: `${c.w}px`,
    height: `${c.h}px`,
    animation: `cloudDrift${i % 3} ${20 + i * 3}s ease-in-out infinite alternate`,
  },
}))

onMounted(() => {
  if (layerEl.value) {
    ctx.registerLayer(layerEl.value, LAYERS.clouds.speed)
  }
})
</script>

<style scoped>
.clouds {
  width: 400vw;
  z-index: 5;
  top: 0;
  height: 45%;
}

.cloud {
  position: absolute;
  background: rgba(255, 225, 195, 0.22);
  border-radius: 60% 60% 40% 40%;
  filter: blur(6px);
}

.cloud::before {
  content: '';
  position: absolute;
  background: inherit;
  border-radius: 50%;
  width: 55%;
  height: 140%;
  top: -55%;
  left: 12%;
}

.cloud::after {
  content: '';
  position: absolute;
  background: inherit;
  border-radius: 50%;
  width: 45%;
  height: 120%;
  top: -40%;
  right: 10%;
}

.cloud-bright {
  background: rgba(255, 205, 150, 0.28);
  filter: blur(5px);
}
</style>
