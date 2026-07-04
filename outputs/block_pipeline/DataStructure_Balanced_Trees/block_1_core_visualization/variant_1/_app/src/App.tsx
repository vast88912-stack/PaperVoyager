import React, { useState, useEffect, useMemo, useCallback } from 'react';

// --- Types ---
type TreeType = 'AVL' | 'Red-Black' | 'Treap';

interface TreeNode {
  id: string;
  key: number;
  left: TreeNode | null;
  right: TreeNode | null;
  height: number;
  color: 'RED' | 'BLACK';
  priority: number;
}

interface LayoutNode extends TreeNode {
  x: number;
  y: number;
  px?: number; // parent x
  py?: number; // parent y
}

// --- Helper Functions ---

const createNode = (key: number, color: 'RED' | 'BLACK' = 'RED'): TreeNode => ({
  id: key.toString(),
  key,
  left: null,
  right: null,
  height: 1,
  color,
  priority: Math.floor(Math.random() * 100) + 1,
});

const updateHeights = (node: TreeNode | null): number => {
  if (!node) return 0;
  const lh = updateHeights(node.left);
  const rh = updateHeights(node.right);
  node.height = Math.max(lh, rh) + 1;
  return node.height;
};

const getBalance = (node: TreeNode | null): number => {
  if (!node) return 0;
  const lh = node.left ? node.left.height : 0;
  const rh = node.right ? node.right.height : 0;
  return lh - rh;
};

// Standard BST Insert (intentionally doesn't auto-balance to allow manual challenge)
const insertBST = (root: TreeNode | null, key: number): TreeNode => {
  if (!root) return createNode(key);
  if (key < root.key) {
    root.left = insertBST(root.left, key);
  } else if (key > root.key) {
    root.right = insertBST(root.right, key);
  }
  updateHeights(root);
  return { ...root };
};

const deleteBST = (root: TreeNode | null, key: number): TreeNode | null => {
  if (!root) return null;
  if (key < root.key) {
    root.left = deleteBST(root.left, key);
  } else if (key > root.key) {
    root.right = deleteBST(root.right, key);
  } else {
    if (!root.left) return root.right;
    if (!root.right) return root.left;
    let minNode = root.right;
    while (minNode.left) minNode = minNode.left;
    root.key = minNode.key;
    root.id = minNode.id;
    root.priority = minNode.priority;
    root.color = minNode.color;
    root.right = deleteBST(root.right, minNode.key);
  }
  updateHeights(root);
  return { ...root };
};

// Immutable Rotations
const rotateLeft = (root: TreeNode | null, targetKey: number): TreeNode | null => {
  if (!root) return null;
  if (root.key === targetKey) {
    if (!root.right) return root; // Cannot rotate left
    const newRoot = { ...root.right };
    root.right = newRoot.left;
    newRoot.left = { ...root };
    updateHeights(newRoot.left);
    updateHeights(newRoot);
    return newRoot;
  }
  if (targetKey < root.key) {
    root.left = rotateLeft(root.left, targetKey);
  } else {
    root.right = rotateLeft(root.right, targetKey);
  }
  updateHeights(root);
  return { ...root };
};

const rotateRight = (root: TreeNode | null, targetKey: number): TreeNode | null => {
  if (!root) return null;
  if (root.key === targetKey) {
    if (!root.left) return root; // Cannot rotate right
    const newRoot = { ...root.left };
    root.left = newRoot.right;
    newRoot.right = { ...root };
    updateHeights(newRoot.right);
    updateHeights(newRoot);
    return newRoot;
  }
  if (targetKey < root.key) {
    root.left = rotateRight(root.left, targetKey);
  } else {
    root.right = rotateRight(root.right, targetKey);
  }
  updateHeights(root);
  return { ...root };
};

const toggleColor = (root: TreeNode | null, targetKey: number): TreeNode | null => {
  if (!root) return null;
  if (root.key === targetKey) {
    return { ...root, color: root.color === 'RED' ? 'BLACK' : 'RED' };
  }
  if (targetKey < root.key) {
    root.left = toggleColor(root.left, targetKey);
  } else {
    root.right = toggleColor(root.right, targetKey);
  }
  return { ...root };
};

