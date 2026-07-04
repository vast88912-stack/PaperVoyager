import React, { useState, useEffect, useRef } from 'react';

// --- Types & Constants ---

type Strategy = 'chaining' | 'linear';
type HashAlgorithm = 'mod10' | 'mult3mod10' | 'midSquare';

interface TableSlotData {
  keys: number[]; // Array for chaining, single element array for linear
}

interface AnimationStep {
  index: number;
  type: 'probe' | 'collision' | 'insert' | 'full';
  key: number;
}

const TABLE_SIZE = 10;

// --- Helper Functions ---

const hashFunctions = {
  mod10: (key: number) => key % TABLE_SIZE,
  mult3mod10: (key: number) => (key * 3) % TABLE_SIZE,
  midSquare: (key: number) => {
    const squared = key * key;
    // Extract middle digit (simplified for small keys)
    const str = squared.toString().padStart(3, '0');
    const mid = parseInt(str[Math.floor(str.length / 2)], 10);
    return mid % TABLE_SIZE;
  },
};

const getRank = (maxProbes: number) => {
  if (maxProbes <= 1) return { title: 'Harmless User', color: 'text-slate-500', bg: 'bg-slate-100' };
  if (maxProbes <= 3) return { title: 'Troublemaker', color: 'text-yellow-600', bg: 'bg-yellow-100' };
  if (maxProbes <= 6) return { title: 'Collision Cultist', color: 'text-orange-600', bg: 'bg-orange-100' };
  return { title: 'Adversarial Mastermind', color: 'text-red-600', bg: 'bg-red-100' };
};

// --- Components ---

const AlertIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const FlameIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
  </svg>
);


