from fastapi.testclient import TestClient
from main import app
from services.whisper_service import whisper_service
from services.gemini_service import gemini_service

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "HEALTHY"

def test_whisper_service_fallback():
    sample_audio_bytes = b"RIFF....WAVEfmt ....data...."
    transcript = whisper_service.transcribe_audio_bytes(sample_audio_bytes)
    assert isinstance(transcript, str)
    assert len(transcript) > 0

def test_gemini_service_trauma_extraction():
    test_transcript = "54 year old male collapsed with crushing chest pain, dyspnea, and blood pressure 82/52."
    result = gemini_service.extract_trauma_from_transcript(test_transcript)
    
    assert result.transcript == test_transcript
    assert result.esiLevel in ["RED_LEVEL_1", "YELLOW_LEVEL_2", "GREEN_LEVEL_3"]
    assert result.shockRiskScore >= 0.0 and result.shockRiskScore <= 1.0
    assert len(result.suggestedPrecautions) > 0

def test_base64_audio_extraction_endpoint():
    payload = {
        "audioBase64": "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
        "incidentType": "CARDIAC_ARREST"
    }
    response = client.post("/api/audio/extract-trauma-base64", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "primaryDiagnosis" in data
    assert "esiLevel" in data
    assert "suggestedPrecautions" in data
