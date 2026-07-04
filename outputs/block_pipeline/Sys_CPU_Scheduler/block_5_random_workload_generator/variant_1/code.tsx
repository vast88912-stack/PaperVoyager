import React, { useState, useEffect, useMemo } from 'react';
import { Terminal, RefreshCw, Download, Settings2, Activity, Cpu, AlertTriangle, Hash, Clock, Zap, AlignLeft } from 'lucide-react';

// --- Types ---
type WorkloadBias = 'balanced' | 'cpu-bound' | 'io-bound' | 'high-variance';

interface Job {
  id: string;
  arrival: number;
  burst: number;
  priority: number;
  type: 'CPU' | 'I/O' | 'Mixed';
}

interface GeneratorConfig {
  count: number;
  maxArrival: number;
  minBurst: number;
  maxBurst: number;
  priorityLevels: number;
  bias: WorkloadBias;
}

// --- Helper Functions ---
const generateId = (index: number) => `P${(index + 1).toString().padStart(3, '0')}`;

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateWorkload = (config: GeneratorConfig): Job[] => {
  const jobs: Job[] = [];
  
  for (let i = 0; i < config.count; i++) {
    const arrival = randomInt(0, config.maxArrival);
    let burst = 0;
    let type: Job['type'] = 'Mixed';

    switch (config.bias) {
      case 'cpu-bound':
        // Skew towards higher burst times
        burst = randomInt(Math.max(config.minBurst, Math.floor(config.maxBurst * 0.6)), config.maxBurst);
        type = 'CPU';
        break;
      case 'io-bound':
        // Skew towards lower burst times
        burst = randomInt(config.minBurst, Math.min(config.maxBurst, Math.floor(config.maxBurst * 0.3) || 1));
        type = 'I/O';
        break;
      case 'high-variance':
        // 80% very short, 20% very long
        if (Math.random() > 0.8) {
          burst = randomInt(Math.floor(config.maxBurst * 0.8), config.maxBurst);
          type = 'CPU';
        } else {
          burst = randomInt(config.minBurst, Math.max(config.minBurst + 2, Math.floor(config.maxBurst * 0.2)));
          type = 'I/O';
        }
        break;
      case 'balanced':
      default:
        burst = randomInt(config.minBurst, config.maxBurst);
        type = burst > (config.maxBurst / 2) ? 'CPU' : 'I/O';
        break;
    }

    const priority = randomInt(1, config.priorityLevels);

    jobs.push({
      id: generateId(i),
      arrival,
      burst,
      priority,
      type
    });
  }

  // Sort by arrival time
  return jobs.sort((a, b) => a.arrival - b.arrival || a.id.localeCompare(b.id));
};

