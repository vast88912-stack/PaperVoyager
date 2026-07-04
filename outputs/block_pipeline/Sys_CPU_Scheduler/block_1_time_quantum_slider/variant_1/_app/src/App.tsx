import React, { useState, useEffect, useMemo } from 'react';

// --- Types ---
interface Job {
  id: string;
  duration: number;
  color: string;
}

interface ScheduleBlock {
  id: string;
  color: string;
  start: number;
  duration: number;
}

// --- Mock Data ---
const INITIAL_JOBS: Job[] = [
  { id: 'P0', duration: 12, color: 'bg-cyan-400' },
  { id: 'P1', duration: 5, color: 'bg-purple-400' },
  { id: 'P2', duration: 8, color: 'bg-amber-400' },
  { id: 'P3', duration: 3, color: 'bg-pink-400' },
];

export default function App() {
  const [quantum, setQuantum] = useState<number>(4);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const maxQuantum = 20;

  // --- Round Robin Simulation ---
  const { schedule, totalTime, contextSwitches } = useMemo(() => {
    const queue = INITIAL_JOBS.map(j => ({ ...j, remaining: j.duration }));
    const result: ScheduleBlock[] = [];
    let time = 0;
    let switches = 0;

    while (queue.length > 0) {
      const job = queue.shift()!;
      const slice = Math.min(job.remaining, quantum);
      
      result.push({
        id: job.id,
        color: job.color,
        start: time,
        duration: slice,
      });
      
      time += slice;
      job.remaining -= slice;
      
      if (job.remaining > 0) {
        queue.push(job);
        switches++;
      }
    }
    
    return { schedule: result, totalTime: time, contextSwitches: switches };
  }, [quantum]);

  // --- Handlers ---
  const handleBlockClick = (index: number) => {
    setQuantum(index + 1);
  };

  const handleMouseEnter = (index: number) => {
    if (isDragging) {
      setQuantum(index + 1);
    }
  };

  // --- Render Helpers ---
  const renderSliderBlocks = () => {
    const blocks = [];
    for (let i = 0; i < maxQuantum; i++) {
      const isActive = i < quantum;
      const isWarning = quantum > 15;
      const isDanger = quantum < 2;
      
      let activeColor = 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]';
      if (isWarning) activeColor = 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]';
      if (isDanger) activeColor = 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]';

      blocks.push(
        <div
          key={i}
          onMouseDown={() => {
            setIsDragging(true);
            handleBlockClick(i);
          }}
          onMouseEnter={() => handleMouseEnter(i)}
          className={`h-12 flex-1 cursor-pointer transition-all duration-75 border border-gray-900 ${
            isActive ? activeColor : 'bg-gray-800/50 hover:bg-gray-700'
          }`}
        />
      );
    }
    return blocks;
  };

  // Global mouse up to stop dragging
  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono p-6 selection:bg-green-900 selection:text-green-100 flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* CRT Scanline Overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-50 opacity-20" />

      <div className="w-full max-w-4xl border border-green-500/30 bg-gray-950/80 p-1 shadow-[0_0_30px_rgba(0,255,0,0.05)] relative z-10">
        
        {/* Terminal Header */}
        <div className="bg-green-500/10 border-b border-green-500/30 p-2 flex justify-between items-center text-xs tracking-widest">
          <span>root@scheduler-studio:~# ./config_tq.sh</span>
          <span className="animate-pulse">_</span>
        </div>

        <div className="p-8 space-y-12">
          
          {/* Header Section */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-[0.2em] text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">
              TIME QUANTUM OVERRIDE
            </h1>
            <p className="text-green-600 text-sm">
              ADJUST THE PREEMPTION SLICE FOR ROUND ROBIN EXECUTION
            </p>
          </div>

          {/* Slider Control Module */}
          <div className="bg-gray-900/50 border border-green-500/20 p-6 rounded-sm relative">
            <div className="absolute -top-3 left-4 bg-gray-950 px-2 text-xs text-green-600">
              [ TQ_SLIDER_CTRL ]
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-8">
              
              {/* Digital Display */}
              <div className="flex-shrink-0 bg-black border-2 border-green-800 p-4 rounded flex flex-col items-center justify-center min-w-[140px] shadow-[inset_0_0_20px_rgba(0,0,0,1)]">
                <span className="text-gray-500 text-[10px] mb-1">CURRENT_TQ</span>
                <div className="text-5xl font-bold text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)] tabular-nums">
                  {quantum.toString().padStart(2, '0')}
                  <span className="text-xl text-green-700 ml-1">ms</span>
                </div>
              </div>

              {/* Interactive Block Slider */}
              <div className="flex-grow w-full space-y-2">
                <div className="flex justify-between text-xs text-green-700 font-bold px-1">
                  <span>1ms (HIGH OVERHEAD)</span>
                  <span>20ms (FCFS DEGRADATION)</span>
                </div>
                
                <div className="flex w-full bg-black border border-gray-800 p-1 gap-[2px]">
                  {renderSliderBlocks()}
                </div>

                {/* Warning Badges */}
                <div className="h-6 flex items-center justify-center">
                  {quantum < 2 && (
                    <span className="text-red-400 text-xs animate-pulse bg-red-900/20 px-2 py-1 rounded border border-red-500/30">
                      ⚠ WARNING: EXTREME CONTEXT SWITCH OVERHEAD
                    </span>
                  )}
                  {quantum > 15 && (
                    <span className="text-amber-400 text-xs animate-pulse bg-amber-900/20 px-2 py-1 rounded border border-amber-500/30">
                      ⚠ WARNING: APPROACHING FCFS BEHAVIOR
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview / Gantt Chart */}
          <div className="bg-gray-900/50 border border-green-500/20 p-6 rounded-sm relative mt-8">
            <div className="absolute -top-3 left-4 bg-gray-950 px-2 text-xs text-green-600">
              [ LIVE_PREVIEW: ROUND_ROBIN ]
            </div>

            <div className="space-y-6">
              {/* Process Legend */}
              <div className="flex flex-wrap gap-4 text-xs">
                {INITIAL_JOBS.map(job => (
                  <div key={job.id} className="flex items-center gap-2">
                    <div className={`w-3 h-3 ${job.color} shadow-[0_0_5px_currentColor] opacity-80`} />
                    <span className="text-gray-400">{job.id} ({job.duration}ms)</span>
                  </div>
                ))}
              </div>

              {/* Gantt Track */}
              <div className="relative pt-6 pb-2">
                <div className="absolute top-0 left-0 w-full flex justify-between text-[10px] text-gray-600 border-b border-gray-800 pb-1">
                  <span>0ms</span>
                  <span>{totalTime}ms</span>
                </div>
                
                <div className="h-10 w-full bg-black border border-gray-800 flex relative overflow-hidden">
                  {schedule.map((block, idx) => {
                    const widthPercent = (block.duration / totalTime) * 100;
                    return (
                      <div
                        key={`${block.id}-${idx}`}
                        style={{ width: `${widthPercent}%` }}
                        className={`${block.color} h-full border-r border-black/50 flex items-center justify-center group relative transition-all duration-300 opacity-90 hover:opacity-100 hover:brightness-125`}
                      >
                        {/* Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-black border border-gray-600 text-white text-[10px] px-2 py-1 rounded pointer-events-none whitespace-nowrap z-20">
                          {block.id} : {block.duration}ms
                        </div>
                        {widthPercent > 3 && (
                          <span className="text-black font-bold text-xs mix-blend-screen opacity-60">
                            {block.id}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t border-green-900/30 pt-4">
                <div className="bg-black/50 p-3 border border-green-900/30 rounded">
                  <div className="text-gray-500 text-[10px] mb-1">TOTAL_TIME</div>
                  <div className="text-green-400">{totalTime} ms</div>
                </div>
                <div className="bg-black/50 p-3 border border-green-900/30 rounded">
                  <div className="text-gray-500 text-[10px] mb-1">CONTEXT_SWITCHES</div>
                  <div className={`font-bold ${contextSwitches > 10 ? 'text-red-400' : 'text-green-400'}`}>
                    {contextSwitches}
                  </div>
                </div>
                <div className="bg-black/50 p-3 border border-green-900/30 rounded">
                  <div className="text-gray-500 text-[10px] mb-1">AVG_SLICE_SIZE</div>
                  <div className="text-green-400">
                    {(totalTime / schedule.length).toFixed(1)} ms
                  </div>
                </div>
                <div className="bg-black/50 p-3 border border-green-900/30 rounded">
                  <div className="text-gray-500 text-[10px] mb-1">EFFICIENCY_RATING</div>
                  <div className="text-green-400">
                    {quantum < 2 ? 'POOR' : quantum > 15 ? 'FAIR' : 'OPTIMAL'}
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
        
        {/* Terminal Footer */}
        <div className="bg-green-500/10 border-t border-green-500/30 p-2 text-center text-[10px] text-green-700">
          SYS_STATUS: ONLINE | TQ_MODULE: ACTIVE | RENDER_ENGINE: REACT_DOM
        </div>
      </div>
    </div>
  );
}