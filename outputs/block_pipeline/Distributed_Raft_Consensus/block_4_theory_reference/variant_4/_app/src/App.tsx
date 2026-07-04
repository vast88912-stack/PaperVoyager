import React, { useState, useEffect } from 'react';
// Optional dependencies: npm install lucide-react

// --- Icons ---
const TerminalIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M4 17h16a2 2 0 002-2V5a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const ShieldCheckIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const ChevronDownIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const BookOpenIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const CodeIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

// --- Diagrams / Visualizers ---

const ElectionSafetyDiagram = () => {
  const [term, setTerm] = useState(1);
  useEffect(() => {
    const int = setInterval(() => setTerm((t) => (t >= 3 ? 1 : t + 1)), 2500);
    return () => clearInterval(int);
  }, []);

  const leaders = { 1: 0, 2: 3, 3: 1 };
  const currentLeader = leaders[term as keyof typeof leaders];

  return (
    <div className="flex flex-col items-center py-4 space-y-4 font-mono text-sm">
      <div className="text-yellow-400">Current Term: {term}</div>
      <div className="flex space-x-4">
        {[0, 1, 2, 3, 4].map((nodeId) => (
          <div key={nodeId} className="flex flex-col items-center space-y-2">
            <div
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                nodeId === currentLeader
                  ? "border-green-400 bg-green-900/30 text-green-400 shadow-[0_0_15px_rgba(74,222,128,0.5)]"
                  : "border-gray-600 text-gray-500"
              }`}
            >
              N{nodeId + 1}
            </div>
            <span className="text-xs">
              {nodeId === currentLeader ? "LEADER" : "FOLLOWER"}
            </span>
          </div>
        ))}
      </div>
      <div className="text-gray-400 text-xs text-center max-w-md mt-4">
        * Notice how in any given term, the system ensures ONLY ONE node transitions to the LEADER state.
      </div>
    </div>
  );
};

const LogMatchingDiagram = () => {
  const logA = [
    { term: 1, cmd: "x←3" },
    { term: 1, cmd: "y←1" },
    { term: 2, cmd: "x←2" },
    { term: 3, cmd: "z←5" },
  ];
  const logB = [
    { term: 1, cmd: "x←3" },
    { term: 1, cmd: "y←1" },
    { term: 2, cmd: "x←2" },
    { term: 0, cmd: "---" },
  ];

  return (
    <div className="flex flex-col items-center py-4 space-y-6 font-mono text-sm">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center space-x-2">
          <span className="w-16 text-right text-gray-400">Node A:</span>
          <div className="flex border border-gray-700 rounded overflow-hidden">
            {logA.map((entry, i) => (
              <div key={i} className="flex flex-col border-r border-gray-700 last:border-0 w-16">
                <div className="bg-gray-800 text-center py-1 text-xs text-yellow-500">T{entry.term}</div>
                <div className="bg-gray-900 text-center py-2 text-green-400">{entry.cmd}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-16 text-right text-gray-400">Node B:</span>
          <div className="flex border border-gray-700 rounded overflow-hidden">
            {logB.map((entry, i) => {
              const matches = entry.term === logA[i].term && entry.cmd === logA[i].cmd;
              return (
                <div key={i} className={`flex flex-col border-r border-gray-700 last:border-0 w-16 transition-colors duration-1000 ${matches ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
                  <div className={`text-center py-1 text-xs ${matches ? 'bg-gray-800 text-yellow-500' : 'bg-red-950 text-red-500'}`}>
                    {entry.term > 0 ? `T${entry.term}` : '-'}
                  </div>
                  <div className={`text-center py-2 ${matches ? 'text-green-400' : 'text-red-500'}`}>
                    {entry.cmd}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="text-gray-400 text-xs text-center max-w-md">
        * If two entries in different logs have the same index and term, they store the same command, and all preceding entries are identical.
      </div>
    </div>
  );
};

const LeaderCompletenessDiagram = () => {
  return (
    <div className="flex flex-col items-center py-4 space-y-4 font-mono text-sm w-full">
      <div className="grid grid-cols-4 gap-2 w-full max-w-lg text-center mb-2">
        <div className="text-gray-500 text-xs">Term 1</div>
        <div className="text-gray-500 text-xs">Term 2</div>
        <div className="text-gray-500 text-xs">Term 3</div>
        <div className="text-gray-500 text-xs">Term 4</div>
      </div>
      
      <div className="grid grid-cols-4 gap-4 w-full max-w-lg relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-800 -z-10 transform -translate-y-1/2"></div>
        
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded bg-gray-800 border border-green-500 flex items-center justify-center text-green-400 shadow-[0_0_10px_rgba(74,222,128,0.2)]">
            A
          </div>
          <div className="mt-2 text-[10px] text-gray-500">Committed</div>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded bg-gray-800 border border-green-500 flex items-center justify-center text-green-400">
            A
          </div>
          <div className="mt-2 text-[10px] text-gray-500">Must inherit</div>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded bg-gray-800 border border-green-500 flex items-center justify-center text-green-400">
            A
          </div>
          <div className="mt-2 text-[10px] text-gray-500">Must inherit</div>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded bg-gray-800 border border-green-500 flex items-center justify-center text-green-400">
            A
          </div>
          <div className="mt-2 text-[10px] text-gray-500">Must inherit</div>
        </div>
      </div>
      <div className="text-gray-400 text-xs text-center max-w-md mt-4">
        * A committed entry (A) in Term 1 is guaranteed to be present in the logs of all leaders in Term 2, 3, 4, etc. Raft's voting rules guarantee this.
      </div>
    </div>
  );
};


// --- Data ---

const INVARIANTS = [
  {
    id: "election-safety",
    title: "Election Safety",
    description: "At most one leader can be elected in a given term.",
    analogy: "Only one person is allowed to hold the 'talking stick' at any given time. If two people claim it, a new round of voting must occur.",
    why: "If multiple leaders existed in the same term, they could accept conflicting entries at the same index, breaking the replicated log state.",
    visualizer: <ElectionSafetyDiagram />
  },
  {
    id: "leader-append-only",
    title: "Leader Append-Only",
    description: "A leader never overwrites or deletes entries in its log; it only appends new entries.",
    analogy: "The leader writes in a ledger using an indelible ink pen. They can only add new lines at the bottom.",
    why: "Assuming the leader's log is always the source of truth simplifies the protocol. Conflicts are resolved by forcing followers to duplicate the leader's log.",
    visualizer: (
      <div className="py-6 text-center text-green-400 font-mono flex items-center justify-center space-x-2">
        <span className="text-gray-500">Log:</span>
        <span className="px-2 py-1 bg-gray-800 border border-gray-600 rounded">1</span>
        <span className="px-2 py-1 bg-gray-800 border border-gray-600 rounded">2</span>
        <span className="px-2 py-1 bg-gray-800 border border-gray-600 rounded">3</span>
        <span className="animate-pulse px-2 py-1 bg-green-900/30 border border-green-500 rounded text-green-300"> + Append</span>
      </div>
    )
  },
  {
    id: "log-matching",
    title: "Log Matching",
    description: "If two logs contain an entry with the same index and term, then the logs are identical in all entries up through the given index.",
    analogy: "If chapter 5 of two identical book copies has the same title, then chapters 1 through 5 are guaranteed to be word-for-word identical.",
    why: "This invariant is maintained by the AppendEntries consistency check. A leader includes the index and term of the previous entry; if it doesn't match, the follower rejects.",
    visualizer: <LogMatchingDiagram />
  },
  {
    id: "leader-completeness",
    title: "Leader Completeness",
    description: "If a log entry is committed in a given term, then that entry will be present in the logs of the leaders for all higher-numbered terms.",
    analogy: "New presidents are not allowed to take office unless they have a complete, unbroken record of all finalized laws passed by previous administrations.",
    why: "Since entries flow only from leader to follower, a new leader must contain all committed entries to prevent them from being overwritten.",
    visualizer: <LeaderCompletenessDiagram />
  },
  {
    id: "state-machine-safety",
    title: "State Machine Safety",
    description: "If a server has applied a log entry at a given index to its state machine, no other server will ever apply a different log entry for the same index.",
    analogy: "If a bank branch updates your balance based on transaction #42, no other branch will ever process a different transaction #42.",
    why: "This is the ultimate goal of Raft. It guarantees that all nodes execute the exact same commands in the exact same order.",
    visualizer: (
      <div className="py-6 text-center text-green-400 font-mono text-xs flex justify-center space-x-8">
        <div className="flex flex-col items-center border border-gray-700 p-3 rounded bg-gray-900">
          <span className="text-gray-400 mb-2">Node A State</span>
          <span className="text-blue-400">x = 5</span>
          <span className="text-yellow-400">y = 10</span>
        </div>
        <div className="flex flex-col items-center border border-gray-700 p-3 rounded bg-gray-900">
          <span className="text-gray-400 mb-2">Node B State</span>
          <span className="text-blue-400">x = 5</span>
          <span className="text-yellow-400">y = 10</span>
        </div>
      </div>
    )
  }
];

const RPC_REFERENCE = [
  {
    name: "AppendEntries",
    desc: "Invoked by leader to replicate log entries; also used as heartbeat.",
    args: [
      { name: "term", type: "int", desc: "Leader's term" },
      { name: "leaderId", type: "int", desc: "So follower can redirect clients" },
      { name: "prevLogIndex", type: "int", desc: "Index of log entry immediately preceding new ones" },
      { name: "prevLogTerm", type: "int", desc: "Term of prevLogIndex entry" },
      { name: "entries[]", type: "[]LogEntry", desc: "Log entries to store (empty for heartbeat)" },
      { name: "leaderCommit", type: "int", desc: "Leader's commitIndex" },
    ],
    returns: [
      { name: "term", type: "int", desc: "CurrentTerm, for leader to update itself" },
      { name: "success", type: "bool", desc: "True if follower contained entry matching prevLogIndex and prevLogTerm" },
    ]
  },
  {
    name: "RequestVote",
    desc: "Invoked by candidates to gather votes.",
    args: [
      { name: "term", type: "int", desc: "Candidate's term" },
      { name: "candidateId", type: "int", desc: "Candidate requesting vote" },
      { name: "lastLogIndex", type: "int", desc: "Index of candidate's last log entry" },
      { name: "lastLogTerm", type: "int", desc: "Term of candidate's last log entry" },
    ],
    returns: [
      { name: "term", type: "int", desc: "CurrentTerm, for candidate to update itself" },
      { name: "voteGranted", type: "bool", desc: "True means candidate received vote" },
    ]
  }
];

// --- Main Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState<"invariants" | "rpc">("invariants");
  const [expandedInvariant, setExpandedInvariant] = useState<string | null>("election-safety");

  return (
    <div className="min-h-screen bg-neutral-950 text-green-400 font-mono p-4 md:p-8 flex justify-center">
      
      {/* Main Terminal Window */}
      <div className="w-full max-w-5xl bg-[#0a0a0a] border border-green-800/50 rounded-lg shadow-2xl overflow-hidden flex flex-col relative">
        
        {/* Scanline overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-50 opacity-20"></div>

        {/* Terminal Header */}
        <div className="bg-green-950/40 border-b border-green-900/50 p-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <TerminalIcon className="w-5 h-5 text-green-500" />
            <h1 className="text-green-500 font-bold tracking-wider text-sm md:text-base">
              RAFT_CONSENSUS_ANIMATOR // THEORY_&_REFERENCE
            </h1>
          </div>
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-green-900/30 bg-black/50">
          <button
            onClick={() => setActiveTab("invariants")}
            className={`flex-1 py-3 px-4 flex items-center justify-center space-x-2 transition-colors ${
              activeTab === "invariants"
                ? "bg-green-900/20 text-green-300 border-b-2 border-green-400"
                : "text-green-700 hover:bg-green-900/10 hover:text-green-500"
            }`}
          >
            <ShieldCheckIcon className="w-5 h-5" />
            <span className="uppercase text-sm font-semibold tracking-wider">Safety Checklist</span>
          </button>
          <button
            onClick={() => setActiveTab("rpc")}
            className={`flex-1 py-3 px-4 flex items-center justify-center space-x-2 transition-colors ${
              activeTab === "rpc"
                ? "bg-green-900/20 text-green-300 border-b-2 border-green-400"
                : "text-green-700 hover:bg-green-900/10 hover:text-green-500"
            }`}
          >
            <CodeIcon className="w-5 h-5" />
            <span className="uppercase text-sm font-semibold tracking-wider">RPC Reference</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          
          {/* Tab: Safety Invariants */}
          {activeTab === "invariants" && (
            <div className="space-y-4">
              <div className="mb-6 border-l-4 border-green-500 pl-4 py-1">
                <p className="text-green-300/80 text-sm">
                  <span className="text-green-500 font-bold">INFO:</span> Raft guarantees that each of these properties is true at all times. Together, they ensure the algorithm is safe and that the State Machine correctly replicates data across partitions or failures.
                </p>
              </div>

              {INVARIANTS.map((inv) => {
                const isExpanded = expandedInvariant === inv.id;
                return (
                  <div 
                    key={inv.id} 
                    className={`border transition-all duration-300 ${
                      isExpanded 
                        ? 'border-green-500 bg-green-950/10 shadow-[0_0_15px_rgba(74,222,128,0.05)]' 
                        : 'border-green-900/40 bg-black hover:border-green-700'
                    } rounded-md overflow-hidden`}
                  >
                    <button
                      onClick={() => setExpandedInvariant(isExpanded ? null : inv.id)}
                      className="w-full text-left px-5 py-4 flex items-center justify-between focus:outline-none"
                    >
                      <div className="flex items-center space-x-3">
                        <ShieldCheckIcon className={`w-5 h-5 ${isExpanded ? 'text-green-400' : 'text-green-800'}`} />
                        <h2 className={`font-bold tracking-wide ${isExpanded ? 'text-green-300' : 'text-green-600'}`}>
                          {inv.title}
                        </h2>
                      </div>
                      <ChevronDownIcon 
                        className={`w-5 h-5 transform transition-transform duration-300 ${
                          isExpanded ? 'rotate-180 text-green-400' : 'text-green-800'
                        }`} 
                      />
                    </button>
                    
                    <div 
                      className={`overflow-hidden transition-all duration-500 ease-in-out ${
                        isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="px-5 pb-5 pt-2 border-t border-green-900/30">
                        <p className="text-green-100 mb-4">{inv.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Explanations */}
                          <div className="space-y-4">
                            <div className="bg-black/50 p-3 rounded border border-green-900/30">
                              <h3 className="text-xs uppercase text-green-600 font-bold mb-1 flex items-center">
                                <BookOpenIcon className="w-4 h-4 mr-2 inline" /> Analogy
                              </h3>
                              <p className="text-sm text-green-400/80">{inv.analogy}</p>
                            </div>
                            
                            <div className="bg-black/50 p-3 rounded border border-green-900/30">
                              <h3 className="text-xs uppercase text-green-600 font-bold mb-1 flex items-center">
                                <TerminalIcon className="w-4 h-4 mr-2 inline" /> Why it matters
                              </h3>
                              <p className="text-sm text-green-400/80">{inv.why}</p>
                            </div>
                          </div>

                          {/* Interactive / Visual Area */}
                          <div className="bg-[#050505] p-4 rounded border border-green-900/50 flex flex-col justify-center items-center min-h-[200px] relative overflow-hidden">
                            <div className="absolute top-2 left-2 text-[10px] text-green-700 uppercase">Visualization</div>
                            {inv.visualizer}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab: RPC Reference */}
          {activeTab === "rpc" && (
            <div className="space-y-8 animate-fadeIn">
              <div className="mb-4 border-l-4 border-yellow-500 pl-4 py-1">
                <p className="text-green-300/80 text-sm">
                  <span className="text-yellow-500 font