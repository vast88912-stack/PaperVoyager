import React, { useState, useEffect } from 'react';

// Runtime Dependencies:
// - React
// - Tailwind CSS (assumed to be configured in the project)

type TreeType = 'AVL' | 'Red-Black' | 'Treap';

interface NodeData {
  id: number;
  key: string;
  x: number;
  y: number;
  color?: 'red' | 'black'; // For Red-Black
  bf?: number; // For AVL
  priority?: number; // For Treap
}

interface EdgeData {
  source: number;
  target: number;
}

const PREVIEW_NODES: NodeData[] = [
  { id: 1, key: '50', x: 200, y: 40, color: 'black', bf: 0, priority: 99 },
  { id: 2, key: '25', x: 100, y: 120, color: 'red', bf: 0, priority: 85 },
  { id: 3, key: '75', x: 300, y: 120, color: 'red', bf: 0, priority: 92 },
  { id: 4, key: '10', x: 40, y: 200, color: 'black', bf: 0, priority: 42 },
  { id: 5, key: '30', x: 160, y: 200, color: 'black', bf: 0, priority: 73 },
  { id: 6, key: '60', x: 240, y: 200, color: 'black', bf: 0, priority: 88 },
  { id: 7, key: '90', x: 360, y: 200, color: 'black', bf: 0, priority: 61 },
];

const PREVIEW_EDGES: EdgeData[] = [
  { source: 1, target: 2 },
  { source: 1, target: 3 },
  { source: 2, target: 4 },
  { source: 2, target: 5 },
  { source: 3, target: 6 },
  { source: 3, target: 7 },
];

