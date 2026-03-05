<template>
  <Transition name="car-page">
    <div v-if="visible" class="car-page">
      <button class="close-btn" @click="close" aria-label="关闭">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      </button>

      <div class="car-layout">
        <!-- LEFT: Photo Wall -->
        <div class="photo-wall">
          <div class="photo-grid">
            <div
              v-for="photo in wallPhotos"
              :key="photo.id"
              class="photo-frame"
            >
              <img :src="photo.cover_image_url!" alt="memoir cover" />
            </div>
            <div v-for="n in emptySlots" :key="'empty-' + n" class="photo-frame empty" />
          </div>
        </div>

        <!-- RIGHT: Avatar Frames + Profile Entry -->
        <div class="right-section">
          <div class="avatars">
            <div class="avatar-wrapper">
              <img class="avatar-photo" :src="avatarDefault" alt="dad avatar" />
              <img class="avatar-frame" :src="avatarFrame" alt="dad frame" />
            </div>
            <div class="avatar-wrapper">
              <img class="avatar-photo" :src="avatarDefault" alt="mom avatar" />
              <img class="avatar-frame" :src="avatarFrame" alt="mom frame" />
            </div>
          </div>
          <button class="profile-entry" @click="openProfile">
            个人资料
          </button>
        </div>
      </div>

      <!-- BOTTOM: Overflow Box -->
      <div
        v-if="overflowPhotos.length > 0"
        class="overflow-box"
        @click="showOverflow = !showOverflow"
      >
        <img :src="boxImg" class="box-icon" alt="overflow box" />
        <span class="box-badge">{{ overflowPhotos.length }}</span>
      </div>

      <!-- Overflow drawer -->
      <Transition name="drawer">
        <div v-if="showOverflow" class="overflow-drawer">
          <div class="overflow-grid">
            <img
              v-for="p in overflowPhotos"
              :key="p.id"
              :src="p.cover_image_url!"
              alt="memoir cover"
              class="overflow-photo"
            />
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useUiStore } from '@/stores/ui'
import { getMemoirs, type Memoir } from '@/lib/api/echo'

import avatarFrame from '@/assets/frame.png'
import avatarDefault from '@/assets/avatar.png'
import boxImg from '@/assets/box.png'

const uiStore = useUiStore()

const memoirs = ref<Memoir[]>([])
const showOverflow = ref(false)

const visible = computed(() => uiStore.activePanel === 'car')

const wallPhotos = computed(() =>
  memoirs.value.filter((m) => m.cover_image_url).slice(0, 9),
)

const overflowPhotos = computed(() =>
  memoirs.value.filter((m) => m.cover_image_url).slice(9),
)

const emptySlots = computed(() => Math.max(0, 9 - wallPhotos.value.length))

function close() {
  uiStore.closePanel()
}

function openProfile() {
  uiStore.openPanel('profile')
}

watch(visible, async (isVisible) => {
  if (isVisible) {
    showOverflow.value = false
    try {
      const res = await getMemoirs(50, 0)
      memoirs.value = res.memoirs
    } catch {
      // silent
    }
  }
})
</script>

<style scoped>
.car-page {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: url('@/assets/car-bg.png') center / 100% 100% no-repeat;
  background-color: #3a2f28;
  display: flex;
  flex-direction: column;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  color: var(--text-primary, #fff);
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.08);
}

.car-layout {
  display: flex;
  height: 100%;
  padding: 5vh 5vw;
  gap: 4vw;
  align-items: center;
}

/* ── Photo Wall (Left) ── */
.photo-wall {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  width: 100%;
  max-width: 420px;
}

.photo-frame {
  aspect-ratio: 3 / 4;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.photo-frame:hover:not(.empty) {
  transform: scale(1.03);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.photo-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-frame.empty {
  background: rgba(255, 255, 255, 0.04);
  border: 1px dashed rgba(255, 255, 255, 0.12);
}

/* ── Right Section ── */
.right-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 48px;
  min-width: 400px;
  align-self: flex-start;
  margin-top: 18vh;
  margin-right: 8vw;
}

.avatars {
  display: flex;
  gap: 40px;
}

.avatar-wrapper {
  position: relative;
  width: 160px;
  height: 160px;
}

.avatar-photo {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 70%;
  height: 70%;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

.profile-entry {
  padding: 16px 44px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 34px;
  color: var(--text-primary, #fff);
  font-size: 22px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
}

.profile-entry:hover {
  background: rgba(255, 255, 255, 0.18);
  transform: scale(1.04);
}

/* ── Overflow Box (Bottom) ── */
.overflow-box {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.overflow-box:hover {
  transform: translateX(-50%) scale(1.08);
}

.box-icon {
  width: 56px;
  height: 56px;
  object-fit: contain;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
}

.box-badge {
  position: absolute;
  top: -6px;
  right: -10px;
  min-width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  background: var(--accent-warm, #ff9f43);
  border-radius: 11px;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

/* ── Overflow Drawer ── */
.overflow-drawer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 45vh;
  background: rgba(30, 25, 20, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px 20px 0 0;
  padding: 24px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.overflow-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
}

.overflow-photo {
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: transform 0.2s;
}

.overflow-photo:hover {
  transform: scale(1.05);
}

/* ── Transitions ── */
.car-page-enter-active {
  transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.car-page-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.car-page-enter-from {
  opacity: 0;
  transform: scale(0.96);
}

.car-page-leave-to {
  opacity: 0;
  transform: scale(0.97);
}

.drawer-enter-active {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
}

.drawer-leave-active {
  transition: transform 0.25s ease, opacity 0.2s ease;
}

.drawer-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.drawer-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
