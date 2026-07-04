import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';

// --- Types & Data Structures ---

type TreeType = 'AVL' | 'RB' | 'TREAP';
type NodeColor = 'BLACK' | 'RED';

interface TreeNode {
  id: string;
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
  color: NodeColor;
  priority: number;
}

interface LayoutNode extends TreeNode {
  x: number;
  y: number;
  height: number;
  bf: number; // Balance factor (AVL)
  blackHeight: number; // For RB
  left: LayoutNode | null;
  right: LayoutNode | null;
}

// --- Helper Functions ---

let nodeIdCounter = 0;
const createNode = (val: number, isRoot: boolean = false): TreeNode => ({
  id: `node_${Date.now()}_${nodeIdCounter++}`,
  val,
  left: null,
  right: null,
  color: isRoot ? 'BLACK' : 'RED',
  priority: Math.floor(Math.random() * 100),
});

const insertBST = (node: TreeNode | null, val: number, isRoot: boolean = false): TreeNode => {
  if (!node) return createNode(val, isRoot);
  if (val < node.val) {
    return { ...node, left: insertBST(node.left, val) };
  } else if (val > node.val) {
    return { ...node, right: insertBST(node.right, val) };
  }
  return node; // Duplicate values ignored
};

const deleteBST = (node: TreeNode | null, val: number): TreeNode | null => {
  if (!node) return null;
  if (val < node.val) return { ...node, left: deleteBST(node.left, val) };
  if (val > node.val) return { ...node, right: deleteBST(node.right, val) };
  
  // Node to delete found
  if (!node.left) return node.right;
  if (!node.right) return node.left;
  
  // Two children: find min in right subtree
  let minRight = node.right;
  while (minRight.left) minRight = minRight.left;
  
  return {
    ...node,
    val: minRight.val,
    id: minRight.id, // keep identity of swapped node for animation stability if needed
    priority: minRight.priority,
    color: minRight.color,
    right: deleteBST(node.right, minRight.val)
  };
};

const executeRotation = (node: TreeNode | null, targetId: string, direction: 'LEFT' | 'RIGHT'): TreeNode | null => {
  if (!node) return null;

  if (node.id === targetId) {
    if (direction === 'LEFT' && node.right) {
      const newRoot = { ...node.right };
      node.right = newRoot.left;
      newRoot.left = { ...node };
      return newRoot;
    } else if (direction === 'RIGHT' && node.left) {
      const newRoot = { ...node.left };
      node.left = newRoot.right;
      newRoot.right = { ...node };
      return newRoot;
    }
    return node;
  }

  return {
    ...node,
    left: executeRotation(node.left, targetId, direction),
    right: executeRotation(node.right, targetId, direction)
  };
};

const toggleNodeColor = (node: TreeNode | null, targetId: string): TreeNode | null => {
  if (!node) return null;
  if (node.id === targetId) {
    return { ...node, color: node.color === 'RED' ? 'BLACK' : 'RED' };
  }
  return {
    ...node,
    left: toggleNodeColor(node.left, targetId),
    right: toggleNodeColor(node.right, targetId)
  };
};

const calculateLayout = (
  node: TreeNode | null,
  x: number,
  y: number,
  dx: number,
  dy: number
): LayoutNode | null => {
  if (!node) return null;
  
  const left = calculateLayout(node.left, x - dx, y + dy, dx * 0.55, dy);
  const right = calculateLayout(node.right, x + dx, y + dy, dx * 0.55, dy);

  const hL = left ? left.height : 0;
  const hR = right ? right.height : 0;
  const height = 1 + Math.max(hL, hR);
  const bf = hL - hR;

  // Simplified Black Height (path length of black nodes down left spine as proxy, proper requires full check)
  const bhL = left ? left.blackHeight : 0;
  const bhR = right ? right.blackHeight : 0;
  const blackHeight = (node.color === 'BLACK' ? 1 : 0) + Math.max(bhL, bhR);

  return { ...node, x, y, height, bf, blackHeight, left, right };
};

// --- Invariant Checking ---

const checkAVLInvariants = (node: LayoutNode | null): string[] => {
  const violations: string[] = [];
  const traverse = (n: LayoutNode | null) => {
    if (!n) return;
    if (Math.abs(n.bf) > 1) {
      violations.push(`Node ${n.val} unbalanced (BF: ${n.bf})`);
    }
    traverse(n.left);
    traverse(n.right);
  };
  traverse(node);
  return violations;
};

