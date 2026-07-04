import React, { useState, useEffect, useRef } from 'react';

// --- TYPES ---
interface ProcessJob {
  id: number;
  arrival: number;
  burst: number;
  priority: number;
  isStarvationRisk: boolean;
  type: 'CPU_BOUND' | 'IO_BOUND' | 'BALANCED';
}

interface GeneratorConfig {
  numJobs: number;
  maxArrival: number;
  minBurst: number;
  maxBurst: number;
  minPriority: number;
  maxPriority: number;
  workloadBias: 'RANDOM' | 'CPU_HEAVY' | 'IO_HEAVY';
}

export default function RandomWorkloadGenerator() {
  // --- STATE ---
  const [config, setConfig] = useState<GeneratorConfig>({
    numJobs: 8,
    maxArrival: 25,
    minBurst: 1,
    maxBurst: 15,
    minPriority: 1,
    maxPriority: 5,
    workloadBias: 'RANDOM',
  });

  const [jobs, setJobs] = useState<ProcessJob[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [glitchText, setGlitchText] = useState<string>('');
  
  const scanlineRef = useRef<HTMLDivElement>(null);

  // --- LOGIC ---
  const generateHash = () => Math.random().toString(36).substring(2, 10).toUpperCase();

  const generateWorkload = () => {
    setIsGenerating(true);
    
    // Simulate calculation time with a glitch effect
    let iterations = 0;
    const interval = setInterval(() => {
      setGlitchText(`0x${generateHash()} ${generateHash()}`);
      iterations++;
      if (iterations > 10) {
        clearInterval(interval);
        finalizeGeneration();
        setIsGenerating(false);
      }
    }, 40);
  };

  const finalizeGeneration = () => {
    const newJobs: ProcessJob[] = [];
    const { numJobs, maxArrival, minBurst, maxBurst, minPriority, maxPriority, workloadBias } = config;

    for (let i = 1; i <= numJobs; i++) {
      // Arrival: Random between 0 and maxArrival
      const arrival = Math.floor(Math.random() * (maxArrival + 1));
      
      // Burst: Apply bias
      let burst = Math.floor(Math.random() * (maxBurst - minBurst + 1)) + minBurst;
      if (workloadBias === 'CPU_HEAVY' && Math.random() > 0.3) {
        burst = Math.floor(maxBurst * (0.6 + Math.random() * 0.4)); // Skew high
      } else if (workloadBias === 'IO_HEAVY' && Math.random() > 0.3) {
        burst = Math.floor(minBurst + (maxBurst - minBurst) * Math.random() * 0.4); // Skew low
      }

      // Priority: 1 is highest, maxPriority is lowest
      const priority = Math.floor(Math.random() * (maxPriority - minPriority + 1)) + minPriority;

      // Determine type
      let type: 'CPU_BOUND' | 'IO_BOUND' | 'BALANCED' = 'BALANCED';
      const burstRatio = burst / maxBurst;
      if (burstRatio > 0.7) type = 'CPU_BOUND';
      else if (burstRatio < 0.3) type = 'IO_BOUND';

      // Starvation Risk: High burst or low priority (high number)
      // In SJF, high burst starves. In Priority, low priority starves.
      const isStarvationRisk = burstRatio > 0.75 || priority === maxPriority;

      newJobs.push({
        id: i,
        arrival,
        burst: Math.max(1, burst),
        priority,
        isStarvationRisk,
        type,
      });
    }

    // Sort naturally by arrival time
    newJobs.sort((a, b) => a.arrival - b.arrival);
    setJobs(newJobs);
  };

  const handleConfigChange = (key: keyof GeneratorConfig, value: number | string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // Initial load
  useEffect(() => {
    generateWorkload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- DERIVED METRICS ---
  const totalBurst = jobs.reduce((acc, job) => acc + job.burst, 0);
  const avgBurst = jobs.length > 0 ? (totalBurst / jobs.length).toFixed(1) : '0';
  const starvationCount = jobs.filter(j => j.isStarvationRisk).length;
  const maxTimeline = Math.max(...jobs.map(j => j.arrival + j.burst), 1);

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono p-4 md:p-8 relative overflow-hidden flex justify-center">
      
      {/* CRT Styles */}
      <style>{`
        .scanlines {
          background: linear-gradient(
            to bottom,
            rgba(255,255,255,0),
            rgba(255,255,255,0) 50%,
            rgba(0,0,0,0.2) 50%,
            rgba(0,0,0,0.2)
          );
          background-size: 100% 4px;
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none;
          z-index: 50;
        }
        .flicker {
          animation: crt-flicker 0.15s infinite;
        }
        @keyframes crt-flicker {
          0% { opacity: 0.98; }
          50% { opacity: 1; }
          100% { opacity: 0.99; }
        }
        .terminal-shadow {
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.1) inset, 0 0 10px rgba(34, 197, 94, 0.2);
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `}</style>

      <div className="scanlines" ref={scanlineRef}></div>

      <div className="max-w-6xl w-full z-10 flex flex-col gap-6 flicker">
        
        {/* HEADER */}
        <header className="border-b-2 border-green-800 pb-4 flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-[0.2em] text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]">
              SYS_SCHED // WORKLOAD_GEN
            </h1>
            <p className="text-sm text-green-700 mt-1 uppercase tracking-widest">
              Random CPU Job Generator Array &gt;&gt; Module 6
            </p>
          </div>
          <div className="text-right text-xs text-green-600 bg-green-950/30 px-3 py-1 border border-green-900">
            <div>STATUS: {isGenerating ? 'CALCULATING...' : 'IDLE'}</div>
            <div>UPTIME: {Math.floor(performance.now() / 1000)}s</div>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT PANEL: CONFIG */}
          <section className="lg:col-span-4 bg-black border border-green-800 p-6 terminal-shadow relative">
            <div className="absolute top-0 left-0 px-2 py-0.5 bg-green-800 text-black text-xs font-bold tracking-widest uppercase">
              Parameters
            </div>
            
            <div className="mt-4 flex flex-col gap-5">
              
              <div className="flex justify-between items-end border-b border-green-900 border-dashed pb-1">
                <label className="text-green-600 text-sm">PROCESS_COUNT</label>
                <input 
                  type="number" 
                  min={1} max={50}
                  className="bg-transparent text-right text-green-400 w-16 outline-none font-bold"
                  value={config.numJobs}
                  onChange={(e) => handleConfigChange('numJobs', parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="flex justify-between items-end border-b border-green-900 border-dashed pb-1">
                <label className="text-green-600 text-sm">MAX_ARRIVAL_TIME</label>
                <input 
                  type="number" 
                  min={0} max={100}
                  className="bg-transparent text-right text-green-400 w-16 outline-none font-bold"
                  value={config.maxArrival}
                  onChange={(e) => handleConfigChange('maxArrival', parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="flex justify-between items-end border-b border-green-900 border-dashed pb-1">
                <label className="text-green-600 text-sm">MIN_BURST</label>
                <input 
                  type="number" 
                  min={1} max={config.maxBurst}
                  className="bg-transparent text-right text-green-400 w-16 outline-none font-bold"
                  value={config.minBurst}
                  onChange={(e) => handleConfigChange('minBurst', parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="flex justify-between items-end border-b border-green-900 border-dashed pb-1">
                <label className="text-green-600 text-sm">MAX_BURST</label>
                <input 
                  type="number" 
                  min={config.minBurst} max={100}
                  className="bg-transparent text-right text-green-400 w-16 outline-none font-bold"
                  value={config.maxBurst}
                  onChange={(e) => handleConfigChange('maxBurst', parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="flex justify-between items-end border-b border-green-900 border-dashed pb-1">
                <label className="text-green-600 text-sm">PRIORITY_RANGE</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    min={1} max={config.maxPriority}
                    className="bg-transparent text-right text-green-400 w-8 outline-none font-bold"
                    value={config.minPriority}
                    onChange={(e) => handleConfigChange('minPriority', parseInt(e.target.value) || 1)}
                  />
                  <span className="text-green-800">-</span>
                  <input 
                    type="number" 
                    min={config.minPriority} max={99}
                    className="bg-transparent text-right text-green-400 w-8 outline-none font-bold"
                    value={config.maxPriority}
                    onChange={(e) => handleConfigChange('maxPriority', parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <label className="text-green-600 text-sm">WORKLOAD_BIAS</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['RANDOM', 'CPU_HEAVY', 'IO_HEAVY'] as const).map(bias => (
                    <button
                      key={bias}
                      onClick={() => handleConfigChange('workloadBias', bias)}
                      className={`text-xs py-1 border ${
                        config.workloadBias === bias 
                          ? 'bg-green-800 text-black border-green-500' 
                          : 'border-green-900 text-green-700 hover:border-green-600'
                      } transition-colors uppercase`}
                    >
                      {bias.split('_')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={generateWorkload}
                disabled={isGenerating}
                className="mt-6 w-full bg-green-950/50 border border-green-500 hover:bg-green-900 text-green-400 font-bold py-3 uppercase tracking-[0.2em] transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isGenerating ? (
                  <span className="animate-pulse">GENERATING...</span>
                ) : (
                  <>
                    <span>EXECUTE_GEN</span>
                    <span className="text-green-600">»</span>
                  </>
                )}
              </button>

            </div>

            {/* METRICS PANEL inside left col */}
            <div className="mt-8 pt-6 border-t border-green-900">
              <h3 className="text-green-700 text-xs mb-3 uppercase tracking-widest">// Workload_Signatures</h3>
              <ul className="text-sm space-y-2">
                <li className="flex justify-between"><span className="text-green-600">TOTAL_BURST</span> <span>{totalBurst} ms</span></li>
                <li className="flex justify-between"><span className="text-green-600">AVG_BURST</span> <span>{avgBurst} ms</span></li>
                <li className="flex justify-between items-center">
                  <span className="text-green-600">STARVATION_RISK</span> 
                  {starvationCount > 0 ? (
                    <span className="bg-red-900/50 text-red-400 px-2 py-0.5 text-xs border border-red-800 animate-pulse">
                      {starvationCount} DETECTED
                    </span>
                  ) : (
                    <span className="text-green-500">NONE</span>
                  )}
                </li>
              </ul>
            </div>
          </section>

          {/* RIGHT PANEL: OUTPUT & VISUALIZATION */}
          <section className="lg:col-span-8 flex flex-col gap-6">
            
            {/* DATA TABLE */}
            <div className="bg-black border border-green-800 p-1 terminal-shadow relative overflow-hidden flex-1">
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="text-xs text-green-700 bg-green-950/40 sticky top-0 z-10 border-b border-green-900">
                    <tr>
                      <th className="px-4 py-3 font-normal">PID</th>
                      <th className="px-4 py-3 font-normal">ARRIVAL</th>
                      <th className="px-4 py-3 font-normal">BURST</th>
                      <th className="px-4 py-3 font-normal">PRIORITY</th>
                      <th className="px-4 py-3 font-normal">PROFILE</th>
                      <th className="px-4 py-3 font-normal">FLAGS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isGenerating ? (
                      // Glitch rows during generation
                      Array.from({ length: config.numJobs }).map((_, i) => (
                        <tr key={i} className="border-b border-green-900/30">
                          <td className="px-4 py-2 text-green-800">P_--</td>
                          <td colSpan={5} className="px-4 py-2 text-green-700 opacity-50 font-mono tracking-widest">
                            {glitchText}
                          </td>
                        </tr>
                      ))
                    ) : (
                      jobs.map((job) => (
                        <tr key={job.id} className="border-b border-green-900/30 hover:bg-green-950/30 transition-colors">
                          <td className="px-4 py-2 font-bold text-green-300">P_{job.id.toString().padStart(2, '0')}</td>
                          <td className="px-4 py-2">{job.arrival}</td>
                          <td className="px-4 py-2">{job.burst}</td>
                          <td className="px-4 py-2">{job.priority}</td>
                          <td className="px-4 py-2 text-xs">
                            <span className={
                              job.type === 'CPU_BOUND' ? 'text-orange-400' :
                              job.type === 'IO_BOUND' ? 'text-blue-400' : 'text-green-600'
                            }>
                              [{job.type.replace('_BOUND', '')}]
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            {job.isStarvationRisk ? (
                              <span className="text-xs bg-red-950 text-red-400 px-1 border border-red-800">
                                !STARVATION_RISK
                              </span>
                            ) : (
                              <span className="text-green-800">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TIMELINE VISUALIZATION */}
            <div className="bg-black border border-green-800 p-4 terminal-shadow relative h-64 flex flex-col">
              <div className="absolute top-0 right-0 px-2 py-0.5 bg-green-900/50 text-green-500 border-b border-l border-green-800 text-[10px] tracking-widest uppercase">
                Workload_Distribution_Map
              </div>
              
              <div className="flex-1 mt-4 overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar">
                {isGenerating ? (
                   <div className="w-full h-full flex items-center justify-center text-green-800 animate-pulse">
                     ANALYZING SPATIAL DISTRIBUTION...
                   </div>
                ) : (
                  <div className="flex flex-col gap-1.5 w-full relative">
                    {/* Time markers axis */}
                    <div className="h-4 flex text-[10px] text-green-700 mb-2 relative border-b border-green-900/50 pb-1">