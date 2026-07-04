import React, { useReducer, useEffect, useRef, useState } from 'react';

// --- Types & Constants ---

type Role = 'Follower' | 'Candidate' | 'Leader';

interface LogEntry {
  term: number;
  command: string;
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
  progress: number; // 0.0 to 1.0
}

interface Config {
  nodeCount: number;
  tickMs: number;
  latencyTicks: number;
  packetLoss: number; // 0.0 to 1.0
  partitions: Record<string, boolean>; // "id1-id2" -> true if partitioned
}

interface SimState {
  nodes: NodeState[];
  messages: Message[];
  config: Config;
  time: number;
  isPlaying: boolean;
  seed: number;
  clientReqCount: number;
}

type Action =
  | { type: 'TICK' }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'STEP' }
  | { type: 'RESET' }
  | { type: 'UPDATE_CONFIG'; payload: Partial<Config> }
  | { type: 'TOGGLE_PARTITION'; payload: { n1: number; n2: number } }
  | { type: 'CLIENT_REQUEST' };

const MIN_ELECTION_TIMEOUT = 30; // ticks
const MAX_ELECTION_TIMEOUT = 60; // ticks
const HEARTBEAT_INTERVAL = 10; // ticks

// --- Helpers ---

const randomTimeout = () =>
  Math.floor(Math.random() * (MAX_ELECTION_TIMEOUT - MIN_ELECTION_TIMEOUT + 1)) + MIN_ELECTION_TIMEOUT;

const getPartitionKey = (n1: number, n2: number) =>
  n1 < n2 ? `${n1}-${n2}` : `${n2}-${n1}`;

const generateId = () => Math.random().toString(36).substr(2, 9);

