import React, { useReducer, useEffect, useRef } from 'react';

// --- TYPES & CONSTANTS ---
type NodeState = 'FOLLOWER' | 'CANDIDATE' | 'LEADER' | 'DEAD';
type MsgType = 'RequestVote' | 'VoteReply' | 'AppendEntries' | 'AppendReply';

interface LogEntry {
  term: number;
  data: string;
}

interface RaftNode {
  id: number;
  state: NodeState;
  term: number;
  votedFor: number | null;
  log: LogEntry[];
  commitIndex: number;
  electionTimer: number;
  votesReceived: number;
  matchIndex: Record<number, number>; 
}

interface Message {
  id: string;
  from: number;
  to: number;
  type: MsgType;
  term: number;
  payload: any;
  startTick: number;
  deliveryTick: number;
}

interface SimState {
  tick: number;
  isPlaying: boolean;
  nodes: RaftNode[];
  messages: Message[];
  links: Record<string, boolean>;
  systemLogs: string[];
  clientCounter: number;
}

type Action =
  | { type: 'TICK' }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'STEP' }
  | { type: 'RESET'; nodeCount: number }
  | { type: 'TOGGLE_NODE'; id: number }
  | { type: 'TOGGLE_LINK'; a: number; b: number }
  | { type: 'CLIENT_REQUEST' };

const MIN_TIMEOUT = 100;
const MAX_TIMEOUT = 200;
const HEARTBEAT = 30;
const LATENCY = 40;

// --- HELPERS ---
const randomTimeout = () => Math.floor(Math.random() * (MAX_TIMEOUT - MIN_TIMEOUT + 1)) + MIN_TIMEOUT;
const linkKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
const generateId = () => Math.random().toString(36).substr(2, 9);

function logEvent(logs: string[], msg: string) {
  logs.unshift(`[${new Date().toISOString().substring(11, 23)}] ${msg}`);
  if (logs.length > 50) logs.pop();
}

function initNodes(count: number): RaftNode[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    state: 'FOLLOWER',
    term: 0,
    votedFor: null,
    log: [],
    commitIndex: -1,
    electionTimer: randomTimeout(),
    votesReceived: 0,
    matchIndex: {},
  }));
}

function initLinks(count: number): Record<string, boolean> {
  const links: Record<string, boolean> = {};
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      links[linkKey(i, j)] = true;
    }
  }
  return links;
}

const initialState: SimState = {
  tick: 0,
  isPlaying: false,
  nodes: initNodes(5),
  messages: [],
  links: initLinks(5),
  systemLogs: ['> System initialized. Cluster size: 5'],
  clientCounter: 1,
};

// --- REDUCER (THE RAFT LOGIC) ---
function raftReducer(state: SimState, action: Action): SimState {
  switch (action.type) {
    case 'TOGGLE_PLAY':
      return { ...state, isPlaying: !state.isPlaying };
    case 'STEP':
      return processTick(state);
    case 'TICK':
      if (!state.isPlaying) return state;
      return processTick(state);
    case 'RESET':
      return {
        ...initialState,
        nodes: initNodes(action.nodeCount),
        links: initLinks(action.nodeCount),
        systemLogs: [`> Cluster reset. Size: ${action.nodeCount}`],
      };
    case 'TOGGLE_NODE': {
      const nodes = state.nodes.map((n) => {
        if (n.id === action.id) {
          const isDead = n.state === 'DEAD';
          logEvent(state.systemLogs, `Node ${n.id} ${isDead ? 'rebooted' : 'crashed'}.`);
          return {
            ...n,
            state: isDead ? 'FOLLOWER' : 'DEAD',
            electionTimer: randomTimeout(),
            votedFor: isDead ? null : n.votedFor,
          };
        }
        return n;
      });
      return { ...state, nodes };
    }
    case 'TOGGLE_LINK': {
      const key = linkKey(action.a, action.b);
      const isActive = state.links[key];
      logEvent(state.systemLogs, `Network link ${action.a}-${action.b} ${isActive ? 'severed' : 'restored'}.`);
      return { ...state, links: { ...state.links, [key]: !isActive } };
    }
    case 'CLIENT_REQUEST': {
      const leader = state.nodes.find((n) => n.state === 'LEADER');
      if (!leader) {
        logEvent(state.systemLogs, `Client request failed: No leader.`);
        return state;
      }
      logEvent(state.systemLogs, `Client sent payload 'DATA_${state.clientCounter}' to Node ${leader.id}.`);
      const nodes = state.nodes.map((n) => {
        if (n.id === leader.id) {
          return {
            ...n,
            log: [...n.log, { term: n.term, data: `D${state.clientCounter}` }],
          };
        }
        return n;
      });
      return { ...state, nodes, clientCounter: state.clientCounter + 1 };
    }
    default:
      return state;
  }
}

