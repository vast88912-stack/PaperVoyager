import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, RotateCcw, ShieldCheck, Terminal, Server, Activity, GitCommit, Network } from 'lucide-react';

// --- Types & Interfaces ---
type NodeState = 'Leader' | 'Follower' | 'Candidate' | 'Offline';

interface RaftNode {
  id: number;
  state: NodeState;
  term: number;
  commitIndex: number;
  logLength: number;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SYSTEM';
  message: string;
}

// --- Helper Functions ---
const generateSeed = () => Math.random().toString(36).substring(2, 8).toUpperCase();
const getTimestamp = () => new Date().toISOString().split('T')[1].replace('Z', '');

// --- Main Component ---
export default function App() {
  // --- State ---
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [seed, setSeed] = useState<string>(generateSeed());
  const [tick, setTick] = useState<number>(0);
  
  const [nodes, setNodes] = useState<RaftNode[]>([
    { id: 1, state: 'Leader', term: 1, commitIndex: 0, logLength: 0 },
    { id: 2, state: 'Follower', term: 1, commitIndex: 0, logLength: 0 },
    { id: 3, state: 'Follower', term: 1, commitIndex: 0, logLength: 0 },
    { id: 4, state: 'Follower', term: 1, commitIndex: 0, logLength: 0 },
    { id: 5, state: 'Follower', term: 1, commitIndex: 0, logLength: 0 },
  ]);

  const [systemLogs, setSystemLogs] = useState<LogEntry[]>([
    { id: '1', timestamp: getTimestamp(), level: 'SYSTEM', message: 'RAFT CONSENSUS ANIMATOR INITIALIZED' },
    { id: '2', timestamp: getTimestamp(), level: 'INFO', message: `CLUSTER BOOTSTRAPPED WITH SEED: ${seed}` },
    { id: '3', timestamp: getTimestamp(), level: 'INFO', message: 'NODE 1 ELECTED AS INITIAL LEADER (TERM 1)' },
  ]);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // --- Actions ---
  const addLog = useCallback((level: LogEntry['level'], message: string) => {
    setSystemLogs(prev => [...prev.slice(-49), { id: Math.random().toString(), timestamp: getTimestamp(), level, message }]);
  }, []);

  const resetSimulation = () => {
    const newSeed = generateSeed();
    setSeed(newSeed);
    setIsPlaying(false);
    setTick(0);
    setNodes([
      { id: 1, state: 'Leader', term: 1, commitIndex: 0, logLength: 0 },
      { id: 2, state: 'Follower', term: 1, commitIndex: 0, logLength: 0 },
      { id: 3, state: 'Follower', term: 1, commitIndex: 0, logLength: 0 },
      { id: 4, state: 'Follower', term: 1, commitIndex: 0, logLength: 0 },
      { id: 5, state: 'Follower', term: 1, commitIndex: 0, logLength: 0 },
    ]);
    setSystemLogs([
      { id: Math.random().toString(), timestamp: getTimestamp(), level: 'SYSTEM', message: 'SIMULATION RESET' },
      { id: Math.random().toString(), timestamp: getTimestamp(), level: 'INFO', message: `NEW SEED GENERATED: ${newSeed}` },
    ]);
  };

  const stepSimulation = useCallback(() => {
    setTick(t => t + 1);
    
    setNodes(prevNodes => {
      const nextNodes = [...prevNodes];
      const leaderIndex = nextNodes.findIndex(n => n.state === 'Leader');
      
      const rand = Math.random();
      
      // 1. Leader AppendEntries (Normal operation)
      if (leaderIndex !== -1 && rand < 0.6) {
        const leader = nextNodes[leaderIndex];
        leader.logLength += 1;
        leader.commitIndex = Math.max(0, leader.logLength - 1);
        
        // Followers sync
        let synced = 0;
        nextNodes.forEach(n => {
          if (n.state === 'Follower' || n.state === 'Candidate') {
            if (n.logLength < leader.logLength) {
              n.logLength = leader.logLength;
              n.commitIndex = leader.commitIndex;
              n.term = leader.term;
              synced++;
            }
          }
        });
        if (synced > 0) {
          addLog('INFO', `LEADER ${leader.id} APPENDENTRIES: LOG LENGTH ${leader.logLength}`);
        }
      } 
      // 2. Leader Crash / Partition Simulation
      else if (leaderIndex !== -1 && rand > 0.9) {
        const oldLeader = nextNodes[leaderIndex];
        oldLeader.state = 'Offline';
        addLog('ERROR', `LEADER ${oldLeader.id} PARTITIONED/CRASHED.`);
      }
      // 3. Election Timeout (Follower becomes Candidate)
      else if (leaderIndex === -1 && rand < 0.8) {
        const availableNodes = nextNodes.filter(n => n.state !== 'Offline');
        if (availableNodes.length > 0) {
          const candidate = availableNodes[Math.floor(Math.random() * availableNodes.length)];
          candidate.state = 'Candidate';
          candidate.term += 1;
          addLog('WARN', `ELECTION TIMEOUT: NODE ${candidate.id} BECAME CANDIDATE (TERM ${candidate.term})`);
          
          // Fast-forward to election win for visual simplicity in analysis output
          setTimeout(() => {
             setNodes(curr => {
                const updated = [...curr];
                const c = updated.find(n => n.id === candidate.id);
                if (c && c.state === 'Candidate') {
                   c.state = 'Leader';
                   updated.forEach(n => {
                     if (n.id !== c.id && n.state !== 'Offline') {
                       n.state = 'Follower';
                       n.term = c.term;
                     }
                   });
                   addLog('SYSTEM', `NODE ${c.id} WON ELECTION. NEW LEADER FOR TERM ${c.term}.`);
                }
                return updated;
             });
          }, 1000);
        }
      }
      // 4. Node Recovery
      else if (rand > 0.85) {
        const offlineNode = nextNodes.find(n => n.state === 'Offline');
        if (offlineNode) {
          offlineNode.state = 'Follower';
          addLog('INFO', `NODE ${offlineNode.id} RECOVERED FROM PARTITION.`);
        }
      }

      return nextNodes;
    });
  }, [addLog]);

  // --- Effects ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying) {
      interval = setInterval(() => {
        stepSimulation();
      }, 1500); // 1.5s tick rate
    }
    return () => clearInterval(interval);
  }, [isPlaying, stepSimulation]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [systemLogs]);

  // --- Analysis Helpers ---
  const activeLeader = nodes.find(n => n.state === 'Leader');
  const onlineCount = nodes.filter(n => n.state !== 'Offline').length;
  const quorumMet = onlineCount >= Math.floor(nodes.length / 2) + 1;
  const maxCommit = Math.max(...nodes.map(n => n.commitIndex));
  
  // Invariant checks
  const invElectionSafety = nodes.filter(n => n.state === 'Leader').length <= 1;
  const invLeaderCompleteness = quorumMet; 
  const invLogMatching = nodes.filter(n => n.state !== 'Offline').every(n => n.logLength === activeLeader?.logLength || (!activeLeader));

  return (
    <div className="min-h-screen bg-slate-950 text-green-500 font-mono flex flex-col p-4 selection:bg-green-900 selection:text-green-100">
      
      {/* --- HEADER --- */}
      <header className="flex flex-col md:flex-row justify-between items-center border-b border-green-500/30 pb-4 mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/10 border border-green-500/50 rounded shadow-[0_0_10px_rgba(34,197,94,0.2)]">
            <Network className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-widest text-green-400 uppercase">Raft_Analysis_Core</h1>
            <p className="text-xs text-green-600">v1.0.5 :: Distributed Consensus Animator</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm border border-green-900 bg-black px-3 py-1 rounded">
            <span className="text-green-700">SEED:</span>
            <span className="text-cyan-400">{seed}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm border border-green-900 bg-black px-3 py-1 rounded">
            <span className="text-green-700">TICK:</span>
            <span className="text-yellow-400 w-12 text-right">{tick}</span>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-950 hover:bg-green-900 border border-green-700 rounded text-sm transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'PAUSE' : 'PLAY'}
            </button>
            <button 
              onClick={stepSimulation}
              disabled={isPlaying}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-950 hover:bg-green-900 border border-green-700 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SkipForward className="w-4 h-4" />
              STEP
            </button>
            <button 
              onClick={resetSimulation}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-950/30 hover:bg-red-900/50 border border-red-900 rounded text-sm text-red-400 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              RESET
            </button>
          </div>
        </div>
      </header>

      {/* --- MAIN DASHBOARD --- */}
      <main className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-0">
        
        {/* LEFT COLUMN: Terminal / Log Output (Span 4) */}
        <section className="xl:col-span-4 flex flex-col border border-green-500/20 bg-black/50 rounded-lg overflow-hidden relative shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
          <div className="flex items-center justify-between px-3 py-2 bg-green-900/20 border-b border-green-500/20 text-xs font-bold tracking-wider">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              SYSTEM_EVENT_LOG
            </div>
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs md:text-sm space-y-1 scrollbar-thin scrollbar-thumb-green-900 scrollbar-track-transparent">
            {systemLogs.map(log => (
              <div key={log.id} className="flex gap-3 items-start group">
                <span className="text-green-700 opacity-70 shrink-0">[{log.timestamp}]</span>
                <span className={`shrink-0 w-12 ${
                  log.level === 'INFO' ? 'text-blue-400' :
                  log.level === 'WARN' ? 'text-yellow-400' :
                  log.level === 'ERROR' ? 'text-red-400' :
                  'text-purple-400'
                }`}>
                  {log.level}
                </span>
                <span className={`${
                  log.level === 'ERROR' ? 'text-red-300' : 'text-green-400 group-hover:text-green-300'
                } break-words`}>
                  {log.message}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </section>

        {/* MIDDLE & RIGHT COLUMN: Matrix & Analysis (Span 8) */}
        <section className="xl:col-span-8 flex flex-col gap-6">
          
          {/* Node Matrix */}
          <div className="border border-green-500/20 bg-black/50 rounded-lg overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-900/20 border-b border-green-500/20 text-xs font-bold tracking-wider">
              <Server className="w-4 h-4" />
              CLUSTER_STATE_MATRIX
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-5 gap-4">
              {nodes.map(node => (
                <div 
                  key={node.id} 
                  className={`relative p-3 rounded border bg-black flex flex-col gap-2 transition-all duration-300 ${
                    node.state === 'Leader' ? 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]' :
                    node.state === 'Candidate' ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]' :
                    node.state === 'Offline' ? 'border-red-900 opacity-50' :
                    'border-green-800 hover:border-green-600'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-lg font-bold text-gray-200">N{node.id}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase ${
                      node.state === 'Leader' ? 'bg-cyan-950/50 border-cyan-700 text-cyan-400' :
                      node.state === 'Candidate' ? 'bg-yellow-950/50 border-yellow-700 text-yellow-400' :
                      node.state === 'Offline' ? 'bg-red-950/50 border-red-900 text-red-500' :
                      'bg-green-950/30 border-green-800 text-green-500'
                    }`}>
                      {node.state}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                    <div className="text-green-700">Term:</div>
                    <div className="text-right text-gray-300">{node.term}</div>
                    
                    <div className="text-green-700">Log Len:</div>
                    <div className="text-right text-gray-300">{node.logLength}</div>
                    
                    <div className="text-green-700">Commit:</div>
                    <div className="text-right text-gray-300">{node.commitIndex}</div>
                  </div>
                  
                  {/* Visual Log Tape */}
                  <div className="mt-2 h-2 w-full bg-gray-900 rounded overflow-hidden flex gap-[1px]">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`flex-1 h-full ${
                          i < node.commitIndex ? 'bg-green-500' :
                          i < node.logLength ? 'bg-yellow-500' : 
                          'bg-gray-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Safety Checklist & Invariants */}
          <div className="border border-green-500/20 bg-black/50 rounded-lg overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] flex-1">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-900/20 border-b border-green-500/20 text-xs font-bold tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              SAFETY_INVARIANTS_MONITOR
            </div>
            
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-[calc(100%-2.5rem)]">
              
              {/* Election Safety */}
              <div className="border border-dashed border-green-800 p-4 flex flex-col justify-between bg-black/40">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-gray-300">Election Safety</h3>
                    <div className={`w-3 h-3 rounded-full ${invElectionSafety ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse'}`} />
                  </div>
                  <p className="text-xs text-green-700 mt-2">At most one leader can be elected in a given term.</p>
                </div>
                <div className="mt-4 pt-3 border-t border-green-900/50 text-xs flex justify-between">
                  <span>Current Leaders:</span>
                  <span className="text-cyan-400">{nodes.filter(n => n.state === 'Leader').length}</span>
                </div>
              </div>

              {/* Leader Completeness / Quorum */}
              <div className="border border-dashed border-green-800 p-4 flex flex-col justify-between bg-black/40">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-gray-300">Quorum Health</h3>
                    <div className={`w-3 h-3 rounded-full ${invLeaderCompleteness ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse'}`} />
                  </div>
                  <p className="text-xs text-green-700 mt-2">A majority of nodes must be reachable to commit entries.</p>
                </div>
                <div className="mt-4 pt-3 border-t border-green-900/50 text-xs flex justify-between">
                  <span>Online Nodes:</span>
                  <span className={invLeaderCompleteness ? 'text-green-400' : 'text-red-400'}>{onlineCount} / {nodes.length}</span>
                </div>
              </div>

              {/* Log Matching */}
              <div className="border border-dashed border-green-800 p-4 flex flex-col justify-between bg-black/40">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-gray-300">Log Matching</h3>
                    <div className={`w-3 h-3 rounded-full ${invLogMatching ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-yellow-500 shadow-[0_0_8px_#eab308]'}`} />
                  </div>
                  <p className="text-xs text-green-700 mt-2">If logs share index & term, they are identical in all preceding entries.</p>
                </div>
                <div className="mt-4 pt-3 border-t border-green-900/50 text-xs flex justify-between">
                  <span>Global Max Commit:</span>
                  <span className="text-blue-400 flex items-center gap-1">
                    <GitCommit className="w-3 h-3" />
                    Idx {maxCommit}
                  </span>
                </div>
              </div>

            </div>
          </div>
          
        </section>
      </main>

      {/* --- FOOTER STATUS --- */}
      <footer className="mt-4 border-t border-green-900/50 pt-2 flex justify-between items-center text-[10px] text-green-700">
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 animate-pulse" />
          <span>SIMULATION ENGINE: {isPlaying ? 'RUNNING' : 'HALTED'}</span>
        </div>
        <div>
           RAFT_PROTOCOL_VISUALIZER // CHATGPT_EDITION
        </div>
      </footer>
    </div>
  );
}