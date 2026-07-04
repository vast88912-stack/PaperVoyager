import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Copy, 
  Download, 
  Check, 
  Settings2, 
  FileJson, 
  Database,
  TerminalSquare,
  Sparkles,
  Info
} from 'lucide-react';

// --- MOCK DATA ---
// Represents the N-body gravity simulation state that would be exported
const SIMULATION_METADATA = {
  version: "1.4.2",
  exportType: "InitialConditions",
  source: "Orbit Playground (ChatGPT Edition)"
};

const DEFAULT_SETTINGS = {
  integrator: "Verlet",
  timeStep: 0.016,
  gravityConstant: 6.67430e-11,
  collisionMerge: true,
  softeningLength: 0.1
};

const DEFAULT_BODIES = [
  { 
    id: "star-alpha", 
    name: "Alpha Centauri", 
    mass: 1.989e30, 
    radius: 696340,
    position: [0, 0, 0], 
    velocity: [0, 0, 0], 
    color: "#fbbf24",
    trailLength: 250
  },
  { 
    id: "planet-b", 
    name: "Proxima b", 
    mass: 5.972e24, 
    radius: 6371,
    position: [1.496e11, 0, 0], 
    velocity: [0, 29780, 0], 
    color: "#22d3ee",
    trailLength: 500
  },
  { 
    id: "comet-halley", 
    name: "Halley's Comet", 
    mass: 2.2e14, 
    radius: 5.5,
    position: [5.2e12, 1.2e11, 0], 
    velocity: [-800, -15000, 0], 
    color: "#c084fc",
    trailLength: 1000
  }
];

