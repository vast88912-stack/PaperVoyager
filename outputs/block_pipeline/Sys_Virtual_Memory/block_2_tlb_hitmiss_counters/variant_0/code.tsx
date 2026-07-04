import React, { useState, useEffect, useRef } from 'react';

// Runtime Dependencies: None (using inline SVGs for icons to ensure standalone execution)

interface TLBEntry {
  vpn: number; // Virtual Page Number
  pfn: number; // Physical Frame Number
  lastAccessed: number; // For LRU replacement
}

interface AccessLog {
  id: number;
  vpn: number;
  isHit: boolean;
  timestamp: Date;
}

const TLB_SIZE = 4;
const TOTAL_PAGES = 8;

export default function App() {
  const [tlb, setTlb] = useState<TLBEntry[]>([]);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [accessCount, setAccessCount] = useState(0);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [autoRun, setAutoRun] = useState(false);
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  const hitRate = accessCount === 0 ? 0 : ((hits / accessCount) * 100).toFixed(1);
  const missRate = accessCount === 0 ? 0 : ((misses / accessCount) * 100).toFixed(1);

  const requestPage = (vpn: number) => {
    setAccessCount((prev) => prev + 1);
    const now = Date.now();

    setTlb((prevTlb) => {
      const existingEntryIndex = prevTlb.findIndex((entry) => entry.vpn === vpn);
      
      if (existingEntryIndex !== -1) {
        // TLB Hit
        setHits((h) => h + 1);
        addLog(vpn, true);
        
        // Update LRU
        const newTlb = [...prevTlb];
        newTlb[existingEntryIndex].lastAccessed = now;
        return newTlb;
      } else {
        // TLB Miss
        setMisses((m) => m + 1);
        addLog(vpn, false);
        
        const newEntry: TLBEntry = {
          vpn,
          pfn: Math.floor(Math.random() * 16), // Mock physical frame
          lastAccessed: now,
        };

        if (prevTlb.length < TLB_SIZE) {
          return [...prevTlb, newEntry];
        } else {
          // LRU Replacement
          const sortedTlb = [...prevTlb].sort((a, b) => a.lastAccessed - b.lastAccessed);
          sortedTlb[0] = newEntry; // Replace the oldest
          return sortedTlb;
        }
      }
    });
  };

  const addLog = (vpn: number, isHit: boolean) => {
    setLogs((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), vpn, isHit, timestamp: new Date() }
    ].slice(-50)); // Keep last 50 logs
  };

  const resetSimulation = () => {
    setTlb([]);
    setHits(0);
    setMisses(0);
    setAccessCount(0);
    setLogs([]);
    setAutoRun(false);
  };

  // Auto-simulation effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRun) {
      interval = setInterval(() => {
        // Simulate some locality of reference (80% chance to pick a recently used page, 20% random)
        const useLocality = Math.random() > 0.2 && tlb.length > 0;
        let nextVpn;
        if (useLocality) {
          const randomTlbEntry = tlb[Math.floor(Math.random() * tlb.length)];
          nextVpn = randomTlbEntry.vpn;
        } else {
          nextVpn = Math.floor(Math.random() * TOTAL_PAGES);
        }
        requestPage(nextVpn);
      }, 800);
    }
    return () => clearInterval(interval);
  }, [autoRun, tlb]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 p-6 md:p-10 font-sans selection:bg-stone-200">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
          <div>
            <h1 className="text-3xl font-light tracking-tight text-stone-900">TLB Performance Monitor</h1>
            <p className="text-stone-500 mt-1 text-sm">
              Translation Lookaside Buffer hit/miss counters & LRU replacement visualization.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRun(!autoRun)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                autoRun 
                  ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' 
                  : 'bg-stone-800 text-stone-50 hover:bg-stone-700'
              }`}
            >
              {autoRun ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                  Stop Simulation
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Auto Run
                </>
              )}
            </button>
            <button
              onClick={resetSimulation}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-stone-200 text-stone-600 hover:bg-stone-100 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset
            </button>
          </div>
        </header>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            title="Total Accesses" 
            value={accessCount} 
            icon={<svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
          />
          <StatCard 
            title="TLB Hits" 
            value={hits} 
            valueColor="text-emerald-600"
            bgColor="bg-emerald-50"
            icon={<svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard 
            title="TLB Misses" 
            value={misses} 
            valueColor="text-rose-600"
            bgColor="bg-rose-50"
            icon={<svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard 
            title="Hit Rate" 
            value={`${hitRate}%`} 
            subtitle={`${missRate}% Miss Rate`}
            icon={<svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: TLB State & Controls */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Memory Access Controls */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
              <h2 className="text-lg font-medium text-stone-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                Request Memory Access
              </h2>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => requestPage(i)}
                    className="py-3 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 hover:border-stone-300 transition-all text-stone-700 font-mono text-sm flex flex-col items-center justify-center gap-1 active:scale-95"
                  >
                    <span className="text-[10px] text-stone-400 uppercase tracking-wider">VPN</span>
                    {i}
                  </button>
                ))}
              </div>
              <p className="text-xs text-stone-400 mt-4 text-center">
                Click a Virtual Page Number (VPN) to simulate a memory access.
              </p>
            </div>

            {/* TLB Visualization */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-stone-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                  Current TLB State
                </h2>
                <span className="text-xs font-medium px-2.5 py-1 bg-stone-100 text-stone-500 rounded-full">
                  Size: {TLB_SIZE} Entries (LRU)
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: TLB_SIZE }).map((_, i) => {
                  const entry = tlb[i];
                  return (
                    <div 
                      key={i} 
                      className={`relative overflow-hidden rounded-xl border-2 transition-all duration-300 ${
                        entry 
                          ? 'border-stone-300 bg-white shadow-sm' 
                          : 'border-dashed border-stone-200 bg-stone-50/50'
                      } p-4 flex flex-col items-center justify-center min-h-[120px]`}
                    >
                      {entry ? (
                        <>
                          <div className="absolute top-2 right-2 flex gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          </div>
                          <div className="text-center space-y-2 w-full">
                            <div className="flex justify-between items-center bg-stone-50 px-2 py-1 rounded text-xs font-mono text-stone-500">
                              <span>VPN</span>
                              <span className="text-stone-900 font-bold text-base">{entry.vpn}</span>
                            </div>
                            <div className="flex justify-between items-center bg-stone-50 px-2 py-1 rounded text-xs font-mono text-stone-500">
                              <span>PFN</span>
                              <span className="text-stone-900 font-bold text-base">{entry.pfn}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <span className="text-stone-400 text-sm font-medium">Empty Slot</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column: Access Log */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col h-[600px]">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50 rounded-t-2xl">
              <h2 className="text-lg font-medium text-stone-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Access History
              </h2>
              <span className="text-xs text-stone-400">{logs.length} records</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-2">
                  <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">No accesses yet</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div 
                    key={log.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border text-sm animate-in fade-in slide-in-from-bottom-2 ${
                      log.isHit 
                        ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900' 
                        : 'bg-rose-50/50 border-rose-100 text-rose-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-md ${log.isHit ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {log.isHit ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        )}
                      </div>
                      <span className="font-mono font-medium">VPN {log.vpn}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`font-bold ${log.isHit ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {log.isHit ? 'HIT' : 'MISS'}
                      </span>
                      <span className="text-[10px] opacity-60">
                        {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit', fractionalSecondDigits: 2 })}
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

// Subcomponents

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  valueColor = "text-stone-900",
  bgColor = "bg-white"
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string; 
  icon: React.ReactNode;
  valueColor?: string;
  bgColor?: string;
}) {
  return (
    <div className={`p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between ${bgColor}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-stone-500">{title}</h3>
        <div className="p-2 bg-white rounded-lg shadow-sm border border-stone-100">
          {icon}
        </div>
      </div>
      <div>
        <div className={`text-3xl font-bold tracking-tight ${valueColor}`}>
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-stone-500 mt-1 font-medium">{subtitle}</p>
        )}
      </div>
    </div>
  );
}