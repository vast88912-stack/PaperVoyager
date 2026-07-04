import React, { useState, useEffect } from 'react';

// -- SVG Icons --
const IconTerminal = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="4 17 10 11 4 5"></polyline>
    <line x1="12" y1="19" x2="20" y2="19"></line>
  </svg>
);

const IconFolder = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

const IconFileText = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const IconShield = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);

const IconServer = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
    <line x1="6" y1="6" x2="6.01" y2="6"></line>
    <line x1="6" y1="18" x2="6.01" y2="18"></line>
  </svg>
);

// -- Data & Content --

type FileId = 'invariants' | 'election' | 'replication' | 'partitions' | 'glossary';

interface FileDef {
  id: FileId;
  name: string;
  desc: string;
}

const FILE_SYSTEM: Record<string, FileDef[]> = {
  'core_theory': [
    { id: 'invariants', name: '01_safety_invariants.md', desc: 'The 5 absolute rules of Raft' },
    { id: 'glossary', name: '02_glossary.txt', desc: 'Terms, Quorums, and Timers' },
  ],
  'mechanisms': [
    { id: 'election', name: '03_leader_election.sh', desc: 'Heartbeats & Timeouts' },
    { id: 'replication', name: '04_log_replication.c', desc: 'AppendEntries & Consistency' },
    { id: 'partitions', name: '05_network_splits.log', desc: 'Split Brains & Recovery' },
  ]
};

