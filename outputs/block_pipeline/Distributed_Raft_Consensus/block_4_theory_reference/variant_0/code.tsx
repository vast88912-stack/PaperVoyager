import React, { useState, useEffect } from 'react';

// --- Icons (Inline SVGs to avoid external dependencies) ---
const IconTerminal = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const IconShield = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const IconServer = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
  </svg>
);

const IconBook = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const IconActivity = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

// --- Data Models ---
type TabId = 'overview' | 'states' | 'election' | 'replication' | 'safety' | 'glossary';

interface Tab {
  id: TabId;
  label: string;
  icon: React.FC;
}

const TABS: Tab[] = [
  { id: 'overview', label: '1. Protocol Overview', icon: IconBook },
  { id: 'states', label: '2. Node States', icon: IconServer },
  { id: 'election', label: '3. Leader Election', icon: IconActivity },
  { id: 'replication', label: '4. Log Replication', icon: IconTerminal },
  { id: 'safety', label: '5. Safety Invariants', icon: IconShield },
  { id: 'glossary', label: '6. Glossary', icon: IconBook },
];

const GLOSSARY = [
  { term: 'AppendEntries', def: 'RPC initiated by leaders to replicate log entries and provide heartbeats.' },
  { term: 'Commit Index', def: 'Index of highest log entry known to be committed (safely replicated to a majority).' },
  { term: 'Heartbeat', def: 'An empty AppendEntries RPC sent periodically by the leader to maintain authority.' },
  { term: 'Log Entry', def: 'A state machine command and the term number when the entry was received by the leader.' },
  { term: 'Majority (Quorum)', def: 'More than half of the nodes in the cluster (e.g., 3 out of 5). Required for elections and commits.' },
  { term: 'RequestVote', def: 'RPC initiated by candidates during elections to gather votes.' },
  { term: 'Term', def: 'A monotonically increasing logical clock in Raft. Each term begins with an election.' },
];

const SAFETY_INVARIANTS = [
  {
    id: 'election-safety',
    name: 'Election Safety',
    desc: 'At most one leader can be elected in a given term.',
    details: 'Ensured by the requirement that a candidate must receive votes from a majority of the cluster to become leader. Since a node can only vote once per term, it is mathematically impossible for two candidates to both get a majority in the same term.'
  },
  {
    id: 'leader-append-only',
    name: 'Leader Append-Only',
    desc: 'A leader never overwrites or deletes entries in its own log; it only appends new entries.',
    details: 'The leader\'s log is the absolute truth. Conflicts are resolved by forcing followers to duplicate the leader\'s log.'
  },
  {
    id: 'log-matching',
    name: 'Log Matching',
    desc: 'If two logs contain an entry with the same index and term, then the logs are identical in all entries up through the given index.',
    details: 'Maintained by the consistency check in AppendEntries: the leader includes the index and term of the entry preceding the new ones. If the follower does not find an entry in its log with the same index and term, it refuses the new entries.'
  },
  {
    id: 'leader-completeness',
    name: 'Leader Completeness',
    desc: 'If a log entry is committed in a given term, then that entry will be present in the logs of the leaders for all higher-numbered terms.',
    details: 'A candidate cannot win an election unless its log is at least as up-to-date as a majority of the cluster. Since a committed entry is on a majority of nodes, any winning candidate must have that entry.'
  },
  {
    id: 'state-machine-safety',
    name: 'State Machine Safety',
    desc: 'If a server has applied a log entry at a given index to its state machine, no other server will ever apply a different log entry for the same index.',
    details: 'This is the ultimate goal of Raft. It is guaranteed by the combination of Leader Completeness and the rule that leaders only commit entries from their current term by counting replicas.'
  }
];

