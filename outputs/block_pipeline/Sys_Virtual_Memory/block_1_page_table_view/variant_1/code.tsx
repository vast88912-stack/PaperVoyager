import React, { useState, useEffect, useRef } from 'react';

// --- Types ---
type PTE = {
  vpn: number;
  ppn: number | null;
  valid: boolean;
  dirty: boolean;
  ref: boolean;
};

type Frame = {
  frame: number;
  allocated: boolean;
  vpn: number | null;
};

type LogEntry = {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error';
  timestamp: Date;
};

// --- Constants & Initial Data ---
const NUM_PAGES = 16;
const NUM_FRAMES = 8;
const PAGE_SIZE = 16; // 4 bits offset

const INITIAL_PTES: PTE[] = Array.from({ length: NUM_PAGES }, (_, i) => ({
  vpn: i,
  ppn: null,
  valid: false,
  dirty: false,
  ref: false,
}));

const INITIAL_FRAMES: Frame[] = Array.from({ length: NUM_FRAMES }, (_, i) => ({
  frame: i,
  allocated: false,
  vpn: null,
}));

// Pre-allocate some pages for demonstration
const PRE_ALLOCATED = [
  { vpn: 2, ppn: 0 },
  { vpn: 5, ppn: 1 },
  { vpn: 7, ppn: 2 },
  { vpn: 10, ppn: 3 },
  { vpn: 14, ppn: 4 },
];

PRE_ALLOCATED.forEach(({ vpn, ppn }) => {
  INITIAL_PTES[vpn].valid = true;
  INITIAL_PTES[vpn].ppn = ppn;
  INITIAL_FRAMES[ppn].allocated = true;
  INITIAL_FRAMES[ppn].vpn = vpn;
});

// --- Helper Functions ---
const toHex = (num: number, padding: number = 2) =>
  `0x${num.toString(16).toUpperCase().padStart(padding, '0')}`;

const toBin = (num: number, padding: number = 8) =>
  num.toString(2).padStart(padding, '0');

