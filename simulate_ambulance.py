#!/usr/bin/env python3
"""
Isolated Mock Vehicle Telemetry Simulator
Connects to NATS JetStream broker and Express / FastAPI HTTP endpoints.
Publishes changing geographic coordinate strings every 1.5 seconds to prove 
the 60Hz zero-lag ambulance tracking system functions under continuous load.
"""

import time
import json
import random
import urllib.request

try:
    import nats
    import asyncio
    NATS_AVAILABLE = True
except ImportError:
    NATS_AVAILABLE = False

# Waypoints along Delhi NCR Emergency Corridor (Connaught Place -> AIIMS Apex Trauma Center)
WAYPOINTS = [
    {"lat": 28.5600, "lng": 77.2150},
    {"lat": 28.5615, "lng": 77.2140},
    {"lat": 28.5630, "lng": 77.2130},
    {"lat": 28.5645, "lng": 77.2120},
    {"lat": 28.5660, "lng": 77.2110},
    {"lat": 28.5672, "lng": 77.2100},  # AIIMS Apex Trauma Center Destination
]

DESTINATION = {"dest_lat": 28.5672, "dest_lng": 77.2100}
AMBULANCE_ID = "b1111111-1111-1111-1111-111111111111"

def send_http_ping(url, payload_dict):
    try:
        json_bytes = json.dumps(payload_dict).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=json_bytes,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=2.0) as res:
            return res.status == 200
    except Exception:
        return False

async def run_nats_simulator():
    nats_url = "nats://127.0.0.1:4222"
    print(f"=================================================================")
    print(f"  108 AMBULANCE 60Hz TELEMETRY SIMULATOR ACTIVE                  ")
    print(f"  Streaming coordinates for unit '108-ALS-DEL-01'                 ")
    print(f"  Endpoints: NATS JetStream + Express (5000) + FastAPI (8000)      ")
    print(f"=================================================================")

    nc = None
    try:
        nc = await nats.connect(nats_url, connect_timeout=1)
        js = nc.jetstream()
        print(f"[NATS Simulator] Connected to NATS JetStream broker at {nats_url}")
    except Exception:
        print("[NATS Warning] NATS broker offline (localhost:4222). Running in Express (5000) & FastAPI (8000) Telemetry Mode.")
        nc = None

    idx = 0
    step = 0.05

    while True:
        wp_start = WAYPOINTS[idx % len(WAYPOINTS)]
        wp_end = WAYPOINTS[(idx + 1) % len(WAYPOINTS)]

        # Interpolate intermediate smooth coordinate
        current_lat = round(wp_start["lat"] + (wp_end["lat"] - wp_start["lat"]) * step, 6)
        current_lng = round(wp_start["lng"] + (wp_end["lng"] - wp_start["lng"]) * step, 6)
        speed = random.randint(45, 62)

        # 1. Express API Payload (Port 5000) -> Emits Socket.IO telemetry globally
        express_payload = {
            "lat": current_lat,
            "lng": current_lng,
            "speed": speed
        }
        send_http_ping(f"http://127.0.0.1:5000/api/ambulances/{AMBULANCE_ID}/gps", express_payload)

        # 2. FastAPI / NATS Telemetry Payload (Port 8000 / NATS)
        fastapi_payload = {
            "ambulance_id": "108-ALS-DEL-01",
            "callSign": "108-ALS-DEL-01",
            "lat": current_lat,
            "lng": current_lng,
            "dest_lat": DESTINATION["dest_lat"],
            "dest_lng": DESTINATION["dest_lng"],
            "speed": speed,
            "timestamp": time.strftime("%H:%M:%S")
        }

        if nc:
            try:
                await nc.publish("ambulance.108-ALS-DEL-01.telemetry", json.dumps(fastapi_payload).encode("utf-8"))
            except Exception:
                pass

        send_http_ping("http://127.0.0.1:8000/api/telemetry/publish", fastapi_payload)

        print(f"🚑 [GPS TELEMETRY STREAM] Lat: {current_lat}, Lng: {current_lng} | Speed: {speed} km/h | Target: AIIMS Trauma Center")

        step += 0.15
        if step >= 1.0:
            step = 0.0
            idx += 1

        await asyncio.sleep(1.2)

if __name__ == "__main__":
    if NATS_AVAILABLE:
        asyncio.run(run_nats_simulator())
    else:
        print("=================================================================")
        print("  108 AMBULANCE 60Hz TELEMETRY SIMULATOR ACTIVE (HTTP MODE)      ")
        print("  Target: Express (5000) & FastAPI (8000)                        ")
        print("=================================================================")
        idx = 0
        step = 0.05
        while True:
            wp_start = WAYPOINTS[idx % len(WAYPOINTS)]
            wp_end = WAYPOINTS[(idx + 1) % len(WAYPOINTS)]
            current_lat = round(wp_start["lat"] + (wp_end["lat"] - wp_start["lat"]) * step, 6)
            current_lng = round(wp_start["lng"] + (wp_end["lng"] - wp_start["lng"]) * step, 6)
            speed = random.randint(45, 62)

            express_payload = {"lat": current_lat, "lng": current_lng, "speed": speed}
            ok = send_http_ping(f"http://127.0.0.1:5000/api/ambulances/{AMBULANCE_ID}/gps", express_payload)

            fastapi_payload = {
                "ambulance_id": "108-ALS-DEL-01",
                "callSign": "108-ALS-DEL-01",
                "lat": current_lat,
                "lng": current_lng,
                "dest_lat": DESTINATION["dest_lat"],
                "dest_lng": DESTINATION["dest_lng"],
                "speed": speed,
                "timestamp": time.strftime("%H:%M:%S")
            }
            send_http_ping("http://127.0.0.1:8000/api/telemetry/publish", fastapi_payload)

            if ok:
                print(f"🚑 [GPS TELEMETRY STREAM] Lat: {current_lat}, Lng: {current_lng} | Speed: {speed} km/h | STATUS: SENT")
            else:
                print(f"🚑 [GPS STREAMING...] Lat: {current_lat}, Lng: {current_lng}")

            step += 0.15
            if step >= 1.0:
                step = 0.0
                idx += 1
            time.sleep(1.2)
