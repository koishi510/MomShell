// frontend/components/coach/index.ts
/**
 * Coach 组件导出
 */

export { CoachBackground } from "./CoachBackground";
export { EnergyRing, MetricLegend } from "./EnergyRing";
export {
  ExerciseCard,
  ExerciseCardSkeleton,
  ExerciseCardGrid,
  type ExerciseCardProps,
} from "./ExerciseCard";
export {
  SessionProgress,
  SessionProgressOverlay,
  CircularProgress,
  type SessionProgressProps,
} from "./SessionProgress";
export {
  AchievementBadge,
  AchievementGrid,
  NewAchievementModal,
  AchievementProgress,
  type AchievementBadgeProps,
} from "./AchievementBadge";
export {
  PoseOverlay,
  PoseGuide,
  PoseQualityIndicator,
  type PoseOverlayHandle,
  type PoseOverlayProps,
  type Keypoint,
} from "./PoseOverlay";
export {
  FeedbackToast,
  FeedbackPanel,
  FeedbackHistory,
  ScorePopup,
  PhaseTransition,
  type Feedback,
  type FeedbackType,
  type FeedbackToastProps,
  type FeedbackPanelProps,
} from "./FeedbackToast";
