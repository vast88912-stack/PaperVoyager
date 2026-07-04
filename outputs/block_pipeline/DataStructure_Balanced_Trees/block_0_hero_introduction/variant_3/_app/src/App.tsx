import React, { useState, useEffect } from 'react';

// Runtime Dependencies:
// - react
// - tailwindcss (included via build step/standard environment)

const TREE_TYPES = [
  {
    id: 'avl',
    name: 'AVL Tree',
    description: 'Maintains strict height balance using O(log n) rotations. Ideal for read-heavy workloads.',
    color: 'border-blue-500',
    bg: 'bg-blue-50',
    text: 'text-blue-700'
  },
  {
    id: 'redblack',
    name: 'Red-Black Tree',
    description: 'Uses color invariants to guarantee approximate balance. Perfect for write-heavy systems.',
    color: 'border-red-500',
    bg: 'bg-red-50',
    text: 'text-red-700'
  },
  {
    id: 'treap',
    name: 'Treap (Cartesian Tree)',
    description: 'Combines BST keys with random Heap priorities to probabilistically ensure balance.',
    color: 'border-purple-500',
    bg: 'bg-purple-50',
    text: 'text-purple-700'
  }
];

export default function App() {
  const [activeType, setActiveType] = useState('avl');
  const [seed, setSeed] = useState('42');
  const [isHoveringGraphic, setIsHoveringGraphic] = useState(false);

  const generateSeed = () => {
    setSeed(Math.floor(Math.random() * 99999).toString());
  };

  // Helper for rendering abstract tree nodes in the hero graphic
  const renderHeroGraphic = () => {
    // Abstract 3-level tree coordinates
    const nodes = [
      { id: 1, cx: 200, cy: 60, val: '50', prio: '0.12', bf: '0', color: 'black' },
      { id: 2, cx: 100, cy: 140, val: '25', prio: '0.45', bf: '+1', color: 'red' },
      { id: 3, cx: 300, cy: 140, val: '75', prio: '0.33', bf: '-1', color: 'black' },
      { id: 4, cx: 50, cy: 220, val: '10', prio: '0.89', bf: '0', color: 'black' },
      { id: 5, cx: 150, cy: 220, val: '30', prio: '0.71', bf: '0', color: 'black' },
      { id: 6, cx: 250, cy: 220, val: '60', prio: '0.92', bf: '0', color: 'red' },
      { id: 7, cx: 350, cy: 220, val: '90', prio: '0.55', bf: '0', color: 'red' }
    ];

    const edges = [
      { x1: 200, y1: 60, x2: 100, y2: 140 },
      { x1: 200, y1: 60, x2: 300, y2: 140 },
      { x1: 100, y1: 140, x2: 50, y2: 220 },
      { x1: 100, y1: 140, x2: 150, y2: 220 },
      { x1: 300, y1: 140, x2: 250, y2: 220 },
      { x1: 300, y1: 140, x2: 350, y2: 220 }
    ];

    return (
      <svg
        viewBox="0 0 400 300"
        className={`w-full h-full transition-transform duration-700 ease-out ${
          isHoveringGraphic ? 'scale-105' : 'scale-100'
        }`}
        onMouseEnter={() => setIsHoveringGraphic(true)}
        onMouseLeave={() => setIsHoveringGraphic(false)}
      >
        <defs>
          <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => (
          <line
            key={i}
            x1={edge.x1}
            y1={edge.y1}
            x2={edge.x2}
            y2={edge.y2}
            stroke="url(#edgeGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        ))}

        {/* Nodes */}
        {nodes.map((n) => {
          // Dynamic styling based on tree type
          let fill = '#ffffff';
          let stroke = '#0f172a';
          let textColor = '#0f172a';
          let secondaryText = null;

          if (activeType === 'redblack') {
            fill = n.color === 'red' ? '#fee2e2' : '#0f172a';
            stroke = n.color === 'red' ? '#ef4444' : '#0f172a';
            textColor = n.color === 'red' ? '#ef4444' : '#ffffff';
          } else if (activeType === 'treap') {
            secondaryText = n.prio;
            stroke = '#a855f7';
          } else if (activeType === 'avl') {
            secondaryText = `bf:${n.bf}`;
            stroke = '#3b82f6';
          }

          return (
            <g key={n.id} className="transition-all duration-500">
              <circle
                cx={n.cx}
                cy={n.cy}
                r={22}
                fill={fill}
                stroke={stroke}
                strokeWidth="3"
                className="transition-all duration-500 shadow-sm"
              />
              <text
                x={n.cx}
                y={activeType === 'treap' ? n.cy - 2 : n.cy + 5}
                textAnchor="middle"
                fill={textColor}
                className="font-mono font-bold text-sm transition-all duration-500"
              >
                {n.val}
              </text>
              {secondaryText && (
                <text
                  x={n.cx}
                  y={activeType === 'treap' ? n.cy + 12 : n.cy - 28}
                  textAnchor="middle"
                  fill={activeType === 'treap' ? '#93c5fd' : '#64748b'}
                  className="font-mono text-[10px] tracking-tighter"
                >
                  {secondaryText}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-200 selection:text-indigo-900 flex flex-col items-center justify-center p-6 lg:p-12">
      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* Left Column: Text & Configuration */}
        <div className="space-y-10">
          <div className="space-y-4 relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-semibold tracking-wide uppercase shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              ChatGPT Edition
            </div>
            <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
              Balanced BST <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">
                Studio
              </span>
            </h1>
            <p className="text-lg text-slate-600 max-w-lg leading-relaxed">
              Master the inner workings of self-balancing binary search trees. 
              Step through rotations, visualize invariants, and challenge your algorithmic intuition in real-time.
            </p>
          </div>

          {/* Configuration Panel */}
          <div className="bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-8">
            
            {/* Seed Configuration */}
            <div className="space-y-3">
              <label className="flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>Dataset Seed</span>
                <span className="text-xs font-normal text-slate-400">Determines node injection sequence</span>
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value.replace(/\D/g, ''))}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-mono text-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                    placeholder="Enter numeric seed..."
                  />
                </div>
                <button
                  onClick={generateSeed}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors flex items-center gap-2"
                  title="Randomize Seed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Tree Type Configuration */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                Architecture Type
              </label>
              <div className="grid gap-3">
                {TREE_TYPES.map((type) => {
                  const isActive = activeType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setActiveType(type.id)}
                      className={`relative flex flex-col text-left p-4 rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                        isActive
                          ? `${type.color} ${type.bg} shadow-md`
                          : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50 bg-white'
                      }`}
                    >
                      {isActive && (
                        <div className={`absolute top-0 left-0 w-1.5 h-full ${type.color.replace('border-', 'bg-')}`} />
                      )}
                      <div className="flex justify-between items-center w-full mb-1">
                        <span className={`font-bold ${isActive ? type.text : 'text-slate-800'}`}>
                          {type.name}
                        </span>
                        {isActive && (
                          <svg className={`w-5 h-5 ${type.text}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-sm ${isActive ? 'text-slate-700' : 'text-slate-500'}`}>
                        {type.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Area */}
            <div className="pt-4">
              <button className="w-full py-4 px-6 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-3">
                Initialize Studio
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>

          </div>
        </div>

        {/* Right Column: Interactive Graphic */}
        <div className="relative flex justify-center items-center h-[500px] lg:h-[600px] rounded-3xl bg-gradient-to-tr from-slate-100 to-slate-200/50 border border-slate-200/60 shadow-inner overflow-hidden">
          
          {/* Background Decor */}
          <div className="absolute inset-0 grid grid-cols-[repeat(20,minmax(0,1fr))] grid-rows-[repeat(20,minmax(0,1fr))] opacity-[0.03] pointer-events-none">
            {Array.from({ length: 400 }).map((_, i) => (
              <div key={i} className="border-r border-b border-slate-900" />
            ))}
          </div>

          {/* Glowing Aura based on tree type */}
          <div 
            className={`absolute w-96 h-96 rounded-full blur-3xl opacity-20 transition-colors duration-700 pointer-events-none ${
              activeType === 'avl' ? 'bg-blue-400' : 
              activeType === 'redblack' ? 'bg-red-400' : 'bg-purple-400'
            }`}
          />

          {/* SVG Graphic Component */}
          <div className="relative z-10 w-full max-w-md p-8">
            {renderHeroGraphic()}
            
            {/* Visual Indicators Overlay */}
            <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2 text-xs font-mono font-medium text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></span>
                System Ready
              </div>
              <div>Seed: {seed}</div>
              <div className="uppercase">Mode: {activeType}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}