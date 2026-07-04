import React, { useEffect, useRef, useState, useCallback } from 'react';

type Vector = { x: number; y: number };

type Body = {
  id: string;
  mass: number;
  pos: Vector;
  vel: Vector;
  color: string;
  trail: Vector[];
};

type IntegratorType = 'euler' | 'verlet';

const G = 1;
const SUB_STEPS = 10;
const DT = 0.08 / SUB_STEPS;
const TRAIL_LENGTH = 150;

const PRESETS = {
  binary: [
    { id: '1', mass: 5000, pos: { x: -100, y: 0 }, vel: { x: 0, y: -3.53 }, color: '#3b82f6', trail: [] },
    { id: '2', mass: 5000, pos: { x: 100, y: 0 }, vel: { x: 0, y: 3.53 }, color: '#ef4444', trail: [] },
  ],
  system: [
    { id: 'star', mass: 15000, pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, color: '#fbbf24', trail: [] },
    { id: 'p1', mass: 100, pos: { x: 150, y: 0 }, vel: { x: 0, y: 10 }, color: '#10b981', trail: [] },
    { id: 'p2', mass: 50, pos: { x: -250, y: 0 }, vel: { x: 0, y: -7.74 }, color: '#8b5cf6', trail: [] },
    { id: 'p3', mass: 10, pos: { x: 0, y: 350 }, vel: { x: -6.54, y: 0 }, color: '#ec4899', trail: [] },
  ],
  figure8: [
    { id: '1', mass: 1000, pos: { x: 97, y: -24.3 }, vel: { x: 4.66, y: 4.32 }, color: '#f43f5e', trail: [] },
    { id: '2', mass: 1000, pos: { x: -97, y: 24.3 }, vel: { x: 4.66, y: 4.32 }, color: '#0ea5e9', trail: [] },
    { id: '3', mass: 1000, pos: { x: 0, y: 0 }, vel: { x: -9.32, y: -8.64 }, color: '#eab308', trail: [] },
  ]
};

const getAccelerations = (bodies: Body[]): Vector[] => {
  const acc = bodies.map(() => ({ x: 0, y: 0 }));
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const dx = bodies[j].pos.x - bodies[i].pos.x;
      const dy = bodies[j].pos.y - bodies[i].pos.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);
      
      const force = (G * bodies[i].mass * bodies[j].mass) / (distSq + 10); // Softening to prevent infinity
      
      const ax = (force * dx) / dist;
      const ay = (force * dy) / dist;
      
      acc[i].x += ax / bodies[i].mass;
      acc[i].y += ay / bodies[i].mass;
      acc[j].x -= ax / bodies[j].mass;
      acc[j].y -= ay / bodies[j].mass;
    }
  }
  return acc;
};

