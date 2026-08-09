import { Router, Request, Response } from 'express';
import { DispatchService } from '../services/dispatchService.js';
import { aiAgentService } from '../services/aiAgentService.js';
import { clinicalEngine } from '../services/clinicalEngine.js';
import { authService } from '../services/authService.js';
import { aiDocumentVerifier } from '../services/aiDocumentVerifier.js';
import { PatientTriage, Incident } from '../types.js';

export function createApiRouter(dispatchService: DispatchService): Router {
  const router = Router();

  // --------------------------------------------------------------------------
  // AUTHENTICATION & AI DOCUMENT VERIFICATION ENDPOINTS
  // --------------------------------------------------------------------------
  router.post('/auth/register', async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.status(201).json(result);
  });

  router.post('/auth/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;
    const result = await authService.login(username || '', password || '');
    if (!result.success) {
      return res.status(401).json(result);
    }
    res.json(result);
  });

  router.post('/auth/verify-biometric-face', (req: Request, res: Response) => {
    const { userId, faceVector } = req.body;
    const result = authService.verifyBiometricFaceMatch(userId, faceVector || []);
    if (!result.success) {
      return res.status(401).json(result);
    }
    res.json(result);
  });

  router.post('/auth/verify-documents-ai', async (req: Request, res: Response) => {
    const { role, document } = req.body;
    const result = await aiDocumentVerifier.verifyDocumentStrict(role || 'HOSPITAL_ADMIN', document || {});
    res.json({ success: true, data: result });
  });

  router.get('/auth/me', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '') : (req.query.token as string);
    const user = token ? authService.getUserByToken(token) : undefined;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }
    res.json({ success: true, user });
  });

  // --------------------------------------------------------------------------
  // AMBULANCES ENDPOINTS
  // --------------------------------------------------------------------------
  router.get('/ambulances', (req: Request, res: Response) => {
    res.json({ success: true, data: dispatchService.getAllAmbulances() });
  });

  router.post('/ambulances/:id/gps', (req: Request, res: Response) => {
    const { id } = req.params;
    const { lat, lng, bearing, speed } = req.body;
    dispatchService.updateAmbulanceGps({ ambulanceId: id, lat, lng, bearing, speed });
    res.json({ success: true, message: 'GPS ping recorded.' });
  });

  // Handoff & Auto-Reroute trigger endpoint
  router.post('/ambulances/:id/complete-handoff', async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await dispatchService.completeHospitalHandoffAndReroute(id);
    res.json(result);
  });

  // --------------------------------------------------------------------------
  // INCIDENTS ENDPOINTS
  // --------------------------------------------------------------------------
  router.get('/incidents', (req: Request, res: Response) => {
    res.json({ success: true, data: dispatchService.getAllIncidents() });
  });

  router.post('/incidents', async (req: Request, res: Response) => {
    const body = req.body;
    const newIncident: Incident = {
      id: body.id || `inc-${Date.now()}`,
      callerName: body.callerName || '108 Public Caller',
      callerPhone: body.callerPhone || '+91-9810010811',
      incidentType: body.incidentType || 'MEDICAL_EMERGENCY',
      priority: body.priority || 'CRITICAL_P1',
      status: 'PENDING',
      location: body.location || { lat: 28.56, lng: 77.21 },
      addressText: body.addressText || 'Requested Emergency Location, India',
      description: body.description || 'Emergency 108 dispatch call',
      reportedAt: new Date().toISOString(),
    };

    const created = dispatchService.createIncident(newIncident);

    // ZERO-TOUCH AUTONOMOUS AI DISPATCH & PRECAUTION GENERATION
    let aiRecommendation: any = null;
    let dispatchResult: any = null;
    let precautions: any = null;

    try {
      const availableAmbulances = dispatchService.getAllAmbulances().filter(a => a.status === 'AVAILABLE');
      const hospitals = dispatchService.getAllHospitals();

      const [rec, prec] = await Promise.all([
        availableAmbulances.length > 0
          ? aiAgentService.evaluateAndAutoDispatch(created, availableAmbulances, hospitals)
          : Promise.resolve(null),
        aiAgentService.generatePrehospitalPrecautions(created.incidentType, created.description)
      ]);

      aiRecommendation = rec;
      precautions = prec;

      if (aiRecommendation) {
        dispatchResult = await dispatchService.dispatchAmbulance(
          created.id,
          aiRecommendation.recommendedAmbulanceId
        );
      }
    } catch (err: any) {
      console.warn('[Auto AI SOS Dispatch Warning]:', err);
    }

    res.status(201).json({
      success: true,
      data: created,
      autoDispatched: Boolean(dispatchResult?.success),
      aiRecommendation,
      dispatchResult,
      precautions,
      message: dispatchResult?.success
        ? `AUTONOMOUS AI SOS ACCEPTED: Assigned ${aiRecommendation?.recommendedAmbulanceCallSign} to ${created.addressText}`
        : 'Emergency incident created and queued for AI dispatch.',
    });
  });

  router.post('/incidents/:id/dispatch', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { preferredAmbulanceId } = req.body;
    const result = await dispatchService.dispatchAmbulance(id, preferredAmbulanceId);
    if (!result.success) {
      return res.status(409).json(result);
    }
    res.json(result);
  });

  // --------------------------------------------------------------------------
  // CLINICAL ENGINE ENDPOINTS
  // --------------------------------------------------------------------------
  router.post('/clinical/shock-index', (req: Request, res: Response) => {
    const { heartRate, bpSystolic } = req.body;
    const result = clinicalEngine.calculateShockIndex(heartRate || 0, bpSystolic || 0);
    res.json({ success: true, data: result });
  });

  router.post('/clinical/imist-ambo', (req: Request, res: Response) => {
    const triage: PatientTriage = req.body;
    const result = clinicalEngine.generateImistAmboHandover(triage);
    res.json({ success: true, data: result });
  });

  // --------------------------------------------------------------------------
  // GOOGLE GEMINI AI AGENT ENDPOINTS
  // --------------------------------------------------------------------------

  // AI Single Autonomous Ambulance Assignment Endpoint
  router.post('/ai/auto-dispatch', async (req: Request, res: Response) => {
    try {
      const { incidentId } = req.body;
      const incidents = dispatchService.getAllIncidents();
      const incident = incidents.find(i => i.id === incidentId) || incidents.find(i => i.status === 'PENDING');

      if (!incident) {
        return res.status(404).json({ success: false, message: 'No pending incidents found.' });
      }

      let availableAmbulances = dispatchService.getAllAmbulances().filter(a => a.status === 'AVAILABLE');
      if (availableAmbulances.length === 0) {
        availableAmbulances = dispatchService.getAllAmbulances();
      }
      const hospitals = dispatchService.getAllHospitals();

      if (availableAmbulances.length === 0) {
        return res.status(400).json({ success: false, message: 'AI Dispatch Engine: No 108 ambulances in sector.' });
      }

      const aiRecommendation = await aiAgentService.evaluateAndAutoDispatch(incident, availableAmbulances, hospitals);

      const dispatchResult = await dispatchService.dispatchAmbulance(
        incident.id,
        aiRecommendation.recommendedAmbulanceId
      );

      res.json({
        success: dispatchResult.success,
        aiRecommendation,
        dispatchResult,
        message: `AI AGENT DISPATCH: Assigned ${aiRecommendation.recommendedAmbulanceCallSign} to ${incident.addressText}`,
      });
    } catch (err: any) {
      console.error('[AI Auto-Dispatch Route Error]:', err);
      res.status(500).json({ success: false, message: err.message || 'AI Dispatch failed.' });
    }
  });

  // BATCH AI DISPATCH ALL PENDING INCIDENTS ENDPOINT (Triggered via Top Nav Bar)
  router.post('/ai/auto-dispatch-all', async (req: Request, res: Response) => {
    try {
      const pendingIncidents = dispatchService.getAllIncidents().filter(i => i.status === 'PENDING');

      if (pendingIncidents.length === 0) {
        return res.json({
          success: true,
          dispatchedCount: 0,
          results: [],
          message: 'No pending emergency calls in queue.',
        });
      }

      const results = [];

      for (const incident of pendingIncidents) {
        const availableAmbulances = dispatchService.getAllAmbulances().filter(a => a.status === 'AVAILABLE');
        const hospitals = dispatchService.getAllHospitals();

        if (availableAmbulances.length === 0) {
          results.push({
            incidentId: incident.id,
            success: false,
            message: 'No available 108 units remaining for this request.',
          });
          continue;
        }

        const aiRec = await aiAgentService.evaluateAndAutoDispatch(incident, availableAmbulances, hospitals);
        const dispatchRes = await dispatchService.dispatchAmbulance(incident.id, aiRec.recommendedAmbulanceId);

        results.push({
          incidentId: incident.id,
          success: dispatchRes.success,
          aiRecommendation: aiRec,
          dispatchResult: dispatchRes,
        });
      }

      const successfulDispatches = results.filter(r => r.success).length;

      res.json({
        success: true,
        dispatchedCount: successfulDispatches,
        results,
        message: `BATCH AI DISPATCH: Successfully assigned 108 ambulances to ${successfulDispatches} emergency incidents!`,
      });
    } catch (err: any) {
      console.error('[AI Auto-Dispatch-All Error]:', err);
      res.status(500).json({ success: false, message: err.message || 'Batch AI Dispatch failed.' });
    }
  });

  router.post('/ai/precautions', async (req: Request, res: Response) => {
    try {
      const { incidentType, description, vitals } = req.body;
      const precautions = await aiAgentService.generatePrehospitalPrecautions(
        incidentType || 'CARDIAC_ARREST',
        description || 'Emergency Medical Call',
        vitals
      );
      res.json({ success: true, data: precautions });
    } catch (err: any) {
      console.error('[AI Precautions Error]:', err);
      res.status(500).json({ success: false, message: 'Failed to generate AI precautions.' });
    }
  });

  // --------------------------------------------------------------------------
  // HOSPITALS & TRIAGE ENDPOINTS
  // --------------------------------------------------------------------------
  router.get('/hospitals', (req: Request, res: Response) => {
    res.json({ success: true, data: dispatchService.getAllHospitals() });
  });

  router.patch('/hospitals/:id/bays', (req: Request, res: Response) => {
    const { id } = req.params;
    const { traumaBaysAvailable } = req.body;
    const updated = dispatchService.updateHospitalBays(id, traumaBaysAvailable);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }
    res.json({ success: true, data: updated });
  });

  router.get('/triage', (req: Request, res: Response) => {
    res.json({ success: true, data: dispatchService.getAllTriages() });
  });

  router.post('/triage', (req: Request, res: Response) => {
    const saved = dispatchService.saveTriageRecord(req.body);
    res.status(201).json({ success: true, data: saved });
  });

  router.post('/triage/sync', (req: Request, res: Response) => {
    const { items, clientTxId } = req.body as { items: PatientTriage[]; clientTxId: string };
    console.log(`[Triage Sync API] Received offline batch sync. ClientTxID: ${clientTxId}, Records: ${items?.length || 0}`);
    if (Array.isArray(items)) {
      items.forEach(item => dispatchService.saveTriageRecord(item));
    }
    res.json({
      success: true,
      clientTxId,
      recordsSynced: items?.length || 0,
      syncedAt: new Date().toISOString(),
      message: 'Offline 108 paramedic triage batch synchronized successfully.',
    });
  });

  return router;
}
