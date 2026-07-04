import React, { useState, useEffect, useMemo } from 'react';
import { 
  Cpu, 
  Plus, 
  Trash2, 
  Settings2, 
  Activity, 
  Database,
  LayoutGrid,
  PlaySquare
} from 'lucide-react';

// --- Types & Interfaces ---
type AccessPattern = 'Sequential' | 'Random' | 'Localized';

interface Process {
  id: string;
  pid: number;
  name: string;
  sizeKB: number;
  numPages: number;
  pattern: AccessPattern;
  colorClass: string;
  createdAt: number;
  activePage: number | null;
}

const PAGE_SIZE_KB = 4; // 4KB pages

// --- Helper Functions ---
const generatePID = () => Math.floor(Math.random() * 9000) + 1000;

const NEUTRAL_COLORS = [
  'bg-slate-500',
  'bg-zinc-500',
  'bg-stone-500',
  'bg-neutral-500',
  'bg-gray-500',
];

export default function App() {
  // --- State ---
  const [processes, setProcesses] = useState<Process[]>([]);
  const [procSize, setProcSize] = useState<number>(64); // KB
  const [procPattern, setProcPattern] = useState<AccessPattern>('Sequential');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // --- Derived Metrics ---
  const totalAllocatedKB = processes.reduce((acc, p) => acc + p.sizeKB, 0);
  const totalPages = processes.reduce((acc, p) => acc + p.numPages, 0);

  // --- Actions ---
  const handleGenerateProcess = (e: React.FormEvent) => {
    e.preventDefault();
    const numPages = Math.ceil(procSize / PAGE_SIZE_KB);
    
    const newProcess: Process = {
      id: crypto.randomUUID(),
      pid: generatePID(),
      name: `Process-${processes.length + 1}`,
      sizeKB: procSize,
      numPages,
      pattern: procPattern,
      colorClass: NEUTRAL_COLORS[processes.length % NEUTRAL_COLORS.length],
      createdAt: Date.now(),
      activePage: null
    };

    setProcesses(prev => [newProcess, ...prev]);
  };

  const handleRemoveProcess = (id: string) => {
    setProcesses(prev => prev.filter(p => p.id !== id));
  };

  const handleClearAll = () => {
    setProcesses([]);
    setIsSimulating(false);
  };

  // --- Simulation Effect ---
  // Simulates memory access patterns visually
  useEffect(() => {
    let interval: number;
    if (isSimulating && processes.length > 0) {
      interval = setInterval(() => {
        setProcesses(prev => prev.map(proc => {
          let nextActivePage = 0;
          if (proc.pattern === 'Sequential') {
            nextActivePage = proc.activePage === null ? 0 : (proc.activePage + 1) % proc.numPages;
          } else if (proc.pattern === 'Random') {
            nextActivePage = Math.floor(Math.random() * proc.numPages);
          } else if (proc.pattern === 'Localized') {
            const current = proc.activePage || 0;
            const delta = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
            nextActivePage = Math.max(0, Math.min(proc.numPages - 1, current + delta));
          }
          return { ...proc, activePage: nextActivePage };
        }));
      }, 800);
    } else {
      setProcesses(prev => prev.map(p => ({ ...p, activePage: null })));
    }
    return () => clearInterval(interval);
  }, [isSimulating, processes.length]);

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-800 font-sans p-6 md:p-10">
      
      {/* Header */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-neutral-900 flex items-center gap-3">
            <Cpu className="w-8 h-8 text-neutral-500" />
            Virtual Memory Explorer
          </h1>
          <p className="text-neutral-500 mt-1 text-sm">
            Module 1: Process Generator & Virtual Address Space Allocation
          </p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-white px-4 py-2 rounded-md shadow-sm border border-neutral-200 flex flex-col items-center min-w-[120px]">
            <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Total Virtual Mem</span>
            <span className="text-lg font-mono text-neutral-700">{totalAllocatedKB} KB</span>
          </div>
          <div className="bg-white px-4 py-2 rounded-md shadow-sm border border-neutral-200 flex flex-col items-center min-w-[120px]">
            <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Total Pages</span>
            <span className="text-lg font-mono text-neutral-700">{totalPages}</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Panel: Generator Controls */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
            <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-200 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-neutral-500" />
              <h2 className="font-medium text-neutral-700">Process Configuration</h2>
            </div>
            
            <form onSubmit={handleGenerateProcess} className="p-6 space-y-6">
              {/* Size Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-neutral-600">Memory Requirement</label>
                  <span className="text-sm font-mono bg-neutral-100 px-2 py-1 rounded text-neutral-700">
                    {procSize} KB
                  </span>
                </div>
                <input 
                  type="range" 
                  min="4" 
                  max="256" 
                  step="4"
                  value={procSize}
                  onChange={(e) => setProcSize(Number(e.target.value))}
                  className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-600"
                />
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>4 KB (1 Page)</span>
                  <span>256 KB (64 Pages)</span>
                </div>
              </div>

              {/* Access Pattern */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-neutral-600">Expected Access Pattern</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Sequential', 'Random', 'Localized'] as AccessPattern[]).map(pattern => (
                    <button
                      key={pattern}
                      type="button"
                      onClick={() => setProcPattern(pattern)}
                      className={`py-2 px-3 text-xs rounded-md border transition-all ${
                        procPattern === pattern 
                          ? 'bg-neutral-800 text-white border-neutral-800' 
                          : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      {pattern}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-neutral-100">
                <button 
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-900 text-white py-2.5 rounded-lg transition-colors font-medium text-sm shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Spawn Process
                </button>
              </div>
            </form>
          </div>

          {/* Simulation Control */}
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 flex items-center justify-between">
            <div>
              <h3 className="font-medium text-neutral-700 flex items-center gap-2">
                <Activity className="w-4 h-4 text-neutral-500" />
                Access Simulation
              </h3>
              <p className="text-xs text-neutral-500 mt-1">Simulate virtual memory accesses</p>
            </div>
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              disabled={processes.length === 0}
              className={`p-3 rounded-full transition-colors ${
                processes.length === 0 
                  ? 'bg-neutral-100 text-neutral-300 cursor-not-allowed'
                  : isSimulating 
                    ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                    : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
              }`}
            >
              <PlaySquare className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Right Panel: Active Processes List */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 min-h-[600px] flex flex-col">
            <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-neutral-500" />
                <h2 className="font-medium text-neutral-700">Active Processes</h2>
                <span className="ml-2 bg-neutral-200 text-neutral-700 text-xs px-2 py-0.5 rounded-full font-mono">
                  {processes.length}
                </span>
              </div>
              {processes.length > 0 && (
                <button 
                  onClick={handleClearAll}
                  className="text-xs text-neutral-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Kill All
                </button>
              )}
            </div>

            <div className="p-6 flex-1 overflow-y-auto bg-neutral-50/50">
              {processes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-400 space-y-4">
                  <LayoutGrid className="w-12 h-12 opacity-20" />
                  <p className="text-sm">No processes active. Generate a process to view its virtual address space.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {processes.map((proc) => (
                    <div 
                      key={proc.id} 
                      className="bg-white border border-neutral-200 rounded-lg p-5 shadow-sm transition-all hover:shadow-md"
                    >
                      {/* Process Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${proc.colorClass} shadow-sm`} />
                          <div>
                            <h3 className="font-semibold text-neutral-800 text-sm">
                              {proc.name} <span className="text-neutral-400 font-mono font-normal ml-1">PID:{proc.pid}</span>
                            </h3>
                            <div className="flex gap-3 mt-1 text-xs text-neutral-500 font-mono">
                              <span>Size: {proc.sizeKB} KB</span>
                              <span>Pages: {proc.numPages}</span>
                              <span>Pattern: {proc.pattern}</span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleRemoveProcess(proc.id)}
                          className="text-neutral-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors"
                          title="Terminate Process"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Virtual Pages Visualization */}
                      <div className="bg-neutral-50 p-4 rounded-md border border-neutral-100">
                        <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2 font-semibold">
                          Virtual Address Space (Pages)
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {Array.from({ length: proc.numPages }).map((_, i) => {
                            const isActive = proc.activePage === i;
                            return (
                              <div 
                                key={i}
                                className={`
                                  w-6 h-6 rounded-sm border flex items-center justify-center text-[9px] font-mono transition-all duration-300
                                  ${isActive 
                                    ? `${proc.colorClass} border-transparent text-white scale-110 shadow-sm z-10` 
                                    : 'bg-white border-neutral-200 text-neutral-400'
                                  }
                                `}
                                title={`Virtual Page ${i}`}
                              >
                                {i}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}