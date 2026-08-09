import React, { useState } from 'react';
import { User, BiometricFaceDescriptor } from '../types';
import { loginUser, registerUser, verifyBiometricFace } from '../services/api';
import { BiometricFaceCameraModal } from './BiometricFaceCameraModal';
import { Stethoscope, ShieldCheck, Camera, LogIn, UserPlus, Sparkles, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

interface ParamedicAuthPortalProps {
  onLoginSuccess: (user: User) => void;
  initialMode?: 'LOGIN' | 'REGISTER';
}

export const ParamedicAuthPortal: React.FC<ParamedicAuthPortalProps> = ({
  onLoginSuccess,
  initialMode = 'LOGIN',
}) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>(initialMode);
  const [username, setUsername] = useState('paramedic_delhi01');
  const [password, setPassword] = useState('para123');

  // Paramedic Registration State
  const [fullName, setFullName] = useState('');
  const [callSign, setCallSign] = useState('108-ALS-DEL-01');
  const [biometricData, setBiometricData] = useState<BiometricFaceDescriptor | null>(null);
  const [isBiometricCameraOpen, setIsBiometricCameraOpen] = useState(false);
  const [pendingBiometricUser, setPendingBiometricUser] = useState<User | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleParamedicLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const result = await loginUser(username, password);
    setIsSubmitting(false);

    if (!result.success || !result.user) {
      setErrorMessage(result.message || 'Invalid Paramedic Credentials.');
      return;
    }

    if (result.user.role !== 'PARAMEDIC') {
      setErrorMessage('Access Denied. Account is not registered to a 108 Paramedic Squad.');
      return;
    }

    // Trigger mandatory facial biometric scan for paramedic authentication
    setPendingBiometricUser(result.user);
    setIsBiometricCameraOpen(true);
  };

  const handleBiometricFaceVerified = async (faceData: BiometricFaceDescriptor) => {
    setIsBiometricCameraOpen(false);

    if (pendingBiometricUser) {
      setErrorMessage(null);
      setSuccessMessage('Biometric Face Recognition Verified! Launching Paramedic Field App...');
      setTimeout(() => {
        onLoginSuccess(pendingBiometricUser);
      }, 1000);
    } else {
      setBiometricData(faceData);
      setSuccessMessage('Biometric Face Profile Recorded successfully.');
    }
  };

  const handleParamedicRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!biometricData) {
      setErrorMessage('Mandatory Facial Biometric Registration required for Paramedic Squads.');
      return;
    }

    setIsSubmitting(true);
    const result = await registerUser({
      username,
      password,
      fullName,
      role: 'PARAMEDIC',
      organizationName: `108 Ambulance Unit (${callSign})`,
      verificationStatus: 'VERIFIED_APPROVED',
      biometricFace: biometricData,
      documents: [{ name: 'EMT Paramedic Field Clearance Badge', licenseNumber: callSign }],
    });

    setIsSubmitting(false);

    if (!result.success || !result.user) {
      setErrorMessage(result.message || 'Paramedic Registration Failed.');
      return;
    }

    setSuccessMessage('Paramedic Squad registered & facial biometric recorded!');
    setTimeout(() => {
      onLoginSuccess(result.user!);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-6 selection:bg-cyan-600 selection:text-white">
      {/* Biometric Camera Modal */}
      <BiometricFaceCameraModal
        isOpen={isBiometricCameraOpen}
        onClose={() => setIsBiometricCameraOpen(false)}
        mode={pendingBiometricUser ? 'VERIFY' : 'REGISTER'}
        userName={pendingBiometricUser ? pendingBiometricUser.fullName : username}
        onFaceCaptured={handleBiometricFaceVerified}
      />

      <div className="w-full max-w-md space-y-6">
        {/* Paramedic Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 bg-gradient-to-tr from-cyan-600 via-indigo-500 to-cyan-700 p-3.5 rounded-2xl shadow-2xl flex items-center justify-center animate-pulse border border-cyan-400/40">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-slate-400 bg-clip-text text-transparent">
            PARAMEDIC FIELD SQUAD AUTHENTICATION
          </h1>
          <p className="text-xs text-cyan-400 font-mono flex items-center justify-center gap-1.5">
            <Camera className="w-4 h-4" />
            108 Emergency Squad Facial Biometric Gateway
          </p>
        </div>

        {/* Tab Selector */}
        <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-2xl flex space-x-1 shadow-xl">
          <button
            type="button"
            onClick={() => { setMode('LOGIN'); setErrorMessage(null); }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition ${
              mode === 'LOGIN'
                ? 'bg-cyan-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>PARAMEDIC SIGN-IN</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('REGISTER'); setErrorMessage(null); }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition ${
              mode === 'REGISTER'
                ? 'bg-cyan-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>REGISTER NEW SQUAD</span>
          </button>
        </div>

        {/* Banners */}
        {errorMessage && (
          <div className="bg-rose-500/20 border border-rose-500/60 rounded-xl p-3.5 text-rose-300 text-xs font-mono font-bold flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="bg-cyan-500/20 border border-cyan-500/60 rounded-xl p-3.5 text-cyan-300 text-xs font-mono font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Paramedic Sign-In Form */}
        {mode === 'LOGIN' ? (
          <form onSubmit={handleParamedicLogin} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono flex items-center justify-between">
              <span className="text-slate-400">DEMO PARAMEDIC:</span>
              <button
                type="button"
                onClick={() => { setUsername('paramedic_delhi01'); setPassword('para123'); }}
                className="bg-cyan-600/30 hover:bg-cyan-600 text-cyan-300 border border-cyan-500/40 px-3 py-1 rounded text-[11px] font-bold"
              >
                AUTO-FILL PARAMEDIC
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Paramedic Call Sign / Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold py-3 rounded-xl shadow-lg border border-cyan-500/40 flex items-center justify-center space-x-2 transition"
            >
              <Camera className="w-4 h-4" />
              <span>FACIAL BIOMETRIC SIGN-IN</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* Paramedic Registration Form */
          <form onSubmit={handleParamedicRegister} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Ambulance Call Sign / Unit Code</label>
              <input
                type="text"
                required
                value={callSign}
                onChange={e => setCallSign(e.target.value)}
                placeholder="e.g. 108-ALS-DEL-01"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Lead Paramedic Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Inspector Suresh V."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Squad Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. paramedic_delhi_01"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white"
              />
            </div>

            {/* Facial Biometric Scanner Trigger */}
            <div className="bg-slate-950 border border-cyan-500/30 rounded-xl p-4 space-y-3">
              <label className="text-xs font-bold text-cyan-300 block font-mono flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
                MANDATORY FACIAL BIOMETRIC SCAN:
              </label>

              <button
                type="button"
                onClick={() => { setPendingBiometricUser(null); setIsBiometricCameraOpen(true); }}
                className="w-full bg-slate-900 hover:bg-slate-800 border border-cyan-500/50 py-2.5 px-3 rounded-lg text-xs text-cyan-300 font-bold flex items-center justify-center space-x-2"
              >
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>{biometricData ? 'FACIAL PROFILE RECORDED (SCAN AGAIN)' : 'SCAN PARAMEDIC FACE NOW'}</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold py-3 rounded-xl shadow-lg border border-cyan-500/40 flex items-center justify-center space-x-2 transition"
            >
              <span>REGISTER PARAMEDIC SQUAD</span>
              <ShieldCheck className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
