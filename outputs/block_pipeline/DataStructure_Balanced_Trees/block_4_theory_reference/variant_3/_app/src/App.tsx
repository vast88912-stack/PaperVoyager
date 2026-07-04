import React, { useState } from 'react';

// --- Types ---
type Tab = 'avl' | 'rbt' | 'treap' | 'rotations';

// --- Helper Components ---
const Code = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <code className={`font-mono bg-slate-200 text-indigo-700 px-1.5 py-0.5 rounded text-sm ${className}`}>
    {children}
  </code>
);

const MathBlock = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-slate-100 border-l-4 border-indigo-500 p-4 my-4 font-mono text-sm text-slate-800 overflow-x-auto shadow-sm">
    {children}
  </div>
);

const SectionHeading = ({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) => (
  <h2 className="text-2xl font-semibold text-slate-900 mb-4 flex items-center border-b pb-2 border-slate-200">
    {icon && <span className="mr-3 text-indigo-600">{icon}</span>}
    {children}
  </h2>
);

const Card = ({ title, children, badge }: { title: string; children: React.ReactNode; badge?: string }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      {badge && (
        <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800">
          {badge}
        </span>
      )}
    </div>
    <div className="text-slate-600 leading-relaxed">
      {children}
    </div>
  </div>
);

// --- SVG Diagrams ---
const RotationDiagram = ({ type }: { type: 'left' | 'right' }) => {
  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-8 bg-slate-50 rounded-xl border border-slate-200 my-6">
      {/* Before */}
      <svg width="200" height="200" viewBox="0 0 200 200" className="drop-shadow-sm">
        <g stroke="#94a3b8" strokeWidth="2" fill="none">
          {type === 'left' ? (
            <>
              <path d="M100 40 L60 100" />
              <path d="M100 40 L140 100" />
              <path d="M140 100 L110 160" />
              <path d="M140 100 L170 160" />
            </>
          ) : (
            <>
              <path d="M100 40 L60 100" />
              <path d="M100 40 L140 100" />
              <path d="M60 100 L30 160" />
              <path d="M60 100 L90 160" />
            </>
          )}
        </g>
        <g className="font-mono text-sm font-bold text-slate-800 text-center" textAnchor="middle" dominantBaseline="middle">
          {type === 'left' ? (
            <>
              <circle cx="100" cy="40" r="18" fill="#e0e7ff" stroke="#6366f1" strokeWidth="3" />
              <text x="100" y="41">x</text>
              <rect x="40" y="100" width="40" height="24" rx="4" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
              <text x="60" y="113" fontSize="12">T1</text>
              <circle cx="140" cy="100" r="18" fill="#e0e7ff" stroke="#6366f1" strokeWidth="3" />
              <text x="140" y="101">y</text>
              <rect x="90" y="160" width="40" height="24" rx="4" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
              <text x="110" y="173" fontSize="12">T2</text>
              <rect x="150" y="160" width="40" height="24" rx="4" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
              <text x="170" y="173" fontSize="12">T3</text>
            </>
          ) : (
            <>
              <circle cx="100" cy="40" r="18" fill="#e0e7ff" stroke="#6366f1" strokeWidth="3" />
              <text x="100" y="41">y</text>
              <circle cx="60" cy="100" r="18" fill="#e0e7ff" stroke="#6366f1" strokeWidth="3" />
              <text x="60" y="101">x</text>
              <rect x="120" y="100" width="40" height="24" rx="4" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
              <text x="140" y="113" fontSize="12">T3</text>
              <rect x="10" y="160" width="40" height="24" rx="4" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
              <text x="30" y="173" fontSize="12">T1</text>
              <rect x="70" y="160" width="40" height="24" rx="4" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
              <text x="90" y="173" fontSize="12">T2</text>
            </>
          )}
        </g>
      </svg>

      {/* Arrow */}
      <div className="flex flex-col items-center">
        <span className="font-bold text-slate-500 mb-2 uppercase tracking-wide text-xs">
          {type === 'left' ? 'Left Rotate(x)' : 'Right Rotate(y)'}
        </span>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </div>

      {/* After */}
      <svg width="200" height="200" viewBox="0 0 200 200" className="drop-shadow-sm">
        <g stroke="#94a3b8" strokeWidth="2" fill="none">
          {type === 'left' ? (
            <>
              <path d="M100 40 L60 100" />
              <path d="M100 40 L140 100" />
              <path d="M60 100 L30 160" />
              <path d="M60 100 L90 160" />
            </>
          ) : (
            <>
              <path d="M100 40 L60 100" />
              <path d="M100 40 L140 100" />
              <path d="M140 100 L110 160" />
              <path d="M140 100 L170 160" />
            </>
          )}
        </g>
        <g className="font-mono text-sm font-bold text-slate-800 text-center" textAnchor="middle" dominantBaseline="middle">
          {type === 'left' ? (
            <>
              <circle cx="100" cy="40" r="18" fill="#e0e7ff" stroke="#6366f1" strokeWidth="3" />
              <text x="100" y="41">y</text>
              <circle cx="60" cy="100" r="18" fill="#e0e7ff" stroke="#6366f1" strokeWidth="3" />
              <text x="60" y="101">x</text>
              <rect x="120" y="100" width="40" height="24" rx="4" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
              <text x="140" y="113" fontSize="12">T3</text>
              <rect x="10" y="160" width="40" height="24" rx="4" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
              <text x="30" y="173" fontSize="12">T1</text>
              <rect x="70" y="160" width="40" height="24" rx="4" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
              <text x="90" y="173" fontSize="12">T2</text>
            </>
          ) : (
            <>
              <circle cx="100" cy="40" r="18" fill="#e0e7ff" stroke="#6366f1" strokeWidth="3" />
              <text x="100" y="41">x</text>
              <rect x="40" y="100" width="40" height="24" rx="4" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
              <text x="60" y="113" fontSize="12">T1</text>
              <circle cx="140" cy="100" r="18" fill="#e0e7ff" stroke="#6366f1" strokeWidth="3" />
              <text x="140" y="101">y</text>
              <rect x="90" y="160" width="40" height="24" rx="4" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
              <text x="110" y="173" fontSize="12">T2</text>
              <rect x="150" y="160" width="40" height="24" rx="4" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
              <text x="170" y="173" fontSize="12">T3</text>
            </>
          )}
        </g>
      </svg>
    </div>
  );
};

