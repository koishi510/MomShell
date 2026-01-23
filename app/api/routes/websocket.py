"""WebSocket route for real-time coaching communication."""

import base64
import json
from datetime import datetime
from typing import Any, cast

import cv2
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from numpy.typing import NDArray

from app.schemas.progress import SessionRecord
from app.services.rehab.progress.tracker import ProgressTracker, create_progress_tracker
from app.services.rehab.workflow.graph import CoachWorkflow, create_workflow
from app.services.rehab.workflow.state import SessionState

router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections for coaching sessions."""

    def __init__(self) -> None:
        """Initialize the connection manager."""
        self._active_connections: dict[str, WebSocket] = {}
        self._workflows: dict[str, CoachWorkflow] = {}
        self._progress_tracker = create_progress_tracker()

    async def connect(self, websocket: WebSocket, session_id: str) -> None:
        """Accept a new WebSocket connection.

        Args:
            websocket: WebSocket connection.
            session_id: Session identifier.
        """
        await websocket.accept()
        self._active_connections[session_id] = websocket

    def disconnect(self, session_id: str) -> None:
        """Remove a disconnected session.

        Args:
            session_id: Session to remove.
        """
        self._active_connections.pop(session_id, None)
        workflow = self._workflows.pop(session_id, None)
        if workflow:
            # End session and record progress
            workflow.end_session()

    async def send_json(self, session_id: str, data: dict[str, Any]) -> None:
        """Send JSON data to a session.

        Args:
            session_id: Target session.
            data: Data to send.
        """
        websocket = self._active_connections.get(session_id)
        if websocket:
            await websocket.send_json(data)

    async def broadcast(self, data: dict[str, Any]) -> None:
        """Broadcast data to all connections.

        Args:
            data: Data to broadcast.
        """
        for session_id in self._active_connections:
            await self.send_json(session_id, data)

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

    Protocol:
    - Client sends: { "type": "start", "exercise_id": "...", "user_id": "..." }
    - Client sends: { "type": "frame", "data": "<base64 encoded image>" }
    - Client sends: { "type": "control", "action": "pause|resume|rest|end_rest|end" }
    - Server sends: { "type": "state", "data": {...} }
    - Server sends: { "type": "feedback", "text": "...", "audio": "<base64>" }
    - Server sends: { "type": "annotated_frame", "data": "<base64>" }
    """
    import logging

    logging.basicConfig(level=logging.INFO)

    await manager.connect(websocket, session_id)
    print(f"[WS] Connected: {session_id}")

    workflow: CoachWorkflow | None = None
    user_id: str = "default_user"
    session_start_time: datetime | None = None
    is_connected = True
    is_processing_frame = False  # Throttle flag
    frame_count = 0

    async def safe_send(data: dict[str, Any]) -> bool:
        """Safely send data, return False if connection is closed."""
        nonlocal is_connected
        if not is_connected:
            return False
        try:
            await manager.send_json(session_id, data)
            return True
        except Exception as e:
            print(f"[WS] Send failed: {e}")
            is_connected = False
            return False

    try:
        while is_connected:
            # Receive message
            raw_data = await websocket.receive_text()
            message = json.loads(raw_data)
            msg_type = message.get("type")
            if msg_type != "frame":  # Only log non-frame messages
                print(f"[WS] Received message type: {msg_type}")

            if msg_type == "start":
                # Start a new coaching session
                exercise_id = message.get("exercise_id")
                user_id = message.get("user_id", "default_user")
                use_llm = message.get("use_llm", True)

                print(f"[WS] Starting session with exercise: {exercise_id}")

                # Send immediate ack to keep connection alive
                await safe_send({"type": "ack", "message": "Starting session..."})

                try:
                    workflow = manager.create_workflow(session_id, use_llm=use_llm)
                    state = workflow.start_session(exercise_id)
                    session_start_time = datetime.now()
                    print(f"[WS] Session started: {state.session_state.value}")

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
                except ValueError as e:
                    print(f"[WS] ValueError: {e}")
                    await safe_send({"type": "error", "message": str(e)})
                except Exception as e:
                    print(f"[WS] Error starting session: {e}")
                    await safe_send(
                        {"type": "error", "message": f"Failed to start: {e}"}
                    )

            elif msg_type == "begin":
                # Begin exercising after preparation
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
                # Process a video frame
                if workflow is None:
                    continue

                # Skip frame if still processing previous one (throttling)
                if is_processing_frame:
                    continue

                frame_count += 1
                # Only process every other frame for better performance
                if frame_count % 2 != 0:
                    continue

                # Decode base64 frame
                frame_data = message.get("data", "")
                if not frame_data:
                    continue

                is_processing_frame = True
                try:
                    # Decode base64 to image
                    img_bytes = base64.b64decode(frame_data)
                    nparr = np.frombuffer(img_bytes, np.uint8)
                    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                    if frame is None:
                        is_processing_frame = False
                        continue

                    # Cast to expected type for type checker
                    typed_frame = cast(NDArray[np.uint8], frame)

                    # Process frame through workflow
                    state, annotated_frame = await workflow.process_frame(typed_frame)

                    # Encode annotated frame (reduced quality for performance)
                    _, buffer = cv2.imencode(
                        ".jpg", annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 60]
                    )
                    annotated_b64 = base64.b64encode(buffer.tobytes()).decode("utf-8")

                    # Send state update
                    response: dict[str, Any] = {
                        "type": "state",
                        "data": {
                            "session_state": state.session_state.value,
                            "progress": state.get_progress(),
                            "analysis": state.analysis_result.model_dump()
                            if state.analysis_result
                            else None,
                        },
                        "annotated_frame": annotated_b64,
                    }

                    # Include feedback if available
                    if state.pending_feedback and state.should_speak:
                        audio = await workflow.get_speech_audio()
                        response["feedback"] = {
                            "text": state.pending_feedback.text,
                            "type": state.pending_feedback.type.value,
                            "audio": base64.b64encode(audio).decode("utf-8")
                            if audio
                            else None,
                        }
                        state.should_speak = False

                    # Check if session completed
                    if state.session_state == SessionState.COMPLETED:
                        response["completed"] = True

                    if not await safe_send(response):
                        break

                except Exception as e:
                    print(f"[WS] Frame error: {e}")
                    if not await safe_send(
                        {"type": "error", "message": f"Frame error: {e}"}
                    ):
                        break
                finally:
                    is_processing_frame = False

            elif msg_type == "control":
                # Handle control commands
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
                    # End session and record progress
                    summary = workflow.end_session()

                    if session_start_time:
                        # Create session record
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

                        # Record progress and check achievements
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
        manager.disconnect(session_id)
    except Exception as e:
        print(f"[WS] Error: {e}")
        manager.disconnect(session_id)
