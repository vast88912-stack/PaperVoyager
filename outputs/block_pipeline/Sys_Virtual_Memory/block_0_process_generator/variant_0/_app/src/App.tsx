import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Plus, 
  Trash2, 
  Activity, 
  Cpu, 
  Settings2, 
  Database,
  FastForward,
  RotateCcw
} from 'lucide-react';

// --- Types ---
type AccessPattern = 'Sequential' | 'Random' | 'Locality';

interface Process {
  id: string;
  name: string;
  size: number; // Total virtual pages
  pattern: AccessPattern;
  color: string;
  status: 'Idle' | 'Running' | 'Paused';
  currentSeq: number;
  hotZoneStart: number;
  hotZoneSize: number;
}

interface MemoryAccess {
  id: string;
  processId: string;
  processName: string;
  processColor: string;
  virtualPage: number;
  timestamp: number;
}

// --- Constants & Helpers ---
const COLORS = [
  'bg-slate-700', 'bg-zinc-600', 'bg-stone-600', 'bg-neutral-700', 
  'bg-gray-700', 'bg-slate-500', 'bg-zinc-500', 'bg-stone-500'
];

const generateId = () => Math.random().toString(36).substr(2, 9);

export default function App() {
  // --- State ---
  const [processes, setProcesses] = useState<Process[]>([]);
  const [traces, setTraces] = useState<MemoryAccess[]>([]);
  const [isGlobalRunning, setIsGlobalRunning] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1000); // ms per tick

  // Form State
  const [formName, setFormName] = useState('');
  const [formSize, setFormSize] = useState<number>(16);
  const [formPattern, setFormPattern] = useState<AccessPattern>('Locality');

  const traceContainerRef = useRef<HTMLDivElement>(null);

  // --- Logic ---
  const handleAddProcess = (e: React.FormEvent) => {
    e.preventDefault();
    const newProcess: Process = {
      id: generateId(),
      name: formName || `Process ${processes.length + 1}`,
      size: formSize,
      pattern: formPattern,
      color: COLORS[processes.length % COLORS.length],
      status: 'Idle',
      currentSeq: 0,
      hotZoneStart: Math.floor(Math.random() * (formSize * 0.8)),
      hotZoneSize: Math.max(1, Math.floor(formSize * 0.2)),
    };
    setProcesses([...processes, newProcess]);
    setFormName('');
  };

  const handleRemoveProcess = (id: string) => {
    setProcesses(processes.filter(p => p.id !== id));
    setTraces(traces.filter(t => t.processId !== id));
  };

  const toggleProcessStatus = (id: string) => {
    setProcesses(processes.map(p => {
      if (p.id === id) {
        const newStatus = p.status === 'Running' ? 'Paused' : 'Running';
        return { ...p, status: newStatus };
      }
      return p;
    }));
  };

  const generateNextAccess = useCallback((process: Process): { access: MemoryAccess, updatedProcess: Process } => {
    let targetPage = 0;
    let nextSeq = process.currentSeq;

    switch (process.pattern) {
      case 'Sequential':
        targetPage = process.currentSeq;
        nextSeq = (process.currentSeq + 1) % process.size;
        break;
      case 'Random':
        targetPage = Math.floor(Math.random() * process.size);
        break;
      case 'Locality':
        // 80% chance to hit the 20% hot zone
        const isHot = Math.random() < 0.8;
        if (isHot) {
          targetPage = process.hotZoneStart + Math.floor(Math.random() * process.hotZoneSize);
        } else {
          targetPage = Math.floor(Math.random() * process.size);
        }
        break;
    }

    const access: MemoryAccess = {
      id: generateId(),
      processId: process.id,
      processName: process.name,
      processColor: process.color,
      virtualPage: targetPage,
      timestamp: Date.now(),
    };

    return { access, updatedProcess: { ...process, currentSeq: nextSeq } };
  }, []);

  // Simulation Loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isGlobalRunning) {
      interval = setInterval(() => {
        setProcesses(currentProcesses => {
          const runningProcesses = currentProcesses.filter(p => p.status === 'Running');
          if (runningProcesses.length === 0) return currentProcesses;

          // Pick a random running process to generate an access for (simulating CPU scheduler)
          const selectedProcess = runningProcesses[Math.floor(Math.random() * runningProcesses.length)];
          
          const { access, updatedProcess } = generateNextAccess(selectedProcess);
          
          setTraces(prev => {
            const newTraces = [...prev, access];
            // Keep only last 50 traces to prevent memory bloat in UI
            if (newTraces.length > 50) return newTraces.slice(newTraces.length - 50);
            return newTraces;
          });

          return currentProcesses.map(p => p.id === updatedProcess.id ? updatedProcess : p);
        });
      }, simulationSpeed);
    }

    return () => clearInterval(interval);
  }, [isGlobalRunning, simulationSpeed, generateNextAccess]);

  // Auto-scroll traces
  useEffect(() => {
    if (traceContainerRef.current) {
      traceContainerRef.current.scrollTop = traceContainerRef.current.scrollHeight;
    }
  }, [traces]);

  // --- Render ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 flex flex-col gap-6">
      
      {/* Header */}
      <header className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Cpu className="w-6 h-6 text-slate-700" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Process Generator</h1>
            <p className="text-sm text-slate-500">Virtual Memory Explorer Module</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Settings2 className="w-4 h-4" />
            <span>Speed:</span>
            <select 
              value={simulationSpeed} 
              onChange={(e) => setSimulationSpeed(Number(e.target.value))}
              className="bg-transparent font-medium focus:outline-none"
            >
              <option value={2000}>Slow</option>
              <option value={1000}>Normal</option>
              <option value={250}>Fast</option>
              <option value={50}>Turbo</option>
            </select>
          </div>
          <button
            onClick={() => setIsGlobalRunning(!isGlobalRunning)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isGlobalRunning 
                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200' 
                : 'bg-slate-800 text-white hover:bg-slate-700'
            }`}
          >
            {isGlobalRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isGlobalRunning ? 'Pause Simulation' : 'Start Simulation'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        
        {/* Left Column: Controls & Creation */}
        <div className="flex flex-col gap-6">
          
          {/* Create Process Form */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-slate-500" />
              New Process
            </h2>
            <form onSubmit={handleAddProcess} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Process Name</label>
                <input 
                  type="text" 
                  placeholder="e.g., Database Daemon"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Virtual Pages</label>
                  <input 
                    type="number" 
                    min="4" 
                    max="128"
                    value={formSize}
                    onChange={(e) => setFormSize(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Access Pattern</label>
                  <select 
                    value={formPattern}
                    onChange={(e) => setFormPattern(e.target.value as AccessPattern)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all"
                  >
                    <option value="Locality">Locality (80/20)</option>
                    <option value="Sequential">Sequential</option>
                    <option value="Random">Random</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="mt-2 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Generate Process
              </button>
            </form>
          </div>

          {/* Trace Stream Visualization */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-slate-500" />
                Memory Access Stream
              </h2>
              <button 
                onClick={() => setTraces([])}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Clear
              </button>
            </div>
            
            <div 
              ref={traceContainerRef}
              className="flex-1 bg-slate-900 rounded-lg p-4 overflow-y-auto font-mono text-sm h-64 border border-slate-800 shadow-inner"
            >
              {traces.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-600 italic">
                  Waiting for memory requests...
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {traces.map((trace, idx) => (
                    <div key={trace.id} className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <span className="text-slate-500 text-xs w-16">
                        +{idx}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${trace.processColor}`}></span>
                      <span className="text-slate-300 w-24 truncate">{trace.processName}</span>
                      <span className="text-slate-400">requests</span>
                      <span className="text-emerald-400 font-semibold">
                        VP_{trace.virtualPage.toString().padStart(3, '0')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Active Processes */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Database className="w-5 h-5 text-slate-500" />
              Active Processes ({processes.length})
            </h2>
            {processes.length > 0 && (
              <div className="flex gap-2">
                <button 
                  onClick={() => setProcesses(processes.map(p => ({ ...p, status: 'Running' })))}
                  className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors"
                >
                  Run All
                </button>
                <button 
                  onClick={() => setProcesses(processes.map(p => ({ ...p, status: 'Paused' })))}
                  className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors"
                >
                  Pause All
                </button>
              </div>
            )}
          </div>

          {processes.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl p-8">
              <Database className="w-12 h-12 mb-3 text-slate-300" />
              <p>No processes generated yet.</p>
              <p className="text-sm">Use the form on the left to create one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-4">
              {processes.map(process => (
                <div key={process.id} className="border border-slate-200 rounded-xl p-4 flex flex-col gap-4 hover:border-slate-300 transition-colors bg-slate-50/50">
                  
                  {/* Process Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-10 rounded-full ${process.color}`}></div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{process.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <span className="px-2 py-0.5 bg-slate-200 rounded-md font-medium">{process.pattern}</span>
                          <span>•</span>
                          <span>{process.size} Pages</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toggleProcessStatus(process.id)}
                        className={`p-1.5 rounded-md transition-colors ${
                          process.status === 'Running' 
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                        title={process.status === 'Running' ? 'Pause' : 'Run'}
                      >
                        {process.status === 'Running' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={() => handleRemoveProcess(process.id)}
                        className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                        title="Terminate Process"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Virtual Address Space Visualization */}
                  <div>
                    <div className="text-xs font-medium text-slate-500 mb-2 flex justify-between">
                      <span>Virtual Address Space</span>
                      {process.pattern === 'Locality' && (
                        <span className="text-rose-500/80">Hot Zone: VP_{process.hotZoneStart} - VP_{process.hotZoneStart + process.hotZoneSize - 1}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: process.size }).map((_, i) => {
                        // Determine if this page was recently accessed
                        const recentAccess = traces.slice(-5).find(t => t.processId === process.id && t.virtualPage === i);
                        const isHotZone = process.pattern === 'Locality' && i >= process.hotZoneStart && i < process.hotZoneStart + process.hotZoneSize;
                        
                        return (
                          <div 
                            key={i}
                            title={`Virtual Page ${i}`}
                            className={`w-4 h-4 rounded-sm border text-[8px] flex items-center justify-center transition-all duration-300 ${
                              recentAccess 
                                ? `${process.color} border-transparent text-white scale-125 z-10 shadow-sm` 
                                : isHotZone 
                                  ? 'bg-rose-50 border-rose-200 text-rose-300' 
                                  : 'bg-white border-slate-200 text-slate-300'
                            }`}
                          >
                            {/* Optional: show page number if size is small enough, else keep blank */}
                            {process.size <= 64 ? i : ''}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Status Footer */}
                  <div className="mt-auto pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        {process.status === 'Running' && isGlobalRunning && (
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${process.color}`}></span>
                        )}
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${
                          process.status === 'Running' ? process.color : 'bg-slate-300'
                        }`}></span>
                      </span>
                      <span className={process.status === 'Running' ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                        {process.status}
                      </span>
                    </div>
                    
                    {process.status === 'Running' && !isGlobalRunning && (
                      <span className="text-amber-600 italic flex items-center gap-1">
                        Global simulation paused
                      </span>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}