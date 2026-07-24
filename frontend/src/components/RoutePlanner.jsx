import React, { useState } from 'react';
import { Navigation, MapPin, ShieldAlert, ShieldCheck, ArrowRight, X } from 'lucide-react';

export default function RoutePlanner({
  intersections,
  avoidCheckpoints,
  setAvoidCheckpoints,
  onCalculateRoute,
  onClearRoute,
  activeRoute
}) {
  const [startId, setStartId] = useState('int-2'); // Default SG Highway
  const [endId, setEndId] = useState('int-3');   // Default Ashram Road
  const [hasCalculated, setHasCalculated] = useState(false);

  const handleCalculate = () => {
    const startObj = intersections.find(i => i.id === startId) || intersections[0];
    const endObj = intersections.find(i => i.id === endId) || intersections[1];

    setHasCalculated(true);
    onCalculateRoute(startObj, endObj, avoidCheckpoints);
  };

  const handleClear = () => {
    setHasCalculated(false);
    onClearRoute();
  };

  return (
    <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '800', color: '#38bdf8' }}>
          <Navigation size={16} /> ROUTE PATHFINDER & REROUTER
        </div>
        {hasCalculated && (
          <button
            onClick={handleClear}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <X size={12} /> Clear Route
          </button>
        )}
      </div>

      {/* Origin & Destination Selectors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>
            Start Point (Origin)
          </label>
          <select
            value={startId}
            onChange={(e) => setStartId(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 8px',
              borderRadius: '6px',
              background: '#1e293b',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#f8fafc',
              fontSize: '11px',
              marginTop: '4px',
              outline: 'none'
            }}
          >
            {intersections.map(i => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>
            Destination (End)
          </label>
          <select
            value={endId}
            onChange={(e) => setEndId(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 8px',
              borderRadius: '6px',
              background: '#1e293b',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#f8fafc',
              fontSize: '11px',
              marginTop: '4px',
              outline: 'none'
            }}
          >
            {intersections.map(i => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* "Forgot Your Helmet?" Checkpoint Avoidance Toggle */}
      <div style={{
        padding: '12px',
        borderRadius: '8px',
        background: avoidCheckpoints ? 'rgba(244, 63, 94, 0.15)' : '#090d16',
        border: avoidCheckpoints ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {avoidCheckpoints ? <ShieldAlert size={16} color="#f43f5e" /> : <ShieldCheck size={16} color="#94a3b8" />}
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: avoidCheckpoints ? '#fda4af' : '#f8fafc' }}>
              Forgot your helmet?
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>
              {avoidCheckpoints ? 'Rerouting away from police posts' : 'Direct route'}
            </div>
          </div>
        </div>

        <label className="switch">
          <input
            type="checkbox"
            checked={avoidCheckpoints}
            onChange={(e) => {
              const val = e.target.checked;
              setAvoidCheckpoints(val);
              if (hasCalculated) {
                const startObj = intersections.find(i => i.id === startId) || intersections[0];
                const endObj = intersections.find(i => i.id === endId) || intersections[1];
                onCalculateRoute(startObj, endObj, val);
              }
            }}
          />
          <span className="slider"></span>
        </label>
      </div>

      {/* Action Button */}
      <button
        onClick={handleCalculate}
        style={{
          width: '100%',
          padding: '9px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff',
          border: 'none',
          fontWeight: '700',
          fontSize: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
        }}
      >
        <Navigation size={14} /> Calculate Route ({startId === endId ? 'Select Different' : 'Compute Path'})
      </button>

      {/* Active Route Details (Only Shown When Calculated) */}
      {hasCalculated && activeRoute && (
        <div style={{
          padding: '10px 12px',
          borderRadius: '8px',
          background: avoidCheckpoints ? 'rgba(244, 63, 94, 0.12)' : 'rgba(56, 189, 248, 0.12)',
          border: `1px solid ${avoidCheckpoints ? '#f43f5e' : '#38bdf8'}40`,
          fontSize: '11px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#f8fafc', fontWeight: '700' }}>
            <span>{activeRoute.name}</span>
            <span style={{ color: avoidCheckpoints ? '#f43f5e' : '#38bdf8' }}>⏱️ {activeRoute.eta_mins} mins ({activeRoute.distance_km} km)</span>
          </div>
          <p style={{ margin: '4px 0 0 0', color: '#cbd5e1', fontSize: '10.5px', lineHeight: '1.3' }}>
            {activeRoute.notes}
          </p>
        </div>
      )}
    </div>
  );
}
