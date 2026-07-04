import React, { useState, useEffect, useMemo } from 'react';

export default function App() {
  const [timeQuantum, setTimeQuantum] = useState<number>(4);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Example workload to demonstrate the effect of the Time Quantum
  const WORKLOAD = useMemo(() => [
    { id: 'P1', burst: 12, color: 'bg-emerald-500' },
    { id: 'P2', burst: 6, color: 'bg-cyan-500' },
    { id: 'P3', burst: 9, color: 'bg-amber-500' },
    { id: 'P4', burst: 3, color: 'bg-fuchsia-500' }
  ], []);

  // Compute Round Robin Schedule based on current Time Quantum
  const schedule = useMemo(() => {
    const queue = WORKLOAD.map(p => ({ ...p, remaining: p.burst }));
    const blocks: { id: string; start: number; duration: number; color: string }[] = [];
    let currentTime = 0;
    let contextSwitches = 0;

    // Simulate Round Robin
    while (queue.length > 0) {
      const process = queue.shift()!;
      const runTime = Math.min(process.remaining, timeQuantum);
      
      blocks.push({
        id: process.id,
        start: currentTime,
        duration: runTime,
        color: process.color
      });

      currentTime += runTime;
      process.remaining -= runTime;

      if (process.remaining > 0) {
        queue.push(process);
        contextSwitches++;
      }
    }

    return { blocks, totalTime: currentTime, contextSwitches };
  }, [timeQuantum, WORKLOAD]);

  // Warning state calculations
  const overheadWarning = timeQuantum <= 2;
  const fcfsWarning = timeQuantum >= 10;

  // Handle visual flash effect when slider moves
  useEffect(() => {
    setIsSimulating(true);
    const timer = setTimeout(() => setIsSimulating(false), 300);
    return () => clearTimeout(timer);
  }, [timeQuantum]);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-green-500 font-mono p-4 md:p-8 flex items-center justify-center selection:bg-green-500 selection:text-black">
      <div className="max-w-4xl w-full border border-green-500/30 bg-[#0d1110] relative shadow-[0_0_30px_rgba(34,197,94,0.05)]">
        
        {/* Terminal Header */}
        <div className="border-b border-green-500/30 bg-green-500/10 p-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 animate-pulse rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
            <h1 className="text-sm tracking-widest uppercase font-bold text-green-400">
              CPU_Scheduler_Studio :: Round_Robin_Tuner
            </h1>
          </div>
          <div className="text-xs text-green-600">SYS.VER.9.0.4</div>
        </div>

        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column: TQ Control Panel */}
          <div className="flex flex-col gap-6">
            
            <div className="flex flex-col gap-2">
              <h2 className="text-xs uppercase tracking-widest text-green-600 border-b border-green-500/20 pb-1">
                Module 02 // Time Quantum Param
              </h2>
              <div className="text-5xl font-light text-green-400 py-2 flex items-baseline gap-2">
                {timeQuantum}
                <span className="text-lg text-green-600">ms</span>
              </div>
            </div>

            {/* Slider Interface */}
            <div className="bg-black/50 border border-green-500/20 p-5 relative group">
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-green-500" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-green-500" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-green-500" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-green-500" />

              <div className="flex justify-between text-xs text-green-700 mb-4">
                <span>1ms (High Response)</span>
                <span>20ms (High Throughput)</span>
              </div>

              <input
                type="range"
                min="1"
                max="20"
                value={timeQuantum}
                onChange={(e) => setTimeQuantum(Number(e.target.value))}
                className="w-full h-1 bg-green-900/50 rounded-lg appearance-none cursor-pointer accent-green-500 outline-none focus:shadow-[0_0_10px_rgba(34,197,94,0.5)] transition-all"
              />

              <div className="mt-6 flex justify-between gap-2">
                <button 
                  onClick={() => setTimeQuantum(Math.max(1, timeQuantum - 1))}
                  className="px-4 py-2 border border-green-500/40 text-green-500 hover:bg-green-500 hover:text-black transition-colors text-sm uppercase"
                >
                  [-1] Dec
                </button>
                <div className="flex gap-2">
                  <button onClick={() => setTimeQuantum(2)} className="px-3 py-2 text-xs border border-green-900 hover:border-green-500 transition-colors">MIN</button>
                  <button onClick={() => setTimeQuantum(4)} className="px-3 py-2 text-xs border border-green-900 hover:border-green-500 transition-colors">DEF</button>
                  <button onClick={() => setTimeQuantum(15)} className="px-3 py-2 text-xs border border-green-900 hover:border-green-500 transition-colors">MAX</button>
                </div>
                <button 
                  onClick={() => setTimeQuantum(Math.min(20, timeQuantum + 1))}
                  className="px-4 py-2 border border-green-500/40 text-green-500 hover:bg-green-500 hover:text-black transition-colors text-sm uppercase"
                >
                  Inc [+1]
                </button>
              </div>
            </div>

            {/* Warnings Badges */}
            <div className="flex flex-col gap-3 min-h-[80px]">
              {overheadWarning && (
                <div className="bg-red-950/40 border border-red-500 text-red-400 p-3 text-sm flex items-start gap-3 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                  <span className="text-red-500 animate-pulse font-bold">[!]</span>
                  <div>
                    <strong className="block uppercase text-xs mb-1">Starvation / Thrashing Warning</strong>
                    Low time quantum causes excessive context switches, drastically increasing CPU overhead.
                  </div>
                </div>
              )}
              {fcfsWarning && (
                <div className="bg-amber-950/40 border border-amber-500 text-amber-400 p-3 text-sm flex items-start gap-3 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                  <span className="text-amber-500 font-bold">[?]</span>
                  <div>
                    <strong className="block uppercase text-xs mb-1">FCFS Degradation Warning</strong>
                    Large time quantum reduces responsiveness. Behavior approaches First-Come-First-Serve (FCFS).
                  </div>
                </div>
              )}
              {!overheadWarning && !fcfsWarning && (
                <div className="bg-green-950/20 border border-green-500/30 text-green-500/80 p-3 text-sm flex items-start gap-3">
                  <span className="text-green-500 font-bold">[*]</span>
                  <div>
                    <strong className="block uppercase text-xs mb-1">Optimal Balance</strong>
                    Provides good interactivity without overwhelming the dispatcher.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Impact Visualizer */}
          <div className="flex flex-col gap-4 border-l border-green-500/20 pl-0 lg:pl-8">
            <h2 className="text-xs uppercase tracking-widest text-green-600 border-b border-green-500/20 pb-1">
              Live Preview // Context Switch Visualizer
            </h2>
            
            {/* Workload Definition Table */}
            <div className="grid grid-cols-4 gap-2 mb-2">
              {WORKLOAD.map(p => (
                <div key={p.id} className="text-center p-2 border border-green-900 bg-black/40 text-xs">
                  <div className="text-green-600 mb-1">{p.id}</div>
                  <div className="flex items-center justify-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${p.color}`} />
                    {p.burst}ms
                  </div>
                </div>
              ))}
            </div>

            {/* Impact Metrics */}
            <div className="flex justify-between bg-black/50 border border-green-500/20 p-4">
              <div className="flex flex-col">
                <span className="text-xs text-green-700 uppercase">Context Switches</span>
                <span className="text-2xl">{schedule.contextSwitches}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-xs text-green-700 uppercase">Total Blocks</span>
                <span className="text-2xl">{schedule.blocks.length}</span>
              </div>
            </div>

            {/* Gantt Chart Simulation */}
            <div className="mt-4 flex flex-col gap-2">
              <span className="text-xs text-green-700 uppercase">Generated Gantt Sequence</span>
              <div className={`relative h-16 w-full bg-black/80 border border-green-500/40 p-1 flex gap-[2px] overflow-hidden transition-opacity duration-150 ${isSimulating ? 'opacity-50 scale-[0.99]' : 'opacity-100 scale-100'}`}>
                {schedule.blocks.map((block, i) => (
                  <div 
                    key={`${block.id}-${i}`}
                    className={`${block.color} h-full flex items-center justify-center overflow-hidden relative group`}
                    style={{ flex: block.duration }}
                  >
                    {/* Scanline overlay for aesthetic */}
                    <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.2)_50%)] bg-[length:100%_4px] pointer-events-none" />
                    
                    <span className="text-black font-bold text-xs mix-blend-color-burn px-1">
                      {block.id}
                    </span>

                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-black border border-green-500 text-green-500 text-[10px] px-2 py-1 whitespace-nowrap z-10">
                      {block.id} : {block.duration}ms
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Timeline ticks */}
              <div className="flex justify-between text-[10px] text-green-700 mt-1">
                <span>0ms</span>
                <span>{schedule.totalTime}ms</span>
              </div>
            </div>

            {/* Terminal log output */}
            <div className="mt-auto h-24 bg-black border border-green-900 p-2 overflow-y-auto font-mono text-[10px] text-green-600/70">
              <div className="mb-1">{`> SYS_INIT: Queue loaded with 4 processes.`}</div>
              <div className="mb-1">{`> DISPATCHER: TQ configured to ${timeQuantum}ms.`}</div>
              {schedule.blocks.slice(0, 5).map((b, i) => (
                <div key={i}>{`> EXEC: [${b.id}] for ${b.duration}ms...`}</div>
              ))}
              {schedule.blocks.length > 5 && <div>{`> ... (${schedule.blocks.length - 5} more ops)`}</div>}
              <div className="text-green-400 mt-1">{`> DONE: Simulation complete.`}</div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}