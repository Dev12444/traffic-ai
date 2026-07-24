import React, { useEffect, useState, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import GoogleSearchCard from './components/GoogleSearchCard';
import GooglePlacePanel from './components/GooglePlacePanel';
import GoogleDirectionsPanel from './components/GoogleDirectionsPanel';
import MenuDrawer from './components/MenuDrawer';

const API_BASE = 'http://localhost:5000';

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [intersections, setIntersections] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [selectedIntersection, setSelectedIntersection] = useState(null);
  const [avoidCheckpoints, setAvoidCheckpoints] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [signalData, setSignalData] = useState([]);
  const [stats, setStats] = useState(null);
  const [nudges, setNudges] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState(null); // 'PLACE' or 'DIRECTIONS'

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // 1. Initial Data Load
  const fetchAllData = async () => {
    try {
      const [interRes, cpRes, sigRes, statRes, nudgeRes] = await Promise.all([
        fetch(`${API_BASE}/intersections`).catch(() => null),
        fetch(`${API_BASE}/checkpoints`).catch(() => null),
        fetch(`${API_BASE}/signals`).catch(() => null),
        fetch(`${API_BASE}/stats`).catch(() => null),
        fetch(`${API_BASE}/nudges`).catch(() => null)
      ]);

      const interData = interRes ? await interRes.json() : [];
      const cpData = cpRes ? await cpRes.json() : [];
      const sigData = sigRes ? await sigRes.json() : [];
      const statData = statRes ? await statRes.json() : null;
      const nudgeData = nudgeRes ? await nudgeRes.json() : null;

      if (interData && interData.length > 0) setIntersections(interData);
      if (cpData && cpData.length > 0) setCheckpoints(cpData);
      if (sigData) setSignalData(sigData);
      if (statData) setStats(statData);
      if (nudgeData) setNudges(nudgeData);
    } catch (err) {
      console.warn('Error fetching backend data:', err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // 2. Fetch Prediction when selected intersection changes
  useEffect(() => {
    if (!selectedIntersection) return;
    fetch(`${API_BASE}/predictions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intersection_id: selectedIntersection.id,
        lane_counts: selectedIntersection.lane_counts
      })
    })
      .then((res) => res.json())
      .then((data) => setPrediction(data))
      .catch((err) => console.warn('Prediction fetch note:', err));
  }, [selectedIntersection]);

  // 3. Search & Geocoding Handler
  const handleSearchSubmit = async (query) => {
    if (!query.trim()) return;

    const exactLocalMatch = intersections.find(i => i.name.toLowerCase().includes(query.toLowerCase()));
    if (exactLocalMatch) {
      handleSelectIntersection(exactLocalMatch);
      return;
    }

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Gujarat, India')}&format=json&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const place = data[0];
        const geocodedObj = {
          id: `geo-${Date.now()}`,
          name: place.display_name.split(',')[0] || query,
          lng: parseFloat(place.lon),
          lat: parseFloat(place.lat),
          lane_counts: { N: 16, S: 18, E: 12, W: 14 },
          status: 'CONGESTED'
        };
        handleSelectIntersection(geocodedObj);
      } else {
        const fallbackObj = {
          id: `geo-fallback-${Date.now()}`,
          name: query.toUpperCase(),
          lng: 72.5400,
          lat: 23.0700,
          lane_counts: { N: 15, S: 18, E: 10, W: 12 },
          status: 'MODERATE'
        };
        handleSelectIntersection(fallbackObj);
      }
    } catch (e) {}
  };

  const handleSelectIntersection = (inter) => {
    setSelectedIntersection(inter);
    setActivePanel('PLACE');
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [inter.lng, inter.lat],
        zoom: 15,
        speed: 1.3
      });
    }
  };

  // 4. Calculate Route Handler
  const handleCalculateRoute = (startObj, endObj, shouldAvoidCheckpoints) => {
    fetch(`${API_BASE}/routes?startId=${startObj.id}&endId=${endObj.id}&avoidCheckpoints=${shouldAvoidCheckpoints}`)
      .then((res) => res.json())
      .then((data) => {
        setRouteData(data);
      })
      .catch((err) => console.warn('Route calculation error:', err));
  };

  const handleClearRoute = () => {
    setRouteData(null);
    if (mapRef.current) {
      const map = mapRef.current;
      if (map.getLayer('route-active-line')) map.removeLayer('route-active-line');
      if (map.getSource('route-active')) map.removeSource('route-active');
    }
  };

  // 5. Initialize Clean Dark Glassmorphism Vector Map (Dark Matter)
  useEffect(() => {
    if (!mapRef.current && mapContainerRef.current) {
      try {
        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json', // Sleek Dark Matter Style
          center: [72.5450, 23.0280], // Ahmedabad
          zoom: 12.8,
          pitch: 30
        });

        map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

        map.on('load', () => {
          setIsMapLoaded(true);
          setTimeout(() => {
            if (mapRef.current) mapRef.current.resize();
          }, 300);
        });

        mapRef.current = map;
      } catch (e) {
        console.error('Failed to initialize MapLibre map:', e);
      }
    }

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {}
        mapRef.current = null;
        setIsMapLoaded(false);
      }
    };
  }, []);

  // 6. Draw Route Line
  const drawRouteOnMap = (route) => {
    if (!mapRef.current || !isMapLoaded) return;
    const map = mapRef.current;

    if (!route || !route.active_route) {
      if (map.getLayer('route-active-line')) map.removeLayer('route-active-line');
      if (map.getSource('route-active')) map.removeSource('route-active');
      return;
    }

    try {
      const activeGeo = route.active_route.geometry;

      if (!map.isStyleLoaded()) return;

      if (map.getSource('route-active')) {
        map.getSource('route-active').setData(activeGeo);
      } else {
        map.addSource('route-active', {
          type: 'geojson',
          data: activeGeo
        });

        map.addLayer({
          id: 'route-active-line',
          type: 'line',
          source: 'route-active',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#38bdf8', // Neon Sky Blue Route Line
            'line-width': 7,
            'line-opacity': 0.9
          }
        });
      }
    } catch (err) {}
  };

  useEffect(() => {
    if (isMapLoaded) {
      drawRouteOnMap(routeData);
    }
  }, [isMapLoaded, routeData]);

  // 7. Render Selected Pin Marker
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    markersRef.current.forEach((m) => {
      try { m.remove(); } catch (e) {}
    });
    markersRef.current = [];

    if (selectedIntersection) {
      try {
        const inter = selectedIntersection;
        const total = inter.lane_counts
          ? inter.lane_counts.N + inter.lane_counts.S + inter.lane_counts.E + inter.lane_counts.W
          : 0;

        const el = document.createElement('div');
        el.style.width = '38px';
        el.style.height = '38px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = inter.status === 'CRITICAL' ? '#f43f5e' : '#0284c7';
        el.style.border = '3px solid #ffffff';
        el.style.boxShadow = '0 0 20px rgba(56, 189, 248, 0.8)';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.color = '#ffffff';
        el.style.fontWeight = '800';
        el.style.fontSize = '12px';
        el.innerText = total;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([inter.lng, inter.lat])
          .addTo(mapRef.current);

        markersRef.current.push(marker);
      } catch (err) {}
    }
  }, [selectedIntersection, isMapLoaded]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', fontFamily: 'Inter, sans-serif', background: '#07090e' }}>
      {/* Floating Dark Glassmorphism Top-Left Search Card */}
      {activePanel !== 'DIRECTIONS' && activePanel !== 'PLACE' && (
        <GoogleSearchCard
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
          intersections={intersections}
          onSelectIntersection={handleSelectIntersection}
          onOpenDirections={() => setActivePanel('DIRECTIONS')}
          onToggleMenu={() => setIsMenuOpen(true)}
        />
      )}

      {/* Left Place Inspector Panel */}
      {activePanel === 'PLACE' && selectedIntersection && (
        <GooglePlacePanel
          intersection={selectedIntersection}
          signalData={signalData}
          predictionData={prediction}
          onClose={() => {
            setActivePanel(null);
            setSelectedIntersection(null);
          }}
          onOpenDirections={() => setActivePanel('DIRECTIONS')}
          avoidCheckpoints={avoidCheckpoints}
          setAvoidCheckpoints={setAvoidCheckpoints}
        />
      )}

      {/* Left Directions Panel */}
      {activePanel === 'DIRECTIONS' && (
        <GoogleDirectionsPanel
          intersections={intersections}
          initialDestination={selectedIntersection}
          onClose={() => {
            setActivePanel(null);
            handleClearRoute();
          }}
          onCalculateRoute={handleCalculateRoute}
          avoidCheckpoints={avoidCheckpoints}
          setAvoidCheckpoints={setAvoidCheckpoints}
          activeRoute={routeData?.active_route}
        />
      )}

      {/* Slide-out Hamburger Analytics Drawer */}
      <MenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        stats={stats}
        nudges={nudges}
        avoidCheckpoints={avoidCheckpoints}
        setAvoidCheckpoints={setAvoidCheckpoints}
      />

      {/* Fullscreen Dark Map Viewport */}
      <div
        ref={mapContainerRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1 }}
      />
    </div>
  );
}