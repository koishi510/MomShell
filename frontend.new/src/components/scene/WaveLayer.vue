<template>
  <div class="layer" :class="variant.className" ref="layerEl" :style="layerStyle">
    <div
      v-for="(wf, i) in wavefronts"
      :key="i"
      class="wavefront"
      :style="wf"
      v-once
    />
    <div v-if="variant.showShoreWash" class="shore-wash"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { PARALLAX_KEY } from '@/composables/useParallax'
import { generateWavefronts } from '@/composables/useWaveSystem'
import type { WaveLayerVariant } from '@/types/scene'

const props = defineProps<{
  variant: WaveLayerVariant
}>()

const layerEl = ref<HTMLElement | null>(null)
const ctx = inject(PARALLAX_KEY)!

const wavefronts = generateWavefronts(props.variant.config)

const layerStyle = computed(() => ({
  filter: `url(#${props.variant.filterId}) blur(${props.variant.blurPx}px)`,
}))

onMounted(() => {
  if (layerEl.value) {
    ctx.registerLayer(layerEl.value, props.variant.speed)
  }
})
</script>

<style scoped>
.wave-layer-far {
  width: 400vw;
  z-index: 24;
  top: 33%;
  height: 18%;
  pointer-events: none;
  contain: layout style;
}
.wave-layer-mid {
  width: 400vw;
  z-index: 26;
  top: 35%;
  height: 16%;
  pointer-events: none;
  contain: layout style;
}
.wave-layer-near {
  width: 400vw;
  z-index: 28;
  top: 36%;
  height: 16%;
  pointer-events: none;
  contain: layout style;
}

/* Paper texture overlay */
.wave-layer-far::before,
.wave-layer-mid::before,
.wave-layer-near::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image:
    radial-gradient(circle at 20% 50%, rgba(180,160,140,0.04) 0%, transparent 50%),
    radial-gradient(circle at 80% 30%, rgba(160,150,130,0.03) 0%, transparent 40%),
    radial-gradient(circle at 50% 80%, rgba(170,155,135,0.035) 0%, transparent 45%);
  pointer-events: none;
  z-index: 1;
}

.wavefront {
  position: absolute;
  left: -2%;
  width: 104%;
  pointer-events: none;
  opacity: 0;
  border-radius: 50% 50% 45% 55% / 60% 60% 50% 50%;
}

.shore-wash {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 35%;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(155, 200, 195, 0.08) 20%,
    rgba(150, 195, 190, 0.15) 45%,
    rgba(145, 190, 185, 0.22) 65%,
    rgba(140, 188, 180, 0.18) 80%,
    rgba(180, 210, 200, 0.1) 100%
  );
  filter: blur(4px);
  animation: shoreWashPulse 8s cubic-bezier(0.4, 0.0, 0.2, 1.0) infinite;
  pointer-events: none;
  z-index: 2;
}
</style>
