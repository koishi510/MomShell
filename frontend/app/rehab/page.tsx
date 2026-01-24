// frontend/app/rehab/page.tsx
/**
 * AI 康复教练页面 - 完整功能版
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_BASE = API_BASE.replace('http', 'ws');
const FRAME_RATE = 8;
const USER_ID = 'default_user';

// Phase names mapping (module-level to avoid recreation on each render)
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

interface SessionState {
  progress?: {
    progress: number;
    current_set: number;
    total_sets: number;
    current_rep: number;
    total_reps: number;
    current_phase: string;
  };
  analysis?: {
    score: number;
  };
  session_state?: string;
}

interface Feedback {
  text: string;
  type: 'correction' | 'safety_warning' | 'encouragement' | 'info';
  audio?: string;
}

interface SessionSummary {
  average_score: number;
  completed_reps: number;
  session_duration: number;
  new_achievements?: Achievement[];
}

type ViewType = 'exercises' | 'progress' | 'session';

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
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingAudioRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const processAudioQueueRef = useRef<() => void>(() => {});

  // Category names
  const categoryNames: Record<string, string> = {
    all: '全部',
    breathing: '呼吸训练',
    pelvic_floor: '盆底肌',
    diastasis_recti: '腹直肌修复',
    posture: '体态矫正',
    strength: '力量训练',
  };

  const difficultyNames: Record<string, string> = {
    beginner: '初级',
    intermediate: '中级',
    advanced: '高级',
  };

  const metricNames: Record<string, string> = {
    core_strength: '核心力量',
    pelvic_floor: '盆底肌',
    posture: '体态',
    flexibility: '柔韧性',
  };

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
    if (isPlayingAudioRef.current || audioQueueRef.current.length === 0) {
      return;
    }

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

  // Keep ref updated with latest function
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 480 }, height: { ideal: 360 }, facingMode: 'user' },
        audio: false,
      });
      videoStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      return true;
    } catch (error) {
      console.error('Failed to start camera:', error);
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

    frameIntervalRef.current = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      if (!videoRef.current || !videoRef.current.videoWidth) return;
      if (!ctx) return;

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
      const base64 = dataUrl.split(',')[1];

      wsRef.current.send(JSON.stringify({ type: 'frame', data: base64 }));
    }, 1000 / FRAME_RATE);
  }, []);

  const stopFrameSending = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
  }, []);

  // Display annotated frame
  const displayAnnotatedFrame = useCallback((base64Data: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = `data:image/jpeg;base64,${base64Data}`;
  }, []);

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'ack':
        console.log('Server acknowledged:', data.message);
        break;

      case 'state':
        if (data.data) {
          const stateData = data.data as SessionState;
          if (stateData.progress) {
            setSessionProgress({
              progress: stateData.progress.progress || 0,
              currentSet: stateData.progress.current_set || 1,
              totalSets: stateData.progress.total_sets || 3,
              currentRep: stateData.progress.current_rep || 1,
              totalReps: stateData.progress.total_reps || 10,
              currentPhase: PHASE_NAMES[stateData.progress.current_phase] || stateData.progress.current_phase,
            });
          }
          if (stateData.analysis) {
            setScore(Math.round(stateData.analysis.score));
          }
          if (stateData.session_state) {
            setSessionState(stateData.session_state);
          }
        }
        if (data.annotated_frame) {
          displayAnnotatedFrame(data.annotated_frame);
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
        break;

      case 'error':
        console.error('Server error:', data.message);
        setFeedback({ text: data.message, type: 'info' });
        break;
    }
  }, [displayAnnotatedFrame, playAudio, stopFrameSending]);

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
    setFeedback(null);
    setSessionProgress({
      progress: 0,
      currentSet: 1,
      totalSets: exercise.sets,
      currentRep: 1,
      totalReps: exercise.repetitions,
      currentPhase: '准备中',
    });

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

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, [sendControl, stopFrameSending, stopCamera, stopAllAudio]);

  // Close modal and return
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial data fetch is a valid pattern
    fetchExercises();
  }, [fetchExercises]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopCamera();
      stopFrameSending();
      stopAllAudio();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [stopCamera, stopFrameSending, stopAllAudio]);

  return (
    <div className="rehab-app">
      <style jsx global>{`
        .rehab-app {
          --primary: #e8a4b8;
          --primary-dark: #d88a9f;
          --secondary: #f5e6e8;
          --accent: #7eb8da;
          --success: #8bc99b;
          --warning: #f5c869;
          --danger: #e67e7e;
          --text: #4a4a4a;
          --text-light: #787878;
          --background: #fefbf6;
          --card-bg: #ffffff;
          --border: #eee;

          min-height: 100vh;
          background: var(--background);
          color: var(--text);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans SC', sans-serif;
        }

        .rehab-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          background: var(--card-bg);
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .logo { display: flex; align-items: center; gap: 0.5rem; }
        .logo-icon { font-size: 1.8rem; }
        .logo-text { font-size: 1.4rem; font-weight: 600; color: var(--primary-dark); }

        .nav { display: flex; gap: 0.5rem; }
        .nav-btn {
          padding: 0.5rem 1rem;
          border: none;
          background: transparent;
          color: var(--text-light);
          font-size: 0.95rem;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s;
        }
        .nav-btn:hover { background: var(--secondary); }
        .nav-btn.active { background: var(--primary); color: white; }

        .main-content { padding: 1.5rem; max-width: 1400px; margin: 0 auto; }

        .view { display: none; }
        .view.active { display: block; }

        .btn {
          padding: 0.5rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
        }
        .btn-primary { background: var(--primary); color: white; }
        .btn-primary:hover { background: var(--primary-dark); }
        .btn-secondary { background: var(--secondary); color: var(--text); }
        .btn-danger { background: var(--danger); color: white; }
        .btn-large { padding: 1rem 2rem; font-size: 1.1rem; }

        .exercise-categories {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .category-btn {
          padding: 0.5rem 1rem;
          border: 2px solid var(--border);
          background: var(--card-bg);
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.9rem;
        }
        .category-btn:hover { border-color: var(--primary); }
        .category-btn.active { background: var(--primary); border-color: var(--primary); color: white; }

        .exercise-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        .exercise-card {
          background: var(--card-bg);
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .exercise-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .exercise-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; }
        .exercise-card h3 { font-size: 1.1rem; color: var(--text); }
        .difficulty { font-size: 0.75rem; padding: 2px 8px; border-radius: 8px; background: var(--secondary); }
        .difficulty.beginner { background: #d4edda; color: #155724; }
        .difficulty.intermediate { background: #fff3cd; color: #856404; }
        .difficulty.advanced { background: #f8d7da; color: #721c24; }
        .exercise-card p { color: var(--text-light); font-size: 0.9rem; margin-bottom: 1rem; }
        .exercise-card-footer { display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-light); }
        .category-tag { background: var(--secondary); padding: 2px 8px; border-radius: 8px; }

        .progress-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
        .stat-card { background: var(--card-bg); border-radius: 12px; padding: 1.5rem; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .stat-value { display: block; font-size: 2.5rem; font-weight: 700; color: var(--primary-dark); }
        .stat-label { color: var(--text-light); font-size: 0.9rem; }

        .strength-metrics, .achievements-section {
          background: var(--card-bg);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .strength-metrics h3, .achievements-section h3 { margin-bottom: 1rem; }
        .metric-item { margin-bottom: 1rem; }
        .metric-header { display: flex; justify-content: space-between; margin-bottom: 0.25rem; font-size: 0.9rem; }
        .metric-bar { height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; }
        .metric-fill { height: 100%; background: linear-gradient(90deg, var(--primary), var(--accent)); border-radius: 4px; transition: width 0.5s; }

        .achievements-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem; }
        .achievement-badge { text-align: center; padding: 1rem; border-radius: 12px; background: var(--secondary); opacity: 0.5; }
        .achievement-badge.earned { opacity: 1; background: linear-gradient(135deg, var(--warning), #ffeaa7); }
        .achievement-icon { font-size: 2rem; margin-bottom: 0.25rem; }
        .achievement-name { font-size: 0.85rem; font-weight: 600; }

        .session-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .session-content { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; }

        .video-area { background: #000; border-radius: 12px; overflow: hidden; }
        .video-container { position: relative; width: 100%; padding-bottom: 75%; }
        .video-container video, .video-container canvas {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;
        }
        .video-container canvas { pointer-events: none; }
        .video-overlay {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none; display: flex; justify-content: space-between; padding: 1rem;
        }
        .phase-indicator, .score-display {
          background: rgba(0,0,0,0.7); color: white;
          padding: 0.5rem 1rem; border-radius: 8px; height: fit-content;
        }
        .score-value { display: block; font-size: 1.5rem; font-weight: 700; }
        .score-label { font-size: 0.8rem; opacity: 0.8; }
        .score-display.good .score-value { color: var(--success); }
        .score-display.ok .score-value { color: var(--warning); }
        .score-display.poor .score-value { color: var(--danger); }

        .info-panel { display: flex; flex-direction: column; gap: 1.5rem; }
        .session-progress-card, .current-phase, .feedback-area {
          background: var(--card-bg); padding: 1rem; border-radius: 12px;
        }
        .progress-bar { height: 12px; background: var(--border); border-radius: 6px; overflow: hidden; margin-bottom: 0.5rem; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, var(--primary), var(--success)); border-radius: 6px; transition: width 0.3s; }
        .progress-text { display: flex; justify-content: space-between; font-size: 0.9rem; color: var(--text-light); }

        .current-phase h4 { margin-bottom: 0.5rem; color: var(--primary-dark); }
        .phase-cues { list-style: none; margin-top: 0.5rem; }
        .phase-cues li { padding: 0.25rem 0; color: var(--text-light); font-size: 0.9rem; }
        .phase-cues li::before { content: "✓ "; color: var(--success); }

        .feedback-area { min-height: 80px; }
        .feedback-message { font-size: 1.1rem; color: var(--text); animation: fadeIn 0.3s; }
        .feedback-message.correction { color: var(--warning); }
        .feedback-message.warning { color: var(--danger); }
        .feedback-message.encouragement { color: var(--success); }

        .session-controls { display: flex; gap: 1rem; flex-wrap: wrap; }

        .modal {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;
        }
        .modal-content {
          background: var(--card-bg); padding: 2rem; border-radius: 20px;
          text-align: center; max-width: 500px; width: 90%;
        }
        .modal-content h2 { color: var(--primary-dark); margin-bottom: 1.5rem; }
        .session-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
        .summary-stat { padding: 1rem; background: var(--secondary); border-radius: 12px; }
        .summary-value { display: block; font-size: 1.8rem; font-weight: 700; color: var(--primary-dark); }
        .summary-label { font-size: 0.85rem; color: var(--text-light); }
        .new-achievements { margin-bottom: 1.5rem; padding: 1rem; background: linear-gradient(135deg, var(--warning), #ffeaa7); border-radius: 12px; }

        .back-link { color: var(--text-light); text-decoration: none; }
        .back-link:hover { color: var(--primary-dark); }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        @media (max-width: 768px) {
          .session-content { grid-template-columns: 1fr; }
          .progress-summary { grid-template-columns: 1fr; }
          .exercise-list { grid-template-columns: 1fr; }
          .rehab-header { flex-direction: column; gap: 1rem; }
        }
      `}</style>

      {/* Header */}
      <header className="rehab-header">
        <div className="logo">
          <Link href="/" className="back-link">← 首页</Link>
          <span className="logo-icon">🌸</span>
          <span className="logo-text">MomShell</span>
        </div>
        <nav className="nav">
          <button
            className={`nav-btn ${currentView === 'exercises' ? 'active' : ''}`}
            onClick={() => changeView('exercises')}
          >
            动作库
          </button>
          <button
            className={`nav-btn ${currentView === 'progress' ? 'active' : ''}`}
            onClick={() => changeView('progress')}
          >
            我的进度
          </button>
        </nav>
      </header>

      <main className="main-content">
        {/* Exercise Selection View */}
        <section className={`view ${currentView === 'exercises' ? 'active' : ''}`}>
          <h2>康复动作</h2>
          <div className="exercise-categories">
            {Object.entries(categoryNames).map(([key, name]) => (
              <button
                key={key}
                className={`category-btn ${selectedCategory === key ? 'active' : ''}`}
                onClick={() => setSelectedCategory(key)}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="exercise-list">
            {filteredExercises.map(exercise => (
              <div
                key={exercise.id}
                className="exercise-card"
                onClick={() => startSession(exercise)}
              >
                <div className="exercise-card-header">
                  <h3>{exercise.name}</h3>
                  <span className={`difficulty ${exercise.difficulty}`}>
                    {difficultyNames[exercise.difficulty] || exercise.difficulty}
                  </span>
                </div>
                <p>{exercise.description?.substring(0, 100)}...</p>
                <div className="exercise-card-footer">
                  <span className="category-tag">{categoryNames[exercise.category] || exercise.category}</span>
                  <span>{exercise.sets}组 × {exercise.repetitions}次</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Progress View */}
        <section className={`view ${currentView === 'progress' ? 'active' : ''}`}>
          <h2>我的进度</h2>
          <div className="progress-summary">
            <div className="stat-card">
              <span className="stat-value">{progressSummary?.total_sessions || 0}</span>
              <span className="stat-label">训练次数</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{progressSummary?.current_streak || 0}</span>
              <span className="stat-label">连续天数</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{Math.round(progressSummary?.total_minutes || 0)}</span>
              <span className="stat-label">训练分钟</span>
            </div>
          </div>

          <div className="strength-metrics">
            <h3>力量恢复进度</h3>
            {progressSummary?.strength_metrics && Object.entries(progressSummary.strength_metrics).map(([name, data]) => (
              <div key={name} className="metric-item">
                <div className="metric-header">
                  <span>{metricNames[name] || name}</span>
                  <span>{Math.round(data.value)}%</span>
                </div>
                <div className="metric-bar">
                  <div className="metric-fill" style={{ width: `${data.progress}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="achievements-section">
            <h3>成就勋章</h3>
            <div className="achievements-grid">
              {achievements.map(achievement => (
                <div
                  key={achievement.id}
                  className={`achievement-badge ${achievement.is_earned ? 'earned' : ''}`}
                >
                  <div className="achievement-icon">
                    {achievementIcons[achievement.icon] || '🌟'}
                  </div>
                  <div className="achievement-name">{achievement.name}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Session View */}
        <section className={`view ${currentView === 'session' ? 'active' : ''}`}>
          <div className="session-header">
            <h2>{selectedExercise?.name || '动作名称'}</h2>
            <button className="btn btn-danger" onClick={endSession}>结束训练</button>
          </div>

          <div className="session-content">
            {/* Video Area */}
            <div className="video-area">
              <div className="video-container">
                <video ref={videoRef} autoPlay playsInline muted />
                <canvas ref={canvasRef} />
                <div className="video-overlay">
                  <div className="phase-indicator">{sessionProgress.currentPhase}</div>
                  <div className={`score-display ${score !== null ? (score >= 80 ? 'good' : score >= 60 ? 'ok' : 'poor') : ''}`}>
                    <span className="score-value">{score ?? '--'}</span>
                    <span className="score-label">得分</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Panel */}
            <div className="info-panel">
              {/* Progress */}
              <div className="session-progress-card">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${sessionProgress.progress}%` }} />
                </div>
                <div className="progress-text">
                  <span>第 {sessionProgress.currentSet}/{sessionProgress.totalSets} 组</span>
                  <span>第 {sessionProgress.currentRep}/{sessionProgress.totalReps} 次</span>
                </div>
              </div>

              {/* Current Phase */}
              <div className="current-phase">
                <h4>当前阶段</h4>
                <p>{selectedExercise?.phases?.[0]?.description || '准备开始'}</p>
                <ul className="phase-cues">
                  {selectedExercise?.phases?.[0]?.cues?.map((cue, i) => (
                    <li key={i}>{cue}</li>
                  ))}
                </ul>
              </div>

              {/* Feedback Area */}
              <div className="feedback-area">
                <div className={`feedback-message ${feedback?.type || ''}`}>
                  {feedback?.text || '准备开始'}
                </div>
              </div>

              {/* Control Buttons */}
              <div className="session-controls">
                {sessionState === 'preparing' && (
                  <button className="btn btn-primary btn-large" onClick={beginExercise}>
                    开始训练
                  </button>
                )}
                {sessionState === 'exercising' && (
                  <>
                    <button className="btn btn-secondary" onClick={() => sendControl('pause')}>
                      暂停
                    </button>
                    <button className="btn btn-secondary" onClick={() => sendControl('rest')}>
                      休息一下
                    </button>
                  </>
                )}
                {sessionState === 'paused' && (
                  <button className="btn btn-primary" onClick={() => sendControl('resume')}>
                    继续
                  </button>
                )}
                {sessionState === 'resting' && (
                  <button className="btn btn-secondary" onClick={() => sendControl('rest')}>
                    休息一下
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Session Complete Modal */}
      {showModal && sessionSummary && (
        <div className="modal">
          <div className="modal-content">
            <h2>🎉 做得很棒！</h2>
            <div className="session-summary">
              <div className="summary-stat">
                <span className="summary-value">{Math.round(sessionSummary.average_score || 0)}</span>
                <span className="summary-label">平均得分</span>
              </div>
              <div className="summary-stat">
                <span className="summary-value">{sessionSummary.completed_reps || 0}</span>
                <span className="summary-label">完成次数</span>
              </div>
              <div className="summary-stat">
                <span className="summary-value">{formatDuration(sessionSummary.session_duration || 0)}</span>
                <span className="summary-label">训练时长</span>
              </div>
            </div>

            {sessionSummary.new_achievements && sessionSummary.new_achievements.length > 0 && (
              <div className="new-achievements">
                <h3>🏆 获得新成就！</h3>
                <div className="achievements-grid">
                  {sessionSummary.new_achievements.map(a => (
                    <div key={a.id} className="achievement-badge earned">
                      <div className="achievement-icon">{achievementIcons[a.icon] || '🌟'}</div>
                      <div className="achievement-name">{a.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button className="btn btn-primary" onClick={closeModal}>继续</button>
          </div>
        </div>
      )}
    </div>
  );
}
