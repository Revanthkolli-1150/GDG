import React, { useState, useEffect } from 'react';
import { Hospital, Ambulance, Incident, PatientTriage, ESITriageLevel } from '../types';
import { LiveMap } from './LiveMap';
import { subscribePatientVitals } from '../services/socket';
import { updateHospitalBays, fetchAiPrecautions, fetchShockIndex, fetchTriageRecords } from '../services/api';
import { Heart, Activity, Stethoscope, Bed, AlertTriangle, Clock, CheckCircle2, Bot, ShieldCheck, ClipboardList, Mic, Volume2, Sparkles, FileText, History } from 'lucide-react';

interface ERDashboardProps {
  hospitals: Hospital[];
  ambulances: Ambulance[];
  incidents: Incident[];
  onRefreshHospitals: () => void;
}

export const ERDashboard: React.FC<ERDashboardProps> = ({
  hospitals,
  ambulances,
  incidents,
  onRefreshHospitals,
}) => {
  const selectedHospital = hospitals[0] || {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'AIIMS Apex Trauma Center',
    traumaBaysTotal: 25,
    traumaBaysAvailable: 8,
    icuBedsAvailable: 5,
    status: 'NORMAL',
  };

  const [traumaBays, setTraumaBays] = useState<number>(selectedHospital.traumaBaysAvailable);
  const [aiErProtocol, setAiErProtocol] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'INBOUND' | 'HISTORY'>('INBOUND');
  const [confirmedBayMap, setConfirmedBayMap] = useState<Record<string, { confirmedAt: string; bayNumber: number }>>({});
  const [patientHistory, setPatientHistory] = useState<PatientTriage[]>([]);

  // Load saved history & confirmed bays from localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('er_patient_history');
      if (savedHistory) setPatientHistory(JSON.parse(savedHistory));

      const savedBays = localStorage.getItem('er_confirmed_bays');
      if (savedBays) setConfirmedBayMap(JSON.parse(savedBays));
    } catch (e) {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('er_patient_history', JSON.stringify(patientHistory));
    } catch (e) {}
  }, [patientHistory]);

  useEffect(() => {
    try {
      localStorage.setItem('er_confirmed_bays', JSON.stringify(confirmedBayMap));
    } catch (e) {}
  }, [confirmedBayMap]);

  // Incoming Patient Telemetry Stream Feed
  const [patientFeed, setPatientFeed] = useState<PatientTriage[]>([
    {
      id: 'triage-101',
      incidentId: 'c1111111-1111-1111-1111-111111111111',
      ambulanceId: 'b1111111-1111-1111-1111-111111111111',
      patientName: 'Ramesh Gupta',
      patientAge: 54,
      patientGender: 'Male',
      esiLevel: 'RED_LEVEL_1',
      chiefComplaint: 'Acute Myocardial Infarction / STEMI',
      heartRate: 132,
      bpSystolic: 82,
      bpDiastolic: 52,
      spo2: 90,
      respiratoryRate: 26,
      temperatureCelsius: 36.8,
      ekgRhythm: 'ST Elevation V2-V4 (Acute Anterior STEMI)',
      notes: 'O2 @ 6L via NC applied, Aspirin 325mg given, IV Saline running. ETA 4 mins.',
      recordedAt: new Date().toLocaleTimeString(),
    },
  ]);

  const [latestUpdateAlert, setLatestUpdateAlert] = useState<string | null>(null);

  // Load initial backend triages on mount
  useEffect(() => {
    fetchTriageRecords().then(records => {
      if (records && records.length > 0) {
        setPatientFeed(prev => {
          const map = new Map<string, PatientTriage>();
          prev.forEach(p => map.set(p.id || p.incidentId, p));
          records.forEach(r => map.set(r.id || r.incidentId, r));
          return Array.from(map.values());
        });
      }
    });
  }, []);

  const handleConfirmTraumaBay = async (triage: PatientTriage) => {
    const targetId = triage.id || triage.incidentId;
    const assignedBayNumber = Math.floor(Math.random() * 15) + 1;
    const timestamp = new Date().toLocaleTimeString();

    setConfirmedBayMap(prev => ({
      ...prev,
      [targetId]: { confirmedAt: timestamp, bayNumber: assignedBayNumber }
    }));

    await handleUpdateBays(-1);

    setPatientHistory(prev => {
      if (prev.some(p => (p.id || p.incidentId) === targetId)) return prev;
      return [{ ...triage, recordedAt: timestamp }, ...prev];
    });
  };

  // Fetch AI ER Readiness Protocol
  useEffect(() => {
    if (patientFeed.length > 0) {
      const latest = patientFeed[0];
      fetchAiPrecautions('STEMI_ACUTE_CARDIAC', latest.chiefComplaint, latest).then(res => setAiErProtocol(res));
    }
  }, [patientFeed]);

  // Subscribe to Socket.io real-time telemetry stream from paramedics
  useEffect(() => {
    const cleanup = subscribePatientVitals((incomingTriage: PatientTriage) => {
      setPatientFeed(prev => {
        const targetId = incomingTriage.id || incomingTriage.incidentId;
        const existsIndex = prev.findIndex(p => p.id === targetId || p.incidentId === incomingTriage.incidentId || p.ambulanceId === incomingTriage.ambulanceId);

        if (existsIndex >= 0) {
          const updated = [...prev];
          updated[existsIndex] = { ...incomingTriage, recordedAt: incomingTriage.recordedAt || new Date().toLocaleTimeString() };
          return updated;
        }
        return [incomingTriage, ...prev];
      });

      setLatestUpdateAlert(`LIVE PARAMEDIC UPDATE: ${incomingTriage.patientName || 'Patient'} vitals updated (${incomingTriage.heartRate} bpm, BP ${incomingTriage.bpSystolic}/${incomingTriage.bpDiastolic})`);
      setTimeout(() => setLatestUpdateAlert(null), 5000);
    });
    return cleanup;
  }, []);

  const handleUpdateBays = async (delta: number) => {
    const newCount = Math.max(0, Math.min(selectedHospital.traumaBaysTotal, traumaBays + delta));
    setTraumaBays(newCount);
    await updateHospitalBays(selectedHospital.id, newCount);
    onRefreshHospitals();
  };

  const calculateShockIndex = (hr: number, sbp: number) => {
    if (!sbp || sbp === 0) return 0;
    return parseFloat((hr / sbp).toFixed(2));
  };

  const getEsiBadge = (level: ESITriageLevel) => {
    switch (level) {
      case 'RED_LEVEL_1':
        return (
          <span className="bg-rose-500/20 text-rose-300 border border-rose-500/50 px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            ESI-1 RED (RESUSCITATION)
          </span>
        );
      case 'YELLOW_LEVEL_2':
        return (
          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/50 px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            ESI-2 YELLOW (EMERGENT)
          </span>
        );
      default:
        return (
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            ESI-3 GREEN (URGENT)
          </span>
        );
    }
  };

  return (
    <div className="w-full h-full flex flex-col space-y-4 p-4 bg-slate-950 text-white">
      {/* Top Header & Hospital Capacity Editor Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-500/20 p-2.5 rounded-lg border border-emerald-500/40 text-emerald-400">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-white flex items-center gap-2">
              {selectedHospital.name}
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                APEX TRAUMA CENTER LEVEL 1 (INDIA)
              </span>
            </h2>
            <p className="text-xs text-slate-400">108 EMS Pre-Arrival Telemetry & IMIST-AMBO Clinical Handover Feed</p>
          </div>
        </div>

        {/* Trauma Bays & ICU Beds Controller */}
        <div className="flex items-center space-x-6 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
          <div className="flex items-center space-x-3">
            <Bed className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-xs text-slate-400 block font-mono">AVAILABLE TRAUMA BAYS</span>
              <span className="font-extrabold text-lg text-cyan-300">
                {traumaBays} <span className="text-xs font-normal text-slate-400">/ {selectedHospital.traumaBaysTotal}</span>
              </span>
            </div>
            <div className="flex items-center space-x-1 pl-2">
              <button
                onClick={() => handleUpdateBays(-1)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-2 py-1 rounded font-bold text-xs"
              >
                -
              </button>
              <button
                onClick={() => handleUpdateBays(1)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-2 py-1 rounded font-bold text-xs"
              >
                +
              </button>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-800"></div>

          <div>
            <span className="text-xs text-slate-400 block font-mono">ICU BEDS</span>
            <span className="font-extrabold text-lg text-emerald-400">
              {selectedHospital.icuBedsAvailable} <span className="text-xs font-normal text-slate-400">Available</span>
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Paramedic Telemetry Update Alert Banner */}
      {latestUpdateAlert && (
        <div className="bg-cyan-500/20 border border-cyan-400 rounded-xl p-3.5 flex items-center space-x-3 text-cyan-200 text-xs font-mono font-bold shadow-2xl animate-pulse">
          <Activity className="w-5 h-5 text-cyan-400 shrink-0" />
          <span>{latestUpdateAlert}</span>
        </div>
      )}

      {/* AI ER Pre-Arrival Readiness Protocol Banner */}
      {aiErProtocol && aiErProtocol.hospitalErPreparation && (
        <div className="bg-slate-900 border border-cyan-500/50 rounded-xl p-3.5 flex items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="bg-cyan-500/20 p-2 rounded-lg text-cyan-400 border border-cyan-500/40">
              <Bot className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider block font-mono">
                GEMINI AI ER PRE-ARRIVAL PREPARATION PROTOCOL:
              </span>
              <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-200 font-semibold">
                {aiErProtocol.hospitalErPreparation.map((prep: string, idx: number) => (
                  <span key={idx} className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 inline" />
                    {prep}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow shrink-0">
            ACTIVATE CARDIAC CATH LAB
          </button>
        </div>
      )}

      {/* Split View: Left Map, Right Incoming Triage Cards & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Left View: Live Tracking Map */}
        <div className="lg:col-span-7 flex flex-col space-y-2">
          <div className="bg-slate-900 px-4 py-2 rounded-t-xl border border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              108 EMS GEOSPATIAL PRE-ARRIVAL TRACKING
            </span>
            <span className="text-xs text-slate-400 font-mono">DELHI NCR METRO CORRIDORS</span>
          </div>
          <div className="flex-1 min-h-[460px]">
            <LiveMap ambulances={ambulances} incidents={incidents} hospitals={hospitals} />
          </div>
        </div>

        {/* Right View: Incoming Patient Triage Cards & IMIST-AMBO Feed */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          <div className="bg-slate-900 px-4 py-3 rounded-xl border border-slate-800 flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('INBOUND')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                  activeTab === 'INBOUND'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>ACTIVE INBOUND ({patientFeed.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('HISTORY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                  activeTab === 'HISTORY'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>PATIENT ADMISSION HISTORY ({patientHistory.length})</span>
              </button>
            </div>

            <span className="text-xs text-rose-400 font-mono bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
              SOCKET.IO LIVE
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[560px]">
            {(activeTab === 'INBOUND' ? patientFeed : patientHistory).length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm">
                {activeTab === 'INBOUND' ? 'No active inbound telemetry streams.' : 'No recorded patient admission history yet.'}
              </div>
            ) : (
              (activeTab === 'INBOUND' ? patientFeed : patientHistory).map(triage => {
                const targetKey = triage.id || triage.incidentId;
                const si = calculateShockIndex(triage.heartRate, triage.bpSystolic);
                const isHighShock = si > 0.9;
                const isConfirmed = !!confirmedBayMap[targetKey];

                return (
                  <div
                    key={targetKey}
                    className={`bg-slate-900 border ${
                      isHighShock ? 'border-rose-500/80 shadow-rose-900/20' : 'border-slate-800'
                    } rounded-xl p-4 space-y-3 shadow-xl transition-all`}
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between border-b border-slate-800/80 pb-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-white">
                            (I) {triage.patientName || 'Unidentified Patient'}
                          </span>
                          <span className="text-xs text-slate-400">
                            ({triage.patientAge}y / {triage.patientGender})
                          </span>
                        </div>
                        <p className="text-xs text-rose-400 font-semibold mt-0.5">
                          (M) {triage.chiefComplaint}
                        </p>
                      </div>
                      {getEsiBadge(triage.esiLevel)}
                    </div>

                    {/* Shock Index Alert Bar */}
                    {isHighShock && (
                      <div className="bg-rose-500/20 border border-rose-500/60 px-3 py-1.5 rounded-lg text-rose-300 text-xs font-mono font-bold flex items-center justify-between animate-pulse">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                          SHOCK INDEX: {si} (HIGH RISK OF COLLAPSE)
                        </span>
                        <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded">CRITICAL</span>
                      </div>
                    )}

                    {/* Real-Time Vital Signs Matrix (S) */}
                    <div className="grid grid-cols-4 gap-2 text-center bg-slate-950 p-2.5 rounded-lg border border-slate-800/60 font-mono">
                      <div className="bg-slate-900 p-2 rounded">
                        <span className="text-[10px] text-slate-400 block">HEART RATE</span>
                        <span className="text-sm font-extrabold text-rose-400 flex items-center justify-center gap-1">
                          <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 inline" />
                          {triage.heartRate} <span className="text-[10px]">bpm</span>
                        </span>
                      </div>

                      <div className="bg-slate-900 p-2 rounded">
                        <span className="text-[10px] text-slate-400 block">BLOOD PRESS.</span>
                        <span className="text-sm font-extrabold text-amber-400">
                          {triage.bpSystolic}/{triage.bpDiastolic}
                        </span>
                      </div>

                      <div className="bg-slate-900 p-2 rounded">
                        <span className="text-[10px] text-slate-400 block">SPO2 OXYGEN</span>
                        <span className="text-sm font-extrabold text-cyan-400">
                          {triage.spo2}%
                        </span>
                      </div>

                      <div className="bg-slate-900 p-2 rounded">
                        <span className="text-[10px] text-slate-400 block">SHOCK INDEX</span>
                        <span className={`text-sm font-extrabold ${isHighShock ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                          {si}
                        </span>
                      </div>
                    </div>

                    {/* Simulated Animated ECG Rhythm Bar */}
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 overflow-hidden">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span className="font-mono text-emerald-400 flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5" />
                          EKG MONITOR: {triage.ekgRhythm}
                        </span>
                        <span className="text-[10px] text-slate-500">{triage.recordedAt}</span>
                      </div>
                      <div className="h-6 w-full bg-slate-900 rounded relative overflow-hidden flex items-center">
                        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:8px_8px]"></div>
                        <svg className="w-full h-full text-emerald-400 opacity-90 stroke-current" viewBox="0 0 300 30" fill="none">
                          <path
                            d="M0 15 L30 15 L35 5 L40 25 L45 2 L50 28 L55 15 L90 15 L95 5 L100 25 L105 2 L110 28 L115 15 L150 15 L155 5 L160 25 L165 2 L170 28 L175 15 L210 15 L215 5 L220 25 L225 2 L230 28 L235 15 L300 15"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="animate-[dash_3s_linear_infinite]"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* Paramedic Voice Note & Gemini AI Formal Clinical Transcript Card */}
                    {(triage.voiceTranscript || (triage.notes && triage.notes.includes('[Voice Note]'))) && (
                      <div className="bg-slate-950 p-3.5 rounded-xl border border-cyan-500/50 space-y-2 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-mono text-xs">
                          <span className="font-extrabold text-cyan-400 flex items-center gap-1.5">
                            <Bot className="w-4 h-4 text-cyan-300 animate-pulse" />
                            GEMINI AI CLINICAL TRANSCRIPTION ENGINE
                          </span>
                          <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/40 font-bold">
                            FORMAL MEDICAL SYNTHESIS
                          </span>
                        </div>

                        {/* Gemini AI Formal Clinical Medical Transcript */}
                        <div className="bg-slate-900/90 p-3 rounded-lg border border-cyan-500/30 text-xs text-cyan-100 font-mono leading-relaxed space-y-1">
                          <span className="font-extrabold text-emerald-400 uppercase text-[10px] flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                            GEMINI AI FORMAL CLINICAL MEDICAL ASSESSMENT (FOR ER PHYSICIANS):
                          </span>
                          <p className="font-semibold text-slate-100">
                            "{triage.notes?.includes('[Gemini Clinical Summary]:') ? triage.notes.split('[Gemini Clinical Summary]:')[1] : triage.chiefComplaint}"
                          </p>
                        </div>

                        {/* Raw Verbatim Paramedic Speech Recording */}
                        <div className="bg-slate-900/50 p-2 rounded-md border border-slate-800 text-[11px] text-slate-400 font-mono italic flex items-start space-x-2">
                          <Volume2 className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-slate-400 not-italic uppercase text-[9px] block">
                              VERBATIM PARAMEDIC VOICE RECORDING:
                            </span>
                            "{triage.voiceTranscript || triage.notes?.split('|')[0]?.replace('[Voice Note]:', '')?.trim() || 'Recorded Speech Dictation'}"
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Treatment (T) & Notes */}
                    {triage.notes && (
                      <div className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/50 flex items-start space-x-2">
                        <Clock className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                        <span>(T) Treatment: {triage.notes}</span>
                      </div>
                    )}

                    {/* Action Bar for ER Doctors */}
                    <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-800/80">
                      <span className="text-slate-400 flex items-center gap-1 font-mono text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Resuscitation Bay Status:
                      </span>

                      {isConfirmed ? (
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 px-3 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 shadow">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          BAY #{confirmedBayMap[targetKey].bayNumber} ALLOCATED &amp; RESERVED
                        </span>
                      ) : (
                        <button
                          onClick={() => handleConfirmTraumaBay(triage)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg font-extrabold text-xs transition shadow-lg flex items-center space-x-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>CONFIRM TRAUMA BAY ALLOCATION</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