const FILE_CONTENTS: Record<FileId, React.ReactNode> = {
  invariants: (
    <div className="space-y-6">
      <div className="border-b border-green-900/50 pb-2 mb-4">
        <h1 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
          <IconShield className="w-5 h-5" />
          RAFT SAFETY CHECKLIST (THE 5 INVARIANTS)
        </h1>
        <p className="text-green-600/80 text-sm mt-1">If these hold true, the consensus system is completely safe.</p>
      </div>
      
      <div className="space-y-4">
        <div className="bg-black/40 border border-green-900/30 p-4 rounded-sm hover:border-cyan-500/50 transition-colors">
          <h3 className="text-amber-400 font-bold mb-1">[1] Election Safety</h3>
          <p className="text-green-500/90 text-sm leading-relaxed">
            At most <span className="text-cyan-400 font-bold">one leader</span> can be elected in a given term.
            A server only votes once per term, and a candidate requires a majority (quorum) to win.
          </p>
        </div>

        <div className="bg-black/40 border border-green-900/30 p-4 rounded-sm hover:border-cyan-500/50 transition-colors">
          <h3 className="text-amber-400 font-bold mb-1">[2] Leader Append-Only</h3>
          <p className="text-green-500/90 text-sm leading-relaxed">
            A leader never overwrites or deletes entries in its own log; it only appends new entries. 
            The leader's log is the source of truth.
          </p>
        </div>

        <div className="bg-black/40 border border-green-900/30 p-4 rounded-sm hover:border-cyan-500/50 transition-colors">
          <h3 className="text-amber-400 font-bold mb-1">[3] Log Matching</h3>
          <p className="text-green-500/90 text-sm leading-relaxed">
            If two logs contain an entry with the same index and term, then the logs are identical in all entries up through that given index. 
            Enforced by the <span className="text-purple-400">AppendEntries</span> consistency check.
          </p>
        </div>

        <div className="bg-black/40 border border-green-900/30 p-4 rounded-sm hover:border-cyan-500/50 transition-colors">
          <h3 className="text-amber-400 font-bold mb-1">[4] Leader Completeness</h3>
          <p className="text-green-500/90 text-sm leading-relaxed">
            If a log entry is committed in a given term, then that entry will be present in the logs of the leaders for all higher-numbered terms.
            <br/><span className="text-cyan-500/70 text-xs mt-2 block">» You cannot be elected leader if your log is out of date.</span>
          </p>
        </div>

        <div className="bg-black/40 border border-green-900/30 p-4 rounded-sm hover:border-cyan-500/50 transition-colors">
          <h3 className="text-amber-400 font-bold mb-1">[5] State Machine Safety</h3>
          <p className="text-green-500/90 text-sm leading-relaxed">
            If a server has applied a log entry at a given index to its state machine, no other server will ever apply a different log entry for the same index.
          </p>
        </div>
      </div>
    </div>
  ),

  glossary: (
    <div className="space-y-6">
      <div className="border-b border-green-900/50 pb-2 mb-4">
        <h1 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
          <IconFileText className="w-5 h-5" />
          GLOSSARY & CONSTANTS
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-black/40 p-3 border border-green-900/30">
          <h4 className="text-amber-400 font-bold border-b border-green-900/30 pb-1 mb-2">Node States</h4>
          <ul className="space-y-2 text-sm">
            <li><span className="text-blue-400 font-bold w-24 inline-block">FOLLOWER</span> Passive, responds to requests.</li>
            <li><span className="text-purple-400 font-bold w-24 inline-block">CANDIDATE</span> Actively seeking votes.</li>
            <li><span className="text-red-400 font-bold w-24 inline-block">LEADER</span> Handles all client requests.</li>
          </ul>
        </div>

        <div className="bg-black/40 p-3 border border-green-900/30">
          <h4 className="text-amber-400 font-bold border-b border-green-900/30 pb-1 mb-2">RPCs (Remote Procedure Calls)</h4>
          <ul className="space-y-2 text-sm">
            <li><span className="text-cyan-400 font-bold block">RequestVote</span> Sent by candidates during elections.</li>
            <li><span className="text-cyan-400 font-bold block">AppendEntries</span> Sent by leaders to replicate logs (also serves as heartbeat).</li>
          </ul>
        </div>
        
        <div className="bg-black/40 p-3 border border-green-900/30 col-span-1 md:col-span-2">
          <h4 className="text-amber-400 font-bold border-b border-green-900/30 pb-1 mb-2">Key Terms</h4>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-cyan-400 font-bold">Term</dt>
              <dd className="text-green-500/80">Arbitrary length of time. Starts with an election. Acts as a logical clock.</dd>
            </div>
            <div>
              <dt className="text-cyan-400 font-bold">Quorum (Majority)</dt>
              <dd className="text-green-500/80"><code>Math.floor(N / 2) + 1</code>. For a 5-node cluster, quorum is 3. Prevents split-brain decisions.</dd>
            </div>
            <div>
              <dt className="text-cyan-400 font-bold">Election Timeout</dt>
              <dd className="text-green-500/80">Randomized timer (e.g., 150ms - 300ms). If a follower receives no heartbeat before it expires, it becomes a candidate.</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  ),

  election: (
    <div className="space-y-4">
      <div className="border-b border-green-900/50 pb-2 mb-4">
        <h1 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
          <IconServer className="w-5 h-5" />
          LEADER ELECTION FLOW
        </h1>
      </div>

      <div className="font-mono text-sm space-y-4">
        <p className="text-green-500/80">
          Raft uses a heartbeat mechanism to trigger leader election. When servers start up, they begin as followers.
        </p>

        <div className="bg-black/50 p-4 border-l-2 border-purple-500">
          <h4 className="text-purple-400 font-bold mb-2">1. The Timeout</h4>
          <p className="text-green-400/70">If a follower receives no communication (heartbeat) over a period called the <span className="text-amber-400">election timeout</span>, it assumes there is no viable leader and begins an election.</p>
        </div>

        <div className="bg-black/50 p-4 border-l-2 border-cyan-500">
          <h4 className="text-cyan-400 font-bold mb-2">2. Becoming a Candidate</h4>
          <ul className="list-disc list-inside text-green-400/70 space-y-1">
            <li>Increments its current <code className="text-amber-400">term</code></li>
            <li>Transitions to <code className="text-purple-400">Candidate</code> state</li>
            <li>Votes for itself</li>
            <li>Sends <code className="text-blue-400">RequestVote</code> RPCs to all other servers</li>
          </ul>
        </div>

        <div className="bg-black/50 p-4 border-l-2 border-red-500">
          <h4 className="text-red-400 font-bold mb-2">3. Election Outcomes</h4>
          <p className="text-green-400/70 mb-2">A candidate remains in this state until one of three things happens:</p>
          <ol className="list-decimal list-inside text-green-400/70 space-y-2 ml-2">
            <li><strong className="text-green-400">Wins election:</strong> Receives votes from a majority (quorum). Becomes Leader, sends heartbeats.</li>
            <li><strong className="text-amber-400">Another wins:</strong> Receives AppendEntries from a valid leader. Steps down to Follower.</li>
            <li><strong className="text-red-400">Split vote:</strong> Timer expires with no winner (e.g. multiple candidates split the votes). Increments term, starts new election. <em className="text-cyan-500/70 block mt-1">Randomized timeouts prevent repeated split votes!</em></li>
          </ol>
        </div>
      </div>
    </div>
  ),

  replication: (
    <div className="space-y-4">
      <div className="border-b border-green-900/50 pb-2 mb-4">
        <h1 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
          <IconFileText className="w-5 h-5" />
          LOG REPLICATION (AppendEntries)
        </h1>
      </div>

      <p className="text-green-500/80 text-sm">
        Once a leader is elected, it begins servicing client requests. Each client request contains a command to be executed by the replicated state machines.
      </p>

      <div className="relative border border-green-900/30 bg-black/40 p-4 rounded-sm mt-4">
        <div className="absolute top-0 right-0 bg-green-900/30 text-xs px-2 py-1 text-green-400">DATA FLOW</div>
        <ol className="list-decimal list-inside text-sm text-green-400/80 space-y-3 mt-2">
          <li>Client sends command to Leader.</li>
          <li>Leader appends command to its own log as a new entry.</li>
          <li>Leader issues <code className="text-cyan-400">AppendEntries</code> RPCs in parallel to all followers.</li>
          <li>Followers safely replicate the entry and reply to Leader.</li>
          <li>Once safely replicated on a <strong>majority</strong> of followers:
            <ul className="list-[circle] list-inside ml-6 mt-1 text-amber-500/80">
              <li>Leader applies the entry to its state machine.</li>
              <li>Leader returns the result of the execution to the client.</li>
              <li>Leader notifies followers that the entry is <strong className="text-amber-400">COMMITTED</strong>.</li>
            </ul>
          </li>
        </ol>
      </div>

      <div className="bg-black/50 p-4 border-l-2 border-red-500 mt-4">
        <h4 className="text-red-400 font-bold mb-2 text-sm">Handling Inconsistencies</h4>
        <p className="text-green-400/70 text-sm">
          In Raft, the leader handles inconsistencies by forcing the followers' logs to duplicate its own. 
          Conflicting entries in follower logs will be overwritten with entries from the leader's log.
        </p>
        <p className="text-cyan-500/70 text-xs mt-2 italic">
          * This maintains the Log Matching property and Leader Append-Only invariant.
        </p>
      </div>
    </div>
  ),

  partitions: (
    <div className="space-y-4">
      <div className="border-b border-green-900/50 pb-2 mb-4">
        <h1 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
          <IconServer className="w-5 h-5" />
          NETWORK PARTITIONS (SPLIT BRAIN)
        </h1>
      </div>

      <p className="text-green-500/80 text-sm">
        Raft's quorum requirement ensures safety even when the network splits. Only the partition with a majority of nodes can elect a leader and commit logs.
      </p>

      <div className="flex flex-col md:flex-row gap-4 mt-6">
        {/* Partition 1 */}
        <div className="flex-1 bg-black/40 border border-green-900/30 p-4 rounded-sm relative">
          <div className="absolute -top-3 left-4 bg-[#171717] px-2 text-xs font-bold text-amber-500">Minority Partition (2 Nodes)</div>
          <div className="flex gap-2 justify-center mb-4 mt-2">
            <div className="w-8 h-8 rounded-full bg-red-900/50 border-2 border-red-500 flex items-center justify-center text-xs">L</div>
            <div className="w-8 h-8 rounded-full bg-blue-900/50 border-2 border-blue-500 flex items-center justify-center text-xs">F</div>
          </div>
          <p className="text-xs text-green-500/70">
            The old leader may still exist here. It accepts client requests, but can <strong>never</strong> achieve a quorum. Thus, no logs are committed. State machine remains safe.
          </p>
        </div>

        {/* Partition 2 */}
        <div className="flex-1 bg-black/40 border border-green-900/30 p-4 rounded-sm relative">
          <div className="absolute -top-3 left-4 bg-[#171717] px-2 text-xs font-bold text-cyan-500">Majority Partition (3 Nodes)</div>
          <div className="flex gap-2 justify-center mb-4 mt-2">
            <div className="w-8 h-8 rounded-full bg-purple-900/50 border-2 border-purple-500 flex items-center justify-center text-xs">C</div>
            <div className="w-8 h-8 rounded-full bg-blue-900/50 border-2 border-blue-500 flex items-center justify-center text-xs">F</div>
            <div className="w-8 h-8 rounded-full bg-blue-900/50 border-2 border-blue-500 flex items-center justify-center text-xs">F</div>
          </div>
          <p className="text-xs text-green-500/70">
            Followers timeout and start an election. Because they have a majority (3 out of 5), they successfully elect a new Leader with a <strong>higher term</strong> and continue committing logs.
          </p>
        </div>
      </div>

      <div className="bg-green-900/20 p-3 mt-4 text-sm text-green-400 border border-green-900/50">
        <strong className="text-cyan-400">Recovery:</strong> When the partition heals, the old leader sees the higher term of the new leader. It immediately steps down to Follower, and its uncommitted logs are rolled back and replaced by the new leader's log.
      </div>
    </div>
  )
};

