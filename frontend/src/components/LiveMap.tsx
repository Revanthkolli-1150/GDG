import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Ambulance, Hospital, Incident } from '../types';
import { subscribeGpsStream } from '../services/socket';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Create Custom Glowing Leaflet HTML DivIcons
function createAmbulanceIcon(callSign: string, status: string) {
  const isAvailable = status === 'AVAILABLE';
  const color = isAvailable ? '#10b981' : '#f59e0b';
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `
      <div style="
        background: #0f172a;
        border: 2px solid ${color};
        color: white;
        padding: 4px 8px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: bold;
        box-shadow: 0 0 12px ${color};
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
      ">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; display: inline-block;"></span>
        <span>🚑 ${callSign}</span>
      </div>
    `,
    iconSize: [110, 30],
    iconAnchor: [55, 15],
  });
}

function createIncidentIcon(type: string, priority: string) {
  const isP1 = priority === 'CRITICAL_P1';
  const color = isP1 ? '#ef4444' : '#f59e0b';
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `
      <div style="
        background: #1e1b4b;
        border: 2px solid ${color};
        color: white;
        padding: 4px 8px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: bold;
        box-shadow: 0 0 15px ${color};
        animation: pulse 1.5s infinite;
        white-space: nowrap;
      ">
        🚨 ${type} (${priority.split('_')[1]})
      </div>
    `,
    iconSize: [130, 30],
    iconAnchor: [65, 15],
  });
}

function createHospitalIcon(name: string, bays: number) {
  const color = bays > 0 ? '#06b6d4' : '#f43f5e';
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `
      <div style="
        background: #092e20;
        border: 2px solid ${color};
        color: white;
        padding: 4px 8px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: bold;
        box-shadow: 0 0 12px ${color};
        white-space: nowrap;
      ">
        🏥 ${name.substring(0, 20)}... (${bays} Bays)
      </div>
    `,
    iconSize: [150, 30],
    iconAnchor: [75, 15],
  });
}

interface MapProps {
  ambulances: Ambulance[];
  incidents: Incident[];
  hospitals: Hospital[];
  center?: [number, number];
  zoom?: number;
}

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export const LiveMap: React.FC<MapProps> = ({
  ambulances,
  incidents,
  hospitals,
  center = [28.56, 77.215], // Default Map Center: Delhi NCR Corridors
  zoom = 12,
}) => {
  // Lerp interpolated position map for smooth 60 FPS ambulance marker movement
  const [interpolatedPositions, setInterpolatedPositions] = React.useState<Record<string, { lat: number; lng: number }>>({});
  const targetPositionsRef = React.useRef<Record<string, { lat: number; lng: number }>>({});

  // Sync incoming target positions & subscribe to live WebSocket GPS stream
  React.useEffect(() => {
    ambulances.forEach(amb => {
      targetPositionsRef.current[amb.id] = { lat: amb.location.lat, lng: amb.location.lng };
    });

    const unsubscribe = subscribeGpsStream(telemetry => {
      if (telemetry && telemetry.ambulanceId && telemetry.lat && telemetry.lng) {
        targetPositionsRef.current[telemetry.ambulanceId] = { lat: telemetry.lat, lng: telemetry.lng };
      }
    });

    return () => {
      unsubscribe();
    };
  }, [ambulances]);

  // 60Hz requestAnimationFrame Linear Interpolation (Lerp) Loop
  React.useEffect(() => {
    let animFrame: number;
    const lerpFactor = 0.08;

    const animateLerp = () => {
      setInterpolatedPositions(prev => {
        const next: Record<string, { lat: number; lng: number }> = {};
        let updated = false;

        Object.keys(targetPositionsRef.current).forEach(id => {
          const target = targetPositionsRef.current[id];
          const curr = prev[id] || target;
          const dLat = target.lat - curr.lat;
          const dLng = target.lng - curr.lng;

          if (Math.abs(dLat) < 0.000001 && Math.abs(dLng) < 0.000001) {
            next[id] = target;
          } else {
            updated = true;
            next[id] = {
              lat: curr.lat + dLat * lerpFactor,
              lng: curr.lng + dLng * lerpFactor,
            };
          }
        });

        return updated ? next : prev;
      });

      animFrame = requestAnimationFrame(animateLerp);
    };

    animFrame = requestAnimationFrame(animateLerp);
    return () => cancelAnimationFrame(animFrame);
  }, []);
  return (
    <div className="w-full h-full min-h-[420px] rounded-xl overflow-hidden shadow-2xl border border-slate-800 relative z-0">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%', minHeight: '420px', background: '#0b0f19' }}
      >
        <MapRecenter center={center} />
        {/* Dark CartoDB Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Indian Hospitals */}
        {hospitals.map(hosp => (
          <Marker
            key={hosp.id}
            position={[hosp.location.lat, hosp.location.lng]}
            icon={createHospitalIcon(hosp.name, hosp.traumaBaysAvailable)}
          >
            <Popup>
              <div className="p-1 text-slate-900">
                <h3 className="font-bold text-sm text-cyan-900">{hosp.name}</h3>
                <p className="text-xs">{hosp.address}</p>
                <div className="mt-1 text-xs font-semibold">
                  Trauma Bays: {hosp.traumaBaysAvailable} / {hosp.traumaBaysTotal}
                </div>
                <div className="text-xs font-semibold">ICU Beds: {hosp.icuBedsAvailable}</div>
                <div className="text-xs text-emerald-600 font-bold mt-1">Status: {hosp.status}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Indian Emergency Incidents */}
        {incidents
          .filter(inc => inc.status !== 'HANDOFF_COMPLETE')
          .map(inc => (
            <Marker
              key={inc.id}
              position={[inc.location.lat, inc.location.lng]}
              icon={createIncidentIcon(inc.incidentType, inc.priority)}
            >
              <Popup>
                <div className="p-1 text-slate-900">
                  <h3 className="font-bold text-sm text-rose-700">{inc.incidentType}</h3>
                  <p className="text-xs font-semibold">{inc.addressText}</p>
                  <p className="text-xs italic text-slate-600">{inc.description}</p>
                  <div className="mt-1 text-xs font-bold text-rose-800">
                    Status: {inc.status} | Priority: {inc.priority}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* 108 / 112 Fleet Ambulances (60Hz Lerp Smoothed Position) */}
        {ambulances.map(amb => {
          const pos = interpolatedPositions[amb.id] || amb.location;
          return (
            <Marker
              key={amb.id}
              position={[pos.lat, pos.lng]}
              icon={createAmbulanceIcon(amb.callSign, amb.status)}
            >
            <Popup>
              <div className="p-1 text-slate-900">
                <h3 className="font-bold text-sm text-emerald-800">Unit: {amb.callSign}</h3>
                <p className="text-xs">Plate: {amb.vehiclePlate}</p>
                <p className="text-xs font-semibold text-amber-700">Status: {amb.status}</p>
                <p className="text-xs text-slate-600">Speed: {amb.speed} km/h</p>
              </div>
            </Popup>
          </Marker>
        );
      })}

        {/* Dispatch Vectors */}
        {ambulances.map(amb => {
          if (!amb.assignedIncidentId) return null;
          const inc = incidents.find(i => i.id === amb.assignedIncidentId);
          if (!inc) return null;

          const polylineCoords: [number, number][] = [
            [amb.location.lat, amb.location.lng],
            [inc.location.lat, inc.location.lng],
          ];

          return (
            <Polyline
              key={`route-${amb.id}`}
              positions={polylineCoords}
              pathOptions={{ color: '#ef4444', weight: 3, dashArray: '8, 8' }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
};
