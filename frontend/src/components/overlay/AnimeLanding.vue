<template>
  <div :class="['anime-landing', { 'is-blurred': isBlurred }]" ref="container">
    <!-- Background Particles -->
    <div class="particles">
      <div v-for="i in 40" :key="i" class="particle"></div>
    </div>

    <!-- Central Shell Morph -->
    <div class="shell-wrapper" @click="handleEnter">
      <svg class="shell-svg" viewBox="0 0 200 200">
        <path class="shell-path path-1" d="M100,40 C140,40 170,80 170,120 C170,160 140,180 100,180 C60,180 30,160 30,120 C30,80 60,40 100,40" />
        <path class="shell-path path-2" d="M100,60 C130,60 150,90 150,120 C150,150 130,165 100,165 C70,165 50,150 50,120 C50,90 70,60 100,60" />
        <path class="shell-path path-3" d="M100,80 C120,80 130,100 130,120 C130,140 120,150 100,150 C80,150 70,140 70,120 C70,100 80,80 100,80" />
      </svg>
      <div class="enter-hint">PRESS TO RESONATE</div>
    </div>

    <!-- Animated Title -->
    <div class="title-container">
      <h1 class="main-title">
        <span v-for="(char, i) in 'MomShell'" :key="i" class="letter">{{ char }}</span>
      </h1>
      <p class="tagline">Resonance of the Deep Soul</p>
    </div>

    <!-- Entrance Flash -->
    <div class="flash-overlay" ref="flash"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import anime from 'animejs/lib/anime.es.js'
import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()
const container = ref<HTMLElement | null>(null)
const flash = ref<HTMLElement | null>(null)

const isBlurred = computed(() => !!uiStore.activePanel)

// Reset animations when panel is closed
watch(isBlurred, (blurred) => {
  if (!blurred) {
    anime({
      targets: '.shell-svg',
      scale: 1,
      opacity: 1,
      duration: 1000,
      easing: 'easeOutQuart'
    })

    anime({
      targets: '.title-container',
      opacity: 1,
      translateY: 0,
      duration: 800,
      easing: 'easeOutBack'
    })
  }
})

onMounted(() => {
  // 1. Particle entrance and floating
  anime({
    targets: '.particle',
    translateX: () => anime.random(-500, 500),
    translateY: () => anime.random(-300, 300),
    scale: () => anime.random(0.5, 1.5),
    opacity: [0, 0.6],
    duration: 3000,
    delay: anime.stagger(20),
    easing: 'easeOutExpo'
  })

  anime({
    targets: '.particle',
    translateX: '+=20',
    translateY: '+=20',
    direction: 'alternate',
    loop: true,
    duration: () => anime.random(3000, 5000),
    easing: 'easeInOutSine'
  })

  // 2. Shell path drawing
  anime({
    targets: '.shell-path',
    strokeDashoffset: [anime.setDashoffset, 0],
    easing: 'easeInOutQuart',
    duration: 2500,
    delay: (el, i) => i * 250,
    direction: 'alternate',
    loop: true
  })

  // 3. Title Stagger
  anime({
    targets: '.letter',
    translateY: [40, 0],
    opacity: [0, 1],
    rotateZ: [20, 0],
    filter: ['blur(10px)', 'blur(0px)'],
    duration: 1500,
    delay: anime.stagger(100, { start: 500 }),
    easing: 'easeOutElastic(1, .6)'
  })

  // 4. Tagline fade in
  anime({
    targets: '.tagline',
    opacity: [0, 0.5],
    translateY: [10, 0],
    duration: 1000,
    delay: 1500,
    easing: 'easeOutQuad'
  })
})

const handleEnter = () => {
  if (isBlurred.value) return // Don't trigger if already in auth/panel mode

  // Trigger cool exit animation for elements
  anime({
    targets: '.shell-svg',
    scale: 15,
    opacity: 0,
    duration: 800,
    easing: 'easeInQuart'
  })

  anime({
    targets: '.title-container',
    opacity: 0,
    translateY: -20,
    duration: 500,
    easing: 'easeInQuad'
  })

  if (flash.value) {
    // Flash white and then fade out, trigger login at peak brightness
    anime({
      targets: flash.value,
      opacity: [0, 1, 0],
      duration: 1200,
      easing: 'easeInOutQuad',
      changeBegin: () => {
        // Halfway through flash peak, open auth
        setTimeout(() => {
          uiStore.openAuth('login')
        }, 600)
      }
    })
  } else {
    uiStore.openAuth('login')
  }
}
</script>

<style scoped>
.anime-landing {
  position: fixed;
  inset: 0;
  background: #050608;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  z-index: 50; /* Base level, AuthPanel is 100 */
  cursor: default;
  transition: filter 0.8s ease, transform 0.8s ease;
}

.anime-landing.is-blurred {
  filter: blur(20px) brightness(0.4);
  transform: scale(1.05);
}

.particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.particle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 2px;
  height: 2px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
}

.shell-wrapper {
  position: relative;
  width: 300px;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.shell-wrapper:hover {
  transform: scale(1.05);
}

.shell-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 15px rgba(165, 180, 252, 0.4));
}

.shell-path {
  fill: none;
  stroke: #a5b4fc;
  stroke-width: 0.5;
}

.path-1 { stroke-opacity: 0.8; stroke-width: 1; }
.path-2 { stroke-opacity: 0.5; }
.path-3 { stroke-opacity: 0.3; }

.enter-hint {
  position: absolute;
  bottom: -20px;
  font-size: 10px;
  letter-spacing: 4px;
  color: #6366f1;
  opacity: 0.6;
  font-weight: 300;
  animation: pulseHint 2s infinite;
}

.title-container {
  margin-top: 40px;
  text-align: center;
}

.main-title {
  font-size: 48px;
  font-weight: 700;
  letter-spacing: 12px;
  margin: 0;
  display: flex;
  justify-content: center;
  /* Offset the last letter's spacing to ensure perfect centering */
  padding-left: 12px;
}

.letter {
  display: inline-block;
  color: #fff;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
}

.tagline {
  margin-top: 12px;
  font-size: 14px;
  letter-spacing: 6px;
  color: #94a3b8;
  text-transform: uppercase;
  font-weight: 300;
}

.flash-overlay {
  position: absolute;
  inset: 0;
  background: #fff;
  opacity: 0;
  pointer-events: none;
  z-index: 1000; /* Over everything during flash */
}

@keyframes pulseHint {
  0%, 100% { opacity: 0.3; transform: translateY(0); }
  50% { opacity: 0.8; transform: translateY(-5px); }
}

@media (max-width: 768px) {
  .shell-wrapper { width: 200px; height: 200px; }
  .main-title { font-size: 32px; letter-spacing: 8px; }
  .tagline { font-size: 10px; letter-spacing: 4px; }
}
</style>
