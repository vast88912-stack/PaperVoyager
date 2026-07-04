import React, { useState, useEffect } from 'react';

export default function App() {
  const [quantum, setQuantum] = useState<number>(4);
  const [isBlinking, setIsBlinking] = useState(true);

  // Terminal cursor blinking effect
  useEffect(() => {
    const interval = setInterval(() => {
      setIsBlinking((prev) => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuantum(Number(e.target.value));
  };

  const presetValues = [1, 2, 4, 8, 16];

  // Calculate dynamic warnings based on TQ size
  const getWarningMessage = () => {
    if (quantum === 1) return "WARN: High context switch overhead detected.";
    if (quantum >= 16) return "WARN: Quantum too large, degenerating to FCFS.";
    return "INFO: Quantum size optimal for balanced response time.";
  };

  const getWarningColor = () => {
    if (quantum === 1) return "text-red-500 border-red-500/50 bg-red-500/10";
    if (quantum >= 16) return "text-amber-500 border-amber-500/50 bg-amber-500/10";
    return "text-emerald-500 border-emerald-500/50 bg-emerald-500/10";
  };

  // Mock process length for visualization
  const totalProcessTime = 32;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-mono text-emerald-400 selection:bg-emerald-500/30">
      
      {/* Main Terminal Window */}
      <div className="w-full max-w-3xl border border-emerald-800/60 bg-slate-900/80 shadow-[0_0_40px_rgba(16,185,129,0.1)] rounded-lg overflow-hidden flex flex-col backdrop-blur-sm">
        
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-emerald-800/60 bg-slate-950">
          <div className="flex space-x-2 items-center">
            <div className="w-3 h-3 rounded-full bg-red-500/80 border border-red-600"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-600"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-600"></div>
          </div>
          <div className="text-xs text-emerald-600/80 tracking-widest uppercase">
            ~/cpu_scheduler/tq_config.sh
          </div>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>

        {/* Terminal Body */}
        <div className="p-8 flex flex-col space-y-8">
          
          {/* Header Section */}
          <div>
            <h1 className="text-2xl font-bold flex items-center text-emerald-300">
              <svg className="w-6 h-6 mr-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Time Quantum (TQ) Configurator
            </h1>
            <p className="mt-2 text-sm text-emerald-600">
              Adjust the time slice allocated to each process before preemption (Round Robin & MLFQ).
            </p>
          </div>

          {/* Slider Control Area */}
          <div className="bg-slate-950 p-6 rounded border border-emerald-900/50 shadow-inner relative group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm text-emerald-500/70">1 ms</span>
              <div className="text-3xl font-bold text-emerald-300 tracking-wider">
                {quantum} <span className="text-emerald-600 text-xl">ms</span>
              </div>
              <span className="text-sm text-emerald-500/70">32 ms</span>
            </div>

            <input
              type="range"
              min="1"
              max="32"
              step="1"
              value={quantum}
              onChange={handleSliderChange}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />

            {/* Presets */}
            <div className="mt-6 flex justify-between items-center">
              <span className="text-xs text-emerald-700 uppercase tracking-widest">Presets:</span>
              <div className="flex space-x-3">
                {presetValues.map((val) => (
                  <button
                    key={val}
                    onClick={() => setQuantum(val)}
                    className={`px-3 py-1 text-xs rounded border transition-all duration-200 ${
                      quantum === val
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                        : "bg-transparent border-emerald-900/50 text-emerald-600 hover:border-emerald-500/50 hover:text-emerald-400"
                    }`}
                  >
                    {val}ms
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Visualization Section */}
          <div className="flex flex-col space-y-3">
            <h2 className="text-xs text-emerald-700 uppercase tracking-widest flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Process Slicing Preview (Total: 32ms)
            </h2>
            
            <div className="w-full bg-slate-950 border border-emerald-900/50 p-4 rounded relative">
              <div className="flex w-full h-8 rounded-sm overflow-hidden border border-emerald-800/30">
                {Array.from({ length: totalProcessTime }).map((_, i) => {
                  const chunkIndex = Math.floor(i / quantum);
                  const isEvenChunk = chunkIndex % 2 === 0;
                  const isFirstInChunk = i % quantum === 0;
                  
                  return (
                    <div
                      key={i}
                      className={`flex-1 h-full transition-all duration-300 ${
                        isEvenChunk ? "bg-emerald-500/40" : "bg-emerald-700/40"
                      } ${isFirstInChunk && i !== 0 ? "border-l border-emerald-950" : ""}`}
                      title={`ms: ${i + 1}`}
                    />
                  );
                })}
              </div>
              
              {/* Tick markers */}
              <div className="flex w-full mt-2 relative h-4">
                {Array.from({ length: Math.floor(totalProcessTime / quantum) + 1 }).map((_, i) => {
                  const pos = (i * quantum * 100) / totalProcessTime;
                  if (pos > 100) return null;
                  return (
                    <div
                      key={`tick-${i}`}
                      className="absolute flex flex-col items-center -ml-[1ch]"
                      style={{ left: `${pos}%` }}
                    >
                      <div className="h-2 w-px bg-emerald-600/50 mb-1"></div>
                      <span className="text-[10px] text-emerald-600/80 leading-none">
                        {i * quantum}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Dynamic Warning Badge */}
          <div className={`mt-4 p-3 rounded text-sm border flex items-start space-x-3 transition-colors duration-300 ${getWarningColor()}`}>
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              {quantum === 1 || quantum >= 16 ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
            <div className="flex-1">
              <span className="font-semibold">{quantum === 1 || quantum >= 16 ? 'WARNING' : 'STATUS'}:</span> {getWarningMessage()}
            </div>
          </div>

          {/* Terminal Footer Prompt */}
          <div className="pt-4 border-t border-emerald-900/50 text-sm flex items-center text-emerald-500/60">
            <span className="text-emerald-400 mr-2">sysadmin@cpu-studio:~$</span>
            <span>./apply_tq.sh --value {quantum}</span>
            <span className={`ml-1 w-2 h-4 bg-emerald-400 inline-block ${isBlinking ? 'opacity-100' : 'opacity-0'}`}></span>
          </div>

        </div>
      </div>
    </div>
  );
}