// --- Components ---

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [terminalLogs, setTerminalLogs] = useState<string[]>(['> RAFT_OS v1.0.0 initialized.', '> Loading theory modules...']);
  const [searchQuery, setSearchQuery] = useState('');

  const logToTerminal = (msg: string) => {
    setTerminalLogs(prev => [...prev.slice(-4), `> ${msg}`]);
  };

  useEffect(() => {
    logToTerminal(`Accessed module: ${activeTab.toUpperCase()}`);
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#0a0f14] text-[#33ff33] font-mono flex flex-col selection:bg-[#33ff33] selection:text-black">
      {/* Header */}
      <header className="border-b border-[#1a3320] bg-[#05080a] p-4 flex items-center justify-between shadow-[0_0_15px_rgba(51,255,51,0.1)] z-10">
        <div className="flex items-center gap-3">
          <IconTerminal />
          <h1 className="text-xl font-bold tracking-widest text-white drop-shadow-[0_0_5px_rgba(51,255,51,0.8)]">
            RAFT_CONSENSUS <span className="text-[#33ff33] opacity-70">:: THEORY_AND_REFERENCE</span>
          </h1>
        </div>
        <div className="text-xs opacity-50 flex gap-4">
          <span>STATUS: ONLINE</span>
          <span>NODES: 5</span>
          <span>TERM: 42</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <nav className="w-64 border-r border-[#1a3320] bg-[#0a0f14] p-4 flex flex-col gap-2 overflow-y-auto">
          <div className="text-xs text-gray-500 mb-2 tracking-widest border-b border-[#1a3320] pb-2">INDEX</div>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 p-3 text-sm text-left transition-all duration-200 border-l-2 ${
                  isActive 
                    ? 'border-[#33ff33] bg-[#112215] text-white shadow-[inset_0_0_10px_rgba(51,255,51,0.1)]' 
                    : 'border-transparent text-gray-400 hover:bg-[#0d1710] hover:text-[#33ff33]'
                }`}
              >
                <tab.icon />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Content Area */}
        <main className="flex-1 p-8 overflow-y-auto relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0a1410] to-[#05080a]">
          <div className="max-w-4xl mx-auto">
            {activeTab === 'overview' && <OverviewSection />}
            {activeTab === 'states' && <NodeStatesSection />}
            {activeTab === 'election' && <LeaderElectionSection />}
            {activeTab === 'replication' && <LogReplicationSection />}
            {activeTab === 'safety' && <SafetyInvariantsSection />}
            {activeTab === 'glossary' && (
              <GlossarySection query={searchQuery} setQuery={setSearchQuery} />
            )}
          </div>
        </main>
      </div>

      {/* Terminal Footer */}
      <footer className="h-32 border-t border-[#1a3320] bg-[#000000] p-4 font-mono text-xs flex flex-col justify-end">
        {terminalLogs.map((log, i) => (
          <div key={i} className={`${i === terminalLogs.length - 1 ? 'text-[#33ff33]' : 'text-gray-600'}`}>
            {log}
          </div>
        ))}
        <div className="flex items-center mt-1 text-[#33ff33]">
          <span className="mr-2 animate-pulse">_</span>
        </div>
      </footer>
    </div>
  );
}

// --- Section Components ---

function OverviewSection() {
  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-white border-b border-[#1a3320] pb-2">1. Protocol Overview</h2>
      
      <div className="bg-[#0d1710] border border-[#1a3320] p-6 rounded-sm shadow-[0_0_15px_rgba(0,0,0,0.5)]">
        <p className="text-gray-300 leading-relaxed mb-4">
          <strong className="text-[#33ff33]">Raft</strong> is a consensus algorithm designed to be easy to understand. It is equivalent in fault-tolerance and performance to Paxos. The primary goal of Raft is to manage a <span className="text-white border-b border-dashed border-gray-500">Replicated State Machine</span>.
        </p>
        <p className="text-gray-300 leading-relaxed">
          In a replicated state machine, a collection of servers compute identical copies of the same state and can continue operating even if some of the servers are down. Raft ensures that all servers agree on the sequence of commands to execute.
        </p>
      </div>

      <div className="mt-8 border border-[#1a3320] p-4 bg-[#05080a] relative">
        <div className="absolute top-0 left-0 bg-[#1a3320] text-xs px-2 py-1 text-gray-300">ARCHITECTURE DIAGRAM</div>
        <div className="flex flex-col items-center gap-6 mt-6">
          <div className="flex gap-4 w-full justify-center">
            <div className="border border-blue-500/50 bg-blue-900/20 p-4 text-center w-40">
              <div className="text-blue-400 font-bold mb-2">CLIENT</div>
              <div className="text-xs text-gray-400">Sends commands</div>
            </div>
          </div>
          
          <div className="h-8 w-px bg-gray-600"></div>
          
          <div className="border border-[#33ff33]/50 bg-[#112215] p-6 w-full max-w-2xl">
            <div className="text-center mb-4 text-white font-bold">CONSENSUS MODULE (RAFT)</div>
            <div className="flex justify-between gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex-1 border border-gray-700 bg-black p-3 text-center">
                  <div className="text-xs text-gray-500 mb-2">SERVER {i}</div>
                  <div className="border border-yellow-600/50 bg-yellow-900/20 p-2 mb-2 text-xs text-yellow-400">Log</div>
                  <div className="border border-purple-600/50 bg-purple-900/20 p-2 text-xs text-purple-400">State Machine</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NodeStatesSection() {
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  const states = [
    { id: 'follower', name: 'FOLLOWER', desc: 'Passive state. Responds to requests from leaders and candidates. If no communication is received, becomes a candidate.', color: 'text-gray-400', border: 'border-gray-600', bg: 'bg-gray-900' },
    { id: 'candidate', name: 'CANDIDATE', desc: 'Active state during elections. Requests votes from other nodes. If it receives a majority, becomes leader.', color: 'text-yellow-400', border: 'border-yellow-600', bg: 'bg-yellow-900/20' },
    { id: 'leader', name: 'LEADER', desc: 'Handles all client requests. Replicates log entries to followers. Sends periodic heartbeats to maintain authority.', color: 'text-[#33ff33]', border: 'border-[#33ff33]', bg: 'bg-[#112215]' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-white border-b border-[#1a3320] pb-2">2. Node States</h2>
      <p className="text-gray-400">At any given time, each server is in one of three states. Hover over a state to see its responsibilities.</p>

      <div className="flex flex-col md:flex-row gap-8 items-center justify-center py-12 relative">
        {/* SVG Arrows Background */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#4b5563" />
            </marker>
            <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#33ff33" />
            </marker>
          </defs>
          {/* Follower to Candidate */}
          <path d="M 250 150 Q 350 100 450 150" fill="none" stroke={hoveredState === 'candidate' ? '#33ff33' : '#4b5563'} strokeWidth="2" markerEnd={`url(#${hoveredState === 'candidate' ? 'arrowhead-active' : 'arrowhead'})`} strokeDasharray="5,5" className="transition-all duration-300" />
          {/* Candidate to Leader */}
          <path d="M 550 150 Q 650 100 750 150" fill="none" stroke={hoveredState === 'leader' ? '#33ff33' : '#4b5563'} strokeWidth="2" markerEnd={`url(#${hoveredState === 'leader' ? 'arrowhead-active' : 'arrowhead'})`} className="transition-all duration-300" />
          {/* Leader/Candidate to Follower */}
          <path d="M 700 200 Q 500 280 300 200" fill="none" stroke={hoveredState === 'follower' ? '#33ff33' : '#4b5563'} strokeWidth="2" markerEnd={`url(#${hoveredState === 'follower' ? 'arrowhead-active' : 'arrowhead'})`} className="transition-all duration-300" />
        </svg>

        {states.map((s) => (
          <div 
            key={s.id}
            onMouseEnter={() => setHoveredState(s.id)}
            onMouseLeave={() => setHoveredState(null)}
            className={`z-10 w-48 h-48 rounded-full border-2 ${s.border} ${s.bg} flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-transform duration-300 ${hoveredState === s.id ? 'scale-110 shadow-[0_0_20px_rgba(51,255,51,0.2)]' : 'scale-100'}`}
          >
            <div className={`font-bold text-lg mb-2 ${s.color}`}>{s.name}</div>
          </div>
        ))}
      </div>

      <div className="h-32 border border-[#1a3320] bg-[#05080a] p-4 flex items-center justify-center">
        {hoveredState ? (
          <p className="text-gray-300 text-center max-w-2xl animate-fade-in">
            <span className="text-white font-bold mr-2">{states.find(s => s.id === hoveredState)?.name}:</span>
            {states.find(s => s.id === hoveredState)?.desc}
          </p>
        ) : (
          <p className="text-gray-600 italic">Hover over a state to view details...</p>
        )}
      </div>
    </div>
  );
}

function LeaderElectionSection() {
  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-white border-b border-[#1a3320] pb-2">3. Leader Election</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="border-l-2 border-yellow-500 pl-4 py-1">
            <h3 className="text-yellow-400 font-bold mb-1">1. Election Timeout</h3>
            <p className="text-sm text-gray-400">Followers wait for heartbeats. If the randomized election timeout fires before a heartbeat is received, the follower transitions to Candidate.</p>
          </div>
          <div className="border-l-2 border-yellow-500 pl-4 py-1">
            <h3 className="text-yellow-400 font-bold mb-1">2. Campaign Phase</h3>
            <p className="text-sm text-gray-400">The candidate increments its current term, votes for itself, and sends RequestVote RPCs to all other servers.</p>
          </div>
          <div className="border-l-2 border-yellow-500 pl-4 py-1">
            <h3 className="text-yellow-400 font-bold mb-1">3. Voting Rules</h3>
            <p className="text-sm text-gray-400">A server votes for a candidate if: it hasn't voted in this term yet, and the candidate's log is at least as up-to-date as its own.</p>
          </div>
          <div className="border-l-2 border-[#33ff33] pl-4 py-1">
            <h3 className="text-[#33ff33] font-bold mb-1">4. Victory</h3>
            <p className="text-sm text-gray-400">If the candidate receives votes from a majority of servers, it becomes the Leader and immediately sends heartbeats to establish authority.</p>
          </div>
        </div>

        <div className="border border-[#1a3320] bg-[#05080a] p-4 flex flex-col justify-center font-mono text-xs">
          <div className="text-gray-500 mb-2">// RequestVote RPC Arguments</div>
          <div className="text-blue-400">term: <span className="text-white">candidate's term</span></div>
          <div className="text-blue-400">candidateId: <span className="text-white">candidate requesting vote</span></div>
          <div className="text-blue-400">lastLogIndex: <span className="text-white">index of candidate's last log entry</span></div>
          <div className="text-blue-400">lastLogTerm: <span className="text-white">term of candidate's last log entry</span></div>
          
          <div className="text-gray-500 mt-6 mb-2">// RequestVote RPC Results</div>
          <div className="text-purple-400">term: <span className="text-white">currentTerm, for candidate to update itself</span></div>
          <div className="text-purple-400">voteGranted: <span className="text-white">true means candidate received vote</span></div>
        </div>
      </div>
    </div>
  );
}

function LogReplicationSection() {
  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-white border-b border-[#1a3320] pb-2">4. Log Replication</h2>
      <p className="text-gray-400">Once a leader is elected, it begins servicing client requests. Each request contains a command to be executed by the replicated state machines.</p>

      <div className="bg-[#0d1710] border border-[#1a3320]