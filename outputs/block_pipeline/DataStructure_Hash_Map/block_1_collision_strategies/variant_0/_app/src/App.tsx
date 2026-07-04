import React, { useState, useRef, useEffect } from 'react';

type Strategy = 'chaining' | 'linear' | 'quadratic' | 'cuckoo';

interface CellData {
  key: number;
  deleted?: boolean;
}

interface ActiveCell {
  table: number;
  index: number;
  status: 'probing' | 'success' | 'error';
}

const TABLE_SIZE = 11;
const CUCKOO_SIZE = 7;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function App() {
  const [strategy, setStrategy] = useState<Strategy>('chaining');
  const [inputValue, setInputValue] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [, setTick] = useState(0);

  const forceRender = () => setTick((t) => t + 1);

  // Data structures
  const chainingRef = useRef<CellData[][]>(Array.from({ length: TABLE_SIZE }, () => []));
  const openAddrRef = useRef<(CellData | null)[]>(Array(TABLE_SIZE).fill(null));
  const cuckooRef = useRef<(CellData | null)[][]>([
    Array(CUCKOO_SIZE).fill(null),
    Array(CUCKOO_SIZE).fill(null),
  ]);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, msg]);
  };

  const clearTable = () => {
    chainingRef.current = Array.from({ length: TABLE_SIZE }, () => []);
    openAddrRef.current = Array(TABLE_SIZE).fill(null);
    cuckooRef.current = [Array(CUCKOO_SIZE).fill(null), Array(CUCKOO_SIZE).fill(null)];
    setLogs([]);
    setActiveCell(null);
    forceRender();
  };

  const handleStrategyChange = (s: Strategy) => {
    setStrategy(s);
    clearTable();
  };

  const getHash = (k: number, size: number) => k % size;
  const getCuckooHash2 = (k: number) => (k * 5 + 3) % CUCKOO_SIZE;

  // --- CHAINING ---
  const runChaining = async (k: number, op: 'insert' | 'search' | 'delete') => {
    const h = getHash(k, TABLE_SIZE);
    addLog(`H(${k}) = ${k} % ${TABLE_SIZE} = ${h}`);
    setActiveCell({ table: 1, index: h, status: 'probing' });
    await sleep(600);

    const bucket = chainingRef.current[h];
    const existingIdx = bucket.findIndex((e) => e.key === k);

    if (op === 'insert') {
      if (existingIdx >= 0) {
        addLog(`Key ${k} already exists in bucket ${h}.`);
        setActiveCell({ table: 1, index: h, status: 'error' });
      } else {
        bucket.push({ key: k });
        addLog(`Inserted ${k} into bucket ${h}.`);
        setActiveCell({ table: 1, index: h, status: 'success' });
      }
    } else if (op === 'search') {
      if (existingIdx >= 0) {
        addLog(`Found ${k} in bucket ${h}.`);
        setActiveCell({ table: 1, index: h, status: 'success' });
      } else {
        addLog(`Key ${k} not found in bucket ${h}.`);
        setActiveCell({ table: 1, index: h, status: 'error' });
      }
    } else if (op === 'delete') {
      if (existingIdx >= 0) {
        bucket.splice(existingIdx, 1);
        addLog(`Deleted ${k} from bucket ${h}.`);
        setActiveCell({ table: 1, index: h, status: 'success' });
      } else {
        addLog(`Key ${k} not found to delete.`);
        setActiveCell({ table: 1, index: h, status: 'error' });
      }
    }
    forceRender();
  };

  // --- OPEN ADDRESSING ---
  const runOpenAddressing = async (k: number, op: 'insert' | 'search' | 'delete') => {
    const h = getHash(k, TABLE_SIZE);
    addLog(`Base H(${k}) = ${h}`);

    for (let i = 0; i < TABLE_SIZE; i++) {
      const offset = strategy === 'linear' ? i : i * i;
      const idx = (h + offset) % TABLE_SIZE;
      
      setActiveCell({ table: 1, index: idx, status: 'probing' });
      await sleep(600);

      const cell = openAddrRef.current[idx];

      if (op === 'insert') {
        if (!cell || cell.deleted) {
          openAddrRef.current[idx] = { key: k };
          addLog(`Inserted ${k} at index ${idx} (Probe ${i}).`);
          setActiveCell({ table: 1, index: idx, status: 'success' });
          forceRender();
          return;
        } else if (cell.key === k) {
          addLog(`Key ${k} already exists at index ${idx}.`);
          setActiveCell({ table: 1, index: idx, status: 'error' });
          return;
        }
        addLog(`Collision at ${idx}. Probing...`);
      } else if (op === 'search' || op === 'delete') {
        if (!cell) {
          addLog(`Empty cell at ${idx}. Key ${k} not found.`);
          setActiveCell({ table: 1, index: idx, status: 'error' });
          return;
        } else if (!cell.deleted && cell.key === k) {
          if (op === 'search') {
            addLog(`Found ${k} at index ${idx}.`);
            setActiveCell({ table: 1, index: idx, status: 'success' });
          } else {
            openAddrRef.current[idx] = { key: k, deleted: true };
            addLog(`Deleted ${k} at index ${idx}.`);
            setActiveCell({ table: 1, index: idx, status: 'success' });
            forceRender();
          }
          return;
        }
        addLog(`Cell at ${idx} is ${cell.deleted ? 'deleted' : 'occupied by ' + cell.key}. Probing...`);
      }
    }
    addLog(`Table full or probing failed for ${k}.`);
    setActiveCell({ table: 1, index: h, status: 'error' });
  };

  // --- CUCKOO HASHING ---
  const runCuckoo = async (k: number, op: 'insert' | 'search' | 'delete') => {
    if (op === 'search' || op === 'delete') {
      const h1 = getHash(k, CUCKOO_SIZE);
      setActiveCell({ table: 1, index: h1, status: 'probing' });
      await sleep(600);
      if (cuckooRef.current[0][h1]?.key === k) {
        if (op === 'delete') cuckooRef.current[0][h1] = null;
        addLog(`${op === 'delete' ? 'Deleted' : 'Found'} ${k} in Table 1, index ${h1}.`);
        setActiveCell({ table: 1, index: h1, status: 'success' });
        forceRender();
        return;
      }

      const h2 = getCuckooHash2(k);
      setActiveCell({ table: 2, index: h2, status: 'probing' });
      await sleep(600);
      if (cuckooRef.current[1][h2]?.key === k) {
        if (op === 'delete') cuckooRef.current[1][h2] = null;
        addLog(`${op === 'delete' ? 'Deleted' : 'Found'} ${k} in Table 2, index ${h2}.`);
        setActiveCell({ table: 2, index: h2, status: 'success' });
        forceRender();
        return;
      }

      addLog(`Key ${k} not found in either table.`);
      setActiveCell({ table: 2, index: h2, status: 'error' });
      return;
    }

    // Insert
    let currK = k;
    let t = 1;
    for (let i = 0; i < 10; i++) {
      const h = t === 1 ? getHash(currK, CUCKOO_SIZE) : getCuckooHash2(currK);
      addLog(`Checking Table ${t}, index ${h} for ${currK}...`);
      setActiveCell({ table: t, index: h, status: 'probing' });
      await sleep(600);

      const cell = cuckooRef.current[t - 1][h];
      if (!cell) {
        cuckooRef.current[t - 1][h] = { key: currK };
        addLog(`Inserted ${currK} at Table ${t}, index ${h}.`);
        setActiveCell({ table: t, index: h, status: 'success' });
        forceRender();
        return;
      } else if (cell.key === currK) {
        addLog(`Key ${currK} already exists.`);
        setActiveCell({ table: t, index: h, status: 'error' });
        return;
      } else {
        const kicked = cell.key;
        cuckooRef.current[t - 1][h] = { key: currK };
        addLog(`Inserted ${currK}, kicked out ${kicked}!`);
        forceRender();
        currK = kicked;
        t = t === 1 ? 2 : 1;
        await sleep(400);
      }
    }
    addLog(`Max cycles reached! Cuckoo rehash needed (not implemented here).`);
    setActiveCell(null);
  };

  const handleOperation = async (op: 'insert' | 'search' | 'delete') => {
    const k = parseInt(inputValue);
    if (isNaN(k) || k < 0) {
      alert('Please enter a valid positive integer.');
      return;
    }
    setIsAnimating(true);
    addLog(`--- ${op.toUpperCase()} ${k} ---`);

    if (strategy === 'chaining') await runChaining(k, op);
    else if (strategy === 'linear' || strategy === 'quadratic') await runOpenAddressing(k, op);
    else if (strategy === 'cuckoo') await runCuckoo(k, op);

    await sleep(1000);
    setActiveCell(null);
    setIsAnimating(false);
    setInputValue('');
  };

  const getCellClasses = (tId: number, idx: number, isDeleted: boolean = false) => {
    let base = "flex items-center justify-center w-12 h-12 rounded-xl border-4 font-bold text-lg transition-all duration-300 ";
    if (activeCell?.table === tId && activeCell?.index === idx) {
      if (activeCell.status === 'probing') base += "bg-yellow-200 border-yellow-400 scale-110 shadow-lg z-10 text-yellow-800";
      else if (activeCell.status === 'success') base += "bg-green-200 border-green-400 scale-110 shadow-lg z-10 text-green-800";
      else if (activeCell.status === 'error') base += "bg-red-200 border-red-400 scale-110 shadow-lg z-10 text-red-800";
    } else {
      if (isDeleted) base += "bg-gray-100 border-gray-300 border-dashed text-gray-400";
      else base += "bg-white border-indigo-100 text-indigo-900 shadow-sm";
    }
    return base;
  };

  return (
    <div className="min-h-screen bg-fuchsia-50 p-8 font-sans text-slate-800 flex flex-col items-center">
      <div className="max-w-5xl w-full space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold text-fuchsia-900 tracking-tight">
            Hash Map Explorer <span className="text-2xl">✨</span>
          </h1>
          <p className="text-fuchsia-700 font-medium">Collision Strategies Visualizer</p