import { io, Socket } from 'socket.io-client';
import { GpsTelemetryUpdate, PatientTriage } from '../types';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('http://localhost:5000', {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      console.log('[Socket.io Client] Connected to Telemetry Hub. ID:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('[Socket.io Client] Disconnected from Telemetry Hub.');
    });
  }
  return socket;
}

export function subscribeGpsStream(callback: (data: GpsTelemetryUpdate) => void) {
  const s = getSocket();
  s.emit('join-room', 'dispatcher-room');
  s.on('ambulance:location-updated', callback);
  return () => {
    s.off('ambulance:location-updated', callback);
  };
}

export function subscribePatientVitals(callback: (triage: PatientTriage) => void) {
  const s = getSocket();
  s.emit('join-room', 'hospital-room');
  s.on('hospital:patient-vitals-updated', callback);
  return () => {
    s.off('hospital:patient-vitals-updated', callback);
  };
}

export function emitParamedicVitals(triage: PatientTriage) {
  const s = getSocket();
  s.emit('paramedic:telemetry-stream', triage);
}

export function emitParamedicGps(telemetry: GpsTelemetryUpdate) {
  const s = getSocket();
  s.emit('ambulance:gps-ping', telemetry);
}

export function subscribeIncidentUpdates(callback: (data: any) => void) {
  const s = getSocket();
  s.on('incident:updated', callback);
  s.on('ambulance:status-changed', callback);
  s.on('ambulance:auto-rerouted', callback);
  return () => {
    s.off('incident:updated', callback);
    s.off('ambulance:status-changed', callback);
    s.off('ambulance:auto-rerouted', callback);
  };
}
