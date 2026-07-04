import React, { useState, useEffect, useRef } from 'react';

// Dependencies: None (Standard React). Uses inline SVGs for icons.
// Tailwind CSS required for styling.

// --- Types & Constants ---
type PageTableEntry = {
  vpn: number;
  ppn: number | null;
  valid: boolean;
  dirty: boolean;
  accessed: boolean;
};

type LogEntry = {
  id: number;
  va: string;
  vpn: number;
  offset: number;
  pa: string | null;
  status: 'HIT' | 'FAULT';
};

const NUM_VIRTUAL_PAGES = 16; // 4-bit VPN (0x0 to 0xF)
const PAGE_SIZE = 4096;       // 12-bit Offset (0x000 to 0xFFF)
const MAX_VA = 0xFFFF;        // 16-bit Virtual Address

// --- Helper Functions ---
const toHex = (num: number | null, padding: number): string => {
  if (num === null) return '-';
  return `0x${num.toString(16).padStart(padding, '0').toUpperCase()}`;
};

const generateInitialPageTable = (): PageTableEntry[] => {
  return Array.from({ length: NUM_VIRTUAL_PAGES }, (_, i) => ({
    vpn: i,
    ppn: Math.random() > 0.4 ? Math.floor(Math.random() * 256) : null, // 8-bit PPN (0-255)
    valid: Math.random() > 0.4,
    dirty: Math.random() > 0.8,
    accessed: Math.random() > 0.5,
  })).map(pte => ({
    ...pte,
    ppn: pte.valid ? (pte.ppn !== null ? pte.ppn : Math.floor(Math.random() * 256)) : null
  }));
};