// --- Main Component ---
export default function App() {
  const [pageTable, setPageTable] = useState<PTE[]>(INITIAL_PTES);
  const [physicalMemory, setPhysicalMemory] = useState<Frame[]>(INITIAL_FRAMES);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logCounter, setLogCounter] = useState(0);

  // Simulation State
  const [inputVA, setInputVA] = useState<string>('0x2A');
  const [activeVA, setActiveVA] = useState<number | null>(null);
  const [simStep, setSimStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Derived Values
  const activeVPN = activeVA !== null ? activeVA >> 4 : null;
  const activeOffset = activeVA !== null ? activeVA & 0x0f : null;
  const activePTE = activeVPN !== null ? pageTable[activeVPN] : null;
  const activePA =
    activePTE?.valid && activePTE.ppn !== null && activeOffset !== null
      ? (activePTE.ppn << 4) | activeOffset
      : null;

  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs((prev) => [
      ...prev,
      { id: logCounter, message, type, timestamp: new Date() },
    ]);
    setLogCounter((c) => c + 1);
  };

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Simulation Engine
  useEffect(() => {
    if (!isPlaying) return;
    let timer: NodeJS.Timeout;

    const delay = 1200;

    if (simStep === 1) {
      // Step 1: Extract VPN
      timer = setTimeout(() => setSimStep(2), delay);
    } else if (simStep === 2) {
      // Step 2: Lookup PTE
      timer = setTimeout(() => setSimStep(3), delay);
    } else if (simStep === 3) {
      // Step 3: Check Valid Bit
      timer = setTimeout(() => {
        if (activePTE?.valid) {
          setSimStep(4);
          addLog(
            `TLB/Page Table Hit: VPN ${activeVPN} is mapped to PPN ${activePTE.ppn}.`,
            'success'
          );
        } else {
          setSimStep(5);
          addLog(
            `Page Fault: VPN ${activeVPN} is invalid (not in physical memory).`,
            'error'
          );
        }
      }, delay);
    } else if (simStep === 4 || simStep === 5) {
      // Step 4/5: Finish & Reset
      timer = setTimeout(() => {
        setSimStep(0);
        setIsPlaying(false);
      }, delay * 1.5);
    }

    return () => clearTimeout(timer);
  }, [simStep, isPlaying, activeVPN, activePTE]);

  const handleTranslate = () => {
    if (isPlaying) return;
    
    // Parse input
    let parsed = parseInt(inputVA, 16);
    if (isNaN(parsed) || parsed < 0 || parsed > 255) {
      addLog(`Invalid address: ${inputVA}. Please enter a hex value between 0x00 and 0xFF.`, 'error');
      return;
    }

    setActiveVA(parsed);
    setSimStep(1);
    setIsPlaying(true);
    addLog(`Initiating memory access for Virtual Address ${toHex(parsed)}...`);
  };

  const handleRandomAccess = () => {
    const randomVA = Math.floor(Math.random() * 256);
    setInputVA(toHex(randomVA));
    // We don't auto-start here to let the user see the input change, 
    // but we could call handleTranslate() immediately if desired.
  };

  // --- Render Helpers ---
  const getStepStatus = (step: number) => {
    if (simStep === step) return 'animate-pulse ring-2 ring-indigo-400 bg-indigo-50 border-indigo-300';
    if (simStep > step) return 'opacity-50';
    return 'border-slate-200 bg-white';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 flex flex-col gap-6">
      {/* Header */}
      <header className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            Virtual Memory Explorer
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Interactive Page Table & Address Translation Visualization
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRandomAccess}
            disabled={isPlaying}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            Random Address
          </button>
          <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
            <span className="text-slate-400 font-mono text-sm">VA:</span>
            <input
              type="text"
              value={inputVA}
              onChange={(e) => setInputVA(e.target.value)}
              disabled={isPlaying}
              className="w-16 py-2 text-sm font-mono outline-none bg-transparent"
              placeholder="0x00"
            />
          </div>
          <button
            onClick={handleTranslate}
            disabled={isPlaying}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {isPlaying ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Translating...
              </>
            ) : (
              'Translate'
            )}
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        
        {/* Left Column: Translation Engine */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex-1">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Translation Engine
            </h2>

            {/* Step 1: Virtual Address Breakdown */}
            <div className={`p-4 rounded-lg border transition-all duration-300 ${getStepStatus(1)}`}>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Step 1: Parse Virtual Address</div>
              <div className="flex flex-col items-center">
                <div className="text-2xl font-mono font-bold text-slate-800 mb-2">
                  {activeVA !== null ? toHex(activeVA) : '----'}
                </div>
                {activeVA !== null && (
                  <div className="flex gap-1 font-mono text-sm">
                    <div className={`px-2 py-1 rounded ${simStep >= 1 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                      <span className="text-xs block text-center opacity-70">VPN</span>
                      {toBin(activeVPN!, 4)}
                    </div>
                    <div className={`px-2 py-1 rounded ${simStep >= 1 ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>
                      <span className="text-xs block text-center opacity-70">Offset</span>
                      {toBin(activeOffset!, 4)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center py-2 text-slate-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>

            {/* Step 2 & 3: Page Table Lookup */}
            <div className={`p-4 rounded-lg border transition-all duration-300 ${getStepStatus(2)} ${simStep === 3 ? 'ring-2 ring-amber-400 bg-amber-50 border-amber-300' : ''}`}>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Step 2: Page Table Lookup</div>
              <div className="text-center font-mono text-sm">
                {activeVPN !== null ? (
                  <>
                    <div>Look up PTE at Index <span className="font-bold text-indigo-600">{activeVPN}</span></div>
                    {simStep >= 3 && (
                      <div className={`mt-2 p-2 rounded ${activePTE?.valid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        Valid Bit: {activePTE?.valid ? '1 (Hit)' : '0 (Fault)'}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-slate-400">Waiting for address...</span>
                )}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center py-2 text-slate-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>

            {/* Step 4: Physical Address Generation */}
            <div className={`p-4 rounded-lg border transition-all duration-300 ${simStep === 4 ? 'animate-pulse ring-2 ring-emerald-400 bg-emerald-50 border-emerald-300' : simStep === 5 ? 'ring-2 ring-rose-400 bg-rose-50 border-rose-300' : 'border-slate-200 bg-white opacity-50'}`}>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Step 3: Physical Address</div>
              <div className="flex flex-col items-center">
                {simStep === 5 ? (
                  <div className="text-rose-600 font-bold tracking-widest text-lg py-2">
                    PAGE FAULT
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-mono font-bold text-slate-800 mb-2">
                      {activePA !== null ? toHex(activePA) : '----'}
                    </div>
                    {activePA !== null && (
                      <div className="flex gap-1 font-mono text-sm">
                        <div className="px-2 py-1 rounded bg-emerald-100 text-emerald-700">
                          <span className="text-xs block text-center opacity-70">PPN</span>
                          {toBin(activePTE!.ppn!, 4)}
                        </div>
                        <div className="px-2 py-1 rounded bg-teal-100 text-teal-700">
                          <span className="text-xs block text-center opacity-70">Offset</span>
                          {toBin(activeOffset!, 4)}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Middle Column: Page Table */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Page Table
              </h2>
              <div className="text-xs text-slate-500 flex gap-3">
                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-400 rounded-full"></div> Valid</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-rose-400 rounded-full"></div> Invalid</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <table className="w-full text-sm text-left font-mono">
                <thead className="text-xs text-slate-500 bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 rounded-tl-md">VPN</th>
                    <th className="px-3 py-2 text-center">Valid</th>
                    <th className="px-3 py-2 text-center">Dirty</th>
                    <th className="px-3 py-2 text-center">Ref</th>
                    <th className="px-3 py-2 rounded-tr-md">PPN</th>
                  </tr>
                </thead>
                <tbody>
                  {pageTable.map((pte, idx) => {
                    const isTarget = activeVPN === idx && simStep >= 2;
                    let rowClass = "border-b border-slate-100 transition-colors duration-300 ";
                    
                    if (isTarget) {
                      if (simStep === 2) rowClass += "bg-indigo-100 text-indigo-900";
                      else if (simStep >= 3) {
                        rowClass += pte.valid ? "bg-emerald-100 text-emerald-900" : "bg-rose-100 text-rose-900";
                      }
                    } else {
                      rowClass += "hover:bg-slate-50 text-slate-600";
                    }

                    return (
                      <tr key={idx} className={rowClass}>
                        <td className="px-3 py-2 font-medium">
                          {idx} <span className="text-xs opacity-50">({toBin(idx, 4)})</span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-block w-4 h-4 rounded-sm ${pte.valid ? 'bg-emerald-400 text-white' : 'bg-rose-400 text-white'} text-[10px] leading-4`}>
                            {pte.valid ? '1' : '0'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center opacity-50">{pte.dirty ? '1' : '0'}</td>
                        <td className="px-3 py-2 text-center opacity-50">{pte.ref ? '1' : '0'}</td>
                        <td className="px-3 py-2">
                          {pte.valid ? (
                            <span className="font-bold text-emerald-700">{pte.ppn}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Physical Memory */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex-1 flex flex-col">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0