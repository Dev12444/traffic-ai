import React, { useState } from 'react';
import { ShieldAlert, Video, Sliders, Radio, AlertOctagon, CheckCircle2 } from 'lucide-react';

export default function AdminControlPanel({ intersection }) {
  const [manualOverride, setManualOverride] = useState(false);
  const [emergencyCorridor, setEmergencyCorridor] = useState(false);

  return (
    <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a855f7', fontWeight: '800', fontSize: '14px' }}>
          <Radio size={16} /> CITY TRAFFIC ADMIN CONTROL
        </div>
        <span style={{ fontSize: '10px', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(168, 85, 247, 0.4)' }}>
          ADMIN MODE
        </span>
      </div>

      {/* Simulated YOLO Video Stream Camera Inspector */}
      <div style={{ background: '#090d16', borderRadius: '10px', padding: '10px', border: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px', color: '#94a3b8' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f43f5e', fontWeight: '700' }}>
            <Video size={13} /> CCTV Stream #402 ({intersection?.name || 'CG Road'})
          </span>
          <span style={{ color: '#10b981', fontWeight: '600' }}>● LIVE • 30 FPS • YOLOv8</span>
        </div>

        {/* Video Canvas Graphic Box */}
        <div style={{
          height: '110px',
          background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '8px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          overflow: 'hidden'
        }}>
          {/* Simulated Bounding Boxes */}
          <div style={{ position: 'absolute', top: '20px', left: '30px', border: '2px solid #38bdf8', padding: '2px 4px', fontSize: '9px', color: '#38bdf8', borderRadius: '2px', background: 'rgba(56, 189, 248, 0.15)' }}>
            Car #104 (94%)
          </div>
          <div style={{ position: 'absolute', top: '45px', right: '40px', border: '2px solid #10b981', padding: '2px 4px', fontSize: '9px', color: '#10b981', borderRadius: '2px', background: 'rgba(16, 185, 129, 0.15)' }}>
            Bus #12 (91%)
          </div>
          <div style={{ position: 'absolute', bottom: '15px', left: '120px', border: '2px solid #f59e0b', padding: '2px 4px', fontSize: '9px', color: '#f59e0b', borderRadius: '2px', background: 'rgba(245, 158, 11, 0.15)' }}>
            Bike #88 (89%)
          </div>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>[ YOLOv8 Deep Vision Processing Active ]</span>
        </div>
      </div>

      {/* Admin Emergency Overrides */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={() => setEmergencyCorridor(!emergencyCorridor)}
          style={{
            padding: '10px',
            borderRadius: '8px',
            border: emergencyCorridor ? '1px solid #f43f5e' : '1px solid #334155',
            background: emergencyCorridor ? 'rgba(244, 63, 94, 0.25)' : '#1e293b',
            color: emergencyCorridor ? '#f43f5e' : '#f8fafc',
            fontWeight: '700',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <AlertOctagon size={16} />
          {emergencyCorridor ? '🚨 EMERGENCY GREEN CORRIDOR ACTIVE' : 'Clear Emergency Corridor (Ambulance Green Wave)'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1', padding: '8px', background: '#090d16', borderRadius: '8px' }}>
          <span>Manual Signal Override</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={manualOverride}
              onChange={(e) => setManualOverride(e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>
    </div>
  );
}
