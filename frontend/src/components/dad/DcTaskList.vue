<template>
  <div class="dc-tab-content">
    <div class="dc-section-header">
      <div class="dc-sh-line"></div>
      <span class="dc-sh-text">SYS.TASKS_QUEUE</span>
    </div>

    <div v-if="loading" class="dc-state">
      <div class="dc-spinner"></div>
      <span>{{ hasAge ? 'GENERATING_DIRECTIVES...' : 'LOADING_SYSTEM...' }}</span>
    </div>

    <div v-else-if="sortedTasks.length === 0" class="dc-state">
      <span class="dc-state-icon">[ EMPTY ]</span>
      <span>NO_ACTIVE_TASKS</span>
      <button v-if="!hasAge" class="dc-action-btn" @click="$emit('open-age-picker')">> INITIALIZE_AGE</button>
      <button v-else class="dc-action-btn dc-action-btn-ghost" :disabled="regenerating" @click="$emit('regenerate')">
        {{ regenerating ? '> REGENERATING...' : '> REGENERATE_TASKS' }}
      </button>
    </div>

    <TransitionGroup v-else name="card-list" tag="div" class="dc-task-list">
      <DcTaskCard
        v-for="(t, index) in sortedTasks"
        :key="t.id"
        :task="t"
        :index="index"
        :completing="completing === t.id"
        @complete="$emit('complete', $event)"
      />
    </TransitionGroup>

    <p v-if="error" class="dc-error">> ERROR: {{ error }}</p>

    <button
      v-if="sortedTasks.length > 0 && hasAge"
      class="dc-action-btn dc-action-btn-outline dc-mt-4"
      :disabled="regenerating"
      @click="$emit('regenerate')"
    >
      {{ regenerating ? '> PROCESSING...' : '> OVERRIDE_TASKS' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { UserTaskItem } from '@/lib/api/task'
import DcTaskCard from './DcTaskCard.vue'

defineProps<{
  sortedTasks: UserTaskItem[]
  loading: boolean
  hasAge: boolean
  completing: string
  regenerating: boolean
  error: string
}>()

defineEmits<{
  complete: [task: UserTaskItem]
  regenerate: []
  'open-age-picker': []
}>()
</script>

<style scoped>
.dc-tab-content {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.dc-section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-top: 8px;
}

.dc-sh-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.06), transparent);
}

.dc-sh-text {
  font-family: var(--dc-font-mono);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 2px;
}

.dc-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.3);
  font-family: var(--dc-font-mono);
  font-size: 13px;
  text-align: center;
}

.dc-state-icon {
  font-size: 18px;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.1);
}

.dc-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.06);
  border-top-color: #7dd3fc;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.dc-task-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dc-error {
  margin-top: 16px;
  padding: 12px 16px;
  background: rgba(248, 113, 113, 0.08);
  border-left: 3px solid #f87171;
  color: #f87171;
  font-family: var(--dc-font-mono);
  font-size: 12px;
}

.dc-mt-4 { margin-top: 24px; }

/* Action buttons */
.dc-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 14px;
  background: rgba(15, 20, 25, 1);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  font-family: var(--dc-font-mono);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 1px;
}

.dc-action-btn:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.12);
}

.dc-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.dc-action-btn-outline { border-color: rgba(125, 211, 252, 0.3); color: #7dd3fc; }
.dc-action-btn-outline:hover:not(:disabled) { background: rgba(125, 211, 252, 0.08); }
.dc-action-btn-ghost { background: transparent; border-color: transparent; color: rgba(255, 255, 255, 0.3); }
.dc-action-btn-ghost:hover:not(:disabled) { border-color: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.7); }

/* TransitionGroup */
.card-list-enter-active { transition: all 0.4s ease-out; }
.card-list-leave-active { transition: all 0.3s ease-in; }
.card-list-enter-from { opacity: 0; transform: translateY(20px); }
.card-list-leave-to { opacity: 0; transform: translateX(-20px); }
.card-list-move { transition: transform 0.3s ease; }
</style>
