import React, { useState, useEffect, useRef } from 'react';

// --- Types & Interfaces ---
type Role = 'LEADER' | 'FOLLOWER' | 'CANDIDATE';

interface RaftNode {
  id: number;
  role: Role;
  term: number;
  commitIndex: number;
  lastApplied: number;
  log: string[];
}

interface LogEvent {
  id: string;
  timestamp: string;
  message: string;
  type: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
}

interface Invariant {
  id: string;
  name: string;
  description: string;
  status: 'VERIFIED' | 'VIOLATED' | 'CHECKING';
}

// --- Icons (Embedded SVGs to ensure standalone execution) ---
const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
);
const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
);
const StepIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
);
const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>
);
const TerminalIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
);
const ShieldCheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
);
const ActivityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
);

// --- Constants & Init ---
const INITIAL_NODES: RaftNode[] = [
  { id: 1, role: 'LEADER', term: 4, commitIndex: 12, lastApplied: 12, log: new Array(12).fill('cmd') },
  { id: 2, role: 'FOLLOWER', term: 4, commitIndex: 12, lastApplied: 12, log: new Array(12).fill('cmd') },
  { id: 3, role: 'FOLLOWER', term: 4, commitIndex: 12, lastApplied: 12, log: new Array(12).fill('cmd') },
  { id: 4, role: 'FOLLOWER', term: 4, commitIndex: 11, lastApplied: 11, log: new Array(12).fill('cmd') },
  { id: 5, role: 'FOLLOWER', term: 4, commitIndex: 12, lastApplied: 12, log: new Array(12).fill('cmd') },
];

const INVARIANTS: Invariant[] = [
  { id: 'inv_1', name: 'Election Safety', description: 'At most one leader can be elected in a given term.', status: 'VERIFIED' },
  { id: 'inv_2', name: 'Leader Append-Only', description: 'A leader never overwrites or deletes entries in its log.', status: 'VERIFIED' },
  { id: 'inv_3', name: 'Log Matching', description: 'If two logs contain an entry with the same index and term, the logs are identical in all preceding entries.', status: 'VERIFIED' },
  { id: 'inv_4', name: 'Leader Completeness', description: 'If a log entry is committed, it will be present in the logs of all future leaders.', status: 'VERIFIED' },
  { id: 'inv_5', name: 'State Machine Safety', description: 'If a server has applied a log entry at a given index, no other server will ever apply a different log entry for that index.', status: 'VERIFIED' },
];

