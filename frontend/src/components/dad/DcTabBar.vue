<template>
  <nav class="dc-tabbar">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      :class="['dc-tab', { active: modelValue === tab.key }]"
      @click="$emit('update:modelValue', tab.key)"
    >
      <span class="dc-tab-label">{{ tab.label }}</span>
      <span class="dc-tab-sub">{{ tab.sub }}</span>
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
  { key: 'tasks', label: 'SYS.TASKS', sub: '任务队列' },
  { key: 'dashboard', label: 'SYS.TELEMETRY', sub: '系统遥测' },
  { key: 'chat', label: 'SYS.COMMS', sub: '通信频道' },
  { key: 'community', label: 'SYS.NETWORK', sub: '外部网络' },
  { key: 'whisper', label: 'SYS.DECRYPT', sub: '解密日志' },
  { key: 'profile', label: 'SYS.CONFIG', sub: '系统配置' },
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
  background: rgba(10, 14, 20, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding: 0 12px;
  gap: 0;
}

.dc-tabbar::-webkit-scrollbar { display: none; }

.dc-tab {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 12px 14px 10px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
  position: relative;
}

.dc-tab-label {
  font-family: var(--dc-font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.dc-tab-sub {
  font-family: var(--dc-font-mono);
  font-size: 9px;
  opacity: 0.6;
  white-space: nowrap;
}

.dc-tab:hover {
  color: rgba(255, 255, 255, 0.6);
}

.dc-tab.active {
  color: #fff;
}

.dc-tab.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 8px;
  right: 8px;
  height: 2px;
  background: linear-gradient(90deg, #7dd3fc, #a78bfa, #f0abfc, #67e8f9);
  background-size: 200% 200%;
  animation: iri-shift 6s ease-in-out infinite;
  border-radius: 1px;
}

@keyframes iri-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
</style>
