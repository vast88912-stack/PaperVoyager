import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, RotateCcw, StepForward, Activity, BookOpen, Layers, Info } from 'lucide-react';

// --- Types & Interfaces ---

type Mode = 'naive' | 'memo' | 'tabulation';

interface TreeNode {
  id: string;
  n: number;
  x: number;
  y: number;
  parentId?: string;
  isMemoHit?: boolean;
}

interface TreeEdge {
  source: TreeNode;
  target: TreeNode;
}

interface Step {
  stepIndex: number;
  desc: string;
  // Tree state
  activeNodeId?: string;
  completedNodes?: Record<string, number>; // id -> computed value
  memoState?: Record<number, number>; // n -> computed value
  isMemoHit?: boolean;
  // Tabulation state
  tableState?: (number | null)[];
  activeIndices?: number[];
  targetIndex?: number;
}

// --- Algorithmic Simulation Engines ---

const generateTreeSimulation = (targetN: number, isMemo: boolean) => {
  const nodes: TreeNode[] = [];
  const edges: TreeEdge[] = [];
  const steps: Step[] = [];
  
  const memoMap: Record<number, number> = {};
  const completedNodes: Record<string, number> = {};
  
  let idCounter = 0;
  let stepCounter = 0;

  // Recursive function to build tree structure and record simulation steps
  const traverse = (n: number, leftBound: number, rightBound: number, y: number, parent?: TreeNode): number => {
    const x = (leftBound + rightBound) / 2;
    const currentId = `node-${idCounter++}`;
    const node: TreeNode = { id: currentId, n, x, y, parentId: parent?.id };
    
    nodes.push(node);
    if (parent) {
      edges.push({ source: parent, target: node });
    }

    // Step: Calling function
    steps.push({
      stepIndex: stepCounter++,
      desc: `Call fib(${n})`,
      activeNodeId: currentId,
      completedNodes: { ...completedNodes },
      memoState: { ...memoMap }
    });

    // Check Memoization
    if (isMemo && memoMap[n] !== undefined) {
      node.isMemoHit = true;
      completedNodes[currentId] = memoMap[n];
      steps.push({
        stepIndex: stepCounter++,
        desc: `Memo hit! fib(${n}) is already computed as ${memoMap[n]}`,
        activeNodeId: currentId,
        completedNodes: { ...completedNodes },
        memoState: { ...memoMap },
        isMemoHit: true
      });
      return memoMap[n];
    }

    let result: number;

    if (n <= 1) {
      result = n;
      steps.push({
        stepIndex: stepCounter++,
        desc: `Base case reached: fib(${n}) = ${n}`,
        activeNodeId: currentId,
        completedNodes: { ...completedNodes },
        memoState: { ...memoMap }
      });
    } else {
      // Split the visual space for children
      const leftResult = traverse(n - 1, leftBound, x, y + 70, node);
      
      // Step: Back to current node after left child
      steps.push({
        stepIndex: stepCounter++,
        desc: `fib(${n-1}) returned ${leftResult}. Now calling fib(${n-2})`,
        activeNodeId: currentId,
        completedNodes: { ...completedNodes },
        memoState: { ...memoMap }
      });

      const rightResult = traverse(n - 2, x, rightBound, y + 70, node);
      result = leftResult + rightResult;
    }

    // Store results
    if (isMemo) memoMap[n] = result;
    completedNodes[currentId] = result;

    // Step: Returning result
    steps.push({
      stepIndex: stepCounter++,
      desc: `Return fib(${n}) = ${result}`,
      activeNodeId: currentId,
      completedNodes: { ...completedNodes },
      memoState: { ...memoMap }
    });

    return result;
  };

  traverse(targetN, 0, 1000, 40);

  return { nodes, edges, steps };
};

const generateTabulationSimulation = (targetN: number) => {
  const steps: Step[] = [];
  const table: (number | null)[] = Array(targetN + 1).fill(null);
  let stepCounter = 0;

  steps.push({
    stepIndex: stepCounter++,
    desc: `Initialize DP table of size ${targetN + 1}`,
    tableState: [...table],
    activeIndices: [],
  });

  table[0] = 0;
  steps.push({
    stepIndex: stepCounter++,
    desc: `Base case: DP[0] = 0`,
    tableState: [...table],
    activeIndices: [],
    targetIndex: 0
  });

  if (targetN >= 1) {
    table[1] = 1;
    steps.push({
      stepIndex: stepCounter++,
      desc: `Base case: DP[1] = 1`,
      tableState: [...table],
      activeIndices: [],
      targetIndex: 1
    });
  }

  for (let i = 2; i <= targetN; i++) {
    steps.push({
      stepIndex: stepCounter++,
      desc: `Computing DP[${i}] requires DP[${i-1}] and DP[${i-2}]`,
      tableState: [...table],
      activeIndices: [i-1, i-2],
      targetIndex: i
    });

    table[i] = table[i-1]! + table[i-2]!;
    
    steps.push({
      stepIndex: stepCounter++,
      desc: `Store DP[${i}] = ${table[i-1]} + ${table[i-2]} = ${table[i]}`,
      tableState: [...table],
      activeIndices: [],
      targetIndex: i
    });
  }

  steps.push({
    stepIndex: stepCounter++,
    desc: `Finished! The answer is DP[${targetN}] = ${table[targetN]}`,
    tableState: [...table],
    activeIndices: [],
    targetIndex: targetN
  });

  return { steps };
};


