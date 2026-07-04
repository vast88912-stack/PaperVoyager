import React, { useState, useMemo, useEffect, useRef } from 'react';

// --- Constants & Types ---

const PAGE_SIZE_BYTES = 4096; // 4KB

type AccessPattern = 'Random' | 'Sequential' | 'Localized';

interface Process {
  pid: number;
  name: string;
  sizeKB: number;
  totalPages: number;
  createdAt: number;
}

interface MemoryAccess {
  id: string;
  pid: number;
  virtualAddress: number;
  vpn: number;
  offset: number;
  isWrite: boolean;
}

// --- Icons (Inline SVGs for zero dependencies) ---

const CpuIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
    <rect x="9" y="9" width="6" height="6"></rect>
    <line x1="9" y1="1" x2="9" y2="4"></line>
    <line x1="15" y1="1" x2="15" y2="4"></line>
    <line x1="9" y1="20" x2="9" y2="23"></line>
    <line x1="15" y1="20" x2="15" y2="23"></line>
    <line x1="20" y1="9" x2="23" y2="9"></line>
    <line x1="20" y1="14" x2="23" y2="14"></line>
    <line x1="1" y1="9" x2="4" y2="9"></line>
    <line x1="1" y1="14" x2="4" y2="14"></line>
  </svg>
);

const ActivityIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </svg>
);

const PlusIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const TrashIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

// --- Main Application Component ---