// --- Main Component ---
export default function App() {
  const [config, setConfig] = useState<GeneratorConfig>({
    count: 15,
    maxArrival: 50,
    minBurst: 1,
    maxBurst: 20,
    priorityLevels: 5,
    bias: 'high-variance',
  });

  const [jobs, setJobs] = useState<Job[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = () => {
    setIsGenerating(true);
    // Simulate slight delay for terminal effect
    setTimeout(() => {
      setJobs(generateWorkload(config));
      setIsGenerating(false);
    }, 300);
  };

  const handleConfigChange = (key: keyof GeneratorConfig, value: number | string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jobs, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "workload.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // Metrics Calculations
  const metrics = useMemo(() => {
    if (!jobs.length) return null;
    const totalBurst = jobs.reduce((acc, job) => acc + job.burst, 0);
    const avgBurst = (totalBurst / jobs.length).toFixed(1);
    const maxBurstJob = Math.max(...jobs.map(j => j.burst));
    const minBurstJob = Math.min(...jobs.map(j => j.burst));
    
    // Starvation risk heuristic: High variance in burst times + presence of long jobs
    const variance = jobs.reduce((acc, job) => acc + Math.pow(job.burst - Number(avgBurst), 2), 0) / jobs.length;
    const starvationRisk = variance > 20 && config.bias === 'high-variance' ? 'HIGH' : variance > 10 ? 'MEDIUM' : 'LOW';

    return { totalBurst, avgBurst, maxBurstJob, minBurstJob, starvationRisk };
  }, [jobs, config.bias]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-green-500 font-mono p-4 md:p-8 selection:bg-green-900 selection:text-green-100 flex flex-col">
      
      {/* Header */}
      <header className="flex items-center justify-between border-b border-green-500/30 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <Terminal className="w-8 h-8 text-green-400" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-wider uppercase drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]">
              Sys_Gen::Workload
            </h1>
            <p className="text-xs text-green-600 uppercase tracking-widest">Random Workload Generator v2.0</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs border border-green-500/20 px-3 py-1 bg-green-950/20 rounded">
          <Activity className="w-4 h-4 text-green-600 animate-pulse" />
          <span className="text-green-600">SYSTEM ONLINE</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        
        {/* Left Panel: Configuration */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
          <div className="border border-green-500/30 bg-[#0f1411] p-5 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500/0 via-green-500/50 to-green-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="flex items-center gap-2 mb-6 border-b border-green-500/20 pb-2">
              <Settings2 className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-semibold uppercase tracking-wide">Parameters</h2>
            </div>

            <div className="space-y-5">
              {/* Process Count */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <label className="uppercase text-green-600 flex items-center gap-1"><Hash className="w-3 h-3"/> Process Count</label>
                  <span className="text-green-300">[{config.count}]</span>
                </div>
                <input 
                  type="range" 
                  min="5" max="50" 
                  value={config.count}
                  onChange={(e) => handleConfigChange('count', parseInt(e.target.value))}
                  className="w-full accent-green-500 h-1 bg-green-950 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Max Arrival Time */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <label className="uppercase text-green-600 flex items-center gap-1"><Clock className="w-3 h-3"/> Max Arrival Time</label>
                  <span className="text-green-300">[{config.maxArrival}ms]</span>
                </div>
                <input 
                  type="range" 
                  min="10" max="200" step="10"
                  value={config.maxArrival}
                  onChange={(e) => handleConfigChange('maxArrival', parseInt(e.target.value))}
                  className="w-full accent-green-500 h-1 bg-green-950 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Burst Time Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <label className="uppercase text-green-600">Min Burst</label>
                  </div>
                  <input 
                    type="number" 
                    min="1" max={config.maxBurst - 1}
                    value={config.minBurst}
                    onChange={(e) => handleConfigChange('minBurst', parseInt(e.target.value))}
                    className="w-full bg-black border border-green-500/30 text-green-400 p-1.5 text-sm focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400/50"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <label className="uppercase text-green-600">Max Burst</label>
                  </div>
                  <input 
                    type="number" 
                    min={config.minBurst + 1} max="100"
                    value={config.maxBurst}
                    onChange={(e) => handleConfigChange('maxBurst', parseInt(e.target.value))}
                    className="w-full bg-black border border-green-500/30 text-green-400 p-1.5 text-sm focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400/50"
                  />
                </div>
              </div>

              {/* Priority Levels */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <label className="uppercase text-green-600 flex items-center gap-1"><AlignLeft className="w-3 h-3"/> Priority Levels</label>
                  <span className="text-green-300">[{config.priorityLevels}]</span>
                </div>
                <input 
                  type="range" 
                  min="1" max="10" 
                  value={config.priorityLevels}
                  onChange={(e) => handleConfigChange('priorityLevels', parseInt(e.target.value))}
                  className="w-full accent-green-500 h-1 bg-green-950 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Workload Bias */}
              <div>
                <label className="uppercase text-green-600 text-sm mb-2 block">Workload Bias</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(['balanced', 'cpu-bound', 'io-bound', 'high-variance'] as WorkloadBias[]).map((bias) => (
                    <button
                      key={bias}
                      onClick={() => handleConfigChange('bias', bias)}
                      className={`py-2 px-1 border uppercase tracking-wider transition-colors ${
                        config.bias === bias 
                          ? 'bg-green-500/20 border-green-400 text-green-300' 
                          : 'bg-black border-green-500/20 text-green-600 hover:border-green-500/50'
                      }`}
                    >
                      {bias.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex gap-3">
              <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex-1 bg-green-600 hover:bg-green-500 text-black font-bold uppercase py-2.5 px-4 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Generating...' : 'Generate'}
              </button>
              <button 
                onClick={exportJSON}
                className="bg-black border border-green-600 hover:bg-green-900/30 text-green-500 py-2.5 px-4 flex items-center justify-center transition-all active:scale-95"
                title="Export to JSON"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Metrics / Diagnostics Panel */}
          {metrics && (
            <div className="border border-green-500/30 bg-[#0f1411] p-5">
              <div className="flex items-center gap-2 mb-4 border-b border-green-500/20 pb-2">
                <Activity className="w-5 h-5 text-green-400" />
                <h2 className="text-lg font-semibold uppercase tracking-wide">Diagnostics</h2>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-green-500/10 pb-1">
                  <span className="text-green-600">Total Burst Load:</span>
                  <span className="text-green-300">{metrics.totalBurst} ms</span>
                </div>
                <div className="flex justify-between border-b border-green-500/10 pb-1">
                  <span className="text-green-600">Avg Burst Time:</span>
                  <span className="text-green-300">{metrics.avgBurst} ms</span>
                </div>
                <div className="flex justify-between border-b border-green-500/10 pb-1">
                  <span className="text-green-600">Burst Range:</span>
                  <span className="text-green-300">{metrics.minBurstJob} - {metrics.maxBurstJob} ms</span>
                </div>
                
                {/* Starvation Warning Badge */}
                <div className="mt-4 pt-2">
                  <span className="text-green-600 block mb-1 uppercase text-xs">SJF/SRTF Starvation Risk:</span>
                  <div className={`flex items-center gap-2 px-3 py-2 border ${
                    metrics.starvationRisk === 'HIGH' ? 'bg-red-950/40 border-red-500/50 text-red-400' :
                    metrics.starvationRisk === 'MEDIUM' ? 'bg-yellow-950/40 border-yellow-500/50 text-yellow-400' :
                    'bg-green-950/40 border-green-500/50 text-green-400'
                  }`}>
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-bold tracking-wider">{metrics.starvationRisk}</span>
                  </div>
                  {metrics.starvationRisk === 'HIGH' && (
                    <p className="text-[10px] text-red-500/70 mt-1 leading-tight">
                      High variance detected. Short jobs will heavily preempt long jobs in SRTF.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Right Panel: Data Output & Visualization */}
        <main className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Visualizer */}
          <div className="border border-green-500/30 bg-[#0f1411] p-5 h-64 flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-green-500/20 pb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-400" />
                <h2 className="text-lg font-semibold uppercase tracking-wide">Workload Profile Map</h2>
              </div>
              <span className="text-xs text-green-600">X: Arrival | Y: Burst Size</span>
            </div>
            
            <div className="flex-1 relative border-l border-b border-green-500/30 bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.05)_0,transparent_100%)]">
              {/* Grid lines */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
              
              {/* Data points */}
              {jobs.map((job) => {
                const leftPos = (job.arrival / Math.max(config.maxArrival, 1)) * 95; // %
                const heightPos = (job.burst / Math.max(config.maxBurst, 1)) * 90; // %
                
                return (
                  <div 
                    key={`viz-${job.id}`}
                    className="absolute bottom-0 w-2 bg-green-500/50 border border-green-400 hover:bg-green-300 transition-all cursor-crosshair group"
                    style={{ 
                      left: `${leftPos}%`, 
                      height: `${heightPos}%`,
                      minHeight: '4px'
                    }}
                  >
                    {/* Tooltip */}
                    <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black border border-green-500 text-green-400 text-[10px] p-1.5 whitespace-nowrap z-10">
                      {job.id} | Arr: {job.arrival} | Brst: {job.burst}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Data Table */}
          <div className="border border-green-500/30 bg-[#0f1411] flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-green-500/30 bg-green-950/10">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-green-400" />
                <h2 className="text-lg font-semibold uppercase tracking-wide">Process Table</h2>
              </div>
              <span className="text-xs text-green-600">{jobs.length} RECORDS GENERATED</span>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-green-600 uppercase bg-green-950/20 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 border-b border-green-500/30">PID</th>
                    <th className="px-4 py-3 border-b border-green-500/30">Arrival Time</th>
                    <th className="px-4 py-3 border-b border-green-500/30">Burst Time</th>
                    <th className="px-4 py-3 border-b border-green-500/30">Priority</th>
                    <th className="px-4 py-3 border-b border-green-500/30">Profile</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job, idx) => (
                    <tr 
                      key={job.id} 
                      className={`border-b border-green-500/10 hover:bg-green-900/20 transition-colors ${idx % 2 === 0 ? 'bg-transparent' : 'bg-green-950/5'}`}
                    >
                      <td className="px-4 py-2.5 font-bold text-green-400">{job.id}</td>
                      <td className="px-4 py-2.5 text-green-300">{job.arrival}</td>
                      <td className="px-4 py-2.5 text-green-300">{job.burst}</td>
                      <td className="px-4 py-2.5 text-green-300">{job.priority}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-sm uppercase tracking-wider border ${
                          job.type === 'CPU' ? 'border-purple-500/50 text-purple-400 bg-purple-950/30' :
                          job.type === 'I/O' ? 'border-cyan-500/50 text-cyan-400 bg-cyan-950/30' :
                          'border-gray-500/50 text-gray-400 bg-gray-950/30'
                        }`}>
                          {job.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {jobs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-green-600/50 uppercase">
                        No workload generated. Initialize sequence.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Global Styles for Scrollbar to match terminal theme */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-left: 1px solid rgba(34, 197, 94, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(34, 197, 94, 0.3);
          border: 1px solid rgba(34, 197, 94, 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(34, 197, 94, 0.5);
        }
      `}} />
    </div>
  );
}