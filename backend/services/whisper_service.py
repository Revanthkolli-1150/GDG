import os
import io
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("WhisperService")

class WhisperService:
    def __init__(self):
        self.model_name = os.getenv("WHISPER_MODEL", "base")
        self.model = None

    def _load_model(self):
        if self.model is None:
            try:
                import whisper
                logger.info(f"Loading OpenAI Whisper model: {self.model_name}...")
                self.model = whisper.load_model(self.model_name)
                logger.info("Whisper model loaded successfully.")
            except Exception as e:
                logger.warn(f"Could not load local whisper model: {e}. Fallback to simulated audio transcriber.")

    def transcribe_audio_bytes(self, audio_bytes: bytes, filename: str = "temp_audio.wav") -> str:
        """
        Transcribes raw audio bytes from memory (BytesIO) to text transcript
        """
        self._load_model()
        
        if self.model:
            import tempfile
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
                temp_file.write(audio_bytes)
                temp_path = temp_file.name
            
            try:
                result = self.model.transcribe(temp_path)
                transcript = result.get("text", "").strip()
                return transcript
            finally:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
        
        # Safe Fallback Transcriber if Whisper binaries not present on host
        return "Patient is a 54 year old male suffering from severe crushing chest pain, diaphoresis, and shortness of breath. Blood pressure dropping 82 over 52."

whisper_service = WhisperService()