export default function App() {
  // State
  const [processes, setProcesses] = useState<Process[]>([]);
  const [nextPid, setNextPid] = useState(1000);
  const [accessStream, setAccessStream] = useState<MemoryAccess[]>([]);
  
  // Heatmap: process ID -> VPN -> access count
  const [heatmaps, setHeatmaps] = useState<Record<number, Record<number, number>>>({});

  // Form States
  const [newProcName, setNewProcName] = useState('Browser');
  const [newProcSize, setNewProcSize] = useState<number>(256); // KB

  const [workloadPid, setWorkloadPid] = useState<number | ''>('');
  const [workloadPattern, setWorkloadPattern] = useState<AccessPattern>('Localized');
  const [workloadCount, setWorkloadCount] = useState<number>(50);

  // Auto-scroll for the access stream
  const streamEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (streamEndRef.current) {
      streamEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [accessStream]);

  // --- Handlers ---

  const handleCreateProcess = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProcSize <= 0) return;

    const totalPages = Math.ceil((newProcSize * 1024) / PAGE_SIZE_BYTES);
    
    const newProcess: Process = {
      pid: nextPid,
      name: newProcName,
      sizeKB: newProcSize,
      totalPages,
      createdAt: Date.now(),
    };

    setProcesses([...processes, newProcess]);
    setNextPid(prev => prev + 1);
    
    if (workloadPid === '') {
      setWorkloadPid(newProcess.pid);
    }
  };

  const handleRemoveProcess = (pid: number) => {
    setProcesses(processes.filter(p => p.pid !== pid));
    if (workloadPid === pid) setWorkloadPid('');
    setAccessStream(accessStream.filter(a => a.pid !== pid));
    
    const newHeatmaps = { ...heatmaps };
    delete newHeatmaps[pid];
    setHeatmaps(newHeatmaps);
  };

  const generateWorkload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workloadPid) return;
    
    const proc = processes.find(p => p.pid === Number(workloadPid));
    if (!proc) return;

    const newAccesses: MemoryAccess[] = [];
    let currentVpn = 0; // For sequential
    
    // Determine "hot" pages for localized access (20% of pages)
    const hotPagesCount = Math.max(1, Math.floor(proc.totalPages * 0.2));
    const hotPages = new Set<number>();
    while (hotPages.size < hotPagesCount) {
      hotPages.add(Math.floor(Math.random() * proc.totalPages));
    }
    const hotPagesArray = Array.from(hotPages);

    const processHeatmap = { ...(heatmaps[proc.pid] || {}) };

    for (let i = 0; i < workloadCount; i++) {
      let vpn = 0;
      let offset = Math.floor(Math.random() * PAGE_SIZE_BYTES); // Word-aligned simplifies real simulation, but byte-level is fine here

      if (workloadPattern === 'Random') {
        vpn = Math.floor(Math.random() * proc.totalPages);
      } 
      else if (workloadPattern === 'Sequential') {
        vpn = currentVpn;
        // Move to next page every 4 accesses for visualization variance
        if (i % 4 === 3) {
          currentVpn = (currentVpn + 1) % proc.totalPages;
        }
      } 
      else if (workloadPattern === 'Localized') {
        // 80% chance to hit a hot page, 20% to hit any page
        if (Math.random() < 0.8) {
          vpn = hotPagesArray[Math.floor(Math.random() * hotPagesArray.length)];
        } else {
          vpn = Math.floor(Math.random() * proc.totalPages);
        }
      }

      const virtualAddress = (vpn * PAGE_SIZE_BYTES) + offset;
      
      // 20% chance of write operation
      const isWrite = Math.random() < 0.2;

      newAccesses.push({
        id: Math.random().toString(36).substr(2, 9),
        pid: proc.pid,
        virtualAddress,
        vpn,
        offset,
        isWrite
      });

      processHeatmap[vpn] = (processHeatmap[vpn] || 0) + 1;
    }

    setAccessStream(prev => [...prev, ...newAccesses].slice(-200)); // Keep last 200
    setHeatmaps(prev => ({ ...prev, [proc.pid]: processHeatmap }));
  };

  const clearWorkload = () => {
    setAccessStream([]);
    setHeatmaps({});
  };

  // --- Render Helpers ---

  const getHeatmapColor = (count: number, maxCount: number) => {
    if (count === 0) return 'bg-zinc-100 border-zinc-200';
    const intensity = Math.max(0.1, count / maxCount);
    // Returning an inline style for dynamic opacity of a neutral slate color
    return {
      backgroundColor: `rgba(82, 82, 91, ${intensity})`, // zinc-600
      borderColor: `rgba(82, 82, 91, ${Math.min(1, intensity + 0.3)})`
    };
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans p-6 md:p-10 selection:bg-zinc-200">
      
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-zinc-800">Virtual Memory Explorer</h1>
          <p className="text-sm text-zinc-500 mt-1 uppercase tracking-widest font-semibold">Module 1: Process & Workload Generator</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Controls */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Panel: Create Process */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-zinc-800 border-b border-zinc-100 pb-3">
              <CpuIcon className="w-5 h-5 text-zinc-500" />
              <h2 className="text-lg font-medium">New Process</h2>
            </div>
            
            <form onSubmit={handleCreateProcess} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">PROCESS NAME</label>
                <input 
                  type="text" 
                  value={newProcName}
                  onChange={e => setNewProcName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:bg-white transition-colors text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">MEMORY SIZE (KB)</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    value={newProcSize}
                    onChange={e => setNewProcSize(Number(e.target.value))}
                    min="4" max="8192" step="4"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:bg-white transition-colors text-sm"
                    required
                  />
                  <span className="text-xs text-zinc-400 whitespace-nowrap">
                    {Math.ceil((newProcSize * 1024) / PAGE_SIZE_BYTES)} Pages
                  </span>
                </div>
              </div>
              <button 
                type="submit"
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                Instantiate Process
              </button>
            </form>
          </div>

          {/* Panel: Generate Workload */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-zinc-800 border-b border-zinc-100 pb-3">
              <ActivityIcon className="w-5 h-5 text-zinc-500" />
              <h2 className="text-lg font-medium">Workload Generator</h2>
            </div>
            
            <form onSubmit={generateWorkload} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">TARGET PROCESS</label>
                <select 
                  value={workloadPid}
                  onChange={e => setWorkloadPid(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:bg-white transition-colors text-sm"
                  disabled={processes.length === 0}
                  required
                >
                  <option value="" disabled>Select a process...</option>
                  {processes.map(p => (
                    <option key={p.pid} value={p.pid}>PID {p.pid} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">ACCESS PATTERN</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Localized', 'Sequential', 'Random'] as AccessPattern[]).map(pattern => (
                    <button
                      key={pattern}
                      type="button"
                      onClick={() => setWorkloadPattern(pattern)}
                      className={`py-2 text-xs font-medium rounded-md border transition-all ${
                        workloadPattern === pattern 
                          ? 'bg-zinc-100 border-zinc-400 text-zinc-900 shadow-sm' 
                          : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                      }`}
                    >
                      {pattern}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-400 mt-2">
                  {workloadPattern === 'Localized' && "80% of accesses hit 20% of the pages (simulates spatial locality)."}
                  {workloadPattern === 'Sequential' && "Accesses memory in linear, sequential order."}
                  {workloadPattern === 'Random' && "Completely random accesses across the virtual address space."}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">INSTRUCTION COUNT</label>
                <input 
                  type="number" 
                  value={workloadCount}
                  onChange={e => setWorkloadCount(Number(e.target.value))}
                  min="1" max="1000"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:bg-white transition-colors text-sm"
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={processes.length === 0}
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2"
              >
                Generate Memory Accesses
              </button>
            </form>
          </div>

        </div>

        {/* Right Column: Visualizations */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Processes List & Memory Map */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm flex-grow">
            <h2 className="text-lg font-medium text-zinc-800 mb-4 border-b border-zinc-100 pb-3 flex justify-between items-center">
              <span>Active Processes</span>
              <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-1 rounded-full">{processes.length} Running</span>
            </h2>

            {processes.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-zinc-400 border-2 border-dashed border-zinc-100 rounded-lg">
                <CpuIcon className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No processes active. Create one to begin.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {processes.map(proc => {
                  const procHeatmap = heatmaps[proc.pid] || {};
                  const maxAccesses = Math.max(1, ...Object.values(procHeatmap));

                  return (
                    <div key={proc.pid} className="border border-zinc-200 rounded-lg p-4 transition-all hover:border-zinc-300">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="bg-zinc-800 text-zinc-50 text-xs font-bold px-2 py-0.5 rounded">PID {proc.pid}</span>
                            <span className="font-medium text-zinc-900">{proc.name}</span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-1">
                            {proc.sizeKB} KB Total Memory &middot; {proc.totalPages} Virtual Pages
                          </p>
                        </div>
                        <button 
                          onClick={() => handleRemoveProcess(proc.pid)}
                          className="text-zinc-400 hover:text-red-500 transition-colors p-1"
                          title="Terminate Process"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Virtual Memory Map Visualization */}
                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Virtual Address Space (Heatmap)</span>
                          <span className="text-[10px] text-zinc-400">1 Block = 4KB Page</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {Array.from({ length: proc.totalPages }).map((_, i) => {
                            const accesses = procHeatmap[i] || 0;
                            const style = accesses > 0 ? getHeatmapColor(accesses, maxAccesses) : {};
                            
                            return (
                              <div 
                                key={i}
                                className={`w-4 h-4 rounded-sm border ${accesses === 0 ? 'bg-zinc-50 border-zinc-200' : 'border-zinc-500'}`}
                                style={style}
                                title={`VPN: ${i}\nVirtual Address Range: 0x${(i * PAGE_SIZE_BYTES).toString(16).padStart(4, '0')} - 0x${(((i + 1) * PAGE_SIZE_BYTES) - 1).toString(16).padStart(4, '0')}\nAccesses: ${accesses}`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Access Stream Simulation */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm h-80 flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
              <h2 className="text-lg font-medium text-zinc-800 flex items-center gap-2">
                <span>CPU Access Stream</span>
                {accessStream.length > 0 && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-zinc-500"></span>
                  </span>
                )}
              </h2>
              {accessStream.length > 0 && (
                <button 
                  onClick={clearWorkload}
                  className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
                >
                  Clear Stream
                </button>
              )}
            </div>

            <div className="flex-grow overflow-auto bg-zinc-50 rounded-lg border border-zinc-200 p-2 font-mono text-sm relative">
              {accessStream.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-xs font-sans">
                  Generate a workload to see the memory access sequence.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-zinc-50 text-zinc-400 text-[10px] uppercase tracking-wider pb-2 z-10">
                    <tr>
                      <th className="font-normal py-1 px-2 border-b border-zinc-200">PID</th>
                      <th className="font-normal py-1 px-2 border-b border-zinc-200">Operation</th>
                      <th className="font-normal py-1 px-2 border-b border-