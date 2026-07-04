import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, SkipForward, RefreshCw, Server, 
  Activity, ShieldCheck, AlertTriangle, Zap, 
  Database, Terminal, Cpu, Radio
} from 'lucide-react';

// --- Types & Constants ---

type NodeState = 'FOLLOWER' | 'CANDIDATE' | 'LEADER';

interface LogEntry {
  term: number;
  command: string;
}

interface RaftNode {
  id: number;
  state: NodeState;
  term: number;
  votedFor: number | null;
  votesReceived: Set<number>;
  log: LogEntry[];
  commitIndex: number;
  electionTimer: number;
  electionTimeout: number; // Base timeout
  heartbeatTimer: number;
  matchIndex: Record<number, number>;
  nextIndex: Record<number, number>;
}

type MsgType = 'RequestVote' | 'VoteResponse' | 'AppendEntries' | 'AppendResponse';

interface Message {
  id: string;
  type: MsgType;
  source: number;
  target: number;
  term: number;
  sentAt: number;
  deliverAt: number;
  dropped: boolean;
  payload: any;
}

interface SimConfig {
  nodeCount: number;
  latency: number;
  dropRate: number;
}

const TICK_MS = 50;
const MIN_ELECTION_TIMEOUT = 30; // 1.5s
const MAX_ELECTION_TIMEOUT = 60; // 3.0s
const HEARTBEAT_INTERVAL = 10;   // 0.5s

// --- Helper Functions ---

const randomElectionTimeout = () => 
  Math.floor(Math.random() * (MAX_ELECTION_TIMEOUT - MIN_ELECTION_TIMEOUT + 1)) + MIN_ELECTION_TIMEOUT;

const generateId = () => Math.random().toString(36).substr(2, 9);

const getPartitionKey = (a: number, b: number) => a < b ? `${a}-${b}` : `${b}-${a}`;

// --- Main Component ---

