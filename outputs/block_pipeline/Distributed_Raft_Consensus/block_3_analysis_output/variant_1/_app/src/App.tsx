import React, { useState, useEffect, useRef } from 'react';

// --- Types ---
type Role = 'Leader' | 'Follower' | 'Candidate' | 'Offline';

interface LogEntry {
  term: number;
  command: string;
}

interface NodeState {
  id: number;
  role: Role;
  currentTerm: number;
  votedFor: number | null;
  log: LogEntry[];
  commitIndex: number;
  lastApplied: number;
}

interface EventLog {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'warn' | 'error' | 'success';
}

// --- Mock Initial State ---
const INITIAL_LOG: LogEntry[] = [
  { term: 1, command: 'SET x 5' },
  { term: 1, command: 'SET y 10' },
  { term: 2, command: 'ADD x 2' },
];

const INITIAL_NODES: NodeState[] = [
  { id: 1, role: 'Leader', currentTerm: 3, votedFor: 1, log: [...INITIAL_LOG], commitIndex: 2, lastApplied: 2 },
  { id: 2, role: 'Follower', currentTerm: 3, votedFor: 1, log: [...INITIAL_LOG], commitIndex: 2, lastApplied: 2 },
  { id: 3, role: 'Follower', currentTerm: 3, votedFor: 1, log: [...INITIAL_LOG], commitIndex: 2, lastApplied: 2 },
  { id: 4, role: 'Follower', currentTerm: 3, votedFor: 1, log: [...INITIAL_LOG], commitIndex: 2, lastApplied: 2 },
  { id: 5, role: 'Follower', currentTerm: 3, votedFor: 1, log: INITIAL_LOG.slice(0, 2), commitIndex: 1, lastApplied: 1 },
];

// --- Helper Components ---
const TerminalPanel = ({ title, children, className = '' }: { title: string, children: React.ReactNode, className?: string }) => (
  <div className={`border border-[#333] bg-[#050505] flex flex-col ${className}`}>
    <div className="bg-[#111] border-b border-[#333] px-3 py-1 text-xs font-bold tracking-widest text-[#555] uppercase flex justify-between items-center">
      <span>{title}</span>
      <div className="flex gap-1.5">
        <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
        <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
        <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
      </div>
    </div>
    <div className="p-4 flex-1 overflow-hidden flex flex-col">
      {children}
    </div>
  </div>
);

const StatusIndicator = ({ role }: { role: Role }) => {
  const colors = {
    Leader: 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]',
    Follower: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]',
    Candidate: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]',
    Offline: 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)]',
  };
  return (
    <div className="flex items-center gap-2 w-24">
      <div className={`w-2.5 h-2.5 rounded-full ${colors[role]}`} />
      <span className="text-xs uppercase tracking-wider text-gray-400">{role}</span>
    </div>
  );
};

