/**
 * MomShell - Frontend Application
 */

// Configuration
const CONFIG = {
    API_BASE: '/api',
    COMPANION_API: '/api/v1/companion',
    COMMUNITY_API: '/api/v1/community',
    WS_BASE: `ws://${window.location.host}/api/ws/coach`,
    FRAME_RATE: 8,
    USER_ID: 'default_user',
};

// Application State
const state = {
    currentView: 'home',
    exercises: [],
    selectedExercise: null,
    sessionId: null,
    ws: null,
    videoStream: null,
    isSessionActive: false,
    frameInterval: null,
    audioQueue: [],
    isPlayingAudio: false,
    currentAudio: null,
    // Chat state
    chatHistory: [],
    // Community state
    communityPosts: [],
    currentChannel: 'all',
};

// ============================================================================
// DOM Elements
// ============================================================================

const elements = {
    // Views
    homeView: document.getElementById('home-view'),
    companionView: document.getElementById('companion-view'),
    communityView: document.getElementById('community-view'),
    exercisesView: document.getElementById('exercises-view'),
    progressView: document.getElementById('progress-view'),
    sessionView: document.getElementById('session-view'),

    // Exercise list
    exerciseList: document.getElementById('exercise-list'),

    // Chat elements
    chatMessages: document.getElementById('chat-messages'),
    chatInput: document.getElementById('chat-input'),
    chatSendBtn: document.getElementById('chat-send-btn'),

    // Community elements
    communityPosts: document.getElementById('community-posts'),
    postModal: document.getElementById('post-modal'),
    postForm: document.getElementById('post-form'),
    postTitle: document.getElementById('post-title'),
    postContent: document.getElementById('post-content'),
    postChannel: document.getElementById('post-channel'),
    openPostModalBtn: document.getElementById('open-post-modal-btn'),
    cancelPostBtn: document.getElementById('cancel-post-btn'),

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
// API Functions - Exercises & Progress
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
// API Functions - Companion Chat
// ============================================================================

async function sendChatMessage(message) {
    if (!message.trim()) return;

    // Add user message to UI
    addChatMessage(message, 'user');
    elements.chatInput.value = '';

    try {
        const response = await fetch(`${CONFIG.COMPANION_API}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: message,
                session_id: CONFIG.USER_ID,
            }),
        });

        if (response.ok) {
            const data = await response.json();
            addChatMessage(data.text || '...', 'assistant');
        } else {
            addChatMessage('抱歉，暂时无法回复。请稍后再试。', 'assistant');
        }
    } catch (error) {
        console.error('Chat error:', error);
        addChatMessage('连接出现问题，请检查网络。', 'assistant');
    }
}

function addChatMessage(text, role) {
    const welcome = elements.chatMessages.querySelector('.chat-welcome');
    if (welcome) welcome.remove();

    const msgEl = document.createElement('div');
    msgEl.className = `chat-message ${role}`;
    msgEl.textContent = text;
    elements.chatMessages.appendChild(msgEl);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

    state.chatHistory.push({ role, text });
}

// ============================================================================
// API Functions - Community
// ============================================================================

async function fetchCommunityPosts(channel = 'all') {
    try {
        let url = `${CONFIG.COMMUNITY_API}/questions/`;
        if (channel !== 'all') {
            url = `${CONFIG.COMMUNITY_API}/questions/channel/${channel}`;
        }
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            const posts = data.items || [];
            state.communityPosts = posts;
            renderCommunityPosts(posts);
        } else {
            renderEmptyCommunity();
        }
    } catch (error) {
        console.error('Failed to fetch posts:', error);
        renderEmptyCommunity();
    }
}

function renderCommunityPosts(posts) {
    if (!posts || posts.length === 0) {
        renderEmptyCommunity();
        return;
    }

    elements.communityPosts.innerHTML = posts.map(post => `
        <div class="post-card">
            <div class="post-author">
                <span>${post.author?.display_name || '匿名用户'}</span>
                ${post.author?.role ? `<span class="post-role">${getRoleName(post.author.role)}</span>` : ''}
            </div>
            <h4 class="post-title">${escapeHtml(post.title)}</h4>
            <div class="post-content">${escapeHtml(post.content_preview)}</div>
            <div class="post-meta">
                <span>${post.answer_count || 0} 回答</span>
                <span>${post.view_count || 0} 浏览</span>
                <span>${formatTime(post.created_at)}</span>
            </div>
        </div>
    `).join('');
}

function renderEmptyCommunity() {
    elements.communityPosts.innerHTML = `
        <div class="empty-state">
            <p>暂无帖子，来发布第一条吧</p>
        </div>
    `;
}

async function createQuestion(title, content, channel) {
    try {
        const response = await fetch(`${CONFIG.COMMUNITY_API}/questions/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-ID': CONFIG.USER_ID,
            },
            body: JSON.stringify({
                title: title,
                content: content,
                channel: channel,
                tag_ids: [],
                image_urls: [],
            }),
        });

        if (response.ok || response.status === 201) {
            return { success: true };
        } else {
            const error = await response.json();
            return { success: false, error: error.detail || '发布失败' };
        }
    } catch (error) {
        console.error('Create question error:', error);
        return { success: false, error: '网络错误，请重试' };
    }
}

