import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Rocket, Settings2, Eye, Activity, Target } from 'lucide-react';

// --- Types ---
interface Vector2D {
  x: number;
  y: number;
}

interface Body {
  id: string;
  name: string;
  mass: number;
  position: Vector2D;
  velocity: Vector2D;
  color: string;
  radius: number;
}

// --- Helpers ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const calculateRadius = (mass: number) => Math.max(4, Math.pow(mass, 0.33) * 2);

const DEFAULT_BODIES: Body[] = [
  {
    id: generateId(),
    name: 'Star Alpha',
    mass: 10000,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    color: '#fbbf24', // amber-400
    radius: calculateRadius(10000),
  },
  {
    id: generateId(),
    name: 'Planet Beta',
    mass: 100,
    position: { x: 200, y: 0 },
    velocity: { x: 0, y: 6 },
    color: '#38bdf8', // sky-400
    radius: calculateRadius(100),
  },
];

const PRESET_COLORS = ['#ef4444', '#f97316', '#fbbf24', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e', '#ffffff'];

export default function App() {
  const [bodies, setBodies] = useState<Body[]>(DEFAULT_BODIES);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // View state
  const [scale, setScale] = useState<number>(1);
  const [offset, setOffset] = useState<Vector2D>({ x: 0, y: 0 });

  // New Body Form State
  const [newMass, setNewMass] = useState<number>(50);
  const [newPosX, setNewPosX] = useState<number>(100);
  const [newPosY, setNewPosY] = useState<number>(100);
  const [newVelX, setNewVelX] = useState<number>(-2);
  const [newVelY, setNewVelY] = useState<number>(2);
  const [newColor, setNewColor] = useState<string>(PRESET_COLORS[9]);
  const [newName, setNewName] = useState<string>('New Object');

  // --- Canvas Rendering ---
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle Resize
    const { width, height } = container.getBoundingClientRect();
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // Clear & Background
    ctx.fillStyle = '#0a0a0a'; // neutral-950
    ctx.fillRect(0, 0, width, height);

    // Draw Grid
    ctx.save();
    ctx.translate(width / 2 + offset.x, height / 2 + offset.y);
    ctx.scale(scale, scale);

    ctx.strokeStyle = '#171717'; // neutral-900
    ctx.lineWidth = 1 / scale;
    const gridSize = 100;
    const maxGrid = 2000;
    ctx.beginPath();
    for (let x = -maxGrid; x <= maxGrid; x += gridSize) {
      ctx.moveTo(x, -maxGrid);
      ctx.lineTo(x, maxGrid);
    }
    for (let y = -maxGrid; y <= maxGrid; y += gridSize) {
      ctx.moveTo(-maxGrid, y);
      ctx.lineTo(maxGrid, y);
    }
    ctx.stroke();

    // Draw Axes
    ctx.strokeStyle = '#262626'; // neutral-800
    ctx.lineWidth = 2 / scale;
    ctx.beginPath();
    ctx.moveTo(-maxGrid, 0); ctx.lineTo(maxGrid, 0);
    ctx.moveTo(0, -maxGrid); ctx.lineTo(0, maxGrid);
    ctx.stroke();

    // Draw Bodies
    bodies.forEach(body => {
      // Trail/Glow
      const gradient = ctx.createRadialGradient(
        body.position.x, body.position.y, body.radius * 0.1,
        body.position.x, body.position.y, body.radius * 2
      );
      gradient.addColorStop(0, body.color);
      gradient.addColorStop(1, 'transparent');
      
      ctx.beginPath();
      ctx.arc(body.position.x, body.position.y, body.radius * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(body.position.x, body.position.y, body.radius, 0, Math.PI * 2);
      ctx.fillStyle = body.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1 / scale;
      ctx.stroke();

      // Velocity Vector (Setup phase visualization)
      if (body.velocity.x !== 0 || body.velocity.y !== 0) {
        ctx.beginPath();
        ctx.moveTo(body.position.x, body.position.y);
        const velScale = 10; // Visual scale for vectors
        const endX = body.position.x + body.velocity.x * velScale;
        const endY = body.position.y + body.velocity.y * velScale;
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = `${body.color}88`; // Semi-transparent
        ctx.lineWidth = 2 / scale;
        ctx.stroke();

        // Arrowhead
        const angle = Math.atan2(body.velocity.y, body.velocity.x);
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - 8/scale * Math.cos(angle - Math.PI/6), endY - 8/scale * Math.sin(angle - Math.PI/6));
        ctx.lineTo(endX - 8/scale * Math.cos(angle + Math.PI/6), endY - 8/scale * Math.sin(angle + Math.PI/6));
        ctx.lineTo(endX, endY);
        ctx.fillStyle = `${body.color}88`;
        ctx.fill();
      }

      // Label
      ctx.fillStyle = '#a3a3a3'; // neutral-400
      ctx.font = `${12 / scale}px sans-serif`;
      ctx.fillText(body.name, body.position.x + body.radius + 5/scale, body.position.y + 4/scale);
    });

    ctx.restore();

    // Crosshair in center of screen
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 10, height / 2); ctx.lineTo(width / 2 + 10, height / 2);
    ctx.moveTo(width / 2, height / 2 - 10); ctx.lineTo(width / 2, height / 2 + 10);
    ctx.stroke();

  }, [bodies, scale, offset]);

  useEffect(() => {
    let animationFrameId: number;
    const renderLoop = () => {
      draw();
      animationFrameId = requestAnimationFrame(renderLoop);
    };
    renderLoop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [draw]);


  // --- Actions ---
  const handleAddBody = (e: React.FormEvent) => {
    e.preventDefault();
    const newBody: Body = {
      id: generateId(),
      name: newName || `Object ${bodies.length + 1}`,
      mass: newMass,
      position: { x: newPosX, y: newPosY },
      velocity: { x: newVelX, y: newVelY },
      color: newColor,
      radius: calculateRadius(newMass),
    };
    setBodies([...bodies, newBody]);
    
    // Slight randomization for next body to avoid exact overlap if user just clicks add repeatedly
    setNewPosX(prev => prev + 20);
    setNewPosY(prev => prev + 20);
  };

  const handleRemoveBody = (id: string) => {
    setBodies(bodies.filter(b => b.id !== id));
  };

  const handleClearAll = () => {
    if (window.confirm("Remove all bodies?")) {
      setBodies([]);
    }
  };


  return (
    <div className="flex h-screen w-full bg-neutral-950 text-neutral-200 font-sans overflow-hidden selection:bg-cyan-900 selection:text-cyan-100">
      
      {/* LEFT: Canvas Area */}
      <div className="flex-grow relative flex flex-col" ref={containerRef}>
        <div className="absolute top-4 left-4 z-10 flex items-center space-x-3 bg-neutral-900/80 backdrop-blur-md px-4 py-2 rounded-lg border border-neutral-800 shadow-xl">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h1 className="text-lg font-bold tracking-wider uppercase text-neutral-100">
            Orbit<span className="text-cyan-400">Playground</span>
          </h1>
          <span className="text-xs font-mono text-neutral-500 bg-neutral-800 px-2 py-1 rounded">SETUP MODE</span>
        </div>

        {/* View Controls Overlay */}
        <div className="absolute bottom-4 left-4 z-10 flex space-x-2">
           <div className="bg-neutral-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-800 shadow-xl flex items-center space-x-4 text-xs font-mono">
              <span className="text-neutral-400">Total Bodies: <span className="text-cyan-400 font-bold text-sm">{bodies.length}</span></span>
              <span className="text-neutral-400">View Scale: <span className="text-neutral-200">{(scale * 100).toFixed(0)}%</span></span>
           </div>
        </div>

        <canvas 
          ref={canvasRef} 
          className="w-full h-full cursor-crosshair"
          onWheel={(e) => {
             // Simple zoom
             const zoomIntensity = 0.1;
             const newScale = e.deltaY < 0 ? scale * (1 + zoomIntensity) : scale / (1 + zoomIntensity);
             setScale(Math.max(0.1, Math.min(newScale, 10)));
          }}
        />
      </div>

      {/* RIGHT: Control Panel */}
      <div className="w-[400px] flex-shrink-0 bg-neutral-900 border-l border-neutral-800 flex flex-col shadow-2xl z-20 overflow-hidden relative">
        
        {/* Panel Header */}
        <div className="p-5 border-b border-neutral-800 bg-neutral-900/50 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Settings2 className="w-5 h-5 text-neutral-400" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-300">Entity Management</h2>
          </div>
          {bodies.length > 0 && (
            <button 
              onClick={handleClearAll}
              className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-red-400/10"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-grow overflow-y-auto custom-scrollbar">
          
          {/* Active Bodies List */}
          <div className="p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center">
              <Eye className="w-3 h-3 mr-2" />
              Active Entities ({bodies.length})
            </h3>
            
            <div className="space-y-2">
              {bodies.length === 0 ? (
                <div className="text-center p-6 border border-dashed border-neutral-800 rounded-lg text-neutral-600 text-sm">
                  Space is empty. Add a body below.
                </div>
              ) : (
                bodies.map(body => (
                  <div key={body.id} className="group flex items-center justify-between p-3 rounded-md bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-all">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="w-4 h-4 rounded-full shadow-sm flex-shrink-0" style={{ backgroundColor: body.color, boxShadow: `0 0 8px ${body.color}88` }} />
                      <div className="flex flex-col truncate">
                        <span className="text-sm font-medium text-neutral-200 truncate">{body.name}</span>
                        <span className="text-[10px] font-mono text-neutral-500">
                          M:{body.mass} | P:({body.position.x},{body.position.y}) | V:({body.velocity.x},{body.velocity.y})
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveBody(body.id)}
                      className="text-neutral-600 hover:text-red-400 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-all hover:bg-neutral-800"
                      title="Remove Body"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-neutral-800 to-transparent my-2" />

          {/* Add Body Form */}
          <div className="p-5 space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center">
              <Plus className="w-3 h-3 mr-2" />
              Deploy New Entity
            </h3>

            <form onSubmit={handleAddBody} className="space-y-4 bg-neutral-950 p-4 rounded-lg border border-neutral-800 relative overflow-hidden">
              {/* Decorative accent */}
              <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />

              {/* Name & Color */}
              <div className="flex space-x-3">
                <div className="flex-grow space-y-1">
                  <label className="text-[10px] font-mono text-neutral-500 uppercase">Designation</label>
                  <input 
                    type="text" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 text-sm px-2 py-1.5 rounded text-neutral-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                    required
                  />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-mono text-neutral-500 uppercase">Spectrum</label>
                   <div className="h-[34px] w-[34px] rounded border border-neutral-800 overflow-hidden relative cursor-pointer group">
                      <input 
                        type="color" 
                        value={newColor}
                        onChange={(e) => setNewColor(e.target.value)}
                        className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer opacity-0 z-10"
                      />
                      <div className="w-full h-full" style={{ backgroundColor: newColor }} />
                      <div className="absolute inset-0 ring-inset ring-1 ring-black/20 pointer-events-none group-hover:bg-white/10 transition-colors" />
                   </div>
                </div>
              </div>

              {/* Presets Colors */}
              <div className="flex space-x-1.5 pb-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`w-4 h-4 rounded-full border ${newColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-110'} transition-all`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              {/* Mass */}
              <div className="space-y-1">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-mono text-neutral-500 uppercase flex items-center">
                    <Target className="w-3 h-3 mr-1" /> Mass
                  </label>
                  <span className="text-xs text-cyan-400 font-mono">{newMass}</span>
                </div>
                <input 
                  type="range" 
                  min="1" max="50000" step="1"
                  value={newMass}
                  onChange={(e) => setNewMass(Number(e.target.value))}
                  className="w-full accent-cyan-500 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-neutral-600 font-mono pt-1">
                  <span>1</span>
                  <span>Log Scale Intended</span>
                  <span>50k</span>
                </div>
              </div>

              {/* Position */}
              <div className="space-y-2 pt-2 border-t border-neutral-800/50">
                <label className="text-[10px] font-mono text-neutral-500 uppercase">Initial Position (x, y)</label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1.5 text-xs text-neutral-600 font-mono">X:</span>
                    <input 
                      type="number" 
                      value={newPosX}
                      onChange={(e) => setNewPosX(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-800 pl-6 pr-2 py-1.5 rounded text-sm text-neutral-200 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1.5 text-xs text-neutral-600 font-mono">Y:</span>
                    <input 
                      type="number" 
                      value={newPosY}
                      onChange={(e) => setNewPosY(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-800 pl-6 pr-2 py-1.5 rounded text-sm text-neutral-200 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Velocity */}
              <div className="space-y-2 pt-2 border-t border-neutral-800/50">
                <label className="text-[10px] font-mono text-neutral-500 uppercase">Initial Velocity (vx, vy)</label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1.5 text-xs text-neutral-600 font-mono">vx:</span>
                    <input 
                      type="number" 
                      step="0.1"
                      value={newVelX}
                      onChange={(e) => setNewVelX(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-800 pl-7 pr-2 py-1.5 rounded text-sm text-neutral-200 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1.5 text-xs text-neutral-600 font-mono">vy:</span>
                    <input 
                      type="number" 
                      step="0.1"
                      value={newVelY}
                      onChange={(e) => setNewVelY(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-800 pl-7 pr-2 py-1.5 rounded text-sm text-neutral-200 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit"
                className="w-full mt-6 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:border-cyan-400 py-2.5 rounded-md font-bold tracking-wide text-sm flex items-center justify-center transition-all group"
              >
                <Rocket className="w-4 h-4 mr-2 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                DEPLOY ENTITY
              </button>
            </form>
          </div>

        </div>
      </div>
      
      {/* Global Styles for custom scrollbar (Tailwind arbitrary variants can be messy for webkit scrollbar) */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #171717; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #404040; 
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #525252; 
        }
      `}</style>
    </div>
  );
}