import React, { useState, useEffect, useMemo } from 'react';
import { Download, Copy, Check, FileJson, Planet, Orbit, Sparkles, TerminalSquare } from 'lucide-react';

// --- Types & Interfaces ---
interface Vector2D {
  x: number;
  y: number;
}

interface BodyState {
  id: string;
  name: string;
  mass: number;
  position: Vector2D;
  velocity: Vector2D;
  color: string;
  radius: number;
}

interface SimulationConfig {
  integrator: 'Euler' | 'Verlet' | 'RK4';
  timeStep: number;
  gravitationalConstant: number;
  collisionMerge: boolean;
  trailLength: number;
}

interface InitialConditions {
  metadata: {
    presetName: string;
    author: string;
    createdAt: string;
    description: string;
  };
  config: SimulationConfig;
  bodies: BodyState[];
}

// --- Mock Presets ---
const PRESETS: Record<string, InitialConditions> = {
  'figure-8': {
    metadata: {
      presetName: 'Figure-8 Three Body',
      author: 'Orbit Playground',
      createdAt: new Date().toISOString(),
      description: 'A stable figure-8 solution to the three-body problem.',
    },
    config: {
      integrator: 'RK4',
      timeStep: 0.01,
      gravitationalConstant: 1.0,
      collisionMerge: false,
      trailLength: 500,
    },
    bodies: [
      { id: 'b1', name: 'Alpha', mass: 1, position: { x: 0.97000436, y: -0.24308753 }, velocity: { x: 0.466203685, y: 0.43236573 }, color: '#ef4444', radius: 4 },
      { id: 'b2', name: 'Beta', mass: 1, position: { x: -0.97000436, y: 0.24308753 }, velocity: { x: 0.466203685, y: 0.43236573 }, color: '#3b82f6', radius: 4 },
      { id: 'b3', name: 'Gamma', mass: 1, position: { x: 0, y: 0 }, velocity: { x: -0.93240737, y: -0.86473146 }, color: '#10b981', radius: 4 },
    ],
  },
  'solar-system-inner': {
    metadata: {
      presetName: 'Inner Solar System (Simplified)',
      author: 'Orbit Playground',
      createdAt: new Date().toISOString(),
      description: 'A simplified 2D representation of the inner solar system.',
    },
    config: {
      integrator: 'Verlet',
      timeStep: 0.1,
      gravitationalConstant: 0.0001,
      collisionMerge: true,
      trailLength: 1000,
    },
    bodies: [
      { id: 'sun', name: 'Sol', mass: 333000, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, color: '#fbbf24', radius: 20 },
      { id: 'mercury', name: 'Mercury', mass: 0.055, position: { x: 0.39, y: 0 }, velocity: { x: 0, y: 1.6 }, color: '#9ca3af', radius: 2 },
      { id: 'venus', name: 'Venus', mass: 0.815, position: { x: 0.72, y: 0 }, velocity: { x: 0, y: 1.17 }, color: '#fcd34d', radius: 4 },
      { id: 'earth', name: 'Earth', mass: 1, position: { x: 1, y: 0 }, velocity: { x: 0, y: 1 }, color: '#60a5fa', radius: 4.5 },
      { id: 'mars', name: 'Mars', mass: 0.107, position: { x: 1.52, y: 0 }, velocity: { x: 0, y: 0.8 }, color: '#ef4444', radius: 3 },
    ],
  },
  'binary-star': {
    metadata: {
      presetName: 'Binary Star System',
      author: 'Orbit Playground',
      createdAt: new Date().toISOString(),
      description: 'Two stars of equal mass orbiting a common barycenter.',
    },
    config: {
      integrator: 'Verlet',
      timeStep: 0.05,
      gravitationalConstant: 1.0,
      collisionMerge: true,
      trailLength: 300,
    },
    bodies: [
      { id: 'star1', name: 'Sirius A', mass: 50, position: { x: -10, y: 0 }, velocity: { x: 0, y: -1.58 }, color: '#bae6fd', radius: 12 },
      { id: 'star2', name: 'Sirius B', mass: 50, position: { x: 10, y: 0 }, velocity: { x: 0, y: 1.58 }, color: '#e0f2fe', radius: 12 },
    ],
  }
};

// --- Helper: Syntax Highlighter for JSON ---
const syntaxHighlightJSON = (json: string) => {
  if (!json) return '';
  const formatted = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return formatted.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
    let cls = 'text-blue-400'; // number
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'text-emerald-400 font-medium'; // key
      } else {
        cls = 'text-amber-300'; // string
      }
    } else if (/true|false/.test(match)) {
      cls = 'text-pink-400 font-bold'; // boolean
    } else if (/null/.test(match)) {
      cls = 'text-slate-500 italic'; // null
    }
    return `<span class="${cls}">${match}</span>`;
  });
};

