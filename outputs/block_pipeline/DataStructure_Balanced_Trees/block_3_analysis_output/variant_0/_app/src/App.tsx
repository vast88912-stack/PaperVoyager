import React, { useState, useMemo } from 'react';
import { CheckCircle, AlertTriangle, ArrowRight, Activity, ListTree, ShieldAlert, RefreshCw } from 'lucide-react';

// Runtime dependencies: lucide-react, tailwindcss

// --- Types & Mock Data ---

type TreeType = 'AVL' | 'Red-Black' | 'Treap';

interface TreeNode {
  id: string;
  key: number;
  color?: 'RED' | 'BLACK';
  priority?: number;
  height?: number;
  left?: TreeNode;
  right?: TreeNode;
}

// Mock tree representing a slightly complex state to analyze
const mockTree: TreeNode = {
  id: 'root',
  key: 50,
  color: 'BLACK',
  priority: 0.2,
  height: 3,
  left: {
    id: 'l',
    key: 25,
    color: 'RED',
    priority: 0.4,
    height: 2,
    left: { id: 'll', key: 10, color: 'BLACK', priority: 0.7, height: 1 },
    right: { id: 'lr', key: 30, color: 'BLACK', priority: 0.5, height: 1 }
  },
  right: {
    id: 'r',
    key: 75,
    color: 'BLACK',
    priority: 0.3,
    height: 2,
    left: { id: 'rl', key: 60, color: 'RED', priority: 0.6, height: 1 },
    right: { id: 'rr', key: 80, color: 'RED', priority: 0.8, height: 1 }
  }
};

// --- Helper Functions ---

