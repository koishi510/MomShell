<template>
  <Transition name="dc-fade">
    <div v-if="visible" class="dc-dialog-backdrop" @click.self="$emit('close')">
      <div class="dc-term-modal dc-dialog-sm">
        <div class="dc-term-modal-header">
          <span>成长阶段</span>
          <button class="dc-term-modal-close" @click="$emit('close')">关闭</button>
        </div>
        <div class="dc-term-modal-body">
          <h3 class="dc-dialog-title">请选择宝宝当前所处的阶段</h3>
          <div class="dc-age-grid">
            <button
              v-for="opt in AGE_OPTIONS"
              :key="opt.value"
              :class="['dc-age-opt', { active: currentAge === opt.value }]"
              :disabled="disabled"
              @click="$emit('select', opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  currentAge: string
  disabled: boolean
}>()

defineEmits<{
  select: [value: string]
  close: []
}>()

const AGE_OPTIONS = [
  { value: 'pregnancy', label: '孕期' },
  { value: '0-3m', label: '0-3个月' },
  { value: '3-6m', label: '3-6个月' },
  { value: '6-12m', label: '6-12个月' },
  { value: '1-2y', label: '1-2岁' },
  { value: '2-3y', label: '2-3岁' },
  { value: '3-4y', label: '3-4岁' },
  { value: '4-5y', label: '4-5岁' },
] as const
</script>

<style scoped>
.dc-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(26, 27, 38, 0.9);
  padding: 20px;
}

.dc-term-modal {
  width: 100%;
  max-width: 500px;
  background: var(--dc-bg2, #24283B);
  border: 1px solid var(--dc-border, rgba(255, 255, 255, 0.15));
  border-radius: var(--dc-radius, 2px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.dc-dialog-sm { max-width: 400px; }

.dc-term-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--dc-bg, #1A1B26);
  border-bottom: 1px solid var(--dc-border, rgba(255, 255, 255, 0.15));
  font-family: var(--dc-font-mono);
  font-size: 12px;
  color: var(--dc-comment, #565F89);
}

.dc-term-modal-close {
  background: transparent;
  border: none;
  color: var(--dc-comment, #565F89);
  font-family: var(--dc-font-mono);
  font-size: 14px;
  cursor: pointer;
}
.dc-term-modal-close:hover { color: var(--dc-text, #C0CAF5); }

.dc-term-modal-body { padding: 24px; }

.dc-dialog-title {
  margin: 0 0 16px;
  font-family: var(--dc-font-mono);
  font-size: 16px;
  color: var(--dc-text, #C0CAF5);
}

.dc-age-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }

.dc-age-opt {
  padding: 16px;
  background: var(--dc-bg, #1A1B26);
  border: 1px solid var(--dc-border, rgba(255, 255, 255, 0.15));
  border-radius: var(--dc-radius, 2px);
  color: var(--dc-text, #C0CAF5);
  font-family: var(--dc-font-mono);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.dc-age-opt:hover:not(:disabled) { border-color: rgba(125, 207, 255, 0.3); background: rgba(125, 207, 255, 0.05); }

.dc-age-opt.active {
  background: rgba(125, 207, 255, 0.1);
  border-color: var(--dc-accent, #7DCFFF);
  color: var(--dc-accent, #7DCFFF);
}

.dc-age-opt:disabled { opacity: 0.5; cursor: not-allowed; }

.dc-fade-enter-active, .dc-fade-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.dc-fade-enter-from, .dc-fade-leave-to { opacity: 0; }
.dc-fade-enter-from .dc-term-modal, .dc-fade-leave-to .dc-term-modal { transform: translateY(20px); }
</style>
