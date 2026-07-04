import React, { useState, useEffect, useMemo, useRef } from 'react';

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

// --- Main Component ---

export default function App() {
  const [root, setRoot] = useState<BSTNode | null>(null);
  const [treeType, setTreeType] = useState<TreeType>('AVL');
  const [inputValue, setInputValue] = useState<string>('');
  const [selectedVal, setSelectedVal] = useState<number | null>(null);
  const [message, setMessage] = useState<string>('Welcome to Balanced BST Studio. Insert nodes to begin.');
  const [challengeMode, setChallengeMode] = useState<boolean>(true);

  // --- Tree Operations ---

  const insertNode = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(inputValue, 10);
    if (isNaN(val)) {
      setMessage('Please enter a valid integer.');
      return;
    }
    
    let newRoot = deepClone(root);
    let depth = 0;
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
          color: 'RED', // Default for RB
          priority: Math.floor(Math.random() * 100), // Default for Treap
        };
      }
      if (val < node.val) {
        node.left = insert(node.left, currentDepth + 1);
      } else if (val > node.val) {
        node.right = insert(node.right, currentDepth + 1);
      } else {
        setMessage(`Value ${val} already exists in the tree.`);
      }
      return node;
    };

    newRoot = insert(newRoot, 1);
    
    if (maxDepthExceeded) {
      setMessage('Maximum depth of 5 reached. Cannot insert deeper to maintain layout.');
      return;
    }

    updateHeights(newRoot);
    setRoot(newRoot);
    setInputValue('');
    setSelectedVal(val);
    setMessage(`Inserted ${val}. ${challengeMode ? 'Fix invariants manually!' : ''}`);
  };

  const deleteNode = () => {
    if (selectedVal === null) return;
    
    let newRoot = deepClone(root);
    
    const remove = (node: BSTNode | null, val: number): BSTNode | null => {
      if (!node) return null;
      if (val < node.val) {
        node.left = remove(node.left, val);
      } else if (val > node.val) {
        node.right = remove(node.right, val);
      } else {
        if (!node.left) return node.right;
        if (!node.right) return node.left;
        
        let minNode = node.right;
        while (minNode.left) minNode = minNode.left;
        node.val = minNode.val;
        node.priority = minNode.priority; // Copy priority too
        node.right = remove(node.right, minNode.val);
      }
      return node;
    };

    newRoot = remove(newRoot, selectedVal);
    updateHeights(newRoot);
    setRoot(newRoot);
    setSelectedVal(null);
    setMessage(`Deleted ${selectedVal}.`);
  };

  const applyRotation = (type: 'LEFT' | 'RIGHT') => {
    if (selectedVal === null) return;
    let newRoot = deepClone(root);
    let rotated = false;

    const rotate = (node: BSTNode | null): BSTNode | null => {
      if (!node) return null;
      
      if (node.val === selectedVal) {
        if (type === 'LEFT') {
          const r = node.right;
          if (!r) {
            setMessage('Cannot rotate left: no right child.');
            return node;
          }
          node.right = r.left;
          r.left = node;
          rotated = true;
          return r;
        } else {
          const l = node.left;
          if (!l) {
            setMessage('Cannot rotate right: no left child.');
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
      setMessage(`Performed ${type} rotation on ${selectedVal}.`);
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
    setMessage(`Toggled color of ${selectedVal}.`);
  };

  const clearTree = () => {
    setRoot(null);
    setSelectedVal(null);
    setMessage('Tree cleared.');
  };

  const loadPreset = () => {
    const vals = [20, 10, 30, 5, 15, 25, 35];
    let newRoot: BSTNode | null = null;
    
    const insert = (node: BSTNode | null, val: number): BSTNode | null => {
      if (!node) return { id: generateId(), val, left: null, right: null, height: 1, color: 'RED', priority: Math.floor(Math.random() * 100) };
      if (val < node.val) node.left = insert(node.left, val);
      else node.right = insert(node.right, val);
      return node;
    };

    vals.forEach(v => { newRoot = insert(newRoot, v); });
    updateHeights(newRoot);
    
    // Fix RB colors for preset
    if (newRoot) {
      newRoot.color = 'BLACK';
      if (newRoot.left) newRoot.left.color = 'BLACK';
      if (newRoot.right) newRoot.right.color = 'BLACK';
    }

    setRoot(newRoot);
    setMessage('Loaded perfect tree preset.');
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
    let base = 'transition-all duration-500 ease-in-out cursor-pointer ';
    
    if (treeType === 'AVL') {
      base += 'fill-blue-50 stroke-blue-500 stroke-2 ';
      if (isSelected) base += 'fill-blue-200 stroke-blue-700 stroke-[3px]';
    } else if (treeType === 'Red-Black') {
      if (node.color === 'RED') {
        base += 'fill-red-500 stroke-red-700 stroke-2 ';
        if (isSelected) base += 'fill-red-400 stroke-red-900 stroke-[3px]';
      } else {
        base += 'fill-slate-800 stroke-slate-900 stroke-2 ';
        if (isSelected) base += 'fill-slate-600 stroke-black stroke-[3px]';
      }
    } else if (treeType === 'Treap') {
      base += 'fill-emerald-50 stroke-emerald-500 stroke-2 ';
      if (isSelected) base += 'fill-emerald-200 stroke-emerald-700 stroke-[3px]';
    }
    
    return base;
  };

  const getTextColor = (node: LayoutNode) => {
    if (treeType === 'Red-Black') return 'fill-white';
    return 'fill-slate-800';
  };

  const getNodeMeta = (node: LayoutNode) => {
    if (treeType === 'AVL') {
      const lh = node.left?.height || 0;
      const rh = node.right?.height || 0;
      const bf = lh - rh;
      return `BF: ${bf > 0 ? '+' : ''}${bf}`;
    }
    if (treeType === 'Treap') return `P: ${node.priority}`;
    return '';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Balanced BST Studio</h1>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-100 p-1 rounded-lg border border-slate-200">
          {(['AVL', 'Red-Black', 'Treap'] as TreeType[]).map((type) => (
            <button
              key={type}
              onClick={() => { setTreeType(type); clearTree(); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                treeType === type 
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Column: Visualization */}
        <div className="flex-1 flex flex-col relative">
          {/* Toolbar */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10 pointer-events-none">
            <div className="bg-white/90 backdrop-blur p-3 rounded-xl shadow-sm border border-slate-200 pointer-events-auto flex flex-col gap-2">
              <form onSubmit={insertNode} className="flex gap-2">
                <input
                  type="number"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Enter value..."
                  className="w-32 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-