// -- Main Component --

export default function App() {
  const [activeFile, setActiveFile] = useState<FileId>('invariants');
  const [isTyping, setIsTyping] = useState(false);
  const [bootSequence, setBootSequence] = useState(true);
  const [bootText, setBootText] = useState<string[]>([]);

  // Initial boot sequence effect
  useEffect(() => {
    const sequence = [
      "INIT RAFT_EDU_OS v1.0.4",
      "LOADING KERNEL MODULES...",
      "MOUNTING /raft/theory...",
      "ESTABLISHING SECURE CONNECTION...",
      "SYSTEM READY."
    ];

    let i = 0;
    const interval = setInterval(() => {
      setBootText(prev => [...prev, sequence[i]]);
      i++;
      if (i >= sequence.length) {
        clearInterval(interval);
        setTimeout(() => setBootSequence(false), 800);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  // Handle file selection with a typing delay
  const handleSelectFile = (id: FileId) => {
    if (id === activeFile) return;
    setIsTyping(true);
    setActiveFile(id);
    setTimeout(() => setIsTyping(false), 400);
  };

  if (bootSequence) {
    return (
      <div className="min-h-screen bg-[#050505] text-green-500 font-mono p-8 flex flex-col justify-end relative overflow-hidden selection:bg-cyan-900 selection:text-cyan-100">
        <div className="pointer-events-none fixed inset-0 z-50 h-full w-full bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20"></div>
        <div className="space-y-2 mb-8 z-10">
          {bootText.map((text, idx) => (
            <div key={idx} className="flex gap-2 items-center text-sm md:text-base">
              <span className="text-green-700">{`[${(1000 + idx * 123).toString().substring(0, 4)}.`}</span>
              <span className="text-green-600">{`${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}]`}</span>
              <span className="font-bold">{text}</span>
            </div>
          ))}
          <div className="flex gap-2 items-center text-sm md:text-base">
            <span className="text-green-700">[....]</span>
            <div className="w-3 h-5 bg-green-500 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-green-500 font-mono flex flex-col relative overflow-hidden selection:bg-cyan-900 selection:text-cyan-100">
      
      {/* CRT Scanline Overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 h-full w-full bg-[linear-gradient(rgba(18,16,16,0)_