const checkRBInvariants = (node: LayoutNode | null): string[] => {
  const violations: string[] = [];
  if (!node) return violations;
  
  if (node.color !== 'BLACK') {
    violations.push('Root must be BLACK');
  }

  const checkRedChildren = (n: LayoutNode | null) => {
    if (!n) return;
    if (n.color === 'RED') {
      if (n.left?.color === 'RED' || n.right?.color === 'RED') {
        violations.push(`Node ${n.val} (RED) has RED child`);
      }
    }
    checkRedChildren(n.left);
    checkRedChildren(n.right);
  };
  
  const checkBlackHeight = (n: LayoutNode | null): number => {
    if (!n) return 1;
    const lBH = checkBlackHeight(n.left);
    const rBH = checkBlackHeight(n.right);
    if (lBH !== rBH && lBH !== -1 && rBH !== -1) {
      violations.push(`Unequal black height at Node ${n.val}`);
      return -1;
    }
    return (n.color === 'BLACK' ? 1 : 0) + (lBH !== -1 ? lBH : 0);
  };

  checkRedChildren(node);
  checkBlackHeight(node);
  
  return Array.from(new Set(violations)); // Deduplicate
};

const checkTreapInvariants = (node: LayoutNode | null): string[] => {
  const violations: string[] = [];
  const traverse = (n: LayoutNode | null) => {
    if (!n) return;
    if (n.left && n.left.priority > n.priority) {
      violations.push(`Max-Heap violation: ${n.left.val} (${n.left.priority}) > ${n.val} (${n.priority})`);
    }
    if (n.right && n.right.priority > n.priority) {
      violations.push(`Max-Heap violation: ${n.right.val} (${n.right.priority}) > ${n.val} (${n.priority})`);
    }
    traverse(n.left);
    traverse(n.right);
  };
  traverse(node);
  return violations;
};

// --- Main Component ---

