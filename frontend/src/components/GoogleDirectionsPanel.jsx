import React, { useState } from 'react';
import { Navigation, ShieldAlert, ShieldCheck, X } from 'lucide-react';

export default function GoogleDirectionsPanel({
  intersections,
  onClose,
  onCalculateRoute,
  avoidCheckpoints,
  setAvoidCheckpoints,
  activeRoute
}) {
  const [startId, setStartId] = useState('int-2'); // SG Highway
  const [endId, setEndId] = useState('int-3');   // Ashram Road

  const handleCompute = () => {
    const startObj = intersections.find(i => i.id === startId) || intersections[0];
    const endObj = intersections.find(i => i.id === endId) || intersections[1];
    onCalculateRoute(startObj, endObj, avoidCheckpoints);
  };

  return (
    <div style={{
      position: 'absolute',
      top: '0',
      left: '0',
      bottom: '0',
      width: '400px',
      background: 'rgba(11, 15, 25, 0.96)',
      boxShadow: '10px 0 30px rgba(0,0,0,0.8)',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      borderRight: '1px solid rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(20px)',
      color: '#f8fafc'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0284c7 0%, #0f172a 100%)',
        padding: '16px 20px',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(56, 189, 248, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: '800' }}>
          <Navigation size={20} style={{ transform: 'rotate(45deg)' }} /> OSRM Directions
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Origin & Destination Inputs */}
      <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '700', textTransform: 'uppercase' }}>
            Choose Starting Point (Origin)
          </label>
          <select
            value={startId}
            onChange={(e) => setStartId(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              background: '#1e293b',
              fontSize: '13px',
              color: '#f8fafc',
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
          <label style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '700', textTransform: 'uppercase' }}>
            Choose Destination (End Point)
          </label>
          <select
            value={endId}
            onChange={(e) => setEndId(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              background: '#1e293b',
              fontSize: '13px',
              color: '#f8fafc',
              marginTop: '4px',
              outline: 'none'
            }}
          >
            {intersections.map(i => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </div>

        {/* "Forgot your helmet?" Feature Toggle */}
        <div style={{
          padding: '12px 14px',
          borderRadius: '10px',
          background: avoidCheckpoints ? 'rgba(244, 63, 94, 0.15)' : '#1e293b',
          border: avoidCheckpoints ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {avoidCheckpoints ? <ShieldAlert size={18} color="#f43f5e" /> : <ShieldCheck size={18} color="#38bdf8" />}
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: avoidCheckpoints ? '#fda4af' : '#38bdf8' }}>
                Forgot your helmet?
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                {avoidCheckpoints ? 'Reroute around 14 police posts' : 'Direct OSRM road route'}
              </div>
            </div>
          </div>

          <label className="switch">
            <input
              type="checkbox"
              checked={avoidCheckpoints}
              onChange={(e) => setAvoidCheckpoints(e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>

        {/* Action Button */}
        <button
          onClick={handleCompute}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
            color: '#ffffff',
            border: 'none',
            fontWeight: '700',
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Navigation size={16} style={{ transform: 'rotate(45deg)' }} /> Compute OSRM Directions
        </button>
      </div>

      {/* Computed Route Result Details */}
      {activeRoute && (
        <div style={{ padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase', marginBottom: '8px' }}>
            RECOMMENDED ROAD ROUTE
          </div>
          <div style={{ background: '#1e293b', borderRadius: '12px', padding: '16px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{activeRoute.eta_mins} mins</span>
              <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>({activeRoute.distance_km} km)</span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc', marginTop: '4px' }}>
              {activeRoute.name}
            </div>
            <p style={{ fontSize: '11.5px', color: '#cbd5e1', marginTop: '6px', lineHeight: '1.4', margin: '6px 0 0 0' }}>
              {activeRoute.notes}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
