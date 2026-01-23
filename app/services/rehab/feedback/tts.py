"""Text-to-Speech module using edge-tts."""

import asyncio
import hashlib
import io
from pathlib import Path

import edge_tts

from app.core.config import get_settings

settings = get_settings()


class TTSEngine:
    """Text-to-Speech engine using Microsoft Edge TTS."""

    def __init__(
        self,
        voice: str | None = None,
        rate: str | None = None,
        cache_dir: Path | None = None,
    ) -> None:
        """Initialize the TTS engine.

        Args:
            voice: Voice name (e.g., "zh-CN-XiaoxiaoNeural").
            rate: Speech rate adjustment (e.g., "-10%", "+20%").
            cache_dir: Directory to cache generated audio files.
        """
        self.voice = voice or settings.tts_voice
        self.rate = rate or settings.tts_rate
        self.cache_dir = cache_dir or Path("./tts_cache")
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        # Available Chinese voices
        self.available_voices = {
            "xiaoxiao": "zh-CN-XiaoxiaoNeural",  # Female, warm
            "yunxi": "zh-CN-YunxiNeural",  # Male, friendly
            "xiaoyi": "zh-CN-XiaoyiNeural",  # Female, lively
            "yunjian": "zh-CN-YunjianNeural",  # Male, professional
        }

    async def synthesize(self, text: str) -> bytes:
        """Synthesize speech from text.

        Args:
            text: Text to synthesize.

        Returns:
            Audio data as bytes (MP3 format).
        """
        # Check cache first
        cache_key = self._get_cache_key(text)
        cache_path = self.cache_dir / f"{cache_key}.mp3"

        if cache_path.exists():
            return cache_path.read_bytes()

        # Generate new audio
        communicate = edge_tts.Communicate(
            text=text,
            voice=self.voice,
            rate=self.rate,
        )

        audio_data = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data.write(chunk["data"])

        audio_bytes = audio_data.getvalue()

        # Cache the result
        if audio_bytes:
            cache_path.write_bytes(audio_bytes)

        return audio_bytes

    async def synthesize_to_file(self, text: str, output_path: Path) -> Path:
        """Synthesize speech and save to file.

        Args:
            text: Text to synthesize.
            output_path: Path to save the audio file.

        Returns:
            Path to the saved audio file.
        """
        audio_data = await self.synthesize(text)
        output_path.write_bytes(audio_data)
        return output_path

    def set_voice(self, voice_name: str) -> None:
        """Set the voice by name or full identifier.

        Args:
            voice_name: Short name (e.g., "xiaoxiao") or full name.
        """
        if voice_name in self.available_voices:
            self.voice = self.available_voices[voice_name]
        else:
            self.voice = voice_name

    def set_rate(self, rate: str) -> None:
        """Set the speech rate.

        Args:
            rate: Rate adjustment (e.g., "-10%", "+20%").
        """
        self.rate = rate

    def _get_cache_key(self, text: str) -> str:
        """Generate a cache key for the given text."""
        content = f"{text}:{self.voice}:{self.rate}"
        return hashlib.md5(content.encode()).hexdigest()

    def clear_cache(self) -> int:
        """Clear the TTS cache.

        Returns:
            Number of files deleted.
        """
        count = 0
        for file in self.cache_dir.glob("*.mp3"):
            file.unlink()
            count += 1
        return count

    @staticmethod
    async def list_voices(language: str = "zh") -> list[dict]:
        """List available voices for a language.

        Args:
            language: Language code (e.g., "zh", "en").

        Returns:
            List of voice information dicts.
        """
        voices = await edge_tts.list_voices()
        filtered = [v for v in voices if v["Locale"].startswith(language)]
        return [
            {
                "name": v["ShortName"],
                "gender": v["Gender"],
                "locale": v["Locale"],
            }
            for v in filtered
        ]


class TTSQueue:
    """Manages a queue of TTS requests to prevent overlap."""

    def __init__(self, engine: TTSEngine) -> None:
        """Initialize the TTS queue.

        Args:
            engine: TTSEngine instance to use.
        """
        self.engine = engine
        self._queue: asyncio.Queue[str] = asyncio.Queue()
        self._current_audio: bytes | None = None
        self._is_speaking = False
        self._task: asyncio.Task | None = None

    async def start(self) -> None:
        """Start processing the queue."""
        self._task = asyncio.create_task(self._process_queue())

    async def stop(self) -> None:
        """Stop processing the queue."""
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def speak(self, text: str, priority: bool = False) -> None:
        """Add text to the speech queue.

        Args:
            text: Text to speak.
            priority: If True, clears queue and speaks immediately.
        """
        if priority:
            # Clear existing queue
            while not self._queue.empty():
                try:
                    self._queue.get_nowait()
                except asyncio.QueueEmpty:
                    break

        await self._queue.put(text)

    async def _process_queue(self) -> None:
        """Process items in the queue."""
        while True:
            text = await self._queue.get()
            self._is_speaking = True

            try:
                self._current_audio = await self.engine.synthesize(text)
                # In a real implementation, you would play the audio here
                # For now, we just store it for retrieval via WebSocket
            except Exception:
                pass
            finally:
                self._is_speaking = False
                self._queue.task_done()

    def get_current_audio(self) -> bytes | None:
        """Get the most recently synthesized audio."""
        return self._current_audio

    @property
    def is_speaking(self) -> bool:
        """Check if currently speaking."""
        return self._is_speaking


def create_tts_engine(**kwargs) -> TTSEngine:
    """Factory function to create a TTSEngine."""
    return TTSEngine(**kwargs)


def create_tts_queue(engine: TTSEngine | None = None) -> TTSQueue:
    """Factory function to create a TTSQueue."""
    if engine is None:
        engine = create_tts_engine()
    return TTSQueue(engine)