export default function BalancedBSTStudio() {
  const [treeType, setTreeType] = useState<TreeType>('AVL');
  const [root, setRoot] = useState<TreeNode | null>(null);
  const [inputValue, setInputValue] = useState<string>('');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [challengeMode, setChallengeMode] = useState<boolean>(false);

  const svgRef = useRef<SVGSVGElement>(null);

  // Derivations
  const layoutRoot = useMemo(() => {
    // Canvas roughly 800x500
    return calculateLayout(root, 400, 40, 200, 60);
  }, [root]);

  const violations = useMemo(() => {
    if (!layoutRoot) return [];
    switch (treeType) {
      case 'AVL': return checkAVLInvariants(layoutRoot);
      case 'RB': return checkRBInvariants(layoutRoot);
      case 'TREAP': return checkTreapInvariants(layoutRoot);
      default: return [];
    }
  }, [layoutRoot, treeType]);

  const traversals = useMemo(() => {
    const inOrder: number[] = [];
    const preOrder: number[] = [];
    const postOrder: number[] = [];
    const traverse = (n: TreeNode | null) => {
      if (!n) return;
      preOrder.push(n.val);
      traverse(n.left);
      inOrder.push(n.val);
      traverse(n.right);
      postOrder.push(n.val);
    };
    traverse(root);
    return { inOrder, preOrder, postOrder };
  }, [root]);

  // Actions
  const handleInsert = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = parseInt(inputValue, 10);
    if (isNaN(val)) return;
    setRoot(prev => insertBST(prev, val, !prev));
    setInputValue('');
  };

  const handleDelete = () => {
    const val = parseInt(inputValue, 10);
    if (isNaN(val)) return;
    setRoot(prev => deleteBST(prev, val));
    setInputValue('');
  };

  const handleRandomize = () => {
    let current: TreeNode | null = null;
    const count = challengeMode ? 8 : 5;
    const values = new Set<number>();
    while (values.size < count) values.add(Math.floor(Math.random() * 99) + 1);
    
    Array.from(values).forEach((v, i) => {
      current = insertBST(current, v, i === 0);
    });
    setRoot(current);
    setSelectedNode(null);
  };

  const clearTree = () => {
    setRoot(null);
    setSelectedNode(null);
  };

  const loadChallenge = () => {
    setChallengeMode(true);
    setTreeType('AVL');
    // Load a specifically unbalanced tree
    let r = insertBST(null, 50, true);
    r = insertBST(r, 40);
    r = insertBST(r, 30); // creates left-left AVL violation
    r = insertBST(r, 60);
    r = insertBST(r, 70); // creates right-right AVL violation
    setRoot(r);
  };

  // Click outside to deselect
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (svgRef.current && !svgRef.current.contains(e.target as Node)) {
        setSelectedNode(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Render Helpers ---

  const renderEdges = (node: LayoutNode | null): React.ReactNode => {
    if (!node) return null;
    return (
      <g key={`edges-${node.id}`}>
        {node.left && (
          <line
            x1={node.x} y1={node.y} x2={node.left.x} y2={node.left.y}
            className="stroke-slate-300 transition-all duration-300"
            strokeWidth="2"
          />
        )}
        {node.right && (
          <line
            x1={node.x} y1={node.y} x2={node.right.x} y2={node.right.y}
            className="stroke-slate-300 transition-all duration-300"
            strokeWidth="2"
          />
        )}
        {renderEdges(node.left)}
        {renderEdges(node.right)}
      </g>
    );
  };

  const renderNodes = (node: LayoutNode | null): React.ReactNode => {
    if (!node) return null;
    const isSelected = selectedNode === node.id;
    
    // Theme logic
    let fill = '#ffffff';
    let stroke = '#64748b'; // slate-500
    let textFill = '#0f172a'; // slate-900
    let badgeFill = '#e2e8f0'; // slate-200
    let badgeText = '#475569'; // slate-600
    let badgeContent = '';

    if (treeType === 'RB') {
      fill = node.color === 'RED' ? '#ef4444' : '#1e293b'; // red-500 / slate-800
      stroke = fill;
      textFill = '#ffffff';
    } else if (treeType === 'TREAP') {
      badgeContent = `P:${node.priority}`;
    } else if (treeType === 'AVL') {
      badgeContent = `BF:${node.bf}`;
      if (Math.abs(node.bf) > 1) {
        badgeFill = '#fee2e2'; // red-100
        badgeText = '#b91c1c'; // red-700
        stroke = '#ef4444'; // red-500
      }
    }

    return (
      <g key={`node-${node.id}`} className="transition-all duration-300">
        <circle
          cx={node.x} cy={node.y} r="18"
          fill={fill}
          stroke={isSelected ? '#3b82f6' : stroke}
          strokeWidth={isSelected ? "4" : "2"}
          className="cursor-pointer hover:stroke-blue-400 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedNode(node.id === selectedNode ? null : node.id);
          }}
        />
        <text
          x={node.x} y={node.y}
          textAnchor="middle" dy=".3em"
          fill={textFill}
          className="font-mono text-sm font-semibold pointer-events-none"
        >
          {node.val}
        </text>

        {/* Badge for AVL/TREAP */}
        {badgeContent && (
          <g transform={`translate(${node.x + 12}, ${node.y - 15})`}>
            <rect x="-2" y="-10" width="34" height="14" rx="4" fill={badgeFill} className="opacity-90"/>
            <text x="15" y="0" textAnchor="middle" fill={badgeText} className="font-mono text-[9px] font-bold pointer-events-none">
              {badgeContent}
            </text>
          </g>
        )}

        {/* Selection Context Menu (SVG based) */}
        {isSelected && (
          <g transform={`translate(${node.x}, ${node.y + 25})`} className="opacity-100 z-50 animate-in fade-in zoom-in duration-200">
            {/* Background pill */}
            <rect x="-45" y="0" width={treeType === 'RB' ? "90" : "60"} height="26" rx="13" fill="#1e293b" className="shadow-lg"/>
            
            {/* Rotate Left Button */}
            <g className="cursor-pointer group" onClick={(e) => { e.stopPropagation(); setRoot(prev => executeRotation(prev, node.id, 'LEFT')); }}>
              <rect x="-40" y="3" width="20" height="20" rx="10" fill="transparent" className="group-hover:fill-slate-700 transition-colors"/>
              <path d="M-34 16 L-34 10 L-28 10 M-34 10 Q-30 6 -26 10" fill="none" stroke="#fff" strokeWidth="1.5"/>
              <title>Rotate Left</title>
            </g>
            
            {/* Rotate Right Button */}
            <g className="cursor-pointer group" onClick={(e) => { e.stopPropagation(); setRoot(prev => executeRotation(prev, node.id, 'RIGHT')); }}>
              <rect x="-15" y="3" width="20" height="20" rx="10" fill="transparent" className="group-hover:fill-slate-700 transition-colors"/>
              <path d="M-5 16 L-5 10 L-11 10 M-5 10 Q-9 6 -13 10" fill="none" stroke="#fff" strokeWidth="1.5"/>
              <title>Rotate Right</title>
            </g>

            {/* Toggle Color Button (RB only) */}
            {treeType === 'RB' && (
              <g className="cursor-pointer group" onClick={(e) => { e.stopPropagation(); setRoot(prev => toggleNodeColor(prev, node.id)); }}>
                <rect x="10" y="3" width="20" height="20" rx="10" fill="transparent" className="group-hover:fill-slate-700 transition-colors"/>
                <circle cx="20" cy="13" r="6" fill={node.color === 'RED' ? '#1e293b' : '#ef4444'} stroke="#fff" strokeWidth="1"/>
                <title>Toggle Color</title>
              </g>
            )}
          </g>
        )}

        {renderNodes(node.left)}
        {renderNodes(node.right)}
      </g>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-blue-200">
      
      {/* --- HEADER --- */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Balanced BST Studio</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Interactive Visualization Engine</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner">
          {(['AVL', 'RB', 'TREAP'] as TreeType[]).map((type) => (
            <button
              key={type}
              onClick={() => { setTreeType(type); setChallengeMode(false); }}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all duration-200 ${
                treeType === type 
                  ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/5