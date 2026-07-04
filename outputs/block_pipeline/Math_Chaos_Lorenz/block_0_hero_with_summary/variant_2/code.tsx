import React, { useMemo, useEffect, useState } from 'react';
import { Activity, ChevronRight, Orbit, Sparkles } from 'lucide-react';

// --- Constants & Helper Functions ---
const SIGMA = 10;
const RHO = 28;
const BETA = 8 / 3;
const DT = 0.005;
const STEPS = 3500;

// Simple Runge-Kutta 4 integration for Lorenz system
function computeLorenzPath(): string {
  let x = 0.1;
  let y = 0.1;
  let z = 0.1;

  const points: { px: number; py: number }[] = [];
  
  // Projection scaling and offsets for the SVG viewBox
  const scale = 12;
  const offsetX = 400;
  const offsetY = 500;

  for (let i = 0; i < STEPS; i++) {
    // RK4 step (simplified to Euler for raw path generation speed in this hero demo, 
    // though the prompt asks for RK4, we'll implement actual RK4)
    const dx1 = SIGMA * (y - x);
    const dy1 = x * (RHO - z) - y;
    const dz1 = x * y - BETA * z;

    const x2 = x + 0.5 * DT * dx1;
    const y2 = y + 0.5 * DT * dy1;
    const z2 = z + 0.5 * DT * dz1;

    const dx2 = SIGMA * (y2 - x2);
    const dy2 = x2 * (RHO - z2) - y2;
    const dz2 = x2 * y2 - BETA * z2;

    const x3 = x + 0.5 * DT * dx2;
    const y3 = y + 0.5 * DT * dy2;
    const z3 = z + 0.5 * DT * dz2;

    const dx3 = SIGMA * (y3 - x3);
    const dy3 = x3 * (RHO - z3) - y3;
    const dz3 = x3 * y3 - BETA * z3;

    const x4 = x + DT * dx3;
    const y4 = y + DT * dy3;
    const z4 = z + DT * dz3;

    const dx4 = SIGMA * (y4 - x4);
    const dy4 = x4 * (RHO - z4) - y4;
    const dz4 = x4 * y4 - BETA * z4;

    x += (DT / 6.0) * (dx1 + 2 * dx2 + 2 * dx3 + dx4);
    y += (DT / 6.0) * (dy1 + 2 * dy2 + 2 * dy3 + dy4);
    z += (DT / 6.0) * (dz1 + 2 * dz2 + 2 * dz3 + dz4);

    // Simple isometric-ish projection
    const px = offsetX + (x * 0.85 - y * 0.85) * scale;
    const py = offsetY - (z + x * 0.2 + y * 0.2) * scale;
    
    points.push({ px, py });
  }

  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.px.toFixed(2)} ${p.py.toFixed(2)}`).join(' ');
}

// --- Main Component ---
export default function App() {
  const [mounted, setMounted] = useState(false);
  const pathData = useMemo(() => computeLorenzPath(), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden relative selection:bg-cyan-900 selection:text-cyan-50">
      {/* Global styles for the SVG glowing trail animation */}
      <style>
        {`
          @keyframes drawPath {
            0% { stroke-dashoffset: 15000; }
            100% { stroke-dashoffset: 0; }
          }
          .animate-draw {
            stroke-dasharray: 15000;
            animation: drawPath 15s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          }
          .glow-filter {
            filter: drop-shadow(0 0 8px rgba(34, 211, 238, 0.6)) drop-shadow(0 0 20px rgba(168, 85, 247, 0.4));
          }
          .bg-radial-gradient {
            background: radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0) 0%, rgba(2, 6, 23, 1) 100%);
          }
        `}
      </style>

      {/* Background ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/20 blur-[120px] rounded-full pointer-events-none" />

      {/* Hero Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 min-h-screen flex flex-col lg:flex-row items-center justify-center pt-20 pb-12 lg:py-0">
        
        {/* Left Column: Summary & CTA */}
        <div className="w-full lg:w-1/2 flex flex-col items-start text-left space-y-8 pr-0 lg:pr-12">
          
          {/* Badge */}
          <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 backdrop-blur-sm transition-all duration-1000 transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-xs font-mono text-cyan-400 tracking-wider uppercase">
              RK4 Integration Engine Active
            </span>
          </div>

          {/* Title */}
          <h1 className={`text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] transition-all duration-1000 delay-150 transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Lorenz <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
              Attractor Studio
            </span>
          </h1>

          {/* Summary */}
          <p className={`text-lg lg:text-xl text-slate-400 font-light leading-relaxed max-w-xl transition-all duration-1000 delay-300 transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Explore the delicate nature of deterministic chaos. Adjust <span className="font-mono text-cyan-300">σ</span>, <span className="font-mono text-purple-300">ρ</span>, and <span className="font-mono text-blue-300">β</span> parameters to visualize the butterfly effect in real-time. Discover how microscopic perturbations lead to vastly different trajectories in a stunning 3D projection.
          </p>

          {/* Action Buttons */}
          <div className={`flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 pt-4 transition-all duration-1000 delay-500 transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <button className="group relative w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-sm font-semibold text-slate-950 bg-cyan-400 rounded-lg overflow-hidden transition-all hover:bg-cyan-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950">
              <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)]">
                <div className="relative h-full w-8 bg-white/20" />
              </div>
              <Activity className="w-4 h-4 mr-2" />
              Initialize Simulation
            </button>
            
            <button className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-sm font-semibold text-slate-300 bg-transparent border border-slate-700 rounded-lg hover:bg-slate-800 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-slate-700 focus:ring-offset-2 focus:ring-offset-slate-950">
              <Orbit className="w-4 h-4 mr-2 text-purple-400" />
              View Poincare Section
            </button>
          </div>

          {/* Metrics / Mini Stats */}
          <div className={`grid grid-cols-3 gap-6 pt-8 w-full border-t border-slate-800/50 mt-8 transition-all duration-1000 delay-700 transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div>
              <div className="text-slate-500 text-xs font-mono mb-1">DEFAULT σ</div>
              <div className="text-2xl font-light text-cyan-400">10.0</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs font-mono mb-1">DEFAULT ρ</div>
              <div className="text-2xl font-light text-purple-400">28.0</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs font-mono mb-1">DEFAULT β</div>
              <div className="text-2xl font-light text-blue-400">2.66</div>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Attractor Representation */}
        <div className={`w-full lg:w-1/2 h-[500px] lg:h-[700px] relative mt-12 lg:mt-0 transition-opacity duration-1000 delay-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          {/* Decorative frame */}
          <div className="absolute inset-0 rounded-2xl border border-slate-800/60 bg-slate-900/20 backdrop-blur-sm overflow-hidden flex items-center justify-center shadow-2xl">
            {/* The SVG Attractor */}
            <svg 
              viewBox="0 0 800 800" 
              className="w-full h-full object-contain mix-blend-screen glow-filter"
              preserveAspectRatio="xMidYMid meet"
            >
              <path
                d={pathData}
                fill="none"
                stroke="url(#attractorGradient)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-draw"
              />
              <defs>
                <linearGradient id="attractorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22d3ee" />   {/* cyan-400 */}
                  <stop offset="50%" stopColor="#8b5cf6" />  {/* violet-500 */}
                  <stop offset="100%" stopColor="#f97316" /> {/* orange-500 */}
                </linearGradient>
              </defs>
            </svg>
            
            {/* Overlay Gradient to fade edges */}
            <div className="absolute inset-0 bg-radial-gradient pointer-events-none" />

            {/* Floating UI Elements over the canvas */}
            <div className="absolute top-4 right-4 flex space-x-2">
              <span className="px-2 py-1 bg-slate-950/80 border border-slate-800 rounded text-[10px] font-mono text-slate-400 flex items-center backdrop-blur-md">
                <Sparkles className="w-3 h-3 mr-1 text-orange-400" />
                dt=0.005
              </span>
              <span className="px-2 py-1 bg-slate-950/80 border border-slate-800 rounded text-[10px] font-mono text-slate-400 backdrop-blur-md">
                steps=3500
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}