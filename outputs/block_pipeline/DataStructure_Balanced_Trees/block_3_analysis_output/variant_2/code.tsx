import React, { useState, useMemo, useEffect } from 'react';

// --- Types & Mock Data ---

type TreeType = 'AVL' | 'RB' | 'TREAP';
type NodeColor = 'red' | 'black';

interface TreeNode {
  key: number;
  color: NodeColor;
  priority: number;
  left?: TreeNode;
  right?: TreeNode;
}

const VALID_TREE: TreeNode = {
  key: 42, color: 'black', priority: 90,
  left: {
    key: 20, color: 'red', priority: 70,
    left: { key: 10, color: 'black', priority: 50 },
    right: { key: 30, color: 'black', priority: 60 }
  },
  right: {
    key: 60, color: 'black', priority: 80,
    left: { key: 50, color: 'red', priority: 40 },
    right: { key: 70, color: 'red', priority: 85 }
  }
};

const BROKEN_AVL_TREE: TreeNode = {
  key: 42, color: 'black', priority: 90,
  left: {
    key: 20, color: 'red', priority: 70,
    left: {
      key: 10, color: 'black', priority: 50,
      left: { key: 5, color: 'red', priority: 30 } // Imbalance
    },
    right: { key: 30, color: 'black', priority: 60 }
  },
  right: { key: 60, color: 'black', priority: 80 }
};

const BROKEN_RB_TREE: TreeNode = {
  key: 42, color: 'black', priority: 90,
  left: {
    key: 20, color: 'red', priority: 70,
    left: { key: 10, color: 'red', priority: 50 }, // Double Red
    right: { key: 30, color: 'black', priority: 60 }
  },
  right: { key: 60, color: 'black', priority: 80 }
};

const BROKEN_TREAP: TreeNode = {
  key: 42, color: 'black', priority: 50, // Heap violation (children have higher priority)
  left: { key: 20, color: 'red', priority: 70 },
  right: { key: 60, color: 'black', priority: 80 }
};

// --- Helper Functions ---

function getTraversals(root?: TreeNode) {
  const inOrder: number[] = [];
  const preOrder: number[] = [];
  const postOrder: number[] = [];

  function traverse(node?: TreeNode) {
    if (!node) return;
    preOrder.push(node.key);
    traverse(node.left);
    inOrder.push(node.key);
    traverse(node.right);
    postOrder.push(node.key);
  }
  
  traverse(root);
  return { inOrder, preOrder, postOrder };
}

function getHeight(node?: TreeNode): number {
  if (!node) return 0;
  return 1 + Math.max(getHeight(node.left), getHeight(node.right));
}

function validateBST(root?: TreeNode): { valid: boolean; msg: string } {
  let valid = true;
  let msg = 'Valid BST property.';
  let prev = -Infinity;

  function traverse(node?: TreeNode) {
    if (!node || !valid) return;
    traverse(node.left);
    if (node.key <= prev) {
      valid = false;
      msg = `BST violation: ${node.key} is not greater than ${prev}.`;
    }
    prev = node.key;
    traverse(node.right);
  }
  
  traverse(root);
  return { valid, msg };
}

function validateAVL(root?: TreeNode): { valid: boolean; msg: string } {
  let valid = true;
  let msg = 'All AVL balance factors ≤ 1.';

  function check(node?: TreeNode): number {
    if (!node || !valid) return 0;
    const leftH = check(node.left);
    const rightH = check(node.right);
    const bf = Math.abs(leftH - rightH);
    if (bf > 1 && valid) {
      valid = false;
      msg = `AVL violation at node ${node.key} (Balance Factor: ${bf}).`;
    }
    return 1 + Math.max(leftH, rightH);
  }
  
  check(root);
  return { valid, msg };
}

function validateRB(root?: TreeNode): { valid: boolean; msg: string } {
  if (!root) return { valid: true, msg: 'Empty tree.' };
  if (root.color !== 'black') return { valid: false, msg: 'Root must be black.' };

  let valid = true;
  let msg = 'All Red-Black properties satisfied.';

  function check(node?: TreeNode): number {
    if (!node) return 1; // Null leaves are black
    if (node.color === 'red') {
      if (node.left?.color === 'red' || node.right?.color === 'red') {
        if (valid) {
          valid = false;
          msg = `Double red violation at node ${node.key}.`;
        }
      }
    }
    const leftBh = check(node.left);
    const rightBh = check(node.right);
    if (leftBh !== rightBh && valid) {
      valid = false;
      msg = `Black-height mismatch at node ${node.key} (L:${leftBh}, R:${rightBh}).`;
    }
    return leftBh + (node.color === 'black' ? 1 : 0);
  }
  
  check(root);
  return { valid, msg };
}