export default function App() {
  const [nodes, setNodes] = useState<NodeState[]>(INITIAL_NODES);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  const addEvent = (message: string, type: EventLog['type'] = 'info') => {
    setEvents(prev => [...prev, {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date(),
      message,
      type
    }].slice(-50)); // Keep last 50 events
  };

  // Auto-scroll events
  useEffect(() => {
    if (eventsEndRef.current) {
      eventsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events]);

  // Simulation Step Logic (Mocking the Analysis Data)
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setNodes(prevNodes => {
        const newNodes = [...prevNodes];
        const leader = newNodes.find(n => n.role === 'Leader');
        
        if (!leader) {
          addEvent('CLUSTER WARNING: No leader detected. Election required.', 'warn');
          return newNodes;
        }

        const action = Math.random();

        if (action < 0.4) {
          // Client sends new command to leader
          const newEntry: LogEntry = { term: leader.currentTerm, command: `CMD_${Math.floor(Math.random() * 1000)}` };
          leader.log.push(newEntry);
          addEvent(`[Node ${leader.id}] Appended new entry at index ${leader.log.length - 1}: ${newEntry.command}`, 'info');
        } else if (action < 0.8) {
          // Replicate to followers
          const followers = newNodes.filter(n => n.role === 'Follower');
          const target = followers[Math.floor(Math.random() * followers.length)];
          
          if (target.log.length < leader.log.length) {
            const nextIndex = target.log.length;
            target.log.push(leader.log[nextIndex]);
            addEvent(`[Node ${leader.id}] Replicated index ${nextIndex} to Node ${target.id}`, 'success');
          } else if (target.commitIndex < leader.commitIndex) {
            target.commitIndex = Math.min(leader.commitIndex, target.log.length - 1);
            addEvent(`[Node ${target.id}] Updated commit index to ${target.commitIndex}`, 'info');
          }
        } else {
          // Leader advances commit index if majority has it
          const lastLogIndex = leader.log.length - 1;
          if (leader.commitIndex < lastLogIndex) {
            let matchCount = 1; // Leader has it
            newNodes.filter(n => n.role === 'Follower').forEach(f => {
              if (f.log.length > leader.commitIndex + 1) matchCount++;
            });
            
            if (matchCount > newNodes.length / 2) {
              leader.commitIndex++;
              addEvent(`[Node ${leader.id}] Majority reached. Committed index ${leader.commitIndex}`, 'success');
            }
          }
        }

        return newNodes;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // --- Dynamic Safety Analysis ---
  const checkElectionSafety = () => {
    const leaders = nodes.filter(n => n.role === 'Leader');
    if (leaders.length > 1) return { status: 'Failed', desc: 'Multiple leaders in same term!', color: 'text-red-500' };
    if (leaders.length === 1) return { status: 'Passed', desc: `Node ${leaders[0].id} is sole leader.`, color: 'text-green-500' };
    return { status: 'Warning', desc: 'No active leader.', color: 'text-yellow-500' };
  };

  const checkLogMatching = () => {
    // Simplified check: if index and term match, logs should be identical up to that point
    const leader = nodes.find(n => n.role === 'Leader');
    if (!leader) return { status: 'N/A', desc: 'Awaiting leader.', color: 'text-gray-500' };
    
    let isMatching = true;
    nodes.filter(n => n.role === 'Follower').forEach(f => {
      const minLen = Math.min(leader.log.length, f.log.length);
      for (let i = 0; i < minLen; i++) {
        if (leader.log[i].term === f.log[i].term && leader.log[i].command !== f.log[i].command) {
          isMatching = false;
        }
      }
    });

    return isMatching 
      ? { status: 'Passed', desc: 'Follower logs match leader prefix.', color: 'text-green-500' }
      : { status: 'Failed', desc: 'Log divergence detected!', color: 'text-red-500' };
  };

  const electionSafety = checkElectionSafety();
  const logMatching = checkLogMatching();

  return (
    <div className="min-h-screen bg-[#020202] text-[#e0e0e0] font-mono p-4 lg:p-6 flex flex-col relative overflow-hidden">
      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-50 opacity-20"></div>

      {/* Header */}
      <header className="flex justify-between items-end mb-6 border-b border-[#333] pb-4 relative z-10">
        <div>
          <h1 className="text-2xl font-bold text-cyan-400 tracking-tight flex items-center gap-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
            RAFT_ANALYSIS_SUBSYSTEM
          </h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Distributed Consensus Output & Invariant Monitor</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border transition-colors ${isPlaying ? 'border-red-500 text-red-500 hover:bg-red-500/10' : 'border-green-500 text-green-500 hover:bg-green-500/10'}`}
          >
            {isPlaying ? '■ Halt Simulation' : '▶ Auto-Step Analysis'}
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 relative z-10 min-h-0">
        
        {/* Left Column: Cluster State & Logs */}
        <TerminalPanel title="Cluster Log Replication State" className="lg:col-span-2">
          <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
            {nodes.map(node => (
              <div key={node.id} className="border border-[#222] bg-[#0a0a0a] p-3 rounded-sm flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-[#222] pb-2">
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-gray-300">N{node.id}</span>
                    <StatusIndicator role={node.role} />
                  </div>
                  <div className="flex gap-6 text-xs text-gray-500">
                    <span>TERM: <span className="text-cyan-400">{node.currentTerm}</span></span>
                    <span>COMMIT_IDX: <span className="text-green-400">{node.commitIndex}</span></span>
                  </div>
                </div>
                
                {/* Log Visualization */}
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar items-center min-h-[3rem]">
                  {node.log.length === 0 && <span className="text-xs text-gray-600 italic">Log empty</span>}
                  {node.log.map((entry, idx) => {
                    const isCommitted = idx <= node.commitIndex;
                    return (
                      <div 
                        key={idx} 
                        className={`flex flex-col min-w-[4.5rem] text-center border text-xs transition-all duration-300 ${
                          isCommitted 
                            ? 'border-green-500/50 bg-green-500/10' 
                            : 'border-gray-600 bg-[#111] opacity-70'
                        }`}
                      >
                        <div className={`border-b px-1 py-0.5 ${isCommitted ? 'border-green-500/50 text-green-400' : 'border-gray-600 text-gray-400'}`}>
                          i:{idx} t:{entry.term}
                        </div>
                        <div className={`px-1 py-1 font-bold ${isCommitted ? 'text-green-300' : 'text-gray-500'}`}>
                          {entry.command.split(' ')[0]}
                        </div>
                      </div>
                    );
                  })}
                  {/* Next index placeholder */}
                  <div className="min-w-[4.5rem] h-full border border-dashed border-[#333] flex items-center justify-center text-[#333] text-xs">
                    ...
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TerminalPanel>

        {/* Right Column: Safety & Events */}
        <div className="flex flex-col gap-6">
          
          {/* Safety Checklist */}
          <TerminalPanel title="Invariant Monitor" className="h-1/2">
            <div className="flex flex-col gap-3">
              <div className="border border-[#222] p-3 bg-[#0a0a0a]">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-gray-300">1. Election Safety</span>
                  <span className={`text-xs font-bold ${electionSafety.color}`}>{electionSafety.status}</span>
                </div>
                <p className="text-[10px] text-gray-500 mb-2">At most one leader can be elected in a given term.</p>
                <div className="text-xs text-cyan-500/80 font-mono bg-cyan-950/20 px-2 py-1 border border-cyan-900/50">
                  &gt; {electionSafety.desc}
                </div>
              </div>

              <div className="border border-[#222] p-3 bg-[#0a0a0a]">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-gray-300">2. Log Matching</span>
                  <span className={`text-xs font-bold ${logMatching.color}`}>{logMatching.status}</span>
                </div>
                <p className="text-[10px] text-gray-500 mb-2">If two logs contain an entry with the same index and term, they are identical in all preceding entries.</p>
                <div className="text-xs text-cyan-500/80 font-mono bg-cyan-950/20 px-2 py-1 border border-cyan-900/50">
                  &gt; {logMatching.desc}
                </div>
              </div>

              <div className="border border-[#222] p-3 bg-[#0a0a0a] opacity-60">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-gray-300">3. Leader Completeness</span>
                  <span className="text-xs font-bold text-gray-500">Monitoring</span>
                </div>
                <p className="text-[10px] text-gray-500">If a log entry is committed, it will be present in the logs of the leaders for all higher-numbered terms.</p>
              </div>
            </div>
          </TerminalPanel>

          {/* Event Console */}
          <TerminalPanel title="System Event Output" className="h-1/2">
            <div className="flex-1 overflow-y-auto font-mono text-xs flex flex-col gap-1 custom-scrollbar pb-2">
              {events.length === 0 && <div className="text-gray-600 italic">Awaiting events...</div>}
              {events.map(ev => {
                const colors = {
                  info: 'text-gray-400',
                  warn: 'text-yellow-400',
                  error: 'text-red-400',
                  success: 'text-green-400'
                };
                return (
                  <div key={ev.id} className="flex gap-3 hover:bg-[#111] px-1 rounded">
                    <span className="text-gray-600 shrink-0">
                      [{ev.timestamp.toISOString().substring(11, 23)}]
                    </span>
                    <span className={`${colors[ev.type]} break-words`}>
                      {ev.message}
                    </span>
                  </div>
                );
              })}
              <div ref={eventsEndRef} />
            </div>
          </TerminalPanel>
          
        </div>
      </div>

      {/* Embedded Styles for custom scrollbar to maintain terminal look */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #050505;
          border-left: 1px solid #222;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}} />
    </div>
  );
}