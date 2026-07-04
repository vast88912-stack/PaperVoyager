import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Types ---

type AccessPattern = 'sequential' | 'random' | 'locality';

interface Process {
  id: string;
  name: string;
  virtualPages: number;
  pattern: AccessPattern;
  color: string;
  createdAt: number;
}

interface MemoryAccess {
  id: string;
  processId: string;
  processName: string;
  virtualPageNumber: number;
  pattern: AccessPattern;
  color: string;
  timestamp: number;
}

// --- Icons (Inline SVGs to avoid runtime dependencies) ---

const CpuIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

const PlusIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const TrashIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

const PlayIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const PauseIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16"></rect>
    <rect x="14" y="4" width="4" height="16"></rect>
  </svg>
);

const ActivityIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </svg>
);

// --- Constants & Helpers ---

const PALETTE = [
  '#475569', // Slate
  '#52525b', // Zinc
  '#57534e', // Stone
  '#374151', // Gray
  '#1e293b', // Dark Slate
  '#3f3f46', // Dark Zinc
];

const generateId = () => Math.random().toString(36).substring(2, 9);

// --- Main Component ---

export default function App() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [trace, setTrace] = useState<MemoryAccess[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeProcessId, setActiveProcessId] = useState<string | null>(null);

  // Form State
  const [newProcName, setNewProcName] = useState('');
  const [newProcPages, setNewProcPages] = useState<number>(16);
  const [newProcPattern, setNewProcPattern] = useState<AccessPattern>('random');

  // Generator State
  const traceEndRef = useRef<HTMLDivElement>(null);
  const seqCounters = useRef<Record<string, number>>({});

  // Auto-scroll trace
  useEffect(() => {
    if (traceEndRef.current) {
      traceEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [trace]);

  // Set default process name
  useEffect(() => {
    setNewProcName(`P${processes.length + 1}`);
  }, [processes.length]);

  const handleAddProcess = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProcPages < 1 || newProcPages > 256) return;
    
    const newProcess: Process = {
      id: generateId(),
      name: newProcName || `P${processes.length + 1}`,
      virtualPages: newProcPages,
      pattern: newProcPattern,
      color: PALETTE[processes.length % PALETTE.length],
      createdAt: Date.now()
    };
    
    setProcesses(prev => [...prev, newProcess]);
    seqCounters.current[newProcess.id] = 0;
    
    if (!activeProcessId) {
      setActiveProcessId(newProcess.id);
    }
  };

  const handleRemoveProcess = (id: string) => {
    setProcesses(prev => prev.filter(p => p.id !== id));
    setTrace(prev => prev.filter(t => t.processId !== id));
    delete seqCounters.current[id];
    if (activeProcessId === id) {
      setActiveProcessId(null);
      setIsRunning(false);
    }
  };

  const generateNextAccess = useCallback(() => {
    if (!activeProcessId) return;
    
    const proc = processes.find(p => p.id === activeProcessId);
    if (!proc) return;

    let vpn = 0;
    
    if (proc.pattern === 'sequential') {
      const current = seqCounters.current[proc.id] || 0;
      vpn = current % proc.virtualPages;
      seqCounters.current[proc.id] = vpn + 1;
    } 
    else if (proc.pattern === 'random') {
      vpn = Math.floor(Math.random() * proc.virtualPages);
    } 
    else if (proc.pattern === 'locality') {
      // 80/20 rule: 80% chance to access 20% of the pages
      const hotZoneSize = Math.max(1, Math.floor(proc.virtualPages * 0.2));
      const isHot = Math.random() < 0.8;
      if (isHot) {
        vpn = Math.floor(Math.random() * hotZoneSize);
      } else {
        vpn = hotZoneSize + Math.floor(Math.random() * (proc.virtualPages - hotZoneSize));
      }
    }

    const newAccess: MemoryAccess = {
      id: generateId(),
      processId: proc.id,
      processName: proc.name,
      virtualPageNumber: vpn,
      pattern: proc.pattern,
      color: proc.color,
      timestamp: Date.now()
    };

    setTrace(prev => {
      const updated = [...prev, newAccess];
      // Keep trace bounded to prevent memory leaks in browser
      if (updated.length > 200) return updated.slice(updated.length - 200);
      return updated;
    });
  }, [activeProcessId, processes]);

  // Simulation Loop
  useEffect(() => {
    let interval: number | undefined;
    if (isRunning && activeProcessId) {
      interval = window.setInterval(generateNextAccess, 150); // Generates a trace every 150ms
    }
    return () => clearInterval(interval);
  }, [isRunning, activeProcessId, generateNextAccess]);

  // Calculate histogram for the active process
  const getHistogram = () => {
    if (!activeProcessId) return [];
    const proc = processes.find(p => p.id === activeProcessId);
    if (!proc) return [];
    
    const counts = new Array(proc.virtualPages).fill(0);
    let maxCount = 0;
    
    trace.filter(t => t.processId === activeProcessId).forEach(t => {
      counts[t.virtualPageNumber]++;
      if (counts[t.virtualPageNumber] > maxCount) maxCount = counts[t.virtualPageNumber];
    });

    return counts.map((count, index) => ({
      vpn: index,
      count,
      heightPct: maxCount === 0 ? 0 : (count / maxCount) * 100
    }));
  };

  const activeHistogram = getHistogram();
  const activeProcess = processes.find(p => p.id === activeProcessId);

  return (
    <div className="min-h-screen bg-stone-100 text-slate-800 font-sans p-6 md:p-8">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-8 flex items-center gap-4 border-b border-stone-300 pb-6">
        <div className="p-3 bg-white rounded-lg shadow-sm border border-stone-200 text-slate-700">
          <CpuIcon className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Process Generator</h1>
          <p className="text-slate-500 text-sm mt-1">
            Configure processes and simulate memory access traces (Virtual Page Numbers) using different locality models.
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Configuration & Process List */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Create Process Panel */}
          <section className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/50">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <PlusIcon className="w-4 h-4 text-slate-500" />
                Define New Process
              </h2>
            </div>
            <form onSubmit={handleAddProcess} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Process Name</label>
                <input 
                  type="text" 
                  value={newProcName}
                  onChange={e => setNewProcName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all sm:text-sm"
                  placeholder="e.g. Chrome, gcc"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Virtual Pages</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="256"
                    value={newProcPages}
                    onChange={e => setNewProcPages(parseInt(e.target.value) || 16)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Access Pattern</label>
                  <select 
                    value={newProcPattern}
                    onChange={e => setNewProcPattern(e.target.value as AccessPattern)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all sm:text-sm"
                  >
                    <option value="sequential">Sequential</option>
                    <option value="random">Random</option>
                    <option value="locality">Locality (80/20)</option>
                  </select>
                </div>
              </div>
              <button 
                type="submit"
                className="w-full mt-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-md transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
              >
                Create Process
              </button>
            </form>
          </section>

          {/* Process Queue */}
          <section className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden flex flex-col max-h-[500px]">
            <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <ActivityIcon className="w-4 h-4 text-slate-500" />
                Process Queue
              </h2>
              <span className="text-xs font-medium bg-stone-200 text-stone-600 px-2 py-1 rounded-full">
                {processes.length} Active
              </span>
            </div>
            <div className="overflow-y-auto p-3 space-y-2 flex-1">
              {processes.length === 0 ? (
                <div className="text-center py-8 text-sm text-stone-400">
                  No processes defined.<br/>Create one above to begin.
                </div>
              ) : (
                processes.map(proc => (
                  <div 
                    key={proc.id} 
                    onClick={() => setActiveProcessId(proc.id)}
                    className={`group relative p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      activeProcessId === proc.id 
                        ? 'bg-slate-50 border-slate-300 shadow-sm ring-1 ring-slate-200' 
                        : 'bg-white border-stone-100 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: proc.color }} />
                        <span className="font-medium text-slate-700">{proc.name}</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleRemoveProcess(proc.id); }}
                        className="text-stone-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove Process"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-stone-500">
                      <div><span className="font-medium text-stone-400">Pages:</span> {proc.virtualPages}</div>
                      <div className="capitalize"><span className="font-medium text-stone-400">Mode:</span> {proc.pattern}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Visualization & Trace */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Active Generator Dashboard */}
          <section className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden flex flex-col h-[400px]">
            <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center">
              <h2 className="font-semibold text-slate-800">
                {activeProcess ? `Generator: ${activeProcess.name}` : 'Generator Dashboard'}
              </h2>
              {activeProcess && (
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsRunning(!isRunning)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      isRunning 
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' 
                        : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    }`}
                  >
                    {isRunning ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                    {isRunning ? 'Pause Stream' : 'Start Stream'}
                  </button>
                  <button 
                    onClick={generateNextAccess}
                    disabled={isRunning}
                    className="px-3 py-1.5 text-sm font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Step
                  </button>
                  <button 
                    onClick={() => setTrace(prev => prev.filter(t => t.processId !== activeProcessId))}
                    className="px-3 py-1.5 text-sm font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-md transition-all"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 p-6 flex flex-col">
              {!activeProcess ? (
                <div className="flex-1 flex items-center justify-center text-stone-400 text-sm">
                  Select a process from the queue to view its generator.
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4">Access Distribution (VPN Heatmap)</h3>
                    <div className="h-32 flex items-end gap-1 w-full bg-stone-50 border border-stone-100 rounded-lg p-2">
                      {activeHistogram.map((item) => (
                        <div 
                          key={item.vpn} 
                          className="flex-1 bg-slate-300 rounded-t-sm transition-all duration-300 relative group"
                          style={{ height: `${Math.max(item.heightPct, 2)}%`, backgroundColor: item.heightPct > 0 ? activeProcess.color : '#e7e5e4' }}
                        >
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-opacity">
                            VPN: {item.vpn} <br/> Hits: {item.count}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-1 text-[10px] text-stone-400 font-mono">
                      <span>0</span>
                      <span>VPN Index</span>
                      <span>{activeProcess.virtualPages - 1}</span>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col overflow-hidden bg-slate-900 rounded-lg shadow-inner relative">
                    <div className="absolute top-0 left-0 right-0 bg-slate-800/80 backdrop-blur-sm px-4 py-2 flex justify-between items-center border-b border-slate-700 z-10">
                      <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">Memory Access Trace</span>
                      <span className="text-[10px] font-mono text-slate-400">{trace.filter(t => t.processId === activeProcessId).length} accesses</span>
                    </div>
                    
                    <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 pt-12 flex items-center gap-2 custom-scrollbar">
                      {trace.filter(t => t.processId === activeProcessId).map((t, i) => (
                        <div 
                          key={t.id} 
                          className="flex-shrink-0 w-12 h-16 rounded-md flex flex-col items-center justify-center border shadow-sm animate-fade-in-up"
                          style={{ 
                            backgroundColor: `${t.color}15`, 
                            borderColor: `${t.color}40`,
                            color: t.color 
                          }}
                        >
                          <span className="text-[10px] opacity-70 mb-1">VPN</span>
                          <span className="text-lg font-mono font-bold">{t.virtualPageNumber}</span>
                        </div>
                      ))}
                      <div ref={traceEndRef} className="w-1 flex-shrink-0" />
                      {trace.filter(t => t.processId === activeProcessId).length === 0 && (
                        <div className="w-full text-center text-slate-500 text-sm font-mono mt-4">
                          [ No accesses generated yet. Click Step or Start Stream. ]
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Global Trace Log */}
          <section className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
             <div className="px-5 py-3 border-b border-stone-100 bg-stone-50/50">
              <h2 className="text-sm font-semibold text-slate-800">Global Event Log</h2>
            </div>
            <div className="p-0 max-h-48 overflow-y-auto bg-white font-mono text-xs custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-stone-50 text-stone-500 sticky top-0 border-b border-stone-100">
                  <tr>
                    <th className="py-2 px-4 font-medium w-24">Time</th>
                    <th className="py-2 px-4 font-medium w-32">Process</th>
                    <th className="py-2 px-4 font-medium">Virtual Address (VPN)</th>
                    <th className="py-2 px-4 font-medium w-24 text-right">Pattern</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {trace.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 px-4 text-center text-stone-400 italic">No events logged</td>
                    </tr>
                  ) : (
                    trace.slice().reverse().map((t, i) => (
                      <tr key={t.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="py-1.5 px-4 text-stone-400">{new Date(t.timestamp).toISOString().split('T')[1].slice(0, -1)}</td>
                        <td className="py-1.5 px-4 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: t.color }}></span>
                          <span className="font-semibold text-slate-700">{t.processName}</span>
                        </td>
                        <td className="py-1.5 px-4 font-bold text-slate-800">0x{(t.virtualPageNumber * 4096).toString(16).padStart(8, '0').toUpperCase()} <span className="text-stone-400 font-normal ml-2">(VPN: {t.virtualPageNumber})</span></td>
                        <td className="py-1.5 px-4 text-right text-stone-500 capitalize">{t.pattern}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </main>

      {/* Embedded Styles for animations and scrollbars */}
      <style dangerouslySetInnerHTML={{__html: `
        .animate-fade-in-up {
          animation: fadeInUp 0.3s ease-out forwards;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity