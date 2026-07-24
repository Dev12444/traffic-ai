import React from 'react';
import { Clock, Leaf, Gauge, Navigation } from 'lucide-react';

export default function MetricsCards({ stats }) {
  if (!stats) return null;

  const cards = [
    {
      title: 'Est. Time Saved Today',
      value: `${stats.time_saved_hours_today || 412.5} hrs`,
      sub: '43.2% lower intersection queue time',
      icon: Clock,
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.08)',
      border: 'rgba(56, 189, 248, 0.25)'
    },
    {
      title: 'CO₂ Emissions Reduced',
      value: `${stats.co2_emissions_reduced_kg || 1576} kg`,
      sub: `Fuel saved: ${stats.fuel_saved_liters || 685} Liters`,
      icon: Leaf,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.08)',
      border: 'rgba(16, 185, 129, 0.25)'
    },
    {
      title: 'Avg Network Speed',
      value: `+${stats.average_speed_increase_pct || 23.4}%`,
      sub: 'Smoother flow across 6 corridors',
      icon: Gauge,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.08)',
      border: 'rgba(245, 158, 11, 0.25)'
    },
    {
      title: 'Vehicles Rerouted',
      value: `${stats.vehicles_rerouted_count || 1420}`,
      sub: 'Congestion & checkpoint bypasses',
      icon: Navigation,
      color: '#a855f7',
      bg: 'rgba(168, 85, 247, 0.08)',
      border: 'rgba(168, 85, 247, 0.25)'
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '12px',
      margin: '0 0 16px 0'
    }}>
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            style={{
              padding: '14px 16px',
              borderRadius: '12px',
              background: card.bg,
              border: `1px solid ${card.border}`,
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {card.title}
              </div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#f8fafc', marginTop: '2px', letterSpacing: '-0.02em' }}>
                {card.value}
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>
                {card.sub}
              </div>
            </div>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: card.color + '20',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: card.color
            }}>
              <Icon size={20} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
