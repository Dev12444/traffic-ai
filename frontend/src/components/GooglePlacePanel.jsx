import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { Navigation, ShieldAlert, Share2, Zap, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Activity, X } from 'lucide-react';

export default function GooglePlacePanel({
  intersection,
  signalData,
  predictionData,
  onClose,
  onOpenDirections,
  avoidCheckpoints,
  setAvoidCheckpoints
}) {
  if (!intersection) return null;

  const counts = intersection.lane_counts || { N: 15, S: 18, E: 8, W: 10 };
  const nsTotal = counts.N + counts.S;
  const ewTotal = counts.E + counts.W;
  const total = nsTotal + ewTotal || 1;

  const signal = signalData?.find(s => s.intersection_id === intersection.id) || {
    recommended_timing: {
      ns_green_secs: Math.round((nsTotal / total) * 70),
      ew_green_secs: 70 - Math.round((nsTotal / total) * 70)
    }
  };

  const nsGreen = signal.recommended_timing.ns_green_secs;
  const ewGreen = signal.recommended_timing.ew_green_secs;

  const chartData = [
    { time: '-15m', count: Math.round(total * 0.75) },
    { time: '-10m', count: Math.round(total * 0.85) },
    { time: '-5m', count: Math.round(total * 0.95) },
    { time: 'NOW', count: total },
    { time: '+5m', count: Math.round(total * 1.05) },
    { time: '+10m', count: Math.round(total * 1.12) },
    { time: '+15m', count: Math.round(total * 1.18) },
    { time: '+20m (Pred)', count: predictionData?.predicted_count_20min || Math.round(total * 1.22) }
  ];

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
      {/* Header Banner & Close Button */}
      <div style={{
        height: '140px',
        background: 'linear-gradient(135deg, #0284c7 0%, #0f172a 100%)',
        position: 'relative',
        padding: '16px',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        borderBottom: '1px solid rgba(56, 189, 248, 0.3)'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#ffffff',
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

        <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Corridor Inspector
        </span>
        <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '2px 0 0 0', background: 'linear-gradient(90deg, #ffffff, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {intersection.name}
        </h2>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
          Ahmedabad Traffic Grid
        </span>
      </div>

      {/* Action Buttons Bar */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '16px' }}>
        <button
          onClick={onOpenDirections}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <Navigation size={18} style={{ transform: 'rotate(45deg)' }} />
          </div>
          <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '600' }}>Directions</span>
        </button>

        <button
          onClick={() => setAvoidCheckpoints(!avoidCheckpoints)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: avoidCheckpoints ? '#f43f5e' : '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: avoidCheckpoints ? '#fff' : '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}>
            <ShieldAlert size={18} />
          </div>
          <span style={{ fontSize: '11px', color: avoidCheckpoints ? '#f43f5e' : '#94a3b8', fontWeight: '600' }}>Helmet Mode</span>
        </button>
      </div>

      {/* Traffic Status Box */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ background: '#1e293b', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '12px 14px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: intersection.status === 'CRITICAL' ? '#f43f5e' : intersection.status === 'HEAVY' ? '#f59e0b' : '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '12px' }}>
            🚗
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc' }}>
              {intersection.status === 'CRITICAL' ? 'Heavy Congestion Alert' : intersection.status === 'HEAVY' ? 'Moderate Traffic Flow' : 'Smooth Flow'}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              CNN-GRU AI Model: {total} active vehicles detected
            </div>
          </div>
        </div>
      </div>

      {/* Lane Breakdown Grid */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase', marginBottom: '8px' }}>
          Live YOLOv8 Vehicle Detection
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          <div style={{ background: '#1e293b', padding: '8px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ color: '#38bdf8', fontSize: '11px', fontWeight: '700' }}><ArrowUp size={12} /> N</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#f8fafc' }}>{counts.N}</div>
          </div>
          <div style={{ background: '#1e293b', padding: '8px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ color: '#38bdf8', fontSize: '11px', fontWeight: '700' }}><ArrowDown size={12} /> S</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#f8fafc' }}>{counts.S}</div>
          </div>
          <div style={{ background: '#1e293b', padding: '8px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ color: '#38bdf8', fontSize: '11px', fontWeight: '700' }}><ArrowRight size={12} /> E</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#f8fafc' }}>{counts.E}</div>
          </div>
          <div style={{ background: '#1e293b', padding: '8px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ color: '#38bdf8', fontSize: '11px', fontWeight: '700' }}><ArrowLeft size={12} /> W</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#f8fafc' }}>{counts.W}</div>
          </div>
        </div>
      </div>

      {/* Adaptive Signal Timing Gauge */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <Zap size={15} /> Adaptive Signal Split (70s Cycle)
        </div>
        <div style={{ height: '22px', borderRadius: '6px', background: '#1e293b', display: 'flex', overflow: 'hidden' }}>
          <div style={{ width: `${(nsGreen / 70) * 100}%`, background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff', fontWeight: '800' }}>
            N-S {nsGreen}s
          </div>
          <div style={{ width: `${(ewGreen / 70) * 100}%`, background: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff', fontWeight: '800' }}>
            E-W {ewGreen}s
          </div>
        </div>
      </div>

      {/* 20-Min Forecast Chart */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#38bdf8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={13} color="#38bdf8" /> 20-Min Congestion Forecast (CNN-GRU)
        </div>
        <div style={{ width: '100%', height: '110px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCountDark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }} />
              <Area type="monotone" dataKey="count" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorCountDark)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
