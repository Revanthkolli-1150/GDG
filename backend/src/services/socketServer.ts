import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { GpsTelemetryUpdate, PatientTriage, AmbulanceStatus } from '../types.js';

export class EmergencySocketServer {
  private io: SocketIOServer;

  constructor(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.initializeEventHandlers();
  }

  private initializeEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`[Socket.io] Client connected: ${socket.id}`);

      // Channel Subscription: Roles (e.g. 'dispatcher-room', 'hospital-room:11111111-...')
      socket.on('join-room', (room: string) => {
        socket.join(room);
        console.log(`[Socket.io] Socket ${socket.id} joined room: ${room}`);
      });

      socket.on('leave-room', (room: string) => {
        socket.leave(room);
        console.log(`[Socket.io] Socket ${socket.id} left room: ${room}`);
      });

      // Stream vehicle GPS coordinates (lat, lng, bearing, speed) every 3–5 seconds
      socket.on('ambulance:gps-ping', (telemetry: GpsTelemetryUpdate) => {
        // Broadcast location ping to central dispatch and hospital subscribers
        this.io.to('dispatcher-room').emit('ambulance:location-updated', telemetry);
        this.io.emit('ambulance:location-updated', telemetry);
        this.io.emit(`ambulance:${telemetry.ambulanceId}:location`, telemetry);
      });

      // Stream live patient vitals logged by paramedics to ER dashboard
      socket.on('paramedic:telemetry-stream', (triage: PatientTriage) => {
        console.log(`[Socket.io] Live Patient Vitals Streamed for Incident: ${triage.incidentId} | Patient: ${triage.patientName}`);
        this.broadcastPatientVitals(triage);
      });

      socket.on('disconnect', () => {
        console.log(`[Socket.io] Client disconnected: ${socket.id}`);
      });
    });
  }

  // Helper Broadcasters
  public broadcastGpsStream(telemetry: GpsTelemetryUpdate): void {
    this.io.to('dispatcher-room').emit('ambulance:location-updated', telemetry);
    this.io.emit('ambulance:location-updated', telemetry);
    this.io.emit(`ambulance:${telemetry.ambulanceId}:location`, telemetry);
  }
  public broadcastPatientVitals(triage: PatientTriage): void {
    this.io.to('hospital-room').emit('hospital:patient-vitals-updated', triage);
    this.io.to('dispatcher-room').emit('dispatcher:patient-vitals-updated', triage);
    this.io.emit('hospital:patient-vitals-updated', triage);
  }

  public broadcastAmbulanceStatusChange(ambulanceId: string, status: AmbulanceStatus, details?: any): void {
    this.io.emit('ambulance:status-changed', { ambulanceId, status, details, timestamp: new Date().toISOString() });
  }

  public broadcastIncidentUpdate(incident: any): void {
    this.io.emit('incident:updated', incident);
  }

  public broadcastAutoReroute(ambulanceId: string, oldIncidentId: string, newIncidentId: string, newTargetLocation: any, etaMinutes: number): void {
    this.io.emit('ambulance:auto-rerouted', {
      ambulanceId,
      oldIncidentId,
      newIncidentId,
      newTargetLocation,
      etaMinutes,
      timestamp: new Date().toISOString(),
    });
  }

  public getIO(): SocketIOServer {
    return this.io;
  }
}
