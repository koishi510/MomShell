// frontend/app/echo/mom/meditation/page.tsx
/**
 * 冥想页面 - 呼吸引导与场景沉浸
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AuthGuard } from "../../../../components/AuthGuard";
import { ECHO_COLORS } from "../../../../lib/design-tokens";
import {
  matchScenes,
  matchAudio,
  startMeditation,
  endMeditation,
} from "../../../../lib/api/echo";
import { MeditationTimer } from "../../../../components/echo/mom/MeditationTimer";
import { GlassWindow } from "../../../../components/echo/GlassWindow";
import type {
  Scene,
  Audio,
  MeditationStartResponse,
  MeditationPhase,
} from "../../../../types/echo";
import {
  BREATHING_RHYTHM,
  BREATHING_CYCLE_SECONDS,
  MEDITATION_DURATIONS,
} from "../../../../types/echo";

type MeditationState = "setup" | "active" | "completed";

function MeditationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSceneId = searchParams.get("scene");

  const [state, setState] = useState<MeditationState>("setup");
  const [loading, setLoading] = useState(true);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [audios, setAudios] = useState<Audio[]>([]);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<Audio | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(10);
  const [session, setSession] = useState<MeditationStartResponse | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<MeditationPhase>("inhale");
  const [completed, setCompleted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    try {
      const [scenesData, audiosData] = await Promise.all([
        matchScenes(6),
        matchAudio(6),
      ]);
      setScenes(scenesData);
      setAudios(audiosData);

      // 如果有初始场景ID，选中它
      if (initialSceneId) {
        const scene = scenesData.find((s) => s.id === initialSceneId);
        if (scene) setSelectedScene(scene);
      }
    } catch (error) {
      console.error("Failed to load resources:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    try {
      const sessionData = await startMeditation({
        target_duration_minutes: selectedDuration,
        scene_id: selectedScene?.id,
        audio_id: selectedAudio?.id,
      });
      setSession(sessionData);
      setState("active");

      // 播放音频
      if (selectedAudio) {
        audioRef.current = new Audio(selectedAudio.audio_url);
        audioRef.current.loop = true;
        audioRef.current.volume = 0.5;
        audioRef.current.play().catch(() => {
          // 自动播放可能被阻止
        });
      }
    } catch (error) {
      console.error("Failed to start meditation:", error);
    }
  };

  const handleEnd = async (actualSeconds: number) => {
    if (!session) return;

    try {
      // 停止音频
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const result = await endMeditation({
        session_id: session.session_id,
        actual_duration_seconds: actualSeconds,
      });
      setCompleted(result.completed);
      setState("completed");
    } catch (error) {
      console.error("Failed to end meditation:", error);
      setState("completed");
    }
  };

  const handleBack = () => {
    if (state === "active") {
      handleEnd(elapsedSeconds);
    } else {
      router.push("/echo/mom");
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${ECHO_COLORS.mom.gradient[0]} 0%, ${ECHO_COLORS.mom.gradient[1]} 100%)`,
        }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-lg"
          style={{ color: ECHO_COLORS.mom.text }}
        >
          正在准备冥想环境...
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          state === "active"
            ? "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)"
            : `linear-gradient(135deg, ${ECHO_COLORS.mom.gradient[0]} 0%, ${ECHO_COLORS.mom.gradient[1]} 100%)`,
      }}
    >
      {/* 设置阶段 */}
      <AnimatePresence mode="wait">
        {state === "setup" && (
          <motion.div
            key="setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen p-4"
          >
            {/* 返回按钮 */}
            <button
              onClick={handleBack}
              className="p-2 rounded-full bg-white/30 hover:bg-white/50 transition-colors mb-4"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <h1
              className="text-2xl font-bold mb-6 text-center"
              style={{ color: ECHO_COLORS.mom.text }}
            >
              准备冥想
            </h1>

            {/* 时长选择 */}
            <section className="mb-6">
              <h2
                className="text-lg font-medium mb-3"
                style={{ color: ECHO_COLORS.mom.text }}
              >
                选择时长
              </h2>
              <div className="flex gap-2 flex-wrap">
                {MEDITATION_DURATIONS.map((duration) => (
                  <motion.button
                    key={duration}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedDuration(duration)}
                    className={`px-4 py-2 rounded-full font-medium transition-colors ${
                      selectedDuration === duration
                        ? "bg-white text-amber-800 shadow-md"
                        : "bg-white/30 hover:bg-white/50"
                    }`}
                    style={{
                      color:
                        selectedDuration === duration
                          ? undefined
                          : ECHO_COLORS.mom.text,
                    }}
                  >
                    {duration} 分钟
                  </motion.button>
                ))}
              </div>
            </section>

            {/* 场景选择 */}
            <section className="mb-6">
              <h2
                className="text-lg font-medium mb-3"
                style={{ color: ECHO_COLORS.mom.text }}
              >
                选择场景（可选）
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {scenes.map((scene) => (
                  <motion.div
                    key={scene.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() =>
                      setSelectedScene(
                        selectedScene?.id === scene.id ? null : scene,
                      )
                    }
                    className={`relative rounded-xl overflow-hidden cursor-pointer ${
                      selectedScene?.id === scene.id
                        ? "ring-2 ring-amber-500"
                        : ""
                    }`}
                  >
                    <GlassWindow
                      scene={scene}
                      clarityLevel={100}
                      size="small"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-white text-xs text-center truncate">
                        {scene.title}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* 音频选择 */}
            <section className="mb-8">
              <h2
                className="text-lg font-medium mb-3"
                style={{ color: ECHO_COLORS.mom.text }}
              >
                选择背景音（可选）
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {audios.map((audio) => (
                  <motion.button
                    key={audio.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() =>
                      setSelectedAudio(
                        selectedAudio?.id === audio.id ? null : audio,
                      )
                    }
                    className={`p-3 rounded-xl text-left transition-colors ${
                      selectedAudio?.id === audio.id
                        ? "bg-white shadow-md"
                        : "bg-white/30 hover:bg-white/50"
                    }`}
                  >
                    <p
                      className="font-medium text-sm"
                      style={{
                        color:
                          selectedAudio?.id === audio.id
                            ? "#5D4037"
                            : ECHO_COLORS.mom.text,
                      }}
                    >
                      {audio.title}
                    </p>
                    <p
                      className="text-xs opacity-70 truncate"
                      style={{
                        color:
                          selectedAudio?.id === audio.id
                            ? "#5D4037"
                            : ECHO_COLORS.mom.text,
                      }}
                    >
                      {audio.description}
                    </p>
                  </motion.button>
                ))}
              </div>
            </section>

            {/* 开始按钮 */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStart}
              className="w-full py-4 rounded-2xl text-white font-bold text-lg"
              style={{ backgroundColor: ECHO_COLORS.mom.accent }}
            >
              开始冥想
            </motion.button>
          </motion.div>
        )}

        {/* 冥想进行中 */}
        {state === "active" && session && (
          <motion.div
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col"
          >
            {/* 场景背景 */}
            {selectedScene && (
              <div className="absolute inset-0">
                <GlassWindow
                  scene={selectedScene}
                  clarityLevel={100}
                  size="fullscreen"
                />
                <div className="absolute inset-0 bg-black/30" />
              </div>
            )}

            {/* 冥想计时器 */}
            <div className="flex-1 flex items-center justify-center relative z-10">
              <MeditationTimer
                targetDurationMinutes={session.target_duration_minutes}
                breathingRhythm={session.breathing_rhythm}
                onTimeUpdate={setElapsedSeconds}
                onPhaseChange={setCurrentPhase}
                onComplete={() =>
                  handleEnd(session.target_duration_minutes * 60)
                }
              />
            </div>

            {/* 退出按钮 */}
            <div className="relative z-10 p-4">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleEnd(elapsedSeconds)}
                className="w-full py-3 rounded-xl bg-white/20 text-white font-medium backdrop-blur-sm"
              >
                结束冥想
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* 完成阶段 */}
        {state === "completed" && (
          <motion.div
            key="completed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="text-6xl mb-4"
            >
              {completed ? "🌸" : "🌱"}
            </motion.div>

            <h2
              className="text-2xl font-bold mb-2"
              style={{ color: ECHO_COLORS.mom.text }}
            >
              {completed ? "冥想完成" : "继续加油"}
            </h2>

            <p
              className="text-center opacity-80 mb-8"
              style={{ color: ECHO_COLORS.mom.text }}
            >
              {completed
                ? `你完成了 ${Math.floor(elapsedSeconds / 60)} 分钟的冥想`
                : `这次冥想了 ${Math.floor(elapsedSeconds / 60)} 分钟`}
            </p>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/echo/mom")}
              className="w-full max-w-xs py-3 rounded-xl text-white font-medium"
              style={{ backgroundColor: ECHO_COLORS.mom.accent }}
            >
              返回
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function EchoMeditationPage() {
  return (
    <AuthGuard>
      <MeditationPage />
    </AuthGuard>
  );
}
