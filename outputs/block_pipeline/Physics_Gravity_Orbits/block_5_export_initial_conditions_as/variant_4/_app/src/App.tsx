import React, { useState, useEffect } from 'react';

// --- Types ---
interface Vector2D {
  x: number;
  y: number;
}

interface CelestialBody {
  id: string;
  name: string;
  mass: number;
  radius: number;
  position: Vector2D;
  velocity: Vector2D;
  color: string;
}

interface SimulationSettings {
  integrator: 'Euler' | 'Verlet' | 'RK4';
  collisionMerge: boolean;
  gravitationalConstant: number;
  timeStep: number;
}

// --- Default Initial Conditions ---
const DEFAULT_BODIES: CelestialBody[] = [
  {
    id: 'b1-sun',
    name: 'Alpha Centauri A',
    mass: 1.1,
    radius: 20,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0.05 },
    color: '#ffdd44',
  },
  {
    id: 'b2-earth',
    name: 'Proxima Centauri b',
    mass: 0.003,
    radius: 8,
    position: { x: 150, y: 0 },
    velocity: { x: 0, y: 1.2 },
    color: '#44aaff',
  },
  {
    id: 'b3-comet',
    name: 'Halley-esque Comet',
    mass: 0.00001,
    radius: 4,
    position: { x: -200, y: 100 },
    velocity: { x: 0.8, y: -0.5 },
    color: '#ffffff',
  },
];

const DEFAULT_SETTINGS: SimulationSettings = {
  integrator: 'Verlet',
  collisionMerge: true,
  gravitationalConstant: 0.1,
  timeStep: 0.016,
};

