# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.3] - 2026-01-28

### Added

#### Community Module - Comment System

- **Answer Comments**: Users can now reply to answers with nested comments
  - Backend: `get_comments`, `create_comment`, `delete_comment` service methods
  - API endpoints: `GET/POST /answers/{id}/comments`, `DELETE /comments/{id}`
  - Max 1 level nesting - deeper replies shown flat with @mention
  - Like/delete functionality for comments
  - Content moderation for new comments

- **PostCard Improvements**
  - Added view count display (eye icon) to all post cards
  - Unified PostCard template across Community Feed, Collections, and My Posts pages
  - Consistent animation pattern using `AnimatePresence mode="popLayout"`

- **QuestionDetailModal Improvements**
  - Exit animation when closing (slide out to right)
  - Delete button moved from card to detail modal (shown for author only)

#### Bug Fixes

- Fixed SQLAlchemy async lazy loading errors by eagerly loading `author.certification` relationships
- Fixed hydration flickering in UserMenu by using CSS transitions triggered after mount
- Fixed comment persistence - nested replies now properly load when reopening detail modal
- Fixed like/collect state not showing correctly in My Posts page

### Changed

- **UserMenu**: Replaced framer-motion entry animations with CSS transitions to prevent hydration flicker
- **Comment Structure**: Flattened to max 1 level depth - all deeper replies use @mention format

---

## [0.3.2] - 2026-01-26

### Added

#### Developer Experience

- **Makefile**: Added unified command interface for common development tasks
  - `make install` - Install all dependencies (backend + frontend)
  - `make dev-backend` / `make dev-frontend` - Start development servers
  - `make dev-tmux` - Start both servers in tmux split panes
  - `make lint` / `make format` / `make typecheck` - Code quality tools
  - `make docker-up` / `make docker-down` - Docker management
  - `make clean` - Clean caches and temporary files
  - Run `make help` for full command list

- **GitHub Issue Templates**: Added structured issue templates
  - Bug Report - General bug reporting with component selection
  - Feature Request - Feature proposals with user perspective
  - Recovery Coach Issue - Pose detection and exercise-specific issues
  - AI Provider Issue - LLM and API-related issues
  - Documentation Issue - Docs improvements and corrections

- **Security Policy**: Added `SECURITY.md` with vulnerability reporting guidelines

---

## [0.3.1] - 2026-01-26

### Changed

#### AI Provider Migration

- **Soulful Companion**: Migrated from Zhipu GLM-4 to ModelScope Qwen (Qwen2.5-72B-Instruct)
  - Uses OpenAI-compatible API via ModelScope
  - Environment variable changed from `ZHIPUAI_API_KEY` to `MODELSCOPE_KEY`

- **Pose Detection Model**: Default changed from FULL to LITE
  - LITE model provides better performance on low-end servers
  - Configurable via `MEDIAPIPE_MODEL` environment variable (`lite` or `full`)

#### Bug Fixes

- Fixed race condition in camera initialization where video element might not be mounted in time
  - Replaced fixed 100ms delay with `requestAnimationFrame` polling (max 2s timeout)

- Fixed port configuration inconsistency
  - Local development now correctly defaults to port 8000
  - Docker single-container deployment uses 7860 (set via Dockerfile ENV)

- Fixed Docker Compose configuration
  - Removed port conflict (both nginx and frontend were binding to host port 7860)
  - Added `PORT=8000` to backend environment for correct port binding
  - Frontend now uses `expose` instead of `ports` (nginx handles external access)

- Fixed frontend Dockerfile for static export mode
  - Previous Dockerfile expected `output: "standalone"` but next.config.ts uses `output: "export"`
  - Now uses `serve` package to serve static files from `out/` directory

---

## [0.3.0] - 2026-01-25

### Added

#### Docker Deployment Support

- **Docker Compose (Multi-container)**
  - nginx reverse proxy for unified access on port 7860
  - Separate containers for backend, frontend, and nginx
  - Health checks for backend service
  - Persistent data volume for database

- **Single Container Deployment (ModelScope)**
  - Combined frontend/backend in one container
  - Multi-stage build for optimized image size
  - Static frontend served by FastAPI backend
  - Suitable for platforms requiring single container

- **nginx Configuration**
  - Reverse proxy with WebSocket support
  - API routing to backend (`/api/`, `/ws/`, `/health`)
  - Frontend routing for all other requests
  - 50MB max upload size for file uploads

#### Community Module - Mutual Support Community (`frontend/app/community/`, `frontend/components/community/`)

- **Dual-Channel System**
  - Professional Channel: Expert advice from verified healthcare professionals
  - Experience Channel: Real stories and tips from fellow mothers
  - Smooth channel switching with animated transitions

- **User Role System**
  - Regular users: Mom, Dad, Family Member
  - Certified professionals: Doctor, Therapist, Nurse
  - Visual badges and verification indicators

- **Q&A Features**
  - Question posting with rich text and images
  - Like and collection functionality
  - Professional vs experience answer distinction
  - Accepted answer marking

- **Content Moderation**
  - Automated sensitive content filtering
  - Multi-category keyword detection (violence, fraud, self-harm, etc.)
  - Real-time moderation status feedback with animations

