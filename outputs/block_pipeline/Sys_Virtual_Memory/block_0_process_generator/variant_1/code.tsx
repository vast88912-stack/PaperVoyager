import React, { useState, useEffect, useMemo } from 'react';

// --- Types & Constants ---
type AccessPattern = 'Sequential' | 'Random' | 'Localized';

interface Process {
  id: string;
  pid: number;
  name: string;
  sizeKB: number;
  pattern: AccessPattern;
  color: string;
  createdAt: number;
  pageCount: number;
}

const PAGE_SIZE_KB = 4;
const MAX_VIRTUAL_MEM_KB = 256; 
const SYSTEM_COLORS = [
  'bg-indigo-500', 'bg-blue-500', 'bg-sky-500', 'bg-cyan-500', 
  'bg-teal-500', 'bg-emerald-500', 'bg-violet-500', 'bg-purple-500'
];

const RANDOM_NAMES = [
  'Web Browser', 'Database Daemon', 'Game Engine', 'Text Editor', 
  'Compiler', 'Media Player', 'Terminal', 'System Monitor'
];

// --- Helper Functions ---
const generateId = () => Math.random().toString(36).substring(2, 9);
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// --- Icons (Inline SVGs for zero dependencies) ---
const IconCpu = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
);

const IconPlus = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const IconTrash = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const IconActivity = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const IconLayers = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