function processTick(state: SimState): SimState {
  let { tick, nodes, messages, links, systemLogs } = state;
  tick += 1;
  const newMessages: Message[] = [];
  let nextNodes = [...nodes.map(n => ({ ...n, matchIndex: { ...n.matchIndex } }))];

  // 1. Deliver Messages
  const delivered = messages.filter((m) => m.deliveryTick <= tick);
  const inFlight = messages.filter((m) => m.deliveryTick > tick);

  delivered.forEach((msg) => {
    // Drop if link severed
    if (!links[linkKey(msg.from, msg.to)]) return;
    
    const recipient = nextNodes.find((n) => n.id === msg.to);
    if (!recipient || recipient.state === 'DEAD') return;

    // Rule: If message term > recipient term, revert to follower
    if (msg.term > recipient.term) {
      recipient.term = msg.term;
      recipient.state = 'FOLLOWER';
      recipient.votedFor = null;
    }

    switch (msg.type) {
      case 'RequestVote': {
        const { lastLogIndex, lastLogTerm } = msg.payload;
        const myLastLogIndex = recipient.log.length - 1;
        const myLastLogTerm = myLastLogIndex >= 0 ? recipient.log[myLastLogIndex].term : -1;
        
        const logOk = lastLogTerm > myLastLogTerm || (lastLogTerm === myLastLogTerm && lastLogIndex >= myLastLogIndex);
        const termOk = msg.term >= recipient.term;
        const voteOk = recipient.votedFor === null || recipient.votedFor === msg.from;

        let granted = false;
        if (termOk && voteOk && logOk) {
          granted = true;
          recipient.votedFor = msg.from;
          recipient.electionTimer = randomTimeout(); // reset timer on granting vote
        }

        newMessages.push({
          id: generateId(),
          from: recipient.id,
          to: msg.from,
          type: 'VoteReply',
          term: recipient.term,
          payload: { granted },
          startTick: tick,
          deliveryTick: tick + LATENCY,
        });
        break;
      }
      case 'VoteReply': {
        if (recipient.state === 'CANDIDATE' && msg.term === recipient.term) {
          if (msg.payload.granted) {
            recipient.votesReceived += 1;
            const majority = Math.floor(nextNodes.length / 2) + 1;
            if (recipient.votesReceived >= majority) {
              recipient.state = 'LEADER';
              logEvent(systemLogs, `Node ${recipient.id} became LEADER for term ${recipient.term}.`);
              // Init matchIndex
              nextNodes.forEach(n => recipient.matchIndex[n.id] = -1);
              // Send initial heartbeats immediately
              nextNodes.forEach((n) => {
                if (n.id !== recipient.id) {
                  newMessages.push(buildAppendEntries(recipient, n.id, tick));
                }
              });
            }
          }
        }
        break;
      }
      case 'AppendEntries': {
        if (msg.term >= recipient.term) {
          recipient.state = 'FOLLOWER';
          recipient.electionTimer = randomTimeout();
          
          // Simplified Log Replication: leader sends full log for demo purposes
          const leaderLog: LogEntry[] = msg.payload.log;
          const leaderCommit: number = msg.payload.commitIndex;

          recipient.log = [...leaderLog];
          
          if (leaderCommit > recipient.commitIndex) {
            recipient.commitIndex = Math.min(leaderCommit, recipient.log.length - 1);
          }

          newMessages.push({
            id: generateId(),
            from: recipient.id,
            to: msg.from,
            type: 'AppendReply',
            term: recipient.term,
            payload: { success: true, matchIndex: recipient.log.length - 1 },
            startTick: tick,
            deliveryTick: tick + LATENCY,
          });
        } else {
          newMessages.push({
            id: generateId(),
            from: recipient.id,
            to: msg.from,
            type: 'AppendReply',
            term: recipient.term,
            payload: { success: false },
            startTick: tick,
            deliveryTick: tick + LATENCY,
          });
        }
        break;
      }
      case 'AppendReply': {
        if (recipient.state === 'LEADER' && msg.term === recipient.term) {
          if (msg.payload.success) {
            recipient.matchIndex[msg.from] = msg.payload.matchIndex;
            // Calculate new commit index
            const matchIndices = nextNodes
              .filter(n => n.id !== recipient.id && n.state !== 'DEAD')
              .map(n => recipient.matchIndex[n.id] || -1);
            matchIndices.push(recipient.log.length - 1); // include self
            matchIndices.sort((a, b) => b - a);
            
            const majorityIdx = Math.floor(nextNodes.length / 2);
            const N = matchIndices[majorityIdx];
            
            if (N > recipient.commitIndex && recipient.log[N]?.term === recipient.term) {
              recipient.commitIndex = N;
              logEvent(systemLogs, `Leader ${recipient.id} committed index ${N}.`);
            }
          }
        }
        break;
      }
    }
  });

  // 2. Node Ticks (Timeouts & Heartbeats)
  nextNodes.forEach((node) => {
    if (node.state === 'DEAD') return;

    if (node.state === 'LEADER') {
      if (tick % HEARTBEAT === 0) {
        nextNodes.forEach((peer) => {
          if (peer.id !== node.id) {
            newMessages.push(buildAppendEntries(node, peer.id, tick));
          }
        });
      }
    } else {
      node.electionTimer -= 1;
      if (node.electionTimer <= 0) {
        node.state = 'CANDIDATE';
        node.term += 1;
        node.votedFor = node.id;
        node.votesReceived = 1;
        node.electionTimer = randomTimeout();
        logEvent(systemLogs, `Node ${node.id} timed out. Started election (term ${node.term}).`);

        const lastLogIndex = node.log.length - 1;
        const lastLogTerm = lastLogIndex >= 0 ? node.log[lastLogIndex].term : -1;

        nextNodes.forEach((peer) => {
          if (peer.id !== node.id) {
            newMessages.push({
              id: generateId(),
              from: node.id,
              to: peer.id,
              type: 'RequestVote',
              term: node.term,
              payload: { lastLogIndex, lastLogTerm },
              startTick: tick,
              deliveryTick: tick + LATENCY,
            });
          }
        });
      }
    }
  });

  return { ...state, tick, nodes: nextNodes, messages: [...inFlight, ...newMessages] };
}

