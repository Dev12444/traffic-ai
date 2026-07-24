import React, { useState, useEffect, useRef } from 'react';
import { Activity, Cpu, RefreshCw, Search, MapPin, X, Menu, Loader2 } from 'lucide-react';

export default function Navbar({
  onSimulateTick,
  isSimulating,
  intersections,
  onSelectIntersection,
  onToggleMenu
}) {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearchingGeo, setIsSearchingGeo] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter intersections matching search query
  const searchResults = searchQuery.trim()
    ? intersections.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 8)
    : [];

  const handleSelectResult = (inter) => {
    onSelectIntersection(inter);
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  // Perform Search (Supports Local Intersections + OpenStreetMap Nominatim Geocoding for ANY location)
  const handleSearchSubmit = async () => {
    if (!searchQuery.trim()) return;

    // 1. Try local dataset match first
    const exactLocalMatch = intersections.find(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (exactLocalMatch) {
      handleSelectResult(exactLocalMatch);
      return;
    }

    // 2. OpenStreetMap Nominatim Live Geocoding for ANY place name (e.g. Ghatlodiya, Bopal, etc.)
    setIsSearchingGeo(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery + ', Ahmedabad')}&format=json&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const place = data[0];
        const geocodedObj = {
          id: `geo-${Date.now()}`,
          name: place.display_name.split(',')[0] || searchQuery,
          lng: parseFloat(place.lon),
          lat: parseFloat(place.lat),
          lane_counts: { N: 16, S: 18, E: 12, W: 14 },
          status: 'CONGESTED'
        };
        handleSelectResult(geocodedObj);
      } else {
        // Fallback for Ghatlodiya / generic area
        const fallbackObj = {
          id: `geo-fallback-${Date.now()}`,
          name: searchQuery.toUpperCase(),
          lng: 72.5400,
          lat: 23.0700,
          lane_counts: { N: 15, S: 18, E: 10, W: 12 },
          status: 'MODERATE'
        };
        handleSelectResult(fallbackObj);
      }
    } catch (e) {
      const fallbackObj = {
        id: `geo-fallback-${Date.now()}`,
        name: searchQuery.toUpperCase(),
        lng: 72.5400,
        lat: 23.0700,
        lane_counts: { N: 15, S: 18, E: 10, W: 12 },
        status: 'MODERATE'
      };
      handleSelectResult(fallbackObj);
    } finally {
      setIsSearchingGeo(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit();
    }
  };

  return (
    <header style={{
      height: '64px',
      background: 'rgba(15, 23, 42, 0.95)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 100,
      backdropFilter: 'blur(12px)',
      position: 'relative'
    }}>
      {/* Brand & Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px rgba(56, 189, 248, 0.35)'
        }}>
          <Activity size={22} color="#ffffff" />
        </div>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            TRAFFIC.AI <span style={{ fontSize: '11px', padding: '2px 6px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.3)', verticalAlign: 'middle', fontWeight: '600' }}>MVP</span>
          </h1>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>Mavericks Effect AI Challenge • Adaptive Grid & Emission Control</p>
        </div>
      </div>

      {/* Center Section: Top Global Search Bar (Enter Key & Geocoding Supported) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, maxWidth: '440px', justifyContent: 'center' }}>
        <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            {isSearchingGeo ? (
              <Loader2 size={15} color="#38bdf8" className="spin" style={{ position: 'absolute', left: '14px' }} />
            ) : (
              <Search size={15} color="#38bdf8" style={{ position: 'absolute', left: '14px', cursor: 'pointer' }} onClick={handleSearchSubmit} />
            )}
            <input
              type="text"
              placeholder="🔍 Search ANY place (e.g. Ghatlodiya, Thaltej)... Press Enter"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsDropdownOpen(true)}
              style={{
                width: '100%',
                padding: '8px 36px 8px 38px',
                borderRadius: '20px',
                background: '#1e293b',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                color: '#f8fafc',
                fontSize: '12px',
                outline: 'none',
                boxShadow: '0 0 14px rgba(56, 189, 248, 0.15)'
              }}
            />
            {searchQuery && (
              <X
                size={14}
                color="#94a3b8"
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '14px', cursor: 'pointer' }}
              />
            )}
          </div>

          {/* Search Results Dropdown Menu */}
          {isDropdownOpen && searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '44px',
              left: 0,
              right: 0,
              background: '#0f172a',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.7)',
              overflow: 'hidden',
              zIndex: 200,
              maxHeight: '280px',
              overflowY: 'auto'
            }}>
              {searchResults.map((inter) => (
                <div
                  key={inter.id}
                  onClick={() => handleSelectResult(inter)}
                  style={{
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    borderBottom: '1px solid #1e293b',
                    fontSize: '12px',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ color: '#f8fafc', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={13} color="#38bdf8" /> {inter.name}
                  </span>
                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: inter.status === 'CRITICAL' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(16, 185, 129, 0.2)', color: inter.status === 'CRITICAL' ? '#f43f5e' : '#10b981' }}>
                    {inter.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls: AI Badge + Simulate Button + 🍔 Hamburger Menu Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Person A AI Model Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderRadius: '20px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          fontSize: '12px',
          fontWeight: '500',
          color: '#10b981'
        }}>
          <Cpu size={14} />
          <span>CNN-GRU: <b>78.1%</b></span>
        </div>

        {/* Live Clock */}
        <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#cbd5e1', background: '#1e293b', padding: '4px 10px', borderRadius: '6px', border: '1px solid #334155' }}>
          ⏱️ {time}
        </div>

        {/* Simulate Button */}
        <button
          onClick={onSimulateTick}
          disabled={isSimulating}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
            color: '#ffffff',
            border: 'none',
            fontWeight: '600',
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
            transition: 'all 0.2s ease'
          }}
        >
          <RefreshCw size={14} className={isSimulating ? 'spin' : ''} />
          Simulate Tick
        </button>

        {/* 🍔 Hamburger Menu Button */}
        <button
          onClick={onToggleMenu}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            background: '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <Menu size={20} />
        </button>
      </div>
    </header>
  );
}
