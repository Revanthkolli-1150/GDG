import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, UserRole, DocumentVerificationResult, BiometricFaceDescriptor } from '../types';
import { registerUser, loginUser, verifyBiometricFace, verifyDocumentsAi } from '../services/api';
import { BiometricFaceCameraModal } from './BiometricFaceCameraModal';
import {
  ShieldCheck,
  Building2,
  Stethoscope,
  Radio,
  UserPlus,
  LogIn,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Camera,
  Lock,
  User as UserIcon,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface AuthPortalProps {
  onLoginSuccess: (user: User) => void;
  initialMode?: 'LOGIN' | 'REGISTER';
}

export const AuthPortal: React.FC<AuthPortalProps> = ({ onLoginSuccess, initialMode = 'LOGIN' }) => {
  const [searchParams] = useSearchParams();
  const initialRoleParam = searchParams.get('role');

  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER'>(initialMode);
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    initialRoleParam === 'PARAMEDIC' ? 'PARAMEDIC' : 'HOSPITAL_ADMIN'
  );

  // Login State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErrorMessage, setLoginErrorMessage] = useState<string | null>(null);
  const [loginSuccessMessage, setLoginSuccessMessage] = useState<string | null>(null);
  const [pendingBiometricUser, setPendingBiometricUser] = useState<User | null>(null);

  // Register State
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regOrgName, setRegOrgName] = useState('');
  const [regLicenseNumber, setRegLicenseNumber] = useState('');

  // Document Upload & AI Verification State
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docBase64, setDocBase64] = useState<string | null>(null);
  const [isVerifyingAi, setIsVerifyingAi] = useState(false);
  const [aiAuditResult, setAiAuditResult] = useState<DocumentVerificationResult | null>(null);

  // Biometric Face State
  const [biometricDescriptor, setBiometricDescriptor] = useState<BiometricFaceDescriptor | null>(null);
  const [isBiometricModalOpen, setIsBiometricModalOpen] = useState(false);
  const [biometricModalMode, setBiometricModalMode] = useState<'REGISTER' | 'VERIFY'>('REGISTER');

  const [registerErrorMessage, setRegisterErrorMessage] = useState<string | null>(null);
  const [registerSuccessMessage, setRegisterSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Demo Pre-fill helper
  const handleQuickDemoFill = (role: UserRole) => {
    setSelectedRole(role);
    if (role === 'HOSPITAL_ADMIN') {
      setLoginUsername('aiims_admin');
      setLoginPassword('aiims123');
    } else if (role === 'PARAMEDIC') {
      setLoginUsername('paramedic_delhi01');
      setLoginPassword('para123');
    } else {
      setLoginUsername('central_dispatcher');
      setLoginPassword('dispatch123');
    }
  };

  // Document Upload & Real-Time AI Fraud Verification Audit
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDocFile(file);

      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        setDocBase64(base64);

        // Run instant AI document verification audit
        setIsVerifyingAi(true);
        const audit = await verifyDocumentsAi(selectedRole, {
          documentType: selectedRole === 'HOSPITAL_ADMIN' ? 'Clinical Establishment License' : 'EMT Certification',
          fileName: file.name,
          fileBase64: base64,
          licenseNumber: regLicenseNumber || 'DEL-LICENSE-TEMP',
          organizationName: regOrgName,
          applicantName: regFullName,
        });

        setAiAuditResult(audit);
        setIsVerifyingAi(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // Perform Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrorMessage(null);
    setLoginSuccessMessage(null);
    setIsSubmitting(true);

    const res = await loginUser(loginUsername, loginPassword);
    setIsSubmitting(false);

    if (!res.success) {
      setLoginErrorMessage(res.message || 'Login failed. Please verify credentials.');
      return;
    }

    // Check if Paramedic Biometric Facial Login is Required
    if (res.requireBiometric && res.user) {
      setPendingBiometricUser(res.user);
      setBiometricModalMode('VERIFY');
      setIsBiometricModalOpen(true);
      return;
    }

    setLoginSuccessMessage(res.message || 'Login successful!');
    setTimeout(() => onLoginSuccess(res.user), 1000);
  };

  // Biometric Facial Capture Completed Callback
  const handleBiometricCaptured = async (descriptor: BiometricFaceDescriptor) => {
    if (biometricModalMode === 'REGISTER') {
      setBiometricDescriptor(descriptor);
    } else if (pendingBiometricUser) {
      // Perform Facial Match Login Verification
      const matchRes = await verifyBiometricFace(pendingBiometricUser.id, descriptor.faceVector);
      if (matchRes.success) {
        setLoginSuccessMessage(matchRes.message);
        setTimeout(() => onLoginSuccess(pendingBiometricUser), 1000);
      } else {
        setLoginErrorMessage(matchRes.message);
      }
    }
  };

  // Perform Sign-Up Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterErrorMessage(null);
    setRegisterSuccessMessage(null);

    if (!regUsername || !regPassword || !regFullName || !regEmail) {
      setRegisterErrorMessage('Please complete all required identity and login credential fields.');
      return;
    }

    if (selectedRole === 'PARAMEDIC' && !biometricDescriptor) {
      setRegisterErrorMessage('Paramedic registration requires live facial recognition camera profile scan.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      username: regUsername,
      email: regEmail,
      fullName: regFullName,
      password: regPassword,
      role: selectedRole,
      organizationName: regOrgName || (selectedRole === 'HOSPITAL_ADMIN' ? 'Apex Hospital' : '108 EMS Paramedic Unit'),
      licenseNumber: regLicenseNumber || `LIC-${Date.now().toString().slice(-6)}`,
      phone: regPhone || '+91-9800000000',
      documents: docFile
        ? [
            {
              documentType: selectedRole === 'HOSPITAL_ADMIN' ? 'Clinical Establishment License' : 'EMT Certificate',
              fileName: docFile.name,
              fileBase64: docBase64 || '',
              licenseNumber: regLicenseNumber,
              organizationName: regOrgName,
              applicantName: regFullName,
            },
          ]
        : [],
      biometricFaceDescriptor: biometricDescriptor || undefined,
    };

    const res = await registerUser(payload);
    setIsSubmitting(false);

    if (!res.success) {
      setRegisterErrorMessage(res.message || 'Registration rejected by AI Verification Engine.');
      if (res.verificationDetails) {
        setAiAuditResult(res.verificationDetails);
      }
      return;
    }

    setRegisterSuccessMessage(res.message);
    setTimeout(() => {
      onLoginSuccess(res.user);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4 selection:bg-rose-500 selection:text-white">
      {/* Biometric Camera Modal */}
      <BiometricFaceCameraModal
        isOpen={isBiometricModalOpen}
        onClose={() => setIsBiometricModalOpen(false)}
        mode={biometricModalMode}
        userName={pendingBiometricUser ? pendingBiometricUser.fullName : regFullName || 'Paramedic Unit'}
        onFaceCaptured={handleBiometricCaptured}
      />

      <div className="max-w-2xl w-full space-y-6">
        {/* Header Branding Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 bg-rose-500/10 border border-rose-500/30 px-3.5 py-1.5 rounded-full text-rose-400 text-xs font-mono font-bold">
            <ShieldCheck className="w-4 h-4 text-rose-400" />
            <span>STRICT AI DOCUMENT ANTI-FORGERY & BIOMETRIC VERIFICATION SYSTEM</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            108 Emergency Dispatch Platform
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Authorized Workstation Portal Access for Premier Hospitals, Paramedic Squads & Central Dispatch Command
          </p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-2xl flex items-center shadow-xl">
          <button
            onClick={() => setActiveTab('LOGIN')}
            className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition ${
              activeTab === 'LOGIN'
                ? 'bg-cyan-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>SIGN IN TO WORKSTATION</span>
          </button>

          <button
            onClick={() => setActiveTab('REGISTER')}
            className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition ${
              activeTab === 'REGISTER'
                ? 'bg-rose-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>REGISTER NEW ENTITY & VERIFY DOCUMENTS</span>
          </button>
        </div>

        {/* Role Selector Grid */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
          <label className="text-xs text-slate-400 font-mono font-bold block">SELECT AUTHORIZED ROLE PORTAL:</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedRole('HOSPITAL_ADMIN')}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                selectedRole === 'HOSPITAL_ADMIN'
                  ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-lg shadow-emerald-950/50'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-start">
                <Building2 className={`w-5 h-5 ${selectedRole === 'HOSPITAL_ADMIN' ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">ER</span>
              </div>
              <div className="mt-2">
                <span className="text-xs font-bold block">Hospital Admin</span>
                <span className="text-[10px] text-slate-400 block font-mono">ER & Trauma Bays</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('PARAMEDIC')}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                selectedRole === 'PARAMEDIC'
                  ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-lg shadow-cyan-950/50'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-start">
                <Stethoscope className={`w-5 h-5 ${selectedRole === 'PARAMEDIC' ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono font-bold">BIOMETRIC</span>
              </div>
              <div className="mt-2">
                <span className="text-xs font-bold block">Paramedic Squad</span>
                <span className="text-[10px] text-slate-400 block font-mono">108 Field Unit</span>
              </div>
            </button>
          </div>
        </div>

        {/* Active Auth Container */}
        {activeTab === 'LOGIN' ? (
          /* LOGIN FORM */
          <form onSubmit={handleLoginSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Lock className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-sm text-white">WORKSTATION CREDENTIAL LOGIN</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">ROLE: {selectedRole}</span>
            </div>

            {/* Quick Demo Pre-fill Bar */}
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 text-[11px]">QUICK DEMO ACCREDITED LOGIN:</span>
              <button
                type="button"
                onClick={() => handleQuickDemoFill(selectedRole)}
                className="bg-cyan-600/30 hover:bg-cyan-600 text-cyan-300 border border-cyan-500/40 px-3 py-1 rounded text-[11px] font-bold"
              >
                AUTO-FILL DEMO CREDENTIALS
              </button>
            </div>

            {loginErrorMessage && (
              <div className="bg-rose-500/20 border border-rose-500/60 rounded-xl p-3.5 text-rose-300 text-xs font-mono font-bold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{loginErrorMessage}</span>
              </div>
            )}

            {loginSuccessMessage && (
              <div className="bg-emerald-500/20 border border-emerald-500/60 rounded-xl p-3.5 text-emerald-300 text-xs font-mono font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{loginSuccessMessage}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Username or Work Email</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={e => setLoginUsername(e.target.value)}
                    placeholder="e.g. aiims_admin or paramedic_delhi01"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-600"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-extrabold text-xs py-3.5 rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
            >
              <span>SIGN IN TO {selectedRole.replace('_', ' ')} PORTAL</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* REGISTER FORM WITH STRICT AI VERIFICATION & BIOMETRIC CAPTURE */
          <form onSubmit={handleRegisterSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-sm text-white">AI-VERIFIED ENTITY REGISTRATION</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">ROLE: {selectedRole}</span>
            </div>

            {registerErrorMessage && (
              <div className="bg-rose-500/20 border border-rose-500/60 rounded-xl p-3.5 text-rose-300 text-xs font-mono font-bold flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{registerErrorMessage}</span>
              </div>
            )}

            {registerSuccessMessage && (
              <div className="bg-emerald-500/20 border border-emerald-500/60 rounded-xl p-3.5 text-emerald-300 text-xs font-mono font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{registerSuccessMessage}</span>
              </div>
            )}

            {/* STEP 1: IDENTITY & LOGIN CREDENTIALS */}
            <div className="space-y-4">
              <span className="text-xs font-bold text-cyan-400 font-mono block">STEP 1: IDENTITY & LOGIN CREDENTIALS</span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={e => setRegFullName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Work Email</label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    placeholder="name@hospital.org"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Unique Username</label>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={e => setRegUsername(e.target.value)}
                    placeholder="e.g. max_super_admin"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Set Account Password</label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    {selectedRole === 'HOSPITAL_ADMIN' ? 'Hospital / Center Name' : 'EMS Unit / Organization'}
                  </label>
                  <input
                    type="text"
                    value={regOrgName}
                    onChange={e => setRegOrgName(e.target.value)}
                    placeholder={selectedRole === 'HOSPITAL_ADMIN' ? 'Max Super Speciality Hospital' : '108 EMS Squad Delhi'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    {selectedRole === 'HOSPITAL_ADMIN' ? 'Clinical Establishment License No.' : 'EMT / Council Registration No.'}
                  </label>
                  <input
                    type="text"
                    value={regLicenseNumber}
                    onChange={e => setRegLicenseNumber(e.target.value)}
                    placeholder="DEL-HOSP-2024-9988"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            {/* STEP 2: STRICT AI DOCUMENT ANTI-FORGERY AUDIT */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <span className="text-xs font-bold text-rose-400 font-mono flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-rose-400" />
                STEP 2: UPLOAD ESSENTIAL VERIFICATION DOCUMENTS (AI ANTI-FORGERY & DUPLICATE CHECK)
              </span>

              <div className="bg-slate-950 border-2 border-dashed border-slate-800 rounded-xl p-4 text-center space-y-2 hover:border-slate-700 transition">
                <Upload className="w-6 h-6 text-slate-500 mx-auto" />
                <label className="block text-xs font-bold text-cyan-400 cursor-pointer hover:underline">
                  <span>{docFile ? docFile.name : 'Upload Official License / Accreditation Certificate (PDF / Image)'}</span>
                  <input type="file" onChange={handleFileChange} accept="image/*,.pdf" className="hidden" />
                </label>
                <p className="text-[10px] text-slate-500 font-mono">
                  Required: Clinical Establishment License / NABH for Hospitals | EMT License / Govt ID for Paramedics
                </p>
              </div>

              {isVerifyingAi && (
                <div className="bg-cyan-950/60 border border-cyan-500/50 p-3 rounded-xl text-cyan-300 text-xs font-mono flex items-center space-x-2 animate-pulse">
                  <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>AI VERIFICATION ENGINE: Inspecting pixel entropy, EXIF tampering & duplicate license registry...</span>
                </div>
              )}

              {aiAuditResult && (
                <div
                  className={`border rounded-xl p-3.5 space-y-2 font-mono text-xs ${
                    aiAuditResult.status === 'VERIFIED_APPROVED'
                      ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300'
                      : 'bg-rose-950/50 border-rose-500/80 text-rose-300'
                  }`}
                >
                  <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                    <span className="font-extrabold flex items-center gap-1.5">
                      {aiAuditResult.status === 'VERIFIED_APPROVED' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                      )}
                      AI AUDIT STATUS: {aiAuditResult.status}
                    </span>
                    <span className="bg-slate-900 px-2 py-0.5 rounded font-bold text-white">
                      SCORE: {aiAuditResult.authenticityScore}%
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    {aiAuditResult.auditDetails.map((detail, idx) => (
                      <div key={idx} className="flex items-start gap-1">
                        <span className="text-slate-400">•</span>
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* STEP 3: PARAMEDIC BIOMETRIC FACIAL PROFILE REQUIREMENT */}
            {selectedRole === 'PARAMEDIC' && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <span className="text-xs font-bold text-cyan-400 font-mono flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  STEP 3: PARAMEDIC LIVE BIOMETRIC FACIAL SCAN
                </span>

                {biometricDescriptor ? (
                  <div className="bg-emerald-500/20 border border-emerald-500/50 p-3 rounded-xl text-emerald-300 text-xs font-mono font-bold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      BIOMETRIC FACE PROFILE REGISTERED (256-BIT VECTOR)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setBiometricModalMode('REGISTER');
                        setIsBiometricModalOpen(true);
                      }}
                      className="text-[11px] underline hover:text-white"
                    >
                      RE-SCAN
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setBiometricModalMode('REGISTER');
                      setIsBiometricModalOpen(true);
                    }}
                    className="w-full bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 font-bold text-xs py-3 rounded-xl flex items-center justify-center space-x-2 transition"
                  >
                    <Camera className="w-4 h-4 text-cyan-400" />
                    <span>OPEN WEBCAM & CAPTURE BIOMETRIC FACE PROFILE</span>
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-extrabold text-xs py-3.5 rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
            >
              <span>REGISTER & COMPLETE AI VERIFICATION</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