// --- React Component ---

export default function App() {
  // Config State
  const [n, setN] = useState<number>(5);
  const [mode, setMode] = useState<Mode>('naive');
  
  // Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(600); // ms per step

  // Derived Data (Memoized so we don't recalculate the whole tree on every render)
  const simulationData = useMemo(() => {
    if (mode === 'naive') return generateTreeSimulation(n, false);
    if (mode === 'memo') return generateTreeSimulation(n, true);
    return generateTabulationSimulation(n);
  }, [n, mode]);

  const steps = simulationData.steps;
  const currentStep = steps[currentStepIndex];
  const isDone = currentStepIndex === steps.length - 1;

  // Handle Playback
  useEffect(() => {
    let timer: number;
    if (isPlaying && !isDone) {
      timer = window.setTimeout(() => {
        setCurrentStepIndex(prev => prev + 1);
      }, speed);
    } else if (isDone && isPlaying) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, isDone, speed]);

  // Reset when config changes
  useEffect(() => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [n, mode]);

  const handleStepForward = () => {
    if (!isDone) setCurrentStepIndex(p => p + 1);
  };

  const handleReset = () => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };

  // Render Helpers
  const renderControls = () => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-6 items-center justify-between">
      {/* Parameter Selection */}
      <div className="flex flex-col gap-2 min-w-[200px]">
        <label className="text-sm font-semibold text-slate-700 flex justify-between">
          <span>Target N: <span className="text-blue-600">{n}</span></span>
          <span className="text-slate-400 font-normal">(Max 7)</span>
        </label>
        <input 
          type="range" 
          min="1" max="7" 
          value={n} 
          onChange={(e) => setN(parseInt(e.target.value))}
          className="w-full accent-blue-600 cursor-pointer"
        />
      </div>

      {/* Mode Selection */}
      <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
        {(['naive', 'memo', 'tabulation'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 text-sm font-medium rounded-md capitalize transition-all ${
              mode === m 
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Playback Controls */}
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <button 
            onClick={handleReset}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Reset"
          >
            <RotateCcw size={20} />
          </button>
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 rounded-lg transition-colors ${
              isPlaying ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
          </button>
          <button 
            onClick={handleStepForward}
            disabled={isPlaying || isDone}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Step Forward"
          >
            <StepForward size={20} />
          </button>
        </div>

        <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block"></div>

        <div className="flex flex-col gap-1 w-32 hidden sm:flex">
          <label className="text-xs font-medium text-slate-500 flex justify-between">
            Speed
            <span>{speed}ms</span>
          </label>
          <input 
            type="range" 
            min="100" max="1500" step="100"
            value={1600 - speed} // Reverse slider logic visually
            onChange={(e) => setSpeed(1600 - parseInt(e.target.value))}
            className="w-full accent-slate-400 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
          />
        </div>
      </div>
    </div>
  );

  const renderTreeViz = () => {
    // Only available if mode is naive or memo
    if (!('nodes' in simulationData)) return null;
    const { nodes, edges } = simulationData;
    const { activeNodeId, completedNodes = {}, isMemoHit } = currentStep || {};

    return (
      <div className="relative w-full h-[500px] bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-inner flex justify-center items-center">
        <svg viewBox="0 0 1000 500" className="w-full h-full preserve-3d">
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="22" refY="2" orient="auto">
              <polygon points="0 0, 6 2, 0 4" fill="#94A3B8" />
            </marker>
          </defs>
          
          {/* Edges */}
          {edges.map((edge, i) => {
            // Only draw edge if source node has been reached in simulation
            // We approximate this by checking if the source node ID is <= current active ID or if source is completed
            // A more exact way: checking if node exists in steps up to current
            const isVisible = parseInt(edge.source.id.split('-')[1]) <= (activeNodeId ? parseInt(activeNodeId.split('-')[1]) : 9999);
            
            if (!isVisible) return null;

            return (
              <line
                key={i}
                x1={edge.source.x} y1={edge.source.y}
                x2={edge.target.x} y2={edge.target.y}
                stroke="#CBD5E1"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
                className="transition-all duration-300 ease-in-out"
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isCompleted = completedNodes[node.id] !== undefined;
            const isActive = node.id === activeNodeId;
            const value = completedNodes[node.id];
            
            // Determine visibility: node id <= active node id
            const isVisible = parseInt(node.id.split('-')[1]) <= (activeNodeId ? parseInt(activeNodeId.split('-')[1]) : 9999);
            
            if (!isVisible) return null;

            let fillClass = "fill-white";
            let strokeClass = "stroke-slate-300";