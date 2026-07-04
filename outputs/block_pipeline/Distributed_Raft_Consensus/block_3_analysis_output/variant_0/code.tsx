import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, StepForward, RotateCcw, ShieldCheck, Terminal, Activity, CheckCircle2, AlertTriangle, Info, Server } from 'lucide-react';

// --- Types & Mock Data ---

type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';

interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  nodeId?: number;
  message: string;
}

interface InvariantStatus {
  id: string;
  name: string;
  description: string;
  status: 'valid' | 'violated' | 'checking';
  lastChecked: string;
}

const INVARIANTS: InvariantStatus[] = [
  {
    id: 'election-safety',
    name: 'Election Safety',
    description: 'At most one leader can be elected in a given term.',
    status: 'valid',
    lastChecked: '0ms ago'
  },
  {
    id: 'leader-append-only',
    name: 'Leader Append-Only',
    description: 'A leader never overwrites or deletes entries in its log; it only appends new entries.',
    status: 'valid',
    lastChecked: '0ms ago'
  },
  {
    id: 'log-matching',
    name: 'Log Matching',
    description: 'If two logs contain an entry with the same index and term, then the logs are identical in all preceding entries.',
    status: 'valid',
    lastChecked: '0ms ago'
  },
  {
    id: 'leader-completeness',
    name: 'Leader Completeness',
    description: 'If a log entry is committed in a given term, then that entry will be present in the logs of the leaders for all higher-numbered terms.',
    status: 'valid',
    lastChecked: '0ms ago'
  },
  {
    id: 'state-machine-safety',
    name: 'State Machine Safety',
    description: 'If a server has applied a log entry at a given index to its state machine, no other server will ever apply a different log entry for the same index.',
    status: 'valid',
    lastChecked: '0ms ago'
  }
];

const NODE_COLORS: Record<number, string> = {
  1: 'text-blue-400',
  2: 'text-purple-400',
  3: 'text-pink-400',
  4: 'text-orange-400',
  5: 'text-teal-400',
};

// --- Helper Functions ---

const generateId = () => Math.random().toString(36).substring(2, 9);
const getTime = () => new Date().toISOString().split('T')[1].replace('Z', '');

// --- Main Component ---

