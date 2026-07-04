import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Thermometer, Maximize, Gauge, Activity, Info, Play, Pause, RotateCcw, Flame, Snowflake, Shield, Droplet } from 'lucide-react';

// --- Global Types & Constants ---
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

const R = 8.314; // Ideal gas constant in L⋅kPa/(mol⋅K)

const GAMMA = 1.4; // Diatomic ideal gas
const P_INITIAL = 1000; // kPa
const V_INITIAL = 1; // L
const T_INITIAL = 300; // K
const V_MAX = 5; // L
const V_MIN = 1; // L
const nR = (P_INITIAL * V_INITIAL) / T_INITIAL;

type RegionKey = 'solid' | 'liquid' | 'gas' | 'supercritical' | 'triple' | 'critical' | null;

interface RegionInfo {
  title: string;
  subtitle: string;
  description: string;
  color: string;
  bgLight: string;
  properties: { label: string; value: string }[];
}

const REGION_DATA: Record<string, RegionInfo> = {
  solid: {
    title: 'Solid Phase',
    subtitle: 'Rigid Lattice Structure',
    description: 'Molecules are tightly packed in a regular pattern and vibrate in place. Intermolecular forces are strong enough to hold them in a fixed arrangement.',
    color: 'text-blue-400',
    bgLight: 'bg-blue-900/30',
    properties: [
      { label: 'Shape', value: 'Definite' },
      { label: 'Volume', value: 'Definite' },
      { label: 'Compressibility', value: 'Very Low' },
      { label: 'Molecular Motion', value: 'Vibration only' },
    ],
  },
  liquid: {
    title: 'Liquid Phase',
    subtitle: 'Fluid & Cohesive',
    description: 'Molecules are close together but can slide past one another. The substance flows to take the shape of its container while maintaining a constant volume.',
    color: 'text-teal-400',
    bgLight: 'bg-teal-900/30',
    properties: [
      { label: 'Shape', value: 'Indefinite' },
      { label: 'Volume', value: 'Definite' },
      { label: 'Compressibility', value: 'Low' },
      { label: 'Molecular Motion', value: 'Sliding / Flowing' },
    ],
  },
  gas: {
    title: 'Gas Phase',
    subtitle: 'Highly Energetic',
    description: 'Molecules move rapidly and freely, spreading out to fill any container. Intermolecular forces are largely overcome by kinetic energy.',
    color: 'text-orange-400',
    bgLight: 'bg-orange-900/30',
    properties: [
      { label: 'Shape', value: 'Indefinite' },
      { label: 'Volume', value: 'Indefinite' },
      { label: 'Compressibility', value: 'High' },
      { label: 'Molecular Motion', value: 'Rapid / Random' },
    ],
  },
  supercritical: {
    title: 'Supercritical Fluid',
    subtitle: 'Beyond the Critical Point',
    description: 'At temperatures and pressures above the critical point, distinct liquid and gas phases do not exist. It can effuse through solids like a gas, and dissolve materials like a liquid.',
    color: 'text-purple-400',
    bgLight: 'bg-purple-900/30',
    properties: [
      { label: 'Density', value: 'Liquid-like' },
      { label: 'Viscosity', value: 'Gas-like' },
      { label: 'Phase Boundaries', value: 'None' },
      { label: 'Diffusivity', value: 'High' },
    ],
  },
  triple: {
    title: 'Triple Point',
    subtitle: 'Thermodynamic Equilibrium',
    description: 'The exact temperature and pressure at which the solid, liquid, and gas phases of a substance coexist in perfect thermodynamic equilibrium.',
    color: 'text-rose-400',
    bgLight: 'bg-rose-900/30',
    properties: [
      { label: 'Degrees of Freedom', value: 'Zero' },
      { label: 'Coexisting Phases', value: 'Solid, Liquid, Gas' },
      { label: 'Significance', value: 'Calibration reference' },
    ],
  },
  critical: {
    title: 'Critical Point',
    subtitle: 'End of the Phase Boundary',
    description: 'The end point of the phase equilibrium curve. Beyond this temperature and pressure, there is no distinction between the liquid and gas phases.',
    color: 'text-indigo-400',
    bgLight: 'bg-indigo-900/30',
    properties: [
      { label: 'Latent Heat', value: 'Zero' },
      { label: 'Surface Tension', value: 'Zero' },
      { label: 'Density Fluctuation', value: 'Infinite (Opalescence)' },
    ],
  },
};

// --- Global Helper Functions ---
const getTemperatureColor = (temp: number) => {
  const ratio = (temp - MIN_TEMP) / (MAX_TEMP - MIN_TEMP);
  const r = Math.floor(255 * ratio);
  const b = Math.floor(255 * (1 - ratio));
  const g = Math.floor(50 + 100 * ratio);
  return `rgb(${r}, ${g}, ${b})`;
};

const getTempColorHSL = (temp: number) => {
  const clamped = Math.max(0, Math.min(100, temp));
  const hue = 240 - (clamped / 100) * 240;
  return `hsl(${hue}, 85%, 55%)`;
};

