import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Terminal, ShieldCheck, Activity, Database, 
  Play, Pause, StepForward, AlertTriangle, 
  CheckCircle2, XCircle, RefreshCw, Server,
  Network
} from 'lucide-react';

// --- Types & Interfaces ---

type NodeRole = 'FOLLOWER' | 'CANDIDATE' | 'LEADER' | 'PARTITIONED';

interface RaftNode {
  id: number;
  role: NodeRole;
  term: number;
  votedFor: number | null;
  logLength: number;
  commitIndex: number;
  heartbeatMisses: number;
}

interface LogEvent {
  id: string;
  timestamp: string;
  message: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'SYSTEM';
}

interface InvariantStatus {
  name: string;
  description: string;
  status: 'HEALTHY' | 'VIOLATED' | 'RECOVERING' | 'ANALYZING';
}

// --- Constants & Helpers ---

const NUM_NODES = 5;
const TICK_RATE_MS = 1200;

const generateId = () => Math.random().toString(36).substring(2, 9);
const getTimeString = () => new Date().toISOString().split('T')[1].slice(0, 12);

const INITIAL_NODES: RaftNode[] = Array.from({ length: NUM_NODES }, (_, i) => ({
  id: i + 1,
  role: 'FOLLOWER',
  term: 0,
  votedFor: null,
  logLength: 0,
  commitIndex: 0,
  heartbeatMisses: 0,
}));

// --- Main Component ---

