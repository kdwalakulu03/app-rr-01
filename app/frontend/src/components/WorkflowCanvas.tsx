import { useEffect, useRef } from 'react';

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface Waypoint { x: number; y: number; label: string }

export default function WorkflowCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0, h = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      w = rect.width;
      h = rect.height;
    };

    resize();
    window.addEventListener('resize', resize);
    startRef.current = performance.now();

    const isDark = () => document.documentElement.classList.contains('dark');
    const CYCLE = 10000;

    const getWaypoints = (): Waypoint[] => [
      { x: w * 0.08, y: h * 0.62, label: 'Airport' },
      { x: w * 0.24, y: h * 0.28, label: 'Temple' },
      { x: w * 0.44, y: h * 0.68, label: 'Market' },
      { x: w * 0.60, y: h * 0.24, label: 'Old Town' },
      { x: w * 0.78, y: h * 0.52, label: 'Beach' },
      { x: w * 0.93, y: h * 0.30, label: 'Viewpoint' },
    ];

    const lerp = (pts: Waypoint[], t: number) => {
      const n = pts.length - 1;
      const pos = t * n;
      const i = Math.min(Math.floor(pos), n - 1);
      const s = pos - i;
      const a = pts[i], b = pts[Math.min(i + 1, pts.length - 1)];
      return { x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s };
    };

    const draw = (ts: number) => {
      const t = ((ts - startRef.current) % CYCLE) / CYCLE;
      ctx.clearRect(0, 0, w, h);

      const dark = isDark();
      const wp = getWaypoints();

      const C = {
        grid: dark ? 'rgba(99,102,241,0.07)' : 'rgba(99,102,241,0.05)',
        path: dark ? 'rgba(99,102,241,0.45)' : 'rgba(79,70,229,0.3)',
        dot:  dark ? 'rgba(129,140,248,0.85)' : 'rgba(79,70,229,0.75)',
        ring: dark ? 'rgba(99,102,241,0.12)' : 'rgba(79,70,229,0.08)',
        lbl:  dark ? 'rgba(148,163,184,0.7)' : 'rgba(100,116,139,0.75)',
        dist: dark ? 'rgba(249,115,22,0.75)' : 'rgba(234,88,12,0.85)',
        trav: '#f97316',
        phase: dark ? 'rgba(148,163,184,0.85)' : 'rgba(71,85,105,0.85)',
      };

      // Dot grid
      ctx.fillStyle = C.grid;
      for (let gx = 20; gx < w; gx += 22)
        for (let gy = 20; gy < h; gy += 22) {
          ctx.beginPath();
          ctx.arc(gx, gy, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }

      // Phases
      const wpProg  = easeInOutCubic(Math.min(t / 0.35, 1));
      const pathProg = easeInOutCubic(Math.max(0, Math.min((t - 0.18) / 0.38, 1)));
      const travProg = easeInOutCubic(Math.max(0, Math.min((t - 0.48) / 0.46, 1)));

      // Draw path
      if (pathProg > 0) {
        const segs = wp.length - 1;
        const upTo = pathProg * segs;

        ctx.save();
        ctx.strokeStyle = C.path;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([7, 5]);
        ctx.lineDashOffset = -ts * 0.02;
        ctx.beginPath();
        ctx.moveTo(wp[0].x, wp[0].y);

        for (let i = 1; i <= Math.floor(upTo); i++) ctx.lineTo(wp[i].x, wp[i].y);
        const pi = Math.floor(upTo), pt = upTo - pi;
        if (pi < segs && pt > 0) {
          ctx.lineTo(wp[pi].x + (wp[pi + 1].x - wp[pi].x) * pt,
                     wp[pi].y + (wp[pi + 1].y - wp[pi].y) * pt);
        }
        ctx.stroke();
        ctx.restore();

        // Distance labels
        ctx.font = '600 9px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = C.dist;
        for (let i = 0; i < Math.floor(upTo); i++) {
          const a = wp[i], b = wp[i + 1];
          const km = (Math.hypot(b.x - a.x, b.y - a.y) / 14).toFixed(1);
          ctx.fillText(`${km} km`, (a.x + b.x) / 2, (a.y + b.y) / 2 - 10);
        }
      }

      // Waypoints
      wp.forEach((p, i) => {
        const appear = wpProg * wp.length;
        if (appear < i) return;
        const s = Math.min(appear - i, 1);
        const pulse = 0.5 + 0.5 * Math.sin(ts * 0.003 + i * 1.3);

        ctx.beginPath();
        ctx.arc(p.x, p.y, (13 + pulse * 4) * s, 0, Math.PI * 2);
        ctx.fillStyle = C.ring;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, 4.5 * s, 0, Math.PI * 2);
        ctx.fillStyle = C.dot;
        ctx.fill();

        ctx.globalAlpha = s;
        ctx.font = '500 10px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = C.lbl;
        ctx.fillText(p.label, p.x, p.y - 20);
        ctx.globalAlpha = 1;
      });

      // Traveler
      if (travProg > 0) {
        const p = lerp(wp, travProg);
        const pulse = 0.6 + 0.4 * Math.sin(ts * 0.006);

        ctx.beginPath();
        ctx.arc(p.x, p.y, 26 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(249,115,22,${0.07 * pulse})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, 16 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(249,115,22,${0.12 * pulse})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = C.trav;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = C.trav;
        ctx.textAlign = 'center';
        ctx.fillText('You', p.x, p.y + 22);
      }

      // Phase label (bottom-right)
      const phases = [
        { label: 'Discovering places…', s: 0, e: 0.28 },
        { label: 'Optimizing route…',   s: 0.24, e: 0.54 },
        { label: 'Navigating live…',    s: 0.50, e: 0.96 },
      ];
      for (const ph of phases) {
        if (t < ph.s || t > ph.e) continue;
        const fadeIn  = Math.min((t - ph.s) / 0.04, 1);
        const fadeOut = Math.min((ph.e - t) / 0.04, 1);
        ctx.globalAlpha = Math.min(fadeIn, fadeOut);
        ctx.font = '600 11px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillStyle = C.phase;
        ctx.fillText(ph.label, w - 14, h - 14);
        ctx.globalAlpha = 1;
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />;
}
