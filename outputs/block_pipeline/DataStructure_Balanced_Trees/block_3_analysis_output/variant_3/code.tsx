import React, { useState, useMemo } from 'react';

// --- Types & Interfaces ---
type TreeType = 'AVL' | 'Red-Black' | 'Treap';
type NodeColor = 'RED' | 'BLACK';

interface TreeNode {
  id: string;
  key: number;
  left: TreeNode | null;
  right: TreeNode | null;
  color?: NodeColor;
  priority?: number;
}

interface TreeAnalysis {
  maxHeight: number;
  minHeight: number;
  isBalanced?: boolean;
  balanceViolations?: string[];
  blackHeight?: number;
  validRB?: boolean;
  rbViolations?: string[];
  validHeap?: boolean;
  heapViolations?: string[];
}

// --- Mock Data Generators ---
const mockTrees: Record<TreeType, { valid: TreeNode; invalid: TreeNode }> = {
  AVL: {
    valid: {
      id: 'n50', key: 50,
      left: {
        id: 'n25', key: 25,
        left: { id: 'n10', key: 10, left: null, right: null },
        right: { id: 'n30', key: 30, left: null, right: null }
      },
      right: {
        id: 'n75', key: 75,
        left: { id: 'n60', key: 60, left: null, right: null },
        right: { id: 'n90', key: 90, left: null, right: null }
      }
    },
    invalid: { // Left-heavy violation
      id: 'n50', key: 50,
      left: {
        id: 'n25', key: 25,
        left: { 
          id: 'n10', key: 10, 
          left: { id: 'n5', key: 5, left: null, right: null }, 
          right: null 
        },
        right: null
      },
      right: { id: 'n75', key: 75, left: null, right: null }
    }
  },
  'Red-Black': {
    valid: {
      id: 'n50', key: 50, color: 'BLACK',
      left: {
        id: 'n25', key: 25, color: 'RED',
        left: { id: 'n10', key: 10, color: 'BLACK', left: null, right: null },
        right: { id: 'n30', key: 30, color: 'BLACK', left: null, right: null }
      },
      right: {
        id: 'n75', key: 75, color: 'BLACK',
        left: null, right: null
      }
    },
    invalid: { // Red-Red violation
      id: 'n50', key: 50, color: 'BLACK',
      left: {
        id: 'n25', key: 25, color: 'RED',
        left: { id: 'n10', key: 10, color: 'RED', left: null, right: null },
        right: null
      },
      right: null
    }
  },
  Treap: {
    valid: {
      id: 'n50', key: 50, priority: 100,
      left: {
        id: 'n25', key: 25, priority: 80,
        left: { id: 'n10', key: 10, priority: 60, left: null, right: null },
        right: { id: 'n30', key: 30, priority: 70, left: null, right: null }
      },
      right: {
        id: 'n75', key: 75, priority: 90,
        left: null, right: null
      }
    },
    invalid: { // Heap violation
      id: 'n50', key: 50, priority: 100,
      left: {
        id: 'n25', key: 25, priority: 110, // Invalid: child priority > parent priority
        left: null, right: null
      },
      right: null
    }
  }
};

// --- Helper Functions ---
function getTraversals(root: TreeNode | null) {
  const inOrder: TreeNode[] = [];
  const preOrder: TreeNode[] = [];
  const postOrder: TreeNode[] = [];

  function traverse(node: TreeNode | null) {
    if (!node) return;
    preOrder.push(node);
    traverse(node.left);
    inOrder.push(node);
    traverse(node.right);
    postOrder.push(node);
  }
  
  traverse(root);
  return { inOrder, preOrder, postOrder };
}

