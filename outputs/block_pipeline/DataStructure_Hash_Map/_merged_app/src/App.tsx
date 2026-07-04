import React, { useState, useMemo, useEffect, useRef, FormEvent } from 'react';
import { AlertCircle, BarChart3, Info, Zap, ShieldAlert, CheckCircle2, Swords, Trophy, RotateCcw, AlertTriangle, ArrowRight } from 'lucide-react';

// --- Shared Icons ---
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>;
const StepForwardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="4" x2="6" y2="20"></line><polygon points="10,4 20,12 10,20"></polygon></svg>;
const RefreshCwIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>;
const InfoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>;

// --- Shared Helpers ---
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ==========================================
// BLOCK 1: Hash Function Lab
// ==========================================
type HashType = 'mod' | 'mult';

interface KeyItem {
  id: string;
  val: string;
  color: string;
}

const LAB_COLORS = [
  'bg-rose-900/50 text-rose-200 border-rose-700',
  'bg-orange-900/50 text-orange-200 border-orange-700',
  'bg-amber-900/50 text-amber-200 border-amber-700',
  'bg-green-900/50 text-green-200 border-green-700',
  'bg-emerald-900/50 text-emerald-200 border-emerald-700',
  'bg-teal-900/50 text-teal-200 border-teal-700',
  'bg-cyan-900/50 text-cyan-200 border-cyan-700',
  'bg-blue-900/50 text-blue-200 border-blue-700',
  'bg-indigo-900/50 text-indigo-200 border-indigo-700',
  'bg-violet-900/50 text-violet-200 border-violet-700',
  'bg-purple-900/50 text-purple-200 border-purple-700',
  'bg-fuchsia-900/50 text-fuchsia-200 border-fuchsia-700',
  'bg-pink-900/50 text-pink-200 border-pink-700',
];

const SAMPLE_WORDS = [
  'Apple', 'Banana', 'Cherry', 'Dolphin', 'Elephant', 'Fox', 'Giraffe', 'Hippo',
  'Igloo', 'Jelly', 'Kiwi', 'Llama', 'Mango', 'Noodle', 'Octopus', 'Penguin',
  'Quasar', 'Rabbit', 'Star', 'Turtle', 'Unicorn', 'Volcano', 'Waffle', 'Xenon',
  'Yoyo', 'Zebra', 'Bubble', 'Cactus', 'Daisy', 'Echo', 'Falcon', 'Galaxy'
];

const getNumericValue = (str: string): number => {
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    sum += str.charCodeAt(i);
  }
  return sum;
};

const computeHash = (val: string, type: HashType, buckets: number): number => {
  const num = getNumericValue(val);
  if (type === 'mod') {
    return num % buckets;
  } else {
    const A = 0.6180339887;
    return Math.floor(buckets * ((num * A) % 1));
  }
};

const getRandomLabColor = () => LAB_COLORS[Math.floor(Math.random() * LAB_COLORS.length)];

