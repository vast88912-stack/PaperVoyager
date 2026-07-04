import React, { useState, useRef, useEffect } from 'react';
import { Play, Search, Trash2, Plus, Info, RefreshCw, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

// --- Types & Constants ---
type Strategy = 'chaining' | 'linear' | 'quadratic' | 'cuckoo';
type Operation = 'insert' | 'lookup' | 'delete';

interface Cell {
  key: number | null;
  deleted: boolean;
}

interface AnimState {
  table: number; // 1 or 2 (for cuckoo)
  index: number;
  subIndex?: number; // for chaining lists
  status: 'probe' | 'success' | 'fail' | 'evict' | 'idle';
}

const TABLE_SIZE = 11;
const ANIM_SPEED = 700; // ms

// --- Helper Functions ---
const hash1 = (k: number) => k % TABLE_SIZE;
const hash2 = (k: number) => (k * 7 + 3) % TABLE_SIZE;
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

export default function App() {
  // --- State ---
  const [strategy, setStrategy] = useState<Strategy>('chaining');
  const [inputValue, setInputValue] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [logMsgs, setLogMsgs] = useState<{ id: number; msg: string; type: 'info' | 'success' | 'error' | 'warning' }[]>([]);
  const [animState, setAnimState] = useState<AnimState | null>(null);

  // --- Data Structures (Refs for logic, State for render) ---
  // Chaining: Array of Arrays
  const chainRef = useRef<number[][]>(Array.from({ length: TABLE_SIZE }, () => []));
  const [chainTable, setChainTable] = useState<number[][]>(chainRef.current);

  // Open Addressing (Linear & Quadratic): Array of Cells
  const openRef = useRef<Cell[]>(Array.from({ length: TABLE_SIZE }, () => ({ key: null, deleted: false })));
  const [openTable, setOpenTable] = useState<Cell[]>(openRef.current);

  // Cuckoo: Two Arrays of Cells
  const cuckoo1Ref = useRef<Cell[]>(Array.from({ length: TABLE_SIZE }, () => ({ key: null, deleted: false })));
  const cuckoo2Ref = useRef<Cell[]>(Array.from({ length: TABLE_SIZE }, () => ({ key: null, deleted: false })));
  const [cuckoo1, setCuckoo1] = useState<Cell[]>(cuckoo1Ref.current);
  const [cuckoo2, setCuckoo2] = useState<Cell[]>(cuckoo2Ref.current);

  const logIdCounter = useRef(0);

  // --- Utility Functions ---
  const addLog = (msg: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    setLogMsgs(prev => [{ id: logIdCounter.current++, msg, type }, ...prev].slice(0, 5));
  };

  const syncTables = () => {
    setChainTable([...chainRef.current.map(arr => [...arr])]);
    setOpenTable([...openRef.current.map(c => ({ ...c }))]);
    setCuckoo1([...cuckoo1Ref.current.map(c => ({ ...c }))]);
    setCuckoo2([...cuckoo2Ref.current.map(c => ({ ...c }))]);
  };

  const clearTables = () => {
    chainRef.current = Array.from({ length: TABLE_SIZE }, () => []);
    openRef.current = Array.from({ length: TABLE_SIZE }, () => ({ key: null, deleted: false }));
    cuckoo1Ref.current = Array.from({ length: TABLE_SIZE }, () => ({ key: null, deleted: false }));
    cuckoo2Ref.current = Array.from({ length: TABLE_SIZE }, () => ({ key: null, deleted: false }));
    syncTables();
    setLogMsgs([]);
    addLog("Tables cleared.", "info");
    setAnimState(null);
  };

  const handleStrategyChange = (s: Strategy) => {
    if (isAnimating) return;
    setStrategy(s);
    clearTables();
  };

  // --- Algorithms ---

  // 1. Separate Chaining
  const runChaining = async (op: Operation, val: number) => {
    const h = hash1(val);
    addLog(`Hashing: ${val} % ${TABLE_SIZE} = ${h}`);
    setAnimState({ table: 1, index: h, status: 'probe' });
    await wait(ANIM_SPEED);

    const bucket = chainRef.current[h];
    let foundIdx = -1;

    for (let i = 0; i < bucket.length; i++) {
      setAnimState({ table: 1, index: h, subIndex: i, status: 'probe' });
      await wait(ANIM_SPEED * 0.7);
      if (bucket[i] === val) {
        foundIdx = i;
        break;
      }
    }

    if (op === 'insert') {
      if (foundIdx !== -1) {
        setAnimState({ table: 1, index: h, subIndex: foundIdx, status: 'fail' });
        addLog(`Value ${val} already exists!`, 'warning');
      } else {
        bucket.push(val);
        syncTables();
        setAnimState({ table: 1, index: h, subIndex: bucket.length - 1, status: 'success' });
        addLog(`Inserted ${val} at bucket ${h}.`, 'success');
      }
    } else if (op === 'lookup') {
      if (foundIdx !== -1) {
        setAnimState({ table: 1, index: h, subIndex: foundIdx, status: 'success' });
        addLog(`Found ${val} in bucket ${h}.`, 'success');
      } else {
        setAnimState({ table: 1, index: h, status: 'fail' });
        addLog(`Value ${val} not found.`, 'error');
      }
    } else if (op === 'delete') {
      if (foundIdx !== -1) {
        setAnimState({ table: 1, index: h, subIndex: foundIdx, status: 'evict' });
        await wait(ANIM_SPEED);
        bucket.splice(foundIdx, 1);
        syncTables();
        addLog(`Deleted ${val} from bucket ${h}.`, 'success');
      } else {
        setAnimState({ table: 1, index: h, status: 'fail' });
        addLog(`Value ${val} not found to delete.`, 'error');
      }
    }
  };

  // 2. Open Addressing (Linear & Quadratic)
  const runOpenAddressing = async (op: Operation, val: number) => {
    const h = hash1(val);
    addLog(`Base Hash: ${val} % ${TABLE_SIZE} = ${h}`);

    const maxProbes = strategy === 'linear' ? TABLE_SIZE : Math.ceil(TABLE_SIZE / 2); // Quadratic covers roughly half for general primes

    for (let i = 0; i < maxProbes; i++) {
      const offset = strategy === 'linear' ? i : i * i;
      const idx = (h + offset) % TABLE_SIZE;

      addLog(`Probing (h + ${offset}) % ${TABLE_SIZE} = ${idx}`);
      setAnimState({ table: 1, index: idx, status: 'probe' });
      await wait(ANIM_SPEED);

      const cell = openRef.current[idx];

      if (op === 'insert') {
        if (cell.key === null || cell.deleted) {
          // Check if it already exists further down (simplified for viz: assume we just insert at first empty/deleted)
          // A real implementation needs to search to ensure no duplicates before inserting.
          // For visualization, let's just insert here to keep it snappy.
          openRef.current[idx] = { key: val, deleted: false };
          syncTables();
          setAnimState({ table: 1, index: idx, status: 'success' });
          addLog(`Inserted ${val} at index ${idx}.`, 'success');
          return;
        }
        if (cell.key === val && !cell.deleted) {
          setAnimState({ table: 1, index: idx, status: 'fail' });
          addLog(`Value ${val} already exists!`, 'warning');
          return;
        }
        setAnimState({ table: 1, index: idx, status: 'fail' });
        addLog(`Collision at ${idx}.`);
        await wait(ANIM_SPEED * 0.5);

      } else if (op === 'lookup' || op === 'delete') {
        if (cell.key === null) {
          setAnimState({ table: 1, index: idx, status: 'fail' });
          addLog(`Hit empty cell. ${val} not found.`, 'error');
          return;
        }
        if (cell.key === val && !cell.deleted) {
          if (op === 'lookup') {
            setAnimState({ table: 1, index: idx, status: 'success' });
            addLog(`Found ${val} at index ${idx}.`, 'success');
          } else {
            setAnimState({ table: 1, index: idx, status: 'evict' });
            await wait(ANIM_SPEED);
            openRef.current[idx] = { key: val, deleted: true };
            syncTables();
            addLog(`Deleted ${val} (Tombstone left at ${idx}).`, 'success');
          }
          return;
        }
        setAnimState({ table: 1, index: idx, status: 'fail' });
        addLog(cell.deleted ? `Skipping tombstone at ${idx}.` : `Key mismatch at ${idx}.`);
        await wait(ANIM_SPEED * 0.5);
      }
    }
    
    addLog(op === 'insert' ? "Table full or probe limit reached!" : "Value not found (probe limit).", 'error');
  };

  // 3. Cuckoo Hashing
  const runCuckoo = async (op: Operation, val: number) => {
    if (op === 'lookup' || op === 'delete') {
      const idx1 = hash1(val);
      addLog(`Checking T1[${idx1}] (h1)`);
      setAnimState({ table: 1, index: idx1, status: 'probe' });
      await wait(ANIM_SPEED);

      if (cuckoo1Ref.current[idx1].key === val) {
        if (op === 'lookup') {
          setAnimState({ table: 1, index: idx1, status: 'success' });
          addLog(`Found ${val} in Table 1.`, 'success');
        } else {
          setAnimState({ table: 1, index: idx1, status: 'evict' });
          await wait(ANIM_SPEED);
          cuckoo1Ref.current[idx1] = { key: null, deleted: false };
          syncTables();
          addLog(`Deleted ${val} from Table 1.`, 'success');
        }
        return;
      }

      setAnimState({ table: 1, index: idx1, status: 'fail' });
      await wait(ANIM_SPEED * 0.5);

      const idx2 = hash2(val);
      addLog(`Checking T2[${idx2}] (h2)`);
      setAnimState({ table: 2, index: idx2, status: 'probe' });
      await wait(ANIM_SPEED);

      if (cuckoo2Ref.current[idx2].key === val) {
         if (op === 'lookup') {
          setAnimState({ table: 2, index: idx2, status: 'success' });
          addLog(`Found ${val} in Table 2.`, 'success');
        } else {
          setAnimState({ table: 2, index: idx2, status: 'evict' });
          await wait(ANIM_SPEED);
          cuckoo2Ref.current[idx2] = { key: null, deleted: false };
          syncTables();
          addLog(`Deleted ${val} from Table 2.`, 'success');
        }
        return;
      }
      setAnimState({ table: 2, index: idx2, status: 'fail' });
      addLog(`Value ${val} not found.`, 'error');
      return;
    }

    // Cuckoo Insert Logic
    let currVal = val;
    let currTable = 1;
    let loopCount = 0;
    const MAX_LOOPS = 6;

    while (loopCount < MAX_LOOPS) {
      const idx = currTable === 1 ? hash1(currVal) : hash2(currVal);
      addLog(`Probing T${currTable}[${idx}] for ${currVal}`);
      setAnimState({ table: currTable, index: idx, status: 'probe' });
      await wait(ANIM_SPEED);

      const targetRef = currTable === 1 ? cuckoo1Ref : cuckoo2Ref;
      const existing = targetRef.current[idx].key;

      if (existing === currVal) {
        setAnimState({ table: currTable, index: idx, status: 'fail' });
        addLog(`${currVal} already exists!`, 'warning');
        return;
      }

      if (existing === null) {
        targetRef.current[idx] = { key: currVal, deleted: false };
        syncTables();
        setAnimState({ table: currTable, index: idx, status: 'success' });
        addLog(`Inserted ${currVal} into T${currTable}[${idx}].`, 'success');
        return;
      }

      // Eviction
      setAnim