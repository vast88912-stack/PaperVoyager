import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- TYPES & CONSTANTS ---
type NodeState = 'Follower' | 'Candidate' | 'Leader';

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
  matchIndex: Record<number, number>;
  nextIndex: Record<number, number>;
  timer: number;
  maxTimer: number;
  votesReceived: Set<number>;
}

type MsgType = 'RequestVote' | 'VoteReply' | 'AppendEntries' | 'AppendReply';

interface Message {
  id: string;
  src: number;
  dst: number;
  type: MsgType;
  term: number;
  payload: any;
  progress: number; // 0 to 1
  speed: number;
}

const COLORS = {
  Follower: '#94a3b8', // slate-400
  Candidate: '#facc15', // yellow-400
  Leader: '#22d3ee', // cyan-400
  bg: '#020617', // slate-950
  panel: '#0f172a', // slate-900
  text: '#22c55e', // green-500 (terminal)
};

const MSG_COLORS = {
  RequestVote: '#facc15',
  VoteReply: '#a3e635',
  AppendEntries: '#22d3ee',
  AppendReply: '#818cf8',
};

const NUM_NODES = 5;
const BASE_ELECTION_TIMEOUT = 150; // ticks
const HEARTBEAT_INTERVAL = 50; // ticks

// --- HELPER FUNCTIONS ---
const generateId = () => Math.random().toString(36).substring(2, 9);
const getPartitionKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

const createInitialNodes = (count: number): RaftNode[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    state: 'Follower',
    term: 0,
    votedFor: null,
    log: [],
    commitIndex: 0,
    matchIndex: {},
    nextIndex: {},
    timer: BASE_ELECTION_TIMEOUT + Math.random() * 150,
    maxTimer: BASE_ELECTION_TIMEOUT + 150,
    votesReceived: new Set(),
  }));
};

