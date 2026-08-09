import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Ambulance, Incident, Hospital, User } from './types';
import { Navbar } from './components/Navbar';
import { PortalLanding } from './components/PortalLanding';
import { CentralDispatchPortal } from './components/CentralDispatchPortal';
import { ERDashboard } from './components/ERDashboard';
import { ParamedicApp } from './components/ParamedicApp';
import { PublicSOSPortal } from './components/PublicSOSPortal';
import { SimulatorControls } from './components/SimulatorControls';
import { AuthPortal } from './components/AuthPortal';
import { AdminAuthPortal } from './components/AdminAuthPortal';
import { HospitalAuthPortal } from './components/HospitalAuthPortal';
import { ParamedicAuthPortal } from './components/ParamedicAuthPortal';
// @ts-ignore
import { LiveDashboard } from './components/LiveDashboard';
import {
  fetchAmbulances,
  fetchIncidents,
  fetchHospitals,
  dispatchAmbulance,
  completeHospitalHandoff,
  triggerAiAutoDispatchAll,
} from './services/api';
import { offlineQueue, OfflineSyncStatus } from './services/offlineQueue';
import { subscribeGpsStream, subscribeIncidentUpdates } from './services/socket';

const AppContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isAiDispatching, setIsAiDispatching] = useState<boolean>(false);

  // Authentication & Current User Session State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('108_auth_user');
      return saved ? JSON.parse(saved) : {
        id: 'usr-hosp-01',
        username: 'aiims_admin',
        fullName: 'Dr. Vikramaditya Sharma',
        role: 'HOSPITAL_ADMIN',
        organizationName: 'AIIMS Apex Trauma Center',
        verificationStatus: 'VERIFIED_APPROVED',
        createdAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  });

  const [syncStatus, setSyncStatus] = useState<OfflineSyncStatus>({
    isOnline: true,
    pendingCount: 0,
    lastSyncAt: null,
    syncInProgress: false,
  });

  const loadData = async () => {
    const [ambs, incs, hosps] = await Promise.all([
      fetchAmbulances(),
      fetchIncidents(),
      fetchHospitals(),
    ]);
    setAmbulances(ambs);
    setIncidents(incs);
    setHospitals(hosps);
  };

  useEffect(() => {
    loadData();

    const unsubscribeSync = offlineQueue.subscribeStatus(status => {
      setSyncStatus(status);
    });

    const unsubscribeGps = subscribeGpsStream(telemetry => {
      setAmbulances(prev =>
        prev.map(a =>
          a.id === telemetry.ambulanceId
            ? { ...a, location: { lat: telemetry.lat, lng: telemetry.lng }, speed: telemetry.speed }
            : a
        )
      );
    });

    const unsubscribeIncidents = subscribeIncidentUpdates(() => {
      loadData();
    });

    return () => {
      unsubscribeSync();
      unsubscribeGps();
      unsubscribeIncidents();
    };
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('108_auth_user', JSON.stringify(user));
    } catch (e) {
      console.warn('Could not store auth session');
    }

    if (user.role === 'PARAMEDIC') {
      navigate('/paramedic');
    } else if (user.role === 'HOSPITAL_ADMIN') {
      navigate('/er');
    } else if (user.role === 'DISPATCHER') {
      navigate('/admin/dispatch');
    } else {
      navigate('/');
    }
  };

  const handleAdminLoginSuccess = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('108_auth_user', JSON.stringify(user));
    } catch (e) {}
    navigate('/admin/dispatch');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('108_auth_user');
    } catch (e) {}
    navigate('/login');
  };

  const handleUpdateAmbulanceGps = (ambulanceId: string, lat: number, lng: number) => {
    setAmbulances(prev =>
      prev.map(a => (a.id === ambulanceId ? { ...a, location: { lat, lng }, speed: 45 } : a))
    );
  };

  const handleTriggerAiDispatchAll = async () => {
    setIsAiDispatching(true);
    await triggerAiAutoDispatchAll();
    setIsAiDispatching(false);
    await loadData();
  };

  const handleTestRedlock = async () => {
    if (incidents.length === 0 || ambulances.length === 0) return;
    const targetInc = incidents[0];
    const targetAmb = ambulances[0];

    const p1 = dispatchAmbulance(targetInc.id, targetAmb.id);
    const p2 = dispatchAmbulance(targetInc.id, targetAmb.id);

    await Promise.all([p1, p2]);
    await loadData();
  };

  const handleTestAutoReroute = async () => {
    if (ambulances.length === 0) return;
    await completeHospitalHandoff(ambulances[0].id);
    await loadData();
  };

  const pendingIncidentsCount = incidents.filter(i => i.status === 'PENDING').length;
  const showNavbar = location.pathname !== '/';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {showNavbar && (
        <Navbar
          isOnline={syncStatus.isOnline}
          pendingSyncCount={syncStatus.pendingCount}
          pendingIncidentsCount={pendingIncidentsCount}
          onTriggerAiDispatchAll={handleTriggerAiDispatchAll}
          isAiDispatching={isAiDispatching}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}

      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<PortalLanding />} />

          <Route
            path="/login"
            element={<Navigate to="/hospital/login" replace />}
          />

          <Route
            path="/register"
            element={<Navigate to="/hospital/register" replace />}
          />

          <Route
            path="/hospital/login"
            element={<HospitalAuthPortal onLoginSuccess={handleLoginSuccess} initialMode="LOGIN" />}
          />

          <Route
            path="/hospital/register"
            element={<HospitalAuthPortal onLoginSuccess={handleLoginSuccess} initialMode="REGISTER" />}
          />

          <Route
            path="/paramedic/login"
            element={<ParamedicAuthPortal onLoginSuccess={handleLoginSuccess} initialMode="LOGIN" />}
          />

          <Route
            path="/paramedic/register"
            element={<ParamedicAuthPortal onLoginSuccess={handleLoginSuccess} initialMode="REGISTER" />}
          />

          <Route
            path="/admin"
            element={<AdminAuthPortal onAdminLoginSuccess={handleAdminLoginSuccess} initialMode="LOGIN" />}
          />

          <Route
            path="/admin/login"
            element={<AdminAuthPortal onAdminLoginSuccess={handleAdminLoginSuccess} initialMode="LOGIN" />}
          />

          <Route
            path="/admin/register"
            element={<AdminAuthPortal onAdminLoginSuccess={handleAdminLoginSuccess} initialMode="REGISTER" />}
          />

          <Route
            path="/admin/dispatch"
            element={
              currentUser && currentUser.role === 'DISPATCHER' ? (
                <CentralDispatchPortal
                  ambulances={ambulances}
                  incidents={incidents}
                  hospitals={hospitals}
                  onRefreshData={loadData}
                  onSimulateRaceCondition={handleTestRedlock}
                />
              ) : (
                <Navigate to="/admin/login" replace />
              )
            }
          />

          <Route path="/dispatch" element={<Navigate to="/admin/dispatch" replace />} />

          <Route
            path="/er"
            element={
              currentUser ? (
                <ERDashboard
                  hospitals={hospitals}
                  ambulances={ambulances}
                  incidents={incidents}
                  onRefreshHospitals={loadData}
                />
              ) : (
                <Navigate to="/hospital/login" replace />
              )
            }
          />

          <Route
            path="/paramedic"
            element={
              currentUser ? (
                <ParamedicApp
                  ambulances={ambulances}
                  incidents={incidents}
                  syncStatus={syncStatus}
                  onRefreshData={loadData}
                />
              ) : (
                <Navigate to="/paramedic/login" replace />
              )
            }
          />

          <Route path="/sos" element={<PublicSOSPortal onRefreshData={loadData} />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
