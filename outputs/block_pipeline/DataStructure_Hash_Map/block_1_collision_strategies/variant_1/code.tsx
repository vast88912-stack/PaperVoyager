import React, { useState, useEffect, useRef } from 'react';
import { Play, Search, Trash2, Plus, Info, RefreshCw, AlertCircle } from 'lucide-react';

type Strategy = 'chaining' | 'linear' | 'quadratic' | 'cuckoo';

interface Cell {
  key: number | null;
  tombstone: boolean;
  chain: number[];
}

interface AnimState {
  t: 1 | 2;
  idx: number;
  status: 'checking' | 'success' | 'fail' | 'kicking';
}

const TABLE_SIZE = 11;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function App() {
  const [strategy, setStrategy] = useState<Strategy>('chaining');
  const [table1, setTable1] = useState<Cell[]>([]);
  const [table2, setTable2] = useState<Cell[]>([]);
  const [anim, setAnim] = useState<AnimState | null>(null);
  const [logs, setLogs] = useState<{ id: number; msg: string; type: 'info' | 'success' | 'error' | 'warning' }[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  let logCounter = useRef(0);

  const addLog = (msg: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    setLogs((prev) => [...prev, { id: logCounter.current++, msg, type }]);
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const resetTables = () => {
    setTable1(Array.from({ length: TABLE_SIZE }, () => ({ key: null, tombstone: false, chain: [] })));
    setTable2(Array.from({ length: TABLE_SIZE }, () => ({ key: null, tombstone: false, chain: [] })));
    setAnim(null);
    setLogs([]);
    addLog(`Switched to ${strategy.replace('-', ' ').toUpperCase()} strategy.`, 'info');
  };

  useEffect(() => {
    resetTables();
  }, [strategy]);

  const hash1 = (k: number) => k % TABLE_SIZE;
  const hash2 = (k: number) => 7 - (k % 7); // Secondary hash for Cuckoo

  const handleInsert = async () => {
    const key = parseInt(inputValue);
    if (isNaN(key) || key < 0) {
      addLog('Please enter a valid positive number.', 'error');
      return;
    }
    setInputValue('');
    setIsAnimating(true);
    addLog(`Starting INSERT for key ${key}...`, 'info');

    let t1 = table1.map((c) => ({ ...c, chain: [...c.chain] }));
    let t2 = table2.map((c) => ({ ...c, chain: [...c.chain] }));

    if (strategy === 'chaining') {
      const idx = hash1(key);
      setAnim({ t: 1, idx, status: 'checking' });
      await delay(600);

      if (t1[idx].chain.includes(key)) {
        addLog(`Key ${key} already exists in chain at index ${idx}.`, 'error');
        setAnim({ t: 1, idx, status: 'fail' });
      } else {
        t1[idx].chain.push(key);
        setTable1(t1);
        setAnim({ t: 1, idx, status: 'success' });
        addLog(`Inserted ${key} into chain at index ${idx}.`, 'success');
      }
    } else if (strategy === 'linear' || strategy === 'quadratic') {
      const h = hash1(key);
      let placed = false;

      for (let i = 0; i < TABLE_SIZE; i++) {
        const idx = strategy === 'linear' ? (h + i) % TABLE_SIZE : (h + i * i) % TABLE_SIZE;
        setAnim({ t: 1, idx, status: 'checking' });
        await delay(600);

        if (t1[idx].key === key && !t1[idx].tombstone) {
          addLog(`Key ${key} already exists at index ${idx}.`, 'error');
          setAnim({ t: 1, idx, status: 'fail' });
          placed = true;
          break;
        }

        if (t1[idx].key === null || t1[idx].tombstone) {
          t1[idx].key = key;
          t1[idx].tombstone = false;
          setTable1(t1);
          setAnim({ t: 1, idx, status: 'success' });
          addLog(`Inserted ${key} at index ${idx} (Probe ${i}).`, 'success');
          placed = true;
          break;
        }
      }
      if (!placed) {
        addLog(`Table is full! Could not insert ${key}.`, 'error');
        setAnim(null);
      }
    } else if (strategy === 'cuckoo') {
      let currKey = key;
      let currTable = 1;
      let cycle = false;

      for (let i = 0; i < 10; i++) {
        if (currTable === 1) {
          const idx = hash1(currKey);
          setAnim({ t: 1, idx, status: 'checking' });
          await delay(600);

          if (t1[idx].key === currKey) {
            addLog(`Key ${currKey} already exists in Table 1.`, 'error');
            setAnim({ t: 1, idx, status: 'fail' });
            cycle = true;
            break;
          }

          if (t1[idx].key === null) {
            t1[idx].key = currKey;
            setTable1(t1);
            setAnim({ t: 1, idx, status: 'success' });
            addLog(`Inserted ${currKey} in Table 1 at index ${idx}.`, 'success');
            cycle = true;
            break;
          }

          setAnim({ t: 1, idx, status: 'kicking' });
          await delay(500);
          const kicked = t1[idx].key!;
          t1[idx].key = currKey;
          setTable1([...t1]);
          addLog(`Kicked ${kicked} from Table 1 at index ${idx}.`, 'warning');
          currKey = kicked;
          currTable = 2;
        } else {
          const idx = hash2(currKey);
          setAnim({ t: 2, idx, status: 'checking' });
          await delay(600);

          if (t2[idx].key === currKey) {
            addLog(`Key ${currKey} already exists in Table 2.`, 'error');
            setAnim({ t: 2, idx, status: 'fail' });
            cycle = true;
            break;
          }

          if (t2[idx].key === null) {
            t2[idx].key = currKey;
            setTable2(t2);
            setAnim({ t: 2, idx, status: 'success' });
            addLog(`Inserted ${currKey} in Table 2 at index ${idx}.`, 'success');
            cycle = true;
            break;
          }

          setAnim({ t: 2, idx, status: 'kicking' });
          await delay(500);
          const kicked = t2[idx].key!;
          t2[idx].key = currKey;
          setTable2([...t2]);
          addLog(`Kicked ${kicked} from Table 2 at index ${idx}.`, 'warning');
          currKey = kicked;
          currTable = 1;
        }
      }
      if (!cycle) {
        addLog(`Cuckoo cycle detected! Rehash needed.`, 'error');
        setAnim(null);
      }
    }

    setTimeout(() => {
      setAnim(null);
      setIsAnimating(false);
    }, 1000);
  };

  const handleLookup = async () => {
    const key = parseInt(inputValue);
    if (isNaN(key) || key < 0) return;
    setInputValue('');
    setIsAnimating(true);
    addLog(`Starting LOOKUP for key ${key}...`, 'info');

    if (strategy === 'chaining') {
      const idx = hash1(key);
      setAnim({ t: 1, idx, status: 'checking' });
      await delay(600);
      if (table1[idx].chain.includes(key)) {
        setAnim({ t: 1, idx, status: 'success' });
        addLog(`Found ${key} in chain at index ${idx}.`, 'success');
      } else {
        setAnim({ t: 1, idx, status: 'fail' });
        addLog(`Key ${key} not found.`, 'error');
      }
    } else if (strategy === 'linear' || strategy === 'quadratic') {
      const h = hash1(key);
      let found = false;
      for (let i = 0; i < TABLE_SIZE; i++) {
        const idx = strategy === 'linear' ? (h + i) % TABLE_SIZE : (h + i * i) % TABLE_SIZE;
        setAnim({ t: 1, idx, status: 'checking' });
        await delay(600);

        if (table1[idx].key === key && !table1[idx].tombstone) {
          setAnim({ t: 1, idx, status: 'success' });
          addLog(`Found ${key} at index ${idx} (Probe ${i}).`, 'success');
          found = true;
          break;
        }
        if (table1[idx].key === null && !table1[idx].tombstone) {
          break; // Stop probing
        }
      }
      if (!found) {
        setAnim(null);
        addLog(`Key ${key} not found.`, 'error');
      }
    } else if (strategy === 'cuckoo') {
      const idx1 = hash1(key);
      setAnim({ t: 1, idx: idx1, status: 'checking' });
      await delay(600);
      if (table1[idx1].key === key) {
        setAnim({ t: 1, idx: idx1, status: 'success' });
        addLog(`Found ${key} in Table 1 at index ${idx1}.`, 'success');
      } else {
        const idx2 = hash2(key);
        setAnim({ t: 2, idx: idx2, status: 'checking' });
        await delay(600);
        if (table2[idx2].key === key) {
          setAnim({ t: 2, idx: idx2, status: 'success' });
          addLog(`Found ${key} in Table 2 at index ${idx2}.`, 'success');
        } else {
          setAnim(null);
          addLog(`Key ${key} not found.`, 'error');
        }
      }
    }

    setTimeout(() => {
      setAnim(null);
      setIsAnimating(false);
    }, 1000);
  };

  const handleDelete = async () => {
    const key = parseInt(inputValue);
    if (isNaN(key) || key < 0) return;
    setInputValue('');
    setIsAnimating(true);
    addLog(`Starting DELETE for key ${key}...`, 'info');

    let t1 = table1