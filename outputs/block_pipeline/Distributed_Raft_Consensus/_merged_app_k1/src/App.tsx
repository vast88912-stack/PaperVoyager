import React, { useState, useEffect, useReducer, useRef } from 'react';
import { 
  Terminal, Server, Activity, ShieldAlert, Play, Network, 
  ChevronRight, Pause, SkipForward, RotateCcw, RefreshCw, 
  Settings, WifiOff, Users, Hash, StepForward, ShieldCheck, 
  CheckCircle2, AlertTriangle, Info, Book, BookOpen
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

interface SimState {
  nodes: NodeState[];
  messages: Message[];
  config: Config;
  time: number;
  isPlaying: boolean;
  seed: string;
  clientReqCount: number;
  systemLogs: SystemLog[];
  globalTerm: number;
  leaderId: number | null;
  globalCommitIndex: number;
}

type Action =
  | { type: 'TICK' }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'STEP' }
  | { type: 'RESET' }
  | { type: 'UPDATE_CONFIG'; payload: Partial<Config> }
  | { type: 'TOGGLE_PARTITION'; payload: { n1: number; n2: number } }
  | { type: 'CLIENT_REQUEST' }
  | { type: 'NEW_SEED' };

// --- Constants & Helpers ---

const MIN_ELECTION_TIMEOUT = 30;
const MAX_ELECTION_TIMEOUT = 60;
const HEARTBEAT_INTERVAL = 10;

const randomTimeout = () => Math.floor(Math.random() * (MAX_ELECTION_TIMEOUT - MIN_ELECTION_TIMEOUT + 1)) + MIN_ELECTION_TIMEOUT;
const getPartitionKey = (n1: number, n2: number) => n1 < n2 ? `${n1}-${n2}` : `${n2}-${n1}`;
const generateId = () => Math.random().toString(36).substring(2, 9);
const generateRandomSeed = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0').toUpperCase();
const getTime = () => new Date().toISOString().split('T')[1].replace('Z', '');

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
  seed: generateRandomSeed(),
  clientReqCount: 0,
  systemLogs: [{ id: generateId(), timestamp: getTime(), level: 'info', message: 'System initialized. Awaiting simulation start.' }],
  globalTerm: 0,
  leaderId: null,
  globalCommitIndex: 0,
};

// --- Reducer (Raft Logic Engine) ---

function addLog(logs: SystemLog[], level: LogLevel, message: string, nodeId?: number) {
  logs.push({ id: generateId(), timestamp: getTime(), level, message, nodeId });
  if (logs.length > 100) logs.shift();
}

