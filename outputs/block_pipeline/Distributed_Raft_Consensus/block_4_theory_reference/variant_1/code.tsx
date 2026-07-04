import React, { useState, useEffect } from 'react';
import { Terminal, Shield, Cpu, BookOpen, ChevronRight, ChevronDown, CheckSquare, AlertTriangle, Server, Network } from 'lucide-react';

// --- DATA MODELS ---

const INVARIANTS = [
  {
    id: 'election-safety',
    title: 'Election Safety',
    description: 'At most one leader can be elected in a given term.',
    detail: 'Raft ensures this by requiring a candidate to secure votes from a majority of the cluster. Since a node can only vote once per term, it is mathematically impossible for two candidates to both get a majority in the same term.',
    icon: <Shield className="w-5 h-5 text-cyan-400" />,
    color: 'border-cyan-500/50',
    bg: 'bg-cyan-950/30'
  },
  {
    id: 'leader-append-only',
    title: 'Leader Append-Only',
    description: 'A leader never overwrites or deletes entries in its log; it only appends new entries.',
    detail: 'The leader\'s log is the absolute truth. If a follower\'s log conflicts with the leader\'s, the leader forces the follower to duplicate its own log, overwriting the follower\'s inconsistencies.',
    icon: <Server className="w-5 h-5 text-emerald-400" />,
    color: 'border-emerald-500/50',
    bg: 'bg-emerald-950/30'
  },
  {
    id: 'log-matching',
    title: 'Log Matching',
    description: 'If two logs contain an entry with the same index and term, the logs are identical in all entries up through that index.',
    detail: 'This is maintained by the AppendEntries consistency check. When a leader sends a new entry, it includes the index and term of the preceding entry. If the follower does not find a match, it rejects the request.',
    icon: <CheckSquare className="w-5 h-5 text-yellow-400" />,
    color: 'border-yellow-500/50',
    bg: 'bg-yellow-950/30'
  },
  {
    id: 'leader-completeness',
    title: 'Leader Completeness',
    description: 'If a log entry is committed in a given term, that entry will be present in the logs of the leaders for all higher-numbered terms.',
    detail: 'During elections, the RequestVote RPC includes the candidate\'s last log index and term. A voter denies its vote if its own log is more up-to-date than the candidate\'s. Thus, a candidate cannot win an election unless it contains all committed entries.',
    icon: <Network className="w-5 h-5 text-purple-400" />,
    color: 'border-purple-500/50',
    bg: 'bg-purple-950/30'
  },
  {
    id: 'state-machine-safety',
    title: 'State Machine Safety',
    description: 'If a server has applied a log entry at a given index to its state machine, no other server will ever apply a different log entry for the same index.',
    detail: 'This naturally emerges from Leader Completeness and Log Matching. Once an entry is committed and applied, all future leaders will have it, and all followers will eventually replicate it.',
    icon: <Cpu className="w-5 h-5 text-rose-400" />,
    color: 'border-rose-500/50',
    bg: 'bg-rose-950/30'
  }
];

const ROLES = [
  {
    name: 'Follower',
    color: 'text-blue-400',
    border: 'border-blue-500/50',
    bg: 'bg-blue-950/20',
    desc: 'Passive state. Responds to RPCs from leaders and candidates.',
    rules: [
      'Responds to valid AppendEntries and RequestVote RPCs.',
      'If election timeout elapses without receiving AppendEntries or granting vote, converts to Candidate.'
    ]
  },
  {
    name: 'Candidate',
    color: 'text-yellow-400',
    border: 'border-yellow-500/50',
    bg: 'bg-yellow-950/20',
    desc: 'Active state trying to become leader.',
    rules: [
      'Increments currentTerm and votes for self.',
      'Sends RequestVote RPCs to all other servers.',
      'If votes received from majority: becomes Leader.',
      'If AppendEntries received from new leader: steps down to Follower.'
    ]
  },
  {
    name: 'Leader',
    color: 'text-green-400',
    border: 'border-green-500/50',
    bg: 'bg-green-950/20',
    desc: 'Handles all client requests and replicates log to followers.',
    rules: [
      'Sends empty AppendEntries (heartbeats) upon election to establish authority.',
      'Accepts client commands, appends to local log.',
      'Replicates to followers. Once replicated to majority, applies to state machine and replies to client.'
    ]
  }
];