const getTraversals = (root: TreeNode | undefined) => {
  const inOrder: number[] = [];
  const preOrder: number[] = [];
  const postOrder: number[] = [];

  const traverse = (node: TreeNode | undefined) => {
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

// --- Components ---

export default function App() {
  const [treeType, setTreeType] = useState<TreeType>('Red-Black');
  const [challengeState, setChallengeState] = useState<'idle' | 'success' | 'error'>('idle');

  const traversals = useMemo(() => getTraversals(mockTree), []);

  // Mock analysis results based on tree type
  const analysis = useMemo(() => {
    switch (treeType) {
      case 'AVL':
        return {
          valid: true,
          metrics: [
            { label: 'Root Balance Factor', value: '0', status: 'ok' },
            { label: 'Max Height', value: '3', status: 'info' },
            { label: 'Left Subtree Height', value: '2', status: 'info' },
            { label: 'Right Subtree Height', value: '2', status: 'info' },
          ],
          logs: [
            'Node(50) BF = 2 - 2 = 0. Valid.',
            'Node(25) BF = 1 - 1 = 0. Valid.',
            'Node(75) BF = 1 - 1 = 0. Valid.'
          ]
        };
      case 'Red-Black':
        return {
          valid: false,
          metrics: [
            { label: 'Root Color', value: 'BLACK', status: 'ok' },
            { label: 'Black-Height (Left)', value: '2', status: 'ok' },
            { label: 'Black-Height (Right)', value: '2', status: 'ok' },
            { label: 'Red-Red Violations', value: '0', status: 'ok' }, // We'll pretend it's valid for the metrics, but challenge will introduce a break
          ],
          logs: [
            'Root is BLACK. Valid.',
            'All leaves (NIL) are BLACK. Valid.',
            'Path 50->25->10: BH=2',
            'Path 50->75->80: BH=2'
          ]
        };
      case 'Treap':
        return {
          valid: true,
          metrics: [
            { label: 'Heap Property', value: 'Min-Heap', status: 'ok' },
            { label: 'Root Priority', value: '0.20', status: 'info' },
            { label: 'Priority Violations', value: '0', status: 'ok' },
          ],
          logs: [
            'Node(50) p=0.2 < Node(25) p=0.4. Valid.',
            'Node(50) p=0.2 < Node(75) p=0.3. Valid.',
            'Node(25) p=0.4 < Node(10) p=0.7. Valid.'
          ]
        };
    }
  }, [treeType]);

  const challengeData = useMemo(() => {
    switch (treeType) {
      case 'AVL':
        return {
          scenario: 'Insertion of 28 caused Node(25) to become Right-Heavy (BF = -2). Node(30) is Left-Heavy (BF = +1).',
          options: ['Right Rotate (30)', 'Left Rotate (25)', 'Right-Left Rotate (25, 30)', 'Left-Right Rotate (25, 30)'],
          correct: 2
        };
      case 'Red-Black':
        return {
          scenario: 'Insertion of 85 (RED) as right child of 80 (RED). Parent 80 is RED, Uncle 60 is RED.',
          options: ['Left Rotate (75)', 'Right Rotate (80)', 'Color Flip (75, 60, 80)', 'Left-Right Rotate (75, 80)'],
          correct: 2
        };
      case 'Treap':
        return {
          scenario: 'Node 40 inserted as right child of 30. Its random priority is 0.1, which is less than Node 30 (0.5) and Node 25 (0.4).',
          options: ['Left Rotate (30) then Left Rotate (25)', 'Right Rotate (30) then Right Rotate (25)', 'Left Rotate (30) then Right Rotate (25)'],
          correct: 0
        };
    }
  }, [treeType]);

  const handleChallengeAnswer = (index: number) => {
    if (index === challengeData.correct) {
      setChallengeState('success');
    } else {
      setChallengeState('error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 font-sans selection:bg-indigo-100">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header & Controls */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Activity className="w-6 h-6 text-indigo-600" />
              Analysis & Output
            </h1>
            <p className="text-sm text-slate-500 mt-1">Real-time invariant tracking and traversal generation.</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            {(['AVL', 'Red-Black', 'Treap'] as TreeType[]).map((type) => (
              <button
                key={type}
                onClick={() => { setTreeType(type); setChallengeState('idle'); }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  treeType === type 
                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Invariants & Logs */}
          <div className="lg:col-span-1 space-y-6">
            {/* Invariant Panel */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-white tracking-wide uppercase">Invariant Status</h2>
              </div>
              <div className="p-4 space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-3">
                  {analysis.metrics.map((metric, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="text-xs text-slate-500 mb-1">{metric.label}</div>
                      <div className={`font-mono text-lg font-semibold ${
                        metric.status === 'ok' ? 'text-emerald-600' : 
                        metric.status === 'error' ? 'text-rose-600' : 'text-indigo-600'
                      }`}>
                        {metric.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Verification Logs</h3>
                  <div className="bg-slate-900 rounded-lg p-3 font-mono text-xs text-slate-300 space-y-1.5 h-40 overflow-y-auto">
                    {analysis.logs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-slate-600">{`[${(idx + 1).toString().padStart(2, '0')}]`}</span>
                        <span>{log}</span>
                      </div>
                    ))}
                    <div className="flex items-start gap-2 text-emerald-400 mt-2">
                      <span className="text-emerald-800">[OK]</span>
                      <span>{treeType} invariants satisfied.</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Traversals & Challenge */}
          <div className="lg:col-span-2 space-y-6 flex flex-col">
            
            {/* Traversal Viewer */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                <ListTree className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-700 tracking-wide uppercase">Live Traversals</h2>
              </div>
              <div className="p-5 space-y-5">
                {[
                  { label: 'In-Order', data: traversals.inOrder, desc: 'Sorted keys' },
                  { label: 'Pre-Order', data: traversals.preOrder, desc: 'Root, Left, Right' },
                  { label: 'Post-Order', data: traversals.postOrder, desc: 'Left, Right, Root' }
                ].map((trav, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="w-28 shrink-0">
                      <div className="text-sm font-semibold text-slate-700">{trav.label}</div>
                      <div className="text-xs text-slate-400">{trav.desc}</div>
                    </div>
                    <div className="flex-1 flex flex-wrap gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {trav.data.map((key, kIdx) => (
                        <React.Fragment key={kIdx}>
                          <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 bg-white border border-slate-200 rounded text-sm font-mono text-slate-700 shadow-sm">
                            {key}
                          </span>
                          {kIdx < trav.data.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-slate-300 self-center" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Challenge Mode */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
              <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-indigo-600" />
                  <h2 className="text-sm font-semibold text-indigo-900 tracking-wide uppercase">Challenge Mode: Fix the Tree</h2>
                </div>
                <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  {treeType}
                </span>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <div className="bg-rose-50 border border-rose-100 rounded-lg p-4 mb-5 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-rose-900 mb-1">Invariant Violation Detected</h3>
                    <p className="text-sm text-rose-700 leading-relaxed">
                      {challengeData.scenario}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 flex-1">
                  <p className="text-sm font-medium text-slate-700 mb-3">Select the correct operation sequence to restore invariants:</p>
                  {challengeData.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleChallengeAnswer(idx)}
                      disabled={challengeState === 'success'}
                      className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-mono transition-all ${
                        challengeState === 'success' && idx === challengeData.correct
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : challengeState === 'error' && idx !== challengeData.correct
                          ? 'bg-white border-slate-200 text-slate-400 opacity-50'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50'
                      }`}
                    >
                      <span className="inline-block w-6 text-slate-400 font-sans text-xs">{String.fromCharCode(65 + idx)}.</span>
                      {opt}
                    </button>
                  ))}
                </div>

                {/* Feedback Area */}
                <div className="mt-5 h-12 flex items-center">
                  {challengeState === 'success' && (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100 w-full animate-in fade-in slide-in-from-bottom-2">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Correct! The {treeType} invariants are restored.</span>
                      <button 
                        onClick={() => setChallengeState('idle')}
                        className="ml-auto text-xs underline hover:text-emerald-800"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                  {challengeState === 'error' && (
                    <div className="flex items-center gap-2 text-rose-600 bg-rose-50 px-4 py-2 rounded-lg border border-rose-100 w-full animate-in fade-in slide-in-from-bottom-2">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="text-sm font-medium">Incorrect operation. This would further violate invariants. Try again.</span>
                    </div>
                  )}
                </div>

              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}