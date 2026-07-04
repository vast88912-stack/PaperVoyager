import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  Database, 
  Cpu, 
  AlertCircle, 
  CheckCircle2, 
  History,
  ArrowRight,
  Shield,
  Layers
} from 'lucide-react';

// --- Types & Constants ---
type Permission = 'R' | 'W' | 'X';

interface PageTableEntry {
  vpn: number;
  valid: boolean;
  ppn: number | null;
  dirty: boolean;
  referenced: boolean;
  permissions: Permission[];
}

interface TranslationResult {
  id: string;
  va: number;
  vpn: number;
  offset: number;
  isHit: boolean;
  pa: number | null;
  timestamp: Date;
}

const PAGE_SIZE_BITS = 12; // 4KB pages
const PAGE_SIZE = 1 << PAGE_SIZE_BITS;
const NUM_PAGES = 16; // 4-bit VPN for simplicity in visualization (16 entries)
const ADDRESS_MASK = 0xFFFF; // 16-bit address space

// --- Helper Functions ---
const toHex = (num: number | null, padding: number = 4) => {
  if (num === null) return '-';
  return `0x${num.toString(16).toUpperCase().padStart(padding, '0')}`;
};

const toBin = (num: number, padding: number) => {
  return num.toString(2).padStart(padding, '0');
};

const generateInitialPageTable = (): PageTableEntry[] => {
  return Array.from({ length: NUM_PAGES }, (_, i) => {
    const isValid = Math.random() > 0.4; // 60% chance of being valid initially
    return {
      vpn: i,
      valid: isValid,
      ppn: isValid ? Math.floor(Math.random() * 64) : null, // 64 physical pages available
      dirty: isValid ? Math.random() > 0.7 : false,
      referenced: isValid ? Math.random() > 0.5 : false,
      permissions: ['R', Math.random() > 0.3 ? 'W' : 'X'], // Basic mock permissions
    };
  });
};

