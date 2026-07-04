import React, { useState, useMemo } from 'react';

// --- Types & Interfaces ---

type TreeType = 'AVL' | 'Red-Black' | 'Treap';

interface TreeNode {
  id: string;
  key: number;
  left?: TreeNode;
  right?: TreeNode;
  // AVL specific
  height?: number;
  // Red-Black specific
  color?: 'red' | 'black';
  // Treap specific
  priority?: number;
}

interface ValidationResult {
  valid: boolean;
  rules: { name: string; passed: boolean; detail?: string }[];
}

// --- Mock Data Generators ---

const generateValidTree = (type: TreeType): TreeNode => {
  const base = {
    id: '20', key: 20,
    left: {
      id: '10', key: 10,
      left: { id: '5', key: 5 },
      right: { id: '15', key: 15 }
    },
    right: {
      id: '30', key: 30,
      left: { id: '25', key: 25 },
      right: { id: '35', key: 35 }
    }
  };

  if (type === 'AVL') {
    return {
      ...base, height: 3,
      left: { ...base.left, height: 2, left: { ...base.left.left, height: 1 }, right: { ...base.left.right, height: 1 } },
      right: { ...base.right, height: 2, left: { ...base.right.left, height: 1 }, right: { ...base.right.right, height: 1 } }
    };
  }
  if (type === 'Red-Black') {
    return {
      ...base, color: 'black',
      left: { ...base.left, color: 'red', left: { ...base.left.left, color: 'black' }, right: { ...base.left.right, color: 'black' } },
      right: { ...base.right, color: 'red', left: { ...base.right.left, color: 'black' }, right: { ...base.right.right, color: 'black' } }
    };
  }
  // Treap
  return {
    ...base, priority: 99,
    left: { ...base.left, priority: 80, left: { ...base.left.left, priority: 40 }, right: { ...base.left.right, priority: 50 } },
    right: { ...base.right, priority: 85, left: { ...base.right.left, priority: 60 }, right: { ...base.right.right, priority: 70 } }
  };
};

const generateInvalidTree = (type: TreeType): TreeNode => {
  const valid = generateValidTree(type);
  if (type === 'AVL') {
    // Break balance factor: add 2 nodes to the left of 5
    return {
      ...valid,
      left: {
        ...valid.left!,
        left: {
          ...valid.left!.left!,
          left: { id: '3', key: 3, height: 2, left: { id: '1', key: 1, height: 1 } }
        }
      }
    };
  }
  if (type === 'Red-Black') {
    // Break Red-Red property: make 5 red (parent 10 is already red)
    return {
      ...valid,
      left: {
        ...valid.left!,
        left: { ...valid.left!.left!, color: 'red' }
      }
    };
  }
  // Treap: Break max-heap property (child priority > parent)
  return {
    ...valid,
    left: {
      ...valid.left!,
      right: { ...valid.left!.right!, priority: 100 }
    }
  };
};

// --- Analysis Logic ---

const getTraversals = (root: TreeNode | undefined) => {
  const pre: number[] = [];
  const inOrder: number[] = [];
  const post: number[] = [];

  const traverse = (node?: TreeNode) => {
    if (!node) return;
    pre.push(node.key);
    traverse(node.left);
    inOrder.push(node.key);
    traverse(node.right);
    post.push(node.key);
  };

  traverse(root);
  return { pre, inOrder, post };
};

