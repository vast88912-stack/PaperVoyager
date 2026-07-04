import React, { useState, useEffect } from 'react';

// --- DATA & CONSTANTS ---

const INVARIANTS = [
  {
    id: 'election-safety',
    name: 'Election Safety',
    desc: 'At most one leader can be elected in a given term.',
    details: 'Raft ensures that terms act as logical clocks. A node requires a majority of votes to become a leader. Since a node can only vote once per term, it is mathematically impossible for two nodes to secure a majority in the same term.'
  },
  {
    id: 'leader-append-only',
    name: 'Leader Append-Only',
    desc: 'A leader never overwrites or deletes entries in its log.',
    details: 'The leader’s log is the absolute truth. It only ever appends new entries. If a follower\'s log conflicts with the leader\'s, the follower\'s log is overwritten to match the leader\'s.'
  },
  {
    id: 'log-matching',
    name: 'Log Matching',
    desc: 'If two logs share an entry with the same index and term, they are identical up to that point.',
    details: 'When a leader sends an AppendEntries RPC, it includes the index and term of the entry immediately preceding the new ones. If the follower does not find an entry in its log with the same index and term, it refuses the new entries.'
  },
  {
    id: 'leader-completeness',
    name: 'Leader Completeness',
    desc: 'A committed entry is guaranteed to be present in all future leaders\' logs.',
    details: 'An entry is committed only if it is stored on a majority of nodes. To win an election, a candidate must contact a majority of nodes and prove its log is at least as up-to-date as theirs. Thus, the candidate must contain all committed entries.'
  },
  {
    id: 'state-machine-safety',
    name: 'State Machine Safety',
    desc: 'If a node applies a log entry, no other node will apply a different entry for that index.',
    details: 'Because of Leader Completeness and Log Matching, once a log entry is committed and applied to the state machine at a specific index, that index is finalized across the entire cluster forever.'
  }
];

// --- MINI VISUALIZATION COMPONENTS ---

const ElectionSafetyVisual = () => {
  const [term, setTerm] = useState(1);
  const [leaderId, setLeaderId] = useState<number | null>(0);
  const [isElecting, setIsElecting] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (isElecting) {
      setLeaderId(null);
      timeout = setTimeout(() => {
        setLeaderId(Math.floor(Math.random() * 5));
        setIsElecting(false);
      }, 1000);
    }
    return () => clearTimeout(timeout);
  }, [isElecting]);

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-8 font-mono">
      <div className="text-xl text-yellow-400">
        Current Term: <span className="font-bold">{term}</span>
      </div>
      <div className="relative w-64 h-64">
        {[0, 1, 2, 3, 4].map((i) => {
          const angle = (i * 360) / 5;
          const rad = (angle * Math.PI) / 180;
          const x = 128 + 90 * Math.cos(rad) - 24;
          const y = 128 + 90 * Math.sin(rad) - 24;
          const isLeader = leaderId === i;
          
          return (
            <div
              key={i}
              className={`absolute w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500 shadow-lg
                ${isElecting ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400 animate-pulse' : 
                  isLeader ? 'border-cyan-400 bg-cyan-400/20 text-cyan-400 shadow-cyan-400/50 scale-110 z-10' : 
                  'border-gray-600 bg-gray-800 text-gray-500'}`}
              style={{ left: x, top: y }}
            >
              N{i+1}
            </div>
          );
        })}
        {leaderId !== null && !isElecting && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-cyan-400 text-xs bg-black/80 px-2 py-1 border border-cyan-400/50 rounded">
              LEADER
            </div>
          </div>
        )}
      </div>
      <button 
        onClick={() => { setTerm(t => t + 1); setIsElecting(true); }}
        disabled={isElecting}
        className="px-4 py-2 border border-green-500/50 hover:bg-green-500/10 text-green-400 transition-colors disabled:opacity-50"
      >
        [ FORCE_ELECTION ]
      </button>
    </div>
  );
};

