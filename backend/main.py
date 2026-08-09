import os
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Body
from fastapi.middleware.cors import CORSMiddleware
from api.simulation import router as audio_router
from services.ws_manager import ws_manager
from services.nats_service import nats_subscriber
from services.osrm_service import osrm_engine

app = FastAPI(
    title="Centralized Ambulance Dispatch, NATS JetStream & Telemetry Engine",
    description="Zero-Lag FastAPI Telemetry Service with OSRM Routing & 60Hz WebSockets",
    version="2.0.0"
)

# Configure CORS Middleware
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(audio_router)

@app.on_event("startup")
async def startup_event():
    print("[FastAPI Startup] Initializing NATS JetStream Telemetry Subscriber...")
    asyncio.create_task(nats_subscriber.start())

@app.on_event("shutdown")
async def shutdown_event():
    print("[FastAPI Shutdown] Closing NATS connection...")
    await nats_subscriber.close()

# --------------------------------------------------------------------------
# ZERO-LAG TELEMETRY WEBSOCKET BROADCASTER ENDPOINT
# --------------------------------------------------------------------------
@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    """
    Persistent WebSocket endpoint streaming real-time vehicle coordinates & OSRM ETA
    directly to 60Hz Lerp Leaflet dashboard screens.
    """
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep-alive ping/pong receiver loop
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

# Direct HTTP/REST Ingestion Endpoint (Ingests coordinates & broadcasts to WS subscribers)
@app.post("/api/telemetry/publish")
async def publish_telemetry(payload: dict = Body(...)):
    ambulance_id = payload.get("ambulance_id") or payload.get("callSign") or "108-ALS-DEL-01"
    lat = float(payload.get("lat", 28.56))
    lng = float(payload.get("lng", 77.215))
    dest_lat = float(payload.get("dest_lat", 28.5672))
    dest_lng = float(payload.get("dest_lng", 77.21))

    # Calculate real-time duration in seconds via local OSRM
    route_info = await osrm_engine.calculate_route_and_eta(lat, lng, dest_lat, dest_lng)

    telemetry_payload = {
        "ambulance_id": ambulance_id,
        "lat": lat,
        "lng": lng,
        "dest_lat": dest_lat,
        "dest_lng": dest_lng,
        "eta_seconds": route_info["eta_seconds"],
        "distance_meters": route_info["distance_meters"],
        "route_geometry": route_info["route_geometry"],
        "speed_kmh": payload.get("speed", 45),
        "timestamp": payload.get("timestamp")
    }

    await ws_manager.broadcast_json(telemetry_payload)
    return {"success": True, "telemetry": telemetry_payload}

@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "FastAPI NATS JetStream & 60Hz Telemetry Broadcaster",
        "natsConnected": nats_subscriber.is_connected,
        "geminiApiKeyConfigured": bool(os.getenv("GEMINI_API_KEY")),
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("FASTAPI_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