// --- MAIN COMPONENT ---
export default function App() {
  // UI State
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'partitions' | 'safety'>('overview');
  const [simSpeed, setSimSpeed] = useState(1);
  const [packetLoss, setPacketLoss] = useState(0);
  const [clientReqCount, setClientReqCount] = useState(0);

  // Simulation State (Refs for synchronous updates in tick)
  const nodesRef = useRef<RaftNode[]>(createInitialNodes(NUM_NODES));
  const messagesRef = useRef<Message[]>([]);
  const partitionsRef = useRef<Set<string>>(new Set());
  const tickCountRef = useRef(0);

  // Render State (Syncs with Refs for UI)
  const [renderTrigger, setRenderTrigger] = useState(0);

  // --- SIMULATION ENGINE ---
  const triggerRender = () => setRenderTrigger((prev) => prev + 1);

  const resetSim = useCallback(() => {
    nodesRef.current = createInitialNodes(NUM_NODES);
    messagesRef.current = [];
    partitionsRef.current = new Set();
    tickCountRef.current = 0;
    setClientReqCount(0);
    triggerRender();
  }, []);

  const sendClientRequest = useCallback(() => {
    const leader = nodesRef.current.find((n) => n.state === 'Leader');
    if (leader) {
      leader.log.push({ term: leader.term, command: `CMD_${clientReqCount + 1}` });
      setClientReqCount((c) => c + 1);
      triggerRender();
    } else {
      alert("No leader currently elected!");
    }
  }, [clientReqCount]);

  const togglePartition = useCallback((a: number, b: number) => {
    const key = getPartitionKey(a, b);
    if (partitionsRef.current.has(key)) {
      partitionsRef.current.delete(key);
    } else {
      partitionsRef.current.add(key);
    }
    triggerRender();
  }, []);

  const stepSimulation = useCallback(() => {
    const nodes = nodesRef.current;
    let messages = messagesRef.current;
    const partitions = partitionsRef.current;

    tickCountRef.current += 1;

    // 1. Process Messages
    const nextMessages: Message[] = [];
    for (const msg of messages) {
      msg.progress += msg.speed * simSpeed;

      // Packet loss check on send
      if (msg.progress === msg.speed * simSpeed && Math.random() < packetLoss) {
        continue; // Drop packet
      }

      // Partition check
      if (partitions.has(getPartitionKey(msg.src, msg.dst))) {
        // Visualize dropping by removing it halfway
        if (msg.progress < 0.5) nextMessages.push(msg);
        continue;
      }

      if (msg.progress >= 1) {
        // Deliver message
        const dstNode = nodes.find((n) => n.id === msg.dst);
        if (!dstNode) continue;

        // Raft Rules: Higher term always demotes to Follower
        if (msg.term > dstNode.term) {
          dstNode.state = 'Follower';
          dstNode.term = msg.term;
          dstNode.votedFor = null;
        }

        if (msg.type === 'RequestVote') {
          let voteGranted = false;
          if (msg.term >= dstNode.term && (dstNode.votedFor === null || dstNode.votedFor === msg.src)) {
            voteGranted = true;
            dstNode.votedFor = msg.src;
            dstNode.timer = BASE_ELECTION_TIMEOUT + Math.random() * 150; // reset timer
          }
          nextMessages.push({
            id: generateId(),
            src: dstNode.id,
            dst: msg.src,
            type: 'VoteReply',
            term: dstNode.term,
            payload: { voteGranted },
            progress: 0,
            speed: 0.02,
          });
        } else if (msg.type === 'VoteReply') {
          if (dstNode.state === 'Candidate' && msg.term === dstNode.term && msg.payload.voteGranted) {
            dstNode.votesReceived.add(msg.src);
            if (dstNode.votesReceived.size > Math.floor(nodes.length / 2)) {
              // Become Leader
              dstNode.state = 'Leader';
              dstNode.timer = 0; // Send heartbeat immediately
              nodes.forEach((n) => {
                dstNode.nextIndex[n.id] = dstNode.log.length;
                dstNode.matchIndex[n.id] = 0;
              });
            }
          }
        } else if (msg.type === 'AppendEntries') {
          if (msg.term >= dstNode.term) {
            dstNode.timer = BASE_ELECTION_TIMEOUT + Math.random() * 150; // reset timer
            dstNode.state = 'Follower';
            
            // Simplified Log Replication
            const { entries, leaderCommit } = msg.payload;
            if (entries.length > 0) {
              // Simplification: just overwrite log for visualization
              dstNode.log = [...entries];
            }
            if (leaderCommit > dstNode.commitIndex) {
              dstNode.commitIndex = Math.min(leaderCommit, dstNode.log.length);
            }

            nextMessages.push({
              id: generateId(),
              src: dstNode.id,
              dst: msg.src,
              type: 'AppendReply',
              term: dstNode.term,
              payload: { success: true, matchIndex: dstNode.log.length },
              progress: 0,
              speed: 0.02,
            });
          }
        } else if (msg.type === 'AppendReply') {
          if (dstNode.state === 'Leader' && msg.payload.success) {
            dstNode.matchIndex[msg.src] = msg.payload.matchIndex;
            dstNode.nextIndex[msg.src] = msg.payload.matchIndex + 1;

            // Advance commit index if majority agrees
            const matchIndices = [dstNode.log.length, ...nodes.filter(n => n.id !== dstNode.id).map(n => dstNode.matchIndex[n.id] || 0)];
            matchIndices.sort((a, b) => b - a);
            const majorityIndex = matchIndices[Math.floor(nodes.length / 2)];
            if (majorityIndex > dstNode.commitIndex) {
              dstNode.commitIndex = majorityIndex;
            }
          }
        }
      } else {
        nextMessages.push(msg);
      }
    }
    messagesRef.current = nextMessages;

    // 2. Update Nodes
    nodes.forEach((node) => {
      if (node.state === 'Leader') {
        node.timer -= 1 * simSpeed;
        if (node.timer <= 0) {
          node.timer = HEARTBEAT_INTERVAL;
          // Send AppendEntries (Heartbeats / Log sync)
          nodes.forEach((target) => {
            if (target.id !== node.id) {
              messagesRef.current.push({
                id: generateId(),
                src: node.id,
                dst: target.id,
                type: 'AppendEntries',
                term: node.term,
                payload: {
                  entries: node.log,
                  leaderCommit: node.commitIndex,
                },
                progress: 0,
                speed: 0.02,
              });
            }
          });
        }
      } else {
        // Follower or Candidate
        node.timer -= 1 * simSpeed;
        if (node.timer <= 0) {
          // Election Timeout -> Start Election
          node.state = 'Candidate';
          node.term += 1;
          node.votedFor = node.id;
          node.votesReceived = new Set([node.id]);
          node.timer = BASE_ELECTION_TIMEOUT + Math.random() * 150;
          node.maxTimer = node.timer;

          nodes.forEach((target) => {
            if (target.id !== node.id) {
              messagesRef.current.push({
                id: generateId(),
                src: node.id,
                dst: target.id,
                type: 'RequestVote',
                term: node.term,
                payload: {},
                progress: 0,
                speed: 0.02,
              });
            }
          });
        }
      }
    });

    triggerRender();
  }, [simSpeed, packetLoss]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(stepSimulation, 30);
    return () => clearInterval(interval);
  }, [isPlaying, stepSimulation]);

  // --- VISUALIZATION MATH ---
  const getCoordinates = (index: number, total: number, radius: number, cx: number, cy: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  };

  const cx = 250;
  const cy = 250;
  const radius = 180;

  const nodeCoords = nodesRef.current.map((_, i) => getCoordinates(i, NUM_NODES, radius, cx, cy));

  return (
    <div className="min-h-screen bg-[#020617] text-[#22c55e] font-mono p-4 flex flex-col selection:bg-green-900">
      
      {/* HEADER */}
      <header className="border-b border-green-900/50 pb-4 mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]">
            &gt; RAFT_CONSENSUS_ANIMATOR
          </h1>
          <p className="text-xs text-green-700 mt-1">[SYSTEM_MODE: DISTRIBUTED_SIMULATION]</p>
        </div>
        
        <div className="flex gap-4 items-center bg-[#0f172a] p-2 rounded border border-green-900/50">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-4 py-1 bg-green-900/30 hover:bg-green-800/50 text-green-300 border border-green-700 rounded transition-colors"
          >
            {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
          </button>
          <button 
            onClick={stepSimulation}
            disabled={isPlaying}
            className="px-4 py-1 bg-green-900/30 hover:bg-green-800/50 text-green-300 border border-green-700 rounded transition-colors disabled:opacity-50"
          >
            ⏭ STEP
          </button>
          <button 
            onClick={resetSim}
            className="px-4 py-1 bg-red-900/30 hover:bg-red-800/50 text-red-400 border border-red-700 rounded transition-colors"
          >
            ⟲ RESET
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        
        {/* LEFT: NETWORK VISUALIZATION */}
        <div className="w-1/2 flex flex-col bg-[#0f172a] rounded-lg border border-green-900/30 p-4 relative shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
          <div className="flex justify-between items-center mb-2 z-10">
            <h2 className="text-sm font-bold text-green-500">NETWORK_TOPOLOGY</h2>
            <div className="text-xs text-green-700">TICK: {tickCountRef.current}</div>
          </div>
          
          <div className="flex-1 relative flex items-center justify-center min-h-[500px]">
            <svg width="500" height="500" className="absolute">
              {/* Links */}
              {nodesRef.current.map((n1, i) => 
                nodesRef.current.map((n2, j) => {
                  if (i >= j) return null;
                  const isPartitioned = partitionsRef.current.has(getPartitionKey(n1.id, n2.id));
                  return (
                    <g key={`link-${i}-${j}`}>
                      <line
                        x1={nodeCoords[i].x}
                        y1={nodeCoords[i].y}
                        x2={nodeCoords[j].x}
                        y2={nodeCoords[j].y}
                        stroke={isPartitioned ? '#ef4444' : '#1e293b'}
                        strokeWidth={isPartitioned ? 2 : 1}
                        strokeDasharray={isPartitioned ? "5,5" : "none"}
                        className="transition-all duration-300"
                      />
                      {/* Invisible clickable area for partitions */}
                      <line
                        x1={nodeCoords[i].x}
                        y1={nodeCoords[i].y}
                        x2={nodeCoords[j].x}
                        y2={nodeCoords[j].y}
                        stroke="transparent"
                        strokeWidth="20"
                        className="cursor-crosshair"
                        onClick={() => togglePartition(n1.id, n2.id)}
                      />
                    </g>
                  );
                })
              )}

              {/* Messages */}
              {messagesRef.current.map((msg) => {
                const srcCoord = nodeCoords[nodesRef.current.findIndex(n => n.id === msg.src)];
                const dstCoord = nodeCoords[nodesRef.current.findIndex(n => n.id === msg.dst)];
                if (!srcCoord || !dstCoord) return null;

                const x = srcCoord.x + (dstCoord.x - srcCoord.x) * msg.progress;
                const y = srcCoord.y + (dstCoord.y - srcCoord.y) * msg.progress;

                return (
                  <circle
                    key={msg.id}
                    cx={x}
                    cy={y}
                    r="4"
                    fill={MSG_COLORS[msg.type]}
                    className="drop-shadow-[0_0_3px_currentColor]"
                  />
                );
              })}

              {/* Nodes */}
              {nodesRef.current.map((node, i) => {
                const coord = nodeCoords[i];
                const color = COLORS[node.state];
                const isLeader = node.state === 'Leader';
                
                return (
                  <g key={`node-${node.id}`} transform={`translate(${coord.x}, ${coord.y})`}>
                    {/* Timer Ring */}
                    {!isLeader && (
                      <circle
                        cx="0" cy="0" r="24"
                        fill="none"
                        stroke="#334155"
                        strokeWidth="3"
                      />
                    )}
                    {!isLeader && (
                      <circle
                        cx="0" cy="0" r="24"
                        fill="none"
                        stroke={color}
                        strokeWidth="3"
                        strokeDasharray={`${(node.timer / node.maxTimer) * 150} 150`}
                        transform="rotate(-90)"
                        className="transition-all duration-75"
                      />
                    )}
                    
                    {/* Node Body */}
                    <circle
                      cx="0" cy="0" r="20"
                      fill="#020617"
                      stroke={color}
                      strokeWidth={isLeader ? 4 : 2}
                      className={isLeader ? "drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]" : ""}
                    />
                    <text
                      x="0" y="5"
                      textAnchor="middle"
                      fill={color}
                      fontSize="14"
                      fontWeight="bold"
                    >
                      N{node.id}
                    </text>
                    
                    {/* Term Badge */}
                    <rect x="-12" y="22" width="24" height="14" rx="3" fill="#1e293b" />
                    <text x="0" y="32" textAnchor="middle" fill="#94a3b8" fontSize="10">
                      T:{node.term}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex gap-4 justify-center text-xs mt-4 border-t border-green-900/30 pt-4">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400"></span> Follower</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span> Candidate</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400"></span> Leader</span>
            <span className="flex items-center gap-1 ml-4"><span className="w-2 h-2 rounded-full bg-red-500"></span> Partitioned Link</span>
          </div>
        </div>

        {/* RIGHT: CONTROL PANEL & DASHBOARD */}
        <div className="w-1/2 flex flex-col gap-4">
          
          {/* Tabs */}
          <div className="flex gap-2 border-b border-green-900/50 pb-2">
            {(['overview', 'logs', 'partitions', 'safety'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 text-sm uppercase tracking-wider rounded transition-colors ${
                  activeTab === tab ? 'bg-green-900/50 text-green-300 border border-green-500/50' : 'text-green-700 hover:text-green-500'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 bg-[#0f172a] rounded-lg border border-green-900/30 p-4 overflow-y-auto custom-scrollbar shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
            
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-green-500 mb-2 border-b border-green-900/50 pb-1">CLUSTER_STATUS</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {nodesRef.current.map(n => (
                      <div key={n.id} className="p-2 border border-green-900/30 rounded bg-[#020617]">
                        <div className="flex justify-between">
                          <span className="font-bold" style={{ color: COLORS[n.state] }}>NODE {n.id}</span>
                          <span className="text-xs text-slate-500">{n.state}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Term: {n.term} | Commit: {n.commitIndex}
                        </div>
                        <div className="w-full bg-slate-800 h-1 mt-2 rounded overflow-hidden">
                          <div 
                            className="h-full bg-slate-500 transition-all"
                            style={{ width: `${(n.timer / n.maxTimer) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-green-500 mb-2 border-b border-green-900/50 pb-1">SIM_CONTROLS</h3>
                  <div className="space-y-4 text-