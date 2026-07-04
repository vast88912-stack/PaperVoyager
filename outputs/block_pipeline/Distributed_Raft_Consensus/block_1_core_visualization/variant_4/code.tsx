import React, { useState, useEffect, useRef } from 'react';

type NodeState = 'Follower' | 'Candidate' | 'Leader';
type MsgType = 'VoteReq' | 'VoteRes' | 'AppEnt' | 'AppEntRes';
type ViewMode = 'OVERVIEW' | 'LOGS' | 'PARTITIONS' | 'SAFETY';

interface LogEntry {
  term: number;
  command: string;
}

interface RaftNode {
  id: number;
  state: NodeState;
  term: number;
  votedFor: number | null;
  log: LogEntry[];
  commitIndex: number;
  timeout: number;
  maxTimeout: number;
  votesReceived: number[];
}

interface Message {
  id: string;
  from: number;
  to: number;
  type: MsgType;
  term: number;
  payload: any;
  progress: number;
}

interface SimState {
  nodes: RaftNode[];
  messages: Message[];
  links: Record<string, boolean>;
  tickCount: number;
  logsGenerated: number;
}

const NUM_NODES = 5;
const TICK_RATE_MS = 20;
const MSG_SPEED = 2.5; 
const HEARTBEAT_TICKS = 40;
const ELECTION_MIN = 150;
const ELECTION_MAX = 300;

const randomTimeout = () => Math.floor(Math.random() * (ELECTION_MAX - ELECTION_MIN + 1)) + ELECTION_MIN;

const getInitialState = (): SimState => {
  const nodes: RaftNode[] = Array.from({ length: NUM_NODES }).map((_, id) => ({
    id,
    state: 'Follower',
    term: 0,
    votedFor: null,
    log: [],
    commitIndex: 0,
    timeout: randomTimeout(),
    maxTimeout: ELECTION_MAX,
    votesReceived: [],
  }));

  const links: Record<string, boolean> = {};
  for (let i = 0; i < NUM_NODES; i++) {
    for (let j = i + 1; j < NUM_NODES; j++) {
      links[`${i}-${j}`] = true;
    }
  }

  return { nodes, messages: [], links, tickCount: 0, logsGenerated: 0 };
};

const getNodePos = (index: number, total: number, radius: number = 200) => {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  return { x: 350 + radius * Math.cos(angle), y: 350 + radius * Math.sin(angle) };
};

const isLinkActive = (links: Record<string, boolean>, a: number, b: number) => {
  const key = [a, b].sort().join('-');
  return links[key] !== false;
};

