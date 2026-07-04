import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  const [quantum, setQuantum] = useState<number>(4);
  const [logs, setLogs] = useState<string[]>([
    'INIT: CPU Scheduler Studio v1.0',
    'MODULE: Time Quantum Controller loaded.',
    'Awaiting configuration...',
  ]);
  
  const logEndRef = useRef<HTMLDivElement>(null);

  const handleQuantumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setQuantum(val);
    
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    let newLogs = [`[${timestamp}] > SET_QUANTUM --val=${val}ms`];
    
    if (val <= 2) {
      newLogs.push(`[${timestamp}]   [WARN] High context switch overhead.`);
    } else if (val >= 8) {
      newLogs.push(`[${timestamp}]   [WARN] RR behavior degrading to FCFS.`);
    } else {
      newLogs.push(`[${timestamp}]   [OK] Optimal balance configured.`);
    }
    
    setLogs(prev => [...prev, ...newLogs].slice(-15));
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Generate visual blocks for the quantum
  const maxQuantum = 10;
  const blocks = Array.from({ length: maxQuantum }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-gray-950 text-green-500 font-mono p-4 md:p-8 flex items-center justify-center selection:bg-green-900 selection:text-green-100">
      
      {/* Main Terminal Window */}
      <div className="w-full max-w-2xl border border-green-500/30 bg-gray-900/40 rounded-sm shadow-[0_0_30px_rgba(34,197,94,0.05)] overflow-hidden flex flex-col">
        
        {/* Terminal Header */}
        <div className="bg-green-500/10 border-b border-green-500/30 px-4 py-2 flex justify-between items-center">
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
          <span className="text-xs tracking-widest text-green-400/70 uppercase">root@scheduler-studio:~</span>
        </div>

        {/* Content Area */}
        <div className="p-6 md:p-8 flex flex-col gap-8">
          
          {/* Title & Status */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-green-500/20 pb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-green-400">TIME_QUANTUM_CTRL</h1>
              <p className="text-sm text-green-600 mt-1">Target: Round Robin (RR) / MLFQ</p>
            </div>
            <div className="flex items-center gap-3 bg-gray-950 px-4 py-2 border border-green-500/30 rounded-sm">
              <span className="text-xs text-green-600 uppercase">Current Slice</span>
              <span className="text-3xl font-bold text-green-300">{quantum}<span className="text-lg text-green-600">ms</span></span>
            </div>
          </div>

          {/* Interactive Slider Section */}
          <div className="flex flex-col gap-6">
            
            {/* Visualizer Blocks */}
            <div className="flex gap-1 h-8 w-full">
              {blocks.map((block) => (
                <div 
                  key={block}
                  className={`flex-1 border transition-all duration-200 ${
                    block <= quantum 
                      ? 'bg-green-500/20 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' 
                      : 'bg-gray-950 border-gray-800'
                  }`}
                />
              ))}
            </div>

            {/* Range Input */}
            <div className="relative w-full flex items-center group">
              <input
                type="range"
                min="1"
                max={maxQuantum}
                step="1"
                value={quantum}
                onChange={handleQuantumChange}
                className="w-full h-2 bg-gray-800 rounded-none appearance-none cursor-pointer accent-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                style={{
                  background: `linear-gradient(to right, rgba(34, 197, 94, 0.5) ${(quantum - 1) / (maxQuantum - 1) * 100}%, rgba(31, 41, 55, 1) ${(quantum - 1) / (maxQuantum - 1) * 100}%)`
                }}
              />
            </div>

            {/* Scale Labels */}
            <div className="flex justify-between text-xs text-green-700">
              <span>1ms (High Overhead)</span>
              <span>5ms</span>
              <span>10ms (FCFS-like)</span>
            </div>
          </div>

          {/* System Logs */}
          <div className="mt-4 border border-green-500/20 bg-gray-950 p-4 h-40 overflow-y-auto rounded-sm font-mono text-sm">
            {logs.map((log, index) => (
              <div 
                key={index} 
                className={`${log.includes('[WARN]') ? 'text-yellow-400' : log.includes('[OK]') ? 'text-green-300' : 'text-green-600'} mb-1`}
              >
                {log}
              </div>
            ))}
            <div ref={logEndRef} className="flex items-center text-green-500">
              <span>&gt;</span>
              <span className="w-2 h-4 bg-green-500 ml-2 animate-pulse"></span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}