export default function App() {
  // --- State ---
  const [pageTable, setPageTable] = useState<PageTableEntry[]>([]);
  const [inputHex, setInputHex] = useState<string>('');
  const [history, setHistory] = useState<TranslationResult[]>([]);
  const [activeVpn, setActiveVpn] = useState<number | null>(null);
  const [stats, setStats] = useState({ hits: 0, faults: 0 });
  const [isTranslating, setIsTranslating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Initialization ---
  useEffect(() => {
    setPageTable(generateInitialPageTable());
  }, []);

  // --- Actions ---
  const handleTranslate = () => {
    if (!inputHex) return;
    
    // Parse input (remove 0x if present, parse as hex)
    const cleanInput = inputHex.replace(/^0x/i, '');
    let va = parseInt(cleanInput, 16);
    
    if (isNaN(va)) {
      alert("Invalid Hex Address");
      return;
    }
    
    // Mask to 16 bits
    va = va & ADDRESS_MASK;
    
    setIsTranslating(true);
    
    // Extract VPN and Offset
    const vpn = va >> PAGE_SIZE_BITS;
    const offset = va & (PAGE_SIZE - 1);
    
    setActiveVpn(vpn);

    // Simulate lookup delay for visual effect
    setTimeout(() => {
      const entry = pageTable[vpn];
      const isHit = entry.valid;
      
      let pa = null;
      if (isHit && entry.ppn !== null) {
        pa = (entry.ppn << PAGE_SIZE_BITS) | offset;
        setStats(s => ({ ...s, hits: s.hits + 1 }));
        
        // Update referenced bit
        setPageTable(prev => {
          const newPt = [...prev];
          newPt[vpn] = { ...newPt[vpn], referenced: true };
          return newPt;
        });
      } else {
        setStats(s => ({ ...s, faults: s.faults + 1 }));
      }

      const result: TranslationResult = {
        id: Math.random().toString(36).substr(2, 9),
        va,
        vpn,
        offset,
        isHit,
        pa,
        timestamp: new Date()
      };

      setHistory(prev => [result, ...prev].slice(0, 5)); // Keep last 5
      setIsTranslating(false);
      
      // Clear highlight after a moment
      setTimeout(() => setActiveVpn(null), 1500);
      
    }, 600);
  };

  const generateRandomAddress = () => {
    // Bias towards valid pages to show successful translations more often
    const validEntries = pageTable.filter(e => e.valid);
    let targetVpn;
    if (validEntries.length > 0 && Math.random() > 0.3) {
      targetVpn = validEntries[Math.floor(Math.random() * validEntries.length)].vpn;
    } else {
      targetVpn = Math.floor(Math.random() * NUM_PAGES);
    }
    const offset = Math.floor(Math.random() * PAGE_SIZE);
    const va = (targetVpn << PAGE_SIZE_BITS) | offset;
    setInputHex(toHex(va).replace('0x', ''));
    
    // Focus and auto-translate
    if (inputRef.current) {
      setTimeout(() => handleTranslate(), 100);
    }
  };

  // --- Sub-components ---
  const StatusBadge = ({ active, trueText, falseText, color }: any) => (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
      active 
        ? `bg-${color}-50 text-${color}-700 border-${color}-200` 
        : 'bg-slate-50 text-slate-400 border-slate-100'
    }`}>
      {active ? trueText : falseText}
    </span>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans text-slate-800 flex justify-center">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Header Span */}
        <div className="lg:col-span-12 flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Layers className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Page Table Inspector</h1>
              <p className="text-sm text-slate-500">Virtual to Physical Address Translation</p>
            </div>
          </div>
          
          <div className="flex space-x-6 text-sm">
            <div className="flex flex-col items-end">
              <span className="text-slate-500 uppercase tracking-wider text-xs font-semibold">Page Faults</span>
              <span className="text-2xl font-mono font-light text-rose-600">{stats.faults}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-slate-500 uppercase tracking-wider text-xs font-semibold">Page Hits</span>
              <span className="text-2xl font-mono font-light text-emerald-600">{stats.hits}</span>
            </div>
          </div>
        </div>

        {/* Left Column: Interaction & Analysis */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          
          {/* Translation Simulator */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-slate-500" />
              <h2 className="font-semibold text-slate-700 text-sm">MMU Simulator</h2>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Virtual Address (Hex)
                </label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">0x</span>
                    <input
                      ref={inputRef}
                      type="text"
                      maxLength={4}
                      value={inputHex}
                      onChange={(e) => setInputHex(e.target.value.replace(/[^0-9a-fA-F]/g, ''))}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono uppercase text-sm"
                      placeholder="e.g. 1A4F"
                      onKeyDown={(e) => e.key === 'Enter' && handleTranslate()}
                    />
                  </div>
                  <button 
                    onClick={generateRandomAddress}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                    title="Generate Random Address"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button
                onClick={handleTranslate}
                disabled={!inputHex || isTranslating}
                className={`w-full py-2.5 rounded-lg font-medium text-white transition-all flex items-center justify-center space-x-2 ${
                  isTranslating 
                    ? 'bg-indigo-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow'
                }`}
              >
                <span>{isTranslating ? 'Translating...' : 'Translate Address'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Bit Breakdown Visualization */}
              {inputHex && !isTranslating && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Address Breakdown</p>
                  <div className="flex text-center font-mono text-xs overflow-hidden rounded border border-slate-200">
                    <div className="flex-1 bg-indigo-50 border-r border-indigo-100 py-2">
                      <div className="text-indigo-800 font-bold">{toBin(parseInt(inputHex || '0', 16) >> PAGE_SIZE_BITS, 4)}</div>
                      <div className="text-[10px] text-indigo-500 uppercase mt-0.5">VPN (4b)</div>
                    </div>
                    <div className="flex-[3] bg-slate-50 py-2">
                      <div className="text-slate-600 tracking-widest">{toBin(parseInt(inputHex || '0', 16) & (PAGE_SIZE - 1), 12)}</div>
                      <div className="text-[10px] text-slate-400 uppercase mt-0.5">Offset (12b)</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Translation History Log */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center space-x-2">
              <History className="w-4 h-4 text-slate-500" />
              <h2 className="font-semibold text-slate-700 text-sm">Translation Log</h2>
            </div>
            <div className="p-0 overflow-y-auto flex-1">
              {history.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center">
                  <Database className="w-8 h-8 mb-2 opacity-20" />
                  <p>No translations yet.</p>
                  <p className="text-xs mt-1">Simulate an access to see results.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {history.map((item) => (
                    <li key={item.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-sm text-slate-700 font-medium">
                          {toHex(item.va)}
                        </span>
                        {item.isHit ? (
                          <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Hit
                          </span>
                        ) : (
                          <span className="flex items-center text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                            <AlertCircle className="w-3 h-3 mr-1" /> Fault
                          </span>
                        )}
                      </div>
                      <div className="flex items-center text-xs text-slate-500 space-x-2 font-mono">
                        <span>VPN: {toHex(item.vpn, 1)}</span>
                        <span>→</span>
                        {item.isHit ? (
                          <span className="text-slate-800 font-medium">PA: {toHex(item.pa)}</span>
                        ) : (
                          <span className="text-rose-400">Trap to OS</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: The Page Table View */}
        <div className="lg:col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-slate-500" />
              <h2 className="font-semibold text-slate-700 text-sm">Hardware Page Table Structure</h2>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Base Reg: 0xCR3
            </div>
          </div>
          
          <div className="overflow-x-auto flex-1 p-0">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100/50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="p-3 pl-6 font-semibold w-16">Index</th>
                  <th className="p-3 font-semibold text-center w-24">Status</th>
                  <th className="p-3 font-semibold w-24">PPN</th>
                  <th className="p-3 font-semibold text-center w-20">Dirty</th>
                  <th className="p-3 font-semibold text-center w-20">Ref</th>
                  <th className="p-3 font-semibold pr-6">Access Rights</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageTable.map((entry) => {
                  const isHighlighted = activeVpn === entry.vpn;
                  return (
                    <tr 
                      key={entry.vpn} 
                      className={`
                        transition-colors duration-300
                        ${isHighlighted ? 'bg-indigo-50 shadow-inner' : 'hover:bg-slate-50'}
                        ${!entry.valid && !isHighlighted ? 'opacity-60' : ''}
                      `}
                    >
                      {/* Index / VPN */}
                      <td className={`p-3 pl-6 font-mono font-medium border-l-4 ${
                        isHighlighted 
                          ? 'border-indigo-500 text-indigo-700' 
                          : 'border-transparent text-slate-600'
                      }`}>
                        {entry.vpn.toString(10).padStart(2, '0')}
                      </td>
                      
                      {/* Valid Bit */}
                      <td className="p-3 text-center">
                        <StatusBadge 
                          active={entry.valid} 
                          trueText="Valid" 
                          falseText="Invalid" 
                          color="emerald" 
                        />
                      </td>
                      
                      {/* Physical Page Number */}
                      <td className="p-3 font-mono text-slate-700">
                        {entry.valid ? (
                           <span className={isHighlighted ? 'font-bold text-indigo-700' : ''}>
                             {toHex(entry.ppn, 2)}
                           </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      
                      {/* Dirty Bit */}
                      <td className="p-3 text-center">
                         <StatusBadge 
                          active={entry.valid && entry.dirty} 
                          trueText="D" 
                          falseText="-" 
                          color="amber" 
                        />
                      </td>
                      
                      {/* Referenced Bit */}
                      <td className="p-3 text-center">
                        <StatusBadge 
                          active={entry.valid && entry.referenced} 
                          trueText="R" 
                          falseText="-" 
                          color="blue" 
                        />
                      </td>

                      {/* Permissions */}
                      <td className="p-3 pr-6">
                        <div className="flex items-center space-x-1 text-xs font-mono">
                          <Shield className={`w-3 h-3 mr-1 ${entry.valid ? 'text-slate-400' : 'text-slate-200'}`} />
                          <span className={entry.valid && entry.permissions.includes('R') ? 'text-slate-700 font-bold' : 'text-slate-300'}>R</span>
                          <span className={entry.valid && entry.permissions.includes('W') ? 'text-slate-700 font-bold' : 'text-slate-300'}>W</span>
                          <span className={entry.valid && entry.permissions.includes('X') ? 'text-slate-700 font-bold' : 'text-slate-300'}>X</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Footer Legend */}
          <div className="bg-slate-50 border-t border-slate-200 p-3 px-6 flex items-center justify-between text-xs text-slate-500">
            <div className="flex space-x-6">
              <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>Valid (Present in RAM)</span>
              <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-rose-200 mr-2"></div>Invalid (On Disk / Fault)</span>
            </div>
            <div className="font-mono">
              Total Size: {NUM_PAGES * 4} Bytes (Assumes 4B PTE)
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}