// Traversals
const getInOrder = (node: TreeNode | null): number[] => {
  return node ? [...getInOrder(node.left), node.key, ...getInOrder(node.right)] : [];
};
const getPreOrder = (node: TreeNode | null): number[] => {
  return node ? [node.key, ...getPreOrder(node.left), ...getPreOrder(node.right)] : [];
};
const getPostOrder = (node: TreeNode | null): number[] => {
  return node ? [...getPostOrder(node.left), ...getPostOrder(node.right), node.key] : [];
};

// Layout Calculation
const computeLayout = (
  node: TreeNode | null,
  x: number,
  y: number,
  dx: number,
  dy: number,
  px?: number,
  py?: number
): LayoutNode[] => {
  if (!node) return [];
  const current: LayoutNode = { ...node, x, y, px, py };
  const lefts = computeLayout(node.left, x - dx, y + dy, dx * 0.5, dy, x, y);
  const rights = computeLayout(node.right, x + dx, y + dy, dx * 0.5, dy, x, y);
  return [...lefts, current, ...rights];
};

// Initial Data Seeds
const generateSeedTree = (seed: number): TreeNode | null => {
  let root: TreeNode | null = null;
  const datasets = [
    [20, 10, 30, 5, 15, 25, 35], // Balanced
    [10, 20, 30, 40, 50], // Right heavy (Needs left rotations)
    [50, 40, 30, 20, 10], // Left heavy (Needs right rotations)
    [30, 10, 40, 20, 15], // Zig-zag
  ];
  const data = datasets[seed % datasets.length];
  data.forEach((val) => {
    root = insertBST(root, val);
  });
  // Fix initial colors for RB to look somewhat sane if selected
  if (root) {
    root.color = 'BLACK';
    if (root.left) root.left.color = 'RED';
    if (root.right) root.right.color = 'RED';
  }
  return root;
};

