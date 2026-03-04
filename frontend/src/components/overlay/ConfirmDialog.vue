<template>
  <Transition name="confirm">
    <div v-if="visible" class="confirm-backdrop" @click.self="$emit('cancel')">
      <div class="confirm-dialog">
        <p class="confirm-message">{{ message }}</p>
        <div class="confirm-actions">
          <button class="confirm-btn cancel" @click="$emit('cancel')">取消</button>
          <button class="confirm-btn ok" @click="$emit('confirm')">确定</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  message: string
}>()

defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<style scoped>
.confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.confirm-dialog {
  width: min(360px, 86vw);
  padding: 28px 24px 20px;
  background: var(--glass-bg-heavy);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--glass-border-strong);
  border-radius: 20px;
  box-shadow: var(--glass-shadow), var(--glass-inner-glow);
  text-align: center;
}

.confirm-message {
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-primary);
  margin-bottom: 24px;
}

.confirm-actions {
  display: flex;
  gap: 12px;
}

.confirm-btn {
  flex: 1;
  padding: 10px 0;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
  border: none;
}

.confirm-btn:active {
  transform: scale(0.97);
}

.confirm-btn.cancel {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.confirm-btn.ok {
  background: var(--accent-warm);
  color: #fff;
}

.confirm-btn.ok:hover {
  background: var(--accent-warm-hover);
}

/* Transition */
.confirm-enter-active { transition: opacity 0.25s ease; }
.confirm-enter-active .confirm-dialog { transition: transform 0.3s cubic-bezier(0.16,1,0.3,1); }
.confirm-leave-active { transition: opacity 0.2s ease; }
.confirm-leave-active .confirm-dialog { transition: transform 0.2s ease; }
.confirm-enter-from { opacity: 0; }
.confirm-enter-from .confirm-dialog { transform: scale(0.9); }
.confirm-leave-to { opacity: 0; }
.confirm-leave-to .confirm-dialog { transform: scale(0.95); }
</style>