// --- Main Component ---
export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('avl');

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans selection:bg-indigo-200">
      {/* Header */}
      <header className="bg-slate-900 text-white pt-16 pb-12 px-6 border-b-4 border-indigo-500">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">
            Balanced BST <span className="text-indigo-400">Theory & Reference</span>
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl">
            Understand the strict invariants, rotation strategies, and structural guarantees that keep Search Trees functioning in <Code className="bg-slate-800 text-indigo-300">O(log n)</Code> time.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-200 pb-px">
          {[
            { id: 'avl', label: 'AVL Trees', icon: <span className="font-serif italic mr-1">A</span> },
            { id: 'rbt', label: 'Red-Black Trees', icon: <span className="w-3 h-3 rounded-full bg-rose-500 mr-2 inline-block shadow-inner" /> },
            { id: 'treap', label: 'Treaps', icon: <span className="w-3 h-3 rounded-sm bg-amber-500 mr-2 inline-block transform rotate-45" /> },
            { id: 'rotations', label: 'Tree Rotations Reference', icon: <span className="mr-2">↻</span> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`
                flex items-center px-5 py-3 text-sm font-semibold rounded-t-lg transition-colors border-b-2
                ${activeTab === tab.id 
                  ? 'bg-slate-50 text-indigo-700 border-indigo-600' 
                  : 'text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900'}
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {/* AVL Content */}
          {activeTab === 'avl' && (
            <div className="space-y-8">
              <SectionHeading>Adelson-Velsky and Landis (AVL) Tree</SectionHeading>
              
              <div className="grid md:grid-cols-2 gap-6">
                <Card title="The AVL Invariant" badge="Strict Balance">
                  <p className="mb-4">
                    An AVL tree maintains height balance strictly. For every node in the tree, the difference in height between its left and right subtrees must not exceed 1.
                  </p>
                  <MathBlock>
                    BF(node) = Height(node.left) - Height(node.right)<br />
                    Invariant: BF(node) ∈ {'{'} -1, 0, 1 {'}'}
                  </MathBlock>
                  <p className="text-sm text-slate-500 mt-2">
                    Where <Code>Height</Code> of an empty subtree is defined as <Code>-1</Code> (or <Code>0</Code>, depending on convention).
                  </p>
                </Card>

                <Card title="Operational Guarantees" badge="O(log N)">
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-emerald-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      <span><strong>Lookup:</strong> Exceptionally fast due to strict balancing. Max height is roughly <Code>1.44 log₂(N)</Code>.</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-amber-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                      <span><strong>Insertion/Deletion:</strong> May require multiple rotations propagating up to the root to restore the balance factor.</span>
                    </li>
                  </ul>
                </Card>
              </div>

              <SectionHeading>Rebalancing Cases</SectionHeading>
              <div className="grid md:grid-cols-4 gap-4">
                {[
                  { name: 'Left-Left (LL)', action: 'Right Rotate', desc: 'Inserted into left child\'s left subtree.' },
                  { name: 'Right-Right (RR)', action: 'Left Rotate', desc: 'Inserted into right child\'s right subtree.' },
                  { name: 'Left-Right (LR)', action: 'Left Rotate, then Right Rotate', desc: 'Inserted into left child\'s right subtree.' },
                  { name: 'Right-Left (RL)', action: 'Right Rotate, then Left Rotate', desc: 'Inserted into right child\'s left subtree.' }
                ].map(caseItem => (
                  <div key={caseItem.name} className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                    <h4 className="font-bold text-slate-800 mb-1">{caseItem.name}</h4>
                    <p className="text-sm text-slate-600 mb-3">{caseItem.desc}</p>
                    <span className="text-xs font-mono bg-indigo-100 text-indigo-700 px-2 py-1 rounded block text-center">
                      {caseItem.action}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RBT Content */}
          {activeTab === 'rbt' && (
            <div className="space-y-8">
              <SectionHeading>Red-Black Tree</SectionHeading>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 px-6 py-4 border-b border-slate-800">
                  <h3 className="text-lg font-bold text-white flex items-center">
                    <span className="w-3 h-3 rounded-full bg-rose-500 mr-2"></span>
                    The 5 Structural Properties
                  </h3>
                </div>
                <div className="p-6">
                  <ol className="list-decimal list-inside space-y-4 text-slate-700">
                    <li className="pl-2"><strong>Node Color:</strong> Every node is colored either <span className="text-rose-600 font-bold">Red</span> or <span className="font-bold">Black</span>.</li>
                    <li className="pl-2"><strong>Root Property:</strong> The root of the tree is always <span className="font-bold">Black</span>.</li>
                    <li className="pl-2"><strong>Leaf Property:</strong> All leaves (NIL nodes) are considered <span className="font-bold">Black</span>.</li>
                    <li className="pl-2"><strong>Red Property:</strong> If a node is <span className="text-rose-600 font-bold">Red</span>, then both its children must be <span className="font-bold">Black</span>. <em className="text-slate-500">(No two red nodes can be adjacent on a path)</em>.</li>
                    <li className="pl-2"><strong>Black-Height Property:</strong> Every path from a given node to any of its descendant NIL nodes goes through the same number of <span className="font-bold">Black</span> nodes.</li>
                  </ol>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card title="Why use Red-Black Trees?" badge="Practical Speed">
                  <p className="mb-3">
                    While AVL trees are strictly balanced, Red-Black Trees offer a relaxed balance. The longest path from root to leaf is at most twice as long as the shortest path.
                  </p>
                  <p>
                    This relaxation means <strong>fewer rotations</strong> are needed during insertions and deletions, making them generally faster for write-heavy applications. RBTs are widely used in standard libraries (e.g., C++ <Code>std::map</Code>, Java <Code>TreeMap</Code>).
                  </p>
                </Card>
                
                <Card title="Insertion Strategy" badge="Color Flips">
                  <p className="mb-2">
                    New nodes are always inserted as <span className="text-rose-600 font-bold">Red</span> (to preserve black-height). If the parent is also red, a violation occurs. Fixes depend on the color of the <em>uncle</em> node:
                  </p>
                  <ul className="space-y-2 mt-3 text-sm">
                    <li><strong>Uncle is Red:</strong> Recolor parent, uncle, and grandparent. Push the violation up the tree.</li>
                    <li><strong>Uncle is Black (Line):</strong> Perform 1 rotation and recolor to fix locally.</li>
                    <li><strong>Uncle is Black (Triangle):</strong> Perform 2 rotations and recolor to fix locally.</li>
                  </ul>
                </Card>
              </div>
            </div>
          )}

          {/* Treap Content */}
          {activeTab === 'treap' && (
            <div className="space-y-8">
              <SectionHeading>Treap (Tree + Heap)</SectionHeading>
              
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <Card title="The Dual Invariant" badge="Randomized">
                  <p className="mb-4">
                    A Treap is a Cartesian tree where each node holds two values: a <strong>Key</strong> and a randomly generated <strong>Priority</strong>.
                  </p>
                  <MathBlock>
                    1. BST Property: Left.Key &lt; Node.Key &lt; Right.Key<br />
                    2. Heap Property: Node.Priority ≥ Children.Priority
                  </MathBlock>
                  <p className="text-sm mt-3 text-slate-600">
                    By generating priorities randomly, the tree assumes a shape equivalent to inserting the keys in a random order, yielding <Code>O(log N)</Code> expected height.
                  </p>
                </Card>

                <Card title="Core Operations" badge="Split / Merge">
                  <p className="mb-3">
                    Modern treaps often forgo rotations entirely in favor of two elegant recursive operations:
                  </p>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li className="p-2 bg-slate-50 rounded border border-slate-200">
                      <strong>Split(T, key):</strong> Divides tree T into two trees: L (keys ≤ key) and R (keys &gt; key).
                    </li>
                    <li className="p-2 bg-slate-50 rounded border border-slate-200">
                      <strong>Merge(L, R):</strong> Combines two trees back together, assuming all keys in L &lt; keys in R. The root is chosen based on highest priority.
                    </li>
                  </ul>
                </Card>
              </div>
            </div>
          )}

          {/* Rotations Content */}
          {activeTab === 'rotations' && (
            <div className="space-y-8">
              <SectionHeading>Tree Rotations Reference</SectionHeading>
              
              <p className="text-lg text-slate-600 max-w-3xl">
                Rotations are the fundamental operation used to change the shape of a Binary Search Tree without violating the BST invariant (in-order traversal order remains constant).
              </p>

              <div className="space-y-12">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Left Rotation</h3>
                  <p className="text-slate-600">Elevates the right child to the parent position. The original parent becomes the new left child.</p>
                  <RotationDiagram type="left" />
                  <div className="bg-slate-900 text-slate-300 p-4 rounded-lg font-mono text-sm overflow-x-auto shadow-inner">
<pre>{`function leftRotate(x) {
  let y = x.right;
  x.right = y.left;
  if (y.left != null) y.left.parent = x;
  y.parent = x.parent;
  // ... update root/parent pointers ...
  y.left = x;
  x.parent = y;
}`}</pre>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-12">
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Right Rotation</h3>
                  <p className="text-slate-600">Elevates the left child to the parent position. The original parent becomes the new right child.</p>
                  <RotationDiagram type="right" />
                  <div className="bg-slate-900 text-slate-300 p-4 rounded-lg font-mono text-sm overflow-x-auto shadow-inner">
<pre>{`function rightRotate(y) {
  let x = y.left;
  y.left = x.right;
  if (x.right != null) x.right.parent = y;
  x.parent = y.parent;
  // ... update root/parent pointers ...
  x.right = y;
  y.parent = x;
}`}</pre>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}