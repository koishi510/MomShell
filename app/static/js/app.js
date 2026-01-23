/**
 * MomShell Recovery Coach - Frontend Application
 */

// Configuration
const CONFIG = {
    API_BASE: '/api',
    WS_BASE: `ws://${window.location.host}/api/ws/coach`,
    FRAME_RATE: 8, // Reduced from 15 to 8 FPS for better performance
    USER_ID: 'default_user',
};

// Application State
const state = {
    currentView: 'exercises',
    exercises: [],
    selectedExercise: null,
    sessionId: null,
    ws: null,
    videoStream: null,
    isSessionActive: false,
    frameInterval: null,
    // Audio queue state
    audioQueue: [],
    isPlayingAudio: false,
    currentAudio: null,
};

// DOM Elements
const elements = {
    // Views
    exercisesView: document.getElementById('exercises-view'),
    progressView: document.getElementById('progress-view'),
    sessionView: document.getElementById('session-view'),

    // Exercise list
    exerciseList: document.getElementById('exercise-list'),

    // Session elements
    sessionExerciseName: document.getElementById('session-exercise-name'),
    localVideo: document.getElementById('local-video'),
    poseCanvas: document.getElementById('pose-canvas'),
    phaseIndicator: document.getElementById('phase-indicator'),
    scoreDisplay: document.getElementById('score-display'),
    sessionProgressBar: document.getElementById('session-progress-bar'),
    currentSet: document.getElementById('current-set'),
    totalSets: document.getElementById('total-sets'),
    currentRep: document.getElementById('current-rep'),
    totalReps: document.getElementById('total-reps'),
    phaseDescription: document.getElementById('phase-description'),
    phaseCues: document.getElementById('phase-cues'),
    feedbackMessage: document.getElementById('feedback-message'),

    // Buttons
    startBtn: document.getElementById('start-btn'),
    pauseBtn: document.getElementById('pause-btn'),
    resumeBtn: document.getElementById('resume-btn'),
    restBtn: document.getElementById('rest-btn'),
    endSessionBtn: document.getElementById('end-session-btn'),

    // Modal
    sessionCompleteModal: document.getElementById('session-complete-modal'),
    summaryScore: document.getElementById('summary-score'),
    summaryReps: document.getElementById('summary-reps'),
    summaryDuration: document.getElementById('summary-duration'),
    newAchievements: document.getElementById('new-achievements'),
    achievementsEarned: document.getElementById('achievements-earned'),
    closeModalBtn: document.getElementById('close-modal-btn'),

    // Progress view
    totalSessions: document.getElementById('total-sessions'),
    currentStreak: document.getElementById('current-streak'),
    totalMinutes: document.getElementById('total-minutes'),
    metricsContainer: document.getElementById('metrics-container'),
    achievementsContainer: document.getElementById('achievements-container'),
};

// ============================================================================
// API Functions
// ============================================================================

async function fetchExercises() {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/exercises/`);
        const exercises = await response.json();
        state.exercises = exercises;
        renderExerciseList(exercises);
    } catch (error) {
        console.error('Failed to fetch exercises:', error);
    }
}

async function fetchProgress() {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/progress/${CONFIG.USER_ID}/summary`);
        const summary = await response.json();
        renderProgressSummary(summary);
    } catch (error) {
        console.error('Failed to fetch progress:', error);
    }
}

