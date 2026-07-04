import React, { useState, useMemo, useEffect, useRef, useCallback, FormEvent } from 'react';
import { 
  AlertCircle, BarChart3, Info, Zap, ShieldAlert, CheckCircle2, 
  Swords, Trophy, RotateCcw, AlertTriangle, Hash, Layers, 
  Activity, RefreshCw, Crosshair 
} from 'lucide-react';

// --- Shared Types & Constants ---

type HashType = 'mod' | 'mult';
type Strategy = 'chaining' | 'linear' | 'quadratic' | 'cuckoo';
type Phase = 'idle' | 'scanning' | 'calculating' | 'moving' | 'done';

interface KeyItem {
  id: string;
  val: string;
  color: string;
}

interface CellData {
  key: number;
  deleted?: boolean;
}

interface ActiveCell {
  table: number;
  index: number;
  status: 'probing' | 'success' | 'error';
}

type HashEntry = {
  key: string;
  originalHash: number;
  isMoved: boolean;
} | null;

interface RehashState {
  oldTable: HashEntry[];
  newTable: HashEntry[];
  phase: Phase;
  scanIndex: number;
  targetIndex: number | null;
  baseHash: number | null;
  probes: number;
  message: string;
  isPlaying: boolean;
}

const PASTEL_COLORS_LAB = [
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

const PASTEL_COLORS_STRESS = [
  'bg-[#FFB3BA]', 'bg-[#FFDFBA]', 'bg-[#FFFFBA]', 
  'bg-[#BAFFC9]', 'bg-[#BAE1FF]', 'bg-[#E8BAFF]',
];

const SAMPLE_WORDS = [
  'Apple', 'Banana', 'Cherry', 'Dolphin', 'Elephant', 'Fox', 'Giraffe', 'Hippo',
  'Igloo', 'Jelly', 'Kiwi', 'Llama', 'Mango', 'Noodle', 'Octopus', 'Penguin',
  'Quasar', 'Rabbit', 'Star', 'Turtle', 'Unicorn', 'Volcano', 'Waffle', 'Xenon',
  'Yoyo', 'Zebra', 'Bubble', 'Cactus', 'Daisy', 'Echo', 'Falcon', 'Galaxy'
];

const COLLISION_TABLE_SIZE = 11;
const CUCKOO_SIZE = 7;
const STRESS_TABLE_SIZE = 100;
const OLD_CAPACITY = 8;
const NEW_CAPACITY = 16;
const INITIAL_KEYS = ["Fox", "Cat", "Dog", "Pig", "Cow", "Ape"];
const MISHASH_TABLE_SIZE = 8;
const TARGET_COLLISIONS = 4;
const MAX_KEYS = 8;

// --- Shared Helpers ---

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getNumericValue = (str: string): number => {
  let sum = 0;
  for (let i = 0; i < str.length; i++) sum += str.charCodeAt(i);
  return sum;
};

const computeHash = (val: string, type: HashType, buckets: number): number => {
  const num = getNumericValue(val);
  if (type === 'mod') return num % buckets;
  const A = 0.6180339887;
  return Math.floor(buckets * ((num * A) % 1));
};

const getRandomColor = () => PASTEL_COLORS_LAB[Math.floor(Math.random() * PASTEL_COLORS_LAB.length)];

const generateGridData = () => {
  const cells = Array.from({ length: STRESS_TABLE_SIZE }, (_, i) => ({
    id: i,
    order: 0,
    color: PASTEL_COLORS_STRESS[Math.floor(Math.random() * PASTEL_COLORS_STRESS.length)],
  }));
  const shuffled = [...cells].sort(() => Math.random() - 0.5);
  shuffled.forEach((cell, index) => { cells[cell.id].order = index; });
  return cells;
};

const getBaseHash = (key: string, capacity: number) => {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash += key.charCodeAt(i);
  return hash % capacity;
};

const findPlacement = (table: HashEntry[], key: string, capacity: number) => {
  const baseHash = getBaseHash(key, capacity);
  let idx = baseHash;
  let probes = 0;
  while (table[idx] !== null && probes < capacity) {
    idx = (idx + 1) % capacity;
    probes++;
  }
  return { index: idx, probes, baseHash };
};

const createInitialRehashState = (): RehashState => {
  const oldTable: HashEntry[] = Array(OLD_CAPACITY).fill(null);
  const newTable: HashEntry[] = Array(NEW_CAPACITY).fill(null);
  INITIAL_KEYS.forEach(key => {
    const { index, baseHash } = findPlacement(oldTable, key, OLD_CAPACITY);
    if (index !== -1) oldTable[index] = { key, originalHash: baseHash, isMoved: false };
  });
  return {
    oldTable, newTable, phase: 'idle', scanIndex: 0, targetIndex: null,
    baseHash: null, probes: 0, message: "Hash map load factor exceeded 75%. Rehash triggered!", isPlaying: false,
  };
};

const misHashFunction = (key: number) => (key * 3) % MISHASH_TABLE_SIZE;

// --- Sub-Components ---

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
    setKeys((prev) => [...prev, { id: crypto.randomUUID(), val: trimmed, color: getRandomColor() }]);
    setInputValue('');
  };

  const handleAddRandom = () => {
    const randomWord = SAMPLE_WORDS[Math.floor(Math.random() * SAMPLE_WORDS.length)];
    const suffix = Math.floor(Math.random() * 100);
    setKeys((prev) => [...prev, { id: crypto.randomUUID(), val: `${randomWord}${suffix}`, color: getRandomColor() }]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="bg-slate-900 rounded-3xl p-8 shadow-md border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-indigo-400 tracking-tight mb-2">Hash Function Lab 🧪</h1>
          <p className="text-slate-400 max-w-xl leading-relaxed">
            Explore how different hash functions distribute keys across buckets. 
            Add keys manually or generate random ones to visualize collisions and load factors in real-time!
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
              <span className="bg-indigo-900/50 text-indigo-400 w-8 h-8 rounded-full flex items-center justify-center text-sm border border-indigo-800">1</span>
              Add Keys
            </h2>
            <form onSubmit={handleAddKey} className="flex gap-2 mb-4">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type a key..."
                className="flex-1 bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-semibold transition-colors shadow-sm">
                Add
              </button>
            </form>
            <div className="flex gap-2">
              <button onClick={handleAddRandom} className="flex-1 bg-teal-900/30 hover:bg-teal-900/50 text-teal-400 py-2 rounded-xl font-semibold transition-colors border border-teal-800/50">
                + Random Key
              </button>
              <button onClick={() => setKeys([])} className="flex-1 bg-rose-900/30 hover:bg-rose-900/50 text-rose-400 py-2 rounded-xl font-semibold transition-colors border border-rose-800/50">
                Clear All
              </button>
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl p-6 shadow-md border border-slate-800">
            <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
              <span className="bg-indigo-900/50 text-indigo-400 w-8 h-8 rounded-full flex items-center justify-center text-sm border border-indigo-800">2</span>
              Configure Hash
            </h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">Hash Function</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setHashType('mod')}
                    className={`py-3 px-2 rounded-xl border-2 font-semibold transition-all ${
                      hashType === 'mod' ? 'border-indigo-500 bg-indigo-900/30 text-indigo-300' : 'border-slate-800 bg-slate-950 text-slate-500 hover:bg-slate-800'
                    }`}
                  >
                    Modulo
                  </button>
                  <button
                    onClick={() => setHashType('mult')}
                    className={`py-3 px-2 rounded-xl border-2 font-semibold transition-all ${
                      hashType === 'mult' ? 'border-indigo-500 bg-indigo-900/30 text-indigo-300' : 'border-slate-800 bg-slate-950 text-slate-500 hover:bg-slate-800'
                    }`}
                  >
                    Multiplicative
                  </button>
                </div>
                <div className="mt-3 bg-slate-950 text-emerald-400 font-mono text-sm p-3 rounded-xl overflow-x-auto border border-slate-800">
                  {hashType === 'mod' ? 'h(k) = k mod m' : 'h(k) = floor(m * ((k * A) mod 1))'}
                </div>
                {hashType === 'mult' && <p className="text-xs text-slate-500 mt-2 ml-1">* A ≈ 0.618033 (Golden Ratio)</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2 flex justify-between">
                  <span>Buckets (m)</span>
                  <span className="text-indigo-300 bg-indigo-900/50 px-2 rounded-md border border-indigo-800">{bucketCount}</span>
                </label>
                <input
                  type="range" min="4" max="32" step="4" value={bucketCount}
                  onChange={(e) => setBucketCount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1 px-1">
                  <span>4</span><span>16</span><span>32</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 bg-slate-900 rounded-3xl p-6 shadow-md border border-slate-800 flex flex-col">
          <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
            <span className="bg-indigo-900/50 text-indigo-400 w-8 h-8 rounded-full flex items-center justify-center text-sm border border-indigo-800">3</span>
            Bucket Distribution
          </h2>
          <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 p-4 overflow-y-auto">
            {keys.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 min-h-[300px]">
                <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center rotate-12 border border-slate-800">
                  <span className="text-3xl">🪣</span>
                </div>
                <p className="font-medium">Add some keys to see them fall into buckets!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {distributedBuckets.map((bucket, i) => {
                  const isCollision = bucket.length > 1;
                  return (
                    <div key={i} className={`relative flex flex-col rounded-2xl border-2 transition-all duration-300 min-h-[120px] ${
                      isCollision ? 'border-rose-900/50 bg-rose-950/30' : bucket.length === 1 ? 'border-indigo-900/50 bg-slate-900' : 'border-slate-800 bg-slate-900/50'
                    }`}>
                      <div className={`text-xs font-bold px-3 py-2 border-b-2 rounded-t-xl flex justify-between items-center ${
                        isCollision ? 'border-rose-900/50 bg-rose-900/20 text-rose-400' : bucket.length === 1 ? 'border-indigo-900/50 bg-indigo-900/20 text-indigo-400' : 'border-slate-800 text-slate-500'
                      }`}>
                        <span>Bucket {i}</span>
                        {bucket.length > 0 && <span className="bg-slate-950 px-2 py-0.5 rounded-full shadow-sm">{bucket.length}</span>}
                      </div>
                      <div className="p-2 flex flex-wrap gap-1.5 content-start flex-1">
                        {bucket.map((k) => (
                          <div key={k.id} className={`text-xs font-bold px-2 py-1 rounded-lg border shadow-sm animate-in fade-in zoom-in duration-300 ${k.color}`} title={`Numeric value: ${getNumericValue(k.val)}`}>
                            {k.val}
                          </div>
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
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
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
    let base = "flex items-center justify-center w-12 h-12 rounded-xl border-2 font-bold text-lg transition-all duration-300 ";
    if (activeCell?.table === tId && activeCell?.index === idx) {
      if (activeCell.status === 'probing') base += "bg-yellow-900/50 border-yellow-500 scale-110 shadow-lg z-10 text-yellow-200";
      else if (activeCell.status === 'success') base += "bg-green-900/50 border-green-500 scale-110 shadow-lg z-10 text-green-200";
      else if (activeCell.status === 'error') base += "bg-red-900/50 border-red-500 scale-110 shadow-lg z-10 text-red-200";
    } else {
      if (isDeleted) base += "bg-slate-800 border-slate-700 border-dashed text-slate-500";
      else base += "bg-slate-900 border-slate-700 text-slate-200 shadow-sm";
    }
    return base;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="bg-slate-900 rounded-3xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-fuchsia-400 tracking-tight mb-2">Collision Strategies ✨</h1>
          <p className="text-slate-400 font-medium">Visualize chaining, linear/quadratic probing, and cuckoo hashing.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-400 mb-2">Strategy</label>
            <select 
              value={strategy} 
              onChange={(e) => handleStrategyChange(e.target.value as Strategy)} 
              className="w-full bg-slate-950 border border-slate-700 text-slate-100 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
            >
              <option value="chaining">Separate Chaining</option>
              <option value="linear">Linear Probing</option>
              <option value="quadratic">Quadratic Probing</option>
              <option value="cuckoo">Cuckoo Hashing</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-400 mb-2">Key Operation</label>
            <input 
              type="number" 
              value={inputValue} 
              onChange={(e) => setInputValue(e.target.value)} 
              placeholder="Enter a positive integer" 
              className="w-full bg-slate-950 border border-slate-700 text-slate-100 p-3 rounded-xl mb-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500" 
            />
            <div className="flex gap-2">
              <button onClick={() => handleOperation('insert')} disabled={isAnimating} className="flex-1 bg-fuchsia-600 hover:bg-fuchsia-500 text-white p-2 rounded-xl font-semibold disabled:opacity-50 transition-colors">Insert</button>
              <button onClick={() => handleOperation('search')} disabled={isAnimating} className="flex-1 bg-teal-600 hover:bg-teal-500 text-white p-2 rounded-xl font-semibold disabled:opacity-50 transition-colors">Search</button>
              <button onClick={() => handleOperation('delete')} disabled={isAnimating} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white p-2 rounded-xl font-semibold disabled:opacity-50 transition-colors">Delete</button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-400 mb-2">Execution Log</label>
            <div className="h-48 overflow-y-auto bg-slate-950 p-3 rounded-xl border border-slate-800 text-sm font-mono text-slate-300 space-y-1">
              {logs.length === 0 && <span className="text-slate-600 italic">No operations yet...</span>}
              {logs.map((l, i) => <div key={i}>{l}</div>)}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 bg-slate-900 p-6 rounded-3xl border border-slate-800 overflow-x-auto min-h-[400px]">
          <h2 className="text-lg font-bold text-slate-200 mb-6">Hash Table Visualization</h2>
          
          {strategy === 'chaining' && (
             <div className="flex flex-col gap-3">
               {chainingRef.current.map((bucket, i) => (
                 <div key={i} className="flex items-center gap-3">
                   <div className="w-8 text-right text-slate-500 font-mono font-bold">{i}</div>
                   <div className={getCellClasses(1, i)}></div>
                   {bucket.length > 0 && <div className="w-4 h-0.5 bg-slate-700"></div>}
                   {bucket.map((cell, j) => (
                     <React.Fragment key={j}>
                       <div className="w-12 h-12 flex items-center justify-center bg-fuchsia-900/30 border border-fuchsia-700/50 text-fuchsia-200 rounded-xl font-bold shadow-sm animate-in zoom-in">
                         {cell.key}
                       </div>
                       {j < bucket.length - 1 && <div className="w-4 h-0.5 bg-slate-700"></div>}
                     </React.Fragment>
                   ))}
                 </div>
               ))}
             </div>
          )}

          {(strategy === 'linear' || strategy === 'quadratic') && (
             <div className="flex flex-wrap gap-4">
               {openAddrRef.current.map((cell, i) => (
                 <div key={i} className="flex flex-col items-center gap-2">
                   <div className="text-xs text-slate-500 font-mono font-bold">{i}</div>
                   <div className={getCellClasses(1, i, cell?.deleted)}>
                     {cell && !cell.deleted ? cell.key : ''}
                   </div>
                 </div>
               ))}
             </div>
          )}

          {strategy === 'cuckoo' && (
             <div className="flex flex-col gap-10">
               <div>
                 <h3 className="text-slate-400 font-bold mb-4 flex items-center gap-2">
                   <span className="w-3 h-3 rounded-full bg-blue-500"></span> Table 1 (Hash 1)
                 </h3>
                 <div className="flex flex-wrap gap-4">
                   {cuckooRef.current[0].map((cell, i) => (
                     <div key={i} className="flex flex-col items-center gap-2">
                       <div className="text-xs text-slate-500 font-mono font-bold">{i}</div>
                       <div className={getCellClasses(1, i)}>{cell ? cell.key : ''}</div>
                     </div>
                   ))}
                 </div>
               </div>
               <div>
                 <h3 className="text-slate-400 font-bold mb-4 flex items-center gap-2">
                   <span className="w-3 h-3 rounded-full bg-purple-500"></span> Table 2 (Hash 2)
                 </h3>
                 <div className="flex flex-wrap gap-4">
                   {cuckooRef.current[1].map((cell, i) => (
                     <div key={i} className="flex flex-col items-center gap-2">
                       <div className="text-xs text-slate-500 font-mono font-bold">{i}</div>
                       <div className={getCellClasses(2, i)}>{cell ? cell.key : ''}</div>
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

function StrategyCard({ title, colorClass, succ, unsucc, description }: { title: string; colorClass: string; succ: number; unsucc: number; description: string; }) {
  const MAX_PROBES_CHART = 50; 
  const getWidth = (val: number) => {
    if (!isFinite(val)) return '100%';
    const pct = (val / MAX_PROBES_CHART) * 100;
    return `${Math.min(pct, 100)}%`;
  };
  const isExploding = unsucc > MAX_PROBES_CHART;

  return (
    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-700 shadow-[6px_6px_0px_rgba(0,0,0,0.3)] flex flex-col h-full relative overflow-hidden group hover:-translate-y-1 hover:shadow-[8px_8px_0px_rgba(0,0,0,0.4)] transition-all">
      <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full opacity-10 transition-transform group-hover:scale-150 ${colorClass}`} />
      <h3 className="text-xl font-bold text-slate-100 mb-2 relative z-10">{title}</h3>
      <p className="text-xs text-slate-400 font-medium mb-5 min-h-[40px] relative z-10">{description}</p>
      <div className="space-y-4 mt-auto relative z-10">
        <div>
          <div className="flex justify-between text-sm font-bold mb-1">
            <span className="text-slate-400">Successful Hit</span>
            <span className="text-slate-200">{succ.toFixed(2)}</span>
          </div>
          <div className="h-3 w-full bg-slate-800 rounded-full border border-slate-700 overflow-hidden">
            <div className={`h-full border-r border-slate-900 transition-all duration-300 ${colorClass}`} style={{ width: getWidth(succ) }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm font-bold mb-1">
            <span className="text-slate-400">Unsuccessful / Miss</span>
            <span className={`transition-colors ${isExploding ? 'text-red-400 font-black' : 'text-slate-200'}`}>
              {!isFinite(unsucc) || unsucc > 999 ? "∞" : unsucc.toFixed(2)}
            </span>
          </div>
          <div className="h-3 w-full bg-slate-800 rounded-full border border-slate-700 overflow-hidden relative">
            <div className={`h-full border-r border-slate-900 transition-all duration-300 ${isExploding ? 'bg-red-500' : colorClass}`} style={{ width: getWidth(unsucc) }} />
            {isExploding && <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAiPjwvcmVjdD4KPHBhdGggZD0iTTAgMEw4IDhaIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiI+PC9wYXRoPgo8L3N2Zz4=')] opacity-20 pointer-events-none" />}
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
    return {
      chaining: { succ: 1 + safeAlpha / 2, unsucc: safeAlpha },
      linear: { succ: 0.5 * (1 + 1 / (1 - safeAlpha)), unsucc: 0.5 * (1 + 1 / Math.pow(1 - safeAlpha, 2)) },
      quadratic: { succ: 1 - Math.log(1 - safeAlpha) - safeAlpha / 2, unsucc: 1 / (1 - safeAlpha) - safeAlpha - Math.log(1 - safeAlpha) },
      cuckoo: { succ: 1.5, unsucc: 2.0 }
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800 border-dashed">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3 text-slate-100">
            <Zap className="w-10 h-10 text-yellow-400 fill-yellow-400/20 stroke-2" />
            Load Factor Stress
          </h1>
          <p className="text-slate-400 mt-2 text-lg font-medium max-w-2xl">
            Push the limits of your hash map. Observe how different collision resolution strategies degrade as the table fills up toward <span className="font-bold text-slate-200">α = 0.95</span>.
          </p>
        </div>
        <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-[4px_4px_0px_rgba(0,0,0,0.3)] transition-colors ${statusBg}`}>
          {statusIcon}
          <span className={`font-bold text-lg uppercase tracking-wide ${statusColor}`}>{statusText}</span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-700 shadow-[8px_8px_0px_rgba(0,0,0,0.3)]">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2 mb-1 text-slate-100">
                  Load Factor (<span className="font-serif italic">α</span>)
                </h2>
                <p className="text-sm text-slate-400 font-medium">Elements / Table Size</p>
              </div>
              <div className="text-4xl font-black text-slate-900 bg-[#E8BAFF] px-4 py-2 rounded-xl border-2 border-slate-700">
                {alpha.toFixed(2)}
              </div>
            </div>
            <input
              type="range" min="0.01" max="0.95" step="0.01" value={loadFactor}
              onChange={(e) => setLoadFactor(parseFloat(e.target.value))}
              className="w-full h-4 bg-slate-800 rounded-full appearance-none cursor-pointer border border-slate-700 accent-[#BAE1FF] focus:outline-none focus:ring-4 focus:ring-[#BAE1FF]/30"
            />
            <div className="flex justify-between text-xs font-bold text-slate-500 mt-3 px-1">
              <span>0.01 (Empty)</span><span>0.5 (Ideal)</span><span>0.95 (Stressed)</span>
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-700 shadow-[8px_8px_0px_rgba(0,0,0,0.3)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2 text-slate-100">
                <BarChart3 className="w-6 h-6 text-slate-400" /> Bucket Visualization
              </h3>
              <span className="bg-slate-800 text-slate-200 text-sm font-bold px-3 py-1 rounded-full border border-slate-700">
                {filledCount} / 100 Filled
              </span>
            </div>
            <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
              {gridData.map((cell) => {
                const isFilled = cell.order < filledCount;
                return (
                  <div key={cell.id} className={`aspect-square rounded-md border transition-all duration-300 ${
                    isFilled ? `${cell.color} border-slate-900 scale-100 opacity-100 shadow-[2px_2px_0px_rgba(0,0,0,0.5)]` : `bg-slate-800 border-slate-700 scale-95 opacity-30`
                  }`} />
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <h2 className="text-3xl font-black text-slate-100 mb-2">Expected Probes</h2>
          <p className="text-slate-400 font-medium mb-6">
            Average number of table accesses required to find an element or verify it doesn't exist.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <StrategyCard title="Linear Probing" colorClass="bg-[#FFB3BA]" succ={stats.linear.succ} unsucc={stats.linear.unsucc} description="Checks contiguous buckets. Suffers heavily from primary clustering." />
            <StrategyCard title="Quadratic Probing" colorClass="bg-[#FFDFBA]" succ={stats.quadratic.succ} unsucc={stats.quadratic.unsucc} description="Checks buckets at quadratically increasing intervals. Mild secondary clustering." />
            <StrategyCard title="Separate Chaining" colorClass="bg-[#BAFFC9]" succ={stats.chaining.succ} unsucc={stats.chaining.unsucc} description="Stores elements in linked lists. Graceful degradation, but extra memory." />
            <StrategyCard title="Cuckoo Hashing" colorClass="bg-[#BAE1FF]" succ={stats.cuckoo.succ} unsucc={stats.cuckoo.unsucc} description="Constant O(1) lookups bounded strictly to 2 probes. High insert cost near limits." />
          </div>
          <div className="mt-8 bg-yellow-900/20 p-6 rounded-3xl border border-yellow-700/50 shadow-[6px_6px_0px_rgba(0,0,0,0.3)] flex gap-4 items-start">
            <Info className="w-8 h-8 text-yellow-500 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-bold text-lg text-yellow-400 mb-2">Why does Open Addressing fail at α → 1?</h4>
              <p className="text-slate-300 font-medium leading-relaxed">
                As the table fills, contiguous blocks of occupied buckets merge (clustering). A new insertion or an unsuccessful search must scan past these entire blocks. Notice how <strong>Linear Probing</strong> expected probes skyrocket exponentially after α = 0.7. This is why hash maps automatically rehash (resize) well before becoming completely full!
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function RehashEvent() {
  const [state, setState] = useState<RehashState>(createInitialRehashState());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const stepForward = useCallback(() => {
    setState(prev => {
      const { oldTable, newTable, phase, scanIndex } = prev;
      if (phase === 'idle') return { ...prev, phase: 'scanning', message: `Scanning old table for keys...` };
      if (phase === 'scanning') {
        if (scanIndex >= OLD_CAPACITY) return { ...prev, phase: 'done', message: "Rehash complete! New table is ready.", isPlaying: false };
        const entry = oldTable[scanIndex];
        if (!entry || entry.isMoved) return { ...prev, scanIndex: scanIndex + 1, message: `Bucket ${scanIndex} is empty. Skipping.` };
        const { index, probes, baseHash } = findPlacement(newTable, entry.key, NEW_CAPACITY);
        return { ...prev, phase: 'calculating', targetIndex: index, baseHash, probes, message: `Found '${entry.key}' at index ${scanIndex}. Calculating new hash: hash('${entry.key}') % 16 = ${baseHash}.` };
      }
      if (phase === 'calculating') {
        const entry = oldTable[scanIndex]!;
        let msg = `Moving '${entry.key}' to index ${prev.targetIndex}.`;
        if (prev.probes > 0) msg = `Collision at ${prev.baseHash}! Linear probing found empty slot at index ${prev.targetIndex}. Moving '${entry.key}'.`;
        return { ...prev, phase: 'moving', message: msg };
      }
      if (phase === 'moving') {
        const entry = oldTable[scanIndex]!;
        const updatedOldTable = [...oldTable];
        updatedOldTable[scanIndex] = { ...entry, isMoved: true };
        const updatedNewTable = [...newTable];
        updatedNewTable[prev.targetIndex!] = { key: entry.key, originalHash: prev.baseHash!, isMoved: false };
        return { ...prev, oldTable: updatedOldTable, newTable: updatedNewTable, phase: 'scanning', scanIndex: scanIndex + 1, targetIndex: null, baseHash: null, probes: 0, message: `Successfully moved '${entry.key}'. Continuing scan...` };
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    if (state.isPlaying && state.phase !== 'done') {
      let delay = 800;
      if (state.phase === 'scanning' && !state.oldTable[state.scanIndex]) delay = 300;
      timerRef.current = setTimeout(stepForward, delay);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [state.isPlaying, state.phase, state.scanIndex, stepForward, state.oldTable]);

  const togglePlay = () => setState(p => ({ ...p, isPlaying: !p.isPlaying }));
  const handleReset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState(createInitialRehashState());
  };

  const getOldBucketClass = (index: number, entry: HashEntry) => {
    let base = "relative flex flex-col items-center justify-center h-20 rounded-xl border transition-all duration-300 ";
    if (state.phase !== 'done' && state.scanIndex === index) base += "ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-900 scale-105 z-10 ";
    if (!entry) return base + "bg-slate-800 border-slate-700 text-transparent";
    if (entry.isMoved) return base + "bg-slate-800 border-slate-700 opacity-40 grayscale";
    return base + "bg-rose-900/30 border-rose-700/50 text-rose-200 shadow-sm";
  };

  const getNewBucketClass = (index: number, entry: HashEntry) => {
    let base = "relative flex flex-col items-center justify-center h-20 rounded-xl border transition-all duration-300 ";
    if ((state.phase === 'calculating' || state.phase === 'moving') && state.targetIndex === index) base += "ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-900 scale-105 z-10 bg-yellow-900/30 border-yellow-500 text-yellow-200 ";
    else if (!entry) base += "bg-slate-800 border-slate-700 text-transparent";
    else base += "bg-green-900/30 border-green-700/50 text-green-200 shadow-sm";
    return base;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 flex flex-col items-center">
      <div className="max-w-4xl w-full text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-100 mb-3">
          Rehash Event <span className="text-rose-400">Explorer</span>
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          When a hash map gets too full, it creates a larger array and moves all existing keys over. 
          Watch how the indices are recalculated based on the new capacity!
        </p>
      </div>

      <div className="max-w-5xl w-full bg-slate-900 rounded-3xl shadow-xl border border-slate-800 overflow-hidden flex flex-col">
        <div className="bg-slate-950 border-b border-slate-800 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} disabled={state.phase === 'done'} className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold transition-colors ${state.phase === 'done' ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : state.isPlaying ? 'bg-rose-900/50 text-rose-400 hover:bg-rose-900/70' : 'bg-green-900/50 text-green-400 hover:bg-green-900/70'}`}>
              {state.isPlaying ? <><RefreshCw className="w-5 h-5 animate-spin" /> Pause</> : <><ArrowRight className="w-5 h-5" /> Auto-Play</>}
            </button>
            <button onClick={stepForward} disabled={state.isPlaying || state.phase === 'done'} className="flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              Step Forward <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={handleReset} className="p-2.5 rounded-full text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors" title="Reset">
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 w-full bg-slate-900 border border-slate-800 rounded-xl p-3 px-5 shadow-inner flex items-center min-h-[3rem]">
            <p className="text-[15px] font-medium text-slate-200 animate-fade-in">{state.message}</p>
          </div>
        </div>

        <div className="p-8 flex flex-col gap-12 bg-slate-900/50">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-end px-1">
              <h2 className="text-lg font-bold text-slate-300 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-400"></span> Old Table <span className="text-sm font-normal text-slate-500">(Capacity: 8)</span>
              </h2>
              <span className="text-xs font-semibold px-2 py-1 bg-red-900/30 text-red-400 rounded-md border border-red-800/50">Load: 75% (Full)</span>
            </div>
            <div className="grid grid-cols-8 gap-3">
              {state.oldTable.map((entry, idx) => (
                <div key={`old-${idx}`} className={getOldBucketClass(idx, entry)}>
                  <span className="absolute top-1 left-2 text-[10px] font-bold text-slate-500">{idx}</span>
                  {entry && (
                    <>
                      <span className="text-lg font-black tracking-wide">{entry.key}</span>
                      <span className="text-[10px] opacity-70 font-mono mt-1">h:{entry.originalHash}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center items-center h-8 relative">
             <div className="absolute w-full h-px border-t border-dashed border-slate-700"></div>
             {(state.phase === 'calculating' || state.phase === 'moving') && state.oldTable[state.scanIndex] && (
                <div className="z-10 bg-slate-900 px-4 py-1.5 rounded-full border border-yellow-500/50 shadow-sm text-sm font-mono font-bold text-yellow-400 animate-bounce">
                  {state.oldTable[state.scanIndex]?.key} % 16 = {state.baseHash}
                </div>
             )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-end px-1">
              <h2 className="text-lg font-bold text-slate-300 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-400"></span> New Table <span className="text-sm font-normal text-slate-500">(Capacity: 16)</span>
              </h2>
              <span className="text-xs font-semibold px-2 py-1 bg-green-900/30 text-green-400 rounded-md border border-green-800/50">
                Load: {Math.round((state.newTable.filter(Boolean).length / NEW_CAPACITY) * 100)}%
              </span>
            </div>
            <div className="grid grid-cols-8 gap-3">
              {state.newTable.map((entry, idx) => (
                <div key={`new-${idx}`} className={getNewBucketClass(idx, entry)}>
                  <span className="absolute top-1 left-2 text-[10px] font-bold text-slate-500">{idx}</span>
                  {entry && (
                    <>
                      <span className="text-lg font-black tracking-wide">{entry.key}</span>
                      <span className="text-[10px] opacity-70 font-mono mt-1">h:{entry.originalHash}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MisHashChallenge() {
  const [keys, setKeys] = useState<number[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [showHint, setShowHint] = useState<boolean>(false);

  const buckets = useMemo(() => {
    const b = Array.from({ length: MISHASH_TABLE_SIZE }, () => [] as number[]);
    keys.forEach((k) => { b[misHashFunction(k)].push(k); });
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

  const resetChallenge = () => { setKeys([]); setInputValue(''); setShowHint(false); };

  const hintText = useMemo(() => {
    if (keys.length === 0) return "Try entering numbers that are exactly 8 apart (e.g., 1, 9, 17...).";
    return `Since h(x) uses modulo 8, adding 8 to your key gives the same hash! Try ${keys[0] + 8}.`;
  }, [keys]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
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
          <div className="bg-amber-900/30 text-amber-400 px-4 py-2 rounded-xl flex items-center gap-2 border border-amber-800/50">
            <Zap size={18} /> <span>Target: {TARGET_COLLISIONS} Collisions</span>
          </div>
          <div className="bg-blue-900/30 text-blue-400 px-4 py-2 rounded-xl flex items-center gap-2 border border-blue-800/50">
            <ShieldAlert size={18} /> <span>Max Keys: {MAX_KEYS}</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-800">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-200">
              <Info className="text-indigo-400" size={20} /> The Strategy
            </h2>
            <div className="bg-slate-950 rounded-2xl p-4 mb-6 border border-slate-800 text-center">
              <p className="text-sm text-indigo-400 font-bold uppercase tracking-wider mb-1">Hash Function</p>
              <code className="text-xl font-mono font-black text-indigo-300">h(x) = (x * 3) % 8</code>
            </div>
            <form onSubmit={handleAddKey} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Enter a positive integer:</label>
                <div className="flex gap-2">
                  <input type="number" min="0" value={inputValue} onChange={(e) => setInputValue(e.target.value)} disabled={isBroken || isGameOver} placeholder="e.g. 42" className="flex-1 bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 font-mono text-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50" />
                  <button type="submit" disabled={!inputValue || isBroken || isGameOver} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100">Add</button>
                </div>
              </div>
            </form>
            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-sm font-bold text-slate-400">
                <span>Keys Used:</span>
                <span className={keys.length === MAX_KEYS ? 'text-rose-400' : 'text-slate-200'}>{keys.length} / {MAX_KEYS}</span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-500 ease-out" style={{ width: `${(keys.length / MAX_KEYS) * 100}%` }} />
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-800">
              {!showHint ? (
                <button onClick={() => setShowHint(true)} className="text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors">Stuck? Need a hint?</button>
              ) : (
                <div className="bg-amber-900/20 border border-amber-700/50 text-amber-300 p-4 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2">{hintText}</div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-800 flex-1">
            <h2 className="text-lg font-bold mb-4 text-slate-200">Execution Log</h2>
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
              {keys.length === 0 && <p className="text-slate-500 text-sm italic text-center py-4">No keys added yet.</p>}
              {[...keys].reverse().map((k, idx) => {
                const step1 = k * 3;
                const step2 = step1 % 8;
                return (
                  <div key={`${k}-${idx}`} className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-mono flex flex-col gap-1 animate-in slide-in-from-left-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-300">Key: {k}</span>
                      <span className="text-indigo-400 font-bold">Bucket {step2}</span>
                    </div>
                    <div className="text-slate-500 text-xs">
                      ({k} * 3) = {step1} → {step1} % 8 = <span className="text-indigo-300 font-bold">{step2}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col space-y-6">
          <div className="bg-slate-900 rounded-3xl p-6 shadow-sm border border-rose-900/50 relative overflow-hidden">
            <div className="relative z-10 flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-rose-300 flex items-center gap-2">
                <AlertTriangle className="text-rose-500" size={20} /> Damage Meter (Max Collisions)
              </h2>
              <span className="font-black text-2xl text-rose-400">{maxCollisions} / {TARGET_COLLISIONS}</span>
            </div>
            <div className="relative z-10 h-6 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div className={`h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-2 ${isBroken ? 'bg-rose-500 animate-pulse' : 'bg-rose-600'}`} style={{ width: `${Math.min(100, (maxCollisions / TARGET_COLLISIONS) * 100)}%` }}>
                {isBroken && <Zap size={14} className="text-white fill-white" />}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-800 flex-1 flex flex-col">
            <h2 className="text-lg font-bold mb-6 text-slate-300 text-center">Hash Map (Separate Chaining)</h2>
            <div className="flex-1 flex items-end justify-center gap-2 sm:gap-4">
              {buckets.map((bucket, i) => {
                const isTargetBucket = bucket.length === maxCollisions && maxCollisions > 1;
                return (
                  <div key={i} className="flex flex-col items-center w-16 sm:w-20">
                    <div className="flex flex-col-reverse gap-2 mb-2 w-full min-h-[240px] justify-start pb-2">
                      {bucket.map((k, idx) => (
                        <div key={`${k}-${idx}`} className="bg-gradient-to-br from-pink-600 to-rose-600 text-white font-black font-mono text-lg py-2 rounded-xl shadow-sm border-b-4 border-rose-800 flex items-center justify-center animate-in slide-in-from-top-4 fade-in">
                          {k}
                        </div>
                      ))}
                    </div>
                    <div className={`w-full h-12 rounded-b-2xl border-x-4 border-b-4 flex items-center justify-center font-black text-xl transition-colors ${
                      isTargetBucket ? 'border-rose-700 bg-rose-900/30 text-rose-400' : 'border-indigo-800/50 bg-indigo-900/20 text-indigo-400'
                    }`}>
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
          <div className="bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-700 text-center transform animate-in zoom-in-95 duration-300">
            {isBroken ? (
              <>
                <div className="w-24 h-24 bg-rose-900/30 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-800/50">
                  <Trophy size={48} strokeWidth={2.5} />
                </div>
                <h2 className="text-3xl font-black text-slate-100 mb-2">Map Broken!</h2>
                <p className="text-slate-400 mb-8 font-medium">You successfully exploited the hash function to cause {maxCollisions} collisions in a single bucket.</p>
              </>
            ) : (
              <>
                <div className="w-24 h-24 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-700">
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

// --- Main App Component ---

const TABS = [
  { id: 'lab', label: 'Hash Function Lab', icon: Hash },
  { id: 'collisions', label: 'Collision Strategies', icon: Layers },
  { id: 'stress', label: 'Load Factor Stress', icon: Activity },
  { id: 'rehash', label: 'Rehash Event', icon: RefreshCw },
  { id: 'mishash', label: 'Mis-hash Challenge', icon: Crosshair },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('lab');

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans selection:bg-indigo-500/30">
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400 tracking-tight">
            Hash Map Explorer
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wider">Interactive Modules</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-indigo-200' : 'text-slate-500'} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
      <div className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'lab' && <HashFunctionLab />}
          {activeTab === 'collisions' && <CollisionStrategies />}
          {activeTab === 'stress' && <LoadFactorStress />}
          {activeTab === 'rehash' && <RehashEvent />}
          {activeTab === 'mishash' && <MisHashChallenge />}
        </div>
      </div>
    </div>
  );
}