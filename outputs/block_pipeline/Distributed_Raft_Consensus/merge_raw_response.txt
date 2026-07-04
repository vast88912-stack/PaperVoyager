import React, { useState, useEffect, useReducer, useRef } from 'react';
import { 
  Terminal, Server, Activity, ShieldAlert, Play, Network, ChevronRight, 
  Pause, StepForward, RotateCcw, ShieldCheck, CheckCircle2, AlertTriangle, 
  Book, Settings, Home, Database
} from 'lucide-react';

// --- Types & Interfaces ---

type Role = 'Follower' | 'Candidate' | 'Leader';
type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';

interface LogEntry {
  term: number;
  command: string;
}

interface SystemLog {
  id: string;
  timestamp: string;
  level: LogLevel;
  nodeId?: number;
  message: string;
}

interface NodeState {
  id: number;
  role: Role;
  term: number;
  votedFor: number | null;
  votesReceived: number;
  log: LogEntry[];
  commitIndex: number;
  electionTimer: number;
  heartbeatTimer: number;
  matchIndex: Record<number, number>;
}

interface Message {
  id: string;
  type: 'RequestVote' | 'VoteReply' | 'AppendEntries' | 'AppendReply';
  from: number;
  to: number;
  term: number;
  payload: any;
  progress: number;
}

interface Config {
  nodeCount: number;
  tickMs: number;
  latencyTicks: number;
  packetLoss: number;
  partitions: Record<string, boolean>;
}

interface InvariantStatus {
  id: string;
  name: string;
  description: string;
  status: 'valid' | 'violated' | 'checking';
  lastChecked: string;
}

interface SimState {
  nodes: NodeState[];
  messages: Message[];
  config: Config;
  time: number;
  isPlaying: boolean;
  seed: string;
  clientReqCount: number;
  systemLogs: SystemLog[];
  invariants: InvariantStatus[];
}

type Action =
  | { type: 'TICK' }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'STEP' }
  | { type: 'RESET' }
  | { type: 'UPDATE_CONFIG'; payload: Partial<Config> }
  | { type: 'TOGGLE_PARTITION'; payload: { n1: number; n2: number } }
  | { type: 'CLIENT_REQUEST' }
  | { type: 'REGENERATE_SEED' };

// --- Constants & Helpers ---

const MIN_ELECTION_TIMEOUT = 30;
const MAX_ELECTION_TIMEOUT = 60;
const HEARTBEAT_INTERVAL = 10;

const generateId = () => Math.random().toString(36).substring(2, 9);
const generateSeed = () => Math.random().toString(36).substring(2, 10).toUpperCase();
const getTime = () => new Date().toISOString().split('T')[1].replace('Z', '').slice(0, 8);

const randomTimeout = () =>
  Math.floor(Math.random() * (MAX_ELECTION_TIMEOUT - MIN_ELECTION_TIMEOUT + 1)) + MIN_ELECTION_TIMEOUT;

const getPartitionKey = (n1: number, n2: number) =>
  n1 < n2 ? `${n1}-${n2}` : `${n2}-${n1}`;

const INITIAL_INVARIANTS: InvariantStatus[] = [
  { id: 'election-safety', name: 'Election Safety', description: 'At most one leader per term.', status: 'valid', lastChecked: '0ms ago' },
  { id: 'leader-append-only', name: 'Leader Append-Only', description: 'Leaders only append to their logs.', status: 'valid', lastChecked: '0ms ago' },
  { id: 'log-matching', name: 'Log Matching', description: 'Matching index/term means identical prefixes.', status: 'valid', lastChecked: '0ms ago' },
  { id: 'leader-completeness', name: 'Leader Completeness', description: 'Committed entries present in all future leaders.', status: 'valid', lastChecked: '0ms ago' },
];

const initNodes = (count: number): NodeState[] =>
  Array.from({ length: count }).map((_, i) => ({
    id: i + 1,
    role: 'Follower',
    term: 0,
    votedFor: null,
    votesReceived: 0,
    log: [],
    commitIndex: 0,
    electionTimer: randomTimeout(),
    heartbeatTimer: 0,
    matchIndex: {},
  }));

