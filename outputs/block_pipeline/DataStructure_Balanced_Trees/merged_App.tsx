import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Network, RefreshCw, Play, Settings2, BookOpen, ChevronRight, Hash, Layers,
  Pause, SkipForward, SkipBack, Plus, Trash2, Search, Dna, Swords, FastForward,
  ShieldAlert, CheckCircle, AlertTriangle, ArrowRight, Activity, ListTree
} from 'lucide-react';

// --- Types & Interfaces ---

type TreeType = 'AVL' | 'Red-Black' | 'Treap';
type NodeColor = 'RED' | 'BLACK';

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
  const [activeTab, setActiveTab] = useState<'hero' | 'visualizer' | 'controls' | 'analysis' | 'theory'>('hero');
  
  // Shared State
  const [treeType, setTreeType] = useState<TreeType>('AVL');
  const [seed, setSeed] = useState<string>('42');
  const [root, setRoot] = useState<BSTNode | null>(null);
  const [selectedVal, setSelectedVal] = useState<number | null>(null);
  const [actionLog, setActionLog] = useState<string[]>(['System initialized.']);
  const [challengeMode, setChallengeMode] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [animationSpeed, setAnimationSpeed] = useState<number>(1);
  // Hoisted from render functions to fix React Error #310 (hooks in nested functions)
  const [inputValViz, setInputValViz] = useState('');
  const [inputValControls, setInputValControls] = useState('');
  const [challengeState, setChallengeState] = useState<'idle' | 'success' | 'error'>('idle');
  const [theoryTab, setTheoryTab] = useState<'avl' | 'rbt' | 'treap' | 'rotations'>('avl');

  const logAction = (msg: string) => {
    setActionLog(prev => [msg, ...prev].slice(0, 8));
  };

  // --- Tree Operations ---

  const insertNode = (val: number) => {
    let newRoot = deepClone(root);
    let maxDepthExceeded = false;

    const insert = (node: BSTNode | null, currentDepth: number): BSTNode | null => {
      if (currentDepth > 5) {
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
      }
      return node;
    };

    newRoot = insert(newRoot, 1);
    
    if (maxDepthExceeded) {
      logAction(`Failed to insert ${val}: Max depth reached.`);
      return;
    }

    updateHeights(newRoot);
    setRoot(newRoot);
    setSelectedVal(val);
    logAction(`Inserted ${val} into ${treeType}.`);
  };

  const deleteNode = (val: number) => {
    let newRoot = deepClone(root);
    let deleted = false;
    
    const remove = (node: BSTNode | null, target: number): BSTNode | null => {
      if (!node) return null;
      if (target < node.val) {
        node.left = remove(node.left, target);
      } else if (target > node.val) {
        node.right = remove(node.right, target);
      } else {
        deleted = true;
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
    if (deleted) {
      updateHeights(newRoot);
      setRoot(newRoot);
      setSelectedVal(null);
      logAction(`Deleted ${val} from ${treeType}.`);
    } else {
      logAction(`Value ${val} not found.`);
    }
  };

  const applyRotation = (type: 'LEFT' | 'RIGHT', val: number) => {
    let newRoot = deepClone(root);
    let rotated = false;

    const rotate = (node: BSTNode | null): BSTNode | null => {
      if (!node) return null;
      
      if (node.val === val) {
        if (type === 'LEFT') {
          const r = node.right;
          if (!r) return node;
          node.right = r.left;
          r.left = node;
          rotated = true;
          return r;
        } else {
          const l = node.left;
          if (!l) return node;
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
      logAction(`Performed ${type} rotation on ${val}.`);
    }
  };

  const clearTree = () => {
    setRoot(null);
    setSelectedVal(null);
    logAction('Tree cleared.');
  };

  // --- Layout & Traversals ---

  const { layoutNodes, edges } = useMemo(() => {
    const nodes: LayoutNode[] = [];
    const edgs: Edge[] = [];
    
    const traverse = (node: BSTNode | null, x: number, y: number, offset: number, px: number, py: number) => {
      if (!node) return;
      nodes.push({ ...node, x, y, px, py });
      if (node.left) {
        edgs.push({ id: `${node.id}-L`, x1: x, y1: y, x2: x - offset, y2: y + 70 });
        traverse(node.left, x - offset, y + 70, offset / 2, x, y);
      }
      if (node.right) {
        edgs.push({ id: `${node.id}-R`, x1: x, y1: y, x2: x + offset, y2: y + 70 });
        traverse(node.right, x + offset, y + 70, offset / 2, x, y);
      }
    };

    traverse(root, 400, 40, 180, 400, 40);
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

  // Hoisted from renderAnalysis to fix hooks violation
  const analysis = useMemo(() => {
    if (!root) return { valid: true, metrics: [{ label: 'Status', value: 'Empty', status: 'info' }], logs: ['Tree is empty.'] };
    return {
      valid: invariants.isValid,
      metrics: [
        { label: 'Total Nodes', value: traversals.inOrder.length.toString(), status: 'info' },
        { label: 'Root Value', value: root.val.toString(), status: 'info' },
        { label: 'Invariant Status', value: invariants.isValid ? 'Valid' : 'Violated', status: invariants.isValid ? 'ok' : 'error' },
      ],
      logs: invariants.issues
    };
  }, [root, invariants, traversals]);

  const challengeData = useMemo(() => {
    switch (treeType) {
      case 'AVL': return { scenario: 'Insertion caused Right-Heavy (BF = -2). Child is Left-Heavy (BF = +1).', options: ['Right Rotate', 'Left Rotate', 'Right-Left Rotate', 'Left-Right Rotate'], correct: 2 };
      case 'Red-Black': return { scenario: 'Insertion of RED child to RED parent. Uncle is RED.', options: ['Left Rotate', 'Right Rotate', 'Color Flip', 'Left-Right Rotate'], correct: 2 };
      case 'Treap': return { scenario: 'Inserted node priority is less than parent.', options: ['Left Rotate then Left Rotate', 'Right Rotate then Right Rotate', 'Rotate to restore Heap property'], correct: 2 };
    }
  }, [treeType]);

  // --- Render Views ---

  const renderHero = () => (
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
        <div className="flex flex-col space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
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
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
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
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
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
                    className="block w-full pl-14 pr-3 py-3 border border-slate-700 rounded-xl text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-slate-950"
                    placeholder="Enter numeric seed..."
                  />
                </div>
                <button
                  onClick={() => setSeed(Math.floor(Math.random() * 10000).toString())}
                  className="px-4 py-3 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setActiveTab('visualizer')}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-4 rounded-xl font-semibold text-lg transition-all shadow-md"
              >
                <Play className="w-5 h-5 fill-current" />
                Initialize Studio
                <ChevronRight className="w-5 h-5 opacity-70" />
              </button>
            </div>
          </div>
        </div>

        <div className="relative hidden lg:flex flex-col items-center justify-center bg-slate-900/50 rounded-3xl border border-slate-800 p-8 h-full min-h-[500px] overflow-hidden">
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="relative z-10 w-full flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
              </div>
              <div className="font-mono text-xs text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                preview_render.svg
              </div>
            </div>
            <div className="flex-1 bg-slate-950 rounded-2xl shadow-inner border border-slate-800 flex items-center justify-center overflow-hidden relative">
              <svg viewBox="0 0 200 160" className="w-full h-full max-w-md drop-shadow-md">
                <g className="stroke-slate-700" strokeWidth="2" strokeLinecap="round">
                  <line x1="100" y1="20" x2="50" y2="60" />
                  <line x1="100" y1="20" x2="150" y2="60" />
                  <line x1="50" y1="60" x2="25" y2="110" />
                  <line x1="50" y1="60" x2="75" y2="110" />
                  <line x1="150" y1="60" x2="125" y2="110" />
                  <line x1="150" y1="60" x2="175" y2="110" />
                </g>
                <g className="font-mono text-[10px] font-bold" textAnchor="middle" dominantBaseline="central">
                  <circle cx="100" cy="20" r="14" className={treeType === 'Red-Black' ? 'fill-slate-800' : 'fill-slate-900 stroke-slate-600 stroke-2'} />
                  <text x="100" y="20" className="fill-slate-200">42</text>
                  <circle cx="50" cy="60" r="14" className={treeType === 'Red-Black' ? 'fill-red-600' : 'fill-slate-900 stroke-slate-600 stroke-2'} />
                  <text x="50" y="60" className="fill-slate-200">17</text>
                  <circle cx="150" cy="60" r="14" className={treeType === 'Red-Black' ? 'fill-slate-800' : 'fill-slate-900 stroke-slate-600 stroke-2'} />
                  <text x="150" y="60" className="fill-slate-200">64</text>
                  <circle cx="25" cy="110" r="14" className={treeType === 'Red-Black' ? 'fill-slate-800' : 'fill-slate-900 stroke-slate-600 stroke-2'} />
                  <text x="25" y="110" className="fill-slate-200">12</text>
                  <circle cx="75" cy="110" r="14" className={treeType === 'Red-Black' ? 'fill-slate-800' : 'fill-slate-900 stroke-slate-600 stroke-2'} />
                  <text x="75" y="110" className="fill-slate-200">23</text>
                  <circle cx="125" cy="110" r="14" className={treeType === 'Red-Black' ? 'fill-red-600' : 'fill-slate-900 stroke-slate-600 stroke-2'} />
                  <text x="125" y="110" className="fill-slate-200">50</text>
                  <circle cx="175" cy="110" r="14" className={treeType === 'Red-Black' ? 'fill-slate-800' : 'fill-slate-900 stroke-slate-600 stroke-2'} />
                  <text x="175" y="110" className="fill-slate-200">89</text>
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderVisualizer = () => {
    const inputVal = inputValViz;
    const setInputVal = setInputValViz;

    const handleInsert = (e: React.FormEvent) => {
      e.preventDefault();
      const val = parseInt(inputVal, 10);
      if (!isNaN(val)) insertNode(val);
      setInputVal('');
    };

    const getNodeClasses = (node: LayoutNode) => {
      const isSelected = node.val === selectedVal;
      let base = 'transition-all duration-500 ease-in-out cursor-pointer ';
      if (treeType === 'AVL') {
        base += 'fill-blue-900/30 stroke-blue-500 stroke-2 ';
        if (isSelected) base += 'fill-blue-800 stroke-blue-400 stroke-[3px]';
      } else if (treeType === 'Red-Black') {
        if (node.color === 'RED') {
          base += 'fill-red-600 stroke-red-800 stroke-2 ';
          if (isSelected) base += 'fill-red-500 stroke-red-400 stroke-[3px]';
        } else {
          base += 'fill-slate-800 stroke-slate-900 stroke-2 ';
          if (isSelected) base += 'fill-slate-700 stroke-slate-400 stroke-[3px]';
        }
      } else if (treeType === 'Treap') {
        base += 'fill-emerald-900/30 stroke-emerald-500 stroke-2 ';
        if (isSelected) base += 'fill-emerald-800 stroke-emerald-400 stroke-[3px]';
      }
      return base;
    };

    return (
      <div className="flex-1 flex flex-col relative h-full">
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10 pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur p-3 rounded-xl shadow-lg border border-slate-800 pointer-events-auto flex flex-col gap-2">
            <form onSubmit={handleInsert} className="flex gap-2">
              <input
                type="number"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Enter value..."
                className="w-32 px-3 py-1.5 text-sm bg-slate-950 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
              />
              <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 transition-colors">
                Insert
              </button>
            </form>
            <div className="flex gap-2">
              <button onClick={() => selectedVal !== null && deleteNode(selectedVal)} disabled={selectedVal === null} className="flex-1 px-2 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors">
                Delete Selected
              </button>
              <button onClick={clearTree} className="px-2 py-1.5 bg-rose-900/30 text-rose-400 border border-rose-900/50 rounded-lg text-xs font-medium hover:bg-rose-900/50 transition-colors">
                Clear
              </button>
            </div>
          </div>
          
          {selectedVal !== null && (
            <div className="bg-slate-900/90 backdrop-blur p-3 rounded-xl shadow-lg border border-slate-800 pointer-events-auto flex flex-col gap-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Node {selectedVal} Actions</div>
              <div className="flex gap-2">
                <button onClick={() => applyRotation('LEFT', selectedVal)} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-700 transition-colors">
                  Rotate Left
                </button>
                <button onClick={() => applyRotation('RIGHT', selectedVal)} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-700 transition-colors">
                  Rotate Right
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 bg-slate-950 overflow-auto relative">
          <svg width="800" height="600" className="min-w-full min-h-full">
            <g className="stroke-slate-700" strokeWidth="2">
              {edges.map(edge => (
                <line key={edge.id} x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2} className="transition-all duration-500" />
              ))}
            </g>
            <g>
              {layoutNodes.map(node => (
                <g key={node.id} transform={`translate(${node.x}, ${node.y})`} onClick={() => setSelectedVal(node.val)} className="transition-transform duration-500">
                  <circle r="18" className={getNodeClasses(node)} />
                  <text textAnchor="middle" dominantBaseline="central" className="fill-white font-mono text-sm font-bold pointer-events-none">
                    {node.val}
                  </text>
                  {treeType === 'AVL' && (
                    <text y="28" textAnchor="middle" className="fill-blue-400 font-mono text-[10px] pointer-events-none">
                      BF: {(node.left?.height || 0) - (node.right?.height || 0)}
                    </text>
                  )}
                  {treeType === 'Treap' && (
                    <text y="28" textAnchor="middle" className="fill-emerald-400 font-mono text-[10px] pointer-events-none">
                      P: {node.priority}
                    </text>
                  )}
                </g>
              ))}
            </g>
          </svg>
        </div>
      </div>
    );
  };

  const renderControls = () => {
    const inputVal = inputValControls;
    const setInputVal = setInputValControls;

    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
          <div className="bg-slate-950 text-white p-6 flex items-center justify-between border-b border-slate-800">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Settings2 className="w-6 h-6 text-indigo-400" />
                Controls & Parameters
              </h1>
              <p className="text-slate-400 text-sm mt-1">Configure and manipulate the active tree structure.</p>
            </div>
            <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-mono text-slate-300">System Ready</span>
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-8">
              <section>
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Dna className="w-4 h-4" /> Structure Type
                </h2>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {(['AVL', 'Red-Black', 'Treap'] as TreeType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => { setTreeType(type); clearTree(); }}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                        treeType === type 
                          ? 'bg-slate-800 text-indigo-400 shadow-sm border border-slate-700' 
                          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </section>

              <section className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-5">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Hash className="w-4 h-4" /> Dataset Parameters
                </h2>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">Random Seed</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={seed}
                      onChange={(e) => setSeed(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button 
                      onClick={() => setSeed(Math.floor(Math.random() * 10000).toString())}
                      className="p-2 bg-slate-800 text-slate-400 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <button 
                  onClick={clearTree}
                  className="w-full py-2.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Reset Tree
                </button>
              </section>
            </div>

            <div className="lg:col-span-7 space-y-8">
              <section>
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Operations
                </h2>
                <div className="flex gap-3">
                  <input 
                    type="number" 
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder="Key (e.g. 42)"
                    className="w-32 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-lg font-mono text-white focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                  />
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => { const v = parseInt(inputVal); if(!isNaN(v)) insertNode(v); setInputVal(''); }}
                      className="flex flex-col items-center justify-center gap-1 bg-emerald-900/20 text-emerald-400 border border-emerald-800/50 rounded-xl hover:bg-emerald-900/40 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-wider">Insert</span>
                    </button>
                    <button 
                      onClick={() => { const v = parseInt(inputVal); if(!isNaN(v)) deleteNode(v); setInputVal(''); }}
                      className="flex flex-col items-center justify-center gap-1 bg-rose-900/20 text-rose-400 border border-rose-800/50 rounded-xl hover:bg-rose-900/40 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-wider">Delete</span>
                    </button>
                    <button 
                      onClick={() => logAction(`Find [${inputVal}] not fully implemented.`)}
                      className="flex flex-col items-center justify-center gap-1 bg-blue-900/20 text-blue-400 border border-blue-800/50 rounded-xl hover:bg-blue-900/40 transition-colors"
                    >
                      <Search className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-wider">Find</span>
                    </button>
                  </div>
                </div>
              </section>

              <section className="bg-slate-950 text-white p-5 rounded-xl shadow-inner border border-slate-800 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <FastForward className="w-4 h-4" /> Simulator Controls
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Speed:</span>
                    <span className="text-sm font-mono text-indigo-400">{animationSpeed.toFixed(1)}x</span>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <input 
                    type="range" min="0.5" max="5" step="0.5"
                    value={animationSpeed} onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                    <button className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                      <SkipBack className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setIsPlaying(!isPlaying)}
                      className={`p-3 rounded-lg transition-colors shadow-lg ${
                        isPlaying ? 'bg-amber-500 hover:bg-amber-400 text-slate-900' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                    </button>
                    <button className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                      <SkipForward className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-2 gap-4">
                <div 
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-center ${
                    challengeMode ? 'bg-amber-900/20 border-amber-500/50 text-amber-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                  onClick={() => setChallengeMode(!challengeMode)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 font-bold">
                      <Swords className={`w-5 h-5 ${challengeMode ? 'text-amber-500' : 'text-slate-500'}`} />
                      Challenge Mode
                    </div>
                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${challengeMode ? 'bg-amber-500' : 'bg-slate-700'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${challengeMode ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>
                  <p className="text-xs opacity-80">
                    {challengeMode ? "Fix broken trees by selecting the correct rotation sequences." : "Enable to test your knowledge of tree invariants and rotations."}
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Recent Actions</h3>
                  <div className="flex-1 flex flex-col justify-end gap-1 overflow-hidden">
                    {actionLog.slice(0, 4).map((log, i) => (
                      <div key={i} className={`text-xs font-mono truncate ${i === 0 ? 'text-indigo-400 font-medium' : 'text-slate-500'}`} style={{ opacity: 1 - i * 0.25 }}>
                        &gt; {log}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAnalysis = () => {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-indigo-400" />
              Analysis & Output
            </h1>
            <p className="text-sm text-slate-400 mt-1">Real-time invariant tracking and traversal generation.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <section className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-white tracking-wide uppercase">Invariant Status</h2>
              </div>
              <div className="p-4 space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-3">
                  {analysis.metrics.map((metric, idx) => (
                    <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <div className="text-xs text-slate-500 mb-1">{metric.label}</div>
                      <div className={`font-mono text-lg font-semibold ${metric.status === 'ok' ? 'text-emerald-400' : metric.status === 'error' ? 'text-rose-400' : 'text-indigo-400'}`}>
                        {metric.value}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Verification Logs</h3>
                  <div className="bg-slate-950 rounded-lg p-3 font-mono text-xs text-slate-400 space-y-1.5 h-40 overflow-y-auto border border-slate-800">
                    {analysis.logs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-slate-600">{`[${(idx + 1).toString().padStart(2, '0')}]`}</span>
                        <span className={log.includes('violation') || log.includes('unbalanced') ? 'text-rose-400' : 'text-slate-300'}>{log}</span>
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
                <ListTree className="w-4 h-4 text-slate-400" />
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
                      <div className="text-sm font-semibold text-slate-200">{trav.label}</div>
                      <div className="text-xs text-slate-500">{trav.desc}</div>
                    </div>
                    <div className="flex-1 flex flex-wrap gap-1.5 bg-slate-950 p-2 rounded-lg border border-slate-800 min-h-[44px]">
                      {trav.data.map((key, kIdx) => (
                        <React.Fragment key={kIdx}>
                          <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 bg-slate-800 border border-slate-700 rounded text-sm font-mono text-slate-200 shadow-sm">
                            {key}
                          </span>
                          {kIdx < trav.data.length - 1 && <ArrowRight className="w-3 h-3 text-slate-600 self-center" />}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {challengeMode && (
              <section className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden flex-1 flex flex-col">
                <div className="bg-indigo-900/30 px-4 py-3 border-b border-indigo-900/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-indigo-400" />
                    <h2 className="text-sm font-semibold text-indigo-300 tracking-wide uppercase">Challenge Mode: Fix the Tree</h2>
                  </div>
                  <span className="text-xs font-medium bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded-full">
                    {treeType}
                  </span>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="bg-rose-900/20 border border-rose-900/50 rounded-lg p-4 mb-5 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-rose-300 mb-1">Invariant Violation Detected</h3>
                      <p className="text-sm text-rose-200/80 leading-relaxed">{challengeData.scenario}</p>
                    </div>
                  </div>
                  <div className="space-y-2 flex-1">
                    <p className="text-sm font-medium text-slate-300 mb-3">Select the correct operation sequence to restore invariants:</p>
                    {challengeData.options.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => setChallengeState(idx === challengeData.correct ? 'success' : 'error')}
                        disabled={challengeState === 'success'}
                        className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-mono transition-all ${
                          challengeState === 'success' && idx === challengeData.correct
                            ? 'bg-emerald-900/30 border-emerald-800 text-emerald-400'
                            : challengeState === 'error' && idx !== challengeData.correct
                            ? 'bg-slate-950 border-slate-800 text-slate-600 opacity-50'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-indigo-700 hover:bg-indigo-900/20'
                        }`}
                      >
                        <span className="inline-block w-6 text-slate-500 font-sans text-xs">{String.fromCharCode(65 + idx)}.</span>
                        {opt}
                      </button>
                    ))}
                  </div>
                  <div className="mt-5 h-12 flex items-center">
                    {challengeState === 'success' && (
                      <div className="flex items-center gap-2 text-emerald-400 bg-emerald-900/20 px-4 py-2 rounded-lg border border-emerald-900/50 w-full">
                        <CheckCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">Correct! The {treeType} invariants are restored.</span>
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
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTheory = () => {

    const Code = ({ children }: { children: React.ReactNode }) => (
      <code className="font-mono bg-slate-950 text-indigo-300 px-1.5 py-0.5 rounded text-sm border border-slate-800">{children}</code>
    );

    const Card = ({ title, children, badge }: { title: string; children: React.ReactNode; badge?: string }) => (
      <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          {badge && <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-900/50 text-indigo-300">{badge}</span>}
        </div>
        <div className="text-slate-400 leading-relaxed">{children}</div>
      </div>
    );

    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Theory & Reference</h1>
          <p className="text-slate-400">Understand the strict invariants and rotation strategies that keep Search Trees functioning in <Code>O(log n)</Code> time.</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-800 pb-px">
          {[
            { id: 'avl', label: 'AVL Trees' },
            { id: 'rbt', label: 'Red-Black Trees' },
            { id: 'treap', label: 'Treaps' },
            { id: 'rotations', label: 'Rotations' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTheoryTab(tab.id as any)}
              className={`px-5 py-3 text-sm font-semibold rounded-t-lg transition-colors border-b-2 ${
                theoryTab === tab.id ? 'bg-slate-900 text-indigo-400 border-indigo-500' : 'text-slate-500 border-transparent hover:bg-slate-900 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div>
          {theoryTab === 'avl' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-semibold text-white border-b border-slate-800 pb-2">AVL Tree</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <Card title="The AVL Invariant" badge="Strict Balance">
                  <p className="mb-4">An AVL tree maintains height balance strictly. For every node, the difference in height between its left and right subtrees must not exceed 1.</p>
                  <div className="bg-slate-950 border-l-4 border-indigo-500 p-4 my-4 font-mono text-sm text-slate-300">
                    BF(node) = Height(node.left) - Height(node.right)<br />
                    Invariant: BF(node) ∈ {'{'} -1, 0, 1 {'}'}
                  </div>
                </Card>
                <Card title="Operational Guarantees" badge="O(log N)">
                  <ul className="space-y-3">
                    <li><strong>Lookup:</strong> Exceptionally fast due to strict balancing. Max height is roughly <Code>1.44 log₂(N)</Code>.</li>
                    <li><strong>Insertion/Deletion:</strong> May require multiple rotations propagating up to the root to restore the balance factor.</li>
                  </ul>
                </Card>
              </div>
            </div>
          )}
          {theoryTab === 'rbt' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-semibold text-white border-b border-slate-800 pb-2">Red-Black Tree</h2>
              <Card title="The 5 Structural Properties">
                <ol className="list-decimal list-inside space-y-2 text-slate-300">
                  <li><strong>Node Color:</strong> Every node is either <span className="text-red-400">Red</span> or Black.</li>
                  <li><strong>Root Property:</strong> The root is always Black.</li>
                  <li><strong>Leaf Property:</strong> All leaves (NIL) are Black.</li>
                  <li><strong>Red Property:</strong> If a node is <span className="text-red-400">Red</span>, both children must be Black.</li>
                  <li><strong>Black-Height Property:</strong> Every path from a node to its descendant NIL nodes has the same number of Black nodes.</li>
                </ol>
              </Card>
            </div>
          )}
          {theoryTab === 'treap' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-semibold text-white border-b border-slate-800 pb-2">Treap (Tree + Heap)</h2>
              <Card title="The Dual Invariant" badge="Randomized">
                <p className="mb-4">A Treap is a Cartesian tree where each node holds a <strong>Key</strong> and a randomly generated <strong>Priority</strong>.</p>
                <div className="bg-slate-950 border-l-4 border-indigo-500 p-4 my-4 font-mono text-sm text-slate-300">
                  1. BST Property: Left.Key &lt; Node.Key &lt; Right.Key<br />
                  2. Heap Property: Node.Priority ≥ Children.Priority
                </div>
              </Card>
            </div>
          )}
          {theoryTab === 'rotations' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-semibold text-white border-b border-slate-800 pb-2">Tree Rotations Reference</h2>
              <p className="text-slate-400">Rotations change the shape of a BST without violating the BST invariant.</p>
              <div className="grid md:grid-cols-2 gap-8">
                <Card title="Left Rotation">
                  <p className="mb-4">Elevates the right child to the parent position.</p>
                  <pre className="bg-slate-950 text-slate-300 p-4 rounded-lg font-mono text-xs overflow-x-auto border border-slate-800">
{`function leftRotate(x) {
  let y = x.right;
  x.right = y.left;
  if (y.left != null) y.left.parent = x;
  y.parent = x.parent;
  y.left = x;
  x.parent = y;
}`}
                  </pre>
                </Card>
                <Card title="Right Rotation">
                  <p className="mb-4">Elevates the left child to the parent position.</p>
                  <pre className="bg-slate-950 text-slate-300 p-4 rounded-lg font-mono text-xs overflow-x-auto border border-slate-800">
{`function rightRotate(y) {
  let x = y.left;
  y.left = x.right;
  if (x.right != null) x.right.parent = y;
  x.parent = y.parent;
  x.right = y;
  y.parent = x;
}`}
                  </pre>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- Main Layout ---

  const TABS = [
    { id: 'hero', label: 'Introduction', icon: BookOpen },
    { id: 'visualizer', label: 'Visualizer', icon: Network },
    { id: 'controls', label: 'Controls', icon: Settings2 },
    { id: 'analysis', label: 'Analysis', icon: Activity },
    { id: 'theory', label: 'Theory', icon: Layers },
  ] as const;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden selection:bg-indigo-500/30">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-900/20">
            <Network className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">BST Studio</span>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : 'text-slate-500'}`} />
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500 uppercase">Active Tree</span>
            <span className="text-sm font-bold text-indigo-400">{treeType}</span>
            <span className="text-xs text-slate-500 font-mono mt-1">Nodes: {traversals.inOrder.length}</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative bg-slate-950">
        {activeTab === 'hero' && renderHero()}
        {activeTab === 'visualizer' && renderVisualizer()}
        {activeTab === 'controls' && renderControls()}
        {activeTab === 'analysis' && renderAnalysis()}
        {activeTab === 'theory' && renderTheory()}
      </main>
    </div>
  );
}