const runTick = (state: SimState): SimState => {
  const clone: SimState = JSON.parse(JSON.stringify(state));
  clone.tickCount += 1;

  const newMessages: Message[] = [];

  const sendMsg = (from: number, to: number, type: MsgType, payload: any) => {
    if (!isLinkActive(clone.links, from, to)) return;
    newMessages.push({
      id: Math.random().toString(36).substr(2, 9),
      from,
      to,
      type,
      term: clone.nodes[from].term,
      payload,
      progress: 0,
    });
  };

  // Process Messages
  for (const msg of clone.messages) {
    msg.progress += MSG_SPEED;
    if (msg.progress >= 100) {
      const target = clone.nodes[msg.to];
      const sender = clone.nodes[msg.from];

      if (msg.term > target.term) {
        target.term = msg.term;
        target.state = 'Follower';
        target.votedFor = null;
      }

      if (msg.type === 'VoteReq') {
        if (msg.term >= target.term && (target.votedFor === null || target.votedFor === msg.from)) {
          target.votedFor = msg.from;
          target.timeout = randomTimeout();
          sendMsg(target.id, msg.from, 'VoteRes', { granted: true });
        } else {
          sendMsg(target.id, msg.from, 'VoteRes', { granted: false });
        }
      } else if (msg.type === 'VoteRes') {
        if (target.state === 'Candidate' && msg.term === target.term && msg.payload.granted) {
          if (!target.votesReceived.includes(msg.from)) {
            target.votesReceived.push(msg.from);
          }
          if (target.votesReceived.length > NUM_NODES / 2) {
            target.state = 'Leader';
            target.timeout = 0; 
          }
        }
      } else if (msg.type === 'AppEnt') {
        if (msg.term >= target.term) {
          target.term = msg.term;
          target.state = 'Follower';
          target.timeout = randomTimeout();
          
          if (msg.payload.log && msg.payload.log.length >= target.log.length) {
            target.log = JSON.parse(JSON.stringify(msg.payload.log));
            target.commitIndex = msg.payload.commitIndex;
          }
          sendMsg(target.id, msg.from, 'AppEntRes', { success: true });
        }
      }
    } else {
      if (isLinkActive(clone.links, msg.from, msg.to)) {
        newMessages.push(msg);
      }
    }
  }
  clone.messages = newMessages;

  if (clone.tickCount % 200 === 0) {
    const leader = clone.nodes.find(n => n.state === 'Leader');
    if (leader) {
      clone.logsGenerated += 1;
      leader.log.push({ term: leader.term, command: `CMD_${clone.logsGenerated}` });
      leader.commitIndex = leader.log.length;
    }
  }

  for (const node of clone.nodes) {
    node.timeout -= 1;

    if (node.state === 'Follower' || node.state === 'Candidate') {
      if (node.timeout <= 0) {
        node.state = 'Candidate';
        node.term += 1;
        node.votedFor = node.id;
        node.votesReceived = [node.id];
        node.timeout = randomTimeout();
        for (let i = 0; i < NUM_NODES; i++) {
          if (i !== node.id) sendMsg(node.id, i, 'VoteReq', {});
        }
      }
    } else if (node.state === 'Leader') {
      if (node.timeout <= 0) {
        node.timeout = HEARTBEAT_TICKS;
        for (let i = 0; i < NUM_NODES; i++) {
          if (i !== node.id) {
            sendMsg(node.id, i, 'AppEnt', { 
              log: node.log,
              commitIndex: node.commitIndex 
            });
          }
        }
      }
    }
  }

  return clone;
};

export default function App() {
  const [simState, setSimState] = useState<SimState>(getInitialState());
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('OVERVIEW');
  const [speedMultiplier, setSpeedMultiplier] = useState(1);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSimState(prev => runTick(prev));
    }, TICK_RATE_MS / speedMultiplier);
    return () => clearInterval(interval);
  }, [isPlaying, speedMultiplier]);

  const step = () => setSimState(prev => runTick(prev));
  const reset = () => setSimState(getInitialState());

  const toggleLink = (key: string) => {
    setSimState(prev => ({
      ...prev,
      links: { ...prev.links, [key]: !prev.links[key] }
    }));
  };

  const getMsgColor = (type: MsgType) => {
    switch (type) {
      case 'VoteReq': return '#eab308'; // yellow-500
      case 'VoteRes': return '#a8a29e'; // stone-400
      case 'AppEnt': return '#22c55e'; // green-500
      case 'AppEntRes': return '#14b8a6'; // teal-500
      default: return '#ffffff';
    }
  };

  const getNodeColorClass = (state: NodeState) => {
    switch (state) {
      case 'Leader': return 'border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]';
      case 'Candidate': return 'border-yellow-500 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.4)]';
      case 'Follower': return 'border-teal-700 text-teal-300 shadow-[0_0_10px_rgba(15,118,110,0.4)]';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-teal-50 font-mono overflow-hidden selection:bg-teal-900">
      
      {/* HEADER */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-teal-900/50 bg-slate-900/50 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-4">
          <div className="h-3 w-3 rounded-full bg-teal-500 animate-pulse shadow-[0_0_8px_#14b8a6]" />
          <h1 className="text-xl font-bold tracking-widest text-teal-400">RAFT_CONSENSUS_ANIMATOR</h1>
          <span className="text-xs text-slate-500 ml-2 border border-slate-700 px-2 py-1 rounded">v1.0.5 // CHATGPT ED.</span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-xs border border-teal-