import React, { useState, useEffect } from 'react';
import { Ambulance } from '../types';
import { Play, Pause, Zap, CheckCircle2, RotateCw } from 'lucide-react';

interface SimulatorControlsProps {
  ambulances: Ambulance[];
  onUpdateAmbulanceGps: (ambulanceId: string, lat: number, lng: number) => void;
  onTestRedlock: () => void;
  onTestAutoReroute: () => void;
}

export const SimulatorControls: React.FC<SimulatorControlsProps> = ({
  ambulances,
  onUpdateAmbulanceGps,
  onTestRedlock,
  onTestAutoReroute,
}) => {
  const [isSimulatingGps, setIsSimulatingGps] = useState<boolean>(true);

  // Periodic GPS Motion Simulator
  useEffect(() => {
    if (!isSimulatingGps) return;

    const interval = setInterval(() => {
      ambulances.forEach(amb => {
        // Increment coordinates slightly to simulate vehicle motion
        const deltaLat = (Math.random() - 0.48) * 0.0015;
        const deltaLng = (Math.random() - 0.48) * 0.0015;
        onUpdateAmbulanceGps(amb.id, amb.location.lat + deltaLat, amb.location.lng + deltaLng);
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [isSimulatingGps, ambulances, onUpdateAmbulanceGps]);

  return (
    <div className="bg-slate-900 border-t border-slate-800 p-3 text-white sticky bottom-0 z-40 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 font-mono text-cyan-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          <span className="font-bold">SYSTEM SIMULATOR BENCH:</span>
        </div>

        <div className="flex items-center space-x-3">
          {/* GPS Stream Toggle */}
          <button
            onClick={() => setIsSimulatingGps(!isSimulatingGps)}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 transition ${
              isSimulatingGps
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {isSimulatingGps ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isSimulatingGps ? 'PAUSE GPS STREAM (3s)' : 'START GPS STREAM (3s)'}</span>
          </button>

          {/* Redlock Race Condition Tester */}
          <button
            onClick={onTestRedlock}
            className="bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/50 px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 transition"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>TEST REDLOCK CONCURRENCY</span>
          </button>

          {/* Post-Handoff Dynamic Reroute Tester */}
          <button
            onClick={onTestAutoReroute}
            className="bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/50 px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 transition"
          >
            <RotateCw className="w-3.5 h-3.5 text-rose-400" />
            <span>TRIGGER HANDOFF & DYNAMIC AUTO-REROUTE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
