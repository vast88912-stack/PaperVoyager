import React, { useState, useRef, useEffect } from 'react';

type Strategy = 'chaining' | 'linear' | 'quadratic' | 'cuckoo';
type LogEntry = { id: number; type: 'info' | 'success' | 'error' | 'probe'; message: string };

const TABLE_SIZE = 11;
const CUCKOO_SIZE = 7;
const ANIMATION_SPEED = 600;

// Helper to generate simple deterministic hashes
const getHash1 = (key: string, cap: number) => {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) % cap;
  }
  return h;
};

const getHash2 = (key: string, cap: number) => {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 37 + key.charCodeAt(i)) % cap;
  }
  return h;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function App() {
  const [strategy, setStrategy] = useState<Strategy>('linear');
  const [inputValue, setInputValue] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const logIdCounter = useRef(0);

  // Data Structures State
  const [chainingTable, setChainingTable] = useState<string[][]>(Array(TABLE_SIZE).fill([]));
  const [openTable, setOpenTable] = useState<Array<{ key: string | null; tombstone: boolean }>>(
    Array(TABLE_SIZE).fill({ key: null, tombstone: false })
  );
  const [cuckooTable, setCuckooTable] = useState<{ t1: (string | null)[]; t2: (string | null)[] }>({
    t1: Array(CUCKOO_SIZE).fill(null),
    t2: Array(CUCKOO_SIZE).fill(null),
  });

  // Visual State
  const [highlight, setHighlight] = useState<{ index: number; table?: number } | null>(null);

  const addLog = (type: LogEntry['type'], message: string) => {
    setLogs((prev) => [...prev, { id: logIdCounter.current++, type, message }]);
  };

  const clearLogs = () => setLogs([]);

  const resetTables = () => {
    setChainingTable(Array(TABLE_SIZE).fill([]));
    setOpenTable(Array(TABLE_SIZE).fill({ key: null, tombstone: false }));
    setCuckooTable({ t1: Array(CUCKOO_SIZE).fill(null), t2: Array(CUCKOO_SIZE).fill(null) });
    clearLogs();
    setHighlight(null);
  };

  useEffect(() => {
    resetTables();
  }, [strategy]);

  const handleAction = async (action: 'insert' | 'find' | 'delete') => {
    const key = inputValue.trim();
    if (!key || isAnimating) return;
    setIsAnimating(true);
    clearLogs();
    setHighlight(null);

    try {
      if (strategy === 'chaining') await runChaining(action, key);
      else if (strategy === 'linear' || strategy === 'quadratic') await runOpenAddressing(action, key, strategy);
      else if (strategy === 'cuckoo') await runCuckoo(action, key);
    } finally {
      setIsAnimating(false);
      setHighlight(null);
      setInputValue('');
    }
  };

  // --- Chaining Logic ---
  const runChaining = async (action: 'insert' | 'find' | 'delete', key: string) => {
    const idx = getHash1(key, TABLE_SIZE);
    addLog('info', `${action.toUpperCase()} '${key}'. Hash: ${idx}`);
    setHighlight({ index: idx });
    await sleep(ANIMATION_SPEED);

    let currentTable = [...chainingTable];
    let bucket = [...currentTable[idx]];

    if (action === 'insert') {
      if (bucket.includes(key)) {
        addLog('error', `Key '${key}' already exists in bucket ${idx}`);
      } else {
        bucket.push(key);
        currentTable[idx] = bucket;
        setChainingTable(currentTable);
        addLog('success', `Appended '${key}' to bucket ${idx}`);
      }
    } else if (action === 'find') {
      if (bucket.includes(key)) addLog('success', `Found '${key}' in bucket ${idx}`);
      else addLog('error', `Key '${key}' not found`);
    } else if (action === 'delete') {
      const keyIdx = bucket.indexOf(key);
      if (keyIdx > -1) {
        bucket.splice(keyIdx, 1);
        currentTable[idx] = bucket;
        setChainingTable(currentTable);
        addLog('success', `Removed '${key}' from bucket ${idx}`);
      } else {
        addLog('error', `Key '${key}' not found to delete`);
      }
    }
  };

  // --- Open Addressing Logic (Linear & Quadratic) ---
  const runOpenAddressing = async (action: 'insert' | 'find' | 'delete', key: string, strat: 'linear' | 'quadratic') => {
    const startIdx = getHash1(key, TABLE_SIZE);
    addLog('info', `${action.toUpperCase()} '${key}'. Initial Hash: ${startIdx}`);

    let currentTable = [...openTable];
    let steps = 0;

    while (steps < TABLE_SIZE) {
      const offset = strat === 'linear' ? steps : steps * steps;
      const idx = (startIdx + offset) % TABLE_SIZE;
      
      setHighlight({ index: idx });
      if (steps > 0) addLog('probe', `Probing index ${idx} (step ${steps})`);
      await sleep(ANIMATION_SPEED);

      const cell = currentTable[idx];

      if (action === 'insert') {
        if (cell.key === key && !cell.tombstone) {
          addLog('error', `Key '${key}' already exists at index ${idx}`);
          return;
        }
        if (cell.key === null || cell.tombstone) {
          currentTable[idx] = { key, tombstone: false };
          setOpenTable(currentTable);
          addLog('success', `Inserted at index ${idx}`);
          return;
        }
      } else if (action === 'find' || action === 'delete') {
        if (cell.key === null) {
          addLog('error', `Encountered empty slot at ${idx}. Key not found.`);
          return;
        }
        if (cell.key === key && !cell.tombstone) {
          if (action === 'find') {
            addLog('success', `Found at index ${idx}`);
          } else {
            currentTable[idx] = { key, tombstone: true };
            setOpenTable(currentTable);
            addLog('success', `Deleted at index ${idx} (marked as tombstone)`);
          }
          return;
        }
      }
      steps++;
    }
    addLog('error', `Operation failed. Table full or max probes reached.`);
  };

  // --- Cuckoo Logic ---
  const runCuckoo = async (action: 'insert' | 'find' | 'delete', keyToInsert: string) => {
    let t1 = [...cuckooTable.t1];
    let t2 = [...cuckooTable.t2];

    if (action === 'find' || action === 'delete') {
      const idx1 = getHash1(keyToInsert, CUCKOO_SIZE);
      setHighlight({ index: idx1, table: 1 });
      addLog('info', `Checking Table 1 at index ${idx1}`);
      await sleep(ANIMATION_SPEED);
      if (t1[idx1] === keyToInsert) {
        if (action === 'find') addLog('success', `Found in Table 1 at ${idx1}`);
        else { t1[idx1] = null; setCuckooTable({ t1, t2 }); addLog('success', `Deleted from Table 1`); }
        return;
      }

      const idx2 = getHash2(keyToInsert, CUCKOO_SIZE);
      setHighlight({ index: idx2, table: 2 });
      addLog('probe', `Checking Table 2 at index ${idx2}`);
      await sleep(ANIMATION_SPEED);
      if (t2[idx2] === keyToInsert) {
        if (action === 'find') addLog('success', `Found in Table 2 at ${idx2}`);
        else { t2[idx2] = null; setCuckooTable({ t1, t2 }); addLog('success', `Deleted from Table 2`); }
        return;
      }
      addLog('error', `Key '${keyToInsert}' not found`);
      return;
    }

    // Insert Logic
    let currentKey = keyToInsert;
    let tableId = 1;
    let kicks = 0;
    const MAX_KICKS = 6;

    addLog('info', `Starting Cuckoo insert for '${currentKey}'`);

    // Pre-check existence
    if (t1[getHash1(currentKey, CUCKOO_SIZE)] === currentKey || t2[getHash2(currentKey, CUCKOO_SIZE)] === currentKey) {
        addLog('error', `Key '${currentKey}' already exists`);
        return;
    }

    while (kicks < MAX_KICKS) {
      if (tableId === 1) {
        const idx = getHash1(currentKey, CUCKOO_SIZE);
        setHighlight({ index: idx, table: 1 });
        await sleep(ANIMATION_SPEED);

        if (t1[idx] === null) {
          t1[idx] = currentKey;
          setCuckooTable({ t1, t2 });
          addLog('success', `Inserted '${currentKey}' in Table 1[${idx}]`);
          return;
        } else {
          const kicked = t1[idx]!;
          t1[idx] = currentKey;
          setCuckooTable({ t1, t2 });
          addLog('probe', `Collision! Kicked '${kicked}' from Table 1[${idx}]`);
          currentKey = kicked;
          tableId = 2;
        }
      } else {
        const idx = getHash2(currentKey, CUCKOO_SIZE);
        setHighlight({ index: idx, table: 2 });
        await sleep(ANIMATION_SPEED);

        if (t2[idx] === null) {
          t2[idx] = currentKey;
          setCuckooTable({ t1, t2 });
          addLog('success', `Inserted '${currentKey}' in Table 2[${idx}]`);
          return;
        } else {
          const kicked = t2[idx]!;
          t2[idx] = currentKey;
          setCuckooTable({ t1, t2 });
          addLog('probe', `Collision! Kicked '${kicked}' from Table 2[${idx}]`);
          currentKey = kicked;
          tableId = 1;
        }
      }
      kicks++;
    }
    addLog('error', `Cycle detected after ${MAX_KICKS} kicks! Rehash required.`);
  };

  // --- Renderers ---
  const getCellClass = (isHighlighted: boolean, isEmpty: boolean, isTombstone: boolean = false) => {
    let base = "relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 font-bold text-lg transition-all duration-300 ";
    if (isHighlighted) return base + "border-rose-400 bg-rose-100 text-rose-800 scale-110 shadow-lg z-10";
    if (isTombstone) return base + "border-slate-300 bg-slate-100 text-slate-400 border-dashed opacity-70";
    if (isEmpty) return base + "border-slate-200 bg-white text-slate-300";
    return base + "border-sky-300 bg-sky-50 text-sky-700 shadow-sm";
  };

  const renderChainingTable = () => (
    <div className="flex flex-col gap-3">
      {chainingTable.map((bucket, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="w-8 text-right font-mono text-slate-400 text-sm">{idx}</div>
          <div className={getCellClass(highlight?.index === idx, false) + " !w-12 !h-12 !bg-slate-50 !border-slate-200 !text-slate-400"}>
            {/* Base array slot */}
          </div>
          <div className="flex gap-2 min-w-[200px] p-2 bg-slate-50 rounded-lg border border-slate-100 min-h-[60px] overflow-x-auto">
            {bucket.length === 0 && <span className="text-slate-300 italic my-auto ml-2 text-sm">empty</span>}
            {bucket.map((item, i) => (
              <div key={i} className="flex items-center">
                <div className="px-4 py-2 bg-emerald-100 border-2 border-emerald-300 text-emerald-800 font-bold rounded-lg shadow-sm whitespace-nowrap">
                  {item}
                </div>
                {i < bucket.length - 1 && <div className="w-4 h-0.5 bg-emerald-300 mx-1"></div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderOpenTable = () => (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
      {openTable.map((cell, idx) => (
        <div key={idx} className="flex flex-col items-center gap-1">
          <div className="font-mono text-slate-400 text-xs">{idx}</div>
          <div className={getCellClass(highlight?.index === idx, cell.key === null, cell.tombstone)}>
            {cell.tombstone ? <span className="text-2xl">☠️</span> : cell.key}
            {cell.tombstone && <div className="absolute inset-0 flex items-center justify-center opacity-20"><div className="w-full h-1 bg-slate-900 rotate-45"></div></div>}
          </div>
        </div>
      ))}
    </div>
  );

  const renderCuckooTable = () => (
    <div className="flex flex-col md:flex-row gap-8 w-full justify-center">
      {[1, 2].map((tableNum) => {
        const tableData = tableNum === 1 ? cuckooTable.t1 : cuckooTable.t2;
        const colorClass = tableNum === 1 ? 'fuchsia' : 'amber';
        return (
          <div key={tableNum} className={`flex-1 p-6 rounded-3xl border-2 border-${colorClass}-100 bg-${colorClass}-50/30`}>
            <h3 className={`text-center font-bold text-${colorClass}-800 mb-6 text-xl tracking-tight`}>Table {tableNum} <span className="text-sm font-normal opacity-70">(Hash {tableNum})</span></h3>
            <div className="grid grid-cols-3 gap-4 justify-items-center">
              {tableData.map((key, idx) => {
                const isHighlighted = highlight?.index === idx && highlight?.table === tableNum;
                let cellStyle = "relative flex items-center justify-center w-16 h-16 rounded-2xl border-2 font-bold text-lg transition-all duration-300 ";
                if (isHighlighted) cellStyle += "border-rose-400 bg-rose-100 text-rose-800 scale-110 shadow-xl z-10";
                else if (key === null) cellStyle += `border-${colorClass}-200 bg-white text-${colorClass}-300`;
                else cellStyle += `border-${colorClass}-400 bg-${colorClass}-100 text-${colorClass}-900 shadow-md`;

                return (
                  <div key={idx} className="flex flex-col items-center gap-2">
                    <div className={cellStyle}>
                      {key}
                    </div>
                    <div className="font-mono text-slate-400 text-xs bg-white px-2 rounded-full border border-slate-100 shadow-sm">{idx}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans p-4 md:p-8 selection:bg-rose-200">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="text-center space-y-4 pt-4">
          <div className="inline-block px-4 py-1.5 rounded-full bg-rose-100 text-rose-700 font-semibold text-sm mb-2 shadow-sm border border-rose-200">
            Hash Map Explorer
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
            Collision Strategies
          </h1>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg">
            Watch how different hash map implementations handle collisions in real-time.
          </p>
        </header>

        {/* Strategy Selector */}
        <div className="flex flex-wrap justify-center gap-3">
          {(['chaining', 'linear', 'quadratic', 'cuckoo'] as Strategy[]).map((s) => (
            <button
              key={s}
              onClick={() => setStrategy(s)}
              disabled={