export default function App() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('figure-8');
  const [copied, setCopied] = useState(false);
  const [indentSize, setIndentSize] = useState<number>(2);

  const currentData = useMemo(() => {
    const data = PRESETS[selectedPresetKey];
    // Update timestamp to current time for realistic export
    return {
      ...data,
      metadata: {
        ...data.metadata,
        createdAt: new Date().toISOString()
      }
    };
  }, [selectedPresetKey]);

  const jsonString = useMemo(() => {
    return JSON.stringify(currentData, null, indentSize);
  }, [currentData, indentSize]);

  const highlightedJSON = useMemo(() => {
    return syntaxHighlightJSON(jsonString);
  }, [jsonString]);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orbit-preset-${selectedPresetKey}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30 overflow-hidden relative flex items-center justify-center p-6">
      
      {/* --- Starfield Background --- */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black"></div>
        {/* CSS Stars (Simulated with a repeating radial gradient) */}
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(1px 1px at 20px 30px, #ffffff, rgba(0,0,0,0)), radial-gradient(1px 1px at 40px 70px, #ffffff, rgba(0,0,0,0)), radial-gradient(2px 2px at 90px 40px, #ffffff, rgba(0,0,0,0))',
            backgroundSize: '120px 120px'
          }}
        ></div>
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(1.5px 1.5px at 50px 150px, #60a5fa, rgba(0,0,0,0)), radial-gradient(1px 1px at 150px 20px, #fcd34d, rgba(0,0,0,0))',
            backgroundSize: '250px 250px'
          }}
        ></div>
      </div>

      {/* --- Main Content Container --- */}
      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6 h-[85vh]">
        
        {/* Left Panel: Controls & Info */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Header */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                <Orbit size={24} />
              </div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                Data Exporter
              </h1>
            </div>
            <p className="text-slate-400 text-sm">
              Extract and download N-body initial conditions for external analysis or simulation sharing.
            </p>
          </div>

          {/* Preset Selection */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl flex-1 flex flex-col">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sparkles size={16} className="text-cyan-400" />
              Select Target System
            </h2>
            
            <div className="flex flex-col gap-3 flex-1">
              {Object.entries(PRESETS).map(([key, data]) => (
                <button
                  key={key}
                  onClick={() => setSelectedPresetKey(key)}
                  className={`text-left p-4 rounded-xl border transition-all duration-200 group ${
                    selectedPresetKey === key 
                      ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-medium ${selectedPresetKey === key ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {data.metadata.presetName}
                    </span>
                    <Planet size={16} className={selectedPresetKey === key ? 'text-emerald-400' : 'text-slate-500'} />
                  </div>
                  <div className="text-xs text-slate-400 line-clamp-2">
                    {data.metadata.description}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <span className="text-[10px] px-2 py-1 rounded-full bg-black/30 text-slate-300 border border-white/5">
                      {data.bodies.length} Bodies
                    </span>
                    <span className="text-[10px] px-2 py-1 rounded-full bg-black/30 text-slate-300 border border-white/5">
                      {data.config.integrator}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Formatting Options */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block">
                JSON Formatting
              </label>
              <div className="flex gap-2 bg-black/40 p-1 rounded-lg border border-white/5 w-fit">
                {[0, 2, 4].map((size) => (
                  <button
                    key={size}
                    onClick={() => setIndentSize(size)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      indentSize === size 
                        ? 'bg-slate-700 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    {size === 0 ? 'Minified' : `${size} Spaces`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: JSON Viewer & Export Actions */}
        <div className="lg:col-span-8 bg-[#0d1117] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden relative">
          
          {/* Terminal Header */}
          <div className="bg-white/5 border-b border-white/10 px-4 py-3 flex items-center justify-between backdrop-blur-md">
            <div className="flex items-center gap-2">
              <TerminalSquare size={18} className="text-slate-400" />
              <span className="font-mono text-sm text-slate-300">
                initial_conditions_{selectedPresetKey}.json
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-all text-slate-300 hover:text-white"
              >
                {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/50 text-sm font-medium transition-all text-white shadow-[0_0_10px_rgba(16,185,129,0.2)] hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]"
              >
                <Download size={16} />
                Export JSON
              </button>
            </div>
          </div>

          {/* Code Editor Area */}
          <div className="flex-1 overflow-auto relative group">
            {/* Line Numbers Background */}
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-white/[0.02] border-r border-white/5 pointer-events-none z-0"></div>
            
            <pre className="p-4 pl-14 font-mono text-sm leading-relaxed overflow-x-auto relative z-10 w-full h-full">
              <code 
                dangerouslySetInnerHTML={{ __html: highlightedJSON }}
                className="block min-w-max"
              />
            </pre>
            
            {/* Overlay Gradient for scrolling hint */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0d1117] to-transparent pointer-events-none"></div>
          </div>

          {/* Footer Status */}
          <div className="bg-black/50 border-t border-white/10 px-4 py-2 flex items-center justify-between text-xs text-slate-500 font-mono">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <FileJson size={14} />
                application/json
              </span>
              <span>UTF-8</span>
            </div>
            <div>
              {new Blob([jsonString]).size} bytes
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}