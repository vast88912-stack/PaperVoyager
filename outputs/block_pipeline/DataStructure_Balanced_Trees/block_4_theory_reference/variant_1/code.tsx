import React, { useState } from 'react';

// --- Icons ---
const BookOpenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
  </svg>
);

const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const AlertTriangleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const ArrowRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);

// --- Shared SVG Components ---
type NodeProps = { x: number; y: number; label: string; type?: 'normal' | 'red' | 'black' | 'subtree'; subLabel?: string };
type EdgeProps = { x1: number; y1: number; x2: number; y2: number; dashed?: boolean };

const TreeEdge = ({ x1, y1, x2, y2, dashed }: EdgeProps) => (
  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#94a3b8" strokeWidth="2" strokeDasharray={dashed ? "4 4" : "0"} />
);

const TreeNode = ({ x, y, label, type = 'normal', subLabel }: NodeProps) => {
  let fill = "#ffffff";
  let stroke = "#334155";
  let textFill = "#0f172a";

  if (type === 'red') { fill = "#fee2e2"; stroke = "#ef4444"; textFill = "#991b1b"; }
  if (type === 'black') { fill = "#1e293b"; stroke = "#0f172a"; textFill = "#f8fafc"; }
  if (type === 'subtree') {
    return (
      <g transform={`translate(${x}, ${y})`}>
        <polygon points="0,-15 -15,15 15,15" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
        <text x="0" y="8" textAnchor="middle" fontSize="12" className="font-mono font-medium" fill="#475569">{label}</text>
      </g>
    );
  }

  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx="0" cy="0" r="16" fill={fill} stroke={stroke} strokeWidth="2" />
      <text x="0" y={subLabel ? "-2" : "4"} textAnchor="middle" fontSize="14" className="font-mono font-bold" fill={textFill}>{label}</text>
      {subLabel && <text x="0" y="10" textAnchor="middle" fontSize="9" className="font-mono" fill={textFill}>{subLabel}</text>}
    </g>
  );
};

// --- Specific Rotation Diagrams ---
const AVLRightRotation = () => (
  <div className="flex items-center justify-center gap-8 p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
    <svg width="160" height="140" viewBox="0 0 160 140">
      <TreeEdge x1="80" y1="20" x2="40" y2="60" />
      <TreeEdge x1="80" y1="20" x2="120" y2="60" />
      <TreeEdge x1="40" y1="60" x2="20" y2="100" />
      <TreeEdge x1="40" y1="60" x2="60" y2="100" />
      <TreeNode x={80} y={20} label="Y" />
      <TreeNode x={40} y={60} label="X" />
      <TreeNode x={120} y={60} label="T4" type="subtree" />
      <TreeNode x={20} y={100} label="Z" />
      <TreeNode x={60} y={100} label="T3" type="subtree" />
    </svg>
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">Right Rotate (Y)</span>
      <ArrowRightIcon />
    </div>
    <svg width="160" height="140" viewBox="0 0 160 140">
      <TreeEdge x1="80" y1="20" x2="40" y2="60" />
      <TreeEdge x1="80" y1="20" x2="120" y2="60" />
      <TreeEdge x1="120" y1="60" x2="100" y2="100" />
      <TreeEdge x1="120" y1="60" x2="140" y2="100" />
      <TreeNode x={80} y={20} label="X" />
      <TreeNode x={40} y={60} label="Z" />
      <TreeNode x={120} y={60} label="Y" />
      <TreeNode x={100} y={100} label="T3" type="subtree" />
      <TreeNode x={140} y={100} label="T4" type="subtree" />
    </svg>
  </div>
);

const AVLLeftRightRotation = () => (
  <div className="flex items-center justify-center gap-4 p-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
    <svg width="120" height="140" viewBox="0 0 120 140">
      <TreeEdge x1="80" y1="20" x2="40" y2="60" />
      <TreeEdge x1="40" y1="60" x2="60" y2="100" />
      <TreeNode x={80} y={20} label="Z" />
      <TreeNode x={40} y={60} label="X" />
      <TreeNode x={60} y={100} label="Y" />
    </svg>
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-mono font-semibold text-slate-500">Left Rot (X)</span>
      <ArrowRightIcon />
    </div>
    <svg width="120" height="140" viewBox="0 0 120 140">
      <TreeEdge x1="80" y1="20" x2="40" y2="60" />
      <TreeEdge x1="40" y1="60" x2="20" y2="100" />
      <TreeNode x={80} y={20} label="Z" />
      <TreeNode x={40} y={60} label="Y" />
      <TreeNode x={20} y={100} label="X" />
    </svg>
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-mono font-semibold text-slate-500">Right Rot (Z)</span>
      <ArrowRightIcon />
    </div>
    <svg width="120" height="140" viewBox="0 0 120 140">
      <TreeEdge x1="60" y1="20" x2="30" y2="60" />
      <TreeEdge x1="60" y1="20" x2="90" y2="60" />
      <TreeNode x={60} y={20} label="Y" />
      <TreeNode x={30} y={60} label="X" />
      <TreeNode x={90} y={60} label="Z" />
    </svg>
  </div>
);