const validateTree = (root: TreeNode | undefined, type: TreeType): ValidationResult => {
  const rules: ValidationResult['rules'] = [];
  let isValid = true;

  // 1. BST Property (Common)
  let isBST = true;
  let prev: number | null = null;
  const checkBST = (node?: TreeNode) => {
    if (!node) return;
    checkBST(node.left);
    if (prev !== null && node.key <= prev) isBST = false;
    prev = node.key;
    checkBST(node.right);
  };
  checkBST(root);
  rules.push({ name: 'Binary Search Tree Property', passed: isBST, detail: 'Left < Node < Right' });
  if (!isBST) isValid = false;

  if (type === 'AVL') {
    let balanced = true;
    const checkHeight = (node?: TreeNode): number => {
      if (!node) return 0;
      const lh = checkHeight(node.left);
      const rh = checkHeight(node.right);
      if (Math.abs(lh - rh) > 1) balanced = false;
      return Math.max(lh, rh) + 1;
    };
    checkHeight(root);
    rules.push({ name: 'AVL Balance Factor', passed: balanced, detail: '|Height(L) - Height(R)| ≤ 1' });
    if (!balanced) isValid = false;
  }

  if (type === 'Red-Black') {
    const isRootBlack = root?.color === 'black';
    rules.push({ name: 'Root Property', passed: isRootBlack, detail: 'Root must be black' });
    if (!isRootBlack) isValid = false;

    let noRedRed = true;
    let uniformBlackHeight = true;
    let expectedBlackHeight = -1;

    const checkRB = (node?: TreeNode, currentBlackHeight: number = 0, isParentRed: boolean = false) => {
      if (!node) {
        if (expectedBlackHeight === -1) expectedBlackHeight = currentBlackHeight + 1;
        else if (expectedBlackHeight !== currentBlackHeight + 1) uniformBlackHeight = false;
        return;
      }
      if (node.color === 'red' && isParentRed) noRedRed = false;
      const nextBH = currentBlackHeight + (node.color === 'black' ? 1 : 0);
      checkRB(node.left, nextBH, node.color === 'red');
      checkRB(node.right, nextBH, node.color === 'red');
    };
    checkRB(root);

    rules.push({ name: 'Red Property', passed: noRedRed, detail: 'No consecutive red nodes' });
    rules.push({ name: 'Black Depth Property', passed: uniformBlackHeight, detail: 'All paths have same black-height' });
    if (!noRedRed || !uniformBlackHeight) isValid = false;
  }

  if (type === 'Treap') {
    let isHeap = true;
    const checkHeap = (node?: TreeNode) => {
      if (!node) return;
      if (node.left && (node.left.priority || 0) > (node.priority || 0)) isHeap = false;
      if (node.right && (node.right.priority || 0) > (node.priority || 0)) isHeap = false;
      checkHeap(node.left);
      checkHeap(node.right);
    };
    checkHeap(root);
    rules.push({ name: 'Max-Heap Property', passed: isHeap, detail: 'Parent priority ≥ Child priority' });
    if (!isHeap) isValid = false;
  }

  return { valid: isValid, rules };
};

// --- Icons ---