export default function App() {
  const [bodies, setBodies] = useState<CelestialBody[]>(DEFAULT_BODIES);
  const [settings, setSettings] = useState<SimulationSettings>(DEFAULT_SETTINGS);
  const [copied, setCopied] = useState(false);
  const [stars, setStars] = useState<{ x: number; y: number; s: number; opacity: number }[]>([]);

  // Generate background starfield
  useEffect(() => {
    const generatedStars = Array.from({ length: 150 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      s: Math.random() * 2 + 1,
      opacity: Math.random() * 0.8 + 0.2,
    }));
    setStars(generatedStars);
  }, []);

  const updateBodyMass = (id: string, newMass: number) => {
    setBodies((prev) =>
      prev.map((body) => (body.id === id ? { ...body, mass: newMass } : body))
    );
  };

  const payloadString = JSON.stringify(
    {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        project: 'Orbit Playground',
      },
      settings,
      initialConditions: bodies,
    },
    null,
    2
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(payloadString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([payloadString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orbit-preset-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#05050A] text-slate-200 font-sans relative overflow-hidden flex flex-col">
      {/* Starfield Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-[#05050A] to-[#020205]"></div>
        {stars.map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.s}px`,
              height: `${star.s}px`,
              opacity: star.opacity,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-black/40 backdrop-blur-md px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 flex items-center justify-center relative shadow-[0_0_15px_rgba(99,102,241,0.5)]">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <div className="absolute w-12 h-12 border border-indigo-500/30 rounded-full animate-[spin_4s_linear_infinite]"></div>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
              Orbit Playground
            </h1>
            <p className="text-xs text-slate-400">Data Exporter Subsystem</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-6 gap-6 h-[calc(100vh-80px)]">
        
        {/* Left Panel: Simulation State Preview */}
        <section className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-indigo-300">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/></svg>
              Active Configuration
            </h2>
            <div className="space-y-4">
              {bodies.map((body) => (
                <div key={body.id} className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col gap-3 transition-colors hover:border-white/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: body.color, boxShadow: `0 0 10px ${body.color}` }} />
                      <span className="font-medium tracking-wide">{body.name}</span>
                    </div>
                    <span className="text-xs font-mono text-slate-500">ID: {body.id}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Mass</span>
                        <span className="font-mono text-indigo-200">{body.mass.toFixed(5)} M</span>
                      </div>
                      <input
                        type="range"
                        min="0.00001"
                        max="2"
                        step="0.0001"
                        value={body.mass}
                        onChange={(e) => updateBodyMass(body.id, parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Velocity (v)</span>
                        <span className="font-mono text-emerald-200">
                          {Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2).toFixed(3)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-lg overflow-hidden flex items-center px-1">
                        <div className="h-0.5 bg-slate-600 w-full rounded">
                           <div className="h-full bg-emerald-500 rounded" style={{ width: `${Math.min(100, Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2) * 50)}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm shadow-xl flex-shrink-0">
             <h2 className="text-sm font-semibold mb-3 text-slate-300 uppercase tracking-wider">Environment Settings</h2>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                  <span className="block text-xs text-slate-500 mb-1">Integrator</span>
                  <select 
                    value={settings.integrator}
                    onChange={(e) => setSettings({...settings, integrator: e.target.value as any})}
                    className="w-full bg-transparent text-sm font-medium outline-none text-indigo-300"
                  >
                    <option value="Euler">Euler</option>
                    <option value="Verlet">Verlet (Symplectic)</option>
                    <option value="RK4">Runge-Kutta 4</option>
                  </select>
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-white/5 flex items-center justify-between cursor-pointer" onClick={() => setSettings({...settings, collisionMerge: !settings.collisionMerge})}>
                  <div>
                    <span className="block text-xs text-slate-500 mb-1">Collisions</span>
                    <span className="text-sm font-medium text-indigo-300">{settings.collisionMerge ? 'Merge Bodies' : 'Pass Through'}</span>
                  </div>
                  <div className={`w-8 h-4 rounded-full transition-colors relative ${settings.collisionMerge ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${settings.collisionMerge ? 'translate-x-4.5 left-[1px]' : 'translate-x-0.5 left-[1px]'}`} />
                  </div>
                </div>
             </div>
          </div>
        </section>

        {/* Right Panel: JSON Export */}
        <section className="flex-1 flex flex-col bg-[#0D0D16] border border-white/10 rounded-2xl shadow-2xl overflow-hidden shadow-indigo-900/20">
          
          {/* Editor Header */}
          <div className="bg-white/5 border-b border-white/10 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              <span className="text-sm font-medium text-slate-300">initial-conditions.json</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-xs font-medium text-slate-300 border border-white/5 hover:border-white/20"
              >
                {copied ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                )}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button 
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 transition-colors text-xs font-medium border border-indigo-500/20 hover:border-indigo-500/40"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Download JSON
              </button>
            </div>
          </div>

          {/* JSON Code View */}
          <div className="flex-1 overflow-auto p-4 custom-scrollbar bg-[#09090E] relative group">
            <pre className="text-[13px] font-mono leading-relaxed text-slate-300">
              <code dangerouslySetInnerHTML={{ __html: syntaxHighlight(payloadString) }} />
            </pre>
            
            {/* Watermark/Icon overlay */}
            <div className="absolute bottom-6 right-6 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                <path d="M2 12h20" />
              </svg>
            </div>
          </div>

        </section>
      </main>
      
      {/* Required basic custom scrollbar injected via style block for completeness without external css */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}

// Helper: Basic Regex-based JSON Syntax Highlighter
function syntaxHighlight(json: string) {
  let formatted = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return formatted.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
    let cls = 'text-blue-400'; // number
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'text-indigo-300 font-semibold'; // key
      } else {
        // Hex color strings
        if (/^"#[0-9a-fA-F]{6}"$/.test(match)) {
           return `<span class="text-emerald-300">"${match.slice(1,-1)}" <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${match.slice(1,-1)}"></span></span>`;
        }
        cls = 'text-emerald-300'; // string
      }
    } else if (/true|false/.test(match)) {
      cls = 'text-orange-400 font-medium'; // boolean
    } else if (/null/.test(match)) {
      cls = 'text-red-400 font-medium'; // null
    }
    return `<span class="${cls}">${match}</span>`;
  });
}