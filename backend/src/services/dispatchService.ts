import { lockManager } from './redisLock.js';
import { EmergencySocketServer } from './socketServer.js';
import { Ambulance, Incident, Hospital, LocationPoint } from '../types.js';

export function calculateDistanceMeters(loc1: LocationPoint, loc2: LocationPoint): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (loc1.lat * Math.PI) / 180;
  const φ2 = (loc2.lat * Math.PI) / 180;
  const Δφ = ((loc2.lat - loc1.lat) * Math.PI) / 180;
  const Δλ = ((loc2.lng - loc1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function calculateEtaMinutes(distanceMeters: number, averageSpeedKmh: number = 40): number {
  const speedMetersPerMinute = (averageSpeedKmh * 1000) / 60;
  return Math.ceil(distanceMeters / speedMetersPerMinute);
}

export class DispatchService {
  private socketServer?: EmergencySocketServer;

  private ambulances: Map<string, Ambulance> = new Map();
  private incidents: Map<string, Incident> = new Map();
  private hospitals: Map<string, Hospital> = new Map();
  private triages: Map<string, any> = new Map();

  constructor(socketServer?: EmergencySocketServer) {
    this.socketServer = socketServer;
    this.initializeIndianSeedData();
  }

  public setSocketServer(socketServer: EmergencySocketServer): void {
    this.socketServer = socketServer;
  }

  private initializeIndianSeedData(): void {
    // Premier Indian Hospitals Seed
    const h1: Hospital = {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'AIIMS Apex Trauma Center',
      address: 'Sri Aurobindo Marg, Ansari Nagar, New Delhi',
      location: { lat: 28.5672, lng: 77.21 },
      traumaBaysTotal: 25,
      traumaBaysAvailable: 8,
      icuBedsAvailable: 5,
      status: 'NORMAL',
      contactPhone: '+91-11-26588500',
    };

    const h2: Hospital = {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Fortis Escorts Heart Institute',
      address: 'Okhla Road, Sukhdev Vihar, New Delhi',
      location: { lat: 28.5604, lng: 77.275 },
      traumaBaysTotal: 16,
      traumaBaysAvailable: 4,
      icuBedsAvailable: 3,
      status: 'BUSY',
      contactPhone: '+91-11-47135000',
    };

    const h3: Hospital = {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Max Super Speciality Hospital',
      address: 'Press Enclave Road, Saket, New Delhi',
      location: { lat: 28.5283, lng: 77.2117 },
      traumaBaysTotal: 20,
      traumaBaysAvailable: 9,
      icuBedsAvailable: 6,
      status: 'NORMAL',
      contactPhone: '+91-11-26515050',
    };

    // 108 / 112 Indian Fleet Seed
    const a1: Ambulance = {
      id: 'b1111111-1111-1111-1111-111111111111',
      callSign: '108-ALS-DEL-01',
      vehiclePlate: 'DL-01-GA-1081',
      status: 'AVAILABLE',
      location: { lat: 28.56, lng: 77.215 },
      bearing: 180,
      speed: 0,
      lastPingAt: new Date().toISOString(),
    };

    const a2: Ambulance = {
      id: 'b2222222-2222-2222-2222-222222222222',
      callSign: '108-BLS-DEL-04',
      vehiclePlate: 'DL-03-CB-9041',
      status: 'AVAILABLE',
      location: { lat: 28.55, lng: 77.23 },
      bearing: 90,
      speed: 0,
      lastPingAt: new Date().toISOString(),
    };

    const a3: Ambulance = {
      id: 'b3333333-3333-3333-3333-333333333333',
      callSign: 'APOLLO-CRITICAL-02',
      vehiclePlate: 'TS-09-EM-8080',
      status: 'AVAILABLE',
      location: { lat: 28.54, lng: 77.2 },
      bearing: 270,
      speed: 0,
      lastPingAt: new Date().toISOString(),
    };

    // Sample Indian Emergencies
    const i1: Incident = {
      id: 'c1111111-1111-1111-1111-111111111111',
      callerName: 'Ramesh Gupta',
      callerPhone: '+91-9810998811',
      incidentType: 'CARDIAC_ARREST',
      priority: 'CRITICAL_P1',
      status: 'PENDING',
      location: { lat: 28.555, lng: 77.218 },
      addressText: 'Connaught Place Outer Circle, Block C, New Delhi',
      description: '54yo male collapsed near metro exit, crushing chest pain, bystander CPR initiated',
      reportedAt: new Date().toISOString(),
    };

    const i2: Incident = {
      id: 'c2222222-2222-2222-2222-222222222222',
      callerName: 'Sunita Verma',
      callerPhone: '+91-9871233441',
      incidentType: 'SEVERE_TRAUMA',
      priority: 'CRITICAL_P1',
      status: 'PENDING',
      location: { lat: 28.545, lng: 77.24 },
      addressText: 'Ring Road Flyover Junction, Lajpat Nagar, Delhi',
      description: 'High-speed multi-vehicle collision, patient pinned in vehicle with acute hypotension',
      reportedAt: new Date().toISOString(),
    };

    this.hospitals.set(h1.id, h1);
    this.hospitals.set(h2.id, h2);
    this.hospitals.set(h3.id, h3);
    this.ambulances.set(a1.id, a1);
    this.ambulances.set(a2.id, a2);
    this.ambulances.set(a3.id, a3);
    this.incidents.set(i1.id, i1);
    this.incidents.set(i2.id, i2);
  }

  public findNearestAvailableAmbulances(incidentLocation: LocationPoint, count: number = 5) {
    const available = Array.from(this.ambulances.values()).filter(a => a.status === 'AVAILABLE');

    const mapped = available.map(amb => {
      const distMeters = calculateDistanceMeters(amb.location, incidentLocation);
      const etaMins = calculateEtaMinutes(distMeters);
      return {
        ambulance: amb,
        distanceMeters: Math.round(distMeters),
        etaMinutes: etaMins,
      };
    });

    mapped.sort((a, b) => a.distanceMeters - b.distanceMeters);
    return mapped.slice(0, count);
  }

  public async dispatchAmbulance(incidentId: string, preferredAmbulanceId?: string): Promise<{ success: boolean; ambulance?: Ambulance; incident?: Incident; message: string }> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      return { success: false, message: 'Incident record not found.' };
    }

    if (incident.status !== 'PENDING') {
      return { success: false, message: `Incident is already in state: ${incident.status}` };
    }

    let targetAmbulanceId = preferredAmbulanceId;
    if (!targetAmbulanceId) {
      const matches = this.findNearestAvailableAmbulances(incident.location, 1);
      if (matches.length === 0) {
        return { success: false, message: 'No available 108/112 ambulance units within sector.' };
      }
      targetAmbulanceId = matches[0].ambulance.id;
    }

    const ambulance = this.ambulances.get(targetAmbulanceId);
    if (!ambulance) {
      return { success: false, message: 'Specified EMS unit does not exist.' };
    }

    const lockResource = `ambulance:${ambulance.id}`;
    const lockToken = await lockManager.acquireLock(lockResource, 8000);

    if (!lockToken) {
      return {
        success: false,
        message: `RACE CONDITION PREVENTED: Ambulance ${ambulance.callSign} is currently locked by another dispatcher!`,
      };
    }

    try {
      ambulance.status = 'DISPATCHED';
      ambulance.assignedIncidentId = incident.id;
      incident.status = 'ASSIGNED';
      incident.assignedAmbulanceId = ambulance.id;

      const nearestHospital = this.findNearestHospitalWithCapacity(incident.location);
      if (nearestHospital) {
        incident.destinationHospitalId = nearestHospital.id;
        ambulance.assignedHospitalId = nearestHospital.id;
      }

      this.socketServer?.broadcastAmbulanceStatusChange(ambulance.id, 'DISPATCHED', { incidentId: incident.id });
      this.socketServer?.broadcastIncidentUpdate(incident);

      return {
        success: true,
        ambulance,
        incident,
        message: `Successfully dispatched 108 Unit ${ambulance.callSign} to ${incident.addressText}`,
      };
    } finally {
      await lockManager.releaseLock(lockResource, lockToken);
    }
  }

  public async completeHospitalHandoffAndReroute(ambulanceId: string): Promise<{ success: boolean; actionTaken: string; nextIncident?: Incident }> {
    const ambulance = this.ambulances.get(ambulanceId);
    if (!ambulance) {
      return { success: false, actionTaken: 'Ambulance not found.' };
    }

    const currentIncidentId = ambulance.assignedIncidentId;
    if (currentIncidentId) {
      const inc = this.incidents.get(currentIncidentId);
      if (inc) {
        inc.status = 'HANDOFF_COMPLETE';
        inc.resolvedAt = new Date().toISOString();
        this.socketServer?.broadcastIncidentUpdate(inc);
      }
    }

    ambulance.assignedIncidentId = null;
    ambulance.status = 'AVAILABLE';

    console.log(`[Rerouting Engine] Handoff complete for ${ambulance.callSign}. Evaluating immediate post-handoff reroute...`);

    const pendingIncidents = Array.from(this.incidents.values())
      .filter(i => i.status === 'PENDING')
      .map(i => ({
        incident: i,
        distMeters: calculateDistanceMeters(ambulance.location, i.location),
        etaMins: calculateEtaMinutes(calculateDistanceMeters(ambulance.location, i.location)),
      }))
      .sort((a, b) => {
        if (a.incident.priority === 'CRITICAL_P1' && b.incident.priority !== 'CRITICAL_P1') return -1;
        if (b.incident.priority === 'CRITICAL_P1' && a.incident.priority !== 'CRITICAL_P1') return 1;
        return a.distMeters - b.distMeters;
      });

    if (pendingIncidents.length > 0) {
      const nextMatch = pendingIncidents[0];
      console.log(`[Rerouting Engine] DYNAMIC AUTOMATED REROUTE: Directing ${ambulance.callSign} to pending emergency ${nextMatch.incident.id} (ETA: ${nextMatch.etaMins}m)`);

      const dispatchResult = await this.dispatchAmbulance(nextMatch.incident.id, ambulance.id);

      if (dispatchResult.success) {
        this.socketServer?.broadcastAutoReroute(
          ambulance.id,
          currentIncidentId || 'NONE',
          nextMatch.incident.id,
          nextMatch.incident.location,
          nextMatch.etaMins
        );

        return {
          success: true,
          actionTaken: `Automated dynamic reroute to ${nextMatch.incident.incidentType} at ${nextMatch.incident.addressText} (ETA: ${nextMatch.etaMins} mins).`,
          nextIncident: nextMatch.incident,
        };
      }
    }

    const nearestHospital = this.findNearestHospitalWithCapacity(ambulance.location);
    const actionMessage = nearestHospital 
      ? `No pending 108 emergencies. Rerouted to base standby at ${nearestHospital.name}.`
      : `No pending emergencies. Unit set to AVAILABLE status.`;

    this.socketServer?.broadcastAmbulanceStatusChange(ambulance.id, 'AVAILABLE');

    return {
      success: true,
      actionTaken: actionMessage,
    };
  }

  public findNearestHospitalWithCapacity(location: LocationPoint): Hospital | undefined {
    const list = Array.from(this.hospitals.values()).filter(h => h.traumaBaysAvailable > 0 && h.status !== 'DIVERTING');
    if (list.length === 0) return Array.from(this.hospitals.values())[0];

    list.sort((a, b) => calculateDistanceMeters(location, a.location) - calculateDistanceMeters(location, b.location));
    return list[0];
  }

  public getAllAmbulances(): Ambulance[] {
    return Array.from(this.ambulances.values());
  }

  public getAllIncidents(): Incident[] {
    return Array.from(this.incidents.values());
  }

  public getAllHospitals(): Hospital[] {
    return Array.from(this.hospitals.values());
  }

  public createIncident(incident: Incident): Incident {
    this.incidents.set(incident.id, incident);
    this.socketServer?.broadcastIncidentUpdate(incident);
    return incident;
  }

  public updateAmbulanceGps(update: { ambulanceId: string; lat: number; lng: number; bearing?: number; speed?: number }) {
    let amb = this.ambulances.get(update.ambulanceId);
    if (!amb) {
      amb = Array.from(this.ambulances.values()).find(a => a.callSign === update.ambulanceId);
    }

    if (amb) {
      amb.location = { lat: update.lat, lng: update.lng };
      amb.bearing = update.bearing ?? amb.bearing;
      amb.speed = update.speed ?? amb.speed;
      amb.lastPingAt = new Date().toISOString();

      // Broadcast real-time GPS telemetry to all connected WebSocket & Socket.IO clients
      this.socketServer?.broadcastGpsStream({
        ambulanceId: amb.id,
        callSign: amb.callSign,
        lat: update.lat,
        lng: update.lng,
        speed: amb.speed,
        bearing: amb.bearing,
        time: amb.lastPingAt
      });
    }
  }

  public updateHospitalBays(hospitalId: string, baysAvailable: number) {
    const hosp = this.hospitals.get(hospitalId);
    if (hosp) {
      hosp.traumaBaysAvailable = Math.max(0, baysAvailable);
      return hosp;
    }
    return null;
  }

  public saveTriageRecord(triage: any): any {
    const key = triage.id || triage.incidentId || `triage-${Date.now()}`;
    const record = { ...triage, id: key, updatedAt: new Date().toISOString() };
    this.triages.set(key, record);
    this.socketServer?.broadcastPatientVitals(record);
    return record;
  }

  public getAllTriages(): any[] {
    return Array.from(this.triages.values());
  }
}
