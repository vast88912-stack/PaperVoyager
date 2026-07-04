import React, { useState, useEffect, useRef } from 'react';

// --- Icons (Inline SVGs to avoid external dependencies) ---
const ActivityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </svg>
);

const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const XCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);

const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
    <path d="M3 3v5h5"></path>
  </svg>
);

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16"></rect>
    <rect x="14" y="4" width="4" height="16"></rect>
  </svg>
);

// --- Types & Constants ---
type TLBEntry = {
  vpn: number;
  ppn: number;
  lastAccessed: number;
};

type LogEntry = {
  id: number;
  vpn: number;
  result: 'Hit' | 'Miss';
  evictedVpn?: number;
};

const TLB_SIZE = 4;
const MAX_VPN = 15; // Virtual pages 0-15

export default function App() {
  // --- State ---
  const [tlb, setTlb] = useState<TLBEntry[]>([]);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [clock, setClock] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [manualVpn, setManualVpn] = useState<string>('');
  const [isAutoRunning, setIsAutoRunning] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // --- Derived State ---
  const totalAccesses = hits + misses;
  const hitRate = totalAccesses === 0 ? 0 : (hits / totalAccesses) * 100;

  // --- Logic ---
  const accessMemory = (vpn: number) => {
    setClock((c) => c + 1);
    const currentClock = clock + 1;

    setTlb((prevTlb) => {
      const existingIndex = prevTlb.findIndex((e) => e.vpn === vpn);
      let newTlb = [...prevTlb];
      let result: 'Hit' | 'Miss' = 'Miss';
      let evictedVpn: number | undefined = undefined;

      if (existingIndex !== -1) {
        // TLB Hit
        result = 'Hit';
        setHits((h) => h + 1);
        newTlb[existingIndex].lastAccessed = currentClock;
      } else {
        // TLB Miss
        result = 'Miss';
        setMisses((m) => m + 1);
        
        if (newTlb.length >= TLB_SIZE) {
          // Evict LRU
          newTlb.sort((a, b) => a.lastAccessed - b.lastAccessed);
          evictedVpn = newTlb[0].vpn;
          newTlb.shift(); // Remove oldest
        }
        
        // Insert new entry (mocking PPN generation)
        const mockPpn = Math.floor(Math.random() * 64);
        newTlb.push({ vpn, ppn: mockPpn, lastAccessed: currentClock });
      }

      // Add Log
      setLogs((prevLogs) => {
        const newLogs = [...prevLogs, { id: currentClock, vpn, result, evictedVpn }];
        return newLogs.slice(-50); // Keep last 50 logs
      });

      return newTlb;
    });
  };

  const handleManualAccess = (e: React.FormEvent) => {
    e.preventDefault();
    const vpn = parseInt(manualVpn, 10);
    if (!isNaN(vpn) && vpn >= 0 && vpn <= MAX_VPN) {
      accessMemory(vpn);
      setManualVpn('');
    }
  };

  const generateRandomAccess = () => {
    // Simulate temporal locality: 60% chance to reuse a VPN currently in TLB
    const useLocality = Math.random() < 0.6 && tlb.length > 0;
    let vpnToAccess;
    
    if (useLocality) {
      const randomTlbIndex = Math.floor(Math.random() * tlb.length);
      vpnToAccess = tlb[randomTlbIndex].vpn;
    } else {
      vpnToAccess = Math.floor(Math.random() * (MAX_VPN + 1));
    }
    
    accessMemory(vpnToAccess);
  };

  const resetSimulation = () => {
    setTlb([]);
    setHits(0);
    setMisses(0);
    setClock(0);
    setLogs([]);
    setIsAutoRunning(false);
  };

  // Auto-run effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoRunning) {
      interval = setInterval(() => {
        generateRandomAccess();
      }, 800);
    }
    return () => clearInterval(interval);
  }, [isAutoRunning, tlb]); // Depend on tlb to use latest state for locality

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // --- Render Helpers ---
  const getHitRateColor = (rate: number) => {
    if (totalAccesses === 0) return 'text-slate-400';
    if (rate >= 75) return 'text-emerald-500';
    if (rate >= 40) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getHitRateBgColor = (rate: number) => {
    if (totalAccesses === 0) return 'bg-slate-200';
    if (rate >= 75) return 'bg-emerald-500';
    if (rate >= 40) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 font-sans selection:bg-indigo-100">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <ActivityIcon />
              TLB Hit/Miss Counters
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Visualize Translation Lookaside Buffer performance and LRU replacement.
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-3">
            <button
              onClick={() => setIsAutoRunning(!isAutoRunning)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isAutoRunning 
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {isAutoRunning ? <PauseIcon /> : <PlayIcon />}
              {isAutoRunning ? 'Pause Auto-Run' : 'Start Auto-Run'}
            </button>
            <button
              onClick={resetSimulation}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <RefreshIcon />
              Reset
            </button>
          </div>
        </header>

        {/* Top Counters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Hit Rate Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Hit Rate</h2>
              <ActivityIcon />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-bold ${getHitRateColor(hitRate)}`}>
                  {totalAccesses > 0 ? hitRate.toFixed(1) : '--'}
                </span>
                <span className="text-lg font-medium text-slate-400">%</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Total Accesses: {totalAccesses}</p>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ease-out ${getHitRateBgColor(hitRate)}`}
                style={{ width: `${totalAccesses > 0 ? hitRate : 0}%` }}
              />
            </div>
          </div>

          {/* Hits Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10 text-emerald-500">
              <CheckCircleIcon />
            </div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">TLB Hits</h2>
              <div className="text-emerald-500"><CheckCircleIcon /></div>
            </div>
            <div className="relative z-10">
              <span className="text-4xl font-bold text-slate-800">{hits}</span>
            </div>
            <p className="text-xs text-slate-400 mt-4 relative z-10">
              Found in TLB (Fast translation)
            </p>
          </div>

          {/* Misses Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10 text-rose-500">
              <XCircleIcon />
            </div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">TLB Misses</h2>
              <div className="text-rose-500"><XCircleIcon /></div>
            </div>
            <div className="relative z-10">
              <span className="text-4xl font-bold text-slate-800">{misses}</span>
            </div>
            <p className="text-xs text-slate-400 mt-4 relative z-10">
              Page Table walk required
            </p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: TLB State & Controls */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* TLB Visualization */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800">Current TLB State (Size: {TLB_SIZE})</h3>
                <span className="text-xs font-medium px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                  LRU Policy
                </span>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-4 gap-4">
                  {Array.from({ length: TLB_SIZE }).map((_, index) => {
                    const entry = tlb[index];
                    const isEmpty = !entry;
                    const isMostRecent = entry && entry.lastAccessed === clock && clock > 0;

                    return (
                      <div 
                        key={index}
                        className={`
                          relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-300
                          ${isEmpty ? 'border-dashed border-slate-200 bg-slate-50 text-slate-400' : 
                            isMostRecent ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white'}
                        `}
                      >
                        {isEmpty ? (
                          <span className="text-sm font-medium">Empty Slot</span>
                        ) : (
                          <>
                            <div className="text-xs font-semibold text-slate-500 uppercase mb-1">VPN &rarr; PPN</div>
                            <div className="text-xl font-bold text-slate-800 flex items-center gap-2">
                              <span>{entry.vpn}</span>
                              <span className="text-slate-300">&rarr;</span>
                              <span className="text-indigo-600">{entry.ppn}</span>
                            </div>
                            <div className="mt-3 text-[10px] font-mono bg-white px-2 py-1 rounded border border-slate-100 text-slate-400">
                              Last Access: {entry.lastAccessed}
                            </div>
                            {isMostRecent && (
                              <div className="absolute -top-2 -right-2 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white animate-pulse" />
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row items-end gap-4">
              <form onSubmit={handleManualAccess} className="flex-1 w-full">
                <label htmlFor="vpn-input" className="block text-sm font-medium text-slate-700 mb-1">
                  Manual Memory Access (VPN 0-{MAX_VPN})
                </label>
                <div className="flex gap-2">
                  <input
                    id="vpn-input"
                    type="number"
                    min="0"
                    max={MAX_VPN}
                    value={manualVpn}
                    onChange={(e) => setManualVpn(e.target.value)}
                    placeholder="Enter VPN..."
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm outline-none transition-shadow"
                    disabled={isAutoRunning}
                  />
                  <button
                    type="submit"
                    disabled={manualVpn === '' || isAutoRunning}
                    className="px-4 py-2 bg-slate-800 text-white rounded-md font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Access
                  </button>
                </div>
              </form>
              <div className="text-center sm:text-left">
                <span className="text-sm text-slate-400 mx-2 block sm:inline">or</span>
              </div>
              <button
                onClick={generateRandomAccess}
                disabled={isAutoRunning}
                className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Random Access
              </button>
            </div>
            
          </div>

          {/* Right Column: Access Log */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[500px] lg:h-auto">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">Access Log</h3>
              <span className="text-xs text-slate-500 font-mono">Clock: {clock}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/50">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-slate-400 italic">
                  No memory accesses yet.
                </div>
              ) : (
                logs.map((log) => (
                  <div 
                    key={log.id} 
                    className={`p-3 rounded-lg border text-sm flex items-center justify-between animate-in fade-in slide-in-from-bottom-2
                      ${log.result === 'Hit' 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-900' 
                        : 'bg-rose-50 border-rose-100 text-rose-900'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs opacity-50 w-6 text-right">#{log.id}</span>
                      <span className="font-medium">Access VPN {log.vpn}</span>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      {log.evictedVpn !== undefined && (
                        <span className="text-xs opacity-75">
                          Evicted VPN {log.evictedVpn}
                        </span>
                      )}
                      <span className={`font-bold px-2 py-0.5 rounded-full text-xs uppercase tracking-wide
                        ${log.result === 'Hit' ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'}
                      `}>
                        {log.result}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}