// --- Main Component ---
export default function App() {
  const [tree, setTree] = useState<TreeNode | null>(generateSeedTree(0));
  const [treeType, setTreeType] = useState<TreeType>('AVL');
  const [inputValue, setInputValue] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [seedIndex, setSeedIndex] = useState(0);

  const layoutNodes = useMemo(() => computeLayout(tree, 400, 40, 180, 70), [tree]);

  // Invariants Checking
  const invariants = useMemo(() => {
    const issues: string[] = [];
    if (!tree) return { valid: true, issues: ['Tree is empty.'] };

    if (treeType === 'AVL') {
      const checkAVL = (node: TreeNode | null) => {
        if (!node) return;
        const bal = getBalance(node);
        if (Math.abs(bal) > 1) {
          issues.push(`Node ${node.key} is unbalanced (factor: ${bal})`);
        }
        checkAVL(node.left);
        checkAVL(node.right);
      };
      checkAVL(tree);
      if (issues.length === 0) issues.push('All AVL invariants satisfied.');
    } else if (treeType === 'Red-Black') {
      if (tree.color !== 'BLACK') issues.push('Root must be BLACK.');
      const checkRB = (node: TreeNode | null): number => {
        if (!node) return 1; // Null leaves are black
        if (node.color === 'RED') {
          if (node.left?.color === 'RED') issues.push(`Red-Red violation: ${node.key} -> ${node.left.key}`);
          if (node.right?.color === 'RED') issues.push(`Red-Red violation: ${node.key} -> ${node.right.key}`);
        }
        const leftBH = checkRB(node.left);
        const rightBH = checkRB(node.right);
        if (leftBH !== rightBH && leftBH !== -1 && rightBH !== -1) {
          issues.push(`Black-height mismatch at node ${node.key} (L:${leftBH}, R:${rightBH})`);
          return -1;
        }
        return leftBH + (node.color === 'BLACK' ? 1 : 0);
      };
      checkRB(tree);
      if (issues.length === 0) issues.push('All Red-Black invariants satisfied.');
    } else if (treeType === 'Treap') {
      const checkTreap = (node: TreeNode | null) => {
        if (!node) return;
        if (node.left && node.left.priority < node.priority) {
          issues.push(`Min-Heap violation: ${node.left.key}(${node.left.priority}) < parent ${node.key}(${node.priority})`);
        }
        if (node.right && node.right.priority < node.priority) {
          issues.push(`Min-Heap violation: ${node.right.key}(${node.right.priority}) < parent ${node.key}(${node.priority})`);
        }
        checkTreap(node.left);
        checkTreap(node.right);
      };
      checkTreap(tree);
      if (issues.length === 0) issues.push('All Treap invariants satisfied.');
    }

    return { valid: issues.length === 1 && issues[0].includes('satisfied'), issues };
  }, [tree, treeType]);

  // Handlers
  const handleInsert = () => {
    const val = parseInt(inputValue);
    if (!isNaN(val)) {
      setTree((prev) => insertBST(prev, val));
      setInputValue('');
      setSelectedNodeId(val.toString());
    }
  };

  const handleDelete = () => {
    const val = parseInt(inputValue);
    if (!isNaN(val)) {
      setTree((prev) => deleteBST(prev, val));
      setInputValue('');
      setSelectedNodeId(null);
    }
  };

  const handleRotateLeft = () => {
    if (selectedNodeId) {
      setTree((prev) => rotateLeft(prev, parseInt(selectedNodeId)));
    }
  };

  const handleRotateRight = () => {
    if (selectedNodeId) {
      setTree((prev) => rotateRight(prev, parseInt(selectedNodeId)));
    }
  };

  const handleToggleColor = () => {
    if (selectedNodeId) {
      setTree((prev) => toggleColor(prev, parseInt(selectedNodeId)));
    }
  };

  const handleReset = () => {
    const nextSeed = seedIndex + 1;
    setSeedIndex(nextSeed);
    setTree(generateSeedTree(nextSeed));
    setSelectedNodeId(null);
  };

  const selectedNodeData = layoutNodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Hero Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row items-center justify-between shadow-sm z-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Balanced BST Studio</h1>
          <p className="text-sm text-slate-500 font-mono mt-1">ChatGPT Edition | Interactive Rotations & Invariants</p>
        </div>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            {(['AVL', 'Red-Black', 'Treap'] as TreeType[]).map((type) => (
              <button
                key={type}
                onClick={() => setTreeType(type)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  treeType === type ? 'bg-white shadow-sm text-indigo-600 border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
          >
            Load Next Seed
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Visualization Canvas */}
        <div className="flex-grow relative bg-slate-50 overflow-hidden flex flex-col">
          <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Challenge Mode</h3>
            <p className="text-sm text-slate-700 max-w-xs">
              Insert nodes to intentionally break the {treeType} tree. Then, click nodes and use the manual rotation controls to fix the invariants.
            </p>
          </div>

          {/* SVG Canvas */}
          <div className="flex-grow w-full h-full relative cursor-crosshair overflow-auto">
            <svg viewBox="0 0 800 500" className="w-full h-full min-w-[800px] min-h-[500px]">
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                </marker>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
                </filter>
              </defs>

              {/* Edges */}
              {layoutNodes.map((node) => {
                if (node.px === undefined || node.py === undefined) return null;
                return (
                  <line
                    key={`edge-${node.id}`}
                    x1={node.px}
                    y1={node.py}
                    x2={node.x}
                    y2={node.y}
                    stroke="#cbd5e1"
                    strokeWidth="2"
                    className="transition-all duration-500 ease-in-out"
                  />
                );
              })}

              {/* Nodes */}
              {layoutNodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                let fill = '#ffffff';
                let stroke = '#334155';
                let textColor = '#0f172a';

                if (treeType === 'AVL') {
                  fill = isSelected ? '#e0e7ff' : '#ffffff';
                  stroke = '#4f46e5';
                } else if (treeType === 'Red-Black') {
                  fill = node.color === 'RED' ? '#fef2f2' : '#1e293b';
                  stroke = node.color === 'RED' ? '#ef4444' : '#0f172a';
                  textColor = node.color === 'RED' ? '#991b1b' : '#f8fafc';
                  if (isSelected) stroke = '#3b82f6'; // highlight selection
                } else if (treeType === 'Treap') {
                  fill = isSelected ? '#dcfce7' : '#ffffff';
                  stroke = '#16a34a';
                }

                return (
                  <g
                    key={`node-${node.id}`}
                    transform={`translate(${node.x}, ${node.y})`}
                    className="transition-all duration-500 ease-in-out cursor-pointer"
                    onClick={() => setSelectedNodeId(node.id)}
                  >
                    <circle
                      r="20"
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isSelected ? '4' : '2'}
                      filter="url(#shadow)"
                      className="transition-all duration-300 hover:opacity-80"
                    />