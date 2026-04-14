import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

/* ──────────────────────────── DATA ──────────────────────────── */

interface City { name: string; lng: number; lat: number }
interface Destination {
  label: string;
  flag: string;
  cities: City[];
  center: [number, number];
  zoom: number;
  /** If true, do a 3D orbit with spoke-spread during this destination */
  orbit?: boolean;
}

const DESTINATIONS: Destination[] = [
  {
    label: 'Thailand', flag: '🇹🇭',
    center: [100.5, 14.5], zoom: 6.2,
    cities: [
      { name: 'Bangkok',     lng: 100.5018, lat: 13.7563 },
      { name: 'Chiang Mai',  lng: 98.9853,  lat: 18.7883 },
      { name: 'Phuket',      lng: 98.3923,  lat: 7.8804  },
      { name: 'Ayutthaya',   lng: 100.5877, lat: 14.3532 },
      { name: 'Koh Samui',   lng: 100.0670, lat: 9.5120  },
    ],
  },
  {
    label: 'Japan', flag: '🇯🇵',
    center: [136.5, 35.5], zoom: 5.8,
    cities: [
      { name: 'Tokyo',     lng: 139.6917, lat: 35.6895 },
      { name: 'Kyoto',     lng: 135.7681, lat: 35.0116 },
      { name: 'Osaka',     lng: 135.5023, lat: 34.6937 },
      { name: 'Hiroshima', lng: 132.4596, lat: 34.3853 },
      { name: 'Nara',      lng: 135.8050, lat: 34.6851 },
    ],
  },
  {
    label: 'Italy', flag: '🇮🇹',
    center: [12.5, 42.5], zoom: 5.6,
    cities: [
      { name: 'Rome',     lng: 12.4964, lat: 41.9028 },
      { name: 'Florence', lng: 11.2558, lat: 43.7696 },
      { name: 'Venice',   lng: 12.3155, lat: 45.4408 },
      { name: 'Naples',   lng: 14.2681, lat: 40.8518 },
      { name: 'Amalfi',   lng: 14.6027, lat: 40.6340 },
    ],
  },
  {
    label: 'Sri Lanka', flag: '🇱🇰',
    center: [80.7, 7.8], zoom: 7.2,
    orbit: true,
    cities: [
      { name: 'Colombo',      lng: 79.8612, lat: 6.9271  },
      { name: 'Kandy',        lng: 80.6350, lat: 7.2906  },
      { name: 'Sigiriya',     lng: 80.7600, lat: 7.9570  },
      { name: 'Trincomalee',  lng: 81.2152, lat: 8.5874  },
      { name: 'Ella',         lng: 81.0466, lat: 6.8667  },
      { name: 'Galle',        lng: 80.2170, lat: 6.0535  },
    ],
  },
  {
    label: 'Vietnam', flag: '🇻🇳',
    center: [107.5, 16], zoom: 5.4,
    cities: [
      { name: 'Hanoi',   lng: 105.8342, lat: 21.0278 },
      { name: 'Hue',     lng: 107.5905, lat: 16.4637 },
      { name: 'Hoi An',  lng: 108.3380, lat: 15.8801 },
      { name: 'Da Nang', lng: 108.2022, lat: 16.0544 },
      { name: 'HCMC',    lng: 106.6297, lat: 10.8231 },
    ],
  },
  {
    label: 'Indonesia', flag: '🇮🇩',
    center: [115.3, -8.3], zoom: 8.5,
    cities: [
      { name: 'Ubud',        lng: 115.2625, lat: -8.5069 },
      { name: 'Canggu',      lng: 115.1322, lat: -8.6478 },
      { name: 'Seminyak',    lng: 115.1630, lat: -8.6913 },
      { name: 'Nusa Penida', lng: 115.5445, lat: -8.7275 },
      { name: 'Sanur',       lng: 115.2625, lat: -8.6783 },
    ],
  },
];

const LIGHT_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const DARK_STYLE  = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

/* ──────────── Great-circle arc builder ──────────── */