const RBColorFlip = () => (
  <div className="flex items-center justify-center gap-8 p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
    <svg width="120" height="100" viewBox="0 0 120 100">
      <TreeEdge x1="60" y1="20" x2="30" y2="60" />
      <TreeEdge x1="60" y1="20" x2="90" y2="60" />
      <TreeNode x={60} y={20} label="B" type="black" />
      <TreeNode x={30} y={60} label="R" type="red" />
      <TreeNode x={90} y={60} label="R" type="red" />
    </svg>
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-mono font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">Color Flip</span>
      <ArrowRightIcon />
    </div>
    <svg width="120" height="100" viewBox="0 0 120 100">
      <TreeEdge x1="60" y1="20" x2="30" y2="60" />
      <TreeEdge x1="60" y1="20" x2="90" y2="60" />
      <TreeNode x={60} y={20} label="R" type="red" />
      <TreeNode x={30} y={60} label="B" type="black" />
      <TreeNode x={90} y={60} label="B" type="black" />
    </svg>
  </div>
);

const TreapRotation = () => (
  <div className="flex items-center justify-center gap-8 p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
    <svg width="160" height="140" viewBox="0 0 160 140">
      <TreeEdge x1="80" y1="20" x2="40" y2="60" />
      <TreeEdge x1="80" y1="20" x2="120" y2="60" />
      <TreeEdge x1="40" y1="60" x2="20" y2="100" />
      <TreeEdge x1="40" y1="60" x2="60" y2="100" />
      <TreeNode x={80} y={20} label="K:50" subLabel="P:20" />
      <TreeNode x={40} y={60} label="K:30" subLabel="P:85" />
      <TreeNode x={120} y={60} label="T3" type="subtree" />
      <TreeNode x={20} y={100} label="T1" type="subtree" />
      <TreeNode x={60} y={100} label="T2" type="subtree" />
    </svg>
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-mono font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Heap Violation!</span>
      <span className="text-[10px] text-slate-500">Right Rotate</span>
      <ArrowRightIcon />
    </div>
    <svg width="160" height="140" viewBox="0 0 160 140">
      <TreeEdge x1="80" y1="20" x2="40" y2="60" />
      <TreeEdge x1="80" y1="20" x2="120" y2="60" />
      <TreeEdge x1="120" y1="60" x2="100" y2="100" />
      <TreeEdge x1="120" y1="60" x2="140" y2="100" />
      <TreeNode x={80} y={20} label="K:30" subLabel="P:85" />
      <TreeNode x={40} y={60} label="T1" type="subtree" />
      <TreeNode x={120} y={60} label="K:50" subLabel="P:20" />
      <TreeNode x={100} y={100} label="T2" type="subtree" />
      <TreeNode x={140} y={100} label="T3" type="subtree" />
    </svg>
  </div>
);

