"use client";

// frontend/components/guardian/GuardianDashboard.tsx
/**
 * Guardian Partner 主界面
 * 根据用户角色（妈妈/伴侣）显示不同界面
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  getBindingStatus,
  createInvite,
  acceptBind,
  recordDailyStatus,
  getDailyStatus,
  getDailyTasks,
  completeTask,
  confirmTask,
  rejectTask,
  getProgress,
} from "../../lib/api/guardian";
import type {
  BindingStatusResponse,
  InviteInfo,
  DailyStatusCreate,
  StatusNotification,
  DailyTask,
  ProgressInfo,
  MoodLevel,
  HealthCondition,
} from "../../types/guardian";
import {
  MOOD_LEVEL_LABELS,
  MOOD_LEVEL_EMOJIS,
  HEALTH_CONDITION_LABELS,
  PARTNER_LEVEL_LABELS,
  PARTNER_LEVEL_EMOJIS,
  TASK_DIFFICULTY_LABELS,
  TASK_DIFFICULTY_COLORS,
} from "../../types/guardian";

export default function GuardianDashboard() {
  const [bindingStatus, setBindingStatus] =
    useState<BindingStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load binding status
  const loadBindingStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const status = await getBindingStatus();
      setBindingStatus(status);
      setError(null);
    } catch (err: any) {
      console.error("Failed to load binding status:", err);
      // 401 means not logged in - redirect to login
      if (err.response?.status === 401) {
        window.location.href = "/auth/login?redirect=/guardian";
        return;
      }
      setError("加载失败，请重试");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBindingStatus();
  }, [loadBindingStatus]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadBindingStatus} />;
  }

  if (!bindingStatus?.has_binding) {
    return <NoBindingState onBindingCreated={loadBindingStatus} />;
  }

  if (bindingStatus.role === "mom") {
    return (
      <MomDashboard
        binding={bindingStatus}
        onStatusUpdated={loadBindingStatus}
      />
    );
  }

  return (
    <PartnerDashboard
      binding={bindingStatus}
      onTaskCompleted={loadBindingStatus}
    />
  );
}

// ============================================================
// Sub-components
// ============================================================

function LoadingState() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full"
      />
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-sm">
        <div className="text-4xl mb-4">😢</div>
        <p className="text-gray-600 mb-4">{message}</p>
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition"
        >
          重试
        </button>
      </div>
    </div>
  );
}

function NoBindingState({
  onBindingCreated,
}: {
  onBindingCreated: () => void;
}) {
  const [mode, setMode] = useState<"select" | "invite" | "bind">("select");
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateInvite = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const info = await createInvite();
      setInviteInfo(info);
      setMode("invite");
    } catch (err: any) {
      setError(err.response?.data?.detail || "创建邀请失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptBind = async () => {
    if (!inviteCode.trim()) {
      setError("请输入邀请码");
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      await acceptBind(inviteCode.trim());
      onBindingCreated();
    } catch (err: any) {
      setError(err.response?.data?.detail || "绑定失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full"
      >
        <Link
          href="/"
          className="text-gray-400 hover:text-gray-600 mb-4 inline-block"
        >
          ← 返回首页
        </Link>

        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🤝</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">伴侣守护</h1>
          <p className="text-gray-500">让伴侣成为你的贴心守护者</p>
        </div>

        <AnimatePresence mode="wait">
          {mode === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <button
                onClick={handleCreateInvite}
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-pink-400 to-rose-500 text-white rounded-2xl font-medium shadow-lg hover:shadow-xl transition disabled:opacity-50"
              >
                <span className="text-2xl mr-2">👩</span>
                我是妈妈，邀请伴侣
              </button>
              <button
                onClick={() => setMode("bind")}
                className="w-full py-4 bg-gradient-to-r from-blue-400 to-indigo-500 text-white rounded-2xl font-medium shadow-lg hover:shadow-xl transition"
              >
                <span className="text-2xl mr-2">👨</span>
                我是伴侣，输入邀请码
              </button>
            </motion.div>
          )}

          {mode === "invite" && inviteInfo && (
            <motion.div
              key="invite"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="text-center p-6 bg-green-50 rounded-2xl">
                <p className="text-gray-600 mb-2">分享邀请码给伴侣</p>
                <p className="text-3xl font-mono font-bold text-green-600 tracking-widest">
                  {inviteInfo.invite_code}
                </p>
              </div>
              <p className="text-center text-sm text-gray-400">
                邀请码48小时内有效
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(inviteInfo.invite_code);
                  alert("已复制到剪贴板");
                }}
                className="w-full py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition"
              >
                复制邀请码
              </button>
              <button
                onClick={() => setMode("select")}
                className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition"
              >
                返回
              </button>
            </motion.div>
          )}

          {mode === "bind" && (
            <motion.div
              key="bind"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="输入邀请码"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-center text-xl tracking-widest"
              />
              {error && (
                <p className="text-red-500 text-center text-sm">{error}</p>
              )}
              <button
                onClick={handleAcceptBind}
                disabled={isLoading}
                className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition disabled:opacity-50"
              >
                {isLoading ? "绑定中..." : "确认绑定"}
              </button>
              <button
                onClick={() => setMode("select")}
                className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition"
              >
                返回
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ============================================================
// Mom Dashboard
// ============================================================

function MomDashboard({
  binding,
  onStatusUpdated,
}: {
  binding: BindingStatusResponse;
  onStatusUpdated: () => void;
}) {
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<DailyTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [partnerInfo, setPartnerInfo] = useState(binding.partner_info);

  // Load tasks that need confirmation
  const loadTasks = useCallback(async () => {
    try {
      const tasks = await getDailyTasks();
      setPendingTasks(tasks.filter((t) => t.status === "completed"));
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setIsLoadingTasks(false);
    }
  }, []);

  // 静默刷新绑定信息（更新伴侣积分等）
  const silentRefreshBinding = useCallback(async () => {
    try {
      const status = await getBindingStatus();
      if (status.partner_info) {
        setPartnerInfo(status.partner_info);
      }
    } catch (err) {
      // 静默失败不处理
    }
  }, []);

  useEffect(() => {
    loadTasks();
    // 静默轮询：只更新任务列表和伴侣信息，不重载整个页面
    const interval = setInterval(() => {
      loadTasks();
      silentRefreshBinding();
    }, 15000);
    return () => clearInterval(interval);
  }, [loadTasks, silentRefreshBinding]);

  const handleConfirmTask = async (taskId: string, feedback: string) => {
    try {
      await confirmTask(taskId, feedback);
      setPendingTasks((prev) => prev.filter((t) => t.id !== taskId));
      // 静默刷新伴侣积分
      silentRefreshBinding();
    } catch (err) {
      console.error("Failed to confirm task:", err);
    }
  };

  // 拒绝任务（重置为可用状态）
  const handleRejectTask = async (taskId: string) => {
    try {
      await rejectTask(taskId);
      setPendingTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error("Failed to reject task:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-pink-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-gray-400 hover:text-gray-600">
            ← 返回
          </Link>
          <h1 className="font-bold text-gray-800">伴侣守护</h1>
          <div className="w-12" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Partner Info Card */}
        {partnerInfo ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-2xl text-white">
                {partnerInfo.avatar_url ? (
                  <img
                    src={partnerInfo.avatar_url}
                    alt=""
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  "👨"
                )}
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-gray-800">
                  {partnerInfo.nickname}
                </h2>
                <p className="text-gray-500 text-sm">
                  {PARTNER_LEVEL_EMOJIS[partnerInfo.level]}{" "}
                  {PARTNER_LEVEL_LABELS[partnerInfo.level]}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-500">
                  {partnerInfo.total_points}
                </p>
                <p className="text-xs text-gray-400">积分</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex gap-4 text-center">
              <div className="flex-1">
                <p className="text-lg font-bold text-orange-500">
                  🔥 {partnerInfo.current_streak}
                </p>
                <p className="text-xs text-gray-400">连续打卡</p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6 text-center"
          >
            <p className="text-gray-500">等待伴侣绑定...</p>
          </motion.div>
        )}

        {/* Record Status Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setShowStatusForm(true)}
          className="w-full py-4 bg-gradient-to-r from-pink-400 to-rose-500 text-white rounded-2xl font-medium shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2"
        >
          <span className="text-xl">📝</span>
          记录今日状态
        </motion.button>

        {/* Pending Confirmations */}
        {pendingTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h3 className="font-bold text-gray-800 mb-4">
              💝 伴侣完成了这些任务
            </h3>
            <div className="space-y-4">
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 bg-green-50 rounded-xl border border-green-100"
                >
                  <p className="font-medium text-gray-800">
                    {task.template.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {task.template.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["❤️", "👍", "😊", "🥰"].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleConfirmTask(task.id, emoji)}
                        className="px-4 py-2 bg-white rounded-lg hover:bg-gray-50 transition text-xl"
                      >
                        {emoji}
                      </button>
                    ))}
                    <button
                      onClick={() => handleRejectTask(task.id)}
                      className="px-4 py-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition text-sm"
                    >
                      ❌ 没完成
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>

      {/* Status Form Modal */}
      <AnimatePresence>
        {showStatusForm && (
          <StatusFormModal
            onClose={() => setShowStatusForm(false)}
            onSubmit={async (data) => {
              await recordDailyStatus(data);
              setShowStatusForm(false);
              onStatusUpdated();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// Partner Dashboard
// ============================================================

function PartnerDashboard({
  binding,
  onTaskCompleted,
}: {
  binding: BindingStatusResponse;
  onTaskCompleted: () => void;
}) {
  const [statusNotification, setStatusNotification] =
    useState<StatusNotification | null>(null);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async (silent = false) => {
    try {
      const [status, taskList, progressData] = await Promise.all([
        getDailyStatus(),
        getDailyTasks(),
        getProgress(),
      ]);
      setStatusNotification(status);
      setTasks(taskList);
      setProgress(progressData);
    } catch (err) {
      if (!silent) console.error("Failed to load data:", err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
    // 静默轮询：只更新数据状态，不触发 loading
    const interval = setInterval(() => loadData(true), 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleCompleteTask = async (taskId: string) => {
    try {
      await completeTask(taskId);
      // 立即更新本地状态
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: "completed" as const } : t,
        ),
      );
      // 静默刷新进度
      loadData(true);
    } catch (err) {
      console.error("Failed to complete task:", err);
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-gray-400 hover:text-gray-600">
            ← 返回
          </Link>
          <h1 className="font-bold text-gray-800">伴侣守护</h1>
          <div className="w-12" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Progress Card */}
        {progress && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  {PARTNER_LEVEL_EMOJIS[progress.current_level]}{" "}
                  {PARTNER_LEVEL_LABELS[progress.current_level]}
                </h2>
                <p className="text-gray-500 text-sm">
                  {progress.points_to_next_level
                    ? `距离下一等级还需 ${progress.points_to_next_level} 积分`
                    : "已达最高等级"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-green-500">
                  {progress.total_points}
                </p>
                <p className="text-xs text-gray-400">总积分</p>
              </div>
            </div>
            <div className="flex gap-4 text-center">
              <div className="flex-1 p-3 bg-gray-50 rounded-xl">
                <p className="text-lg font-bold text-orange-500">
                  🔥 {progress.current_streak}
                </p>
                <p className="text-xs text-gray-400">连续打卡</p>
              </div>
              <div className="flex-1 p-3 bg-gray-50 rounded-xl">
                <p className="text-lg font-bold text-blue-500">
                  ✅ {progress.tasks_confirmed}
                </p>
                <p className="text-xs text-gray-400">完成任务</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Mom Status Alert */}
        {statusNotification && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-2xl shadow-lg p-6 border border-pink-100"
          >
            <div className="flex items-start gap-4">
              <div className="text-3xl">
                {MOOD_LEVEL_EMOJIS[statusNotification.status.mood]}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800">
                  {statusNotification.message}
                </p>
                {statusNotification.suggestions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium text-pink-600">建议：</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {statusNotification.suggestions.map((s, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span>💡</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Daily Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h3 className="font-bold text-gray-800 mb-4">📋 今日任务</h3>
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`p-4 rounded-xl border-2 transition ${
                  task.status === "confirmed"
                    ? "bg-green-50 border-green-200"
                    : task.status === "completed"
                      ? "bg-yellow-50 border-yellow-200"
                      : "bg-white border-gray-100 hover:border-blue-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="px-2 py-0.5 text-xs font-medium rounded-full text-white"
                        style={{
                          backgroundColor:
                            TASK_DIFFICULTY_COLORS[task.template.difficulty],
                        }}
                      >
                        {TASK_DIFFICULTY_LABELS[task.template.difficulty]}
                      </span>
                      <span className="text-sm text-gray-400">
                        +{task.template.points}分
                      </span>
                    </div>
                    <p className="font-medium text-gray-800">
                      {task.template.title}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {task.template.description}
                    </p>
                  </div>
                  <div className="ml-4">
                    {task.status === "available" && (
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition"
                      >
                        完成
                      </button>
                    )}
                    {task.status === "completed" && (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm rounded-lg">
                        等待确认
                      </span>
                    )}
                    {task.status === "confirmed" && (
                      <span className="text-2xl">
                        {task.mom_feedback || "✅"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}

// ============================================================
// Status Form Modal
// ============================================================

function StatusFormModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: DailyStatusCreate) => Promise<void>;
}) {
  const [mood, setMood] = useState<MoodLevel>("neutral");
  const [energyLevel, setEnergyLevel] = useState(50);
  const [healthConditions, setHealthConditions] = useState<HealthCondition[]>(
    [],
  );
  const [feedingCount, setFeedingCount] = useState(0);
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        mood,
        energy_level: energyLevel,
        health_conditions: healthConditions,
        feeding_count: feedingCount,
        sleep_hours: sleepHours,
        notes: notes || null,
      });
    } catch (err) {
      console.error("Failed to submit status:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCondition = (condition: HealthCondition) => {
    setHealthConditions((prev) =>
      prev.includes(condition)
        ? prev.filter((c) => c !== condition)
        : [...prev, condition],
    );
  };

  const allConditions: HealthCondition[] = [
    "wound_pain",
    "hair_loss",
    "insomnia",
    "breast_pain",
    "back_pain",
    "fatigue",
    "emotional",
    "constipation",
    "sweating",
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">记录今日状态</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Mood */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              今天心情怎么样？
            </label>
            <div className="flex justify-between gap-2">
              {(Object.keys(MOOD_LEVEL_LABELS) as MoodLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => setMood(level)}
                  className={`flex-1 py-3 rounded-xl transition ${
                    mood === level
                      ? "bg-pink-100 border-2 border-pink-400"
                      : "bg-gray-50 border-2 border-transparent"
                  }`}
                >
                  <div className="text-2xl">{MOOD_LEVEL_EMOJIS[level]}</div>
                  <div className="text-xs mt-1 text-gray-600">
                    {MOOD_LEVEL_LABELS[level]}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Energy Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              能量值：{energyLevel}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={energyLevel}
              onChange={(e) => setEnergyLevel(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>很累</span>
              <span>精力充沛</span>
            </div>
          </div>

          {/* Health Conditions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              身体状况（可多选）
            </label>
            <div className="flex flex-wrap gap-2">
              {allConditions.map((condition) => (
                <button
                  key={condition}
                  onClick={() => toggleCondition(condition)}
                  className={`px-3 py-2 rounded-lg text-sm transition ${
                    healthConditions.includes(condition)
                      ? "bg-pink-100 text-pink-700 border border-pink-300"
                      : "bg-gray-100 text-gray-600 border border-transparent"
                  }`}
                >
                  {HEALTH_CONDITION_LABELS[condition]}
                </button>
              ))}
            </div>
          </div>

          {/* Feeding Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              昨晚喂奶次数
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setFeedingCount(Math.max(0, feedingCount - 1))}
                className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
              >
                -
              </button>
              <span className="text-2xl font-bold text-gray-800 w-8 text-center">
                {feedingCount}
              </span>
              <button
                onClick={() => setFeedingCount(feedingCount + 1)}
                className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
              >
                +
              </button>
            </div>
          </div>

          {/* Sleep Hours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              昨晚睡了多久（小时）
            </label>
            <input
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={sleepHours ?? ""}
              onChange={(e) =>
                setSleepHours(e.target.value ? Number(e.target.value) : null)
              }
              placeholder="例如：6.5"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-pink-400 focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              备注（可选）
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="想说点什么..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-pink-400 focus:outline-none resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-4 bg-gradient-to-r from-pink-400 to-rose-500 text-white rounded-xl font-medium hover:shadow-lg transition disabled:opacity-50"
          >
            {isSubmitting ? "保存中..." : "保存状态"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