const CheckCircleIcon = () => (
  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XCircleIcon = () => (
  <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AlertTriangleIcon = () => (
  <svg className="w-4 h-4 text-amber-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

// --- Main Component ---

export default function App() {
  const [treeType, setTreeType] = useState<TreeType>('AVL');
  const [hasError, setHasError] = useState(false);

  const currentTree = useMemo(() => {
    return hasError ? generateInvalidTree(treeType) : generateValidTree(type);
  }, [treeType, hasError]);

  const traversals = useMemo(() => getTraversals(currentTree), [currentTree]);
  const validation = useMemo(() => validateTree(currentTree, treeType), [currentTree, treeType]);

  // SVG Rendering Logic
  const renderTreeSVG = () => {
    const nodes: React.ReactNode[] = [];
    const edges: React.ReactNode[] = [];

    const traverseSVG = (node: TreeNode, x: number, y: number, dx: number, level: number) => {
      if (node.left) {
        const nx = x - dx;
        const ny = y + 60;
        edges.push(
          <line key={`e-l-${node.id}`} x1={x} y1={y} x2={nx} y2={ny} stroke="#cbd5e1" strokeWidth="2" />
        );
        traverseSVG(node.left, nx, ny, dx / 1.8, level + 1);
      }
      if (node.right) {
        const nx = x + dx;
        const ny = y + 60;
        edges.push(
          <line key={`e-r-${node.id}`} x1={x} y1={y} x2={nx} y2={ny} stroke="#cbd5e1" strokeWidth="2" />
        );
        traverseSVG(node.right, nx, ny, dx / 1.8, level + 1);
      }

      // Node styling based on type
      let fill = '#ffffff';
      let stroke = '#334155';
      let textColor = '#0f172a';

      if (treeType === 'Red-Black') {
        fill = node.color === 'red' ? '#fee2e2' : '#1e293b';
        stroke = node.color === 'red' ? '#ef4444' : '#0f172a';
        textColor = node.color === 'red' ? '#991b1b' : '#f8fafc';
      }

      nodes.push(
        <g key={`n-${node.id}`} transform={`translate(${x},${y})`}>
          <circle r="20" fill={fill} stroke={stroke} strokeWidth="2" className="shadow-sm" />
          <text textAnchor="middle" dy=".3em" fill={textColor} className="font-mono text-sm font-semibold">
            {node.key}
          </text>
          {/* Sub-labels for invariants */}
          {treeType === 'AVL' && (
            <text textAnchor="middle" dy="2.5em" fill="#64748b" className="font-mono text-[10px]">
              h:{node.height}
            </text>
          )}
          {treeType === 'Treap' && (
            <text textAnchor="middle" dy="2.5em" fill="#64748b" className="font-mono text-[10px]">
              p:{node.priority}
            </text>
          )}
        </g>
      );
    };

    if (currentTree) {
      traverseSVG(currentTree, 300, 40, 120, 0);
    }

    return (
      <svg width="100%" height="320" viewBox="0 0 600 320" className="overflow-visible">
        {edges}
        {nodes}
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 md:p-10 flex flex-col items-center">
      <div className="max-w-6xl w-full space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analysis & Output</h1>
            <p className="text-slate-500 text-sm mt-1">Balanced BST Studio • Invariant Tracking & Traversals</p>
          </div>
          
          <div className="flex bg-slate-200/50 p-1 rounded-lg border border-slate-200">
            {(['AVL', 'Red-Black', 'Treap'] as TreeType[]).map((type) => (
              <button
                key={type}
                onClick={() => { setTreeType(type); setHasError(false); }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  treeType === type 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Visualization & Controls */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h2 className="text-sm font-semibold text-slate-700 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                  Live Tree State
                </h2>
                <button
                  onClick={() => setHasError(!hasError)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors flex items-center ${
                    hasError 
                      ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {hasError ? 'Fix Structure' : 'Inject Violation'}
                </button>
              </div>
              <div className="p-6 flex justify-center items-center bg-white min-h-[340px]">
                {renderTreeSVG()}
              </div>
            </div>

            {/* Traversal Output */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-sm font-semibold text-slate-700">Traversal Sequences</h2>
              </div>
              <div className="p-5 space-y-4">
                {(['pre', 'inOrder', 'post'] as const).map((type) => (
                  <div key={type} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider w-24">
                      {type === 'inOrder' ? 'In-Order' : `${type}-Order`}
                    </span>
                    <div className="flex-1 font-mono text-sm bg-slate-50 border border-slate-100 rounded-md p-2 text-slate-700 overflow-x-auto whitespace-nowrap">
                      [ {traversals[type].join(', ')} ]
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Invariant Analysis */}
          <div className="space-y-6">
            <div className={`rounded-xl border shadow-sm overflow-hidden transition-colors duration-300 ${
              validation.valid ? 'bg-white border-emerald-200' : 'bg-rose-50/30 border-rose-200'
            }`}>
              <div className={`p-4 border-b flex items-center justify-between ${
                validation.valid ? 'border-emerald-100 bg-emerald-50/50' : 'border-rose-100 bg-rose-50'
              }`}>
                <h2 className="text-sm font-semibold text-slate-800">Invariant Analysis</h2>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  validation.valid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {validation.valid ? 'VALID' : 'VIOLATION DETECTED'}
                </span>
              </div>
              
              <div className="p-5 space-y-5">
                {!validation.valid && (
                  <div className="bg-rose-100/50 border border-rose-200 text-rose-800 text-sm p-3 rounded-lg flex items-start">
                    <AlertTriangleIcon />
                    <span className="leading-tight">
                      Structural integrity compromised. Review the failing invariants below to determine the required rotation or recoloring.
                    </span>
                  </div>
                )}

                <ul className="space-y-4">
                  {validation.rules.map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {rule.passed ? <CheckCircleIcon /> : <XCircleIcon />}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${rule.passed ? 'text-slate-700' : 'text-rose-700'}`}>
                          {rule.name}
                        </p>
                        {rule.detail && (
                          <p className={`text-xs mt-0.5 font-mono ${rule.passed ? 'text-slate-500' : 'text-rose-500/80'}`}>
                            {rule.detail}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Math/Heuristics Panel */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-1