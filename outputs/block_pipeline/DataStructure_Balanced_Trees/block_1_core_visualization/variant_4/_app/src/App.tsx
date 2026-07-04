import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Play, RotateCcw, RotateCw, Plus, RefreshCw, ShieldAlert, ShieldCheck, Info } from 'lucide-react';

// --- Types & Interfaces ---

type TreeType = 'AVL' | 'RB' | 'TREAP';

interface TreeNode {
  id: string;
  key: number;
  left: TreeNode | null;
  right: TreeNode | null;
  height: number;
  priority: number;
  isRed: boolean;
}

interface LayoutNode extends TreeNode {
  x: number;
  y: number;
  left: LayoutNode | null;
  right: LayoutNode | null;
}

// --- Tree Logic Helpers ---

const createNode = (key: number): TreeNode => ({
  id: Math.random().toString(36).substring(2, 9),
  key,
  left: null,
  right: null,
  height: 1,
  priority: Math.floor(Math.random() * 100),
  isRed: true, // New nodes in RB are usually red
});

const updateHeight = (node: TreeNode | null): TreeNode | null => {
  if (!node) return null;
  node.height = 1 + Math.max(node.left?.height || 0, node.right?.height || 0);
  return node;
};

// Basic BST Insert
const insertNode = (root: TreeNode | null, key: number): TreeNode => {
  if (!root) return createNode(key);
  if (key < root.key) {
    return updateHeight({ ...root, left: insertNode(root.left, key) }) as TreeNode;
  } else if (key > root.key) {
    return updateHeight({ ...root, right: insertNode(root.right, key) }) as TreeNode;
  }
  return root; // No duplicates
};

// Generic Rotations
const rotateLeft = (node: TreeNode | null, targetKey: number): TreeNode | null => {
  if (!node) return null;
  if (node.key === targetKey) {
    if (!node.right) return node;
    const newRoot = { ...node.right };
    const newLeft = { ...node, right: newRoot.left };
    newRoot.left = updateHeight(newLeft);
    return updateHeight(newRoot);
  }
  if (targetKey < node.key) {
    return updateHeight({ ...node, left: rotateLeft(node.left, targetKey) });
  } else {
    return updateHeight({ ...node, right: rotateLeft(node.right, targetKey) });
  }
};

const rotateRight = (node: TreeNode | null, targetKey: number): TreeNode | null => {
  if (!node) return null;
  if (node.key === targetKey) {
    if (!node.left) return node;
    const newRoot = { ...node.left };
    const newRight = { ...node, left: newRoot.right };
    newRoot.right = updateHeight(newRight);
    return updateHeight(newRoot);
  }
  if (targetKey < node.key) {
    return updateHeight({ ...node, left: rotateRight(node.left, targetKey) });
  } else {
    return updateHeight({ ...node, right: rotateRight(node.right, targetKey) });
  }
};

const toggleNodeColor = (node: TreeNode | null, targetKey: number): TreeNode | null => {
  if (!node) return null;
  if (node.key === targetKey) {
    return { ...node, isRed: !node.isRed };
  }
  if (targetKey < node.key) {
    return { ...node, left: toggleNodeColor(node.left, targetKey) };
  } else {
    return { ...node, right: toggleNodeColor(node.right, targetKey) };
  }
};

// Traversals
const getTraversals = (root: TreeNode | null) => {
  const inOrder: number[] = [];
  const preOrder: number[] = [];
  const postOrder: number[] = [];

  const traverse = (node: TreeNode | null) => {
    if (!node) return;
    preOrder.push(node.key);
    traverse(node.left);
    inOrder.push(node.key);
    traverse(node.right);
    postOrder.push(node.key);
  };

  traverse(root);
  return { inOrder, preOrder, postOrder };
};

