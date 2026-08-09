import React, { useState } from 'react';
import { User, DocumentVerificationResult } from '../types';
import { loginUser, registerUser, verifyDocumentsAi } from '../services/api';
import { Building2, ShieldCheck, Lock, LogIn, UserPlus, FileCheck, Upload, Sparkles, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

interface HospitalAuthPortalProps {
  onLoginSuccess: (user: User) => void;
  initialMode?: 'LOGIN' | 'REGISTER';
}

export const HospitalAuthPortal: React.FC<HospitalAuthPortalProps> = ({
  onLoginSuccess,
  initialMode = 'LOGIN',
}) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>(initialMode);
  const [username, setUsername] = useState('aiims_admin');
  const [password, setPassword] = useState('aiims123');

  // Hospital Registration State
  const [fullName, setFullName] = useState('');
  const [hospitalName, setHospitalName] = useState('AIIMS Apex Trauma Center');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [aiDocAnalysis, setAiDocAnalysis] = useState<DocumentVerificationResult | null>(null);
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleHospitalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const result = await loginUser(username, password);
    setIsSubmitting(false);

    if (!result.success || !result.user) {
      setErrorMessage(result.message || 'Invalid Hospital Admin Credentials.');
      return;
    }

    if (result.user.role !== 'HOSPITAL_ADMIN') {
      setErrorMessage('Access Denied. Account is not a registered Hospital ER Administrator.');
      return;
    }

    onLoginSuccess(result.user);
  };

  const handleDocumentAiAudit = async () => {
    if (!docFile && !licenseNumber) {
      setErrorMessage('Please provide a Hospital Accreditation Document or License Number to verify.');
      return;
    }
    setIsAnalyzingDoc(true);
    setErrorMessage(null);

    const res = await verifyDocumentsAi(
      'HOSPITAL_ADMIN',
      { name: docFile ? docFile.name : 'Hospital_Accreditation_Certificate.pdf', licenseNumber: licenseNumber || 'NDMC-HOSP-2026-88' }
    );

    setIsAnalyzingDoc(false);
    setAiDocAnalysis(res);
  };

  const handleHospitalRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (aiDocAnalysis && aiDocAnalysis.status === 'REJECTED_FORGERY_DETECTED') {
      setErrorMessage(`Registration Blocked by AI Safety Engine: Document forgery detected.`);
      return;
    }

    setIsSubmitting(true);
    const result = await registerUser({
      username,
      password,
      fullName,
      role: 'HOSPITAL_ADMIN',
      organizationName: hospitalName,
      verificationStatus: aiDocAnalysis?.status || 'VERIFIED_APPROVED',
      documents: [{ name: 'Hospital ER Accreditation Clearance', licenseNumber: licenseNumber || 'NDMC-HOSP-2026' }],
    });

    setIsSubmitting(false);

    if (!result.success || !result.user) {
      setErrorMessage(result.message || 'Hospital Account Registration Failed.');
      return;
    }

    setSuccessMessage('Hospital ER Administrator account registered & verified!');
    setTimeout(() => {
      onLoginSuccess(result.user!);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-6 selection:bg-emerald-600 selection:text-white">
      <div className="w-full max-w-md space-y-6">
        {/* Hospital Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-700 p-3.5 rounded-2xl shadow-2xl flex items-center justify-center animate-pulse border border-emerald-400/40">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-emerald-100 to-slate-400 bg-clip-text text-transparent">
            HOSPITAL ER PORTAL AUTHENTICATION
          </h1>
          <p className="text-xs text-emerald-400 font-mono flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            AIIMS / Level-1 Emergency Department Portal
          </p>
        </div>

        {/* Tab Selector */}
        <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-2xl flex space-x-1 shadow-xl">
          <button
            type="button"
            onClick={() => { setMode('LOGIN'); setErrorMessage(null); }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition ${
              mode === 'LOGIN'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>HOSPITAL SIGN-IN</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('REGISTER'); setErrorMessage(null); }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition ${
              mode === 'REGISTER'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>REGISTER NEW HOSPITAL</span>
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
          <div className="bg-emerald-500/20 border border-emerald-500/60 rounded-xl p-3.5 text-emerald-300 text-xs font-mono font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Hospital Sign-In Form */}
        {mode === 'LOGIN' ? (
          <form onSubmit={handleHospitalLogin} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono flex items-center justify-between">
              <span className="text-slate-400">DEMO HOSPITAL ADMIN:</span>
              <button
                type="button"
                onClick={() => { setUsername('aiims_admin'); setPassword('aiims123'); }}
                className="bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded text-[11px] font-bold"
              >
                AUTO-FILL ADMIN
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Hospital Admin Username</label>
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
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-xl shadow-lg border border-emerald-500/40 flex items-center justify-center space-x-2 transition"
            >
              <span>ENTER HOSPITAL ER PORTAL</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* Hospital Registration Form with AI Document Verification */
          <form onSubmit={handleHospitalRegister} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Hospital / Medical Center Name</label>
              <input
                type="text"
                required
                value={hospitalName}
                onChange={e => setHospitalName(e.target.value)}
                placeholder="e.g. AIIMS Apex Trauma Center"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">ER Administrator Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Dr. Priya Sharma"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. er_head_aiims"
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

            {/* AI Document Verification */}
            <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-4 space-y-3">
              <label className="text-xs font-bold text-emerald-300 block font-mono flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
                AI HOSPITAL ACCREDITATION AUDIT:
              </label>

              <input
                type="text"
                value={licenseNumber}
                onChange={e => setLicenseNumber(e.target.value)}
                placeholder="Hospital License Registration Number (e.g. NDMC-HOSP-901)"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white"
              />

              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  onChange={e => setDocFile(e.target.files ? e.target.files[0] : null)}
                  className="hidden"
                  id="hospital-doc"
                />
                <label
                  htmlFor="hospital-doc"
                  className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 py-2 px-3 rounded-lg text-xs text-slate-300 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="truncate">{docFile ? docFile.name : 'Upload Accreditation PDF'}</span>
                </label>

                <button
                  type="button"
                  onClick={handleDocumentAiAudit}
                  disabled={isAnalyzingDoc}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-2 rounded-lg"
                >
                  {isAnalyzingDoc ? 'AUDITING...' : 'VERIFY AI'}
                </button>
              </div>

              {aiDocAnalysis && (
                <div className={`p-2.5 rounded-lg text-xs font-mono border ${
                  aiDocAnalysis.status === 'VERIFIED_APPROVED'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-500 text-rose-300'
                }`}>
                  <strong>AI AUDIT RESULT:</strong> Authenticity Score: {aiDocAnalysis.authenticityScore}% | Status: {aiDocAnalysis.status}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-xl shadow-lg border border-emerald-500/40 flex items-center justify-center space-x-2 transition"
            >
              <span>REGISTER HOSPITAL ER ACCOUNT</span>
              <ShieldCheck className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