function buildArc(from: City, to: City, steps = 50): [number, number][] {
  const pts: [number, number][] = [];
  const dist = Math.sqrt(Math.pow(to.lng - from.lng, 2) + Math.pow(to.lat - from.lat, 2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lng = from.lng + (to.lng - from.lng) * t;
    const lat = from.lat + (to.lat - from.lat) * t;
    const bulge = Math.sin(t * Math.PI) * dist * 0.12;
    pts.push([lng, lat + bulge]);
  }
  return pts;
}

/* ──────────── Component ──────────── */

export default function HeroMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const cancelRef = useRef(false);
  const [phase, setPhase] = useState('');
  const [destLabel, setDestLabel] = useState('');

  const isDark = useCallback(() => document.documentElement.classList.contains('dark'), []);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: isDark() ? DARK_STYLE : LIGHT_STYLE,
      center: [100.5, 20],
      zoom: 3,
      pitch: 30,
      bearing: 0,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
    });

    mapRef.current = map;
    cancelRef.current = false;

    map.on('load', () => {
      // Route line source
      map.addSource('route-line', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      // Spoke line source
      map.addSource('spoke-lines', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Spoke glow
      map.addLayer({
        id: 'spoke-glow',
        type: 'line',
        source: 'spoke-lines',
        paint: {
          'line-color': '#6366f1',
          'line-width': 6,
          'line-opacity': 0.15,
          'line-blur': 5,
        },
      });
      // Spoke lines
      map.addLayer({
        id: 'spoke-main',
        type: 'line',
        source: 'spoke-lines',
        paint: {
          'line-color': '#6366f1',
          'line-width': 2,
          'line-opacity': 0.6,
          'line-dasharray': [3, 3],
        },
        layout: { 'line-cap': 'round' },
      });
      // Route glow
      map.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route-line',
        paint: {
          'line-color': '#f97316',
          'line-width': 10,
          'line-opacity': 0.2,
          'line-blur': 8,
        },
      });
      // Main route line
      map.addLayer({
        id: 'route-main',
        type: 'line',
        source: 'route-line',
        paint: {
          'line-color': '#f97316',
          'line-width': 3,
          'line-opacity': 0.9,
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      });
      // Dashed overlay
      map.addLayer({
        id: 'route-dash',
        type: 'line',
        source: 'route-line',
        paint: {
          'line-color': '#ffffff',
          'line-width': 1.5,
          'line-opacity': 0.4,
          'line-dasharray': [2, 4],
        },
      });

      runLoop(map);
    });

    return () => {
      cancelRef.current = true;
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ──────── Helpers ──────── */
  const sleep = (ms: number) => new Promise<void>((resolve) => {
    const id = setTimeout(() => { if (!cancelRef.current) resolve(); }, ms);
    if (cancelRef.current) clearTimeout(id);
  });

  const clearMarkers = () => {
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
  };

  const clearSources = (map: maplibregl.Map) => {
    const r = map.getSource('route-line') as maplibregl.GeoJSONSource;
    if (r) r.setData({ type: 'FeatureCollection', features: [] });
    const s = map.getSource('spoke-lines') as maplibregl.GeoJSONSource;
    if (s) s.setData({ type: 'FeatureCollection', features: [] });
  };

  /* ──────── Add animated drop-pin marker ──────── */
  const addMarker = (city: City, map: maplibregl.Map, index: number, isHub = false) => {
    const el = document.createElement('div');
    el.className = 'hero-map-marker';
    // Animation goes on inner wrapper so it doesn't override MapLibre's
    // transform-based positioning on the outer element.
    el.innerHTML = `
      <div class="marker-anim ${isHub ? 'hub-anim' : ''}" style="animation-delay: ${index * 0.08}s">
        <div class="marker-shadow"></div>
        <div class="marker-pin">
          <div class="marker-ping"></div>
          <div class="marker-dot ${isHub ? 'hub-dot' : ''}"></div>
        </div>
        <div class="marker-label">${city.name}</div>
      </div>
    `;

    const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([city.lng, city.lat])
      .addTo(map);
    markersRef.current.push(marker);
  };

  /* ──────── Animate spoke lines from hub ──────── */
  const animateSpokes = (map: maplibregl.Map, hub: City, spokes: City[], durationMs = 2000) => {
    return new Promise<void>((resolve) => {
      const arcs = spokes.map(s => buildArc(hub, s, 30));
      const start = performance.now();

      const animate = () => {
        if (cancelRef.current) return;
        const elapsed = performance.now() - start;
        const progress = Math.min(elapsed / durationMs, 1);
        const features: GeoJSON.Feature[] = [];

        arcs.forEach((arc, i) => {
          const spokeStart = (i * 0.15);
          const spokeProgress = Math.max(0, Math.min((progress - spokeStart) / (1 - spokeStart), 1));
          const eased = 1 - Math.pow(1 - spokeProgress, 2);
          const ptsToShow = Math.max(2, Math.floor(eased * arc.length));
          if (ptsToShow >= 2) {
            features.push({
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: arc.slice(0, ptsToShow) },
              properties: {},
            });
          }
        });

        const src = map.getSource('spoke-lines') as maplibregl.GeoJSONSource;
        if (src) src.setData({ type: 'FeatureCollection', features });
        if (progress < 1) requestAnimationFrame(animate);
        else resolve();
      };
      requestAnimationFrame(animate);
    });
  };

  /* ──────── Animate route drawing ──────── */
  const animateRoute = (map: maplibregl.Map, cities: City[], durationMs = 3000) => {
    return new Promise<void>((resolve) => {
      const allArcs: [number, number][][] = [];
      for (let i = 0; i < cities.length - 1; i++) {
        allArcs.push(buildArc(cities[i], cities[i + 1]));
      }
      const totalPts = allArcs.reduce((s, a) => s + a.length, 0);
      const start = performance.now();

      const animate = () => {
        if (cancelRef.current) return;
        const elapsed = performance.now() - start;
        const progress = Math.min(elapsed / durationMs, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const ptsToShow = Math.floor(eased * totalPts);

        const features: GeoJSON.Feature[] = [];
        let shown = 0;
        for (const arc of allArcs) {
          if (shown >= ptsToShow) break;
          const end = Math.min(arc.length, ptsToShow - shown);
          if (end > 1) {
            features.push({
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: arc.slice(0, end) },
              properties: {},
            });
          }
          shown += arc.length;
        }

        const src = map.getSource('route-line') as maplibregl.GeoJSONSource;
        if (src) src.setData({ type: 'FeatureCollection', features });
        if (progress < 1) requestAnimationFrame(animate);
        else resolve();
      };
      requestAnimationFrame(animate);
    });
  };

  /* ──────── 3D Orbit ──────── */
  const orbitCamera = (map: maplibregl.Map, center: [number, number], durationMs = 5000, startBearing = 0, endBearing = 90) => {
    return new Promise<void>((resolve) => {
      const start = performance.now();
      const animate = () => {
        if (cancelRef.current) { resolve(); return; }
        const elapsed = performance.now() - start;
        const progress = Math.min(elapsed / durationMs, 1);
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        const bearing = startBearing + (endBearing - startBearing) * eased;
        const pitch = 40 + Math.sin(progress * Math.PI) * 20;
        map.jumpTo({ center, bearing, pitch });
        if (progress < 1) requestAnimationFrame(animate);
        else resolve();
      };
      requestAnimationFrame(animate);
    });
  };

  /* ──────── Main animation loop ──────── */
  const runLoop = async (map: maplibregl.Map) => {
    let idx = 0;
    while (true) {
      if (cancelRef.current) return;
      const dest = DESTINATIONS[idx % DESTINATIONS.length];
      idx++;

      setDestLabel(`${dest.flag} ${dest.label}`);
      setPhase('Flying to destination…');
      clearMarkers();
      clearSources(map);

      // ── PHASE 1: Fly to destination ──
      map.flyTo({
        center: dest.center,
        zoom: dest.zoom,
        pitch: 35 + Math.random() * 10,
        bearing: -10 + Math.random() * 20,
        duration: 3500,
        essential: true,
      });
      await sleep(2500);
      if (cancelRef.current) return;

      // ── PHASE 2: Drop pins sequentially ──
      setPhase('Scanning places…');
      // Hub first
      addMarker(dest.cities[0], map, 0, true);
      await sleep(700);
      if (cancelRef.current) return;

      // Spokes one by one
      for (let i = 1; i < dest.cities.length; i++) {
        if (cancelRef.current) return;
        addMarker(dest.cities[i], map, i, false);
        await sleep(550);
      }
      await sleep(800);
      if (cancelRef.current) return;

      // ── PHASE 3: Hub & spoke pattern ──
      setPhase('Mapping connections…');
      const hub = dest.cities[0];
      const spokes = dest.cities.slice(1);
      await animateSpokes(map, hub, spokes, 2200);
      if (cancelRef.current) return;
      await sleep(1200);
      if (cancelRef.current) return;

      // ── PHASE 4: Animate main route ──
      setPhase('Optimizing route…');
      const spokeSrc = map.getSource('spoke-lines') as maplibregl.GeoJSONSource;
      if (spokeSrc) spokeSrc.setData({ type: 'FeatureCollection', features: [] });
      await animateRoute(map, dest.cities, 3200);
      if (cancelRef.current) return;
      setPhase('Route ready ✓');

      // ── PHASE 5: 3D Orbit or dwell ──
      if (dest.orbit) {
        await sleep(600);
        if (cancelRef.current) return;
        setPhase('Exploring region…');
        // Re-draw spokes during orbit
        animateSpokes(map, hub, spokes, 4000);
        await orbitCamera(map, dest.center, 5500, map.getBearing(), map.getBearing() + 90);
        if (cancelRef.current) return;
      } else {
        await sleep(2500);
        if (cancelRef.current) return;
      }

      // ── PHASE 6: Zoom out transition ──
      setPhase('');
      setDestLabel('');
      map.flyTo({
        center: dest.center,
        zoom: dest.zoom - 2,
        pitch: 15,
        bearing: 0,
        duration: 2000,
        essential: true,
      });
      await sleep(2200);
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, transparent 50%, var(--color-surface-card, #fff) 100%)',
          opacity: 0.6,
        }}
      />

      {(phase || destLabel) && (
        <div className="absolute bottom-4 left-4 flex items-center gap-2 text-xs font-medium animate-fade-in">
          {destLabel && (
            <span className="bg-black/60 dark:bg-white/10 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg shadow-lg">
              {destLabel}
            </span>
          )}
          {phase && (
            <span className="bg-primary-600/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              {phase}
            </span>
          )}
        </div>
      )}

      <style>{`
        .hero-map-marker {
          /* No animation or transform here — MapLibre controls this
             element's transform for geographic positioning */
          overflow: visible;
        }
        .marker-anim {
          position: relative;
          animation: pinDrop 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
          z-index: 10;
        }
        .marker-anim.hub-anim {
          animation: pinDropHub 0.8s cubic-bezier(0.22, 1, 0.36, 1) both;
          z-index: 20;
        }
        .marker-pin {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .marker-shadow {
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 16px;
          height: 6px;
          background: radial-gradient(ellipse, rgba(0,0,0,0.25), transparent 70%);
          border-radius: 50%;
          animation: shadowGrow 0.6s ease-out both;
        }
        .hub-anim .marker-shadow {
          width: 22px;
          height: 8px;
        }
        .marker-dot {
          width: 10px;
          height: 10px;
          background: #f97316;
          border: 2px solid #fff;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(249,115,22,0.5);
          position: relative;
          z-index: 2;
        }
        .marker-dot.hub-dot {
          width: 14px;
          height: 14px;
          background: #ea580c;
          border: 2.5px solid #fff;
          box-shadow: 0 2px 12px rgba(234,88,12,0.6);
        }
        .marker-ping {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid rgba(249,115,22,0.3);
          background: rgba(249,115,22,0.1);
          animation: markerPulse 2.5s ease-out infinite;
          animation-delay: 0.6s;
          z-index: 1;
        }
        .hub-anim .marker-ping {
          width: 40px;
          height: 40px;
          border: 2px solid rgba(234,88,12,0.4);
          background: rgba(234,88,12,0.15);
        }
        .marker-label {
          position: absolute;
          top: -24px;
          left: 50%;
          transform: translateX(-50%);
          white-space: nowrap;
          font-size: 10px;
          font-weight: 600;
          color: #1e293b;
          text-shadow: 0 0 4px #fff, 0 0 4px #fff, 0 0 8px #fff;
          z-index: 3;
          opacity: 0;
          animation: labelFade 0.3s ease-out 0.5s both;
        }
        .hub-anim .marker-label {
          font-size: 11px;
          font-weight: 700;
          top: -26px;
          color: #ea580c;
        }
        .dark .marker-label {
          color: #e2e8f0;
          text-shadow: 0 0 4px #000, 0 0 6px #000;
        }
        .dark .hub-anim .marker-label {
          color: #fb923c;
        }
        @keyframes pinDrop {
          0%   { opacity: 0; transform: translateY(-40px) scale(0.3); }
          50%  { opacity: 1; transform: translateY(2px) scale(1.1); }
          70%  { transform: translateY(-3px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pinDropHub {
          0%   { opacity: 0; transform: translateY(-60px) scale(0.2); }
          40%  { opacity: 1; transform: translateY(4px) scale(1.2); }
          60%  { transform: translateY(-6px) scale(0.9); }
          80%  { transform: translateY(1px) scale(1.05); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shadowGrow {
          0%   { transform: translateX(-50%) scale(0); opacity: 0; }
          60%  { transform: translateX(-50%) scale(1.3); opacity: 0.3; }
          100% { transform: translateX(-50%) scale(1); opacity: 0.2; }
        }
        @keyframes markerPulse {
          0%   { transform: translate(-50%, -50%) scale(0.6); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
        }
        @keyframes labelFade {
          0%   { opacity: 0; transform: translateX(-50%) translateY(4px); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          0%   { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
