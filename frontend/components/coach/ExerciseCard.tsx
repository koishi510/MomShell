// frontend/components/coach/ExerciseCard.tsx
/**
 * 动作选择卡片组件
 * 展示单个康复动作的信息，支持点击开始训练
 */

'use client';

// 类别图标映射
const CATEGORY_ICONS: Record<string, string> = {
  breathing: '🌬️',
  pelvic_floor: '🧘',
  diastasis_recti: '💪',
  posture: '🧍',
  strength: '🏋️',
};

// 类别名称映射
const CATEGORY_NAMES: Record<string, string> = {
  breathing: '呼吸训练',
  pelvic_floor: '盆底肌',
  diastasis_recti: '腹直肌修复',
  posture: '体态矫正',
  strength: '力量训练',
};

// 难度名称映射
const DIFFICULTY_NAMES: Record<string, string> = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级',
};

// 难度颜色映射
const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-emerald-100 text-emerald-700',
  intermediate: 'bg-amber-100 text-amber-700',
  advanced: 'bg-rose-100 text-rose-700',
};

export interface ExerciseCardProps {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  sets: number;
  repetitions: number;
  onClick?: () => void;
}

export function ExerciseCard({
  name,
  description,
  category,
  difficulty,
  sets,
  repetitions,
  onClick,
}: ExerciseCardProps) {
  return (
    <div
      onClick={onClick}
      className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm
                 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer
                 border border-white/60 hover:border-[#e8a4b8]/30"
    >
      {/* 头部：图标 + 名称 + 难度 */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">
            {CATEGORY_ICONS[category] || '🧘'}
          </span>
          <h3 className="text-lg font-medium text-stone-700 group-hover:text-[#e8a4b8] transition-colors">
            {name}
          </h3>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          DIFFICULTY_COLORS[difficulty] || 'bg-stone-100 text-stone-600'
        }`}>
          {DIFFICULTY_NAMES[difficulty] || difficulty}
        </span>
      </div>

      {/* 描述 */}
      <p className="text-stone-500 text-sm mb-4 line-clamp-2 leading-relaxed min-h-[2.75rem]">
        {description?.substring(0, 80)}...
      </p>

      {/* 底部：分类标签 + 组数 */}
      <div className="flex justify-between items-center text-sm">
        <span className="text-stone-400 bg-stone-100 px-2 py-1 rounded-lg">
          {CATEGORY_NAMES[category] || category}
        </span>
        <span className="text-stone-600 font-medium">
          {sets}组 × {repetitions}次
        </span>
      </div>

      {/* 悬停时的渐变边框效果 */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background: 'linear-gradient(135deg, rgba(232,164,184,0.1) 0%, rgba(139,201,155,0.1) 100%)',
        }}
      />
    </div>
  );
}

// 动作卡片骨架屏
export function ExerciseCardSkeleton() {
  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 animate-pulse">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-stone-200 rounded-full" />
          <div className="w-24 h-5 bg-stone-200 rounded" />
        </div>
        <div className="w-12 h-5 bg-stone-200 rounded-full" />
      </div>
      <div className="space-y-2 mb-4">
        <div className="w-full h-4 bg-stone-200 rounded" />
        <div className="w-3/4 h-4 bg-stone-200 rounded" />
      </div>
      <div className="flex justify-between">
        <div className="w-16 h-6 bg-stone-200 rounded-lg" />
        <div className="w-20 h-6 bg-stone-200 rounded" />
      </div>
    </div>
  );
}

// 动作卡片网格组件
interface ExerciseCardGridProps {
  exercises: ExerciseCardProps[];
  onExerciseClick?: (exercise: ExerciseCardProps) => void;
  loading?: boolean;
}

export function ExerciseCardGrid({ exercises, onExerciseClick, loading }: ExerciseCardGridProps) {
  if (loading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <ExerciseCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="text-4xl mb-4 block">🔍</span>
        <p className="text-stone-500">暂无符合条件的动作</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {exercises.map((exercise) => (
        <ExerciseCard
          key={exercise.id}
          {...exercise}
          onClick={() => onExerciseClick?.(exercise)}
        />
      ))}
    </div>
  );
}
