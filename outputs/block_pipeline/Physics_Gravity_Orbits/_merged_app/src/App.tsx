import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// --- Types & Interfaces ---
interface Vector2D {
  x: number;
  y: number;
}

interface Body {
  id: string;
  mass: number;
  radius: number;
  pos: Vector2D;
  vel: Vector2D;
  acc: Vector2D;
  color: string;
  trail: Vector2D[];
}

interface SimulationStats {
  ke: number;
  pe: number;
  te: number;
  px: number;
  py: number;
  pTotal: number;
  angularMomentum: number;
}

type IntegratorType = 'euler' | 'verlet';
type CollisionMode = 'none' | 'merge' | 'bounce';

// --- Constants & Helpers ---
const G = 1;
const DT = 0.02;
const SUB_STEPS = 4;
const TRAIL_LENGTH = 150;
const SOFTENING = 10;

const generateId = () => Math.random().toString(36).substr(2, 9);
const calculateRadius = (mass: number) => Math.max(3, Math.log10(mass) * 4);
const getRandomColor = () => {
  const hues = [0, 30, 60, 120, 180, 210, 270, 300, 330];
  const hue = hues[Math.floor(Math.random() * hues.length)];
  return `hsl(${hue}, 80%, 60%)`;
};

const PRESETS: Record<string, () => Body[]> = {
  'Figure-8': () => [
    { id: generateId(), mass: 1000, radius: calculateRadius(1000), pos: { x: 97, y: -24.3 }, vel: { x: 4.66, y: 4.32 }, acc: { x: 0, y: 0 }, color: '#f43f5e', trail: [] },
    { id: generateId(), mass: 1000, radius: calculateRadius(1000), pos: { x: -97, y: 24.3 }, vel: { x: 4.66, y: 4.32 }, acc: { x: 0, y: 0 }, color: '#0ea5e9', trail: [] },
    { id: generateId(), mass: 1000, radius: calculateRadius(1000), pos: { x: 0, y: 0 }, vel: { x: -9.32, y: -8.64 }, acc: { x: 0, y: 0 }, color: '#eab308', trail: [] },
  ],
  'Binary': () => [
    { id: generateId(), mass: 5000, radius: calculateRadius(5000), pos: { x: -150, y: 0 }, vel: { x: 0, y: -3.5 }, acc: { x: 0, y: 0 }, color: '#3b82f6', trail: [] },
    { id: generateId(), mass: 5000, radius: calculateRadius(5000), pos: { x: 150, y: 0 }, vel: { x: 0, y: 3.5 }, acc: { x: 0, y: 0 }, color: '#ef4444', trail: [] },
  ],
  'Solar System': () => [
    { id: generateId(), mass: 15000, radius: calculateRadius(15000), pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, acc: { x: 0, y: 0 }, color: '#fbbf24', trail: [] },
    { id: generateId(), mass: 100, radius: calculateRadius(100), pos: { x: 150, y: 0 }, vel: { x: 0, y: 10 }, acc: { x: 0, y: 0 }, color: '#10b981', trail: [] },
    { id: generateId(), mass: 50, radius: calculateRadius(50), pos: { x: -250, y: 0 }, vel: { x: 0, y: -7.74 }, acc: { x: 0, y: 0 }, color: '#8b5cf6', trail: [] },
    { id: generateId(), mass: 10, radius: calculateRadius(10), pos: { x: 0, y: 350 }, vel: { x: -6.54, y: 0 }, acc: { x: 0, y: 0 }, color: '#ec4899', trail: [] },
  ],
  'Swirl': () => {
    const bodies: Body[] = [];
    bodies.push({ id: generateId(), mass: 8000, radius: calculateRadius(8000), pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, acc: { x: 0, y: 0 }, color: '#ffffff', trail: [] });
    for (let i = 0; i < 100; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * 400;
      const speed = Math.sqrt((G * 8000) / dist) * 0.9;
      bodies.push({
        id: generateId(),
        mass: Math.random() * 10 + 1,
        radius: calculateRadius(Math.random() * 10 + 1),
        pos: { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist },
        vel: { x: -Math.sin(angle) * speed, y: Math.cos(angle) * speed },
        acc: { x: 0, y: 0 },
        color: getRandomColor(),
        trail: []
      });
    }
    return bodies;
  }
};

