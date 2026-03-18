<template>
  <div class="dc-tab-content">
    <div class="dc-section-head">
      <div class="dc-section-header">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="dc-sh-icon"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path></svg>
        <span class="dc-sh-text">./issue</span>
      </div>
      <button
        class="dc-header-action-btn"
        type="button"
        :disabled="regenerating"
        @click="$emit('regenerate-intel')"
      >
        <svg v-if="regenerating" class="dc-spin" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
        <svg v-else viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
        <span>{{ regenerating ? '重生成中...' : '重新生成' }}</span>
      </button>
    </div>

    <div v-if="loading" class="dc-state">
      <div class="dc-spinner"></div>
      <span>正在同步任务计划...</span>
    </div>

    <div v-else-if="sortedTasks.length === 0" class="dc-state">
      <span class="dc-state-icon">等待新情报</span>
      <span>当前无待办任务</span>
      <span class="dc-state-copy">暂无新任务，请等待心语情报同步。</span>
    </div>

    <div v-else class="dc-task-sections">
      <section
        v-for="section in groupedTasks"
        :key="section.priority"
        class="dc-task-section"
      >
        <div class="dc-task-section-head">
          <h3 class="dc-task-section-title">{{ section.label }}</h3>
          <span class="dc-task-section-count">{{ section.tasks.length }}</span>
        </div>
        <TransitionGroup name="card-list" tag="div" class="dc-task-list">
          <DcTaskCard
            v-for="(t, index) in section.tasks"
            :key="t.id"
            :task="t"
            :index="index"
            :completing="completing === t.id"
            @complete="$emit('complete', $event)"
          />
        </TransitionGroup>
      </section>
    </div>

    <p v-if="error" class="dc-error">{{ error }}</p>
    <p v-if="actionError" class="dc-error">{{ actionError }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { UserTaskItem } from '@/lib/api/task'
import DcTaskCard from './DcTaskCard.vue'

const props = defineProps<{
  sortedTasks: UserTaskItem[]
  loading: boolean
  completing: string
  error: string
  regenerating: boolean
  actionError: string
}>()

defineEmits<{
  complete: [task: UserTaskItem]
  'regenerate-intel': []
}>()

const priorityLabels: Record<string, string> = {
  T0: '紧急',
  T1: '重要',
  T2: '日常',
}

const groupedTasks = computed(() =>
  ['T0', 'T1', 'T2']
    .map((priority) => ({
      priority,
      label: priorityLabels[priority],
      tasks: props.sortedTasks.filter((task) => (task.priority || 'T2').toUpperCase() === priority),
    }))
    .filter((section) => section.tasks.length > 0),
)
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

.dc-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.dc-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 20px;
  color: var(--dc-comment, #565F89);
  font-family: var(--dc-font-mono);
  font-size: 13px;
  text-align: center;
}

.dc-state-icon {
  font-size: 18px;
  color: var(--dc-accent, #7DCFFF);
}

.dc-state-copy {
  max-width: 360px;
  line-height: 1.7;
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

.dc-task-section-title,
.dc-header-action-btn {
  font-family: var(--dc-font-mono);
}

.dc-task-section-title {
  margin: 0;
  color: var(--dc-text, #C0CAF5);
  font-size: 13px;
}

.dc-task-section-count {
  color: var(--dc-comment, #565F89);
  font-family: var(--dc-font-mono);
  font-size: 12px;
}

.dc-header-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid rgba(125, 207, 255, 0.3);
  color: var(--dc-accent, #7DCFFF);
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 2px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.dc-header-action-btn:hover:not(:disabled) {
  background: rgba(125, 207, 255, 0.1);
  border-color: var(--dc-accent, #7DCFFF);
}

.dc-header-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dc-spin {
  animation: dc-spin 1s linear infinite;
}

@keyframes dc-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.dc-task-sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dc-task-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dc-task-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--dc-border, rgba(255, 255, 255, 0.15));
}

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

.card-list-enter-active { transition: all 0.4s ease-out; }
.card-list-leave-active { transition: all 0.3s ease-in; }
.card-list-enter-from { opacity: 0; transform: translateY(20px); }
.card-list-leave-to { opacity: 0; transform: translateX(-20px); }
.card-list-move { transition: transform 0.3s ease; }

@media (max-width: 768px) {
  .dc-section-head,
  .dc-task-section-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
