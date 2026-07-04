import React, { useState, useEffect } from 'react';
import { 
  Network, 
  RefreshCw, 
  Play, 
  Settings2, 
  BookOpen, 
  ChevronRight,
  Hash,
  Layers
} from 'lucide-react';

// --- Types & Data ---

type TreeType = 'AVL' | 'RED_BLACK' | 'TREAP';

interface TreeOption {
  id: TreeType;
  name: string;
  tagline: string;
  description: string;
  invariant: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const TREE_OPTIONS: TreeOption[] = [
  {
    id: 'AVL',
    name: 'AVL Tree',
    tagline: 'Strictly Balanced',
    description: 'Maintains strict height balance. Lookups are extremely fast, but insertions may require more rotations.',
    invariant: '|Height(L) - Height(R)| ≤ 1',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200 hover:border-blue-400',
  },
  {
    id: 'RED_BLACK',
    name: 'Red-Black Tree',
    tagline: 'Color-Coded Balance',
    description: 'Uses node colors to ensure the tree is approximately balanced. Guarantees O(log n) operations with fewer rotations than AVL.',
    invariant: 'Uniform Black-Height to all leaves',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200 hover:border-red-400',
  },
  {
    id: 'TREAP',
    name: 'Treap',
    tagline: 'Tree + Heap',
    description: 'Combines BST ordering for keys and Heap ordering for randomly assigned priorities. Probabilistically balanced.',
    invariant: 'Priority(Parent) ≥ Priority(Child)',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200 hover:border-emerald-400',
  }
];

// --- Components ---

const AbstractTreeGraphic = ({ activeTree }: { activeTree: TreeType }) => {
  // Visual representation changes slightly based on tree type
  const isRB = activeTree === 'RED_BLACK';
  const isTreap = activeTree === 'TREAP';

  return (
    <div className="relative w-full h-full min-h-[300px] flex items-center justify-center p-8">
      <svg viewBox="0 0 200 160" className="w-full h-full max-w-md drop-shadow-sm">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" className="fill-slate-300" />
          </marker>
        </defs>

        {/* Edges */}
        <g className="stroke-slate-300" strokeWidth="2" strokeLinecap="round">
          <line x1="100" y1="20" x2="50" y2="60" />
          <line x1="100" y1="20" x2="150" y2="60" />
          
          <line x1="50" y1="60" x2="25" y2="110" />
          <line x1="50" y1="60" x2="75" y2="110" />
          
          <line x1="150" y1="60" x2="125" y2="110" />
          <line x1="150" y1="60" x2="175" y2="110" />
        </g>

        {/* Rotation Animation Indicator (Decorative) */}
        <path 
          d="M 110 30 Q 130 20 140 40" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeDasharray="4 4" 
          markerEnd="url(#arrow)"
          className={`text-indigo-400 transition-opacity duration-500 ${activeTree === 'AVL' ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Nodes */}
        <g className="font-mono text-[10px] font-bold" textAnchor="middle" dominantBaseline="central">
          {/* Root */}
          <circle cx="100" cy="20" r="14" className={isRB ? 'fill-slate-800' : 'fill-white stroke-slate-400 stroke-2'} />
          <text x="100" y="20" className={isRB ? 'fill-white' : 'fill-slate-700'}>42</text>
          {isTreap && <text x="120" y="10" className="fill-emerald-600 text-[8px]">p:99</text>}

          {/* L */}
          <circle cx="50" cy="60" r="14" className={isRB ? 'fill-red-500' : 'fill-white stroke-slate-400 stroke-2'} />
          <text x="50" y="60" className={isRB ? 'fill-white' : 'fill-slate-700'}>17</text>
          {isTreap && <text x="30" y="50" className="fill-emerald-600 text-[8px]">p:85</text>}

          {/* R */}
          <circle cx="150" cy="60" r="14" className={isRB ? 'fill-slate-800' : 'fill-white stroke-slate-400 stroke-2'} />
          <text x="150" y="60" className={isRB ? 'fill-white' : 'fill-slate-700'}>64</text>
          {isTreap && <text x="170" y="50" className="fill-emerald-600 text-[8px]">p:72</text>}

          {/* LL */}
          <circle cx="25" cy="110" r="14" className={isRB ? 'fill-slate-800' : 'fill-white stroke-slate-400 stroke-2'} />
          <text x="25" y="110" className={isRB ? 'fill-white' : 'fill-slate-700'}>12</text>

          {/* LR */}
          <circle cx="75" cy="110" r="14" className={isRB ? 'fill-slate-800' : 'fill-white stroke-slate-400 stroke-2'} />
          <text x="75" y="110" className={isRB ? 'fill-white' : 'fill-slate-700'}>23</text>

          {/* RL */}
          <circle cx="125" cy="110" r="14" className={isRB ? 'fill-red-500' : 'fill-white stroke-slate-400 stroke-2'} />
          <text x="125" y="110" className={isRB ? 'fill-white' : 'fill-slate-700'}>50</text>

          {/* RR */}
          <circle cx="175" cy="110" r="14" className={isRB ? 'fill-slate-800' : 'fill-white stroke-slate-400 stroke-2'} />
          <text x="175" y="110" className={isRB ? 'fill-white' : 'fill-slate-700'}>89</text>
        </g>
      </svg>
    </div>
  );
};

export default function App() {
  const [activeTree, setActiveTree] = useState<TreeType>('AVL');
  const [seed, setSeed] = useState<string>('42');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateSeed = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setSeed(Math.floor(Math.random() * 10000).toString());
      setIsGenerating(false);
    }, 300);
  };

  const handleStart = () => {
    console.log(`Starting Studio with Tree: ${activeTree}, Seed: ${seed}`);
    // In a full app, this would route to the simulator view.
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-200">
      {/* Navigation Bar */}
      <nav className="w-full border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Network className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">Balanced BST Studio</span>
            <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium border border-slate-200">
              ChatGPT Edition
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
            <a href="#docs" className="hover:text-slate-900 flex items-center gap-1 transition-colors">
              <BookOpen className="w-4 h-4" /> Documentation
            </a>
            <a href="#settings" className="hover:text-slate-900 flex items-center gap-1 transition-colors">
              <Settings2 className="w-4 h-4" /> Settings
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Content & Controls */}
          <div className="flex flex-col space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
                Master Tree Rotations & <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">
                  Structural Invariants
                </span>
              </h1>
              <p className="text-lg text-slate-600 max-w-xl leading-relaxed">
                An interactive, systems-aware environment to visualize, step through, and debug self-balancing binary search trees. Choose your structure and initialize the studio.
              </p>
            </div>

            {/* Configuration Panel */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-8">
              
              {/* Tree Type Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-400" />
                    Select Architecture
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {TREE_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setActiveTree(option.id)}
                      className={`relative text-left p-4 rounded-xl border-2 transition-all duration-200 flex flex-col gap-1
                        ${activeTree === option.id 
                          ? `${option.borderColor} ${option.bgColor} shadow-sm ring-1 ring-opacity-50 ring-${option.color.split('-')[1]}-400` 
                          : 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                      <span className={`font-bold text-sm ${activeTree === option.id ? option.color : 'text-slate-700'}`}>
                        {option.name}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {option.tagline}
                      </span>
                      
                      {/* Active Indicator */}
                      {activeTree === option.id && (
                        <div className={`absolute top-3 right-3 w-2 h-2 rounded-full bg-current ${option.color}`} />
                      )}
                    </button>
                  ))}
                </div>

                {/* Active Tree Details */}
                <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-100 text-sm">
                  <p className="text-slate-600 mb-2">
                    {TREE_OPTIONS.find(t => t.id === activeTree)?.description}
                  </p>
                  <div className="flex items-center gap-2 font-mono text-xs text-slate-700 bg-white px-3 py-2 rounded border border-slate-200 w-fit">
                    <span className="text-indigo-600 font-bold">Invariant:</span>
                    {TREE_OPTIONS.find(t => t.id === activeTree)?.invariant}
                  </div>
                </div>
              </div>

              {/* Dataset Seed */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Hash className="w-4 h-4 text-slate-400" />
                  Dataset Seed
                </h3>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-400 font-mono text-sm">seed_</span>
                    </div>
                    <input
                      type="text"
                      value={seed}
                      onChange={(e) => setSeed(e.target.value)}
                      className="block w-full pl-14 pr-3 py-3 border border-slate-200 rounded-xl text-slate-900 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-slate-50 focus:bg-white"
                      placeholder="Enter numeric seed..."
                    />
                  </div>
                  <button
                    onClick={handleGenerateSeed}
                    className="px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center justify-center focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    title="Generate Random Seed"
                  >
                    <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin text-indigo-600' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  onClick={handleStart}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-4 rounded-xl font-semibold text-lg transition-all transform active:scale-[0.98] shadow-md hover:shadow-lg"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Initialize Studio
                  <ChevronRight className="w-5 h-5 opacity-70" />
                </button>
              </div>

            </div>
          </div>

          {/* Right Column: Visualizer Preview */}
          <div className="relative hidden lg:flex flex-col items-center justify-center bg-slate-100/50 rounded-3xl border border-slate-200/60 p-8 h-full min-h-[500px] overflow-hidden">
            {/* Background Grid Pattern */}
            <div 
              className="absolute inset-0 opacity-[0.03] pointer-events-none" 
              style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}
            />
            
            <div className="relative z-10 w-full flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="font-mono text-xs text-slate-400 bg-white px-2 py-1 rounded shadow-sm border border-slate-100">
                  preview_render.svg
                </div>
              </div>
              
              <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center overflow-hidden relative">
                <AbstractTreeGraphic activeTree={activeTree} />
                
                {/* Overlay Stats */}
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none">
                  <div className="bg-slate-900/80 backdrop-blur text-white font-mono text-[10px] p-2 rounded-lg">
                    <div>Nodes: 7</div>
                    <div>Max Depth: 3</div>
                  </div>
                  <div className="bg-white/80 backdrop-blur text-slate-600 font-mono text-[10px] p-2 rounded-lg border border-slate-200">
                    Status: Balanced
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}