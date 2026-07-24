import React from 'react';
import { ShieldAlert, ShieldCheck, MapPin, AlertTriangle, ChevronRight } from 'lucide-react';

export default function HelmetToggle({ avoidCheckpoints, setAvoidCheckpoints, routeData }) {
  const activeRoute = routeData?.active_route;

  return (
    <div style={{
      padding: '16px',
      borderRadius: '12px',
      background: avoidCheckpoints ? 'rgba(244, 63, 94, 0.12)' : 'rgba(30, 41, 59, 0.7)',
      border: avoidCheckpoints ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(12px)',
      transition: 'all 0.3s ease'
    }}>
      {/* Header with Switch */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: avoidCheckpoints ? 'rgba(244, 63, 94, 0.2)' : 'rgba(148, 163, 184, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: avoidCheckpoints ? '#f43f5e' : '#94a3b8'
          }}>
            {avoidCheckpoints ? <ShieldAlert size={18} /> : <ShieldCheck size={18} />}
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '14px', color: avoidCheckpoints ? '#fda4af' : '#f8fafc' }}>
              Forgot your helmet?
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              {avoidCheckpoints ? 'Active Constraint: Avoid Police Checkpoints' : 'Default Fastest Route'}
            </div>
          </div>
        </div>

        {/* Custom Toggle Switch */}
        <label className="switch">
          <input
            type="checkbox"
            checked={avoidCheckpoints}
            onChange={(e) => setAvoidCheckpoints(e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>

      {/* Dynamic Route Info */}
      {activeRoute && (
        <div style={{
          marginTop: '12px',
          padding: '10px 12px',
          borderRadius: '8px',
          background: avoidCheckpoints ? 'rgba(15, 23, 42, 0.7)' : 'rgba(15, 23, 42, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#cbd5e1', fontWeight: '600' }}>
            <span>{activeRoute.name}</span>
            <span style={{ color: avoidCheckpoints ? '#f43f5e' : '#38bdf8' }}>⏱️ {activeRoute.eta_mins} mins</span>
          </div>

          <p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: '11px', lineHeight: '1.4' }}>
            {activeRoute.notes}
          </p>

          {avoidCheckpoints && activeRoute.bypassed_checkpoints && (
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#fda4af' }}>
              <AlertTriangle size={12} />
              <span>Bypassing: {activeRoute.bypassed_checkpoints.join(', ')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