function buildAppendEntries(leader: RaftNode, to: number, tick: number): Message {
  return {
    id: generateId(),
    from: leader.id,
    to,
    type: 'AppendEntries',
    term: leader.term,
    payload: {
      log: leader.log, // sending full log for simplicity in this anim
      commitIndex: leader.commitIndex,
    },
    startTick: tick,
    deliveryTick: tick + LATENCY,
  };
}


// --- UI COMPONENTS ---

export default function App() {
  const [state, dispatch] = useReducer(raftReducer, initialState);
  
  // Simulation Loop
  useEffect(() => {
    if (!state.isPlaying) return;
    const interval = setInterval(() => dispatch({ type: 'TICK' }), 20); // 20ms real-time = 1 sim tick
    return () => clearInterval(interval);
  }, [state.isPlaying]);

  // Derived checks for invariants
  const leadersCount = state.nodes.filter(n => n.state === 'LEADER').length;
  const isElectionSafe = leadersCount <= 1;
  
  return (
    <div className="min-h-screen bg-zinc-950 text-lime-400 font-mono flex flex-col overflow-hidden selection:bg-lime-900 selection:text-lime-200">
      
      {/* HEADER */}
      <header className="flex-none p-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between z-10 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-widest text-lime-300 drop-shadow-[0_0_5px_rgba(132,204,22,0.8)]">
            &gt; RAFT_CONSENSUS_ANIMATOR
          </h1>
          <span className="text-xs text-zinc-500 mt-1">SIM_TICK: {state.tick.toString().padStart(6, '0')}</span>
        </div>

        <div className="flex gap-4 items-center">
          <div className="flex gap-2 bg-zinc-900 border border-zinc-700 p-1 rounded-sm">
            <button
              onClick={() => dispatch({ type: 'TOGGLE_PLAY' })}
              className="px-3 py-1 hover:bg-zinc-800 hover:text-white transition-colors uppercase text-sm flex items-center gap-2"
            >
              {state.isPlaying ? '❚❚ PAUSE' : '▶ PLAY'}
            </button>
            <button
              onClick={() => dispatch({ type: 'STEP' })}
              disabled={state.isPlaying}
              className="px-3 py-1 hover:bg-zinc-800 hover:text-white disabled:opacity-30 transition-colors uppercase text-sm"
            >
              STEP
            </button>
          </div>
          <button
            onClick={() => dispatch({ type: 'CLIENT_REQUEST