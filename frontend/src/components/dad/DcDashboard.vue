<template>
  <div class="dc-tab-content">
    <div class="dc-section-header">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="dc-sh-icon"><path d="M18 20V10m-6 10V4M6 20v-4"></path></svg>
      <span class="dc-sh-text">./status</span>
    </div>

    <div v-if="loading" class="dc-state"><span>正在加载成长数据...</span></div>
    <div v-else-if="error" class="dc-error">{{ error }}</div>
    <div v-else class="dc-dashboard">
      <!-- Radar -->
      <div class="dc-panel dc-radar-section dc-float" style="--float-i:0">
        <div class="dc-panel-label">能力雷达</div>
        <SkillRadarChart v-if="radar" :values="radar" />
      </div>

      <!-- Achievements -->
      <div class="dc-panel dc-float" style="--float-i:1">
        <div class="dc-panel-head">
          <h3 class="dc-panel-title">成就徽章（{{ unlockedCount }}/{{ achievements.length }}）</h3>
        </div>
        <div v-if="achievements.length === 0" class="dc-state dc-state-sm">暂时还没有成就</div>
        <div v-else class="dc-ach-list">
          <div
            v-for="a in sortedAchievements"
            :key="a.id"
            :class="['dc-ach-item', { unlocked: a.unlocked }]"
          >
            <div class="dc-ach-icon-wrap">
              <div class="dc-ach-icon" :style="{ backgroundImage: a.icon_url ? `url(${a.icon_url})` : undefined }" />
            </div>
            <div class="dc-ach-info">
              <div class="dc-ach-name">{{ a.title }}</div>
              <div class="dc-ach-desc">{{ a.description }}</div>
            </div>
            <span :class="['dc-ach-status', a.unlocked ? 'ok' : 'locked']">{{ a.unlocked ? '已解锁' : '未解锁' }}</span>
          </div>
        </div>
      </div>

      <!-- Perk Cards -->
      <div class="dc-panel dc-float" style="--float-i:2">
        <div class="dc-panel-head">
          <h3 class="dc-panel-title">特权卡片</h3>
        </div>
        <div v-if="perkCards.length === 0" class="dc-state dc-state-sm">暂时还没有特权卡</div>
        <div v-else class="dc-perk-grid">
          <div v-for="c in perkCards" :key="c.id" :class="['dc-perk-card', `dc-pst-${c.status}`]">
            <div class="dc-perk-card-inner">
              <div class="dc-perk-head">
                <span class="dc-perk-title">{{ c.title }}</span>
                <span class="dc-perk-badge">{{ perkStatusLabel(c.status) }}</span>
              </div>
              <p v-if="c.description" class="dc-perk-desc">{{ c.description }}</p>
              <div class="dc-perk-foot">
                <span class="dc-perk-time">{{ perkTimeLabel(c.status) }}</span>
                <button
                  v-if="c.status === 'active'"
                  class="dc-perk-use-btn"
                  :disabled="usingPerk === c.id"
                  @click="$emit('use-perk', c.id)"
                >
                  {{ usingPerk === c.id ? '使用中...' : '立即使用' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SkillRadarChart from '@/components/task/SkillRadarChart.vue'
import type { SkillRadar, AchievementItem } from '@/lib/api/task'
import type { PerkCardItem } from '@/lib/api/perkCard'

const props = defineProps<{
  loading: boolean
  error: string
  radar: SkillRadar | null
  achievements: AchievementItem[]
  perkCards: PerkCardItem[]
  usingPerk: string
}>()

defineEmits<{
  'use-perk': [id: string]
}>()

const unlockedCount = computed(() => props.achievements.filter((a) => a.unlocked).length)
const sortedAchievements = computed(() =>
  [...props.achievements].sort((a, b) => {
    if (a.unlocked === b.unlocked) return a.title.localeCompare(b.title, 'zh-Hans-CN')
    return a.unlocked ? -1 : 1
  }),
)

function perkStatusLabel(s: string): string {
  if (s === 'active') return '可用'
  if (s === 'used') return '已使用'
  if (s === 'expired') return '已过期'
  return s
}

function perkTimeLabel(s: string): string {
  if (s === 'used') return '已用完'
  if (s === 'expired') return '已失效'
  return '可立即使用'
}
</script>

<style scoped>
.dc-tab-content { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.dc-float {
  animation: floatUp 0.4s ease-out both;
  animation-delay: calc(var(--float-i, 0) * 0.06s);
}
@keyframes floatUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.dc-section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; padding-top: 8px; color: var(--dc-accent, #7DCFFF); }
.dc-sh-icon { color: var(--dc-accent, #7DCFFF); }
.dc-sh-text { font-family: var(--dc-font-mono); font-size: 13px; font-weight: bold; }

.dc-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 60px 20px; color: var(--dc-comment, #565F89); font-family: var(--dc-font-mono); font-size: 13px; }
.dc-state-sm { padding: 30px 16px; }
.dc-error { margin-top: 16px; padding: 12px 16px; background: rgba(247, 118, 142, 0.08); border-left: 3px solid var(--dc-danger, #F7768E); color: var(--dc-danger, #F7768E); font-family: var(--dc-font-mono); font-size: 12px; }

.dc-dashboard { display: flex; flex-direction: column; gap: 20px; }

.dc-panel {
  background: var(--dc-surface, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--dc-border, rgba(255, 255, 255, 0.15));
  border-radius: var(--dc-radius, 2px);
  padding: 20px;
}

.dc-panel-label {
  font-family: var(--dc-font-mono);
  font-size: 12px;
  color: var(--dc-accent, #7DCFFF);
  margin-bottom: 16px;
  text-align: center;
}

.dc-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--dc-border, rgba(255, 255, 255, 0.15));
  padding-bottom: 12px;
}

.dc-panel-title {
  margin: 0;
  font-family: var(--dc-font-mono);
  font-size: 14px;
  color: var(--dc-text, #C0CAF5);
}

/* Radar overrides */
.dc-radar-section :deep(.radar-wrap) { border-color: transparent; background: transparent; }
.dc-radar-section :deep(.value-fill) { fill: rgba(125, 207, 255, 0.15); }
.dc-radar-section :deep(.value-stroke) { stroke: var(--dc-accent, #7DCFFF); }
.dc-radar-section :deep(.ring) { stroke: var(--dc-border, rgba(255, 255, 255, 0.15)); }
.dc-radar-section :deep(.axis) { stroke: var(--dc-border, rgba(255, 255, 255, 0.15)); }
.dc-radar-section :deep(.label) { fill: var(--dc-comment, #565F89); font-family: var(--dc-font-mono); font-size: 10px; }

/* Achievements */
.dc-ach-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }

.dc-ach-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--dc-bg2, #24283B);
  border: 1px solid var(--dc-border, rgba(255, 255, 255, 0.15));
  border-radius: var(--dc-radius, 2px);
  transition: all 0.2s;
}

.dc-ach-item.unlocked {
  background: rgba(158, 206, 106, 0.05);
  border-color: var(--dc-success, #9ECE6A);
}

.dc-ach-icon-wrap {
  width: 48px; height: 48px;
  border-radius: var(--dc-radius, 2px);
  background: var(--dc-bg, #1A1B26);
  border: 1px solid var(--dc-border, rgba(255, 255, 255, 0.15));
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}

.dc-ach-item.unlocked .dc-ach-icon-wrap { border-color: var(--dc-success, #9ECE6A); }

.dc-ach-icon { width: 100%; height: 100%; background-size: cover; background-position: center; }
.dc-ach-info { flex: 1; min-width: 0; }
.dc-ach-name { font-size: 14px; font-weight: 600; color: var(--dc-text, #C0CAF5); margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dc-ach-desc { font-size: 12px; color: var(--dc-comment, #565F89); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.dc-ach-status {
  font-family: var(--dc-font-mono);
  font-size: 10px;
  padding: 4px 8px;
  border-radius: var(--dc-radius, 2px);
  white-space: nowrap;
}

.dc-ach-status.ok { color: var(--dc-success, #9ECE6A); border: 1px solid rgba(158, 206, 106, 0.3); }
.dc-ach-status.locked { color: var(--dc-comment, #565F89); border: 1px solid var(--dc-border, rgba(255, 255, 255, 0.15)); }

/* Perks */
.dc-perk-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }

.dc-perk-card {
  position: relative;
  background: var(--dc-bg2, #24283B);
  border: 1px solid var(--dc-border, rgba(255, 255, 255, 0.15));
  border-radius: var(--dc-radius, 2px);
  overflow: hidden;
}

.dc-perk-card.dc-pst-active {
  border-color: var(--dc-accent, #7DCFFF);
}

.dc-perk-card-inner {
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.dc-perk-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.dc-perk-title { font-size: 14px; font-weight: 600; color: var(--dc-text, #C0CAF5); font-family: var(--dc-font-mono); }

.dc-perk-badge {
  font-family: var(--dc-font-mono);
  font-size: 10px;
  color: var(--dc-accent, #7DCFFF);
  border: 1px solid rgba(125, 207, 255, 0.3);
  padding: 2px 6px;
  border-radius: var(--dc-radius, 2px);
}

.dc-perk-desc { font-size: 12px; color: var(--dc-comment, #565F89); line-height: 1.5; margin: 0 0 16px; flex: 1; }

.dc-perk-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px dashed var(--dc-border, rgba(255, 255, 255, 0.15));
  padding-top: 12px;
}

.dc-perk-time { font-family: var(--dc-font-mono); font-size: 11px; color: var(--dc-comment, #565F89); }

.dc-perk-use-btn {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--dc-accent, #7DCFFF);
  border-radius: var(--dc-radius, 2px);
  color: var(--dc-accent, #7DCFFF);
  font-family: var(--dc-font-mono);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.dc-perk-use-btn:hover:not(:disabled) { background: rgba(125, 207, 255, 0.1); }
.dc-perk-use-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