const initialState: SimState = {
  nodes: initNodes(5),
  messages: [],
  config: {
    nodeCount: 5,
    tickMs: 50,
    latencyTicks: 20,
    packetLoss: 0,
    partitions: {},
  },
  time: 0,
  isPlaying: false,
  seed: generateSeed(),
  clientReqCount: 0,
  systemLogs: [{ id: generateId(), timestamp: getTime(), level: 'info', message: 'System initialized. Awaiting commands.' }],
  invariants: INITIAL_INVARIANTS,
};

// --- Reducer (Raft Logic Engine) ---

function addLog(logs: SystemLog[], level: LogLevel, message: string, nodeId?: number): SystemLog[] {
  return [...logs, { id: generateId(), timestamp: getTime(), level, message, nodeId }].slice(-100);
}

function raftReducer(state: SimState, action: Action): SimState {
  switch (action.type) {
    case 'TOGGLE_PLAY':
      return { 
        ...state, 
        isPlaying: !state.isPlaying,
        systemLogs: addLog(state.systemLogs, 'info', state.isPlaying ? 'Simulation paused.' : 'Simulation started.')
      };
    case 'STEP':
      return processTick({ ...state, isPlaying: false });
    case 'RESET':
      return {
        ...initialState,
        config: state.config,
        seed: generateSeed(),
        systemLogs: addLog([], 'warn', 'Cluster reset to initial state.')
      };
    case 'UPDATE_CONFIG': {
      const newCount = action.payload.nodeCount || state.config.nodeCount;
      let newNodes = state.nodes;
      if (newCount !== state.config.nodeCount) {
        newNodes = initNodes(newCount);
      }
      return { 
        ...state, 
        config: { ...state.config, ...action.payload },
        nodes: newNodes,
        systemLogs: addLog(state.systemLogs, 'info', 'Configuration updated.')
      };
    }
    case 'TOGGLE_PARTITION': {
      const key = getPartitionKey(action.payload.n1, action.payload.n2);
      const newPartitions = { ...state.config.partitions };
      if (newPartitions[key]) {
        delete newPartitions[key];
      } else {
        newPartitions[key] = true;
      }
      return { 
        ...state, 
        config: { ...state.config, partitions: newPartitions },
        systemLogs: addLog(state.systemLogs, 'warn', `Network link ${action.payload.n1}-${action.payload.n2} toggled.`)
      };
    }
    case 'CLIENT_REQUEST': {
      const leader = state.nodes.find((n) => n.role === 'Leader');
      if (!leader) {
        return { ...state, systemLogs: addLog(state.systemLogs, 'error', 'Client request dropped: No active leader.') };
      }
      const newNodes = state.nodes.map((n) => {
        if (n.id === leader.id) {
          return {
            ...n,
            log: [...n.log, { term: n.term, command: `CMD_${state.clientReqCount + 1}` }],
          };
        }
        return n;
      });
      return { 
        ...state, 
        nodes: newNodes, 
        clientReqCount: state.clientReqCount + 1,
        systemLogs: addLog(state.systemLogs, 'success', `Client request CMD_${state.clientReqCount + 1} received by Leader ${leader.id}.`, leader.id)
      };
    }
    case 'REGENERATE_SEED':
      return { ...state, seed: generateSeed(), systemLogs: addLog(state.systemLogs, 'info', 'New RNG seed generated.') };
    case 'TICK':
      if (!state.isPlaying) return state;
      return processTick(state);
    default:
      return state;
  }
}

