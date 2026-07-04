import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Network, RefreshCw, Play, Settings2, BookOpen, ChevronRight, Hash, Layers,
  Pause, SkipForward, SkipBack, Plus, Trash2, Search, Dna, Swords, FastForward,
  ShieldAlert, CheckCircle, AlertTriangle, ArrowRight, Activity, ListTree,
  GitMerge, ShieldCheck, Zap, Info, CheckCircle2, Table, ArrowLeftRight, AlertCircle
} from 'lucide-react';

// --- Types & Interfaces ---

type TreeType = 'AVL' | 'Red-Black' | 'Treap';
type NodeColor = 'RED' | 'BLACK';
type TabType = 'hero' | 'simulator' | 'analysis' | 'theory';

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

interface BSTNode {
  id: string;
  val: number;
  left: BSTNode | null;
  right: BSTNode | null;
  height: number;
  color: NodeColor;
  priority: number;
}

interface LayoutNode extends BSTNode {
  x: number;
  y: number;
  px: number;
  py: number;
}

interface Edge {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// --- Constants ---

const TREE_OPTIONS: TreeOption[] = [
  {
    id: 'AVL',
    name: 'AVL Tree',
    tagline: 'Strictly Balanced',
    description: 'Maintains strict height balance. Lookups are extremely fast, but insertions may require more rotations.',
    invariant: '|Height(L) - Height(R)| ≤ 1',
    color: 'text-blue-400',
    bgColor: 'bg-blue-900/20',
    borderColor: 'border-blue-800 hover:border-blue-500',
  },
  {
    id: 'Red-Black',
    name: 'Red-Black Tree',
    tagline: 'Color-Coded Balance',
    description: 'Uses node colors to ensure the tree is approximately balanced. Guarantees O(log n) operations with fewer rotations than AVL.',
    invariant: 'Uniform Black-Height to all leaves',
    color: 'text-red-400',
    bgColor: 'bg-red-900/20',
    borderColor: 'border-red-800 hover:border-red-500',
  },
  {
    id: 'Treap',
    name: 'Treap',
    tagline: 'Tree + Heap',
    description: 'Combines BST ordering for keys and Heap ordering for randomly assigned priorities. Probabilistically balanced.',
    invariant: 'Priority(Parent) ≥ Priority(Child)',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-900/20',
    borderColor: 'border-emerald-800 hover:border-emerald-500',
  }
];

// --- Helper Functions ---

const generateId = () => Math.random().toString(36).substr(2, 9);

const updateHeights = (node: BSTNode | null): number => {
  if (!node) return 0;
  const leftH = updateHeights(node.left);
  const rightH = updateHeights(node.right);
  node.height = Math.max(leftH, rightH) + 1;
  return node.height;
};

const deepClone = (node: BSTNode | null): BSTNode | null => {
  if (!node) return null;
  return {
    ...node,
    left: deepClone(node.left),
    right: deepClone(node.right),
  };
};

// --- Main App Component ---

export default function App() {
  // Global State
  const [activeTab, setActiveTab] = useState<TabType>('hero');
  const [treeType, setTreeType] = useState<TreeType>('AVL');
  const [seed, setSeed] = useState<string>('42');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Simulator State
  const [root, setRoot] = useState<BSTNode | null>(null);
  const [inputValue, setInputValue] = useState<string>('');
  const [selectedVal, setSelectedVal] = useState<number | null>(null);
  const [actionLog, setActionLog] = useState<string[]>(['System initialized.']);
  const [challengeMode, setChallengeMode] = useState<boolean>(false);
  const [animationSpeed, setAnimationSpeed] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [nodeCount, setNodeCount] = useState<number>(15);
  
  // Analysis State
  const [challengeState, setChallengeState] = useState<'idle' | 'success' | 'error'>('idle');

  const logAction = (msg: string) => {
    setActionLog(prev => [msg, ...prev].slice(0, 8));
  };

  // --- Tree Operations ---

  const insertNode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = parseInt(inputValue, 10);
    if (isNaN(val)) {
      logAction('Error: Please enter a valid integer.');
      return;
    }
    
    let newRoot = deepClone(root);
    let maxDepthExceeded = false;

    const insert = (node: BSTNode | null, currentDepth: number): BSTNode | null => {
      if (currentDepth > 6) {
        maxDepthExceeded = true;
        return node;
      }
      if (!node) {
        return {
          id: generateId(),
          val,
          left: null,
          right: null,
          height: 1,
          color: 'RED',
          priority: Math.floor(Math.random() * 100),
        };
      }
      if (val < node.val) {
        node.left = insert(node.left, currentDepth + 1);
      } else if (val > node.val) {
        node.right = insert(node.right, currentDepth + 1);
      } else {
        logAction(`Value ${val} already exists.`);
      }
      return node;
    };

    newRoot = insert(newRoot, 1);
    
    if (maxDepthExceeded) {
      logAction('Maximum depth reached. Cannot insert deeper.');
      return;
    }

    updateHeights(newRoot);
    setRoot(newRoot);
    setInputValue('');
    setSelectedVal(val);
    logAction(`Inserted [${val}]. ${challengeMode ? 'Fix invariants manually!' : ''}`);
  };