// --- Module Components ---

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

      ctx.fillStyle = '#64748b';
      ctx.fillRect(activeWidth, 0, CANVAS_WIDTH - activeWidth, CANVAS_HEIGHT);
      
      ctx.fillStyle = '#334155';
      ctx.fillRect(activeWidth + 10, CANVAS_HEIGHT / 2 - 40, 20, 80);
      ctx.fillRect(activeWidth + 30, CANVAS_HEIGHT / 2 - 10, CANVAS_WIDTH - activeWidth, 20);

      const particles = particlesRef.current;
      const speedMultiplier = Math.sqrt(temperature / 300) * 2.5;
      const particleColor = getTemperatureColor(temperature);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx * speedMultiplier * deltaTime;
        p.y += p.vy * speedMultiplier * deltaTime;

        if (p.x - p.radius < 0) {
          p.x = p.radius;
          p.vx *= -1;
        }
        if (p.x + p.radius > activeWidth) {
          p.x = activeWidth - p.radius;
          p.vx *= -1;
        }
        if (p.y - p.radius < 0) {
          p.y = p.radius;
          p.vy *= -1;
        }
        if (p.y + p.radius > CANVAS_HEIGHT) {
          p.y = CANVAS_HEIGHT - p.radius;
          p.vy *= -1;
        }

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

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [temperature, volume]);

  useEffect(() => {
    const k = 100 / 300;
    const calculatedPressure = k * (temperature / volume);
    setPressure(calculatedPressure);
  }, [temperature, volume]);

  return (
    <div className="p-4 md:p-8 flex items-center justify-center w-full">
      <div className="bg-slate-900/80 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden w-full max-w-6xl border border-slate-800">
        <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 text-white flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Activity className="w-8 h-8" />
              Thermo Playground
            </h1>
            <p className="text-orange-100 mt-1 font-medium">Ideal Gas Law: Particle Box</p>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-black/20 px-4 py-2 rounded-full backdrop-blur-sm">
            <Info className="w-5 h-5" />
            <span className="font-mono text-sm">PV = nRT</span>
          </div>
        </div>

        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="relative bg-slate-950 rounded-2xl overflow-hidden shadow-inner border-4 border-slate-800 flex items-center justify-center" style={{ height: CANVAS_HEIGHT }}>
              <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="max-w-full h-auto" />
              <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-md text-sm font-mono backdrop-blur-md border border-white/10">
                V = {volume.toFixed(0)} L
              </div>
              <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-md text-sm font-mono backdrop-blur-md border border-white/10">
                T = {temperature.toFixed(0)} K
              </div>
            </div>
            <p className="text-sm text-slate-400 text-center italic">
              Particles represent gas molecules. Watch how their speed changes with temperature and how they interact with the container volume.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-sm relative overflow-hidden">
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

            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-sm flex-1 flex flex-col gap-8">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-200 flex items-center gap-2">
                    <Thermometer className="w-5 h-5 text-red-400" />
                    Temperature
                  </label>
                  <span className="font-mono font-bold text-red-400 bg-red-900/30 px-2 py-1 rounded-md">
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
                  <span className="font-mono font-bold text-emerald-400 bg-emerald-900/30 px-2 py-1 rounded-md">
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

              <div className="mt-auto bg-orange-900/20 p-4 rounded-xl border border-orange-800/50">
                <h3 className="text-sm font-bold text-orange-400 mb-2">Key Concept</h3>
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
    <div className="p-4 md:p-8 w-full">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
            Thermo Playground
          </h1>
          <p className="text-lg text-slate-400 font-medium">
            PV/nT Chart Explorer &bull; Ideal Gas Law
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/80 backdrop-blur-xl shadow-2xl rounded-3xl p-6 border border-slate-800">
              <h2 className="text-xl font-bold text-slate-200 mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-orange-500" />
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

              <div className="mt-8 p-4 bg-gradient-to-br from-orange-600 to-red-600 rounded-2xl text-white shadow-inner">
                <div className="text-sm font-medium text-orange-100 uppercase tracking-wider mb-1">Resulting Pressure (P)</div>
                <div className="text-4xl font-black tracking-tight">
                  {pressure.toFixed(1)} <span className="text-xl font-semibold text-orange-200">kPa</span>
                </div>
                <div className="mt-4 text-xs text-orange-100/80 font-mono bg-black/20 p-2 rounded-lg">
                  P = (n × R × T) / V<br/>
                  P = ({moles} × 8.314 × {temperature}) / {volume}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/80 backdrop-blur-xl shadow-xl rounded-3xl p-6 border border-slate-800 flex flex-col">
              <h3 className="text-lg font-bold text-slate-200 mb-1">PV vs nT Relationship</h3>
              <p className="text-xs text-slate-400 mb-4">The slope of this line is the Ideal Gas Constant (R ≈ 8.314)</p>
              
              <div className="flex-grow flex items-center justify-center bg-slate-950 rounded-xl border border-slate-800">
                <svg width={chartWidth} height={chartHeight} className="overflow-visible">
                  {[0, 0.25, 0.5, 0.75, 1].map(tick => (
                    <g key={`grid-y-${tick}`}>
                      <line 
                        x1={padding.left} y1={padding.top + innerHeight * tick} 
                        x2={chartWidth - padding.right} y2={padding.top + innerHeight * tick} 
                        stroke="#334155" strokeDasharray="4 4" 
                      />
                      <text x={padding.left - 10} y={padding.top + innerHeight * tick + 4} fontSize="10" fill="#94a3b8" textAnchor="end">
                        {Math.round(maxPv * (1 - tick))}
                      </text>
                    </g>
                  ))}
                  {[0, 0.25, 0.5, 0.75, 1].map(tick => (
                    <g key={`grid-x-${tick}`}>
                      <line 
                        x1={padding.left + innerWidth * tick} y1={padding.top} 
                        x2={padding.left + innerWidth * tick} y2={chartHeight - padding.bottom} 
                        stroke="#334155" strokeDasharray="4 4" 
                      />
                      <text x={padding.left + innerWidth * tick} y={chartHeight - padding.bottom + 20} fontSize="10" fill="#94a3b8" textAnchor="middle">
                        {Math.round(maxNt * tick)}
                      </text>
                    </g>
                  ))}

                  <line x1={padding.left} y1={chartHeight - padding.bottom} x2={chartWidth - padding.right} y2={chartHeight - padding.bottom} stroke="#94a3b8" strokeWidth="2" />
                  <line x1={padding.left} y1={padding.top} x2={padding.left} y2={chartHeight - padding.bottom} stroke="#94a3b8" strokeWidth="2" />
                  
                  <text x={padding.left + innerWidth / 2} y={chartHeight - 5} fontSize="12" fontWeight="bold" fill="#cbd5e1" textAnchor="middle">nT (mol·K)</text>
                  <text x={15} y={padding.top + innerHeight / 2} fontSize="12" fontWeight="bold" fill="#cbd5e1" textAnchor="middle" transform={`rotate(-90, 15, ${padding.top + innerHeight / 2})`}>PV (L·kPa)</text>

                  <line 
                    x1={mapNtToX(0)} y1={mapPvToY(0)} 
                    x2={mapNtToX(maxNt)} y2={mapPvToY(maxNt * R)} 
                    stroke="#f97316" strokeWidth="3" strokeLinecap="round"
                  />

                  <circle cx={mapNtToX(nt)} cy={mapPvToY(pv)} r="6" fill="#ef4444" className="transition-all duration-300 ease-out" />
                  <circle cx={mapNtToX(nt)} cy={mapPvToY(pv)} r="12" fill="#ef4444" opacity="0.3" className="transition-all duration-300 ease-out animate-pulse" />
                  
                  <g transform={`translate(${mapNtToX(nt) - 40}, ${mapPvToY(pv) - 15})`} className="transition-all duration-300 ease-out">
                    <rect x="0" y="-15" width="80" height="20" rx="4" fill="#0f172a" opacity="0.8" />
                    <text x="40" y="-2" fontSize="10" fill="white" textAnchor="middle">PV = {Math.round(pv)}</text>
                  </g>
                </svg>
              </div>
            </div>

            <div className="bg-slate-900/80 backdrop-blur-xl shadow-xl rounded-3xl p-6 border border-slate-800 flex flex-col">
              <h3 className="text-lg font-bold text-slate-200 mb-1">P vs V Isotherm</h3>
              <p className="text-xs text-slate-400 mb-4">Inverse relationship (Boyle's Law) at constant T and n</p>
              
              <div className="flex-grow flex items-center justify-center bg-slate-950 rounded-xl border border-slate-800">
                <svg width={chartWidth} height={chartHeight} className="overflow-visible">
                  {[0, 0.25, 0.5, 0.75, 1].map(tick => (
                    <g key={`grid-y-pv-${tick}`}>
                      <line 
                        x1={padding.left} y1={padding.top + innerHeight * tick} 
                        x2={chartWidth - padding.right} y2={padding.top + innerHeight * tick} 
                        stroke="#334155" strokeDasharray="4 4" 
                      />
                      <text x={padding.left - 10} y={padding.top + innerHeight * tick + 4} fontSize="10" fill="#94a3b8" textAnchor="end">
                        {Math.round(maxP * (1 - tick))}
                      </text>
                    </g>
                  ))}
                  {[0, 0.25, 0.5, 0.75, 1].map(tick => (
                    <g key={`grid-x-pv-${tick}`}>
                      <line 
                        x1={padding.left + innerWidth * tick} y1={padding.top} 
                        x2={padding.left + innerWidth * tick} y2={chartHeight - padding.bottom} 
                        stroke="#334155" strokeDasharray="4 4" 
                      />
                      <text x={padding.left + innerWidth * tick} y={chartHeight - padding.bottom + 20} fontSize="10" fill="#94a3b8" textAnchor="middle">
                        {Math.round(maxV * tick)}
                      </text>
                    </g>
                  ))}

                  <line x1={padding.left} y1={chartHeight - padding.bottom} x2={chartWidth - padding.right} y2={chartHeight - padding.bottom} stroke="#94a3b8" strokeWidth="2" />
                  <line x1={padding.left} y1={padding.top} x2={padding.left} y2={chartHeight - padding.bottom} stroke="#94a3b8" strokeWidth="2" />
                  
                  <text x={padding.left + innerWidth / 2} y={chartHeight - 5} fontSize="12" fontWeight="bold" fill="#cbd5e1" textAnchor="middle">Volume (L)</text>
                  <text x={15} y={padding.top + innerHeight / 2} fontSize="12" fontWeight="bold" fill="#cbd5e1" textAnchor="middle" transform={`rotate(-90, 15, ${padding.top + innerHeight / 2})`}>Pressure (kPa)</text>

                  <path 
                    d={isothermPath} 
                    fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                    className="transition-all duration-300 ease-out"
                  />

                  <circle cx={mapVToX(volume)} cy={mapPToY(pressure)} r="6" fill="#ef4444" className="transition-all duration-300 ease-out" />
                  <circle cx={mapVToX(volume)} cy={mapPToY(pressure)} r="12" fill="#ef4444" opacity="0.3" className="transition-all duration-300 ease-out animate-pulse" />
                  
                  <g transform={`translate(${mapVToX(volume) + 15}, ${mapPToY(pressure) - 15})`} className="transition-all duration-300 ease-out">
                    <rect x="0" y="-15" width="70" height="32" rx="4" fill="#0f172a" opacity="0.8" />
                    <text x="35" y="-2" fontSize="10" fill="white" textAnchor="middle">V: {volume.toFixed(1)}</text>
                    <text x="35" y="10" fontSize="10" fill="white" textAnchor="middle">P: {pressure.toFixed(1)}</text>
                  </g>
                </svg>
              </div>
            </div>

            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-5 border border-slate-700 shadow-sm">
                <h4 className="font-bold text-orange-400 mb-2">Boyle's Law</h4>
                <p className="text-sm text-slate-300">At constant <span className="font-semibold">T</span> and <span className="font-semibold">n</span>, Pressure is inversely proportional to Volume (<span className="italic font-serif">P ∝ 1/V</span>).</p>
              </div>
              <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-5 border border-slate-700 shadow-sm">
                <h4 className="font-bold text-red-400 mb-2">Charles's Law</h4>
                <p className="text-sm text-slate-300">At constant <span className="font-semibold">P</span> and <span className="font-semibold">n</span>, Volume is directly proportional to Temperature (<span className="italic font-serif">V ∝ T</span>).</p>
              </div>
              <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-5 border border-slate-700 shadow-sm">
                <h4 className="font-bold text-amber-400 mb-2">Avogadro's Law</h4>
                <p className="text-sm text-slate-300">At constant <span className="font-semibold">P</span> and <span className="font-semibold">T</span>, Volume is directly proportional to Moles (<span className="italic font-serif">V ∝ n</span>).</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, unit, color }: { label: string, value: string, unit: string, color: string }) {
  return (
    <div className={`p-4 rounded-xl border ${color} flex flex-col justify-between shadow-sm`}>
      <span className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-black">{value}</span>
        <span className="text-sm font-semibold opacity-80">{unit}</span>
      </div>
    </div>
  );
}