function processTick(state: SimState): SimState {
  let newNodes = state.nodes.map((n) => ({ ...n, log: [...n.log], matchIndex: { ...n.matchIndex } }));
  let newMessages: Message[] = [];
  let newLogs = [...state.systemLogs];
  const deliveredMessages: Message[] = [];

  const progressStep = 1.0 / Math.max(1, state.config.latencyTicks);
  
  state.messages.forEach((msg) => {
    if (state.config.partitions[getPartitionKey(msg.from, msg.to)]) {
      return; 
    }
    const nextProgress = msg.progress + progressStep;
    if (nextProgress >= 1.0) {
      deliveredMessages.push(msg);
    } else {
      newMessages.push({ ...msg, progress: nextProgress });
    }
  });

  deliveredMessages.forEach((msg) => {
    const target = newNodes.find((n) => n.id === msg.to);
    if (!target) return;

    if (msg.term > target.term) {
      target.term = msg.term;
      target.role = 'Follower';
      target.votedFor = null;
      target.electionTimer = randomTimeout();
      newLogs = addLog(newLogs, 'info', `Node ${target.id} stepped down to Follower (higher term ${msg.term} seen).`, target.id);
    }

    if (msg.type === 'RequestVote') {
      if (msg.term >= target.term && (target.votedFor === null || target.votedFor === msg.from)) {
        target.votedFor = msg.from;
        target.electionTimer = randomTimeout();
        newMessages.push({ id: generateId(), from: target.id, to: msg.from, type: 'VoteReply', term: target.term, payload: { granted: true }, progress: 0 });
      } else {
        newMessages.push({ id: generateId(), from: target.id, to: msg.from, type: 'VoteReply', term: target.term, payload: { granted: false }, progress: 0 });
      }
    } 
    else if (msg.type === 'VoteReply') {
      if (target.role === 'Candidate' && msg.term === target.term && msg.payload.granted) {
        target.votesReceived += 1;
        if (target.votesReceived > Math.floor(state.config.nodeCount / 2)) {
          target.role = 'Leader';
          target.matchIndex = {};
          newNodes.forEach(n => { target.matchIndex[n.id] = 0; });
          target.heartbeatTimer = 0;
          newLogs = addLog(newLogs, 'success', `Node ${target.id} elected Leader for term ${target.term}.`, target.id);
        }
      }
    } 
    else if (msg.type === 'AppendEntries') {
      if (msg.term >= target.term) {
        target.role = 'Follower';
        target.electionTimer = randomTimeout();
        
        if (msg.payload.log) {
          target.log = [...msg.payload.log];
        }
        if (msg.payload.leaderCommit > target.commitIndex) {
          target.commitIndex = Math.min(msg.payload.leaderCommit, target.log.length);
        }
        
        newMessages.push({ id: generateId(), from: target.id, to: msg.from, type: 'AppendReply', term: target.term, payload: { success: true, matchIndex: target.log.length }, progress: 0 });
      } else {
        newMessages.push({ id: generateId(), from: target.id, to: msg.from, type: 'AppendReply', term: target.term, payload: { success: false }, progress: 0 });
      }
    }
    else if (msg.type === 'AppendReply') {
      if (target.role === 'Leader' && msg.term === target.term && msg.payload.success) {
        target.matchIndex[msg.from] = msg.payload.matchIndex;
        
        const matchIndices = newNodes.map(n => n.id === target.id ? target.log.length : (target.matchIndex[n.id] || 0));
        matchIndices.sort((a, b) => b - a);
        const majorityIndex = matchIndices[Math.floor(state.config.nodeCount / 2)];
        
        if (majorityIndex > target.commitIndex && target.log[majorityIndex - 1]?.term === target.term) {
          target.commitIndex = majorityIndex;
          newLogs = addLog(newLogs, 'success', `Leader ${target.id} committed log index ${majorityIndex}.`, target.id);
        }
      }
    }
  });

  newNodes.forEach((node) => {
    if (node.role === 'Follower' || node.role === 'Candidate') {
      node.electionTimer -= 1;
      if (node.electionTimer <= 0) {
        node.role = 'Candidate';
        node.term += 1;
        node.votedFor = node.id;
        node.votesReceived = 1;
        node.electionTimer = randomTimeout();
        newLogs = addLog(newLogs, 'warn', `Node ${node.id} election timeout. Starting election for term ${node.term}.`, node.id);
        
        newNodes.forEach((other) => {
          if (other.id !== node.id) {
            if (Math.random() >= (state.config.packetLoss / 100)) {
              newMessages.push({ id: generateId(), from: node.id, to: other.id, type: 'RequestVote', term: node.term, payload: {}, progress: 0 });
            }
          }
        });
      }
    } else if (node.role === 'Leader') {
      node.heartbeatTimer -= 1;
      if (node.heartbeatTimer <= 0) {
        node.heartbeatTimer = HEARTBEAT_INTERVAL;
        newNodes.forEach((other) => {
          if (other.id !== node.id) {
            if (Math.random() >= (state.config.packetLoss / 100)) {
              newMessages.push({ id: generateId(), from: node.id, to: other.id, type: 'AppendEntries', term: node.term, payload: { log: node.log, leaderCommit: node.commitIndex }, progress: 0 });
            }
          }
        });
      }
    }
  });

  // Check Invariants
  let leadersPerTerm: Record<number, number> = {};
  newNodes.forEach(n => {
    if (n.role === 'Leader') {
      leadersPerTerm[n.term] = (leadersPerTerm[n.term] || 0) + 1;
    }
  });
  const electionSafetyValid = Object.values(leadersPerTerm).every(count => count <= 1);
  
  const newInvariants = state.invariants.map(inv => {
    if (inv.id === 'election-safety') {
      return { ...inv, status: electionSafetyValid ? 'valid' : 'violated', lastChecked: 'Just now' } as InvariantStatus;
    }
    return { ...inv, lastChecked: 'Just now' } as InvariantStatus;
  });

  return { ...state, nodes: newNodes, messages: newMessages, time: state.time + 1, systemLogs: newLogs, invariants: newInvariants };
}