const RPCS = [
  {
    name: 'AppendEntries',
    type: 'Replication & Heartbeat',
    args: ['term', 'leaderId', 'prevLogIndex', 'prevLogTerm', 'entries[]', 'leaderCommit'],
    results: ['term', 'success'],
    desc: 'Invoked by leader to replicate log entries and provide a form of heartbeat.'
  },
  {
    name: 'RequestVote',
    type: 'Election',
    args: ['term', 'candidateId', 'lastLogIndex', 'lastLogTerm'],
    results: ['term', 'voteGranted'],
    desc: 'Invoked by candidates to gather votes.'
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'invariants' | 'roles' | 'rpc'>('invariants');
  const [expandedInvariant, setExpandedInvariant] = useState<string | null>('election-safety');
  const [cursorBlink, setCursorBlink] = useState(true);

  // Blinking cursor effect
  useEffect(() => {
    const interval = setInterval(() => setCursorBlink((prev) => !prev), 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-green-500 font-mono p-4 sm:p-8 flex justify-center">
      <div className="max-w-5xl w-full flex flex-col gap-6">
        
        {/* Header */}
        <header className="border-b border-green-500/30 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <Terminal className="w-8 h-8 text-green-400" />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-100">
              RAFT_CONSENSUS <span className="text-green-500">v2.0</span>
            </h1>
          </div>
          <p className="text-sm text-green-400/70 flex items-center gap-2">
            <span className="text-gray-500">user@raft-sim:~/theory$</span> ./explain_theory.sh
            <span className={`inline-block w-2 h-4 bg-green-500 ${cursorBlink ? 'opacity-100' : 'opacity-0'}`}></span>
          </p>
        </header>

        {/* Navigation Tabs */}
        <nav className="flex flex-wrap gap-2 border-b border-gray-800 pb-2">
          <button
            onClick={() => setActiveTab('invariants')}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${
              activeTab === 'invariants' 
                ? 'bg-green-500/20 text-green-300 border-b-2 border-green-400' 
                : 'text-gray-500 hover:text-green-400 hover:bg-gray-900'
            }`}
          >
            [ Safety_Invariants ]
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${
              activeTab === 'roles' 
                ? 'bg-green-500/20 text-green-300 border-b-2 border-green-400' 
                : 'text-gray-500 hover:text-green-400 hover:bg-gray-900'
            }`}
          >
            [ Node_Roles ]
          </button>
          <button
            onClick={() => setActiveTab('rpc')}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${
              activeTab === 'rpc' 
                ? 'bg-green-500/20 text-green-300 border-b-2 border-green-400' 
                : 'text-gray-500 hover:text-green-400 hover:bg-gray-900'
            }`}
          >
            [ RPC_Protocol ]
          </button>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 bg-gray-900/50 border border-gray-800 rounded-lg p-4 sm:p-6 shadow-[0_0_15px_rgba(34,197,94,0.05)] relative overflow-hidden">
          
          {/* Decorative background grid */}
          <div className="absolute inset-0 pointer-events-none opacity-5" 
               style={{ backgroundImage: 'radial-gradient(#22c55e 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
          </div>

          <div className="relative z-10">
            {/* --- TAB: INVARIANTS --- */}
            {activeTab === 'invariants' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-start gap-3 mb-6">
                  <BookOpen className="w-6 h-6 text-green-400 mt-1" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-200">The 5 Safety Invariants</h2>
                    <p className="text-sm text-gray-400 mt-1">
                      Raft guarantees that each of these properties is true at all times. Together, they ensure State Machine Safety even under severe network partitions.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {INVARIANTS.map((inv) => (
                    <div 
                      key={inv.id} 
                      className={`border rounded-md transition-all duration-200 ${
                        expandedInvariant === inv.id 
                          ? `${inv.color} ${inv.bg} shadow-[0_0_10px_rgba(0,0,0,0.5)]` 
                          : 'border-gray-800 hover:border-gray-600 bg-gray-950/50 cursor-pointer'
                      }`}
                      onClick={() => setExpandedInvariant(expandedInvariant === inv.id ? null : inv.id)}
                    >
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {inv.icon}
                          <h3 className={`font-bold ${expandedInvariant === inv.id ? 'text-gray-100' : 'text-gray-300'}`}>
                            {inv.title}
                          </h3>
                        </div>
                        {expandedInvariant === inv.id ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                      
                      {expandedInvariant === inv.id && (
                        <div className="px-4 pb-4 pt-2 border-t border-black/20 animate-in slide-in-from-top-2 duration-200">
                          <p className="text-gray-300 font-medium mb-3">
                            <span className="text-green-400 mr-2">&gt;</span>
                            {inv.description}
                          </p>
                          <div className="bg-black/40 p-3 rounded border border-gray-800 text-sm text-gray-400 leading-relaxed">
                            <span className="text-gray-500 block mb-1">/* HOW IT WORKS */</span>
                            {inv.detail}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- TAB: ROLES --- */}
            {activeTab === 'roles' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-start gap-3 mb-6">
                  <Server className="w-6 h-6 text-green-400 mt-1" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-200">State Machine Roles</h2>
                    <p className="text-sm text-gray-400 mt-1">
                      A Raft cluster node is always in exactly one of these three states.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {ROLES.map((role) => (
                    <div key={role.name} className={`border rounded-lg p-5 flex flex-col ${role.border} ${role.bg}`}>
                      <h3 className={`text-xl font-bold mb-2 flex items-center gap-2 ${role.color}`}>
                        <span className="inline-block w-3 h-3 rounded-full bg-current shadow-[0_0_8px_currentColor]"></span>
                        {role.name}
                      </h3>
                      <p className="text-sm text-gray-300 mb-4 h-10">{role.desc}</p>
                      
                      <div className="flex-1 bg-black/40 rounded p-3 border border-black/50">
                        <span className="text-xs text-gray-500 uppercase tracking-widest block mb-2">Rules</span>
                        <ul className="space-y-2">
                          {role.rules.map((rule, idx) => (
                            <li key={idx} className="text-sm text-gray-400 flex items-start gap-2">
                              <span className="text-gray-600 mt-0.5">-</span>
                              <span>{rule}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ASCII State Transition Diagram */}
                <div className="mt-8 bg-black/60 border border-gray-800 rounded-lg p-4 overflow-x-auto">
                  <span className="text-xs text-gray-500 uppercase tracking-widest block mb-4">State Transition Diagram</span>
                  <pre className="text-xs sm:text-sm text-green-500/80 font-mono leading-tight">
{`
      [times out, starts election]
         +--------------------+
         |                    v
   +----------+         +-----------+
   | Follower |         | Candidate |
   +----------+         +-----------+
     ^      ^                 |
     |      |                 | [receives majority votes]
     |      +-----------------+ 
     | [discovers current     v
     |  leader or new term] +--------+
     +----------------------| Leader |
                            +--------+
`}
                  </pre>
                </div>
              </div>
            )}

            {/* --- TAB: RPC --- */}
            {activeTab === 'rpc' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-start gap-3 mb-6">
                  <Network className="w-6 h-6 text-green-400 mt-1" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-200">RPC Protocol Reference</h2>
                    <p className="text-sm text-gray-400 mt-1">
                      Raft servers communicate using just two primary Remote Procedure Calls (RPCs).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {RPCS.map((rpc) => (
                    <div key={rpc.name} className="border border-gray-700 bg-gray-950 rounded-lg overflow-hidden flex flex-col">
                      <div className="bg-gray-900 border-b border-gray-800 p-3 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-cyan-400">{rpc.name}</h3>
                        <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 uppercase tracking-wider">
                          {rpc.type}
                        </span>
                      </div>
                      
                      <div className="p-4 flex-1 flex flex-col gap-4">
                        <p className="text-sm text-gray-300">{rpc.desc}</p>
                        
                        <div className="grid grid-cols-1 gap-4 mt-auto">
                          <div className="bg-black/50 p-3 rounded border border-gray-800/50">
                            <span className="text-xs text-gray-500 block mb-1">Arguments</span>
                            <ul className="text-sm text-green-400/80 font-mono space-y-1">
                              {rpc.args.map(arg => (
                                <li key={arg}>- {arg}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="bg-black/50 p-3 rounded border border-gray-800/50">
                            <span className="text-xs text-gray-500 block mb-1">Results</span>
                            <ul className="text-sm text-yellow-400/80 font-mono space-y-1">
                              {rpc.results.map(res => (
                                <li key={res}>- {res}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="bg-yellow-950/20 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-yellow-400 mb-1">Receiver Implementation Rule</h4>
                    <p className="text-sm text-gray-400">
                      All servers must reply to RPCs. If a receiver\'s <code className="text-yellow-300 bg-yellow-900/40 px-1 rounded">currentTerm</code> is smaller than the RPC\'s term, the receiver must update its term and immediately step down to Follower state.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}