export default function App() {
  // State
  const [strategy, setStrategy] = useState<Strategy>('chaining');
  const [algo, setAlgo] = useState<HashAlgorithm>('mod10');
  const [table, setTable] = useState<TableSlotData[]>(Array.from({ length: TABLE_SIZE }, () => ({ keys: [] })));
  const [inputValue, setInputValue] = useState<string>('');
  
  // Stats
  const [maxChainOrProbe, setMaxChainOrProbe] = useState<number>(0);
  const [totalCollisions, setTotalCollisions] = useState<number>(0);
  const [insertedKeysCount, setInsertedKeysCount] = useState<number>(0);
  
  // Animation State
  const [isAnimating, setIsAnimating] = useState(false);
  const [animSteps, setAnimSteps] = useState<AnimationStep[]>([]);
  const [currentAnimStepIdx, setCurrentAnimStepIdx] = useState<number>(-1);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string, type: 'neutral' | 'success' | 'warning' | 'error' } | null>(null);

  // Refs for timers
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Core Logic ---

  const handleInsert = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isAnimating) return;

    const key = parseInt(inputValue, 10);
    if (isNaN(key) || key < 0 || key > 999) {
      setFeedbackMsg({ text: 'Please enter a valid number (0-999)', type: 'error' });
      return;
    }

    setInputValue('');
    setFeedbackMsg(null);
    setIsAnimating(true);
    setCurrentAnimStepIdx(-1);

    const hashFn = hashFunctions[algo];
    const initialHash = hashFn(key);
    const steps: AnimationStep[] = [];

    if (strategy === 'chaining') {
      // Separate Chaining Logic
      steps.push({ index: initialHash, type: 'probe', key });
      
      const targetSlotLength = table[initialHash].keys.length;
      if (targetSlotLength > 0) {
        steps.push({ index: initialHash, type: 'collision', key });
      }
      
      steps.push({ index: initialHash, type: 'insert', key });

    } else {
      // Linear Probing Logic
      let currentIdx = initialHash;
      let probeCount = 0;
      let inserted = false;

      while (probeCount < TABLE_SIZE) {
        steps.push({ index: currentIdx, type: 'probe', key });
        
        if (table[currentIdx].keys.length === 0) {
          steps.push({ index: currentIdx, type: 'insert', key });
          inserted = true;
          break;
        } else {
          steps.push({ index: currentIdx, type: 'collision', key });
          currentIdx = (currentIdx + 1) % TABLE_SIZE;
          probeCount++;
        }
      }

      if (!inserted) {
        steps.push({ index: initialHash, type: 'full', key });
      }
    }

    setAnimSteps(steps);
    setCurrentAnimStepIdx(0);
  };

  const resetTable = () => {
    setTable(Array.from({ length: TABLE_SIZE }, () => ({ keys: [] })));
    setMaxChainOrProbe(0);
    setTotalCollisions(0);
    setInsertedKeysCount(0);
    setFeedbackMsg(null);
    setAnimSteps([]);
    setCurrentAnimStepIdx(-1);
    setIsAnimating(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handleStrategyChange = (newStrategy: Strategy) => {
    setStrategy(newStrategy);
    resetTable();
  };

  const handleAlgoChange = (newAlgo: HashAlgorithm) => {
    setAlgo(newAlgo);
    resetTable();
  };

  // --- Animation Engine ---

  useEffect(() => {
    if (!isAnimating || currentAnimStepIdx < 0 || currentAnimStepIdx >= animSteps.length) {
      return;
    }

    const step = animSteps[currentAnimStepIdx];
    let delay = 400; // Base delay

    if (step.type === 'collision') delay = 600;
    if (step.type === 'insert' || step.type === 'full') delay = 800;

    timeoutRef.current = setTimeout(() => {
      if (currentAnimStepIdx === animSteps.length - 1) {
        // Last step - finalize state
        finalizeInsertion(step);
      } else {
        // Next step
        setCurrentAnimStepIdx(prev => prev + 1);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentAnimStepIdx, animSteps, isAnimating]);

  const finalizeInsertion = (finalStep: AnimationStep) => {
    setIsAnimating(false);
    
    if (finalStep.type === 'full') {
      setFeedbackMsg({ text: 'Table is full! Cannot insert.', type: 'error' });
      return;
    }

    const { key, index } = finalStep;
    
    // Update Table
    const newTable = [...table];
    newTable[index] = { keys: [...newTable[index].keys, key] };
    setTable(newTable);

    // Update Stats
    setInsertedKeysCount(prev => prev + 1);
    
    let collisionsInThisInsert = 0;
    let newMax = maxChainOrProbe;

    if (strategy === 'chaining') {
      collisionsInThisInsert = newTable[index].keys.length > 1 ? 1 : 0;
      newMax = Math.max(maxChainOrProbe, newTable[index].keys.length);
    } else {
      // Linear - count collisions from anim steps
      collisionsInThisInsert = animSteps.filter(s => s.type === 'collision').length;
      newMax = Math.max(maxChainOrProbe, collisionsInThisInsert + 1); // +1 because probe count is collisions + initial check
    }

    setTotalCollisions(prev => prev + collisionsInThisInsert);
    setMaxChainOrProbe(newMax);

    // Feedback
    if (collisionsInThisInsert > 0) {
      setFeedbackMsg({ text: `Collision! Added to your score.`, type: 'warning' });
    } else {
      setFeedbackMsg({ text: `Clean insert. Too easy!`, type: 'neutral' });
    }
    
    // Clear animation visuals after a brief moment
    setTimeout(() => {
      setCurrentAnimStepIdx(-1);
    }, 500);
  };


  // --- Render Helpers ---

  const renderChainingBuckets = () => {
    return (
      <div className="flex justify-around items-start w-full gap-2 px-2">
        {table.map((slot, idx) => {
          const isTarget = isAnimating && currentAnimStepIdx >= 0 && animSteps[currentAnimStepIdx].index === idx;
          const currentStepType = isTarget ? animSteps[currentAnimStepIdx].type : null;
          
          return (
            <div key={idx} className="flex flex-col items-center flex-1">
              <div className="text-xs font-bold text-slate-400 mb-2 border-b-2 border-slate-200 w-full text-center pb-1">
                {idx}
              </div>
              <div className="flex flex-col gap-1 w-full items-center min-h-[160px]">
                {/* Existing Keys */}
                {slot.keys.map((k, i) => (
                  <div key={i} className="w-10 h-10 md:w-12 md:h-12 bg-teal-200 text-teal-800 rounded-md shadow-sm flex items-center justify-center font-bold border-2 border-teal-300 transition-all">
                    {k}
                  </div>
                ))}
                
                {/* Animating Key */}
                {isTarget && (
                  <div className={`
                    w-10 h-10 md:w-12 md:h-12 rounded-md shadow-md flex items-center justify-center font-bold text-white transition-all duration-300 transform
                    ${currentStepType === 'probe' ? 'bg-blue-400 scale-110 -translate-y-2' : ''}
                    ${currentStepType === 'collision' ? 'bg-red-400 scale-125 animate-pulse' : ''}
                    ${currentStepType === 'insert' ? 'bg-teal-400 scale-100' : ''}
                  `}>
                    {animSteps[currentAnimStepIdx].key}
                  </div>
                )}
                
                {/* Empty Slot Placeholder */}
                {!isTarget && slot.keys.length === 0 && (
                  <div className="w-10 h-10 md:w-12 md:h-12 border-2 border-dashed border-slate-300 rounded-md flex items-center justify-center bg-slate-50/50">
                    <span className="text-slate-300 text-xs">empty</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderLinearBuckets = () => {
    return (
      <div className="grid grid-cols-5 md:grid-cols-10 gap-2 w-full p-2 bg-slate-100/50 rounded-xl">
        {table.map((slot, idx) => {
          const isTarget = isAnimating && currentAnimStepIdx >= 0 && animSteps[currentAnimStepIdx].index === idx;
          const currentStepType = isTarget ? animSteps[currentAnimStepIdx].type : null;
          const hasKey = slot.keys.length > 0;
          
          let bgColor = 'bg-white';
          let border = 'border-slate-200';
          let textColor = 'text-slate-800';

          if (hasKey) {
            bgColor = 'bg-purple-200';
            border = 'border-purple-300';
            textColor = 'text-purple-900';
          }

          if (isTarget) {
            if (currentStepType === 'probe') {
              bgColor = 'bg-blue-100'; border = 'border-blue-400 border-4';
            } else if (currentStepType === 'collision') {
              bgColor = 'bg-red-200'; border = 'border-red-500 border-4'; textColor = 'text-red-900';
            } else if (currentStepType === 'insert') {
              bgColor = 'bg-green-200'; border = 'border-green-500 border-4'; textColor = 'text-green-900';
            } else if (currentStepType === 'full') {
              bgColor = 'bg-red-500'; border = 'border-red-700 border-4'; textColor = 'text-white';
            }
          }

          return (
            <div key={idx} className="relative aspect-square flex flex-col items-center justify-center">
              <div className="absolute top-1 left-1 md:-top-5 md:left-auto text-[10px] md:text-xs font-bold text-slate-400">
                {idx}
              </div>
              <div className={`
                w-full h-full rounded-lg shadow-sm flex flex-col items-center justify-center transition-all duration-300 border-2
                ${bgColor} ${border} ${textColor}
                ${isTarget && currentStepType === 'collision' ? 'animate-[shake_0.5s_ease-in-out]' : ''}
              `}>
                <span className="font-mono text-lg md:text-xl font-bold">
                  {isTarget && currentStepType !== 'collision' && currentStepType !== 'probe' && !hasKey ? animSteps[currentAnimStepIdx].key : (hasKey ? slot.keys[0] : '')}
                </span>
                
                {/* Floating animated key overlay for visual tracing */}
                {isTarget && (currentStepType === 'probe' || currentStepType === 'collision') && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 backdrop-blur-sm bg-white/30 rounded-lg">
                     <span className="font-mono text-xl font-black drop-shadow-md text-slate-800">
                        {animSteps[currentAnimStepIdx].key}
                     </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const rank = getRank(maxChainOrProbe);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 p-4 md:p-8 flex justify-center">
      <div className="max-w-5xl w-full flex flex-col gap-6">
        
        {/* Header */}
        <header className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-pink-100 rounded-full mb-2">
             <FlameIcon />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">
            Mis-Hash <span className="text-pink-500">Challenge</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Your goal: Break the hash table. Craft keys that map to the same bucket to create the longest collision chain possible. 
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Controls */}
          <div className="lg:col-span-1 space-y-4">
            
            {/* Strategy Selection Panel */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Configuration</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Collision Strategy</label>
                  <div className="flex bg-slate-100 rounded-lg p-1">
                    <button 
                      onClick={() => handleStrategyChange('chaining')}
                      className={`flex-1 text-sm py-2 rounded-md font-medium transition-colors ${strategy === 'chaining' ? 'bg-white shadow-sm text-pink-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Separate Chaining
                    </button>
                    <button 
                      onClick={() => handleStrategyChange('linear')}
                      className={`flex-1 text-sm py-2 rounded-md font-medium transition-colors ${strategy === 'linear' ? 'bg-white shadow-sm text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Linear Probing
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hash Function</label>
                  <select 
                    value={algo} 
                    onChange={(e) => handleAlgoChange(e.target.value as HashAlgorithm)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 text-sm focus:ring-2 focus:ring-pink-200 outline-none"
                  >
                    <option value="mod10">Simple Modulo (key % 10)</option>
                    <option value="mult3mod10">Multiplicative ((key * 3) % 10)</option>
                    <option value="midSquare">Mid-Square (Middle digit of key²)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Input Panel */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
              {/* Decorative background blob */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-100 rounded-full blur-2xl opacity-50 pointer-events-none"></div>
              
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 relative z-10">Attack the