- **Community Components**
  - `CommunityFeed`: Main feed with infinite scroll layout
  - `ChannelSwitcher`: Animated dual-channel toggle
  - `PostCard`: Glass-morphism post cards with hover effects
  - `QuestionModal`: Full-screen question composer
  - `QuestionDetailModal`: Detailed question view with answers
  - `DailyResonance`: Trending topics with staggered card layout
  - `ShellPicks`: Collections entry point ("拾贝")
  - `CommunityBackground`: Animated gradient background

### Changed

#### UI/UX Improvements

- **Design System Enhancement**
  - Consistent "breathing" visual style across all pages
  - Glass-morphism cards with backdrop blur effects
  - Warm, healing color palette (rose, amber, stone tones)
  - Smooth Framer Motion animations throughout

- **Home Page Polish**
  - Refined navigation and layout consistency
  - Improved visual hierarchy and spacing

- **Component Architecture**
  - Added `lib/design-tokens.ts` for centralized design constants
  - Unified animation spring configurations
  - Reusable motion variants

---

## [0.2.2] - 2026-01-25

### Performance Optimization - Non-blocking LLM Feedback

#### Fixed

- **Critical: Eliminated 1-2 second stuttering** caused by blocking LLM API calls
  - Root cause: `FeedbackNode` awaited LLM API response synchronously, blocking frame processing
  - Solution: LLM feedback generation now runs in background using `asyncio.create_task()`

#### Changed

- **Feedback Node** (`app/services/coach/workflow/nodes/feedback.py`)
  - Background task pattern: feedback generated asynchronously, results delivered on next frame
  - Added `_pending_generation` task tracking to prevent duplicate generations
  - No blocking of frame processing pipeline

- **Pose Detection** (`app/services/coach/pose/detector.py`)
  - Switched back to VIDEO mode from LIVE_STREAM for better responsiveness
  - Default model changed to LITE for performance (configurable via `MEDIAPIPE_MODEL` env var)
  - VIDEO mode provides synchronous results without the 1-frame delay of LIVE_STREAM

- **Frontend** (`frontend/app/coach/page.tsx`)
  - Increased frame rate to 20 FPS
  - Added keypoint smoothing (EMA) for smoother skeleton rendering
  - Using `requestAnimationFrame` for optimal frame timing
  - Increased capture resolution to 480x360 for better detection
  - `PHASE_NAMES` moved to module level constant

#### Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Background LLM generation | LLM API calls take 1-2 seconds; running in background prevents frame blocking |
| VIDEO mode over LIVE_STREAM | LIVE_STREAM has 1-frame delay; VIDEO mode is synchronous and more responsive |
| LITE model by default | Better performance on low-end servers; FULL available via env var |
| Keypoint smoothing (EMA) | Reduces jitter in skeleton rendering, factor of 0.25 for responsiveness |

#### Performance Impact

- **Eliminated periodic 1-2 second freezes** during exercise sessions
- Smooth 20+ FPS skeleton rendering
- LLM feedback still generated every 6 seconds but no longer blocks UI

---

## [0.2.1] - 2026-01-24

### Performance Optimization - Async Processing & Data Transfer

#### Changed

- **Critical: Eliminated Full Image Return** (`app/api/routes/websocket.py`)
  - Server now returns only keypoint coordinates (~1KB) instead of full annotated images (~15KB)
  - **90%+ reduction in WebSocket data transfer**
  - Removed server-side skeleton drawing and image encoding for each frame

- **Frontend Skeleton Rendering** (`frontend/app/rehab/page.tsx`)
  - Added client-side skeleton drawing using Canvas API
  - `drawSkeleton()` function renders pose with color-coded feedback
  - Increased frame rate from 8 to 10 FPS (feasible due to reduced latency)
  - Added `POSE_CONNECTIONS` constant for MediaPipe 33-landmark skeleton

- **Pose Detection** (`app/services/coach/pose/detector.py`)
  - Added `detect_async()` method using thread pool executor
  - Added `draw_landmarks_async()` method for non-blocking drawing
  - Added `detection_scale` parameter (default 0.5x) for faster detection
  - Frame downscaling before MediaPipe processing reduces computation time
  - Shared `ThreadPoolExecutor` with 2 workers for CPU-bound operations

- **Detection Node** (`app/services/coach/workflow/nodes/detect.py`)
  - Updated to use async pose detection
  - Added `get_annotated_frame_async()` method
  - Configurable `detection_scale` parameter passed through factory function

- **WebSocket Handler** (`app/api/routes/websocket.py`)
  - Added async `decode_frame_async()` for base64 decoding
  - Dedicated `ThreadPoolExecutor` with 2 workers for image I/O
  - Returns `keypoints` and `skeleton_color` instead of `annotated_frame`

#### Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Client-side skeleton rendering | Eliminates ~15KB/frame return transfer, removes encoding latency |
| Thread pool for pose detection | MediaPipe is CPU-bound, thread pool prevents blocking async event loop |
| 0.5x detection scale default | MediaPipe landmarks are normalized, half resolution sufficient for accuracy |
| Return keypoints as JSON | ~1KB vs ~15KB per frame, 90%+ bandwidth reduction |

#### Performance Impact

- **Network transfer reduced by 90%+** (keypoints ~1KB vs full image ~15KB)
- Event loop no longer blocked by CPU-intensive operations
- Server no longer encodes images for each frame
- Smoother real-time feedback with lower latency

---

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