  const deleteNode = () => {
    const val = parseInt(inputValue, 10) || selectedVal;
    if (val === null || isNaN(val)) return;
    
    let newRoot = deepClone(root);
    
    const remove = (node: BSTNode | null, v: number): BSTNode | null => {
      if (!node) return null;
      if (v < node.val) {
        node.left = remove(node.left, v);
      } else if (v > node.val) {
        node.right = remove(node.right, v);
      } else {
        if (!node.left) return node.right;
        if (!node.right) return node.left;
        
        let minNode = node.right;
        while (minNode.left) minNode = minNode.left;
        node.val = minNode.val;
        node.priority = minNode.priority;
        node.right = remove(node.right, minNode.val);
      }
      return node;
    };

    newRoot = remove(newRoot, val);
    updateHeights(newRoot);
    setRoot(newRoot);
    setSelectedVal(null);
    setInputValue('');
    logAction(`Deleted [${val}].`);
  };

  const findNode = () => {
    const val = parseInt(inputValue, 10);
    if (isNaN(val)) return;
    
    let curr = root;
    let found = false;
    while (curr) {
      if (val === curr.val) {
        found = true;
        break;
      }
      curr = val < curr.val ? curr.left : curr.right;
    }
    
    if (found) {
      setSelectedVal(val);
      logAction(`Found [${val}].`);
    } else {
      logAction(`[${val}] not found.`);
    }
    setInputValue('');
  };

  const applyRotation = (type: 'LEFT' | 'RIGHT') => {
    if (selectedVal === null) {
      logAction('Select a node to rotate.');
      return;
    }
    let newRoot = deepClone(root);
    let rotated = false;

    const rotate = (node: BSTNode | null): BSTNode | null => {
      if (!node) return null;
      
      if (node.val === selectedVal) {
        if (type === 'LEFT') {
          const r = node.right;
          if (!r) {
            logAction('Cannot rotate left: no right child.');
            return node;
          }
          node.right = r.left;
          r.left = node;
          rotated = true;
          return r;
        } else {
          const l = node.left;
          if (!l) {
            logAction('Cannot rotate right: no left child.');
            return node;
          }
          node.left = l.right;
          l.right = node;
          rotated = true;
          return l;
        }
      }
      
      node.left = rotate(node.left);
      node.right = rotate(node.right);
      return node;
    };

    newRoot = rotate(newRoot);
    if (rotated) {
      updateHeights(newRoot);
      setRoot(newRoot);
      logAction(`Performed ${type} rotation on [${selectedVal}].`);
    }
  };

  const toggleColor = () => {
    if (selectedVal === null || treeType !== 'Red-Black') return;
    let newRoot = deepClone(root);
    
    const toggle = (node: BSTNode | null) => {
      if (!node) return;
      if (node.val === selectedVal) {
        node.color = node.color === 'RED' ? 'BLACK' : 'RED';
      }
      toggle(node.left);
      toggle(node.right);
    };
    
    toggle(newRoot);
    setRoot(newRoot);
    logAction(`Toggled color of [${selectedVal}].`);
  };

  const clearTree = () => {
    setRoot(null);
    setSelectedVal(null);
    logAction('Tree cleared.');
  };

