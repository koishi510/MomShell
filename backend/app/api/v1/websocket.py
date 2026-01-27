"""WebSocket route for real-time coaching communication.

Optimized with:
- Async image processing for better performance
- Shared variable pattern for latest frame (simpler and more reliable)
- Non-blocking TTS generation
"""

import asyncio
import base64
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Any, cast

import cv2
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from numpy.typing import NDArray

from app.schemas.progress import SessionRecord
from app.services.coach.progress.tracker import ProgressTracker, create_progress_tracker
from app.services.coach.workflow.graph import CoachWorkflow, create_workflow
from app.services.coach.workflow.state import SessionState

router = APIRouter()

# Thread pool for image encode/decode operations (increased for better parallelism)
_image_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="image_proc")


def _decode_frame(frame_data: str) -> NDArray[np.uint8] | None:
    """Decode base64 frame to numpy array (CPU-bound)."""
    img_bytes = base64.b64decode(frame_data)
    nparr = np.frombuffer(img_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        return None
    return cast(NDArray[np.uint8], frame)


def _encode_frame(frame: NDArray[np.uint8], quality: int = 60) -> str:
    """Encode frame to base64 JPEG (CPU-bound)."""
    _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
    return base64.b64encode(buffer.tobytes()).decode("utf-8")


async def decode_frame_async(frame_data: str) -> NDArray[np.uint8] | None:
    """Decode base64 frame asynchronously."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_image_executor, _decode_frame, frame_data)


async def encode_frame_async(frame: NDArray[np.uint8], quality: int = 60) -> str:
    """Encode frame to base64 JPEG asynchronously."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_image_executor, _encode_frame, frame, quality)


class ConnectionManager:
    """Manages WebSocket connections for coaching sessions."""

    def __init__(self) -> None:
        """Initialize the connection manager."""
        self._active_connections: dict[str, WebSocket] = {}
        self._workflows: dict[str, CoachWorkflow] = {}
        self._progress_tracker = create_progress_tracker()

    async def connect(self, websocket: WebSocket, session_id: str) -> None:
        """Accept a new WebSocket connection."""
        await websocket.accept()
        self._active_connections[session_id] = websocket

    def disconnect(self, session_id: str) -> None:
        """Remove a disconnected session."""
        self._active_connections.pop(session_id, None)
        workflow = self._workflows.pop(session_id, None)
        if workflow:
            workflow.end_session()

    async def send_json(self, session_id: str, data: dict[str, Any]) -> None:
        """Send JSON data to a session."""
        websocket = self._active_connections.get(session_id)
        if websocket:
            await websocket.send_json(data)

    def get_workflow(self, session_id: str) -> CoachWorkflow | None:
        """Get the workflow for a session."""
        return self._workflows.get(session_id)

    def create_workflow(self, session_id: str, use_llm: bool = True) -> CoachWorkflow:
        """Create a new workflow for a session."""
        workflow = create_workflow(use_llm=use_llm)
        self._workflows[session_id] = workflow
        return workflow

    @property
    def progress_tracker(self) -> ProgressTracker:
        """Get the progress tracker."""
        return self._progress_tracker


manager = ConnectionManager()


@router.websocket("/ws/coach/{session_id}")
async def coaching_websocket(websocket: WebSocket, session_id: str) -> None:
    """WebSocket endpoint for real-time coaching.

    Architecture: Uses shared variable pattern with Event for latest frame.
    This is simpler and more reliable than queue-based approaches.

    Protocol:
    - Client sends: { "type": "start", "exercise_id": "...", "user_id": "..." }
    - Client sends: { "type": "frame", "data": "<base64 encoded image>" }
    - Client sends: { "type": "control", "action": "pause|resume|rest|end_rest|end" }
    - Server sends: { "type": "state", "data": {...} }
    - Server sends: { "type": "feedback", "text": "...", "audio": "<base64>" }
    """
    await manager.connect(websocket, session_id)
    print(f"[WS] Connected: {session_id}")

    # Session state
    workflow: CoachWorkflow | None = None
    user_id: str = "default_user"
    session_start_time: datetime | None = None
    is_connected = True

    # Shared frame data (no lock needed in single-threaded async)
    latest_frame: str | None = None
    frame_ready = False

    # Shutdown signal
    shutdown_event = asyncio.Event()

    async def safe_send(data: dict[str, Any]) -> bool:
        """Safely send data, return False if connection is closed."""
        nonlocal is_connected
        if not is_connected:
            return False
        try:
            await websocket.send_json(data)
            return True
        except Exception as e:
            print(f"[WS] Send failed: {e}")
            is_connected = False
            return False

    async def frame_processor() -> None:
        """Process frames - polls for new frames, always uses latest."""
        nonlocal latest_frame, frame_ready, workflow, is_connected

        while not shutdown_event.is_set() and is_connected:
            try:
                # Check if there's a frame to process
                if not frame_ready or latest_frame is None:
                    await asyncio.sleep(0.01)  # 10ms polling
                    continue

                # Take the frame and clear flag
                frame_data = latest_frame
                latest_frame = None
                frame_ready = False

                if workflow is None:
                    continue

                # Decode frame
                frame = await decode_frame_async(frame_data)
                if frame is None:
                    continue

                typed_frame = cast(NDArray[np.uint8], frame)

                # Process frame through workflow
                state, _ = await workflow.process_frame(typed_frame)

                # Build response
                response: dict[str, Any] = {
                    "type": "state",
                    "data": {
                        "session_state": state.session_state.value,
                        "progress": state.get_progress(),
                        "analysis": state.analysis_result.model_dump()
                        if state.analysis_result
                        else None,
                    },
                }

                # Add keypoints
                if state.current_pose:
                    keypoints_data = {
                        str(idx): {
                            "x": pt.x,
                            "y": pt.y,
                            "visibility": pt.visibility,
                        }
                        for idx, pt in state.current_pose.keypoints.items()
                    }
                    response["keypoints"] = keypoints_data

                    if state.analysis_result:
                        if state.analysis_result.is_correct:
                            response["skeleton_color"] = "green"
                        elif state.analysis_result.score >= 60:
                            response["skeleton_color"] = "yellow"
                        else:
                            response["skeleton_color"] = "red"
                    else:
                        response["skeleton_color"] = "white"

                # Handle feedback - TTS in background
                if state.pending_feedback and state.should_speak:
                    feedback_text = state.pending_feedback.text
                    feedback_type = state.pending_feedback.type.value
                    state.should_speak = False

                    async def send_audio(
                        text: str = feedback_text,
                        ftype: str = feedback_type,
                    ) -> None:
                        try:
                            if workflow is None:
                                return
                            audio = await workflow.get_speech_audio()
                            if audio and is_connected:
                                await safe_send(
                                    {
                                        "type": "feedback",
                                        "text": text,
                                        "feedback_type": ftype,
                                        "audio": base64.b64encode(audio).decode(
                                            "utf-8"
                                        ),
                                    }
                                )
                        except Exception as e:
                            print(f"[WS] TTS error: {e}")

                    # Fire and forget
                    asyncio.create_task(send_audio())

                if state.session_state == SessionState.COMPLETED:
                    response["completed"] = True

                # Send response
                if not await safe_send(response):
                    break

            except Exception as e:
                print(f"[WS] Frame processor error: {e}")
                import traceback

                traceback.print_exc()

    async def message_receiver() -> None:
        """Receive messages from WebSocket."""
        nonlocal \
            workflow, \
            user_id, \
            session_start_time, \
            is_connected, \
            latest_frame, \
            frame_ready

        try:
            while not shutdown_event.is_set() and is_connected:
                raw_data = await websocket.receive_text()
                message = json.loads(raw_data)
                msg_type = message.get("type")

                if msg_type != "frame":
                    print(f"[WS] Received: {msg_type}")

                if msg_type == "start":
                    exercise_id = message.get("exercise_id")
                    user_id = message.get("user_id", "default_user")
                    use_llm = message.get("use_llm", True)

                    print(f"[WS] Starting: {exercise_id}")
                    await safe_send({"type": "ack", "message": "Starting..."})

                    try:
                        workflow = manager.create_workflow(session_id, use_llm=use_llm)
                        state = workflow.start_session(exercise_id)
                        session_start_time = datetime.now()

                        await safe_send(
                            {
                                "type": "state",
                                "data": {
                                    "session_state": state.session_state.value,
                                    "exercise": state.current_exercise.model_dump()
                                    if state.current_exercise
                                    else None,
                                    "progress": state.get_progress(),
                                },
                            }
                        )
                    except Exception as e:
                        print(f"[WS] Start error: {e}")
                        await safe_send({"type": "error", "message": str(e)})

                elif msg_type == "begin":
                    if workflow:
                        new_state = workflow.start_exercise()
                        if new_state:
                            await safe_send(
                                {
                                    "type": "state",
                                    "data": {
                                        "session_state": new_state.session_state.value,
                                        "progress": new_state.get_progress(),
                                    },
                                }
                            )

                elif msg_type == "frame":
                    if workflow is None:
                        continue

                    frame_data = message.get("data", "")
                    if not frame_data:
                        continue

                    # Update latest frame (always overwrites, no lock needed)
                    latest_frame = frame_data
                    frame_ready = True

                elif msg_type == "control":
                    if workflow is None:
                        continue

                    action = message.get("action")
                    state = None

                    if action == "pause":
                        state = workflow.pause()
                    elif action == "resume":
                        state = workflow.resume()
                    elif action == "rest":
                        state = workflow.rest()
                    elif action == "end_rest":
                        state = workflow.end_rest()
                    elif action == "end":
                        summary = workflow.end_session()

                        if session_start_time:
                            record = SessionRecord(
                                session_id=session_id,
                                user_id=user_id,
                                exercise_id=summary.get("exercise", "unknown"),
                                started_at=session_start_time,
                                ended_at=datetime.now(),
                                duration_seconds=summary.get("session_duration", 0),
                                average_score=summary.get("average_score", 0),
                                completed_sets=summary.get("completed_sets", 0),
                                completed_reps=summary.get("completed_reps", 0),
                            )

                            progress, new_achievements = (
                                manager.progress_tracker.record_session(user_id, record)
                            )

                            summary["new_achievements"] = [
                                {
                                    "name": a.name,
                                    "description": a.description,
                                    "icon": a.icon,
                                }
                                for a in new_achievements
                            ]
                            summary["progress_summary"] = (
                                manager.progress_tracker.get_summary(user_id)
                            )

                        await safe_send({"type": "session_ended", "summary": summary})
                        workflow = None
                        continue

                    if state:
                        await safe_send(
                            {
                                "type": "state",
                                "data": {
                                    "session_state": state.session_state.value,
                                    "progress": state.get_progress(),
                                },
                            }
                        )

        except WebSocketDisconnect:
            print(f"[WS] Disconnected: {session_id}")
        except Exception as e:
            print(f"[WS] Receiver error: {e}")
        finally:
            is_connected = False
            shutdown_event.set()

    # Run receiver and processor concurrently
    try:
        await asyncio.gather(
            message_receiver(),
            frame_processor(),
            return_exceptions=True,
        )
    finally:
        shutdown_event.set()
        manager.disconnect(session_id)
