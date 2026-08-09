import os
import json
import asyncio
from services.osrm_service import osrm_engine
from services.ws_manager import ws_manager

try:
    import nats
    from nats.js import JetStreamContext
    NATS_INSTALLED = True
except ImportError:
    NATS_INSTALLED = False

class NatsTelemetrySubscriber:
    """
    NATS.io JetStream Telemetry Subscriber
    Listens to 'ambulance.*.telemetry' subjects, processes telemetry events,
    passes coordinates to OSRM engine for ETA computation, and broadcasts via WebSockets.
    Gracefully falls back to Direct WebSockets mode if nats-py is not installed locally.
    """
    def __init__(self):
        self.nats_url = os.getenv("NATS_URL", "nats://127.0.0.1:4222")
        self.nc = None
        self.js = None
        self.is_connected = False

    async def start(self):
        if not NATS_INSTALLED:
            print("[NATS Warning] 'nats-py' module is not installed locally. Running in Direct WebSockets & HTTP stream mode.")
            return

        try:
            self.nc = await nats.connect(self.nats_url, connect_timeout=1, reconnect_time_wait=2)
            self.js = self.nc.jetstream()
            self.is_connected = True
            print(f"[NATS JetStream] Successfully connected to NATS broker at {self.nats_url}")

            # Ensure Stream is created for offline-first log synchronization
            try:
                await self.js.add_stream(
                    name="AMBULANCE_TELEMETRY",
                    subjects=["ambulance.*.telemetry"]
                )
                print("[NATS JetStream] Telemetry stream 'AMBULANCE_TELEMETRY' initialized.")
            except Exception:
                pass  # Stream already exists

            # Subscribe asynchronously to ambulance.*.telemetry
            await self.nc.subscribe("ambulance.*.telemetry", cb=self.on_telemetry_message)
            print("[NATS JetStream] Subscribed to subject 'ambulance.*.telemetry'")

        except Exception as e:
            print(f"[NATS Warning] Could not connect to NATS broker ({str(e)}). Running in direct WebSockets fallback mode.")

    async def on_telemetry_message(self, msg):
        try:
            payload_str = msg.data.decode("utf-8")
            data = json.loads(payload_str)

            ambulance_id = data.get("ambulance_id") or data.get("callSign") or "108-ALS-DEL-01"
            lat = float(data.get("lat", 28.56))
            lng = float(data.get("lng", 77.215))
            dest_lat = float(data.get("dest_lat", 28.5672))
            dest_lng = float(data.get("dest_lng", 77.21))

            # Query OSRM Engine to compute duration in seconds
            route_info = await osrm_engine.calculate_route_and_eta(lat, lng, dest_lat, dest_lng)

            unified_telemetry = {
                "ambulance_id": ambulance_id,
                "lat": lat,
                "lng": lng,
                "dest_lat": dest_lat,
                "dest_lng": dest_lng,
                "eta_seconds": route_info["eta_seconds"],
                "distance_meters": route_info["distance_meters"],
                "route_geometry": route_info["route_geometry"],
                "speed_kmh": data.get("speed", 45),
                "timestamp": data.get("timestamp") or data.get("time")
            }

            # Broadcast unified payload to active hospital dashboard screens
            await ws_manager.broadcast_json(unified_telemetry)

        except Exception as e:
            print(f"[NATS Telemetry Error]: {str(e)}")

    async def close(self):
        if self.nc:
            try:
                await self.nc.close()
            except Exception:
                pass

nats_subscriber = NatsTelemetrySubscriber()
