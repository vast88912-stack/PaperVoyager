import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, Plus, Trash2, Activity, Cpu, Settings2, Database,
  FastForward, RotateCcw, StepForward, List, Clock as ClockIcon, 
  ArrowRight, Info, LayoutDashboard, Layers, Hash, BarChart3, GitCommit
} from 'lucide-react';

// --- Shared Helpers & Types ---
const toHex = (num: number, padding = 2) => `0x${num.toString(16).toUpperCase().padStart(padding, '0')}`;
const toBin = (num: number | null, padding = 8) => num === null ? '-'.repeat(padding) : num.toString(2).padStart(padding, '0');
const generateId = () => Math.random().toString(36).substring(2, 11);

// --- Block 1 Types ---
type AccessPattern = 'Sequential' | 'Random' | 'Locality';
interface Process {
  id: string; name: string; size: number; pattern: AccessPattern; color: string;
  status: 'Idle' | 'Running' | 'Paused'; currentSeq: number; hotZoneStart: number; hotZoneSize: number;
}
interface MemoryAccess {
  id: string; processId: string; processName: string; processColor: string; virtualPage: number; timestamp: number;
}
const PROCESS_COLORS = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];

// --- Block 2 Types ---
type B2PageTableEntry = { vpn: number; pfn: number | null; valid: boolean; dirty: boolean; ref: boolean; };
type B2TLBEntry = { vpn: number; pfn: number; lastUsed: number; };
type LogEntry = { id: number; message: string; type: 'info' | 'success' | 'warning' | 'error'; };

// --- Block 3 Types ---
interface B3TLBEntry { vpn: number; pfn: number; lastAccessed: number; }
interface AccessLog { id: number; vpn: number; isHit: boolean; timestamp: Date; }

// --- Block 4 Types ---
type Algorithm = 'FIFO' | 'LRU' | 'CLOCK';
interface FrameB4 { id: number; page: number | null; loadedAt: number; lastUsed: number; useBit: boolean; }
interface StepHistory { step: number; page: number; isHit: boolean; evictedPage: number | null; }

// --- Block 5 Types ---
interface AccessRecord { tick: number; page: number; isFault: boolean; totalFaults: number; }

// --- Block 6 Types ---
type B6TLBEntry = { id: number; valid: boolean; vpn: number | null; ppn: number | null; lastUsed: number };
type PTEntry = { vpn: number; valid: boolean; ppn: number | null };
type FrameB6 = { ppn: number; data: string; allocated: boolean };

