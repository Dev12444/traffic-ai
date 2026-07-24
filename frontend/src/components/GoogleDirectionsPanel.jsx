import React, { useState, useEffect } from 'react';
import { Navigation, ShieldAlert, ShieldCheck, X, ArrowRight, ArrowLeft, ArrowUp, CheckCircle, MapPin, ChevronLeft } from 'lucide-react';

export default function GoogleDirectionsPanel({
  intersections,
  initialDestination,
  onClose,
  onCalculateRoute,
  avoidCheckpoints,
  setAvoidCheckpoints,
  activeRoute
}) {
  const [startId, setStartId] = useState('int-2'); // Default SG Highway
  const [endId, setEndId] = useState(initialDestination?.id || 'int-3');
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
          const fallbackStart = intersections.find(i => i.id === 'int-2') || intersections[0];
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

  // Turn-by-turn steps generated for active route
  const navigationSteps = [
    { icon: <ArrowUp size={16} color="#38bdf8" />, text: `Head towards ${startObj.name}`, dist: '0.4 km' },
    { icon: <ArrowRight size={16} color="#38bdf8" />, text: `Turn right onto Ahmedabad Metro Corridor`, dist: `${Math.round((activeRoute?.distance_km || 5) * 0.4 * 10) / 10} km` },
    avoidCheckpoints
      ? { icon: <ShieldAlert size={16} color="#f43f5e" />, text: `🛡️ Detour active: Bypassing police checkpoints on outer ring road`, dist: '1.2 km' }
      : { icon: <ShieldCheck size={16} color="#10b981" />, text: `Standard route: Clear arterial road segment`, dist: '0.8 km' },
    { icon: <ArrowLeft size={16} color="#38bdf8" />, text: `Turn left at major signal junction towards ${endObj.name}`, dist: `${Math.round((activeRoute?.distance_km || 5) * 0.3 * 10) / 10} km` },
    { icon: <CheckCircle size={16} color="#10b981" />, text: `Arrive at destination: ${endObj.name}`, dist: '0.1 km' }
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
        /* Dedicated Step-by-Step Navigation View */
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Summary Banner */}
          <div style={{ background: '#1e293b', borderRadius: '14px', padding: '16px', border: '1px solid rgba(56, 189, 248, 0.4)' }}>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>⏱️ {activeRoute?.eta_mins || 14.5} mins</span>
              <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>{activeRoute?.distance_km || 6.2} km</span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc', marginTop: '6px' }}>
              {activeRoute?.name || 'OSRM Real-Road Route'}
            </div>
            <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={12} /> {startObj.name} ➔ {endObj.name}
            </div>
          </div>

          {/* Turn-by-Turn Step List */}
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            STEP-BY-STEP TURN DIRECTIONS
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {navigationSteps.map((step, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px',
                borderRadius: '10px',
                background: '#1e293b',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
                  {step.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: '600', color: '#f8fafc', lineHeight: '1.3' }}>
                    {step.text}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>
                    {step.dist}
                  </div>
                </div>
              </div>
            ))}
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