export default function App() {
  // UI State
  const [playing, setPlaying] = useState(false);
  const [tickCount, setTickCount] = useState(0); // Force re-renders
  const [config, setConfig] = useState<SimConfig>({ nodeCount: 5, latency: 15, dropRate: 0 });
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [cmdCounter, setCmdCounter] = useState(1);

  // Mutable Simulation State (avoids React dependency cycle hell in the game loop)
  const sim = useRef({
    time: 0,
    nodes: [] as RaftNode[],
    messages: [] as Message[],
    partitions: new Set<string>(),
    config: { nodeCount: 5, latency: 15, dropRate: 0 }
  });

  const addLog = (msg: string) => {
    setLogs(prev => {
      const newLogs = [`[${sim.current.time}] ${msg}`, ...prev];
      return newLogs.slice(0, 50);
    });
  };

  const initCluster = useCallback((count: number) => {
    sim.current.time = 0;
    sim.current.messages = [];
    sim.current.partitions.clear();
    sim.current.nodes = Array.from({ length: count }, (_, i) => ({
      id: i,
      state: 'FOLLOWER',
      term: 0,
      votedFor: null,
      votesReceived: new Set(),
      log: [{ term: 0, command: 'INIT' }], // 1-based indexing for standard Raft, 0 is dummy
      commitIndex: 0,
      electionTimeout: randomElectionTimeout(),
      electionTimer: randomElectionTimeout(),
      heartbeatTimer: 0,
      matchIndex: {},
      nextIndex: {}
    }));
    setCmdCounter(1);
    setLogs([]);
    addLog(`Cluster initialized with ${count} nodes.`);
    setTickCount(c => c + 1);
  }, []);

  // Initialize on mount
  useEffect(() => {
    initCluster(config.nodeCount);
    sim.current.config = config;
  }, []);

  // Sync config changes to sim ref
  useEffect(() => {
    if (sim.current.config.nodeCount !== config.nodeCount) {
      initCluster(config.nodeCount);
    }
    sim.current.config = config;
  }, [config, initCluster]);

  // --- Core Raft Engine ---
  
  const sendMessage = (msg: Omit<Message, 'id' | 'sentAt' | 'deliverAt' | 'dropped'>) => {
    const isPartitioned = sim.current.partitions.has(getPartitionKey(msg.source, msg.target));
    const isDropped = isPartitioned || (Math.random() < sim.current.config.dropRate / 100);
    
    // Add jitter to latency
    const jitter = Math.floor(Math.random() * 5);
    const latency = sim.current.config.latency + jitter;

    sim.current.messages.push({
      ...msg,
      id: generateId(),
      sentAt: sim.current.time,
      deliverAt: sim.current.time + latency,
      dropped: isDropped
    });
  };

  const stepDown = (node: RaftNode, newTerm: number) => {
    if (node.term < newTerm || node.state !== 'FOLLOWER') {
      if (node.state === 'LEADER') addLog(`Node ${node.id} stepping down to FOLLOWER (term ${newTerm})`);
      node.state = 'FOLLOWER';
      node.term = newTerm;
      node.votedFor = null;
      node.electionTimer = node.electionTimeout;
    }
  };

  const startElection = (node: RaftNode) => {
    node.state = 'CANDIDATE';
    node.term++;
    node.votedFor = node.id;
    node.votesReceived = new Set([node.id]);
    node.electionTimer = node.electionTimeout;
    addLog(`Node ${node.id} starting election for term ${node.term}`);

    const lastLogIndex = node.log.length - 1;
    const lastLogTerm = node.log[lastLogIndex].term;

    sim.current.nodes.forEach(peer => {
      if (peer.id === node.id) return;
      sendMessage({
        type: 'RequestVote',
        source: node.id,
        target: peer.id,
        term: node.term,
        payload: { lastLogIndex, lastLogTerm }
      });
    });
  };

  const sendHeartbeats = (leader: RaftNode) => {
    sim.current.nodes.forEach(peer => {
      if (peer.id === leader.id) return;
      
      const nextIdx = leader.nextIndex[peer.id] || 1;
      const prevLogIndex = nextIdx - 1;
      const prevLogTerm = leader.log[prevLogIndex]?.term ?? 0;
      const entries = leader.log.slice(nextIdx);

      sendMessage({
        type: 'AppendEntries',
        source: leader.id,
        target: peer.id,
        term: leader.term,
        payload: {
          prevLogIndex,
          prevLogTerm,
          entries,
          leaderCommit: leader.commitIndex
        }
      });
    });
    leader.heartbeatTimer = HEARTBEAT_INTERVAL;
  };

  const processMessage = (msg: Message) => {
    const target = sim.current.nodes.find(n => n.id === msg.target);
    if (!target) return;

    // Rule for all servers: If RPC request or response contains term T > currentTerm: set currentTerm = T, convert to follower
    if (msg.term > target.term) {
      stepDown(target, msg.term);
    }

    switch (msg.type) {
      case 'RequestVote': {
        const { lastLogIndex, lastLogTerm } = msg.payload;
        let voteGranted = false;

        const targetLastLogIndex = target.log.length - 1;
        const targetLastLogTerm = target.log[targetLastLogIndex].term;
        
        const logIsUpToDate = lastLogTerm > targetLastLogTerm || (lastLogTerm === targetLastLogTerm && lastLogIndex >= targetLastLogIndex);

        if (msg.term >= target.term && (target.votedFor === null || target.votedFor === msg.source) && logIsUpToDate) {
          voteGranted = true;
          target.votedFor = msg.source;
          target.electionTimer = target.electionTimeout; // reset timer
        }

        sendMessage({
          type: 'VoteResponse',
          source: target.id,
          target: msg.source,
          term: target.term,
          payload: { voteGranted }
        });
        break;
      }

      case 'VoteResponse': {
        if (target.state !== 'CANDIDATE' || msg.term < target.term) break;
        if (msg.payload.voteGranted) {
          target.votesReceived.add(msg.source);
          if (target.votesReceived.size > sim.current.nodes.length / 2) {
            // Become Leader
            target.state = 'LEADER';
            addLog(`👑 Node ${target.id} became LEADER for term ${target.term}`);
            
            // Reinitialize leader state
            sim.current.nodes.forEach(p => {
              target.nextIndex[p.id] = target.log.length;
              target.matchIndex[p.id] = 0;
            });
            
            sendHeartbeats(target);
          }
        }
        break;
      }

      case 'AppendEntries': {
        const { prevLogIndex, prevLogTerm, entries, leaderCommit } = msg.payload;
        let success = false;

        if (msg.term >= target.term) {
          target.electionTimer = target.electionTimeout; // recognize leader, reset timer
          
          if (target.state === 'CANDIDATE') {
            stepDown(target, msg.term);
          }

          // Log matching property
          if (target.log[prevLogIndex] && target.log[prevLogIndex].term === prevLogTerm) {
            success = true;
            // Append new entries
            if (entries.length > 0) {
              target.log = [...target.log.slice(0, prevLogIndex + 1), ...entries];
              addLog(`Node ${target.id} replicated ${entries.length} entries.`);
            }
            // Update commit index
            if (leaderCommit > target.commitIndex) {
              target.commitIndex = Math.min(leaderCommit, target.log.length - 1);
            }
          }
        }

        sendMessage({
          type: 'AppendResponse',
          source: target.id,
          target: msg.source,
          term: target.term,
          payload: { success, matchIndex: prevLogIndex + entries.length }
        });
        break;
      }

      case 'AppendResponse': {
        if (target.state !== 'LEADER' || msg.term < target.term) break;
        
        const sourceId = msg.source;
        if (msg.payload.success) {
          target.matchIndex[sourceId] = Math.max(target.matchIndex[sourceId] || 0, msg.payload.matchIndex);
          target.nextIndex[sourceId] = target.matchIndex[sourceId] + 1;

          // Check if we can commit
          for (let N = target.log.length - 1; N > target.commitIndex; N--) {
            if (target.log[N].term === target.term) {
              let matchCount = 1; // self
              sim.current.nodes.forEach(p => {
                if (p.id !== target.id && (target.matchIndex[p.id] || 0) >= N) matchCount++;
              });
              if (matchCount > sim.current.nodes.length / 2) {
                target.commitIndex = N;
                addLog(`Leader ${target.id} committed up to index ${N}`);
                break;
              }
            }
          }
        } else {
          // Decrement nextIndex and retry
          target.nextIndex[sourceId] = Math.max(1, (target.nextIndex[sourceId] || 1) - 1);
          // Will retry on next heartbeat
        }
        break;
      }
    }
  };

  const tick = useCallback(() => {
    sim.current.time++;
    const s = sim.current;

    // 1. Process Messages
    const remainingMessages = [];
    for (const msg of s.messages) {
      if (s.time >= msg.deliverAt) {
        if (!msg.dropped) processMessage(msg);
      } else {
        remainingMessages.push(msg);
      }
    }
    s.messages = remainingMessages;

    // 2. Process Nodes
    s.nodes.forEach(node => {
      if (node.state === 'LEADER') {
        node.heartbeatTimer--;
        if (node.heartbeatTimer <= 0) {
          sendHeartbeats(node);
        }
      } else {
        node.electionTimer--;
        if (node.electionTimer <= 0) {
          startElection(node);
        }
      }
    });

    setTickCount(c => c + 1);
  }, []);

  // Main Loop
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(tick, TICK_MS);
    return () => clearInterval(interval);
  }, [playing, tick]);

  // --- Client Interaction ---

  const sendClientRequest = () => {
    const leader = sim.current.nodes.find(n => n.state === 'LEADER');
    if (!leader) {
      addLog('❌ Client request failed: No leader available.');
      return;
    }
    const cmd = `SET x=${cmdCounter}`;
    leader.log.push({ term: leader.term, command: cmd });
    addLog(`Client sent command: ${cmd} to Leader ${leader.id}`);
    setCmdCounter(c => c + 1);
    
    // Immediately send append entries
    sendHeartbeats(leader);
    setTickCount(c => c + 1);
  };

  const togglePartition = (n1: number, n2: number) => {
    const key = getPartitionKey(n1, n2);
    if (sim.current.partitions.has(key)) {
      sim.current.partitions.delete(key);
      addLog(`Network link restored between Node ${n1} & ${n2}`);
    } else {
      sim.current.partitions.add(key);
      addLog(`✂️ Network link cut between Node ${n1} & ${n2}`);
    }
    setTickCount(c => c + 1);
  };

  // --- Rendering Helpers ---

  const VIEW_SIZE = 600;
  const CENTER = VIEW_SIZE / 2;
  const RADIUS = 200;

  const getNodePos = (idx: number, total: number) => {
    const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
    return {
      x: CENTER + RADIUS * Math.cos(angle),
      y: CENTER + RADIUS * Math.sin(angle)
    };
  };

  const activeNodes = sim.current.nodes;
  const totalNodes = activeNodes.length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-mono flex flex-col overflow-hidden selection:bg-emerald-500/30">
      
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <Terminal className="text-emerald-400 w-6 h-6" />
          <h1 className="text-xl font-bold tracking-tight text-slate-100">
            Raft<span className="text-emerald-400">Animator</span>
            <span className="text-xs ml-2 px-2 py-1 bg-slate-800 rounded-md text-slate-400 border border-slate-700">ChatGPT Ed.</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-900 rounded-lg border border-slate-700 overflow-hidden shadow-inner">
            <button 
              onClick={() => setPlaying(!playing)}
              className={`px-4 py-2 flex items-center gap-2 transition-colors ${playing ? 'bg-emerald-900/40 text-emerald-400' : 'hover:bg-slate-800 text-slate-400'}`}
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
              {playing ? 'PAUSE' : 'PLAY'}
            </button>
            <button 
              onClick={tick}
              disabled={playing}
              className="px-4 py-2 flex items-center gap-2 hover:bg-slate-800 text-slate-400 disabled:opacity-50 border-l border-slate-700 transition-colors"
            >
              <SkipForward size={16} /> STEP
            </button>
            <button 
              onClick={() => initCluster(config.nodeCount)}
              className="px-4 py-2 flex items-center gap-2 hover:bg-slate-800 text-slate-400 border-l