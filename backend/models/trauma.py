from pydantic import BaseModel, Field
from typing import List, Optional

class TraumaIndicator(BaseModel):
  category: str = Field(description="Category of trauma e.g. Hemorrhage, Fracture, Cardiac, Airway")
  severity: str = Field(description="Severity level e.g. CRITICAL_P1, URGENT_P2, STABLE_P3")
  description: str = Field(description="Detailed description of clinical finding")

class TraumaExtractionResponse(BaseModel):
  transcript: str = Field(description="Full speech-to-text transcript of audio recording")
  primaryDiagnosis: str = Field(description="Primary suspected medical emergency e.g. STEMI, Acute Hemorrhagic Shock")
  esiLevel: str = Field(description="Emergency Severity Index level e.g. RED_LEVEL_1, YELLOW_LEVEL_2, GREEN_LEVEL_3")
  shockRiskScore: float = Field(description="Estimated Shock Risk Score from 0.0 to 1.0")
  traumaIndicators: List[TraumaIndicator] = Field(default_factory=list)
  keyPhrases: List[str] = Field(default_factory=list)
  suggestedPrecautions: List[str] = Field(default_factory=list)
  extractedAt: str = Field(description="ISO timestamp of trauma extraction")

class AudioExtractionRequest(BaseModel):
  audioBase64: Optional[str] = None
  incidentType: Optional[str] = "EMERGENCY_CALL"
