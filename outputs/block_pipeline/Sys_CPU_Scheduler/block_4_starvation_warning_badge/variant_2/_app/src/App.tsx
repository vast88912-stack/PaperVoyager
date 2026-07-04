import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Cpu, 
  Activity, 
  TerminalSquare, 
  ArrowUpCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';

// --- Types & Interfaces ---
interface Process {
  pid: string;
  burstTime: number;
  remainingTime: number;
  waitTime: number;
  priorityBoosted: boolean;
}

type SeverityLevel = 'OK' | 'WARNING' | 'CRITICAL';

// --- Constants ---
const STARVATION_WARNING_THRESHOLD = 20;
const STARVATION_CRITICAL_THRESHOLD = 45;

export default function App() {
  // --- State ---
  const [processes, setProcesses] = useState<Process[]>([]);
  const [cpuClock, setCpuClock] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [badgeExpanded, setBadgeExpanded] = useState(false);
  const [systemLog, setSystemLog] = useState<string[]>(['[SYS] CPU Scheduler Studio initialized.']);

  // --- Refs for Simulation ---
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Derived State for Badge ---
  const starvingProcesses = processes.filter(p => p.waitTime >= STARVATION_WARNING_THRESHOLD);
  const criticalProcesses = processes.filter(p => p.waitTime >= STARVATION_CRITICAL_THRESHOLD);
  
  let severity: SeverityLevel = 'OK';
  if (criticalProcesses.length > 0) severity = 'CRITICAL';
  else if (starvingProcesses.length > 0) severity = 'WARNING';

  // --- Simulation Logic (SJF - Shortest Job First) ---
  // SJF is notorious for causing starvation for long processes.
  const tick = () => {
    setCpuClock(prev => prev + 1);
    
    setProcesses(prev => {
      if (prev.length === 0) return prev;

      const newProcesses = [...prev];
      
      // Scheduler decides next process: 
      // 1. Priority Boosted (Aging protocol)
      // 2. Shortest Remaining Time
      newProcesses.sort((a, b) => {
        if (a.priorityBoosted && !b.priorityBoosted) return -1;
        if (!a.priorityBoosted && b.priorityBoosted) return 1;
        return a.remainingTime - b.remainingTime;
      });

      const activeProcess = newProcesses[0];
      
      // Update active process
      activeProcess.remainingTime -= 1;

      // Update waiting processes
      for (let i = 1; i < newProcesses.length; i++) {
        newProcesses[i].waitTime += 1;
      }

      // Filter out finished processes
      if (activeProcess.remainingTime <= 0) {
        addLog(`[SCHEDULER] Process ${activeProcess.pid} completed.`);
        return newProcesses.filter(p => p.pid !== activeProcess.pid);
      }

      return newProcesses;
    });
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(tick, 200); // 200ms per CPU cycle
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  // --- Helpers ---
  const addLog = (msg: string) => {
    setSystemLog(prev => [msg, ...prev].slice(0, 8));
  };

  const generateProcess = (isLong: boolean = false) => {
    const pid = `P-${Math.floor(Math.random() * 9000) + 1000}`;
    const burstTime = isLong ? Math.floor(Math.random() * 20) + 30 : Math.floor(Math.random() * 5) + 1;
    
    setProcesses(prev => [...prev, {
      pid,
      burstTime,
      remainingTime: burstTime,
      waitTime: 0,
      priorityBoosted: false
    }]);
    
    addLog(`[SPAWN] ${pid} created (Burst: ${burstTime}t).`);
  };

  const floodShortJobs = () => {
    addLog(`[SYS] Flooding queue with short jobs...`);
    for(let i=0; i<5; i++) generateProcess(false);
  };

  const applyAgingProtocol = () => {
    setProcesses(prev => prev.map(p => {
      if (p.waitTime >= STARVATION_WARNING_THRESHOLD) {
        return { ...p, priorityBoosted: true };
      }
      return p;
    }));
    addLog(`[AGING] Priority boost applied to starving processes.`);
    setBadgeExpanded(false);
  };

  // --- Badge Component Rendering ---
  const renderBadge = () => {
    const baseClasses = "relative flex items-center justify-between p-3 border-2 transition-all duration-300 cursor-pointer overflow-hidden group";
    
    let stateClasses = "";
    let Icon = CheckCircle2;
    let title = "SYSTEM NOMINAL";
    let message = "No starvation detected.";

    if (severity === 'CRITICAL') {
      stateClasses = "bg-red-950/40 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]";
      Icon = ShieldAlert;
      title = "CRITICAL STARVATION";
      message = `${criticalProcesses.length} processes exceeding critical wait threshold.`;
    } else if (severity === 'WARNING') {
      stateClasses = "bg-amber-950/40 border-amber-500 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]";
      Icon = AlertTriangle;
      title = "STARVATION RISK";
      message = `${starvingProcesses.length} processes experiencing high wait times.`;
    } else {
      stateClasses = "bg-green-950/20 border-green-800 text-green-500 hover:border-green-500";
    }

    return (
      <div className="flex flex-col mb-8 w-full max-w-2xl mx-auto">
        <div 
          className={`${baseClasses} ${stateClasses}`}
          onClick={() => setBadgeExpanded(!badgeExpanded)}
        >
          {/* Animated background scanline for critical state */}
          {severity === 'CRITICAL' && (
            <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(239,68,68,0.1)_50%)] bg-[length:100%_4px] pointer-events-none animate-[scan_2s_linear_infinite]" />
          )}
          
          <div className="flex items-center gap-4 z-10 relative">
            <div className={`p-2 rounded-sm ${severity === 'CRITICAL' ? 'bg-red-500/20 animate-pulse' : severity === 'WARNING' ? 'bg-amber-500/20' : 'bg-green-500/10'}`}>
              <Icon className={severity === 'CRITICAL' ? 'text-red-500' : severity === 'WARNING' ? 'text-amber-500' : 'text-green-500'} size={24} />
            </div>
            <div>
              <h2 className="font-bold tracking-widest text-sm uppercase">{title}</h2>
              <p className="text-xs opacity-80 mt-0.5">{message}</p>
            </div>
          </div>

          <div className="z-10 relative flex items-center gap-2">
            {severity !== 'OK' && (
              <span className="text-xs font-mono bg-black/50 px-2 py-1 rounded border border-current opacity-70 group-hover:opacity-100 transition-opacity">
                {badgeExpanded ? 'CLOSE DETAILS' : 'VIEW DETAILS'}
              </span>
            )}
            <Activity className={`opacity-50 ${isRunning ? 'animate-pulse' : ''}`} size={18} />
          </div>
        </div>

        {/* Expandable Details Panel */}
        <div 
          className={`overflow-hidden transition-all duration-500 ease-in-out border-x-2 border-b-2 ${severity === 'CRITICAL' ? 'border-red-500/50 bg-red-950/20' : 'border-amber-500/50 bg-amber-950/20'}`}
          style={{ 
            maxHeight: badgeExpanded && severity !== 'OK' ? '400px' : '0px',
            opacity: badgeExpanded && severity !== 'OK' ? 1 : 0
          }}
        >
          <div className="p-4">
            <div className="flex justify-between items-end mb-4 border-b border-current pb-2 opacity-80">
              <span className="text-xs uppercase tracking-wider">Affected Processes</span>
              <span className="text-xs font-mono">Thresholds: Warn={STARVATION_WARNING_THRESHOLD}t, Crit={STARVATION_CRITICAL_THRESHOLD}t</span>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {starvingProcesses.map(p => (
                <div key={p.pid} className={`flex justify-between items-center p-2 text-sm font-mono bg-black/40 border-l-2 ${p.waitTime >= STARVATION_CRITICAL_THRESHOLD ? 'border-red-500 text-red-300' : 'border-amber-500 text-amber-300'}`}>
                  <div className="flex gap-4">
                    <span className="font-bold">{p.pid}</span>
                    <span className="opacity-60">Req: {p.burstTime}t</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="opacity-80">Wait:</span>
                    <span className={`font-bold ${p.waitTime >= STARVATION_CRITICAL_THRESHOLD ? 'text-red-500 animate-pulse' : 'text-amber-500'}`}>
                      {p.waitTime}t
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-current/30 flex justify-end">
              <button 
                onClick={(e) => { e.stopPropagation(); applyAgingProtocol(); }}
                className="flex items-center gap-2 px-4 py-2 bg-current/10 hover:bg-current/20 border border-current transition-colors text-sm uppercase tracking-wider font-bold"
              >
                <ArrowUpCircle size={16} />
                Execute Aging Protocol
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-green-500 font-mono p-4 md:p-8 selection:bg-green-500/30 flex flex-col items-center">
      
      {/* CRT Scanline Overlay */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-50 opacity-10" />

      {/* Header */}
      <header className="w-full max-w-5xl flex items-center justify-between mb-8 border-b border-green-900 pb-4">
        <div className="flex items-center gap-3">
          <TerminalSquare className="text-green-400" size={28} />
          <div>
            <h1 className="text-xl font-bold tracking-widest text-green-400">CPU SCHEDULER STUDIO</h1>
            <p className="text-xs text-green-600">v3.0.1 // Starvation Diagnostics Module</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tracking-widest">{String(cpuClock).padStart(6, '0')}</div>
          <div className="text-xs text-green-700 uppercase">System Clock (t)</div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        
        {/* Left Column: Controls & Log */}
        <div className="flex flex-col gap-6">
          <section className="border border-green-900 bg-green-950/10 p-4 relative">
            <h3 className="absolute -top-3 left-4 bg-[#0a0a0a] px-2 text-xs text-green-600 font-bold tracking-widest">CONTROL_PANEL</h3>
            
            <div className="flex flex-col gap-3 mt-2">
              <button 
                onClick={() => setIsRunning(!isRunning)}
                className={`p-2 border font-bold tracking-widest transition-colors flex items-center justify-center gap-2 ${isRunning ? 'border-amber-500 text-amber-500 hover:bg-amber-950/30' : 'border-green-500 text-green-500 hover:bg-green-950/30'}`}
              >
                <Cpu size={18} />
                {isRunning ? 'HALT SCHEDULER' : 'START SCHEDULER'}
              </button>
              
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button onClick={() => generateProcess(true)} className="p-2 border border-green-900 hover:border-green-500 hover:bg-green-900/20 text-xs transition-colors">
                  + Add Heavy Job
                </button>
                <button onClick={() => generateProcess(false)} className="p-2 border border-green-900 hover:border-green-500 hover:bg-green-900/20 text-xs transition-colors">
                  + Add Short Job
                </button>
              </div>

              <button 
                onClick={floodShortJobs}
                className="p-2 border border-red-900/50 hover:border-red-500/50 text-red-500/70 hover:text-red-400 hover:bg-red-950/20 text-xs transition-colors mt-2"
              >
                ⚠ Flood Short Jobs (Force Starvation)
              </button>
            </div>
          </section>

          <section className="border border-green-900 bg-green-950/5 p-4 relative flex-grow h-64 flex flex-col">
            <h3 className="absolute -top-3 left-4 bg-[#0a0a0a] px-2 text-xs text-green-600 font-bold tracking-widest">SYS_LOG</h3>
            <div className="mt-2 flex-grow overflow-hidden flex flex-col justify-end gap-1 text-xs opacity-80">
              {systemLog.slice().reverse().map((log, i) => (
                <div key={i} className="font-mono whitespace-nowrap overflow-hidden text-ellipsis">
                  <span className="text-green-700 mr-2">{'>'}</span>{log}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Starvation Badge & Process Queue */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* THE STARVATION WARNING BADGE */}
          {renderBadge()}

          <section className="border border-green-900 bg-green-950/10 p-4 relative flex-grow">
            <h3 className="absolute -top-3 left-4 bg-[#0a0a0a] px-2 text-xs text-green-600 font-bold tracking-widest">READY_QUEUE (SJF ALGORITHM)</h3>
            
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="text-xs text-green-700 border-b border-green-900">
                  <tr>
                    <th className="pb-2 font-normal">PID</th>
                    <th className="pb-2 font-normal">STATUS</th>
                    <th className="pb-2 font-normal text-right">REMAINING</th>
                    <th className="pb-2 font-normal text-right">WAIT_TIME</th>
                  </tr>
                </thead>
                <tbody>
                  {processes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-green-800 italic">Queue is empty.</td>
                    </tr>
                  ) : (
                    processes.map((p, idx) => (
                      <tr 
                        key={p.pid} 
                        className={`border-b border-green-900/30 ${idx === 0 ? 'bg-green-900/20' : ''} ${p.priorityBoosted ? 'bg-blue-900/20' : ''}`}
                      >
                        <td className="py-3 font-bold flex items-center gap-2">
                          {p.pid}
                          {p.priorityBoosted && <ArrowUpCircle size={14} className="text-blue-400" />}
                        </td>
                        <td className="py-3">
                          {idx === 0 ? (
                            <span className="text-green-400 bg-green-950 px-2 py-0.5 rounded text-xs animate-pulse">RUNNING</span>
                          ) : (
                            <span className="text-green-700">WAITING</span>
                          )}
                        </td>
                        <td className="py-3 text-right font-mono">{p.remainingTime}t</td>
                        <td className="py-3 text-right">
                          <span className={`font-mono px-2 py-0.5 rounded ${
                            p.waitTime >= STARVATION_CRITICAL_THRESHOLD ? 'bg-red-950 text-red-500' :
                            p.waitTime >= STARVATION_WARNING_THRESHOLD ? 'bg-amber-950 text-amber-500' :
                            'text-green-600'
                          }`}>
                            {p.waitTime}t
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: currentColor; opacity: 0.5; border-radius: 3px; }
        @keyframes scan {
          0% { background-position: 0 -100vh; }
          100% { background-position: 0 100vh; }
        }
      `}} />
    </div>
  );
}