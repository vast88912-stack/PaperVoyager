import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Types ---
interface Point {
  x: number;
  y: number;
}

interface Body {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  radius: number;
  color: string;
  trail: Point[];
}

// --- Constants ---
const G = 0.5; // Gravitational constant for the simulation
const MAX_TRAIL_LENGTH = 80;
const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

// --- Helper Functions ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];
const calculateRadius = (mass: number) => Math.max(3, Math.pow(mass, 0.33) * 2);

export default function App() {
  // --- State & Refs ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const bodiesRef = useRef<Body[]>([]);
  
  // UI State
  const [uiBodies, setUiBodies] = useState<Body[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  
  // Form State for new body
  const [newMass, setNewMass] = useState<number>(100);
  const [newVx, setNewVx] = useState<number>(0);
  const [newVy, setNewVy] = useState<number>(0);
  const [newColor, setNewColor] = useState<string>(COLORS[0]);
  const [placementMode, setPlacementMode] = useState<boolean>(false);

  // --- Physics Engine ---
  const updatePhysics = useCallback(() => {
    if (isPaused) return;

    const bodies = bodiesRef.current;

    // Calculate forces and update velocities (Semi-implicit Euler)
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const b1 = bodies[i];
        const b2 = bodies[j];

        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        // Prevent singularity / extreme forces on overlap
        if (dist < (b1.radius + b2.radius) / 2) continue;

        const force = (G * b1.mass * b2.mass) / distSq;
        const fx = force * (dx / dist);
        const fy = force * (dy / dist);

        b1.vx += fx / b1.mass;
        b1.vy += fy / b1.mass;
        b2.vx -= fx / b2.mass;
        b2.vy -= fy / b2.mass;
      }
    }

    // Update positions and trails
    bodies.forEach((b) => {
      b.x += b.vx;
      b.y += b.vy;
      
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > MAX_TRAIL_LENGTH) {
        b.trail.shift();
      }
    });

  }, [isPaused]);

  // --- Rendering Engine ---
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with dark starfield background
    ctx.fillStyle = '#020617'; // tailwind slate-950
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid (optional, for spatial reference)
    ctx.strokeStyle = '#1e293b'; // tailwind slate-800
    ctx.lineWidth = 0.5;
    for (let i = 0; i < canvas.width; i += 50) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 50) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    const bodies = bodiesRef.current;

    // Draw trails
    bodies.forEach((b) => {
      if (b.trail.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(b.trail[0].x, b.trail[0].y);
      for (let i = 1; i < b.trail.length; i++) {
        ctx.lineTo(b.trail[i].x, b.trail[i].y);
      }
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Fade out trail
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    });

    // Draw bodies
    bodies.forEach((b) => {
      // Glow effect
      ctx.shadowBlur = 15;
      ctx.shadowColor = b.color;
      
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();
      
      // Reset shadow
      ctx.shadowBlur = 0;
      
      // Draw velocity vector (optional, for debugging/visuals)
      /*
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x + b.vx * 10, b.y + b.vy * 10);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
      */
    });

  }, []);

  // --- Animation Loop ---
  const tick = useCallback(() => {
    updatePhysics();
    renderCanvas();
    requestRef.current = requestAnimationFrame(tick);
  }, [updatePhysics, renderCanvas]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(tick);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [tick]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    
    // Initialize with a default system (Earth-Moon like)
    if (bodiesRef.current.length === 0) {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      addBody({ x: cx, y: cy, vx: 0, vy: 0, mass: 5000, color: '#f59e0b' }); // Sun
      addBody({ x: cx, y: cy - 200, vx: 3.5, vy: 0, mass: 50, color: '#3b82f6' }); // Planet
    }
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Actions ---
  const syncUI = () => {
    setUiBodies([...bodiesRef.current]);
  };

  const addBody = (params: Partial<Body>) => {
    const newBody: Body = {
      id: generateId(),
      x: params.x || window.innerWidth / 2,
      y: params.y || window.innerHeight / 2,
      vx: params.vx || 0,
      vy: params.vy || 0,
      mass: params.mass || 100,
      radius: calculateRadius(params.mass || 100),
      color: params.color || getRandomColor(),
      trail: []
    };
    bodiesRef.current.push(newBody);
    syncUI();
  };

  const removeBody = (id: string) => {
    bodiesRef.current = bodiesRef.current.filter((b) => b.id !== id);
    syncUI();
  };

  const clearBodies = () => {
    bodiesRef.current = [];
    syncUI();
  };

  const addRandomBody = () => {
    const margin = 100;
    addBody({
      x: margin + Math.random() * (window.innerWidth - margin * 2),
      y: margin + Math.random() * (window.innerHeight - margin * 2),
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      mass: 10 + Math.random() * 400,
      color: getRandomColor()
    });
  };

  // Canvas Click Handler
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (placementMode) {
      addBody({
        x: e.clientX,
        y: e.clientY,
        vx: newVx,
        vy: newVy,
        mass: newMass,
        color: newColor
      });
      setPlacementMode(false);
    }
  };

  // Sync UI periodically to update positions in list (if needed), but here we just sync on add/remove
  useEffect(() => {
    syncUI();
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans text-slate-200">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className={`absolute inset-0 z-0 ${placementMode ? 'cursor-crosshair' : 'cursor-default'}`}
      />

      {/* Placement Mode Overlay */}
      {placementMode && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10 bg-blue-600/90 text-white px-6 py-3 rounded-full shadow-lg shadow-blue-500/20 backdrop-blur-sm animate-pulse flex items-center gap-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          <span className="font-medium tracking-wide">Click anywhere on the starfield to place the body</span>
          <button 
            onClick={() => setPlacementMode(false)}
            className="ml-4 hover:text-blue-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Sidebar UI - Add/Remove Bodies Focus */}
      <div className="absolute right-0 top-0 bottom-0 w-80 bg-slate-900/80 backdrop-blur-xl border-l border-slate-800/50 flex flex-col z-20 shadow-2xl overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800/50">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent flex items-center gap-2">
            Orbit Playground
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Body Management</p>
        </div>

        {/* Add Body Section */}
        <div className="p-6 border-b border-slate-800/50">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Body
          </h2>
          
          <div className="space-y-4">
            {/* Mass Slider */}
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Mass</span>
                <span className="text-slate-200 font-mono">{newMass.toFixed(0)}</span>
              </div>
              <input 
                type="range" min="10" max="10000" step="10"
                value={newMass} onChange={(e) => setNewMass(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            {/* Velocity Sliders */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Vel X</span>
                  <span className="text-slate-200 font-mono">{newVx.toFixed(1)}</span>
                </div>
                <input 
                  type="range" min="-10" max="10" step="0.1"
                  value={newVx} onChange={(e) => setNewVx(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Vel Y</span>
                  <span className="text-slate-200 font-mono">{newVy.toFixed(1)}</span>
                </div>
                <input 
                  type="range" min="-10" max="10" step="0.1"
                  value={newVy} onChange={(e) => setNewVy(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>

            {/* Color Picker */}
            <div>
              <span className="text-xs text-slate-400 mb-2 block">Color Signature</span>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${newColor === c ? 'border-white scale-125' : 'border-transparent hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setPlacementMode(true)}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${placementMode ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'}`}
              >
                {placementMode ? 'Cancel' : 'Place on Canvas'}
              </button>
              <button
                onClick={addRandomBody}
                className="py-2 px-3 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
                title="Add Random Body"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Active Bodies List */}
        <div className="p-6 flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Active Bodies ({uiBodies.length})
            </h2>
            {uiBodies.length > 0 && (
              <button 
                onClick={clearBodies}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          {uiBodies.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm text-center">
              <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <p>The void is empty.</p>
              <p className="mt-1">Add bodies to begin simulation.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
              {uiBodies.map((body) => (
                <div key={body.id} className="group flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-colors">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full shadow-sm" 
                      style={{ backgroundColor: body.color, boxShadow: `0 0 8px ${body.color}` }}
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-200">Body {body.id}</div>
                      <div className="text-xs text-slate-500 font-mono">Mass: {body.mass.toFixed(0)}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeBody(body.id)}
                    className="p-2 text-slate-500 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all"
                    title="Remove Body"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Global Controls */}
        <div className="p-6 border-t border-slate-800/50 bg-slate-900/90">
          <