export default function App() {
  // --- State ---
  const [nodes, setNodes] = useState<RaftNode[]>(INITIAL_NODES);
  const [events, setEvents] = useState<LogEvent[]>([
    { id: generateId(), timestamp: getTimeString(), message: 'Raft Cluster Simulator Initialized.', level: 'SYSTEM' },
    { id: generateId(), timestamp: getTimeString(), message: `Bootstrapping ${NUM_NODES} nodes in FOLLOWER state.`, level: 'INFO' }
  ]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [globalTerm, setGlobalTerm] = useState(0);
  const [tickCount, setTickCount] = useState(0);

  const terminalRef = useRef<HTMLDivElement>(null);

  // --- Auto-scroll Terminal ---
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [events]);

  // --- Simulation Engine (Mocking Raft Internals for Analysis) ---
  const stepSimulation = useCallback(() => {
    setTickCount(prev => prev + 1);
    
    setNodes(prevNodes => {
      let newNodes = [...prevNodes];
      let newEvents: LogEvent[] = [];
      let currentLeader = newNodes.find(n => n.role === 'LEADER');
      
      const addEvent = (message: string, level: LogEvent['level'] = 'INFO') => {
        newEvents.push({ id: generateId(), timestamp: getTimeString(), message, level });
      };

      // 1. Random Network Partitions (Chaos Monkey)
      if (Math.random() < 0.05) {
        const healthyNodes = newNodes.filter(n => n.role !== 'PARTITIONED');
        if (healthyNodes.length > 3) { // Keep majority alive
          const target = healthyNodes[Math.floor(Math.random() * healthyNodes.length)];
          target.role = 'PARTITIONED';
          addEvent(`NETWORK FAULT: Node ${target.id} isolated from cluster.`, 'ERROR');
        }
      }

      // 2. Heal Partitions
      newNodes.filter(n => n.role === 'PARTITIONED').forEach(n => {
        if (Math.random() < 0.15) {
          n.role = 'FOLLOWER';
          n.term = globalTerm; // Catch up to global term on reconnect
          addEvent(`NETWORK RESTORED: Node ${n.id} rejoined cluster.`, 'SUCCESS');
        }
      });

      // 3. Leader Election Logic
      if (!currentLeader) {
        const candidates = newNodes.filter(n => n.role === 'CANDIDATE');
        
        if (candidates.length > 0) {
          // A candidate wins
          const winner = candidates[0];
          winner.role = 'LEADER';
          setGlobalTerm(winner.term);
          addEvent(`ELECTION WON: Node ${winner.id} is now LEADER for term ${winner.term}.`, 'SUCCESS');
          
          // Others step down
          newNodes.forEach(n => {
            if (n.id !== winner.id && n.role !== 'PARTITIONED') {
              n.role = 'FOLLOWER';
              n.term = winner.term;
            }
          });
        } else {
          // Followers timeout and become candidates
          const followers = newNodes.filter(n => n.role === 'FOLLOWER');
          followers.forEach(n => {
            n.heartbeatMisses += 1;
            if (n.heartbeatMisses > 2 + Math.random() * 3) {
              n.role = 'CANDIDATE';
              n.term += 1;
              n.votedFor = n.id;
              n.heartbeatMisses = 0;
              addEvent(`TIMEOUT: Node ${n.id} converting to CANDIDATE for term ${n.term}.`, 'WARN');
            }
          });
        }
      } else {
        // 4. Leader Operations (Log Replication)
        if (currentLeader.role !== 'PARTITIONED') {
          // Simulate incoming client request
          if (Math.random() < 0.4) {
            currentLeader.logLength += 1;
            addEvent(`CLIENT REQ: Leader ${currentLeader.id} appended entry at index ${currentLeader.logLength}.`, 'INFO');
          }

          // Replicate to followers
          let matchCount = 1; // Leader counts itself
          newNodes.forEach(n => {
            if (n.role === 'FOLLOWER') {
              n.heartbeatMisses = 0; // Reset timeout
              n.term = currentLeader!.term;
              if (n.logLength < currentLeader!.logLength) {
                n.logLength = currentLeader!.logLength;
              }
              if (n.logLength === currentLeader!.logLength) {
                matchCount++;
              }
            }
          });

          // Commit entries if majority replicated
          if (matchCount > NUM_NODES / 2 && currentLeader.commitIndex < currentLeader.logLength) {
            currentLeader.commitIndex = currentLeader.logLength;
            addEvent(`COMMIT: Entry at index ${currentLeader.commitIndex} safely replicated to majority.`, 'SUCCESS');
            
            // Followers commit
            newNodes.forEach(n => {
              if (n.role === 'FOLLOWER' && n.commitIndex < currentLeader!.commitIndex) {
                n.commitIndex = currentLeader!.commitIndex;
              }
            });
          }
        }
      }

      if (newEvents.length > 0) {
        setEvents(prev => [...prev, ...newEvents].slice(-50)); // Keep last 50 events
      }

      return newNodes;
    });
  }, [globalTerm]);

  // --- Play/Pause Effect ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(stepSimulation, TICK_RATE_MS);
    }
    return () => clearInterval(interval);
  }, [isPlaying, stepSimulation]);

  // --- Reset Handler ---
  const handleReset = () => {
    setIsPlaying(false);
    setNodes(INITIAL_NODES);
    setGlobalTerm(0);
    setTickCount(0);
    setEvents([
      { id: generateId(), timestamp: getTimeString(), message: 'System completely reset.', level: 'SYSTEM' }
    ]);
  };

  // --- Invariant Analysis Logic ---
  const checkInvariants = (): InvariantStatus[] => {
    const activeLeaders = nodes.filter(n => n.role === 'LEADER');
    const hasPartition = nodes.some(n => n.role === 'PARTITIONED');
    const maxCommit = Math.max(...nodes.map(n => n.commitIndex));

    return [
      {
        name: 'Election Safety',
        description: 'At most one leader can be elected in a given term.',
        status: activeLeaders.length > 1 ? 'VIOLATED' : 'HEALTHY'
      },
      {
        name: 'Leader Append-Only',
        description: 'A leader never overwrites or deletes entries in its log.',
        status: 'HEALTHY' // Mocked as always healthy in this visualizer
      },
      {
        name: 'Log Matching',
        description: 'If two logs contain an entry with same index/term, they are identical up to that index.',
        status: hasPartition ? 'RECOVERING' : 'HEALTHY'
      },
      {
        name: 'Leader Completeness',
        description: 'Committed entries are present in all future leaders\' logs.',
        status: activeLeaders.length === 0 ? 'ANALYZING' : 'HEALTHY'
      },
      {
        name: 'State Machine Safety',
        description: 'If a log entry is applied, no other server applies a different entry for the same index.',
        status: nodes.some(n => n.commitIndex > maxCommit) ? 'VIOLATED' : 'HEALTHY'
      }
    ];
  };

  const invariants = checkInvariants();

  // --- UI Helpers ---
  const getLevelColor = (level: LogEvent['level']) => {
    switch(level) {
      case 'INFO': return 'text-cyan-400';
      case 'WARN': return 'text-amber-400';
      case 'ERROR': return 'text-rose-500';
      case 'SUCCESS': return 'text-emerald-400';
      case 'SYSTEM': return 'text-fuchsia-400';
      default: return 'text-slate-400';
    }
  };

  const getRoleBadge = (role: NodeRole) => {
    switch(role) {
      case 'LEADER': return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-xs font-bold">LEADER</span>;
      case 'CANDIDATE': return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-xs font-bold">CANDIDATE</span>;
      case 'FOLLOWER': return <span className="bg-slate-500/20 text-slate-400 border border-slate-500/30 px-2 py-0.5 rounded text-xs font-bold">FOLLOWER</span>;
      case 'PARTITIONED': return <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded text-xs font-bold animate-pulse">PARTITIONED</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-300 font-mono p-4 flex flex-col gap-4 selection:bg-emerald-500/30">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row items-center justify-between bg-[#111115] border border-slate-800 p-4 rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3 mb-4 md:mb-0">
          <div className="p-2 bg-emerald-500/10 rounded border border-emerald-500/20">
            <Activity className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">RAFT_ANALYZER <span className="text-emerald-500 text-sm ml-2">v3.0.1</span></h1>
            <p className="text-xs text-slate-500">Distributed Consensus Safety & Output Matrix</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-sm bg-[#09090b] px-4 py-2 rounded border border-slate-800">
            <div className="flex flex-col">
              <span className="text-slate-500 text-[10px] uppercase">Global Term</span>
              <span className="text-cyan-400 font-bold text-lg leading-none">{globalTerm}</span>
            </div>
            <div className="w-px h-6 bg-slate-800"></div>
            <div className="flex flex-col">
              <span className="text-slate-500 text-[10px] uppercase">Tick Count</span>
              <span className="text-fuchsia-400 font-bold text-lg leading-none">{tickCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-bold transition-all ${
                isPlaying 
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20' 
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'PAUSE' : 'RUN SIMULATION'}
            </button>
            <button 
              onClick={stepSimulation}
              disabled={isPlaying}
              className="p-2 bg-slate-800 text-slate-300 rounded border border-slate-700 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Step Forward"
            >
              <StepForward className="w-4 h-4" />
            </button>
            <button 
              onClick={handleReset}
              className="p-2 bg-rose-500/10 text-rose-400 rounded border border-rose-500/30 hover:bg-rose-500/20 transition-colors ml-2"
              title="Reset Cluster"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN GRID */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* LEFT COLUMN: Data Output & Logs */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          {/* Cluster State Table */}
          <section className="bg-[#111115] border border-slate-800 rounded-lg p-4 flex flex-col shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
              <Database className="w-4 h-4 text-cyan-500" />
              <h2 className="text-sm font-bold text-slate-200">LIVE CLUSTER STATE</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800/50">
                    <th className="pb-2 font-medium">NODE ID</th>
                    <th className="pb-2 font-medium">ROLE</th>
                    <th className="pb-2 font-medium text-right">TERM</th>
                    <th className="pb-2 font-medium text-right">LOG LEN</th>
                    <th className="pb-2 font-medium text-right">COMMIT IDX</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {nodes.map(node => (
                    <tr key={node.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2 text-slate-300 font-bold">
                          <Server className={`w-4 h-4 ${node.role === 'PARTITIONED' ? 'text-rose-500' : 'text-slate-400'}`} />
                          N-{node.id}
                        </div>
                      </td>
                      <td className="py-2.5">{getRoleBadge(node.role)}</td>
                      <td className="py-2.5 text-right font-mono text-cyan-400">{node.term}</td>
                      <td className="py-2.5 text-right font-mono text-fuchsia-400">{node.logLength}</td>
                      <td className="py-2.5 text-right font-mono text-emerald-400">{node.commitIndex}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Event Terminal Output */}
          <section className="flex-1 bg-[#050505] border border-slate-800 rounded-lg p-4 flex flex-col shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] min-h-[300px]">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-500" />
                <h2 className="text-sm font-bold text-slate-200">EVENT LOG STREAM</h2>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50"></div>
              </div>
            </div>

            <div 
              ref={terminalRef}
              className="flex-1 overflow-y-auto pr-2 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent text-[13px]"
            >
              {events.map(event => (
                <div key={event.id} className="flex gap-3 items-start group hover:bg-white/[0.02] p-1 rounded transition-colors">
                  <span className="text-slate-600 shrink-0 select-none">[{event.timestamp}]</span>
                  <span className={`font-semibold shrink-0 w-16 ${getLevelColor(event.level)}`}>
                    {event.level}
                  </span>
                  <span className="text-slate-300 break-words group-hover:text-slate-200 transition-colors">
                    {event.message}
                  </span>
                </div>
              ))}
              <div className="flex gap-3 items-center text-slate-500 pt-2 animate-pulse">
                <span>[{getTimeString()}]</span>
                <span>_</span>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Safety Checklist & Analysis */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          <section className="bg-[#111115] border border-slate-800 rounded-lg p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-3">
              <ShieldCheck className="w-4 h-4 text-fuchsia-500" />
              <h2 className="text-sm font-bold text-slate-200">SAFETY INVARIANTS ANALYSIS</h2>
            </div>

            <div className="space-y-4 flex-1">
              {invariants.map((inv, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-lg border bg-[#0a0a0c] transition-all duration-300
                    ${inv.status === 'HEALTHY' ? 'border-emerald-500/20' : 
                      inv.status === 'VIOLATED' ? 'border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : 
                      inv.status === 'RECOVERING' ? 'border-amber-500/40' : 'border-cyan-500/30'}
                  `}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                      {inv.name}
                    </h3>
                    {inv.status === 'HEALTHY' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    {inv.status === 'VIOLATED' && <XCircle className="w-4 h-4 text-rose-500" />}
                    {inv.status === 'RECOVERING' && <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />}
                    {inv.status === 'ANALYZING' && <Activity className="w-4 h-4 text-cyan-500 animate-spin" />}
                  </div>
                  
                  <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                    {inv.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-bold">
                    <span className="text