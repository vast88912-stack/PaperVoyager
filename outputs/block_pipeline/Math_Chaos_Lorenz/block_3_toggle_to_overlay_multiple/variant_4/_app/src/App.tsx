import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- RK4 Integration Helper ---
const rk4 = (x: number, y: number, z: number, sigma: number, rho: number, beta: number, dt: number) => {
  const dx1 = sigma * (y - x);
  const dy1 = x * (rho - z) - y;
  const dz1 = x * y - beta * z;

  const x2 = x + 0.5 * dt * dx1;
  const y2 = y + 0.5 * dt * dy1;
  const z2 = z + 0.5 * dt * dz1;

  const dx2 = sigma * (y2 - x2);
  const dy2 = x2 * (rho - z2) - y2;
  const dz2 = x2 * y2 - beta * z2;

  const x3 = x + 0.5 * dt * dx2;
  const y3 = y + 0.5 * dt * dy2;
  const z3 = z + 0.5 * dt * dz2;

  const dx3 = sigma * (y3 - x3);
  const dy3 = x3 * (rho - z3) - y3;
  const dz3 = x3 * y3 - beta * z3;

  const x4 = x + dt * dx3;
  const y4 = y + dt * dy3;
  const z4 = z + dt * dz3;

  const dx4 = sigma * (y4 - x4);
  const dy4 = x4 * (rho - z4) - y4;
  const dz4 = x4 * y4 - beta * z4;

  return [
    x + (dt / 6.0) * (dx1 + 2 * dx2 + 2 * dx3 + dx4),
    y + (dt / 6.0) * (dy1 + 2 * dy2 + 2 * dy3 + dy4),
    z + (dt / 6.0) * (dz1 + 2 * dz2 + 2 * dz3 + dz4),
  ];
};

// --- Projection Helper (3D to 2D Isometric) ---
const project = (x: number, y: number, z: number, width: number, height: number, scale: number = 18) => {
  // Isometric-like projection
  const u = (x - y) * Math.cos(Math.PI / 6);
  const v = z - (x + y) * Math.sin(Math.PI / 6);
  
  return {
    px: u * scale + width / 2,
    py: -v * scale + height / 2 + 350, // Shifted down because z is mostly positive
  };
};

