import React, { useState, useMemo, useEffect } from 'react';
import { Activity, GitBranch, LayoutList, CheckCircle2, AlertCircle, Info, ChevronRight, Hash } from 'lucide-react';

// Runtime Dependencies: lucide-react

// --- Types & Interfaces ---

type TreeType = 'AVL' | 'Red-Black' | 'Treap';

interface TreeNode {
  id: string;
  key: number;
  left?: TreeNode;
  right?: TreeNode;
  // AVL specific
  height?: number;
  // RB specific
  color?: 'RED' | 'BLACK';
  // Treap specific
  priority?: number;
  // Visual layout
  x?: number;
  y?: number;
}

interface TraversalState {
  preOrder: TreeNode[];
  inOrder: TreeNode[];
  postOrder: TreeNode[];
}

// --- Mock Data Generator ---

const generateMockTree = (type: TreeType): TreeNode => {
  if (type === 'AVL') {
    return {
      id: '40', key: 40, height: 3,
      left: {
        id: '20', key: 20, height: 2,
        left: { id: '10', key: 10, height: 1 },
        right: { id: '30', key: 30, height: 1 }
      },
      right: {
        id: '60', key: 60, height: 2,
        left: { id: '50', key: 50, height: 1 },
        right: { id: '70', key: 70, height: 1 }
      }
    };
  } else if (type === 'Red-Black') {
    return {
      id: '40', key: 40, color: 'BLACK',
      left: {
        id: '20', key: 20, color: 'RED',
        left: { id: '10', key: 10, color: 'BLACK' },
        right: { id: '30', key: 30, color: 'BLACK' }
      },
      right: {
        id: '60', key: 60, color: 'RED',
        left: { id: '50', key: 50, color: 'BLACK' },
        right: { id: '70', key: 70, color: 'BLACK' }
      }
    };
  } else {
    // Treap
    return {
      id: '40', key: 40, priority: 99,
      left: {
        id: '20', key: 20, priority: 85,
        left: { id: '10', key: 10, priority: 4 },
        right: { id: '30', key: 30, priority: 12 }
      },
      right: {
        id: '60', key: 60, priority: 70,
        left: { id: '50', key: 50, priority: 45 },
        right: { id: '70', key: 70, priority: 60 }
      }
    };
  }
};

// --- Helper Functions ---

const computeLayout = (root: TreeNode | undefined) => {
  let counter = 0;
  let maxDepth = 0;

  const traverse = (node: TreeNode | undefined, depth: number) => {
    if (!node) return;
    traverse(node.left, depth + 1);
    node.x = counter * 60 + 40;
    node.y = depth * 70 + 40;
    counter++;
    if (depth > maxDepth) maxDepth = depth;
    traverse(node.right, depth + 1);
  };

  traverse(root, 0);
  return { width: counter * 60 + 40, height: maxDepth * 70 + 100 };
};

const getTraversals = (root: TreeNode | undefined): TraversalState => {
  const preOrder: TreeNode[] = [];
  const inOrder: TreeNode[] = [];
  const postOrder: TreeNode[] = [];

  const traverse = (node: TreeNode | undefined) => {
    if (!node) return;
    preOrder.push(node);
    traverse(node.left);
    inOrder.push(node);
    traverse(node.right);
    postOrder.push(node);
  };

  traverse(root);
  return { preOrder, inOrder, postOrder };
};

const getNodeHeight = (node?: TreeNode): number => {
  if (!node) return 0;
  return Math.max(getNodeHeight(node.left), getNodeHeight(node.right)) + 1;
};

const getBlackHeight = (node?: TreeNode): number => {
  if (!node) return 1; // null nodes are black
  const leftBh = getBlackHeight(node.left);
  return leftBh + (node.color === 'BLACK' ? 1 : 0);
};

// --- Main Component ---

