import React, { useState } from 'react';
import { createEmergencyIncident, fetchAiPrecautions } from '../services/api';
import { PhoneCall, ShieldAlert, Navigation, CheckCircle2, Bot, AlertTriangle, ShieldCheck } from 'lucide-react';

interface PublicSOSPortalProps {
  onRefreshData: () => void;
}

export const PublicSOSPortal: React.FC<PublicSOSPortalProps> = ({ onRefreshData }) => {
  const [callerName, setCallerName] = useState('');
  const [callerPhone, setCallerPhone] = useState('');
  const [incidentType, setIncidentType] = useState('CARDIAC_ARREST');
  const [addressText, setAddressText] = useState('Central Park South & 5th Ave');
  const [submittedStatus, setSubmittedStatus] = useState<any | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<any | null>(null);
  const [dispatchResult, setDispatchResult] = useState<any | null>(null);
  const [aiPrecautions, setAiPrecautions] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSOSSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await createEmergencyIncident({
      callerName: callerName || 'Public Citizen',
      callerPhone: callerPhone || '+91-9810010811',
      incidentType,
      priority: 'CRITICAL_P1',
      addressText,
      description: 'Emergency SOS alert submitted via Public Web SOS Portal',
      location: { lat: 28.56, lng: 77.21 },
    });

    let prec = res.precautions;
    if (!prec) {
      prec = await fetchAiPrecautions(incidentType, 'Emergency SOS call from public caller');
    }

    setLoading(false);
    if (res.success) {
      setSubmittedStatus(res.data);
      setAiRecommendation(res.aiRecommendation);
      setDispatchResult(res.dispatchResult);
      setAiPrecautions(prec);
      onRefreshData();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 text-white">
      {/* SOS Banner */}
      <div className="bg-gradient-to-r from-rose-900 via-rose-950 to-slate-900 border border-rose-600/50 rounded-2xl p-6 shadow-2xl text-center space-y-3">
        <div className="inline-flex p-4 bg-rose-600/30 rounded-full border border-rose-500/60 text-rose-400 animate-pulse">
          <PhoneCall className="w-10 h-10" />
        </div>
        <h2 className="font-extrabold text-2xl tracking-tight text-white">EMERGENCY SOS & AUTONOMOUS AI DISPATCH PORTAL</h2>
        <p className="text-xs text-rose-200">
          Zero-touch automated 108 ambulance dispatch, hospital trauma bay reservation & Gemini AI bystander advisor.
        </p>
      </div>

      {submittedStatus ? (
        <div className="space-y-4">
          {/* Dispatch Confirmation Card */}
          <div className="bg-slate-900 border border-emerald-500/60 rounded-2xl p-6 space-y-4 text-center shadow-xl">
            <div className="inline-flex p-3 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/40">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-extrabold text-lg text-emerald-400">AUTONOMOUS AI SOS ACCEPTED & DISPATCHED</h3>
            <p className="text-xs text-slate-300">
              Google Gemini AI Agent has automatically evaluated fleet proximity & trauma bay capacity and dispatched your 108 emergency unit.
            </p>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">INCIDENT ID:</span>
                <span className="text-cyan-400 font-bold">{submittedStatus.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">LOCATION:</span>
                <span className="text-white">{submittedStatus.addressText}</span>
              </div>
              {dispatchResult?.ambulance && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">DISPATCHED UNIT:</span>
                    <span className="text-emerald-400 font-extrabold">{dispatchResult.ambulance.callSign} ({dispatchResult.ambulance.vehiclePlate})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ESTIMATED ETA:</span>
                    <span className="text-amber-300 font-extrabold">{aiRecommendation?.etaMinutes || 3} MINS</span>
                  </div>
                </>
              )}
              {aiRecommendation?.recommendedHospitalName && (
                <div className="flex justify-between">
                  <span className="text-slate-400">DESTINATION HOSPITAL:</span>
                  <span className="text-cyan-300 font-bold">{aiRecommendation.recommendedHospitalName}</span>
                </div>
              )}
              {aiRecommendation?.confidenceScore && (
                <div className="flex justify-between">
                  <span className="text-slate-400">AI MATCH CONFIDENCE:</span>
                  <span className="text-emerald-300 font-bold">{aiRecommendation.confidenceScore}% (Gemini AI PostGIS Vector)</span>
                </div>
              )}
            </div>
          </div>

          {/* AI Pre-Hospital Medical Precaution Advisory Card */}
          {aiPrecautions && (
            <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="bg-cyan-500/20 p-2 rounded-lg text-cyan-400 border border-cyan-500/40">
                    <Bot className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-cyan-300">GEMINI AI EMERGENCY PRECAUTION ADVISOR</h4>
                    <p className="text-[11px] text-slate-400">Immediate action guide for bystanders while ambulance is en route</p>
                  </div>
                </div>
                <span className="text-xs font-mono bg-rose-500/20 text-rose-300 px-2.5 py-1 rounded border border-rose-500/40">
                  {aiPrecautions.urgencyLevel || 'CRITICAL_P1'}
                </span>
              </div>

              {/* Bystander Step-by-Step Instructions */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  BYSTANDER IMMEDIATE PRECAUTIONS & FIRST AID:
                </h5>
                <ul className="space-y-2">
                  {aiPrecautions.bystanderPrecautions?.map((step: string, index: number) => (
                    <li key={index} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-200 flex items-start space-x-2.5">
                      <span className="bg-cyan-500/20 text-cyan-300 font-extrabold w-5 h-5 rounded-full flex items-center justify-center shrink-0 border border-cyan-500/40 text-[11px]">
                        {index + 1}
                      </span>
                      <span className="mt-0.5">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Safety Warnings */}
              {aiPrecautions.safetyWarnings && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300 space-y-1">
                  <span className="font-bold flex items-center gap-1 text-rose-400">
                    <AlertTriangle className="w-4 h-4" />
                    CRITICAL SAFETY WARNINGS:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {aiPrecautions.safetyWarnings.map((w: string, i: number) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="text-center pt-2">
            <button
              onClick={() => {
                setSubmittedStatus(null);
                setAiPrecautions(null);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2 rounded-xl"
            >
              Submit Another Emergency Call
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSOSSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h3 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-2">
            Emergency Dispatch & AI Advisor Setup
          </h3>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Emergency Type</label>
            <select
              value={incidentType}
              onChange={e => setIncidentType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white font-semibold"
            >
              <option value="CARDIAC_ARREST">🫀 Cardiac Arrest / Chest Pain</option>
              <option value="SEVERE_TRAUMA">🩸 Severe Trauma / Accident</option>
              <option value="STROKE">🧠 Stroke Symptoms</option>
              <option value="RESPIRATORY_DISTRESS">🫁 Breathing Difficulty</option>
              <option value="OTHER_EMERGENCY">🚨 Other Critical Emergency</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Location / Street Address</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={addressText}
                onChange={e => setAddressText(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
                required
              />
              <button
                type="button"
                onClick={() => setAddressText('GPS Position Locked: 40.765, -73.974')}
                className="bg-slate-800 hover:bg-slate-700 text-cyan-400 p-3 rounded-xl flex items-center justify-center"
                title="Detect Location"
              >
                <Navigation className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Your Name</label>
              <input
                type="text"
                placeholder="Optional"
                value={callerName}
                onChange={e => setCallerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="Optional"
                value={callerPhone}
                onChange={e => setCallerPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-rose-600 via-amber-600 to-cyan-600 hover:from-rose-500 hover:to-cyan-500 text-white font-extrabold text-sm py-4 rounded-xl shadow-lg transition flex items-center justify-center space-x-2 uppercase tracking-wider"
          >
            <ShieldAlert className="w-5 h-5" />
            <span>{loading ? 'ANALYZING & DISPATCHING...' : 'DISPATCH AMBULANCE & GET AI PRECAUTIONS'}</span>
          </button>
        </form>
      )}
    </div>
  );
};
