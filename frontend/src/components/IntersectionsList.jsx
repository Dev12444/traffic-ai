import React, { useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';

export default function IntersectionsList({ intersections, selectedId, onSelect }) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter intersections based on search query
  const filteredIntersections = intersections.filter((inter) =>
    inter.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '0' }}>
      {/* Header */}
      <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MapPin size={15} color="#38bdf8" /> AHMEDABAD INTERSECTIONS ({filteredIntersections.length}/{intersections.length})
        </span>
      </div>

      {/* Interactive Search Bar Input */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          placeholder="Search intersection (e.g. Thaltej, ISCON, CG Road)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 30px 8px 30px',
            borderRadius: '8px',
            background: '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#f8fafc',
            fontSize: '12px',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
        {searchQuery && (
          <X
            size={14}
            color="#94a3b8"
            onClick={() => setSearchQuery('')}
            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
          />
        )}
      </div>

      {/* Scrollable Results List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
        {filteredIntersections.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '16px 0' }}>
            No intersections found matching "{searchQuery}"
          </div>
        ) : (
          filteredIntersections.map((inter) => {
            const isSelected = selectedId === inter.id;
            const counts = inter.lane_counts || { N: 0, S: 0, E: 0, W: 0 };
            const total = counts.N + counts.S + counts.E + counts.W;

            return (
              <div
                key={inter.id}
                onClick={() => onSelect(inter)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: isSelected ? 'rgba(56, 189, 248, 0.15)' : '#1e293b',
                  border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: isSelected ? '#38bdf8' : '#f8fafc' }}>
                    {inter.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                    Vehicles: <b>{total}</b> (N:{counts.N} S:{counts.S} E:{counts.E} W:{counts.W})
                  </div>
                </div>

                <span style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: inter.status === 'CRITICAL' ? 'rgba(244, 63, 94, 0.2)' : inter.status === 'HEAVY' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  color: inter.status === 'CRITICAL' ? '#f43f5e' : inter.status === 'HEAVY' ? '#f59e0b' : '#10b981'
                }}>
                  {inter.status || 'MODERATE'}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