const highlightJSON = (json: string) => {
  const escaped = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
    let cls = 'text-blue-300';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) cls = 'text-indigo-300 font-medium';
      else cls = 'text-emerald-300';
    } else if (/true|false/.test(match)) cls = 'text-amber-300';
    else if (/null/.test(match)) cls = 'text-rose-300';
    return `<span class="${cls}">${match}</span>`;
  });
};

// --- Main Component ---
export default function App() {
  // --- Refs ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const bodiesRef = useRef<Body[]>(PRESETS['Figure-8']());
  const starsRef = useRef<{ x: number; y: number; size: number; alpha: number }[]>([]);

  // --- State ---
  const [activeTab, setActiveTab] = useState<string>('Bodies');
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [integrator, setIntegrator] = useState<IntegratorType>('verlet');
  const [collisionMode, setCollisionMode] = useState<CollisionMode>('none');
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const [uiTrigger, setUiTrigger] = useState<number>(0);
  
  const [stats, setStats] = useState<SimulationStats>({ ke: 0, pe: 0, te: 0, px: 0, py: 0, pTotal: 0, angularMomentum: 0 });
  const [initialEnergy, setInitialEnergy] = useState<number>(0);

  // --- Physics Engine ---
  const computeAccelerations = (bodies: Body[]) => {
    for (let i = 0; i < bodies.length; i++) {
      bodies[i].acc.x = 0;
      bodies[i].acc.y = 0;
    }
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const b1 = bodies[i];
        const b2 = bodies[j];
        const dx = b2.pos.x - b1.pos.x;
        const dy = b2.pos.y - b1.pos.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        
        const force = (G * b1.mass * b2.mass) / (distSq + SOFTENING);
        const ax = (force * dx) / dist;
        const ay = (force * dy) / dist;
        
        b1.acc.x += ax / b1.mass;
        b1.acc.y += ay / b1.mass;
        b2.acc.x -= ax / b2.mass;
        b2.acc.y -= ay / b2.mass;
      }
    }
  };

  const handleCollisions = (bodies: Body[]) => {
    if (collisionMode === 'none') return;
    
    const toRemove = new Set<string>();
    const newBodies: Body[] = [];

    for (let i = 0; i < bodies.length; i++) {
      if (toRemove.has(bodies[i].id)) continue;
      for (let j = i + 1; j < bodies.length; j++) {
        if (toRemove.has(bodies[j].id)) continue;
        
        const b1 = bodies[i];
        const b2 = bodies[j];
        const dx = b2.pos.x - b1.pos.x;
        const dy = b2.pos.y - b1.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < b1.radius + b2.radius) {
          if (collisionMode === 'merge') {
            const totalMass = b1.mass + b2.mass;
            const mergedBody: Body = {
              id: generateId(),
              mass: totalMass,
              radius: calculateRadius(totalMass),
              pos: {
                x: (b1.pos.x * b1.mass + b2.pos.x * b2.mass) / totalMass,
                y: (b1.pos.y * b1.mass + b2.pos.y * b2.mass) / totalMass
              },
              vel: {
                x: (b1.vel.x * b1.mass + b2.vel.x * b2.mass) / totalMass,
                y: (b1.vel.y * b1.mass + b2.vel.y * b2.mass) / totalMass
              },
              acc: { x: 0, y: 0 },
              color: b1.mass > b2.mass ? b1.color : b2.color,
              trail: []
            };
            toRemove.add(b1.id);
            toRemove.add(b2.id);
            newBodies.push(mergedBody);
            if (selectedBodyId === b1.id || selectedBodyId === b2.id) setSelectedBodyId(mergedBody.id);
            break;
          } else if (collisionMode === 'bounce') {
            const nx = dx / dist;
            const ny = dy / dist;
            const p = 2 * (b1.vel.x * nx + b1.vel.y * ny - b2.vel.x * nx - b2.vel.y * ny) / (b1.mass + b2.mass);
            
            b1.vel.x -= p * b2.mass * nx;
            b1.vel.y -= p * b2.mass * ny;
            b2.vel.x += p * b1.mass * nx;
            b2.vel.y += p * b1.mass * ny;

            const overlap = (b1.radius + b2.radius - dist) + 0.1;
            b1.pos.x -= nx * overlap / 2;
            b1.pos.y -= ny * overlap / 2;
            b2.pos.x += nx * overlap / 2;
            b2.pos.y += ny * overlap / 2;
          }
        }
      }
    }

    if (toRemove.size > 0 || newBodies.length > 0) {
      bodiesRef.current = bodies.filter(b => !toRemove.has(b.id)).concat(newBodies);
    }
  };

  const stepPhysics = () => {
    const bodies = bodiesRef.current;
    if (integrator === 'euler') {
      computeAccelerations(bodies);
      for (const b of bodies) {
        b.vel.x += b.acc.x * DT;
        b.vel.y += b.acc.y * DT;
        b.pos.x += b.vel.x * DT;
        b.pos.y += b.vel.y * DT;
      }
    } else {
      for (const b of bodies) {
        b.pos.x += b.vel.x * DT + 0.5 * b.acc.x * DT * DT;
        b.pos.y += b.vel.y * DT + 0.5 * b.acc.y * DT * DT;
      }
      const oldAcc = bodies.map(b => ({ x: b.acc.x, y: b.acc.y }));
      computeAccelerations(bodies);
      for (let i = 0; i < bodies.length; i++) {
        bodies[i].vel.x += 0.5 * (oldAcc[i].x + bodies[i].acc.x) * DT;
        bodies[i].vel.y += 0.5 * (oldAcc[i].y + bodies[i].acc.y) * DT;
      }
    }
    handleCollisions(bodiesRef.current);
  };

  const calculateMetrics = () => {
    const bodies = bodiesRef.current;
    let ke = 0, pe = 0, px = 0, py = 0, l = 0;

    for (let i = 0; i < bodies.length; i++) {
      const b1 = bodies[i];
      const vSq = b1.vel.x * b1.vel.x + b1.vel.y * b1.vel.y;
      ke += 0.5 * b1.mass * vSq;
      px += b1.mass * b1.vel.x;
      py += b1.mass * b1.vel.y;
      l += b1.mass * (b1.pos.x * b1.vel.y - b1.pos.y * b1.vel.x);

      for (let j = i + 1; j < bodies.length; j++) {
        const b2 = bodies[j];
        const dx = b2.pos.x - b1.pos.x;
        const dy = b2.pos.y - b1.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        pe -= (G * b1.mass * b2.mass) / dist;
      }
    }
    return { ke, pe, te: ke + pe, px, py, pTotal: Math.sqrt(px * px + py * py), angularMomentum: l };
  };

  // --- Render Loop ---
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    starsRef.current.forEach(star => {
      ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);

    const bodies = bodiesRef.current;

    bodies.forEach(b => {
      if (b.trail.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(b.trail[0].x, b.trail[0].y);
      for (let i = 1; i < b.trail.length; i++) {
        ctx.lineTo(b.trail[i].x, b.trail[i].y);
      }
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.4;
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    });

    bodies.forEach(b => {
      const gradient = ctx.createRadialGradient(b.pos.x, b.pos.y, b.radius * 0.1, b.pos.x, b.pos.y, b.radius * 2.5);
      gradient.addColorStop(0, b.color);
      gradient.addColorStop(1, 'transparent');
      
      ctx.beginPath();
      ctx.arc(b.pos.x, b.pos.y, b.radius * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      if (b.id === selectedBodyId) {
        ctx.beginPath();
        ctx.arc(b.pos.x, b.pos.y, b.radius + 6, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    ctx.restore();
  }, [selectedBodyId]);

  const tick = useCallback(() => {
    if (isRunning) {
      for (let i = 0; i < SUB_STEPS; i++) {
        stepPhysics();
      }
      bodiesRef.current.forEach(b => {
        b.trail.push({ x: b.pos.x, y: b.pos.y });
        if (b.trail.length > TRAIL_LENGTH) b.trail.shift();
      });
    }
    draw();
    requestRef.current = requestAnimationFrame(tick);
  }, [isRunning, draw, integrator, collisionMode]);

  // --- Effects ---
  useEffect(() => {
    requestRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [tick]);

  useEffect(() => {
    const stars = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 1.5,
        alpha: Math.random() * 0.8 + 0.2
      });
    }
    starsRef.current = stars;

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth - 384;
        canvasRef.current.height = window.innerHeight;
        draw();
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentStats = calculateMetrics();
      setStats(currentStats);
      setUiTrigger(prev => prev + 1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // --- Handlers ---
  const loadPreset = (name: string) => {
    if (PRESETS[name]) {
      bodiesRef.current = PRESETS[name]();
      const initial = calculateMetrics();
      setInitialEnergy(initial.te);
      setSelectedBodyId(null);
      setUiTrigger(prev => prev + 1);
      if (!isRunning) draw();
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    if (activeTab === 'Bodies') {
      const mass = Math.random() * 500 + 50;
      const newBody: Body = {
        id: generateId(),
        mass,
        radius: calculateRadius(mass),
        pos: { x, y },
        vel: { x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10 },
        acc: { x: 0, y: 0 },
        color: getRandomColor(),
        trail: []
      };
      bodiesRef.current.push(newBody);
      setInitialEnergy(calculateMetrics().te);
    } else if (activeTab === 'Properties') {
      let closestId = null;
      let minDist = Infinity;
      bodiesRef.current.forEach(b => {
        const dist = Math.sqrt((b.pos.x - x) ** 2 + (b.pos.y - y) ** 2);
        if (dist < b.radius + 10 && dist < minDist) {
          minDist = dist;
          closestId = b.id;
        }
      });
      setSelectedBodyId(closestId);
    }
    if (!isRunning) draw();
  };

  const updateSelectedBody = (updates: Partial<Body>) => {
    const body = bodiesRef.current.find(b => b.id === selectedBodyId);
    if (body) {
      Object.assign(body, updates);
      if (updates.mass) body.radius = calculateRadius(body.mass);
      setInitialEnergy(calculateMetrics().te);
      if (!isRunning) draw();
      setUiTrigger(t => t + 1);
    }
  };

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bodiesRef.current, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = "orbit_preset.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const formatSci = (num: number) => {
    if (Math.abs(num) < 0.01 && num !== 0) return num.toExponential(2);
    if (Math.abs(num) > 100000) return num.toExponential(2);
    return num.toFixed(2);
  };

  const energyDrift = initialEnergy !== 0 ? Math.abs((stats.te - initialEnergy) / initialEnergy) * 100 : 0;
  const selectedBody = bodiesRef.current.find(b => b.id === selectedBodyId);

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-96 bg-slate-900 border-r border-slate-800 flex flex-col z-10 shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
              </svg>
              Orbit Playground
            </h1>
            <p className="text-xs text-slate-400 mt-1">N-Body Gravity Simulator</p>
          </div>
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`p-2 rounded-lg border transition-colors ${isRunning ? 'bg-rose-500/20 border-rose-500/50 text-rose-400' : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'}`}
          >
            {isRunning ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 border-b border-slate-800 bg-slate-950/50">
          {['Bodies', 'Properties', 'Metrics', 'Integrator', 'Collisions', 'Export'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2.5 text-xs font-semibold tracking-wide transition-colors border-b-2 ${activeTab === tab ? 'border-blue-500 text-blue-400 bg-slate-800/50' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          
          {activeTab === 'Bodies' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Presets</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(PRESETS).map(key => (
                    <button key={key} onClick={() => loadPreset(key)} className="py-2 px-3 text-xs font-medium rounded border bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors">
                      {key}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Bodies ({bodiesRef.current.length})</label>
                  <button onClick={() => { bodiesRef.current = []; setInitialEnergy(0); }} className="text-xs text-rose-400 hover:text-rose-300">Clear All</button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {bodiesRef.current.map(b => (
                    <div key={b.id} className="flex items-center justify-between bg-slate-950/50 p-2 rounded border border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }} />
                        <span className="text-xs font-mono text-slate-300">M: {b.mass.toFixed(0)}</span>
                      </div>
                      <button onClick={() => { bodiesRef.current = bodiesRef.current.filter(x => x.id !== b.id); setUiTrigger(t=>t+1); }} className="text-slate-500 hover:text-rose-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 text-center pt-2">Click anywhere on the canvas to add a random body.</p>
              </div>
            </div>
          )}

          {activeTab === 'Properties' && (
            <div className="space-y-6">
              {!selectedBody ? (
                <div className="text-center py-10 text-slate-500 text-sm">
                  Click on a body in the canvas to select it and edit its properties.
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                    <input type="color" value={selectedBody.color} onChange={e => updateSelectedBody({ color: e.target.value })} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" />
                    <span className="text-sm font-mono text-slate-300">ID: {selectedBody.id}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Mass</span>
                      <span className="font-mono text-blue-400">{selectedBody.mass.toFixed(1)}</span>
                    </div>
                    <input type="range" min="1" max="20000" step="10" value={selectedBody.mass} onChange={e => updateSelectedBody({ mass: parseFloat(e.target.value) })} className="w-full accent-blue-500" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Velocity X</span>
                      <span className="font-mono text-emerald-400">{selectedBody.vel.x.toFixed(2)}</span>
                    </div>
                    <input type="range" min="-20" max="20" step="0.1" value={selectedBody.vel.x} onChange={e => updateSelectedBody({ vel: { ...selectedBody.vel, x: parseFloat(e.target.value) } })} className="w-full accent-emerald-500" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Velocity Y</span>
                      <span className="font-mono text-emerald-400">{selectedBody.vel.y.toFixed(2)}</span>
                    </div>
                    <input type="range" min="-20" max="20" step="0.1" value={selectedBody.vel.y} onChange={e => updateSelectedBody({ vel: { ...selectedBody.vel, y: parseFloat(e.target.value) } })} className="w-full accent-emerald-500" />
                  </div>

                  <button onClick={() => { bodiesRef.current = bodiesRef.current.filter(b => b.id !== selectedBody.id); setSelectedBodyId(null); }} className="w-full py-2 mt-4 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded hover:bg-rose-500/20 transition-colors text-sm font-medium">
                    Delete Body
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'Metrics' && (
            <div className="space-y-5">
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Energy (E = K + U)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                    <div className="text-[10px] text-slate-500 mb-1">Kinetic (K)</div>
                    <div className="font-mono text-sm text-blue-400">{formatSci(stats.ke)}</div>
                  </div>
                  <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                    <div className="text-[10px] text-slate-500 mb-1">Potential (U)</div>
                    <div className="font-mono text-sm text-rose-400">{formatSci(stats.pe)}</div>
                  </div>
                </div>
                <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                  <div>
                    <div className="text-[10px] text-slate-400 mb-1">Total Energy (E)</div>
                    <div className="font-mono text-lg font-bold text-white">{formatSci(stats.te)}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-800">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Momentum</h3>
                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-[10px] text-slate-500">Linear (P)</div>
                    <div className="font-mono text-sm text-purple-400">{formatSci(stats.pTotal)}</div>
                  </div>
                  <div className="flex gap-4 text-[10px] font-mono text-slate-500">
                    <span>Px: {formatSci(stats.px)}</span>
                    <span>Py: {formatSci(stats.py)}</span>
                  </div>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 flex justify-between items-center">
                  <div className="text-[10px] text-slate-500">Angular (L)</div>
                  <div className="font-mono text-sm text-amber-400">{formatSci(stats.angularMomentum)}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Integrator' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Algorithm</label>
                <div className="flex bg-slate-950/50 p-1 rounded-lg border border-slate-800">
                  <button onClick={() => setIntegrator('euler')} className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${integrator === 'euler' ? 'bg-rose-500/20 text-rose-400 shadow-[inset_0_0_0_1px_rgba(244,63,94,0.5)]' : 'text-slate-400 hover:text-slate-200'}`}>
                    Explicit Euler
                  </button>
                  <button onClick={() => setIntegrator('verlet')} className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${integrator === 'verlet' ? 'bg-emerald-500/20 text-emerald-400 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.5)]' : 'text-slate-400 hover:text-slate-200'}`}>
                    Velocity Verlet
                  </button>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {integrator === 'euler' ? "Euler is a 1st-order method. It introduces artificial energy, causing orbits to spiral outward." : "Verlet is a 2nd-order symplectic method. It conserves total energy over time, keeping orbits stable."}
                </p>
              </div>

              <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/50">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Energy Conservation</h3>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Initial (E₀)</span>
                  <span className="font-mono text-sm text-slate-300">{initialEnergy.toExponential(4)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Current (E)</span>
                  <span className="font-mono text-sm text-slate-300">{stats.te.toExponential(4)}</span>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-slate-400">Energy Drift</span>
                    <span className={`font-mono text-sm font-bold ${energyDrift > 5 ? 'text-rose-500' : energyDrift > 1 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {energyDrift.toFixed(4)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${energyDrift > 5 ? 'bg-rose-500' : energyDrift > 1 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(energyDrift * 10, 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Collisions' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Collision Handling</label>
                <div className="space-y-2">
                  {(['none', 'merge', 'bounce'] as CollisionMode[]).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setCollisionMode(mode)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${collisionMode === mode ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800'}`}
                    >
                      <span className="text-sm font-medium capitalize">{mode}</span>
                      {collisionMode === mode && <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {collisionMode === 'none' && 'Bodies pass through each other. High forces at close range.'}
                  {collisionMode === 'merge' && 'Inelastic collision. Bodies combine mass and conserve momentum.'}
                  {collisionMode === 'bounce' && 'Elastic collision. Bodies bounce off each other.'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'Export' && (
            <div className="space-y-4 flex flex-col h-full">
              <p className="text-xs text-slate-400">Export current simulation state as JSON.</p>
              <div className="flex-1 bg-[#0d1117] rounded-lg border border-slate-800 overflow-auto relative">
                <pre className="p-4 text-[10px] font-mono leading-relaxed text-slate-300">
                  <code dangerouslySetInnerHTML={{ __html: highlightJSON(JSON.stringify(bodiesRef.current, null, 2)) }} />
                </pre>
              </div>
              <button onClick={exportJSON} className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-900/20">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download JSON
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative cursor-crosshair">
        <canvas ref={canvasRef} onClick={handleCanvasClick} className="block w-full h-full" />
        
        {/* Overlay Stats (Minimal) */}
        <div className="absolute top-4 left-4 pointer-events-none flex gap-4">
          <div className="bg-slate-900/60 backdrop-blur px-3 py-1.5 rounded-md border border-slate-800 text-xs font-mono text-slate-300">
            Bodies: <span className="text-white">{bodiesRef.current.length}</span>
          </div>
          <div className="bg-slate-900/60 backdrop-blur px-3 py-1.5 rounded-md border border-slate-800 text-xs font-mono text-slate-300">
            Energy: <span className="text-white">{formatSci(stats.te)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}