  const handleGenerateSeed = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setSeed(Math.floor(Math.random() * 10000).toString());
      setIsGenerating(false);
      logAction('Generated new random seed.');
    }, 300);
  };

  const handleGenerateTree = () => {
    clearTree();
    // Simple pseudo-random generation based on seed and nodeCount
    let currentSeed = parseInt(seed, 10) || 42;
    const random = () => {
      const x = Math.sin(currentSeed++) * 10000;
      return x - Math.floor(x);
    };

    let newRoot: BSTNode | null = null;
    const insert = (node: BSTNode | null, val: number, depth: number): BSTNode | null => {
      if (depth > 5) return node;
      if (!node) return { id: generateId(), val, left: null, right: null, height: 1, color: 'RED', priority: Math.floor(random() * 100) };
      if (val < node.val) node.left = insert(node.left, val, depth + 1);
      else if (val > node.val) node.right = insert(node.right, val, depth + 1);
      return node;
    };

    for (let i = 0; i < nodeCount; i++) {
      newRoot = insert(newRoot, Math.floor(random() * 100), 1);
    }
    
    if (treeType === 'Red-Black' && newRoot) {
      newRoot.color = 'BLACK';
    }
    
    updateHeights(newRoot);
    setRoot(newRoot);
    logAction(`Generated ${treeType} tree with ~${nodeCount} nodes.`);
  };

  // --- Layout & Traversals ---

  const { layoutNodes, edges } = useMemo(() => {
    const nodes: LayoutNode[] = [];
    const edgs: Edge[] = [];
    
    const traverse = (node: BSTNode | null, x: number, y: number, offset: number, px: number, py: number) => {
      if (!node) return;
      nodes.push({ ...node, x, y, px, py });
      if (node.left) {
        edgs.push({ id: `${node.id}-L`, x1: x, y1: y, x2: x - offset, y2: y + 60 });
        traverse(node.left, x - offset, y + 60, offset / 2, x, y);
      }
      if (node.right) {
        edgs.push({ id: `${node.id}-R`, x1: x, y1: y, x2: x + offset, y2: y + 60 });
        traverse(node.right, x + offset, y + 60, offset / 2, x, y);
      }
    };

    traverse(root, 400, 40, 160, 400, 40);
    return { layoutNodes: nodes, edges: edgs };
  }, [root]);

  const traversals = useMemo(() => {
    const inOrder: number[] = [];
    const preOrder: number[] = [];
    const postOrder: number[] = [];
    
    const traverse = (node: BSTNode | null) => {
      if (!node) return;
      preOrder.push(node.val);
      traverse(node.left);
      inOrder.push(node.val);
      traverse(node.right);
      postOrder.push(node.val);
    };
    
    traverse(root);
    return { inOrder, preOrder, postOrder };
  }, [root]);

  // --- Invariants Checking ---

  const invariants = useMemo(() => {
    const issues: string[] = [];
    let isValid = true;

    if (!root) return { isValid: true, issues: ['Tree is empty.'] };

    if (treeType === 'AVL') {
      const checkAVL = (node: BSTNode | null): number => {
        if (!node) return 0;
        const lh = checkAVL(node.left);
        const rh = checkAVL(node.right);
        if (Math.abs(lh - rh) > 1) {
          isValid = false;
          issues.push(`Node ${node.val} is unbalanced (BF: ${lh - rh}).`);
        }
        return Math.max(lh, rh) + 1;
      };
      checkAVL(root);
      if (isValid) issues.push('All AVL balance factors are valid (-1, 0, 1).');
    } 
    else if (treeType === 'Red-Black') {
      if (root.color === 'RED') {
        isValid = false;
        issues.push('Root must be BLACK.');
      }
      
      let targetBlackHeight = -1;
      
      const checkRB = (node: BSTNode | null, currentBlackHeight: number) => {
        if (!node) {
          if (targetBlackHeight === -1) targetBlackHeight = currentBlackHeight + 1;
          else if (targetBlackHeight !== currentBlackHeight + 1) {
            isValid = false;
            if (!issues.includes('Paths have different black-heights.')) {
              issues.push('Paths have different black-heights.');
            }
          }
          return;
        }
        
        if (node.color === 'RED') {
          if ((node.left && node.left.color === 'RED') || (node.right && node.right.color === 'RED')) {
            isValid = false;
            issues.push(`Red violation at node ${node.val} (Red node has Red child).`);
          }
        }
        
        const nextBH = currentBlackHeight + (node.color === 'BLACK' ? 1 : 0);
        checkRB(node.left, nextBH);
        checkRB(node.right, nextBH);
      };
      
      checkRB(root, 0);
      if (isValid) issues.push('All Red-Black properties satisfied.');
    }
    else if (treeType === 'Treap') {
      const checkTreap = (node: BSTNode | null) => {
        if (!node) return;
        if (node.left && node.left.priority > node.priority) {
          isValid = false;
          issues.push(`Heap violation: ${node.left.val} (${node.left.priority}) > parent ${node.val} (${node.priority}).`);
        }
        if (node.right && node.right.priority > node.priority) {
          isValid = false;
          issues.push(`Heap violation: ${node.right.val} (${node.right.priority}) > parent ${node.val} (${node.priority}).`);
        }
        checkTreap(node.left);
        checkTreap(node.right);
      };
      checkTreap(root);
      if (isValid) issues.push('Max-Heap priority property satisfied.');
    }

    return { isValid, issues };
  }, [root, treeType]);

  // --- Render Helpers ---

  const getNodeClasses = (node: LayoutNode) => {
    const isSelected = node.val === selectedVal;
    let base = 'transition-all duration-300 ease-in-out cursor-pointer ';
    
    if (treeType === 'AVL') {
      base += 'fill-slate-800 stroke-blue-500 stroke-2 ';
      if (isSelected) base += 'fill-blue-900 stroke-blue-400 stroke-[3px]';
    } else if (treeType === 'Red-Black') {
      if (node.color === 'RED') {
        base += 'fill-red-900 stroke-red-500 stroke-2 ';
        if (isSelected) base += 'fill-red-800 stroke-red-400 stroke-[3px]';
      } else {
        base += 'fill-slate-900 stroke-slate-500 stroke-2 ';
        if (isSelected) base += 'fill-slate-800 stroke-slate-400 stroke-[3px]';
      }
    } else if (treeType === 'Treap') {
      base += 'fill-slate-800 stroke-emerald-500 stroke-2 ';
      if (isSelected) base += 'fill-emerald-900 stroke-emerald-400 stroke-[3px]';
    }
    
    return base;
  };

  const getNodeMeta = (node: LayoutNode) => {
    if (treeType === 'AVL') {
      const lh = node.left?.height || 0;
      const rh = node.right?.height || 0;
      const bf = lh - rh;
      return `BF:${bf > 0 ? '+' : ''}${bf}`;
    }
    if (treeType === 'Treap') return `P:${node.priority}`;
    return '';
  };

  // --- Sub-Renders ---

  const renderHero = () => (
    <div className="max-w-6xl mx-auto px-6 py-12 lg:py-20 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
        <div className="flex flex-col space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-100 leading-tight">
              Master Tree Rotations & <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">
                Structural Invariants
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-xl leading-relaxed">
              An interactive, systems-aware environment to visualize, step through, and debug self-balancing binary search trees. Choose your structure and initialize the studio.
            </p>
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl p-6 space-y-8">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-500" />
                Select Architecture
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {TREE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => { setTreeType(option.id); clearTree(); }}
                    className={`relative text-left p-4 rounded-xl border-2 transition-all duration-200 flex flex-col gap-1
                      ${treeType === option.id 
                        ? `${option.borderColor} ${option.bgColor} shadow-sm` 
                        : 'border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-800'
                      }`}
                  >
                    <span className={`font-bold text-sm ${treeType === option.id ? option.color : 'text-slate-300'}`}>
                      {option.name}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {option.tagline}
                    </span>
                    {treeType === option.id && (
                      <div className={`absolute top-3 right-3 w-2 h-2 rounded-full bg-current ${option.color}`} />
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-4 p-4 rounded-lg bg-slate-950 border border-slate-800 text-sm">
                <p className="text-slate-400 mb-2">
                  {TREE_OPTIONS.find(t => t.id === treeType)?.description}
                </p>
                <div className="flex items-center gap-2 font-mono text-xs text-slate-300 bg-slate-900 px-3 py-2 rounded border border-slate-800 w-fit">
                  <span className="text-indigo-400 font-bold">Invariant:</span>
                  {TREE_OPTIONS.find(t => t.id === treeType)?.invariant}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Hash className="w-4 h-4 text-slate-500" />
                Dataset Seed
              </h3>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-500 font-mono text-sm">seed_</span>
                  </div>
                  <input
                    type="text"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    className="block w-full pl-14 pr-3 py-3 border border-slate-700 rounded-xl text-slate-100 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-slate-950"
                    placeholder="Enter numeric seed..."
                  />
                </div>
                <button
                  onClick={handleGenerateSeed}
                  className="px-4 py-3 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center focus:ring-2 focus:ring-indigo-500"
                  title="Generate Random Seed"
                >
                  <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin text-indigo-400' : ''}`} />
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => { handleGenerateTree(); setActiveTab('simulator'); }}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-4 rounded-xl font-semibold text-lg transition-all transform active:scale-[0.98] shadow-md"
              >
                <Play className="w-5 h-5 fill-current" />
                Initialize Studio
                <ChevronRight className="w-5 h-5 opacity-70" />
              </button>
            </div>
          </div>
        </div>

        <div className="relative hidden lg:flex flex-col items-center justify-center bg-slate-900/50 rounded-3xl border border-slate-800 p-8 h-full min-h-[500px] overflow-hidden">
          <div className="absolute inset-0 opacity-[0.1] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-center text-slate-500">
            <Network className="w-32 h-32 mb-6 opacity-20" />
            <p className="font-mono text-sm">Awaiting Initialization...</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSimulator = () => (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      {/* Top Controls */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <form onSubmit={insertNode} className="flex gap-2">
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Key..."
              className="w-24 px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-100 font-mono"
            />
            <button type="submit" className="px-3 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-600/30 transition-colors flex items-center gap-1 text-sm font-medium">
              <Plus className="w-4 h-4" /> Insert
            </button>
          </form>
          <button onClick={deleteNode} className="px-3 py-2 bg-rose-600/20 text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-600/30 transition-colors flex items-center gap-1 text-sm font-medium">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
          <button onClick={findNode} className="px-3 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-colors flex items-center gap-1 text-sm font-medium">
            <Search className="w-4 h-4" /> Find
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => applyRotation('LEFT')} className="px-3 py-2 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium">
            Rot L
          </button>
          <button onClick={() => applyRotation('RIGHT')} className="px-3 py-2 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium">
            Rot R
          </button>
          {treeType === 'Red-Black' && (
            <button onClick={toggleColor} className="px-3 py-2 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium">
              Toggle Color
            </button>
          )}
          <button onClick={clearTree} className="px-3 py-2 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium ml-4">
            Clear
          </button>
        </div>
      </div>

      {/* Main Visualization Area */}
      <div className="flex-1 relative overflow-hidden bg-slate-950 flex flex-col">
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        
        <div className="flex-1 overflow-auto flex items-center justify-center p-8">
          {root ? (
            <svg viewBox="0 0 800 500" className="w-full h-full min-w-[600px] min-h-[400px] drop-shadow-lg">
              <g className="stroke-slate-600" strokeWidth="2" strokeLinecap="round">
                {edges.map(edge => (
                  <line key={edge.id} x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2} className="transition-all duration-300" />
                ))}
              </g>
              <g className="font-mono text-xs font-bold" textAnchor="middle" dominantBaseline="central">
                {layoutNodes.map(node => (
                  <g key={node.id} transform={`translate(${node.x}, ${node.y})`} onClick={() => setSelectedVal(node.val)} className="cursor-pointer">
                    <circle r="16" className={getNodeClasses(node)} />
                    <text className="fill-slate-100 pointer-events-none">{node.val}</text>
                    <text y="24" className="fill-slate-500 text-[9px] pointer-events-none">{getNodeMeta(node)}</text>
                  </g>
                ))}
              </g>
            </svg>
          ) : (
            <div className="text-slate-600 font-mono text-sm flex flex-col items-center gap-4">
              <Network className="w-12 h-12 opacity-50" />
              Tree is empty. Insert nodes to begin.
            </div>
          )}
        </div>

        {/* Bottom Panel: Logs & Challenge */}
        <div className="h-48 bg-slate-900 border-t border-slate-800 flex shrink-0">
          <div className="flex-1 p-4 border-r border-slate-800 flex flex-col">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Action Log
            </h3>
            <div className="flex-1 overflow-y-auto space-y-1 font-mono text-xs">
              {actionLog.map((log, i) => (
                <div key={i} className={`${i === 0 ? 'text-indigo-400' : 'text-slate-500'}`}>
                  &gt; {log}
                </div>
              ))}
            </div>
          </div>
          <div className="w-80 p-4 flex flex-col gap-4">
            <div 
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-center flex-1 ${
                challengeMode 
                  ? 'bg-amber-900/20 border-amber-700 text-amber-200' 
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
              onClick={() => {
                setChallengeMode(!challengeMode);
                logAction(`Challenge mode ${!challengeMode ? 'enabled' : 'disabled'}.`);
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Swords className={`w-4 h-4 ${challengeMode ? 'text-amber-500' : 'text-slate-500'}`} />
                  Challenge Mode
                </div>
                <div className={`w-8 h-5 rounded-full p-1 transition-colors ${challengeMode ? 'bg-amber-600' : 'bg-slate-700'}`}>
                  <div className={`w-3 h-3 rounded-full bg-white transition-transform ${challengeMode ? 'translate-x-3' : 'translate-x-0'}`} />
                </div>
              </div>
              <p className="text-[10px] opacity-80 leading-tight">
                {challengeMode 
                  ? "Fix broken trees manually by selecting nodes and applying rotations." 
                  : "Enable to test your knowledge of tree invariants and rotations."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalysis = () => {
    const analysisMetrics = [
      { label: 'Tree Type', value: treeType, status: 'info' },
      { label: 'Total Nodes', value: traversals.inOrder.length.toString(), status: 'info' },
      { label: 'Invariant Status', value: invariants.isValid ? 'Valid' : 'Violated', status: invariants.isValid ? 'ok' : 'error' },
    ];

    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6 animate-in fade-in duration-500">
        <header className="flex items-center justify-between bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
              <Activity className="w-6 h-6 text-indigo-500" />
              Analysis & Output
            </h1>
            <p className="text-sm text-slate-400 mt-1">Real-time invariant tracking and traversal generation.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <section className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-500" />
                <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">Invariant Status</h2>
              </div>
              <div className="p-4 space-y-4 flex-1">
                <div className="grid grid-cols-1 gap-3">
                  {analysisMetrics.map((metric, idx) => (
                    <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <div className="text-xs text-slate-500 mb-1">{metric.label}</div>
                      <div className={`font-mono text-lg font-semibold ${
                        metric.status === 'ok' ? 'text-emerald-500' : 
                        metric.status === 'error' ? 'text-rose-500' : 'text-indigo-400'
                      }`}>
                        {metric.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Verification Logs</h3>
                  <div className="bg-slate-950 rounded-lg p-3 font-mono text-xs text-slate-400 space-y-1.5 h-48 overflow-y-auto border border-slate-800">
                    {invariants.issues.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-slate-600">{`[${(idx + 1).toString().padStart(2, '0')}]`}</span>
                        <span className={invariants.isValid ? 'text-emerald-400' : 'text-rose-400'}>{log}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="lg:col-span-2 space-y-6 flex flex-col">
            <section className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
              <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center gap-2">
                <ListTree className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">Live Traversals</h2>
              </div>
              <div className="p-5 space-y-5">
                {[
                  { label: 'In-Order', data: traversals.inOrder, desc: 'Sorted keys' },
                  { label: 'Pre-Order', data: traversals.preOrder, desc: 'Root, Left, Right' },
                  { label: 'Post-Order', data: traversals.postOrder, desc: 'Left, Right, Root' }
                ].map((trav, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="w-28 shrink-0">
                      <div className="text-sm font-semibold text-slate-300">{trav.label}</div>
                      <div className="text-xs text-slate-500">{trav.desc}</div>
                    </div>
                    <div className="flex-1 flex flex-wrap gap-1.5 bg-slate-950 p-2 rounded-lg border border-slate-800 min-h-[44px]">
                      {trav.data.length === 0 && <span className="text-slate-600 text-sm italic p-1">Empty</span>}
                      {trav.data.map((key, kIdx) => (
                        <React.Fragment key={kIdx}>
                          <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 bg-slate-800 border border-slate-700 rounded text-sm font-mono text-slate-200 shadow-sm">
                            {key}
                          </span>
                          {kIdx < trav.data.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-slate-600 self-center" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden flex-1 flex flex-col">
              <div className="bg-indigo-900/20 px-4 py-3 border-b border-indigo-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-indigo-400" />
                  <h2 className="text-sm font-semibold text-indigo-300 tracking-wide uppercase">Challenge Mode: Fix the Tree</h2>
                </div>
                <span className="text-xs font-medium bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-800">
                  {treeType}
                </span>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <div className="bg-rose-900/20 border border-rose-900/50 rounded-lg p-4 mb-5 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-rose-300 mb-1">Scenario Simulation</h3>
                    <p className="text-sm text-rose-400/80 leading-relaxed">
                      Assume an insertion caused a violation. Select the correct operation sequence to restore invariants.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 flex-1">
                  <p className="text-sm font-medium text-slate-400 mb-3">Select the correct operation sequence:</p>
                  {['Right Rotate (Parent)', 'Left Rotate (Child)', 'Right-Left Rotate', 'Color Flip (Parent, Uncle)'].map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setChallengeState(idx === 2 ? 'success' : 'error')}
                      className="w-full text-left px-4 py-3 rounded-lg border text-sm font-mono transition-all bg-slate-950 border-slate-800 text-slate-300 hover:border-indigo-700 hover:bg-indigo-900/20"
                    >
                      <span className="inline-block w-6 text-slate-600 font-sans text-xs">{String.fromCharCode(65 + idx)}.</span>
                      {opt}
                    </button>
                  ))}
                </div>

                <div className="mt-5 h-12 flex items-center">
                  {challengeState === 'success' && (
                    <div className="flex items-center gap-2 text-emerald-400 bg-emerald-900/20 px-4 py-2 rounded-lg border border-emerald-900/50 w-full">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Correct! The invariants are restored.</span>
                      <button onClick={() => setChallengeState('idle')} className="ml-auto text-xs underline hover:text-emerald-300">Reset</button>
                    </div>
                  )}
                  {challengeState === 'error' && (
                    <div className="flex items-center gap-2 text-rose-400 bg-rose-900/20 px-4 py-2 rounded-lg border border-rose-900/50 w-full">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="text-sm font-medium">Incorrect operation. Try again.</span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  };

  const renderTheory = () => (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-indigo-500" />
          Theory & Reference
        </h1>
        <p className="text-slate-400 mt-2">Understand the mathematical foundations of self-balancing trees.</p>
      </header>

      <div className="bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-800 shadow-sm overflow-x-auto">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div>
            <h4 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <ArrowLeftRight className="w-6 h-6 text-indigo-500" />
              Core Concept: Tree Rotation
            </h4>
            <p className="text-slate-400 mt-1 text-sm">
              The fundamental operation used by AVL, Red-Black, and Treaps to maintain balance.
            </p>
          </div>
          <div className="bg-indigo-900/30 text-indigo-400 px-4 py-2 rounded-lg text-sm font-medium border border-indigo-800">
            O(1) Time Complexity
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-8">
          {/* Left Tree */}
          <svg width="160" height="160" viewBox="0 0 160 160" className="overflow-visible">
            <g className="stroke-slate-600" strokeWidth="2">
              <line x1="80" y1="30" x2="40" y2="80" />
              <line x1="80" y1="30" x2="120" y2="80" />
              <line x1="120" y1="80" x2="100" y2="130" />
              <line x1="120" y1="80" x2="140" y2="130" />
            </g>
            <g className="font-mono text-sm font-bold fill-slate-100" textAnchor="middle" dominantBaseline="central">
              <circle cx="80" cy="30" r="16" className="fill-slate-800 stroke-slate-500 stroke-2" />
              <text x="80" y="30">X</text>
              
              <circle cx="40" cy="80" r="14" className="fill-slate-900 stroke-slate-700 stroke-2 stroke-dasharray-4" />
              <text x="40" y="80" className="fill-slate-500 text-xs">A</text>
              
              <circle cx="120" cy="80" r="16" className="fill-slate-800 stroke-slate-500 stroke-2" />
              <text x="120" y="80">Y</text>
              
              <circle cx="100" cy="130" r="14" className="fill-slate-900 stroke-slate-700 stroke-2 stroke-dasharray-4" />
              <text x="100" y="130" className="fill-slate-500 text-xs">B</text>
              
              <circle cx="140" cy="130" r="14" className="fill-slate-900 stroke-slate-700 stroke-2 stroke-dasharray-4" />
              <text x="140" y="130" className="fill-slate-500 text-xs">C</text>
            </g>
          </svg>

          {/* Arrows */}
          <div className="flex flex-col items-center gap-2 text-slate-500 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span>Left Rot (X)</span>
              <ArrowRight className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4 rotate-180" />
              <span>Right Rot (Y)</span>
            </div>
          </div>

          {/* Right Tree */}
          <svg width="160" height="160" viewBox="0 0 160 160" className="overflow-visible">
            <g className="stroke-slate-600" strokeWidth="2">
              <line x1="80" y1="30" x2="40" y2="80" />
              <line x1="80" y1="30" x2="120" y2="80" />
              <line x1="40" y1="80" x2="20" y2="130" />
              <line x1="40" y1="80" x2="60" y2="130" />
            </g>
            <g className="font-mono text-sm font-bold fill-slate-100" textAnchor="middle" dominantBaseline="central">
              <circle cx="80" cy="30" r="16" className="fill-slate-800 stroke-slate-500 stroke-2" />
              <text x="80" y="30">Y</text>
              
              <circle cx="40" cy="80" r="16" className="fill-slate-800 stroke-slate-500 stroke-2" />
              <text x="40" y="80">X</text>
              
              <circle cx="120" cy="80" r="14" className="fill-slate-900 stroke-slate-700 stroke-2 stroke-dasharray-4" />
              <text x="120" y="80" className="fill-slate-500 text-xs">C</text>
              
              <circle cx="20" cy="130" r="14" className="fill-slate-900 stroke-slate-700 stroke-2 stroke-dasharray-4" />
              <text x="20" y="130" className="fill-slate-500 text-xs">A</text>
              
              <circle cx="60" cy="130" r="14" className="fill-slate-900 stroke-slate-700 stroke-2 stroke-dasharray-4" />
              <text x="60" y="130" className="fill-slate-500 text-xs">B</text>
            </g>
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TREE_OPTIONS.map(opt => (
          <div key={opt.id} className="bg-slate-900 p-6 rounded-xl border border-slate-800">
            <h3 className={`text-lg font-bold mb-2 ${opt.color}`}>{opt.name}</h3>
            <p className="text-sm text-slate-400 mb-4">{opt.description}</p>
            <div className="bg-slate-950 p-3 rounded border border-slate-800 font-mono text-xs text-slate-300">
              <span className="text-slate-500 block mb-1">Invariant:</span>
              {opt.invariant}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // --- Main Layout ---

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden selection:bg-indigo-500/30">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-20">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white mr-3 shadow-lg shadow-indigo-900/20">
            <Network className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">BST Studio</span>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2">
          {[
            { id: 'hero', label: 'Introduction', icon: Info },
            { id: 'simulator', label: 'Simulator', icon: Play },
            { id: 'analysis', label: 'Analysis', icon: Activity },
            { id: 'theory', label: 'Theory', icon: BookOpen }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-indigo-200' : 'text-slate-500'}`} />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <div className="text-xs font-mono text-slate-400">
              <div>Active: <span className="text-slate-200">{treeType}</span></div>
              <div>Nodes: <span className="text-slate-200">{traversals.inOrder.length}</span></div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative">
        {activeTab === 'hero' && renderHero()}
        {activeTab === 'simulator' && renderSimulator()}
        {activeTab === 'analysis' && renderAnalysis()}
        {activeTab === 'theory' && renderTheory()}
      </main>
    </div>
  );
}