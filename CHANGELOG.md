# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-01-24

### Changed

#### Architecture Refactoring - Frontend/Backend Separation

- **Backend (FastAPI)**
  - Migrated to pure API server architecture
  - Added CORS middleware for cross-origin requests
  - API routes served under `/api` prefix
  - Health check endpoint at `/health`

- **Frontend (Next.js)**
  - New Next.js 16 + React 19 frontend in `frontend/` directory
  - TailwindCSS 4 for styling
  - Framer Motion for animations
  - TypeScript support

### Added

#### Soulful Companion Chat Module (`app/services/chat/`)

- **AI Chat Service**
  - Zhipu GLM-4 powered emotional companion
  - Warm, validating, non-judgmental conversation style
  - Designed specifically for postpartum women support
  - User profile and conversation memory management
  - Visual metadata generation for UI effects

- **Chat API**
  - `POST /api/v1/companion/chat` - Send message and receive AI response
  - Visual response with color tones and effects

- **Chat Frontend**
  - `CompanionInterface` component for chat UI
  - `AmbientCanvas` for visual ambient effects
  - `InputArea` and `ResponseText` components

### Dependencies

- zhipuai >= 2.1.5 (GLM-4 chat integration)
- next 16.1.4 (frontend framework)
- react 19.2.3 (UI library)
- tailwindcss 4 (styling)
- framer-motion 12.29.0 (animations)

---

## [0.1.0] - 2026-01-23

### Added

#### Core Recovery Coach Module (`app/recovery_coach/`)

- **Pose Estimation** (`pose/`)
  - MediaPipe-based pose detection with 33 keypoints
  - Real-time landmark drawing and feedback overlay
  - Angle calculation utilities for joint analysis
  - Privacy-first local processing

- **Exercise Library** (`exercises/`)
  - 9 postpartum-specific exercises across 5 categories:
    - Breathing: Diaphragmatic Breathing, Core Activation Breath
    - Pelvic Floor: Kegel Exercise, Pelvic Tilt
    - Diastasis Recti: Dead Bug Modified, Abdominal Bracing
    - Posture: Cat-Cow Stretch
    - Strength: Glute Bridge, Side-Lying Leg Lift
  - Structured phase requirements with angle targets
  - 3 pre-built training sessions

- **Motion Analysis** (`analysis/`)
  - Posture analyzer with joint angle evaluation
  - Safety monitor with fatigue detection
  - Consecutive poor form tracking
  - Automatic rest prompts

- **Feedback System** (`feedback/`)
  - AI-powered feedback generation using Claude/LangChain
  - Warm, encouraging feedback tone (non-judgmental)
  - edge-tts integration for Chinese TTS
  - Template fallback for offline operation

- **Progress Tracking** (`progress/`)
  - Session recording and statistics
  - Strength recovery metrics (Core, Pelvic Floor, Posture, Flexibility)
  - Streak tracking
  - Achievement/badge system with 9 achievements

- **LangGraph Workflow** (`workflow/`)
  - State machine for coaching flow: Detect → Analyze → Feedback → Track
  - Real-time session state management
  - Phase timing and rep/set progression

#### API Layer (`app/api/`)

- **WebSocket endpoint** (`/api/ws/coach/{session_id}`)
  - Real-time video frame processing
  - Bidirectional feedback communication
  - Session control (start, pause, resume, rest, end)

- **REST API endpoints**
  - `GET /api/exercises/` - List all exercises
  - `GET /api/exercises/{id}` - Get exercise details
  - `GET /api/exercises/sessions/` - List training sessions
  - `GET /api/progress/{user_id}` - Get user progress
  - `GET /api/progress/{user_id}/summary` - Get progress summary
  - `GET /api/progress/{user_id}/achievements` - Get achievements

#### Frontend (`app/static/`, `app/templates/`)

- Responsive web interface
- Exercise selection with category filtering
- Real-time coaching view with:
  - Camera feed with pose overlay
  - Progress indicators (sets, reps, phase)
  - Live score display
  - Feedback messages
- Progress dashboard with:
  - Session statistics
  - Strength recovery metrics visualization
  - Achievement badges
- Session completion modal with summary

#### Configuration

- Environment-based settings via pydantic-settings
- Configurable MediaPipe parameters
- TTS voice and rate customization
- Safety thresholds configuration

### Dependencies

- mediapipe >= 0.10.0 (pose estimation)
- langgraph >= 0.2.0 (workflow orchestration)
- langchain-anthropic >= 0.3.0 (LLM integration)
- edge-tts >= 6.1.0 (text-to-speech)
- fastapi >= 0.115.0 (web framework)
- websockets >= 12.0 (real-time communication)
- opencv-python >= 4.8.0 (image processing)
- sqlalchemy >= 2.0.0 (database ORM)

### Technical Notes

- All pose processing runs locally (privacy-first design)
- LangGraph manages the coaching state machine
- TTS audio is cached to reduce latency
- WebSocket protocol supports 15 FPS frame processing