export default function RaftAnalysisOutput() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [term, setTerm] = useState(1);
  const [leaderId, setLeaderId] = useState<number | null>(1);
  const [commitIndex, setCommitIndex] = useState(0);
  const [invariants, setInvariants] = useState<InvariantStatus[]>(INVARIANTS);
  const [activeTab, setActiveTab] = useState<'terminal' | 'metrics'>('terminal');
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const addLog = (level: LogLevel, message: string, nodeId?: number) => {
    setLogs(prev => [...prev, {
      id: generateId(),
      timestamp: getTime(),
      level,
      nodeId,
      message
    }].slice(-100)); // Keep last 100 logs
  };

  // Simulation Tick
  const simulateTick = () => {
    const rand = Math.random();
    
    // Update invariants check time
    setInvariants(prev => prev.map(inv => ({ ...inv, lastChecked: 'Just now' })));

    if (rand < 0.05) {
      // Simulate Partition / Timeout
      const crashedNode = Math.floor(Math.random() * 5) + 1;
      addLog('error', `Network partition detected. Node ${crashedNode} isolated.`, crashedNode);
      if (crashedNode === leaderId) {
        addLog('warn', `Leader ${leaderId} unreachable. Election timeout started.`, crashedNode);
        setLeaderId(null);
      }
    } else if (rand < 0.15 && !leaderId) {
      // Simulate Election
      const newLeader = Math.floor(Math.random() * 5) + 1;
      setTerm(t => t + 1);
      setLeaderId(newLeader);
      addLog('success', `Node ${newLeader} won election for term ${term + 1}.`, newLeader);
      addLog('info', `Term updated to ${term + 1}.`);
    } else if (rand < 0.4 && leaderId) {
      // Simulate AppendEntries (Heartbeat)
      addLog('debug', `Leader ${leaderId} sent AppendEntries (Heartbeat) to followers.`, leaderId);
    } else if (rand < 0.7 && leaderId) {
      // Simulate Client Request & Replication
      const newIndex = commitIndex + 1;
      addLog('info', `Client request received. Replicating entry at index ${newIndex}...`, leaderId);
      setTimeout(() => {
        setCommitIndex(newIndex);
        addLog('success', `Entry ${newIndex} committed across majority.`, leaderId);
      }, 500);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(simulateTick, 1500);
    }
    return () => clearInterval(interval);
  }, [isRunning, leaderId, term, commitIndex]);

  const handleReset = () => {
    setIsRunning(false);
    setLogs([]);
    setTerm(1);
    setLeaderId(1);
    setCommitIndex(0);
    addLog('info', 'Cluster reset to initial state. Node 1 is leader.');
  };

  const getLogColor = (level: LogLevel) => {
    switch (level) {
      case 'info': return 'text-gray-300';
      case 'warn': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      case 'success': return 'text-green-400';
      case 'debug': return 'text-gray-500';
      default: return 'text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-300 font-mono flex flex-col p-4 md:p-6 selection:bg-green-900 selection:text-green-100">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800 pb-4 mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-green-500 flex items-center gap-2">
            <Terminal className="w-6 h-6" />
            Raft_Analysis_Output.exe
          </h1>
          <p className="text-sm text-gray-500 mt-1">Distributed Consensus Telemetry & Invariant Checking</p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3 bg-gray-900 p-2 rounded-md border border-gray-800">
          <button 
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-bold transition-colors ${isRunning ? 'bg-yellow-900/50 text-yellow-500 hover:bg-yellow-900/70' : 'bg-green-900/50 text-green-500 hover:bg-green-900/70'}`}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'PAUSE SIM' : 'START SIM'}
          </button>
          <button 
            onClick={simulateTick}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 rounded text-sm font-bold bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <StepForward className="w-4 h-4" />
            STEP
          </button>
          <div className="w-px h-6 bg-gray-700 mx-1"></div>
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded text-sm font-bold bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            RESET
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* Left Column: Terminal Output (Spans 7 cols) */}
        <div className="lg:col-span-7 flex flex-col bg-black border border-gray-800 rounded-lg overflow-hidden shadow-2xl relative">
          <div className="flex items-center justify-between bg-gray-900 px-4 py-2 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-300">cluster_event_log.sh</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setLogs([])}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                clear
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-1 text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-600 italic">Waiting for cluster events...</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 hover:bg-gray-900/50 px-2 py-1 rounded transition-colors">
                  <span className="text-gray-600 shrink-0">[{log.timestamp}]</span>
                  {log.nodeId && (
                    <span className={`shrink-0 font-bold ${NODE_COLORS[log.nodeId]}`}>
                      [N{log.nodeId}]
                    </span>
                  )}
                  <span className={`${getLogColor(log.level)} break-words`}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Right Column: Analysis & Safety (Spans 5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
          
          {/* Cluster State Metrics */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 shadow-lg">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-blue-400" />
              Live Cluster Metrics
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black border border-gray-800 rounded p-3">
                <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Current Term</div>
                <div className="text-3xl font-bold text-white">{term}</div>
              </div>
              <div className="bg-black border border-gray-800 rounded p-3">
                <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Commit Index</div>
                <div className="text-3xl font-bold text-green-400">{commitIndex}</div>
              </div>
              <div className="bg-black border border-gray-800 rounded p-3 col-span-2 flex items-center justify-between">
                <div>
                  <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Current Leader</div>
                  <div className="text-xl font-bold text-white">
                    {leaderId ? `Node ${leaderId}` : 'No Leader (Election)'}
                  </div>
                </div>
                {leaderId ? (
                  <Server className={`w-8 h-8 ${NODE_COLORS[leaderId]}`} />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-yellow-500 animate-pulse" />
                )}
              </div>
            </div>
          </div>

          {/* Safety Checklist / Invariants */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 shadow-lg flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-400" />
                Safety Invariants
              </h2>
              <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded border border-green-900/50">
                All Checks Passing
              </span>
            </div>
            
            <div className="space-y-3">
              {invariants.map((inv) => (
                <div key={inv.id} className="bg-black border border-gray-800 rounded p-3 group hover:border-gray-700 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {inv.status === 'valid' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      )}
                      <h3 className="text-sm font-bold text-gray-200">{inv.name}</h3>
                    </div>
                    <span className="text-[10px] text-gray-600">Checked: {inv.lastChecked}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    {inv.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* CSS for custom scrollbar to maintain terminal aesthetic */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #000; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333; 
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555; 
        }
      `}} />
    </div>
  );
}