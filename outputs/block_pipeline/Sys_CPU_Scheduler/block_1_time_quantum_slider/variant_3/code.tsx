import React, { useState } from 'react';

export default function App() {
  const [quantum, setQuantum] = useState(4);
  const MIN_Q = 1;
  const MAX_Q = 20;

  // Calculate implications for the diagnostics panel
  const overheadAlert = quantum <= 2 ? "HIGH CONTEXT SWITCH OVERHEAD" : null;
  const fcfsAlert = quantum >= 15 ? "APPROACHING FCFS BEHAVIOR" : null;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuantum(Number(e.target.value));
  };

  const adjustQuantum = (delta: number) => {
    setQuantum(prev => Math.min(Math.max(prev + delta, MIN_Q), MAX_Q));
  };

  return (
    <div className="min-h-screen bg-[#050505] font-mono text-green-500 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-green-900 selection:text-green-100">
       
       {/* Main Terminal Window Container */}
       <div className="w-full max-w-4xl border border-green-800 bg-[#0a0a0a] rounded-sm relative overflow-hidden shadow-[0_0_40px_rgba(0,255,0,0.08)]">
          
          {/* CRT Scanline Overlay */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-50 opacity-20"></div>

          {/* Window Header */}
          <div className="border-b border-green-900 bg-[#111] p-2 px-4 flex justify-between items-center text-xs text-green-700 select-none">
             <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-none bg-green-500 animate-pulse"></span>
                <span>root@cpu-scheduler:~# ./modules/time_quantum_slider.sh</span>
             </div>
             <span className="flex space-x-2">
                <span className="w-3 h-3 rounded-sm bg-green-900/50 border border-green-900"></span>
                <span className="w-3 h-3 rounded-sm bg-amber-900/50 border border-amber-900"></span>
                <span className="w-3 h-3 rounded-sm bg-red-900/50 border border-red-900"></span>
             </span>
          </div>

          {/* Module Content */}
          <div className="p-6 sm:p-10 flex flex-col gap-8 relative z-10">

             {/* Title & Metadata */}
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-green-900/50 pb-4 gap-4">
                <div>
                   <h1 className="text-3xl font-bold tracking-[0.2em] text-green-400 drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]">
                      QUANTUM_CTRL
                   </h1>
                   <p className="text-green-700 text-sm mt-2 tracking-wide">
                      Configure maximum continuous execution time for Round Robin & MLFQ.
                   </p>
                </div>
                <div className="text-left sm:text-right bg-green-950/30 p-2 border border-green-900/50">
                   <div className="text-xs text-green-600 tracking-widest">VARIABLE_REF</div>
                   <div className="text-lg text-green-400 font-bold">q_value</div>
                </div>
             </div>

             {/* Interactive Control Area */}
             <div className="bg-[#0f0f0f] border border-green-900/70 p-6 flex flex-col md:flex-row gap-8 items-center relative overflow-hidden">
                
                {/* Subtle background grid pattern */}
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#22c55e 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                {/* Left: Digital Value Display */}
                <div className="flex flex-col items-center justify-center bg-black border-2 border-green-800 w-56 h-56 shrink-0 relative shadow-[inset_0_0_30px_rgba(0,255,0,0.05)] z-10">
                   <div className="absolute top-0 left-0 w-full h-1 bg-green-500/20"></div>
                   <span className="absolute top-3 left-3 text-[10px] text-green-800 tracking-widest">CURRENT_Q</span>
                   
                   <span className="text-8xl font-bold text-green-400 tracking-tighter drop-shadow-[0_0_15px_rgba(34,197,94,0.6)] tabular-nums">
                      {quantum}
                   </span>
                   
                   <span className="absolute bottom-3 right-3 text-[10px] text-green-800 tracking-widest">MS / CYCLES</span>
                   
                   {/* Decorative corner brackets */}
                   <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-green-500/50"></div>
                   <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-green-500/50"></div>
                   <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-green-500/50"></div>
                   <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-green-500/50"></div>
                </div>

                {/* Right: Slider & Visualizer Area */}
                <div className="flex-1 flex flex-col gap-8 w-full z-10">

                   {/* Allocation Visualizer (The "Blocks") */}
                   <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-[10px] text-green-600 tracking-widest uppercase">
                         <span>Allocated Burst</span>
                         <span>Capacity: {MAX_Q}</span>
                      </div>
                      <div className="flex flex-wrap gap-[2px] p-1 bg-black/50 border border-green-900/50">
                         {Array.from({ length: MAX_Q }).map((_, i) => (
                            <div
                               key={i}
                               onClick={() => setQuantum(i + 1)}
                               className={`h-8 flex-1 min-w-[14px] cursor-pointer transition-all duration-150 ${
                                  i < quantum
                                     ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)] border-y border-x border-green-300'
                                     : 'bg-[#0a0a0a] border border-green-900/40 hover:bg-green-900/30'
                               }`}
                            />
                         ))}
                      </div>
                   </div>

                   {/* Continuous Slider Control */}
                   <div className="flex flex-col gap-4">
                      <div className="relative flex items-center">
                         {/* Custom track styling using pseudo-elements relies on CSS files, so we use a standard input with strong Tailwind accents */}
                         <input
                            type="range"
                            min={MIN_Q}
                            max={MAX_Q}
                            value={quantum}
                            onChange={handleSliderChange}
                            className="w-full h-1 bg-green-950 appearance-none cursor-pointer accent-green-400 outline-none focus:shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:bg-green-900 transition-colors"
                         />
                      </div>
                      
                      {/* Fine-tuning Controls */}
                      <div className="flex justify-between items-center">
                         <div className="flex gap-2 text-xs">
                            <button 
                              onClick={() => setQuantum(MIN_Q)} 
                              className="px-2 py-1 text-green-700 hover:text-green-300 hover:bg-green-900/20 border border-transparent hover:border-green-800 transition-all"
                            >
                              [ MIN ]
                            </button>
                            <button 
                              onClick={() => setQuantum(MAX_Q)} 
                              className="px-2 py-1 text-green-700 hover:text-green-300 hover:bg-green-900/20 border border-transparent hover:border-green-800 transition-all"
                            >
                              [ MAX ]
                            </button>
                         </div>
                         <div className="flex gap-1">
                            <button 
                              onClick={() => adjustQuantum(-1)} 
                              disabled={quantum <= MIN_Q} 
                              className="px-4 py-1.5 border border-green-800 bg-black hover:bg-green-900 hover:text-white disabled:opacity-30 disabled:hover:bg-black transition-all text-xs tracking-widest"
                            >
                              DEC -
                            </button>
                            <button 
                              onClick={() => adjustQuantum(1)} 
                              disabled={quantum >= MAX_Q} 
                              className="px-4 py-1.5 border border-green-800 bg-black hover:bg-green-900 hover:text-white disabled:opacity-30 disabled:hover:bg-black transition-all text-xs tracking-widest"
                            >
                              INC +
                            </button>
                         </div>
                      </div>
                   </div>

                </div>
             </div>

             {/* System Diagnostics Feed */}
             <div className="min-h-[64px] border border-green-900/70 bg-[#080808] p-4 flex flex-col sm:flex-row sm:items-center gap-3 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-800"></div>
                <span className="text-green-600 text-xs tracking-widest uppercase ml-2 shrink-0">
                   > Sys_Diag:
                </span>
                
                <div className="flex-1 font-mono text-sm">
                   {overheadAlert && (
                      <span className="text-amber-400 flex items-center gap-2">
                         <span className="w-2 h-2 bg-amber-400 animate-ping inline-block rounded-full"></span>
                         WARN: {overheadAlert}. Throughput may degrade.
                      </span>
                   )}
                   {fcfsAlert && (
                      <span className="text-blue-400 flex items-center gap-2">
                         <span className="w-2 h-2 bg-blue-400 animate-pulse inline-block"></span>
                         NOTICE: {fcfsAlert}. Response times for short jobs may increase.
                      </span>
                   )}
                   {!overheadAlert && !fcfsAlert && (
                      <span className="text-green-500 opacity-80">
                         STATUS OPTIMAL. Balanced context switching and response time.
                      </span>
                   )}
                </div>
             </div>

          </div>
       </div>
    </div>
  );
}