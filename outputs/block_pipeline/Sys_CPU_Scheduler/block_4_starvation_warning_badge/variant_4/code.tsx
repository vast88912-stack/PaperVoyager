import React, { useState, useEffect, useMemo } from 'react';

// --- SVGs ---
const AlertTriangle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

const ShieldCheck = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const Skull = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="9" cy="12" r="1" />
    <circle cx="15" cy="12" r="1" />
    <path d="M8 20v2h8v-2" />
    <path d="m12.5 17-.5-1-.5 1h1z" />
    <path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20" />
  </svg>
);

const TerminalIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" x2="20" y1="19" y2="19" />
  </svg>
);

// --- Types ---
interface Job {
  id: string;
  name: string;
  waitTime: number;
  priority: number;
  status: 'WAITING' | 'RUNNING' | 'COMPLETED';
}

// --- Components ---
export default function App() {
  const [jobs, setJobs] = useState<Job[]>([
    { id: '1', name: 'JOB_01', waitTime: 2, priority: 1, status: 'WAITING' },
    { id: '2', name: 'JOB_02', waitTime: 5, priority: 3, status: 'WAITING' },
    { id: '3', name: 'JOB_03', waitTime: 8, priority: 2, status: 'WAITING' },
  ]);
  
  const [cpuHogged, setCpuHogged] = useState(false);
  const [tickRate, setTickRate] = useState(1000);

  const THRESHOLD_WARNING = 15;
  const THRESHOLD_CRITICAL = 30;

  // Simulation Clock
  useEffect(() => {
    const interval = setInterval(() => {
      setJobs(currentJobs => 
        currentJobs.map(job => {
          if (job.status === 'WAITING') {
            return { ...job, waitTime: job.waitTime + 1 };
          }
          return job;
        })
      );
    }, tickRate);
    return () => clearInterval(interval);
  }, [tickRate]);

  // Simulate scheduler processing
  useEffect(() => {
    if (cpuHogged) return;

    const processInterval = setInterval(() => {
      setJobs(currentJobs => {
        const waitingJobs = currentJobs.filter(j => j.status === 'WAITING');
        if (waitingJobs.length === 0) return currentJobs;
        
        // Simple FCFS for demo
        const jobToProcess = waitingJobs.reduce((prev, curr) => (prev.waitTime > curr.waitTime ? prev : curr));
        
        return currentJobs.map(j => 
          j.id === jobToProcess.id ? { ...j, status: 'COMPLETED' } : j
        );
      });
    }, tickRate * 3); // CPU is slower than tick

    return () => clearInterval(processInterval);
  }, [cpuHogged, tickRate]);

  const addRandomJob = () => {
    const newId = Math.random().toString(36).substring(2, 9);
    setJobs(prev => [
      ...prev,
      {
        id: newId,
        name: `JOB_${newId.substring(0, 4).toUpperCase()}`,
        waitTime: 0,
        priority: Math.floor(Math.random() * 5) + 1,
        status: 'WAITING'
      }
    ]);
  };

  const activeWaitTimes = jobs.filter(j => j.status === 'WAITING').map(j => j.waitTime);
  const maxWait = activeWaitTimes.length > 0 ? Math.max(...activeWaitTimes) : 0;
  const starvedJobs = jobs.filter(j => j.status === 'WAITING' && j.waitTime >= THRESHOLD_WARNING);

  // Determine Badge Status
  let badgeStatus: 'SAFE' | 'WARNING' | 'CRITICAL' = 'SAFE';
  if (maxWait >= THRESHOLD_CRITICAL) badgeStatus = 'CRITICAL';
  else if (maxWait >= THRESHOLD_WARNING) badgeStatus = 'WARNING';

  return (
    <div className="min-h-screen bg-[#050505] text-[#33ff33] font-mono p-4 md:p-8 flex flex-col items-center selection:bg-[#33ff33] selection:text-black">
      
      {/* Background Grid & Vignette */}
      <div className="fixed inset-0 pointer-events-none opacity-20"
           style={{ backgroundImage: 'linear-gradient(#33ff33 1px, transparent 1px), linear-gradient(90deg, #33ff33 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#050505_100%)]" />

      {/* Main Terminal UI Container */}
      <div className="w-full max-w-4xl relative z-10 border border-[#33ff33]/40 bg-[#0a0a0a]/90 backdrop-blur-sm shadow-[0_0_30px_rgba(51,255,51,0.1)]">
        
        {/* Header */}
        <div className="border-b border-[#33ff33]/40 bg-[#33ff33]/10 p-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <TerminalIcon className="w-5 h-5 text-[#33ff33]" />
            <h1 className="font-bold tracking-widest uppercase">CPU Scheduler Studio // Module 5</h1>
          </div>
          <div className="text-xs opacity-70 flex items-center space-x-2">
            <span className="animate-pulse inline-block w-2 h-2 bg-[#33ff33]" />
            <span>SYS.ONLINE</span>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-8">
          
          {/* STARVATION WARNING BADGE */}
          <div className="relative group">
            <div className={`
              absolute -inset-1 rounded-sm blur-md opacity-75 transition duration-500
              ${badgeStatus === 'SAFE' ? 'bg-[#33ff33]/20' : 
                badgeStatus === 'WARNING' ? 'bg-yellow-500/50 animate-pulse' : 
                'bg-red-600/70 animate-pulse'}
            `} />
            <div className={`
              relative flex items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6 p-6 border-2 shadow-2xl transition-all duration-300
              ${badgeStatus === 'SAFE' ? 'border-[#33ff33]/50 bg-black' : 
                badgeStatus === 'WARNING' ? 'border-yellow-500 bg-[#1a1500]' : 
                'border-red-500 bg-[#1a0505]'}
            `}>
              
              {/* Icon Container */}
              <div className={`
                p-4 rounded-full border-2 border-dashed
                ${badgeStatus === 'SAFE' ? 'border-[#33ff33]/50 text-[#33ff33]' : 
                  badgeStatus === 'WARNING' ? 'border-yellow-500 text-yellow-500' : 
                  'border-red-500 text-red-500 animate-bounce'}
              `}>
                {badgeStatus === 'SAFE' && <ShieldCheck className="w-8 h-8" />}
                {badgeStatus === 'WARNING' && <AlertTriangle className="w-8 h-8" />}
                {badgeStatus === 'CRITICAL' && <Skull className="w-8 h-8" />}
              </div>

              {/* Text Content */}
              <div className="flex-1">
                <h2 className={`text-2xl font-bold tracking-[0.2em] uppercase mb-1
                  ${badgeStatus === 'SAFE' ? 'text-[#33ff33]' : 
                    badgeStatus === 'WARNING' ? 'text-yellow-500' : 
                    'text-red-500'}
                `}>
                  {badgeStatus === 'SAFE' ? 'No Starvation Detected' : 
                   badgeStatus === 'WARNING' ? 'Starvation Warning' : 
                   'Critical Starvation Failure'}
                </h2>
                
                <p className={`text-sm opacity-80 ${badgeStatus === 'SAFE' ? 'text-[#33ff33]' : badgeStatus === 'WARNING' ? 'text-yellow-200' : 'text-red-200'}`}>
                  {badgeStatus === 'SAFE' && 'All processes are being scheduled within nominal wait parameters.'}
                  {badgeStatus === 'WARNING' && `WARNING: ${starvedJobs.length} process(es) approaching starvation limits. Scheduler intervention advised.`}
                  {badgeStatus === 'CRITICAL' && `CRITICAL: ${starvedJobs.length} process(es) exceeding maximum safe wait times (${THRESHOLD_CRITICAL}t)! Indefinite blocking imminent.`}
                </p>

                {/* Status Bars */}
                <div className="mt-4 flex space-x-2">
                  <div className="flex-1 h-2 bg-gray-900 border border-gray-700 relative overflow-hidden">
                    <div 
                      className={`absolute top-0 left-0 h-full transition-all duration-300
                        ${badgeStatus === 'SAFE' ? 'bg-[#33ff33]' : 
                          badgeStatus === 'WARNING' ? 'bg-yellow-500' : 
                          'bg-red-500'}
                      `}
                      style={{ width: `${Math.min(100, (maxWait / THRESHOLD_CRITICAL) * 100)}%` }}
                    />
                  </div>
                  <span className={`text-xs -mt-1
                    ${badgeStatus === 'SAFE' ? 'text-[#33ff33]' : 
                      badgeStatus === 'WARNING' ? 'text-yellow-500' : 
                      'text-red-500'}
                  `}>
                    PEAK_WAIT: {maxWait}t
                  </span>
                </div>
              </div>

            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Control Panel */}
            <div className="col-span-1 border border-[#33ff33]/30 p-4 bg-black/50">
              <h3 className="uppercase font-bold text-sm tracking-widest border-b border-[#33ff33]/30 pb-2 mb-4">Command Center</h3>
              <div className="space-y-4">
                <button 
                  onClick={addRandomJob}
                  className="w-full py-2 px-4 border border-[#33ff33] text-[#33ff33] hover:bg-[#33ff33] hover:text-black transition-colors uppercase text-sm tracking-wider flex justify-between items-center group"
                >
                  <span>Inject Process</span>
                  <span className="opacity-0 group-hover:opacity-100">&gt;</span>
                </button>
                
                <button 
                  onClick={() => setCpuHogged(!cpuHogged)}
                  className={`w-full py-2 px-4 border transition-colors uppercase text-sm tracking-wider flex justify-between items-center group
                    ${cpuHogged ? 'border-red-500 text-red-500 hover:bg-red-500 hover:text-black' : 'border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black'}
                  `}
                >
                  <span>{cpuHogged ? 'Resume CPU' : 'Simulate CPU Block'}</span>
                  <span className="opacity-0 group-hover:opacity-100">&gt;</span>
                </button>

                <div className="pt-4 border-t border-[#33ff33]/20">
                  <label className="text-xs uppercase opacity-70 block mb-2">Sim Speed (Tick Rate)</label>
                  <input 
                    type="range" 
                    min="100" 
                    max="2000" 
                    step="100" 
                    value={tickRate}
                    onChange={(e) => setTickRate(Number(e.target.value))}
                    className="w-full accent-[#33ff33]"
                  />
                  <div className="flex justify-between text-xs opacity-50 mt-1">
                    <span>FAST</span>
                    <span>{tickRate}ms</span>
                    <span>SLOW</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Job Queue Table */}
            <div className="col-span-1 md:col-span-2 border border-[#33ff33]/30 p-4 bg-black/50 overflow-hidden flex flex-col">
              <h3 className="uppercase font-bold text-sm tracking-widest border-b border-[#33ff33]/30 pb-2 mb-4 flex justify-between">
                <span>Active Process Queue</span>
                <span className="opacity-50">Total: {jobs.filter(j => j.status === 'WAITING').length}</span>
              </h3>
              
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                {jobs.filter(j => j.status === 'WAITING').length === 0 && (
                  <div className="text-center opacity-50 italic mt-8">QUEUE EMPTY. SYSTEM IDLE.</div>
                )}
                {jobs.filter(j => j.status === 'WAITING').map(job => (
                  <div 
                    key={job.id} 
                    className={`flex items-center justify-between p-2 border-l-2 bg-[#33ff33]/5
                      ${job.waitTime >= THRESHOLD_CRITICAL ? 'border-red-500 text-red-400 animate-pulse' : 
                        job.waitTime >= THRESHOLD_WARNING ? 'border-yellow-500 text-yellow-400' : 
                        'border-[#33ff33] text-[#33ff33]'}
                    `}
                  >
                    <div className="flex space-x-4">
                      <span className="font-bold">{job.name}</span>
                      <span className="opacity-60 text-xs mt-1">PRIORITY: {job.priority}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs opacity-60 uppercase">Wait Time:</span>
                      <span className={`font-bold w-8 text-right
                        ${job.waitTime >= THRESHOLD_CRITICAL ? 'text-red-500' : job.waitTime >= THRESHOLD_WARNING ? 'text-yellow-500' : ''}
                      `}>{job.waitTime}t</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
        </div>
        
        {/* Footer info */}
        <div className="bg-[#33ff33]/5 border-t border-[#33ff33]/30 p-2 px-4 text-xs flex justify-between opacity-50">
          <span>{new Date().toISOString()}</span>
          <span>SCHEDULER_CORE_V1.9.4</span>
        </div>
      </div>
    </div>
  );
}