function analyzeTree(root: TreeNode | null, type: TreeType): TreeAnalysis {
  let minH = Infinity;
  let maxH = 0;
  
  const balanceViolations: string[] = [];
  const rbViolations: string[] = [];
  const heapViolations: string[] = [];
  
  let validRB = true;
  let expectedBlackHeight = -1;

  function getHeight(node: TreeNode | null): number {
    if (!node) return 0;
    const leftH = getHeight(node.left);
    const rightH = getHeight(node.right);
    const h = 1 + Math.max(leftH, rightH);
    
    if (type === 'AVL') {
      const diff = Math.abs(leftH - rightH);
      if (diff > 1) {
        balanceViolations.push(`Node ${node.key}: |${leftH} - ${rightH}| = ${diff}`);
      }
    }
    return h;
  }

  function checkRB(node: TreeNode | null, blackCount: number, isRoot: boolean) {
    if (!node) {
      if (expectedBlackHeight === -1) expectedBlackHeight = blackCount + 1;
      else if (expectedBlackHeight !== blackCount + 1) {
        validRB = false;
        rbViolations.push('Path black-height mismatch.');
      }
      return;
    }
    
    if (isRoot && node.color === 'RED') {
      validRB = false;
      rbViolations.push(`Root Node ${node.key} is RED.`);
    }

    if (node.color === 'RED') {
      if (node.left?.color === 'RED') {
        validRB = false;
        rbViolations.push(`RED-RED violation: ${node.key} -> ${node.left.key}`);
      }
      if (node.right?.color === 'RED') {
        validRB = false;
        rbViolations.push(`RED-RED violation: ${node.key} -> ${node.right.key}`);
      }
    }

    const nextCount = blackCount + (node.color === 'BLACK' ? 1 : 0);
    checkRB(node.left, nextCount, false);
    checkRB(node.right, nextCount, false);
  }

  function checkTreap(node: TreeNode | null) {
    if (!node) return;
    if (node.left && node.left.priority! > node.priority!) {
      heapViolations.push(`Heap violation: Child ${node.left.key}(${node.left.priority}) > Parent ${node.key}(${node.priority})`);
    }
    if (node.right && node.right.priority! > node.priority!) {
      heapViolations.push(`Heap violation: Child ${node.right.key}(${node.right.priority}) > Parent ${node.key}(${node.priority})`);
    }
    checkTreap(node.left);
    checkTreap(node.right);
  }

  maxH = getHeight(root);
  
  if (type === 'Red-Black') checkRB(root, 0, true);
  if (type === 'Treap') checkTreap(root);

  return {
    maxHeight: maxH,
    minHeight: minH === Infinity ? 0 : minH,
    isBalanced: balanceViolations.length === 0,
    balanceViolations,
    blackHeight: expectedBlackHeight === -1 ? 0 : expectedBlackHeight,
    validRB: rbViolations.length === 0,
    rbViolations,
    validHeap: heapViolations.length === 0,
    heapViolations
  };
}

