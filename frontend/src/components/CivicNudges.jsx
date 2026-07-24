import React from 'react';
import { Flame, Timer, Trophy } from 'lucide-react';

export default function CivicNudges({ nudgeData }) {
  if (!nudgeData) return null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '12px',
      margin: '0 0 16px 0'
    }}>
      {/* Rush Hour Roast */}
      <div className="glass-panel" style={{ padding: '12px 14px', borderLeft: '4px solid #f43f5e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#f43f5e', fontWeight: '700' }}>
          <Flame size={14} /> RUSH HOUR ROAST
        </div>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#f8fafc', fontWeight: '500', lineHeight: '1.3' }}>
          {nudgeData.rush_hour_roast || "🔥 CG Road Junction is so jammed right now even pigeons are taking detours!"}
        </p>
      </div>

      {/* Signal Flip Warning */}
      <div className="glass-panel" style={{ padding: '12px 14px', borderLeft: '4px solid #38bdf8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#38bdf8', fontWeight: '700' }}>
          <Timer size={14} /> LIVE SIGNAL NUDGE
        </div>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#f8fafc', fontWeight: '500', lineHeight: '1.3' }}>
          {nudgeData.signal_flip_nudge || "⏳ Signal turning GREEN in 5 seconds — clear N-S lane!"}
        </p>
      </div>

      {/* Best-Behaved Leaderboard */}
      <div className="glass-panel" style={{ padding: '12px 14px', borderLeft: '4px solid #10b981' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#10b981', fontWeight: '700' }}>
          <Trophy size={14} /> BEST BEHAVED CORRIDOR
        </div>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#f8fafc', fontWeight: '500', lineHeight: '1.3' }}>
          🏆 <b>{nudgeData.leaderboard?.top_behaved || "Satellite Circle"}</b> — {nudgeData.leaderboard?.top_behaved_score || "96% Smooth Flow"}
        </p>
      </div>
    </div>
  );
}
