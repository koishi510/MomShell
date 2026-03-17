<template>
  <div class="dc-tab-content">
    <div class="dc-section-header">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="dc-sh-icon"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path></svg>
      <span class="dc-sh-text">./tasks</span>
    </div>

    <div v-if="loading" class="dc-state">
      <div class="dc-spinner"></div>
      <span>{{ hasAge ? '正在加载任务...' : '正在准备任务...' }}</span>
    </div>

    <div v-else-if="sortedTasks.length === 0" class="dc-state">
      <span class="dc-state-icon">暂无任务</span>
      <span>现在没有待处理的任务</span>
      <button v-if="!hasAge" class="dc-action-btn" @click="$emit('open-age-picker')">先选择成长阶段</button>
      <button v-else class="dc-action-btn dc-action-btn-ghost" :disabled="regenerating" @click="$emit('regenerate')">
        {{ regenerating ? '正在重新生成...' : '重新生成任务' }}
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

    <p v-if="error" class="dc-error">{{ error }}</p>

    <button
      v-if="sortedTasks.length > 0 && hasAge"
      class="dc-action-btn dc-action-btn-outline dc-mt-4"
      :disabled="regenerating"
      @click="$emit('regenerate')"
    >
      {{ regenerating ? '正在重新生成...' : '重新生成任务' }}
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
  gap: 8px;
  margin-bottom: 20px;
  padding-top: 8px;
  color: var(--dc-accent, #7DCFFF);
}

.dc-sh-icon {
  color: var(--dc-accent, #7DCFFF);
}

.dc-sh-text {
  font-family: var(--dc-font-mono);
  font-size: 13px;
  font-weight: bold;
}

.dc-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 60px 20px;
  color: var(--dc-comment, #565F89);
  font-family: var(--dc-font-mono);
  font-size: 13px;
  text-align: center;
}

.dc-state-icon {
  font-size: 18px;
  color: var(--dc-comment, #565F89);
}

.dc-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--dc-border, rgba(255, 255, 255, 0.15));
  border-top-color: var(--dc-accent, #7DCFFF);
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
  background: rgba(247, 118, 142, 0.08);
  border-left: 3px solid var(--dc-danger, #F7768E);
  color: var(--dc-danger, #F7768E);
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
  background: var(--dc-bg2, #24283B);
  border: 1px solid var(--dc-border, rgba(255, 255, 255, 0.15));
  border-radius: var(--dc-radius, 2px);
  color: var(--dc-text, #C0CAF5);
  font-family: var(--dc-font-mono);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dc-action-btn:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.3);
}

.dc-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.dc-action-btn-outline { border-color: var(--dc-accent, #7DCFFF); color: var(--dc-accent, #7DCFFF); background: transparent; }
.dc-action-btn-outline:hover:not(:disabled) { background: rgba(125, 207, 255, 0.1); }
.dc-action-btn-ghost { background: transparent; border-color: transparent; color: var(--dc-comment, #565F89); }
.dc-action-btn-ghost:hover:not(:disabled) { border-color: var(--dc-border, rgba(255, 255, 255, 0.15)); color: var(--dc-text, #C0CAF5); }

/* TransitionGroup */
.card-list-enter-active { transition: all 0.4s ease-out; }
.card-list-leave-active { transition: all 0.3s ease-in; }
.card-list-enter-from { opacity: 0; transform: translateY(20px); }
.card-list-leave-to { opacity: 0; transform: translateX(-20px); }
.card-list-move { transition: transform 0.3s ease; }
</style>
