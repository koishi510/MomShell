<template>
  <div class="sprites-layer layer" ref="layerEl">
    <img
      v-for="s in SPRITES"
      :key="s.id"
      :ref="(element) => setSpriteEl(s.id, element)"
      :src="s.src"
      :alt="s.id"
      :id="`sprite-${s.id}`"
      :class="['sprite', { clickable: isSpriteClickable(s.id) }]"
      :style="{
        left: s.left,
        top: s.top,
        width: s.width,
        transform: [
          s.rotate ? `rotate(${s.rotate}deg)` : '',
          s.scaleX ? `scaleX(${s.scaleX})` : '',
          s.scaleY ? `scaleY(${s.scaleY})` : '',
        ].filter(Boolean).join(' ') || undefined,
      }"
      draggable="false"
      @click="onSpriteClick(s.id)"
    />
  </div>

  <div class="sprite-bubble-layer layer" ref="bubbleLayerEl" aria-hidden="true" id="sprite-bubble-layer">
    <Transition name="bubble-fade">
      <div v-if="showBubble" class="speech-bubble crab-bubble" :style="crabBubbleStyle" id="sprite-bubble-crab">
        {{ currentHint }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, inject, type ComponentPublicInstance } from 'vue'
import { PARALLAX_KEY } from '@/composables/useParallax'
import { LAYERS } from '@/constants/layers'
import { SPRITES } from '@/constants/sprites'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { createSeededRandom } from '@/utils/random'

const rand = createSeededRandom(400)

const SHARED_HINTS: readonly string[] = [
  '想聊聊心事，就点那块石头呀。',
  '想看看大家在讨论什么，就去木屋吧。',
  '点点贝壳，唤醒沉睡的记忆碎片。',
  '小车那边，藏着你们关系的小秘密哦。',
  '个人资料页里，可以慢慢整理你的专属设置。',
  '不知道先去哪？先点石头试试看吧。',
  '想更懂自己，就先去记忆小站逛逛。',
  '跟着好奇心走，你会找到想去的地方。',
  '嘿，我是小螃蟹，随时都在这里给你指路哦。',
]

const MOM_HINTS: readonly string[] = [
  '海星那边可以查看任务完成情况，去给他打个分吧。',
  '对着海螺说出心里话吧，它会替你好好收藏。',
]

const DAD_HINTS: readonly string[] = [
  '海星那边有今日任务，完成了会成长哦。',
  '去海螺那边看看她的心语，也许能更懂她。',
]

const layerEl = ref<HTMLElement | null>(null)
const bubbleLayerEl = ref<HTMLElement | null>(null)
const crabSpriteEl = ref<HTMLImageElement | null>(null)
const ctx = inject(PARALLAX_KEY)!
const uiStore = useUiStore()
const authStore = useAuthStore()

const crabHints = computed(() => {
  const roleHints = authStore.user?.role === 'dad' ? DAD_HINTS : MOM_HINTS
  return [...SHARED_HINTS, ...roleHints]
})

const showBubble = ref(false)
const currentHint = ref<string>(SHARED_HINTS[0])
const crabBubblePosition = ref<{ left: string, top: string } | null>(null)
let bubbleTimer: ReturnType<typeof setTimeout> | null = null

const CLICKABLE_SPRITES = new Set(['car', 'shell', 'star', 'conque', 'bar', 'stone', 'crab'])

const crabBubbleStyle = computed(() => crabBubblePosition.value ?? undefined)

function isSpriteClickable(id: string): boolean {
  return CLICKABLE_SPRITES.has(id)
}

function setSpriteEl(id: string, element: Element | ComponentPublicInstance | null) {
  if (id !== 'crab') {
    return
  }

  crabSpriteEl.value = element instanceof HTMLImageElement ? element : null
}

