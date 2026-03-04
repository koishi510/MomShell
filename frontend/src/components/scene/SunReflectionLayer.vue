<template>
  <div class="sun-reflection-layer layer" ref="layerEl">
    <div
      v-for="(g, i) in glows"
      :key="'g-' + i"
      class="reflection-glow"
      :style="g"
      v-once
    />
    <div
      v-for="(s, i) in streaks"
      :key="'s-' + i"
      class="reflection-streak"
      :style="s"
      v-once
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'
import { PARALLAX_KEY } from '@/composables/useParallax'
import { LAYERS } from '@/constants/layers'
import { generateReflectionGlows, generateReflectionStreaks } from '@/composables/useProceduralElements'

const layerEl = ref<HTMLElement | null>(null)
const ctx = inject(PARALLAX_KEY)!

const glows = generateReflectionGlows()
const streaks = generateReflectionStreaks()

onMounted(() => {
  if (layerEl.value) {
    ctx.registerLayer(layerEl.value, LAYERS.sunReflection.speed)
  }
})
</script>

<style scoped>
.sun-reflection-layer {
  width: 300vw;
  z-index: 11;
  top: 33%;
  height: 67%;
  pointer-events: none;
}

.reflection-streak {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 225, 160, 0.5);
  border-radius: 50%;
  filter: blur(1.5px);
  animation-fill-mode: backwards;
}

.reflection-glow {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 50%;
  pointer-events: none;
  animation-fill-mode: backwards;
}
</style>
