import React, { useState } from 'react';

// --- Shared Components ---

const Code = ({ children }: { children: React.ReactNode }) => (
  <span className="font-mono text-sm bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded border border-slate-300">
    {children}
  </span>
);

const MathBlock = ({ children }: { children: React.ReactNode }) => (
  <div className="font-mono text-center my-4 p-4 bg-slate-100 rounded-lg border border-slate-200 text-slate-700 shadow-inner">
    {children}
  </div>
);

const Card = ({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) => (
  <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm ${className}`}>
    <h3 className="text-xl font-semibold mb-4 text-slate-900 border-b border-slate-100 pb-2">{title}</h3>
    <div className="text-slate-700 space-y-4 leading-relaxed">
      {children}
    </div>
  </div>
);

// --- Interactive SVG Rotation Visualizer ---

const RotationVisualizer = () => {
  const [rotated, setRotated] = useState(false);
  const [rotationType, setRotationType] = useState<'right' | 'left'>('right');

  // Coordinates for Right Rotation (Pre)
  // Root: Y(150, 40), Left: X(90, 100), Right: C(210, 100)
  // X-Left: A(50, 160), X-Right: B(130, 160)
  
  // Coordinates for Right Rotation (Post)
  // Root: X(150, 40), Left: A(90, 100), Right: Y(210, 100)
  // Y-Left: B(170, 160), Y-Right: C(250, 160)

  // We mirror for Left Rotation

  const getNodes = () => {
    if (rotationType === 'right') {
      return rotated ? [
        { id: 'X', x: 150, y: 40, color: 'fill-blue-100 stroke-blue-600', text: 'X' },
        { id: 'A', x: 90, y: 100, color: 'fill-slate-100 stroke-slate-400', text: 'A' },
        { id: 'Y', x: 210, y: 100, color: 'fill-indigo-100 stroke-indigo-600', text: 'Y' },
        { id: 'B', x: 170, y: 160, color: 'fill-slate-100 stroke-slate-400', text: 'B' },
        { id: 'C', x: 250, y: 160, color: 'fill-slate-100 stroke-slate-400', text: 'C' },
      ] : [
        { id: 'Y', x: 150, y: 40, color: 'fill-indigo-100 stroke-indigo-600', text: 'Y' },
        { id: 'X', x: 90, y: 100, color: 'fill-blue-100 stroke-blue-600', text: 'X' },
        { id: 'C', x: 210, y: 100, color: 'fill-slate-100 stroke-slate-400', text: 'C' },
        { id: 'A', x: 50, y: 160, color: 'fill-slate-100 stroke-slate-400', text: 'A' },
        { id: 'B', x: 130, y: 160, color: 'fill-slate-100 stroke-slate-400', text: 'B' },
      ];
    } else {
      return rotated ? [
        { id: 'Y', x: 150, y: 40, color: 'fill-indigo-100 stroke-indigo-600', text: 'Y' },
        { id: 'X', x: 90, y: 100, color: 'fill-blue-100 stroke-blue-600', text: 'X' },
        { id: 'C', x: 210, y: 100, color: 'fill-slate-100 stroke-slate-400', text: 'C' },
        { id: 'A', x: 50, y: 160, color: 'fill-slate-100 stroke-slate-400', text: 'A' },
        { id: 'B', x: 130, y: 160, color: 'fill-slate-100 stroke-slate-400', text: 'B' },
      ] : [
        { id: 'X', x: 150, y: 40, color: 'fill-blue-100 stroke-blue-600', text: 'X' },
        { id: 'A', x: 90, y: 100, color: 'fill-slate-100 stroke-slate-400', text: 'A' },
        { id: 'Y', x: 210, y: 100, color: 'fill-indigo-100 stroke-indigo-600', text: 'Y' },
        { id: 'B', x: 170, y: 160, color: 'fill-slate-100 stroke-slate-400', text: 'B' },
        { id: 'C', x: 250, y: 160, color: 'fill-slate-100 stroke-slate-400', text: 'C' },
      ];
    }
  };

  const getEdges = () => {
    if (rotationType === 'right') {
      return rotated ? [
        { x1: 150, y1: 40, x2: 90, y2: 100 }, // X -> A
        { x1: 150, y1: 40, x2: 210, y2: 100 }, // X -> Y
        { x1: 210, y1: 100, x2: 170, y2: 160 }, // Y -> B
        { x1: 210, y1: 100, x2: 250, y2: 160 }, // Y -> C
      ] : [
        { x1: 150, y1: 40, x2: 90, y2: 100 }, // Y -> X
        { x1: 150, y1: 40, x2: 210, y2: 100 }, // Y -> C
        { x1: 90, y1: 100, x2: 50, y2: 160 }, // X -> A
        { x1: 90, y1: 100, x2: 130, y2: 160 }, // X -> B
      ];
    } else {
      return rotated ? [
        { x1: 150, y1: 40, x2: 90, y2: 100 }, // Y -> X
        { x1: 150, y1: 40, x2: 210, y2: 100 }, // Y -> C
        { x1: 90, y1: 100, x2: 50, y2: 160 }, // X -> A
        { x1: 90, y1: 100, x2: 130, y2: 160 }, // X -> B
      ] : [
        { x1: 150, y1: 40, x2: 90, y2: 100 }, // X -> A
        { x1: 150, y1: 40, x2: 210, y2: 100 }, // X -> Y
        { x1: 210, y1: 100, x2: 170, y2: 160 }, // Y -> B
        { x1: 210, y1: 100, x2: 250, y2: 160 }, // Y -> C
      ];
    }
  };

  return (
    <Card title="Rotation Mechanics Reference" className="md:col-span-2">
      <div className="flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex-1 space-y-4">
          <p>
            Rotations are the fundamental building blocks for balancing binary search trees. 
            They alter the structure of the tree while preserving the <strong>Binary Search Tree Property</strong> <Code>Left &lt; Root &lt; Right</Code>.
          </p>
          <div className="flex gap-2">
            <button 
              onClick={() => { setRotationType('right'); setRotated(false); }}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${rotationType === 'right' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Right Rotate (Zig)
            </button>
            <button 
              onClick={() => { setRotationType('left'); setRotated(false); }}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${rotationType === 'left' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Left Rotate (Zag)
            </button>
          </div>
          <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg shadow-inner">
            <div className="font-mono text-sm text-slate-800 space-y-1">
              {rotationType === 'right' ? (
                <>
                  <div><span className="text-purple-600">function</span> rightRotate(Y):</div>
                  <div className="pl-4">X = Y.left</div>
                  <div className="pl-4">Y.left = X.right</div>
                  <div className="pl-4">X.right = Y</div>
                  <div className="pl-4"><span className="text-purple-600">return</span> X</div>
                </>
              ) : (
                <>
                  <div><span className="text-purple-600">function</span> leftRotate(X):</div>
                  <div className="pl-4">Y = X.right</div>
                  <div className="pl-4">X.right = Y.left</div>
                  <div className="pl-4">Y.left = X</div>
                  <div className="pl-4"><span className="text-purple-600">return</span> Y</div>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col items-center">
          <svg viewBox="0 0 300 200" className="w-full max-w-sm h-48 bg-white border border-slate-200 rounded-xl shadow-sm transition-all duration-500">
            <g className="transition-all duration-500">
              {getEdges().map((edge, i) => (
                <line key={`edge-${i}`} x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2} stroke="#cbd5e1" strokeWidth="2" />
              ))}
              {getNodes().map((node) => (
                <g key={node.id} style={{ transform: `translate(${node.x}px, ${node.y}px)`, transition: 'transform 0.5s ease-in-out' }}>
                  <circle cx="0" cy="0" r="16" className={`stroke-2 ${node.color}`} />
                  <text x="0" y="5" textAnchor="middle" className="font-mono text-sm font-bold fill-current text-slate-700">{node.text}</text>
                </g>
              ))}
            </g>
          </svg>
          <button 
            onClick={() => setRotated(!rotated)}
            className="mt-4 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-semibold shadow-sm transition-all flex items-center gap-2"
          >
            <span>{rotated ? 'Revert Rotation' : 'Perform Rotation'}</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </Card>
  );
};

// --- Theory Sections ---

const AVLTheory = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
    <Card title="AVL Tree Invariants">
      <p>
        Named after inventors <strong>A</strong>delson-<strong>V</strong>elsky and <strong>L</strong>andis, an AVL tree is a self-balancing binary search tree where the height difference between left and right subtrees is strictly bounded.
      </p>
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r mt-4">
        <h4 className="font-semibold text-blue-800 mb-1">The Balance Property</h4>
        <p className="text-sm text-blue-900">
          For every node <Code>N</Code>, the heights of its left and right subtrees differ by at most 1.
        </p>
        <MathBlock>
          BalanceFactor(N) = Height(N.left) - Height(N.right)<br/>
          BalanceFactor(N) ∈ {'{'} -1, 0, 1 {'}'}
        </MathBlock>
      </div>
    </Card>

    <Card title="Restoring Balance (Rotations)">
      <p>
        When an insertion or deletion causes a node's balance factor to become <Code>2</Code> or <Code>-2</Code>, the tree must be rebalanced using rotations.
      </p>
      <ul className="space-y-3 mt-4 text-sm">
        <li className="flex items-start gap-3">
          <div className="bg-slate-800 text-white px-2 py-1 rounded font-mono text-xs mt-0.5 w-10 text-center">LL</div>
          <div><strong>Left-Left Case:</strong> The insertion occurred in the left subtree of the left child. Fixed with a single <strong>Right Rotation</strong>.</div>
        </li>
        <li className="flex items-start gap-3">
          <div className="bg-slate-800 text-white px-2 py-1 rounded font-mono text-xs mt-0.5 w-10 text-center">RR</div>
          <div><strong>Right-Right Case:</strong> The insertion occurred in the right subtree of the right child. Fixed with a single <strong>Left Rotation</strong>.</div>
        </li>
        <li className="flex items-start gap-3">
          <div className="bg-indigo-600 text-white px-2 py-1 rounded font-mono text-xs mt-0.5 w-10 text-center">LR</div>
          <div><strong>Left-Right Case:</strong> Left rotation on the left child, then Right rotation on the node.</div>
        </li>
        <li className="flex items-start gap-3">
          <div className="bg-indigo-600 text-white px-2 py-1 rounded font-mono text-xs mt-0.5 w-10 text-center">RL</div>
          <div><strong>Right-Left Case:</strong> Right rotation on the right child, then Left rotation on the node.</div>
        </li>
      </ul>
    </Card>
  </div>
);

const RedBlackTheory = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
    <Card title="Red-Black Properties">
      <p>
        A Red-Black tree relies on node coloring and specific structural constraints to guarantee a roughly balanced tree, ensuring <Code>O(log n)</Code> operations.
      </p>
      <ul className="space-y-2 mt-4 list-decimal list-inside text-sm">
        <li className="p-2 bg-slate-50 rounded border border-slate-100">Every node is either <span className="text-red-600 font-bold">Red</span> or <span className="text-slate-800 font-bold">Black</span>.</li>
        <li className="p-2 bg-slate-50 rounded border border-slate-100">The root is always <span className="text-slate-800 font-bold">Black</span>.</li>
        <li className="p-2 bg-slate-50 rounded border border-slate-100">All null/leaf leaves (NIL) are <span className="text-slate-800 font-bold">Black</span>.</li>
        <li className="p-2 bg-red-50 rounded border border-red-100 text-red-900">If a node is <span className="text-red-600 font-bold">Red</span>, both its children must be <span className="text-slate-800 font-bold">Black</span>. (No consecutive red nodes).</li>
        <li className="p-2 bg-slate-50 rounded border border-slate-100">Every path from a given node to any of its descendant NIL nodes goes through the same number of <span className="text-slate-800 font-bold">Black</span> nodes (Black-Height).</li>
      </ul>
    </Card>

    <Card title="Insertion Cases">
      <p>
        New nodes are always inserted as <span className="text-red-600 font-bold">Red</span> to preserve the black-height. Fixes depend on the color of the node's <strong>Uncle</strong>.
      </p>
      <div className="mt-4 space-y-4 text-sm">
        <div className="border-l-4 border-red-400 pl-3">
          <h4 className="font-semibold text-slate-800">Case 1: Uncle is Red</h4>
          <p className="text-slate-600 mt-1">Recolor parent and uncle to Black, recolor grandparent to Red. Move up the tree to check grandparent.</p>
        </div>
        <div className="border-l-4 border-slate-800 pl-3">
          <h4 className="font-semibold text-slate-800">Case 2: Uncle is Black (Triangle)</h4>
          <p className="text-slate-600 mt-1">Node is a right child, parent is a left child (or vice versa). Perform rotation on parent to convert to Case 3.</p>
        </div>
        <div className="border-l-4 border-slate-800 pl-3">
          <h4 className="font-semibold text-slate-800">Case 3: Uncle is Black (Line)</h4>
          <p className="text-slate-600 mt-1">Node is a left child, parent is a left child. Perform rotation on grandparent and swap colors of parent and grandparent.</p>
        </div>
      </div>
    </Card>
  </div>
);

const TreapTheory = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
    <Card title="Treap = Tree + Heap">
      <p>
        A Treap is a probabilistic balanced BST. Each node contains two values: a <Code>Key</Code> and a randomly generated <Code>Priority</Code>.
      </p>
      <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
        <div className="bg-emerald-50 p-3 rounded border border-emerald-100">
          <h4 className="font-bold text-emerald-800 mb-1">BST Property</h4>
          <p className="text-emerald-900">Maintained using the <strong>Keys</strong>. Standard left &lt; root &lt; right ordering.</p>
        </div>
        <div className="bg-purple-50 p-3 rounded border border-purple-100">
          <h4 className="font-bold text-purple-800 mb-1">Heap Property</h4>
          <p className="text-purple-900">Maintained using the <strong>Priorities</strong>. Parent priority ≥ Child priority (Max-Heap).</p>
        </div>
      </div>
      <MathBlock>
        Node = {'{'} Key: K, Priority: P {'}'}<br/>
        K(left) &lt; K(root) &lt; K(right)<br/>
        P(root) ≥ P(left) AND P(root) ≥ P(right)
      </MathBlock>
    </Card>

    <Card title="Insertion & Rotations">
      <p>
        Because priorities are random, a Treap's structure is completely determined by the set of (key, priority) pairs, independent of insertion order. This yields <Code>O(log n)</Code> expected depth.
      </p>
      <ol className="list-decimal list-inside space-y-2 mt-4 text-sm">
        <li className="p-2">Insert the node as a standard BST leaf using its <strong>Key</strong>.</li>
        <li className="p-2">Assign a random <strong>Priority</strong> to the new node.</li>
        <li className="p-2 bg-purple-50 rounded border border-purple-100 text-purple-900">
          While the node's priority is greater than its parent's priority (violating the Heap property), perform rotations to pull the node up:
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-slate-700">
            <li>If node is a Left child: <strong>Right Rotate</strong> parent.</li>
            <li>If node is a Right child: <strong>Left Rotate</strong> parent.</li>
          </ul>
        </li>
      </ol>
    </Card>
  </div>
);

// --- Main Application Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'AVL' | 'RedBlack' | 'Treap'>('AVL');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="mb-10 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-3 flex items-center justify-center md:justify-start gap-3">
            <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Theory & Reference
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl">
            Understand the mathematical invariants and rotation mechanics underlying balanced Binary Search Trees.
          </p>
        </header>

        {/* Global Rotation Visualizer */}
        <RotationVisualizer />

        {/* Tree Type Tabs */}
        <div className="flex space-x-2 bg-slate-200 p-1.5 rounded-xl max-w-fit mx-auto md:mx-0 shadow-sm">
          {(['AVL', 'RedBlack', 'Treap'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
              }`}
            >
              {tab === 'RedBlack' ? 'Red-Black' : tab} Trees
            </button>
          ))}
        </div>

        {/* Dynamic Content Rendering */}
        <div className="min-h-[400px]">
          {activeTab === 'AVL' && <AVLTheory />}
          {activeTab === 'RedBlack' && <RedBlackTheory />}
          {activeTab === 'Treap' && <TreapTheory />}
        </div>

        {/* Complexity Cheat Sheet */}
        <Card title="Time Complexity Cheat Sheet" className="mt-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="py-3 px-4 text-slate-500 font-semibold text-sm">Data Structure</th>
                  <th className="py-3 px-4 text-slate-500 font-semibold text-sm">Search (Avg)</th>
                  <th className="py-3 px-4 text-slate-500 font-semibold text-sm">Insert (Avg)</th>