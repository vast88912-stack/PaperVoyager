import React, { useState, useEffect, useRef } from 'react';

// No external dependencies required other than React.
// Uses standard Tailwind CSS classes.

type ProcessStatus = 'RUNNING' | 'WAITING' | 'COMPLETED';

interface Process {
  pid: string;
  priority: number; // Lower number = higher priority
  burstTime: number;
  remainingTime: number;
  waitTime: number;
  status: ProcessStatus;
}

const STARVATION_WARNING_THRESHOLD = 15;
const STARVATION_CRITICAL_THRESHOLD = 30;

export default function App() {
  const [systemClock, setSystemClock] = useState(0);
  const [processes, setProcesses] = useState<Process[]>([
    { pid: 'SYS_IDLE', priority: 0, burstTime: 999, remainingTime: 999, waitTime: 0, status: 'RUNNING' },
    { pid: 'P_001', priority: 1, burstTime: 50, remainingTime: 50, waitTime: 0, status: 'WAITING' },
    { pid: 'P_002', priority: 5, burstTime: 10, remainingTime: 10, waitTime: 5, status: 'WAITING' },
    { pid: 'P_003', priority: 9, burstTime: 5, remainingTime: 5, waitTime: 12, status: 'WAITING' },
  ]);
  const [isSimulating, setIsSimulating] = useState(false);

  // Simulation loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSimulating) {
      timer = setInterval(() => {
        tick();
      }, 500); // 500ms per tick
    }
    return () => clearInterval(timer);
  }, [isSimulating, processes]);

  const tick = () => {
    setSystemClock((prev) => prev + 1);
    setProcesses((prevProcs) => {
      let updated = prevProcs.map((p) => {
        if (p.status === 'COMPLETED') return p;
        if (p.status === 'RUNNING') {
          const rem = Math.max(0, p.remainingTime - 1);
          return { ...p, remainingTime: rem, status: rem === 0 ? 'COMPLETED' : 'RUNNING' };
        }
        // If waiting, increase wait time
        return { ...p, waitTime: p.waitTime + 1 };
      });
      return updated;
    });
  };

  const applyAging = () => {
    // Priority Boost (Aging) Mitigation
    setProcesses((prevProcs) =>
      prevProcs.map((p) => {
        if (p.status === 'WAITING' && p.waitTime >= STARVATION_WARNING_THRESHOLD) {
          return { ...p, priority: Math.max(1, p.priority - 2), waitTime: 0 }; // Boost priority, reset wait time for demo
        }
        return p;
      })
    );
  };

  const addRandomJob = () => {
    const newPid = `P_${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    setProcesses((prev) => [
      ...prev,
      {
        pid: newPid,
        priority: Math.floor(Math.random() * 10) + 2,
        burstTime: Math.floor(Math.random() * 20) + 5,
        remainingTime: Math.floor(Math.random() * 20) + 5,
        waitTime: 0,
        status: 'WAITING',
      },
    ]);
  };

  const resetSim = () => {
    setSystemClock(0);
    setIsSimulating(false);
    setProcesses([
      { pid: 'SYS_IDLE', priority: 0, burstTime: 999, remainingTime: 999, waitTime: 0, status: 'RUNNING' },
      { pid: 'P_001', priority: 1, burstTime: 50, remainingTime: 50, waitTime: 0, status: 'WAITING' },
      { pid: 'P_002', priority: 5, burstTime: 10, remainingTime: 10, waitTime: 5, status: 'WAITING' },
      { pid: 'P_003', priority: 9, burstTime: 5, remainingTime: 5, waitTime: 12, status: 'WAITING' },
    ]);
  };

  const criticalProcesses = processes.filter((p) => p.status === 'WAITING' && p.waitTime >= STARVATION_CRITICAL_THRESHOLD);
  const warningProcesses = processes.filter(
    (p) => p.status === 'WAITING' && p.waitTime >= STARVATION_WARNING_THRESHOLD && p.waitTime < STARVATION_CRITICAL_THRESHOLD
  );

  return (
    <div className="min-h-screen bg-[#050505] text-[#00ff00] font-mono p-6 selection:bg-[#00ff00] selection:text-black flex flex-col items-center">
      
      {/* Header */}
      <header className="w-full max-w-5xl mb-8 border-b border-[#003300] pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-widest uppercase shadow-sm">CPU Scheduler Studio</h1>
          <p className="text-xs text-[#00aa00] mt-1 opacity-70">Module: System Starvation Telemetry [Variant 4]</p>
        </div>
        <div className="text-right">
          <div className="text-sm">SYS_CLK: {systemClock.toString().padStart(4, '0')}</div>
          <div className="text-xs text-[#00aa00]">ALGO: STRICT_PRIORITY_PREEMPTIVE</div>
        </div>
      </header>

      <main className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Controls & Process List */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          
          {/* Controls */}
          <div className="bg-[#0a0a0a] border border-[#003300] p-4 flex flex-wrap gap-4 items-center">
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`px-4 py-2 border font-bold uppercase tracking-wide transition-all ${
                isSimulating 
                  ? 'border-red-500 text-red-500 hover:bg-red-900/20' 
                  : 'border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00]/10'
              }`}
            >
              {isSimulating ? 'HALT_SIM' : 'START_SIM'}
            </button>
            <button
              onClick={tick}
              className="px-4 py-2 border border-[#005500] text-[#00aa00] hover:bg-[#005500]/20 uppercase"
              disabled={isSimulating}
            >
              Step (Tick)
            </button>
            <button
              onClick={addRandomJob}
              className="px-4 py-2 border border-[#005500] text-[#00aa00] hover:bg-[#005500]/20 uppercase"
            >
              + Inject Job
            </button>
            <button
              onClick={resetSim}
              className="px-4 py-2 border border-[#005500] text-[#00aa00] hover:bg-[#005500]/20 uppercase ml-auto"
            >
              Reset
            </button>
          </div>

          {/* Process List */}
          <div className="bg-[#0a0a0a] border border-[#003300] p-4">
            <h2 className="text-lg uppercase tracking-wider mb-4 border-b border-[#003300] pb-2">Active Process Queue</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs text-[#00aa00] border-b border-[#003300]">
                    <th className="py-2 px-2">PID</th>
                    <th className="py-2 px-2">PRIORITY</th>
                    <th className="py-2 px-2">STATUS</th>
                    <th className="py-2 px-2 text-right">BURST_REM</th>
                    <th className="py-2 px-2 text-right">WAIT_TIME</th>
                  </tr>
                </thead>
                <tbody>
                  {processes.map((p) => (
                    <tr 
                      key={p.pid} 
                      className={`
                        text-sm border-b border-[#002200] last:border-0
                        ${p.status === 'RUNNING' ? 'bg-[#00ff00]/10 text-white' : ''}
                        ${p.waitTime >= STARVATION_CRITICAL_THRESHOLD ? 'text-red-500 bg-red-900/10' : ''}
                        ${p.waitTime >= STARVATION_WARNING_THRESHOLD && p.waitTime < STARVATION_CRITICAL_THRESHOLD ? 'text-yellow-500' : ''}
                      `}
                    >
                      <td className="py-2 px-2 font-bold">{p.pid}</td>
                      <td className="py-2 px-2">{p.priority}</td>
                      <td className="py-2 px-2">
                        {p.status === 'RUNNING' && <span className="animate-pulse">▶ RUNNING</span>}
                        {p.status === 'WAITING' && '⏸ WAITING'}
                        {p.status === 'COMPLETED' && <span className="text-gray-500">■ DONE</span>}
                      </td>
                      <td className="py-2 px-2 text-right">{p.remainingTime}</td>
                      <td className="py-2 px-2 text-right font-bold">{p.waitTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: The Starvation Badge Module */}
        <div className="col-span-1 flex flex-col gap-6">
          <StarvationBadge 
            critical={criticalProcesses} 
            warning={warningProcesses} 
            onMitigate={applyAging} 
          />
          
          {/* Readout panel to support the badge context */}
          <div className="bg-[#0a0a0a] border border-[#003300] p-4 flex-grow">
            <h3 className="text-xs text-[#00aa00] tracking-widest uppercase mb-4">Telemetry Readout</h3>
            <ul className="text-xs space-y-2 opacity-80">
              <li>&gt; ALGO: High Priority First</li>
              <li>&gt; LOWEST_PRIO_JOB: P_003</li>
              <li>&gt; WARN_THRESH: {STARVATION_WARNING_THRESHOLD} ticks</li>
              <li>&gt; CRIT_THRESH: {STARVATION_CRITICAL_THRESHOLD} ticks</li>
              <li className="pt-4 text-gray-500 border-t border-[#003300]">
                * Observe badge state as low-priority jobs sit in the queue without CPU time.
              </li>
            </ul>
          </div>
        </div>

      </main>
    </div>
  );
}

// ----------------------------------------------------------------------
// THE STARVATION BADGE COMPONENT (BLOCK 5)
// ----------------------------------------------------------------------

interface StarvationBadgeProps {
  critical: Process[];
  warning: Process[];
  onMitigate: () => void;
}

function StarvationBadge({ critical, warning, onMitigate }: StarvationBadgeProps) {
  const isCritical = critical.length > 0;
  const isWarning = warning.length > 0 && !isCritical;
  const isOk = !isCritical && !isWarning;

  return (
    <div 
      className={`
        relative overflow-hidden p-5 border-2 transition-colors duration-500
        ${isCritical ? 'border-red-600 bg-[#1a0505] shadow-[0_0_30px_rgba(220,38,38,0.4)]' : ''}
        ${isWarning ? 'border-yellow-500 bg-[#1a1500] shadow-[0_0_15px_rgba(234,179,8,0.2)]' : ''}
        ${isOk ? 'border-[#005500] bg-[#001100]' : ''}
      `}
    >
      {/* Background scanline effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,255,0,0.03)_1px,transparent_1px)] bg-[size:100%_4px] opacity-20"></div>

      <div className="relative z-10 flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Status Icon Indicator */}
          <div className={`
            flex items-center justify-center w-12 h-12 border transition-all duration-300
            ${isCritical ? 'border-red-500 text-red-500 animate-pulse' : ''}
            ${isWarning ? 'border-yellow-500 text-yellow-500' : ''}
            ${isOk ? 'border-[#00ff00] text-[#00ff00]' : ''}
          `}>
            {isCritical && <AlertTriangleIcon className="w-6 h-6" />}
            {isWarning && <WarningIcon className="w-6 h-6" />}
            {isOk && <CheckCircleIcon className="w-6 h-6" />}
          </div>

          {/* Text Readout */}
          <div>
            <h3 className={`font-bold tracking-widest uppercase text-sm ${
              isCritical ? 'text-red-500 drop-shadow-[0_0_5px_rgba(220,38,38,0.8)]' : 
              isWarning ? 'text-yellow-500' : 
              'text-[#00ff00]'
            }`}>
              Starvation Monitor
            </h3>
            <p className="text-xs mt-1 opacity-80 uppercase tracking-wider">
              {isCritical ? 'Critical Threshold Exceeded' : 
               isWarning ? 'Aging Threshold Approaching' : 
               'System Optimal'}
            </p>
          </div>
        </div>

        {/* Global count badge */}
        <div className={`
          px-2 py-1 border text-xs font-bold
          ${isCritical ? 'border-red-500 text-red-500 bg-red-950/50' : 
            isWarning ? 'border-yellow-500 text-yellow-500 bg-yellow-950/50' : 
            'border-[#005500] text-[#00aa00]'}
        `}>
          AFFECTED: {critical.length + warning.length}
        </div>
      </div>

      {/* Expanded detail section when there are issues */}
      {(isCritical || isWarning) && (
        <div className="mt-5 border-t border-dashed border-current pt-4 relative z-10">
          <div className="text-xs uppercase tracking-widest mb-2 opacity-70">
            Detected Anomalies:
          </div>
          
          <ul className="space-y-2 mb-4 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
            {critical.map(p => (
              <li key={p.pid} className="flex justify-between items-center text-red-400 bg-red-950/30 p-2 border-l-2 border-red-500 text-xs">
                <span>[PID:{p.pid}]</span>
                <span>WAIT: {p.waitTime}ms</span>
              </li>
            ))}
            {warning.map(p => (
              <li key={p.pid} className="flex justify-between items-center text-yellow-400 bg-yellow-950/30 p-2 border-l-2 border-yellow-500 text-xs">
                <span>[PID:{p.pid}]</span>
                <span>WAIT: {p.waitTime}ms</span>
              </li>
            ))}
          </ul>

          <button
            onClick={onMitigate}
            className={`
              w-full py-2 border text-xs font-bold uppercase tracking-widest transition-all duration-300
              ${isCritical 
                ? 'border-red-500 text-red-500 hover:bg-red-500 hover:text-black' 
                : 'border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black'}
            `}
          >
            Execute Priority Aging
          </button>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// SVG ICONS (Raw SVG to avoid external dependencies)
// ----------------------------------------------------------------------

function AlertTriangleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" 
      viewBox="0 0 24 24" fill="none" 
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
      {...props}
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <path d="M12 9v4"/>
      <path d="M12 17h.01"/>
    </svg>
  );
}

function WarningIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" 
      viewBox="0 0 24 24" fill="none" 
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
      {...props}
    >
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 8v4"/>
      <path d="M12 16h.01"/>
    </svg>
  );
}

function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" 
      viewBox="0 0 24 24" fill="none" 
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
      {...props}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <path d="m9 11 3 3L22 4"/>
    </svg>
  );
}