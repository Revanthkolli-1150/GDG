import React, { useState } from 'react';
import { Ambulance, Incident, Hospital } from '../types';
import { LiveMap } from './LiveMap';
import { dispatchAmbulance, triggerAiAutoDispatch, createEmergencyIncident } from '../services/api';
import { Radio, ShieldCheck, Lock, Navigation, AlertCircle, PlusCircle, Bot, Sparkles, Zap } from 'lucide-react';

interface CentralDispatchPortalProps {
  ambulances: Ambulance[];
  incidents: Incident[];
  hospitals: Hospital[];
  onRefreshData: () => void;
  onSimulateRaceCondition: () => void;
}

export const CentralDispatchPortal: React.FC<CentralDispatchPortalProps> = ({
  ambulances,
  incidents,
  hospitals,
  onRefreshData,
  onSimulateRaceCondition,
}) => {
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [lockAlert, setLockAlert] = useState<string | null>(null);
  const [aiResultModal, setAiResultModal] = useState<any | null>(null);
  const [rerouteLog, setRerouteLog] = useState<string[]>([
    'System initialization: PostGIS spatial index loaded.',
    'Google Gemini AI Emergency Agent Service initialized.',
    'Redlock distributed lock manager active on Redis key namespace: redlock:ambulance:*',
  ]);

  // Form state for creating emergency call
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [incidentType, setIncidentType] = useState('CARDIAC_ARREST');
  const [priority, setPriority] = useState<'CRITICAL_P1' | 'URGENT_P2' | 'NON_URGENT_P3'>('CRITICAL_P1');
  const [addressText, setAddressText] = useState('450 Lexington Ave, Grand Central');

  const [autoDispatchEnabled, setAutoDispatchEnabled] = useState<boolean>(true);

  // Autonomous Hands-Free Background Dispatcher Loop
  React.useEffect(() => {
    if (!autoDispatchEnabled) return;
    const pending = incidents.filter(i => i.status === 'PENDING');
    if (pending.length > 0) {
      const timer = setTimeout(async () => {
        try {
          const res = await triggerAiAutoDispatch(pending[0].id);
          if (res.success) {
            setAiResultModal(res.aiRecommendation);
            setRerouteLog(prev => [
              `ZERO-TOUCH AI DISPATCH: Automatically assigned ${res.aiRecommendation?.recommendedAmbulanceCallSign} to incident ${pending[0].id} (No manual button click needed)`,
              ...prev,
            ]);
            onRefreshData();
          }
        } catch (e) {
          console.warn('[Auto-Dispatch Loop Warning]:', e);
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [incidents, autoDispatchEnabled]);

  const handleManualDispatch = async (incidentId: string) => {
    setDispatchingId(incidentId);
    setLockAlert(null);

    const res = await dispatchAmbulance(incidentId);
    setDispatchingId(null);

    if (res.success) {
      setRerouteLog(prev => [res.message || 'Dispatch successful.', ...prev]);
      onRefreshData();
    } else {
      setLockAlert(res.message);
    }
  };

  const handleAiAutoDispatch = async (incidentId: string) => {
    setDispatchingId(incidentId);
    setLockAlert(null);

    const res = await triggerAiAutoDispatch(incidentId);
    setDispatchingId(null);

    if (res.success) {
      setAiResultModal(res.aiRecommendation);
      setRerouteLog(prev => [
        `GEMINI AI AGENT: Matched unit ${res.aiRecommendation?.recommendedAmbulanceCallSign} (Confidence: ${res.aiRecommendation?.confidenceScore}%)`,
        ...prev,
      ]);
      onRefreshData();
    } else {
      setLockAlert(res.message);
    }
  };

  const handleCreateCall = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createEmergencyIncident({
      incidentType,
      priority,
      addressText,
      description: 'Emergency call submitted via Central Dispatch portal',
      location: { lat: 28.555 + (Math.random() - 0.5) * 0.04, lng: 77.218 + (Math.random() - 0.5) * 0.04 },
    });

    if (res.autoDispatched && res.aiRecommendation) {
      setAiResultModal(res.aiRecommendation);
      setRerouteLog(prev => [
        `ZERO-TOUCH AUTONOMOUS DISPATCH: Gemini AI auto-assigned ${res.aiRecommendation.recommendedAmbulanceCallSign} to ${addressText}`,
        ...prev,
      ]);
    }

    setShowCreateForm(false);
    onRefreshData();
  };

  return (
    <div className="w-full h-full flex flex-col space-y-4 p-4 bg-slate-950 text-white">
      {/* Redlock Guard Warning Banner */}
      {lockAlert && (
        <div className="bg-rose-500/20 border border-rose-500/60 rounded-xl p-3 text-rose-300 font-mono text-xs flex items-center justify-between shadow-lg animate-pulse">
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-rose-400" />
            <span className="font-bold">{lockAlert}</span>
          </div>
          <button onClick={() => setLockAlert(null)} className="text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Dispatch Controls Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="bg-rose-500/20 p-2.5 rounded-lg border border-rose-500/40 text-rose-400">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-lg text-white">Central Operations & AI Fleet Control</h2>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
                ZERO-TOUCH HANDS-FREE AI
              </span>
            </div>
            <p className="text-xs text-slate-400">PostGIS Proximity Engine & Autonomous Gemini AI Dispatcher</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setAutoDispatchEnabled(!autoDispatchEnabled)}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-2 shadow-md border transition ${
              autoDispatchEnabled
                ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/60 hover:bg-emerald-600/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
            title="Toggle Hands-Free Automated AI Dispatch Mode"
          >
            <Bot className={`w-4 h-4 ${autoDispatchEnabled ? 'text-emerald-400 animate-bounce' : 'text-slate-400'}`} />
            <span>AUTO-DISPATCH: {autoDispatchEnabled ? 'ENABLED (HANDS-FREE)' : 'OFF (MANUAL)'}</span>
          </button>

          <button
            onClick={onSimulateRaceCondition}
            className="bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md transition"
          >
            <Zap className="w-4 h-4" />
            <span>TEST REDLOCK CONCURRENCY</span>
          </button>

          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>LOG NEW INCIDENT</span>
          </button>
        </div>
      </div>

      {/* AI Dispatch Result Modal / Banner */}
      {aiResultModal && (
        <div className="bg-slate-900 border border-cyan-500/60 rounded-xl p-4 space-y-2 shadow-2xl animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-cyan-300 flex items-center gap-2 font-mono">
              <Bot className="w-4 h-4 text-cyan-400" />
              GEMINI AI AUTONOMOUS DISPATCH DECISION REASONING
            </span>
            <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded text-[11px] font-bold font-mono">
              MATCH SCORE: {aiResultModal.confidenceScore}%
            </span>
          </div>

          <p className="text-xs text-slate-200">{aiResultModal.reasoning}</p>

          <div className="flex items-center justify-between text-xs font-mono pt-1 text-slate-400">
            <span>RECOMMENDED UNIT: <strong className="text-emerald-400">{aiResultModal.recommendedAmbulanceCallSign}</strong></span>
            <span>DESTINATION: <strong className="text-cyan-400">{aiResultModal.recommendedHospitalName || 'City General'}</strong></span>
            <button onClick={() => setAiResultModal(null)} className="text-xs text-slate-400 hover:text-white underline">
              Close Breakdown
            </button>
          </div>
        </div>
      )}

      {/* Create Incident Form */}
      {showCreateForm && (
        <form onSubmit={handleCreateCall} className="bg-slate-900 border border-rose-500/40 rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-sm text-rose-400">Create New Emergency Call</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Incident Type</label>
              <select
                value={incidentType}
                onChange={e => setIncidentType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
              >
                <option value="CARDIAC_ARREST">CARDIAC_ARREST</option>
                <option value="SEVERE_TRAUMA">SEVERE_TRAUMA</option>
                <option value="STROKE">STROKE</option>
                <option value="RESPIRATORY_DISTRESS">RESPIRATORY_DISTRESS</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Triage Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
              >
                <option value="CRITICAL_P1">CRITICAL (P1)</option>
                <option value="URGENT_P2">URGENT (P2)</option>
                <option value="NON_URGENT_P3">NON-URGENT (P3)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Street Address</label>
              <input
                type="text"
                value={addressText}
                onChange={e => setAddressText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 text-slate-300"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-1.5 rounded-lg text-xs bg-rose-600 font-bold text-white">
              Broadcast Emergency Call
            </button>
          </div>
        </form>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Left Map View */}
        <div className="lg:col-span-7 flex flex-col space-y-2">
          <div className="bg-slate-900 px-4 py-2 rounded-t-xl border border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-cyan-400" />
              FLEET SPATIAL MAP & ACTIVE INCIDENTS
            </span>
            <span className="text-xs text-slate-400 font-mono">POSTGIS PROXIMITY MATRIX</span>
          </div>
          <div className="flex-1 min-h-[460px]">
            <LiveMap ambulances={ambulances} incidents={incidents} hospitals={hospitals} />
          </div>
        </div>

        {/* Right Incident Dispatch Queue & Redlock Console */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          {/* Incident Queue Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                PENDING EMERGENCY QUEUE ({incidents.filter(i => i.status === 'PENDING').length})
              </span>
              <span className="text-[10px] text-slate-400 font-mono">NEAREST SPATIAL DISPATCH</span>
            </div>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {incidents.filter(i => i.status === 'PENDING').length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs italic">
                  All emergency calls assigned. Fleet on standby.
                </div>
              ) : (
                incidents
                  .filter(i => i.status === 'PENDING')
                  .map(inc => (
                    <div
                      key={inc.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-bold text-xs text-rose-400">{inc.incidentType}</span>
                          <p className="text-xs text-slate-300 font-semibold">{inc.addressText}</p>
                          <p className="text-[11px] text-slate-400 italic mt-0.5">{inc.description}</p>
                        </div>
                        <span className="bg-rose-500/20 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-500/40">
                          {inc.priority}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-900 gap-2">
                        <button
                          disabled={dispatchingId === inc.id}
                          onClick={() => handleAiAutoDispatch(inc.id)}
                          className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white text-[11px] font-extrabold py-1.5 px-2 rounded-lg shadow transition flex items-center justify-center space-x-1"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>GEMINI AI DISPATCH</span>
                        </button>

                        <button
                          disabled={dispatchingId === inc.id}
                          onClick={() => handleManualDispatch(inc.id)}
                          className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-[11px] font-semibold py-1.5 px-2.5 rounded-lg border border-slate-700"
                        >
                          Manual Match
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Redlock & Dynamic Auto-Reroute Stream Log */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex-1 flex flex-col space-y-2 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                AI AGENT & REDLOCK CONCURRENCY LOG
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                ACTIVE
              </span>
            </div>

            <div className="flex-1 bg-slate-950 border border-slate-800/80 rounded-lg p-2.5 overflow-y-auto space-y-1 text-[11px] text-slate-400 max-h-[220px]">
              {rerouteLog.map((log, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <span className="text-cyan-500 font-bold shrink-0">&gt;</span>
                  <span
                    className={
                      log.includes('GEMINI AI')
                        ? 'text-cyan-300 font-bold'
                        : log.includes('RACE CONDITION')
                        ? 'text-rose-400 font-bold'
                        : log.includes('REROUTE')
                        ? 'text-amber-300 font-bold'
                        : 'text-slate-300'
                    }
                  >
                    {log}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