const getEnergy = (bodies: Body[]): number => {
  let ke = 0;
  let pe = 0;
  for (let i = 0; i < bodies.length; i++) {
    ke += 0.5 * bodies[i].mass * (bodies[i].vel.x ** 2 + bodies[i].vel.y ** 2);
    for (let j = i + 1; j < bodies.length; j++) {
      const dx = bodies[j].pos.x - bodies[i].pos.x;
      const dy = bodies[j].pos.y - bodies[i].pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      pe -= (G * bodies[i].mass * bodies[j].mass) / dist;
    }
  }
  return ke + pe;
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const bodiesRef = useRef<Body[]>(JSON.parse(JSON.stringify(PRESETS.system)));
  
  const [integrator, setIntegrator] = useState<IntegratorType>('verlet');
  const [isRunning, setIsRunning] = useState(true);
  const [initialEnergy, setInitialEnergy] = useState<number>(0);
  const [currentEnergy, setCurrentEnergy] = useState<number>(0);
  const [activePreset, setActivePreset] = useState<keyof typeof PRESETS>('system');

  const resetSimulation = useCallback((presetKey: keyof typeof PRESETS = activePreset) => {
    bodiesRef.current = JSON.parse(JSON.stringify(PRESETS[presetKey]));
    const e0 = getEnergy(bodiesRef.current);
    setInitialEnergy(e0);
    setCurrentEnergy(e0);
    setActivePreset(presetKey);
  }, [activePreset]);

  useEffect(() => {
    resetSimulation('system');
  }, [resetSimulation]);

  const stepEuler = (bodies: Body[]) => {
    const acc = getAccelerations(bodies);
    for (let i = 0; i < bodies.length; i++) {
      bodies[i].pos.x += bodies[i].vel.x * DT;
      bodies[i].pos.y += bodies[i].vel.y * DT;
      bodies[i].vel.x += acc[i].x * DT;
      bodies[i].vel.y += acc[i].y * DT;
    }
  };

  const stepVerlet = (bodies: Body[]) => {
    const accOld = getAccelerations(bodies);
    for (let i = 0; i < bodies.length; i++) {
      bodies[i].pos.x += bodies[i].vel.x * DT + 0.5 * accOld[i].x * DT * DT;
      bodies[i].pos.y += bodies[i].vel.y * DT + 0.5 * accOld[i].y * DT * DT;
    }
    const accNew = getAccelerations(bodies);
    for (let i = 0; i < bodies.length; i++) {
      bodies[i].vel.x += 0.5 * (accOld[i].x + accNew[i].x) * DT;
      bodies[i].vel.y += 0.5 * (accOld[i].y + accNew[i].y) * DT;
    }
  };

  const updatePhysics = useCallback(() => {
    if (!isRunning) return;

    for (let step = 0; step < SUB_STEPS; step++) {
      if (integrator === 'euler') {
        stepEuler(bodiesRef.current);
      } else {
        stepVerlet(bodiesRef.current);
      }
    }

    // Update trails and energy
    const currentE = getEnergy(bodiesRef.current);
    setCurrentEnergy(currentE);

    bodiesRef.current.forEach(b => {
      b.trail.push({ x: b.pos.x, y: b.pos.y });
      if (b.trail.length > TRAIL_LENGTH) {
        b.trail.shift();
      }
    });
  }, [integrator, isRunning]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.fillStyle = '#020617'; // slate-950
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);

    // Draw grid
    ctx.strokeStyle = '#1e293b'; // slate-800
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = -canvas.width / 2; x < canvas.width / 2; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, -canvas.height / 2); ctx.lineTo(x, canvas.height / 2); ctx.stroke();
    }
    for (let y = -canvas.height / 2; y < canvas.height / 2; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(-canvas.width / 2, y); ctx.lineTo(canvas.width / 2, y); ctx.stroke();
    }

    // Draw bodies and trails
    bodiesRef.current.forEach(b => {
      // Trail
      if (b.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(b.trail[0].x, b.trail[0].y);
        for (let i = 1; i < b.trail.length; i++) {
          ctx.lineTo(b.trail[i].x, b.trail[i].y);
        }
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      // Body
      ctx.beginPath();
      const radius = Math.max(3, Math.log10(b.mass) * 3);
      ctx.arc(b.pos.x, b.pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();
      
      // Glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = b.color;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    ctx.restore();
  }, []);

  const loop = useCallback(() => {
    updatePhysics();
    draw();
    requestRef.current = requestAnimationFrame(loop);
  }, [updatePhysics, draw]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const energyDrift = initialEnergy !== 0 
    ? Math.abs((currentEnergy - initialEnergy) / initialEnergy) * 100 
    : 0;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans text-slate-200">
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />

      {/* Control Panel */}
      <div className="absolute top-6 left-6 z-10 w-80 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-800/30">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
            </svg>
            Orbit Playground
          </h1>
          <p className="text-xs text-slate-400 mt-1">Integrator Analysis Module</p>
        </div>

        <div className="p-5 space-y-6">
          
          {/* Integrator Choice */}
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Integrator</label>
            </div>
            
            <div className="flex bg-slate-950/50 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setIntegrator('euler')}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 ${
                  integrator === 'euler' 
                    ? 'bg-rose-500/20 text-rose-400 shadow-[inset_0_0_0_1px_rgba(244,63,94,0.5)]' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                Explicit Euler
              </button>
              <button
                onClick={() => setIntegrator('verlet')}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 ${
                  integrator === 'verlet' 
                    ? 'bg-emerald-500/20 text-emerald-400 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.5)]' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                Velocity Verlet
              </button>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              {integrator === 'euler' 
                ? "Euler is a simple 1st-order method. It introduces artificial energy into orbital systems, causing them to spiral outward (unstable)."
                : "Verlet is a 2nd-order symplectic method. It conserves the system's total energy over time, keeping orbits stable."}
            </p>
          </div>

          {/* Energy Metrics */}
          <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/50">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">System Energy</h3>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Initial (E₀)</span>
              <span className="font-mono text-sm text-slate-300">{initialEnergy.toExponential(4)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Current (E)</span>
              <span className="font-mono text-sm text-slate-300">{currentEnergy.toExponential(4)}</span>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-800">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-slate-400">Energy Drift</span>
                <span className={`font-mono text-sm font-bold ${energyDrift > 5 ? 'text-rose-500' : energyDrift > 1 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {energyDrift.toFixed(4)}%
                </span>
              </div>
              {/* Drift Bar */}
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${energyDrift > 5 ? 'bg-rose-500' : energyDrift > 1 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                  style={{ width: `${Math.min(energyDrift * 10, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Presets & Controls */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Presets</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map(key => (
                <button
                  key={key}
                  onClick={() => resetSimulation(key)}
                  className={`py-1.5 px-2 text-xs font-medium rounded border transition-colors ${
                    activePreset === key
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors border border-slate-700"
            >
              {isRunning ? (
                <>
                  <svg className="w-4 h-4" fill="