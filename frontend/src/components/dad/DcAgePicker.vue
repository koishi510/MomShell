<template>
  <Transition name="dc-fade">
    <div v-if="visible" class="dc-dialog-backdrop" @click.self="$emit('close')">
      <div class="dc-term-modal dc-dialog-sm">
        <div class="dc-term-modal-header">
          <span>SYS.SET_AGE</span>
          <button class="dc-term-modal-close" @click="$emit('close')">[×]</button>
        </div>
        <div class="dc-term-modal-body">
          <h3 class="dc-dialog-title">SELECT_PARAMETER</h3>
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
  background: rgba(0, 0, 0, 0.8);
  padding: 20px;
}

.dc-term-modal {
  width: 100%;
  max-width: 500px;
  background: #0f1419;
  border: 1px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

.dc-term-modal::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 9px;
  background: linear-gradient(135deg, #7dd3fc, #a78bfa, #f0abfc, #67e8f9);
  background-size: 200% 200%;
  animation: iri-shift 6s ease-in-out infinite;
  z-index: -1;
  opacity: 0.5;
}

@keyframes iri-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.dc-dialog-sm { max-width: 400px; }

.dc-term-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #0a0e14;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-family: var(--dc-font-mono);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
}

.dc-term-modal-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.3);
  font-family: var(--dc-font-mono);
  font-size: 14px;
  cursor: pointer;
}
.dc-term-modal-close:hover { color: #fff; }

.dc-term-modal-body { padding: 24px; }

.dc-dialog-title {
  margin: 0 0 16px;
  font-family: var(--dc-font-mono);
  font-size: 16px;
  color: #fff;
}

.dc-age-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }

.dc-age-opt {
  padding: 16px;
  background: #0a0e14;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  font-family: var(--dc-font-mono);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.dc-age-opt:hover:not(:disabled) { border-color: rgba(125,211,252,0.2); background: rgba(125,211,252,0.04); }

.dc-age-opt.active {
  background: rgba(125,211,252,0.1);
  border-color: #7dd3fc;
  color: #7dd3fc;
  box-shadow: 0 0 15px rgba(125,211,252,0.15);
}

.dc-age-opt:disabled { opacity: 0.5; cursor: not-allowed; }

.dc-fade-enter-active, .dc-fade-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.dc-fade-enter-from, .dc-fade-leave-to { opacity: 0; transform: scale(0.98); }
</style>
