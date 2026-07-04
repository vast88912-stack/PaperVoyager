import React, { useState, useEffect, useMemo } from 'react';

// --- Types & Mock Data ---

type Vector2 = { x: number; y: number };

interface Body {
  id: string;
  name: string;
  mass: number;
  position: Vector2;
  velocity: Vector2;
  color: string;
  radius: number;
}

interface SimulationConfig {
  version: string;
  timestamp: string;
  settings: {
    integrator: 'Euler' | 'Verlet' | 'RK4';
    timeStep: number;
    gravitationalConstant: number;
    collisionMerge: boolean;
    trailLength: number;
  };
  bodies: Body[];
}

const PRESETS: Record<string, SimulationConfig> = {
  'two-body': {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    settings: {
      integrator: 'Verlet',
      timeStep: 0.016,
      gravitationalConstant: 1.0,
      collisionMerge: true,
      trailLength: 256,
    },
    bodies: [
      { id: 'b1', name: 'Alpha', mass: 500, position: { x: -150, y: 0 }, velocity: { x: 0, y: 1.2 }, color: '#3b82f6', radius: 12 },
      { id: 'b2', name: 'Beta', mass: 500, position: { x: 150, y: 0 }, velocity: { x: 0, y: -1.2 }, color: '#ef4444', radius: 12 },
    ],
  },
  'figure-8': {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    settings: {
      integrator: 'RK4',
      timeStep: 0.005,
      gravitationalConstant: 1.0,
      collisionMerge: false,
      trailLength: 512,
    },
    bodies: [
      { id: 'b1', name: 'Body 1', mass: 100, position: { x: 97.0, y: -24.3 }, velocity: { x: 46.6, y: 43.2 }, color: '#f59e0b', radius: 8 },
      { id: 'b2', name: 'Body 2', mass: 100, position: { x: -97.0, y: 24.3 }, velocity: { x: 46.6, y: 43.2 }, color: '#10b981', radius: 8 },
      { id: 'b3', name: 'Body 3', mass: 100, position: { x: 0, y: 0 }, velocity: { x: -93.2, y: -86.4 }, color: '#8b5cf6', radius: 8 },
    ],
  },
  'solar-system': {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    settings: {
      integrator: 'Verlet',
      timeStep: 0.1,
      gravitationalConstant: 0.0001,
      collisionMerge: true,
      trailLength: 1024,
    },
    bodies: [
      { id: 'sun', name: 'Sun', mass: 333000, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, color: '#fbbf24', radius: 24 },
      { id: 'earth', name: 'Earth', mass: 1, position: { x: 149.6, y: 0 }, velocity: { x: 0, y: 29.78 }, color: '#60a5fa', radius: 4 },
      { id: 'mars', name: 'Mars', mass: 0.107, position: { x: 227.9, y: 0 }, velocity: { x: 0, y: 24.07 }, color: '#f87171', radius: 3 },
    ],
  }
};

// --- Helper: JSON Syntax Highlighter ---
const highlightJSON = (json: string) => {
  const escaped = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
    let cls = 'text-blue-300'; // number
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'text-indigo-300 font-medium'; // key
      } else {
        cls = 'text-emerald-300'; // string
      }
    } else if (/true|false/.test(match)) {
      cls = 'text-amber-300'; // boolean
    } else if (/null/.test(match)) {
      cls = 'text-rose-300'; // null
    }
    return `<span class="${cls}">${match}</span>`;
  });
};

// --- Components ---

const Starfield = () => {
  const stars = useMemo(() => {
    return Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random(),
      animationDelay: `${Math.random() * 3}s`,
      animationDuration: `${Math.random() * 3 + 2}s`,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white animate-twinkle"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animationDelay: star.animationDelay,
            animationDuration: star.animationDuration,
          }}
        />
      ))}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); box-shadow: 0 0 8px rgba(255,255,255,0.8); }
        }
      `}</style>
    </div>
  );
};

export default function App() {
  const [activePreset, setActivePreset] = useState<string>('figure-8');
  const [config, setConfig] = useState<SimulationConfig>(PRESETS['figure-8']);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Update config when preset changes, updating timestamp to simulate fresh export
  useEffect(() => {
    setConfig({
      ...PRESETS[activePreset],
      timestamp: new Date().toISOString()
    });
  }, [activePreset]);

  const jsonString = JSON.stringify(config, null, 2);
  const highlightedJSON = useMemo(() => highlightJSON(jsonString), [jsonString]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleDownload = () => {
    setDownloading(true);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orbit-preset-${activePreset}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setTimeout(() => setDownloading(false), 600);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans relative flex items-center justify-center p-4 sm:p-8">
      <Starfield />
      
      {/* Main Export Panel */}
      <div className="relative z-10 w-full max-w-4xl bg-slate-900/70 backdrop-blur-2xl border border-slate-700/50 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col h-[85vh] max-h-[800px]">
        
        {/* Header */}
        <header className="px-6 py-5 border-b border-slate-700/50 bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" x2="12" y1="15" y2="3"/>
              </svg>
              Export Initial Conditions
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Save your N-body simulation state as a JSON file for sharing or later use.
            </p>
          </div>

          {/* Preset Selector (Simulating current state source) */}
          <div className="flex items-center gap-3 bg-slate-950/50 p-1.5 rounded-xl border border-slate-700/50">
            <span className="text-xs font-medium text-slate-400 pl-2 uppercase tracking-wider">Source</span>
            <select 
              value={activePreset}
              onChange={(e) => setActivePreset(e.target.value)}
              className="bg-slate-800 text-sm text-slate-200 border-none rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer appearance-none pr-8 relative"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em' }}
            >
              <option value="two-body">Two-Body Orbit</option>
              <option value="figure-8">Figure-8 (3-Body)</option>
              <option value="solar-system">Solar System (Subset)</option>
            </select>
          </div>
        </header>

        {/* JSON Viewer Body */}
        <div className="flex-1 overflow-hidden relative bg-[#0d1117]/80">
          {/* Line Numbers & Code */}
          <div className="absolute inset-0 overflow-auto flex">
            <div className="py-6 px-4 text-right border-r border-slate-800/50 bg-slate-900/50 select-none hidden sm:block">
              {jsonString.split('\n').map((_, i) => (
                <div key={i} className="text-slate-600 text-sm font-mono leading-relaxed">{i + 1}</div>
              ))}
            </div>
            <pre className="p-6 text-sm font-mono leading-relaxed overflow-x-auto w-full">
              <code dangerouslySetInnerHTML={{ __html: highlightedJSON }} />
            </pre>
          </div>
          
          {/* Floating Copy Button inside viewer */}
          <button 
            onClick={handleCopy}
            className="absolute top-4 right-4 p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg backdrop-blur-sm border border-slate-600/50 transition-all flex items-center gap-2 group shadow-lg"
            title="Copy to clipboard"
          >
            {copied ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span className="text-xs font-medium text-emerald-400 pr-1">Copied!</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:text-white transition-colors">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                <span className="text-xs font-medium pr-1 group-hover:text-white transition-colors">Copy JSON</span>
              </>
            )}
          </button>
        </div>

        {/* Footer Actions */}
        <footer className="px-6 py-4 border-t border-slate-700/50 bg-slate-800/30 flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            Contains {config.bodies.length} bodies • {config.settings.integrator} Integrator
          </div>
          
          <button
            onClick={handleDownload}
            disabled={downloading}
            className={`px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg ${
              downloading 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20 hover:shadow-blue-500/40 border border-blue-500/50'
            }`}
          >
            {downloading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" x2="12" y1="15" y2="3"/>
                </svg>
                Download .json
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}