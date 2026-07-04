import React, { useState, useMemo, FormEvent, useRef, useEffect, useCallback } from 'react';
import { Swords, ShieldAlert, Trophy, RotateCcw, AlertTriangle, Zap, Info } from 'lucide-react';

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

const PASTEL_COLORS = [
  'bg-rose-200 text-rose-900 border-rose-300',
  'bg-orange-200 text-orange-900 border-orange-300',
  'bg-amber-200 text-amber-900 border-amber-300',
  'bg-green-200 text-green-900 border-green-300',
  'bg-emerald-200 text-emerald-900 border-emerald-300',
  'bg-teal-200 text-teal-900 border-teal-300',
  'bg-cyan-200 text-cyan-900 border-cyan-300',
  'bg-blue-200 text-blue-900 border-blue-300',
  'bg-indigo-200 text-indigo-900 border-indigo-300',
  'bg-violet-200 text-violet-900 border-violet-300',
  'bg-purple-200 text-purple-900 border-purple-300',
  'bg-fuchsia-200 text-fuchsia-900 border-fuchsia-300',
  'bg-pink-200 text-pink-900 border-pink-300',
];

const SAMPLE_WORDS = [
  'Apple', 'Banana', 'Cherry', 'Dolphin', 'Elephant', 'Fox', 'Giraffe', 'Hippo',
  'Igloo', 'Jelly', 'Kiwi', 'Llama', 'Mango', 'Noodle', 'Octopus', 'Penguin',
  'Quasar', 'Rabbit', 'Star', 'Turtle', 'Unicorn', 'Volcano', 'Waffle', 'Xenon',
  'Yoyo', 'Zebra', 'Bubble', 'Cactus', 'Daisy', 'Echo', 'Falcon', 'Galaxy'
];

const B2_TABLE_SIZE = 11;
const CUCKOO_SIZE = 7;
const OLD_CAPACITY = 8;
const NEW_CAPACITY = 16;
const INITIAL_KEYS = ["Fox", "Cat", "Dog", "Pig", "Cow", "Ape"];
const B5_TABLE_SIZE = 8;
const TARGET_COLLISIONS = 4;
const MAX_KEYS = 8;

// --- Shared Helpers ---

const getNumericValue = (str: string): number => {
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    sum += str.charCodeAt(i);
  }
  return sum;
};

const computeHash = (val: string, type: HashType, buckets: number): number => {
  const num = getNumericValue(val);
  if (type === 'mod') return num % buckets;
  const A = 0.6180339887;
  return Math.floor(buckets * ((num * A) % 1));
};

const getRandomColor = () => PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const calcChaining = (alpha: number) => ({
  successful: 1 + alpha / 2,
  unsuccessful: 1 + alpha,
});

const calcLinear = (alpha: number) => ({
  successful: 0.5 * (1 + 1 / (1 - alpha)),
  unsuccessful: 0.5 * (1 + 1 / Math.pow(1 - alpha, 2)),
});

const calcQuadratic = (alpha: number) => ({
  successful: alpha === 0 ? 1 : (1 / alpha) * Math.log(1 / (1 - alpha)),
  unsuccessful: 1 / (1 - alpha),
});

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

const b5HashFunction = (key: number) => (key * 3) % B5_TABLE_SIZE;

