import React, { useState, useEffect, useMemo, useRef } from 'react';

// --- Types & Interfaces ---

type TreeType = 'AVL' | 'Red-Black' | 'Treap';
type NodeColor = 'RED' | 'BLACK';

interface TreeNode {
  id: string;
  value: number;
  priority: number;
  color: NodeColor;
  left: TreeNode | null;
  right: TreeNode | null;
  height: number;
}

interface LayoutNode extends TreeNode {
  x: number;
  y: number;
}

// --- Helper Functions ---

const generateId = () => Math.random().toString(36).substr(2, 9);

const createNode = (value: number, isRoot: boolean = false): TreeNode => ({
  id: generateId(),
  value,
  priority: Math.floor(Math.random() * 100),
  color: isRoot ? 'BLACK' : 'RED',
  left: null,
  right: null,
  height: 1,
});

const updateHeight = (node: TreeNode | null): number => {
  if (!node) return 0;
  const leftH = node.left ? node.left.height : 0;
  const rightH = node.right ? node.right.height : 0;
  node.height = Math.max(leftH, rightH) + 1;
  return node.height;
};

const getBalance = (node: TreeNode | null): number => {
  if (!node) return 0;
  const leftH = node.left ? node.left.height : 0;
  const rightH = node.right ? node.right.height : 0;
  return leftH - rightH;
};

// Deep clone to ensure React state updates trigger re-renders
const cloneTree = (node: TreeNode | null): TreeNode | null => {
  if (!node) return null;
  return {
    ...node,
    left: cloneTree(node.left),
    right: cloneTree(node.right),
  };
};

const insertNode = (root: TreeNode | null, value: number): TreeNode => {
  if (!root) return createNode(value, true);
  
  const insertRecursive = (node: TreeNode | null, val: number): TreeNode => {
    if (!node) return createNode(val);
    if (val < node.value) {
      node.left = insertRecursive(node.left, val);
    } else if (val > node.value) {
      node.right = insertRecursive(node.right, val);
    }
    updateHeight(node);
    return node;
  };

  const newRoot = insertRecursive(cloneTree(root), value);
  if (newRoot.color === 'RED') newRoot.color = 'BLACK'; // Root is always black in RB
  return newRoot;
};

const deleteNode = (root: TreeNode | null, value: number): TreeNode | null => {
  if (!root) return null;
  
  const deleteRecursive = (node: TreeNode | null, val: number): TreeNode | null => {
    if (!node) return null;
    if (val < node.value) {
      node.left = deleteRecursive(node.left, val);
    } else if (val > node.value) {
      node.right = deleteRecursive(node.right, val);
    } else {
      if (!node.left) return node.right;
      if (!node.right) return node.left;
      
      // Node with two children: get inorder successor
      let minNode = node.right;
      while (minNode.left) minNode = minNode.left;
      
      node.value = minNode.value;
      node.priority = minNode.priority; // Swap priority too
      node.right = deleteRecursive(node.right, minNode.value);
    }
    updateHeight(node);
    return node;
  };

  return deleteRecursive(cloneTree(root), value);
};

// Rotations
const rotateLeft = (node: TreeNode): TreeNode => {
  if (!node.right) return node;
  const newRoot = node.right;
  node.right = newRoot.left;
  newRoot.left = node;
  updateHeight(node);
  updateHeight(newRoot);
  return newRoot;
};

const rotateRight = (node: TreeNode): TreeNode => {
  if (!node.left) return node;
  const newRoot = node.left;
  node.left = newRoot.right;
  newRoot.right = node;
  updateHeight(node);
  updateHeight(newRoot);
  return newRoot;
};

const applyRotation = (root: TreeNode | null, targetId: string, direction: 'LEFT' | 'RIGHT'): TreeNode | null => {
  if (!root) return null;
  
  const rotateRecursive = (node: TreeNode | null): TreeNode | null => {
    if (!node) return null;
    if (node.id === targetId) {
      return direction === 'LEFT' ? rotateLeft(node) : rotateRight(node);
    }
    node.left = rotateRecursive(node.left);
    node.right = rotateRecursive(node.right);
    updateHeight(node);
    return node;
  };

  return rotateRecursive(cloneTree(root));
};

// Traversals
const getInOrder = (node: TreeNode | null, acc: number[] = []) => {
  if (node) {
    getInOrder(node.left, acc);
    acc.push(node.value);
    getInOrder(node.right, acc);
  }
  return acc;
};

const getPreOrder = (node: TreeNode | null, acc: number[] = []) => {
  if (node) {
    acc.push(node.value);
    getPreOrder(node.left, acc);
    getPreOrder(node.right, acc);
  }
  return acc;
};

