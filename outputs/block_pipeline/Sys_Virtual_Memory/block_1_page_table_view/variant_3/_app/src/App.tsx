import React, { useState, useEffect, useRef } from 'react';
import { Settings, Cpu, Database, Activity, History, ArrowRight, Play, RotateCcw, MousePointerClick, Check, X, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

// --- Types ---
type AccessType = 'READ' | 'WRITE';
type Policy = 'LRU' | 'FIFO';

interface PageTableEntry {
  vpn: number;
  pfn: number | null;
  valid: boolean;
  dirty: boolean;
  referenced: boolean;
  loadedAt: number;
  lastAccessed: number;
}

interface PhysicalFrame {
  pfn: number;
  vpn: number | null;
  isFree: boolean;
}

interface LogEntry {
  id: string;
  time: number;
  vpn: number;
  type: AccessType;
  result: 'HIT' | 'FAULT';
  evictedVpn: number | null;
}

// --- Constants ---
const NUM_VPNS = 16;
const NUM_PFNS = 8;

export default function App() {
  // --- State ---
  const [time, setTime] = useState(0);
  const [policy, setPolicy] = useState<Policy>('LRU');
  
  const [pageTable, setPageTable] = useState<PageTableEntry[]>(() => 
    Array.from({ length: NUM_VPNS }, (_, i) => ({
      vpn: i, pfn: null, valid: false, dirty: false, referenced: false, loadedAt: 0, lastAccessed: 0
    }))
  );
  
  const [frames, setFrames] = useState<PhysicalFrame[]>(() =>
    Array.from({ length: NUM_PFNS }, (_, i) => ({
      pfn: i, vpn: null, isFree: true
    }))
  );

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState({ hits: 0, faults: 0, accesses: 0 });
  const [highlightedVpn, setHighlightedVpn] = useState<number | null>(null);
  const [highlightedPfn, setHighlightedPfn] = useState<number | null>(null);

  // --- Core Simulation Logic ---
  const handleAccess = (targetVpn: number, type: AccessType) => {
    setTime(t => t + 1);
    const currentTime = time + 1;
    
    setHighlightedVpn(targetVpn);
    setTimeout(() => setHighlightedVpn(null), 800);

    setPageTable(prevTable => {
      const newTable = [...prevTable];
      const entry = { ...newTable[targetVpn] };
      let result: 'HIT' | 'FAULT' = 'FAULT';
      let evictedVpn: number | null = null;
      let targetPfn: number | null = null;

      if (entry.valid) {
        // HIT
        result = 'HIT';
        entry.referenced = true;
        entry.lastAccessed = currentTime;
        if (type === 'WRITE') entry.dirty = true;
        targetPfn = entry.pfn;
        
        newTable[targetVpn] = entry;
        
        setStats(s => ({ ...s, hits: s.hits + 1, accesses: s.accesses + 1 }));
      } else {
        // FAULT
        result = 'FAULT';
        
        setFrames(prevFrames => {
          const newFrames = [...prevFrames];
          const freeFrameIndex = newFrames.findIndex(f => f.isFree);
          
          if (freeFrameIndex !== -1) {
            // Use free frame
            targetPfn = freeFrameIndex;
            newFrames[targetPfn] = { pfn: targetPfn, vpn: targetVpn, isFree: false };
          } else {
            // Eviction needed
            let victimPfn = -1;
            let victimVpn = -1;
            
            // Find victim based on policy
            const validEntries = newTable.filter(e => e.valid);
            if (policy === 'LRU') {
              const lruEntry = validEntries.reduce((min, e) => e.lastAccessed < min.lastAccessed ? e : min);
              victimVpn = lruEntry.vpn;
              victimPfn = lruEntry.pfn as number;
            } else if (policy === 'FIFO') {
              const fifoEntry = validEntries.reduce((min, e) => e.loadedAt < min.loadedAt ? e : min);
              victimVpn = fifoEntry.vpn;
              victimPfn = fifoEntry.pfn as number;
            }

            evictedVpn = victimVpn;
            targetPfn = victimPfn;
            
            // Invalidate victim in page table
            newTable[victimVpn] = { 
              ...newTable[victimVpn], 
              valid: false, 
              pfn: null, 
              dirty: false, 
              referenced: false 
            };
            
            // Update frame
            newFrames[targetPfn] = { pfn: targetPfn, vpn: targetVpn, isFree: false };
          }

          setHighlightedPfn(targetPfn);
          setTimeout(() => setHighlightedPfn(null), 800);
          return newFrames;
        });

        // Update new entry in page table
        entry.valid = true;
        entry.pfn = targetPfn;
        entry.dirty = type === 'WRITE';
        entry.referenced = true;
        entry.loadedAt = currentTime;
        entry.lastAccessed = currentTime;
        newTable[targetVpn] = entry;
        
        setStats(s => ({ ...s, faults: s.faults + 1, accesses: s.accesses + 1 }));
      }

      setLogs(prev => [{
        id: Math.random().toString(36).substring(7),
        time: currentTime,
        vpn: targetVpn,
        type,
        result,
        evictedVpn
      }, ...prev].slice(0, 50));

      return newTable;
    });
  };

  const generateRandomAccess = () => {
    // Bias towards recently used to show hits
    const roll = Math.random();
    let vpn;
    if (roll < 0.4 && logs.length > 0) {
      vpn = logs[0].vpn; // Repeat last
    } else if (roll < 0.7 && logs.length > 1) {
      vpn = logs[1].vpn; // Repeat second to last
    } else {
      vpn = Math.floor(Math.random() * NUM_VPNS);
    }
    const type: AccessType = Math.random() > 0.7 ? 'WRITE' : 'READ';
    handleAccess(vpn, type);
  };

  const resetSimulation = () => {
    setTime(0);
    setPageTable(Array.from({ length: NUM_VPNS }, (_, i) => ({
      vpn: i, pfn: null, valid: false, dirty: false, referenced: false, loadedAt: 0, lastAccessed: 0
    })));
    setFrames(Array.from({ length: NUM_PFNS }, (_, i) => ({
      pfn: i, vpn: null, isFree: true
    })));
    setLogs([]);
    setStats({ hits: 0, faults: 0, accesses: 0 });
  };

  const hitRate = stats.accesses > 0 ? ((stats.hits / stats.accesses) * 100).toFixed(1) : '0.0';

  // --- UI Components ---
  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-800 font-sans selection:bg-neutral-300">
      
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-neutral-800 p-2 rounded-md">
            <Cpu className="w-5 h-5 text-neutral-100" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Virtual Memory Explorer</h1>
            <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Page Table View</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex gap-6 text-sm">
            <div className="flex flex-col">
              <span className="text-neutral-500 text-xs font-semibold uppercase">Total Accesses</span>
              <span className="font-mono font-medium text-lg">{stats.accesses}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-neutral-500 text-xs font-semibold uppercase">Page Faults</span>
              <span className="font-mono font-medium text-lg text-rose-600">{stats.faults}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-neutral-500 text-xs font-semibold uppercase">Hit Rate</span>
              <span className="font-mono font-medium text-lg text-emerald-600">{hitRate}%</span>
            </div>
          </div>
          
          <div className="h-8 w-px bg-neutral-200" />
          
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-neutral-600 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Policy
            </label>
            <select 
              value={policy}
              onChange={(e) => setPolicy(e.target.value as Policy)}
              className="bg-neutral-50 border border-neutral-300 text-sm rounded-md focus:ring-neutral-500 focus:border-neutral-500 block px-3 py-1.5"
            >
              <option value="LRU">LRU (Least Recently Used)</option>
              <option value="FIFO">FIFO (First-In, First-Out)</option>
            </select>
            <button 
              onClick={resetSimulation}
              className="ml-2 p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
              title="Reset Simulation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Controls & Log */}
        <div className="lg:col-span-3 space-y-6">
          {/* Controls */}
          <section className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/50 flex items-center gap-2">
              <MousePointerClick className="w-4 h-4 text-neutral-500" />
              <h2 className="font-semibold text-sm">Simulator Controls</h2>
            </div>
            <div className="p-4 space-y-4">
              <button
                onClick={generateRandomAccess}
                className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                <Play className="w-4 h-4" />
                Generate Random Access
              </button>
              
              <div className="pt-4 border-t border-neutral-100">
                <p className="text-xs text-neutral-500 mb-3 font-semibold uppercase">Manual Access</p>
                <div className="grid grid-cols-4 gap-2">
                  {pageTable.slice(0, 8).map(entry => (
                    <button
                      key={`read-${entry.vpn}`}
                      onClick={() => handleAccess(entry.vpn, 'READ')}
                      className="text-xs font-mono py-1.5 rounded bg-neutral-50 border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-100 transition-colors"
                    >
                      R {entry.vpn.toString(16).toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Access Log */}
          <section className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
            <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/50 flex items-center gap-2">
              <History className="w-4 h-4 text-neutral-500" />
              <h2 className="font-semibold text-sm">Access History</h2>
            </div>
            <div className="p-0 overflow-y-auto flex-1">
              {logs.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-neutral-400">
                  No memory accesses yet.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 text-neutral-500 sticky top-0 border-b border-neutral-100">
                    <tr>
                      <th className="px-4 py-2 font-medium">Time</th>
                      <th className="px-4 py-2 font-medium">VPN</th>
                      <th className="px-4 py-2 font-medium">Op</th>
                      <th className="px-4 py-2 font-medium">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50 font-mono">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-4 py-2 text-neutral-400">T{log.time}</td>
                        <td className="px-4 py-2 font-semibold">0x{log.vpn.toString(16).toUpperCase()}</td>
                        <td className="px-4 py-2">
                          <span className={log.type === 'READ' ? 'text-blue-600' : 'text-amber-600'}>
                            {log.type}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {log.result === 'HIT' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                              <Check className="w-3 h-3" /> HIT
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                              <X className="w-3 h-3" /> FAULT
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>

        {/* Center Column: Page Table */}
        <div className="lg:col-span-6 space-y-4">
          <section className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-neutral-500" />
                <h2 className="font-semibold text-sm">Page Table</h2>
              </div>
              <span className="text-xs text-neutral-400 font-mono">
                {NUM_VPNS} Virtual Pages
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500 border-b border-neutral-200">
                    <th className="px-4 py-3 font-semibold text-center w-16">VPN</th>
                    <th className="px-4 py-3 font-semibold text-center w-20">PFN</th>
                    <th className="px-4 py-3 font-semibold text-center w-16" title="Valid Bit">V</th>
                    <th className="px-4 py-3 font-semibold text-center w-16" title="Dirty Bit">D</th>
                    <th className="px-4 py-3 font-semibold text-center w-16" title="Referenced Bit">R</th>
                    <th className="px-4 py-3 font-semibold text-right" title="Last Accessed Time">Last Acc</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-sm font-mono">
                  {pageTable.map((entry) => {
                    const isHighlighted = highlightedVpn === entry.vpn;
                    return (
                      <tr 
                        key={entry.vpn} 
                        className={`
                          transition-all duration-300
                          ${isHighlighted ? 'bg-indigo-50/80 shadow-inner' : 'hover:bg-neutral-50'}
                          ${entry.valid ? 'text-neutral-800' : 'text-neutral-400'}
                        `}
                      >
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded ${isHighlighted ? 'bg-indigo-200 text-indigo-900 font-bold' : 'bg-neutral-100'}`}>
                            {entry.vpn.toString(16).toUpperCase()}
                          </span>
                        </td>
                        
                        <td className="px-4 py-2.5 text-center">
                          {entry.valid ? (
                            <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                              {entry.pfn}
                            </span>
                          ) : (
                            <span className="text-neutral-300">-</span>
                          )}
                        </td>
                        
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex justify-center">
                            {entry.valid ? 
                              <div className="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center text-white text-xs shadow-sm">1</div> : 
                              <div className="w-5 h-5 rounded bg-neutral-200 flex items-center justify-center text-neutral-500 text-xs border border-neutral-300">0</div>
                            }
                          </div>
                        </td>
                        
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex justify-center">
                            {entry.dirty ? 
                              <div className="w-5 h-5 rounded bg-amber-500 flex items-center justify-center text-white text-xs shadow-sm">1</div> : 
                              <div className="w-5 h-5 rounded bg-neutral-200 flex items-center justify-center text-neutral-500 text-xs border border-neutral-300">0</div>
                            }
                          </div>
                        </td>
                        
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex justify-center">
                            {entry.referenced ? 
                              <div className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center text-white text-xs shadow-sm">1</div> : 
                              <div className="w-5 h-5 rounded bg-neutral-200 flex items-center justify-center text-neutral-500 text-xs border border-neutral-300">0</div>
                            }
                          </div>
                        </td>
                        
                        <td className="px-4 py-2.5 text-right text-xs">
                          {entry.valid ? `T${entry.lastAccessed}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-neutral-50/80 border-t border-neutral-100 text-xs text-neutral-500 flex gap-4">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-emerald-500"></div> V: Valid (in RAM)</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-amber-500"></div> D: Dirty (modified)</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-blue-500"></div> R: Referenced</span>
            </div>
          </section>
        </div>

        {/* Right Column: Physical Memory */}
        <div className="lg:col-span-3 space-y-6">
          <section className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-neutral-500" />
                <h2 className="font-semibold text-sm">Physical Memory</h2>
              </div>
              <span className="text-xs text-neutral-400 font-mono">
                {NUM_PFNS} Frames
              </span>
            </div>
            
            <div className="p-4 grid grid-cols-1 gap-2">
              {frames.map((frame) => {
                const isHighlighted = highlightedPfn === frame.pfn;
                return (
                  <div 
                    key={frame.pfn}
                    className={`
                      relative flex items-center border rounded-lg p-3 transition-all duration-300
                      ${isHighlighted ? 'border-emerald-500 bg-emerald-50 shadow-md transform scale-[1.02] z-10' : 'border-neutral-200 bg-white'}
                      ${!frame.isFree && !isHighlighted ? 'border-emerald-200 bg-emerald-50/30' : ''}
                    `}
                  >
                    <div className="flex flex-col items-center justify-center w-10 border-r border-neutral-200/50 pr-3">
                      <span className="text-[10px] text-neutral-400 font-bold uppercase">PFN</span>
                      <span className={`font-mono text-lg font-bold ${isHighlighted ? 'text-emerald-700' : 'text-neutral-700'}`}>
                        {frame.pfn}
                      </span>
                    </div>
                    
                    <div className="pl-3 flex-1">
                      {frame.isFree ? (
                        <div className="text-sm text-neutral-400 italic">Free Frame</div>
                      ) : (
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">