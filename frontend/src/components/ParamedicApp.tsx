import React, { useState, useEffect } from 'react';
import { Ambulance, Incident, ESITriageLevel, PatientTriage } from '../types';
import { offlineQueue, OfflineSyncStatus } from '../services/offlineQueue';
import { emitParamedicVitals, emitParamedicGps } from '../services/socket';
import { completeHospitalHandoff, fetchAiPrecautions, fetchShockIndex, saveTriageRecord } from '../services/api';
import { AudioRecorderModal } from './AudioRecorderModal';
import { Stethoscope, Heart, ShieldAlert, CheckCircle2, Wifi, WifiOff, RefreshCw, Send, Radio, Bot, AlertTriangle, Mic, PhoneCall, MapPin, UserCheck, Copy } from 'lucide-react';

interface ParamedicAppProps {
  ambulances: Ambulance[];
  incidents: Incident[];
  syncStatus: OfflineSyncStatus;
  onRefreshData: () => void;
}

export const ParamedicApp: React.FC<ParamedicAppProps> = ({
  ambulances,
  incidents,
  syncStatus,
  onRefreshData,
}) => {
  const currentAmbulance = ambulances[0] || {
    id: 'b1111111-1111-1111-1111-111111111111',
    callSign: '108-ALS-DEL-01',
    status: 'TRANSPORTING',
    vehiclePlate: 'DL-01-GA-1081',
  };

  const currentIncident = incidents.find(i => i.id === currentAmbulance.assignedIncidentId) || incidents[0] || {
    id: 'c1111111-1111-1111-1111-111111111111',
    incidentType: 'CARDIAC_ARREST',
    addressText: 'Connaught Place Outer Circle, Block C, New Delhi',
  };

  // Form State
  const [patientName, setPatientName] = useState('Ramesh Gupta');
  const [patientAge, setPatientAge] = useState(54);
  const [patientGender, setPatientGender] = useState('Male');
  const [esiLevel, setEsiLevel] = useState<ESITriageLevel>('RED_LEVEL_1');
  const [chiefComplaint, setChiefComplaint] = useState('Acute Myocardial Infarction / Chest Pain');
  const [heartRate, setHeartRate] = useState(132);
  const [bpSystolic, setBpSystolic] = useState(82);
  const [bpDiastolic, setBpDiastolic] = useState(52);
  const [spo2, setSpo2] = useState(90);
  const [respiratoryRate, setRespiratoryRate] = useState(26);
  const [ekgRhythm, setEkgRhythm] = useState('Sinus Tachycardia w/ ST Elevation V2-V4');
  const [notes, setNotes] = useState('Patient alert, High Flow O2 @ 6L/min, Aspirin 325mg & IV Normal Saline bolus in transit to AIIMS.');

  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);
  const [handoffResult, setHandoffResult] = useState<string | null>(null);

  // Audio Recorder Modal State
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);

  // Clinical Calculation & AI Protocol State
  const [shockIndexInfo, setShockIndexInfo] = useState<any | null>(null);
  const [aiProtocols, setAiProtocols] = useState<any | null>(null);

  useEffect(() => {
    fetchShockIndex(heartRate, bpSystolic).then(res => setShockIndexInfo(res));
  }, [heartRate, bpSystolic]);

  useEffect(() => {
    fetchAiPrecautions(currentIncident.incidentType, chiefComplaint, {
      heartRate,
      bpSystolic,
      bpDiastolic,
      spo2,
    }).then(res => setAiProtocols(res));
  }, [currentIncident.incidentType, chiefComplaint]);

  const buildCurrentTriageRecord = (): PatientTriage => ({
    id: `triage-${currentIncident.id}`,
    incidentId: currentIncident.id,
    ambulanceId: currentAmbulance.id,
    patientName,
    patientAge,
    patientGender,
    esiLevel,
    chiefComplaint,
    heartRate,
    bpSystolic,
    bpDiastolic,
    spo2,
    respiratoryRate,
    temperatureCelsius: 36.8,
    ekgRhythm,
    notes,
    recordedAt: new Date().toLocaleTimeString(),
  });

  const handleAudioExtractionComplete = async (result: {
    transcript: string;
    chiefComplaint: string;
    esiLevel: string;
    precautions: string[];
  }) => {
    setChiefComplaint(result.chiefComplaint);
    let updatedEsi = esiLevel;
    if (result.esiLevel === 'RED_LEVEL_1' || result.esiLevel === 'YELLOW_LEVEL_2' || result.esiLevel === 'GREEN_LEVEL_3') {
      updatedEsi = result.esiLevel as ESITriageLevel;
      setEsiLevel(updatedEsi);
    }
    const precText = Array.isArray(result.precautions) && result.precautions.length > 0
      ? result.precautions.slice(0, 2).join('; ')
      : 'High Flow O2 @ 15L/min & Saline bolus';
    const updatedNotes = `[Voice Note]: ${result.transcript} | AI Precautions: ${precText}`;
    setNotes(updatedNotes);

    const triageRecord: PatientTriage = {
      ...buildCurrentTriageRecord(),
      chiefComplaint: result.chiefComplaint,
      esiLevel: updatedEsi,
      notes: updatedNotes,
      voiceTranscript: result.transcript,
    };

    await saveTriageRecord(triageRecord);
    emitParamedicVitals(triageRecord);
    setSavedSuccessMessage('Voice note extracted & streamed live to ER Doctor Portal!');
    setTimeout(() => setSavedSuccessMessage(null), 4000);
  };

  const handleSubmitTriage = async (e: React.FormEvent) => {
    e.preventDefault();

    const triageRecord = buildCurrentTriageRecord();

    await offlineQueue.enqueueTriageRecord(triageRecord);
    await saveTriageRecord(triageRecord);

    if (syncStatus.isOnline) {
      emitParamedicVitals(triageRecord);
      emitParamedicGps({
        ambulanceId: currentAmbulance.id,
        callSign: currentAmbulance.callSign,
        lat: currentAmbulance.location.lat,
        lng: currentAmbulance.location.lng,
        speed: currentAmbulance.speed || 48,
        bearing: currentAmbulance.bearing || 180,
        time: new Date().toISOString()
      });
    }

    setSavedSuccessMessage(
      syncStatus.isOnline
        ? 'IMIST-AMBO Triage telemetry streamed live to ER Doctor Portal!'
        : 'Network offline. Patient triage saved to IndexedDB local queue!'
    );

    setTimeout(() => setSavedSuccessMessage(null), 5000);
  };

  const handleCompleteHandoff = async () => {
    const res = await completeHospitalHandoff(currentAmbulance.id);
    setHandoffResult(res.actionTaken || 'Hospital handoff registered.');
    onRefreshData();
    setTimeout(() => setHandoffResult(null), 6000);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 text-white">
      {/* Voice Recorder Modal */}
      <AudioRecorderModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
        onExtractionComplete={handleAudioExtractionComplete}
      />

      {/* Paramedic Header & Offline Queue Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-cyan-500/20 p-2.5 rounded-lg border border-cyan-500/40 text-cyan-400">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">108 EMS Paramedic Field App</h2>
              <p className="text-xs text-slate-400 font-mono">Unit: {currentAmbulance.callSign} | {currentAmbulance.status}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsAudioModalOpen(true)}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 shadow-md"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>DICTATE VOICE NOTE</span>
            </button>

            <button
              onClick={() => offlineQueue.toggleSimulationNetworkState(!syncStatus.isOnline)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition ${
                syncStatus.isOnline
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-600/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {syncStatus.isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{syncStatus.isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </button>
          </div>
        </div>

        {/* Offline Queue Counter Bar */}
        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${syncStatus.pendingCount > 0 ? 'bg-amber-500 animate-ping' : 'bg-emerald-400'}`}></span>
            <span>INDEXEDDB QUEUE: <strong className="text-cyan-400">{syncStatus.pendingCount}</strong> PENDING RECORDS</span>
          </div>

          {syncStatus.pendingCount > 0 && (
            <button
              onClick={() => offlineQueue.flushQueueToServer()}
              disabled={!syncStatus.isOnline || syncStatus.syncInProgress}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-[11px] font-bold px-2.5 py-1 rounded transition flex items-center space-x-1"
            >
              <RefreshCw className={`w-3 h-3 ${syncStatus.syncInProgress ? 'animate-spin' : ''}`} />
              <span>SYNC NOW</span>
            </button>
          )}
        </div>
      </div>

      {/* CONNECTED PUBLIC SOS CALLER & AI DISPATCH CARD */}
      {currentIncident && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-rose-950/40 border border-rose-500/50 rounded-xl p-4 space-y-3 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/40 animate-pulse">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-xs text-rose-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  LIVE PUBLIC SOS EMERGENCY DISPATCH
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block"></span>
                </h3>
                <p className="text-[11px] text-slate-300 font-bold">{currentIncident.incidentType} — {currentIncident.priority}</p>
              </div>
            </div>

            <button
              onClick={() => {
                if (currentIncident.callerName) setPatientName(currentIncident.callerName);
                if (currentIncident.incidentType) setChiefComplaint(currentIncident.incidentType + ' Emergency');
                if (currentIncident.description) setNotes(`[SOS Data]: ${currentIncident.description}`);
                setSavedSuccessMessage('Public SOS Caller Data loaded into IMIST-AMBO form!');
                setTimeout(() => setSavedSuccessMessage(null), 3000);
              }}
              className="bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-lg flex items-center space-x-1 shadow transition"
              title="Auto-fill patient triage from Public SOS alert"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>LOAD SOS TO TRIAGE</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-slate-400">
                <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>CALLER NAME:</span>
                <strong className="text-white">{currentIncident.callerName || 'Public Citizen'}</strong>
              </div>
              <div className="flex items-center space-x-1.5 text-slate-400">
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                <span>CALLER PHONE:</span>
                <strong className="text-amber-300">{currentIncident.callerPhone || '+91-9810010811'}</strong>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-start space-x-1.5 text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                <span>SPOT LOCATION:</span>
                <strong className="text-slate-200">{currentIncident.addressText}</strong>
              </div>
            </div>
          </div>

          {/* Gemini AI Protocol Protocols for Paramedics */}
          {aiProtocols && (
            <div className="bg-slate-950 p-3 rounded-lg border border-cyan-500/30 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400 font-bold border-b border-slate-900 pb-1">
                <span className="flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-cyan-400 animate-pulse" />
                  GEMINI AI PARAMEDIC PROTOCOLS:
                </span>
                <span className="text-emerald-400">DESTINATION: AIIMS TRAUMA CENTER</span>
              </div>

              <ul className="space-y-1 text-[11px] text-slate-300 font-mono">
                {aiProtocols.paramedicProtocols?.map((prot: string, i: number) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="text-cyan-400 font-bold shrink-0">&gt;</span>
                    <span>{prot}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Shock Index Real-Time Alert Banner */}
      {shockIndexInfo && shockIndexInfo.alertTriggered && (
        <div className="bg-rose-500/20 border border-rose-500/80 rounded-xl p-4 text-rose-300 text-xs font-mono space-y-1 shadow-2xl animate-pulse">
          <div className="font-extrabold text-sm text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            CRITICAL CLINICAL ALERT: SHOCK INDEX = {shockIndexInfo.shockIndex} (&gt; 0.9)
          </div>
          <p>{shockIndexInfo.clinicalInterpretation}</p>
        </div>
      )}

      {/* Success Alert */}
      {savedSuccessMessage && (
        <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-xl p-3 text-emerald-300 text-xs font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{savedSuccessMessage}</span>
        </div>
      )}

      {/* Dynamic Auto-Reroute Result Alert */}
      {handoffResult && (
        <div className="bg-amber-500/20 border border-amber-500/60 rounded-xl p-4 text-amber-200 text-xs font-mono space-y-1 shadow-lg animate-bounce">
          <div className="font-bold text-amber-400 flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-amber-400" />
            AUTOMATED POST-HANDOFF REROUTE ENGINE DISPATCH
          </div>
          <p>{handoffResult}</p>
        </div>
      )}

      {/* IMIST-AMBO Patient Triage Form */}
      <form onSubmit={handleSubmitTriage} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="font-bold text-sm text-cyan-400 flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500" />
            IMIST-AMBO PATIENT TRIAGE & VITALS LOG
          </h3>
          <span className="text-xs text-slate-400 font-mono">APPEND-ONLY LOCAL DB</span>
        </div>

        {/* Patient Identity */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Patient Name (I)</label>
            <input
              type="text"
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Age (A)</label>
            <input
              type="number"
              value={patientAge}
              onChange={e => setPatientAge(parseInt(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Gender</label>
            <select
              value={patientGender}
              onChange={e => setPatientGender(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* ESI Triage Selector */}
        <div>
          <label className="text-xs text-slate-400 block mb-1.5">ESI Triage Priority Level</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setEsiLevel('RED_LEVEL_1')}
              className={`p-2 rounded-lg border text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
                esiLevel === 'RED_LEVEL_1'
                  ? 'bg-rose-600 text-white border-rose-400 shadow-md'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>ESI-1 RED</span>
            </button>

            <button
              type="button"
              onClick={() => setEsiLevel('YELLOW_LEVEL_2')}
              className={`p-2 rounded-lg border text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
                esiLevel === 'YELLOW_LEVEL_2'
                  ? 'bg-amber-600 text-white border-amber-400 shadow-md'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>ESI-2 YELLOW</span>
            </button>

            <button
              type="button"
              onClick={() => setEsiLevel('GREEN_LEVEL_3')}
              className={`p-2 rounded-lg border text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
                esiLevel === 'GREEN_LEVEL_3'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>ESI-3 GREEN</span>
            </button>
          </div>
        </div>

        {/* Chief Complaint / Mechanism */}
        <div>
          <label className="text-xs text-slate-400 block mb-1">Mechanism of Injury / Complaint (M)</label>
          <input
            type="text"
            value={chiefComplaint}
            onChange={e => setChiefComplaint(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
          />
        </div>

        {/* Vital Signs Grid (S) & Shock Index Display */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <span className="text-[10px] text-slate-400 font-mono font-bold">SIGNS & VITALS (S)</span>
            {shockIndexInfo && (
              <span className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded ${
                shockIndexInfo.status === 'HIGH_RISK_SHOCK' ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50 animate-pulse' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                SHOCK INDEX: {shockIndexInfo.shockIndex} ({shockIndexInfo.status})
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">HEART RATE (BPM)</label>
              <input
                type="number"
                value={heartRate}
                onChange={e => setHeartRate(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-rose-400 font-bold font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">BP (SYS/DIA)</label>
              <div className="flex space-x-1">
                <input
                  type="number"
                  value={bpSystolic}
                  onChange={e => setBpSystolic(parseInt(e.target.value) || 0)}
                  className="w-1/2 bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-amber-400 font-bold font-mono"
                />
                <input
                  type="number"
                  value={bpDiastolic}
                  onChange={e => setBpDiastolic(parseInt(e.target.value) || 0)}
                  className="w-1/2 bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-amber-400 font-bold font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">SPO2 (%)</label>
              <input
                type="number"
                value={spo2}
                onChange={e => setSpo2(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-cyan-400 font-bold font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">RESP RATE (/MIN)</label>
              <input
                type="number"
                value={respiratoryRate}
                onChange={e => setRespiratoryRate(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-emerald-400 font-bold font-mono"
              />
            </div>
          </div>
        </div>

        {/* Treatment Given (T) */}
        <div>
          <label className="text-xs text-slate-400 block mb-1">Treatment Given in Transit (T)</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-wrap gap-2">
          <button
            type="submit"
            className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs py-2.5 rounded-lg shadow-lg transition flex items-center justify-center space-x-1.5"
          >
            <Send className="w-4 h-4" />
            <span>SAVE & STREAM IMIST-AMBO HANDOVER</span>
          </button>

          <button
            type="button"
            onClick={handleCompleteHandoff}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-lg transition flex items-center space-x-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>COMPLETE HOSPITAL HANDOFF & AUTO-REROUTE</span>
          </button>
        </div>
      </form>
    </div>
  );
};