// --- Content Sections ---
const AVLSection = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <CheckCircleIcon /> Core Invariant
        </h3>
        <p className="text-slate-600 mb-4 leading-relaxed">
          An AVL tree is a self-balancing binary search tree where the heights of the two child subtrees of <em>any</em> node differ by at most one.
        </p>
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 font-mono text-sm text-slate-800">
          <span className="text-blue-600 font-semibold">Balance Factor (BF)</span> = Height(Left) - Height(Right)<br />
          Valid BF values: <span className="bg-blue-100 px-1 rounded">-1, 0, +1</span>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <AlertTriangleIcon /> Imbalance Cases
        </h3>
        <ul className="space-y-3 text-sm text-slate-700">
          <li className="flex gap-3"><span className="font-mono font-bold w-8">LL</span> Left-heavy tree. Fixed by a single Right Rotation.</li>
          <li className="flex gap-3"><span className="font-mono font-bold w-8">RR</span> Right-heavy tree. Fixed by a single Left Rotation.</li>
          <li className="flex gap-3"><span className="font-mono font-bold w-8">LR</span> Left child is right-heavy. Fixed by Left-Right double rotation.</li>
          <li className="flex gap-3"><span className="font-mono font-bold w-8">RL</span> Right child is left-heavy. Fixed by Right-Left double rotation.</li>
        </ul>
      </div>
    </div>

    <div>
      <h3 className="text-xl font-bold text-slate-900 mb-6 border-b border-slate-200 pb-2">Rotation Reference</h3>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="space-y-3">
          <h4 className="font-semibold text-slate-800">Single Right Rotation (LL Case)</h4>
          <p className="text-sm text-slate-500">Applied when a node's left child has a left-heavy subtree.</p>
          <AVLRightRotation />
        </div>
        <div className="space-y-3">
          <h4 className="font-semibold text-slate-800">Double Rotation (LR Case)</h4>
          <p className="text-sm text-slate-500">First left-rotate the child, then right-rotate the root.</p>
          <AVLLeftRightRotation />
        </div>
      </div>
    </div>
  </div>
);

const RedBlackSection = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
        <CheckCircleIcon /> The 5 Red-Black Properties
      </h3>
      <ol className="list-decimal list-inside space-y-3 text-slate-700">
        <li>Every node is either <span className="font-semibold text-red-600">red</span> or <span className="font-semibold text-slate-900">black</span>.</li>
        <li>The root is always <span className="font-semibold text-slate-900">black</span>.</li>
        <li>Every leaf (NIL) is <span className="font-semibold text-slate-900">black</span>.</li>
        <li>If a node is <span className="font-semibold text-red-600">red</span>, then both its children are <span className="font-semibold text-slate-900">black</span>. <span className="text-sm text-slate-500">(No two adjacent red nodes on a path)</span></li>
        <li>For each node, all simple paths from the node to descendant leaves contain the same number of <span className="font-semibold text-slate-900">black</span> nodes. <span className="text-sm text-slate-500 font-mono">(Black-Height invariant)</span></li>
      </ol>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Insertion: Uncle is Red</h3>
        <p className="text-sm text-slate-600 mb-6">
          When inserting a new Red node, if its parent is Red and its "uncle" is also Red, we perform a <strong>Color Flip</strong> and push the redness up the tree. No rotations are needed in this step.
        </p>
        <RBColorFlip />
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Insertion: Uncle is Black</h3>
        <p className="text-sm text-slate-600 mb-6">
          If the parent is Red but the uncle is Black (or NIL), pushing color up would violate the black-height property. We must perform <strong>Rotations</strong> (similar to AVL) followed by recoloring the new root and its children.
        </p>
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 font-mono text-xs text-slate-800 leading-relaxed">
          // Example: LL Case (Parent is Left, Node is Left)<br/>
          1. Right-Rotate(Grandparent)<br/>
          2. Swap colors of Parent and Grandparent
        </div>
      </div>
    </div>
  </div>
);

const TreapSection = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
        <CheckCircleIcon /> Dual Invariants (Tree + Heap)
      </h3>
      <p className="text-slate-600 mb-4 leading-relaxed">
        A Treap (Tree + Heap) is a randomized binary search tree. Every node stores two values: a <strong>Key</strong> and a <strong>Priority</strong>.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h4 className="font-bold text-slate-800 mb-2 font-mono">1. BST Property</h4>
          <p className="text-sm text-slate-600">Applies to the <span className="font-mono font-semibold">Keys</span>. Left children are smaller, right children are larger.</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h4 className="font-bold text-slate-800 mb-2 font-mono">2. Heap Property</h4>
          <p className="text-sm text-slate-600">Applies to the <span className="font-mono font-semibold">Priorities</span>. A parent's priority must be greater than or equal to its children's priorities (Max-Heap).</p>
        </div>
      </div>
    </div>

    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 mb-4">Insertion Mechanics</h3>
      <p className="text-sm text-slate-600 mb-6">
        To insert, first generate a random priority. Insert the node as a standard BST leaf using its Key. Then, while the node's priority is greater than its parent's priority, rotate the node upwards.
      </p>
      <TreapRotation />
      <p className="text-xs text-center text-slate-500 mt-4">
        Because priorities are random, the expected height of a Treap is <span className="font-mono">O(log n)</span>.
      </p>