function validateTreap(root?: TreeNode): { valid: boolean; msg: string } {
  let valid = true;
  let msg = 'Max-heap priority maintained.';

  function check(node?: TreeNode) {
    if (!node || !valid) return;
    if (node.left && node.left.priority > node.priority) {
      valid = false;
      msg = `Heap violation: ${node.left.key} (${node.left.priority}) > ${node.key} (${node.priority}).`;
    }
    if (node.right && node.right.priority > node.priority) {
      valid = false;
      msg = `Heap violation: ${node.right.key} (${node.right.priority}) > ${node.key} (${node.priority}).`;
    }
    check(node.left);
    check(node.right);
  }
  
  check(root);
  return { valid, msg };
}

// --- Icons ---

const CheckCircle = () => (
  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XCircle = () => (
  <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ArrowRight = () => (
  <svg className="w-4 h-4 text-slate-400 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

// --- Main Component ---

export default function App() {
  const [activeType, setActiveType] = useState<TreeType>('AVL');
  const [treeState, setTreeState] = useState<'VALID' | 'BROKEN'>('VALID');
  const [logs, setLogs] = useState<{ time: string; msg: string; type: 'info' | 'error' | 'success' }[]>([]);

  // Select tree based on state
  const currentTree = useMemo(() => {
    if (treeState === 'VALID') return VALID_TREE;
    switch (activeType) {
      case 'AVL': return BROKEN_AVL_TREE;
      case 'RB': return BROKEN_RB_TREE;
      case 'TREAP': return BROKEN_TREAP;
      default: return VALID_TREE;
    }
  }, [activeType, treeState]);

  // Derived Analysis
  const traversals = useMemo(() => getTraversals(currentTree), [currentTree]);
  const bstCheck = useMemo(() => validateBST(currentTree), [currentTree]);
  const avlCheck = useMemo(() => validateAVL(currentTree), [currentTree]);
  const rbCheck = useMemo(() => validateRB(currentTree), [currentTree]);
  const treapCheck = useMemo(() => validateTreap(currentTree), [currentTree]);

  // Logging effect
  useEffect(() => {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    if (treeState === 'VALID') {
      setLogs((prev) => [{ time, msg: `Loaded perfect ${activeType} tree.`, type: 'success' }, ...prev].slice(0, 6));
    } else {
      setLogs((prev) => [
        { time, msg: `Challenge Mode: Fix the broken ${activeType} tree!`, type: 'error' },
        { time, msg: `Injected invariant violation for ${activeType}.`, type: 'info' },
        ...prev
      ].slice(0, 6));
    }
  }, [activeType, treeState]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans p-6 md:p-10 selection:bg-indigo-100 selection:text-indigo-900">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header & Controls */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">Balanced BST Studio</h1>
            <p className="text-sm text-slate-500 mt-1">Analysis & Output Module • Real-time Invariant Tracking</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              {(['AVL', 'RB', 'TREAP'] as TreeType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    activeType === type
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="h-6 w-px bg-slate-300 mx-1"></div>
            <button
              onClick={() => setTreeState(treeState === 'VALID' ? 'BROKEN' : 'VALID')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all border ${
                treeState === 'VALID' 
                  ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100' 
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              {treeState === 'VALID' ? 'Corrupt Tree' : 'Fix Tree'}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Col: Traversal Viewer */}
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  Live Traversal Viewer
                </h2>
                <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-1 rounded">Nodes: {traversals.inOrder.length}</span>
              </div>
              <div className="p-6 space-y-6 flex-1">
                <TraversalRow label="In-Order" data={traversals.inOrder} />
                <TraversalRow label="Pre-Order" data={traversals.preOrder} />
                <TraversalRow label="Post-Order" data={traversals.postOrder} />
              </div>
            </section>
          </div>

          {/* Right Col: Invariants Panel */}
          <div className="space-y-6">
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Invariant Analysis
                </h2>
              </div>
              <div className="p-6 space-y-5">
                <InvariantItem title="BST Property" check={bstCheck} />
                
                {activeType === 'AVL' && (
                  <div className="pt-4 border-t border-slate-100">
                    <InvariantItem title="AVL Balance (BF ≤ 1)" check={avlCheck} />
                  </div>
                )}
                
                {activeType === 'RB' && (
                  <div className="pt-4 border-t border-slate-100 space-y-4">
                    <InvariantItem title="Red-Black Properties" check={rbCheck} />
                  </div>
                )}
                
                {activeType === 'TREAP' && (
                  <div className="pt-4 border-t border-slate-100">
                    <InvariantItem title="Heap Property (Priority)" check={treapCheck} />
                  </div>
                )}
              </div>
            </section>
          </div>

        </div>

        {/* Bottom: Challenge Mode & Console */}
        <section className="bg-slate-900 rounded-2xl border border-slate-800 shadow-lg overflow-hidden flex flex-col">
           <div className="px-6 py-3 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <h2 className="font-mono text-sm font-medium text-slate-300 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                System Output / Rotation Log
              </h2>
              {treeState === 'BROKEN' && (
                <span className="flex items-center gap-2 text-xs font-mono text-rose-400 bg-rose-400