async function fetchAchievements() {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/progress/${CONFIG.USER_ID}/achievements`);
        const achievements = await response.json();
        renderAchievements(achievements);
    } catch (error) {
        console.error('Failed to fetch achievements:', error);
    }
}

// ============================================================================
// WebSocket Functions
// ============================================================================

function connectWebSocket(exerciseId) {
    state.sessionId = generateSessionId();
    const wsUrl = `${CONFIG.WS_BASE}/${state.sessionId}`;

    state.ws = new WebSocket(wsUrl);

    state.ws.onopen = () => {
        console.log('WebSocket connected');
        // Send start message
        state.ws.send(JSON.stringify({
            type: 'start',
            exercise_id: exerciseId,
            user_id: CONFIG.USER_ID,
            use_llm: true,
        }));
    };

    state.ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        } catch (e) {
            console.error('Error handling message:', e);
        }
    };

    state.ws.onclose = (event) => {
        console.log('WebSocket disconnected, code:', event.code, 'reason:', event.reason);
        stopFrameSending();
        stopAllAudio();
    };

    state.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

function handleWebSocketMessage(data) {
    console.log('Received message:', data.type);
    switch (data.type) {
        case 'ack':
            console.log('Server acknowledged:', data.message);
            break;

        case 'state':
            updateSessionState(data.data);
            if (data.annotated_frame) {
                displayAnnotatedFrame(data.annotated_frame);
            }
            if (data.feedback) {
                displayFeedback(data.feedback);
                if (data.feedback.audio) {
                    playAudio(data.feedback.audio);
                }
            }
            break;

        case 'feedback':
            displayFeedback(data.feedback);
            if (data.feedback.audio) {
                playAudio(data.feedback.audio);
            }
            break;

        case 'session_ended':
            showSessionComplete(data.summary);
            break;

        case 'error':
            console.error('Server error:', data.message);
            showFeedback(data.message, 'warning');
            break;

        default:
            console.log('Unknown message type:', data.type);
    }
}

function sendControl(action) {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({
            type: 'control',
            action: action,
        }));
    }
}

// ============================================================================
// Video & Frame Processing
// ============================================================================

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 480 },  // Reduced from 640 for better performance
                height: { ideal: 360 }, // Reduced from 480 for better performance
                facingMode: 'user',
            },
            audio: false,
        });

        state.videoStream = stream;
        elements.localVideo.srcObject = stream;

        // Wait for video to be ready
        await new Promise((resolve) => {
            elements.localVideo.onloadedmetadata = resolve;
        });

        return true;
    } catch (error) {
        console.error('Failed to start camera:', error);
        alert('无法访问摄像头，请检查权限设置。');
        return false;
    }
}

function stopCamera() {
    if (state.videoStream) {
        state.videoStream.getTracks().forEach(track => track.stop());
        state.videoStream = null;
    }
}

function startFrameSending() {
    if (state.frameInterval) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    state.frameInterval = setInterval(() => {
        if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
        if (!elements.localVideo.videoWidth) return;

        // Capture frame
        canvas.width = elements.localVideo.videoWidth;
        canvas.height = elements.localVideo.videoHeight;
        ctx.drawImage(elements.localVideo, 0, 0);

        // Convert to base64 and send (reduced quality for performance)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
        const base64 = dataUrl.split(',')[1];

        state.ws.send(JSON.stringify({
            type: 'frame',
            data: base64,
        }));
    }, 1000 / CONFIG.FRAME_RATE);
}

function stopFrameSending() {
    if (state.frameInterval) {
        clearInterval(state.frameInterval);
        state.frameInterval = null;
    }
}

function displayAnnotatedFrame(base64Data) {
    const canvas = elements.poseCanvas;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
    };
    img.src = `data:image/jpeg;base64,${base64Data}`;
}

// ============================================================================
// UI Rendering
// ============================================================================

function renderExerciseList(exercises, category = 'all') {
    const filtered = category === 'all'
        ? exercises
        : exercises.filter(e => e.category === category);

    elements.exerciseList.innerHTML = filtered.map(exercise => `
        <div class="exercise-card" data-id="${exercise.id}">
            <div class="exercise-card-header">
                <h3>${exercise.name}</h3>
                <span class="difficulty ${exercise.difficulty}">${getDifficultyName(exercise.difficulty)}</span>
            </div>
            <p>${exercise.description.substring(0, 100)}...</p>
            <div class="exercise-card-footer">
                <span class="category-tag">${getCategoryName(exercise.category)}</span>
                <span>${exercise.sets}组 × ${exercise.repetitions}次</span>
            </div>
        </div>
    `).join('');

    // Add click handlers
    elements.exerciseList.querySelectorAll('.exercise-card').forEach(card => {
        card.addEventListener('click', () => {
            const exerciseId = card.dataset.id;
            const exercise = exercises.find(e => e.id === exerciseId);
            startSession(exercise);
        });
    });
}

function renderProgressSummary(summary) {
    elements.totalSessions.textContent = summary.total_sessions || 0;
    elements.currentStreak.textContent = summary.current_streak || 0;
    elements.totalMinutes.textContent = Math.round(summary.total_minutes || 0);

    // Render strength metrics
    if (summary.strength_metrics) {
        elements.metricsContainer.innerHTML = Object.entries(summary.strength_metrics)
            .map(([name, data]) => `
                <div class="metric-item">
                    <div class="metric-header">
                        <span>${getMetricName(name)}</span>
                        <span>${Math.round(data.value)}%</span>
                    </div>
                    <div class="metric-bar">
                        <div class="metric-fill" style="width: ${data.progress}%"></div>
                    </div>
                </div>
            `).join('');
    }
}

function renderAchievements(achievements) {
    elements.achievementsContainer.innerHTML = `
        <div class="achievements-grid">
            ${achievements.map(a => `
                <div class="achievement-badge ${a.is_earned ? 'earned' : ''}">
                    <div class="achievement-icon">${getAchievementIcon(a.icon)}</div>
                    <div class="achievement-name">${a.name}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function updateSessionState(data) {
    if (!data) return;

    // Update progress
    if (data.progress) {
        const progress = data.progress;
        elements.sessionProgressBar.style.width = `${progress.progress}%`;
        elements.currentSet.textContent = progress.current_set || 1;
        elements.totalSets.textContent = progress.total_sets || 3;
        elements.currentRep.textContent = progress.current_rep || 1;
        elements.totalReps.textContent = progress.total_reps || 10;

        if (progress.current_phase) {
            elements.phaseIndicator.textContent = getPhaseName(progress.current_phase);
        }
    }

    // Update analysis
    if (data.analysis) {
        const score = Math.round(data.analysis.score);
        elements.scoreDisplay.querySelector('.score-value').textContent = score;

        // Update score color based on value
        const scoreEl = elements.scoreDisplay;
        scoreEl.classList.remove('good', 'ok', 'poor');
        if (score >= 80) scoreEl.classList.add('good');
        else if (score >= 60) scoreEl.classList.add('ok');
        else scoreEl.classList.add('poor');
    }

    // Update UI based on session state
    const sessionState = data.session_state;
    updateControlButtons(sessionState);
}

function updateControlButtons(sessionState) {
    elements.startBtn.classList.toggle('hidden', sessionState !== 'preparing');
    elements.pauseBtn.classList.toggle('hidden', sessionState !== 'exercising');
    elements.resumeBtn.classList.toggle('hidden', sessionState !== 'paused');
    elements.restBtn.classList.toggle('hidden', !['exercising', 'resting'].includes(sessionState));
}

function displayFeedback(feedback) {
    const el = elements.feedbackMessage;
    el.textContent = feedback.text;
    el.className = 'feedback-message';

    if (feedback.type === 'correction') {
        el.classList.add('correction');
    } else if (feedback.type === 'safety_warning') {
        el.classList.add('warning');
    } else if (feedback.type === 'encouragement') {
        el.classList.add('encouragement');
    }
}

function showFeedback(text, type = 'info') {
    const el = elements.feedbackMessage;
    el.textContent = text;
    el.className = `feedback-message ${type}`;
}

function showSessionComplete(summary) {
    stopFrameSending();
    state.isSessionActive = false;

    // Update summary
    elements.summaryScore.textContent = Math.round(summary.average_score || 0);
    elements.summaryReps.textContent = summary.completed_reps || 0;
    elements.summaryDuration.textContent = formatDuration(summary.session_duration || 0);

    // Show new achievements
    if (summary.new_achievements && summary.new_achievements.length > 0) {
        elements.newAchievements.classList.remove('hidden');
        elements.achievementsEarned.innerHTML = summary.new_achievements
            .map(a => `<div class="achievement-badge earned">
                <div class="achievement-icon">${getAchievementIcon(a.icon)}</div>
                <div class="achievement-name">${a.name}</div>
            </div>`)
            .join('');
    } else {
        elements.newAchievements.classList.add('hidden');
    }

    elements.sessionCompleteModal.classList.remove('hidden');
}

// ============================================================================
// Session Management
// ============================================================================

async function startSession(exercise) {
    state.selectedExercise = exercise;

    // Show session view
    showView('session');
    elements.sessionExerciseName.textContent = exercise.name;

    // Update phase info
    if (exercise.phases && exercise.phases.length > 0) {
        const firstPhase = exercise.phases[0];
        elements.phaseDescription.textContent = firstPhase.description;
        elements.phaseCues.innerHTML = firstPhase.cues
            .map(cue => `<li>${cue}</li>`)
            .join('');
    }

    // Start camera
    const cameraStarted = await startCamera();
    if (!cameraStarted) {
        showView('exercises');
        return;
    }

    // Connect WebSocket
    connectWebSocket(exercise.id);
}

function beginExercise() {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({ type: 'begin' }));
        state.isSessionActive = true;
        startFrameSending();
    }
}

function endSession() {
    sendControl('end');
    stopFrameSending();
    stopCamera();
    stopAllAudio();

    if (state.ws) {
        state.ws.close();
        state.ws = null;
    }
}

// ============================================================================
// View Navigation
// ============================================================================

function showView(viewName) {
    state.currentView = viewName;

    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    // Show selected view
    const viewEl = document.getElementById(`${viewName}-view`);
    if (viewEl) viewEl.classList.add('active');

    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // Load data for view
    if (viewName === 'progress') {
        fetchProgress();
        fetchAchievements();
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getCategoryName(category) {
    const names = {
        breathing: '呼吸训练',
        pelvic_floor: '盆底肌',
        diastasis_recti: '腹直肌修复',
        posture: '体态矫正',
        strength: '力量训练',
    };
    return names[category] || category;
}

function getDifficultyName(difficulty) {
    const names = {
        beginner: '初级',
        intermediate: '中级',
        advanced: '高级',
    };
    return names[difficulty] || difficulty;
}

function getMetricName(name) {
    const names = {
        core_strength: '核心力量',
        pelvic_floor: '盆底肌',
        posture: '体态',
        flexibility: '柔韧性',
    };
    return names[name] || name;
}

function getPhaseName(phase) {
    const names = {
        preparation: '准备',
        inhale: '吸气',
        exhale: '呼气',
        hold: '保持',
        release: '放松',
        rest: '休息',
    };
    return names[phase] || phase;
}

function getAchievementIcon(icon) {
    const icons = {
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
    return icons[icon] || '🌟';
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Audio queue management
function queueAudio(base64Data) {
    if (!base64Data) return;
    state.audioQueue.push(base64Data);
    processAudioQueue();
}

function processAudioQueue() {
    // If already playing or queue is empty, do nothing
    if (state.isPlayingAudio || state.audioQueue.length === 0) {
        return;
    }

    state.isPlayingAudio = true;
    const base64Data = state.audioQueue.shift();

    try {
        const audio = new Audio(`data:audio/mp3;base64,${base64Data}`);
        state.currentAudio = audio;

        audio.onended = () => {
            state.isPlayingAudio = false;
            state.currentAudio = null;
            // Wait a short interval before playing next audio
            setTimeout(() => {
                processAudioQueue();
            }, 500); // 500ms interval between audio clips
        };

        audio.onerror = (e) => {
            console.error('Audio playback error:', e);
            state.isPlayingAudio = false;
            state.currentAudio = null;
            // Try next audio
            setTimeout(() => {
                processAudioQueue();
            }, 100);
        };

        audio.play().catch(e => {
            console.log('Audio playback blocked:', e);
            state.isPlayingAudio = false;
            state.currentAudio = null;
            processAudioQueue();
        });
    } catch (error) {
        console.error('Failed to create audio:', error);
        state.isPlayingAudio = false;
        processAudioQueue();
    }
}

function playAudio(base64Data) {
    queueAudio(base64Data);
}

function stopAllAudio() {
    // Clear queue
    state.audioQueue = [];
    // Stop current audio
    if (state.currentAudio) {
        state.currentAudio.pause();
        state.currentAudio = null;
    }
    state.isPlayingAudio = false;
}

// ============================================================================
// Event Listeners
// ============================================================================

function initEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            if (view) showView(view);
        });
    });

    // Category filter
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderExerciseList(state.exercises, btn.dataset.category);
        });
    });

    // Session controls
    elements.startBtn.addEventListener('click', beginExercise);
    elements.pauseBtn.addEventListener('click', () => sendControl('pause'));
    elements.resumeBtn.addEventListener('click', () => sendControl('resume'));
    elements.restBtn.addEventListener('click', () => sendControl('rest'));
    elements.endSessionBtn.addEventListener('click', endSession);

    // Modal
    elements.closeModalBtn.addEventListener('click', () => {
        elements.sessionCompleteModal.classList.add('hidden');
        showView('exercises');
        fetchProgress();
    });
}

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    fetchExercises();
});
