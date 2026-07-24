import React from 'react';
import { X, Navigation, ShieldAlert, ShieldCheck, Clock, Leaf, Gauge, Flame, Trophy, Video } from 'lucide-react';

export default function MenuDrawer({
  isOpen,
  onClose,
  stats,
  nudges,
  avoidCheckpoints,
  setAvoidCheckpoints
}) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      width: '400px',
      background: 'rgba(11, 15, 25, 0.96)',
      borderRight: '1px solid rgba(255, 255, 255, 0.1)',
      zIndex: 300,
      padding: '24px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      overflowY: 'auto',
      boxShadow: '10px 0 30px rgba(0,0,0,0.8)',
      backdropFilter: 'blur(20px)',
      color: '#f8fafc',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            📊 TRAFFIC ANALYTICS & TOOLS
          </h2>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>TRAFFIC.AI System Telemetry</span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: '#1e293b',
            border: 'none',
            color: '#94a3b8',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* 1. Network Impact Stats Section */}
      {stats && (
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            NETWORK IMPACT KPI SUMMARY
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ background: '#1e293b', padding: '12px', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={13} color="#38bdf8" /> Time Saved Today
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginTop: '4px' }}>
                {stats.time_saved_hours_today} hrs
              </div>
            </div>
            <div style={{ background: '#1e293b', padding: '12px', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Leaf size={13} color="#10b981" /> CO₂ Reduced
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginTop: '4px' }}>
                {stats.co2_emissions_reduced_kg} kg
              </div>
            </div>
            <div style={{ background: '#1e293b', padding: '12px', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Gauge size={13} color="#f59e0b" /> Avg Speed Gain
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginTop: '4px' }}>
                +{stats.average_speed_increase_pct}%
              </div>
            </div>
            <div style={{ background: '#1e293b', padding: '12px', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Navigation size={13} color="#a855f7" /> Rerouted
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginTop: '4px' }}>
                {stats.vehicles_rerouted_count}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Checkpoint Avoidance & Helmet Toggle */}
      <div style={{ background: avoidCheckpoints ? 'rgba(244, 63, 94, 0.15)' : '#1e293b', borderRadius: '12px', padding: '16px', border: avoidCheckpoints ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {avoidCheckpoints ? <ShieldAlert size={20} color="#f43f5e" /> : <ShieldCheck size={20} color="#38bdf8" />}
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: avoidCheckpoints ? '#fda4af' : '#f8fafc' }}>
              Forgot your helmet?
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              {avoidCheckpoints ? 'Rerouting around 14 police posts' : 'Direct optimal route'}
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

      {/* 3. Civic Nudges Section */}
      {nudges && (
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#f43f5e', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Flame size={15} /> RUSH HOUR ROAST & LEADERBOARD
          </div>
          <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0, lineHeight: '1.4' }}>
            {nudges.rush_hour_roast}
          </p>
          <div style={{ fontSize: '12px', color: '#10b981', background: '#1e293b', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <Trophy size={15} /> <b>{nudges.leaderboard?.top_behaved}</b> — {nudges.leaderboard?.top_behaved_score}
          </div>
        </div>
      )}

      {/* 4. CCTV Detection Telemetry Stream Simulator */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#a855f7', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Video size={15} /> CCTV STREAM TELEMETRY (YOLOv8)
        </div>
        <div style={{ height: '90px', background: '#090d16', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontSize: '12px', fontWeight: '600', border: '1px solid #1e293b' }}>
          ● LIVE • 30 FPS • YOLOv8 Vehicle Inference
        </div>
      </div>
    </div>
  );
}
