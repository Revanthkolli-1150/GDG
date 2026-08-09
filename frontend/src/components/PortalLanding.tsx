import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Radio, Building2, Stethoscope, PhoneCall, Sparkles, ShieldCheck, ArrowRight, Bot, ShieldAlert } from 'lucide-react';

export const PortalLanding: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-rose-500 selection:text-white">
      {/* Top Hero Section */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-rose-600 via-amber-500 to-cyan-400 p-2.5 rounded-2xl shadow-lg animate-pulse">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                EMERGENCY AI
              </h1>
              <p className="text-xs text-cyan-400 font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block"></span>
                Indian 108/112 EMS & Google Gemini AI Platform
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-2 text-xs font-mono bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl">
              <Bot className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-slate-300">GEMINI AI AGENT: <strong className="text-emerald-400">ACTIVE</strong></span>
            </div>

            <Link
              to="/login"
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-lg border border-cyan-400/40 flex items-center space-x-1.5 transition"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>SIGN IN / REGISTER</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Portals Grid */}
      <main className="max-w-7xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center space-y-10">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-3.5 py-1.5 rounded-full inline-block">
            SELECT DEDICATED EMERGENCY SYSTEM PORTAL
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Centralized Real-Time Emergency Management Portals
          </h2>
          <p className="text-sm text-slate-400">
            Select your assigned operational role to launch the dedicated portal with real-time WebSockets telemetry, PostGIS geospatial routing, and Google Gemini AI.
          </p>
        </div>

        {/* 3 Dedicated Public/Hospital/Paramedic Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Public SOS Caller Portal */}
          <Link
            to="/sos"
            className="group bg-slate-900 hover:bg-slate-900/90 border border-slate-800 hover:border-amber-500/60 rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="space-y-4">
              <div className="bg-gradient-to-tr from-amber-600 to-rose-600 p-3.5 rounded-2xl w-fit shadow-lg text-white group-hover:scale-110 transition">
                <PhoneCall className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">
                  PUBLIC EMERGENCY USER
                </span>
                <h3 className="text-lg font-bold text-white mt-1 group-hover:text-amber-300 transition">
                  Public SOS Portal
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  One-tap 108 ambulance dispatch, GPS position lock, and instant Gemini AI pre-hospital bystander precautions.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-amber-400 group-hover:text-amber-300">
              <span>LAUNCH PUBLIC PORTAL</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </Link>

          {/* 3. Hospital Emergency Department Portal */}
          <Link
            to="/hospital/login"
            className="group bg-slate-900 hover:bg-slate-900/90 border border-slate-800 hover:border-emerald-500/60 rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="space-y-4">
              <div className="bg-gradient-to-tr from-emerald-600 to-cyan-500 p-3.5 rounded-2xl w-fit shadow-lg text-white group-hover:scale-110 transition">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                  ER PHYSICIANS & TRAUMA TEAM
                </span>
                <h3 className="text-lg font-bold text-white mt-1 group-hover:text-emerald-300 transition">
                  Hospital ER Telemetry Portal
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Split-view pre-arrival map, live patient ECG/vitals stream, IMIST-AMBO handover cards, and Shock Index alerts.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
              <span>HOSPITAL ER SIGN-IN / REGISTER</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </Link>

          {/* 4. Paramedic Field Crew Mobile App */}
          <Link
            to="/paramedic/login"
            className="group bg-slate-900 hover:bg-slate-900/90 border border-slate-800 hover:border-cyan-500/60 rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="space-y-4">
              <div className="bg-gradient-to-tr from-cyan-600 to-indigo-600 p-3.5 rounded-2xl w-fit shadow-lg text-white group-hover:scale-110 transition">
                <Stethoscope className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  108 FIELD CREW MOBILE APP
                </span>
                <h3 className="text-lg font-bold text-white mt-1 group-hover:text-cyan-300 transition">
                  Paramedic Field Crew App
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  IndexedDB offline triage queue, Whisper AI voice dictation recorder, Shock Index calculator, and auto-reroute.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-cyan-400 group-hover:text-cyan-300">
              <span>PARAMEDIC BIOMETRIC SIGN-IN / REGISTER</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 py-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 font-mono">
        <div>
          Apex Emergency Dispatch & Real-Time Hospital Telemetry Ecosystem &copy; 2026 | Powered by PostGIS & Google Gemini AI
        </div>
        <Link
          to="/admin"
          className="text-rose-400 hover:text-rose-300 font-bold bg-rose-500/10 border border-rose-500/30 px-3 py-1 rounded-lg transition flex items-center space-x-1.5"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>RESTRICTED SYSTEM ADMIN PORTAL (/admin)</span>
        </Link>
      </footer>
    </div>
  );
};
