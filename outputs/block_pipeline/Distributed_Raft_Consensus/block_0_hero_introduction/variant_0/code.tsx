import React, { useState, useEffect } from 'react';
import { Terminal, Server, Activity, ShieldAlert, Play, Network, ChevronRight } from 'lucide-react';

// --- Types & Interfaces ---
interface LogLine {
  id: number;
  text: string;
  type: 'info' | 'success' | 'warning' | 'system';
}

interface NodeData {
  id: number;
  x: number;
  y: number;
  state: 'follower' | 'candidate' | 'leader';
  active: boolean;
}

// --- Constants ---
const BOOT_SEQUENCE = [
  { text: "Raft Consensus Animator (ChatGPT Edition) v1.0.0", type: "system" },
  { text: "Initializing distributed environment...", type: "info" },
  { text: "Loading module: Leader Election [OK]", type: "success" },
  { text: "Loading module: Log Replication [OK]", type: "success" },
  { text: "Loading module: Network Partition Sandbox [OK]", type: "success" },
  { text: "Loading module: Safety Invariants Checker [OK]", type: "success" },
  { text: "Provisioning 5-node cluster...", type: "info" },
  { text: "Cluster ready. Awaiting manual start.", type: "warning" }
] as const;

const NODE_POSITIONS = [
  { id: 1, x: 50, y: 15 },
  { id: 2, x: 85, y: 40 },
  { id: 3, x: 70, y: 85 },
  { id: 4, x: 30, y: 85 },
  { id: 5, x: 15, y: 40 },
];

export default function App() {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [bootComplete, setBootComplete] = useState(false);
  const [nodes, setNodes] = useState<NodeData[]>(
    NODE_POSITIONS.map(pos => ({ ...pos, state: 'follower', active: false }))
  );
  const [leaderId, setLeaderId] = useState<number | null>(null);

  // Terminal Boot Sequence Effect
  useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < BOOT_SEQUENCE.length) {
        setLogs(prev => [
          ...prev,
          { id: Date.now() + currentIndex, ...BOOT_SEQUENCE[currentIndex] }
        ]);
        currentIndex++;
      } else {
        clearInterval(interval);
        setBootComplete(true);
        // Elect a mock leader after boot
        setTimeout(() => {
          setLeaderId(1);
          setNodes(prev => prev.map(n => n.id === 1 ? { ...n, state: 'leader' } : n));
        }, 1000);
      }
    }, 400);

    return () => clearInterval(interval);
  }, []);

  // Mock Heartbeat Effect
  useEffect(() => {
    if (!bootComplete || !leaderId) return;

    const heartbeatInterval = setInterval(() => {
      // Flash the leader
      setNodes(prev => prev.map(n => n.id === leaderId ? { ...n, active: true } : n));
      
      // Flash followers shortly after
      setTimeout(() => {
        setNodes(prev => prev.map(n => ({ ...n, active: n.id !== leaderId })));
      }, 150);

      // Reset active state
      setTimeout(() => {
        setNodes(prev => prev.map(n => ({ ...n, active: false })));
      }, 400);

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

  const getNodeColor = (state: string, active: boolean) => {
    if (state === 'leader') return active ? 'bg-yellow-300 shadow-[0_0_20px_rgba(253,224,71,0.8)]' : 'bg-yellow-500';
    if (state === 'candidate') return 'bg-blue-500';
    return active ? 'bg-green-400 shadow-[0_0_15px_rgba(74,222,128,0.6)]' : 'bg-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-mono selection:bg-green-900 selection:text-green-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Grid & Scanlines */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(0,255,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px] z-50 opacity-20" />

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 z-10">
        
        {/* Left Column: Hero Copy & Terminal */}
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

          {/* Terminal Window */}
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
                  <span>{`>`}</span>
                  <span className="animate-pulse">_</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 pt-4">
            <button 
              disabled={!bootComplete}
              className={`group relative inline-flex items-center justify-center px-8 py-4 font-bold text-black transition-all duration-200 bg-green-500 rounded-md hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed ${bootComplete ? 'shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_rgba(34,197,94,0.6)]' : ''}`}
            >
              <Play className="w-5 h-5 mr-2 fill-current" />
              START SIMULATION
              <ChevronRight className="w-5 h-5 ml-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
            <button className="inline-flex items-center justify-center px-8 py-4 font-bold text-gray-300 transition-all duration-200 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 hover:text-white focus:outline-none">
              Documentation
            </button>
          </div>
        </div>

        {/* Right Column: Interactive Mini-Cluster Visualization */}
        <div className="relative flex items-center justify-center min-h-[500px] lg:min-h-full">
          <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-blue-500/5 rounded-full blur-3xl" />
          
          <div className="relative w-full max-w-md aspect-square border border-gray-800/50 rounded-full bg-gray-900/20 backdrop-blur-sm">
            {/* Network Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
              {nodes.map((n1, i) => 
                nodes.slice(i + 1).map(n2 => (
                  <line 
                    key={`${n1.id}-${n2.id}`}
                    x1={`${n1.x}%`} 
                    y1={`${n1.y}%`} 
                    x2={`${n2.x}%`} 
                    y2={`${n2.y}%`} 
                    stroke={n1.active || n2.active ? "rgba(74, 222, 128, 0.4)" : "rgba(55, 65, 81, 0.5)"}
                    strokeWidth={n1.active || n2.active ? "2" : "1"}
                    className="transition-all duration-300"
                  />
                ))
              )}
            </svg>

            {/* Nodes */}
            {nodes.map((node) => (
              <div
                key={node.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center"
                style={{ left: `${node.x}%`, top: `${node.y}%`, zIndex: 10 }}
              >
                <div className={`w-12 h-12 rounded-full border-2 border-gray-950 flex items-center justify-center transition-all duration-300 ${getNodeColor(node.state, node.active)}`}>
                  <Server className={`w-5 h-5 ${node.state === 'leader' ? 'text-yellow-950' : 'text-gray-950'}`} />
                </div>
                <div className="mt-2 px-2 py-0.5 bg-gray-950/80 border border-gray-800 rounded text-[10px] text-gray-400 uppercase tracking-wider backdrop-blur-md">
                  Node {node.id}
                </div>
                {node.state === 'leader' && (
                  <div className="absolute -top-6 text-yellow-400 text-xs font-bold animate-bounce">
                    LEADER
                  </div>
                )}
              </div>
            ))}

            {/* Center Info Overlay */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <div className="text-gray-500 text-xs tracking-widest uppercase mb-1">Term</div>
              <div className="text-3xl font-bold text-gray-200 font-mono">{bootComplete ? '42' : '--'}</div>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Features Bar */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-gray-800/50 bg-gray-950/80 backdrop-blur-md p-4 hidden md:block z-20">
        <div className="max-w-6xl mx-auto grid grid-cols-4 gap-4 text-sm text-gray-400">
          <div className="flex items-center space-x-3">
            <Server className="w-5 h-5 text-blue-400" />
            <span>Leader Election</span>
          </div>
          <div className="flex items-center space-x-3">
            <Activity className="w-5 h-5 text-green-400" />
            <span>Log Replication</span>
          </div>
          <div className="flex items-center space-x-3">
            <Network className="w-5 h-5 text-purple-400" />
            <span>Partition Sandbox</span>
          </div>
          <div className="flex items-center space-x-3">
            <ShieldAlert className="w-5 h-5 text-yellow-400" />
            <span>Safety Invariants</span>
          </div>
        </div>
      </div>
    </div>
  );
}