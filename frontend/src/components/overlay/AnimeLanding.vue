<template>
  <div
    :class="['anime-landing', { 'is-blurred': isBlurred }]"
    ref="container"
    @pointermove="onPointerMove"
  >
    <!-- Central Shell Morph -->
    <div class="shell-wrapper" ref="shellWrapper" @click="handleEnter">
      <svg class="shell-svg" viewBox="0 0 200 200">
        <path class="shell-path path-1" d="M100,40 C140,40 170,80 170,120 C170,160 140,180 100,180 C60,180 30,160 30,120 C30,80 60,40 100,40" />
        <path class="shell-path path-2" d="M100,60 C130,60 150,90 150,120 C150,150 130,165 100,165 C70,165 50,150 50,120 C50,90 70,60 100,60" />
        <path class="shell-path path-3" d="M100,80 C120,80 130,100 130,120 C130,140 120,150 100,150 C80,150 70,140 70,120 C70,100 80,80 100,80" />
      </svg>
      <!-- Pearl: particle that follows mouse, constrained to outer ring -->
      <div class="pearl" :style="{ transform: `translate(${pearlOffsetX}px, ${pearlOffsetY}px)` }"></div>
      <div class="enter-hint">PRESS TO RESONATE</div>
    </div>

    <!-- Animated Title -->
    <div class="title-container">
      <h1 class="main-title">
        <span v-for="(char, i) in 'MomShell'" :key="i" class="letter">{{ char }}</span>
      </h1>
      <p class="tagline">Resonance of the Deep Soul</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watch } from 'vue'
import { animate, stagger, random } from 'animejs'
import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()
const container = ref<HTMLElement | null>(null)
const shellWrapper = ref<HTMLElement | null>(null)

const isBlurred = computed(() => !!uiStore.activePanel)

// ─── Pearl state (particle-style, constrained to outer shell ring) ───
// Shell center is at ~(50%, 55%) of the wrapper; max radius ~31% of width
const pearlOffsetX = ref(0)
const pearlOffsetY = ref(12)
let targetOffsetX = 0
let targetOffsetY = 12
let rafId = 0

function updatePearl() {
  pearlOffsetX.value += (targetOffsetX - pearlOffsetX.value) * 0.06
  pearlOffsetY.value += (targetOffsetY - pearlOffsetY.value) * 0.06
  rafId = requestAnimationFrame(updatePearl)
}

function onPointerMove(e: PointerEvent) {
  const wrapper = shellWrapper.value
  if (!wrapper) return

  const rect = wrapper.getBoundingClientRect()
  const cx = rect.width * 0.5
  const cy = rect.height * 0.55

  let dx = (e.clientX - rect.left) - cx
  let dy = (e.clientY - rect.top) - cy
  const dist = Math.sqrt(dx * dx + dy * dy)
  const maxR = rect.width * 0.31

  if (dist > maxR) {
    dx = (dx / dist) * maxR
    dy = (dy / dist) * maxR
  }

  targetOffsetX = dx
  targetOffsetY = dy
}

// ─── Reset when panel closes ───────────────────
watch(isBlurred, (blurred) => {
  if (!blurred) {
    animate('.shell-svg', {
      scale: 1,
      opacity: 1,
      rotate: '0turn',
      duration: 1000,
      easing: 'easeOutQuart'
    })

    animate('.title-container', {
      opacity: 1,
      translateY: 0,
      duration: 800,
      easing: 'easeOutBack'
    })

    animate('.particle', {
      opacity: 0.6,
      duration: 1200,
      easing: 'easeOutQuad'
    })
  }
})

onMounted(() => {
  // Start pearl smooth-follow loop
  rafId = requestAnimationFrame(updatePearl)

  // 1. Particle entrance and floating
  animate('.particle', {
    translateX: () => random(-500, 500),
    translateY: () => random(-300, 300),
    scale: () => random(0.5, 1.5),
    opacity: [0, 0.6],
    duration: 3000,
    delay: stagger(20),
    easing: 'easeOutExpo'
  })

  animate('.particle', {
    translateX: '+=20',
    translateY: '+=20',
    direction: 'alternate',
    loop: true,
    duration: () => random(3000, 5000),
    easing: 'easeInOutSine'
  })

  // 2. Shell paths — continuous clockwise with trailing dash
  document.querySelectorAll('.shell-path').forEach((el, i) => {
    const path = el as SVGPathElement
    const length = path.getTotalLength()
    const trailRatio = [0.85, 0.75, 0.65][i] ?? 0.7

    path.style.strokeDasharray = `${length * trailRatio} ${length * (1 - trailRatio)}`
    path.style.strokeDashoffset = String(length)

    animate(path, {
      strokeDashoffset: [length, 0],
      duration: 2600 + i * 700,
      easing: 'linear',
      loop: true
    })
  })

  // 3. Title Stagger
  animate('.letter', {
    translateY: [40, 0],
    opacity: [0, 1],
    rotateZ: [20, 0],
    filter: ['blur(10px)', 'blur(0px)'],
    duration: 1500,
    delay: stagger(100, { start: 500 }),
    easing: 'easeOutElastic(1, .6)'
  })

  // 4. Tagline fade in
  animate('.tagline', {
    opacity: [0, 0.5],
    translateY: [10, 0],
    duration: 1000,
    delay: 1500,
    easing: 'easeOutQuad'
  })
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
})

// ─── Enter handler: dissolve inward ────────────
const handleEnter = () => {
  if (isBlurred.value) return

  // Shell spirals inward and dissolves
  animate('.shell-svg', {
    scale: [1, 0.12],
    rotate: '1turn',
    opacity: [1, 0],
    duration: 900,
    easing: 'easeInBack'
  })

  // Title fades upward
  animate('.title-container', {
    opacity: 0,
    translateY: -24,
    duration: 500,
    easing: 'easeInQuad'
  })

  // Particles converge to center and vanish
  animate('.particle', {
    translateX: 0,
    translateY: 0,
    scale: 0,
    opacity: 0,
    duration: 700,
    easing: 'easeInQuart'
  })

  // Open auth after the dissolve settles
  setTimeout(() => uiStore.openAuth('login'), 750)
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
  z-index: 50;
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
  stroke-linecap: round;
}

.path-1 { stroke-opacity: 0.8; stroke-width: 1; }
.path-2 { stroke-opacity: 0.5; }
.path-3 { stroke-opacity: 0.3; }

/* Pearl (particle-style, follows mouse) */
.pearl {
  position: absolute;
  left: 50%;
  top: 55%;
  width: 8px;
  height: 8px;
  margin-left: -2.5px;
  margin-top: -2.5px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.8),
              0 0 14px rgba(165, 180, 252, 0.4);
  pointer-events: none;
  z-index: 1;
}

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