// Layout Algorithm
const computeLayout = (node: TreeNode | null, minX: number, maxX: number, depth: number): LayoutNode | null => {
  if (!node) return null;
  const x = (minX + maxX) / 2;
  const y = 40 + depth * 70;
  return {
    ...node,
    x,
    y,
    left: computeLayout(node.left, minX, x, depth + 1),
    right: computeLayout(node.right, x, maxX, depth + 1),
  };
};

// Validation
const checkInvariants = (root: TreeNode | null, type: TreeType): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (!root) return { valid: true, errors };

  const checkAVL = (node: TreeNode | null): number => {
    if (!node) return 0;
    const lh = checkAVL(node.left);
    const rh = checkAVL(node.right);
    if (Math.abs(lh - rh) > 1) {
      errors.push(`Node ${node.key} is unbalanced (L:${lh}, R:${rh})`);
    }
    return 1 + Math.max(lh, rh);
  };

  const checkTreap = (node: TreeNode | null) => {
    if (!node) return;
    if (node.left && node.left.priority > node.priority) {
      errors.push(`Node ${node.left.key} priority > Parent ${node.key}`);
    }
    if (node.right && node.right.priority > node.priority) {
      errors.push(`Node ${node.right.key} priority > Parent ${node.key}`);
    }
    checkTreap(node.left);
    checkTreap(node.right);
  };

  const checkRB = (node: TreeNode | null): number => {
    if (!node) return 1; // null is black
    if (node.isRed) {
      if (node.left?.isRed) errors.push(`Red-Red violation: ${node.key} -> ${node.left.key}`);
      if (node.right?.isRed) errors.push(`Red-Red violation: ${node.key} -> ${node.right.key}`);
    }
    const lbh = checkRB(node.left);
    const rbh = checkRB(node.right);
    if (lbh !== rbh && lbh !== -1 && rbh !== -1) {
      errors.push(`Black-height mismatch at Node ${node.key}`);
      return -1;
    }
    return (node.isRed ? 0 : 1) + (lbh !== -1 ? lbh : rbh);
  };

  if (type === 'AVL') checkAVL(root);
  if (type === 'TREAP') checkTreap(root);
  if (type === 'RB') {
    if (root.isRed) errors.push("Root must be black");
    checkRB(root);
  }

  return { valid: errors.length === 0, errors: Array.from(new Set(errors)) };
};


