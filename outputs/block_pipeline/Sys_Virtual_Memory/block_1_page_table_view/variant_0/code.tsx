import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Constants & Types ---
const NUM_PAGES = 16;   // 4-bit VPN
const NUM_FRAMES = 8;   // 3-bit PFN
const PAGE_SIZE = 16;   // 4-bit Offset
const TLB_SIZE = 4;

type PageTableEntry = {
  vpn: number;
  pfn: number | null;
  valid: boolean;
  dirty: boolean;
  ref: boolean;
};

type TLBEntry = {
  vpn: number;
  pfn: number;
  lastUsed: number; // For LRU TLB replacement
};

type LogEntry = {
  id: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
};

// --- Helper Functions ---
const toHex = (num: number, padding = 2) => `0x${num.toString(16).toUpperCase().padStart(padding, '0')}`;
const toBin = (num: number, padding = 8) => num.toString(2).padStart(padding, '0');

export default function App() {
  // --- State ---
  const [pageTable, setPageTable] = useState<PageTableEntry[]>([]);
  const [tlb, setTlb] = useState<TLBEntry[]>([]);
  const [fifoQueue, setFifoQueue] = useState<number[]>([]); // Tracks VPNs in physical memory for FIFO
  const [freeFrames, setFreeFrames] = useState<number[]>([]);
  
  const [stats, setStats] = useState({ accesses: 0, tlbHits: 0, tlbMisses: 0, pageFaults: 0 });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdCounter = useRef(0);
  const timeCounter = useRef(0);

  const [inputAddress, setInputAddress] = useState<string>('');
  const [activeVPN, setActiveVPN] = useState<number | null>(null);
  const [activeTLBIndex, setActiveTLBIndex] = useState<number | null>(null);
  const [translationStep, setTranslationStep] = useState<string>('Idle');

  // --- Initialization ---
  useEffect(() => {
    // Initialize Page Table (16 entries)
    const initialPT: PageTableEntry[] = Array.from({ length: NUM_PAGES }, (_, i) => ({
      vpn: i,
      pfn: null,
      valid: false,
      dirty: false,
      ref: false,
    }));

    // Pre-allocate some frames to make it interesting
    const initialFreeFrames = Array.from({ length: NUM_FRAMES }, (_, i) => i);
    const initialFifo: number[] = [];
    
    // Randomly load 4 pages into memory
    for (let i = 0; i < 4; i++) {
      const vpn = Math.floor(Math.random() * NUM_PAGES);
      if (!initialPT[vpn].valid) {
        const pfn = initialFreeFrames.shift()!;
        initialPT[vpn].pfn = pfn;
        initialPT[vpn].valid = true;
        initialFifo.push(vpn);
      }
    }

    setPageTable(initialPT);
    setFreeFrames(initialFreeFrames);
    setFifoQueue(initialFifo);
    addLog('System initialized. 4 pages pre-loaded.', 'info');
  }, []);

  // --- Core Logic ---
  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [{ id: logIdCounter.current++, message, type }, ...prev].slice(0, 50));
  };

  const handleAccess = useCallback((virtualAddressStr: string) => {
    let va = parseInt(virtualAddressStr, 16);
    if (isNaN(va) || va < 0 || va > 255) {
      addLog(`Invalid address: ${virtualAddressStr}. Use 0x00 - 0xFF.`, 'error');
      return;
    }

    timeCounter.current++;
    const vpn = Math.floor(va / PAGE_SIZE);
    const offset = va % PAGE_SIZE;
    
    setActiveVPN(vpn);
    setStats(s => ({ ...s, accesses: s.accesses + 1 }));
    addLog(`Accessing VA: ${toHex(va)} (VPN: ${toHex(vpn, 1)}, Offset: ${toHex(offset, 1)})`, 'info');

    // 1. Check TLB
    const tlbIndex = tlb.findIndex(entry => entry.vpn === vpn);
    if (tlbIndex !== -1) {
      // TLB Hit
      setActiveTLBIndex(tlbIndex);
      setStats(s => ({ ...s, tlbHits: s.tlbHits + 1 }));
      addLog(`TLB Hit! VPN ${toHex(vpn, 1)} -> PFN ${toHex(tlb[tlbIndex].pfn, 1)}`, 'success');
      
      // Update TLB LRU
      const newTlb = [...tlb];
      newTlb[tlbIndex].lastUsed = timeCounter.current;
      setTlb(newTlb);
      
      setTranslationStep(`TLB Hit. Physical Address: ${toHex(tlb[tlbIndex].pfn * PAGE_SIZE + offset)}`);
      setTimeout(() => { setActiveVPN(null); setActiveTLBIndex(null); }, 1500);
      return;
    }

    // TLB Miss
    setStats(s => ({ ...s, tlbMisses: s.tlbMisses + 1 }));
    addLog(`TLB Miss for VPN ${toHex(vpn, 1)}. Checking Page Table...`, 'warning');

    // 2. Check Page Table
    setPageTable(prevPT => {
      const newPT = [...prevPT];
      const entry = { ...newPT[vpn] };
      let currentFreeFrames = [...freeFrames];
      let currentFifo = [...fifoQueue];
      let resolvedPfn = entry.pfn;

      if (entry.valid && resolvedPfn !== null) {
        // Page Table Hit
        addLog(`Page Table Hit! VPN ${toHex(vpn, 1)} is in frame ${toHex(resolvedPfn, 1)}`, 'success');
        entry.ref = true;
      } else {
        // Page Fault
        setStats(s => ({ ...s, pageFaults: s.pageFaults + 1 }));
        addLog(`PAGE FAULT! VPN ${toHex(vpn, 1)} not in memory.`, 'error');

        if (currentFreeFrames.length > 0) {
          // Allocate free frame
          resolvedPfn = currentFreeFrames.shift()!;
          addLog(`Allocated free frame ${toHex(resolvedPfn, 1)} to VPN ${toHex(vpn, 1)}`, 'info');
        } else {
          // Evict using FIFO
          const evictedVpn = currentFifo.shift()!;
          resolvedPfn = newPT[evictedVpn].pfn!;
          newPT[evictedVpn] = { ...newPT[evictedVpn], valid: false, pfn: null, dirty: false, ref: false };
          addLog(`Memory full. Evicted VPN ${toHex(evictedVpn, 1)} (FIFO) from frame ${toHex(resolvedPfn, 1)}`, 'warning');
        }

        entry.pfn = resolvedPfn;
        entry.valid = true;
        entry.ref = true;
        currentFifo.push(vpn);
        
        setFreeFrames(currentFreeFrames);
        setFifoQueue(currentFifo);
      }

      newPT[vpn] = entry;

      // 3. Update TLB
      setTlb(prevTlb => {
        const newTlb = [...prevTlb];
        if (newTlb.length < TLB_SIZE) {
          newTlb.push({ vpn, pfn: resolvedPfn!, lastUsed: timeCounter.current });
        } else {
          // LRU Replacement for TLB
          newTlb.sort((a, b) => a.lastUsed - b.lastUsed);
          newTlb[0] = { vpn, pfn: resolvedPfn!, lastUsed: timeCounter.current };
        }
        return newTlb;
      });

      setTranslationStep(`Translated via PT. Physical Address: ${toHex(resolvedPfn! * PAGE_SIZE + offset)}`);
      return newPT;
    });

    setTimeout(() => { setActiveVPN(null); setActiveTLBIndex(null); }, 1500);
  }, [tlb, freeFrames, fifoQueue]);

  const generateRandomAccess = () => {
    const randomVA = Math.floor(Math.random() * 256);
    setInputAddress(toHex(randomVA));
    handleAccess(randomVA.toString(16));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 flex flex-col gap-6">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Virtual Memory Explorer</h1>
          <p className="text-sm text-slate-500 mt-1">Interactive Page Table & Address Translation Visualization</p>
        </div>
        <div className="flex gap-4 mt-4 md:mt-0">
          <StatBox label="Accesses" value={stats.accesses} />
          <StatBox label="TLB Hits" value={stats.tlbHits} highlight="text-emerald-600" />
          <StatBox label="TLB Misses" value={stats.tlbMisses} highlight="text-amber-600" />
          <StatBox label="Page Faults" value={stats.pageFaults} highlight="text-rose-600" />
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 flex-1">
        
        {/* Left Column: Controls & Translation Visualizer */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          
          {/* Controls */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-4 border-b border-slate-100 pb-2">Memory Access</h2>
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                value={inputAddress}
                onChange={(e) => setInputAddress(e.target.value)}
                placeholder="e.g. 0x3A or 58"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleAccess(inputAddress)}
              />
              <button 
                onClick={() => handleAccess(inputAddress)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm"
              >
                Access
              </button>
            </div>
            <button 
              onClick={generateRandomAccess}
              className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors border border-slate-200"
            >
              Generate Random Access
            </button>
          </section>

          {/* Translation Visualizer */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex-1">
            <h2 className="text-lg font-semibold mb-4 border-b border-slate-100 pb-2">Address Translation</h2>
            
            <div className="flex flex-col items-center justify-center h-full gap-6 py-4">
              {activeVPN !== null ? (
                <>
                  <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Virtual Address</div>
                    <div className="flex border-2 border-slate-800 rounded-md overflow-hidden font-mono text-lg shadow-sm">
                      <div className="bg-indigo-100 text-indigo-900 px-4 py-2 border-r-2 border-slate-800 flex flex-col items-center">
                        <span>{toBin(activeVPN, 4)}</span>
                        <span className="text-[10px] text-indigo-600 uppercase mt-1">VPN ({toHex(activeVPN, 1)})</span>
                      </div>
                      <div className="bg-slate-100 text-slate-900 px-4 py-2 flex flex-col items-center">
                        <span>{toBin(parseInt(inputAddress, 16) % PAGE_SIZE, 4)}</span>
                        <span className="text-[10px] text-slate-500 uppercase mt-1">Offset</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-slate-400">
                    <svg className="w-6 h-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                  </div>

                  <div className="text-center bg-slate-50 p-4 rounded-lg border border-slate-200 w-full">
                    <div className="text-sm font-medium text-slate-700 mb-2">Status</div>
                    <div className="text-indigo-600 font-semibold">{translationStep}</div>
                  </div>
                </>
              ) : (
                <div className="text-slate-400 text-sm text-center italic">
                  Enter a virtual address or generate a random access to see translation steps.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Center Column: The Page Table */}
        <div className="w-full lg:w-1/3 flex flex-col">
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-800">Page Table</h2>
              <span className="text-xs font-medium bg-slate-200 text-slate-600 px-2 py-1 rounded-full">16 Entries</span>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-slate-500 border-b-2 border-slate-200">
                    <th className="pb-2 pl-2">VPN</th>
                    <th className="pb-2 text-center">Valid</th>
                    <th className="pb-2 text-center">PFN</th>
                    <th className="pb-2 text-center">Dirty</th>
                    <th className="pb-2 text-center">Ref</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-sm">
                  {pageTable.map((entry, idx) => {
                    const isActive = activeVPN === idx;
                    return (
                      <tr 
                        key={idx} 
                        className={`
                          border-b border-slate-100 transition-colors duration-300
                          ${isActive ? 'bg-indigo-50 border-indigo-200 shadow-inner' : 'hover:bg-slate-50'}
                        `}
                      >
                        <td className={`py-2 pl-2 font-semibold ${isActive ? 'text-indigo-700' : 'text-slate-700'}`}>
                          {toHex(entry.vpn, 1)}
                        </td>
                        <td className="py-2 text-center">
                          {entry.valid ? (
                            <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></span>
                          ) : (
                            <span className="inline-block w-3 h-3 rounded-full bg-slate-200 border border-slate-300"></span>
                          )}
                        </td>
                        <td className="py-2 text-center">
                          {entry.valid && entry.pfn !== null ? (
                            <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded border border-slate-200">
                              {toHex(entry.pfn, 1)}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-2 text-center text-slate-400">{entry.dirty ? '1' : '0'}</td>
                        <td className="py-2 text-center text-slate-400">{entry.ref ? '1' : '0'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right Column: TLB & Logs */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          
          {/* TLB */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
              <h2 className="text-lg font-semibold">TLB Cache</h2>
              <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-1 rounded-full">LRU Policy</span>
            </div>
            
            {tlb.length === 0 ? (
              <div className="text-sm text-slate-400 italic text-center py-4">TLB is empty</div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {tlb.map((entry, idx) => (
                  <div 
                    key={idx} 
                    className={`
                      p-3 rounded-lg border font-mono text-sm flex justify-between items-center transition-colors
                      ${activeTLBIndex === idx ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-700'}
                    `}
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase">VPN</span>
                      <span className="font-bold">{toHex(entry.vpn, 1)}</span>
                    </div>
                    <div className="text-slate-300">→</div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-slate-500 uppercase">PFN</span>
                      <span className="font-bold">{toHex(entry.pfn, 1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Event Log */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold">Activity Log</h2>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-900 text-slate-300 font-mono text-xs space-y-2">
              {logs.map(log => (
                <div key={log.id} className="flex gap-2 border-b border-slate-800 pb-1">
                  <span className="text-slate-500 shrink-0">[{log.id.toString().padStart(4, '0')}]</span>
                  <span className={`
                    ${log.type === 'error' ? 'text-rose-400' : ''}
                    ${log.type === 'warning' ? 'text-amber-400' : ''}
                    ${log.type === 'success' ? 'text-emerald-400' : ''}
                    ${log.type === 'info' ? 'text-blue-300' : ''}
                  `}>
                    {log.message}
                  </span>
                </div>
              ))}
              {logs.length === 0 && <div className="text-slate-600 italic">Waiting for activity...</div>}
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}

// --- Subcomponents ---

function StatBox({ label, value, highlight = "text-slate-900" }: { label: string, value: number, highlight?: string }) {
  return (
    <div className="flex flex-col items-center bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 min-w-[80px]">
      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</span>
      <span className={`text-xl font-bold font-mono ${highlight}`}>{value}</span>
    </div>
  );
}