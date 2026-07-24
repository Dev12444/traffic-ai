import React, { useState } from 'react';
import { Search, Navigation, Menu, X, MapPin } from 'lucide-react';

export default function GoogleSearchCard({
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  intersections,
  onSelectIntersection,
  onOpenDirections,
  onToggleMenu
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const searchResults = searchQuery.trim()
    ? intersections.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 6)
    : [];

  const handleSelectResult = (inter) => {
    onSelectIntersection(inter);
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearchSubmit(searchQuery);
      setIsDropdownOpen(false);
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      left: '16px',
      zIndex: 100,
      width: '420px'
    }}>
      {/* Floating Dark Glassmorphism Search Card */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        borderRadius: '24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
        padding: '6px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        backdropFilter: 'blur(12px)'
      }}>
        {/* Hamburger Menu Toggle */}
        <button
          onClick={onToggleMenu}
          title="Menu & Analytics"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#38bdf8', padding: '4px', display: 'flex', alignItems: 'center' }}
        >
          <Menu size={20} />
        </button>

        {/* Input Field */}
        <input
          type="text"
          placeholder="🔍 Search 150+ Ahmedabad corridors... (Press Enter)"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsDropdownOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsDropdownOpen(true)}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: '13px',
            color: '#f8fafc',
            background: 'transparent',
            fontFamily: 'Inter, sans-serif'
          }}
        />

        {searchQuery && (
          <X
            size={18}
            color="#94a3b8"
            style={{ cursor: 'pointer' }}
            onClick={() => setSearchQuery('')}
          />
        )}

        {/* Search Icon */}
        <button
          onClick={() => {
            onSearchSubmit(searchQuery);
            setIsDropdownOpen(false);
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#38bdf8', padding: '4px', display: 'flex', alignItems: 'center' }}
        >
          <Search size={18} />
        </button>

        <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.15)' }} />

        {/* Blue Directions Icon Button */}
        <button
          onClick={onOpenDirections}
          title="Directions"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(2, 132, 199, 0.5)',
            transition: 'transform 0.15s ease'
          }}
        >
          <Navigation size={18} style={{ transform: 'rotate(45deg)' }} />
        </button>
      </div>

      {/* Autocomplete Dropdown */}
      {isDropdownOpen && searchResults.length > 0 && (
        <div style={{
          marginTop: '8px',
          background: '#0f172a',
          borderRadius: '16px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
          overflow: 'hidden',
          border: '1px solid rgba(56, 189, 248, 0.3)'
        }}>
          {searchResults.map((inter) => (
            <div
              key={inter.id}
              onClick={() => handleSelectResult(inter)}
              style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                borderBottom: '1px solid #1e293b',
                fontSize: '13px',
                color: '#f8fafc'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <MapPin size={16} color="#38bdf8" />
              <div>
                <div style={{ fontWeight: '600', color: '#f8fafc' }}>{inter.name}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Ahmedabad Metro Area</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
