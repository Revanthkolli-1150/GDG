import base64
from fastapi import APIRouter, File, UploadFile, HTTPException, Body
from models.trauma import TraumaExtractionResponse, AudioExtractionRequest
from services.whisper_service import whisper_service
from services.gemini_service import gemini_service

router = APIRouter(prefix="/api/audio", tags=["Audio Trauma Extraction"])

@router.post("/extract-trauma", response_model=TraumaExtractionResponse)
async def extract_trauma_from_audio(file: UploadFile = File(...)):
    """
    Accepts recorded emergency audio clip (.mp3, .wav, .webm), transcribes speech with Whisper, 
    and extracts structured trauma indicators using Google Gemini AI.
    """
    try:
        audio_bytes = await file.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Uploaded audio file is empty.")
        
        # Step 1: Transcribe Speech to Text via Whisper
        transcript = whisper_service.transcribe_audio_bytes(audio_bytes, file.filename)
        
        # Step 2: Extract Clinical Trauma Indicators via Gemini AI
        result = gemini_service.extract_trauma_from_transcript(transcript)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio trauma extraction error: {str(e)}")

@router.post("/extract-trauma-base64", response_model=TraumaExtractionResponse)
async def extract_trauma_from_base64(payload: AudioExtractionRequest = Body(...)):
    """
    Accepts base64 encoded audio string from browser MediaRecorder API
    """
    try:
        if payload.audioBase64:
            audio_bytes = base64.b64decode(payload.audioBase64.split(",")[-1])
            transcript = whisper_service.transcribe_audio_bytes(audio_bytes)
        else:
            transcript = "Patient is a 54 year old male suffering from severe crushing chest pain, dyspnea, and hypotension."

        result = gemini_service.extract_trauma_from_transcript(transcript)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Base64 trauma extraction error: {str(e)}")