export default function App() {
  // --- State ---
  const [pageTable, setPageTable] = useState<PageTableEntry[]>(generateInitialPageTable());
  const [inputVA, setInputVA] = useState<string>('');
  const [activeVPN, setActiveVPN] = useState<number | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState({ hits: 0, faults: 0, translations: 0 });
  const [isSimulating, setIsSimulating] = useState(false);
  
  const logContainerRef = useRef<HTMLDivElement>(null);

  // --- Core Logic ---
  const translateAddress = (vaStr: string) => {
    // Parse input
    let cleanVa = vaStr.trim().replace(/^0x/i, '');
    if (!cleanVa) cleanVa = Math.floor(Math.random() * MAX_VA).toString(16);
    
    const vaNum = parseInt(cleanVa, 16);
    if (isNaN(vaNum) || vaNum < 0 || vaNum > MAX_VA) {
      alert('Please enter a valid 16-bit hex address (e.g., 0x3A2F or 3A2F).');
      return;
    }

    // Extract VPN and Offset
    const vpn = (vaNum >> 12) & 0xF;   // Top 4 bits
    const offset = vaNum & 0xFFF;      // Bottom 12 bits

    setActiveVPN(vpn);

    // Lookup in Page Table
    setPageTable(prevTable => {
      const newTable = [...prevTable];
      const pte = { ...newTable[vpn] };
      
      let status: 'HIT' | 'FAULT' = 'HIT';
      let paHex: string | null = null;

      if (pte.valid && pte.ppn !== null) {
        // Page Hit
        status = 'HIT';
        pte.accessed = true;
        const paNum = (pte.ppn << 12) | offset;
        paHex = toHex(paNum, 5);
        
        setStats(s => ({ ...s, hits: s.hits + 1, translations: s.translations + 1 }));
      } else {
        // Page Fault
        status = 'FAULT';
        // Simulate OS handling page fault: load page into memory
        pte.valid = true;
        pte.ppn = Math.floor(Math.random() * 256); // Assign random physical frame
        pte.accessed = true;
        pte.dirty = false;
        
        const paNum = (pte.ppn << 12) | offset;
        paHex = toHex(paNum, 5);
        
        setStats(s => ({ ...s, faults: s.faults + 1, translations: s.translations + 1 }));
      }

      newTable[vpn] = pte;

      // Update logs
      setLogs(prevLogs => {
        const newLog: LogEntry = {
          id: Date.now(),
          va: toHex(vaNum, 4),
          vpn,
          offset,
          pa: paHex,
          status
        };
        return [newLog, ...prevLogs].slice(0, 50); // Keep last 50
      });

      return newTable;
    });

    // Clear active highlight after short delay if not simulating rapidly
    if (!isSimulating) {
      setTimeout(() => setActiveVPN(null), 800);
    }
  };

  const handleManualTranslate = (e: React.FormEvent) => {
    e.preventDefault();
    translateAddress(inputVA);
  };

  const resetSimulation = () => {
    setPageTable(generateInitialPageTable());
    setStats({ hits: 0, faults: 0, translations: 0 });
    setLogs([]);
    setActiveVPN(null);
    setInputVA('');
    setIsSimulating(false);
  };

  // Auto-Simulation Effect
  useEffect(() => {
    let interval: number;
    if (isSimulating) {
      interval = window.setInterval(() => {
        // Simulate locality by occasionally reusing recent VPNs
        const useLocality = Math.random() > 0.3 && logs.length > 0;
        let randomVaNum;
        if (useLocality) {
          const recentVpn = logs[0].vpn;
          const randomOffset = Math.floor(Math.random() * PAGE_SIZE);
          randomVaNum = (recentVpn << 12) | randomOffset;
        } else {
          randomVaNum = Math.floor(Math.random() * MAX_VA);
        }
        translateAddress(randomVaNum.toString(16));
      }, 600);
    }
    return () => clearInterval(interval);
  }, [isSimulating, logs]);

  // --- UI Components ---
  const hitRate = stats.translations === 0 ? 0 : ((stats.hits / stats.translations) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-zinc-200">
      
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-8 py-5 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            Virtual Memory Explorer
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Page Table View & Address Translation</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={resetSimulation}
            className="px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Reset
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Controls & Stats */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Translation Control Panel */}
          <section className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="bg-zinc-100/50 px-5 py-4 border-b border-zinc-200">
              <h2 className="text-sm font-semibold text-zinc-800 uppercase tracking-wider">Address Translation</h2>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <form onSubmit={handleManualTranslate} className="flex flex-col gap-3">
                <label className="text-sm text-zinc-600 font-medium">Virtual Address (Hex)</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-sm">0x</span>
                    <input 
                      type="text" 
                      value={inputVA}
                      onChange={(e) => setInputVA(e.target.value)}
                      placeholder="e.g. 3A2F"
                      className="w-full pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition-all"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-md hover:bg-zinc-800 transition-colors shadow-sm"
                  >
                    Translate
                  </button>
                </div>
              </form>

              <div className="relative py-3">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-zinc-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-2 bg-white text-xs text-zinc-400 uppercase tracking-widest">OR</span>
                </div>
              </div>

              <button 
                onClick={() => setIsSimulating(!isSimulating)}
                className={`w-full py-2.5 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 border ${
                  isSimulating 
                    ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100' 
                    : 'bg-zinc-50 border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                {isSimulating ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                    Stop Simulation
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Auto-Simulate Workload
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Statistics Panel */}
          <section className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
             <div className="bg-zinc-100/50 px-5 py-4 border-b border-zinc-200">
              <h2 className="text-sm font-semibold text-zinc-800 uppercase tracking-wider">Statistics</h2>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-100">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">Page Hits</p>
                <p className="text-2xl font-semibold text-zinc-900">{stats.hits}</p>
              </div>
              <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-100">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">Page Faults</p>
                <p className="text-2xl font-semibold text-zinc-900">{stats.faults}</p>
              </div>
              <div className="col-span-2 bg-zinc-50 rounded-lg p-4 border border-zinc-100 flex justify-between items-end">
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">Hit Rate</p>
                  <p className="text-3xl font-light text-zinc-900">{hitRate}%</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-400 mb-1">Total Translations</p>
                  <p className="text-sm font-medium text-zinc-600">{stats.translations}</p>
                </div>
              </div>
            </div>
          </section>
          
          {/* Translation Log */}
          <section className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden flex-1 flex flex-col max-h-[400px]">
            <div className="bg-zinc-100/50 px-5 py-4 border-b border-zinc-200 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-zinc-800 uppercase tracking-wider">Translation Log</h2>
              <span className="text-xs text-zinc-500 bg-zinc-200/50 px-2 py-1 rounded">Latest 50</span>
            </div>
            <div className="overflow-y-auto p-0 flex-1 bg-zinc-50/50" ref={logContainerRef}>
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-zinc-400 p-6 text-center">
                  No translations yet. Enter an address or start the simulation.
                </div>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {logs.map((log) => (
                    <li key={log.id} className="px-5 py-3 flex items-center justify-between hover:bg-zinc-50 transition-colors text-sm">
                      <div className="flex flex-col">
                        <span className="font-mono font-medium text-zinc-700">{log.va}</span>
                        <span className="text-xs text-zinc-400 font-mono mt-0.5">
                          VPN:{toHex(log.vpn, 1)} → {log.pa || 'FAULT'}
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full tracking-wide ${
                        log.status === 'HIT' 
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}>
                        {log.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

        </div>

        {/* Right Column: Page Table Visualization */}
        <div className="lg:col-span-8">
          <section className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="bg-zinc-100/50 px-6 py-5 border-b border-zinc-200 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-zinc-800">Page Table</h2>
                <p className="text-sm text-zinc-500 mt-1">Mapping 4-bit VPN to 8-bit PPN (16 entries)</p>
              </div>
              <div className="flex gap-4 text-xs font-medium text-zinc-500 bg-white px-3 py-2 rounded-lg border border-zinc-200 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div> Valid
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400"></div> Invalid
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto p-6 flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="pb-4 pt-2 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b-2 border-zinc-200">VPN (Hex)</th>
                    <th className="pb-4 pt-2 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b-2 border-zinc-200">Valid</th>
                    <th className="pb-4 pt-2 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b-2 border-zinc-200">PPN (Hex)</th>
                    <th className="pb-4 pt-2 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b-2 border-zinc-200 text-center">Dirty</th>
                    <th className="pb-4 pt-2 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b-2 border-zinc-200 text-center">Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {pageTable.map((pte, index) => {
                    const isActive = activeVPN === index;
                    return (
                      <tr 
                        key={index} 
                        className={`transition-colors duration-200 ${
                          isActive 
                            ? 'bg-zinc-900 shadow-[inset_0_0_0_1px_rgba(24,24,27,1)] text-white relative z-0 rounded-lg overflow-hidden' 
                            : 'hover:bg-zinc-50 text-zinc-700'
                        }`}
                      >
                        <td className="px-4 py-3 font-mono text-sm">
                          {toHex(pte.vpn, 1)}
                          {isActive && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-700 text-zinc-100 uppercase tracking-wider">Active</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            pte.valid 
                              ? (isActive ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700') 
                              : (isActive ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-700')
                          }`}>
                            {pte.valid ? '1' : '0'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm">
                          {pte.valid ? toHex(pte.ppn, 2) : <span className="text-zinc-400">-</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block w-2 h-2 rounded-full ${
                            pte.dirty 
                              ? (isActive ? 'bg-amber-400' : 'bg-amber-400') 
                              : (isActive ? 'bg-zinc-600' : 'bg-zinc-200')
                          }`}></span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block w-2 h-2 rounded-full ${
                            pte.accessed 
                              ? (isActive ? 'bg-blue-400' : 'bg-blue-400') 
                              : (isActive ? 'bg-zinc-600' : 'bg-zinc-200')
                          }`}></span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="bg-zinc-50 border-t border-zinc-200 px-6 py-4">
              <div className="flex items-start gap-3 text-sm text-zinc-600">
                <svg className="w-5 h-5 text-zinc-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p>
                  <strong>How it works:</strong> The Virtual Address (16-bit) is split into a 4-bit VPN and 12-bit Offset. The VPN is used as an index into this Page Table. If the entry is valid (1), the 8-bit PPN is combined with the Offset to form the Physical Address. If invalid (0), a Page Fault occurs, and the OS loads the page into memory.
                </p>
              </div>
            </div>
          </section>
        </div>

      </main>
    </div>