import React, { useState, useEffect } from 'react';
import { Navigation, ShieldAlert, ShieldCheck, X, ArrowRight, ArrowLeft, ArrowUp, CornerUpRight, CornerUpLeft, CheckCircle, MapPin, ChevronLeft, RotateCcw } from 'lucide-react';

// Map OSRM maneuver types to icons
function getStepIcon(maneuver, modifier) {
  if (maneuver === 'arrive') return <CheckCircle size={16} color="#10b981" />;
  if (maneuver === 'depart') return <ArrowUp size={16} color="#38bdf8" />;
  if (maneuver === 'turn' || maneuver === 'end of road' || maneuver === 'fork' || maneuver === 'new name') {
    if (modifier && modifier.includes('left')) return <CornerUpLeft size={16} color="#38bdf8" />;
    if (modifier && modifier.includes('right')) return <CornerUpRight size={16} color="#38bdf8" />;
    return <ArrowUp size={16} color="#38bdf8" />;
  }
  if (maneuver === 'roundabout' || maneuver === 'rotary') return <RotateCcw size={16} color="#a78bfa" />;
  if (maneuver === 'merge') return <ArrowRight size={16} color="#38bdf8" />;
  return <ArrowUp size={16} color="#38bdf8" />;
}

// Format OSRM instruction into readable text
function formatInstruction(step) {
  const { maneuver, modifier, road_name, instruction } = step;
  const road = road_name && road_name !== 'unnamed road' ? road_name : '';

  if (maneuver === 'depart') return `Head ${modifier || 'north'} on ${road || 'the road'}`;
  if (maneuver === 'arrive') return `Arrive at your destination${road ? ` on ${road}` : ''}`;
  if (maneuver === 'turn') {
    const dir = modifier === 'left' ? 'Turn left' : modifier === 'right' ? 'Turn right' : modifier === 'slight left' ? 'Slight left' : modifier === 'slight right' ? 'Slight right' : modifier === 'sharp left' ? 'Sharp left' : modifier === 'sharp right' ? 'Sharp right' : 'Continue';
    return `${dir}${road ? ` onto ${road}` : ''}`;
  }
  if (maneuver === 'new name') return `Continue onto ${road || 'the road'}`;
  if (maneuver === 'merge') return `Merge${road ? ` onto ${road}` : ''}`;
  if (maneuver === 'fork') {
    const dir = modifier && modifier.includes('left') ? 'Keep left' : 'Keep right';
    return `${dir}${road ? ` onto ${road}` : ''}`;
  }
  if (maneuver === 'roundabout' || maneuver === 'rotary') return `Enter roundabout${road ? `, exit onto ${road}` : ''}`;
  if (maneuver === 'end of road') {
    const dir = modifier && modifier.includes('left') ? 'Turn left' : 'Turn right';
    return `${dir} at end of road${road ? ` onto ${road}` : ''}`;
  }
  // Fallback
  return instruction || `Continue on ${road || 'the road'}`;
}

// Format distance display
function formatDist(distance_m) {
  if (distance_m >= 1000) return `${(distance_m / 1000).toFixed(1)} km`;
  return `${distance_m} m`;
}

export default function GoogleDirectionsPanel({
  intersections,
  initialDestination,
  onClose,
  onCalculateRoute,
  avoidCheckpoints,
  setAvoidCheckpoints,
  activeRoute
}) {
  const [startId, setStartId] = useState('CURRENT_GPS');
  const [endId, setEndId] = useState(initialDestination?.id || 'guj-loc-3');
  const [showStepByStep, setShowStepByStep] = useState(false);

  useEffect(() => {
    if (initialDestination) {
      setEndId(initialDestination.id);
    }
  }, [initialDestination]);

  const allDestinations = initialDestination && !intersections.some(i => i.id === initialDestination.id)
    ? [initialDestination, ...intersections]
    : intersections;

  const startObj = startId === 'CURRENT_GPS'
    ? { name: '📍 Current GPS Location' }
    : intersections.find(i => i.id === startId) || intersections[0];

  const endObj = allDestinations.find(i => i.id === endId) || allDestinations[1];

  const handleCompute = () => {
    if (startId === 'CURRENT_GPS') {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const userGpsObj = {
            id: 'user-gps',
            name: '📍 Current Location',
            lng: pos.coords.longitude,
            lat: pos.coords.latitude
          };
          onCalculateRoute(userGpsObj, endObj, avoidCheckpoints);
          setShowStepByStep(true);
        }, () => {
          const fallbackStart = intersections[0];
          onCalculateRoute(fallbackStart, endObj, avoidCheckpoints);
          setShowStepByStep(true);
        });
        return;
      }
    }

    onCalculateRoute(startObj, endObj, avoidCheckpoints);
    setShowStepByStep(true);
  };

  useEffect(() => {
    if (initialDestination) {
      onCalculateRoute(startObj, initialDestination, avoidCheckpoints);
    }
  }, [initialDestination]);

  // Use real OSRM steps from the active route response
  const realSteps = activeRoute?.steps || [];

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
      color: '#f8fafc',
      fontFamily: 'Inter, sans-serif'
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '17px', fontWeight: '800' }}>
          {showStepByStep ? (
            <button
              onClick={() => setShowStepByStep(false)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <ChevronLeft size={20} />
            </button>
          ) : null}
          <Navigation size={18} style={{ transform: 'rotate(45deg)' }} />
          {showStepByStep ? 'Turn-by-Turn Navigation' : 'OSRM Directions'}
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <X size={20} />
        </button>
      </div>

      {!showStepByStep ? (
        /* Form View */
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
              <option value="CURRENT_GPS">📍 Current GPS Location</option>
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
              {allDestinations.map(i => (
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
      ) : (
        /* Dedicated Step-by-Step Navigation View — REAL OSRM Data */
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Summary Banner */}
          <div style={{ background: '#1e293b', borderRadius: '14px', padding: '16px', border: '1px solid rgba(56, 189, 248, 0.4)' }}>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>⏱️ {activeRoute?.eta_mins || '—'} mins</span>
              <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>{activeRoute?.distance_km || '—'} km</span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc', marginTop: '6px' }}>
              {activeRoute?.name || 'OSRM Real-Road Route'}
            </div>
            <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={12} /> {startObj.name} ➔ {endObj.name}
            </div>
          </div>

          {/* Turn-by-Turn Step List — REAL OSRM DATA */}
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            STEP-BY-STEP TURN DIRECTIONS ({realSteps.length} steps)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {realSteps.length > 0 ? realSteps.map((step, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px',
                borderRadius: '10px',
                background: '#1e293b',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px', flexShrink: 0 }}>
                  {getStepIcon(step.maneuver, step.modifier)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: '600', color: '#f8fafc', lineHeight: '1.3' }}>
                    {formatInstruction(step)}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>
                    {formatDist(step.distance_m)} · ~{Math.max(1, Math.round(step.duration_s / 60))} min
                  </div>
                </div>
              </div>
            )) : (
              <div style={{ fontSize: '12px', color: '#94a3b8', padding: '12px', background: '#1e293b', borderRadius: '10px' }}>
                Loading turn-by-turn steps from OSRM…
              </div>
            )}
          </div>

          {/* Action buttons */}
          <button
            onClick={() => setShowStepByStep(false)}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              background: '#1e293b',
              color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              marginTop: '8px'
            }}
          >
            ← Modify Start or Destination
          </button>
        </div>
      )}
    </div>
  );
}
