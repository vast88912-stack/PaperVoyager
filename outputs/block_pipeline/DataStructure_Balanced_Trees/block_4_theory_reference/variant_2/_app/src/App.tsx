import React, { useState } from 'react';

type TopicId = 'avl' | 'rb' | 'treap' | 'rotations';

interface Topic {
  id: TopicId;
  title: string;
  category: 'Trees' | 'Mechanics';
  icon: React.ReactNode;
}

const TOPICS: Topic[] = [
  { id: 'avl', title: 'AVL Trees', category: 'Trees', icon: <BookIcon /> },
  { id: 'rb', title: 'Red-Black Trees', category: 'Trees', icon: <LayersIcon /> },
  { id: 'treap', title: 'Treaps', category: 'Trees', icon: <HashIcon /> },
  { id: 'rotations', title: 'Rotations', category: 'Mechanics', icon: <RotateIcon /> },
];

export default function App() {
  const [activeTopic, setActiveTopic] = useState<TopicId>('avl');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[800px]">
        
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 bg-slate-100 border-r border-slate-200 flex flex-col">
          <div className="p-6 border-b border-slate-200">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              BST Studio
            </h1>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">
              Theory & Reference
            </p>
          </div>
          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
                Tree Structures
              </h2>
              <ul className="space-y-1">
                {TOPICS.filter(t => t.category === 'Trees').map(topic => (
                  <NavItem 
                    key={topic.id} 
                    topic={topic} 
                    isActive={activeTopic === topic.id} 
                    onClick={() => setActiveTopic(topic.id)} 
                  />
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
                Mechanics
              </h2>
              <ul className="space-y-1">
                {TOPICS.filter(t => t.category === 'Mechanics').map(topic => (
                  <NavItem 
                    key={topic.id} 
                    topic={topic} 
                    isActive={activeTopic === topic.id} 
                    onClick={() => setActiveTopic(topic.id)} 
                  />
                ))}
              </ul>
            </div>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 sm:p-10 overflow-y-auto relative">
          <div className="max-w-3xl mx-auto pb-20">
            {activeTopic === 'avl' && <AvlContent />}
            {activeTopic === 'rb' && <RbContent />}
            {activeTopic === 'treap' && <TreapContent />}
            {activeTopic === 'rotations' && <RotationsContent />}
          </div>
        </main>
      </div>
    </div>
  );
}

// --- Navigation Item ---

function NavItem({ topic, isActive, onClick }: { topic: Topic; isActive: boolean; onClick: () => void }) {
  return (
    <li>
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive 
            ? 'bg-blue-50 text-blue-700' 
            : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
        }`}
      >
        <span className={`${isActive ? 'text-blue-500' : 'text-slate-400'}`}>
          {topic.icon}
        </span>
        {topic.title}
      </button>
    </li>
  );
}

// --- Content Components ---

function AvlContent() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">AVL Trees</h2>
        <p className="text-lg text-slate-600 leading-relaxed">
          Named after inventors Adelson-Velsky and Landis, the AVL tree is the first invented self-balancing binary search tree. It maintains strict balance, ensuring $O(\log N)$ time complexity for search, insert, and delete operations.
        </p>
      </header>

      <section className="mb-10">
        <h3 className="text-xl font-semibold mb-4 border-b border-slate-100 pb-2">The AVL Invariant</h3>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
          <p className="font-mono text-sm text-slate-800 mb-2">
            For every node <span className="text-blue-600 font-bold">N</span> in the tree:
          </p>
          <div className="bg-white border border-slate-200 p-3 rounded font-mono text-center text-lg text-slate-700 shadow-inner">
            | Height(N.left) - Height(N.right) | ≤ 1
          </div>
          <p className="text-sm text-slate-500 mt-3">
            This difference is often called the <strong className="text-slate-700">Balance Factor (BF)</strong>. A valid AVL node has a BF of -1, 0, or 1.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h3 className="text-xl font-semibold mb-4 border-b border-slate-100 pb-2">Visualizing Balance</h3>
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex justify-center items-center">
          <svg viewBox="0 0 400 250" className="w-full max-w-md h-auto font-mono text-sm">
            {/* Edges */}
            <line x1="200" y1="40" x2="120" y2="100" stroke="#cbd5e1" strokeWidth="2" />
            <line x1="200" y1="40" x2="280" y2="100" stroke="#cbd5e1" strokeWidth="2" />
            <line x1="120" y1="100" x2="80" y2="160" stroke="#cbd5e1" strokeWidth="2" />
            <line x1="120" y1="100" x2="160" y2="160" stroke="#cbd5e1" strokeWidth="2" />
            
            {/* Nodes */}
            <g transform="translate(200,40)">
              <circle r="20" fill="#eff6ff" stroke="#3b82f6" strokeWidth="2" />
              <text textAnchor="middle" dy=".3em" fill="#1e293b" fontWeight="bold">50</text>
              <text x="30" y="-10" fill="#64748b" fontSize="12">h:3, bf:+1</text>
            </g>
            
            <g transform="translate(120,100)">
              <circle r="20" fill="#eff6ff" stroke="#3b82f6" strokeWidth="2" />
              <text textAnchor="middle" dy=".3em" fill="#1e293b" fontWeight="bold">25</text>
              <text x="-45" y="-10" fill="#64748b" fontSize="12">h:2, bf:0</text>
            </g>

            <g transform="translate(280,100)">
              <circle r="20" fill="#eff6ff" stroke="#3b82f6" strokeWidth="2" />
              <text textAnchor="middle" dy=".3em" fill="#1e293b" fontWeight="bold">75</text>
              <text x="30" y="-10" fill="#64748b" fontSize="12">h:1, bf:0</text>
            </g>

            <g transform="translate(80,160)">
              <circle r="20" fill="#eff6ff" stroke="#3b82f6" strokeWidth="2" />
              <text textAnchor="middle" dy=".3em" fill="#1e293b" fontWeight="bold">10</text>
              <text x="-45" y="10" fill="#64748b" fontSize="12">h:1</text>
            </g>

            <g transform="translate(160,160)">
              <circle r="20" fill="#eff6ff" stroke="#3b82f6" strokeWidth="2" />
              <text textAnchor="middle" dy=".3em" fill="#1e293b" fontWeight="bold">30</text>
              <text x="30" y="10" fill="#64748b" fontSize="12">h:1</text>
            </g>
          </svg>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-semibold mb-4 border-b border-slate-100 pb-2">Rebalancing Strategy</h3>
        <p className="text-slate-600 mb-4">
          When an insertion or deletion causes a node's balance factor to become -2 or +2, rotations are performed to restore balance. There are four cases:
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { case: 'Left-Left (LL)', fix: 'Single Right Rotation' },
            { case: 'Right-Right (RR)', fix: 'Single Left Rotation' },
            { case: 'Left-Right (LR)', fix: 'Left Rotate child, then Right Rotate root' },
            { case: 'Right-Left (RL)', fix: 'Right Rotate child, then Left Rotate root' }
          ].map((item, i) => (
            <li key={i} className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col">
              <span className="font-mono font-bold text-sm text-slate-800">{item.case}</span>
              <span className="text-sm text-slate-500 mt-1">{item.fix}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function RbContent() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Red-Black Trees</h2>
        <p className="text-lg text-slate-600 leading-relaxed">
          A Red-Black tree is a self-balancing BST where each node has an extra bit for color (red or black). They offer looser balance than AVL trees, leading to faster insertions and deletions but slightly slower lookups.
        </p>
      </header>

      <section className="mb-10">
        <h3 className="text-xl font-semibold mb-4 border-b border-slate-100 pb-2">The Red-Black Invariants</h3>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
          <ul className="space-y-3 font-mono text-sm text-slate-800 list-decimal list-inside marker:text-slate-400">
            <li>Every node is either <span className="text-red-500 font-bold">Red</span> or <span className="text-slate-900 font-bold">Black</span>.</li>
            <li>The root is always <span className="text-slate-900 font-bold">Black</span>.</li>
            <li>All leaves (NIL nodes) are considered <span className="text-slate-900 font-bold">Black</span>.</li>
            <li>If a node is <span className="text-red-500 font-bold">Red</span>, then both its children are <span className="text-slate-900 font-bold">Black</span>. <span className="text-slate-500 font-sans italic">(No two adjacent red nodes on a path)</span></li>
            <li>Every path from a given node to any of its descendant NIL nodes goes through the same number of <span className="text-slate-900 font-bold">Black</span> nodes. <span className="text-slate-500 font-sans italic">(Black-height property)</span></li>
          </ul>
        </div>
      </section>

      <section className="mb-10">
        <h3 className="text-xl font-semibold mb-4 border-b border-slate-100 pb-2">Visualizing Colors & Black-Height</h3>
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex justify-center items-center">
          <svg viewBox="0 0 400 250" className="w-full max-w-md h-auto font-mono text-sm">
            {/* Edges */}
            <line x1="200" y1="40" x2="120" y2="100" stroke="#cbd5e1" strokeWidth="2" />
            <line x1="200" y1="40" x2="280" y2="100" stroke="#cbd5e1" strokeWidth="2" />
            <line x1="120" y1="100" x2="80" y2="160" stroke="#cbd5e1" strokeWidth="2" />
            <line x1="120" y1="100" x2="160" y2="160" stroke="#cbd5e1" strokeWidth="2" />
            
            {/* Nodes */}
            {/* Root - Black */}
            <g transform="translate(200,40)">
              <circle r="20" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
              <text textAnchor="middle" dy=".3em" fill="#ffffff" fontWeight="bold">13</text>
              <text x="30" y="-10" fill="#64748b" fontSize="12">bh:2</text>
            </g>
            
            {/* Left Child - Red */}
            <g transform="translate(120,100)">
              <circle r="20" fill="#ef4444" stroke="#b91c1c" strokeWidth="2" />
              <text textAnchor="middle" dy=".3em" fill="#ffffff" fontWeight="bold">8</text>
              <text x="-45" y="-10" fill="#64748b" fontSize="12">bh:1</text>
            </g>

            {/* Right Child - Black */}
            <g transform="translate(280,100)">
              <circle r="20" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
              <text textAnchor="middle" dy=".3em" fill="#ffffff" fontWeight="bold">17</text>
              <text x="30" y="-10" fill="#64748b" fontSize="12">bh:1</text>
            </g>

            {/* Left-Left - Black */}
            <g transform="translate(80,160)">
              <circle r="20" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
              <text textAnchor="middle" dy=".3em" fill="#ffffff" fontWeight="bold">1</text>
              <text x="-45" y="10" fill="#64748b" fontSize="12">bh:1</text>
            </g>

            {/* Left-Right - Black */}
            <g transform="translate(160,160)">
              <circle r="20" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
              <text textAnchor="middle" dy=".3em" fill="#ffffff" fontWeight="bold">11</text>
              <text x="30" y="10" fill="#64748b" fontSize="12">bh:1</text>
            </g>
          </svg>
        </div>
      </section>
      
      <section>
        <p className="text-sm text-slate-500 italic">
          * Note: NIL leaves are omitted from the diagram for clarity, but they implicitly terminate every path and contribute to the black-height.
        </p>
      </section>
    </div>
  );
}

function TreapContent() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Treaps</h2>
        <p className="text-lg text-slate-600 leading-relaxed">
          A Treap (Tree + Heap) is a randomized binary search tree. Each node contains a key and a randomly assigned priority. It maintains the BST property for keys and the Heap property for priorities, resulting in high probability of balance.
        </p>
      </header>

      <section className="mb-10">
        <h3 className="text-xl font-semibold mb-4 border-b border-slate-100 pb-2">The Treap Invariants</h3>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-1">1. BST Property (Keys)</h4>
              <p className="font-mono text-sm text-slate-700 bg-white border border-slate-200 p-2 rounded">
                Left.key &lt; Node.key &lt; Right.key
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-1">2. Heap Property (Priorities)</h4>
              <p className="font-mono text-sm text-slate-700 bg-white border border-slate-200 p-2 rounded">
                Node.priority ≥ max(Left.priority, Right.priority)
              </p>
              <p className="text-xs text-slate-500 mt-1">(Assuming a Max-Heap Treap. Min-Heap is also valid.)</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h3 className="text-xl font-semibold mb-4 border-b border-slate-100 pb-2">Visualizing (Key, Priority)</h3>
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex justify-center items-center">
          <svg viewBox="0 0 400 250" className="w-full max-w-md h-auto font-mono text-sm">
            {/* Edges */}
            <line x1="200" y1="40" x2="120" y2="120" stroke="#cbd5e1" strokeWidth="2" />
            <line x1="200" y1="40" x2="280" y2="120" stroke="#cbd5e1" strokeWidth="2" />
            <line x1="120" y1="120" x2="70" y2="190" stroke="#cbd5e1" strokeWidth="2" />
            <line x1="120" y1="120" x2="170" y2="190" stroke="#cbd5e1" strokeWidth="2" />
            
            {/* Node Helper */}
            {/* Root */}
            <g transform="translate(200,40)">
              <rect x="-35" y="-20" width="70" height="40" rx="8" fill="#faf5ff" stroke="#a855f7" strokeWidth="2" />
              <text x="0" y="-3" textAnchor="middle" fill="#1e293b" fontWeight="bold" fontSize="12">K: 50</text>
              <text x="0" y="12" textAnchor="middle" fill="#7e22ce" fontSize="11">P: 99</text>
            </g>

            {/* Left */}
            <g transform="translate(120,120)">
              <rect x="-35" y="-20" width="70" height="40" rx="8" fill="#faf5ff" stroke="#a855f7" strokeWidth="2" />
              <text x="0" y="-3" textAnchor="middle" fill="#1e293b" fontWeight="bold" fontSize="12">K: 20</text>
              <text x="0" y="12" textAnchor="middle" fill="#7e22ce" fontSize="11">P: 85</text>
            </g>

            {/* Right */}
            <g transform="translate(280,120)">
              <rect x="-35" y="-20" width="70" height="40" rx="8" fill="#faf5ff" stroke="#a855f7" strokeWidth="2" />
              <text x="0" y="-3" textAnchor="middle" fill="#1e293b" fontWeight="bold" fontSize="12">K: 70</text>
              <text x="0" y="12" textAnchor="middle" fill="#7e22ce" fontSize="11">P: 72</text>
            </g>
            
            {/* Left-Left */}
            <g transform="translate(70,190)">
              <rect x="-35" y="-20" width="70" height="40" rx="8" fill="#faf5ff" stroke="#a855f7" strokeWidth="2" />
              <text x="0" y="-3" textAnchor="middle" fill="#1e293b" fontWeight="bold" fontSize="12">K: 10</text>
              <text x="0" y="12" textAnchor="middle" fill="#7e22ce" fontSize="11">P: 45</text>
            </g>

             {/* Left-Right */}
             <g transform="translate(170,190)">
              <rect x="-35" y="-20" width="70" height="40" rx="8" fill="#faf5ff" stroke="#a855f7" strokeWidth="2" />
              <text x="0" y="-3" textAnchor="middle" fill="#1e293b" fontWeight="bold" fontSize="12">K: 30</text>
              <text x="0" y="12" textAnchor="middle" fill="#7e22ce" fontSize="11">P: 60</text>
            </g>
          </svg>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-semibold mb-4 border-b border-slate-100 pb-2">Insertion Process</h3>
        <ol className="list-decimal list-inside space-y-2 text-slate-600">
          <li>Generate a random priority for the new node.</li>
          <li>Insert the node as a standard BST leaf using its key.</li>
          <li>While the node's priority is greater than its parent's priority, rotate the node upwards.</li>
        </ol>
      </section>
    </div>
  );
}

function RotationsContent() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Tree Rotations</h2>
        <p className="text-lg text-slate-600 leading-relaxed">
          Rotations are the fundamental operation used to change the shape of a binary search tree without violating the BST invariant (in-order key traversal remains identical).
        </p>
      </header>

      <section className="mb-12">
        <h3 className="text-xl font-semibold mb-4 border-b border-slate-100 pb-2">Right Rotation</h3>
        <p className="text-slate-600