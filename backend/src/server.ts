import express from 'express';
import http from 'http';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { EmergencySocketServer } from './services/socketServer.js';
import { DispatchService } from './services/dispatchService.js';
import { createApiRouter } from './routes/apiRoutes.js';

// Load .env variables safely
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  }
} catch (e) {
  console.warn('Could not load .env file manually:', e);
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// Initialize Socket.io Emergency Telemetry Gateway
const socketServer = new EmergencySocketServer(server);

// Initialize Dispatch Engine with Spatial PostGIS & Redlock services
const dispatchService = new DispatchService(socketServer);

// Register REST API Routes
app.use('/api', createApiRouter(dispatchService));

app.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'Centralized Ambulance Dispatch & AI Telemetry Engine',
    geminiAiActive: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

server.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(` EMERGENCY DISPATCH & AI TELEMETRY ECOSYSTEM ACTIVE`);
  console.log(` REST API: http://localhost:${PORT}/api`);
  console.log(` WebSocket Gateway: ws://localhost:${PORT}`);
  console.log(` Google Gemini AI Agent & Redlock Guard Initialized`);
  console.log(`================================================================`);
});