// ==========================================
// MODULE 1: Process Generator
// ==========================================
function ProcessGenerator() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [traces, setTraces] = useState<MemoryAccess[]>([]);
  const [isGlobalRunning, setIsGlobalRunning] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1000);
  const [formName, setFormName] = useState('');
  const [formSize, setFormSize] = useState<number>(16);
  const [formPattern, setFormPattern] = useState<AccessPattern>('Locality');
  const traceContainerRef = useRef<HTMLDivElement>(null);

  const handleAddProcess = (e: React.FormEvent) => {
    e.preventDefault();
    const newProcess: Process = {
      id: generateId(),
      name: formName || `Process ${processes.length + 1}`,
      size: formSize,
      pattern: formPattern,
      color: PROCESS_COLORS[processes.length % PROCESS_COLORS.length],
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
    setProcesses(processes.map(p => p.id === id ? { ...p, status: p.status === 'Running' ? 'Paused' : 'Running' } : p));
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
        if (Math.random() < 0.8) {
          targetPage = process.hotZoneStart + Math.floor(Math.random() * process.hotZoneSize);
        } else {
          targetPage = Math.floor(Math.random() * process.size);
        }
        break;
    }
    const access: MemoryAccess = {
      id: generateId(), processId: process.id, processName: process.name,
      processColor: process.color, virtualPage: targetPage, timestamp: Date.now(),
    };
    return { access, updatedProcess: { ...process, currentSeq: nextSeq } };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGlobalRunning) {
      interval = setInterval(() => {
        setProcesses(currentProcesses => {
          const runningProcesses = currentProcesses.filter(p => p.status === 'Running');
          if (runningProcesses.length === 0) return currentProcesses;
          const selectedProcess = runningProcesses[Math.floor(Math.random() * runningProcesses.length)];
          const { access, updatedProcess } = generateNextAccess(selectedProcess);
          setTraces(prev => [...prev, access].slice(-50));
          return currentProcesses.map(p => p.id === updatedProcess.id ? updatedProcess : p);
        });
      }, simulationSpeed);
    }
    return () => clearInterval(interval);
  }, [isGlobalRunning, simulationSpeed, generateNextAccess]);

  useEffect(() => {
    if (traceContainerRef.current) traceContainerRef.current.scrollTop = traceContainerRef.current.scrollHeight;
  }, [traces]);

  return (
    <div className="flex flex-col gap-6 h-full">
      <header className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800 rounded-lg"><Cpu className="w-6 h-6 text-slate-300" /></div>
          <div>
            <h1 className="text-xl font-semibold text-slate-100">Process Generator</h1>
            <p className="text-sm text-slate-400">Simulate memory access patterns</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <Settings2 className="w-4 h-4" />
            <span>Speed:</span>
            <select value={simulationSpeed} onChange={(e) => setSimulationSpeed(Number(e.target.value))} className="bg-transparent font-medium focus:outline-none text-slate-100">
              <option value={2000}>Slow</option><option value={1000}>Normal</option><option value={250}>Fast</option><option value={50}>Turbo</option>
            </select>
          </div>
          <button onClick={() => setIsGlobalRunning(!isGlobalRunning)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${isGlobalRunning ? 'bg-amber-900/50 text-amber-400 border border-amber-700/50 hover:bg-amber-900/70' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}>
            {isGlobalRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isGlobalRunning ? 'Pause Simulation' : 'Start Simulation'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="flex flex-col gap-6 overflow-y-auto pr-2">
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-md">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-100"><Plus className="w-5 h-5 text-slate-400" />New Process</h2>
            <form onSubmit={handleAddProcess} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Process Name</label>
                <input type="text" placeholder="e.g., Database Daemon" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-100" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Virtual Pages</label>
                  <input type="number" min="4" max="128" value={formSize} onChange={(e) => setFormSize(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Access Pattern</label>
                  <select value={formPattern} onChange={(e) => setFormPattern(e.target.value as AccessPattern)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-100">
                    <option value="Locality">Locality (80/20)</option><option value="Sequential">Sequential</option><option value="Random">Random</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="mt-2 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium rounded-lg border border-slate-700 transition-colors flex items-center justify-center gap-2"><Plus className="w-4 h-4" />Generate Process</button>
            </form>
          </div>

          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-md flex-1 flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-100"><Activity className="w-5 h-5 text-slate-400" />Memory Stream</h2>
              <button onClick={() => setTraces([])} className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Clear</button>
            </div>
            <div ref={traceContainerRef} className="flex-1 bg-slate-950 rounded-lg p-4 overflow-y-auto font-mono text-sm border border-slate-800 shadow-inner">
              {traces.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-600 italic">Waiting for requests...</div>
              ) : (
                <div className="flex flex-col gap-1">
                  {traces.map((trace, idx) => (
                    <div key={trace.id} className="flex items-center gap-3 animate-in fade-in duration-200">
                      <span className="text-slate-600 text-xs w-12">+{idx}</span>
                      <span className={`w-2 h-2 rounded-full ${trace.processColor}`}></span>
                      <span className="text-slate-300 w-24 truncate">{trace.processName}</span>
                      <span className="text-slate-500">req</span>
                      <span className="text-emerald-400 font-semibold">VP_{trace.virtualPage.toString().padStart(3, '0')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-md flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-100"><Database className="w-5 h-5 text-slate-400" />Active Processes ({processes.length})</h2>
            {processes.length > 0 && (
              <div className="flex gap-2">
                <button onClick={() => setProcesses(processes.map(p => ({ ...p, status: 'Running' })))} className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md font-medium transition-colors">Run All</button>
                <button onClick={() => setProcesses(processes.map(p => ({ ...p, status: 'Paused' })))} className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md font-medium transition-colors">Pause All</button>
              </div>
            )}
          </div>
          {processes.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl p-8">
              <Database className="w-12 h-12 mb-3 text-slate-700" />
              <p>No processes generated yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-4">
              {processes.map(process => (
                <div key={process.id} className="border border-slate-700 rounded-xl p-4 flex flex-col gap-4 hover:border-slate-600 transition-colors bg-slate-950/50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-10 rounded-full ${process.color}`}></div>
                      <div>
                        <h3 className="font-semibold text-slate-100">{process.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                          <span className="px-2 py-0.5 bg-slate-800 rounded-md font-medium">{process.pattern}</span>
                          <span>•</span><span>{process.size} Pages</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleProcessStatus(process.id)} className={`p-1.5 rounded-md transition-colors ${process.status === 'Running' ? 'bg-amber-900/50 text-amber-400 hover:bg-amber-900/80' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                        {process.status === 'Running' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleRemoveProcess(process.id)} className="p-1.5 bg-rose-900/30 text-rose-400 hover:bg-rose-900/60 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-400 mb-2 flex justify-between">
                      <span>Virtual Address Space</span>
                      {process.pattern === 'Locality' && <span className="text-rose-400/80">Hot: VP_{process.hotZoneStart} - VP_{process.hotZoneStart + process.hotZoneSize - 1}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: process.size }).map((_, i) => {
                        const recentAccess = traces.slice(-5).find(t => t.processId === process.id && t.virtualPage === i);
                        const isHotZone = process.pattern === 'Locality' && i >= process.hotZoneStart && i < process.hotZoneStart + process.hotZoneSize;
                        return (
                          <div key={i} title={`VP ${i}`} className={`w-4 h-4 rounded-sm border text-[8px] flex items-center justify-center transition-all duration-300 ${recentAccess ? `${process.color} border-transparent text-white scale-125 z-10 shadow-sm` : isHotZone ? 'bg-rose-900/20 border-rose-800 text-rose-300' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                            {process.size <= 64 ? i : ''}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mt-auto pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        {process.status === 'Running' && isGlobalRunning && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${process.color}`}></span>}
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${process.status === 'Running' ? process.color : 'bg-slate-600'}`}></span>
                      </span>
                      <span className={process.status === 'Running' ? 'text-slate-200 font-medium' : 'text-slate-500'}>{process.status}</span>
                    </div>
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

// ==========================================
// MODULE 2: Page Table View
// ==========================================
const NUM_PAGES_B2 = 16; const NUM_FRAMES_B2 = 8; const PAGE_SIZE_B2 = 16; const TLB_SIZE_B2 = 4;

function PageTableView() {
  const [pageTable, setPageTable] = useState<B2PageTableEntry[]>([]);
  const [tlb, setTlb] = useState<B2TLBEntry[]>([]);
  const [fifoQueue, setFifoQueue] = useState<number[]>([]);
  const [freeFrames, setFreeFrames] = useState<number[]>([]);
  const [stats, setStats] = useState({ accesses: 0, tlbHits: 0, tlbMisses: 0, pageFaults: 0 });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdCounter = useRef(0); const timeCounter = useRef(0);
  const [inputAddress, setInputAddress] = useState<string>('');
  const [activeVPN, setActiveVPN] = useState<number | null>(null);
  const [activeTLBIndex, setActiveTLBIndex] = useState<number | null>(null);
  const [translationStep, setTranslationStep] = useState<string>('Idle');

  useEffect(() => {
    const initialPT: B2PageTableEntry[] = Array.from({ length: NUM_PAGES_B2 }, (_, i) => ({ vpn: i, pfn: null, valid: false, dirty: false, ref: false }));
    const initialFreeFrames = Array.from({ length: NUM_FRAMES_B2 }, (_, i) => i);
    const initialFifo: number[] = [];
    for (let i = 0; i < 4; i++) {
      const vpn = Math.floor(Math.random() * NUM_PAGES_B2);
      if (!initialPT[vpn].valid) {
        const pfn = initialFreeFrames.shift()!;
        initialPT[vpn].pfn = pfn; initialPT[vpn].valid = true; initialFifo.push(vpn);
      }
    }
    setPageTable(initialPT); setFreeFrames(initialFreeFrames); setFifoQueue(initialFifo);
    addLog('System initialized. 4 pages pre-loaded.', 'info');
  }, []);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [{ id: logIdCounter.current++, message, type }, ...prev].slice(0, 50));
  };

  const handleAccess = useCallback((virtualAddressStr: string) => {
    let va = parseInt(virtualAddressStr, 16);
    if (isNaN(va) || va < 0 || va > 255) { addLog(`Invalid address: ${virtualAddressStr}. Use 0x00 - 0xFF.`, 'error'); return; }
    timeCounter.current++;
    const vpn = Math.floor(va / PAGE_SIZE_B2); const offset = va % PAGE_SIZE_B2;
    setActiveVPN(vpn); setStats(s => ({ ...s, accesses: s.accesses + 1 }));
    addLog(`Accessing VA: ${toHex(va)} (VPN: ${toHex(vpn, 1)}, Offset: ${toHex(offset, 1)})`, 'info');

    const tlbIndex = tlb.findIndex(entry => entry.vpn === vpn);
    if (tlbIndex !== -1) {
      setActiveTLBIndex(tlbIndex); setStats(s => ({ ...s, tlbHits: s.tlbHits + 1 }));
      addLog(`TLB Hit! VPN ${toHex(vpn, 1)} -> PFN ${toHex(tlb[tlbIndex].pfn, 1)}`, 'success');
      const newTlb = [...tlb]; newTlb[tlbIndex].lastUsed = timeCounter.current; setTlb(newTlb);
      setTranslationStep(`TLB Hit. Physical Address: ${toHex(tlb[tlbIndex].pfn * PAGE_SIZE_B2 + offset)}`);
      setTimeout(() => { setActiveVPN(null); setActiveTLBIndex(null); }, 1500);
      return;
    }

    setStats(s => ({ ...s, tlbMisses: s.tlbMisses + 1 }));
    addLog(`TLB Miss for VPN ${toHex(vpn, 1)}. Checking Page Table...`, 'warning');

    setPageTable(prevPT => {
      const newPT = [...prevPT]; const entry = { ...newPT[vpn] };
      let currentFreeFrames = [...freeFrames]; let currentFifo = [...fifoQueue]; let resolvedPfn = entry.pfn;

      if (entry.valid && resolvedPfn !== null) {
        addLog(`Page Table Hit! VPN ${toHex(vpn, 1)} is in frame ${toHex(resolvedPfn, 1)}`, 'success'); entry.ref = true;
      } else {
        setStats(s => ({ ...s, pageFaults: s.pageFaults + 1 })); addLog(`PAGE FAULT! VPN ${toHex(vpn, 1)} not in memory.`, 'error');
        if (currentFreeFrames.length > 0) {
          resolvedPfn = currentFreeFrames.shift()!; addLog(`Allocated free frame ${toHex(resolvedPfn, 1)} to VPN ${toHex(vpn, 1)}`, 'info');
        } else {
          const evictedVpn = currentFifo.shift()!; resolvedPfn = newPT[evictedVpn].pfn!;
          newPT[evictedVpn] = { ...newPT[evictedVpn], valid: false, pfn: null, dirty: false, ref: false };
          addLog(`Memory full. Evicted VPN ${toHex(evictedVpn, 1)} (FIFO) from frame ${toHex(resolvedPfn, 1)}`, 'warning');
        }
        entry.pfn = resolvedPfn; entry.valid = true; entry.ref = true; currentFifo.push(vpn);
        setFreeFrames(currentFreeFrames); setFifoQueue(currentFifo);
      }
      newPT[vpn] = entry;
      setTlb(prevTlb => {
        const newTlb = [...prevTlb];
        if (newTlb.length < TLB_SIZE_B2) newTlb.push({ vpn, pfn: resolvedPfn!, lastUsed: timeCounter.current });
        else { newTlb.sort((a, b) => a.lastUsed - b.lastUsed); newTlb[0] = { vpn, pfn: resolvedPfn!, lastUsed: timeCounter.current }; }
        return newTlb;
      });
      setTranslationStep(`Translated via PT. Physical Address: ${toHex(resolvedPfn! * PAGE_SIZE_B2 + offset)}`);
      return newPT;
    });
    setTimeout(() => { setActiveVPN(null); setActiveTLBIndex(null); }, 1500);
  }, [tlb, freeFrames, fifoQueue]);

  return (
    <div className="flex flex-col gap-6 h-full">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 p-6 rounded-xl shadow-md border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Page Table View</h1>
          <p className="text-sm text-slate-400 mt-1">Interactive Page Table & Address Translation</p>
        </div>
        <div className="flex gap-4 mt-4 md:mt-0">
          <StatBox label="Accesses" value={stats.accesses} />
          <StatBox label="TLB Hits" value={stats.tlbHits} highlight="text-emerald-400" />
          <StatBox label="TLB Misses" value={stats.tlbMisses} highlight="text-amber-400" />
          <StatBox label="Page Faults" value={stats.pageFaults} highlight="text-rose-400" />
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        <div className="w-full lg:w-1/3 flex flex-col gap-6 overflow-y-auto pr-2">
          <section className="bg-slate-900 p-6 rounded-xl shadow-md border border-slate-800">
            <h2 className="text-lg font-semibold mb-4 border-b border-slate-800 pb-2 text-slate-100">Memory Access</h2>
            <div className="flex gap-2 mb-4">
              <input type="text" value={inputAddress} onChange={(e) => setInputAddress(e.target.value)} placeholder="e.g. 0x3A or 58" className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm text-slate-100" onKeyDown={(e) => e.key === 'Enter' && handleAccess(inputAddress)} />
              <button onClick={() => handleAccess(inputAddress)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors shadow-sm">Access</button>
            </div>
            <button onClick={() => { const r = Math.floor(Math.random() * 256); setInputAddress(toHex(r)); handleAccess(r.toString(16)); }} className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors border border-slate-700">Generate Random Access</button>
          </section>

          <section className="bg-slate-900 p-6 rounded-xl shadow-md border border-slate-800 flex-1">
            <h2 className="text-lg font-semibold mb-4 border-b border-slate-800 pb-2 text-slate-100">Address Translation</h2>
            <div className="flex flex-col items-center justify-center h-full gap-6 py-4">
              {activeVPN !== null ? (
                <>
                  <div className="text-center">
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Virtual Address</div>
                    <div className="flex border-2 border-slate-700 rounded-md overflow-hidden font-mono text-lg shadow-sm">
                      <div className="bg-indigo-900/50 text-indigo-300 px-4 py-2 border-r-2 border-slate-700 flex flex-col items-center">
                        <span>{toBin(activeVPN, 4)}</span><span className="text-[10px] text-indigo-400 uppercase mt-1">VPN ({toHex(activeVPN, 1)})</span>
                      </div>
                      <div className="bg-slate-800 text-slate-300 px-4 py-2 flex flex-col items-center">
                        <span>{toBin(parseInt(inputAddress, 16) % PAGE_SIZE_B2, 4)}</span><span className="text-[10px] text-slate-500 uppercase mt-1">Offset</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-slate-600"><ArrowRight className="w-6 h-6 rotate-90" /></div>
                  <div className="text-center bg-slate-950 p-4 rounded-lg border border-slate-800 w-full">
                    <div className="text-sm font-medium text-slate-400 mb-2">Status</div>
                    <div className="text-indigo-400 font-semibold">{translationStep}</div>
                  </div>
                </>
              ) : <div className="text-slate-500 text-sm text-center italic">Enter a virtual address to see translation.</div>}
            </div>
          </section>
        </div>

        <div className="w-full lg:w-1/3 flex flex-col min-h-0">
          <section className="bg-slate-900 rounded-xl shadow-md border border-slate-800 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-100">Page Table</h2>
              <span className="text-xs font-medium bg-slate-800 text-slate-300 px-2 py-1 rounded-full">16 Entries</span>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-slate-500 border-b-2 border-slate-800">
                    <th className="pb-2 pl-2">VPN</th><th className="pb-2 text-center">Valid</th><th className="pb-2 text-center">PFN</th><th className="pb-2 text-center">Dirty</th><th className="pb-2 text-center">Ref</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-sm">
                  {pageTable.map((entry, idx) => {
                    const isActive = activeVPN === idx;
                    return (
                      <tr key={idx} className={`border-b border-slate-800/50 transition-colors duration-300 ${isActive ? 'bg-indigo-900/30 border-indigo-800 shadow-inner' : 'hover:bg-slate-800/50'}`}>
                        <td className={`py-2 pl-2 font-semibold ${isActive ? 'text-indigo-400' : 'text-slate-300'}`}>{toHex(entry.vpn, 1)}</td>
                        <td className="py-2 text-center">{entry.valid ? <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></span> : <span className="inline-block w-3 h-3 rounded-full bg-slate-700 border border-slate-600"></span>}</td>
                        <td className="py-2 text-center">{entry.valid && entry.pfn !== null ? <span className="bg-slate-800 text-slate-200 px-2 py-1 rounded border border-slate-700">{toHex(entry.pfn, 1)}</span> : <span className="text-slate-600">-</span>}</td>
                        <td className="py-2 text-center text-slate-500">{entry.dirty ? '1' : '0'}</td><td className="py-2 text-center text-slate-500">{entry.ref ? '1' : '0'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="w-full lg:w-1/3 flex flex-col gap-6 min-h-0">
          <section className="bg-slate-900 p-6 rounded-xl shadow-md border border-slate-800">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
              <h2 className="text-lg font-semibold text-slate-100">TLB Cache</h2>
              <span className="text-xs font-medium bg-slate-800 text-slate-400 px-2 py-1 rounded-full">LRU Policy</span>
            </div>
            {tlb.length === 0 ? <div className="text-sm text-slate-500 italic text-center py-4">TLB is empty</div> : (
              <div className="grid grid-cols-2 gap-3">
                {tlb.map((entry, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border font-mono text-sm flex justify-between items-center transition-colors ${activeTLBIndex === idx ? 'bg-emerald-900/30 border-emerald-800 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-300'}`}>
                    <div className="flex flex-col"><span className="text-[10px] text-slate-500 uppercase">VPN</span><span className="font-bold">{toHex(entry.vpn, 1)}</span></div>
                    <div className="text-slate-600">→</div>
                    <div className="flex flex-col items-end"><span className="text-[10px] text-slate-500 uppercase">PFN</span><span className="font-bold">{toHex(entry.pfn, 1)}</span></div>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="bg-slate-900 rounded-xl shadow-md border border-slate-800 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-800"><h2 className="text-lg font-semibold text-slate-100">Activity Log</h2></div>
            <div className="flex-1 overflow-auto p-4 bg-slate-950 text-slate-300 font-mono text-xs space-y-2">
              {logs.map(log => (
                <div key={log.id} className="flex gap-2 border-b border-slate-800/50 pb-1">
                  <span className="text-slate-600 shrink-0">[{log.id.toString().padStart(4, '0')}]</span>
                  <span className={`${log.type === 'error' ? 'text-rose-400' : ''} ${log.type === 'warning' ? 'text-amber-400' : ''} ${log.type === 'success' ? 'text-emerald-400' : ''} ${log.type === 'info' ? 'text-blue-300' : ''}`}>{log.message}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, highlight = "text-slate-100" }: { label: string, value: number, highlight?: string }) {
  return (
    <div className="flex flex-col items-center bg-slate-950 px-4 py-2 rounded-lg border border-slate-800 min-w-[80px]">
      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</span>
      <span className={`text-xl font-bold font-mono ${highlight}`}>{value}</span>
    </div>
  );
}

// ==========================================
// MODULE 3: TLB Hit/Miss Counters
// ==========================================
const TLB_SIZE_B3 = 4; const TOTAL_PAGES_B3 = 8;

function TLBCounters() {
  const [tlb, setTlb] = useState<B3TLBEntry[]>([]);
  const [hits, setHits] = useState(0); const [misses, setMisses] = useState(0);
  const [accessCount, setAccessCount] = useState(0); const [logs, setLogs] = useState<AccessLog[]>([]);
  const [autoRun, setAutoRun] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const hitRate = accessCount === 0 ? 0 : ((hits / accessCount) * 100).toFixed(1);
  const missRate = accessCount === 0 ? 0 : ((misses / accessCount) * 100).toFixed(1);

  const requestPage = (vpn: number) => {
    setAccessCount((prev) => prev + 1); const now = Date.now();
    setTlb((prevTlb) => {
      const existingEntryIndex = prevTlb.findIndex((entry) => entry.vpn === vpn);
      if (existingEntryIndex !== -1) {
        setHits((h) => h + 1); addLog(vpn, true);
        const newTlb = [...prevTlb]; newTlb[existingEntryIndex].lastAccessed = now; return newTlb;
      } else {
        setMisses((m) => m + 1); addLog(vpn, false);
        const newEntry: B3TLBEntry = { vpn, pfn: Math.floor(Math.random() * 16), lastAccessed: now };
        if (prevTlb.length < TLB_SIZE_B3) return [...prevTlb, newEntry];
        else { const sortedTlb = [...prevTlb].sort((a, b) => a.lastAccessed - b.lastAccessed); sortedTlb[0] = newEntry; return sortedTlb; }
      }
    });
  };

  const addLog = (vpn: number, isHit: boolean) => setLogs((prev) => [...prev, { id: Date.now() + Math.random(), vpn, isHit, timestamp: new Date() }].slice(-50));
  const resetSimulation = () => { setTlb([]); setHits(0); setMisses(0); setAccessCount(0); setLogs([]); setAutoRun(false); };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRun) {
      interval = setInterval(() => {
        const useLocality = Math.random() > 0.2 && tlb.length > 0;
        requestPage(useLocality ? tlb[Math.floor(Math.random() * tlb.length)].vpn : Math.floor(Math.random() * TOTAL_PAGES_B3));
      }, 800);
    }
    return () => clearInterval(interval);
  }, [autoRun, tlb]);

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-2">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-slate-100">TLB Performance Monitor</h1>
          <p className="text-slate-400 mt-1 text-sm">Translation Lookaside Buffer hit/miss counters & LRU replacement.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setAutoRun(!autoRun)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${autoRun ? 'bg-rose-900/50 text-rose-400 hover:bg-rose-900/70' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}>
            {autoRun ? <><Pause className="w-4 h-4" /> Stop Simulation</> : <><Play className="w-4 h-4" /> Auto Run</>}
          </button>
          <button onClick={resetSimulation} className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCardB3 title="Total Accesses" value={accessCount} icon={<Activity className="w-5 h-5 text-slate-400" />} />
        <StatCardB3 title="TLB Hits" value={hits} valueColor="text-emerald-400" bgColor="bg-emerald-900/10" icon={<Hash className="w-5 h-5 text-emerald-500" />} />
        <StatCardB3 title="TLB Misses" value={misses} valueColor="text-rose-400" bgColor="bg-rose-900/10" icon={<Hash className="w-5 h-5 text-rose-500" />} />
        <StatCardB3 title="Hit Rate" value={`${hitRate}%`} subtitle={`${missRate}% Miss Rate`} icon={<BarChart3 className="w-5 h-5 text-blue-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-md">
            <h2 className="text-lg font-medium text-slate-100 mb-4 flex items-center gap-2"><Cpu className="w-5 h-5 text-slate-400" /> Request Memory Access</h2>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {Array.from({ length: TOTAL_PAGES_B3 }).map((_, i) => (
                <button key={i} onClick={() => requestPage(i)} className="py-3 rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-800 hover:border-slate-600 transition-all text-slate-300 font-mono text-sm flex flex-col items-center justify-center gap-1 active:scale-95">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">VPN</span>{i}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-slate-100 flex items-center gap-2"><Layers className="w-5 h-5 text-slate-400" /> Current TLB State</h2>
              <span className="text-xs font-medium px-2.5 py-1 bg-slate-800 text-slate-400 rounded-full">Size: {TLB_SIZE_B3} Entries (LRU)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: TLB_SIZE_B3 }).map((_, i) => {
                const entry = tlb[i];
                return (
                  <div key={i} className={`relative overflow-hidden rounded-xl border-2 transition-all duration-300 ${entry ? 'border-slate-600 bg-slate-800 shadow-sm' : 'border-dashed border-slate-700 bg-slate-950/50'} p-4 flex flex-col items-center justify-center min-h-[120px]`}>
                    {entry ? (
                      <>
                        <div className="absolute top-2 right-2 flex gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span></div>
                        <div className="text-center space-y-2 w-full">
                          <div className="flex justify-between items-center bg-slate-950 px-2 py-1 rounded text-xs font-mono text-slate-400"><span>VPN</span><span className="text-slate-100 font-bold text-base">{entry.vpn}</span></div>
                          <div className="flex justify-between items-center bg-slate-950 px-2 py-1 rounded text-xs font-mono text-slate-400"><span>PFN</span><span className="text-slate-100 font-bold text-base">{entry.pfn}</span></div>
                        </div>
                      </>
                    ) : <span className="text-slate-600 text-sm font-medium">Empty Slot</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-md flex flex-col h-[600px]">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50 rounded-t-2xl">
            <h2 className="text-lg font-medium text-slate-100 flex items-center gap-2"><List className="w-5 h-5 text-slate-400" /> Access History</h2>
            <span className="text-xs text-slate-400">{logs.length} records</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2"><List className="w-8 h-8 opacity-50" /><p className="text-sm">No accesses yet</p></div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className={`flex items-center justify-between p-3 rounded-lg border text-sm animate-in fade-in ${log.isHit ? 'bg-emerald-900/20 border-emerald-800/50 text-emerald-300' : 'bg-rose-900/20 border-rose-800/50 text-rose-300'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-md ${log.isHit ? 'bg-emerald-900/50 text-emerald-400' : 'bg-rose-900/50 text-rose-400'}`}>
                      {log.isHit ? <Hash className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                    </div>
                    <span className="font-mono font-medium">VPN {log.vpn}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`font-bold ${log.isHit ? 'text-emerald-400' : 'text-rose-400'}`}>{log.isHit ? 'HIT' : 'MISS'}</span>
                    <span className="text-[10px] opacity-60">{log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCardB3({ title, value, subtitle, icon, valueColor = "text-slate-100", bgColor = "bg-slate-900" }: any) {
  return (
    <div className={`p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col justify-between ${bgColor}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-400">{title}</h3>
        <div className="p-2 bg-slate-800 rounded-lg shadow-sm border border-slate-700">{icon}</div>
      </div>
      <div>
        <div className={`text-3xl font-bold tracking-tight ${valueColor}`}>{value}</div>
        {subtitle && <p className="text-xs text-slate-500 mt-1 font-medium">{subtitle}</p>}
      </div>
    </div>
  );
}

// ==========================================
// MODULE 4: Page Replacement Simulator
// ==========================================
const CAPACITY_B4 = 4; const REF_LENGTH_B4 = 30; const PAGE_MAX_B4 = 8; const PLAY_SPEED_MS_B4 = 600;
const generateReferenceString = (length: number, maxPage: number) => {
  const seq: number[] = []; let currentBase = Math.floor(Math.random() * maxPage);
  for (let i = 0; i < length; i++) {
    if (Math.random() < 0.7) {
      let next = currentBase + (Math.floor(Math.random() * 3) - 1);
      if (next < 0) next = 0; if (next >= maxPage) next = maxPage - 1; seq.push(next);
    } else { currentBase = Math.floor(Math.random() * maxPage); seq.push(currentBase); }
  }
  return seq;
};

function PageReplacementSimulator() {
  const [algorithm, setAlgorithm] = useState<Algorithm>('FIFO');
  const [referenceString, setReferenceString] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [frames, setFrames] = useState<FrameB4[]>([]);
  const [clockPointer, setClockPointer] = useState(0);
  const [time, setTime] = useState(0);
  const [history, setHistory] = useState<StepHistory[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const initializeSimulation = useCallback((algo: Algorithm = algorithm, newRefString?: number[]) => {
    setReferenceString(newRefString || generateReferenceString(REF_LENGTH_B4, PAGE_MAX_B4));
    setAlgorithm(algo); setCurrentIndex(0); setTime(0); setClockPointer(0); setHistory([]); setIsPlaying(false);
    setFrames(Array.from({ length: CAPACITY_B4 }, (_, i) => ({ id: i, page: null, loadedAt: -1, lastUsed: -1, useBit: false })));
  }, [algorithm]);

  useEffect(() => { initializeSimulation(); }, [initializeSimulation]);

  const stepSimulation = useCallback(() => {
    if (currentIndex >= referenceString.length) { setIsPlaying(false); return; }
    const page = referenceString[currentIndex]; const newFrames = [...frames];
    let isHit = false; let evictedPage: number | null = null; let newClockPointer = clockPointer; const currentTime = time + 1;

    const hitIndex = newFrames.findIndex(f => f.page === page);
    if (hitIndex !== -1) {
      isHit = true; newFrames[hitIndex].lastUsed = currentTime; newFrames[hitIndex].useBit = true;
    } else {
      const emptyIndex = newFrames.findIndex(f => f.page === null);
      if (emptyIndex !== -1) {
        newFrames[emptyIndex] = { id: emptyIndex, page, loadedAt: currentTime, lastUsed: currentTime, useBit: true };
      } else {
        let victimIndex = -1;
        if (algorithm === 'FIFO') {
          victimIndex = 0; let oldestTime = newFrames[0].loadedAt;
          for (let i = 1; i < CAPACITY_B4; i++) if (newFrames[i].loadedAt < oldestTime) { oldestTime = newFrames[i].loadedAt; victimIndex = i; }
        } else if (algorithm === 'LRU') {
          victimIndex = 0; let oldestTime = newFrames[0].lastUsed;
          for (let i = 1; i < CAPACITY_B4; i++) if (newFrames[i].lastUsed < oldestTime) { oldestTime = newFrames[i].lastUsed; victimIndex = i; }
        } else if (algorithm === 'CLOCK') {
          let ptr = newClockPointer;
          while (true) {
            if (newFrames[ptr].useBit) { newFrames[ptr].useBit = false; ptr = (ptr + 1) % CAPACITY_B4; }
            else { victimIndex = ptr; newClockPointer = (ptr + 1) % CAPACITY_B4; break; }
          }
        }
        evictedPage = newFrames[victimIndex].page;
        newFrames[victimIndex] = { id: victimIndex, page, loadedAt: currentTime, lastUsed: currentTime, useBit: true };
      }
    }
    setFrames(newFrames); setClockPointer(newClockPointer); setTime(currentTime); setCurrentIndex(prev => prev + 1);
    setHistory(prev => [...prev, { step: currentTime, page, isHit, evictedPage }]);
  }, [currentIndex, referenceString, frames, time, clockPointer, algorithm]);

  useEffect(() => {
    if (isPlaying) playIntervalRef.current = setInterval(stepSimulation, PLAY_SPEED_MS_B4);
    else if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current); };
  }, [isPlaying, stepSimulation]);

  const hits = history.filter(h => h.isHit).length; const misses = history.filter(h => !h.isHit).length;
  const hitRate = history.length > 0 ? ((hits / history.length) * 100).toFixed(1) : '0.0';

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-2">
      <header className="bg-slate-900 rounded-xl shadow-md border border-slate-800 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100 flex items-center gap-2"><Cpu className="w-6 h-6 text-indigo-400" /> Page Replacement Simulator</h1>
          <p className="text-sm text-slate-400 mt-1">Visualize virtual memory page faults and replacement policies.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            {(['FIFO', 'LRU', 'CLOCK'] as Algorithm[]).map(algo => (
              <button key={algo} onClick={() => initializeSimulation(algo, referenceString)} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${algorithm === algo ? 'bg-slate-800 text-indigo-300 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>{algo}</button>
            ))}
          </div>
          <button onClick={() => initializeSimulation(algorithm)} className="px-4 py-2 text-sm font-medium bg-slate-800 border border-slate-700 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"><Database className="w-4 h-4" /> New Sequence</button>
        </div>
      </header>

      <div className="bg-indigo-900/20 border border-indigo-800/50 rounded-xl p-4 flex items-start gap-3 text-indigo-200">
        <Info className="w-5 h-5 mt-0.5 flex-shrink-0 text-indigo-400" />
        <div>
          <h3 className="font-medium text-sm">Algorithm: {algorithm}</h3>
          <p className="text-sm text-indigo-300/80 mt-1">
            {algorithm === 'FIFO' ? "First-In-First-Out: Evicts the page that has been in memory the longest." : algorithm === 'LRU' ? "Least Recently Used: Evicts the page that has not been used for the longest time." : "Clock (Second Chance): Uses a circular buffer and a 'use bit' to approximate LRU efficiently."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900 rounded-xl shadow-md border border-slate-800 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium flex items-center gap-2 text-slate-100"><List className="w-5 h-5 text-slate-400" /> Reference String</h2>
              <div className="flex gap-2">
                <button onClick={() => initializeSimulation(algorithm, referenceString)} className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"><RotateCcw className="w-5 h-5" /></button>
                <button onClick={stepSimulation} disabled={currentIndex >= referenceString.length || isPlaying} className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"><StepForward className="w-5 h-5" /></button>
                <button onClick={() => setIsPlaying(!isPlaying)} disabled={currentIndex >= referenceString.length} className={`p-2 rounded-lg transition-colors flex items-center gap-2 px-4 ${isPlaying ? 'bg-amber-900/50 text-amber-400' : 'bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50'}`}>
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}<span className="text-sm font-medium">{isPlaying ? 'Pause' : 'Auto-Run'}</span>
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {referenceString.map((pageNum, idx) => {
                const isCurrent = idx === currentIndex; const isPast = idx < currentIndex;
                let stateClass = "bg-slate-950 border-slate-800 text-slate-500";
                if (isCurrent) stateClass = "bg-indigo-600 border-indigo-500 text-white shadow-md ring-2 ring-indigo-900 ring-offset-2 ring-offset-slate-900";
                else if (isPast) stateClass = history[idx]?.isHit ? "bg-emerald-900/30 border-emerald-800 text-emerald-400" : "bg-rose-900/30 border-rose-800 text-rose-400";
                return <div key={idx} className={`w-10 h-10 flex items-center justify-center rounded-lg border text-sm font-semibold transition-all duration-300 ${stateClass}`}>{pageNum}</div>;
              })}
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl shadow-md border border-slate-800 p-6">
            <h2 className="text-lg font-medium flex items-center gap-2 mb-6 text-slate-100"><Activity className="w-5 h-5 text-slate-400" /> Fault Timeline</h2>
            <div className="h-32 flex items-end gap-1">
              {referenceString.map((_, idx) => {
                const stepStat = history[idx];
                if (!stepStat) return <div key={idx} className="flex-1 bg-slate-950 border-t border-slate-800 h-full rounded-t-sm opacity-50"></div>;
                return (
                  <div key={idx} className="flex-1 flex flex-col justify-end group relative">
                    <div className={`w-full ${stepStat.isHit ? 'bg-emerald-500' : 'bg-rose-500'} rounded-t-sm transition-all duration-500`} style={{ height: stepStat.isHit ? '20%' : '100%' }} />
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 bg-slate-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap">Step {idx + 1}: Page {stepStat.page} {stepStat.isHit ? '(Hit)' : '(Fault)'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 rounded-xl shadow-md border border-slate-800 p-6 grid grid-cols-2 gap-4">
            <div className="col-span-2 flex justify-between items-center mb-2">
              <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Performance</h2>
              <span className="text-xs font-semibold bg-slate-800 text-slate-300 px-2 py-1 rounded-full">Step {currentIndex} / {referenceString.length}</span>
            </div>
            <div className="bg-slate-950 rounded-lg p-4 border border-slate-800"><div className="text-3xl font-light text-rose-400">{misses}</div><div className="text-xs font-medium text-slate-500 mt-1 uppercase">Page Faults</div></div>
            <div className="bg-slate-950 rounded-lg p-4 border border-slate-800"><div className="text-3xl font-light text-emerald-400">{hitRate}%</div><div className="text-xs font-medium text-slate-500 mt-1 uppercase">Hit Rate</div></div>
          </div>

          <div className="bg-slate-900 rounded-xl shadow-md border border-slate-800 p-6">
            <h2 className="text-lg font-medium flex items-center gap-2 mb-6 text-slate-100"><Database className="w-5 h-5 text-slate-400" /> Physical Memory</h2>
            <div className="space-y-3 relative">
              {frames.map((frame, idx) => {
                const isEmpty = frame.page === null; const isTargetOfClock = algorithm === 'CLOCK' && clockPointer === idx;
                return (
                  <div key={frame.id} className={`relative rounded-xl border-2 transition-all duration-300 flex items-center p-4 ${isEmpty ? 'border-dashed border-slate-700 bg-slate-950/50' : 'border-solid border-slate-700 bg-slate-800 shadow-sm'} ${isTargetOfClock ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-slate-900' : ''}`}>
                    {isTargetOfClock && <div className="absolute -left-6 text-indigo-400 animate-pulse"><ArrowRight className="w-4 h-4" /></div>}
                    <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-slate-950 flex flex-col items-center justify-center border border-slate-800 mr-4">
                      <span className="text-xs text-slate-500 font-medium">FR</span><span className="text-sm font-bold text-slate-300">{idx}</span>
                    </div>
                    <div className="flex-1">
                      {isEmpty ? <span className="text-slate-500 italic text-sm">Empty Frame</span> : (
                        <div className="flex flex-col">
                          <span className="text-lg font-bold text-slate-100">Page {frame.page}</span>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 font-medium">
                            {algorithm === 'FIFO' && <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3" />Loaded t={frame.loadedAt}</span>}
                            {algorithm === 'LRU' && <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3" />Last used t={frame.lastUsed}</span>}
                            {algorithm === 'CLOCK' && <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${frame.useBit ? 'bg-indigo-900/50 text-indigo-300' : 'bg-slate-700 text-slate-400'}`}>Use Bit: {frame.useBit ? '1' : '0'}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MODULE 5: Visualization Of Page Faults
// ==========================================
const MAX_FRAMES_B5 = 4; const TOTAL_PAGES_B5 = 16; const CHART_WINDOW = 100; const SIMULATION_SPEED_MS_B5 = 200;

function PageFaultsChart() {
  const [isRunning, setIsRunning] = useState(false);
  const [tick, setTick] = useState(0); const [faults, setFaults] = useState(0);
  const [frames, setFrames] = useState<number[]>([]); const [history, setHistory] = useState<AccessRecord[]>([]);
  const lastPageRef = useRef<number>(Math.floor(Math.random() * TOTAL_PAGES_B5));

  const generateNextPage = useCallback(() => {
    if (Math.random() < 0.7) {
      let next = lastPageRef.current + (Math.floor(Math.random() * 5) - 2);
      if (next < 0) next = TOTAL_PAGES_B5 - 1; if (next >= TOTAL_PAGES_B5) next = 0;
      lastPageRef.current = next; return next;
    } else {
      const next = Math.floor(Math.random() * TOTAL_PAGES_B5); lastPageRef.current = next; return next;
    }
  }, []);

  const stepSimulation = useCallback(() => {
    setTick((prevTick) => {
      const currentTick = prevTick + 1; const page = generateNextPage();
      setFrames((prevFrames) => {
        let newFrames = [...prevFrames]; let isFault = false;
        if (!newFrames.includes(page)) {
          isFault = true; if (newFrames.length >= MAX_FRAMES_B5) newFrames.shift(); newFrames.push(page);
        } else { newFrames = newFrames.filter((p) => p !== page); newFrames.push(page); }
        setFaults((prevFaults) => {
          const newFaults = prevFaults + (isFault ? 1 : 0);
          setHistory((prevHistory) => {
            const updatedHistory = [...prevHistory, { tick: currentTick, page, isFault, totalFaults: newFaults }];
            return updatedHistory.length > 1000 ? updatedHistory.slice(updatedHistory.length - 1000) : updatedHistory;
          });
          return newFaults;
        });
        return newFrames;
      });
      return currentTick;
    });
  }, [generateNextPage]);

  const resetSimulation = () => { setIsRunning(false); setTick(0); setFaults(0); setFrames([]); setHistory([]); lastPageRef.current = Math.floor(Math.random() * TOTAL_PAGES_B5); };

  useEffect(() => {
    let interval: number | undefined;
    if (isRunning) interval = window.setInterval(stepSimulation, SIMULATION_SPEED_MS_B5);
    return () => { if (interval) clearInterval(interval); };
  }, [isRunning, stepSimulation]);

  const displayHistory = history.slice(-CHART_WINDOW);
  const faultRate = tick > 0 ? ((faults / tick) * 100).toFixed(1) : '0.0';

  const viewBoxWidth = 800; const viewBoxHeight = 240; const chartPadding = { top: 20, right: 20, bottom: 30, left: 50 };
  const innerWidth = viewBoxWidth - chartPadding.left - chartPadding.right; const innerHeight = viewBoxHeight - chartPadding.top - chartPadding.bottom;
  const minTick = displayHistory.length > 0 ? displayHistory[0].tick : 0; const maxTick = displayHistory.length > 0 ? displayHistory[displayHistory.length - 1].tick : CHART_WINDOW;
  const tickRange = Math.max(CHART_WINDOW, maxTick - minTick);
  const minFaults = displayHistory.length > 0 ? displayHistory[0].totalFaults : 0; const maxFaults = displayHistory.length > 0 ? displayHistory[displayHistory.length - 1].totalFaults : 10;
  const faultRange = Math.max(10, maxFaults - minFaults);
  const getX = (t: number) => chartPadding.left + ((t - minTick) / tickRange) * innerWidth;
  const getY = (f: number) => chartPadding.top + innerHeight - ((f - minFaults) / faultRange) * innerHeight;

  let areaPath = ''; let linePath = '';
  if (displayHistory.length > 0) {
    const startX = getX(displayHistory[0].tick); const startY = getY(displayHistory[0].totalFaults);
    linePath = `M ${startX},${startY} `; areaPath = `M ${startX},${chartPadding.top + innerHeight} L ${startX},${startY} `;
    displayHistory.forEach((record) => { const x = getX(record.tick); const y = getY(record.totalFaults); linePath += `L ${x},${y} `; areaPath += `L ${x},${y} `; });
    areaPath += `L ${getX(displayHistory[displayHistory.length - 1].tick)},${chartPadding.top + innerHeight} Z`;
  }

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-2">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-slate-100">Page Faults Timeline</h1>
          <p className="text-slate-400 mt-1">Visualization of Page Faults Over Time (LRU Policy)</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsRunning(!isRunning)} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${isRunning ? 'bg-amber-900/50 text-amber-400' : 'bg-emerald-900/50 text-emerald-400'}`}>
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}{isRunning ? 'Pause' : 'Auto Run'}
          </button>
          <button onClick={stepSimulation} disabled={isRunning} className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition-colors"><StepForward className="w-4 h-4" /> Step</button>
          <button onClick={resetSimulation} className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"><RotateCcw className="w-4 h-4" /> Reset</button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-md flex flex-col"><span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Accesses</span><span className="text-3xl font-light text-slate-100">{tick}</span></div>
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-md flex flex-col"><span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Page Faults</span><span className="text-3xl font-light text-rose-400">{faults}</span></div>
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-md flex flex-col"><span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Fault Rate</span><span className="text-3xl font-light text-slate-100">{faultRate}%</span></div>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-md overflow-hidden">
        <div className="p-5 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
          <h2 className="text-sm font-semibold text-slate-300">Cumulative Page Faults Timeline</h2>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Fault</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400"></div> Hit</div>
          </div>
        </div>
        <div className="p-6 overflow-x-auto">
          <svg viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} className="w-full h-auto min-w-[600px]" style={{ maxHeight: '300px' }}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = chartPadding.top + innerHeight * ratio; const val = Math.round(maxFaults - faultRange * ratio);
              return (
                <g key={`grid-${ratio}`}>
                  <line x1={chartPadding.left} y1={y} x2={viewBoxWidth - chartPadding.right} y2={y} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
                  <text x={chartPadding.left - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8" className="font-mono">{val}</text>
                </g>
              );
            })}
            <text x={viewBoxWidth / 2} y={viewBoxHeight - 5} textAnchor="middle" fontSize="10" fill="#94a3b8" className="uppercase tracking-widest">Memory Access Timeline (Last {CHART_WINDOW} Ticks)</text>
            {displayHistory.length > 0 && (
              <>
                <path d={areaPath} fill="url(#areaGradient)" />
                <path d={linePath} fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinejoin="round" />
                {displayHistory.map((record) => {
                  const x = getX(record.tick); const y = getY(record.totalFaults);
                  return (
                    <g key={`marker-${record.tick}`}>
                      {record.isFault ? (
                        <><line x1={x} y1={y} x2={x} y2={chartPadding.top + innerHeight} stroke="#f43f5e" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="2 2" /><circle cx={x} cy={y} r="3" fill="#f43f5e" /></>
                      ) : <circle cx={x} cy={y} r="2" fill="#34d399" />}
                    </g>
                  );
                })}
              </>
            )}
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-md overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-800 bg-slate-950/50"><h2 className="text-sm font-semibold text-slate-300">Physical Memory (LRU Frames)</h2></div>
          <div className="p-6 flex-1 flex items-center justify-center gap-4">
            {Array.from({ length: MAX_FRAMES_B5 }).map((_, i) => {
              const page = frames[i]; const isEmpty = page === undefined;
              return (
                <div key={`frame-${i}`} className={`w-20 h-24 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${isEmpty ? 'border-dashed border-slate-700 bg-slate-950' : 'border-solid border-indigo-800 bg-indigo-900/30 shadow-sm'}`}>
                  <span className="text-xs text-slate-500 mb-1">Frame {i}</span>
                  <span className={`text-2xl font-mono ${isEmpty ? 'text-slate-600' : 'text-indigo-400'}`}>{isEmpty ? '-' : `P${page}`}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-md overflow-hidden flex flex-col h-64">
          <div className="p-4 border-b border-slate-800 bg-slate-950/50"><h2 className="text-sm font-semibold text-slate-300">Recent Access Log</h2></div>
          <div className="p-0 overflow-y-auto flex-1 flex flex-col-reverse">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 sticky top-0 border-b border-slate-800 shadow-sm">
                <tr><th className="px-4 py-2 font-medium text-slate-400">Tick</th><th className="px-4 py-2 font-medium text-slate-400">Page</th><th className="px-4 py-2 font-medium text-slate-400">Result</th></tr>
              </thead>
              <tbody>
                {displayHistory.slice().reverse().map((record) => (
                  <tr key={`log-${record.tick}`} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/50">
                    <td className="px-4 py-2 font-mono text-slate-400">{record.tick}</td><td className="px-4 py-2 font-mono text-slate-200">P{record.page}</td>
                    <td className="px-4 py-2">{record.isFault ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-900/50 text-rose-400">Fault</span> : <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-900/50 text-emerald-400">Hit</span>}</td>
                  </tr>
                ))}
                {displayHistory.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500 italic">No memory accesses yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MODULE 6: Interactive Step-Through
// ==========================================
const NUM_PAGES_B6 = 16; const NUM_FRAMES_B6 = 8; const TLB_SIZE_B6 = 4;
const generateRandomData = () => Math.random().toString(36).substring(2, 6).toUpperCase();

function AddressTranslationStep() {
  const [virtualAddress, setVirtualAddress] = useState<string>('10100101');
  const [step, setStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [log, setLog] = useState<string>('Enter a Virtual Address and click "Start" to begin translation.');
  const [tlb, setTlb] = useState<B6TLBEntry[]>([]);
  const [pageTable, setPageTable] = useState<PTEntry[]>([]);
  const [memory, setMemory] = useState<FrameB6[]>([]);
  const [currentVpn, setCurrentVpn] = useState<number | null>(null);
  const [currentOffset, setCurrentOffset] = useState<number | null>(null);
  const [currentPpn, setCurrentPpn] = useState<number | null>(null);
  const [tlbHitIdx, setTlbHitIdx] = useState<number | null>(null);
  const [ptHitIdx, setPtHitIdx] = useState<number | null>(null);
  const [faulting, setFaulting] = useState<boolean>(false);
  const [stats, setStats] = useState({ tlbHits: 0, tlbMisses: 0, ptHits: 0, pageFaults: 0 });
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { initializeSystem(); }, []);

  const initializeSystem = () => {
    const initialMemory: FrameB6[] = Array.from({ length: NUM_FRAMES_B6 }, (_, i) => ({ ppn: i, data: i < 5 ? generateRandomData() : '----', allocated: i < 5 }));
    setMemory(initialMemory);
    const initialPT: PTEntry[] = Array.from({ length: NUM_PAGES_B6 }, (_, i) => {
      const isValid = Math.random() > 0.4 && i < 10;
      return { vpn: i, valid: isValid, ppn: isValid ? Math.floor(Math.random() * 5) : null };
    });
    initialPT[10] = { vpn: 10, valid: false, ppn: null }; 
    setPageTable(initialPT);
    setTlb(Array.from({ length: TLB_SIZE_B6 }, (_, i) => ({ id: i, valid: false, vpn: null, ppn: null, lastUsed: 0 })));
    resetTranslationState(); setLog('System initialized. Ready for address translation.');
  };

  const resetTranslationState = () => {
    setStep(0); setCurrentVpn(null); setCurrentOffset(null); setCurrentPpn(null); setTlbHitIdx(null); setPtHitIdx(null); setFaulting(false); setIsPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleRandomAddress = () => {
    setVirtualAddress(toBin(Math.floor(Math.random() * 256), 8)); resetTranslationState(); setLog('New random address generated. Click "Start" to translate.');
  };

  const advanceStep = () => {
    setStep((prevStep) => {
      let nextStep = prevStep;
      switch (prevStep) {
        case 0:
          const vpn = parseInt(virtualAddress.substring(0, 4), 2); const offset = parseInt(virtualAddress.substring(4, 8), 2);
          setCurrentVpn(vpn); setCurrentOffset(offset); setLog(`Step 1: Extracted VPN = ${vpn} (${toBin(vpn, 4)}) and Offset = ${offset} (${toBin(offset, 4)}).`); nextStep = 1; break;
        case 1: setLog(`Step 2: Searching TLB for VPN ${currentVpn}...`); nextStep = 2; break;
        case 2:
          const tlbEntryIdx = tlb.findIndex(e => e.valid && e.vpn === currentVpn);
          if (tlbEntryIdx !== -1) {
            setTlbHitIdx(tlbEntryIdx); setCurrentPpn(tlb[tlbEntryIdx].ppn); setStats(s => ({ ...s, tlbHits: s.tlbHits + 1 }));
            setLog(`Step 3: TLB Hit! Found VPN ${currentVpn} mapped to PPN ${tlb[tlbEntryIdx].ppn}.`);
            setTlb(prev => prev.map((e, i) => i === tlbEntryIdx ? { ...e, lastUsed: Date.now() } : e)); nextStep = 7;
          } else {
            setStats(s => ({ ...s, tlbMisses: s.tlbMisses + 1 })); setLog(`Step 3: TLB Miss. VPN ${currentVpn} not found in TLB. Must check Page Table.`); nextStep = 3;
          }
          break;
        case 3: setLog(`Step 4: Accessing Page Table in memory at index (VPN) ${currentVpn}...`); nextStep = 4; break;
        case 4:
          const ptEntry = pageTable[currentVpn!]; setPtHitIdx(currentVpn);
          if (ptEntry.valid) {
            setCurrentPpn(ptEntry.ppn); setStats(s => ({ ...s, ptHits: s.ptHits + 1 }));
            setLog(`Step 5: Page Table Hit! Valid bit is 1. PPN is ${ptEntry.ppn}. Updating TLB...`); updateTLB(currentVpn!, ptEntry.ppn!); nextStep = 7;
          } else {
            setFaulting(true); setStats(s => ({ ...s, pageFaults: s.pageFaults + 1 })); setLog(`Step 5: Page Fault! Valid bit is 0. OS must intervene.`); nextStep = 5;
          }
          break;
        case 5: setLog(`Step 6: OS handling Page Fault. Allocating free frame, loading data, updating PT and TLB...`); handlePageFault(currentVpn!); nextStep = 6; break;
        case 6: setFaulting(false); setLog(`Step 7: Page loaded. Resuming translation. Combining PPN ${currentPpn} and Offset ${currentOffset}...`); nextStep = 7; break;
        case 7:
          const paBin = toBin(currentPpn, 3) + toBin(currentOffset, 4); const paDec = parseInt(paBin, 2);
          setLog(`Step 8: Physical Address formed: ${paBin} (Decimal: ${paDec}). Accessing Physical Memory...`); nextStep = 8; break;
        case 8: setLog(`Step 9: Memory access complete. Data retrieved successfully.`); setIsPlaying(false); nextStep = 9; break;
        case 9: resetTranslationState(); return 0;
      }
      return nextStep;
    });
  };

  const updateTLB = (vpn: number, ppn: number) => {
    setTlb(prev => {
      const newTlb = [...prev]; let targetIdx = newTlb.findIndex(e => !e.valid);
      if (targetIdx === -1) { let oldestTime = Infinity; newTlb.forEach((e, i) => { if (e.lastUsed < oldestTime) { oldestTime = e.lastUsed; targetIdx = i; } }); }
      newTlb[targetIdx] = { id: targetIdx, valid: true, vpn, ppn, lastUsed: Date.now() }; return newTlb;
    });
  };

  const handlePageFault = (vpn: number) => {
    let targetFrameIdx = memory.findIndex(f => !f.allocated);
    if (targetFrameIdx === -1) {
      targetFrameIdx = Math.floor(Math.random() * NUM_FRAMES_B6); setLog(l => l + ` Evicting frame ${targetFrameIdx}.`);
      setPageTable(prev => prev.map(pt => pt.ppn === targetFrameIdx ? { ...pt, valid: false, ppn: null } : pt));
      setTlb(prev => prev.map(t => t.ppn === targetFrameIdx ? { ...t, valid: false, vpn: null, ppn: null } : t));
    }
    setMemory(prev => prev.map((f, i) => i === targetFrameIdx ? { ...f, allocated: true, data: generateRandomData() } : f));
    setPageTable(prev => prev.map((pt, i) => i === vpn ? { ...pt, valid: true, ppn: targetFrameIdx } : pt));
    updateTLB(vpn, targetFrameIdx); setCurrentPpn(targetFrameIdx);
  };

  useEffect(() => {
    if (isPlaying) timerRef.current = setInterval(advanceStep, 1500);
    else if (timerRef.current) clearInterval(timerRef.current);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, step]);

  const getStepClass = (targetStep: number | number[]) => {
    const targets = Array.isArray(targetStep) ? targetStep : [targetStep];
    return targets.includes(step) ? 'ring-2 ring-indigo-500 bg-indigo-900/20 shadow-md transition-all duration-300' : 'transition-all duration-300';
  };

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-2">
      <header className="bg-slate-900 p-6 rounded-xl shadow-md border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2"><GitCommit className="w-6 h-6 text-indigo-400" /> Address Translation Step-Through</h1>
          <p className="text-sm text-slate-400 mt-1">Interactive visualization of Virtual to Physical address mapping.</p>
        </div>
        <div className="flex items-center gap-4 bg-slate-950 p-2 rounded-lg border border-slate-800">
          <div className="flex flex-col items-center px-3 border-r border-slate-800"><span className="text-xs text-slate-500 uppercase font-semibold">TLB Hits</span><span className="text-lg font-mono text-emerald-400">{stats.tlbHits}</span></div>
          <div className="flex flex-col items-center px-3 border-r border-slate-800"><span className="text-xs text-slate-500 uppercase font-semibold">TLB Misses</span><span className="text-lg font-mono text-amber-400">{stats.tlbMisses}</span></div>
          <div className="flex flex-col items-center px-3"><span className="text-xs text-slate-500 uppercase font-semibold">Page Faults</span><span className="text-lg font-mono text-rose-400">{stats.pageFaults}</span></div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-slate-900 p-5 rounded-xl shadow-md border border-slate-800">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Control Panel</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Virtual Address (8-bit binary)</label>
                <div className="flex gap-2">
                  <input type="text" value={virtualAddress} onChange={(e) => { const val = e.target.value.replace(/[^01]/g, '').slice(0, 8); setVirtualAddress(val.padEnd(8, '0')); resetTranslationState(); }} disabled={step > 0 && step < 9} className="w-full font-mono text-center bg-slate-950 border border-slate-700 rounded-md py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50 text-slate-100" />
                  <button onClick={handleRandomAddress} disabled={step > 0 && step < 9} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors disabled:opacity-50 text-slate-300"><RotateCcw className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                {step === 0 || step === 9 ? (
                  <button onClick={advanceStep} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-md transition-colors flex justify-center items-center gap-2">{step === 9 ? 'Restart Translation' : 'Start Translation'}</button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={advanceStep} disabled={isPlaying} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-md transition-colors disabled:opacity-50">Next Step</button>
                    <button onClick={() => setIsPlaying(!isPlaying)} className={`px-4 py-2 font-medium rounded-md transition-colors flex items-center justify-center ${isPlaying ? 'bg-amber-900/50 text-amber-400 border border-amber-800' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>{isPlaying ? 'Pause' : 'Auto'}</button>
                  </div>
                )}
                {(step > 0 && step < 9) && <button onClick={resetTranslationState} className="w-full py-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors">Reset</button>}
              </div>
            </div>
          </div>

          <div className={`bg-slate-900 p-5 rounded-xl shadow-md border border-slate-800 ${getStepClass([1, 7])}`}>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Address Breakdown</h2>
            <div className="space-y-6">
              <div>
                <div className="text-xs text-slate-400 mb-1 text-center">Virtual Address</div>
                <div className="flex justify-center font-mono text-lg">
                  <span className="bg-indigo-900/50 text-indigo-300 px-2 py-1 border border-indigo-800 rounded-l">{toBin(currentVpn, 4)}</span>
                  <span className="bg-slate-800 text-slate-300 px-2 py-1 border border-slate-700 rounded-r">{toBin(currentOffset, 4)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-4 uppercase"><span>VPN</span><span>Offset</span></div>
              </div>
              {step >= 7 && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <div className="text-xs text-slate-400 mb-1 text-center">Physical Address</div>
                  <div className="flex justify-center font-mono text-lg">
                    <span className="bg-emerald-900/50 text-emerald-300 px-2 py-1 border border-emerald-800 rounded-l">{toBin(currentPpn, 3)}</span>
                    <span className="bg-slate-800 text-slate-300 px-2 py-1 border border-slate-700 rounded-r">{toBin(currentOffset, 4)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-4 uppercase"><span>PPN</span><span>Offset</span></div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 p-5 rounded-xl shadow-md border border-slate-800">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">System Log</h2>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 h-32 overflow-y-auto leading-relaxed">{log}</div>
          </div>
        </div>

        <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`bg-slate-900 p-5 rounded-xl shadow-md border border-slate-800 flex flex-col ${getStepClass([2, 3])}`}>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">TLB Cache</h2>
            <div className="flex-1 flex flex-col gap-2">
              {tlb.map((entry, i) => (
                <div key={i} className={`p-3 rounded-lg border font-mono text-sm flex justify-between items-center ${tlbHitIdx === i ? 'bg-emerald-900/30 border-emerald-800 text-emerald-300' : entry.valid ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-950 border-slate-800 text-slate-600'}`}>
                  <span>{entry.valid ? toBin(entry.vpn, 4) : '----'}</span><ArrowRight className="w-4 h-4 text-slate-600" /><span>{entry.valid ? toBin(entry.ppn, 3) : '---'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`bg-slate-900 p-5 rounded-xl shadow-md border border-slate-800 flex flex-col ${getStepClass([4, 5])}`}>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Page Table</h2>
            <div className="flex-1 overflow-y-auto pr-2 space-y-1 max-h-[400px]">
              {pageTable.map((pt, i) => (
                <div key={i} className={`px-2 py-1.5 rounded border font-mono text-xs flex justify-between items-center ${ptHitIdx === i ? (pt.valid ? 'bg-emerald-900/30 border-emerald-800 text-emerald-300' : 'bg-rose-900/30 border-rose-800 text-rose-300') : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                  <span>{toBin(i, 4)}</span>
                  <span className="flex gap-2">
                    <span className={pt.valid ? 'text-emerald-500' : 'text-slate-600'}>{pt.valid ? 'V' : 'I'}</span>
                    <span>{pt.valid ? toBin(pt.ppn, 3) : '---'}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={`bg-slate-900 p-5 rounded-xl shadow-md border border-slate-800 flex flex-col ${getStepClass([8])}`}>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Physical Memory</h2>
            <div className="flex-1 overflow-y-auto pr-2 space-y-2 max-h-[400px]">
              {memory.map((frame, i) => (
                <div key={i} className={`p-3 rounded-lg border font-mono text-sm flex justify-between items-center ${currentPpn === i && step >= 7 ? 'bg-indigo-900/30 border-indigo-800 text-indigo-300' : frame.allocated ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-950 border-slate-800 text-slate-600'}`}>
                  <span>{toBin(i, 3)}</span><span className="font-bold">{frame.allocated ? frame.data : '----'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// ROOT APP COMPONENT
// ==========================================
export default function App() {
  const [activeTab, setActiveTab] = useState('process');

  const tabs = [
    { id: 'process', label: 'Process Generator', icon: <Cpu className="w-5 h-5" /> },
    { id: 'pagetable', label: 'Page Table View', icon: <Database className="w-5 h-5" /> },
    { id: 'tlb', label: 'TLB Counters', icon: <Hash className="w-5 h-5" /> },
    { id: 'replacement', label: 'Replacement Simulator', icon: <Layers className="w-5 h-5" /> },
    { id: 'faults', label: 'Faults Timeline', icon: <Activity className="w-5 h-5" /> },
    { id: 'step', label: 'Address Step-Through', icon: <GitCommit className="w-5 h-5" /> },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-indigo-500" />
            VM Explorer
          </h1>
          <p className="text-xs text-slate-500 mt-1">OS Visualization Suite</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-6">
        {activeTab === 'process' && <ProcessGenerator />}
        {activeTab === 'pagetable' && <PageTableView />}
        {activeTab === 'tlb' && <TLBCounters />}
        {activeTab === 'replacement' && <PageReplacementSimulator />}
        {activeTab === 'faults' && <PageFaultsChart />}
        {activeTab === 'step' && <AddressTranslationStep />}
      </main>
    </div>
  );
}