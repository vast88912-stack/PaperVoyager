import React, { useState, useMemo, useEffect } from 'react';
import { ShieldAlert, Zap, Trash2, CheckCircle2, AlertOctagon, Info, ArrowRight, Skull } from 'lucide-react';

// --- Types & Interfaces ---

type Strategy = 'chaining' | 'linear';
type HashFunctionType = 'modulo10' | 'alphaSum10';

interface Mission {
  id: string;
  title: string;
  description: string;
  strategy: Strategy;
  hashFn: HashFunctionType;
  targetMetric: 'maxChain' | 'maxProbes';
  targetValue: number;
  hint: string;
}

interface SimulationResult {
  table: any[];
  maxChain: number;
  maxProbes: number;
  totalCollisions: number;
  isSuccess: boolean;
}

// --- Constants ---

const TABLE_SIZE = 10;

const MISSIONS: Mission[] = [
  {
    id: 'm1',
    title: 'The Modulo Menace',
    description: 'Force a massive collision using Separate Chaining. Make 5 keys land in the exact same bucket!',
    strategy: 'chaining',
    hashFn: 'modulo10',
    targetMetric: 'maxChain',
    targetValue: 5,
    hint: 'Think about numbers that share the same last digit.'
  },
  {
    id: 'm2',
    title: 'Linear Logjam',
    description: 'Create a traffic jam! Using Linear Probing, make a single insertion take at least 4 probes to find an empty slot.',
    strategy: 'linear',
    hashFn: 'modulo10',
    targetMetric: 'maxProbes',
    targetValue: 4,
    hint: 'Fill consecutive buckets by hashing keys to the start of the cluster.'
  },
  {
    id: 'm3',
    title: 'Alphabet Assassin',
    description: 'Break the string hash! Find 4 different words that hash to the same bucket using Alphabet Sum Modulo 10.',
    strategy: 'chaining',
    hashFn: 'alphaSum10',
    targetMetric: 'maxChain',
    targetValue: 4,
    hint: 'A=1, B=2, C=3... Sum them up, take the last digit. "A" hashes to 1. What else hashes to 1?'
  }
];

// --- Core Hash Logic ---

const hashFunctions = {
  modulo10: (key: string): number => {
    const num = parseInt(key, 10);
    if (isNaN(num)) return 0;
    return Math.abs(num) % TABLE_SIZE;
  },
  alphaSum10: (key: string): number => {
    let sum = 0;
    for (let i = 0; i < key.length; i++) {
      const charCode = key.toUpperCase().charCodeAt(i);
      if (charCode >= 65 && charCode <= 90) {
        sum += (charCode - 64); // A=1, B=2, etc.
      }
    }
    return sum % TABLE_SIZE;
  }
};

const simulate = (keys: string[], mission: Mission): SimulationResult => {
  const hashFn = hashFunctions[mission.hashFn];
  let maxChain = 0;
  let maxProbes = 0;
  let totalCollisions = 0;

  if (mission.strategy === 'chaining') {
    const table: string[][] = Array.from({ length: TABLE_SIZE }, () => []);
    keys.forEach(key => {
      const h = hashFn(key);
      if (table[h].length > 0) totalCollisions++;
      if (!table[h].includes(key)) { // Prevent exact duplicates for challenge fairness
        table[h].push(key);
        maxChain = Math.max(maxChain, table[h].length);
      }
    });
    return {
      table,
      maxChain,
      maxProbes: 0,
      totalCollisions,
      isSuccess: maxChain >= mission.targetValue
    };
  } else {
    // Linear Probing
    const table: (string | null)[] = Array(TABLE_SIZE).fill(null);
    keys.forEach((key) => {
      if (table.includes(key)) return; // Skip duplicates
      
      const h = hashFn(key);
      let probes = 0;
      let placed = false;
      
      // If bucket is occupied, it's a collision
      if (table[h] !== null) totalCollisions++;

      while (probes < TABLE_SIZE) {
        const idx = (h + probes) % TABLE_SIZE;
        if (table[idx] === null) {
          table[idx] = key;
          maxProbes = Math.max(maxProbes, probes);
          placed = true;
          break;
        }
        probes++;
      }
      // If table is full, it just drops the key for this simulation
    });
    
    return {
      table,
      maxChain: 0,
      maxProbes,
      totalCollisions,
      isSuccess: maxProbes >= mission.targetValue
    };
  }
};

// --- Main Component ---

