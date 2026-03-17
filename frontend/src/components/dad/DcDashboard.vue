<template>
  <div class="dc-tab-content">
    <div class="dc-section-header">
      <div class="dc-sh-line"></div>
      <span class="dc-sh-text">SYS.TELEMETRY</span>
    </div>

    <div v-if="loading" class="dc-state"><span>FETCHING_METRICS...</span></div>
    <div v-else-if="error" class="dc-error">> ERROR: {{ error }}</div>
    <div v-else class="dc-dashboard">
      <!-- Radar -->
      <div class="dc-panel dc-radar-section">
        <div class="dc-panel-label">[ CAPABILITY_MATRIX ]</div>
        <SkillRadarChart v-if="radar" :values="radar" />
      </div>

      <!-- Achievements -->
      <div class="dc-panel">
        <div class="dc-panel-head">
          <h3 class="dc-panel-title">BADGES [{{ unlockedCount }}/{{ achievements.length }}]</h3>
        </div>
        <div v-if="achievements.length === 0" class="dc-state dc-state-sm">NO_DATA</div>
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
            <span :class="['dc-ach-status', a.unlocked ? 'ok' : 'locked']">{{ a.unlocked ? '[GRANTED]' : '[LOCKED]' }}</span>
          </div>
        </div>
      </div>

      <!-- Perk Cards -->
      <div class="dc-panel">
        <div class="dc-panel-head">
          <h3 class="dc-panel-title">ASSETS.PERKS</h3>
        </div>
        <div v-if="perkCards.length === 0" class="dc-state dc-state-sm">INVENTORY_EMPTY</div>
        <div v-else class="dc-perk-grid">
          <div v-for="c in perkCards" :key="c.id" :class="['dc-perk-card', `dc-pst-${c.status}`]">
            <div class="dc-perk-card-inner">
              <div class="dc-perk-head">
                <span class="dc-perk-title">{{ c.title }}</span>
                <span class="dc-perk-badge">{{ perkStatusLabel(c.status) }}</span>
              </div>
              <p v-if="c.description" class="dc-perk-desc">{{ c.description }}</p>
              <div class="dc-perk-foot">
                <span class="dc-perk-time">
                  <template v-if="c.status === 'used'">DEPLETED</template>
                  <template v-else-if="c.status === 'expired'">EXPIRED</template>
                  <template v-else>READY</template>
                </span>
                <button
                  v-if="c.status === 'active'"
                  class="dc-perk-use-btn"
                  :disabled="usingPerk === c.id"
                  @click="$emit('use-perk', c.id)"
                >
                  {{ usingPerk === c.id ? '...' : '[ USE ]' }}
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
</script>

<style scoped>
.dc-tab-content { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.dc-section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding-top: 8px; }
.dc-sh-line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent); }
.dc-sh-text { font-family: var(--dc-font-mono); font-size: 12px; color: rgba(255,255,255,0.3); letter-spacing: 2px; }

.dc-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 60px 20px; color: rgba(255,255,255,0.3); font-family: var(--dc-font-mono); font-size: 13px; }
.dc-state-sm { padding: 30px 16px; }
.dc-error { margin-top: 16px; padding: 12px 16px; background: rgba(248,113,113,0.08); border-left: 3px solid #f87171; color: #f87171; font-family: var(--dc-font-mono); font-size: 12px; }

.dc-dashboard { display: flex; flex-direction: column; gap: 20px; }

.dc-panel {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 6px;
  padding: 20px;
}

.dc-panel-label {
  font-family: var(--dc-font-mono);
  font-size: 12px;
  color: #7dd3fc;
  margin-bottom: 16px;
  text-align: center;
  letter-spacing: 2px;
}

.dc-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  padding-bottom: 12px;
}

.dc-panel-title {
  margin: 0;
  font-family: var(--dc-font-mono);
  font-size: 14px;
  color: #fff;
}

/* Radar overrides */
.dc-radar-section :deep(.radar-wrap) { border-color: transparent; background: transparent; }
.dc-radar-section :deep(.value-fill) { fill: rgba(125, 211, 252, 0.15); }
.dc-radar-section :deep(.value-stroke) { stroke: #7dd3fc; }
.dc-radar-section :deep(.ring) { stroke: rgba(255,255,255,0.04); }
.dc-radar-section :deep(.axis) { stroke: rgba(255,255,255,0.04); }
.dc-radar-section :deep(.label) { fill: rgba(255,255,255,0.3); font-family: var(--dc-font-mono); font-size: 10px; }

/* Achievements */
.dc-ach-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }

.dc-ach-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 6px;
  transition: all 0.2s;
}

.dc-ach-item.unlocked {
  background: rgba(45, 212, 191, 0.04);
  border-color: rgba(45, 212, 191, 0.2);
  box-shadow: -3px 0 12px -4px rgba(125, 211, 252, 0.15);
}

.dc-ach-icon-wrap {
  width: 48px; height: 48px;
  border-radius: 4px;
  background: rgba(15, 20, 25, 1);
  border: 1px solid rgba(255,255,255,0.06);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}

.dc-ach-item.unlocked .dc-ach-icon-wrap { border-color: #2dd4bf; }

.dc-ach-icon { width: 100%; height: 100%; background-size: cover; background-position: center; }
.dc-ach-info { flex: 1; min-width: 0; }
.dc-ach-name { font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dc-ach-desc { font-size: 12px; color: rgba(255,255,255,0.3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.dc-ach-status {
  font-family: var(--dc-font-mono);
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
}

.dc-ach-status.ok { color: #2dd4bf; background: rgba(45,212,191,0.1); }
.dc-ach-status.locked { color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.05); }

/* Perks */
.dc-perk-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }

.dc-perk-card {
  position: relative;
  padding: 1px;
  background: rgba(255,255,255,0.06);
  border-radius: 6px;
  overflow: hidden;
}

.dc-perk-card.dc-pst-active {
  background: linear-gradient(135deg, #7dd3fc, #a78bfa, #f0abfc, #67e8f9);
  background-size: 200% 200%;
  animation: iri-shift 6s ease-in-out infinite;
}

@keyframes iri-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.dc-perk-card-inner {
  background: rgba(15, 20, 25, 1);
  padding: 16px;
  border-radius: 5px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.dc-perk-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.dc-perk-title { font-size: 15px; font-weight: 600; color: #fff; }

.dc-perk-badge {
  font-family: var(--dc-font-mono);
  font-size: 10px;
  color: #7dd3fc;
  border: 1px solid rgba(125,211,252,0.2);
  padding: 2px 6px;
  border-radius: 4px;
}

.dc-perk-desc { font-size: 13px; color: rgba(255,255,255,0.3); line-height: 1.5; margin: 0 0 16px; flex: 1; }

.dc-perk-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px dashed rgba(255,255,255,0.06);
  padding-top: 12px;
}

.dc-perk-time { font-family: var(--dc-font-mono); font-size: 11px; color: rgba(255,255,255,0.3); }

.dc-perk-use-btn {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid rgba(125,211,252,0.3);
  border-radius: 4px;
  color: #7dd3fc;
  font-family: var(--dc-font-mono);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.dc-perk-use-btn:hover:not(:disabled) { background: rgba(125,211,252,0.08); }
.dc-perk-use-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
