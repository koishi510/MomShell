<template>
  <nav class="dc-tabbar">
    <button
      v-for="tab in visibleTabs"
      :key="tab.key"
      :class="['dc-tab', { active: modelValue === tab.key }]"
      @click="$emit('update:modelValue', tab.key)"
    >
      <span class="dc-tab-label">{{ tab.label }}</span>
      <span
        v-if="tab.key !== 'home'"
        class="dc-tab-close"
        @click.stop="$emit('close', tab.key)"
      >&times;</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: string
  openTabs: string[]
}>()

defineEmits<{
  'update:modelValue': [value: string]
  'close': [key: string]
}>()

const allTabs = [
  { key: 'home', label: '主页' },
  { key: 'tasks', label: '任务队列' },
  { key: 'dashboard', label: '系统遥测' },
  { key: 'chat', label: 'AI通信' },
  { key: 'community', label: '互助网络' },
  { key: 'whisper', label: '心语情报' },
  { key: 'profile', label: '个人资料' },
]

const visibleTabs = computed(() =>
  allTabs.filter((t) => props.openTabs.includes(t.key))
)
</script>

<style scoped>
.dc-tabbar {
  position: relative;
  z-index: 10;
  flex-shrink: 0;
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
  background: var(--dc-bg2, #24283B);
  border-bottom: 1px solid var(--dc-border, rgba(255, 255, 255, 0.15));
  padding: 0 4px;
  gap: 2px;
  align-items: flex-end;
}

.dc-tabbar::-webkit-scrollbar { display: none; }

.dc-tab {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  background: transparent;
  border: 1px solid transparent;
  border-bottom: none;
  color: var(--dc-comment, #565F89);
  cursor: pointer;
  transition: color 0.2s, background-color 0.2s;
  position: relative;
  border-radius: 6px 6px 0 0;
  margin-top: 4px;
  font-size: 0;
}

.dc-tab-label {
  font-family: var(--dc-font-mono);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}

.dc-tab-close {
  font-size: 14px;
  line-height: 1;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s, color 0.15s;
  color: var(--dc-comment, #565F89);
  flex-shrink: 0;
}

.dc-tab:hover .dc-tab-close,
.dc-tab.active .dc-tab-close {
  opacity: 0.6;
}

.dc-tab-close:hover {
  opacity: 1 !important;
  background: rgba(255, 255, 255, 0.1);
  color: var(--dc-danger, #F7768E);
}

.dc-tab:hover {
  background: rgba(255, 255, 255, 0.04);
  color: var(--dc-text, #C0CAF5);
}

.dc-tab.active {
  background: var(--dc-bg, #1A1B26);
  color: var(--dc-accent, #7DCFFF);
  border-color: var(--dc-border, rgba(255, 255, 255, 0.15));
  border-bottom-color: var(--dc-bg, #1A1B26);
  margin-bottom: -1px;
  padding-bottom: 8px;
}
</style>
