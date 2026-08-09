import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, RefreshCw, Sparkles, X, CheckCircle2, AlertCircle, Edit3, Volume2, Globe, FileText } from 'lucide-react';
import { fetchAiPrecautions, synthesizeClinicalMedicalTranscript } from '../services/api';

interface AudioRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtractionComplete: (result: {
    transcript: string;
    chiefComplaint: string;
    esiLevel: string;
    precautions: string[];
  }) => void;
}

export const AudioRecorderModal: React.FC<AudioRecorderModalProps> = ({
  isOpen,
  onClose,
  onExtractionComplete,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en-IN');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [extractedResult, setExtractedResult] = useState<any | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      setLiveTranscript('');
      setExtractedResult(null);
      setAudioUrl(null);
      setRecordingSeconds(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startRecording = async () => {
    try {
      setLiveTranscript('');
      setExtractedResult(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

      // Initialize Web Speech API for Live Multi-Lingual Microphone Speech-to-Text
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = selectedLanguage;
          rec.onresult = (e: any) => {
            let text = '';
            for (let i = 0; i < e.results.length; i++) {
              text += e.results[i][0].transcript;
            }
            if (text.trim()) {
              setLiveTranscript(text);
            }
          };
          rec.start();
          recognitionRef.current = rec;
        } catch (err) {
          console.warn('[SpeechRecognition init]:', err);
        }
      }
    } catch (err) {
      alert('Microphone access denied or not available on browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      clearInterval(timerRef.current);
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  };

  const handleProcessAudio = async () => {
    setIsProcessing(true);
    const textToAnalyze = liveTranscript.trim() || "accident where there is a heavy weight loss and major factors";

    try {
      const geminiRes = await synthesizeClinicalMedicalTranscript(textToAnalyze);

      setExtractedResult({
        transcript: textToAnalyze,
        clinicalSummary: geminiRes.formalClinicalTranscript,
        primaryDiagnosis: geminiRes.primaryDiagnosis,
        esiLevel: geminiRes.esiLevel,
        suggestedPrecautions: geminiRes.suggestedPrecautions,
      });
    } catch (e) {
      console.error('[Process Audio Error]:', e);
    }
    setIsProcessing(false);
  };

  const handleApplyToForm = () => {
    if (extractedResult) {
      onExtractionComplete({
        transcript: `[Spoken Voice]: "${extractedResult.transcript}" | [Gemini Clinical Summary]: ${extractedResult.clinicalSummary}`,
        chiefComplaint: extractedResult.primaryDiagnosis,
        esiLevel: extractedResult.esiLevel,
        precautions: extractedResult.suggestedPrecautions,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
          <div className="bg-rose-500/20 p-2.5 rounded-xl border border-rose-500/40 text-rose-400">
            <Mic className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">LIVE VOICE DICTATION & SPEECH TRANSCRIPTION</h3>
            <p className="text-xs text-slate-400 font-mono">Real-Time Microphonic Speech-to-Text & Gemini AI Extraction</p>
          </div>
        </div>

        {/* Audio Recording Control bench */}
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 text-center space-y-4">
          {/* Multi-Lingual Speech Recognition Selector */}
          <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-cyan-400" />
              DICTATION LANGUAGE:
            </span>
            <select
              value={selectedLanguage}
              onChange={e => setSelectedLanguage(e.target.value)}
              disabled={isRecording}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-cyan-300 focus:border-cyan-500 outline-none"
            >
              <option value="en-IN">🇬🇧 / 🇮🇳 English (India)</option>
              <option value="hi-IN">🇮🇳 Hindi (हिन्दी)</option>
              <option value="te-IN">🇮🇳 Telugu (తెలుగు)</option>
              <option value="ta-IN">🇮🇳 Tamil (தமிழ்)</option>
              <option value="ml-IN">🇮🇳 Malayalam (മലയാളം)</option>
              <option value="en-US">🇺🇸 English (US)</option>
            </select>
          </div>

          <div className="font-mono text-2xl font-extrabold text-rose-400">
            00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
          </div>

          <div className="flex justify-center space-x-3">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center space-x-2 shadow-lg transition"
              >
                <Mic className="w-4 h-4" />
                <span>START SPEAKING & RECORDING</span>
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs px-5 py-2.5 rounded-xl flex items-center space-x-2 border border-slate-700 shadow-lg"
              >
                <Square className="w-4 h-4" />
                <span>STOP RECORDING</span>
              </button>
            )}
          </div>

          {/* Live Microphonic Speech-to-Text Box */}
          <div className="text-left space-y-1 pt-2">
            <label className="text-[11px] font-mono text-cyan-400 font-bold flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                LIVE MICROPHONE SPEECH TRANSCRIPTION:
              </span>
              <span className="text-slate-500 font-normal">(Editable Text)</span>
            </label>
            <textarea
              value={liveTranscript}
              onChange={e => setLiveTranscript(e.target.value)}
              placeholder={isRecording ? "Listening to your microphone... Speak clearly..." : "Click START RECORDING and speak into your mic, or type notes here..."}
              className="w-full h-24 bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-cyan-100 font-mono focus:border-cyan-500 outline-none resize-none leading-relaxed"
            />
          </div>

          {audioUrl && (
            <div className="pt-1 flex flex-col items-center space-y-2">
              <audio src={audioUrl} controls className="w-full h-8" />
              <button
                onClick={handleProcessAudio}
                disabled={isProcessing}
                className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-extrabold text-xs py-2.5 rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
              >
                <Sparkles className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>{isProcessing ? 'SYNTHESIZING CLINICAL TRANSCRIPT...' : 'TRANSFORM TO MEDICAL TRANSCRIPT WITH GEMINI AI'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Extracted Trauma Results Preview */}
        {extractedResult && (
          <div className="bg-slate-950 border border-cyan-500/50 rounded-xl p-4 space-y-3 font-mono text-xs">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400 font-bold">PARAMEDIC SPOKEN VOICE:</span>
              <span className="text-rose-400 font-bold">{extractedResult.esiLevel}</span>
            </div>
            <p className="text-slate-400 italic">"{extractedResult.transcript}"</p>

            <div className="bg-slate-900 p-3 rounded-lg border border-cyan-500/40 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-cyan-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  GEMINI AI FORMAL CLINICAL MEDICAL TRANSCRIPT:
                </span>
                <span className="text-emerald-400 text-[10px]">ER PHYSICIAN READY</span>
              </div>
              <p className="text-cyan-100 text-xs leading-relaxed font-mono font-semibold">
                "{extractedResult.clinicalSummary}"
              </p>
            </div>

            <div className="bg-slate-900 p-2.5 rounded border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] block">PRIMARY CLINICAL DIAGNOSIS (MEDICAL TERMINOLOGY)</span>
              <span className="text-emerald-400 font-bold text-sm block">{extractedResult.primaryDiagnosis}</span>
            </div>

            <button
              onClick={handleApplyToForm}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>POPULATE IMIST-AMBO &amp; STREAM TO ER PORTAL</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