export default function App() {
  const [treeType, setTreeType] = useState<TreeType>('AVL');
  const [root, setRoot] = useState<TreeNode | null>(null);
  const [insertVal, setInsertVal] = useState<string>('');
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [challengeMode, setChallengeMode] = useState<boolean>(false);

  // Initialize with a default sequence
  useEffect(() => {
    loadSequence([20, 10, 30, 5, 15, 25, 35]);
  }, []);

  const loadSequence = (keys: number[]) => {
    let tr: TreeNode | null = null;
    keys.forEach(k => {
      tr = insertNode(tr, k);
    });
    // If RB, force root to black for a valid start
    if (tr && treeType === 'RB') tr.isRed = false;
    setRoot(tr);
    setSelectedNode(null);
  };

  const handleInsert = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(insertVal);
    if (!isNaN(val)) {
      setRoot(prev => insertNode(prev, val));
      setInsertVal('');
    }
  };

  const handleRotateLeft = (key: number) => setRoot(prev => rotateLeft(prev, key));
  const handleRotateRight = (key: number) => setRoot(prev => rotateRight(prev, key));
  const handleToggleColor = (key: number) => setRoot(prev => toggleNodeColor(prev, key));

  const startChallenge = () => {
    setChallengeMode(true);
    // Create an unbalanced right-heavy tree
    loadSequence([10, 20, 30, 40, 50]);
  };

  const layout = useMemo(() => computeLayout(root, 0, 1000, 0), [root]);
  const traversals = useMemo(() => getTraversals(root), [root]);
  const validation = useMemo(() => checkInvariants(root, treeType), [root, treeType]);

  const renderEdges = (node: LayoutNode | null): JSX.Element[] => {
    if (!node) return [];
    const edges: JSX.Element[] = [];
    if (node.left) {
      edges.push(
        <line
          key={`e-l-${node.key}`}
          x1={node.x} y1={node.y}
          x2={node.left.x} y2={node.left.y}
          className="stroke-slate-300 transition-all duration-500 ease-in-out"
          strokeWidth="2"
        />
      );
      edges.push(...renderEdges(node.left));
    }
    if (node.right) {
      edges.push(
        <line
          key={`e-r-${node.key}`}
          x1={node.x} y1={node.y}
          x2={node.right.x} y2={node.right.y}
          className="stroke-slate-300 transition-all duration-500 ease-in-out"
          strokeWidth="2"
        />
      );
      edges.push(...renderEdges(node.right));
    }
    return edges;
  };

  const renderNodes = (node: LayoutNode | null): JSX.Element[] => {
    if (!node) return [];
    const nodes: JSX.Element[] = [];

    let fillColor = "#ffffff";
    let strokeColor = "#0f172a";
    let textColor = "#0f172a";

    if (treeType === 'RB') {
      fillColor = node.isRed ? "#ef4444" : "#0f172a";
      strokeColor = fillColor;
      textColor = "#ffffff";
    }

    const isSelected = selectedNode === node.key;

    nodes.push(
      <g key={`n-${node.key}`} className="transition-all duration-500 ease-in-out" style={{ transform: `translate(${node.x}px, ${node.y}px)` }}>
        {/* Glow effect if selected */}
        {isSelected && <circle r="26" fill="#bfdbfe" className="animate-pulse" />}
        
        <circle
          r="20"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="2"
          className="cursor-pointer hover:brightness-110 drop-shadow-sm"
          onClick={() => setSelectedNode(isSelected ? null : node.key)}
        />
        <text
          textAnchor="middle"
          dy=".3em"
          fill={textColor}
          className="font-mono text-sm font-semibold pointer-events-none"
        >
          {node.key}
        </text>

        {/* Invariant Info attached to Node */}
        <text y="34" textAnchor="middle" className="text-[11px] fill-slate-500 font-mono pointer-events-none">
          {treeType === 'AVL' && `h=${node.height}`}
          {treeType === 'TREAP' && `p=${node.priority}`}
        </text>

        {/* Controls Overlay */}
        {isSelected && (
          <g className="opacity-100 transition-opacity z-10">
            {/* Left Rotate */}
            <g transform="translate(-36, -36)" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handleRotateLeft(node.key); }}>
              <rect width="24" height="24" rx="4" fill="#3b82f6" className="hover:fill-blue-600" />
              <text x="12" y="16" fill="white" fontSize="12" textAnchor="middle" className="font-bold pointer-events-none">L</text>
            </g>
            {/* Right Rotate */}
            <g transform="translate(12, -36)" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handleRotateRight(node.key); }}>
              <rect width="24" height="24" rx="4" fill="#3b82f6" className="hover:fill-blue-600" />
              <text x="12" y="16" fill="white" fontSize="12" textAnchor="middle" className="font-bold pointer-events-none">R</text>
            </g>
            {/* Color Toggle for RB */}
            {treeType === 'RB' && (
              <g transform="translate(-12, -46)" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handleToggleColor(node.key); }}>
                <rect width="24" height="20" rx="4" fill="#64748b" className="hover:fill-slate-600" />
                <circle cx="12" cy="10" r="4" fill={node.isRed ? '#0f172a' : '#ef4444'} className="pointer-events-none" />
              </g>
            )}
          </g>
        )}
      </g>
    );

    nodes.push(...renderNodes(node.left));
    nodes.push(...renderNodes(node.right));
    return nodes;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col overflow-hidden">
      {/* Hero Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <RefreshCw className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Balanced BST Studio</h1>
            <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Interactive Tree