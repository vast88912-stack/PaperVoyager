import React, { useState, useRef, useEffect } from 'react';
import { Play, Search, Trash2, Info, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';

// --- Types & Constants ---
type Strategy = 'chaining' | 'linear' | 'quadratic' | 'cuckoo';

const TABLE_SIZE = 7;
const ANIMATION_SPEED = 600;

interface LogEntry {
  id: string;
  msg: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface ActiveState {
  index: number;
  table?: number; // For cuckoo
  status: 'probe' | 'success' | 'error' | 'tombstone';
}

// --- Hash Functions ---
const hash1 = (key: string) => {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash + key.charCodeAt(i)) % TABLE_SIZE;
  }
  return hash;
};

const hash2 = (key: string) => {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash + key.charCodeAt(i) * 31) % TABLE_SIZE;
  }
  return hash;
};

// --- Helper Components ---
const Button = ({ onClick, disabled, variant, icon: Icon, children }: any) => {
  const baseStyle = "flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95";
  const variants = {
    insert: "bg-teal-300 hover:bg-teal-400 text-teal-900",
    find: "bg-blue-300 hover:bg-blue-400 text-blue-900",
    delete: "bg-rose-300 hover:bg-rose-400 text-rose-900",
    clear: "bg-gray-200 hover:bg-gray-300 text-gray-700"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant as keyof typeof variants]}`}>
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

export default function App() {
  // --- State ---
  const [strategy, setStrategy] = useState<Strategy>('linear');
  const [keyInput, setKeyInput] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeCell, setActiveCell] = useState<ActiveState | null>(null);

  // Data Structures
  const [oaTable, setOaTable] = useState<(string | null)[]>(Array(TABLE_SIZE).fill(null));
  const [tombstones, setTombstones] = useState<boolean[]>(Array(TABLE_SIZE).fill(false));
  const [chains, setChains] = useState<string[][]>(Array(TABLE_SIZE).fill([]));
  const [c1, setC1] = useState<(string | null)[]>(Array(TABLE_SIZE).fill(null));
  const [c2, setC2] = useState<(string | null)[]>(Array(TABLE_SIZE).fill(null));

  const logEndRef = useRef<HTMLDivElement>(null);

  // --- Helpers ---
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
  
  const addLog = (msg: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), msg, type }]);
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const clearTable = () => {
    setOaTable(Array(TABLE_SIZE).fill(null));
    setTombstones(Array(TABLE_SIZE).fill(false));
    setChains(Array(TABLE_SIZE).fill([]));
    setC1(Array(TABLE_SIZE).fill(null));
    setC2(Array(TABLE_SIZE).fill(null));
    setLogs([]);
    setActiveCell(null);
  };

  const handleStrategyChange = (s: Strategy) => {
    setStrategy(s);
    clearTable();
  };

  // --- Operations Logic ---

  // 1. Separate Chaining
  const chainingOp = async (type: 'insert' | 'find' | 'delete', key: string) => {
    const idx = hash1(key);
    addLog(`Hash('${key}') = ${idx}`, 'info');
    setActiveCell({ index: idx, status: 'probe' });
    await sleep(ANIMATION_SPEED);

    const currentChain = [...chains[idx]];
    const foundIdx = currentChain.indexOf(key);

    if (type === 'insert') {
      if (foundIdx === -1) {
        currentChain.push(key);
        const newChains = [...chains];
        newChains[idx] = currentChain;
        setChains(newChains);
        setActiveCell({ index: idx, status: 'success' });
        addLog(`Inserted '${key}' at bucket ${idx}`, 'success');
      } else {
        setActiveCell({ index: idx, status: 'error' });
        addLog(`'${key}' already exists in bucket ${idx}`, 'warning');
      }
    } else if (type === 'find') {
      if (foundIdx !== -1) {
        setActiveCell({ index: idx, status: 'success' });
        addLog(`Found '${key}' in bucket ${idx}`, 'success');
      } else {
        setActiveCell({ index: idx, status: 'error' });
        addLog(`'${key}' not found`, 'error');
      }
    } else if (type === 'delete') {
      if (foundIdx !== -1) {
        currentChain.splice(foundIdx, 1);
        const newChains = [...chains];
        newChains[idx] = currentChain;
        setChains(newChains);
        setActiveCell({ index: idx, status: 'tombstone' });
        addLog(`Deleted '${key}' from bucket ${idx}`, 'success');
      } else {
        setActiveCell({ index: idx, status: 'error' });
        addLog(`'${key}' not found to delete`, 'error');
      }
    }
    await sleep(ANIMATION_SPEED);
  };

  // 2. Open Addressing (Linear & Quadratic)
  const oaOp = async (type: 'insert' | 'find' | 'delete', key: string) => {
    const startIdx = hash1(key);
    addLog(`Base Hash('${key}') = ${startIdx}`, 'info');

    let i = 0;
    while (i < TABLE_SIZE) {
      const offset = strategy === 'linear' ? i : i * i;
      const idx = (startIdx + offset) % TABLE_SIZE;
      
      setActiveCell({ index: idx, status: 'probe' });
      addLog(`Probing index ${idx} (i=${i}, offset=${offset})`, 'info');
      await sleep(ANIMATION_SPEED);

      if (type === 'insert') {
        if (oaTable[idx] === key) {
          setActiveCell({ index: idx, status: 'error' });
          addLog(`'${key}' already exists`, 'warning');
          return;
        }
        if (oaTable[idx] === null || tombstones[idx]) {
          const newT = [...oaTable]; newT[idx] = key; setOaTable(newT);
          const newTomb = [...tombstones]; newTomb[idx] = false; setTombstones(newTomb);
          setActiveCell({ index: idx, status: 'success' });
          addLog(`Inserted '${key}' at index ${idx}`, 'success');
          return;
        }
      } else { // find or delete
        if (oaTable[idx] === key && !tombstones[idx]) {
          if (type === 'find') {
            setActiveCell({ index: idx, status: 'success' });
            addLog(`Found '${key}' at index ${idx}`, 'success');
          } else {
            const newTomb = [...tombstones]; newTomb[idx] = true; setTombstones(newTomb);
            setActiveCell({ index: idx, status: 'tombstone' });
            addLog(`Deleted '${key}' at index ${idx} (Tombstone)`, 'success');
          }
          return;
        }
        if (oaTable[idx] === null && !tombstones[idx]) {
           // Hit an empty spot (not a tombstone), stop search
           setActiveCell({ index: idx, status: 'error' });
           addLog(`Hit empty spot. '${key}' not found.`, 'error');
           return;
        }
      }
      i++;
    }
    setActiveCell(null);
    addLog(type === 'insert' ? 'Table is full!' : `'${key}' not found.`, 'error');
  };

  // 3. Cuckoo Hashing
  const cuckooOp = async (type: 'insert' | 'find' | 'delete', key: string) => {
    const idx1 = hash1(key);
    const idx2 = hash2(key);

    if (type === 'find' || type === 'delete') {
      setActiveCell({ index: idx1, table: 1, status: 'probe' });
      addLog(`Probing T1[${idx1}] = ${c1[idx1]}`, 'info');
      await sleep(ANIMATION_SPEED);
      if (c1[idx1] === key) {
        if (type === 'find') {
          setActiveCell({ index: idx1, table: 1, status: 'success' });
          addLog(`Found in Table 1`, 'success');
        } else {
          const newC1 = [...c1]; newC1[idx1] = null; setC1(newC1);
          setActiveCell({ index: idx1, table: 1, status: 'tombstone' });
          addLog(`Deleted from Table 1`, 'success');
        }
        return;
      }

      setActiveCell({ index: idx2, table: 2, status: 'probe' });
      addLog(`Probing T2[${idx2}] = ${c2[idx2]}`, 'info');
      await sleep(ANIMATION_SPEED);
      if (c2[idx2] === key) {
        if (type === 'find') {
          setActiveCell({ index: idx2, table: 2, status: 'success' });
          addLog(`Found in Table 2`, 'success');
        } else {
          const newC2 = [...c2]; newC2[idx2] = null; setC2(newC2);
          setActiveCell({ index: idx2, table: 2, status: 'tombstone' });
          addLog(`Deleted from Table 2`, 'success');
        }
        return;
      }
      setActiveCell(null);
      addLog(`'${key}' not found`, 'error');
      return;
    }

    if (type === 'insert') {
      // Check if exists
      if (c1[idx1] === key || c2[idx2] === key) {
        addLog(`'${key}' already exists`, 'warning');
        return;
      }

      let currKey = key;
      let targetT = 1;
      const MAX_KICKS = 5;

      for (let kicks = 0; kicks < MAX_KICKS; kicks++) {
        const idx = targetT === 1 ? hash1(currKey) : hash2(currKey);
        setActiveCell({ index: idx, table: targetT, status: 'probe' });
        addLog(`Trying to place '${currKey}' in T${targetT}[${idx}]`, 'info');
        await sleep(ANIMATION_SPEED);

        const existing = targetT === 1 ? c1[idx] : c2[idx];
        
        if (targetT === 1) {
          const n = [...c1]; n[idx] = currKey; setC1(n);
        } else {
          const n = [...c2]; n[idx] = currKey; setC2(n);
        }

        if (!existing) {
          setActiveCell({ index: idx, table: targetT, status: 'success' });
          addLog(`Successfully placed '${currKey}'`, 'success');
          return;
        }

        addLog(`Kicked out '${existing}'! Relocating...`, 'warning');
        currKey = existing;
        targetT = targetT === 1 ? 2 : 1;
        await sleep(ANIMATION_SPEED);
      }
      setActiveCell(null);
      addLog(`Max kicks reached! Cycle detected. Needs rehash.`, 'error');
    }
  };

  const handleOp = async (type: 'insert' | 'find' | 'delete') => {
    if (!keyInput) return;
    setIsAnimating(true);
    setLogs([]);
    setActiveCell(null);

    addLog(`--- ${type.toUpperCase()}: '${keyInput}' ---`, 'info');

    if (strategy === 'chaining') await chainingOp(type, keyInput);
    else if (strategy === 'linear' || strategy === 'quadratic') await oaOp(type, keyInput);
    else if (strategy === 'cuckoo') await cuckooOp(type, keyInput);

    setActiveCell(null);
    setIsAnimating(false);
    setKeyInput('');
  };

  // --- Render Helpers ---
  const getCellClasses = (isActive: boolean, status?: string) => {
    let base = "h-16 flex items-center justify-center rounded-xl border-4 text-lg font-bold transition-all duration-300 relative bg-white ";
    if (!isActive) return base + "border-slate-200 text-slate-600 shadow-sm";
    
    if (status === 'probe') return base + "border-amber-400 bg-amber-100 text-amber-800 scale-105 shadow-md ring-4 ring-amber-200/50 z-10";
    if (status === 'success') return base + "border-emerald-400 bg-emerald-100 text-emerald-800 scale-105 shadow-md z-10";
    if (status === 'error') return base + "border-rose-400 bg-rose-100 text-rose-800 scale-105 shadow-md z-10";
    if (status === 'tombstone') return base + "border-slate-400 bg-slate-200 text-slate-500 scale-95 border-dashed";
    
    return base;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8 font-sans selection:bg-pink-200">
      
      {/* Header */}
      <header className="max-w-5xl mx-auto mb-8 bg-indigo-100 border-b-4 border-indigo-200 p-6 rounded-3xl flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold text-indigo-900 flex items-center gap-3">
            <RefreshCw className="text-indigo-500" />
            Hash Collision Explorer
          </h1>
          <p className="text-indigo-700 mt-1 font-medium text-sm">Playful interactive visualization of hash map collision strategies.</p>
        </div>
        
        {/* Strategy Selector */}
        <div className="flex gap-2 bg-white/60 p-1.5 rounded-2xl border-2 border-indigo-200/50">
          {(['chaining', 'linear', 'quadratic', 'cuckoo'] as Strategy[]).map(s => (
            <button
              key={s}
              onClick={() => handleStrategyChange(s)}
              disabled={isAnimating}
              className={`px-4 py-2 rounded-xl font-bold capitalize transition-all ${
                strategy === s 
                  ? 'bg-indigo-500 text-white shadow-md' 
                  : 'text-indigo-600 hover:bg-indigo-200/50 disabled:opacity-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Controls & Logs Panel */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* Controls */}
          <div className="bg-white p-6 rounded-3xl border-4 border-pink-100 shadow-sm flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-pink-400 uppercase tracking-wider mb-1 block">Key to Process</label>
              <input 
                type="text" 
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                disabled={isAnimating}
                placeholder="e.g. Apple"
                className="w-full bg-pink-50 border-2 border-pink-200 rounded-xl px-4 py-3 text-pink-900 font-bold focus:outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100 transition-all placeholder:text-pink-300"
                onKeyDown={e => e.key === 'Enter' && handleOp('insert')}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button onClick={() => handleOp('insert')} disabled={isAnimating || !keyInput} variant="insert" icon={Play}>Insert</Button>
              <Button onClick={() => handleOp('find')} disabled={isAnimating || !keyInput} variant="find" icon={Search}>Find</Button>
              <Button onClick={() => handleOp('delete')} disabled={isAnimating || !keyInput} variant="delete" icon={Trash2}>Delete</Button>
              <Button onClick={clearTable} disabled={isAnimating} variant="clear" icon={RefreshCw}>Clear</Button>
            </div>
          </div>

          {/* Logs */}
          <div className="bg-white flex-1 rounded-3xl border-4 border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[300px]">
            <div className="bg-slate-100 p-3 border-b-2 border-slate-200 text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
              <Info size={16} /> Operation Log
            </div>
            <div className="p-4 overflow-y-auto flex-1 font-mono text-sm flex flex-col gap-2 bg-slate-50 max-h-[400px]">
              {logs.map(log => (
                <div key={log.id} className={`p-2 rounded-lg border-l-4 animate-in fade-in slide-in-from-right-2 ${
                  log.type === 'info' ? 'bg-blue-50 border-blue-400 text-blue-800' :
                  log.type === 'success' ? 'bg-emerald-50 border-emerald-400 text-emerald-800' :
                  log.type === 'warning' ? 'bg-amber-50 border-amber-400 text-amber-800' :
                  'bg-rose-50 border-rose-400 text-rose-800'
                }`}>
                  {log.msg}
                </div>
              ))}
              <div ref={logEndRef} />
              {logs.length === 0 && <div className="text-slate-400 text-center mt-10 italic">No operations yet.</div>}
            </div>
          </div>
        </div>

        {/* Visualization Area */}
        <div className="lg:col-span-2 bg-white rounded-3xl border-4 border-blue-100 shadow-sm p-8 min-h-[500px] flex flex-col">
          
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-blue-900 capitalize flex items-center gap-2">
               {strategy} Strategy
               {(strategy === 'linear' || strategy === 'quadratic') && <span className="text-sm font-medium bg-blue-100 text-blue-600 px-2 py-1 rounded-lg ml-2">Open Addressing</span>}
            </h2>
            <div className="text-sm font-bold text-blue-400">Table Size: {TABLE_SIZE}</div>
          </div>

          <div className="flex-1 flex items-center justify-center">
            
            {/* --- Render Separate Chaining --- */}
            {strategy === 'chaining' && (
              <div className="flex gap-4 w-full justify-center">
                {chains.map((chain, idx) => {
                  const isActive = activeCell?.index === idx;
                  return (
                    <div key={idx} className="flex flex-col items-center gap-2">
                      <div className="text-blue-300 font-bold text-sm mb-1">{idx}</div>
                      {/* Base Bucket */}
                      <div className={getCellClasses(isActive, isActive ? activeCell.status : undefined)}>
                        {chain.length > 0 ? chain[0] : <span className="text-slate-300">—</span>}
                        {isActive && <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-amber-400 animate-ping opacity-75" />}
                      </div>
                      
                      {/* Chain elements */}
                      {chain.length > 1 && (
                        <div className="flex flex-col gap-2 items-center w-full">
                          <div className="h-4 border-l-4 border-dashed border-blue-200"></div>
                          {chain.slice(1).map((item, cIdx) => (
                            <div key={cIdx} className="w-full h-12 flex items-center justify-center rounded-lg border-2 border-blue-200 bg-blue-50 text-blue-800 font-bold shadow-sm relative">
                              {item}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* --- Render Open Addressing --- */}
            {(strategy === 'linear' || strategy === 'quadratic') &&