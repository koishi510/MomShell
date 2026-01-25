// frontend/app/rehab/page.tsx
/**
 * AI 康复教练页面 - 现代化重构版
 * 使用 Tailwind CSS + Framer Motion
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CoachBackground,
  EnergyRing,
  MetricLegend,
  ExerciseCard,
  SessionProgress,
  SessionProgressOverlay,
  AchievementBadge,
  AchievementProgress,
  PoseOverlay,
  FeedbackPanel,
  PhaseTransition,
  ScorePopup,
  type PoseOverlayHandle,
  type Feedback,
} from '../../components/coach';
import type { EnergyMetrics } from '../../types/coach';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_BASE = API_BASE.replace('http', 'ws');
const FRAME_RATE = 20;
const USER_ID = 'default_user';

// Phase names mapping
const PHASE_NAMES: Record<string, string> = {
  preparation: '准备',
  inhale: '吸气',
  exhale: '呼气',
  hold: '保持',
  release: '放松',
  rest: '休息',
};

// Types
interface Exercise {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  sets: number;
  repetitions: number;
  phases: { name: string; description: string; cues: string[] }[];
}

interface ProgressSummary {
  total_sessions: number;
  current_streak: number;
  total_minutes: number;
  strength_metrics: Record<string, { value: number; progress: number }>;
}

interface Achievement {
  id: string;
  name: string;
  icon: string;
  is_earned: boolean;
}

interface SessionSummary {
  average_score: number;
  completed_reps: number;
  session_duration: number;
  new_achievements?: Achievement[];
}

type ViewType = 'exercises' | 'progress' | 'session';

// Category names for filter buttons
const categoryNames: Record<string, string> = {
  all: '全部',
  breathing: '呼吸训练',
  pelvic_floor: '盆底肌',
  diastasis_recti: '腹直肌修复',
  posture: '体态矫正',
  strength: '力量训练',
};

// Achievement icons for session complete modal
const achievementIcons: Record<string, string> = {
  footprints: '👣',
  fire: '🔥',
  'calendar-check': '📅',
  trophy: '🏆',
  star: '⭐',
  'check-circle': '✅',
  medal: '🏅',
  'trending-up': '📈',
  award: '🎖️',
};

export default function RehabPage() {
  // View state
  const [currentView, setCurrentView] = useState<ViewType>('exercises');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Data state
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [progressSummary, setProgressSummary] = useState<ProgressSummary | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  // Session state
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [sessionState, setSessionState] = useState<string>('preparing');
  const [sessionProgress, setSessionProgress] = useState({
    progress: 0,
    currentSet: 1,
    totalSets: 3,
    currentRep: 1,
    totalReps: 10,
    currentPhase: '准备中',
  });
  const [score, setScore] = useState<number | null>(null);
  const [prevScore, setPrevScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPhaseTransition, setShowPhaseTransition] = useState(false);
  const [showScorePopup, setShowScorePopup] = useState(false);
  const [skeletonColor, setSkeletonColor] = useState<'green' | 'yellow' | 'red' | 'white'>('white');

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const poseOverlayRef = useRef<PoseOverlayHandle>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingAudioRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const processAudioQueueRef = useRef<() => void>(() => {});

  // Convert progress summary to EnergyMetrics
  const energyMetrics: EnergyMetrics = {
    core_strength: progressSummary?.strength_metrics?.core_strength?.value ?? 0,
    pelvic_floor: progressSummary?.strength_metrics?.pelvic_floor?.value ?? 0,
    posture: progressSummary?.strength_metrics?.posture?.value ?? 0,
    flexibility: progressSummary?.strength_metrics?.flexibility?.value ?? 0,
  };

  // Fetch exercises
  const fetchExercises = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/exercises/`);
      const data = await response.json();
      setExercises(data);
    } catch (error) {
      console.error('Failed to fetch exercises:', error);
    }
  }, []);

  // Fetch progress
  const fetchProgress = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/progress/${USER_ID}/summary`);
      const data = await response.json();
      setProgressSummary(data);
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    }
  }, []);

  // Fetch achievements
  const fetchAchievements = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/progress/${USER_ID}/achievements`);
      const data = await response.json();
      setAchievements(data);
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    }
  }, []);

  // Audio queue management
  const processAudioQueue = useCallback(() => {
    if (isPlayingAudioRef.current || audioQueueRef.current.length === 0) return;

    isPlayingAudioRef.current = true;
    const base64Data = audioQueueRef.current.shift()!;

    try {
      const audio = new Audio(`data:audio/mp3;base64,${base64Data}`);
      currentAudioRef.current = audio;

      audio.onended = () => {
        isPlayingAudioRef.current = false;
        currentAudioRef.current = null;
        setTimeout(() => processAudioQueueRef.current(), 500);
      };

      audio.onerror = () => {
        isPlayingAudioRef.current = false;
        currentAudioRef.current = null;
        setTimeout(() => processAudioQueueRef.current(), 100);
      };

      audio.play().catch(() => {
        isPlayingAudioRef.current = false;
        currentAudioRef.current = null;
        processAudioQueueRef.current();
      });
    } catch (error) {
      console.error('Failed to create audio:', error);
      isPlayingAudioRef.current = false;
      processAudioQueueRef.current();
    }
  }, []);

  useEffect(() => {
    processAudioQueueRef.current = processAudioQueue;
  }, [processAudioQueue]);

  const playAudio = useCallback((base64Data: string) => {
    audioQueueRef.current.push(base64Data);
    processAudioQueue();
  }, [processAudioQueue]);

  const stopAllAudio = useCallback(() => {
    audioQueueRef.current = [];
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    isPlayingAudioRef.current = false;
  }, []);

  // Camera functions
  const startCamera = useCallback(async () => {
    // 1. 先清理旧流
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
      videoStreamRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 480 }, height: { ideal: 360 }, facingMode: 'user' },
        audio: false,
      });
      videoStreamRef.current = stream;

      // 2. 等待 video 元素挂载
      const video = videoRef.current;
      if (!video) {
        console.error('Video element not mounted');
        stream.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
        return false;
      }

      video.srcObject = stream;

      // 3. 显式调用 play() 并等待就绪
      await video.play();

      // 4. 等待视频元数据加载完成
      await new Promise<void>((resolve, reject) => {
        if (video.videoWidth > 0) {
          resolve();
          return;
        }

        const timeout = setTimeout(() => {
          reject(new Error('Video load timeout'));
        }, 5000);

        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve();
        };

        video.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Video load error'));
        };
      });

      return true;
    } catch (error) {
      console.error('Failed to start camera:', error);
      // 清理失败的流
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
      }
      alert('无法访问摄像头，请检查权限设置。');
      return false;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
      videoStreamRef.current = null;
    }
  }, []);

  // Frame sending
  const startFrameSending = useCallback(() => {
    if (frameIntervalRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const SEND_WIDTH = 480;
    const SEND_HEIGHT = 360;

    let lastSendTime = 0;
    const minInterval = 1000 / FRAME_RATE;

    const sendFrame = () => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN ||
          !videoRef.current || !videoRef.current.videoWidth || !ctx) {
        frameIntervalRef.current = requestAnimationFrame(sendFrame);
        return;
      }

      const now = performance.now();
      if (now - lastSendTime < minInterval) {
        frameIntervalRef.current = requestAnimationFrame(sendFrame);
        return;
      }
      lastSendTime = now;

      canvas.width = SEND_WIDTH;
      canvas.height = SEND_HEIGHT;
      ctx.drawImage(videoRef.current, 0, 0, SEND_WIDTH, SEND_HEIGHT);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
      const base64 = dataUrl.split(',')[1];
      wsRef.current.send(JSON.stringify({ type: 'frame', data: base64 }));
      frameIntervalRef.current = requestAnimationFrame(sendFrame);
    };

    frameIntervalRef.current = requestAnimationFrame(sendFrame);
  }, []);

  const stopFrameSending = useCallback(() => {
    if (frameIntervalRef.current) {
      cancelAnimationFrame(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
  }, []);

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'ack':
        console.log('Server acknowledged:', data.message);
        break;
      case 'state':
        if (data.data) {
          const stateData = data.data;
          if (stateData.progress) {
            const newPhase = PHASE_NAMES[stateData.progress.current_phase] || stateData.progress.current_phase;

            // Check for phase transition
            setSessionProgress((prev) => {
              if (prev.currentPhase !== newPhase) {
                setShowPhaseTransition(true);
                setTimeout(() => setShowPhaseTransition(false), 1500);
              }
              return {
                progress: stateData.progress.progress || 0,
                currentSet: stateData.progress.current_set || 1,
                totalSets: stateData.progress.total_sets || 3,
                currentRep: stateData.progress.current_rep || 1,
                totalReps: stateData.progress.total_reps || 10,
                currentPhase: newPhase,
              };
            });
          }
          if (stateData.analysis) {
            const newScore = Math.round(stateData.analysis.score);
            setScore((prev) => {
              if (prev !== null && Math.abs(newScore - prev) >= 5) {
                setPrevScore(prev);
                setShowScorePopup(true);
                setTimeout(() => setShowScorePopup(false), 1000);
              }
              return newScore;
            });
          }
          if (stateData.session_state) {
            setSessionState(stateData.session_state);
          }
        }
        if (data.keypoints) {
          const color = (data.skeleton_color || 'white') as 'green' | 'yellow' | 'red' | 'white';
          setSkeletonColor(color);
          poseOverlayRef.current?.drawSkeleton(data.keypoints, color);
        }
        if (data.feedback) {
          setFeedback(data.feedback);
          if (data.feedback.audio) {
            playAudio(data.feedback.audio);
          }
        }
        break;
      case 'feedback':
        setFeedback(data.feedback);
        if (data.feedback?.audio) {
          playAudio(data.feedback.audio);
        }
        break;
      case 'session_ended':
        setSessionSummary(data.summary);
        setShowModal(true);
        stopFrameSending();
        poseOverlayRef.current?.clear();
        break;
      case 'error':
        console.error('Server error:', data.message);
        setFeedback({ text: data.message, type: 'info' });
        break;
    }
  }, [playAudio, stopFrameSending]);

  // WebSocket connection
  const connectWebSocket = useCallback((exerciseId: string) => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const wsUrl = `${WS_BASE}/api/ws/coach/${sessionId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      ws.send(JSON.stringify({
        type: 'start',
        exercise_id: exerciseId,
        user_id: USER_ID,
        use_llm: true,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (e) {
        console.error('Error handling message:', e);
      }
    };

    ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      stopFrameSending();
      stopAllAudio();
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current = ws;
  }, [handleWebSocketMessage, stopFrameSending, stopAllAudio]);

  // Control functions
  const sendControl = useCallback((action: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'control', action }));
    }
  }, []);

  // Start session
  const startSession = useCallback(async (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setCurrentView('session');
    setSessionState('preparing');
    setScore(null);
    setPrevScore(null);
    setFeedback(null);
    setSessionProgress({
      progress: 0,
      currentSet: 1,
      totalSets: exercise.sets,
      currentRep: 1,
      totalReps: exercise.repetitions,
      currentPhase: '准备中',
    });

    // 等待 React 完成渲染，确保 video 元素已挂载
    await new Promise(resolve => setTimeout(resolve, 100));

    const cameraStarted = await startCamera();
    if (!cameraStarted) {
      setCurrentView('exercises');
      return;
    }

    connectWebSocket(exercise.id);
  }, [startCamera, connectWebSocket]);

  // Begin exercise
  const beginExercise = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'begin' }));
      startFrameSending();
    }
  }, [startFrameSending]);

  // End session
  const endSession = useCallback(() => {
    sendControl('end');
    stopFrameSending();
    stopCamera();
    stopAllAudio();
    poseOverlayRef.current?.clear();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setCurrentView('exercises');  // 返回动作选择界面
  }, [sendControl, stopFrameSending, stopCamera, stopAllAudio]);

  // Close modal
  const closeModal = useCallback(() => {
    setShowModal(false);
    setCurrentView('exercises');
    fetchProgress();
    fetchAchievements();
  }, [fetchProgress, fetchAchievements]);

  // Change view
  const changeView = useCallback((view: ViewType) => {
    setCurrentView(view);
    if (view === 'progress') {
      fetchProgress();
      fetchAchievements();
    }
  }, [fetchProgress, fetchAchievements]);

  // Filter exercises
  const filteredExercises = selectedCategory === 'all'
    ? exercises
    : exercises.filter(e => e.category === selectedCategory);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize
  useEffect(() => {
    // 使用 setTimeout 避免同步调用 setState
    const timer = setTimeout(() => {
      fetchExercises();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchExercises]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopCamera();
      stopFrameSending();
      stopAllAudio();
      if (wsRef.current) wsRef.current.close();
    };
  }, [stopCamera, stopFrameSending, stopAllAudio]);

  return (
    <div className="min-h-screen relative">
      {/* 背景层 */}
      <CoachBackground />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-stone-200/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-stone-500 hover:text-stone-700 transition-colors"
            >
              ← 首页
            </Link>
            <span className="text-2xl">🧘‍♀️</span>
            <span className="text-lg font-medium text-stone-700">AI 康复教练</span>
          </div>
          <nav className="flex gap-2">
            <button
              onClick={() => changeView('exercises')}
              className={`px-4 py-2 rounded-full text-sm transition-all ${
                currentView === 'exercises'
                  ? 'bg-[#e8a4b8] text-white shadow-lg shadow-[#e8a4b8]/30'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              动作库
            </button>
            <button
              onClick={() => changeView('progress')}
              className={`px-4 py-2 rounded-full text-sm transition-all ${
                currentView === 'progress'
                  ? 'bg-[#e8a4b8] text-white shadow-lg shadow-[#e8a4b8]/30'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              我的进度
            </button>
          </nav>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 py-6">
        {/* Exercise Selection View */}
        <AnimatePresence mode="wait">
          {currentView === 'exercises' && (
            <motion.section
              key="exercises"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-medium text-stone-700 mb-6">康复动作</h2>

              {/* Category Filter */}
              <div className="flex gap-2 mb-6 flex-wrap">
                {Object.entries(categoryNames).map(([key, name]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    className={`px-4 py-2 rounded-full text-sm border-2 transition-all ${
                      selectedCategory === key
                        ? 'bg-[#e8a4b8] border-[#e8a4b8] text-white'
                        : 'bg-white/70 border-stone-200 text-stone-600 hover:border-[#e8a4b8]'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>

              {/* Exercise Cards */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredExercises.map((exercise, index) => (
                  <ExerciseCard
                    key={exercise.id}
                    id={exercise.id}
                    name={exercise.name}
                    description={exercise.description}
                    category={exercise.category}
                    difficulty={exercise.difficulty}
                    sets={exercise.sets}
                    repetitions={exercise.repetitions}
                    index={index}
                    onClick={() => startSession(exercise)}
                  />
                ))}
              </div>
            </motion.section>
          )}

          {/* Progress View */}
          {currentView === 'progress' && (
            <motion.section
              key="progress"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-medium text-stone-700 mb-6">我的进度</h2>

              {/* Energy Ring Section */}
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 mb-6 shadow-sm">
                <div className="flex flex-col items-center">
                  <EnergyRing metrics={energyMetrics} size={220} />
                  <MetricLegend metrics={energyMetrics} />
                </div>
              </div>

              {/* Stats Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 text-center shadow-sm"
                >
                  <span className="block text-3xl font-light text-[#e8a4b8]">
                    {progressSummary?.total_sessions || 0}
                  </span>
                  <span className="text-sm text-stone-500">训练次数</span>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 text-center shadow-sm"
                >
                  <span className="block text-3xl font-light text-[#f5c869]">
                    {progressSummary?.current_streak || 0}
                  </span>
                  <span className="text-sm text-stone-500">连续天数</span>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 text-center shadow-sm"
                >
                  <span className="block text-3xl font-light text-[#8bc99b]">
                    {Math.round(progressSummary?.total_minutes || 0)}
                  </span>
                  <span className="text-sm text-stone-500">训练分钟</span>
                </motion.div>
              </div>

              {/* Achievements */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-stone-700">成就勋章</h3>
                  <AchievementProgress
                    earned={achievements.filter(a => a.is_earned).length}
                    total={achievements.length}
                  />
                </div>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {achievements.map((achievement) => (
                    <AchievementBadge
                      key={achievement.id}
                      id={achievement.id}
                      name={achievement.name}
                      icon={achievement.icon}
                      isEarned={achievement.is_earned}
                    />
                  ))}
                </div>
              </div>
            </motion.section>
          )}

          {/* Session View */}
          {currentView === 'session' && (
            <motion.section
              key="session"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-medium text-stone-700">
                  {selectedExercise?.name || '训练中'}
                </h2>
                <button
                  onClick={endSession}
                  className="px-4 py-2 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors"
                >
                  结束训练
                </button>
              </div>

              <div className="grid lg:grid-cols-3 gap-4">
                {/* Video Area */}
                <div className="lg:col-span-2 bg-black rounded-2xl overflow-hidden relative">
                  <div className="aspect-[4/3] relative">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <PoseOverlay
                      ref={poseOverlayRef}
                      width={480}
                      height={360}
                      glowEnabled={true}
                    />
                    <SessionProgressOverlay
                      currentPhase={sessionProgress.currentPhase}
                      score={score}
                    />
                    {/* Phase Transition Animation */}
                    <PhaseTransition
                      phase={sessionProgress.currentPhase}
                      show={showPhaseTransition}
                    />
                    {/* Score Change Popup */}
                    <ScorePopup
                      score={score ?? 0}
                      previousScore={prevScore}
                      show={showScorePopup}
                    />
                  </div>
                </div>

                {/* Info Panel */}
                <div className="space-y-4">
                  {/* Progress */}
                  <SessionProgress
                    progress={sessionProgress.progress}
                    currentSet={sessionProgress.currentSet}
                    totalSets={sessionProgress.totalSets}
                    currentRep={sessionProgress.currentRep}
                    totalReps={sessionProgress.totalReps}
                    currentPhase={sessionProgress.currentPhase}
                    score={score}
                  />

                  {/* Feedback */}
                  <FeedbackPanel feedback={feedback} />

                  {/* Controls */}
                  <div className="flex gap-2">
                    {sessionState === 'preparing' && (
                      <button
                        onClick={beginExercise}
                        className="flex-1 py-3 bg-[#e8a4b8] text-white rounded-full font-medium hover:bg-[#d88a9f] transition-colors"
                      >
                        开始训练
                      </button>
                    )}
                    {sessionState === 'exercising' && (
                      <button
                        onClick={() => sendControl('pause')}
                        className="flex-1 py-3 bg-stone-200 text-stone-700 rounded-full font-medium hover:bg-stone-300 transition-colors"
                      >
                        暂停
                      </button>
                    )}
                    {sessionState === 'paused' && (
                      <button
                        onClick={() => sendControl('resume')}
                        className="flex-1 py-3 bg-[#e8a4b8] text-white rounded-full font-medium hover:bg-[#d88a9f] transition-colors"
                      >
                        继续
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Session Complete Modal */}
      <AnimatePresence>
        {showModal && sessionSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl"
            >
              <div className="text-4xl mb-4">🎉</div>
              <h2 className="text-2xl font-medium text-[#e8a4b8] mb-6">做得很棒！</h2>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-stone-100 rounded-2xl p-4">
                  <span className="block text-2xl font-bold text-[#e8a4b8]">
                    {Math.round(sessionSummary.average_score || 0)}
                  </span>
                  <span className="text-xs text-stone-500">平均得分</span>
                </div>
                <div className="bg-stone-100 rounded-2xl p-4">
                  <span className="block text-2xl font-bold text-[#8bc99b]">
                    {sessionSummary.completed_reps || 0}
                  </span>
                  <span className="text-xs text-stone-500">完成次数</span>
                </div>
                <div className="bg-stone-100 rounded-2xl p-4">
                  <span className="block text-2xl font-bold text-[#7eb8da]">
                    {formatDuration(sessionSummary.session_duration || 0)}
                  </span>
                  <span className="text-xs text-stone-500">训练时长</span>
                </div>
              </div>

              {sessionSummary.new_achievements && sessionSummary.new_achievements.length > 0 && (
                <div className="bg-gradient-to-r from-amber-100 to-yellow-100 rounded-2xl p-4 mb-6">
                  <h3 className="font-medium text-amber-700 mb-2">🏆 获得新成就！</h3>
                  <div className="flex justify-center gap-2">
                    {sessionSummary.new_achievements.map(a => (
                      <span key={a.id} className="text-2xl">
                        {achievementIcons[a.icon] || '🌟'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={closeModal}
                className="w-full py-3 bg-[#e8a4b8] text-white rounded-full font-medium hover:bg-[#d88a9f] transition-colors"
              >
                继续
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