function openPostModal() {
    elements.postModal.classList.remove('hidden');
    elements.postTitle.value = '';
    elements.postContent.value = '';
    elements.postChannel.value = 'experience';
}

function closePostModal() {
    elements.postModal.classList.add('hidden');
}

async function handlePostSubmit(e) {
    e.preventDefault();

    const title = elements.postTitle.value.trim();
    const content = elements.postContent.value.trim();
    const channel = elements.postChannel.value;

    if (title.length < 5) {
        alert('标题至少需要5个字');
        return;
    }
    if (content.length < 10) {
        alert('内容至少需要10个字');
        return;
    }

    const result = await createQuestion(title, content, channel);

    if (result.success) {
        closePostModal();
        fetchCommunityPosts(state.currentChannel);
        alert('发布成功！');
    } else {
        alert(result.error);
    }
}

function getRoleName(role) {
    const names = {
        doctor: '医生',
        nurse: '护士',
        mom: '妈妈',
        expert: '专家',
    };
    return names[role] || role;
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
        console.log('WebSocket disconnected');
        stopFrameSending();
        stopAllAudio();
    };

    state.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

function handleWebSocketMessage(data) {
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
                width: { ideal: 480 },
                height: { ideal: 360 },
                facingMode: 'user',
            },
            audio: false,
        });

        state.videoStream = stream;
        elements.localVideo.srcObject = stream;

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

        canvas.width = elements.localVideo.videoWidth;
        canvas.height = elements.localVideo.videoHeight;
        ctx.drawImage(elements.localVideo, 0, 0);

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
    elements.achievementsContainer.innerHTML = achievements.map(a => `
        <div class="achievement-badge ${a.is_earned ? 'earned' : ''}">
            <div class="achievement-icon">${getAchievementIcon(a.icon)}</div>
            <div class="achievement-name">${a.name}</div>
        </div>
    `).join('');
}

function updateSessionState(data) {
    if (!data) return;

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

    if (data.analysis) {
        const score = Math.round(data.analysis.score);
        elements.scoreDisplay.querySelector('.score-value').textContent = score;
    }

    updateControlButtons(data.session_state);
}

function updateControlButtons(sessionState) {
    elements.startBtn.classList.toggle('hidden', sessionState !== 'preparing');
    elements.pauseBtn.classList.toggle('hidden', sessionState !== 'exercising');
    elements.resumeBtn.classList.toggle('hidden', sessionState !== 'paused');
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
    elements.feedbackMessage.textContent = text;
    elements.feedbackMessage.className = `feedback-message ${type}`;
}