export default function App() {
  // --- STATE ---
  const [includeSettings, setIncludeSettings] = useState(true);
  const [includeBodies, setIncludeBodies] = useState(true);
  const [formatPretty, setFormatPretty] = useState(true);
  const [fileName, setFileName] = useState("orbit-initial-conditions");
  const [copied, setCopied] = useState(false);

  // --- DERIVED STATE ---
  const exportData = useMemo(() => {
    const data: Record<string, any> = {
      metadata: {
        ...SIMULATION_METADATA,
        timestamp: new Date().toISOString()
      }
    };
    if (includeSettings) data.settings = DEFAULT_SETTINGS;
    if (includeBodies) data.bodies = DEFAULT_BODIES;
    return data;
  }, [includeSettings, includeBodies]);

  const jsonString = useMemo(() => {
    return JSON.stringify(exportData, null, formatPretty ? 2 : 0);
  }, [exportData, formatPretty]);

  // Syntax highlighting for JSON display
  const highlightedJSON = useMemo(() => {
    let json = jsonString.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
      let cls = 'text-blue-300'; // number
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'text-cyan-400 font-medium'; // key
        } else {
          cls = 'text-green-300'; // string
        }
      } else if (/true|false/.test(match)) {
        cls = 'text-pink-400'; // boolean
      } else if (/null/.test(match)) {
        cls = 'text-gray-400'; // null
      }
      return '<span class="' + cls + '">' + match + '</span>';
    });
  }, [jsonString]);

  // --- HANDLERS ---
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName || 'export'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- BACKGROUND STARS ---
  const stars = useMemo(() => {
    return Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.7 + 0.3,
      delay: `${Math.random() * 5}s`,
      duration: `${Math.random() * 3 + 2}s`
    }));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      
      {/* --- BACKGROUND STARFIELD --- */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,27,75,0.4)_0%,rgba(2,6,23,1)_100%)]"></div>
        {stars.map(star => (
          <div
            key={star.id}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              left: star.left,
              top: star.top,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              animationDelay: star.delay,
              animationDuration: star.duration,
            }}
          />
        ))}
      </div>

      {/* --- MAIN UI CONTAINER --- */}
      <div className="relative z-10 w-full max-w-5xl bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl shadow-cyan-900/20 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/30">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20 text-cyan-400">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white tracking-wide">Export Initial Conditions</h1>
              <p className="text-xs text-slate-400">Snapshot current state for future simulations</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-2 text-xs font-mono bg-slate-950/50 px-3 py-1.5 rounded-full border border-slate-800">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="text-slate-300">Orbit Playground Engine</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row h-full">
          
          {/* --- LEFT SIDEBAR: CONTROLS --- */}
          <div className="w-full md:w-80 border-r border-slate-700/50 p-6 flex flex-col space-y-8 bg-slate-900/40">
            
            {/* FILE NAME INPUT */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300 flex items-center space-x-2">
                <TerminalSquare className="w-4 h-4 text-cyan-400" />
                <span>Filename</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value.replace(/[^a-z0-9-_]/gi, ''))}
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors font-mono"
                  placeholder="export-name"
                />
                <span className="absolute right-3 top-2.5 text-slate-500 text-sm font-mono pointer-events-none">.json</span>
              </div>
            </div>

            {/* INCLUSION TOGGLES */}
            <div className="space-y-4">
              <label className="text-sm font-medium text-slate-300 flex items-center space-x-2 border-b border-slate-800 pb-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <span>Export Payload</span>
              </label>
              
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${includeSettings ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-200 ${includeSettings ? 'left-6' : 'left-1'}`} />
                  </div>
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Physics Settings</span>
                </div>
                <Settings2 className="w-4 h-4 text-slate-500" />
              </label>

              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${includeBodies ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-200 ${includeBodies ? 'left-6' : 'left-1'}`} />
                  </div>
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Celestial Bodies</span>
                </div>
                <div className="w-4 h-4 rounded-full border-2 border-slate-500" />
              </label>
              
              {!includeBodies && !includeSettings && (
                 <div className="mt-2 text-xs text-rose-400 flex items-start space-x-1.5 bg-rose-500/10 p-2 rounded border border-rose-500/20">
                   <Info className="w-4 h-4 flex-shrink-0" />
                   <span>Warning: Export payload is essentially empty.</span>
                 </div>
              )}
            </div>

            {/* FORMATTING TOGGLE */}
            <div className="space-y-4">
              <label className="text-sm font-medium text-slate-300 flex items-center space-x-2 border-b border-slate-800 pb-2">
                <Settings2 className="w-4 h-4 text-cyan-400" />
                <span>Formatting</span>
              </label>
              
              <label className="flex items-center cursor-pointer group space-x-3">
                <div className={`w-10 h-5 rounded-full transition-colors relative ${formatPretty ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                  <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-200 ${formatPretty ? 'left-6' : 'left-1'}`} />
                </div>
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Pretty Print (Readable)</span>
              </label>
            </div>

            <div className="flex-grow"></div>

            {/* STATS */}
            <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800">
              <div className="flex justify-between text-xs text-slate-400 mb-2">
                <span>Payload Size</span>
                <span className="font-mono text-cyan-400">~{new Blob([jsonString]).size} bytes</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Bodies Count</span>
                <span className="font-mono text-cyan-400">{includeBodies ? DEFAULT_BODIES.length : 0}</span>
              </div>
            </div>
          </div>

          {/* --- RIGHT AREA: PREVIEW & ACTIONS --- */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-950/80">
            
            {/* ACTION BAR */}
            <div className="p-4 border-b border-slate-800 flex flex-wrap gap-3 justify-end bg-slate-900/30">
              <button 
                onClick={handleCopy}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-colors shadow-sm focus:ring-2 focus:ring-slate-500 focus:outline-none"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
                <span className="text-sm font-medium">{copied ? 'Copied!' : 'Copy JSON'}</span>
              </button>
              
              <button 
                onClick={handleDownload}
                className="flex items-center space-x-2 px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg border border-cyan-500 transition-colors shadow-[0_0_15px_rgba(8,145,178,0.4)] hover:shadow-[0_0_20px_rgba(8,145,178,0.6)] focus:ring-2 focus:ring-cyan-400 focus:outline-none"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm font-medium">Download .json</span>
              </button>
            </div>

            {/* JSON VIEWER */}
            <div className="flex-1 overflow-auto p-6 relative group">
              <div className="absolute top-4 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Preview</div>
              </div>
              
              <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-all">
                <code dangerouslySetInnerHTML={{ __html: highlightedJSON }} />
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}