type Trajectory = {
  x: number;
  y: number;
  z: number;
  sigma: number;
  rho: number;
  beta: number;
  color: string;
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Base Parameters
  const [sigma, setSigma] = useState<number>(10);
  const [rho, setRho] = useState<number>(28);
  const [beta, setBeta] = useState<number>(2.667); // 8/3
  
  // Features
  const [showPerturbations, setShowPerturbations] = useState<boolean>(true);
  
  // Animation Control
  const animationRef = useRef<number>();
  const trajectoriesRef = useRef<Trajectory[]>([]);
  const stepCountRef = useRef<number>(0);

  const MAX_STEPS = 12000; // Cap step count for performance and visual clarity
  const DT = 0.006;
  const STEPS_PER_FRAME = 4;

  const initSimulation = useCallback(() => {
    stepCountRef.current = 0;
    
    // Base trajectory
    const base: Trajectory = {
      x: 0.1, y: 0.1, z: 0.1,
      sigma, rho, beta,
      color: '#00F0FF' // Cyan
    };

    if (showPerturbations) {
      trajectoriesRef.current = [
        base,
        { ...base, rho: rho + 0.05, color: '#FF003C' }, // Perturbation 1: Neon Pink
        { ...base, rho: rho - 0.05, color: '#E0FF00' }, // Perturbation 2: Neon Yellow
      ];
    } else {
      trajectoriesRef.current = [base];
    }

    // Clear canvas immediately on reset
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0B0F19'; // Midnight background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [sigma, rho, beta, showPerturbations]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initSimulation();
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial sizing
    return () => window.removeEventListener('resize', handleResize);
  }, [initSimulation]);

  // Main Simulation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !ctx) return;

    let isRunning = true;

    const loop = () => {
      if (!isRunning) return;

      // Auto-restart if cap is reached
      if (stepCountRef.current >= MAX_STEPS) {
        initSimulation();
      }

      // Fading effect for glow trails
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(11, 15, 25, 0.04)'; // Subtle fade
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Perform multiple RK4 steps per frame for smooth, fast drawing
      for (let s = 0; s < STEPS_PER_FRAME; s++) {
        stepCountRef.current++;

        trajectoriesRef.current.forEach((t) => {
          const [nx, ny, nz] = rk4(t.x, t.y, t.z, t.sigma, t.rho, t.beta, DT);
          
          const prev = project(t.x, t.y, t.z, canvas.width, canvas.height);
          const next = project(nx, ny, nz, canvas.width, canvas.height);

          ctx.beginPath();
          ctx.moveTo(prev.px, prev.py);
          ctx.lineTo(next.px, next.py);
          
          // Glow setup
          ctx.strokeStyle = t.color;
          ctx.shadowBlur = 8;
          ctx.shadowColor = t.color;
          
          ctx.stroke();

          // Update state
          t.x = nx;
          t.y = ny;
          t.z = nz;
        });
      }

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [initSimulation]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0B0F19] font-sans text-slate-200">
      {/* 3D-like Projection Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0 pointer-events-none"
      />

      {/* Control Overlay */}
      <div className="absolute top-6 left-6 z-10 w-80 bg-[#111827]/80 backdrop-blur-lg border border-[#1F2937] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[#1F2937] bg-gradient-to-br from-[#111827] to-[#0B0F19]">
          <h1 className="text-xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]">
            Lorenz Attractor
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">
            Chaotic Parameter Sensitivity
          </p>
        </div>

        {/* Controls Body */}
        <div className="p-5 flex flex-col gap-6">
          
          {/* Sliders */}
          <div className="flex flex-col gap-4">
            <ControlSlider
              label="Sigma (σ)"
              value={sigma}
              min={1} max={30} step={0.1}
              onChange={setSigma}
              color="cyan"
            />
            <ControlSlider
              label="Rho (ρ)"
              value={rho}
              min={1} max={50} step={0.1}
              onChange={setRho}
              color="cyan"
            />
            <ControlSlider
              label="Beta (β)"
              value={beta}
              min={0.1} max={10} step={0.01}
              onChange={setBeta}
              color="cyan"
            />
          </div>

          <hr className="border-[#1F2937]" />

          {/* Toggle Module block #4 Focus */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">Overlay Perturbations</span>
              <button
                onClick={() => setShowPerturbations(!showPerturbations)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#111827] ${
                  showPerturbations ? 'bg-cyan-500 shadow-[0_0_10px_rgba(0,240,255,0.6)]' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showPerturbations ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              Toggle to overlay multiple trajectories. Notice how tiny parameter perturbations in <b>ρ</b> (±0.05) cause paths to diverge wildly—the hallmark of a chaotic system.
            </p>

            {/* Legend (Only visible if toggled) */}
            <div className={`mt-2 flex flex-col gap-2 transition-opacity duration-300 ${showPerturbations ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
              <LegendItem color="#00F0FF" label="Base (ρ)" />
              <LegendItem color="#FF003C" label="Perturbed (ρ + 0.05)" />
              <LegendItem color="#E0FF00" label="Perturbed (ρ - 0.05)" />
            </div>
          </div>

          <button
            onClick={initSimulation}
            className="mt-2 w-full py-2.5 bg-[#1F2937] hover:bg-[#374151] active:bg-[#111827] text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            Restart Simulation
          </button>
        </div>
      </div>
      
      {/* Small Performance note bottom right */}
      <div className="absolute bottom-4 right-6 text-[10px] text-slate-600 uppercase tracking-widest font-mono">
        RK4 Integrator • Max Steps: {MAX_STEPS}
      </div>
    </div>
  );
}

// --- UI Components ---

function ControlSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
        <span className="text-xs font-mono text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300 transition-all"
      />
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-3 h-0.5 rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 8px ${color}`
        }}
      />
      <span className="text-[11px] font-mono text-slate-400">{label}</span>
    </div>
  );
}