export default function App() {
  // --- State ---
  const [processes, setProcesses] = useState<Process[]>([]);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [pidCounter, setPidCounter] = useState(1000);

  // Form State
  const [formName, setFormName] = useState('');
  const [formSize, setFormSize] = useState<number>(16);
  const [formPattern, setFormPattern] = useState<AccessPattern>('Localized');

  // --- Derived State ---
  const totalAllocatedKB = processes.reduce((acc, p) => acc + p.sizeKB, 0);
  const selectedProcess = processes.find(p => p.id === selectedProcessId);

  // --- Handlers ---
  const handleAddProcess = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!formName.trim()) return;
    if (formSize <= 0) return;

    const newProcess: Process = {
      id: generateId(),
      pid: pidCounter,
      name: formName.trim(),
      sizeKB: formSize,
      pattern: formPattern,
      color: SYSTEM_COLORS[processes.length % SYSTEM_COLORS.length],
      createdAt: Date.now(),
      pageCount: Math.ceil(formSize / PAGE_SIZE_KB)
    };

    setProcesses(prev => [...prev, newProcess]);
    setPidCounter(prev => prev + getRandomInt(1, 5));
    setFormName('');
    setFormSize(16);
    setSelectedProcessId(newProcess.id);
  };

  const handleGenerateRandom = () => {
    const randomSize = getRandomInt(1, 16) * PAGE_SIZE_KB; // 4KB to 64KB
    const patterns: AccessPattern[] = ['Sequential', 'Random', 'Localized'];
    
    const newProcess: Process = {
      id: generateId(),
      pid: pidCounter,
      name: RANDOM_NAMES[getRandomInt(0, RANDOM_NAMES.length - 1)],
      sizeKB: randomSize,
      pattern: patterns[getRandomInt(0, patterns.length - 1)],
      color: SYSTEM_COLORS[processes.length % SYSTEM_COLORS.length],
      createdAt: Date.now(),
      pageCount: Math.ceil(randomSize / PAGE_SIZE_KB)
    };

    setProcesses(prev => [...prev, newProcess]);
    setPidCounter(prev => prev + getRandomInt(1, 5));
    setSelectedProcessId(newProcess.id);
  };

  const handleKillProcess = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProcesses(prev => prev.filter(p => p.id !== id));
    if (selectedProcessId === id) {
      setSelectedProcessId(null);
    }
  };

  // --- Renderers ---
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-indigo-100">
      {/* Top Navigation / Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-zinc-900 p-2 rounded-lg text-white">
            <IconCpu className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">Virtual Memory Explorer</h1>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Process Generator Module</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex flex-col items-end">
            <span className="text-zinc-500">System Page Size</span>
            <span className="font-mono font-semibold">{PAGE_SIZE_KB} KB</span>
          </div>
          <div className="h-8 w-px bg-zinc-200"></div>
          <div className="flex flex-col items-end">
            <span className="text-zinc-500">Total Virtual Memory</span>
            <span className="font-mono font-semibold">{totalAllocatedKB} / {MAX_VIRTUAL_MEM_KB} KB</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Controls & List */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Process Generator Panel */}
          <section className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-zinc-100/50 px-5 py-4 border-b border-zinc-200 flex items-center gap-2">
              <IconPlus className="w-5 h-5 text-zinc-600" />
              <h2 className="font-semibold text-zinc-800">Spawn Process</h2>
            </div>
            
            <div className="p-5">
              <form onSubmit={handleAddProcess} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Process Name</label>
                  <input 
                    type="text" 
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Nginx Worker"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Size (KB)</label>
                    <input 
                      type="number" 
                      min="4"
                      step="4"
                      value={formSize}
                      onChange={(e) => setFormSize(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Access Pattern</label>
                    <select 
                      value={formPattern}
                      onChange={(e) => setFormPattern(e.target.value as AccessPattern)}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    >
                      <option value="Localized">Localized</option>
                      <option value="Sequential">Sequential</option>
                      <option value="Random">Random</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button 
                    type="submit"
                    disabled={!formName.trim() || formSize <= 0}
                    className="flex-1 bg-zinc-900 text-white text-sm font-medium py-2 rounded-md hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Create
                  </button>
                  <button 
                    type="button"
                    onClick={handleGenerateRandom}
                    className="flex-1 bg-white border border-zinc-200 text-zinc-700 text-sm font-medium py-2 rounded-md hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-200 transition-all"
                  >
                    Randomize
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* Active Processes List */}
          <section className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col flex-1">
            <div className="bg-zinc-100/50 px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconActivity className="w-5 h-5 text-zinc-600" />
                <h2 className="font-semibold text-zinc-800">Active Processes</h2>
              </div>
              <span className="bg-zinc-200 text-zinc-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {processes.length}
              </span>
            </div>
            
            <div className="overflow-y-auto max-h-[400px] p-2 flex flex-col gap-1">
              {processes.length === 0 ? (
                <div className="text-center py-10 text-zinc-400 text-sm">
                  No active processes.<br/>Spawn one to begin.
                </div>
              ) : (
                processes.map(proc => (
                  <div 
                    key={proc.id}
                    onClick={() => setSelectedProcessId(proc.id)}
                    className={`
                      group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border
                      ${selectedProcessId === proc.id 
                        ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' 
                        : 'bg-white border-transparent hover:bg-zinc-50 hover:border-zinc-200'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${proc.color} shadow-sm`}></div>
                      <div>
                        <div className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
                          {proc.name}
                        </div>
                        <div className="text-xs text-zinc-500 font-mono mt-0.5">
                          PID: {proc.pid} • {proc.sizeKB}KB
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleKillProcess(proc.id, e)}
                      className="text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      title="Kill Process"
                    >
                      <IconTrash className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Process Inspector */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {selectedProcess ? (
            <>
              {/* Inspector Header Panel */}
              <section className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-6 flex items-start justify-between border-b border-zinc-100">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-inner ${selectedProcess.color}`}>
                      <IconLayers className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-zinc-900">{selectedProcess.name}</h2>
                      <div className="flex items-center gap-3 mt-1 text-sm text-zinc-500 font-mono">
                        <span className="bg-zinc-100 px-2 py-0.5 rounded text-zinc-700">PID {selectedProcess.pid}</span>
                        <span>{selectedProcess.sizeKB} KB Total</span>
                        <span>•</span>
                        <span>{selectedProcess.pageCount} Pages required</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Access Pattern</div>
                    <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-700 text-sm font-medium">
                      {selectedProcess.pattern}
                    </div>
                  </div>
                </div>

                {/* Virtual Memory Layout Visualization */}
                <div className="p-6 bg-zinc-50/50">
                  <h3 className="text-sm font-bold text-zinc-800 mb-4 flex items-center gap-2">
                    Virtual Address Space 
                    <span className="text-xs font-normal text-zinc-500">(Page Table View)</span>
                  </h3>
                  
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                    {Array.from({ length: selectedProcess.pageCount }).map((_, i) => (
                      <div 
                        key={i} 
                        className="group relative aspect-square bg-white border border-zinc-200 rounded-lg shadow-sm flex flex-col items-center justify-center hover:border-indigo-300 hover:shadow-md transition-all cursor-help"
                      >
                        <span className="text-xs font-mono text-zinc-400 group-hover:text-indigo-500 transition-colors">
                          VPN {i}
                        </span>
                        <div className={`w-full h-1 absolute bottom-0 left-0 rounded-b-lg opacity-50 ${selectedProcess.color}`}></div>
                        
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-opacity">
                          Virtual Page {i}
                          <br/>
                          <span className="text-zinc-400 font-mono text-[10px]">
                            0x{(i * PAGE_SIZE_KB * 1024).toString(16).padStart(4, '0').toUpperCase()} - 0x{(((i + 1) * PAGE_SIZE_KB * 1024) - 1).toString(16).padStart(4, '0').toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Memory Access Pattern Simulation Preview */}
              <section className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6">
                <h3 className="text-sm font-bold text-zinc-800 mb-2">Expected Access Distribution</h3>
                <p className="text-sm text-zinc-500 mb-6">
                  {selectedProcess.pattern === 'Sequential' && "Memory addresses are accessed in a linear, predictable order. High spatial locality."}
                  {selectedProcess.pattern === 'Random' && "Memory addresses are accessed uniformly at random. Poor spatial and temporal locality."}
                  {selectedProcess.pattern === 'Localized' && "Memory accesses cluster around specific regions (e.g., loops, hot data). High temporal and spatial locality."}
                </p>

                {/* Mock Distribution Chart */}
                <div className="h-24 flex items-end gap-1 w-full bg-zinc-50 border border-zinc-100 rounded-lg p-2">
                  {Array.from({ length: 40 }).map((_, i) => {
                    let height = '10%';
                    if (selectedProcess.pattern === 'Sequential') {
                      height = `${(i / 40) * 100}%`;
                    } else if (selectedProcess.pattern === 'Random') {
                      height = `${Math.random() * 100}%`;
                    } else if (selectedProcess.pattern === 'Localized') {
                      // Create a bell curve-like cluster
                      const center = 20;
                      const dist = Math.abs(i - center);
                      const val = Math.max(5, 100 - (dist * dist * 1.5));
                      height = `${val + (Math.random() * 10)}%`;
                    }

                    return (
                      <div 
                        key={i} 
                        className={`flex-1 rounded-t-sm opacity-80 ${selectedProcess.color}`}
                        style={{ height }}
                      ></div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] font-mono text-zinc-400 mt-2 px-1">
                  <span>0x0000</span>
                  <span>Virtual Address Space</span>
                  <span>MAX_ADDR</span>
                </div>
              </section>
            </>
          ) : (
            <div className="h-full bg-zinc-100/50 border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center text-zinc-400 min-h-[400px]">
              <IconLayers className="w-12 h-12 mb-4 text-zinc-300" />
              <p className="text-lg font-medium text-zinc-500">No Process Selected</p>
              <p className="text-sm mt-1">Select a process from the list to inspect its virtual memory footprint.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}