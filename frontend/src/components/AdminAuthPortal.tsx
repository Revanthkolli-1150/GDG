import React, { useState } from 'react';
import { User } from '../types';
import { loginUser, registerUser } from '../services/api';
import { ShieldAlert, ShieldCheck, Radio, Key, Lock, UserCheck, ArrowRight, Bot, Sparkles, UserPlus, LogIn, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface AdminAuthPortalProps {
  onAdminLoginSuccess: (user: User) => void;
  initialMode?: 'LOGIN' | 'REGISTER';
}

export const AdminAuthPortal: React.FC<AdminAuthPortalProps> = ({
  onAdminLoginSuccess,
  initialMode = 'LOGIN',
}) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>(initialMode);
  const [username, setUsername] = useState('central_dispatcher');
  const [password, setPassword] = useState('dispatch123');

  // Admin Registration Fields
  const [fullName, setFullName] = useState('');
  const [organizationName, setOrganizationName] = useState('Central 108 Command & Control Center');
  const [adminSecurityCode, setAdminSecurityCode] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const result = await loginUser(username, password);
    setIsSubmitting(false);

    if (!result.success || !result.user) {
      setErrorMessage(result.message || 'Invalid Admin Credentials.');
      return;
    }

    if (result.user.role !== 'DISPATCHER') {
      setErrorMessage('Access Denied. Account is not a registered System Administrator.');
      return;
    }

    onAdminLoginSuccess(result.user);
  };

  const handleAdminRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (adminSecurityCode !== '108-ADMIN-KEY-2026') {
      setErrorMessage('Invalid Master Admin Security Passcode. Authorization Failed.');
      return;
    }

    setIsSubmitting(true);
    const result = await registerUser({
      username,
      password,
      fullName,
      role: 'DISPATCHER',
      organizationName,
      verificationStatus: 'VERIFIED_APPROVED',
      documents: [{ name: 'Central Dispatch Command Clearance', licenseNumber: 'DEL-DISPATCH-99' }]
    });

    setIsSubmitting(false);

    if (!result.success || !result.user) {
      setErrorMessage(result.message || 'Admin Registration Failed.');
      return;
    }

    setSuccessMessage('System Administrator account registered & approved!');
    setTimeout(() => {
      onAdminLoginSuccess(result.user!);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-6 selection:bg-rose-600 selection:text-white">
      <div className="w-full max-w-md space-y-6">
        {/* Admin Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 bg-gradient-to-tr from-rose-600 via-amber-500 to-rose-700 p-3.5 rounded-2xl shadow-2xl flex items-center justify-center animate-pulse border border-rose-400/40">
            <Radio className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-rose-100 to-slate-400 bg-clip-text text-transparent">
            EMERGENCY AI - SYSTEM ADMIN PORTAL
          </h1>
          <p className="text-xs text-rose-400 font-mono flex items-center justify-center gap-1.5">
            <ShieldAlert className="w-4 h-4" />
            108 Emergency Central Command Authentication
          </p>
        </div>

        {/* Tab Selector */}
        <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-2xl flex space-x-1 shadow-xl">
          <button
            type="button"
            onClick={() => { setMode('LOGIN'); setErrorMessage(null); }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition ${
              mode === 'LOGIN'
                ? 'bg-rose-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>ADMIN SIGN-IN</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('REGISTER'); setErrorMessage(null); }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition ${
              mode === 'REGISTER'
                ? 'bg-rose-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>NEW ADMIN REGISTRATION</span>
          </button>
        </div>

        {/* Error / Success Banners */}
        {errorMessage && (
          <div className="bg-rose-500/20 border border-rose-500/60 rounded-xl p-3.5 text-rose-300 text-xs font-mono font-bold flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-500/20 border border-emerald-500/60 rounded-xl p-3.5 text-emerald-300 text-xs font-mono font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Admin Sign-In Form */}
        {mode === 'LOGIN' ? (
          <form onSubmit={handleAdminLogin} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono flex items-center justify-between">
              <span className="text-slate-400">DEMO ADMIN CREDENTIALS:</span>
              <button
                type="button"
                onClick={() => { setUsername('central_dispatcher'); setPassword('dispatch123'); }}
                className="bg-rose-600/30 hover:bg-rose-600 text-rose-300 border border-rose-500/40 px-3 py-1 rounded text-[11px] font-bold"
              >
                AUTO-FILL ADMIN
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Admin Username</label>
              <div className="relative">
                <Radio className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Admin Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-3 rounded-xl shadow-lg border border-rose-500/40 flex items-center justify-center space-x-2 transition"
            >
              <span>AUTHENTICATE SYSTEM ADMIN</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* Admin Registration Form */
          <form onSubmit={handleAdminRegister} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Full Administrator Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Commander Rajesh Kumar"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">System Admin Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. admin_cmd_01"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Admin Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Master Admin Security Key Code</label>
              <div className="relative">
                <Key className="w-4 h-4 text-rose-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={adminSecurityCode}
                  onChange={e => setAdminSecurityCode(e.target.value)}
                  placeholder="Enter Passcode: 108-ADMIN-KEY-2026"
                  className="w-full bg-slate-950 border border-rose-500/50 rounded-xl py-2.5 pl-9 pr-3 text-xs text-rose-200 placeholder-rose-400/50 font-mono"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Passcode for testing: <strong className="text-rose-400 font-mono">108-ADMIN-KEY-2026</strong></span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-3 rounded-xl shadow-lg border border-rose-500/40 flex items-center justify-center space-x-2 transition"
            >
              <span>REGISTER MASTER ADMIN ACCOUNT</span>
              <ShieldCheck className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