const initNodes = (count: number): NodeState[] =>
  Array.from({ length: count }).map((_, i) => ({
    id: i,
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
  seed: Math.floor(Math.random() * 10000),
  clientReqCount: 0,
};

// --- Reducer (Raft Logic Engine) ---

function raftReducer(state: SimState, action: Action): SimState {
  switch (action.type) {
    case 'TOGGLE_PLAY':
      return { ...state, isPlaying: !state.isPlaying };
    case 'STEP':
      return processTick(state);
    case 'RESET':
      return {
        ...initialState,
        config: state.config, // preserve config
        seed: Math.floor(Math.random() * 10000),
      };
    case 'UPDATE_CONFIG':
      return { ...state, config: { ...state.config, ...action.payload } };
    case 'TOGGLE_PARTITION': {
      const key = getPartitionKey(action.payload.n1, action.payload.n2);
      const newPartitions = { ...state.config.partitions };
      if (newPartitions[key]) delete newPartitions[key];
      else newPartitions[key] = true;
      return { ...state, config: { ...state.config, partitions: newPartitions } };
    }
    case 'CLIENT_REQUEST': {
      const leader = state.nodes.find((n) => n.role === 'Leader');
      if (!leader) return state; // Drop if no leader
      const newNodes = state.nodes.map((n) => {
        if (n.id === leader.id) {
          return {
            ...n,
            log: [...n.log, { term: n.term, command: `CMD_${state.clientReqCount + 1}` }],
          };
        }
        return n;
      });
      return { ...state, nodes: newNodes, clientReqCount: state.clientReqCount + 1 };
    }
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

  // 1. Process Messages (Progress, Drop, Deliver)
  const progressStep = 1.0 / Math.max(1, state.config.latencyTicks);
  state.messages.forEach((msg) => {
    // Check partition
    if (state.config.partitions[getPartitionKey(msg.from, msg.to)]) {
      return; // Drop message silently (simulates network cut)
    }
    
    const nextProgress = msg.progress + progressStep;
    if (nextProgress >= 1.0) {
      deliveredMessages.push(msg);
    } else {
      newMessages.push({ ...msg, progress: nextProgress });
    }
  });

  // 2. Apply Delivered Messages
  deliveredMessages.forEach((msg) => {
    const target = newNodes.find((n) => n.id === msg.to);
    if (!target) return;

    // Rule: If RPC request or response contains term T > currentTerm: set currentTerm = T, convert to follower
    if (msg.term > target.term) {
      target.term = msg.term;
      target.role = 'Follower';
      target.votedFor = null;
      target.electionTimer = randomTimeout();
    }

    if (msg.type === 'RequestVote') {
      if (
        msg.term >= target.term &&
        (target.votedFor === null || target.votedFor === msg.from)
      ) {
        target.votedFor = msg.from;
        target.electionTimer = randomTimeout(); // Reset timer on granting vote
        newMessages.push(createMessage(target.id, msg.from, 'VoteReply', target.term, { granted: true }));
      } else {
        newMessages.push(createMessage(target.id, msg.from, 'VoteReply', target.term, { granted: false }));
      }
    } 
    else if (msg.type === 'VoteReply') {
      if (target.role === 'Candidate' && msg.term === target.term && msg.payload.granted) {
        target.votesReceived += 1;
        if (target.votesReceived > Math.floor(state.config.nodeCount / 2)) {
          target.role = 'Leader';
          target.matchIndex = {};
          newNodes.forEach(n => { target.matchIndex[n.id] = 0; });
          target.heartbeatTimer = 0; // Send heartbeat immediately
        }
      }
    } 
    else if (msg.type === 'AppendEntries') {
      if (msg.term >= target.term) {
        target.role = 'Follower';
        target.electionTimer = randomTimeout();
        
        // Simplified Log Replication: Overwrite log if leader's log is provided
        // In real Raft, this uses prevLogIndex and prevLogTerm for safety.
        if (msg.payload.log) {
          target.log = [...msg.payload.log];
        }
        if (msg.payload.leaderCommit > target.commitIndex) {
          target.commitIndex = Math.min(msg.payload.leaderCommit, target.log.length);
        }
        
        newMessages.push(createMessage(target.id, msg.from, 'AppendReply', target.term, { 
          success: true, 
          matchIndex: target.log.length 
        }));
      } else {
        newMessages.push(createMessage(target.id, msg.from, 'AppendReply', target.term, { success: false }));
      }
    }
    else if (msg.type === 'AppendReply') {
      if (target.role === 'Leader' && msg.term === target.term && msg.payload.success) {
        target.matchIndex[msg.from] = msg.payload.matchIndex;
        
        // Update commit index
        const matchIndices = newNodes.map(n => n.id === target.id ? target.log.length : (target.matchIndex[n.id] || 0));
        matchIndices.sort((a, b) => b - a);
        const majorityIndex = matchIndices[Math.floor(state.config.nodeCount / 2)];
        
        if (majorityIndex > target.commitIndex && target.log[majorityIndex - 1]?.term === target.term) {
          target.commitIndex = majorityIndex;
        }
      }
    }
  });

  // 3. Update Timers & Triggers
  newNodes.forEach((node) => {
    if (node.role === 'Follower' || node.role === 'Candidate') {
      node.electionTimer -= 1;
      if (node.electionTimer <= 0) {
        // Start Election
        node.role = 'Candidate';
        node.term += 1;
        node.votedFor = node.id;
        node.votesReceived = 1;
        node.electionTimer = randomTimeout();
        
        // Send RequestVote to all others
        newNodes.forEach((other) => {
          if (other.id !== node.id) {
            if (Math.random() >= state.config.packetLoss) {
              newMessages.push(createMessage(node.id, other.id, 'RequestVote', node.term, {}));
            }
          }
        });
      }
    } else if (node.role === 'Leader') {
      node.heartbeatTimer -= 1;
      if (node.heartbeatTimer <= 0) {
        node.heartbeatTimer = HEARTBEAT_INTERVAL;
        // Send AppendEntries (Heartbeat + Logs) to all others
        newNodes.forEach((other) => {
          if (other.id !== node.id) {
            if (Math.random() >= state.config.packetLoss) {
              newMessages.push(createMessage(node.id, other.id, 'AppendEntries', node.term, {
                log: node.log,
                leaderCommit: node.commitIndex
              }));
            }
          }
        });
      }
    }
  });

  return { ...state, nodes: newNodes, messages: newMessages, time: state.time + 1 };
}

function createMessage(from: number, to: number, type: Message['type'], term: number, payload: any): Message {
  return { id: generateId(), from, to, type, term, payload, progress: 0 };
}

// --- Components ---

export default function App() {
  const [state, dispatch] = useReducer(raftReducer, initialState);

  // Simulation Loop
  useEffect(() => {
    const timer = setInterval(() => {
      dispatch({ type: 'TICK' });
    }, state.config.tickMs);
    return () => clearInterval(timer);
  }, [state.config.tickMs]);

  return (
    <div className="min-h-screen bg-gray-950 text-green-400 font-mono flex flex-col selection:bg-green-900 selection:text-green-100">
      {/* Header */}
      <header className="border-b border-green-900/50 p-4 flex items-center justify-between bg-gray-950/80 backdrop-blur z-10 sticky top-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-green-300 flex items-center gap-2">
            <span className="text-2xl">⎈</span> Raft Consensus Animator
          </h1>
          <p className="text-xs text-green-600 mt-1">Distributed Systems Educator • ChatGPT Edition</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs text-green-700 bg-green-950/30 px-3 py-1 rounded-full border border-green-900/30">
            Tick: {state.time} | Seed: {state.seed}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => dispatch({ type: 'TOGGLE_PLAY' })}
              className={`px-4 py-1.5 rounded text-sm font-bold transition-colors ${
                state.isPlaying 
                  ? 'bg-red-900/50 text-red-400 hover:bg-red-900/70 border border-red-800' 
                  : 'bg-green-800 text-green-100 hover:bg-green-700 border border-green-600'
              }`}
            >
              {state.isPlaying ? '❚❚ Pause' : '▶ Play'}
            </button>
            <button
              onClick={() => dispatch({ type: 'STEP' })}
              disabled={state.isPlaying}
              className="px-4 py-1.5 rounded text-sm bg-gray-800 text-green-400 hover:bg-gray-700 border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Step ⏭
            </button>
            <button
              onClick={() => dispatch({ type: 'RESET' })}
              className="px-4 py-1.5 rounded text-sm bg-gray-800 text-green-400 hover:bg-gray-700 border border-gray-700"
            >
              Reset ↺
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden">
        
        {/* Left Column: Network Graph & Controls */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          {/* Network Visualization */}