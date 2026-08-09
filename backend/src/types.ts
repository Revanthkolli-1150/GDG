export type UserRole = 'PARAMEDIC' | 'HOSPITAL_ADMIN' | 'DISPATCHER' | 'PUBLIC';

export type VerificationStatus = 'PENDING_VERIFICATION' | 'VERIFIED_APPROVED' | 'REJECTED_FORGERY_DETECTED';

export interface DocumentVerificationResult {
  status: VerificationStatus;
  authenticityScore: number;
  imageIntegrityValid: boolean;
  morfingDetected: boolean;
  duplicateLicenseFound: boolean;
  forgeryRisk?: number;
  reason?: string;
  auditDetails: string[];
  verifiedAt: string;
}

export interface BiometricFaceDescriptor {
  landmarks: number[][];
  faceVector: number[];
  capturedAt: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  organizationName?: string;
  licenseNumber?: string;
  phone?: string;
  verificationStatus: VerificationStatus;
  verificationDetails?: DocumentVerificationResult;
  biometricFaceDescriptor?: BiometricFaceDescriptor;
  passwordHash?: string;
  token?: string;
  createdAt: string;
}

export type AmbulanceStatus = 
  | 'AVAILABLE' 
  | 'DISPATCHED' 
  | 'EN_ROUTE_TO_SCENE' 
  | 'AT_SCENE' 
  | 'TRANSPORTING' 
  | 'AT_HOSPITAL' 
  | 'OFF_DUTY';

export type IncidentPriority = 'CRITICAL_P1' | 'URGENT_P2' | 'NON_URGENT_P3';

export type IncidentStatus = 
  | 'PENDING' 
  | 'ASSIGNED' 
  | 'IN_PROGRESS' 
  | 'HANDOFF_COMPLETE' 
  | 'CANCELLED';

export type ESITriageLevel = 'RED_LEVEL_1' | 'YELLOW_LEVEL_2' | 'GREEN_LEVEL_3';

export type HospitalStatus = 'NORMAL' | 'BUSY' | 'DIVERTING' | 'FULL_CAPACITY';

export interface LocationPoint {
  lat: number;
  lng: number;
}

export interface Ambulance {
  id: string;
  callSign: string;
  vehiclePlate: string;
  status: AmbulanceStatus;
  location: LocationPoint;
  bearing: number;
  speed: number;
  assignedIncidentId?: string | null;
  assignedHospitalId?: string | null;
  assignedParamedicId?: string | null;
  lastPingAt: string;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  location: LocationPoint;
  traumaBaysTotal: number;
  traumaBaysAvailable: number;
  icuBedsAvailable: number;
  status: HospitalStatus;
  contactPhone: string;
}

export interface Incident {
  id: string;
  callerName: string;
  callerPhone: string;
  incidentType: string;
  priority: IncidentPriority;
  status: IncidentStatus;
  location: LocationPoint;
  addressText: string;
  assignedAmbulanceId?: string | null;
  destinationHospitalId?: string | null;
  description: string;
  reportedAt: string;
  resolvedAt?: string | null;
}

export interface PatientTriage {
  id?: string;
  incidentId: string;
  ambulanceId: string;
  paramedicId?: string;
  patientName?: string;
  patientAge?: number;
  patientGender?: string;
  esiLevel: ESITriageLevel;
  chiefComplaint: string;
  heartRate: number;
  bpSystolic: number;
  bpDiastolic: number;
  spo2: number;
  respiratoryRate: number;
  temperatureCelsius: number;
  ekgRhythm: string;
  notes?: string;
  voiceTranscript?: string;
  isSyncedFromOffline?: boolean;
  recordedAt: string;
}

export interface GpsTelemetryUpdate {
  ambulanceId: string;
  callSign?: string;
  lat: number;
  lng: number;
  bearing: number;
  speed: number;
  timestamp?: string;
  time?: string;
}