const TreePreview: React.FC<{ type: TreeType }> = ({ type }) => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
    const timer = setTimeout(() => setAnimate(false), 500);
    return () => clearTimeout(timer);
  }, [type]);

  const getNodeStyle = (node: NodeData) => {
    switch (type) {
      case 'Red-Black':
        return {
          fill: node.color === 'red' ? '#ef4444' : '#1e293b',
          stroke: node.color === 'red' ? '#b91c1c' : '#0f172a',
          text: '#ffffff',
          accent: '#ffffff',
        };
      case 'Treap':
        return {
          fill: '#d1fae5',
          stroke: '#10b981',
          text: '#064e3b',
          accent: '#047857',
        };
      case 'AVL':
      default:
        return {
          fill: '#dbeafe',
          stroke: '#3b82f6',
          text: '#1e3a8a',
          accent: '#2563eb',
        };
    }
  };

  return (
    <div className="relative w-full h-full min-h-[300px] flex items-center justify-center bg-slate-50/50 rounded-xl border border-slate-100 overflow-hidden">
      {/* Decorative background grid */}
      <div 
        className="absolute inset-0 opacity-20" 
        style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}
      />
      
      <svg
        viewBox="0 0 400 260"
        className={`w-full max-w-md drop-shadow-sm transition-transform duration-500 ease-out ${animate ? 'scale-95 opacity-80' : 'scale-100 opacity-100'}`}
      >
        <g className="edges">
          {PREVIEW_EDGES.map((edge, idx) => {
            const source = PREVIEW_NODES.find((n) => n.id === edge.source)!;
            const target = PREVIEW_NODES.find((n) => n.id === edge.target)!;
            return (
              <line
                key={idx}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="#cbd5e1"
                strokeWidth="2"
                className="transition-all duration-300"
              />
            );
          })}
        </g>
        <g className="nodes">
          {PREVIEW_NODES.map((node) => {
            const style = getNodeStyle(node);
            return (
              <g key={node.id} className="transition-all duration-500" transform={`translate(${node.x}, ${node.y})`}>
                <circle
                  r="18"
                  fill={style.fill}
                  stroke={style.stroke}
                  strokeWidth="2"
                  className="transition-colors duration-300"
                />
                <text
                  textAnchor="middle"
                  dy=".3em"
                  fill={style.text}
                  className="font-mono text-[14px] font-bold transition-colors duration-300"
                >
                  {node.key}
                </text>
                
                {/* Tree-specific invariant indicators */}
                {type === 'AVL' && (
                  <text textAnchor="middle" dy="-24" fill={style.accent} className="font-mono text-[10px] font-semibold">
                    bf:{node.bf}
                  </text>
                )}
                {type === 'Treap' && (
                  <text textAnchor="middle" dy="-24" fill={style.accent} className="font-mono text-[10px] font-semibold">
                    p:{node.priority}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      
      {/* Legend / Info overlay */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
        <div className="bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-md border border-slate-200 shadow-sm">
          <span className="font-mono text-xs text-slate-600 font-semibold tracking-wider uppercase">
            {type} INVARIANTS
          </span>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [treeType, setTreeType] = useState<TreeType>('AVL');
  const [seed, setSeed] = useState<string>('42');

  const handleRandomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 10000).toString());
  };

  const treeDescriptions = {
    'AVL': 'Strictly balanced. Heights of left and right subtrees differ by at most 1.',
    'Red-Black': 'Color-coded nodes ensure no path is more than twice as long as any other.',
    'Treap': 'A randomized BST that maintains heap priority properties to ensure balance.',
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200 flex items-center justify-center p-4 md:p-8">
      <main className="max-w-6xl w-full bg-white rounded-3xl shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-100 flex flex-col lg:flex-row">
        
        {/* Left Column: Configuration */}
        <div className="w-full lg:w-5/12 p-8 md:p-12 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-slate-100">
          
          <div className="mb-8">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold tracking-wide uppercase mb-4">
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              <span>ChatGPT Edition</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
              Balanced BST <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Studio</span>
            </h1>
            <p className="text-slate-500 text-lg leading-relaxed">
              Master rotations and invariants through interactive visualization. Step through insertions, deletions, and structural fixes.
            </p>
          </div>

          <div className="space-y-6">
            {/* Tree Type Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                Select Architecture
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['AVL', 'Red-Black', 'Treap'] as TreeType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setTreeType(type)}
                    className={`relative py-3 px-2 rounded-xl text-sm font-bold transition-all duration-200 flex flex-col items-center justify-center gap-1
                      ${treeType === type 
                        ? 'bg-blue-50 text-blue-700 border-2 border-blue-500 shadow-sm' 
                        : 'bg-white text-slate-600 border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-sm text-slate-500 min-h-[40px]">
                {treeDescriptions[treeType]}
              </p>
            </div>

            {/* Dataset Seed */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                Dataset Seed
              </label>
              <div className="flex space-x-3">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 font-mono">
                    #
                  </span>
                  <input
                    type="text"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter seed..."
                  />
                </div>
                <button
                  onClick={handleRandomizeSeed}
                  className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 hover:text-slate-900 transition-colors border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  title="Randomize Seed"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-4">
              <button className="w-full py-4 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-lg shadow-lg shadow-slate-900/20 transition-all transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 group">
                <span>Initialize Workspace</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Preview */}
        <div className="w-full lg:w-7/12 p-8 md:p-12 bg-white flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>Live Preview</span>
            </h2>
            <div className="flex space-x-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
          </div>
          
          <div className="flex-1 rounded-2xl p-2 bg-slate-50 border border-slate-100 shadow-inner">
             <TreePreview type={treeType} />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
             <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
               <div className="text-2xl font-mono font-bold text-slate-800">O(log n)</div>
               <div className="text-xs font-semibold text-slate-500 uppercase mt-1">Search</div>
             </div>
             <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
               <div className="text-2xl font-mono font-bold text-slate-800">O(log n)</div>
               <div className="text-xs font-semibold text-slate-500 uppercase mt-1">Insert</div>
             </div>
             <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
               <div className="text-2xl font-mono font-bold text-slate-800">O(log n)</div>
               <div className="text-xs font-semibold text-slate-500 uppercase mt-1">Delete</div>
             </div>
          </div>
        </div>

      </main>
    </div>
  );
}