<template>
  <div class="sky layer" ref="layerEl"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'
import { PARALLAX_KEY } from '@/composables/useParallax'
import { LAYERS } from '@/constants/layers'

const layerEl = ref<HTMLElement | null>(null)
const ctx = inject(PARALLAX_KEY)!

onMounted(() => {
  if (layerEl.value) {
    ctx.registerLayer(layerEl.value, LAYERS.sky.speed)
  }
})
</script>

<style scoped>
.sky {
  width: 300vw;
  background: linear-gradient(
    to bottom,
    #f2b8c8 0%,
    #f0bcc6 5%,
    #eebac0 10%,
    #edb8bc 15%,
    #ecb4b6 20%,
    #ebb0b0 25%,
    #eaaea8 30%,
    #ebaca2 35%,
    #eca89c 40%,
    #eea898 46%,
    #f0a894 52%,
    #f2ac92 58%,
    #f4b490 64%,
    #f6be90 70%,
    #f8c890 76%,
    #fad494 82%,
    #fce09c 88%,
    #fdeaa8 94%,
    #fef0b0 100%
  );
  z-index: 1;
}
</style>
