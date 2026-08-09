import os
import math
import httpx
from typing import Dict, Any, List

class OSRMRoutingEngine:
    """
    Local Self-Hosted OSRM Engine Client
    Calculates exact real-time driving routes, distances, and duration in seconds (eta_seconds)
    over local OpenStreetMap data without REST polling overhead.
    """
    def __init__(self):
        self.osrm_url = os.getenv("OSRM_URL", "http://127.0.0.1:5001")

    async def calculate_route_and_eta(
        self, lat: float, lng: float, dest_lat: float, dest_lng: float
    ) -> Dict[str, Any]:
        """
        Passes (lat, lng) and (dest_lat, dest_lng) to OSRM engine.
        Returns eta_seconds, distance_meters, and route_geometry.
        """
        url = f"{self.osrm_url}/route/v1/driving/{lng},{lat};{dest_lng},{dest_lat}?overview=full&geometries=geojson"
        
        try:
            async with httpx.AsyncClient(timeout=1.5) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    if data.get("routes"):
                        route = data["routes"][0]
                        duration_seconds = int(route.get("duration", 0))
                        distance_meters = round(route.get("distance", 0), 1)
                        geometry = route.get("geometry", {}).get("coordinates", [])
                        
                        # Convert [lng, lat] OSRM format to [lat, lng]
                        formatted_geometry = [[pt[1], pt[0]] for pt in geometry]
                        
                        return {
                            "eta_seconds": duration_seconds,
                            "distance_meters": distance_meters,
                            "route_geometry": formatted_geometry,
                            "source": "LOCAL_OSRM_ENGINE"
                        }
        except Exception as e:
            # Fallback estimation if OSRM server container is initializing
            pass

        # High-Speed Fallback Route & Duration Calculation (Haversine estimation @ 45 km/h)
        return self._calculate_fallback_eta(lat, lng, dest_lat, dest_lng)

    def _calculate_fallback_eta(
        self, lat: float, lng: float, dest_lat: float, dest_lng: float
    ) -> Dict[str, Any]:
        R = 6371000  # Earth radius in meters
        dlat = math.radians(dest_lat - lat)
        dlng = math.radians(dest_lng - lng)
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(math.radians(lat)) * math.cos(math.radians(dest_lat)) * math.sin(dlng / 2) ** 2
        )
        c = 2 * Math.atan2(math.sqrt(a), math.sqrt(1 - a)) if hasattr(math, 'atan2') else 2 * math.asin(math.sqrt(a))
        distance_meters = R * c

        # Estimate duration in seconds at 45 km/h average speed (12.5 m/s)
        speed_mps = 12.5
        eta_seconds = int(distance_meters / speed_mps)

        # Generate linear waypoints
        waypoints = [
            [lat, lng],
            [(lat + dest_lat) / 2, (lng + dest_lng) / 2],
            [dest_lat, dest_lng]
        ]

        return {
            "eta_seconds": max(15, eta_seconds),
            "distance_meters": round(distance_meters, 1),
            "route_geometry": waypoints,
            "source": "FALLBACK_KINEMATIC_ENGINE"
        }

osrm_engine = OSRMRoutingEngine()
