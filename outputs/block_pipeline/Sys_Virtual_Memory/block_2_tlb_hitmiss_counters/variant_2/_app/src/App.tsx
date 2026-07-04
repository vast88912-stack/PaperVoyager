import React, { useState, useEffect, useRef } from 'react';

// --- Types & Interfaces ---
interface TLBEntry {
  id: number;
  valid: boolean;
  vpn: string | null;
  pfn: string | null;
  lastAccessed: number;
}

interface AccessLog {
  id: number;
  va: string;
  vpn: string;
  offset: string;
  isHit: boolean;
  evictedVpn?: string | null;
}

// --- Icons (Inline SVGs for zero dependencies) ---
const CpuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

const ActivityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const DatabaseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
  </svg>
);

// --- Constants ---
const TLB_SIZE = 8;
const PAGE_TABLE_SIZE = 256; // Simulated 8-bit VPN space

export default function App() {
  // --- State ---
  const [tlb, setTlb] = useState<TLBEntry[]>(
    Array.from({ length: TLB_SIZE }, (_, i) => ({
      id: i,
      valid: false,
      vpn: null,
      pfn: null,
      lastAccessed: 0,
    }))
  );
  
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [clock, setClock] = useState(0);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [customVa, setCustomVa] = useState<string>('');
  const [highlightedRow, setHighlightedRow] = useState<number | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  const totalAccesses = hits + misses;
  const hitRate = totalAccesses === 0 ? 0 : ((hits / totalAccesses) * 100).toFixed(1);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Autoplay simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoPlaying) {
      interval = setInterval(() => {
        // Generate a random address with temporal locality
        // 70% chance to reuse a recently used VPN, 30% chance for random
        const useLocality = Math.random() < 0.7 && tlb.some(e => e.valid);
        let vaNum: number;
        
        if (useLocality) {
          const validEntries = tlb.filter(e => e.valid && e.vpn !== null);
          const randomValidEntry = validEntries[Math.floor(Math.random() * validEntries.length)];
          const vpnNum = parseInt(randomValidEntry.vpn!, 16);
          const offsetNum = Math.floor(Math.random() * 256);
          vaNum = (vpnNum << 8) | offsetNum;
        } else {
          vaNum = Math.floor(Math.random() * 65536);
        }
        
        processAddress(vaNum.toString(16).padStart(4, '0').toUpperCase());
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isAutoPlaying, tlb]);

  // --- Logic ---
  const processAddress = (hexVa: string) => {
    if (!/^[0-9A-Fa-f]{1,4}$/.test(hexVa)) return;
    
    const paddedVa = hexVa.padStart(4, '0').toUpperCase();
    const vpn = paddedVa.substring(0, 2); // Top 8 bits (2 hex chars)
    const offset = paddedVa.substring(2, 4); // Bottom 8 bits (2 hex chars)
    
    setClock(c => c + 1);
    const currentClock = clock + 1;

    let hitIndex = tlb.findIndex(entry => entry.valid && entry.vpn === vpn);
    let newLogs: AccessLog;

    if (hitIndex !== -1) {
      // TLB HIT
      setHits(h => h + 1);
      
      setTlb(prev => prev.map((entry, idx) => 
        idx === hitIndex ? { ...entry, lastAccessed: currentClock } : entry
      ));
      
      setHighlightedRow(hitIndex);
      
      newLogs = {
        id: currentClock,
        va: paddedVa,
        vpn,
        offset,
        isHit: true
      };
    } else {
      // TLB MISS
      setMisses(m => m + 1);
      
      // Generate a mock PFN (in a real OS, this comes from the Page Table)
      const mockPfn = Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
      
      // Find empty slot or LRU
      let replaceIndex = tlb.findIndex(e => !e.valid);
      let evictedVpn = null;

      if (replaceIndex === -1) {
        // LRU Replacement
        replaceIndex = 0;
        for (let i = 1; i < tlb.length; i++) {
          if (tlb[i].lastAccessed < tlb[replaceIndex].lastAccessed) {
            replaceIndex = i;
          }
        }
        evictedVpn = tlb[replaceIndex].vpn;
      }

      setTlb(prev => prev.map((entry, idx) => 
        idx === replaceIndex ? {
          ...entry,
          valid: true,
          vpn,
          pfn: mockPfn,
          lastAccessed: currentClock
        } : entry
      ));

      setHighlightedRow(replaceIndex);

      newLogs = {
        id: currentClock,
        va: paddedVa,
        vpn,
        offset,
        isHit: false,
        evictedVpn
      };
    }

    setLogs(prev => [...prev.slice(-49), newLogs]); // Keep last 50 logs
    setTimeout(() => setHighlightedRow(null), 400);
  };

  const handleManualAccess = (e: React.FormEvent) => {
    e.preventDefault();
    if (customVa) {
      processAddress(customVa);
      setCustomVa('');
    }
  };

  const flushTlb = () => {
    setTlb(Array.from({ length: TLB_SIZE }, (_, i) => ({
      id: i,
      valid: false,
      vpn: null,
      pfn: null,
      lastAccessed: 0,
    })));
    setLogs(prev => [...prev, {
      id: clock + 1,
      va: 'FLUSH',
      vpn: '-',
      offset: '-',
      isHit: false,
      evictedVpn: 'ALL'
    }]);
    setClock(c => c + 1);
  };

  const resetCounters = () => {
    setHits(0);
    setMisses(0);
    setLogs([]);
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
              <CpuIcon />
              Virtual Memory Explorer
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Translation Lookaside Buffer (TLB) Hit/Miss Counters & LRU Replacement Simulation
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isAutoPlaying 
                  ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' 
                  : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
              }`}
            >
              {isAutoPlaying ? 'Stop Simulation' : 'Auto-Play Simulation'}
            </button>
            <button 
              onClick={flushTlb}
              className="px-4 py-2 rounded-md text-sm font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors flex items-center gap-2"
            >
              <TrashIcon />
              Flush TLB
            </button>
          </div>
        </header>

        {/* Top Panel: Counters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <span className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Total Accesses</span>
            <span className="text-4xl font-light text-slate-800">{totalAccesses}</span>
          </div>
          
          <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-600">
              <ActivityIcon />
            </div>
            <span className="text-sm font-medium text-emerald-600 uppercase tracking-wider mb-1">TLB Hits</span>
            <span className="text-4xl font-light text-emerald-700">{hits}</span>
            <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full transition-all duration-500" 
                style={{ width: `${totalAccesses > 0 ? (hits/totalAccesses)*100 : 0}%` }}
              />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-rose-100 shadow-sm flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-rose-600">
              <ActivityIcon />
            </div>
            <span className="text-sm font-medium text-rose-600 uppercase tracking-wider mb-1">TLB Misses</span>
            <span className="text-4xl font-light text-rose-700">{misses}</span>
            <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
              <div 
                className="bg-rose-500 h-full transition-all duration-500" 
                style={{ width: `${totalAccesses > 0 ? (misses/totalAccesses)*100 : 0}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-sm flex flex-col text-white">
            <span className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-1">Hit Rate</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-light">{hitRate}</span>
              <span className="text-xl text-slate-400">%</span>
            </div>
            <button 
              onClick={resetCounters}
              className="mt-auto text-xs text-slate-400 hover:text-white text-left transition-colors"
            >
              Reset Counters →
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: TLB State */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                <h2 className="text-lg font-medium text-slate-800 flex items-center gap-2">
                  <DatabaseIcon />
                  TLB State (LRU Policy)
                </h2>
                <span className="text-xs font-mono bg-slate-200 text-slate-600 px-2 py-1 rounded">
                  SIZE: {TLB_SIZE} ENTRIES
                </span>
              </div>
              
              <div className="p-5">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="pb-3 w-16 text-center">Slot</th>
                      <th className="pb-3 w-20 text-center">Valid</th>
                      <th className="pb-3 w-32 text-center">VPN (Tag)</th>
                      <th className="pb-3 w-32 text-center">PFN</th>
                      <th className="pb-3 text-right">LRU Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tlb.map((entry, idx) => (
                      <tr 
                        key={entry.id} 
                        className={`
                          border-b border-slate-100 last:border-0 transition-colors duration-300
                          ${highlightedRow === idx ? 'bg-indigo-50' : 'hover:bg-slate-50'}
                        `}
                      >
                        <td className="py-3 text-center text-sm font-medium text-slate-400">
                          {idx}
                        </td>
                        <td className="py-3 text-center">
                          <span className={`inline-block w-3 h-3 rounded-full ${entry.valid ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-200'}`} />
                        </td>
                        <td className="py-3 text-center">
                          {entry.valid ? (
                            <span className="font-mono text-sm bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200">
                              0x{entry.vpn}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          {entry.valid ? (
                            <span className="font-mono text-sm bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100">
                              0x{entry.pfn}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3 text-right font-mono text-xs text-slate-500">
                          {entry.valid ? entry.lastAccessed : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Manual Input Form */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-medium text-slate-800 mb-3">Manual Memory Access</h3>
              <form onSubmit={handleManualAccess} className="flex gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-slate-400">0x</span>
                  <input 
                    type="text" 
                    value={customVa}
                    onChange={(e) => setCustomVa(e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 4))}
                    placeholder="1A2B"
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow uppercase"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={!customVa}
                  className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Access
                </button>
                <button 
                  type="button"
                  onClick={() => processAddress(Math.floor(Math.random() * 65536).toString(16))}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Random
                </button>
              </form>
              <p className="text-xs text-slate-500 mt-2">
                Enter a 16-bit virtual address (e.g., 1A2B). Top 8 bits = VPN, Bottom 8 bits = Offset.
              </p>
            </div>
          </div>

          {/* Right Column: Access Log */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200">
              <h2 className="text-lg font-medium text-slate-800 flex items-center gap-2">
                <ActivityIcon />
                Access Log
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-sm">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-center px-4">
                  No memory accesses yet.<br/>Start the simulation or enter an address.
                </div>
              ) : (
                logs.map((log) => (
                  <div 
                    key={log.id} 
                    className={`p-3 rounded-lg border-l-4 ${
                      log.va === 'FLUSH' ? 'bg-slate-100 border-slate-400' :
                      log.isHit ? 'bg-emerald-50 border-emerald-500 text-emerald-900' : 'bg-rose-50 border-rose-500 text-rose-900'
                    }`}
                  >
                    {log.va === 'FLUSH' ? (
                      <div className="font-medium text-slate-600">TLB FLUSHED</div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold">VA: 0x{log.va}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            log.isHit ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'
                          }`}>
                            {log.isHit ? 'HIT' : 'MISS'}
                          </span>
                        </div>
                        <div className="text-xs opacity-80 grid grid-cols-2 gap-1 mt-2">
                          <div>VPN: <span className="font-semibold">0x{log.vpn}</span></div>
                          <div>Offset: <span className="font-semibold">0x{log.offset}</span></div>
                        </div>
                        {!log.isHit && log.evictedVpn && (
                          <div className="text-xs