// --- Module Components ---

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
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <header className="bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
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
          <div className="bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-800">
            <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
              <span className="bg-indigo-900/50 text-indigo-400 w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
              Add Keys
            </h2>
            <form onSubmit={handleAddKey} className="flex gap-2 mb-4">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type a key..."
                className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-semibold transition-colors">Add</button>
            </form>
            <div className="flex gap-2">
              <button onClick={handleAddRandom} className="flex-1 bg-teal-900/30 hover:bg-teal-900/50 text-teal-400 py-2 rounded-xl font-semibold transition-colors border border-teal-900/50">+ Random Key</button>
              <button onClick={() => setKeys([])} className="flex-1 bg-rose-900/30 hover:bg-rose-900/50 text-rose-400 py-2 rounded-xl font-semibold transition-colors border border-rose-900/50">Clear All</button>
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-800">
            <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
              <span className="bg-indigo-900/50 text-indigo-400 w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
              Configure Hash
            </h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">Hash Function</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setHashType('mod')} className={`py-3 px-2 rounded-xl border-2 font-semibold transition-all ${hashType === 'mod' ? 'border-indigo-500 bg-indigo-900/30 text-indigo-300' : 'border-slate-800 bg-slate-950 text-slate-500 hover:bg-slate-800'}`}>Modulo</button>
                  <button onClick={() => setHashType('mult')} className={`py-3 px-2 rounded-xl border-2 font-semibold transition-all ${hashType === 'mult' ? 'border-indigo-500 bg-indigo-900/30 text-indigo-300' : 'border-slate-800 bg-slate-950 text-slate-500 hover:bg-slate-800'}`}>Multiplicative</button>
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
                <input type="range" min="4" max="32" step="4" value={bucketCount} onChange={(e) => setBucketCount(Number(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                <div className="flex justify-between text-xs text-slate-500 mt-1 px-1"><span>4</span><span>16</span><span>32</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-800 flex flex-col">
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
                    <div key={i} className={`relative flex flex-col rounded-2xl border-2 transition-all duration-300 min-h-[120px] ${isCollision ? 'border-rose-900/50 bg-rose-950/30' : bucket.length === 1 ? 'border-indigo-900/50 bg-slate-900' : 'border-slate-800 bg-slate-900/50'}`}>
                      <div className={`text-xs font-bold px-3 py-2 border-b-2 rounded-t-xl flex justify-between items-center ${isCollision ? 'border-rose-900/50 bg-rose-900/20 text-rose-400' : bucket.length === 1 ? 'border-indigo-900/50 bg-indigo-900/20 text-indigo-400' : 'border-slate-800 text-slate-500'}`}>
                        <span>Bucket {i}</span>
                        {bucket.length > 0 && <span className="bg-slate-950 px-2 py-0.5 rounded-full shadow-sm">{bucket.length}</span>}
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

function CollisionStrategies() {
  const [strategy, setStrategy] = useState<Strategy>('chaining');
  const [inputValue, setInputValue] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [, setTick] = useState(0);

  const forceRender = () => setTick((t) => t + 1);
  const chainingRef = useRef<CellData[][]>(Array.from({ length: B2_TABLE_SIZE }, () => []));
  const openAddrRef = useRef<(CellData | null)[]>(Array(B2_TABLE_SIZE).fill(null));
  const cuckooRef = useRef<(CellData | null)[][]>([Array(CUCKOO_SIZE).fill(null), Array(CUCKOO_SIZE).fill(null)]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (msg: string) => setLogs((prev) => [...prev, msg]);

  const clearTable = () => {
    chainingRef.current = Array.from({ length: B2_TABLE_SIZE }, () => []);
    openAddrRef.current = Array(B2_TABLE_SIZE).fill(null);
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
    const h = getHash(k, B2_TABLE_SIZE);
    addLog(`H(${k}) = ${k} % ${B2_TABLE_SIZE} = ${h}`);
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
    const h = getHash(k, B2_TABLE_SIZE);
    addLog(`Base H(${k}) = ${h}`);
    for (let i = 0; i < B2_TABLE_SIZE; i++) {
      const offset = strategy === 'linear' ? i : i * i;
      const idx = (h + offset) % B2_TABLE_SIZE;
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
      if (activeCell.status === 'probing') base += "bg-yellow-900/50 border-yellow-500 scale-110 shadow-lg z-10 text-yellow-300";
      else if (activeCell.status === 'success') base += "bg-green-900/50 border-green-500 scale-110 shadow-lg z-10 text-green-300";
      else if (activeCell.status === 'error') base += "bg-red-900/50 border-red-500 scale-110 shadow-lg z-10 text-red-300";
    } else {
      if (isDeleted) base += "bg-slate-800 border-slate-700 border-dashed text-slate-500";
      else base += "bg-slate-900 border-slate-700 text-slate-200 shadow-sm";
    }
    return base;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-fuchsia-400 tracking-tight">
          Collision Strategies <span className="text-2xl">✨</span>
        </h1>
        <p className="text-slate-400 font-medium">Visualize how different algorithms handle hash collisions.</p>
      </div>

      <div className="bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <select
            value={strategy}
            onChange={(e) => handleStrategyChange(e.target.value as Strategy)}
            className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
          >
            <option value="chaining">Separate Chaining</option>
            <option value="linear">Linear Probing</option>
            <option value="quadratic">Quadratic Probing</option>
            <option value="cuckoo">Cuckoo Hashing</option>
          </select>
          <div className="flex gap-2 flex-1">
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter a number..."
              className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
            />
            <button onClick={() => handleOperation('insert')} disabled={isAnimating} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-4 py-2 rounded-xl font-semibold disabled:opacity-50">Insert</button>
            <button onClick={() => handleOperation('search')} disabled={isAnimating} className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-xl font-semibold disabled:opacity-50">Search</button>
            <button onClick={() => handleOperation('delete')} disabled={isAnimating} className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl font-semibold disabled:opacity-50">Delete</button>
          </div>
        </div>

        <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 min-h-[300px] flex flex-col items-center justify-center overflow-x-auto">
          {strategy === 'chaining' && (
            <div className="flex gap-4">
              {chainingRef.current.map((bucket, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className={getCellClasses(1, i)}>{i}</div>
                  <div className="w-0.5 h-4 bg-slate-800"></div>
                  {bucket.map((cell, j) => (
                    <div key={j} className="flex items-center justify-center w-12 h-12 rounded-xl bg-fuchsia-600 text-white font-bold shadow-lg animate-in fade-in zoom-in">
                      {cell.key}
                    </div>
                  ))}
                  {bucket.length === 0 && <div className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-800 opacity-50"></div>}
                </div>
              ))}
            </div>
          )}
          {(strategy === 'linear' || strategy === 'quadratic') && (
            <div className="flex gap-2">
              {openAddrRef.current.map((cell, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="text-slate-500 font-mono text-sm">{i}</div>
                  <div className={getCellClasses(1, i, cell?.deleted)}>
                    {cell && !cell.deleted ? cell.key : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
          {strategy === 'cuckoo' && (
            <div className="flex flex-col gap-8">
              <div className="flex items-center gap-4">
                <div className="text-slate-400 font-bold w-20">Table 1</div>
                <div className="flex gap-2">
                  {cuckooRef.current[0].map((cell, i) => (
                    <div key={`t1-${i}`} className="flex flex-col items-center gap-2">
                      <div className="text-slate-500 font-mono text-sm">{i}</div>
                      <div className={getCellClasses(1, i)}>
                        {cell ? cell.key : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-slate-400 font-bold w-20">Table 2</div>
                <div className="flex gap-2">
                  {cuckooRef.current[1].map((cell, i) => (
                    <div key={`t2-${i}`} className="flex flex-col items-center gap-2">
                      <div className="text-slate-500 font-mono text-sm">{i}</div>
                      <div className={getCellClasses(2, i)}>
                        {cell ? cell.key : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 bg-slate-950 rounded-xl p-4 h-40 overflow-y-auto border border-slate-800 font-mono text-sm text-slate-400">
          {logs.map((log, i) => <div key={i} className="mb-1">{log}</div>)}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string, value: number, color: 'teal' | 'rose' | 'purple' }) {
  const isHigh = value > 10;
  const isExtreme = value > 50;
  const colorMap = {
    teal: 'bg-teal-900/30 text-teal-400',
    rose: 'bg-rose-900/30 text-rose-400',
    purple: 'bg-purple-900/30 text-purple-400',
  };
  const displayValue = isExtreme ? '50+' : value.toFixed(2);

  return (
    <div className="flex justify-between items-center bg-slate-950 p-3 rounded-2xl border border-slate-800 shadow-sm">
      <span className="text-sm font-semibold text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        {isHigh && !isExtreme && <span className="text-xs font-bold text-orange-400 animate-pulse">High</span>}
        {isExtreme && <span className="text-xs font-bold text-rose-500 animate-pulse">Critical</span>}
        <span className={`font-black text-lg px-3 py-1 rounded-xl ${colorMap[color]} ${isExtreme ? 'bg-rose-600 text-white' : ''}`}>
          {displayValue}
        </span>
      </div>
    </div>
  );
}

function LoadFactorStress() {
  const [alpha, setAlpha] = useState<number>(0.5);
  const stats = useMemo(() => ({
    chaining: calcChaining(alpha),
    linear: calcLinear(alpha),
    quadratic: calcQuadratic(alpha),
  }), [alpha]);

  const chartWidth = 800;
  const chartHeight = 320;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;
  const maxProbesChart = 20;

  const getX = (a: number) => padding.left + (a / 0.95) * graphWidth;
  const getY = (p: number) => padding.top + graphHeight - (Math.min(p, maxProbesChart) / maxProbesChart) * graphHeight;

  const paths = useMemo(() => {
    const steps = 50;
    let pathChaining = '';
    let pathLinear = '';
    let pathQuadratic = '';
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * 0.95;
      const x = getX(a);
      const cY = getY(calcChaining(a).unsuccessful);
      const lY = getY(calcLinear(a).unsuccessful);
      const qY = getY(calcQuadratic(a).unsuccessful);
      if (i === 0) {
        pathChaining += `M ${x},${cY} `;
        pathLinear += `M ${x},${lY} `;
        pathQuadratic += `M ${x},${qY} `;
      } else {
        pathChaining += `L ${x},${cY} `;
        pathLinear += `L ${x},${lY} `;
        pathQuadratic += `L ${x},${qY} `;
      }
    }
    return { pathChaining, pathLinear, pathQuadratic };
  }, []);

  const isDangerZone = alpha > 0.7;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <header className="text-center mb-10 mt-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-100 mb-4 tracking-tight">
          Load Factor <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-400">Stress Test</span>
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Watch what happens to performance as the hash map fills up! Adjust the load factor (α) to see how different collision resolution strategies handle the pressure.
        </p>
      </header>

      <section className="bg-slate-900 rounded-3xl shadow-xl border border-slate-800 p-8 relative overflow-hidden">
        {isDangerZone && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 via-red-500 to-rose-500 animate-pulse" />}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1 w-full">
            <div className="flex justify-between items-end mb-4">
              <label htmlFor="alpha-slider" className="text-xl font-bold text-slate-200 flex items-center gap-2">
                Load Factor (α)
                <span className="text-sm font-normal text-slate-400 bg-slate-950 px-2 py-1 rounded-md border border-slate-800">n / m</span>
              </label>
              <span className={`text-3xl font-black ${isDangerZone ? 'text-rose-500' : 'text-indigo-400'}`}>
                {alpha.toFixed(2)}
              </span>
            </div>
            <input
              id="alpha-slider"
              type="range"
              min="0"
              max="0.95"
              step="0.01"
              value={alpha}
              onChange={(e) => setAlpha(parseFloat(e.target.value))}
              className="w-full h-4 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
              style={{ background: `linear-gradient(to right, ${isDangerZone ? '#f43f5e' : '#818cf8'} ${(alpha / 0.95) * 100}%, #1e293b ${(alpha / 0.95) * 100}%)` }}
            />
            <div className="flex justify-between text-xs font-semibold text-slate-500 mt-2 px-1">
              <span>0.0 (Empty)</span>
              <span>0.5 (Half Full)</span>
              <span className="text-rose-500">0.95 (Critical)</span>
            </div>
          </div>
          <div className="w-full md:w-1/3 bg-slate-950 rounded-2xl p-4 border border-slate-800 shadow-inner">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">What is α?</h3>
            <p className="text-sm text-slate-500">
              The ratio of stored items to available buckets. As α approaches 1, open addressing strategies suffer from <strong>clustering</strong>, causing probe counts to skyrocket!
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 rounded-3xl p-6 shadow-lg border border-slate-800 relative overflow-hidden group hover:-translate-y-1 transition-transform">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-teal-900/20 rounded-full group-hover:scale-150 transition-transform duration-500" />
          <h2 className="text-2xl font-bold text-teal-400 mb-1">Separate Chaining</h2>
          <p className="text-teal-600/80 text-sm mb-6 font-medium h-10">Linked lists handle collisions gracefully.</p>
          <div className="space-y-4">
            <StatRow label="Successful Search" value={stats.chaining.successful} color="teal" />
            <StatRow label="Unsuccessful Search" value={stats.chaining.unsuccessful} color="teal" />
          </div>
        </div>
        <div className="bg-slate-900 rounded-3xl p-6 shadow-lg border border-slate-800 relative overflow-hidden group hover:-translate-y-1 transition-transform">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-900/20 rounded-full group-hover:scale-150 transition-transform duration-500" />
          <h2 className="text-2xl font-bold text-rose-400 mb-1">Linear Probing</h2>
          <p className="text-rose-600/80 text-sm mb-6 font-medium h-10">Suffers heavily from primary clustering.</p>
          <div className="space-y-4">
            <StatRow label="Successful Search" value={stats.linear.successful} color="rose" />
            <StatRow label="Unsuccessful Search" value={stats.linear.unsuccessful} color="rose" />
          </div>
        </div>
        <div className="bg-slate-900 rounded-3xl p-6 shadow-lg border border-slate-800 relative overflow-hidden group hover:-translate-y-1 transition-transform">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-900/20 rounded-full group-hover:scale-150 transition-transform duration-500" />
          <h2 className="text-2xl font-bold text-purple-400 mb-1">Quadratic Probing</h2>
          <p className="text-purple-600/80 text-sm mb-6 font-medium h-10">Avoids primary clustering, but still degrades.</p>
          <div className="space-y-4">
            <StatRow label="Successful Search" value={stats.quadratic.successful} color="purple" />
            <StatRow label="Unsuccessful Search" value={stats.quadratic.unsuccessful} color="purple" />
          </div>
        </div>
      </section>

      <section className="bg-slate-900 rounded-3xl shadow-xl border border-slate-800 p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-200">Expected Probes vs Load Factor</h2>
            <p className="text-slate-500 text-sm">Showing Unsuccessful Search (Worst-case scenario)</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm font-semibold">
            <div className="flex items-center gap-2"><div className="w-4 h-1 bg-teal-400 rounded-full" /> <span className="text-teal-400">Chaining</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-1 bg-rose-400 rounded-full" /> <span className="text-rose-400">Linear</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-1 bg-purple-400 rounded-full" /> <span className="text-purple-400">Quadratic</span></div>
          </div>
        </div>
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto min-w-[600px] bg-slate-950 rounded-2xl border border-slate-800">
            {[0, 5, 10, 15, 20].map((val) => (
              <g key={`grid-y-${val}`}>
                <line x1={padding.left} y1={getY(val)} x2={chartWidth - padding.right} y2={getY(val)} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
                <text x={padding.left - 10} y={getY(val) + 4} textAnchor="end" fontSize="12" fill="#64748b" fontWeight="600">{val}{val === 20 ? '+' : ''}</text>
              </g>
            ))}
            {[0, 0.25, 0.5, 0.75, 0.95].map((val) => (
              <g key={`grid-x-${val}`}>
                <text x={getX(val)} y={chartHeight - 10} textAnchor="middle" fontSize="12" fill="#64748b" fontWeight="600">α = {val}</text>
              </g>
            ))}
            <line x1={padding.left} y1={getY(0)} x2={chartWidth - padding.right} y2={getY(0)} stroke="#475569" strokeWidth="2" />
            <line x1={padding.left} y1={padding.top} x2={padding.left} y2={getY(0)} stroke="#475569" strokeWidth="2" />
            <path d={paths.pathChaining} fill="none" stroke="#2dd4bf" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d={paths.pathQuadratic} fill="none" stroke="#c084fc" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d={paths.pathLinear} fill="none" stroke="#fb7185" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <g transform={`translate(${getX(alpha)}, 0)`}>
              <line x1="0" y1={padding.top} x2="0" y2={getY(0)} stroke="#818cf8" strokeWidth="2" strokeDasharray="6 4" />
              <rect x="-24" y={padding.top - 10} width="48" height="24" rx="12" fill="#818cf8" />
              <text x="0" y={padding.top + 6} textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">{alpha.toFixed(2)}</text>
              <circle cx="0" cy={getY(stats.chaining.unsuccessful)} r="6" fill="#2dd4bf" stroke="#0f172a" strokeWidth="2" />
              <circle cx="0" cy={getY(stats.quadratic.unsuccessful)} r="6" fill="#c084fc" stroke="#0f172a" strokeWidth="2" />
              <circle cx="0" cy={getY(stats.linear.unsuccessful)} r="6" fill="#fb7185" stroke="#0f172a" strokeWidth="2" />
            </g>
          </svg>
        </div>
        <div className="mt-6 bg-indigo-950/50 text-indigo-300 p-4 rounded-xl text-sm font-medium border border-indigo-900/50 flex items-start gap-3">
          <span className="text-xl">💡</span>
          <p>Notice how <strong>Linear Probing</strong> hits a wall after α = 0.7? This is why most hash map implementations force a <strong>rehash</strong> well before the load factor reaches 0.75!</p>
        </div>
      </section>
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
    let base = "relative flex flex-col items-center justify-center h-20 rounded-xl border-2 transition-all duration-300 ";
    if (state.phase !== 'done' && state.scanIndex === index) base += "ring-4 ring-yellow-500/50 ring-offset-2 ring-offset-slate-900 scale-105 z-10 ";
    if (!entry) return base + "bg-slate-800 border-slate-700 text-transparent";
    if (entry.isMoved) return base + "bg-slate-800 border-slate-700 opacity-40 grayscale";
    return base + "bg-rose-900/40 border-rose-500/50 text-rose-200 shadow-sm";
  };

  const getNewBucketClass = (index: number, entry: HashEntry) => {
    let base = "relative flex flex-col items-center justify-center h-20 rounded-xl border-2 transition-all duration-300 ";
    if ((state.phase === 'calculating' || state.phase === 'moving') && state.targetIndex === index) base += "ring-4 ring-yellow-500/50 ring-offset-2 ring-offset-slate-900 scale-105 z-10 bg-yellow-900/40 border-yellow-500/50 ";
    else if (!entry) base += "bg-slate-800 border-slate-700 text-transparent";
    else base += "bg-emerald-900/40 border-emerald-500/50 text-emerald-200 shadow-sm";
    return base;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-100 mb-3">
          Rehash Event <span className="text-rose-400">Explorer</span>
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          When a hash map gets too full, it creates a larger array and moves all existing keys over. Watch how the indices are recalculated based on the new capacity!
        </p>
      </div>

      <div className="bg-slate-900 rounded-3xl shadow-xl border border-slate-800 overflow-hidden flex flex-col">
        <div className="bg-slate-950 border-b border-slate-800 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} disabled={state.phase === 'done'} className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold transition-colors ${state.phase === 'done' ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : state.isPlaying ? 'bg-rose-900/50 text-rose-400 hover:bg-rose-900/70' : 'bg-emerald-900/50 text-emerald-400 hover:bg-emerald-900/70'}`}>
              {state.isPlaying ? 'Pause' : 'Auto-Play'}
            </button>
            <button onClick={stepForward} disabled={state.isPlaying || state.phase === 'done'} className="flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              Step Forward
            </button>
            <button onClick={handleReset} className="p-2.5 rounded-full text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors" title="Reset">
              <RotateCcw size={20} />
            </button>
          </div>
          <div className="flex-1 w-full bg-slate-900 border border-slate-800 rounded-xl p-3 px-5 shadow-inner flex items-center min-h-[3rem]">
            <p className="text-[15px] font-medium text-slate-300 animate-fade-in">{state.message}</p>
          </div>
        </div>

        <div className="p-8 flex flex-col gap-12 bg-slate-900">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-end px-1">
              <h2 className="text-lg font-bold text-slate-300 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-400"></span>
                Old Table <span className="text-sm font-normal text-slate-500">(Capacity: 8)</span>
              </h2>
              <span className="text-xs font-semibold px-2 py-1 bg-rose-900/50 text-rose-400 rounded-md">Load: 75% (Full)</span>
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
                <div className="z-10 bg-slate-900 px-4 py-1.5 rounded-full border-2 border-yellow-500/50 shadow-sm text-sm font-mono font-bold text-yellow-400 animate-bounce">
                  {state.oldTable[state.scanIndex]?.key} % 16 = {state.baseHash}
                </div>
             )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-end px-1">
              <h2 className="text-lg font-bold text-slate-300 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                New Table <span className="text-sm font-normal text-slate-500">(Capacity: 16)</span>
              </h2>
              <span className="text-xs font-semibold px-2 py-1 bg-emerald-900/50 text-emerald-400 rounded-md">
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
    const b = Array.from({ length: B5_TABLE_SIZE }, () => [] as number[]);
    keys.forEach((k) => {
      const h = b5HashFunction(k);
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
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-rose-900/30 text-rose-400 rounded-2xl">
            <Swords size={32} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Mis-hash Challenge</h1>
            <p className="text-slate-400 font-medium">Craft adversarial keys to break the hash map!</p>
          </div>
        </div>
        <div className="flex gap-4 text-sm font-bold">
          <div className="bg-amber-900/30 text-amber-400 px-4 py-2 rounded-xl flex items-center gap-2">
            <Zap size={18} />
            <span>Target: {TARGET_COLLISIONS} Collisions</span>
          </div>
          <div className="bg-blue-900/30 text-blue-400 px-4 py-2 rounded-xl flex items-center gap-2">
            <ShieldAlert size={18} />
            <span>Max Keys: {MAX_KEYS}</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-800">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-200">
              <Info className="text-indigo-400" size={20} />
              The Strategy
            </h2>
            <div className="bg-slate-950 rounded-2xl p-4 mb-6 border border-slate-800 text-center">
              <p className="text-sm text-indigo-400 font-bold uppercase tracking-wider mb-1">Hash Function</p>
              <code className="text-xl font-mono font-black text-indigo-300">h(x) = (x * 3) % 8</code>
            </div>
            <form onSubmit={handleAddKey} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Enter a positive integer:</label>
                <div className="flex gap-2">
                  <input type="number" min="0" value={inputValue} onChange={(e) => setInputValue(e.target.value)} disabled={isBroken || isGameOver} placeholder="e.g. 42" className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-4 py-3 font-mono text-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50" />
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
            <div className="mt-6 pt-6 border-t border-slate-800">
              {!showHint ? (
                <button onClick={() => setShowHint(true)} className="text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors">Stuck? Need a hint?</button>
              ) : (
                <div className="bg-amber-900/20 border border-amber-900/50 text-amber-400 p-4 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2">{hintText}</div>
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
                    <div className="text-slate-500 text-xs">({k} * 3) = {step1} → {step1} % 8 = <span className="text-indigo-400 font-bold">{step2}</span></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col space-y-6">
          <div className="bg-slate-900 rounded-3xl p-6 shadow-sm border border-rose-900/50 relative overflow-hidden">
            <div className="relative z-10 flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="text-rose-500" size={20} />
                Damage Meter (Max Collisions)
              </h2>
              <span className="font-black text-2xl text-rose-500">{maxCollisions} / {TARGET_COLLISIONS}</span>
            </div>
            <div className="relative z-10 h-6 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div className={`h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-2 ${isBroken ? 'bg-rose-500 animate-pulse' : 'bg-rose-500/80'}`} style={{ width: `${Math.min(100, (maxCollisions / TARGET_COLLISIONS) * 100)}%` }}>
                {isBroken && <Zap size={14} className="text-white fill-white" />}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-800 flex-1 flex flex-col">
            <h2 className="text-lg font-bold mb-6 text-slate-200 text-center">Hash Map (Separate Chaining)</h2>
            <div className="flex-1 flex items-end justify-center gap-2 sm:gap-4">
              {buckets.map((bucket, i) => {
                const isTargetBucket = bucket.length === maxCollisions && maxCollisions > 1;
                return (
                  <div key={i} className="flex flex-col items-center w-16 sm:w-20">
                    <div className="flex flex-col-reverse gap-2 mb-2 w-full min-h-[240px] justify-start pb-2">
                      {bucket.map((k, idx) => (
                        <div key={`${k}-${idx}`} className="bg-gradient-to-br from-pink-500 to-rose-600 text-white font-black font-mono text-lg py-2 rounded-xl shadow-sm border-b-4 border-rose-800 flex items-center justify-center animate-in slide-in-from-top-4 fade-in">{k}</div>
                      ))}
                    </div>
                    <div className={`w-full h-12 rounded-b-2xl border-x-4 border-b-4 flex items-center justify-center font-black text-xl transition-colors ${isTargetBucket ? 'border-rose-500/50 bg-rose-900/30 text-rose-400' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>{i}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {(isBroken || isGameOver) && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-800 text-center transform animate-in zoom-in-95 duration-300">
            {isBroken ? (
              <>
                <div className="w-24 h-24 bg-rose-900/30 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><Trophy size={48} strokeWidth={2.5} /></div>
                <h2 className="text-3xl font-black text-slate-100 mb-2">Map Broken!</h2>
                <p className="text-slate-400 mb-8 font-medium">You successfully exploited the hash function to cause {maxCollisions} collisions in a single bucket.</p>
              </>
            ) : (
              <>
                <div className="w-24 h-24 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><ShieldAlert size={48} strokeWidth={2.5} /></div>
                <h2 className="text-3xl font-black text-slate-100 mb-2">Out of Keys!</h2>
                <p className="text-slate-400 mb-8 font-medium">You used all {MAX_KEYS} keys but couldn't reach {TARGET_COLLISIONS} collisions. The hash map survived.</p>
              </>
            )}
            <button onClick={resetChallenge} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"><RotateCcw size={24} /> Try Again</button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main App Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { name: 'Hash Function Lab', component: <HashFunctionLab /> },
    { name: 'Collision Strategies', component: <CollisionStrategies /> },
    { name: 'Load Factor Stress', component: <LoadFactorStress /> },
    { name: 'Rehash Event', component: <RehashEvent /> },
    { name: 'Mis-hash Challenge', component: <MisHashChallenge /> },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans selection:bg-indigo-500/30">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">
            Hash Map Explorer
          </h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {tabs.map((tab, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-all ${
                activeTab === idx
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto">
        {tabs[activeTab].component}
      </main>
    </div>
  );
}