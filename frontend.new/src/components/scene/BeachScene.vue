<template>
  <!-- Inline SVG watercolor filters -->
  <svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden;" aria-hidden="true">
    <defs>
      <filter id="watercolor-far" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="4" seed="1" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="7" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
        <feGaussianBlur in="displaced" stdDeviation="0.8" result="softened"/>
      </filter>
      <filter id="watercolor-mid" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" seed="7" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
        <feGaussianBlur in="displaced" stdDeviation="0.6" result="softened"/>
      </filter>
      <filter id="watercolor-near" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="5" seed="13" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
        <feGaussianBlur in="displaced" stdDeviation="0.4" result="softened"/>
      </filter>
    </defs>
  </svg>

  <div class="scene">
    <SkyLayer />
    <CloudLayer />
    <SeagullLayer />
    <SunLayer />
    <OceanLayer />
    <SunReflectionLayer />
    <WaveLayer v-for="(wl, i) in waveLayers" :key="i" :variant="wl" />
    <SandLayer />
  </div>

  <HintOverlay :is-hidden="hintHidden" />
</template>

<script setup lang="ts">
import { useParallax } from '@/composables/useParallax'
import { WAVE_LAYERS } from '@/constants/waves'
import SkyLayer from './SkyLayer.vue'
import CloudLayer from './CloudLayer.vue'
import SeagullLayer from './SeagullLayer.vue'
import SunLayer from './SunLayer.vue'
import OceanLayer from './OceanLayer.vue'
import SunReflectionLayer from './SunReflectionLayer.vue'
import WaveLayer from './WaveLayer.vue'
import SandLayer from './SandLayer.vue'
import HintOverlay from './HintOverlay.vue'

const { hintHidden } = useParallax()
const waveLayers = WAVE_LAYERS
</script>

<style scoped>
.scene {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>
