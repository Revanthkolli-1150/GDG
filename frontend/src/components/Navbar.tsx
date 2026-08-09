import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Radio, Building2, Stethoscope, PhoneCall, Sparkles, ShieldAlert, LayoutGrid, User as UserIcon, LogOut, Lock, Zap } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  isOnline: boolean;
  pendingSyncCount: number;
  pendingIncidentsCount: number;
  onTriggerAiDispatchAll: () => void;
  isAiDispatching?: boolean;
  currentUser?: User | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isOnline,
  pendingSyncCount,
  pendingIncidentsCount,
  onTriggerAiDispatchAll,
  isAiDispatching = false,
  currentUser,
  onLogout,
}) => {
  const location = useLocation();
  const path = location.pathname;

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand Logo & Back to Landing */}
        <div className="flex items-center space-x-3">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="bg-gradient-to-tr from-rose-600 via-amber-500 to-cyan-400 p-2 rounded-xl shadow-md group-hover:scale-105 transition">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                EMERGENCY AI
              </h1>
              <p className="text-[11px] text-rose-400 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block"></span>
                Indian 108 EMS & Gemini AI Platform
              </p>
            </div>
          </Link>
        </div>

        {/* Dedicated Portal Route Switcher Tabs */}
        <div className="flex items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800/80 shadow-inner text-xs font-semibold">
          <Link
            to="/"
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
            title="All Portals Hub"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Portals Hub</span>
          </Link>

          <div className="h-4 w-px bg-slate-800 my-auto mx-1"></div>

          {currentUser?.role === 'DISPATCHER' && (
            <Link
              to="/admin/dispatch"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                path === '/admin/dispatch' || path === '/dispatch'
                  ? 'bg-rose-600 text-white shadow-md font-bold'
                  : 'text-rose-400 hover:text-rose-200 hover:bg-slate-800/50'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-rose-400" />
              <span>Admin Control Dispatch</span>
            </Link>
          )}

          <Link
            to="/er"
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
              path === '/er'
                ? 'bg-emerald-600 text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Hospital ER Portal</span>
          </Link>

          <Link
            to="/paramedic"
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
              path === '/paramedic'
                ? 'bg-cyan-600 text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Paramedic Field App</span>
          </Link>

          <Link
            to="/sos"
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
              path === '/sos'
                ? 'bg-amber-600 text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Public SOS</span>
          </Link>
        </div>

        {/* Top Navbar AI Dispatch Action */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onTriggerAiDispatchAll}
            disabled={isAiDispatching || pendingIncidentsCount === 0}
            className={`bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 text-white px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-2 shadow-xl border border-cyan-400/40 transition transform active:scale-95 ${
              pendingIncidentsCount > 0 ? 'animate-pulse' : ''
            }`}
            title="Automatically assign ambulances to all pending emergency calls using Gemini AI"
          >
            <Sparkles className={`w-4 h-4 text-cyan-300 ${isAiDispatching ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">GEMINI AI AUTO-DISPATCH</span>
            <span className="md:hidden">AI DISPATCH</span>
            {pendingIncidentsCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-mono px-2 py-0.5 rounded-full border border-rose-400 font-black">
                {pendingIncidentsCount}
              </span>
            )}
          </button>

          {/* Current User Session Profile Badge / Sign In Action */}
          {currentUser ? (
            <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800 font-mono text-xs">
              <div className="flex items-center space-x-1.5">
                <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-bold text-white max-w-[120px] truncate">{currentUser.fullName}</span>
                <span className="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-1.5 py-0.5 rounded font-bold uppercase">
                  {currentUser.role.replace('_', ' ')}
                </span>
              </div>

              <button
                onClick={onLogout}
                className="text-slate-400 hover:text-rose-400 p-1 rounded transition"
                title="Sign Out of Workstation"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow"
            >
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>SIGN IN / REGISTER</span>
            </Link>
          )}

          {pendingSyncCount > 0 && (
            <div className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1.5 rounded-xl font-mono text-xs flex items-center space-x-1.5 animate-bounce">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{pendingSyncCount} QUEUED</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