function HashFunctionLab() {
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [hashType, setHashType] = useState<HashType>('mod');
  const [bucketCount, setBucketCount] = useState<number>(16);

  const distributedBuckets = useMemo(() => {
    const b = Array.from({ length: bucketCount }, () => [] as KeyItem[]);
    keys.forEach((k) => {
      const idx = computeHash(k.val, hashType, bucketCount);
      const safeIdx = Math.max(0, Math.min(idx, bucketCount - 1));
      b[safeIdx].push(k);
    });
    return b;
  }, [keys, hashType, bucketCount]);

  const totalKeys = keys.length;
  const usedBuckets = distributedBuckets.filter((b) => b.length > 0).length;
  const collisions = totalKeys > 0 ? totalKeys - usedBuckets : 0;
  const loadFactor = (totalKeys / bucketCount).toFixed(2);

  const handleAddKey = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setKeys((prev) => [...prev, { id: crypto.randomUUID(), val: trimmed, color: getRandomLabColor() }]);
    setInputValue('');
  };

  const handleAddRandom = () => {
    const randomWord = SAMPLE_WORDS[Math.floor(Math.random() * SAMPLE_WORDS.length)];
    const suffix = Math.floor(Math.random() * 100);
    const val = `${randomWord}${suffix}`;
    setKeys((prev) => [...prev, { id: crypto.randomUUID(), val, color: getRandomLabColor() }]);
  };

  const handleClear = () => setKeys([]);

  return (
    <div className="space-y-6">
      <header className="bg-slate-900 rounded-3xl p-8 shadow-md border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-indigo-400 tracking-tight mb-2">Hash Function Lab 🧪</h1>
          <p className="text-slate-400 max-w-xl leading-relaxed">
            Explore how different hash functions distribute keys across buckets. Add keys manually or generate random ones to visualize collisions and load factors in real-time!
          </p>
        </div>
        <div className="flex gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
          <div className="text-center px-4 border-r border-slate-800">
            <div className="text-2xl font-black text-indigo-400">{totalKeys}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Keys</div>
          </div>
          <div className="text-center px-4 border-r border-slate-800">
            <div className="text-2xl font-black text-rose-400">{collisions}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Collisions</div>
          </div>
          <div className="text-center px-4">
            <div className="text-2xl font-black text-teal-400">{loadFactor}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Load Factor</div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 rounded-3xl p-6 shadow-md border border-slate-800">
            <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
              <span className="bg-indigo-900/50 text-indigo-400 w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
              Add Keys
            </h2>
            <form onSubmit={handleAddKey} className="flex gap-2 mb-4">
              <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Type a key..." className="flex-1 bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-semibold transition-colors shadow-sm">Add</button>
            </form>
            <div className="flex gap-2">
              <button onClick={handleAddRandom} className="flex-1 bg-teal-900/40 hover:bg-teal-900/60 text-teal-300 py-2 rounded-xl font-semibold transition-colors border border-teal-800/50">+ Random Key</button>
              <button onClick={handleClear} className="flex-1 bg-rose-900/40 hover:bg-rose-900/60 text-rose-300 py-2 rounded-xl font-semibold transition-colors border border-rose-800/50">Clear All</button>
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl p-6 shadow-md border border-slate-800">
            <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
              <span className="bg-indigo-900/50 text-indigo-400 w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
              Configure Hash
            </h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">Hash Function</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setHashType('mod')} className={`py-3 px-2 rounded-xl border-2 font-semibold transition-all ${hashType === 'mod' ? 'border-indigo-500 bg-indigo-900/30 text-indigo-300' : 'border-slate-700 bg-slate-950 text-slate-500 hover:bg-slate-800'}`}>Modulo</button>
                  <button onClick={() => setHashType('mult')} className={`py-3 px-2 rounded-xl border-2 font-semibold transition-all ${hashType === 'mult' ? 'border-indigo-500 bg-indigo-900/30 text-indigo-300' : 'border-slate-700 bg-slate-950 text-slate-500 hover:bg-slate-800'}`}>Multiplicative</button>
                </div>
                <div className="mt-3 bg-slate-950 text-emerald-400 font-mono text-sm p-3 rounded-xl overflow-x-auto border border-slate-800">
                  {hashType === 'mod' ? 'h(k) = k mod m' : 'h(k) = floor(m * ((k * A) mod 1))'}
                </div>
                {hashType === 'mult' && <p className="text-xs text-slate-500 mt-2 ml-1">* A ≈ 0.618033 (Golden Ratio)</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2 flex justify-between">
                  <span>Buckets (m)</span>
                  <span className="text-indigo-300 bg-indigo-900/50 px-2 rounded-md">{bucketCount}</span>
                </label>
                <input type="range" min="4" max="32" step="4" value={bucketCount} onChange={(e) => setBucketCount(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                <div className="flex justify-between text-xs text-slate-500 mt-1 px-1"><span>4</span><span>16</span><span>32</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 bg-slate-900 rounded-3xl p-6 shadow-md border border-slate-800 flex flex-col">
          <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
            <span className="bg-indigo-900/50 text-indigo-400 w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
            Bucket Distribution
          </h2>
          <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 p-4 overflow-y-auto">
            {keys.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 min-h-[300px]">
                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center rotate-12"><span className="text-3xl">🪣</span></div>
                <p className="font-medium">Add some keys to see them fall into buckets!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {distributedBuckets.map((bucket, i) => {
                  const isCollision = bucket.length > 1;
                  return (
                    <div key={i} className={`relative flex flex-col rounded-2xl border-2 transition-all duration-300 min-h-[120px] ${isCollision ? 'border-rose-800 bg-rose-950/30' : bucket.length === 1 ? 'border-indigo-800 bg-slate-900' : 'border-slate-800 bg-slate-900/50'}`}>
                      <div className={`text-xs font-bold px-3 py-2 border-b-2 rounded-t-xl flex justify-between items-center ${isCollision ? 'border-rose-900 bg-rose-900/40 text-rose-300' : bucket.length === 1 ? 'border-indigo-900 bg-indigo-900/30 text-indigo-300' : 'border-slate-800 text-slate-500'}`}>
                        <span>Bucket {i}</span>
                        {bucket.length > 0 && <span className="bg-slate-950/60 px-2 py-0.5 rounded-full shadow-sm">{bucket.length}</span>}
                      </div>
                      <div className="p-2 flex flex-wrap gap-1.5 content-start flex-1">
                        {bucket.map((k) => (
                          <div key={k.id} className={`text-xs font-bold px-2 py-1 rounded-lg border shadow-sm animate-in fade-in zoom-in duration-300 ${k.color}`} title={`Numeric value: ${getNumericValue(k.val)}`}>{k.val}</div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// BLOCK 2: Collision Strategies
// ==========================================
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

const COLLISION_TABLE_SIZE = 11;
const CUCKOO_SIZE = 7;

function CollisionStrategies() {
  const [strategy, setStrategy] = useState<Strategy>('chaining');
  const [inputValue, setInputValue] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [, setTick] = useState(0);

  const forceRender = () => setTick((t) => t + 1);

  const chainingRef = useRef<CellData[][]>(Array.from({ length: COLLISION_TABLE_SIZE }, () => []));
  const openAddrRef = useRef<(CellData | null)[]>(Array(COLLISION_TABLE_SIZE).fill(null));
  const cuckooRef = useRef<(CellData | null)[][]>([Array(CUCKOO_SIZE).fill(null), Array(CUCKOO_SIZE).fill(null)]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollTop = logsEndRef.current.scrollHeight;
  }, [logs]);

  const addLog = (msg: string) => setLogs((prev) => [...prev, msg]);

  const clearTable = () => {
    chainingRef.current = Array.from({ length: COLLISION_TABLE_SIZE }, () => []);
    openAddrRef.current = Array(COLLISION_TABLE_SIZE).fill(null);
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

  const runChaining = async (k: number, op: 'insert' | 'search' | 'delete') => {
    const h = getHash(k, COLLISION_TABLE_SIZE);
    addLog(`H(${k}) = ${k} % ${COLLISION_TABLE_SIZE} = ${h}`);
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

  const runOpenAddressing = async (k: number, op: 'insert' | 'search' | 'delete') => {
    const h = getHash(k, COLLISION_TABLE_SIZE);
    addLog(`Base H(${k}) = ${h}`);

    for (let i = 0; i < COLLISION_TABLE_SIZE; i++) {
      const offset = strategy === 'linear' ? i : i * i;
      const idx = (h + offset) % COLLISION_TABLE_SIZE;
      
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
    addLog(`Max cycles reached! Cuckoo rehash needed.`);
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
      if (activeCell.status === 'probing') base += "bg-yellow-900/50 border-yellow-500 scale-110 shadow-lg z-10 text-yellow-300";
      else if (activeCell.status === 'success') base += "bg-green-900/50 border-green-500 scale-110 shadow-lg z-10 text-green-300";
      else if (activeCell.status === 'error') base += "bg-red-900/50 border-red-500 scale-110 shadow-lg z-10 text-red-300";
    } else {
      if (isDeleted) base += "bg-slate-800 border-slate-700 border-dashed text-slate-500";
      else base += "bg-slate-900 border-indigo-800 text-indigo-300 shadow-sm";
    }
    return base;
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-fuchsia-400 tracking-tight">
          Hash Map Explorer <span className="text-2xl">✨</span>
        </h1>
        <p className="text-slate-400 font-medium">Collision Strategies Visualizer</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-md">
            <h2 className="text-lg font-bold text-slate-200 mb-4">Controls</h2>
            <select value={strategy} onChange={(e) => handleStrategyChange(e.target.value as Strategy)} className="w-full bg-slate-950 border border-slate-700 text-slate-200 p-3 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-fuchsia-500">
              <option value="chaining">Separate Chaining</option>
              <option value="linear">Linear Probing</option>
              <option value="quadratic">Quadratic Probing</option>
              <option value="cuckoo">Cuckoo Hashing</option>
            </select>
            <input type="number" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Enter positive integer..." className="w-full bg-slate-950 border border-slate-700 text-slate-200 p-3 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-fuchsia-500" />
            <div className="flex gap-2">
              <button onClick={() => handleOperation('insert')} disabled={isAnimating || !inputValue} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-xl font-bold disabled:opacity-50 transition-colors">Insert</button>
              <button onClick={() => handleOperation('search')} disabled={isAnimating || !inputValue} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-xl font-bold disabled:opacity-50 transition-colors">Search</button>
              <button onClick={() => handleOperation('delete')} disabled={isAnimating || !inputValue} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white p-2 rounded-xl font-bold disabled:opacity-50 transition-colors">Delete</button>
            </div>
          </div>
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-md flex flex-col h-64">
            <h2 className="text-lg font-bold text-slate-200 mb-2">Execution Log</h2>
            <div className="flex-1 overflow-y-auto pr-2 space-y-1" ref={logsEndRef}>
              {logs.map((log, i) => <div key={i} className="text-sm text-slate-400 font-mono bg-slate-950 p-2 rounded-lg border border-slate-800">{log}</div>)}
              {logs.length === 0 && <div className="text-slate-500 italic text-sm">Logs will appear here...</div>}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-md min-h-[400px]">
          <h2 className="text-lg font-bold text-slate-200 mb-6">Hash Table Visualization</h2>
          
          {strategy === 'chaining' && (
            <div className="space-y-3">
              {chainingRef.current.map((bucket, i) => (
                <div key={i} className="flex items-center gap-4 bg-slate-950 p-2 rounded-2xl border border-slate-800">
                  <div className="w-8 text-center font-bold text-slate-500">{i}</div>
                  <div className="flex gap-2 flex-wrap">
                    {bucket.map((cell, j) => (
                      <div key={j} className={getCellClasses(1, i, false)}>{cell.key}</div>
                    ))}
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl border-4 border-slate-800 border-dashed text-slate-600 bg-slate-900">+</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(strategy === 'linear' || strategy === 'quadratic') && (
            <div className="flex flex-wrap gap-4 justify-center mt-8">
              {openAddrRef.current.map((cell, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className={getCellClasses(1, i, cell?.deleted)}>{cell && !cell.deleted ? cell.key : ''}</div>
                  <div className="text-sm font-bold text-slate-500">{i}</div>
                </div>
              ))}
            </div>
          )}

          {strategy === 'cuckoo' && (
            <div className="space-y-10 mt-4">
              <div>
                <h3 className="text-slate-400 font-bold mb-4 text-center">Table 1 (Hash 1)</h3>
                <div className="flex flex-wrap gap-4 justify-center">
                  {cuckooRef.current[0].map((cell, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div className={getCellClasses(1, i, false)}>{cell ? cell.key : ''}</div>
                      <div className="text-sm font-bold text-slate-500">{i}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-slate-400 font-bold mb-4 text-center">Table 2 (Hash 2)</h3>
                <div className="flex flex-wrap gap-4 justify-center">
                  {cuckooRef.current[1].map((cell, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div className={getCellClasses(2, i, false)}>{cell ? cell.key : ''}</div>
                      <div className="text-sm font-bold text-slate-500">{i}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// BLOCK 3: Load Factor Stress
// ==========================================
const STRESS_TABLE_SIZE = 100;
const STRESS_COLORS = [
  'bg-[#FFB3BA]', 'bg-[#FFDFBA]', 'bg-[#FFFFBA]', 
  'bg-[#BAFFC9]', 'bg-[#BAE1FF]', 'bg-[#E8BAFF]',
];

const generateGridData = () => {
  const cells = Array.from({ length: STRESS_TABLE_SIZE }, (_, i) => ({
    id: i, order: 0, color: STRESS_COLORS[Math.floor(Math.random() * STRESS_COLORS.length)],
  }));
  const shuffled = [...cells].sort(() => Math.random() - 0.5);
  shuffled.forEach((cell, index) => { cells[cell.id].order = index; });
  return cells;
};

function StrategyCard({ title, colorClass, succ, unsucc, description }: { title: string; colorClass: string; succ: number; unsucc: number; description: string; }) {
  const MAX_PROBES_CHART = 50; 
  const getWidth = (val: number) => {
    if (!isFinite(val)) return '100%';
    const pct = (val / MAX_PROBES_CHART) * 100;
    return `${Math.min(pct, 100)}%`;
  };
  const isExploding = unsucc > MAX_PROBES_CHART;

  return (
    <div className="bg-slate-900 p-6 rounded-3xl border-4 border-slate-700 shadow-[6px_6px_0px_rgba(0,0,0,0.5)] flex flex-col h-full relative overflow-hidden group hover:-translate-y-1 hover:shadow-[8px_8px_0px_rgba(0,0,0,0.5)] transition-all">
      <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full opacity-10 transition-transform group-hover:scale-150 ${colorClass}`} />
      <h3 className="text-xl font-bold text-slate-100 mb-2 relative z-10">{title}</h3>
      <p className="text-xs text-slate-400 font-medium mb-5 min-h-[40px] relative z-10">{description}</p>
      <div className="space-y-4 mt-auto relative z-10">
        <div>
          <div className="flex justify-between text-sm font-bold mb-1">
            <span className="text-slate-300">Successful Hit</span>
            <span className="text-slate-100">{succ.toFixed(2)}</span>
          </div>
          <div className="h-3 w-full bg-slate-800 rounded-full border border-slate-700 overflow-hidden">
            <div className={`h-full border-r border-slate-900 transition-all duration-300 ${colorClass}`} style={{ width: getWidth(succ) }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm font-bold mb-1">
            <span className="text-slate-300">Unsuccessful / Miss</span>
            <span className={`transition-colors ${isExploding ? 'text-red-400 font-black' : 'text-slate-100'}`}>
              {!isFinite(unsucc) || unsucc > 999 ? "∞" : unsucc.toFixed(2)}
            </span>
          </div>
          <div className="h-3 w-full bg-slate-800 rounded-full border border-slate-700 overflow-hidden relative">
            <div className={`h-full border-r border-slate-900 transition-all duration-300 ${isExploding ? 'bg-red-500' : colorClass}`} style={{ width: getWidth(unsucc) }} />
            {isExploding && <div className="absolute top-0 right-0 bottom-0 left-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAiPjwvcmVjdD4KPHBhdGggZD0iTTAgMEw4IDhaIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiI+PC9wYXRoPgo8L3N2Zz4=')] opacity-30 pointer-events-none" />}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadFactorStress() {
  const [loadFactor, setLoadFactor] = useState<number>(0.5);
  const [gridData, setGridData] = useState<any[]>([]);

  useEffect(() => { setGridData(generateGridData()); }, []);

  const alpha = loadFactor;
  const stats = useMemo(() => {
    const safeAlpha = Math.min(alpha, 0.99);
    const chainSucc = 1 + safeAlpha / 2;
    const chainUnsucc = safeAlpha;
    const linSucc = 0.5 * (1 + 1 / (1 - safeAlpha));
    const linUnsucc = 0.5 * (1 + 1 / Math.pow(1 - safeAlpha, 2));
    const quadSucc = 1 - Math.log(1 - safeAlpha) - safeAlpha / 2;
    const quadUnsucc = 1 / (1 - safeAlpha) - safeAlpha - Math.log(1 - safeAlpha);
    const cuckooSucc = 1.5; 
    const cuckooUnsucc = 2.0;
    return {
      chaining: { succ: chainSucc, unsucc: chainUnsucc },
      linear: { succ: linSucc, unsucc: linUnsucc },
      quadratic: { succ: quadSucc, unsucc: quadUnsucc },
      cuckoo: { succ: cuckooSucc, unsucc: cuckooUnsucc }
    };
  }, [alpha]);

  const filledCount = Math.round(alpha * STRESS_TABLE_SIZE);

  let statusColor = "text-green-400";
  let statusBg = "bg-green-900/30 border-green-800";
  let statusText = "Healthy";
  let statusIcon = <CheckCircle2 className="w-6 h-6 text-green-400" />;
  
  if (alpha >= 0.75) {
    statusColor = "text-orange-400";
    statusBg = "bg-orange-900/30 border-orange-800";
    statusText = "Degrading";
    statusIcon = <AlertCircle className="w-6 h-6 text-orange-400" />;
  }
  if (alpha >= 0.9) {
    statusColor = "text-red-400";
    statusBg = "bg-red-900/30 border-red-800";
    statusText = "Critical Stress";
    statusIcon = <ShieldAlert className="w-6 h-6 text-red-400" />;
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b-4 border-slate-800 border-dashed">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3 text-slate-100">
            <Zap className="w-10 h-10 text-[#FFDFBA] fill-[#FFDFBA] stroke-slate-900 stroke-2" />
            Load Factor Stress
          </h1>
          <p className="text-slate-400 mt-2 text-lg font-medium max-w-2xl">
            Push the limits of your hash map. Observe how different collision resolution strategies degrade as the table fills up toward <span className="font-bold text-slate-200">α = 0.95</span>.
          </p>
        </div>
        <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border-2 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] transition-colors ${statusBg}`}>
          {statusIcon}
          <span className={`font-bold text-lg uppercase tracking-wide ${statusColor}`}>{statusText}</span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-slate-900 p-8 rounded-3xl border-4 border-slate-700 shadow-[8px_8px_0px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2 mb-1 text-slate-100">
                  Load Factor (<span className="font-serif italic">α</span>)
                </h2>
                <p className="text-sm text-slate-400 font-medium">Elements / Table Size</p>
              </div>
              <div className="text-4xl font-black text-slate-900 bg-[#E8BAFF] px-4 py-2 rounded-xl border-2 border-slate-900">
                {alpha.toFixed(2)}
              </div>
            </div>
            <input type="range" min="0.01" max="0.95" step="0.01" value={loadFactor} onChange={(e) => setLoadFactor(parseFloat(e.target.value))} className="w-full h-4 bg-slate-800 rounded-full appearance-none cursor-pointer border-2 border-slate-700 accent-[#BAE1FF] focus:outline-none focus:ring-4 focus:ring-[#BAE1FF]/50" />
            <div className="flex justify-between text-xs font-bold text-slate-500 mt-3 px-1">
              <span>0.01 (Empty)</span><span>0.5 (Ideal)</span><span>0.95 (Stressed)</span>
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-3xl border-4 border-slate-700 shadow-[8px_8px_0px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2 text-slate-100">
                <BarChart3 className="w-6 h-6 text-slate-300" /> Bucket Visualization
              </h3>
              <span className="bg-slate-800 text-slate-200 text-sm font-bold px-3 py-1 rounded-full border border-slate-700">
                {filledCount} / 100 Filled
              </span>
            </div>
            <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
              {gridData.map((cell) => {
                const isFilled = cell.order < filledCount;
                return (
                  <div key={cell.id} className={`aspect-square rounded-md border-2 transition-all duration-300 ${isFilled ? `${cell.color} border-slate-900 scale-100 opacity-100 shadow-[2px_2px_0px_rgba(0,0,0,0.5)]` : `bg-slate-800 border-slate-700 scale-95 opacity-30`}`} />
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <h2 className="text-3xl font-black text-slate-100 mb-2">Expected Probes</h2>
          <p className="text-slate-400 font-medium mb-6">Average number of table accesses required to find an element or verify it doesn't exist.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <StrategyCard title="Linear Probing" colorClass="bg-[#FFB3BA]" succ={stats.linear.succ} unsucc={stats.linear.unsucc} description="Checks contiguous buckets. Suffers heavily from primary clustering." />
            <StrategyCard title="Quadratic Probing" colorClass="bg-[#FFDFBA]" succ={stats.quadratic.succ} unsucc={stats.quadratic.unsucc} description="Checks buckets at quadratically increasing intervals. Mild secondary clustering." />
            <StrategyCard title="Separate Chaining" colorClass="bg-[#BAFFC9]" succ={stats.chaining.succ} unsucc={stats.chaining.unsucc} description="Stores elements in linked lists. Graceful degradation, but extra memory." />
            <StrategyCard title="Cuckoo Hashing" colorClass="bg-[#BAE1FF]" succ={stats.cuckoo.succ} unsucc={stats.cuckoo.unsucc} description="Constant O(1) lookups bounded strictly to 2 probes. High insert cost near limits." />
          </div>
          <div className="mt-8 bg-yellow-900/20 p-6 rounded-3xl border-4 border-yellow-700/50 shadow-[6px_6px_0px_rgba(0,0,0,0.5)] flex gap-4 items-start">
            <Info className="w-8 h-8 text-yellow-500 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-bold text-lg text-yellow-400 mb-2">Why does Open Addressing fail at α → 1?</h4>
              <p className="text-slate-300 font-medium leading-relaxed">
                As the table fills, contiguous blocks of occupied buckets merge (clustering). A new insertion or an unsuccessful search must scan past these entire blocks. Notice how <strong className="text-slate-100">Linear Probing</strong> expected probes skyrocket exponentially after α = 0.7. This is why hash maps automatically rehash (resize) well before becoming completely full!
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ==========================================
// BLOCK 4: Rehash Event
// ==========================================
const OLD_SIZE = 7;
const NEW_SIZE = 17;
const INITIAL_KEYS = [12, 26, 33, 5, 19]; 

type BucketState = { key: number; status: 'idle' | 'moving' | 'newly_placed' | 'collided'; } | null;
type Phase = 'ready' | 'rehashing' | 'done';
type LogEntry = { id: number; text: string; type: 'info' | 'action' | 'success'; };

function RehashEvent() {
  const [phase, setPhase] = useState<Phase>('ready');
  const [oldTable, setOldTable] = useState<BucketState[]>(Array(OLD_SIZE).fill(null));
  const [newTable, setNewTable] = useState<BucketState[]>(Array(NEW_SIZE).fill(null));
  const [scanIndex, setScanIndex] = useState<number>(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const logIdCounter = useRef(0);

  const addLog = (text: string, type: 'info' | 'action' | 'success' = 'info') => {
    setLogs(prev => [...prev, { id: logIdCounter.current++, text, type }]);
  };

  useEffect(() => {
    if (logContainerRef.current) logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
  }, [logs]);

  const initLab = () => {
    const initialTable: BucketState[] = Array(OLD_SIZE).fill(null);
    let insertions = 0;
    INITIAL_KEYS.forEach(key => {
      let idx = key % OLD_SIZE;
      while (initialTable[idx] !== null) idx = (idx + 1) % OLD_SIZE;
      initialTable[idx] = { key, status: 'idle' };
      insertions++;
    });
    setOldTable(initialTable);
    setNewTable(Array(NEW_SIZE).fill(null));
    setPhase('ready');
    setScanIndex(0);
    setIsAutoPlaying(false);
    setLogs([]);
    addLog(`Table initialized with ${insertions} items in ${OLD_SIZE} slots.`, 'info');
    addLog(`Load Factor is ${(insertions / OLD_SIZE).toFixed(2)}. Critical cluster detected!`, 'info');
    addLog(`Ready to rehash to new capacity: ${NEW_SIZE}.`, 'action');
  };

  useEffect(() => { initLab(); }, []);

  const performStep = () => {
    if (phase === 'done') return;
    let currentIndex = scanIndex;
    while (currentIndex < OLD_SIZE && oldTable[currentIndex] === null) currentIndex++;

    if (currentIndex >= OLD_SIZE) {
      setPhase('done');
      setIsAutoPlaying(false);
      setOldTable(Array(OLD_SIZE).fill(null));
      setNewTable(prev => prev.map(b => b ? { ...b, status: 'idle' } : null));
      addLog('Rehash Complete! All items successfully migrated.', 'success');
      addLog('Notice how the previously clustered keys are now distributed.', 'info');
      return;
    }

    const itemToMove = oldTable[currentIndex]!;
    const nextOldTable = [...oldTable];
    nextOldTable[currentIndex] = null;
    const nextNewTable = [...newTable];
    
    for(let i=0; i<NEW_SIZE; i++){
        if(nextNewTable[i]?.status === 'newly_placed') nextNewTable[i]!.status = 'idle';
    }

    const idealNewIndex = itemToMove.key % NEW_SIZE;
    let actualInsertIndex = idealNewIndex;
    let probes = 0;

    while (nextNewTable[actualInsertIndex] !== null) {
      actualInsertIndex = (actualInsertIndex + 1) % NEW_SIZE;
      probes++;
    }

    nextNewTable[actualInsertIndex] = { key: itemToMove.key, status: probes > 0 ? 'collided' : 'newly_placed' };
    setOldTable(nextOldTable);
    setNewTable(nextNewTable);
    setScanIndex(currentIndex + 1);
    setPhase('rehashing');

    let logMsg = `Moved Key ${itemToMove.key}. Hash: ${itemToMove.key} % ${NEW_SIZE} = ${idealNewIndex}.`;
    if (probes > 0) logMsg += ` Collided! Probed ${probes} times to index ${actualInsertIndex}.`;
    else logMsg += ` Placed perfectly.`;
    addLog(logMsg, probes > 0 ? 'action' : 'info');
  };

  useEffect(() => {
    let timer: number;
    if (isAutoPlaying && phase !== 'done') timer = window.setTimeout(() => performStep(), 1000);
    return () => clearTimeout(timer);
  }, [isAutoPlaying, phase, scanIndex]);

  const toggleAutoPlay = () => {
    if (phase === 'done') return;
    if (!isAutoPlaying && phase === 'ready') setPhase('rehashing');
    setIsAutoPlaying(!isAutoPlaying);
  };

  const handleManualStep = () => {
    setIsAutoPlaying(false);
    if (phase === 'ready') setPhase('rehashing');
    performStep();
  };

  const getLogColor = (type: string) => {
    switch(type) {
      case 'action': return 'text-amber-300 bg-amber-900/30 border-amber-800';
      case 'success': return 'text-emerald-300 bg-emerald-900/30 border-emerald-800';
      default: return 'text-indigo-300 bg-indigo-900/30 border-indigo-800';
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-100 flex items-center gap-3">
            <span className="bg-gradient-to-br from-pink-500 to-rose-600 text-white p-2 rounded-xl shadow-sm"><RefreshCwIcon /></span>
            Rehash Event Lab
          </h1>
          <p className="text-slate-400 mt-1 font-medium">Watch the hash map resize and redistribute keys to resolve clustering.</p>
        </div>
        <div className="flex bg-slate-900 rounded-2xl shadow-md p-2 border border-slate-800 gap-2">
           <button onClick={toggleAutoPlay} disabled={phase === 'done'} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${phase === 'done' ? 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-500' : isAutoPlaying ? 'bg-amber-900/50 text-amber-400 hover:bg-amber-900/70' : 'bg-indigo-900/50 text-indigo-400 hover:bg-indigo-900/70'}`}>
            {isAutoPlaying ? <div className="w-4 h-4 rounded-sm bg-amber-500" /> : <PlayIcon />}
            {isAutoPlaying ? 'Pause' : 'Auto-Play'}
          </button>
          <button onClick={handleManualStep} disabled={phase === 'done' || isAutoPlaying} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${(phase === 'done' || isAutoPlaying) ? 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-500' : 'bg-rose-900/50 text-rose-400 hover:bg-rose-900/70'}`}>
            <StepForwardIcon /> Next Step
          </button>
          <button onClick={initLab} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition-all">Reset</button>
        </div>
      </div>

      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-8">
          <div className={`bg-slate-900 rounded-3xl p-6 shadow-md border border-slate-800 transition-opacity duration-500 ${phase === 'done' ? 'opacity-40' : 'opacity-100'}`}>
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                Old Table <span className="text-xs font-semibold px-2 py-1 bg-slate-800 rounded-full text-slate-400">Size {OLD_SIZE}</span>
              </h2>
              {phase === 'ready' && <span className="text-sm font-bold text-rose-400 bg-rose-900/30 px-3 py-1 rounded-full animate-pulse border border-rose-800">High Load Factor!</span>}
            </div>
            <div className="flex gap-2 flex-wrap">
              {oldTable.map((bucket, i) => (
                <div key={`old-${i}`} className="flex flex-col items-center">
                  <div className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-lg font-bold transition-all duration-300 relative ${bucket ? 'bg-rose-900/50 border-rose-700 text-rose-300 shadow-sm' : 'bg-slate-950 border-slate-800 border-dashed text-transparent'} ${scanIndex === i && phase === 'rehashing' ? 'ring-4 ring-rose-500/50 scale-110 z-10' : ''}`}>
                    {bucket?.key}
                  </div>
                  <span className="text-xs text-slate-500 mt-1 font-mono">{i}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl p-6 shadow-lg shadow-emerald-900/20 border border-emerald-900/50">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                New Table <span className="text-xs font-semibold px-2 py-1 bg-emerald-900/30 rounded-full text-emerald-400 border border-emerald-800">Size {NEW_SIZE}</span>
              </h2>
              {phase === 'rehashing' && <span className="text-sm font-bold text-emerald-400 flex items-center gap-2"><RefreshCwIcon /> Rehashing in progress...</span>}
            </div>
            <div className="flex gap-2 flex-wrap">
              {newTable.map((bucket, i) => (
                <div key={`new-${i}`} className="flex flex-col items-center">
                  <div className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-lg font-bold transition-all duration-500 relative ${!bucket ? 'bg-slate-950 border-slate-800 border-dashed text-transparent' : ''} ${bucket?.status === 'idle' ? 'bg-emerald-900/40 border-emerald-700 text-emerald-300' : ''} ${bucket?.status === 'newly_placed' ? 'bg-emerald-600 border-emerald-400 text-white scale-110 shadow-md ring-4 ring-emerald-500/30 z-10' : ''} ${bucket?.status === 'collided' ? 'bg-amber-600 border-amber-400 text-white scale-110 shadow-md ring-4 ring-amber-500/30 z-10' : ''}`}>
                    {bucket?.key}
                  </div>
                  <span className="text-xs text-slate-500 mt-1 font-mono">{i}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-3xl p-6 shadow-md border border-slate-800 flex flex-col h-[600px]">
          <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2"><InfoIcon /> Process Log</h3>
          <div className="bg-slate-950 rounded-2xl p-4 mb-4 border border-slate-800 text-sm text-slate-400 leading-relaxed">
            <p className="mb-2"><strong className="text-slate-200">Why Rehash?</strong> When a hash table gets too full (high load factor), collisions increase, slowing down operations.</p>
            <p>We create a new, larger array and recalculate the hash for <em className="text-slate-200">every</em> item: <code className="bg-slate-800 px-1 rounded text-slate-300 font-mono">key % new_size</code>.</p>
          </div>
          <div ref={logContainerRef} className="flex-1 overflow-y-auto pr-2 flex flex-col gap-2 scroll-smooth">
            {logs.map(log => (
              <div key={log.id} className={`p-3 rounded-xl text-sm border font-medium animate-in fade-in slide-in-from-bottom-2 ${getLogColor(log.type)}`}>{log.text}</div>
            ))}
            {logs.length === 0 && <div className="text-slate-500 text-center mt-10 italic">Logs will appear here as the process begins...</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// BLOCK 5: Mis-hash Challenge
// ==========================================
const CHALLENGE_TABLE_SIZE = 8;
const TARGET_COLLISIONS = 4;
const MAX_KEYS = 8;
const hashFunction = (key: number) => (key * 3) % CHALLENGE_TABLE_SIZE;

function MisHashChallenge() {
  const [keys, setKeys] = useState<number[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [showHint, setShowHint] = useState<boolean>(false);

  const buckets = useMemo(() => {
    const b = Array.from({ length: CHALLENGE_TABLE_SIZE }, () => [] as number[]);
    keys.forEach((k) => {
      const h = hashFunction(k);
      b[h].push(k);
    });
    return b;
  }, [keys]);

  const maxCollisions = Math.max(0, ...buckets.map((b) => b.length));
  const isBroken = maxCollisions >= TARGET_COLLISIONS;
  const isGameOver = !isBroken && keys.length >= MAX_KEYS;

  const handleAddKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBroken || isGameOver) return;
    const val = parseInt(inputValue, 10);
    if (!isNaN(val) && val >= 0 && !keys.includes(val)) setKeys([...keys, val]);
    setInputValue('');
    setShowHint(false);
  };

  const resetChallenge = () => {
    setKeys([]);
    setInputValue('');
    setShowHint(false);
  };

  const hintText = useMemo(() => {
    if (keys.length === 0) return "Try entering numbers that are exactly 8 apart (e.g., 1, 9, 17...).";
    const firstKey = keys[0];
    const nextKey = firstKey + 8;
    return `Since h(x) uses modulo 8, adding 8 to your key gives the same hash! Try ${nextKey}.`;
  }, [keys]);

  return (
    <div className="space-y-6">
      <header className="bg-slate-900 rounded-3xl p-6 shadow-md border-4 border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-rose-900/30 text-rose-400 rounded-2xl border border-rose-800/50">
            <Swords size={32} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Mis-hash Challenge</h1>
            <p className="text-slate-400 font-medium">Craft adversarial keys to break the hash map!</p>
          </div>
        </div>
        <div className="flex gap-4 text-sm font-bold">
          <div className="bg-amber-900/30 text-amber-400 border border-amber-800/50 px-4 py-2 rounded-xl flex items-center gap-2">
            <Zap size={18} /><span>Target: {TARGET_COLLISIONS} Collisions</span>
          </div>
          <div className="bg-blue-900/30 text-blue-400 border border-blue-800/50 px-4 py-2 rounded-xl flex items-center gap-2">
            <ShieldAlert size={18} /><span>Max Keys: {MAX_KEYS}</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-3xl p-6 shadow-md border-4 border-slate-800">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-200">
              <Info className="text-indigo-400" size={20} /> The Strategy
            </h2>
            <div className="bg-slate-950 rounded-2xl p-4 mb-6 border-2 border-slate-800 text-center">
              <p className="text-sm text-indigo-400 font-bold uppercase tracking-wider mb-1">Hash Function</p>
              <code className="text-xl font-mono font-black text-indigo-300">h(x) = (x * 3) % 8</code>
            </div>
            <form onSubmit={handleAddKey} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Enter a positive integer:</label>
                <div className="flex gap-2">
                  <input type="number" min="0" value={inputValue} onChange={(e) => setInputValue(e.target.value)} disabled={isBroken || isGameOver} placeholder="e.g. 42" className="flex-1 bg-slate-950 border-2 border-slate-700 text-slate-200 rounded-xl px-4 py-3 font-mono text-lg focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all disabled:opacity-50" />
                  <button type="submit" disabled={!inputValue || isBroken || isGameOver} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100">Add</button>
                </div>
              </div>
            </form>
            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-sm font-bold text-slate-400">
                <span>Keys Used:</span>
                <span className={keys.length === MAX_KEYS ? 'text-rose-400' : ''}>{keys.length} / {MAX_KEYS}</span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-500 ease-out" style={{ width: `${(keys.length / MAX_KEYS) * 100}%` }} />
              </div>
            </div>
            <div className="mt-6 pt-6 border-t-2 border-slate-800">
              {!showHint ? (
                <button onClick={() => setShowHint(true)} className="text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors">Stuck? Need a hint?</button>
              ) : (
                <div className="bg-amber-900/30 border-2 border-amber-800/50 text-amber-300 p-4 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2">{hintText}</div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl p-6 shadow-md border-4 border-slate-800 flex-1">
            <h2 className="text-lg font-bold mb-4 text-slate-200">Execution Log</h2>
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
              {keys.length === 0 && <p className="text-slate-500 text-sm italic text-center py-4">No keys added yet.</p>}
              {[...keys].reverse().map((k, idx) => {
                const step1 = k * 3;
                const step2 = step1 % 8;
                return (
                  <div key={`${k}-${idx}`} className="bg-slate-950 border-2 border-slate-800 rounded-xl p-3 text-sm font-mono flex flex-col gap-1 animate-in slide-in-from-left-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-300">Key: {k}</span>
                      <span className="text-indigo-400 font-bold">Bucket {step2}</span>
                    </div>
                    <div className="text-slate-500 text-xs">({k} * 3) = {step1} → {step1} % 8 = <span className="text-indigo-400 font-bold">{step2}</span></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col space-y-6">
          <div className="bg-slate-900 rounded-3xl p-6 shadow-md border-4 border-rose-900/30 relative overflow-hidden">
            <div className="relative z-10 flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-rose-300 flex items-center gap-2">
                <AlertTriangle className="text-rose-500" size={20} /> Damage Meter (Max Collisions)
              </h2>
              <span className="font-black text-2xl text-rose-400">{maxCollisions} / {TARGET_COLLISIONS}</span>
            </div>
            <div className="relative z-10 h-6 bg-slate-950 rounded-full overflow-hidden border-2 border-rose-900/50 p-0.5">
              <div className={`h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-2 ${isBroken ? 'bg-rose-500 animate-pulse' : 'bg-rose-600'}`} style={{ width: `${Math.min(100, (maxCollisions / TARGET_COLLISIONS) * 100)}%` }}>
                {isBroken && <Zap size={14} className="text-white fill-white" />}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl p-6 shadow-md border-4 border-slate-800 flex-1 flex flex-col">
            <h2 className="text-lg font-bold mb-6 text-slate-200 text-center">Hash Map (Separate Chaining)</h2>
            <div className="flex-1 flex items-end justify-center gap-2 sm:gap-4">
              {buckets.map((bucket, i) => {
                const isTargetBucket = bucket.length === maxCollisions && maxCollisions > 1;
                return (
                  <div key={i} className="flex flex-col items-center w-16 sm:w-20">
                    <div className="flex flex-col-reverse gap-2 mb-2 w-full min-h-[240px] justify-start pb-2">
                      {bucket.map((k, idx) => (
                        <div key={`${k}-${idx}`} className="bg-gradient-to-br from-pink-600 to-rose-700 text-white font-black font-mono text-lg py-2 rounded-xl shadow-sm border-b-4 border-rose-900 flex items-center justify-center animate-in slide-in-from-top-4 fade-in">
                          {k}
                        </div>
                      ))}
                    </div>
                    <div className={`w-full h-12 rounded-b-2xl border-x-4 border-b-4 flex items-center justify-center font-black text-xl transition-colors ${isTargetBucket ? 'border-rose-700 bg-rose-900/30 text-rose-400' : 'border-indigo-800 bg-indigo-900/20 text-indigo-500'}`}>
                      {i}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {(isBroken || isGameOver) && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border-8 border-slate-800 text-center transform animate-in zoom-in-95 duration-300">
            {isBroken ? (
              <>
                <div className="w-24 h-24 bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-800/50">
                  <Trophy size={48} strokeWidth={2.5} />
                </div>
                <h2 className="text-3xl font-black text-slate-100 mb-2">Map Broken!</h2>
                <p className="text-slate-400 mb-8 font-medium">You successfully exploited the hash function to cause {maxCollisions} collisions in a single bucket.</p>
              </>
            ) : (
              <>
                <div className="w-24 h-24 bg-slate-800 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-slate-700">
                  <ShieldAlert size={48} strokeWidth={2.5} />
                </div>
                <h2 className="text-3xl font-black text-slate-100 mb-2">Out of Keys!</h2>
                <p className="text-slate-400 mb-8 font-medium">You used all {MAX_KEYS} keys but couldn't reach {TARGET_COLLISIONS} collisions. The hash map survived.</p>
              </>
            )}
            <button onClick={resetChallenge} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95">
              <RotateCcw size={24} /> Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// MAIN APP COMPONENT
// ==========================================
const TABS = [
  { id: 'lab', label: 'Hash Function Lab', icon: <Zap size={18} /> },
  { id: 'collisions', label: 'Collision Strategies', icon: <ShieldAlert size={18} /> },
  { id: 'stress', label: 'Load Factor Stress', icon: <BarChart3 size={18} /> },
  { id: 'rehash', label: 'Rehash Event', icon: <RefreshCwIcon /> },
  { id: 'mishash', label: 'Mis-hash Challenge', icon: <Swords size={18} /> },
];

export default function App() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  const renderContent = () => {
    switch (activeTab) {
      case 'lab': return <HashFunctionLab />;
      case 'collisions': return <CollisionStrategies />;
      case 'stress': return <LoadFactorStress />;
      case 'rehash': return <RehashEvent />;
      case 'mishash': return <MisHashChallenge />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans selection:bg-indigo-500/30">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-black tracking-tight text-indigo-400 flex items-center gap-2">
            <Zap className="fill-indigo-500 text-indigo-500" size={24} />
            Hash Map Explorer
          </h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-6xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}