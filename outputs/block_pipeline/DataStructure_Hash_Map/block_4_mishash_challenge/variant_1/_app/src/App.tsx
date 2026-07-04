import React, { useState, useMemo, useEffect } from 'react';

type Strategy = 'chaining' | 'linear';

export default function App() {
  const [strategy, setStrategy] = useState<Strategy>('chaining');
  const [keys, setKeys] = useState<number[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [showHint, setShowHint] = useState<boolean>(false);

  const TABLE_SIZE = 10;
  const TARGET_SCORE = 5;

  // Compute Hash Table State
  const { chainingTable, linearTable, linearProbes, maxScore } = useMemo(() => {
    const cTable: number[][] = Array.from({ length: TABLE_SIZE }, () => []);
    const lTable: (number | null)[] = Array(TABLE_SIZE).fill(null);
    const lProbes: Record<number, number> = {};
    
    let currentMaxScore = 0;

    // Process Chaining
    if (strategy === 'chaining') {
      keys.forEach((k) => {
        const hash = k % TABLE_SIZE;
        cTable[hash].push(k);
        if (cTable[hash].length > currentMaxScore) {
          currentMaxScore = cTable[hash].length;
        }
      });
    }

    // Process Linear Probing
    if (strategy === 'linear') {
      keys.forEach((k) => {
        let probes = 1;
        let idx = k % TABLE_SIZE;
        
        while (lTable[idx] !== null && probes <= TABLE_SIZE) {
          probes++;
          idx = (idx + 1) % TABLE_SIZE;
        }
        
        if (probes <= TABLE_SIZE) {
          lTable[idx] = k;
          lProbes[k] = probes;
          if (probes > currentMaxScore) {
            currentMaxScore = probes;
          }
        }
      });
    }

    return {
      chainingTable: cTable,
      linearTable: lTable,
      linearProbes: lProbes,
      maxScore: currentMaxScore,
    };
  }, [keys, strategy]);

  const hasWon = maxScore >= TARGET_SCORE;
  const isFull = strategy === 'linear' && keys.length >= TABLE_SIZE;

  const handleInsert = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (hasWon) return;
    
    const num = parseInt(inputValue, 10);
    if (isNaN(num) || num < 0) return;
    if (keys.includes(num)) {
      alert("Key already exists! Try a different one.");
      return;
    }
    if (isFull) {
      alert("Table is full!");
      return;
    }

    setKeys([...keys, num]);
    setInputValue('');
    setShowHint(false);
  };

  const reset = () => {
    setKeys([]);
    setInputValue('');
    setShowHint(false);
  };

  // Switch strategy resets the board
  useEffect(() => {
    reset();
  }, [strategy]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-teal-100 p-6 font-sans text-slate-800 flex flex-col items-center justify-center">
      
      {/* Header Section */}
      <div className="max-w-4xl w-full text-center mb-8">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 mb-4 drop-shadow-sm">
          Mis-hash Challenge 🕵️‍♀️
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto bg-white/50 p-4 rounded-2xl shadow-sm border border-white/60">
          Your goal is to break the hash map! Craft adversarial keys to force collisions. 
          The hash function is <code className="bg-pink-100 text-pink-700 px-2 py-1 rounded-md font-mono font-bold">h(k) = k % 10</code>.
        </p>
      </div>

      {/* Main Game Card */}
      <div className="max-w-5xl w-full bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/80 p-8 relative overflow-hidden">
        
        {/* Win Overlay */}
        {hasWon && (
          <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-500">
            <div className="text-7xl mb-6 animate-bounce">🎉</div>
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-teal-500 mb-4">
              Challenge Beaten!
            </h2>
            <p className="text-xl text-slate-600 mb-8 font-medium">
              You successfully exploited the {strategy} strategy!
            </p>
            <button 
              onClick={reset}
              className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all active:scale-95"
            >
              Play Again
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Controls Panel */}
          <div className="w-full lg:w-1/3 flex flex-col gap-6">
            
            {/* Strategy Toggle */}
            <div className="bg-slate-100 p-2 rounded-2xl flex relative shadow-inner">
              <button
                onClick={() => setStrategy('chaining')}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all z-10 ${strategy === 'chaining' ? 'text-purple-700 shadow-sm bg-white' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Separate Chaining
              </button>
              <button
                onClick={() => setStrategy('linear')}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all z-10 ${strategy === 'linear' ? 'text-purple-700 shadow-sm bg-white' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Linear Probing
              </button>
            </div>

            {/* Objective Box */}
            <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-purple-800 font-bold mb-2 flex items-center gap-2">
                <span>🎯</span> Objective
              </h3>
              <p className="text-purple-900/80 text-sm font-medium">
                {strategy === 'chaining' 
                  ? `Stack ${TARGET_SCORE} keys in a single bucket.` 
                  : `Force a single insertion to take ${TARGET_SCORE} or more probes.`}
              </p>
              
              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs font-bold text-purple-700 mb-1">
                  <span>Current Max: {maxScore}</span>
                  <span>Target: {TARGET_SCORE}</span>
                </div>
                <div className="h-3 bg-purple-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-400 to-pink-500 transition-all duration-500 ease-out"
                    style={{ width: `${Math.min((maxScore / TARGET_SCORE) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleInsert} className="flex flex-col gap-3">
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Enter a key (e.g. 42)"
                  className="w-full pl-5 pr-24 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-lg font-bold text-slate-700 focus:outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100 transition-all placeholder:text-slate-400 placeholder:font-normal"
                  disabled={hasWon || isFull}
                />
                <button
                  type="submit"
                  disabled={!inputValue || hasWon || isFull}
                  className="absolute right-2 top-2 bottom-2 px-6 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-slate-800 transition-colors"
                >
                  Insert
                </button>
              </div>
              
              <div className="flex justify-between items-center px-1">
                <button
                  type="button"
                  onClick={() => setShowHint(!showHint)}
                  className="text-sm font-bold text-pink-500 hover:text-pink-600 flex items-center gap-1 transition-colors"
                >
                  💡 Need a hint?
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Reset Board
                </button>
              </div>

              {showHint && (
                <div className="bg-pink-50 text-pink-800 text-sm p-3 rounded-xl border border-pink-200 animate-in slide-in-from-top-2">
                  {strategy === 'chaining' 
                    ? "Try inserting multiple numbers that end in the same digit (e.g., 5, 15, 25)." 
                    : "Try inserting numbers that hash to the same index to create a cluster, then hit that cluster again!"}
                </div>
              )}
            </form>

            {/* Stats */}
            <div className="mt-auto grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <div className="text-2xl font-black text-slate-700">{keys.length}</div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Keys Inserted</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <div className="text-2xl font-black text-slate-700">{TABLE_SIZE}</div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Table Size</div>
              </div>
            </div>

          </div>

          {/* Visualization Panel */}
          <div className="w-full lg:w-2/3 bg-slate-50/50 rounded-3xl border-2 border-slate-100 p-8 flex flex-col justify-center min-h-[400px]">
            
            {strategy === 'chaining' ? (
              // SEPARATE CHAINING VISUALIZATION
              <div className="flex justify-between items-end h-full gap-2 pb-4 border-b-4 border-slate-200 relative">
                {chainingTable.map((bucket, i) => (
                  <div key={i} className="flex flex-col-reverse gap-2 w-full items-center relative group">
                    {/* Bucket Index */}
                    <div className="absolute -bottom-10 w-8 h-8 flex items-center justify-center font-black text-slate-400 bg-white rounded-lg shadow-sm border border-slate-100">
                      {i}
                    </div>
                    
                    {/* Empty Slot Indicator */}
                    {bucket.length === 0 && (
                      <div className="w-full max-w-[3rem] h-12 border-2 border-dashed border-slate-200 rounded-xl" />
                    )}

                    {/* Stacked Keys */}
                    {bucket.map((k, j) => (
                      <div 
                        key={`${k}-${j}`} 
                        className="w-full max-w-[3rem] aspect-square flex items-center justify-center font-bold text-white rounded-xl shadow-md animate-in slide-in-from-top-4 fade-in duration-300"
                        style={{
                          backgroundColor: `hsl(${(i * 36) % 360}, 70%, 60%)`,
                          transform: `translateY(${j === bucket.length - 1 ? '0' : '4px'})`,
                          zIndex: bucket.length - j
                        }}
                      >
                        {k}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              // LINEAR PROBING VISUALIZATION
              <div className="flex flex-col gap-8">
                <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
                  {linearTable.map((k, i) => (
                    <div key={i} className="flex flex-col items-center gap-3">
                      {/* Cell */}
                      <div 
                        className={`w-full aspect-square rounded-2xl flex flex-col items-center justify-center shadow-inner transition-all duration-300 relative ${
                          k !== null 
                            ? 'bg-gradient-to-br from-teal-400 to-emerald-500 shadow-lg scale-105 border-none' 
                            : 'bg-white border-2 border-dashed border-slate-200'
                        }`}
                      >
                        {k !== null && (
                          <>
                            <span className="text-xl font-black text-white">{k}</span>
                            {/* Probes Badge */}
                            <div className="absolute -top-2 -right-2 bg-pink-500 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-sm border-2 border-white" title={`${linearProbes[k]} probes needed`}>
                              {linearProbes[k]}p
                            </div>
                          </>
                        )}
                      </div>
                      {/* Index */}
                      <div className="font-black text-slate-400 text-sm">{i}</div>
                    </div>
                  ))}
                </div>
                
                {/* Linear Probing Legend/Info */}
                <div className="flex justify-center gap-6 text-sm font-medium text-slate-500 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-md bg-white border-2 border-dashed border-slate-300" />
                    Empty Slot
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-md bg-gradient-to-br from-teal-400 to-emerald-500" />
                    Filled Slot
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-pink-500 flex items-center justify-center text-[8px] text-white font-bold">p</div>
                    Probe Count
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
      
    </div>
  );
}