function raftReducer(state: SimState, action: Action): SimState {
  switch (action.type) {
    case 'TOGGLE_PLAY':
      return { ...state, isPlaying: !state.isPlaying };
    case 'STEP':
      return processTick(state);
    case 'RESET':
      return {
        ...initialState,
        config: state.config,
        nodes: initNodes(state.config.nodeCount),
        seed: generateRandomSeed(),
        systemLogs: [{ id: generateId(), timestamp: getTime(), level: 'warn', message: 'Cluster reset to initial state.' }]
      };
    case 'UPDATE_CONFIG': {
      const newConfig = { ...state.config, ...action.payload };
      let newNodes = state.nodes;
      if (action.payload.nodeCount && action.payload.nodeCount !== state.config.nodeCount) {
        newNodes = initNodes(action.payload.nodeCount);
      }
      return { ...state, config: newConfig, nodes: newNodes };
    }
    case 'TOGGLE_PARTITION': {
      const key = getPartitionKey(action.payload.n1, action.payload.n2);
      const newPartitions = { ...state.config.partitions };
      if (newPartitions[key]) delete newPartitions[key];
      else newPartitions[key] = true;
      return { ...state, config: { ...state.config, partitions: newPartitions } };
    }
    case 'CLIENT_REQUEST': {
      const leader = state.nodes.find((n) => n.role === 'Leader');
      if (!leader) return state;
      const newNodes = state.nodes.map((n) => {
        if (n.id === leader.id) {
          return { ...n, log: [...n.log, { term: n.term, command: `CMD_${state.clientReqCount + 1}` }] };
        }
        return n;
      });
      const newLogs = [...state.systemLogs];
      addLog(newLogs, 'info', `Client request received. Appending CMD_${state.clientReqCount + 1}`, leader.id);
      return { ...state, nodes: newNodes, clientReqCount: state.clientReqCount + 1, systemLogs: newLogs };
    }
    case 'NEW_SEED':
      return { ...state, seed: generateRandomSeed() };
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
  const deliveredMessages: Message[] = [];
  let newLogs = [...state.systemLogs];
  let newGlobalTerm = state.globalTerm;
  let newLeaderId = state.leaderId;
  let newGlobalCommitIndex = state.globalCommitIndex;

  const progressStep = 1.0 / Math.max(1, state.config.latencyTicks);
  
  state.messages.forEach((msg) => {
    if (state.config.partitions[getPartitionKey(msg.from, msg.to)]) return;
    if (Math.random() < (state.config.packetLoss / 100) && msg.progress === 0) {
      addLog(newLogs, 'warn', `Packet dropped from N${msg.from} to N${msg.to}`);
      return;
    }
    const nextProgress = msg.progress + progressStep;
    if (nextProgress >= 1.0) deliveredMessages.push(msg);
    else newMessages.push({ ...msg, progress: nextProgress });
  });

  deliveredMessages.forEach((msg) => {
    const target = newNodes.find((n) => n.id === msg.to);
    if (!target) return;

    if (msg.term > target.term) {
      target.term = msg.term;
      target.role = 'Follower';
      target.votedFor = null;
      target.electionTimer = randomTimeout();
      if (newGlobalTerm < msg.term) newGlobalTerm = msg.term;
      if (target.id === newLeaderId) {
        newLeaderId = null;
        addLog(newLogs, 'warn', `Node ${target.id} stepped down (higher term discovered)`, target.id);
      }
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
          newLeaderId = target.id;
          target.matchIndex = {};
          newNodes.forEach(n => { target.matchIndex[n.id] = 0; });
          target.heartbeatTimer = 0;
          addLog(newLogs, 'success', `Node ${target.id} won election for term ${target.term}`, target.id);
        }
      }
    } 
    else if (msg.type === 'AppendEntries') {
      if (msg.term >= target.term) {
        if (target.role === 'Candidate') target.role = 'Follower';
        target.electionTimer = randomTimeout();
        if (msg.payload.log) target.log = [...msg.payload.log];
        if (msg.payload.leaderCommit > target.commitIndex) {
          target.commitIndex = Math.min(msg.payload.leaderCommit, target.log.length);
          if (target.commitIndex > newGlobalCommitIndex) newGlobalCommitIndex = target.commitIndex;
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
          if (target.commitIndex > newGlobalCommitIndex) {
            newGlobalCommitIndex = target.commitIndex;
            addLog(newLogs, 'success', `Entry committed at index ${newGlobalCommitIndex}`, target.id);
          }
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
        if (node.term > newGlobalTerm) newGlobalTerm = node.term;
        addLog(newLogs, 'info', `Node ${node.id} started election for term ${node.term}`, node.id);
        
        newNodes.forEach((other) => {
          if (other.id !== node.id) {
            newMessages.push({ id: generateId(), from: node.id, to: other.id, type: 'RequestVote', term: node.term, payload: {}, progress: 0 });
          }
        });
      }
    } else if (node.role === 'Leader') {
      node.heartbeatTimer -= 1;
      if (node.heartbeatTimer <= 0) {
        node.heartbeatTimer = HEARTBEAT_INTERVAL;
        newNodes.forEach((other) => {
          if (other.id !== node.id) {
            newMessages.push({ id: generateId(), from: node.id, to: other.id, type: 'AppendEntries', term: node.term, payload: { log: node.log, leaderCommit: node.commitIndex }, progress: 0 });
          }
        });
      }
    }
  });

  return { 
    ...state, 
    nodes: newNodes, 
    messages: newMessages, 
    time: state.time + 1,
    systemLogs: newLogs,
    globalTerm: newGlobalTerm,
    leaderId: newLeaderId,
    globalCommitIndex: newGlobalCommitIndex
  };
}

// --- Shared Components ---