const LeaderAppendOnlyVisual = () => {
  const [log, setLog] = useState<{term: number, val: string}[]>([{term: 1, val: 'x=1'}]);

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-8 font-mono w-full px-8">
      <div className="text-cyan-400 mb-4">LEADER LOG (Append-Only)</div>
      <div className="flex flex-wrap gap-2 w-full justify-center min-h-[60px]">
        {log.map((entry, i) => (
          <div key={i} className="flex flex-col items-center animate-fade-in-up">
            <div className="text-xs text-gray-500 mb-1">{i}</div>
            <div className="border border-cyan-500 bg-cyan-900/30 text-cyan-300 w-16 h-16 flex flex-col items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.2)]">
              <span className="text-xs opacity-70">T:{entry.term}</span>
              <span className="font-bold">{entry.val}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-4">
        <button 
          onClick={() => setLog([...log, {term: 1, val: `y=${log.length}` }])}
          className="px-4 py-2 border border-green-500/50 hover:bg-green-500/10 text-green-400 transition-colors"
        >
          [ RECEIVE_CLIENT_REQ ]
        </button>
      </div>
      <div className="text-xs text-gray-500 italic mt-8 max-w-md text-center">
        Notice there is no button to delete or modify previous entries. The leader's log is immutable history.
      </div>
    </div>
  );
};

const LogMatchingVisual = () => {
  const [step, setStep] = useState(0);
  
  const leaderLog = [1, 1, 1, 2, 3];
  const followerLog = [1, 1, 1, 2, 2, 2]; // Follower has stale entries at index 4,5

  useEffect(() => {
    if (step > 0 && step < 6) {
      const t = setTimeout(() => setStep(s => s + 1), 800);
      return () => clearTimeout(t);
    }
  }, [step]);

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6 font-mono w-full px-8">
      <div className="w-full max-w-lg space-y-8">
        
        {/* Leader Log */}
        <div>
          <div className="text-cyan-400 mb-2 text-sm">LEADER LOG</div>
          <div className="flex gap-2">
            {leaderLog.map((term, i) => (
              <div key={i} className={`border w-12 h-12 flex items-center justify-center relative
                ${step > i && leaderLog[i] === followerLog[i] ? 'border-green-500 bg-green-900/30 text-green-400' : 'border-cyan-500 bg-cyan-900/20 text-cyan-300'}`}>
                {term}
                <div className="absolute -top-5 text-[10px] text-gray-600">{i}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Connection Lines (Simulated) */}
        <div className="flex gap-2 h-8 items-center">
           {[0,1,2,3,4,5].map(i => (
             <div key={i} className="w-12 flex justify-center text-xl">
               {step > i ? (
                 leaderLog[i] === followerLog[i] ? <span className="text-green-500">|</span> : 
                 (leaderLog[i] !== undefined ? <span className="text-red-500">X</span> : '')
               ) : ''}
             </div>
           ))}
        </div>

        {/* Follower Log */}
        <div>
          <div className="text-gray-400 mb-2 text-sm">FOLLOWER LOG</div>
          <div className="flex gap-2">
            {followerLog.map((term, i) => {
              let stateClass = 'border-gray-600 bg-gray-800 text-gray-400';
              let displayTerm: number | string = term;

              if (step > i) {
                if (leaderLog[i] === term) {
                  stateClass = 'border-green-500 bg-green-900/30 text-green-400';
                } else if (leaderLog[i] !== undefined) {
                  stateClass = 'border-cyan-500 bg-cyan-900/30 text-cyan-400';
                  displayTerm = leaderLog[i]; // Overwritten
                } else {
                  stateClass = 'border-red-900 bg-red-900/20 text-red-900 opacity-20';
                  displayTerm = ''; // Truncated
                }
              }

              return (
                <div key={i} className={`border w-12 h-12 flex items-center justify-center transition-all duration-300 ${stateClass}`}>
                  {displayTerm}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <button 
          onClick={() => setStep(step === 0 || step === 6 ? 1 : 0)}
          className="px-4 py-2 border border-green-500/50 hover:bg-green-500/10 text-green-400 transition-colors"
        >
          {step === 0 || step === 6 ? '[ RUN_APPEND_ENTRIES ]' : '[ REPLICATING... ]'}
        </button>
      </div>
    </div>
  );
};

const LeaderCompletenessVisual = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6 font-mono text-center px-4">
      <div className="text-yellow-400 border border-yellow-500/30 bg-yellow-500/10 p-4 rounded max-w-md">
        <span className="block font-bold mb-2">VOTE GRANTED IF:</span>
        <code className="text-sm text-yellow-200">
          candidate.lastTerm &gt; voter.lastTerm || <br/>
          (candidate.lastTerm == voter.lastTerm && <br/>
           candidate.lastIndex &gt;= voter.lastIndex)
        </code>
      </div>
      <div className="text-gray-400 text-sm max-w-lg mt-4 leading-relaxed">
        Because an entry must exist on a <strong className="text-green-400">majority</strong> of nodes to be committed, 
        and a candidate must contact a <strong className="text-green-400">majority</strong> of nodes to win an election, 
        the intersection of these two majorities guarantees that at least one voter has the committed entry. 
        <br/><br/>
        That voter will deny its vote to any candidate missing the entry, ensuring the new leader always has it.
      </div>
    </div>
  );
};

const StateMachineSafetyVisual = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setProgress(p => (p + 1) % 4);
    }, 1500);
    return () => clearInterval(t);
  }, []);

  const steps = [
    { label: "1. Client Request", color: "text-blue-400", border: "border-blue-500" },
    { label: "2. Replicated to Majority", color: "text-yellow-400", border: "border-yellow-500" },
    { label: "3. Marked Committed", color: "text-green-400", border: "border-green-500" },
    { label: "4. Applied to State Machine", color: "text-purple-400", border: "border-purple-500" },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-8 font-mono w-full px-8">
      <div className="flex w-full max-w-2xl justify-between items-center relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-800 -z-10 -translate-y-1/2"></div>
        {steps.map((s, i) => (
          <div key={i} className={`flex flex-col items-center w-32 transition-all duration-500 ${progress >= i ? 'opacity-100' : 'opacity-30 grayscale'}`}>
            <div className={`w-6 h-6 rounded-full border-2 bg-black flex items-center justify-center mb-4 ${progress >= i ? s.border : 'border-gray-600'}`}>
              {progress > i && <div className={`w-2 h-2 rounded-full bg-current ${s.color}`}></div>}
              {progress === i && <div className={`w-3 h-3 rounded-full bg-current animate-ping ${s.color}`}></div>}
            </div>
            <div className={`text-[10px] text-center uppercase ${progress >= i ? s.color : 'text-gray-500'}`}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 p-4 border border-gray-700 bg-gray-900/50 rounded w-full max-w-md text-sm text-gray-300">
        <div className="text-purple-400 mb-2 border-b border-purple-500/30 pb-2">STATE MACHINE: [ {progress === 3 ? 'x = 42' : 'x = 0'} ]</div>
        <div>Log Index: <span className="text-green-400">104</span></div>
        <div>Term: <span className="text-green-400">3</span></div>
        <div>Command: <span className="text-blue-400">SET x = 42</span></div>
      </div>
    </div>
  );
};


// --- MAIN COMPONENT ---

export default function App() {
  const [activeTab, setActiveTab] = useState(INVARIANTS[0].id);

  const activeData = INVARIANTS.find(i => i.id === activeTab) || INVARIANTS[0];

  const renderVisual = () => {
    switch(activeTab) {
      case 'election-safety': return <ElectionSafetyVisual />;
      case 'leader-append-only': return <LeaderAppendOnlyVisual />;
      case 'log-matching': return <LogMatchingVisual />;
      case 'leader-completeness': return <LeaderCompletenessVisual />;
      case 'state-machine-safety': return <StateMachineSafetyVisual />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-300 font-mono flex flex-col overflow-hidden selection:bg-green-500/30">
      
      {/* HEADER */}
      <header className="border-b border-green-500/30 bg-black p-4 flex items-center justify-between shrink-0 shadow-[0_4px_20px_rgba(0,255,0,0.05)] z-20">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="ml-4 text-green-500 font-bold tracking-widest text-sm">
            ~/raft/theory_manual.sh<span className="animate-pulse">_</span>
          </span>
        </div>
        <div className="text-xs text-gray-500 uppercase tracking-widest hidden sm:block">
          Distributed Systems Educator [v1.0]
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="flex flex-1 overflow-hidden flex-col md:flex-row">
        
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-full md:w-80 border-r border-green-500/20 bg-[#0f0f0f] shrink-0 overflow-y-auto z-10">
          <div className="p-4 text-xs font-bold text-green-500/50 uppercase tracking-wider border-b border-green-500/10 mb-2">
            Safety Checklist
          </div>
          <nav className="flex flex-col px-2 space-y-1">
            {INVARIANTS.map((inv) => (
              <button
                key={inv.id}
                onClick={() => setActiveTab(inv.id)}
                className={`text-left px-4 py-3 rounded-sm transition-all duration-200 group flex flex-col
                  ${activeTab === inv.id 
                    ? 'bg-green-500/10 border-l-2 border-green-500 text-green-400' 
                    : 'border-l-2 border-transparent hover:bg-gray-800/50 hover:border-gray-600 text-gray-400'}`}
              >
                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] ${activeTab === inv.id ? 'text-green-500' : 'text-gray-600'}`}>
                    {activeTab === inv.id ? '[*]' : '[ ]'}
                  </span>
                  <span className="font-bold text-sm">{inv.name}</span>
                </div>
              </button>
            ))}
          </nav>

          <div className="mt-8 p-4 mx-4 border border-dashed border-gray-700 bg-black/50 text-xs text-gray-500">
            <span className="block text-green-500/70 mb-1">SYSTEM_NOTE:</span>
            These 5 safety properties guarantee that Raft produces exactly the same results as a single highly reliable server.
          </div>
        </aside>

        {/* CONTENT AREA */}
        <section className="flex-1 flex flex-col relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 to-[#0a0a0a]">
          
          {/* Subtle grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

          {/* Top Info Panel */}
          <div className="p-8 border-b border-gray-800/50 bg-black/40 backdrop-blur-sm z-10 min-h-[180px] shrink-0">
            <h2 className="text-2xl font-bold text-green-400 mb-2 flex items-center">
              <span className="text-gray-600 mr-2">&gt;</span> {activeData.name}
            </h2>
            <p className="text-lg text-gray-300 mb-4 font-sans">
              {activeData.desc}
            </p>
            <p className="text-sm text-gray-500 font-sans leading-relaxed max-w-4xl">
              {activeData.details}
            </p>
          </div>

          {/* Interactive Visualization Area */}
          <div className="flex-1 relative z-10 overflow-hidden min-h-[400px]">
             {/* Terminal window decoration for the visualizer */}
             <div className="absolute inset-4 border border-gray-800 rounded bg-black/60 shadow-2xl flex flex-col overflow-hidden">
                <div className="h-6 bg-gray-900 border-b border-gray-800 flex items-center px-4 shrink-0">
                  <span className="text-[10px] text-gray-500 uppercase">vis_engine_v3.exe - {activeData.id}</span>
                </div>
                <div className="flex-1 relative overflow-auto">
                  {renderVisual()}
                </div>
             </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-green-500/30 bg-black p-2 flex justify-between text-[10px] text-gray-600 shrink-0 z-20">
        <div>STATUS: ALL_SYSTEMS_NOMINAL</div>
        <div>RAFT_CONSENSUS_ANIMATOR // CHATGPT_EDITION</div>
      </footer>
    </div>
  );
}