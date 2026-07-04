import React, { useState, useEffect } from 'react';

// --- Icons (Inline SVGs to ensure zero-dependency standalone execution) ---
const IconPlay = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const IconShuffle = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 3 21 3 21 8"></polyline>
    <line x1="4" y1="20" x2="21" y2="3"></line>
    <polyline points="21 16 21 21 16 21"></polyline>
    <line x1="15" y1="15" x2="21" y2="21"></line>
    <line x1="4" y1="4" x2="9" y2="9"></line>
  </svg>
);

const IconCheck = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const IconTerminal = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5"></polyline>
    <line x1="12" y1="19" x2="20" y2="19"></line>
  </svg>
);

// --- Types & Data ---
type TreeType = 'avl' | 'rb' | 'treap';

interface TreeOption {
  id: TreeType;
  name: string;
  tag: string;
  description: string;
  invariants: string[];
}

const TREE_OPTIONS: TreeOption[] = [
  {
    id: 'avl',
    name: 'AVL Tree',
    tag: 'Strictly Balanced',
    description: 'Adelson-Velsky and Landis tree. Maintains strict balance through rapid rotations.',
    invariants: ['|Height(L) - Height(R)| ≤ 1', 'O(log n) guaranteed search']
  },
  {
    id: 'rb',
    name: 'Red-Black Tree',
    tag: 'Color Invariants',
    description: 'Self-balancing BST using coloring rules. Less rigid than AVL, faster insertions.',
    invariants: ['Root is Black', 'No two adjacent Red nodes', 'Equal black-height paths']
  },
  {
    id: 'treap',
    name: 'Treap',
    tag: 'Randomized',
    description: 'A Cartesian tree combining BST and Heap properties via randomized priorities.',
    invariants: ['BST ordering by Key', 'Max-Heap ordering by Priority']
  }
];

// --- Helper ---
const generateSeed = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// --- Main Component ---
export default function App() {
  const [selectedTree, setSelectedTree] = useState<TreeType>('avl');
  const [seed, setSeed] = useState<string>('');
  const [isHoveringLaunch, setIsHoveringLaunch] = useState(false);

  useEffect(() => {
    setSeed(generateSeed());
  }, []);

  const handleRandomizeSeed = () => {
    setSeed(generateSeed());
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-200 overflow-hidden relative flex flex-col items-center justify-center p-6">
      
      {/* Background Decorative SVG */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-[0.03]">
        <svg viewBox="0 0 800 600" className="w-[120%] h-[120%] max-w-none">
          <g stroke="currentColor" strokeWidth="2" fill="none">
            <circle cx="400" cy="100" r="30" />
            <circle cx="250" cy="250" r="30" />
            <circle cx="550" cy="250" r="30" />
            <circle cx="150" cy="400" r="30" />
            <circle cx="350" cy="400" r="30" />
            <circle cx="450" cy="400" r="30" />
            <circle cx="650" cy="400" r="30" />
            <path d="M385 125 L265 225 M415 125 L535 225 M235 275 L165 375 M265 275 L335 375 M535 275 L465 375 M565 275 L635 375" />
          </g>
        </svg>
      </div>

      <div className="max-w-5xl w-full z-10 space-y-12">
        
        {/* Header Section */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center px-3 py-1 mb-4 border border-slate-300 rounded-full bg-white shadow-sm">
            <IconTerminal className="w-4 h-4 mr-2 text-indigo-600" />
            <span className="text-xs font-bold tracking-widest uppercase text-slate-600">ChatGPT Edition</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900">
            Balanced BST Studio
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-light">
            Master tree rotations and invariants. Step through operations, visualize structural rebalancing, and conquer the Challenge Mode.
          </p>
        </header>

        {/* Configuration Panel */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3">
            
            {/* Left/Top: Tree Selection */}
            <div className="col-span-1 lg:col-span-2 p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/50">
              <h2 className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-6 flex items-center">
                <span className="w-6 h-px bg-slate-300 mr-4"></span>
                Select Architecture
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {TREE_OPTIONS.map((tree) => {
                  const isActive = selectedTree === tree.id;
                  return (
                    <button
                      key={tree.id}
                      onClick={() => setSelectedTree(tree.id)}
                      className={`relative text-left p-5 rounded-2xl transition-all duration-300 group ${
                        isActive 
                          ? 'bg-white shadow-md border-2 border-indigo-500 transform scale-[1.02]' 
                          : 'bg-white border-2 border-transparent shadow-sm hover:shadow-md hover:border-indigo-200'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute top-4 right-4 text-indigo-500">
                          <IconCheck className="w-5 h-5" />
                        </div>
                      )}
                      <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                        {tree.tag}
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">{tree.name}</h3>
                      <p className="text-sm text-slate-500 mb-4 h-16">{tree.description}</p>
                      <div className="space-y-1.5">
                        {tree.invariants.map((inv, idx) => (
                          <div key={idx} className="flex items-start text-xs font-mono text-slate-600">
                            <span className="text-indigo-400 mr-2">›</span>
                            {inv}
                          </div>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right/Bottom: Dataset & Launch */}
            <div className="col-span-1 p-8 lg:p-10 flex flex-col justify-between bg-white">
              <div>
                <h2 className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-6 flex items-center">
                  <span className="w-6 h-px bg-slate-300 mr-4"></span>
                  Dataset Seed
                </h2>
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">
                    The seed determines the initial sequence of insertions and priorities. Share this to replicate specific tree shapes.
                  </p>
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <input 
                        type="text" 
                        value={seed}
                        onChange={(e) => setSeed(e.target.value.toUpperCase())}
                        className="w-full font-mono text-lg bg-slate-100 border-2 border-slate-200 rounded-xl py-3 px-4 text-slate-800 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all uppercase"
                        placeholder="ENTER SEED"
                      />
                    </div>
                    <button 
                      onClick={handleRandomizeSeed}
                      className="p-3.5 bg-slate-100 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors border-2 border-transparent active:border-indigo-200"
                      title="Randomize Seed"
                    >
                      <IconShuffle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-10 lg:mt-0">
                <button 
                  onMouseEnter={() => setIsHoveringLaunch(true)}
                  onMouseLeave={() => setIsHoveringLaunch(false)}
                  className="w-full group relative inline-flex items-center justify-center px-8 py-5 text-lg font-bold text-white transition-all duration-300 bg-slate-900 rounded-2xl hover:bg-indigo-600 overflow-hidden shadow-lg hover:shadow-indigo-500/30"
                >
                  <span className="relative z-10 flex items-center">
                    Initialize Studio
                    <IconPlay className={`ml-3 w-5 h-5 transition-transform duration-300 ${isHoveringLaunch ? 'translate-x-1' : ''}`} />
                  </span>
                  {/* Hover ripple effect */}
                  <div className={`absolute inset-0 h-full w-full bg-indigo-500 transition-transform duration-500 ease-out origin-left ${isHoveringLaunch ? 'scale-x-100' : 'scale-x-0'}`}></div>
                </button>
                <p className="text-center text-xs text-slate-400 mt-4 font-mono">
                  Runtime: Browser • Mode: Interactive
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}