// --- Icons (Inline SVG) ---
const CheckCircle = () => (
  <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const XCircle = () => (
  <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const Activity = () => (
  <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

// --- Main Component ---
export default function App() {
  const [treeType, setTreeType] = useState<TreeType>('AVL');
  const [forceViolation, setForceViolation] = useState(false);

  const currentTree = useMemo(() => {
    return forceViolation ? mockTrees[treeType].invalid : mockTrees[treeType].valid;
  }, [treeType, forceViolation]);

  const traversals = useMemo(() => getTraversals(currentTree), [currentTree]);
  const analysis = useMemo(() => analyzeTree(currentTree, treeType), [currentTree, treeType]);

  const NodeRenderer = ({ node }: { node: TreeNode }) => {
    let classes = "px-3 py-1.5 rounded-md font-mono text-sm border shadow-sm transition-all duration-300 ease-in-out inline-flex items-center space-x-2";
    let style = {};
    
    if (treeType === 'Red-Black') {
      if (node.color === 'RED') {
        classes += " bg-rose-100 border-rose-200 text-rose-800";
      } else {
        classes += " bg-slate-800 border-slate-700 text-slate-100";
      }
    } else if (treeType === 'Treap') {
      classes += " bg-indigo-50 border-indigo-200 text-indigo-900";
    } else {
      classes += " bg-white border-slate-200 text-slate-700";
    }

    return (
      <div className={classes} style={style}>
        <span className="font-bold">{node.key}</span>
        {treeType === 'Treap' && (
          <span className="text-xs opacity-70">p:{node.priority}</span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10 font-sans">
      
      {/* Header */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <Activity />
            Balanced BST Studio <span className="text-slate-400 font-normal text-lg">| Analysis & Output</span>
          </h1>
          <p className="text-slate-500 mt-1">Real-time traversal viewers and invariant monitoring.</p>
        </div>
        
        <div className="flex bg-slate-200 p-1 rounded-lg shadow-inner">
          {(['AVL', 'Red-Black', 'Treap'] as TreeType[]).map((type) => (
            <button
              key={type}
              onClick={() => { setTreeType(type); setForceViolation(false); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                treeType === type 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Traversal Viewer */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 p-4 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Traversal Viewer</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-mono">Nodes: {traversals.inOrder.length}</span>
              </div>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Pre-Order */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Pre-Order</h3>
                <div className="flex flex-wrap gap-2">
                  {traversals.preOrder.map((n, i) => (
                    <React.Fragment key={`pre-${n.id}`}>
                      <NodeRenderer node={n} />
                      {i < traversals.preOrder.length - 1 && (
                        <span className="text-slate-300 self-center">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* In-Order */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">In-Order</h3>
                <div className="flex flex-wrap gap-2">
                  {traversals.inOrder.map((n, i) => (
                    <React.Fragment key={`in-${n.id}`}>
                      <NodeRenderer node={n} />
                      {i < traversals.inOrder.length - 1 && (
                        <span className="text-slate-300 self-center">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Post-Order */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Post-Order</h3>
                <div className="flex flex-wrap gap-2">
                  {traversals.postOrder.map((n, i) => (
                    <React.Fragment key={`post-${n.id}`}>
                      <NodeRenderer node={n} />
                      {i < traversals.postOrder.length - 1 && (
                        <span className="text-slate-300 self-center">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Node Details Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Node Details Registry</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-mono text-xs">
                  <tr>
                    <th className="px-6 py-3 font-medium">Key</th>
                    {treeType === 'Red-Black' && <th className="px-6 py-3 font-medium">Color</th>}
                    {treeType === 'Treap' && <th className="px-6 py-3 font-medium">Priority</th>}
                    <th className="px-6 py-3 font-medium">Left Child</th>
                    <th className="px-6 py-3 font-medium">Right Child</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {traversals.inOrder.map((node) => (
                    <tr key={`tbl-${node.id}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3 font-mono font-medium text-slate-800">{node.key}</td>
                      {treeType === 'Red-Black' && (
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            node.color === 'RED' ? 'bg-rose-100 text-rose-800' : 'bg-slate-800 text-slate-100'
                          }`}>
                            {node.color}
                          </span>
                        </td>
                      )}
                      {treeType === 'Treap' && (
                        <td className="px-6 py-3 font-mono">{node.priority}</td>
                      )}
                      <td className="px-6 py-3 font-mono text-slate-500">{node.left?.key ?? 'null'}</td>
                      <td className="px-6 py-3 font-mono text-slate-500">{node.right?.key ?? 'null'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Invariant Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="border-b border-slate-100 bg-slate-50/50 p-4 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Invariant Monitor</h2>
              <button 
                onClick={() => setForceViolation(!forceViolation)}
                className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
                  forceViolation ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
              >
                {forceViolation ? 'Fix Tree' : 'Simulate Violation'}
              </button>
            </div>
            
            <div className="p-6 flex-1 space-y-6">
              {/* General Stats */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Structural Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">Max Height</p>
                    <p className="text-2xl font-mono text-slate-800">{analysis.maxHeight}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">Total Nodes</p>
                    <p className="text-2xl font-mono text-slate-800">{traversals.inOrder.length}</p>
                  </div>
                </div>
              </div>

              <div className