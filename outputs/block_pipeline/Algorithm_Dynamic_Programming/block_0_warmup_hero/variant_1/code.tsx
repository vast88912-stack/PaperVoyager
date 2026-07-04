import React, { useState, useEffect } from 'react';

// --- Icons (Inline SVG for standalone requirement) ---
const IconZap = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </svg>
);

const IconBrain = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"></path>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"></path>
  </svg>
);

const IconArrowRight = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);

// --- Components ---

/**
 * Visualization of a Fibonacci call tree that collapses when "optimized".
 * Demonstrates Overlapping Subproblems.
 */
const TreeVisualizer = ({ optimized }: { optimized: boolean }) => {
  // Hardcoded positions for a small Fib(4) tree
  // Tree structure:
  //          4 (0)
  //      3 (1)      2 (2)
  //   2 (3) 1 (4)  1 (5) 0 (6)
  
  // Naive: Standard Tree
  // Optimized: Nodes 2(2) and 2(3) merge. Nodes 1(4) and 1(5) merge.
  
  const nodes = [
    { id: 0, val: 4, naive: { x: 300, y: 50 },  opt: { x: 300, y: 50 },  color: 'bg-indigo-600' }, // Root
    { id: 1, val: 3, naive: { x: 150, y: 150 }, opt: { x: 200, y: 150 }, color: 'bg-indigo-500' }, // L
    { id: 2, val: 2, naive: { x: 450, y: 150 }, opt: { x: 400, y: 150 }, color: 'bg-indigo-500' }, // R
    { id: 3, val: 2, naive: { x: 75,  y: 250 }, opt: { x: 400, y: 150 }, color: 'bg-rose-500' },   // L-L (Duplicate of 2)
    { id: 4, val: 1, naive: { x: 225, y: 250 }, opt: { x: 300, y: 250 }, color: 'bg-indigo-400' }, // L-R
    { id: 5, val: 1, naive: { x: 375, y: 250 }, opt: { x: 300, y: 250 }, color: 'bg-rose-500' },   // R-L (Duplicate of 1)
    { id: 6, val: 0, naive: { x: 525, y: 250 }, opt: { x: 500, y: 250 }, color: 'bg-indigo-400' }, // R-R
  ];

  const edges = [
    { from: 0, to: 1 }, { from: 0, to: 2 },
    { from: 1, to: 3 }, { from: 1, to: 4 },
    { from: 2, to: 5 }, { from: 2, to: 6 },
  ];

  return (
    <div className="relative w-full h-[320px] bg-white rounded-xl border border-slate-200 shadow-inner overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-10" 
           style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>

      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {edges.map((edge, i) => {
          const startNode = nodes[edge.from];
          const endNode = nodes[edge.to];
          
          const start = optimized ? startNode.opt : startNode.naive;
          const end = optimized ? endNode.opt : endNode.naive;

          // If optimized and it's a "duplicate" edge (like connecting to a merged node), fade it out or curve it
          const isDuplicatePath = optimized && (edge.to === 3 || edge.to === 5);
          
          return (
            <line
              key={i}
              x1={start.x} y1={start.y}
              x2={end.x} y2={end.y}
              stroke={isDuplicatePath ? "transparent" : "#cbd5e1"}
              strokeWidth="2"
              className="transition-all duration-1000 ease-in-out"
            />
          );
        })}
      </svg>

      {nodes.map((node) => {
        const pos = optimized ? node.opt : node.naive;
        // Hide duplicates in optimized mode
        const isHidden = optimized && (node.id === 3 || node.id === 5);
        
        return (
          <div
            key={node.id}
            className={`absolute flex items-center justify-center w-10 h-10 rounded-full text-white font-bold shadow-md transition-all duration-1000 ease-in-out ${node.color}`}
            style={{
              left: pos.x,
              top: pos.y,
              transform: 'translate(-50%, -50%)',
              opacity: isHidden ? 0 : 1,
              scale: isHidden ? 0.5 : 1,
            }}
          >
            {node.val}
          </div>
        );
      })}

      {/* Labels */}
      <div className="absolute bottom-4 left-4 text-xs font-mono text-slate-400">
        Visualizing: Fib(4)
      </div>
      <div className={`absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded transition-colors duration-500 ${optimized ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
        {optimized ? 'O(N) Complexity' : 'O(2^N) Complexity'}
      </div>
    </div>
  );
};

export default function App() {
  const [isOptimized, setIsOptimized] = useState(false);
  const [started, setStarted] = useState(false);

  // Auto-toggle for demo purposes if user is idle, but stop once they interact
  useEffect(() => {
    if (started) return;
    const interval = setInterval(() => {
      setIsOptimized(prev => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, [started]);

  const handleStart = () => {
    setStarted(true);
    setIsOptimized(true);
    // In a real app, this would route to the next module
    alert("Welcome to the Lab! Module 1 loaded.");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 flex flex-col items-center justify-center p-6">
      
      {/* Navbar Mock */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 z-50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-xs">DP</div>
          <span className="font-semibold text-slate-700">AlgoLab</span>
        </div>
        <div className="text-xs font-mono text-slate-400">CS-301: Advanced Algorithms</div>
      </nav>

      {/* Main Content Card */}
      <main className="max-w-4xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col md:flex-row mt-12">
        
        {/* Left Panel: Text & Controls */}
        <div className="flex-1 p-10 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 text-indigo-600 font-bold tracking-wider text-xs uppercase mb-4">
            <IconBrain className="w-4 h-4" />
            <span>Warmup Module</span>
          </div>
          
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4 leading-tight">
            Mastering <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
              Dynamic Programming
            </span>
          </h1>
          
          <p className="text-slate-600 text-lg mb-8 leading-relaxed">
            Stop solving the same subproblems over and over. Learn to cache, prune, and optimize your way from exponential chaos to linear elegance.
          </p>

          <div className="flex items-center gap-4 mb-8">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${!isOptimized ? 'text-rose-600' : 'text-slate-400'}`}>Naive</span>
              <button 
                onClick={() => { setStarted(true); setIsOptimized(!isOptimized); }}
                className={`relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isOptimized ? 'bg-indigo-600' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 ${isOptimized ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </button>
              <span className={`text-sm font-medium ${isOptimized ? 'text-indigo-600' : 'text-slate-400'}`}>Memoized</span>
            </div>
            <div className="text-xs text-slate-400 italic">
              ← Toggle to see the difference
            </div>
          </div>

          <button 
            onClick={handleStart}
            className="group flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-lg font-semibold hover:bg-slate-800 transition-all hover:shadow-lg active:scale-95"
          >
            <IconZap className="w-5 h-5 text-yellow-400 group-hover:scale-110 transition-transform" />
            Enter the Lab
            <IconArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Right Panel: Visualization */}
        <div className="flex-1 bg-slate-50 p-10 flex flex-col items-center justify-center border-l border-slate-100">
          <TreeVisualizer optimized={isOptimized} />
          
          <div className="mt-8 grid grid-cols-2 gap-4 w-full">
            <div className={`p-4 rounded-lg border transition-all duration-500 ${!isOptimized ? 'bg-white border-rose-200 shadow-sm' : 'bg-transparent border-transparent opacity-50'}`}>
              <div className="text-xs font-bold text-slate-500 uppercase mb-1">Time Complexity</div>
              <div className="text-xl font-mono font-bold text-slate-800">O(2ⁿ)</div>
              <div className="text-xs text-slate-400 mt-1">Exponential Growth</div>
            </div>
            <div className={`p-4 rounded-lg border transition-all duration-500 ${isOptimized ? 'bg-white border-indigo-200 shadow-sm' : 'bg-transparent border-transparent opacity-50'}`}>
              <div className="text-xs font-bold text-slate-500 uppercase mb-1">Time Complexity</div>
              <div className="text-xl font-mono font-bold text-indigo-600">O(n)</div>
              <div className="text-xs text-slate-400 mt-1">Linear Efficiency</div>
            </div>
          </div>
        </div>

      </main>

      {/* Footer / Credits */}
      <footer className="mt-12 text-center text-slate-400 text-sm">
        <p>University Algorithms Lab • Fall Semester 2023</p>
      </footer>

    </div>
  );
}