import { PatientTriage } from '../types.js';

export interface ShockIndexResult {
  shockIndex: number; // e.g. 1.28
  status: 'NORMAL' | 'ELEVATED' | 'HIGH_RISK_SHOCK';
  alertTriggered: boolean;
  clinicalInterpretation: string;
}

export interface ImistAmboHandover {
  identification: string;
  mechanismOrMedical: string;
  injuriesOrInformation: string;
  signsAndVitals: {
    heartRate: number;
    bpSystolic: number;
    bpDiastolic: number;
    spo2: number;
    respiratoryRate: number;
    shockIndex: number;
    esiLevel: string;
  };
  treatmentGiven: string;
  ageAndGender: string;
  medicalHistoryAndAllergies: string;
  bedRequirement: string;
  otherInformation: string;
  handoverTimestamp: string;
}

export class ClinicalEngine {
  /**
   * Calculates Shock Index = Heart Rate / Systolic Blood Pressure
   * Normal range: 0.5 - 0.7
   * Shock Risk: > 0.9 (Indicates occult bleeding, decompensated shock, or impending collapse)
   */
  public calculateShockIndex(heartRate: number, bpSystolic: number): ShockIndexResult {
    if (!bpSystolic || bpSystolic <= 0) {
      return {
        shockIndex: 0,
        status: 'NORMAL',
        alertTriggered: false,
        clinicalInterpretation: 'Invalid blood pressure input.',
      };
    }

    const index = parseFloat((heartRate / bpSystolic).toFixed(2));

    if (index > 0.9) {
      return {
        shockIndex: index,
        status: 'HIGH_RISK_SHOCK',
        alertTriggered: true,
        clinicalInterpretation: `CRITICAL ALERT: Shock Index is ${index} (> 0.9). High risk of occult hemorrhage, massive trauma bleeding, or cardiogenic collapse! Reserve Trauma Bay & Mass Transfusion Protocol immediately.`,
      };
    } else if (index >= 0.7) {
      return {
        shockIndex: index,
        status: 'ELEVATED',
        alertTriggered: false,
        clinicalInterpretation: `Elevated Shock Index (${index}). Patient requires close continuous hemodynamic monitoring.`,
      };
    } else {
      return {
        shockIndex: index,
        status: 'NORMAL',
        alertTriggered: false,
        clinicalInterpretation: `Normal Shock Index (${index}). Hemodynamically stable.`,
      };
    }
  }

  /**
   * Formats raw triage input into structured IMIST-AMBO Clinical Handover Standard
   */
  public generateImistAmboHandover(triage: PatientTriage): ImistAmboHandover {
    const shockResult = this.calculateShockIndex(triage.heartRate, triage.bpSystolic);

    return {
      identification: `Patient: ${triage.patientName || 'Unidentified'} (${triage.patientAge || 'Unknown'}y, ${triage.patientGender || 'Unknown'})`,
      mechanismOrMedical: triage.chiefComplaint || 'Emergency Dispatch Call',
      injuriesOrInformation: triage.ekgRhythm || 'Cardiac Telemetry Monitored',
      signsAndVitals: {
        heartRate: triage.heartRate,
        bpSystolic: triage.bpSystolic,
        bpDiastolic: triage.bpDiastolic,
        spo2: triage.spo2,
        respiratoryRate: triage.respiratoryRate,
        shockIndex: shockResult.shockIndex,
        esiLevel: triage.esiLevel,
      },
      treatmentGiven: triage.notes || 'Supplemental oxygen & IV access established in transit',
      ageAndGender: `${triage.patientAge || 'Unknown'} / ${triage.patientGender || 'Unknown'}`,
      medicalHistoryAndAllergies: 'NKDA (No Known Drug Allergies) | Cardiac History',
      bedRequirement: triage.esiLevel === 'RED_LEVEL_1' ? 'Resuscitation / Trauma Bay 1' : 'Acute ER Bed',
      otherInformation: `Recorded at ${triage.recordedAt || new Date().toLocaleTimeString()} by 108 EMS Paramedics`,
      handoverTimestamp: new Date().toISOString(),
    };
  }
}

export const clinicalEngine = new ClinicalEngine();
