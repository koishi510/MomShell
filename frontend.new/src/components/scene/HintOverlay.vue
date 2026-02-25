<template>
  <div class="hint" :class="{ hidden: isHidden }">
    Drag or press arrow keys to explore the coastline
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isHidden: boolean
}>()
</script>

<style scoped>
.hint {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  color: rgba(180, 130, 80, 0.6);
  font-family: 'Georgia', serif;
  font-size: 14px;
  letter-spacing: 1px;
  pointer-events: none;
  transition: opacity 2s ease;
}
.hint.hidden {
  opacity: 0;
}
</style>