function ThermoPath() {
  const [process, setProcess] = useState<'isothermal' | 'adiabatic'>('isothermal');
  const [volume, setVolume] = useState<number>(V_INITIAL);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [direction, setDirection] = useState<'expand' | 'compress'>('expand');

  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  const currentP = useMemo(() => {
    if (process === 'isothermal') {
      return (P_INITIAL * V_INITIAL) / volume;
    } else {
      return P_INITIAL * Math.pow(V_INITIAL / volume, GAMMA);
    }
  }, [process, volume]);

  const currentT = (currentP * volume) / nR;

  const workDone = useMemo(() => {
    if (process === 'isothermal') {
      return P_INITIAL * V_INITIAL * Math.log(volume / V_INITIAL);
    } else {
      return (P_INITIAL * V_INITIAL - currentP * volume) / (GAMMA - 1);
    }
  }, [process, volume, currentP]);

  const heatAdded = process === 'isothermal' ? workDone : 0;
  const internalEnergy = process === 'isothermal' ? 0 : -workDone;

  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const animate = (time: number) => {
      if (lastTimeRef.current != null) {
        const delta = time - lastTimeRef.current;
        const speed = 0.0015;

        setVolume((prev) => {
          let nextV = prev;
          if (direction === 'expand') {
            nextV = prev + speed * delta;
            if (nextV >= V_MAX) {
              setIsPlaying(false);
              setDirection('compress');
              return V_MAX;
            }
          } else {
            nextV = prev - speed * delta;
            if (nextV <= V_MIN) {
              setIsPlaying(false);
              setDirection('expand');
              return V_MIN;
            }
          }
          return nextV;
        });
      }
      lastTimeRef.current = time;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      lastTimeRef.current = undefined;
    };
  }, [isPlaying, direction]);

  const mapX = (v: number) => 40 + ((v - 0) / 6) * 340;
  const mapY = (p: number) => 260 - ((p - 0) / 1100) * 240;

  const generatePath = (type: 'isothermal' | 'adiabatic', maxV: number = V_MAX) => {
    let d = '';
    for (let v = V_MIN; v <= maxV; v += 0.1) {
      const p = type === 'isothermal' ? (P_INITIAL * V_INITIAL) / v : P_INITIAL * Math.pow(V_INITIAL / v, GAMMA);
      const x = mapX(v);
      const y = mapY(p);
      d += v === V_MIN ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
    return d;
  };

  const areaPath = useMemo(() => {
    let d = generatePath(process, volume);
    d += ` L ${mapX(volume)} ${mapY(0)} L ${mapX(V_MIN)} ${mapY(0)} Z`;
    return d;
  }, [process, volume]);

  const getGasColor = (temp: number) => {
    const tNorm = Math.max(0, Math.min(1, (temp - 150) / 150));
    const r = Math.round(100 + 155 * tNorm);
    const g = Math.round(150 * (1 - Math.abs(tNorm - 0.5) * 2));
    const b = Math.round(255 * (1 - tNorm));
    return `rgba(${r}, ${g}, ${b}, 0.6)`;
  };

  return (
    <div className="p-6 flex flex-col items-center w-full">
      <header className="mb-8 text-center max-w-3xl">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500 mb-3 flex items-center justify-center gap-3">
          <Activity className="w-8 h-8 text-orange-500" />
          Thermodynamic Paths
        </h1>
        <p className="text-slate-400 text-lg">
          Explore the difference between <strong>Isothermal</strong> (constant temperature) and <strong>Adiabatic</strong> (no heat exchange) expansion and compression.
        </p>
      </header>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-slate-800">
            <h2 className="text-xl font-bold text-slate-200 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-slate-400" /> Process Type
            </h2>
            
            <div className="flex bg-slate-800 p-1 rounded-xl mb-6">
              <button
                onClick={() => setProcess('isothermal')}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                  process === 'isothermal' ? 'bg-slate-700 shadow-sm text-orange-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Isothermal
              </button>
              <button
                onClick={() => setProcess('adiabatic')}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                  process === 'adiabatic' ? 'bg-slate-700 shadow-sm text-blue-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Adiabatic
              </button>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-sm font-medium text-slate-400 mb-2">
                <span>Volume (V)</span>
                <span>{volume.toFixed(2)} L</span>
              </div>
              <input
                type="range" min={V_MIN} max={V_MAX} step={0.01} value={volume}
                onChange={(e) => { setVolume(parseFloat(e.target.value)); setIsPlaying(false); }}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-900/30 transition-all active:scale-95"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {isPlaying ? 'Pause' : direction === 'expand' ? 'Expand' : 'Compress'}
              </button>
              <button
                onClick={() => { setIsPlaying(false); setVolume(V_INITIAL); setDirection('expand'); }}
                className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold flex items-center justify-center transition-all active:scale-95"
                title="Reset"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-slate-800 flex-1 flex flex-col items-center justify-center relative overflow-hidden">
            <h3 className="text-lg font-bold text-slate-200 mb-6 w-full text-center">Gas Chamber</h3>
            
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              {process === 'isothermal' ? (
                <div className="flex items-center gap-1 text-orange-400 bg-orange-900/30 px-2 py-1 rounded-md text-xs font-bold border border-orange-800/50">
                  <Flame className="w-4 h-4" /> Heat Bath
                </div>
              ) : (
                <div className="flex items-center gap-1 text-slate-400 bg-slate-800 px-2 py-1 rounded-md text-xs font-bold border border-slate-700">
                  <Shield className="w-4 h-4" /> Insulated
                </div>
              )}
            </div>

            <div className="relative w-40 h-64 mt-4">
              <div className={`absolute inset-0 border-x-8 border-b-8 rounded-b-xl z-10 pointer-events-none transition-colors duration-500 ${process === 'adiabatic' ? 'border-slate-600 border-dashed' : 'border-slate-500'}`}></div>
              
              <div 
                className="absolute bottom-2 left-2 right-2 rounded-b-sm transition-all duration-75"
                style={{ 
                  height: `${(volume / V_MAX) * 100}%`,
                  backgroundColor: getGasColor(currentT),
                  boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
                }}
              >
                <div className="w-full h-full opacity-30 mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
              </div>

              <div 
                className="absolute left-0 right-0 h-6 bg-slate-700 rounded-sm z-20 flex justify-center transition-all duration-75"
                style={{ bottom: `calc(${(volume / V_MAX) * 100}% + 8px)` }}
              >
                <div className="w-4 h-64 bg-slate-500 absolute bottom-full"></div>
              </div>

              {process === 'isothermal' && isPlaying && (
                <div className="absolute -left-8 bottom-10 flex flex-col gap-2 animate-pulse">
                  <span className="text-orange-500 font-bold text-xl">→</span>
                  <span className="text-orange-500 font-bold text-xl">→</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-slate-800 flex-1">
            <h2 className="text-xl font-bold text-slate-200 mb-4">Pressure-Volume (P-V) Diagram</h2>
            <div className="w-full aspect-video bg-slate-950 rounded-xl border border-slate-800 relative overflow-hidden flex items-center justify-center">
              <svg viewBox="0 0 400 300" className="w-full h-full drop-shadow-sm">
                {[1, 2, 3, 4, 5].map(v => (
                  <line key={`gx-${v}`} x1={mapX(v)} y1={mapY(0)} x2={mapX(v)} y2={mapY(1100)} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
                ))}
                {[200, 400, 600, 800, 1000].map(p => (
                  <line key={`gy-${p}`} x1={mapX(0)} y1={mapY(p)} x2={mapX(6)} y2={mapY(p)} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
                ))}

                <line x1={mapX(0)} y1={mapY(0)} x2={mapX(6)} y2={mapY(0)} stroke="#94a3b8" strokeWidth="2" />
                <line x1={mapX(0)} y1={mapY(0)} x2={mapX(0)} y2={mapY(1100)} stroke="#94a3b8" strokeWidth="2" />
                <text x={mapX(5.8)} y={mapY(-60)} className="text-xs fill-slate-400 font-semibold">V (L)</text>
                <text x={mapX(-0.4)} y={mapY(1050)} className="text-xs fill-slate-400 font-semibold">P (kPa)</text>

                <path d={areaPath} fill={process === 'isothermal' ? 'rgba(249, 115, 22, 0.15)' : 'rgba(59, 130, 246, 0.15)'} />

                <path 
                  d={generatePath(process === 'isothermal' ? 'adiabatic' : 'isothermal')} 
                  fill="none" stroke="#475569" strokeWidth="2" strokeDasharray="6 6"
                />

                <path 
                  d={generatePath(process)} 
                  fill="none" stroke={process === 'isothermal' ? '#ea580c' : '#3b82f6'} strokeWidth="3" 
                />

                <circle cx={mapX(volume)} cy={mapY(currentP)} r="6" fill={process === 'isothermal' ? '#ea580c' : '#3b82f6'} className="drop-shadow-md" />
                <circle cx={mapX(volume)} cy={mapY(currentP)} r="12" fill={process === 'isothermal' ? '#ea580c' : '#3b82f6'} opacity="0.3" className="animate-ping" />

                <circle cx={mapX(V_INITIAL)} cy={mapY(P_INITIAL)} r="4" fill="#94a3b8" />
                <text x={mapX(V_INITIAL) + 10} y={mapY(P_INITIAL) - 10} className="text-xs fill-slate-400 font-bold">Start</text>
              </svg>

              <div className="absolute top-4 right-4 bg-slate-900/90 p-3 rounded-lg border border-slate-700 shadow-sm text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-orange-500 rounded-full"></div>
                  <span className="text-slate-300 font-medium">Isothermal (T=const)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-blue-500 rounded-full"></div>
                  <span className="text-slate-300 font-medium">Adiabatic (Q=0)</span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                  <div className="w-4 h-4 bg-orange-500/20 border border-orange-500/30 rounded-sm"></div>
                  <span className="text-slate-300 font-medium">Work Done (W)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard 
              label="Pressure (P)" value={`${Math.round(currentP)}`} unit="kPa" 
              color="bg-indigo-900/30 text-indigo-300 border-indigo-800" 
            />
            <MetricCard 
              label="Temperature (T)" value={`${Math.round(currentT)}`} unit="K" 
              color={currentT < 300 ? 'bg-blue-900/30 text-blue-300 border-blue-800' : currentT > 300 ? 'bg-red-900/30 text-red-300 border-red-800' : 'bg-orange-900/30 text-orange-300 border-orange-800'} 
            />
            <MetricCard 
              label="Work Done (W)" value={`${Math.round(workDone)}`} unit="J" 
              color="bg-emerald-900/30 text-emerald-300 border-emerald-800" 
            />
            <MetricCard 
              label={process === 'isothermal' ? 'Heat Added (Q)' : 'Internal Energy (ΔU)'} 
              value={`${Math.round(process === 'isothermal' ? heatAdded : internalEnergy)}`} unit="J" 
              color="bg-amber-900/30 text-amber-300 border-amber-800" 
            />
          </div>

          <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-800/50 flex gap-3 items-start">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-200 leading-relaxed">
              <strong>{process === 'isothermal' ? 'Isothermal Expansion:' : 'Adiabatic Expansion:'}</strong> 
              {process === 'isothermal' 
                ? ' The gas is kept at a constant temperature by a heat bath. As it expands, heat (Q) flows in to do the work (W), so internal energy remains unchanged (ΔU = 0). The curve follows P = nRT/V.' 
                : ' The gas is perfectly insulated (Q = 0). As it expands, it does work (W) at the expense of its own internal energy, causing the temperature (T) to drop rapidly. The curve is steeper, following P ∝ 1/V^γ.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhaseDiagram() {
  const [hovered, setHovered] = useState<RegionKey>(null);
  const activeData = hovered ? REGION_DATA[hovered] : null;

  return (
    <div className="p-4 md:p-8 flex items-center justify-center w-full">
      <div className="max-w-6xl w-full flex flex-col gap-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-rose-500">
            Thermo Playground
          </h1>
          <p className="text-lg text-rose-300/70 font-medium">
            Phase Diagram Explorer
          </p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col lg:flex-row">
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
                  <path
                    d="M 0 95 Q 20 85 40 70 Q 45 35 50 0 L 0 0 Z"
                    className={`cursor-pointer transition-all duration-300 ${
                      hovered === 'solid' ? 'fill-blue-500/50' : 'fill-blue-900/30'
                    } ${hovered && hovered !== 'solid' ? 'opacity-40' : 'opacity-90'}`}
                    onMouseEnter={() => setHovered('solid')}
                  />
                  
                  <path
                    d="M 50 0 Q 45 35 40 70 Q 70 55 80 20 L 80 0 Z"
                    className={`cursor-pointer transition-all duration-300 ${
                      hovered === 'liquid' ? 'fill-teal-500/50' : 'fill-teal-900/30'
                    } ${hovered && hovered !== 'liquid' ? 'opacity-40' : 'opacity-90'}`}
                    onMouseEnter={() => setHovered('liquid')}
                  />

                  <path
                    d="M 0 95 Q 20 85 40 70 Q 70 55 80 20 L 100 20 L 100 100 L 0 100 Z"
                    className={`cursor-pointer transition-all duration-300 ${
                      hovered === 'gas' ? 'fill-orange-500/50' : 'fill-orange-900/30'
                    } ${hovered && hovered !== 'gas' ? 'opacity-40' : 'opacity-90'}`}
                    onMouseEnter={() => setHovered('gas')}
                  />

                  <path
                    d="M 80 20 L 80 0 L 100 0 L 100 20 Z"
                    className={`cursor-pointer transition-all duration-300 ${
                      hovered === 'supercritical' ? 'fill-purple-500/50' : 'fill-purple-900/30'
                    } ${hovered && hovered !== 'supercritical' ? 'opacity-40' : 'opacity-90'}`}
                    onMouseEnter={() => setHovered('supercritical')}
                  />
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
                  <circle cx="40" cy="70" r="2.5" className={`transition-all duration-300 ${hovered === 'triple' ? 'fill-rose-500 scale-150' : 'fill-slate-300'}`} />
                </g>

                <g className="cursor-pointer" onMouseEnter={() => setHovered('critical')}>
                  <circle cx="80" cy="20" r="6" fill="transparent" />
                  <circle cx="80" cy="20" r="2.5" className={`transition-all duration-300 ${hovered === 'critical' ? 'fill-indigo-500 scale-150' : 'fill-slate-300'}`} />
                </g>

                <text x="15" y="35" fontSize="6" fontWeight="bold" fill="#94a3b8" className="pointer-events-none">Solid</text>
                <text x="55" y="30" fontSize="6" fontWeight="bold" fill="#94a3b8" className="pointer-events-none">Liquid</text>
                <text x="60" y="80" fontSize="6" fontWeight="bold" fill="#94a3b8" className="pointer-events-none">Gas</text>
                <text x="85" y="10" fontSize="4" fontWeight="bold" fill="#94a3b8" className="pointer-events-none">Supercritical</text>
                
                <text x="-12" y="50" fontSize="4" fill="#64748b" transform="rotate(-90, -12, 50)">Pressure</text>
                <text x="50" y="108" fontSize="4" fill="#64748b" textAnchor="middle">Temperature</text>
              </svg>
            </div>
          </div>

          <div className="flex-1 p-6 md:p-10 bg-slate-950/50 flex flex-col justify-center min-h-[400px]">
            {activeData ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase mb-4 ${activeData.bgLight} ${activeData.color}`}>
                  {activeData.title}
                </div>
                <h2 className="text-3xl font-bold text-slate-100 mb-2">{activeData.subtitle}</h2>
                <p className="text-slate-400 leading-relaxed mb-8">{activeData.description}</p>
                
                <div className="grid grid-cols-2 gap-4">
                  {activeData.properties.map((prop, idx) => (
                    <div key={idx} className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                      <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">{prop.label}</div>
                      <div className="text-sm font-medium text-slate-200">{prop.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-300 mb-2">Explore the Diagram</h3>
                <p className="text-slate-500 max-w-xs">Hover over different regions, lines, and points to learn about phase states and transitions.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const Beaker = ({ mass, maxMass, temp, label, width = "w-24", height = "h-40" }: { mass: number, maxMass: number, temp: number, label: string, width?: string, height?: string }) => {
  const fillPercentage = Math.min(100, Math.max(5, (mass / maxMass) * 100));
  const color = getTempColorHSL(temp);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-sm font-semibold text-slate-300">{label}</div>
      <div className={`${width} ${height} border-4 border-slate-600 border-t-0 rounded-b-2xl relative overflow-hidden bg-slate-800/50 shadow-inner`}>
        <div 
          className="absolute bottom-0 w-full transition-all duration-700 ease-in-out flex items-start justify-center pt-2"
          style={{ height: `${fillPercentage}%`, backgroundColor: color }}
        >
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
      <div className="text-xs font-mono bg-slate-800 px-2 py-1 rounded-md shadow-sm border border-slate-700 text-slate-200">
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
    <div className="p-4 md:p-8 w-full">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 drop-shadow-sm">
            Thermo Playground
          </h1>
          <p className="text-lg text-slate-400 font-medium max-w-2xl mx-auto">
            Mixing Hot & Cold: Explore the First Law of Thermodynamics and energy balance.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/70 backdrop-blur-xl shadow-xl rounded-3xl p-6 border border-red-900/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-red-500 pointer-events-none">
              <Flame size={64} />
            </div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-900/30 text-red-400 rounded-xl">
                <Flame />
              </div>
              <h2 className="text-2xl font-bold text-slate-200">Hot Fluid</h2>
            </div>

            <div className="flex gap-6">
              <div className="flex-1 space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-semibold text-slate-400">
                    <span className="flex items-center gap-1"><Droplet size={16} /> Mass (m₁)</span>
                    <span>{hot.mass} g</span>
                  </div>
                  <input 
                    type="range" min="10" max="100" step="1" 
                    value={hot.mass} onChange={(e) => setHot({...hot, mass: Number(e.target.value)})}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-semibold text-slate-400">
                    <span className="flex items-center gap-1"><Thermometer size={16} /> Temp (T₁)</span>
                    <span>{hot.temp} °C</span>
                  </div>
                  <input 
                    type="range" min="50" max="100" step="1" 
                    value={hot.temp} onChange={(e) => setHot({...hot, temp: Number(e.target.value)})}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-semibold text-slate-400">
                    <span className="flex items-center gap-1"><Activity size={16} /> Specific Heat (c₁)</span>
                    <span>{hot.c.toFixed(2)} J/g°C</span>
                  </div>
                  <input 
                    type="range" min="1" max="5" step="0.01" 
                    value={hot.c} onChange={(e) => setHot({...hot, c: Number(e.target.value)})}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                </div>
              </div>
              
              <div className="flex-shrink-0 flex items-center justify-center pl-4 border-l border-slate-700">
                <Beaker mass={hot.mass} maxMass={maxIndividualMass} temp={hot.temp} label="Source 1" />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/70 backdrop-blur-xl shadow-xl rounded-3xl p-6 border border-blue-900/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-blue-500 pointer-events-none">
              <Snowflake size={64} />
            </div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-900/30 text-blue-400 rounded-xl">
                <Snowflake />
              </div>
              <h2 className="text-2xl font-bold text-slate-200">Cold Fluid</h2>
            </div>

            <div className="flex gap-6">
              <div className="flex-1 space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-semibold text-slate-400">
                    <span className="flex items-center gap-1"><Droplet size={16} /> Mass (m₂)</span>
                    <span>{cold.mass} g</span>
                  </div>
                  <input 
                    type="range" min="10" max="100" step="1" 
                    value={cold.mass} onChange={(e) => setCold({...cold, mass: Number(e.target.value)})}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-semibold text-slate-400">
                    <span className="flex items-center gap-1"><Thermometer size={16} /> Temp (T₂)</span>
                    <span>{cold.temp} °C</span>
                  </div>
                  <input 
                    type="range" min="0" max="49" step="1" 
                    value={cold.temp} onChange={(e) => setCold({...cold, temp: Number(e.target.value)})}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-semibold text-slate-400">
                    <span className="flex items-center gap-1"><Activity size={16} /> Specific Heat (c₂)</span>
                    <span>{cold.c.toFixed(2)} J/g°C</span>
                  </div>
                  <input 
                    type="range" min="1" max="5" step="0.01" 
                    value={cold.c} onChange={(e) => setCold({...cold, c: Number(e.target.value)})}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex-shrink-0 flex items-center justify-center pl-4 border-l border-slate-700">
                <Beaker mass={cold.mass} maxMass={maxIndividualMass} temp={cold.temp} label="Source 2" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-2xl shadow-2xl rounded-3xl p-8 border border-slate-800">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-shrink-0 flex flex-col items-center">
              <h3 className="text-xl font-bold text-slate-200 mb-4">Final Mixture</h3>
              <Beaker 
                mass={finalState.totalMass} 
                maxMass={maxCombinedMass} 
                temp={finalState.finalTemp} 
                label={`Total: ${finalState.totalMass} g`}
                width="w-32"
                height="h-48"
              />
            </div>

            <div className="flex-1 w-full space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-100 mb-2">Energy Balance</h3>
                <p className="text-slate-400 text-sm">
                  Assuming no heat is lost to the surroundings, the heat energy lost by the hot fluid equals the heat energy gained by the cold fluid.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-red-900/20 border border-red-800/50 rounded-2xl p-4">
                  <div className="text-red-400 font-bold mb-2 text-sm uppercase tracking-wider">Heat Lost (Q_out)</div>
                  <div className="font-mono text-sm space-y-1 text-slate-300">
                    <div>Q = m₁ × c₁ × (T₁ - T_f)</div>
                    <div>Q = {hot.mass} × {hot.c.toFixed(2)} × ({hot.temp} - {finalState.finalTemp.toFixed(1)})</div>
                    <div className="text-lg font-bold text-red-400 mt-2 border-t border-red-800/50 pt-2">
                      {finalState.energyTransferred.toFixed(0)} Joules
                    </div>
                  </div>
                </div>

                <div className="bg-blue-900/20 border border-blue-800/50 rounded-2xl p-4">
                  <div className="text-blue-400 font-bold mb-2 text-sm uppercase tracking-wider">Heat Gained (Q_in)</div>
                  <div className="font-mono text-sm space-y-1 text-slate-300">
                    <div>Q = m₂ × c₂ × (T_f - T₂)</div>
                    <div>Q = {cold.mass} × {cold.c.toFixed(2)} × ({finalState.finalTemp.toFixed(1)} - {cold.temp})</div>
                    <div className="text-lg font-bold text-blue-400 mt-2 border-t border-blue-800/50 pt-2">
                      {finalState.energyTransferred.toFixed(0)} Joules
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                  <span>Energy Transfer Flow</span>
                </div>
                <div className="h-6 w-full bg-slate-800 rounded-full overflow-hidden flex relative shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500"
                    style={{ width: '50%' }}
                  />
                  <div 
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500"
                    style={{ width: '50%' }}
                  />
                  <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-slate-900 shadow-sm transform -translate-x-1/2" />
                  
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60">
                    <svg className="w-6 h-6 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                <div className="flex justify-between text-xs font-medium text-slate-400 mt-2">
                  <span>Hot Source Cooling</span>
                  <span>Cold Source Warming</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main App Component ---
export default function App() {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { name: 'Particle Box', icon: Activity },
    { name: 'PV/nT Chart', icon: Gauge },
    { name: 'Thermo Paths', icon: Maximize },
    { name: 'Phase Diagram', icon: Shield },
    { name: 'Mixing Hot/Cold', icon: Thermometer },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
            <Flame className="w-6 h-6 text-orange-500" />
            Thermo Play
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === idx;
            return (
              <button
                key={idx}
                onClick={() => setActiveTab(idx)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                  isActive 
                    ? 'bg-slate-800 text-orange-400 shadow-sm' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>
      <div className="flex-1 overflow-y-auto">
        {activeTab === 0 && <ParticleBox />}
        {activeTab === 1 && <PvNtChart />}
        {activeTab === 2 && <ThermoPath />}
        {activeTab === 3 && <PhaseDiagram />}
        {activeTab === 4 && <MixingExperiment />}
      </div>
    </div>
  );
}