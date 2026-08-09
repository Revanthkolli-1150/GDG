from typing import List, Dict, Any
from fastapi import WebSocket

class WebSocketManager:
    """
    High-Throughput Persistent WebSocket Manager
    Broadcasts zero-lag unified telemetry JSON objects to active hospital ER and dispatch dashboards.
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[WebSocket Manager] Active telemetry subscriber connected. Total subscribers: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"[WebSocket Manager] Telemetry subscriber disconnected. Remaining: {len(self.active_connections)}")

    async def broadcast_json(self, data: Dict[str, Any]):
        if not self.active_connections:
            return
        
        stale_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception:
                stale_connections.append(connection)
        
        for stale in stale_connections:
            self.disconnect(stale)

ws_manager = WebSocketManager()