function updateCrabBubblePosition() {
  if (!crabSpriteEl.value || !bubbleLayerEl.value) {
    crabBubblePosition.value = null
    return
  }

  const crabRect = crabSpriteEl.value.getBoundingClientRect()
  const bubbleLayerRect = bubbleLayerEl.value.getBoundingClientRect()

  crabBubblePosition.value = {
    left: `${crabRect.left - bubbleLayerRect.left + crabRect.width * 0.12}px`,
    top: `${crabRect.top - bubbleLayerRect.top + crabRect.height * 0.16}px`,
  }
}

function clearBubbleTimer() {
  if (bubbleTimer) {
    clearTimeout(bubbleTimer)
    bubbleTimer = null
  }
}

function hideCrabHint() {
  clearBubbleTimer()
  showBubble.value = false
}

function pickRandomHint() {
  const hints = crabHints.value
  if (hints.length === 1) {
    return hints[0]
  }

  let nextHint = currentHint.value
  while (nextHint === currentHint.value) {
    nextHint = hints[Math.floor(rand() * hints.length)]
  }
  return nextHint
}

function showCrabHint() {
  updateCrabBubblePosition()
  currentHint.value = pickRandomHint()
  showBubble.value = true
  clearBubbleTimer()
  bubbleTimer = setTimeout(() => {
    showBubble.value = false
  }, 4200)
}

function onSpriteClick(id: string) {
  if (ctx.wasDrag()) return
  if (id === 'car') uiStore.openFeature('car')
  else if (id === 'shell') uiStore.openFeature('memory')
  else if (id === 'star') uiStore.openFeature('task')
  else if (id === 'conque') uiStore.openFeature('whisper')
  else if (id === 'bar') uiStore.openFeature('bar')
  else if (id === 'stone') uiStore.openFeature('chat')
  else if (id === 'crab') showCrabHint()
}

onMounted(() => {
  if (layerEl.value) {
    ctx.registerLayer(layerEl.value, LAYERS.sprites.speed)
  }
  if (bubbleLayerEl.value) {
    ctx.registerLayer(bubbleLayerEl.value, LAYERS.sprites.speed)
  }

  window.addEventListener('resize', updateCrabBubblePosition)
  requestAnimationFrame(updateCrabBubblePosition)
  document.addEventListener('pointerdown', hideCrabHint, true)
})

onUnmounted(() => {
  clearBubbleTimer()
  window.removeEventListener('resize', updateCrabBubblePosition)
  document.removeEventListener('pointerdown', hideCrabHint, true)
})
</script>

<style scoped>
.sprites-layer {
  width: 400vw;
  z-index: 30;
  top: calc(42% - 2px);
  height: calc(58% + 2px);
}

.sprite-bubble-layer {
  width: 400vw;
  height: 100%;
  top: 0;
  z-index: 120;
  pointer-events: none;
  overflow: visible;
}

.sprite {
  position: absolute;
  height: auto;
  pointer-events: none;
}

.sprite.clickable {
  pointer-events: auto;
  cursor: pointer;
  transition: transform 0.2s;
}

.sprite.clickable:hover {
  transform: scale(1.08);
}

.sprite.clickable:active {
  transform: scale(0.97);
}

.speech-bubble {
  position: absolute;
  background: rgba(255, 252, 246, 0.96);
  color: #5a3e2b;
  font-size: 0.95rem;
  line-height: 1.55;
  padding: 0.8em 1em;
  border-radius: 1.1em;
  white-space: nowrap;
  width: max-content;
  pointer-events: none;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.16);
  border: 1px solid rgba(255, 214, 170, 0.7);
  z-index: 1;
}

.crab-bubble {
  --bubble-shift-x: -10%;
  --bubble-shift-y: calc(-100% - 0.5rem);
  transform: translate(var(--bubble-shift-x), var(--bubble-shift-y));
}

.speech-bubble::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 2.2em;
  border-width: 8px 6px 0;
  border-style: solid;
  border-color: rgba(255, 252, 246, 0.96) transparent transparent;
}

.bubble-fade-enter-active,
.bubble-fade-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.bubble-fade-enter-from,
.bubble-fade-leave-to {
  opacity: 0;
  transform: translate(var(--bubble-shift-x, 0), calc(var(--bubble-shift-y, 0px) + 6px));
}
</style>
