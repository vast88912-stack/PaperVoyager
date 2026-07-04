import React, { useState, useEffect, useMemo } from 'react';
import { Download, Copy, Check, FileJson, Settings2, RefreshCcw, Orbit, Info } from 'lucide-react';

// RUNTIME DEPENDENCIES:
// - react
// - lucide-react
// - tailwindcss (via classes)

// --- Mock Data & Types ---
type Vector2 = [number, number];

interface CelestialBody {
  id: string;
  name: string;
  mass: number;
  radius: number;
  position: Vector2;
  velocity: Vector2;
  color: string;
  isStatic?: boolean;
}

interface SimulationState {
  version: string;
  timestamp: string;
  config: {
    integrator: 'Euler' | 'Verlet' | 'RungeKutta4';
    collisionMerge: boolean;
    gravitationalConstant: number;
    timeStep: number;
  };
  bodies: CelestialBody[];
}

const INITIAL_MOCK_DATA: SimulationState = {
  version: "1.0.0",
  timestamp: new Date().toISOString(),
  config: {
    integrator: "Verlet",
    collisionMerge: true,
    gravitationalConstant: 6.67430e-11,
    timeStep: 0.016
  },
  bodies: [
    {
      id: "body-alpha",
      name: "Alpha Centauri A",
      mass: 2.18e30,
      radius: 8.5e8,
      position: [0, 0],
      velocity: [0, 0],
      color: "#facc15",
      isStatic: true
    },
    {
      id: "body-beta",
      name: "Proxima b",
      mass: 7.6e24,
      radius: 7.1e6,
      position: [1.5e11, 0],
      velocity: [0, 29780],
      color: "#38bdf8"
    },
    {
      id: "body-gamma",
      name: "Rogue Comet",
      mass: 1.0e14,
      radius: 5000,
      position: [-2.5e11, 1.2e11],
      velocity: [15000, -8000],
      color: "#a78bfa"
    }
  ]
};

// --- Helper Components ---

const Starfield = () => {
  const stars = useMemo(() => {
    return Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.8 + 0.2,
      delay: Math.random() * 5,
      duration: Math.random() * 3 + 2,
    }));
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-slate-950 pointer-events-none">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-slate-200 animate-pulse"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        />
      ))}
      {/* Nebular glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[150px]" />
    </div>
  );
};

// --- Syntax Highlighter ---
const highlightJSON = (jsonString: string) => {
  // Simple regex-based JSON syntax highlighter
  const regex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g;
  return jsonString.replace(regex, (match) => {
    let cls = 'text-cyan-400'; // numbers
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'text-indigo-300 font-semibold'; // keys
      } else {
        cls = 'text-emerald-400'; // strings
      }
    } else if (/true|false/.test(match)) {
      cls = 'text-fuchsia-400 font-bold'; // booleans
    } else if (/null/.test(match)) {
      cls = 'text-rose-400 font-bold'; // nulls
    }
    return `<span class="${cls}">${match}</span>`;
  });
};

// --- Main Application ---

export default function App() {
  const [simState, setSimState] = useState<SimulationState>(INITIAL_MOCK_DATA);
  const [formatPretty, setFormatPretty] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [copied, setCopied] = useState(false);

  // Generate the current JSON string based on settings
  const jsonOutput = useMemo(() => {
    const dataToExport = { ...simState };
    
    // Update timestamp to current
    dataToExport.timestamp = new Date().toISOString();

    if (!includeMetadata) {
      // @ts-ignore - dynamic deletion for export formatting
      delete dataToExport.version;
      // @ts-ignore
      delete dataToExport.timestamp;
    }

    return formatPretty 
      ? JSON.stringify(dataToExport, null, 2)
      : JSON.stringify(dataToExport);
  }, [simState, formatPretty, includeMetadata]);

  // Handle Download
  const handleDownload = () => {
    const blob = new Blob([jsonOutput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orbit-preset-${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle Copy
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Randomize some mock data to show reactivity
  const handlePerturbData = () => {
    setSimState(prev => ({
      ...prev,
      bodies: prev.bodies.map(body => ({
        ...body,
        velocity: [
          body.velocity[0] + (Math.random() * 1000 - 500),
          body.velocity[1] + (Math.random() * 1000 - 500)
        ]
      }))
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans relative flex items-center justify-center p-4 sm:p-8">
      <Starfield />

      <main className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: Controls & Context */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Header Card */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-indigo-500/20 rounded-2xl p-6 shadow-2xl shadow-indigo-500/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                <Orbit size={24} />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                Export State
              </h1>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Export the current N-body simulation initial conditions. You can use this JSON to share presets or resume simulations later.
            </p>
          </div>

          {/* Configuration Card */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-6 text-slate-300">
              <Settings2 size={18} />
              <h2 className="font-semibold text-lg">Export Options</h2>
            </div>

            <div className="space-y-4 flex-1">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 cursor-pointer hover:bg-slate-800 transition-colors group">
                <div className="flex flex-col">
                  <span className="font-medium text-slate-200 group-hover:text-indigo-300 transition-colors">Pretty Print</span>
                  <span className="text-xs text-slate-500">Format with indentation and line breaks</span>
                </div>
                <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-700 transition-colors">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={formatPretty}
                    onChange={(e) => setFormatPretty(e.target.checked)}
                  />
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formatPretty ? 'translate-x-6 bg-indigo-400' : 'translate-x-1'}`} />
                </div>
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 cursor-pointer hover:bg-slate-800 transition-colors group">
                <div className="flex flex-col">
                  <span className="font-medium text-slate-200 group-hover:text-cyan-300 transition-colors">Include Metadata</span>
                  <span className="text-xs text-slate-500">Attach version & timestamp</span>
                </div>
                <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-700 transition-colors">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={includeMetadata}
                    onChange={(e) => setIncludeMetadata(e.target.checked)}
                  />
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${includeMetadata ? 'translate-x-6 bg-cyan-400' : 'translate-x-1'}`} />
                </div>
              </label>
            </div>

            {/* Mock Action */}
            <div className="mt-8 pt-6 border-t border-slate-800">
              <button 
                onClick={handlePerturbData}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700 text-sm font-medium"
              >
                <RefreshCcw size={16} />
                Perturb Velocities (Test Reactivity)
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: JSON Preview & Actions */}
        <div className="lg:col-span-8 flex flex-col bg-[#0d1117] border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-3xl">
          
          {/* Editor Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-800">
            <div className="flex items-center gap-2 text-slate-400">
              <FileJson size={16} className="text-cyan-400" />
              <span className="text-sm font-mono">simulation_state.json</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button 
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all shadow-[0_0_15px_rgba(79,70,229,0.4)]"
              >
                <Download size={14} />
                Download JSON
              </button>
            </div>
          </div>

          {/* Editor Content Area */}
          <div className="relative flex-1 p-4 overflow-auto custom-scrollbar group">
            {/* Overlay glow for sci-fi feel */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <pre className="font-mono text-[13px] leading-relaxed select-text">
              <code 
                dangerouslySetInnerHTML={{ __html: highlightJSON(jsonOutput) }}
              />
            </pre>
          </div>

          {/* Editor Footer */}
          <div className="bg-slate-900/80 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Info size={14} />
              <span>{jsonOutput.length} bytes</span>
            </div>
            <div>
              UTF-8
            </div>
          </div>

        </div>
      </main>

      {/* Global styles for custom scrollbar in this component */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(71, 85, 105, 0.6);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.8);
        }
      `}} />
    </div>
  );
}