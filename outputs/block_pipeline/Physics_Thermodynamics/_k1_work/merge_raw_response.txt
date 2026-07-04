import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Thermometer, Maximize, Gauge, Activity, Info, Box, LineChart, GitMerge, Droplets } from 'lucide-react';

// --- Shared Helpers & Constants ---
const R = 8.314; // Ideal gas constant in L⋅kPa/(mol⋅K)
const GAMMA = 1.4; // Heat capacity ratio for diatomic gas

const mapRange = (val: number, inMin: number, inMax: number, outMin: number, outMax: number) => {
  return ((val - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
};

// --- Custom Icons ---
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>;
const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>;
const ResetIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>;
const InfoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>;
const FlameIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>;
const SnowflakeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line><path d="m20 16-4-4 4-4"></path><path d="m4 8 4 4-4 4"></path><path d="m16 4-4 4-4-4"></path><path d="m8 20 4-4 4 4"></path></svg>;
const ThermometerCustomIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path></svg>;
const DropletIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a5 5 0 0 0 5-5c0-2-2.5-7-5-12-2.5 5-5 10-5 12a5 5 0 0 0 5 5z"></path></svg>;
const ActivityCustomIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;

// ==========================================
// BLOCK 1: Particle Box
// ==========================================
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
}

const NUM_PARTICLES = 80;
const PARTICLE_RADIUS = 4;
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const MIN_TEMP = 50;
const MAX_TEMP = 1000;
const MIN_VOL = 20;
const MAX_VOL = 100;

const getTemperatureColor = (temp: number) => {
  const ratio = (temp - MIN_TEMP) / (MAX_TEMP - MIN_TEMP);
  const r = Math.floor(255 * ratio);
  const b = Math.floor(255 * (1 - ratio));
  const g = Math.floor(50 + 100 * ratio);
  return `rgb(${r}, ${g}, ${b})`;
};

function ParticleBox() {
  const [temperature, setTemperature] = useState<number>(300);
  const [volume, setVolume] = useState<number>(100);
  const [pressure, setPressure] = useState<number>(1.0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const particles: Particle[] = [];
    for (let i = 0; i < NUM_PARTICLES; i++) {
      const angle = Math.random() * Math.PI * 2;
      particles.push({
        x: Math.random() * (CANVAS_WIDTH - PARTICLE_RADIUS * 2) + PARTICLE_RADIUS,
        y: Math.random() * (CANVAS_HEIGHT - PARTICLE_RADIUS * 2) + PARTICLE_RADIUS,
        vx: Math.cos(angle),
        vy: Math.sin(angle),
        radius: PARTICLE_RADIUS,
        mass: 1,
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const animate = (time: number) => {
      const deltaTime = (time - lastTime) / 16.66;
      lastTime = time;

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      const activeWidth = (volume / 100) * CANVAS_WIDTH;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(0, 0, activeWidth, CANVAS_HEIGHT);

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, activeWidth, CANVAS_HEIGHT);

      ctx.fillStyle = '#334155';
      ctx.fillRect(activeWidth, 0, CANVAS_WIDTH - activeWidth, CANVAS_HEIGHT);
      
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(activeWidth + 10, CANVAS_HEIGHT / 2 - 40, 20, 80);
      ctx.fillRect(activeWidth + 30, CANVAS_HEIGHT / 2 - 10, CANVAS_WIDTH - activeWidth, 20);

      const particles = particlesRef.current;
      const speedMultiplier = Math.sqrt(temperature / 300) * 2.5;
      const particleColor = getTemperatureColor(temperature);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx * speedMultiplier * deltaTime;
        p.y += p.vy * speedMultiplier * deltaTime;

        if (p.x - p.radius < 0) { p.x = p.radius; p.vx *= -1; }
        if (p.x + p.radius > activeWidth) { p.x = activeWidth - p.radius; p.vx *= -1; }
        if (p.y - p.radius < 0) { p.y = p.radius; p.vy *= -1; }
        if (p.y + p.radius > CANVAS_HEIGHT) { p.y = CANVAS_HEIGHT - p.radius; p.vy *= -1; }

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p2.x - p.x;
          const dy = p2.y - p.y;
          const dist = Math.hypot(dx, dy);
          const minDist = p.radius + p2.radius;

          if (dist < minDist) {
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;
            
            p.x -= (nx * overlap) / 2;
            p.y -= (ny * overlap) / 2;
            p2.x += (nx * overlap) / 2;
            p2.y += (ny * overlap) / 2;

            const kx = p.vx - p2.vx;
            const ky = p.vy - p2.vy;
            const dotProduct = nx * kx + ny * ky;
            
            p.vx -= dotProduct * nx;
            p.vy -= dotProduct * ny;
            p2.vx += dotProduct * nx;
            p2.vy += dotProduct * ny;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = particleColor;
        ctx.fill();
        
        ctx.shadowBlur = 10;
        ctx.shadowColor = particleColor;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [temperature, volume]);

  useEffect(() => {
    const k = 100 / 300;
    const calculatedPressure = k * (temperature / volume);
    setPressure(calculatedPressure);
  }, [temperature, volume]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="relative bg-slate-950 rounded-2xl overflow-hidden shadow-inner border-4 border-slate-800 flex items-center justify-center" style={{ height: CANVAS_HEIGHT }}>
              <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="max-w-full h-auto" />
              <div className="absolute top-4 left-4 bg-black/50 text-slate-100 px-3 py-1 rounded-md text-sm font-mono backdrop-blur-md border border-white/10">
                V = {volume.toFixed(0)} L
              </div>
              <div className="absolute bottom-4 left-4 bg-black/50 text-slate-100 px-3 py-1 rounded-md text-sm font-mono backdrop-blur-md border border-white/10">
                T = {temperature.toFixed(0)} K
              </div>
            </div>
            <p className="text-sm text-slate-400 text-center italic">
              Particles represent gas molecules. Watch how their speed changes with temperature and how they interact with the container volume.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -z-0"></div>
              <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2 relative z-10">
                <Gauge className="w-5 h-5 text-blue-400" />
                System Pressure
              </h2>
              <div className="flex items-end gap-2 relative z-10">
                <span className="text-5xl font-black text-slate-100 tracking-tighter">
                  {pressure.toFixed(2)}
                </span>
                <span className="text-xl font-bold text-slate-400 mb-1">atm</span>
              </div>
              <div className="mt-4 h-3 w-full bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-400 via-purple-500 to-red-500 transition-all duration-300 ease-out"
                  style={{ width: `${Math.min((pressure / 5) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-400 mt-2 font-medium">
                Pressure increases with higher temperature or lower volume.
              </p>
            </div>

            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 shadow-sm flex-1 flex flex-col gap-8">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-200 flex items-center gap-2">
                    <Thermometer className="w-5 h-5 text-red-400" />
                    Temperature
                  </label>
                  <span className="font-mono font-bold text-red-400 bg-red-900/20 px-2 py-1 rounded-md">
                    {temperature} K
                  </span>
                </div>
                <input
                  type="range" min={MIN_TEMP} max={MAX_TEMP} value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
                <div className="flex justify-between text-xs text-slate-400 font-medium">
                  <span>Cold ({MIN_TEMP}K)</span>
                  <span>Hot ({MAX_TEMP}K)</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-200 flex items-center gap-2">
                    <Maximize className="w-5 h-5 text-emerald-400" />
                    Volume
                  </label>
                  <span className="font-mono font-bold text-emerald-400 bg-emerald-900/20 px-2 py-1 rounded-md">
                    {volume} L
                  </span>
                </div>
                <input
                  type="range" min={MIN_VOL} max={MAX_VOL} value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-slate-400 font-medium">
                  <span>Compressed</span>
                  <span>Expanded</span>
                </div>
              </div>

              <div className="mt-auto bg-orange-900/20 p-4 rounded-xl border border-orange-900/50">
                <h3 className="text-sm font-bold text-orange-300 mb-2">Key Concept</h3>
                <p className="text-sm text-orange-200/80 leading-relaxed">
                  According to the <strong>Ideal Gas Law</strong>, pressure is directly proportional to temperature and inversely proportional to volume.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// BLOCK 2: PV/nT Chart
// ==========================================
function PvNtChart() {
  const [volume, setVolume] = useState<number>(50);
  const [temperature, setTemperature] = useState<number>(300);
  const [moles, setMoles] = useState<number>(2);

  const pressure = (moles * R * temperature) / volume;
  const pv = pressure * volume;
  const nt = moles * temperature;

  const chartWidth = 400;
  const chartHeight = 250;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const maxNt = 10 * 1000;
  const maxPv = maxNt * R;
  const mapNtToX = (val: number) => padding.left + (val / maxNt) * innerWidth;
  const mapPvToY = (val: number) => padding.top + innerHeight - (val / maxPv) * innerHeight;

  const maxV = 100;
  const maxP = Math.max(1000, Math.ceil(((moles * R * temperature) / 10) / 500) * 500);
  const mapVToX = (val: number) => padding.left + (val / maxV) * innerWidth;
  const mapPToY = (val: number) => padding.top + innerHeight - (val / maxP) * innerHeight;

  const isothermPath = useMemo(() => {
    let path = '';
    for (let v = 10; v <= maxV; v += 2) {
      const p = (moles * R * temperature) / v;
      const x = mapVToX(v);
      const y = Math.max(padding.top, mapPToY(p));
      if (v === 10) path += `M ${x} ${y} `;
      else path += `L ${x} ${y} `;
    }
    return path;
  }, [moles, temperature, maxP]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 shadow-2xl rounded-3xl p-6 border border-slate-800">
            <h2 className="text-xl font-bold text-slate-200 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              System Controls
            </h2>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Volume (V)</label>
                  <span className="text-lg font-bold text-orange-400">{volume.toFixed(1)} L</span>
                </div>
                <input 
                  type="range" min="10" max="100" step="1" 
                  value={volume} onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Temperature (T)</label>
                  <span className="text-lg font-bold text-red-400">{temperature.toFixed(0)} K</span>
                </div>
                <input 
                  type="range" min="100" max="1000" step="10" 
                  value={temperature} onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Moles (n)</label>
                  <span className="text-lg font-bold text-amber-400">{moles.toFixed(1)} mol</span>
                </div>
                <input 
                  type="range" min="1" max="10" step="0.1" 
                  value={moles} onChange={(e) => setMoles(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            </div>

            <div className="mt-8 p-4 bg-slate-800 rounded-2xl text-slate-100 shadow-inner border border-slate-700">
              <div className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-1">Resulting Pressure (P)</div>
              <div className="text-4xl font-black tracking-tight text-orange-400">
                {pressure.toFixed(1)} <span className="text-xl font-semibold text-slate-500">kPa</span>
              </div>
              <div className="mt-4 text-xs text-slate-400 font-mono bg-slate-950 p-2 rounded-lg">
                P = (n × R × T) / V<br/>
                P = ({moles} × 8.314 × {temperature}) / {volume}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 shadow-xl rounded-3xl p-6 border border-slate-800 flex flex-col">
            <h3 className="text-lg font-bold text-slate-200 mb-1">PV vs nT Relationship</h3>
            <p className="text-xs text-slate-400 mb-4">The slope of this line is the Ideal Gas Constant (R ≈ 8.314)</p>
            
            <div className="flex-grow flex items-center justify-center bg-slate-950/50 rounded-xl border border-slate-800">
              <svg width={chartWidth} height={chartHeight} className="overflow-visible">
                {[0, 0.25, 0.5, 0.75, 1].map(tick => (
                  <g key={`grid-y-${tick}`}>
                    <line x1={padding.left} y1={padding.top + innerHeight * tick} x2={chartWidth - padding.right} y2={padding.top + innerHeight * tick} stroke="#334155" strokeDasharray="4 4" />
                    <text x={padding.left - 10} y={padding.top + innerHeight * tick + 4} fontSize="10" fill="#94a3b8" textAnchor="end">{Math.round(maxPv * (1 - tick))}</text>
                  </g>
                ))}
                {[0, 0.25, 0.5, 0.75, 1].map(tick => (
                  <g key={`grid-x-${tick}`}>
                    <line x1={padding.left + innerWidth * tick} y1={padding.top} x2={padding.left + innerWidth * tick} y2={chartHeight - padding.bottom} stroke="#334155" strokeDasharray="4 4" />
                    <text x={padding.left + innerWidth * tick} y={chartHeight - padding.bottom + 20} fontSize="10" fill="#94a3b8" textAnchor="middle">{Math.round(maxNt * tick)}</text>
                  </g>
                ))}

                <line x1={padding.left} y1={chartHeight - padding.bottom} x2={chartWidth - padding.right} y2={chartHeight - padding.bottom} stroke="#64748b" strokeWidth="2" />
                <line x1={padding.left} y1={padding.top} x2={padding.left} y2={chartHeight - padding.bottom} stroke="#64748b" strokeWidth="2" />
                
                <text x={padding.left + innerWidth / 2} y={chartHeight - 5} fontSize="12" fontWeight="bold" fill="#cbd5e1" textAnchor="middle">nT (mol·K)</text>
                <text x={15} y={padding.top + innerHeight / 2} fontSize="12" fontWeight="bold" fill="#cbd5e1" textAnchor="middle" transform={`rotate(-90, 15, ${padding.top + innerHeight / 2})`}>PV (L·kPa)</text>

                <line x1={mapNtToX(0)} y1={mapPvToY(0)} x2={mapNtToX(maxNt)} y2={mapPvToY(maxNt * R)} stroke="#f97316" strokeWidth="3" strokeLinecap="round" />

                <circle cx={mapNtToX(nt)} cy={mapPvToY(pv)} r="6" fill="#ef4444" className="transition-all duration-300 ease-out" />
                <circle cx={mapNtToX(nt)} cy={mapPvToY(pv)} r="12" fill="#ef4444" opacity="0.3" className="transition-all duration-300 ease-out animate-pulse" />
                
                <g transform={`translate(${mapNtToX(nt) - 40}, ${mapPvToY(pv) - 15})`} className="transition-all duration-300 ease-out">
                  <rect x="0" y="-15" width="80" height="20" rx="4" fill="#1e293b" opacity="0.8" />
                  <text x="40" y="-2" fontSize="10" fill="white" textAnchor="middle">PV = {Math.round(pv)}</text>
                </g>
              </svg>
            </div>
          </div>

          <div className="bg-slate-900 shadow-xl rounded-3xl p-6 border border-slate-800 flex flex-col">
            <h3 className="text-lg font-bold text-slate-200 mb-1">P vs V Isotherm</h3>
            <p className="text-xs text-slate-400 mb-4">Inverse relationship (Boyle's Law) at constant T and n</p>
            
            <div className="flex-grow flex items-center justify-center bg-slate-950/50 rounded-xl border border-slate-800">
              <svg width={chartWidth} height={chartHeight} className="overflow-visible">
                {[0, 0.25, 0.5, 0.75, 1].map(tick => (
                  <g key={`grid-y-pv-${tick}`}>
                    <line x1={padding.left} y1={padding.top + innerHeight * tick} x2={chartWidth - padding.right} y2={padding.top + innerHeight * tick} stroke="#334155" strokeDasharray="4 4" />
                    <text x={padding.left - 10} y={padding.top + innerHeight * tick + 4} fontSize="10" fill="#94a3b8" textAnchor="end">{Math.round(maxP * (1 - tick))}</text>
                  </g>
                ))}
                {[0, 0.25, 0.5, 0.75, 1].map(tick => (
                  <g key={`grid-x-pv-${tick}`}>
                    <line x1={padding.left + innerWidth * tick} y1={padding.top} x2={padding.left + innerWidth * tick} y2={chartHeight - padding.bottom} stroke="#334155" strokeDasharray="4 4" />
                    <text x={padding.left + innerWidth * tick} y={chartHeight - padding.bottom + 20} fontSize="10" fill="#94a3b8" textAnchor="middle">{Math.round(maxV * tick)}</text>
                  </g>
                ))}

                <line x1={padding.left} y1={chartHeight - padding.bottom} x2={chartWidth - padding.right} y2={chartHeight - padding.bottom} stroke="#64748b" strokeWidth="2" />
                <line x1={padding.left} y1={padding.top} x2={padding.left} y2={chartHeight - padding.bottom} stroke="#64748b" strokeWidth="2" />
                
                <text x={padding.left + innerWidth / 2} y={chartHeight - 5} fontSize="12" fontWeight="bold" fill="#cbd5e1" textAnchor="middle">Volume (L)</text>
                <text x={15} y={padding.top + innerHeight / 2} fontSize="12" fontWeight="bold" fill="#cbd5e1" textAnchor="middle" transform={`rotate(-90, 15, ${padding.top + innerHeight / 2})`}>Pressure (kPa)</text>

                <path d={isothermPath} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300 ease-out" />

                <circle cx={mapVToX(volume)} cy={mapPToY(pressure)} r="6" fill="#ef4444" className="transition-all duration-300 ease-out" />
                <circle cx={mapVToX(volume)} cy={mapPToY(pressure)} r="12" fill="#ef4444" opacity="0.3" className="transition-all duration-300 ease-out animate-pulse" />
                
                <g transform={`translate(${mapVToX(volume) + 15}, ${mapPToY(pressure) - 15})`} className="transition-all duration-300 ease-out">
                  <rect x="0" y="-15" width="70" height="32" rx="4" fill="#1e293b" opacity="0.8" />
                  <text x="35" y="-2" fontSize="10" fill="white" textAnchor="middle">V: {volume.toFixed(1)}</text>
                  <text x="35" y="10" fontSize="10" fill="white" textAnchor="middle">P: {pressure.toFixed(1)}</text>
                </g>
              </svg>
            </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700 shadow-sm">
              <h4 className="font-bold text-orange-400 mb-2">Boyle's Law</h4>
              <p className="text-sm text-slate-300">At constant <span className="font-semibold">T</span> and <span className="font-semibold">n</span>, Pressure is inversely proportional to Volume (<span className="italic font-serif">P ∝ 1/V</span>).</p>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700 shadow-sm">
              <h4 className="font-bold text-red-400 mb-2">Charles's Law</h4>
              <p className="text-sm text-slate-300">At constant <span className="font-semibold">P</span> and <span className="font-semibold">n</span>, Volume is directly proportional to Temperature (<span className="italic font-serif">V ∝ T</span>).</p>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700 shadow-sm">
              <h4 className="font-bold text-amber-400 mb-2">Avogadro's Law</h4>
              <p className="text-sm text-slate-300">At constant <span className="font-semibold">P</span> and <span className="font-semibold">T</span>, Volume is directly proportional to Moles (<span className="italic font-serif">V ∝ n</span>).</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// BLOCK 3: Isothermal vs Adiabatic
// ==========================================
const V_MIN = 1;
const V_MAX = 5;
const P_INITIAL = 1;

const calculatePressure = (v: number, process: 'isothermal' | 'adiabatic') => {
  if (process === 'isothermal') return P_INITIAL * (V_MIN / v);
  return P_INITIAL * Math.pow(V_MIN / v, GAMMA);
};

const calculateTemperature = (p: number, v: number) => p * v;

const calculateWork = (v: number, process: 'isothermal' | 'adiabatic') => {
  if (process === 'isothermal') return Math.log(v / V_MIN);
  return (P_INITIAL * V_MIN - calculatePressure(v, 'adiabatic') * v) / (GAMMA - 1);
};

function IsothermalVsAdiabatic() {
  const [volume, setVolume] = useState<number>(V_MIN);
  const [process, setProcess] = useState<'isothermal' | 'adiabatic'>('isothermal');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [direction, setDirection] = useState<number>(1);

  const currentPressure = calculatePressure(volume, process);
  const currentTemperature = calculateTemperature(currentPressure, volume);
  const currentWork = calculateWork(volume, process);

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      if (!isPlaying) return;
      const deltaTime = time - lastTime;
      lastTime = time;

      setVolume((prevV) => {
        const speed = 0.002;
        let nextV = prevV + direction * speed * deltaTime;
        if (nextV >= V_MAX) { nextV = V_MAX; setDirection(-1); setIsPlaying(false); }
        else if (nextV <= V_MIN) { nextV = V_MIN; setDirection(1); setIsPlaying(false); }
        return nextV;
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    if (isPlaying) animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, direction]);

  const chartWidth = 400;
  const chartHeight = 300;
  const padding = 50;
  const innerWidth = chartWidth - padding * 2;
  const innerHeight = chartHeight - padding * 2;

  const mapVToX = (v: number) => padding + ((v - 0) / (V_MAX + 0.5)) * innerWidth;
  const mapPToY = (p: number) => chartHeight - padding - ((p - 0) / 1.2) * innerHeight;

  const generateCurvePath = (proc: 'isothermal' | 'adiabatic') => {
    let path = '';
    for (let v = V_MIN; v <= V_MAX; v += 0.1) {
      const p = calculatePressure(v, proc);
      const x = mapVToX(v);
      const y = mapPToY(p);
      if (v === V_MIN) path += `M ${x} ${y} `;
      else path += `L ${x} ${y} `;
    }
    return path;
  };

  const generateAreaPath = () => {
    let path = '';
    for (let v = V_MIN; v <= volume; v += 0.05) {
      const p = calculatePressure(v, process);
      const x = mapVToX(v);
      const y = mapPToY(p);
      if (v === V_MIN) path += `M ${x} ${y} `;
      else path += `L ${x} ${y} `;
    }
    path += `L ${mapVToX(volume)} ${mapPToY(0)} L ${mapVToX(V_MIN)} ${mapPToY(0)} Z`;
    return path;
  };

  const gasHue = mapRange(currentTemperature, 0.5, 1.0, 220, 0);
  const gasColor = `hsla(${gasHue}, 80%, 60%, 0.6)`;

  return (
    <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="flex flex-col gap-6">
        <div className="bg-slate-900 shadow-xl rounded-3xl p-6 border border-slate-800">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-100">
            <InfoIcon /> Select Process
          </h2>
          <div className="flex gap-4">
            <button
              onClick={() => setProcess('isothermal')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 border-2 ${
                process === 'isothermal' 
                  ? 'bg-orange-900/30 border-orange-500 text-orange-400 shadow-md scale-105' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Isothermal (T = const)
            </button>
            <button
              onClick={() => setProcess('adiabatic')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 border-2 ${
                process === 'adiabatic' 
                  ? 'bg-red-900/30 border-red-500 text-red-400 shadow-md scale-105' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Adiabatic (Q = 0)
            </button>
          </div>
          <div className="mt-4 text-sm text-slate-300 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            {process === 'isothermal' ? (
              <p><strong>Isothermal:</strong> The gas expands slowly, absorbing heat from the surroundings to maintain a constant temperature. Pressure drops inversely with volume (Boyle's Law).</p>
            ) : (
              <p><strong>Adiabatic:</strong> The gas expands rapidly in an insulated container. No heat enters or leaves. The gas does work at the expense of its internal energy, causing the temperature to drop.</p>
            )}
          </div>
        </div>

        <div className="bg-slate-900 shadow-xl rounded-3xl p-6 border border-slate-800 flex flex-col items-center">
          <h2 className="text-xl font-bold mb-6 w-full text-left text-slate-100">Gas Chamber</h2>
          <svg width="100%" height="140" viewBox="0 0 300 140" className="overflow-visible">
            <rect x="20" y="20" width="260" height="100" fill="#1e293b" stroke="#475569" strokeWidth="4" rx="4" />
            <rect x="22" y="22" width={mapRange(volume, V_MIN, V_MAX, 40, 240)} height="96" fill={gasColor} className="transition-colors duration-200" />
            <g opacity="0.5">
              {Array.from({ length: 20 }).map((_, i) => {
                const px = 25 + ((i * 37) % mapRange(volume, V_MIN, V_MAX, 30, 230));
                const py = 25 + ((i * 19) % 90);
                return <circle key={i} cx={px} cy={py} r="2" fill="#fff" />;
              })}
            </g>
            <rect x={22 + mapRange(volume, V_MIN, V_MAX, 40, 240)} y="18" width="12" height="104" fill="#334155" rx="2" />
            <rect x={34 + mapRange(volume, V_MIN, V_MAX, 40, 240)} y="66" width={260 - mapRange(volume, V_MIN, V_MAX, 40, 240)} height="8" fill="#94a3b8" />
            {process === 'isothermal' && isPlaying && direction === 1 && (
              <g className="animate-pulse">
                <path d="M 60 130 Q 70 110 80 130" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round"/>
                <path d="M 100 130 Q 110 110 120 130" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round"/>
                <path d="M 140 130 Q 150 110 160 130" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round"/>
                <text x="110" y="145" fontSize="10" fill="#ef4444" textAnchor="middle" fontWeight="bold">Heat Entering (Q &gt; 0)</text>
              </g>
            )}
            {process === 'adiabatic' && (
              <rect x="16" y="16" width="268" height="108" fill="none" stroke="#fbbf24" strokeWidth="6" strokeDasharray="8 4" rx="6" />
            )}
          </svg>
          {process === 'adiabatic' && <div className="text-xs text-amber-500 font-bold mt-2">Insulated Walls (Q = 0)</div>}

          <div className="w-full mt-8 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsPlaying(!isPlaying)} className="flex items-center justify-center w-12 h-12 bg-slate-700 text-white rounded-full hover:bg-slate-600 transition-colors shadow-lg">
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </button>
              <button onClick={() => { setIsPlaying(false); setVolume(V_MIN); setDirection(1); }} className="flex items-center justify-center w-12 h-12 bg-slate-800 border-2 border-slate-700 text-slate-300 rounded-full hover:bg-slate-700 transition-colors shadow-sm">
                <ResetIcon />
              </button>
              <div className="flex-1 px-4">
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                  <span>V = 1.0</span><span>Volume</span><span>V = 5.0</span>
                </div>
                <input type="range" min={V_MIN} max={V_MAX} step="0.01" value={volume} onChange={(e) => { setIsPlaying(false); setVolume(parseFloat(e.target.value)); }} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="bg-slate-900 shadow-xl rounded-3xl p-6 border border-slate-800 flex flex-col items-center">
          <h2 className="text-xl font-bold mb-2 w-full text-left text-slate-100">P-V Diagram</h2>
          <div className="relative w-full max-w-[400px] aspect-[4/3] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner">
            <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
              {Array.from({ length: 6 }).map((_, i) => (
                <g key={`grid-${i}`}>
                  <line x1={padding} y1={mapPToY(i * 0.2)} x2={chartWidth - padding} y2={mapPToY(i * 0.2)} stroke="#334155" strokeWidth="1" />
                  <line x1={mapVToX(i)} y1={padding} x2={mapVToX(i)} y2={chartHeight - padding} stroke="#334155" strokeWidth="1" />
                </g>
              ))}
              <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding + 20} y2={chartHeight - padding} stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
              <line x1={padding} y1={chartHeight - padding} x2={padding} y2={padding - 20} stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
              <text x={chartWidth - padding + 10} y={chartHeight - padding + 20} fontSize="14" fill="#94a3b8" fontWeight="bold">V</text>
              <text x={padding - 20} y={padding - 10} fontSize="14" fill="#94a3b8" fontWeight="bold">P</text>

              <path d={generateAreaPath()} fill={process === 'isothermal' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(239, 68, 68, 0.2)'} />
              <path d={generateCurvePath('isothermal')} fill="none" stroke="#f97316" strokeWidth={process === 'isothermal' ? 4 : 2} strokeDasharray={process === 'isothermal' ? 'none' : '4 4'} opacity={process === 'isothermal' ? 1 : 0.4} />
              <text x={mapVToX(4.5)} y={mapPToY(calculatePressure(4.5, 'isothermal')) - 10} fontSize="12" fill="#f97316" fontWeight="bold" opacity={process === 'isothermal' ? 1 : 0.4}>Isothermal</text>
              <path d={generateCurvePath('adiabatic')} fill="none" stroke="#ef4444" strokeWidth={process === 'adiabatic' ? 4 : 2} strokeDasharray={process === 'adiabatic' ? 'none' : '4 4'} opacity={process === 'adiabatic' ? 1 : 0.4} />
              <text x={mapVToX(3.5)} y={mapPToY(calculatePressure(3.5, 'adiabatic')) - 10} fontSize="12" fill="#ef4444" fontWeight="bold" opacity={process === 'adiabatic' ? 1 : 0.4}>Adiabatic</text>
              <circle cx={mapVToX(volume)} cy={mapPToY(currentPressure)} r="6" fill={process === 'isothermal' ? '#f97316' : '#ef4444'} stroke="#1e293b" strokeWidth="2" className="transition-all duration-75" />
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                </marker>
              </defs>
            </svg>
          </div>
        </div>

        <div className="bg-slate-800 text-white shadow-xl rounded-3xl p-6 border border-slate-700 grid grid-cols-2 gap-4">
          <div className="bg-slate-900/50 p-4 rounded-2xl">
            <div className="text-slate-400 text-sm font-semibold mb-1">Volume (V)</div>
            <div className="text-3xl font-mono font-light">{volume.toFixed(2)}</div>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-2xl">
            <div className="text-slate-400 text-sm font-semibold mb-1">Pressure (P)</div>
            <div className="text-3xl font-mono font-light">{currentPressure.toFixed(2)}</div>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-2xl">
            <div className="text-slate-400 text-sm font-semibold mb-1">Temperature (T)</div>
            <div className="text-3xl font-mono font-light">{currentTemperature.toFixed(2)}</div>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-2xl">
            <div className="text-slate-400 text-sm font-semibold mb-1">Work Done (W)</div>
            <div className="text-3xl font-mono font-light">{currentWork.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// BLOCK 4: Phase Diagram
// ==========================================
type RegionKey = 'solid' | 'liquid' | 'gas' | 'supercritical' | 'triple' | 'critical' | null;

const REGION_DATA: Record<string, any> = {
  solid: { title: 'Solid Phase', subtitle: 'Rigid Lattice Structure', description: 'Molecules are tightly packed in a regular pattern and vibrate in place.', color: 'text-blue-400', bgLight: 'bg-blue-900/20', properties: [{ label: 'Shape', value: 'Definite' }, { label: 'Volume', value: 'Definite' }, { label: 'Compressibility', value: 'Very Low' }] },
  liquid: { title: 'Liquid Phase', subtitle: 'Fluid & Cohesive', description: 'Molecules are close together but can slide past one another.', color: 'text-teal-400', bgLight: 'bg-teal-900/20', properties: [{ label: 'Shape', value: 'Indefinite' }, { label: 'Volume', value: 'Definite' }, { label: 'Compressibility', value: 'Low' }] },
  gas: { title: 'Gas Phase', subtitle: 'Highly Energetic', description: 'Molecules move rapidly and freely, spreading out to fill any container.', color: 'text-orange-400', bgLight: 'bg-orange-900/20', properties: [{ label: 'Shape', value: 'Indefinite' }, { label: 'Volume', value: 'Indefinite' }, { label: 'Compressibility', value: 'High' }] },
  supercritical: { title: 'Supercritical Fluid', subtitle: 'Beyond the Critical Point', description: 'Distinct liquid and gas phases do not exist.', color: 'text-purple-400', bgLight: 'bg-purple-900/20', properties: [{ label: 'Density', value: 'Liquid-like' }, { label: 'Viscosity', value: 'Gas-like' }] },
  triple: { title: 'Triple Point', subtitle: 'Thermodynamic Equilibrium', description: 'Exact temperature and pressure where solid, liquid, and gas coexist.', color: 'text-rose-400', bgLight: 'bg-rose-900/20', properties: [{ label: 'Degrees of Freedom', value: 'Zero' }, { label: 'Coexisting Phases', value: 'Solid, Liquid, Gas' }] },
  critical: { title: 'Critical Point', subtitle: 'End of the Phase Boundary', description: 'Beyond this point, there is no distinction between liquid and gas.', color: 'text-indigo-400', bgLight: 'bg-indigo-900/20', properties: [{ label: 'Latent Heat', value: 'Zero' }, { label: 'Surface Tension', value: 'Zero' }] },
};

function PhaseDiagram() {
  const [hovered, setHovered] = useState<RegionKey>(null);
  const activeData = hovered ? REGION_DATA[hovered] : null;

  return (
    <div className="max-w-6xl w-full mx-auto flex flex-col gap-6">
      <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col lg:flex-row">
        <div className="flex-1 p-6 md:p-10 relative flex items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-800">
          <div className="w-full max-w-lg aspect-square relative">
            <svg viewBox="-15 -10 130 130" className="w-full h-full drop-shadow-sm" onMouseLeave={() => setHovered(null)}>
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect x="0" y="0" width="100" height="100" fill="url(#grid)" />

              <g className="transition-opacity duration-300">
                <path d="M 0 95 Q 20 85 40 70 Q 45 35 50 0 L 0 0 Z" className={`cursor-pointer transition-all duration-300 ${hovered === 'solid' ? 'fill-blue-500/40' : 'fill-blue-500/20'} ${hovered && hovered !== 'solid' ? 'opacity-40' : 'opacity-90'}`} onMouseEnter={() => setHovered('solid')} />
                <path d="M 50 0 Q 45 35 40 70 Q 70 55 80 20 L 80 0 Z" className={`cursor-pointer transition-all duration-300 ${hovered === 'liquid' ? 'fill-teal-500/40' : 'fill-teal-500/20'} ${hovered && hovered !== 'liquid' ? 'opacity-40' : 'opacity-90'}`} onMouseEnter={() => setHovered('liquid')} />
                <path d="M 0 95 Q 20 85 40 70 Q 70 55 80 20 L 100 20 L 100 100 L 0 100 Z" className={`cursor-pointer transition-all duration-300 ${hovered === 'gas' ? 'fill-orange-500/40' : 'fill-orange-500/20'} ${hovered && hovered !== 'gas' ? 'opacity-40' : 'opacity-90'}`} onMouseEnter={() => setHovered('gas')} />
                <path d="M 80 20 L 80 0 L 100 0 L 100 20 Z" className={`cursor-pointer transition-all duration-300 ${hovered === 'supercritical' ? 'fill-purple-500/40' : 'fill-purple-500/20'} ${hovered && hovered !== 'supercritical' ? 'opacity-40' : 'opacity-90'}`} onMouseEnter={() => setHovered('supercritical')} />
              </g>

              <g fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M 0 95 Q 20 85 40 70" />
                <path d="M 40 70 Q 45 35 50 0" />
                <path d="M 40 70 Q 70 55 80 20" />
              </g>

              <g fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="2,2">
                <path d="M 80 20 L 80 100" />
                <path d="M 80 20 L 0 20" />
                <path d="M 40 70 L 40 100" />
                <path d="M 40 70 L 0 70" />
              </g>

              <g className="cursor-pointer" onMouseEnter={() => setHovered('triple')}>
                <circle cx="40" cy="70" r="6" fill="transparent" />
                <circle cx="40" cy="70" r="2.5" className={`transition-all duration-300 ${hovered === 'triple' ? 'fill-rose-500 scale-150' : 'fill-slate-400'}`} />
              </g>

              <g className="cursor-pointer" onMouseEnter={() => setHovered('critical')}>
                <circle cx="80" cy="20" r="6" fill="transparent" />
                <circle cx="80" cy="20" r="2.5" className={`transition-all duration-300 ${hovered === 'critical' ? 'fill-indigo-500 scale-150' : 'fill-slate-400'}`} />
              </g>

              <text x="-10" y="50" transform="rotate(-90, -10, 50)" fontSize="4" fill="#94a3b8" fontWeight="bold" letterSpacing="1">PRESSURE</text>
              <text x="50" y="108" fontSize="4" fill="#94a3b8" fontWeight="bold" letterSpacing="1" textAnchor="middle">TEMPERATURE</text>
            </svg>
          </div>
        </div>

        <div className="w-full lg:w-96 bg-slate-950/50 p-6 md:p-8 flex flex-col">
          {activeData ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col">
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase mb-4 w-max ${activeData.bgLight} ${activeData.color}`}>
                {activeData.title}
              </div>
              <h2 className="text-2xl font-bold text-slate-100 mb-2">{activeData.subtitle}</h2>
              <p className="text-slate-400 leading-relaxed mb-8">{activeData.description}</p>
              <div className="mt-auto space-y-3">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-800 pb-2">Properties</h3>
                <ul className="space-y-2">
                  {activeData.properties.map((prop: any, idx: number) => (
                    <li key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">{prop.label}</span>
                      <span className="font-medium text-slate-200">{prop.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
              </div>
              <h3 className="text-lg font-bold text-slate-300 mb-2">Explore the Diagram</h3>
              <p className="text-sm text-slate-500">Hover over the different regions, lines, and points to learn about the states of matter.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// BLOCK 5: Mixing Hot/Cold
// ==========================================
const getTempColor = (temp: number) => {
  const clamped = Math.max(0, Math.min(100, temp));
  const hue = 240 - (clamped / 100) * 240;
  return `hsl(${hue}, 85%, 55%)`;
};

const Beaker = ({ mass, maxMass, temp, label, width = "w-24", height = "h-40" }: { mass: number, maxMass: number, temp: number, label: string, width?: string, height?: string }) => {
  const fillPercentage = Math.min(100, Math.max(5, (mass / maxMass) * 100));
  const color = getTempColor(temp);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-sm font-semibold text-slate-400">{label}</div>
      <div className={`${width} ${height} border-4 border-slate-600 border-t-0 rounded-b-2xl relative overflow-hidden bg-slate-800/50 shadow-inner`}>
        <div className="absolute bottom-0 w-full transition-all duration-700 ease-in-out flex items-start justify-center pt-2" style={{ height: `${fillPercentage}%`, backgroundColor: color }}>
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 pointer-events-none" />
          {temp > 60 && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-50">
              <div className="w-2 h-2 bg-white rounded-full absolute bottom-2 left-4 animate-ping" style={{ animationDuration: '1.5s' }} />
              <div className="w-1.5 h-1.5 bg-white rounded-full absolute bottom-4 right-6 animate-ping" style={{ animationDuration: '1.2s', animationDelay: '0.3s' }} />
              <div className="w-2.5 h-2.5 bg-white rounded-full absolute bottom-1 left-10 animate-ping" style={{ animationDuration: '1.8s', animationDelay: '0.6s' }} />
            </div>
          )}
        </div>
        <div className="absolute top-0 right-2 bottom-2 w-2 bg-gradient-to-b from-white/20 to-white/0 rounded-full pointer-events-none" />
      </div>
      <div className="text-xs font-mono bg-slate-900/80 px-2 py-1 rounded-md shadow-sm border border-slate-700 text-slate-200">
        {temp.toFixed(1)} °C
      </div>
    </div>
  );
};

function MixingExperiment() {
  const [hot, setHot] = useState({ mass: 50, temp: 80, c: 4.18 });
  const [cold, setCold] = useState({ mass: 50, temp: 20, c: 4.18 });

  const finalState = useMemo(() => {
    const hotEnergy = hot.mass * hot.c * hot.temp;
    const coldEnergy = cold.mass * cold.c * cold.temp;
    const totalHeatCapacity = (hot.mass * hot.c) + (cold.mass * cold.c);
    const finalTemp = (hotEnergy + coldEnergy) / totalHeatCapacity;
    const totalMass = hot.mass + cold.mass;
    const energyTransferred = hot.mass * hot.c * (hot.temp - finalTemp);
    return { finalTemp, totalMass, energyTransferred };
  }, [hot, cold]);

  const maxIndividualMass = 100;
  const maxCombinedMass = maxIndividualMass * 2;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 shadow-xl rounded-3xl p-6 border border-red-900/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-red-500 pointer-events-none"><FlameIcon /></div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-900/50 text-red-400 rounded-xl"><FlameIcon /></div>
            <h2 className="text-2xl font-bold text-slate-200">Hot Fluid</h2>
          </div>
          <div className="flex gap-6">
            <div className="flex-1 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-semibold text-slate-400">
                  <span className="flex items-center gap-1"><DropletIcon /> Mass (m₁)</span><span>{hot.mass} g</span>
                </div>
                <input type="range" min="10" max="100" step="1" value={hot.mass} onChange={(e) => setHot({...hot, mass: Number(e.target.value)})} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-semibold text-slate-400">
                  <span className="flex items-center gap-1"><ThermometerCustomIcon /> Temp (T₁)</span><span>{hot.temp} °C</span>
                </div>
                <input type="range" min="50" max="100" step="1" value={hot.temp} onChange={(e) => setHot({...hot, temp: Number(e.target.value)})} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-semibold text-slate-400">
                  <span className="flex items-center gap-1"><ActivityCustomIcon /> Specific Heat (c₁)</span><span>{hot.c.toFixed(2)} J/g°C</span>
                </div>
                <input type="range" min="1" max="5" step="0.01" value={hot.c} onChange={(e) => setHot({...hot, c: Number(e.target.value)})} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500" />
              </div>
            </div>
            <div className="flex-shrink-0 flex items-center justify-center pl-4 border-l border-slate-800">
              <Beaker mass={hot.mass} maxMass={maxIndividualMass} temp={hot.temp} label="Source 1" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 shadow-xl rounded-3xl p-6 border border-blue-900/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-blue-500 pointer-events-none"><SnowflakeIcon /></div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-900/50 text-blue-400 rounded-xl"><SnowflakeIcon /></div>
            <h2 className="text-2xl font-bold text-slate-200">Cold Fluid</h2>
          </div>
          <div className="flex gap-6">
            <div className="flex-1 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-semibold text-slate-400">
                  <span className="flex items-center gap-1"><DropletIcon /> Mass (m₂)</span><span>{cold.mass} g</span>
                </div>
                <input type="range" min="10" max="100" step="1" value={cold.mass} onChange={(e) => setCold({...cold, mass: Number(e.target.value)})} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-semibold text-slate-400">
                  <span className="flex items-center gap-1"><ThermometerCustomIcon /> Temp (T₂)</span><span>{cold.temp} °C</span>
                </div>
                <input type="range" min="0" max="49" step="1" value={cold.temp} onChange={(e) => setCold({...cold, temp: Number(e.target.value)})} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-semibold text-slate-400">
                  <span className="flex items-center gap-1"><ActivityCustomIcon /> Specific Heat (c₂)</span><span>{cold.c.toFixed(2)} J/g°C</span>
                </div>
                <input type="range" min="1" max="5" step="0.01" value={cold.c} onChange={(e) => setCold({...cold, c: Number(e.target.value)})} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              </div>
            </div>
            <div className="flex-shrink-0 flex items-center justify-center pl-4 border-l border-slate-800">
              <Beaker mass={cold.mass} maxMass={maxIndividualMass} temp={cold.temp} label="Source 2" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 shadow-2xl rounded-3xl p-8 border border-slate-800">
        <div className="flex flex-col md:flex-row items-center gap-12">
          <div className="flex-shrink-0 flex flex-col items-center">
            <h3 className="text-xl font-bold text-slate-200 mb-4">Final Mixture</h3>
            <Beaker mass={finalState.totalMass} maxMass={maxCombinedMass} temp={finalState.finalTemp} label={`Total: ${finalState.totalMass} g`} width="w-32" height="h-48" />
          </div>
          <div className="flex-1 w-full space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-slate-100 mb-2">Energy Balance</h3>
              <p className="text-slate-400 text-sm">Assuming no heat is lost to the surroundings, the heat energy lost by the hot fluid equals the heat energy gained by the cold fluid.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-red-950/30 border border-red-900/50 rounded-2xl p-4">
                <div className="text-red-400 font-bold mb-2 text-sm uppercase tracking-wider">Heat Lost (Q_out)</div>
                <div className="font-mono text-sm space-y-1 text-slate-300">
                  <div>Q = m₁ × c₁ × (T₁ - T_f)</div>
                  <div>Q = {hot.mass} × {hot.c.toFixed(2)} × ({hot.temp} - {finalState.finalTemp.toFixed(1)})</div>
                  <div className="text-lg font-bold text-red-400 mt-2 border-t border-red-900/50 pt-2">{finalState.energyTransferred.toFixed(0)} Joules</div>
                </div>
              </div>
              <div className="bg-blue-950/30 border border-blue-900/50 rounded-2xl p-4">
                <div className="text-blue-400 font-bold mb-2 text-sm uppercase tracking-wider">Heat Gained (Q_in)</div>
                <div className="font-mono text-sm space-y-1 text-slate-300">
                  <div>Q = m₂ × c₂ × (T_f - T₂)</div>
                  <div>Q = {cold.mass} × {cold.c.toFixed(2)} × ({finalState.finalTemp.toFixed(1)} - {cold.temp})</div>
                  <div className="text-lg font-bold text-blue-400 mt-2 border-t border-blue-900/50 pt-2">{finalState.energyTransferred.toFixed(0)} Joules</div>
                </div>
              </div>
            </div>
            <div className="pt-4">
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider"><span>Energy Transfer Flow</span></div>
              <div className="h-6 w-full bg-slate-800 rounded-full overflow-hidden flex relative shadow-inner">
                <div className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500" style={{ width: '50%' }} />
                <div className="h-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500" style={{ width: '50%' }} />
                <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-slate-900 shadow-sm transform -translate-x-1/2" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60">
                  <svg className="w-6 h-6 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                </div>
              </div>
              <div className="flex justify-between text-xs font-medium text-slate-400 mt-2"><span>Hot Source Cooling</span><span>Cold Source Warming</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MAIN APP COMPONENT
// ==========================================
export default function App() {
  const [activeTab, setActiveTab] = useState('particle-box');

  const tabs = [
    { id: 'particle-box', label: 'Particle Box', icon: <Box className="w-5 h-5" /> },
    { id: 'pv-nt', label: 'PV/nT Chart', icon: <LineChart className="w-5 h-5" /> },
    { id: 'iso-adia', label: 'Isothermal vs Adiabatic', icon: <Activity className="w-5 h-5" /> },
    { id: 'phase-diagram', label: 'Phase Diagram', icon: <GitMerge className="w-5 h-5" /> },
    { id: 'mixing', label: 'Mixing Hot/Cold', icon: <Droplets className="w-5 h-5" /> },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans selection:bg-orange-500/30">
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500 flex items-center gap-2">
            <Activity className="w-6 h-6 text-orange-500" />
            Thermo Play
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                activeTab === tab.id
                  ? 'bg-slate-800 text-orange-400 font-semibold shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto mb-8">
          <h1 className="text-3xl font-extrabold text-slate-100 mb-2">
            {tabs.find(t => t.id === activeTab)?.label}
          </h1>
          <p className="text-slate-400">Explore ideal gas laws and phase changes visually.</p>
        </div>
        
        {activeTab === 'particle-box' && <ParticleBox />}
        {activeTab === 'pv-nt' && <PvNtChart />}
        {activeTab === 'iso-adia' && <IsothermalVsAdiabatic />}
        {activeTab === 'phase-diagram' && <PhaseDiagram />}
        {activeTab === 'mixing' && <MixingExperiment />}
      </div>
    </div>
  );
}