function showSessionComplete(summary) {
    stopFrameSending();
    state.isSessionActive = false;

    elements.summaryScore.textContent = Math.round(summary.average_score || 0);
    elements.summaryReps.textContent = summary.completed_reps || 0;
    elements.summaryDuration.textContent = formatDuration(summary.session_duration || 0);

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

    showView('session');
    elements.sessionExerciseName.textContent = exercise.name;

    if (exercise.phases && exercise.phases.length > 0) {
        const firstPhase = exercise.phases[0];
        elements.phaseDescription.textContent = firstPhase.description;
        elements.phaseCues.innerHTML = firstPhase.cues
            .map(cue => `<li>${cue}</li>`)
            .join('');
    }

    const cameraStarted = await startCamera();
    if (!cameraStarted) {
        showView('exercises');
        return;
    }

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
    switch (viewName) {
        case 'exercises':
            if (state.exercises.length === 0) fetchExercises();
            break;
        case 'progress':
            fetchProgress();
            fetchAchievements();
            break;
        case 'community':
            fetchCommunityPosts(state.currentChannel);
            break;
    }
}

// Global function for onclick handlers in HTML
window.showView = showView;

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

function formatTime(timestamp) {
    if (!timestamp) return '';
    // 后端返回的是 UTC 时间，需要添加 Z 标识
    const normalizedTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
    const date = new Date(normalizedTimestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Audio queue management
function queueAudio(base64Data) {
    if (!base64Data) return;
    state.audioQueue.push(base64Data);
    processAudioQueue();
}

function processAudioQueue() {
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
            setTimeout(() => processAudioQueue(), 500);
        };

        audio.onerror = () => {
            state.isPlayingAudio = false;
            state.currentAudio = null;
            setTimeout(() => processAudioQueue(), 100);
        };

        audio.play().catch(() => {
            state.isPlayingAudio = false;
            state.currentAudio = null;
            processAudioQueue();
        });
    } catch (error) {
        state.isPlayingAudio = false;
        processAudioQueue();
    }
}

function playAudio(base64Data) {
    queueAudio(base64Data);
}

function stopAllAudio() {
    state.audioQueue = [];
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

    // Community channel filter
    document.querySelectorAll('.channel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.channel-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentChannel = btn.dataset.channel;
            fetchCommunityPosts(btn.dataset.channel);
        });
    });

    // Post modal
    if (elements.openPostModalBtn) {
        elements.openPostModalBtn.addEventListener('click', openPostModal);
    }
    if (elements.cancelPostBtn) {
        elements.cancelPostBtn.addEventListener('click', closePostModal);
    }
    if (elements.postForm) {
        elements.postForm.addEventListener('submit', handlePostSubmit);
    }
    if (elements.postModal) {
        elements.postModal.addEventListener('click', (e) => {
            if (e.target === elements.postModal) closePostModal();
        });
    }

    // Chat
    if (elements.chatSendBtn) {
        elements.chatSendBtn.addEventListener('click', () => {
            sendChatMessage(elements.chatInput.value);
        });
    }

    if (elements.chatInput) {
        elements.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage(elements.chatInput.value);
            }
        });
    }

    // Session controls
    if (elements.startBtn) elements.startBtn.addEventListener('click', beginExercise);
    if (elements.pauseBtn) elements.pauseBtn.addEventListener('click', () => sendControl('pause'));
    if (elements.resumeBtn) elements.resumeBtn.addEventListener('click', () => sendControl('resume'));
    if (elements.endSessionBtn) elements.endSessionBtn.addEventListener('click', endSession);

    // Modal
    if (elements.closeModalBtn) {
        elements.closeModalBtn.addEventListener('click', () => {
            elements.sessionCompleteModal.classList.add('hidden');
            showView('exercises');
            fetchProgress();
        });
    }
}

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    // Start on home view
    showView('home');
});