// --- Sub-Components ---

function HeroView({ onStart }: { onStart: () => void }) {
  const BOOT_SEQUENCE = [
    { text: "Raft Consensus Animator (ChatGPT Edition) v1.0.0", type: "system" },
    { text: "Initializing distributed environment...", type: "info" },
    { text: "Loading module: Leader Election [OK]", type: "success" },
    { text: "Loading module: Log Replication [OK]", type: "success" },
    { text: "Loading module: Network Partition Sandbox [OK]", type: "success" },
    { text: "Provisioning cluster...", type: "info" },
    { text: "Cluster ready. Awaiting manual start.", type: "warning" }
  ];

  const [logs, setLogs] = useState<{id: number, text: string, type: string}[]>([]);
  const [bootComplete, setBootComplete] = useState(false);

  useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < BOOT_SEQUENCE.length) {
        setLogs(prev => [...prev, { id: Date.now() + currentIndex, ...BOOT_SEQUENCE[currentIndex] }]);
        currentIndex++;
      } else {
        clearInterval(interval);
        setBootComplete(true);
      }
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const getLogColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'system': return 'text-purple-400 font-bold';
      default: return 'text-cyan-400';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(0,255,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />
      
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 z-10">
        <div className="flex flex-col justify-center space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-green-950/50 border border-green-500/30 text-green-400 text-sm mb-2">
              <Activity className="w-4 h-4 animate-pulse" />
              <span>System Status: {bootComplete ? 'ONLINE' : 'BOOTING'}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-cyan-400 to-blue-500">
              Raft Consensus<br />Animator
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed">
              Master distributed systems through interactive visualization. Explore leader election, log replication, and fault tolerance in real-time.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 pt-4">
            <button 
              onClick={onStart}
              disabled={!bootComplete}
              className={`group relative inline-flex items-center justify-center px-8 py-4 font-bold text-black transition-all duration-200 bg-green-500 rounded-md hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed ${bootComplete ? 'shadow-[0_0_20px_rgba(34,197,94,0.4)]' : ''}`}
            >
              <Play className="w-5 h-5 mr-2 fill-current" />
              ENTER SIMULATION
              <ChevronRight className="w-5 h-5 ml-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-800 bg-black/80 shadow-2xl overflow-hidden backdrop-blur-sm flex flex-col h-80">
          <div className="flex items-center px-4 py-2 bg-gray-900 border-b border-gray-800">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="mx-auto flex items-center space-x-2 text-gray-500 text-xs">
              <Terminal className="w-3 h-3" />
              <span>raft-sim-tty1</span>
            </div>
          </div>
          <div className="p-4 flex-1 overflow-y-auto font-mono text-sm space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start space-x-2">
                <span className="text-gray-600 select-none">{`>`}</span>
                <span className={`${getLogColor(log.type)}`}>{log.text}</span>
              </div>
            ))}
            {!bootComplete && (
              <div className="flex items-center space-x-2 text-gray-500">
                <span>{`>`}</span>
                <span className="animate-pulse">_</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SimulationView({ state, dispatch }: { state: SimState, dispatch: React.Dispatch<Action> }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const radius = 140;
  const center = 200;

  const getNodePos = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) };
  };

  const getNodeColor = (role: Role) => {
    if (role === 'Leader') return 'fill-yellow-500 stroke-yellow-300';
    if (role === 'Candidate') return 'fill-blue-500 stroke-blue-300';
    return 'fill-gray-700 stroke-gray-500';
  };

  return (
    <div className="flex flex-col h-full p-6 gap-6">
      <div className="flex justify-between items-center bg-gray-900 border border-gray-800 p-4 rounded-lg shadow-lg">
        <div>
          <h2 className="text-xl font-bold text-green-400 flex items-center gap-2">
            <Network className="w-5 h-5" /> Cluster Sandbox
          </h2>
          <p className="text-xs text-gray-500 mt-1">Click links to toggle network partitions. Click 'Send Request' to simulate client traffic.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => dispatch({ type: 'CLIENT_REQUEST' })} className="px-4 py-2 bg-blue-900/50 text-blue-400 border border-blue-800 rounded hover:bg-blue-800/50 transition-colors text-sm font-bold">
            Send Client Request
          </button>
          <button onClick={() => dispatch({ type: 'TOGGLE_PLAY' })} className={`px-4 py-2 rounded text-sm font-bold transition-colors border ${state.isPlaying ? 'bg-red-900/50 text-red-400 border-red-800 hover:bg-red-900/70' : 'bg-green-900/50 text-green-400 border-green-800 hover:bg-green-900/70'}`}>
            {state.isPlaying ? 'Pause Sim' : 'Play Sim'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-black border border-gray-800 rounded-lg relative overflow-hidden">
        <svg ref={svgRef} viewBox="0 0 400 400" className="w-full max-w-2xl aspect-square">
          {/* Links */}
          {state.nodes.map((n1, i) => 
            state.nodes.slice(i + 1).map(n2 => {
              const p1 = getNodePos(i, state.nodes.length);
              const p2 = getNodePos(i + 1 + state.nodes.slice(i + 1).indexOf(n2), state.nodes.length);
              const isPartitioned = state.config.partitions[getPartitionKey(n1.id, n2.id)];
              return (
                <line 
                  key={`link-${n1.id}-${n2.id}`}
                  x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                  stroke={isPartitioned ? '#ef4444' : '#374151'}
                  strokeWidth={isPartitioned ? 3 : 1}
                  strokeDasharray={isPartitioned ? '5,5' : 'none'}
                  className="cursor-pointer hover:stroke-green-500 transition-colors"
                  onClick={() => dispatch({ type: 'TOGGLE_PARTITION', payload: { n1: n1.id, n2: n2.id } })}
                />
              );
            })
          )}

          {/* Messages */}
          {state.messages.map(msg => {
            const fromIdx = state.nodes.findIndex(n => n.id === msg.from);
            const toIdx = state.nodes.findIndex(n => n.id === msg.to);
            if (fromIdx === -1 || toIdx === -1) return null;
            const p1 = getNodePos(fromIdx, state.nodes.length);
            const p2 = getNodePos(toIdx, state.nodes.length);
            const cx = p1.x + (p2.x - p1.x) * msg.progress;
            const cy = p1.y + (p2.y - p1.y) * msg.progress;
            const color = msg.type === 'AppendEntries' ? '#3b82f6' : msg.type === 'RequestVote' ? '#eab308' : '#22c55e';
            return <circle key={msg.id} cx={cx} cy={cy} r={4} fill={color} />;
          })}

          {/* Nodes */}
          {state.nodes.map((node, i) => {
            const pos = getNodePos(i, state.nodes.length);
            return (
              <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
                <circle r={20} className={`${getNodeColor(node.role)} stroke-2 transition-colors duration-300`} />
                <text textAnchor="middle" dy=".3em" className="fill-white text-xs font-bold font-mono">{node.id}</text>
                <text textAnchor="middle" dy="2.5em" className="fill-gray-400 text-[8px] font-mono">T:{node.term}</text>
                <text textAnchor="middle" dy="-2em" className="fill-gray-400 text-[8px] font-mono">L:{node.log.length}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function ControlsView({ state, dispatch }: { state: SimState, dispatch: React.Dispatch<Action> }) {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="border border-green-900/50 bg-gray-900 p-6 rounded-lg shadow-lg relative">
        <div className="absolute -top-3 left-4 bg-gray-950 px-2 text-xs uppercase tracking-widest text-green-500">
          Execution Controls
        </div>
        <div className="flex items-center justify-center gap-6 py-4">
          <button onClick={() => dispatch({ type: 'TOGGLE_PLAY' })} className="w-16 h-16 flex items-center justify-center border-2 border-green-500 rounded-full hover:bg-green-500 hover:text-black transition-colors text-green-500">
            {state.isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
          </button>
          <button onClick={() => dispatch({ type: 'STEP' })} disabled={state.isPlaying} className="w-12 h-12 flex items-center justify-center border border-gray-600 rounded-full hover:bg-gray-700 transition-colors disabled:opacity-30 text-gray-300">
            <StepForward className="w-5 h-5" />
          </button>
          <div className="w-px h-12 bg-gray-800 mx-2"></div>
          <button onClick={() => dispatch({ type: 'RESET' })} className="w-12 h-12 flex items-center justify-center border border-red-900 text-red-500 rounded-full hover:bg-red-900/50 transition-colors">
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="border border-green-900/50 bg-gray-900 p-6 rounded-lg shadow-lg relative">
        <div className="absolute -top-3 left-4 bg-gray-950 px-2 text-xs uppercase tracking-widest text-green-500">
          Cluster Parameters
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-2">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-end">
              <label className="text-xs uppercase tracking-widest text-gray-400">Cluster Size</label>
              <span className="text-lg font-mono text-green-400">{state.config.nodeCount} Nodes</span>
            </div>
            <input type="range" min="3" max="7" step="2" value={state.config.nodeCount} onChange={(e) => dispatch({ type: 'UPDATE_CONFIG', payload: { nodeCount: parseInt(e.target.value) } })} className="w-full accent-green-500" />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-end">
              <label className="text-xs uppercase tracking-widest text-gray-400">Sim Speed</label>
              <span className="text-lg font-mono text-green-400">{state.config.tickMs}ms</span>
            </div>
            <input type="range" min="20" max="500" step="10" value={state.config.tickMs} onChange={(e) => dispatch({ type: 'UPDATE_CONFIG', payload: { tickMs: parseInt(e.target.value) } })} className="w-full accent-green-500" />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-end">
              <label className="text-xs uppercase tracking-widest text-gray-400">Packet Loss</label>
              <span className={`text-lg font-mono ${state.config.packetLoss > 20 ? 'text-red-400' : 'text-green-400'}`}>{state.config.packetLoss}%</span>
            </div>
            <input type="range" min="0" max="50" step="5" value={state.config.packetLoss} onChange={(e) => dispatch({ type: 'UPDATE_CONFIG', payload: { packetLoss: parseInt(e.target.value) } })} className="w-full accent-green-500" />
          </div>
        </div>
      </div>

      <div className="border border-green-900/50 bg-gray-900 p-6 rounded-lg shadow-lg flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-gray-400 mb-1">RNG Seed</div>
          <div className="font-bold tracking-widest text-xl text-cyan-400 font-mono">{state.seed}</div>
        </div>
        <button onClick={() => dispatch({ type: 'REGENERATE_SEED' })} className="px-4 py-2 border border-cyan-900 text-cyan-400 rounded hover:bg-cyan-900/30 transition-colors text-sm uppercase tracking-widest">
          Re-roll Seed
        </button>
      </div>
    </div>
  );
}

function AnalysisView({ state }: { state: SimState }) {
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.systemLogs]);

  const getLogColor = (level: LogLevel) => {
    switch (level) {
      case 'info': return 'text-gray-400';
      case 'warn': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      case 'success': return 'text-green-400';
      case 'debug': return 'text-gray-500';
      default: return 'text-gray-400';
    }
  };

  const leader = state.nodes.find(n => n.role === 'Leader');
  const maxTerm = Math.max(...state.nodes.map(n => n.term), 0);
  const maxCommit = Math.max(...state.nodes.map(n => n.commitIndex), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full p-6">
      <div className="lg:col-span-7 flex flex-col bg-black border border-gray-800 rounded-lg overflow-hidden shadow-2xl">
        <div className="flex items-center px-4 py-2 bg-gray-900 border-b border-gray-800">
          <Terminal className="w-4 h-4 text-gray-400 mr-2" />
          <span className="text-sm font-semibold text-gray-300">cluster_event_log.sh</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1 text-sm font-mono">
          {state.systemLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 hover:bg-gray-900/50 px-2 py-1 rounded">
              <span className="text-gray-600 shrink-0">[{log.timestamp}]</span>
              {log.nodeId && <span className="shrink-0 font-bold text-blue-400">[N{log.nodeId}]</span>}
              <span className={`${getLogColor(log.level)} break-words`}>{log.message}</span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>

      <div className="lg:col-span-5 flex flex-col gap-6 overflow-y-auto">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 shadow-lg">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-blue-400" /> Live Metrics
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black border border-gray-800 rounded p-3">
              <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Global Tick</div>
              <div className="text-2xl font-bold text-white font-mono">{state.time}</div>
            </div>
            <div className="bg-black border border-gray-800 rounded p-3">
              <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Max Term</div>
              <div className="text-2xl font-bold text-yellow-400 font-mono">{maxTerm}</div>
            </div>
            <div className="bg-black border border-gray-800 rounded p-3 col-span-2 flex items-center justify-between">
              <div>
                <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Current Leader</div>
                <div className="text-xl font-bold text-white">
                  {leader ? `Node ${leader.id}` : 'No Leader (Election)'}
                </div>
              </div>
              {leader ? <Server className="w-8 h-8 text-green-400" /> : <AlertTriangle className="w-8 h-8 text-yellow-500 animate-pulse" />}
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 shadow-lg flex-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-400" /> Safety Invariants
            </h2>
          </div>
          <div className="space-y-3">
            {state.invariants.map((inv) => (
              <div key={inv.id} className="bg-black border border-gray-800 rounded p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {inv.status === 'valid' ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                    <h3 className="text-sm font-bold text-gray-200">{inv.name}</h3>
                  </div>
                  <span className="text-[10px] text-gray-600">Checked: {inv.lastChecked}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{inv.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TheoryView() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-12 overflow-y-auto h-full pb-20">
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-white border-b border-green-900/50 pb-2">1. Protocol Overview</h2>
        <div className="bg-gray-900 border border-gray-800 p-6 rounded shadow-lg">
          <p className="text-gray-300 leading-relaxed mb-4">
            <strong className="text-green-400">Raft</strong> is a consensus algorithm designed to be easy to understand. It is equivalent in fault-tolerance and performance to Paxos. The primary goal of Raft is to manage a Replicated State Machine.
          </p>
          <p className="text-gray-300 leading-relaxed">
            In a replicated state machine, a collection of servers compute identical copies of the same state and can continue operating even if some of the servers are down. Raft ensures that all servers agree on the sequence of commands to execute.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-white border-b border-green-900/50 pb-2">2. Node States</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-700 bg-gray-900 p-4 rounded">
            <h3 className="text-gray-400 font-bold mb-2">FOLLOWER</h3>
            <p className="text-sm text-gray-500">Passive state. Responds to requests from leaders and candidates. If no communication is received, becomes a candidate.</p>
          </div>
          <div className="border border-blue-800 bg-blue-900/20 p-4 rounded">
            <h3 className="text-blue-400 font-bold mb-2">CANDIDATE</h3>
            <p className="text-sm text-gray-500">Active state during elections. Requests votes from other nodes. If it receives a majority, becomes leader.</p>
          </div>
          <div className="border border-yellow-800 bg-yellow-900/20 p-4 rounded">
            <h3 className="text-yellow-400 font-bold mb-2">LEADER</h3>
            <p className="text-sm text-gray-500">Handles all client requests. Replicates log entries to followers. Sends periodic heartbeats to maintain authority.</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-white border-b border-green-900/50 pb-2">3. Leader Election</h2>
        <div className="space-y-4 bg-gray-900 p-6 rounded border border-gray-800">
          <div className="border-l-2 border-yellow-500 pl-4 py-1">
            <h3 className="text-yellow-400 font-bold mb-1">1. Election Timeout</h3>
            <p className="text-sm text-gray-400">Followers wait for heartbeats. If the randomized election timeout fires before a heartbeat is received, the follower transitions to Candidate.</p>
          </div>
          <div className="border-l-2 border-yellow-500 pl-4 py-1">
            <h3 className="text-yellow-400 font-bold mb-1">2. Campaign Phase</h3>
            <p className="text-sm text-gray-400">The candidate increments its current term, votes for itself, and sends RequestVote RPCs to all other servers.</p>
          </div>
          <div className="border-l-2 border-yellow-500 pl-4 py-1">
            <h3 className="text-yellow-400 font-bold mb-1">3. Voting Rules</h3>
            <p className="text-sm text-gray-400">A server votes for a candidate if: it hasn't voted in this term yet, and the candidate's log is at least as up-to-date as its own.</p>
          </div>
          <div className="border-l-2 border-green-500 pl-4 py-1">
            <h3 className="text-green-400 font-bold mb-1">4. Victory</h3>
            <p className="text-sm text-gray-400">If the candidate receives votes from a majority of servers, it becomes the Leader and immediately sends heartbeats to establish authority.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

// --- Main App Component ---

export default function App() {
  const [state, dispatch] = useReducer(raftReducer, initialState);
  const [activeTab, setActiveTab] = useState<'hero' | 'sim' | 'controls' | 'analysis' | 'theory'>('hero');

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (state.isPlaying) {
      timer = setInterval(() => {
        dispatch({ type: 'TICK' });
      }, state.config.tickMs);
    }
    return () => clearInterval(timer);
  }, [state.isPlaying, state.config.tickMs]);

  const navItems = [
    { id: 'hero', label: 'Overview', icon: Home },
    { id: 'sim', label: 'Simulation', icon: Network },
    { id: 'controls', label: 'Controls', icon: Settings },
    { id: 'analysis', label: 'Analysis', icon: Database },
    { id: 'theory', label: 'Theory', icon: Book },
  ] as const;

  return (
    <div className="flex h-screen bg-gray-950 text-gray-300 font-mono overflow-hidden selection:bg-green-900 selection:text-green-100">
      
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-800 bg-black flex flex-col z-20">
        <div className="p-4 border-b border-gray-800 flex items-center gap-3">
          <Terminal className="w-6 h-6 text-green-500" />
          <h1 className="font-bold text-green-500 tracking-wider">RAFT_OS</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <div className="text-xs text-gray-600 uppercase tracking-widest mb-4">Modules</div>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded text-sm transition-all ${
                activeTab === item.id 
                  ? 'bg-green-900/20 text-green-400 border border-green-900/50' 
                  : 'text-gray-500 hover:bg-gray-900 hover:text-gray-300 border border-transparent'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800 text-xs text-gray-600">
          <div>Tick: {state.time}</div>
          <div>Status: {state.isPlaying ? <span className="text-green-500">RUNNING</span> : 'PAUSED'}</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 to-gray-950">
        {activeTab === 'hero' && <HeroView onStart={() => { setActiveTab('sim'); dispatch({ type: 'TOGGLE_PLAY' }); }} />}
        {activeTab === 'sim' && <SimulationView state={state} dispatch={dispatch} />}
        {activeTab === 'controls' && <ControlsView state={state} dispatch={dispatch} />}
        {activeTab === 'analysis' && <AnalysisView state={state} />}
        {activeTab === 'theory' && <TheoryView />}
      </main>
    </div>
  );
}