export default function MisHashChallenge() {
  const [activeMissionIdx, setActiveMissionIdx] = useState(0);
  const [keys, setKeys] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showHint, setShowHint] = useState(false);

  const activeMission = MISSIONS[activeMissionIdx];

  // Reset keys when mission changes
  useEffect(() => {
    setKeys([]);
    setInputValue('');
    setShowHint(false);
  }, [activeMissionIdx]);

  const result = useMemo(() => simulate(keys, activeMission), [keys, activeMission]);

  const handleAddKey = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanVal = inputValue.trim();
    if (!cleanVal) return;
    
    // Validate input type based on mission
    if (activeMission.hashFn === 'modulo10' && isNaN(Number(cleanVal))) {
      alert("This mission requires numeric keys!");
      return;
    }
    
    if (!keys.includes(cleanVal) && keys.length < TABLE_SIZE) {
      setKeys([...keys, cleanVal]);
    }
    setInputValue('');
  };

  const handleRemoveKey = (keyToRemove: string) => {
    setKeys(keys.filter(k => k !== keyToRemove));
  };

  const validateInput = (val: string) => {
    if (activeMission.hashFn === 'modulo10') {
      return val.replace(/[^0-9-]/g, '');
    }
    return val.replace(/[^a-zA-Z]/g, '');
  };

  return (
    <div className="min-h-screen bg-[#FFF0F5] p-6 font-sans text-slate-800 flex flex-col items-center">
      
      {/* Header */}
      <div className="max-w-5xl w-full mb-8 flex items-center justify-between bg-white p-6 rounded-3xl shadow-sm border-4 border-[#FFE4E1]">
        <div>
          <h1 className="text-3xl font-extrabold text-[#FF69B4] flex items-center gap-3">
            <Skull className="w-8 h-8" />
            Mis-hash Challenge
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Craft adversarial keys to expose hash map vulnerabilities.</p>
        </div>
        
        {/* Mission Selector */}
        <div className="flex gap-2 bg-slate-100 p-2 rounded-2xl">
          {MISSIONS.map((m, idx) => (
            <button
              key={m.id}
              onClick={() => setActiveMissionIdx(idx)}
              className={`px-4 py-2 rounded-xl font-bold transition-all ${
                activeMissionIdx === idx 
                  ? 'bg-white text-[#FF69B4] shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Level {idx + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Controls & Mission Briefing */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Mission Card */}
          <div className="bg-[#E0FFFF] p-6 rounded-3xl shadow-sm border-4 border-[#B0E0E6] relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-10">
              <ShieldAlert className="w-32 h-32" />
            </div>
            <h2 className="text-xl font-bold text-[#008B8B] mb-2">{activeMission.title}</h2>
            <p className="text-[#2F4F4F] mb-4 text-sm leading-relaxed">{activeMission.description}</p>
            
            <div className="flex flex-col gap-2 text-sm font-semibold text-[#008080] bg-white/50 p-3 rounded-xl">
              <div className="flex justify-between">
                <span>Strategy:</span>
                <span className="capitalize">{activeMission.strategy.replace('-', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span>Hash Function:</span>
                <span>{activeMission.hashFn === 'modulo10' ? 'Key % 10' : 'Alpha Sum % 10'}</span>
              </div>
            </div>

            <button 
              onClick={() => setShowHint(!showHint)}
              className="mt-4 text-xs font-bold text-[#20B2AA] hover:text-[#008B8B] flex items-center gap-1 transition-colors"
            >
              <Info className="w-4 h-4" /> {showHint ? 'Hide Hint' : 'Need a hint?'}
            </button>
            {showHint && (
              <div className="mt-2 text-sm bg-[#F0FFFF] text-[#008B8B] p-3 rounded-xl italic">
                {activeMission.hint}
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border-4 border-[#E6E6FA]">
            <h3 className="font-bold text-[#9370DB] mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" /> Attack Vector
            </h3>
            
            <form onSubmit={handleAddKey} className="flex gap-2 mb-4">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(validateInput(e.target.value))}
                placeholder={activeMission.hashFn === 'modulo10' ? "Enter a number..." : "Enter a word..."}
                className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-[#9370DB] transition-colors font-mono"
              />
              <button 
                type="submit"
                disabled={keys.length >= TABLE_SIZE || result.isSuccess}
                className="bg-[#9370DB] hover:bg-[#8A2BE2] disabled:bg-slate-300 text-white px-4 py-2 rounded-xl font-bold transition-colors"
              >
                Add
              </button>
            </form>

            {/* Key List */}
            <div className="flex flex-wrap gap-2">
              {keys.map(k => (
                <div key={k} className="bg-[#F8F8FF] border-2 border-[#D8BFD8] text-[#800080] px-3 py-1 rounded-lg font-mono text-sm flex items-center gap-2">
                  {k}
                  <button onClick={() => handleRemoveKey(k)} className="hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {keys.length === 0 && (
                <span className="text-slate-400 text-sm italic">No keys injected yet.</span>
              )}
            </div>
            <div className="mt-4 text-xs text-slate-400 text-right">
              Payload size: {keys.length} / {TABLE_SIZE}
            </div>
          </div>
        </div>

        {/* Right Column: Arena & Stats */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Success Banner */}
          {result.isSuccess && (
            <div className="bg-[#98FB98] border-4 border-[#3CB371] p-4 rounded-3xl flex items-center justify-between shadow-sm animate-pulse">
              <div className="flex items-center gap-3 text-[#006400]">
                <CheckCircle2 className="w-8 h-8" />
                <div>
                  <h3 className="font-extrabold text-lg">System Compromised!</h3>
                  <p className="text-sm font-medium">You successfully exploited the hash strategy.</p>
                </div>
              </div>
              {activeMissionIdx < MISSIONS.length - 1 && (
                <button 
                  onClick={() => setActiveMissionIdx(i => i + 1)}
                  className="bg-[#3CB371] text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-[#2E8B57] transition-colors"
                >
                  Next Level <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Visualization Arena */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border-4 border-[#FFFACD] flex-1 flex flex-col">
            <h3 className="font-bold text-[#DAA520] mb-6 flex items-center gap-2">
              <AlertOctagon className="w-5 h-5" /> Memory Arena (Size: {TABLE_SIZE})
            </h3>
            
            <div className="flex-1 flex flex-col justify-center">
              {activeMission.strategy === 'chaining' ? (
                // Chaining Visualization
                <div className="flex flex-col gap-3">
                  {result.table.map((chain: string[], idx: number) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#FFF8DC] border-2 border-[#F0E68C] rounded-xl flex items-center justify-center font-bold text-[#B8860B] shrink-0 shadow-sm">
                        {idx}
                      </div>
                      <div className="flex gap-2 flex-wrap min-h-[3rem] items-center p-2 bg-slate-50 rounded-xl flex-1 border-2 border-dashed border-slate-200">
                        {chain.length === 0 && <span className="text-slate-300 text-sm ml-2">Empty</span>}
                        {chain.map((k, i) => (
                          <div key={`${k}-${i}`} className="bg-[#FFDAB9] border-2 border-[#FFA07A] text-[#CD5C5C] px-3 py-1 rounded-lg font-mono text-sm shadow-sm animate-bounce-short">
                            {k}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Linear Probing Visualization
                <div className="grid grid-cols-5 gap-4">
                  {result.table.map((k: string | null, idx: number) => (
                    <div key={idx} className="flex flex-col items-center gap-2">
                      <div className={`w-full aspect-square rounded-2xl border-4 flex items-center justify-center shadow-sm transition-all duration-300 ${
                        k 
                          ? 'bg-[#FFDAB9] border-[#FFA07A] text-[#CD5C5C] scale-105' 
                          : 'bg-slate-50 border-slate-200 text-slate-300'
                      }`}>
                        {k ? (
                          <span className="font-mono font-bold text-lg truncate px-2">{k}</span>
                        ) : (
                          <span className="text-xs font-medium">Empty</span>
                        )}
                      </div>
                      <span className="font-bold text-[#DAA520] bg-[#FFF8DC] px-3 py-1 rounded-full text-xs border border-[#F0E68C]">
                        Slot {idx}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Live Stats */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard 
              label="Target Metric" 
              value={activeMission.targetMetric === 'maxChain' ? 'Max Chain' : 'Max Probes'} 
              subtext={`Goal: >= ${activeMission.targetValue}`}
              color="blue"
            />
            <StatCard 
              label="Current Value" 
              value={activeMission.targetMetric === 'maxChain' ? result.maxChain : result.maxProbes} 
              subtext="Keep adding keys"
              color={result.isSuccess ? 'green' : 'orange'}
              highlight={result.isSuccess}
            />
            <StatCard 
              label="Total Collisions" 
              value={result.totalCollisions} 
              subtext="Overall inefficiency"
              color="purple"
            />
          </div>

        </div>
      </div>
    </div>
  );
}

// --- Helper Components ---

function StatCard({ label, value, subtext, color, highlight = false }: { label: string, value: string | number, subtext: string, color: 'blue' | 'green' | 'orange' | 'purple', highlight?: boolean }) {
  const colors = {
    blue: 'bg-[#F0F8FF] border-[#B0C4DE] text-[#4682B4]',
    green: 'bg-[#F0FFF0] border-[#98FB98] text-[#2E8B57]',
    orange: 'bg-[#FFFAF0] border-[#FFDAB9] text-[#D2691E]',
    purple: 'bg-[#F8F8FF] border-[#D8BFD8] text-[#800080]',
  };

  return (
    <div className={`${colors[color]} border-2 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden`}>
      {highlight && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
      <span className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1 z-10">{label}</span>
      <span className="text-3xl font-extrabold z-10">{value}</span>
      <span className="text-xs font-medium opacity-60 mt-1 z-10">{subtext}</span>
    </div>
  );
}