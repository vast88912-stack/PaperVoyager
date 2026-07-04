import React, { useState, useEffect } from 'react';

// Types for our internal simulation
type NodeState = 'follower' | 'candidate' | 'leader' | 'down';

interface RaftNode {
  id: number;
  x: string;
  y: string;
  state: NodeState;
  term: number;
}

export default function App() {
  const [bootLog, setBootLog] = useState<string[]>([]);
  const [simStep, setSimStep] = useState(0);

  // Pentagon layout for 5 nodes
  const nodes: RaftNode[] = [
    { id: 0, x: '50%', y: '15%', state: 'follower', term: 1 },
    { id: 1, x: '85%', y: '40%', state: 'follower', term: 1 },
    { id: 2, x: '70%', y: '80%', state: 'follower', term: 1 },
    { id: 3, x: '30%', y: '80%', state: 'follower', term: 1 },
    { id: 4, x: '15%', y: '40%', state: 'follower', term: 1 },
  ];

  // Boot sequence effect
  useEffect(() => {
    const logs = [
      "Initializing Raft Consensus Protocol...",
      "Loading configuration: 5 nodes, default timeouts",
      "Mounting visualizer components...",
      "Establishing network topology...",
      "SYSTEM READY. Awaiting cluster initialization."
    ];
    
    let currentLog = 0;
    const interval = setInterval(() => {
      if (currentLog < logs.length) {
        setBootLog(prev => [...prev, logs[currentLog]]);
        currentLog++;
      } else {
        clearInterval(interval);
      }
    }, 400);

    return () => clearInterval(interval);
  }, []);

  // Mini-simulation effect for the Hero visual
  useEffect(() => {
    const simInterval = setInterval(() => {
      setSimStep((prev) => (prev + 1) % 5);
    }, 2000);
    return () => clearInterval(simInterval);
  }, []);

  // Derive node states based on the current step of the mini-simulation
  const getNodes = (): RaftNode[] => {
    const currentNodes = [...nodes];
    if (simStep === 0) {
      // Step 0: All followers
      return currentNodes;
    } else if (simStep === 1) {
      // Step 1: Node 0 times out, becomes candidate
      currentNodes[0].state = 'candidate';
      currentNodes[0].term = 2;
    } else if (simStep === 2) {
      // Step 2: Requesting votes
      currentNodes[0].state = 'candidate';
      currentNodes[0].term = 2;
    } else if (simStep >= 3) {
      // Step 3 & 4: Node 0 is leader, others follow term 2
      currentNodes[0].state = 'leader';
      currentNodes[0].term = 2;
      currentNodes.forEach((n, i) => { if (i !== 0) n.term = 2; });
    }
    return currentNodes;
  };

  const currentNodes = getNodes();

  const getNodeColor = (state: NodeState) => {
    switch (state) {
      case 'leader': return 'bg-cyan-500 border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.6)]';
      case 'candidate': return 'bg-amber-500 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.6)]';
      case 'follower': return 'bg-slate-700 border-slate-500';
      case 'down': return 'bg-red-900 border-red-700';
    }
  };

  const getTextColor = (state: NodeState) => {
    switch (state) {
      case 'leader': return 'text-cyan-400';
      case 'candidate': return 'text-amber-400';
      case 'follower': return 'text-slate-400';
      case 'down': return 'text-red-500';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-mono flex items-center justify-center p-4 md:p-8 overflow-hidden selection:bg-cyan-900 selection:text-cyan-100">
      
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-20" 
           style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl w-full items-center">
        
        {/* Left Column: Terminal / Text */}
        <div className="lg:col-span-6 space-y-8">
          
          {/* Faux Terminal Window */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shadow-2xl shadow-black/50">
            <div className="bg-slate-800 px-4 py-2 flex items-center gap-2 border-b border-slate-700">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <div className="ml-4 text-xs text-slate-400 font-sans tracking-wider">bash - educator@raft-sim:~</div>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-green-400">
                <span className="text-emerald-500 mr-2">➜</span>
                <span className="text-cyan-300">~</span> ./start-raft-animator.sh
              </div>
              
              <div className="space-y-1 text-sm md:text-base">
                {bootLog.map((log, idx) => (
                  <div key={idx} className="text-slate-400 animate-pulse">
                    <span className="text-slate-600 mr-2">[{new Date().toISOString().split('T')[1].slice(0, 8)}]</span> 
                    {log}
                  </div>
                ))}
              </div>

              {bootLog.length >= 5 && (
                <div className="pt-4 animate-fade-in">
                  <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 tracking-tight">
                    Raft Consensus <br />
                    <span className="text-cyan-400">Animator</span>
                  </h1>
                  <p className="text-sm text-green-400 mb-6">[ChatGPT Edition]</p>
                  
                  <p className="text-slate-300 leading-relaxed mb-6">
                    Understand distributed consensus through interactive visualization. 
                    Explore leader election, log replication, and safety under network partitions in real-time.
                  </p>

                  <div className="flex flex-wrap gap-4">
                    <button className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-6 py-3 font-bold transition-all transform hover:scale-105 shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center gap-2">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                      INIT_CLUSTER
                    </button>
                    <button className="border border-slate-600 hover:border-slate-400 hover:bg-slate-800 text-slate-300 px-6 py-3 font-bold transition-all flex items-center gap-2">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                      READ_DOCS
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs md:text-sm">
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-md">
              <div className="text-amber-400 font-bold mb-1">01. ELECTION</div>
              <div className="text-slate-500">Visualize randomized timeouts & voting.</div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-md">
              <div className="text-cyan-400 font-bold mb-1">02. REPLICATION</div>
              <div className="text-slate-500">Watch AppendEntries propagate logs.</div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-md">
              <div className="text-red-400 font-bold mb-1">03. PARTITIONS</div>
              <div className="text-slate-500">Sever links and test split-brain recovery.</div>
            </div>
          </div>

        </div>

        {/* Right Column: Visualizer */}
        <div className="lg:col-span-6 flex justify-center items-center">
          <div className="relative w-full max-w-md aspect-square bg-slate-900/80 border border-slate-700 rounded-xl shadow-2xl overflow-hidden backdrop-blur-sm">
            
            {/* Status Bar */}
            <div className="absolute top-0 inset-x-0 bg-slate-800/80 px-4 py-2 border-b border-slate-700 flex justify-between items-center text-xs z-20">
              <span className="text-slate-400">CLUSTER_STATUS: <span className="text-green-400">ONLINE</span></span>
              <span className="text-slate-400">SIM_STEP: <span className="text-cyan-400">{simStep}</span></span>
            </div>

            {/* Network Graph Layer (SVG) */}
            <svg className="absolute inset-0 w-full h-full z-0 pointer-events-none">
              {nodes.map((n1, i) => 
                nodes.map((n2, j) => {
                  if (i >= j) return null; // Draw unique edges only
                  
                  // Determine edge styling based on simulation step
                  let strokeColor = "#334155"; // slate-700
                  let strokeWidth = 1;
                  let strokeDasharray = "none";
                  let animate = false;

                  if (simStep === 2 && (i === 0 || j === 0)) {
                    // Node 0 requesting votes
                    strokeColor = "#F59E0B"; // amber-500
                    strokeDasharray = "4 4";
                    animate = true;
                  } else if (simStep === 3 && (i === 0 || j === 0)) {
                     // Followers granting votes
                     strokeColor = "#10B981"; // emerald-500
                     strokeDasharray = "4 4";
                     animate = true;
                  } else if (simStep === 4 && (i === 0 || j === 0)) {
                    // Leader heartbeats
                    strokeColor = "#06B6D4"; // cyan-500
                    strokeWidth = 2;
                  }

                  return (
                    <line 
                      key={`${i}-${j}`}
                      x1={n1.x} y1={n1.y} 
                      x2={n2.x} y2={n2.y} 
                      stroke={strokeColor} 
                      strokeWidth={strokeWidth}
                      strokeDasharray={strokeDasharray}
                      className={`transition-colors duration-500 ${animate ? 'animate-pulse' : ''}`}
                    />
                  );
                })
              )}
            </svg>

            {/* Nodes Layer */}
            {currentNodes.map((node) => (
              <div 
                key={node.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-10 transition-all duration-500"
                style={{ left: node.x, top: node.y }}
              >
                {/* Node Circle */}
                <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full border-2 flex items-center justify-center text-lg font-bold transition-all duration-500 ${getNodeColor(node.state)}`}>
                  N{node.id}
                  
                  {/* Heartbeat pulse ring for leader */}
                  {node.state === 'leader' && simStep === 4 && (
                    <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping opacity-75"></div>
                  )}
                </div>
                
                {/* Node Metadata */}
                <div className="mt-2 text-[10px] md:text-xs text-center bg-slate-950/80 px-2 py-1 rounded border border-slate-700">
                  <div className={`uppercase font-bold ${getTextColor(node.state)} transition-colors duration-300`}>
                    {node.state}
                  </div>
                  <div className="text-slate-500">Term: {node.term}</div>
                </div>
              </div>
            ))}

            {/* Overlay description for simulation */}
            <div className="absolute bottom-4 inset-x-4 bg-slate-950/90 border border-slate-700 p-3 rounded-lg text-xs md:text-sm z-20 shadow-lg">
              <span className="text-slate-400 block mb-1">ANIMATION_LOG:</span>
              <div className="text-green-400 min-h-[40px] flex items-center">
                {simStep === 0 && "> Cluster idle. Followers awaiting heartbeats..."}
                {simStep === 1 && "> N0 heartbeat timeout! Converting to Candidate."}
                {simStep === 2 && "> N0 incremented term to 2. Requesting votes..."}
                {simStep === 3 && "> N0 received majority votes. Transitioning to Leader."}
                {simStep === 4 && "> N0 broadcasting AppendEntries (heartbeats)..."}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}