const getPostOrder = (node: TreeNode | null, acc: number[] = []) => {
  if (node) {
    getPostOrder(node.left, acc);
    getPostOrder(node.right, acc);
    acc.push(node.value);
  }
  return acc;
};

// Layout Algorithm
const computeLayout = (root: TreeNode | null, width: number, height: number): LayoutNode[] => {
  const nodes: LayoutNode[] = [];
  if (!root) return nodes;

  const traverse = (node: TreeNode, x: number, y: number, dx: number) => {
    nodes.push({ ...node, x, y });
    if (node.left) traverse(node.left, x - dx, y + 80, dx / 2);
    if (node.right) traverse(node.right, x + dx, y + 80, dx / 2);
  };

  traverse(root, width / 2, 40, width / 4);
  return nodes;
};

// --- Main Component ---

export default function App() {
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [treeType, setTreeType] = useState<TreeType>('AVL');
  const [inputValue, setInputValue] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [challengeMode, setChallengeMode] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('Welcome to Balanced BST Studio.');

  // Initialize with some data
  useEffect(() => {
    let t: TreeNode | null = null;
    [50, 25, 75, 15, 35, 60, 85].forEach(val => {
      t = insertNode(t, val);
    });
    setTree(t);
  }, []);

  const handleInsert = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(inputValue);
    if (!isNaN(val)) {
      setTree(prev => insertNode(prev, val));
      setMessage(`Inserted ${val}`);
      setInputValue('');
    }
  };

  const handleDelete = () => {
    const val = parseInt(inputValue);
    if (!isNaN(val)) {
      setTree(prev => deleteNode(prev, val));
      setMessage(`Deleted ${val}`);
      setInputValue('');
      setSelectedNodeId(null);
    }
  };

  const handleRotate = (direction: 'LEFT' | 'RIGHT') => {
    if (!selectedNodeId) return;
    setTree(prev => applyRotation(prev, selectedNodeId, direction));
    setMessage(`Rotated ${direction.toLowerCase()} on selected node.`);
  };

  const toggleColor = () => {
    if (!selectedNodeId || treeType !== 'Red-Black') return;
    const toggleRecursive = (node: TreeNode | null): TreeNode | null => {
      if (!node) return null;
      if (node.id === selectedNodeId) {
        node.color = node.color === 'RED' ? 'BLACK' : 'RED';
      }
      node.left = toggleRecursive(node.left);
      node.right = toggleRecursive(node.right);
      return node;
    };
    setTree(prev => toggleRecursive(cloneTree(prev)));
  };

  const generateChallenge = () => {
    let t: TreeNode | null = null;
    // Create an obviously unbalanced tree
    [10, 20, 30, 40, 50].forEach(val => { t = insertNode(t, val); });
    setTree(t);
    setChallengeMode(true);
    setTreeType('AVL');
    setMessage('Challenge: Use left rotations to balance this tree!');
    setSelectedNodeId(null);
  };

  const layoutNodes = useMemo(() => computeLayout(tree, 1000, 600), [tree]);

  // Invariant checks
  const isAVLBalanced = useMemo(() => {
    if (!tree) return true;
    let balanced = true;
    const check = (node: TreeNode | null) => {
      if (!node) return;
      if (Math.abs(getBalance(node)) > 1) balanced = false;
      check(node.left);
      check(node.right);
    };
    check(tree);
    return balanced;
  }, [tree]);

  const isTreapValid = useMemo(() => {
    if (!tree) return true;
    let valid = true;
    const check = (node: TreeNode | null) => {
      if (!node) return;
      if (node.left && node.left.priority > node.priority) valid = false;
      if (node.right && node.right.priority > node.priority) valid = false;
      check(node.left);
      check(node.right);
    };
    check(tree);
    return valid;
  }, [tree]);

  // Render Helpers
  const renderNode = (n: LayoutNode) => {
    const isSelected = n.id === selectedNodeId;
    let bgFill = '#ffffff';
    let textFill = '#0f172a';
    let strokeColor = isSelected ? '#3b82f6' : '#cbd5e1';
    let strokeWidth = isSelected ? 3 : 2;

    if (treeType === 'Red-Black') {
      bgFill = n.color === 'RED' ? '#ef4444' : '#1e293b';
      textFill = '#ffffff';
      strokeColor = isSelected ? '#fbbf24' : bgFill;
    }

    return (
      <g 
        key={n.id} 
        className="cursor-pointer"
        onClick={() => setSelectedNodeId(n.id)}
        style={{ transform: `translate(${n.x}px, ${n.y}px)`, transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        <circle
          r={24}
          fill={bgFill}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          className="shadow-sm drop-shadow-md"
        />
        <text
          y={treeType === 'Treap' ? -2 : 0}
          textAnchor="middle"
          alignmentBaseline="middle"
          fill={textFill}
          className="font-mono text-sm font-semibold pointer-events-none"
        >
          {n.value}
        </text>
        {treeType === 'Treap' && (
          <text
            y={12}
            textAnchor="middle"
            alignmentBaseline="middle"
            fill={textFill}
            className="font-mono text-[10px] opacity-80 pointer-events-none"
          >
            p:{n.priority}
          </text>
        )}
        {treeType === 'AVL' && (
          <text
            x={28}
            y={-20}
            fill={Math.abs(getBalance(n)) > 1 ? '#ef4444' : '#64748b'}
            className="font-mono text-xs font-bold pointer-events-none"
          >
            bf:{getBalance(n)}
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col items-center p-6 space-y-6">
      
      {/* Hero / Header */}
      <header className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Balanced BST Studio</h1>
          <p className="text-sm text-slate-500 mt-1">Interactive playground for tree rotations and invariants.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
          {(['AVL', 'Red-Black', 'Treap'] as TreeType[]).map(type => (
            <button
              key={type}
              onClick={() => { setTreeType(type); setChallengeMode(false); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                treeType === type 
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </header>

      {/* Main Layout */}
      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Sidebar: Controls & Invariants */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* Controls Panel */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Operations</h2>
            <form onSubmit={handleInsert} className="flex gap-2">
              <input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Key..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="submit" className="px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
                Ins
              </button>
              <button type="button" onClick={handleDelete} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-200 hover:bg-red-100 transition-colors">
                Del
              </button>
            </form>

            <div className="h-px bg-slate-100 w-full my-1"></div>

            <div className="flex flex-col gap-2">
              <span className="text-xs text-slate-500 font-medium">Selected Node Actions:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRotate('LEFT')}
                  disabled={!selectedNodeId}
                  className="flex-1 px-3 py-2 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
                >
                  <span className="text-lg leading-none">↶</span> Left
                </button>
                <button
                  onClick={() => handleRotate('RIGHT')}
                  disabled={!selectedNodeId}
                  className="flex-1 px-3 py-2 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
                >
                  Right <span className="text-lg leading-none">↷</span>
                </button>
              </div>
              {treeType === 'Red-Black' && (
                <button
                  onClick={toggleColor}
                  disabled={!selectedNodeId}
                  className="w-full mt-2 px-3 py-2 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-slate-200 transition-colors"
                >
                  Toggle Color
                </button>
              )}
            </div>

            <button
              onClick={generateChallenge}
              className="mt-2 w-full px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors"
            >
              Start Challenge Mode
            </button>
          </section>

          {/* Invariant Panel */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Invariants</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Tree Height:</span>
                <span className="font-mono font-bold">{tree ? tree.height : 0}</span>
              </div>
              
              {treeType === 'AVL' && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">AVL Balanced:</span>
                  <span className={`font-mono font-bold ${isAVLBalanced ? 'text-green-600' : 'text-red-600'}`}>
                    {isAVLBalanced ? 'YES' : 'NO'}
                  </span>
                </div>
              )}

              {treeType === 'Red-Black' && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Root is Black:</span>
                  <span className={`font-mono font-bold ${tree?.color === 'BLACK' ? 'text-green-600' : 'text-red-600'}`}>
                    {tree ? (tree.color === 'BLACK' ? 'YES' : 'NO') : 'N/A'}
                  </span>
                </div>
              )}

              {treeType === 'Treap' && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Heap Property:</span>
                  <span className={`font-mono font-bold ${isTreapValid ? 'text-green-600' : 'text-red-600'}`}>
                    {isTreapValid ? 'YES' : 'NO'}
                  </span>
                </div>
              )}

              <div className="h-px bg-slate-100 w-full my-1"></div>
              
              <div className="text-xs text-slate-500">
                {treeType === 'AVL' && "AVL Trees maintain balance factors between -1 and 1 via rotations."}
                {treeType === 'Red-Black' && "Red-Black Trees ensure no two adjacent red nodes and uniform black-height."}
                {treeType === 'Treap' && "Treaps maintain BST ordering for keys and Max-Heap ordering for priorities."}
              </div>
            </div>
          </section>

        </div>

        {/* Right Area: Canvas & Traversals */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          
          {/* Message / Status Bar */}
          <div className={`px-4 py-3 rounded-xl border text-sm font-medium flex items-center ${challengeMode ? 'bg-indigo-50 border-indigo-200 text-indigo-800' : 'bg-white border-slate-200 text-slate-700'}`}>
            <span className="mr-2">{challengeMode ? '🎯' : 'ℹ️'}</span> {message}
          </div>

          {/* SVG Canvas */}