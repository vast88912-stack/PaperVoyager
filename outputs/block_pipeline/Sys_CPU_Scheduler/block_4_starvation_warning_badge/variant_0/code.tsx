import React, { useState, useEffect, useMemo } from 'react';

// --- Types ---
type Process = {
  id: string;
  priority: number; // Lower number = higher priority
  waitTime: number;
  burstTime: number;
  isExecuting: boolean;
};

// --- Constants ---
const WARNING_THRESHOLD = 15;
const STARVATION_THRESHOLD = 30;

// --- Subcomponents ---

const TerminalHeader = () => (
  <div className="mb-6 border-b border-green-800/50 pb-4">
    <h1 className="text-2xl font-bold tracking-widest text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">
      &gt; CPU_SCHEDULER_STUDIO
    </h1>
    <p className="text-xs text-green-600 mt-1">
      MODULE: STARVATION_MONITOR // v1.0.0 // STATUS: ONLINE
    </p>
  </div>
);

const ScanlineOverlay = () => (
  <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20"></div>
  </div>
);

// THE CORE MODULE: Starvation Warning Badge
const StarvationBadge = ({ processes }: { processes: Process[] }) => {
  const starvingProcesses = processes.filter((p) => p.waitTime >= STARVATION_THRESHOLD);
  const warningProcesses = processes.filter(
    (p) => p.waitTime >= WARNING_THRESHOLD && p.waitTime < STARVATION_THRESHOLD
  );

  const status =
    starvingProcesses.length > 0
      ? 'CRITICAL'
      : warningProcesses.length > 0
      ? 'WARNING'
      : 'OPTIMAL';

  return (
    <div
      className={`relative overflow-hidden border-2 p-4 transition-all duration-500 ${
        status === 'CRITICAL'
          ? 'border-red-500 bg-red-950/20 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
          : status === 'WARNING'
          ? 'border-amber-500 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
          : 'border-green-800 bg-green-950/10'
      }`}
    >
      {/* Animated background pulse for critical state */}
      {status === 'CRITICAL' && (
        <div className="absolute inset-0 animate-pulse bg-red-500/10"></div>
      )}

      <div className="relative z-10 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            {status === 'CRITICAL' && (
              <span className="animate-bounce text-2xl text-red-500">⚠</span>
            )}
            {status === 'WARNING' && (
              <span className="text-2xl text-amber-500">⚠</span>
            )}
            {status === 'OPTIMAL' && (
              <span className="text-2xl text-green-500">✓</span>
            )}
            <h2
              className={`text-xl font-bold tracking-wider ${
                status === 'CRITICAL'
                  ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                  : status === 'WARNING'
                  ? 'text-amber-500'
                  : 'text-green-500'
              }`}
            >
              {status === 'CRITICAL'
                ? 'STARVATION DETECTED'
                : status === 'WARNING'
                ? 'HIGH WAIT TIMES DETECTED'
                : 'SYSTEM OPTIMAL'}
            </h2>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            {status === 'OPTIMAL' && (
              <p className="text-green-600">
                All processes are receiving adequate CPU time. No starvation risks detected.
              </p>
            )}

            {status === 'WARNING' && (
              <div className="text-amber-400">
                <p className="mb-2">
                  Processes are experiencing elevated wait times. Risk of starvation increasing.
                </p>
                <div className="flex flex-wrap gap-2">
                  {warningProcesses.map((p) => (
                    <span
                      key={p.id}
                      className="border border-amber-500/50 bg-amber-950/50 px-2 py-1 text-xs"
                    >
                      {p.id} (Wait: {p.waitTime}ms)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {status === 'CRITICAL' && (
              <div className="text-red-400">
                <p className="mb-2 font-bold text-red-300">
                  ACTION REQUIRED: Low priority processes are being indefinitely postponed!
                </p>
                <div className="flex flex-wrap gap-2">
                  {starvingProcesses.map((p) => (
                    <span
                      key={p.id}
                      className="animate-pulse border border-red-500 bg-red-900/50 px-2 py-1 text-xs font-bold text-white shadow-[0_0_10px_rgba(239,68,68,0.6)]"
                    >
                      {p.id} (Wait: {p.waitTime}ms)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Telemetry / Metrics */}
        <div className="hidden flex-col items-end text-right sm:flex">
          <div className="text-xs text-gray-500">MAX WAIT TIME</div>
          <div
            className={`text-2xl font-mono ${
              status === 'CRITICAL'
                ? 'text-red-400'
                : status === 'WARNING'
                ? 'text-amber-400'
                : 'text-green-400'
            }`}
          >
            {Math.max(0, ...processes.map((p) => p.waitTime))}ms
          </div>
          <div className="mt-2 text-xs text-gray-500">AFFECTED PROCESSES</div>
          <div className="text-lg font-mono text-gray-300">
            {starvingProcesses.length + warningProcesses.length} / {processes.length}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Application ---
export default function App() {
  const [systemTick, setSystemTick] = useState(0);
  const [autoTick, setAutoTick] = useState(false);
  const [processes, setProcesses] = useState<Process[]>([
    { id: 'PID-001', priority: 1, waitTime: 0, burstTime: 50, isExecuting: false },
    { id: 'PID-002', priority: 1, waitTime: 0, burstTime: 40, isExecuting: false },
    { id: 'PID-003', priority: 5, waitTime: 12, burstTime: 100, isExecuting: false },
    { id: 'PID-004', priority: 9, waitTime: 28, burstTime: 200, isExecuting: false },
  ]);

  // Simulation Loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoTick) {
      interval = setInterval(() => {
        simulateTick();
      }, 500);
    }
    return () => clearInterval(interval);
  }, [autoTick, processes]);

  const simulateTick = () => {
    setSystemTick((prev) => prev + 1);
    
    // Simple Priority Scheduler Simulation:
    // Highest priority (lowest number) gets the CPU.
    // Others wait.
    const sorted = [...processes].sort((a, b) => a.priority - b.priority);
    const executingId = sorted.length > 0 ? sorted[0].id : null;

    setProcesses((prev) =>
      prev.map((p) => {
        if (p.id === executingId) {
          return { ...p, isExecuting: true, burstTime: Math.max(0, p.burstTime - 1) };
        } else {
          return { ...p, isExecuting: false, waitTime: p.waitTime + 1 };
        }
      }).filter(p => p.burstTime > 0) // Remove finished processes
    );
  };

  const injectHighPriorityJob = () => {
    const newId = `PID-${Math.floor(Math.random() * 900) + 100}`;
    setProcesses((prev) => [
      ...prev,
      { id: newId, priority: 1, waitTime: 0, burstTime: 20, isExecuting: false },
    ]);
  };

  const applyAging = () => {
    // Aging technique: boost priority of jobs that have waited too long
    setProcesses((prev) =>
      prev.map((p) => {
        if (p.waitTime >= WARNING_THRESHOLD) {
          return { ...p, priority: Math.max(1, p.priority - 2), waitTime: 0 }; // Reset wait time to show resolution, boost priority
        }
        return p;
      })
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 font-mono text-green-500 selection:bg-green-900 selection:text-green-100 sm:p-8">
      <ScanlineOverlay />
      
      <div className="mx-auto max-w-5xl">
        <TerminalHeader />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Controls & Process List */}
          <div className="space-y-6 lg:col-span-2">
            
            {/* Controls */}
            <div className="border border-green-800/50 bg-black p-4">
              <h3 className="mb-4 text-sm text-green-600">SYSTEM_CONTROLS</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setAutoTick(!autoTick)}
                  className={`border px-4 py-2 text-sm uppercase transition-colors ${
                    autoTick
                      ? 'border-red-500 text-red-500 hover:bg-red-950/30'
                      : 'border-green-500 text-green-500 hover:bg-green-950/30'
                  }`}
                >
                  {autoTick ? '■ Stop Clock' : '▶ Start Clock'}
                </button>
                <button
                  onClick={simulateTick}
                  className="border border-green-700 px-4 py-2 text-sm uppercase text-green-400 hover:bg-green-900/30"
                >
                  +1 Tick
                </button>
                <button
                  onClick={injectHighPriorityJob}
                  className="border border-blue-500 px-4 py-2 text-sm uppercase text-blue-400 hover:bg-blue-950/30"
                >
                  Inject High-Pri Job
                </button>
                <button
                  onClick={applyAging}
                  className="border border-purple-500 px-4 py-2 text-sm uppercase text-purple-400 hover:bg-purple-950/30"
                >
                  Apply Aging (Fix)
                </button>
              </div>
            </div>

            {/* Process Table */}
            <div className="border border-green-800/50 bg-black p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm text-green-600">PROCESS_QUEUE</h3>
                <span className="text-xs text-green-700">TICK: {systemTick}</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-green-900 text-green-700">
                      <th className="pb-2 font-normal">PID</th>
                      <th className="pb-2 font-normal">PRIORITY</th>
                      <th className="pb-2 font-normal">BURST_REMAINING</th>
                      <th className="pb-2 font-normal">WAIT_TIME</th>
                      <th className="pb-2 font-normal">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-green-800">
                          [ QUEUE EMPTY ]
                        </td>
                      </tr>
                    ) : (
                      processes.map((p) => (
                        <tr
                          key={p.id}
                          className={`border-b border-green-900/30 transition-colors ${
                            p.isExecuting ? 'bg-green-950/30' : ''
                          }`}
                        >
                          <td className="py-2">{p.id}</td>
                          <td className="py-2">
                            <span className="inline-block w-6 text-center">{p.priority}</span>
                            {p.priority === 1 && <span className="ml-2 text-xs text-blue-400">(HIGH)</span>}
                            {p.priority >= 5 && <span className="ml-2 text-xs text-gray-500">(LOW)</span>}
                          </td>
                          <td className="py-2">{p.burstTime}</td>
                          <td className="py-2">
                            <span
                              className={`${
                                p.waitTime >= STARVATION_THRESHOLD
                                  ? 'font-bold text-red-500'
                                  : p.waitTime >= WARNING_THRESHOLD
                                  ? 'text-amber-500'
                                  : 'text-green-500'
                              }`}
                            >
                              {p.waitTime}
                            </span>
                          </td>
                          <td className="py-2">
                            {p.isExecuting ? (
                              <span className="animate-pulse text-green-400">[EXECUTING]</span>
                            ) : (
                              <span className="text-gray-500">[WAITING]</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Starvation Badge & Info */}
          <div className="space-y-6">
            <StarvationBadge processes={processes} />

            <div className="border border-green-800/50 bg-black p-4 text-sm text-green-600">
              <h3 className="mb-2 text-green-500">INFO // STARVATION</h3>
              <p className="mb-2">
                Starvation occurs when low-priority processes are indefinitely prevented from running because high-priority processes keep arriving.
              </p>
              <ul className="ml-4 list-square space-y-1 text-xs text-green-700">
                <li>Warning Threshold: {WARNING_THRESHOLD} ticks</li>
                <li>Critical Threshold: {STARVATION_THRESHOLD} ticks</li>
              </ul>
              <div className="mt-4 border-t border-green-900 pt-2 text-xs">
                <span className="text-blue-400">TIP:</span> Click "Inject High-Pri Job" repeatedly to starve low priority jobs. Click "Apply Aging" to resolve.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}