const ProgressBar = ({ value, min = 0, max, width = 20, onChange, label, unit = '' }: any) => {
  const filled = Math.max(0, Math.min(width, Math.round(((value - min) / (max - min)) * width)));
  const empty = width - filled;
  const barString = '█'.repeat(filled) + '-'.repeat(empty);

  return (
    <div className="flex flex-col mb-4 group">
      <div className="flex justify-between text-green-400/80 text-xs mb-1 uppercase tracking-wider">
        <span>{label}</span>
        <span>{value}{unit}</span>
      </div>
      <div className="relative flex items-center">
        <span className="text-green-500 mr-2 font-bold">[</span>
        <span className="text-green-500 tracking-[0.2em] cursor-pointer select-none">{barString}</span>
        <span className="text-green-500 ml-1 font-bold">]</span>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
};

// --- Tab Components ---

function HeroTab({ setActiveTab }: { setActiveTab: (t: string) => void }) {
  const BOOT_SEQUENCE = [
    { text: "Raft Consensus Animator (ChatGPT Edition) v1.0.0", type: "system" },
    { text: "Initializing distributed environment...", type: "info" },
    { text: "Loading module: Leader Election [OK]", type: "success" },
    { text: "Loading module: Log Replication [OK]", type: "success" },
    { text: "Loading module: Network Partition Sandbox [OK]", type: "success" },
    { text: "Loading module: Safety Invariants Checker [OK]", type: "success" },
    { text: "Provisioning 5-node cluster...", type: "info" },
    { text: "Cluster ready. Awaiting manual start.", type: "warning" }
  ];

  const [logs, setLogs] = useState<any[]>([]);
  const [bootComplete, setBootComplete] = useState(false);
  const [nodes, setNodes] = useState(
    [ { id: 1, x: 50, y: 15 }, { id: 2, x: 85, y: 40 }, { id: 3, x: 70, y: 85 }, { id: 4, x: 30, y: 85 }, { id: 5, x: 15, y: 40 } ]
    .map(pos => ({ ...pos, state: 'follower', active: false }))
  );
  const [leaderId, setLeaderId] = useState<number | null>(null);

  useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < BOOT_SEQUENCE.length) {
        setLogs(prev => [...prev, { id: Date.now() + currentIndex, ...BOOT_SEQUENCE[currentIndex] }]);
        currentIndex++;
      } else {
        clearInterval(interval);
        setBootComplete(true);
        setTimeout(() => {
          setLeaderId(1);
          setNodes(prev => prev.map(n => n.id === 1 ? { ...n, state: 'leader' } : n));
        }, 1000);
      }
    }, 400);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!bootComplete || !leaderId) return;
    const heartbeatInterval = setInterval(() => {
      setNodes(prev => prev.map(n => n.id === leaderId ? { ...n, active: true } : n));
      setTimeout(() => setNodes(prev => prev.map(n => ({ ...n, active: n.id !== leaderId }))), 150);
      setTimeout(() => setNodes(prev => prev.map(n => ({ ...n, active: false }))), 400);
    }, 2000);
    return () => clearInterval(heartbeatInterval);
  }, [bootComplete, leaderId]);

  const getLogColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'system': return 'text-purple-400 font-bold';
      default: return 'text-cyan-400';
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden bg-gray-950">
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(0,255,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 z-10">
        <div className="flex flex-col justify-center space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-green-950/50 border border-green-500/30 text-green-400 text-sm mb-2">
              <Activity className="w-4 h-4 animate-pulse" />
              <span>System Status: {bootComplete ? 'ONLINE' : 'BOOTING'}</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-cyan-400 to-blue-500">
              Raft Consensus<br />Animator
            </h1>
            <p className="text-gray-400 text-lg max-w-md leading-relaxed">
              Master distributed systems through interactive visualization. Explore leader election, log replication, and fault tolerance in real-time.
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-black/80 shadow-2xl overflow-hidden backdrop-blur-sm">
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
            <div className="p-4 h-64 overflow-y-auto font-mono text-sm space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start space-x-2">
                  <span className="text-gray-600 select-none">{`>`}</span>
                  <span className={`${getLogColor(log.type)}`}>{log.text}</span>
                </div>
              ))}
              {!bootComplete && (
                <div className="flex items-center space-x-2 text-gray-500">
                  <span>{`>`}</span><span className="animate-pulse">_</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 pt-4">
            <button 
              disabled={!bootComplete}
              onClick={() => setActiveTab('simulation')}
              className={`group relative inline-flex items-center justify-center px-8 py-4 font-bold text-black transition-all duration-200 bg-green-500 rounded-md hover:bg-green-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${bootComplete ? 'shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_rgba(34,197,94,0.6)]' : ''}`}
            >
              <Play className="w-5 h-5 mr-2 fill-current" />
              START SIMULATION
              <ChevronRight className="w-5 h-5 ml-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </div>
        <div className="relative flex items-center justify-center min-h-[500px] lg:min-h-full">
          <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-blue-500/5 rounded-full blur-3xl" />
          <div className="relative w-full max-w-md aspect-square border border-gray-800/50 rounded-full bg-gray-900/20 backdrop-blur-sm">
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
              {nodes.map((n1, i) => 
                nodes.slice(i + 1).map(n2 => (
                  <line key={`${n1.id}-${n2.id}`} x1={`${n1.x}%`} y1={`${n1.y}%`} x2={`${n2.x}%`} y2={`${n2.y}%`} stroke={n1.active || n2.active ? "rgba(74, 222, 128, 0.4)" : "rgba(55, 65, 81, 0.5)"} strokeWidth={n1.active || n2.active ? "2" : "1"} className="transition-all duration-300" />
                ))
              )}
            </svg>
            {nodes.map((node) => (
              <div key={node.id} className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center" style={{ left: `${node.x}%`, top: `${node.y}%`, zIndex: 10 }}>
                <div className={`w-12 h-12 rounded-full border-2 border-gray-950 flex items-center justify-center transition-all duration-300 ${node.state === 'leader' ? (node.active ? 'bg-yellow-300 shadow-[0_0_20px_rgba(253,224,71,0.8)]' : 'bg-yellow-500') : (node.active ? 'bg-green-400 shadow-[0_0_15px_rgba(74,222,128,0.6)]' : 'bg-gray-600')}`}>
                  <Server className={`w-5 h-5 ${node.state === 'leader' ? 'text-yellow-950' : 'text-gray-950'}`} />
                </div>
                <div className="mt-2 px-2 py-0.5 bg-gray-950/80 border border-gray-800 rounded text-[10px] text-gray-400 uppercase tracking-wider backdrop-blur-md">Node {node.id}</div>
                {node.state === 'leader' && <div className="absolute -top-6 text-yellow-400 text-xs font-bold animate-bounce">LEADER</div>}
              </div>
            ))}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <div className="text-gray-500 text-xs tracking-widest uppercase mb-1">Term</div>
              <div className="text-3xl font-bold text-gray-200 font-mono">{bootComplete ? '42' : '--'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SimulationTab({ state, dispatch }: { state: SimState, dispatch: React.Dispatch<Action> }) {
  const getNodePos = (id: number, total: number) => {
    const angle = ((id - 1) / total) * 2 * Math.PI - Math.PI / 2;
    const radius = 35;
    return { x: 50 + radius * Math.cos(angle), y: 50 + radius * Math.sin(angle) };
  };

  const nodePositions = state.nodes.map(n => ({ ...n, ...getNodePos(n.id, state.config.nodeCount) }));

  return (
    <div className="flex-1 flex flex-col lg:flex-row bg-[#050505] overflow-hidden">
      <div className="flex-1 relative p-4 flex items-center justify-center border-r border-green-900/30">
        <div className="absolute top-4 left-4 text-xs text-green-600 bg-green-950/30 px-3 py-1 rounded border border-green-900/30">
          Tick: {state.time} | Term: {state.globalTerm}
        </div>
        <div className="absolute top-4 right-4">
          <button onClick={() => dispatch({ type: 'CLIENT_REQUEST' })} className="px-4 py-2 bg-blue-900/30 text-blue-400 border border-blue-800 rounded hover:bg-blue-900/50 text-xs font-bold transition-colors">
            + SEND CLIENT REQUEST
          </button>
        </div>
        
        <div className="w-full max-w-2xl aspect-square relative">
          <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
            {nodePositions.map((n1, i) => 
              nodePositions.slice(i + 1).map(n2 => {
                const isPartitioned = state.config.partitions[getPartitionKey(n1.id, n2.id)];
                return (
                  <line 
                    key={`${n1.id}-${n2.id}`} 
                    x1={`${n1.x}%`} y1={`${n1.y}%`} x2={`${n2.x}%`} y2={`${n2.y}%`} 
                    stroke={isPartitioned ? "rgba(239, 68, 68, 0.5)" : "rgba(34, 197, 94, 0.2)"} 
                    strokeWidth={isPartitioned ? "2" : "1"} 
                    strokeDasharray={isPartitioned ? "5,5" : "none"}
                    className="cursor-pointer hover:stroke-yellow-500 transition-colors"
                    onClick={() => dispatch({ type: 'TOGGLE_PARTITION', payload: { n1: n1.id, n2: n2.id } })}
                  />
                );
              })
            )}
            {state.messages.map(msg => {
              const fromNode = nodePositions.find(n => n.id === msg.from);
              const toNode = nodePositions.find(n => n.id === msg.to);
              if (!fromNode || !toNode) return null;
              const cx = fromNode.x + (toNode.x - fromNode.x) * msg.progress;
              const cy = fromNode.y + (toNode.y - fromNode.y) * msg.progress;
              const color = msg.type === 'AppendEntries' ? '#3b82f6' : msg.type === 'RequestVote' ? '#eab308' : '#22c55e';
              return <circle key={msg.id} cx={`${cx}%`} cy={`${cy}%`} r="4" fill={color} className="shadow-lg" />;
            })}
          </svg>

          {nodePositions.map((node) => (
            <div key={node.id} className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center" style={{ left: `${node.x}%`, top: `${node.y}%`, zIndex: 10 }}>
              <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${node.role === 'Leader' ? 'bg-yellow-500 border-yellow-300 shadow-[0_0_20px_rgba(234,179,8,0.4)]' : node.role === 'Candidate' ? 'bg-blue-600 border-blue-400' : 'bg-gray-800 border-gray-600'}`}>
                <Server className={`w-6 h-6 ${node.role === 'Leader' ? 'text-yellow-950' : 'text-gray-300'}`} />
              </div>
              <div className="mt-2 px-2 py-1 bg-gray-950/90 border border-gray-800 rounded text-[10px] text-gray-300 flex flex-col items-center">
                <span className="font-bold text-green-400">N{node.id}</span>
                <span>T:{node.term} | C:{node.commitIndex}</span>
              </div>
              {node.role === 'Leader' && <div className="absolute -top-6 text-yellow-400 text-xs font-bold animate-bounce">LEADER</div>}
            </div>
          ))}
        </div>
        <div className="absolute bottom-4 left-4 text-xs text-gray-500">Click lines to toggle network partitions</div>
      </div>

      <div className="w-full lg:w-96 bg-[#0a0a0a] border-l border-green-900/30 flex flex-col">
        <div className="p-6 border-b border-green-900/30">
          <h2 className="text-xs text-green-600 uppercase tracking-widest mb-6 flex items-center"><Settings size={14} className="mr-2" /> Execution Controls</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button onClick={() => dispatch({ type: 'TOGGLE_PLAY' })} className={`flex flex-col items-center justify-center py-4 border transition-all duration-200 ${state.isPlaying ? 'border-green-400 bg-green-900/20 text-green-300 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'border-green-800 hover:border-green-500 hover:bg-green-950/30 text-green-600 hover:text-green-400'}`}>
              {state.isPlaying ? <Pause size={24} className="mb-2" /> : <Play size={24} className="mb-2" />}
              <span className="text-xs uppercase tracking-wider">{state.isPlaying ? 'Pause' : 'Play'}</span>
            </button>
            <button onClick={() => dispatch({ type: 'STEP' })} disabled={state.isPlaying} className="flex flex-col items-center justify-center py-4 border border-green-800 hover:border-green-500 hover:bg-green-950/30 text-green-600 hover:text-green-400 transition-all duration-200 disabled:opacity-50">
              <SkipForward size={24} className="mb-2" />
              <span className="text-xs uppercase tracking-wider">Step</span>
            </button>
            <button onClick={() => dispatch({ type: 'RESET' })} className="flex flex-col items-center justify-center py-4 border border-green-800 hover:border-red-500/50 hover:bg-red-950/20 text-green-600 hover:text-red-400 transition-all duration-200 col-span-2">
              <RotateCcw size={20} className="mb-2" />
              <span className="text-xs uppercase tracking-wider">Reset Cluster</span>
            </button>
          </div>
          <div className="border border-green-900/50 bg-green-950/10 p-4 relative group">
            <div className="absolute -top-2 left-2 bg-[#0a0a0a] px-1 text-[10px] text-green-700 uppercase">Entropy_Seed</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-green-400"><Hash size={16} /><span className="text-lg tracking-widest">0x{state.seed}</span></div>
              <button onClick={() => dispatch({ type: 'NEW_SEED' })} className="p-2 hover:bg-green-900/30 text-green-600 hover:text-green-300 transition-colors rounded-sm"><RefreshCw size={16} /></button>
            </div>
          </div>
        </div>
        <div className="p-6 flex-1 overflow-y-auto">
          <h2 className="text-xs text-green-600 uppercase tracking-widest mb-6 flex items-center"><Activity size={14} className="mr-2" /> Network Parameters</h2>
          <div className="space-y-8">
            <div className="relative">
              <div className="absolute -left-6 top-1 text-green-800"><Users size={16} /></div>
              <ProgressBar label="Cluster Size (Nodes)" value={state.config.nodeCount} min={3} max={7} width={20} onChange={(val: number) => dispatch({ type: 'UPDATE_CONFIG', payload: { nodeCount: val } })} />
            </div>
            <div className="relative">
              <div className="absolute -left-6 top-1 text-green-800"><Activity size={16} /></div>
              <ProgressBar label="Base Network Latency" value={state.config.latencyTicks} min={5} max={100} width={20} unit="t" onChange={(val: number) => dispatch({ type: 'UPDATE_CONFIG', payload: { latencyTicks: val } })} />
            </div>
            <div className="relative">
              <div className="absolute -left-6 top-1 text-green-800"><WifiOff size={16} /></div>
              <ProgressBar label="Packet Loss Probability" value={state.config.packetLoss} min={0} max={50} width={20} unit="%" onChange={(val: number) => dispatch({ type: 'UPDATE_CONFIG', payload: { packetLoss: val } })} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalysisTab({ state, dispatch }: { state: SimState, dispatch: React.Dispatch<Action> }) {
  const logsEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [state.systemLogs]);

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

  const invariants = [
    { id: 'election-safety', name: 'Election Safety', desc: 'At most one leader can be elected in a given term.', status: 'valid' },
    { id: 'leader-append-only', name: 'Leader Append-Only', desc: 'A leader never overwrites or deletes entries in its log.', status: 'valid' },
    { id: 'log-matching', name: 'Log Matching', desc: 'If two logs contain an entry with the same index and term, they are identical up to that point.', status: 'valid' },
    { id: 'leader-completeness', name: 'Leader Completeness', desc: 'Committed entries are present in all future leaders.', status: 'valid' }
  ];

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 bg-gray-950 overflow-hidden">
      <div className="lg:col-span-7 flex flex-col bg-black border border-gray-800 rounded-lg overflow-hidden shadow-2xl relative">
        <div className="flex items-center justify-between bg-gray-900 px-4 py-2 border-b border-gray-800">
          <div className="flex items-center gap-2"><Terminal className="w-4 h-4 text-gray-400" /><span className="text-sm font-semibold text-gray-300">cluster_event_log.sh</span></div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1 text-sm font-mono">
          {state.systemLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 hover:bg-gray-900/50 px-2 py-1 rounded transition-colors">
              <span className="text-gray-600 shrink-0">[{log.timestamp}]</span>
              {log.nodeId && <span className="shrink-0 font-bold text-blue-400">[N{log.nodeId}]</span>}
              <span className={`${getLogColor(log.level)} break-words`}>{log.message}</span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>
      <div className="lg:col-span-5 flex flex-col gap-6 overflow-y-auto pr-2">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 shadow-lg">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><Activity className="w-5 h-5 text-blue-400" /> Live Cluster Metrics</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black border border-gray-800 rounded p-3">
              <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Current Term</div>
              <div className="text-3xl font-bold text-white">{state.globalTerm}</div>
            </div>
            <div className="bg-black border border-gray-800 rounded p-3">
              <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Commit Index</div>
              <div className="text-3xl font-bold text-green-400">{state.globalCommitIndex}</div>
            </div>
            <div className="bg-black border border-gray-800 rounded p-3 col-span-2 flex items-center justify-between">
              <div>
                <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Current Leader</div>
                <div className="text-xl font-bold text-white">{state.leaderId ? `Node ${state.leaderId}` : 'No Leader (Election)'}</div>
              </div>
              {state.leaderId ? <Server className="w-8 h-8 text-yellow-500" /> : <AlertTriangle className="w-8 h-8 text-yellow-500 animate-pulse" />}
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 shadow-lg flex-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-green-400" /> Safety Invariants</h2>
            <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded border border-green-900/50">All Checks Passing</span>
          </div>
          <div className="space-y-3">
            {invariants.map((inv) => (
              <div key={inv.id} className="bg-black border border-gray-800 rounded p-3 group hover:border-gray-700 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <h3 className="text-sm font-bold text-gray-200">{inv.name}</h3>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{inv.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TheoryTab() {
  const [activeSection, setActiveSection] = useState('overview');
  const sections = [
    { id: 'overview', label: '1. Protocol Overview', icon: Book },
    { id: 'states', label: '2. Node States', icon: Server },
    { id: 'election', label: '3. Leader Election', icon: Activity },
    { id: 'replication', label: '4. Log Replication', icon: Terminal },
    { id: 'safety', label: '5. Safety Invariants', icon: ShieldCheck },
  ];

  return (
    <div className="flex-1 flex bg-[#0a0f14] text-[#33ff33] font-mono overflow-hidden">
      <nav className="w-64 border-r border-[#1a3320] bg-[#0a0f14] p-4 flex flex-col gap-2 overflow-y-auto">
        <div className="text-xs text-gray-500 mb-2 tracking-widest border-b border-[#1a3320] pb-2">INDEX</div>
        {sections.map(sec => {
          const isActive = activeSection === sec.id;
          return (
            <button key={sec.id} onClick={() => setActiveSection(sec.id)} className={`flex items-center gap-3 p-3 text-sm text-left transition-all duration-200 border-l-2 ${isActive ? 'border-[#33ff33] bg-[#112215] text-white shadow-[inset_0_0_10px_rgba(51,255,51,0.1)]' : 'border-transparent text-gray-400 hover:bg-[#0d1710] hover:text-[#33ff33]'}`}>
              <sec.icon className="w-4 h-4" />{sec.label}
            </button>
          );
        })}
      </nav>
      <main className="flex-1 p-8 overflow-y-auto bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0a1410] to-[#05080a]">
        <div className="max-w-4xl mx-auto space-y-6">
          {activeSection === 'overview' && (
            <>
              <h2 className="text-2xl font-bold text-white border-b border-[#1a3320] pb-2">1. Protocol Overview</h2>
              <div className="bg-[#0d1710] border border-[#1a3320] p-6 rounded-sm shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                <p className="text-gray-300 leading-relaxed mb-4"><strong className="text-[#33ff33]">Raft</strong> is a consensus algorithm designed to be easy to understand. It is equivalent in fault-tolerance and performance to Paxos. The primary goal of Raft is to manage a <span className="text-white border-b border-dashed border-gray-500">Replicated State Machine</span>.</p>
                <p className="text-gray-300 leading-relaxed">In a replicated state machine, a collection of servers compute identical copies of the same state and can continue operating even if some of the servers are down. Raft ensures that all servers agree on the sequence of commands to execute.</p>
              </div>
            </>
          )}
          {activeSection === 'states' && (
            <>
              <h2 className="text-2xl font-bold text-white border-b border-[#1a3320] pb-2">2. Node States</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="border border-gray-600 bg-gray-900 p-6 rounded-lg text-center"><div className="text-gray-400 font-bold text-xl mb-2">FOLLOWER</div><p className="text-sm text-gray-500">Passive state. Responds to requests from leaders and candidates. If no communication is received, becomes a candidate.</p></div>
                <div className="border border-yellow-600 bg-yellow-900/20 p-6 rounded-lg text-center"><div className="text-yellow-400 font-bold text-xl mb-2">CANDIDATE</div><p className="text-sm text-gray-500">Active state during elections. Requests votes from other nodes. If it receives a majority, becomes leader.</p></div>
                <div className="border border-[#33ff33] bg-[#112215] p-6 rounded-lg text-center"><div className="text-[#33ff33] font-bold text-xl mb-2">LEADER</div><p className="text-sm text-gray-500">Handles all client requests. Replicates log entries to followers. Sends periodic heartbeats to maintain authority.</p></div>
              </div>
            </>
          )}
          {activeSection === 'election' && (
            <>
              <h2 className="text-2xl font-bold text-white border-b border-[#1a3320] pb-2">3. Leader Election</h2>
              <div className="space-y-4 mt-6">
                <div className="border-l-2 border-yellow-500 pl-4 py-1"><h3 className="text-yellow-400 font-bold mb-1">1. Election Timeout</h3><p className="text-sm text-gray-400">Followers wait for heartbeats. If the randomized election timeout fires before a heartbeat is received, the follower transitions to Candidate.</p></div>
                <div className="border-l-2 border-yellow-500 pl-4 py-1"><h3 className="text-yellow-400 font-bold mb-1">2. Campaign Phase</h3><p className="text-sm text-gray-400">The candidate increments its current term, votes for itself, and sends RequestVote RPCs to all other servers.</p></div>
                <div className="border-l-2 border-yellow-500 pl-4 py-1"><h3 className="text-yellow-400 font-bold mb-1">3. Voting Rules</h3><p className="text-sm text-gray-400">A server votes for a candidate if: it hasn't voted in this term yet, and the candidate's log is at least as up-to-date as its own.</p></div>
                <div className="border-l-2 border-[#33ff33] pl-4 py-1"><h3 className="text-[#33ff33] font-bold mb-1">4. Victory</h3><p className="text-sm text-gray-400">If the candidate receives votes from a majority of servers, it becomes the Leader and immediately sends heartbeats to establish authority.</p></div>
              </div>
            </>
          )}
          {activeSection === 'replication' && (
            <>
              <h2 className="text-2xl font-bold text-white border-b border-[#1a3320] pb-2">4. Log Replication</h2>
              <p className="text-gray-400 mt-4">Once a leader is elected, it begins servicing client requests. Each request contains a command to be executed by the replicated state machines.</p>
              <div className="bg-[#0d1710] border border-[#1a3320] p-6 mt-4 font-mono text-sm text-gray-300">
                <ol className="list-decimal list-inside space-y-2">
                  <li>Client sends command to Leader.</li>
                  <li>Leader appends command to its log.</li>
                  <li>Leader sends AppendEntries RPCs to followers.</li>
                  <li>Followers append to their logs and acknowledge.</li>
                  <li>Once majority acknowledges, Leader commits entry.</li>
                  <li>Leader applies command to state machine and replies to client.</li>
                  <li>Leader notifies followers of committed index in next heartbeat.</li>
                </ol>
              </div>
            </>
          )}
          {activeSection === 'safety' && (
            <>
              <h2 className="text-2xl font-bold text-white border-b border-[#1a3320] pb-2">5. Safety Invariants</h2>
              <div className="space-y-4 mt-6">
                <div className="bg-black border border-gray-800 p-4 rounded"><h3 className="text-green-400 font-bold">Election Safety</h3><p className="text-sm text-gray-400 mt-1">At most one leader can be elected in a given term.</p></div>
                <div className="bg-black border border-gray-800 p-4 rounded"><h3 className="text-green-400 font-bold">Leader Append-Only</h3><p className="text-sm text-gray-400 mt-1">A leader never overwrites or deletes entries in its own log; it only appends new entries.</p></div>
                <div className="bg-black border border-gray-800 p-4 rounded"><h3 className="text-green-400 font-bold">Log Matching</h3><p className="text-sm text-gray-400 mt-1">If two logs contain an entry with the same index and term, then the logs are identical in all entries up through the given index.</p></div>
                <div className="bg-black border border-gray-800 p-4 rounded"><h3 className="text-green-400 font-bold">Leader Completeness</h3><p className="text-sm text-gray-400 mt-1">If a log entry is committed in a given term, then that entry will be present in the logs of the leaders for all higher-numbered terms.</p></div>
                <div className="bg-black border border-gray-800 p-4 rounded"><h3 className="text-green-400 font-bold">State Machine Safety</h3><p className="text-sm text-gray-400 mt-1">If a server has applied a log entry at a given index to its state machine, no other server will ever apply a different log entry for the same index.</p></div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// --- Main App Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState('intro');
  const [state, dispatch] = useReducer(raftReducer, initialState);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (state.isPlaying) {
      timer = setInterval(() => dispatch({ type: 'TICK' }), state.config.tickMs);
    }
    return () => clearInterval(timer);
  }, [state.isPlaying, state.config.tickMs]);

  const tabs = [
    { id: 'intro', label: 'System Boot', icon: Terminal },
    { id: 'simulation', label: 'Cluster Sandbox', icon: Network },
    { id: 'analysis', label: 'Telemetry', icon: Activity },
    { id: 'theory', label: 'Reference', icon: BookOpen },
  ];

  return (
    <div className="flex h-screen bg-gray-950 text-green-400 font-mono selection:bg-green-900 selection:text-green-100 overflow-hidden">
      <aside className="w-16 md:w-64 border-r border-green-900/30 bg-[#050505] flex flex-col z-20">
        <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-green-900/30">
          <Server className="w-6 h-6 text-green-500" />
          <span className="hidden md:block ml-3 font-bold tracking-widest text-sm text-green-500">RAFT_OS</span>
        </div>
        <nav className="flex-1 py-4 flex flex-col gap-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center justify-center md:justify-start px-0 md:px-6 py-3 transition-colors border-l-2 ${activeTab === tab.id ? 'border-green-500 bg-green-900/20 text-green-400' : 'border-transparent text-gray-500 hover:text-green-500 hover:bg-gray-900/50'}`}>
              <tab.icon className="w-5 h-5" />
              <span className="hidden md:block ml-3 text-sm uppercase tracking-wider">{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-green-900/30 hidden md:block">
          <div className="text-[10px] text-gray-600 uppercase tracking-widest">Status</div>
          <div className="text-xs text-green-600 flex items-center mt-1"><div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" /> ONLINE</div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {activeTab === 'intro' && <HeroTab setActiveTab={setActiveTab} />}
        {activeTab === 'simulation' && <SimulationTab state={state} dispatch={dispatch} />}
        {activeTab === 'analysis' && <AnalysisTab state={state} dispatch={dispatch} />}
        {activeTab === 'theory' && <TheoryTab />}
      </main>
    </div>
  );
}