export default function App() {
  const [nodes, setNodes] = useState<RaftNode[]>(INITIAL_NODES);
  const [events, setEvents] = useState<LogEvent[]>([
    { id: 'init', timestamp: new Date().toISOString().substring(11, 19), message: 'System initialized. Node 1 elected as leader for term 4.', type: 'INFO' }
  ]);
  const [invariants, setInvariants] = useState<Invariant[]>(INVARIANTS);
  const [isRunning, setIsRunning] = useState(false);
  const [tick, setTick] = useState(0);
  const [seed, setSeed] = useState('7A9B2F');

  const eventsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll event log
  useEffect(() => {
    if (eventsEndRef.current) {
      eventsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events]);

  const addEvent = (msg: string, type: LogEvent['type'] = 'INFO') => {
    setEvents(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString().substring(11, 19),
      message: msg,
      type
    }].slice(-50)); // Keep last 50 events
  };

  const simulateTick = () => {
    setTick(t => t + 1);
    
    // Simulate Raft activity
    setNodes(prevNodes => {
      const newNodes = [...prevNodes];
      const leader = newNodes.find(n => n.role === 'LEADER');
      
      const rand = Math.random();
      
      if (leader) {
        if (rand < 0.2) {
          // Append entry
          leader.log.push(`cmd_${tick}`);
          addEvent(`[Term ${leader.term}] Leader ${leader.id} received client command.`, 'INFO');
        } else if (rand < 0.4 && leader.commitIndex < leader.log.length) {
          // Replicate
          newNodes.forEach(n => {
            if (n.role === 'FOLLOWER' && n.log.length < leader.log.length) {
              n.log.push(leader.log[n.log.length]);
            }
          });
          addEvent(`[Term ${leader.term}] Leader ${leader.id} replicating logs to followers.`, 'SUCCESS');
        } else if (rand < 0.6) {
          // Update commit index
          let minLogLen = Math.min(...newNodes.map(n => n.log.length));
          if (leader.commitIndex < minLogLen) {
            leader.commitIndex = minLogLen;
            leader.lastApplied = minLogLen;
            newNodes.forEach(n => {
              n.commitIndex = minLogLen;
              n.lastApplied = minLogLen;
            });
            addEvent(`[Term ${leader.term}] Commit index advanced to ${minLogLen}.`, 'SUCCESS');
          }
        } else if (rand > 0.95) {
          // Simulate leader timeout/failure
          addEvent(`[NETWORK] Leader ${leader.id} partitioned! Election timeout started.`, 'ERROR');
          leader.role = 'FOLLOWER';
          const newCandidate = newNodes[1];
          newCandidate.role = 'CANDIDATE';
          newCandidate.term += 1;
          addEvent(`[Term ${newCandidate.term}] Node ${newCandidate.id} became candidate.`, 'WARN');
          
          // Briefly check invariants to show UI changing
          setInvariants(invs => invs.map(i => ({ ...i, status: 'CHECKING' })));
          setTimeout(() => {
            setInvariants(invs => invs.map(i => ({ ...i, status: 'VERIFIED' })));
            newCandidate.role = 'LEADER';
            addEvent(`[Term ${newCandidate.term}] Node ${newCandidate.id} elected as LEADER.`, 'INFO');
            setNodes([...newNodes]);
          }, 1500);
        }
      }
      return newNodes;
    });
  };

  // Main simulation loop
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning) {
      interval = setInterval(simulateTick, 1200);
    }
    return () => clearInterval(interval);
  }, [isRunning, tick]);

  const handleReset = () => {
    setIsRunning(false);
    setNodes(INITIAL_NODES);
    setTick(0);
    setSeed(Math.random().toString(36).substring(2, 8).toUpperCase());
    setEvents([{ id: 'reset', timestamp: new Date().toISOString().substring(11, 19), message: 'System hard reset. Seed updated.', type: 'WARN' }]);
  };

  const getRoleColor = (role: Role) => {
    switch (role) {
      case 'LEADER': return 'text-yellow-400 border-yellow-800 bg-yellow-900/20';
      case 'CANDIDATE': return 'text-blue-400 border-blue-800 bg-blue-900/20';
      case 'FOLLOWER': return 'text-gray-400 border-gray-700 bg-gray-800/20';
    }
  };

  const getEventColor = (type: LogEvent['type']) => {
    switch (type) {
      case 'INFO': return 'text-blue-300';
      case 'SUCCESS': return 'text-green-400';
      case 'WARN': return 'text-yellow-400';
      case 'ERROR': return 'text-red-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-green-500 font-mono p-4 flex flex-col gap-4 selection:bg-green-900 selection:text-green-100">
      
      {/* HEADER */}
      <header className="border-b border-green-800/50 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-widest text-green-400 uppercase flex items-center gap-2">
            <ActivityIcon /> Raft Animator <span className="text-gray-500 text-sm font-normal">// Analysis & Output</span>
          </h1>
          <p className="text-xs text-green-700 mt-1">Simulated Distributed Consensus Engine v1.0</p>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 bg-gray-900 border border-green-900 px-3 py-1.5 rounded">
            <span className="text-gray-500">SEED:</span>
            <span className="text-green-300 tracking-wider">{seed}</span>
          </div>
          
          <div className="flex items-center gap-1 border border-green-800 bg-gray-900 rounded p-1">
            <button 
              onClick={() => setIsRunning(!isRunning)}
              className={`p-1.5 rounded transition-colors ${isRunning ? 'bg-red-900/50 text-red-400 hover:bg-red-900' : 'bg-green-900/50 text-green-400 hover:bg-green-900'}`}
              title={isRunning ? "Pause Simulation" : "Play Simulation"}
            >
              {isRunning ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button 
              onClick={simulateTick}
              disabled={isRunning}
              className="p-1.5 rounded text-blue-400 hover:bg-blue-900/50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Step Forward"
            >
              <StepIcon />
            </button>
            <button 
              onClick={handleReset}
              className="p-1.5 rounded text-gray-400 hover:bg-gray-800 transition-colors"
              title="Reset Cluster"
            >
              <RefreshIcon />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN GRID */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-[600px]">
        
        {/* LEFT COLUMN: Node Metrics Table */}
        <div className="col-span-1 lg:col-span-4 flex flex-col gap-4">
          <div className="border border-green-900/50 bg-gray-900/40 rounded flex flex-col h-full overflow-hidden">
            <div className="bg-green-950/50 border-b border-green-900/50 p-2 px-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-green-600">
              <ActivityIcon /> Cluster State Matrix
            </div>
            
            <div className="p-3 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-green-700 border-b border-green-900/30">
                    <th className="pb-2 font-normal">Node</th>
                    <th className="pb-2 font-normal">Role</th>
                    <th className="pb-2 font-normal text-right">Term</th>
                    <th className="pb-2 font-normal text-right">Log Idx</th>
                    <th className="pb-2 font-normal text-right">Commit</th>
                  </tr>
                </thead>
                <tbody>
                  {nodes.map(node => (
                    <tr key={node.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                      <td className="py-3 text-green-300 font-bold">N{node.id}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] border tracking-wider ${getRoleColor(node.role)}`}>
                          {node.role}
                        </span>
                      </td>
                      <td className="py-3 text-right text-gray-400">{node.term}</td>
                      <td className="py-3 text-right text-blue-300">{node.log.length}</td>
                      <td className="py-3 text-right text-purple-400">{node.commitIndex}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quick Metrics */}
            <div className="mt-auto p-3 border-t border-green-900/30 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-950 border border-gray-800 p-2 rounded">
                <div className="text-gray-500 uppercase text-[10px]">Global Tick</div>
                <div className="text-xl text-green-400">{tick}</div>
              </div>
              <div className="bg-gray-950 border border-gray-800 p-2 rounded">
                <div className="text-gray-500 uppercase text-[10px]">Quorum Size</div>
                <div className="text-xl text-green-400">{Math.floor(nodes.length / 2) + 1}/{nodes.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: Terminal Output Log */}
        <div className="col-span-1 lg:col-span-5 flex flex-col gap-4">
          <div className="border border-green-900/50 bg-gray-900/40 rounded flex flex-col h-full overflow-hidden">
            <div className="bg-green-950/50 border-b border-green-900/50 p-2 px-3 flex justify-between items-center text-xs font-bold uppercase tracking-wider text-green-600">
              <div className="flex items-center gap-2">
                <TerminalIcon /> Event Console
              </div>
              <span className="text-[10px] bg-green-900/30 px-2 py-0.5 rounded text-green-500 border border-green-800/50 animate-pulse">
                {isRunning ? 'RECEIVING' : 'IDLE'}
              </span>
            </div>
            
            <div className="flex-1 p-3 overflow-y-auto font-mono text-[11px] leading-relaxed flex flex-col gap-1.5 custom-scrollbar bg-[#0a0f0d]" style={{ maxHeight: '600px' }}>
              {events.map((ev) => (
                <div key={ev.id} className="flex gap-3 items-start group hover:bg-gray-800/30 px-1 py-0.5 rounded transition-colors">
                  <span className="text-gray-600 shrink-0 select-none">[{ev.timestamp}]</span>
                  <span className={`${getEventColor(ev.type)} break-words`}>
                    {ev.message}
                  </span>
                </div>
              ))}
              <div ref={eventsEndRef} />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Safety Checklist */}
        <div className="col-span-1 lg:col-span-3 flex flex-col gap-4">
          <div className="border border-green-900/50 bg-gray-900/40 rounded flex flex-col h-full overflow-hidden">
            <div className="bg-green-950/50 border-b border-green-900/50 p-2 px-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-green-600">
              <ShieldCheckIcon /> Safety Invariants
            </div>
            
            <div className="p-3 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
              {invariants.map((inv) => (
                <div key={inv.id} className="border border-gray-800 bg-gray-950 rounded p-2.5 relative overflow-hidden group">
                  {/* Status Indicator Bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    inv.status === 'VERIFIED' ? 'bg-green-500' : 
                    inv.status === 'CHECKING' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                  }`} />
                  
                  <div className="pl-2 flex flex-col gap-1">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-gray-200">{inv.name}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border tracking-wider ${
                        inv.status === 'VERIFIED' ? 'text-green-400 border-green-800 bg-green-900/20' : 
                        inv.status === 'CHECKING' ? 'text-yellow-400 border-yellow-800 bg-yellow-900/20' : 
                        'text-red-400 border-red-800 bg-red-900/20'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-snug">
                      {inv.description}
                    </p>
                  </div>
                </div>
              ))}
              
              <div className="mt-4 border border-dashed border-gray-700 rounded p-3 text-center">
                <div className="text-[10px] text-gray-500 mb-2">Simulated Network Conditions</div>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-400">Packet Loss:</span>
                    <span className="text-yellow-400">0%</span>
                  </div>
                  <input type="range" min="0" max="100" defaultValue="0" className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-green-500" disabled />
                  
                  <div className="flex justify-between text-[10px] mt-1">
                    <span className="text-gray-400">Base Latency:</span>
                    <span className="text-blue-400">150ms</span>
                  </div>
                  <input type="range" min="10" max="500" defaultValue="150" className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-green-500" disabled />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #030712; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1f2937; 
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #374151; 
        }
      `}} />
    </div>
  );
}