export default function App() {
  const [treeType, setTreeType] = useState<TreeType>('AVL');
  const [treeData, setTreeData] = useState<TreeNode | undefined>(undefined);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTraversal, setActiveTraversal] = useState<'inOrder' | 'preOrder' | 'postOrder'>('inOrder');

  // Initialize and update tree
  useEffect(() => {
    const newData = generateMockTree(treeType);
    setTreeData(newData);
    setSelectedNodeId(newData.id); // Select root by default
  }, [treeType]);

  // Layout calculations
  const layoutMetrics = useMemo(() => {
    if (!treeData) return { width: 0, height: 0 };
    // Clone to avoid mutating original state directly (though it's mock data)
    const cloned = JSON.parse(JSON.stringify(treeData));
    const metrics = computeLayout(cloned);
    return { root: cloned, metrics };
  }, [treeData]);

  const traversals = useMemo(() => getTraversals(layoutMetrics.root), [layoutMetrics.root]);

  // Flatten edges for SVG rendering
  const edges = useMemo(() => {
    const list: { x1: number; y1: number; x2: number; y2: number; id: string }[] = [];
    const traverse = (node: TreeNode | undefined) => {
      if (!node) return;
      if (node.left && node.x !== undefined && node.y !== undefined && node.left.x !== undefined && node.left.y !== undefined) {
        list.push({ x1: node.x, y1: node.y, x2: node.left.x, y2: node.left.y, id: `${node.id}-${node.left.id}` });
      }
      if (node.right && node.x !== undefined && node.y !== undefined && node.right.x !== undefined && node.right.y !== undefined) {
        list.push({ x1: node.x, y1: node.y, x2: node.right.x, y2: node.right.y, id: `${node.id}-${node.right.id}` });
      }
      traverse(node.left);
      traverse(node.right);
    };
    traverse(layoutMetrics.root);
    return list;
  }, [layoutMetrics.root]);

  const selectedNode = useMemo(() => {
    return traversals.inOrder.find(n => n.id === selectedNodeId);
  }, [selectedNodeId, traversals.inOrder]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Activity className="w-6 h-6 text-indigo-600" />
              Analysis & Output Studio
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Real-time invariants inspection and traversal streams.
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex bg-slate-200/50 p-1 rounded-lg border border-slate-200">
            {(['AVL', 'Red-Black', 'Treap'] as TreeType[]).map(type => (
              <button
                key={type}
                onClick={() => setTreeType(type)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  treeType === type 
                    ? 'bg-white text-indigo-700 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Visualization & Interactive Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Tree Viewer */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="font-semibold text-slate-700 flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-slate-400" />
                  Structure Viewer
                </span>
                <span className="text-xs font-mono text-slate-400 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">
                  {traversals.inOrder.length} NODES
                </span>
              </div>
              <div className="p-4 overflow-x-auto min-h-[320px] flex items-center justify-center bg-slate-50/50">
                <svg
                  width={Math.max(layoutMetrics.metrics.width, 400)}
                  height={Math.max(layoutMetrics.metrics.height, 300)}
                  className="mx-auto"
                >
                  <g className="edges">
                    {edges.map(edge => (
                      <line
                        key={edge.id}
                        x1={edge.x1} y1={edge.y1}
                        x2={edge.x2} y2={edge.y2}
                        stroke="#cbd5e1"
                        strokeWidth="2"
                      />
                    ))}
                  </g>
                  <g className="nodes">
                    {traversals.inOrder.map(node => {
                      const isSelected = selectedNodeId === node.id;
                      let fill = '#ffffff';
                      let stroke = '#64748b'; // default slate-500
                      
                      if (treeType === 'Red-Black') {
                        fill = node.color === 'RED' ? '#fee2e2' : '#334155';
                        stroke = node.color === 'RED' ? '#ef4444' : '#0f172a';
                      } else if (treeType === 'AVL') {
                        fill = isSelected ? '#e0e7ff' : '#ffffff';
                        stroke = isSelected ? '#4f46e5' : '#64748b';
                      } else if (treeType === 'Treap') {
                        fill = isSelected ? '#fcfdfd' : '#ffffff';
                        stroke = isSelected ? '#0891b2' : '#94a3b8';
                      }

                      return (
                        <g 
                          key={node.id} 
                          transform={`translate(${node.x}, ${node.y})`}
                          onClick={() => setSelectedNodeId(node.id)}
                          className="cursor-pointer transition-transform hover:scale-110"
                        >
                          <circle
                            r="18"
                            fill={fill}
                            stroke={stroke}
                            strokeWidth={isSelected ? "3" : "2"}
                            className="transition-all duration-200"
                          />
                          <text
                            textAnchor="middle"
                            dy=".3em"
                            className={`text-xs font-mono font-bold select-none ${
                              treeType === 'Red-Black' && node.color === 'BLACK' ? 'fill-white' : 'fill-slate-800'
                            }`}
                          >
                            {node.key}
                          </text>
                          {/* Render extra info like priorities for Treaps */}
                          {treeType === 'Treap' && (
                            <text
                              textAnchor="middle"
                              dy="-1.8em"
                              className="text-[10px] font-mono fill-cyan-700 font-semibold"
                            >
                              P:{node.priority}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </g>
                </svg>
              </div>
            </div>

            {/* Traversal Streams */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="font-semibold text-slate-700 flex items-center gap-2">
                  <LayoutList className="w-4 h-4 text-slate-400" />
                  Live Traversals
                </span>
                <div className="flex bg-slate-200/50 p-0.5 rounded-md border border-slate-200">
                  {(['inOrder', 'preOrder', 'postOrder'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setActiveTraversal(t)}
                      className={`px-3 py-1 text-xs font-mono rounded-sm transition-all ${
                        activeTraversal === t 
                          ? 'bg-white text-indigo-700 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-slate-50/50">
                <div className="flex flex-wrap gap-2">
                  {traversals[activeTraversal].map((node, i) => (
                    <div 
                      key={`${node.id}-${i}`}
                      onMouseEnter={() => setSelectedNodeId(node.id)}
                      className={`px-3 py-1.5 rounded-md font-mono text-sm border transition-all cursor-default flex items-center gap-1.5
                        ${selectedNodeId === node.id 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm scale-105' 
                          : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                        }`}
                    >
                      {node.key}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel: Analysis & Invariants */}
          <div className="space-y-6">
            
            {/* Global Invariants */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <span className="font-semibold text-slate-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Global Invariants
                </span>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="text-sm text-slate-500">Root Key</span>
                  <span className="font-mono font-medium text-slate-800">{layoutMetrics.root?.key ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="text-sm text-slate-500">Total Height</span>
                  <span className="font-mono font-medium text-slate-800">{getNodeHeight(layoutMetrics.root)}</span>
                </div>
                
                {treeType === 'AVL' && (
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-sm text-slate-500">AVL Property</span>
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Valid
                    </span>
                  </div>
                )}

                {treeType === 'Red-Black' && (
                  <>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-sm text-slate-500">Root is Black?</span>
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Yes
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-sm text-slate-500">Uniform Black-Height</span>
                      <span className="font-mono font-medium text-slate-800">{getBlackHeight(layoutMetrics.root)}</span>
                    </div>
                  </>
                )}

                {treeType === 'Treap' && (
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-sm text-slate-500">Heap Property</span>
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Max-Heap
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Node Inspector */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1">
               <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <span className="font-semibold text-slate-700 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-slate-400" />
                  Node Inspector
                </span>
              </div>
              <div className="p-4">
                {selectedNode ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-full border-2 border-indigo-200 bg-indigo-50 flex items-center justify-center">
                        <span className="font-mono font-bold text-lg text-indigo-700">{selectedNode.key}</span>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Selected Node</div>
                        <div className="text-sm text-slate-800">Key: <span className="font-mono">{selectedNode.key}</span></div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {treeType === 'AVL' && (
                        <>
                          <InspectorRow label="Node Height" value={getNodeHeight(selectedNode)} />
                          <InspectorRow 
                            label="Balance Factor" 
                            value={getNodeHeight(selectedNode.left) - getNodeHeight(selectedNode.right)} 
                          />
                          <InspectorRow label="Left Height" value={getNodeHeight(selectedNode.left)} />
                          <InspectorRow label="Right Height" value={getNodeHeight(selectedNode.right)} />
                        </>
                      )}

                      {treeType === 'Red-Black' && (
                        <>
                          <div className="flex justify-between items-center p-2 rounded-md bg-slate-50 border border-slate-100">
                            <span className="text-sm text-slate-600 font-medium">Color</span>
                            <span className={`text-xs font-bold px-2 py-1 rounded-sm ${
                              selectedNode.color === 'RED' 
                                ? 'bg-red-100 text-red-700' 
                                : 'bg-slate-800 text-slate-100'
                            }`}>
                              {selectedNode.color}
                            </span>
                          </div>
                          <InspectorRow label="Black-Height" value={getBlackHeight(selectedNode)} />
                          <InspectorRow label="Left Child" value={selectedNode.left ? selectedNode.left.color : 'NIL (BLACK)'} />
                          <InspectorRow label="Right Child" value={selectedNode.right ? selectedNode.right.color : 'NIL (BLACK)'} />
                        </>
                      )}

                      {treeType === 'Treap' && (
                        <>
                          <InspectorRow label="Priority" value={selectedNode.priority} highlight />
                          <InspectorRow label="Left Priority" value={selectedNode.left?.priority ?? '-∞'} />
                          <InspectorRow label="Right Priority" value={selectedNode.right?.priority ?? '-∞'} />
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-slate-400 flex flex-col items-center">
                    <Info className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">Click a node to inspect invariants.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// --- Subcomponents ---

function InspectorRow({ label, value, highlight = false }: { label: string, value: string | number, highlight?: boolean }) {
  return (
    <div className={`flex justify-between items-center p-2 rounded-md border ${highlight ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-5