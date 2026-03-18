<template>
  <nav class="dc-tabbar">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      :class="['dc-tab', { active: modelValue === tab.key }]"
      @click="$emit('update:modelValue', tab.key)"
    >
      <!-- <span class="dc-tab-idx">{{ idx + 1 }}:</span> -->
      <span class="dc-tab-label">{{ tab.label }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const tabs = [
  { key: 'home', label: '主页' },
  { key: 'tasks', label: '任务队列' },
  { key: 'dashboard', label: '系统遥测' },
  { key: 'chat', label: 'AI通信' },
  { key: 'community', label: '互助网络' },
  { key: 'whisper', label: '心语情报' },
  { key: 'profile', label: '个人资料' },
]
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
  gap: 4px;
}

.dc-tabbar::-webkit-scrollbar { display: none; }

.dc-tab {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: transparent;
  border: none;
  color: var(--dc-comment, #565F89);
  cursor: pointer;
  transition: color 0.2s, background-color 0.2s;
  position: relative;
  border-radius: 2px 2px 0 0;
  margin-top: 4px;
}

.dc-tab-idx {
  font-family: var(--dc-font-mono);
  font-size: 12px;
  opacity: 0.7;
}

.dc-tab-label {
  font-family: var(--dc-font-mono);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}

.dc-tab:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--dc-text, #C0CAF5);
}

.dc-tab.active {
  background: var(--dc-bg, #1A1B26);
  color: var(--dc-accent, #7DCFFF);
  box-shadow: inset 0 2px 0 var(--dc-accent, #7DCFFF);
}
</style>
