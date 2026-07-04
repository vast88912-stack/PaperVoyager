import React, { useState, useEffect } from 'react';

// Types
type TreeType = 'AVL' | 'Red-Black' | 'Treap';

// Helper to generate a random seed
const generateSeed = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// Inline SVG Icons
const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const BookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
  </svg>
);

export default function App() {
  const [selectedTree, setSelectedTree] = useState<TreeType>('AVL');
  const [seed, setSeed] = useState<string>('BETA42');
  const [isAnimating, setIsAnimating] = useState(false);

  // Trigger a brief animation pulse when tree type changes
  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 500);
    return () => clearTimeout(timer);
  }, [selectedTree]);

  // Tree configuration data for the dynamic SVG visualization
  const treeConfig = {
    'AVL': {
      desc: 'Strictly balanced. Heights of left and right subtrees differ by at most 1.',
      nodes: [
        { id: 1, x: 200, y: 50, val: '42', meta: 'h=3', color: 'bg-zinc-100', text: 'text-zinc-900', stroke: 'stroke-zinc-900' },
        { id: 2, x: 100, y: 120, val: '15', meta: 'h=2', color: 'bg-zinc-100', text: 'text-zinc-900', stroke: 'stroke-zinc-900' },
        { id: 3, x: 300, y: 120, val: '73', meta: 'h=1', color: 'bg-zinc-100', text: 'text-zinc-900', stroke: 'stroke-zinc-900' },
        { id: 4, x: 50, y: 190, val: '08', meta: 'h=1', color: 'bg-zinc-100', text: 'text-zinc-900', stroke: 'stroke-zinc-900' },
        { id: 5, x: 150, y: 190, val: '27', meta: 'h=1', color: 'bg-zinc-100', text: 'text-zinc-900', stroke: 'stroke-zinc-900' },
      ],
      edges: [
        { x1: 200, y1: 50, x2: 100, y2: 120 },
        { x1: 200, y1: 50, x2: 300, y2: 120 },
        { x1: 100, y1: 120, x2: 50, y2: 190 },
        { x1: 100, y1: 120, x2: 150, y2: 190 },
      ]
    },
    'Red-Black': {
      desc: 'Approximately balanced. Guarantees path from root to farthest leaf is no more than twice the shortest.',
      nodes: [
        { id: 1, x: 200, y: 50, val: '42', meta: 'B', color: 'bg-zinc-900', text: 'text-zinc-50', stroke: 'stroke-zinc-900' },
        { id: 2, x: 100, y: 120, val: '15', meta: 'R', color: 'bg-red-600', text: 'text-red-50', stroke: 'stroke-red-600' },
        { id: 3, x: 300, y: 120, val: '73', meta: 'B', color: 'bg-zinc-900', text: 'text-zinc-50', stroke: 'stroke-zinc-900' },
        { id: 4, x: 50, y: 190, val: '08', meta: 'B', color: 'bg-zinc-900', text: 'text-zinc-50', stroke: 'stroke-zinc-900' },
        { id: 5, x: 150, y: 190, val: '27', meta: 'B', color: 'bg-zinc-900', text: 'text-zinc-50', stroke: 'stroke-zinc-900' },
      ],
      edges: [
        { x1: 200, y1: 50, x2: 100, y2: 120 },
        { x1: 200, y1: 50, x2: 300, y2: 120 },
        { x1: 100, y1: 120, x2: 50, y2: 190 },
        { x1: 100, y1: 120, x2: 150, y2: 190 },
      ]
    },
    'Treap': {
      desc: 'Probabilistically balanced. Cartesian tree blending BST keys with random heap priorities.',
      nodes: [
        { id: 1, x: 200, y: 50, val: '42', meta: 'p:99', color: 'bg-blue-50', text: 'text-blue-900', stroke: 'stroke-blue-900' },
        { id: 2, x: 100, y: 120, val: '15', meta: 'p:85', color: 'bg-blue-50', text: 'text-blue-900', stroke: 'stroke-blue-900' },
        { id: 3, x: 300, y: 120, val: '73', meta: 'p:70', color: 'bg-blue-50', text: 'text-blue-900', stroke: 'stroke-blue-900' },
        { id: 4, x: 50, y: 190, val: '08', meta: 'p:41', color: 'bg-blue-50', text: 'text-blue-900', stroke: 'stroke-blue-900' },
        { id: 5, x: 150, y: 190, val: '27', meta: 'p:62', color: 'bg-blue-50', text: 'text-blue-900', stroke: 'stroke-blue-900' },
      ],
      edges: [
        { x1: 200, y1: 50, x2: 100, y2: 120 },
        { x1: 200, y1: 50, x2: 300, y2: 120 },
        { x1: 100, y1: 120, x2: 50, y2: 190 },
        { x1: 100, y1: 120, x2: 150, y2: 190 },
      ]
    }
  };

  const currentConfig = treeConfig[selectedTree];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans flex flex-col items-center justify-center p-6 md:p-12 overflow-hidden selection:bg-zinc-200">
      
      {/* Background Decorative Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
      </div>

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10 items-center">
        
        {/* Left Column: Hero Content & Controls */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          
          <header className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-200/50 border border-zinc-300 rounded-full text-xs font-semibold tracking-widest uppercase text-zinc-600">
              <BookIcon />
              <span>Interactive Learning Environment</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1]">
              Balanced BST Studio <br />
              <span className="text-zinc-400 font-normal">ChatGPT Edition</span>
            </h1>
            <p className="text-lg md:text-xl text-zinc-600 max-w-xl leading-relaxed">
              Master the delicate art of self-balancing trees. Visualize rotations, trace invariants, and repair broken data structures in a systems-aware environment.
            </p>
          </header>

          <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-6 space-y-8">
            
            {/* Control Group: Tree Type */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <h3 className="font-semibold text-zinc-900 text-sm uppercase tracking-wider">Select Architecture</h3>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                {(['AVL', 'Red-Black', 'Treap'] as TreeType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedTree(type)}
                    className={`relative p-4 rounded-xl text-left transition-all duration-200 border-2 
                      ${selectedTree === type 
                        ? 'border-zinc-900 bg-zinc-50 shadow-sm' 
                        : 'border-zinc-100 hover:border-zinc-300 bg-white'}`}
                  >
                    <div className="font-bold text-zinc-900 mb-1">{type}</div>
                    <div className={`text-xs ${selectedTree === type ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      {type === 'AVL' && 'Height-balanced'}
                      {type === 'Red-Black' && 'Color-balanced'}
                      {type === 'Treap' && 'Heap-balanced'}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-sm text-zinc-500 min-h-[40px] italic">
                {currentConfig.desc}
              </p>
            </div>

            <hr className="border-zinc-100" />

            {/* Control Group: Dataset Seed */}
            <div className="space-y-4">
              <h3 className="font-semibold text-zinc-900 text-sm uppercase tracking-wider">Dataset Generation</h3>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-zinc-400 font-mono text-sm">Seed:</span>
                  </div>
                  <input
                    type="text"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    className="w-full pl-16 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                    placeholder="Enter seed..."
                  />
                </div>
                <button 
                  onClick={() => setSeed(generateSeed())}
                  className="p-3 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  aria-label="Randomize Seed"
                >
                  <RefreshIcon />
                </button>
              </div>
            </div>

          </div>

          {/* Action CTA */}
          <div>
            <button className="group flex items-center gap-3 bg-zinc-900 hover:bg-zinc-800 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all active:scale-[0.98] shadow-md hover:shadow-xl">
              <PlayIcon />
              <span>Initialize Studio</span>
              <div className="w-1 h-1 bg-white rounded-full ml-2 opacity-50 group-hover:opacity-100 animate-ping"></div>
            </button>
          </div>

        </div>

        {/* Right Column: Visual Preview */}
        <div className="lg:col-span-5 relative flex justify-center items-center h-full min-h-[400px]">
          
          {/* Abstract background shapes */}
          <div className="absolute w-[120%] h-[120%] bg-zinc-100 rounded-full blur-3xl opacity-50 -z-10 mix-blend-multiply"></div>

          <div className={`relative w-full max-w-md aspect-square bg-white border border-zinc-200 shadow-xl rounded-3xl p-8 transition-transform duration-500 ${isAnimating ? 'scale-95 opacity-80' : 'scale-100 opacity-100'}`}>
            
            <div className="absolute top-4 left-4 font-mono text-xs font-bold text-zinc-400 uppercase tracking-widest">
              Preview_{selectedTree}
            </div>

            <svg viewBox="0 0 400 300" className="w-full h-full mt-4" preserveAspectRatio="xMidYMid meet">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" className="fill-zinc-300" />
                </marker>
              </defs>

              {/* Draw Edges */}
              {currentConfig.edges.map((edge, i) => (
                <line 
                  key={`edge-${i}`} 
                  x1={edge.x1} y1={edge.y1} 
                  x2={edge.x2} y2={edge.y2} 
                  className="stroke-zinc-300" 
                  strokeWidth="2"
                />
              ))}

              {/* Draw Nodes */}
              {currentConfig.nodes.map((node) => (
                <g key={node.id} transform={`translate(${node.x}, ${node.y})`} className="transition-all duration-700 ease-in-out">
                  <circle 
                    r="22" 
                    className={`${node.color} ${node.stroke}`} 
                    strokeWidth="3"
                  />
                  <text 
                    textAnchor="middle" 
                    dominantBaseline="central" 
                    className={`font-mono text-sm font-bold ${node.text}`}
                  >
                    {node.val}
                  </text>
                  
                  {/* Metadata Tag (Heights, Colors, Priorities) */}
                  <g transform="translate(18, -18)">
                    <rect x="-10" y="-10" width="26" height="16" rx="4" className="fill-white stroke-zinc-200 shadow-sm" strokeWidth="1" />
                    <text x="3" y="-2" textAnchor="middle" dominantBaseline="central" className="font-mono text-[9px] font-bold fill-zinc-600">
                      {node.meta}
                    </text>
                  </g>
                </g>
              ))}
              
              {/* Illustrative Rotation Arrow (Appears dynamically to suggest action) */}
              <g className="animate-bounce" transform="translate(150, 60)">
                <path d="M 0 0 Q -20 -20 -40 10" fill="none" className="stroke-zinc-400" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#arrow)" />
              </g>

            </svg>
            
            <div className="absolute bottom-6 inset-x-0 text-center">
              <span className="inline-block bg-zinc-100 text-zinc-500 font-mono text-xs px-3 py-1 rounded-md border border-zinc-200">
                Current Seed: {seed}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}