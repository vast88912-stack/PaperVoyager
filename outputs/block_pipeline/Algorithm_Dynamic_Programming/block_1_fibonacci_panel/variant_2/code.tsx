import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Settings2 } from 'lucide-react';

// --- Types & Interfaces ---

type Mode = 'naive' | 'memo' | 'tabulation';

interface TreeNode {
  id: string;
  n: number;
  depth: number;
  parentId: string | null;
  x?: number;
  y?: number;
}

interface TreeTraceStep {
  type: 'CALL' | 'RETURN' | 'MEMO_HIT';
  activeNodeId: string;
  nodeValues: Record<string, number>;
  memoHits: string[];
  cache: Record<number, number>;
  description: string;
}

interface TabulationTraceStep {
  type: 'INIT' | 'READ' | 'WRITE';
  table: (number | null)[];
  activeIndices: number[];
  targetIndex: number | null;
  description: string;
}

type TraceStep = TreeTraceStep | TabulationTraceStep;

interface SimulationData {
  trace: TraceStep[];
  nodes?: TreeNode[];
  width?: number;
  height?: number;
  type: 'tree' | 'tabulation';
}

// --- Algorithm & Trace Generation ---

function generateSimulation(n: number, mode: Mode): SimulationData {
  if (mode === 'tabulation') {
    const trace: TabulationTraceStep[] = [];
    const table: (number | null)[] = Array(n + 1).fill(null);
    
    table[0] = 0;
    trace.push({
      type: 'INIT',
      table: [...table],
      activeIndices: [],
      targetIndex: 0,
      description: `Initialize base case: fib(0) = 0`,
    });

    if (n > 0) {
      table[1] = 1;
      trace.push({
        type: 'INIT',
        table: [...table],
        activeIndices: [],
        targetIndex: 1,
        description: `Initialize base case: fib(1) = 1`,
      });
    }

    for (let i = 2; i <= n; i++) {
      trace.push({
        type: 'READ',
        table: [...table],
        activeIndices: [i - 1, i - 2],
        targetIndex: i,
        description: `To compute fib(${i}), read fib(${i - 1}) and fib(${i - 2})`,
      });

      table[i] = (table[i - 1] as number) + (table[i - 2] as number);
      trace.push({
        type: 'WRITE',
        table: [...table],
        activeIndices: [i - 1, i - 2],
        targetIndex: i,
        description: `Write fib(${i}) = ${table[i - 1]} + ${table[i - 2]} = ${table[i]}`,
      });
    }

    return { trace, type: 'tabulation' };
  }

  // Tree-based modes (Naive & Memo)
  const trace: TreeTraceStep[] = [];
  const nodes: TreeNode[] = [];
  const cache: Record<number, number> = {};
  const nodeValues: Record<string, number> = {};
  const memoHits: string[] = [];

  function pushTrace(type: TreeTraceStep['type'], id: string, currN: number, desc: string) {
    trace.push({
      type,
      activeNodeId: id,
      nodeValues: { ...nodeValues },
      memoHits: [...memoHits],
      cache: { ...cache },
      description: desc,
    });
  }

  function calc(currN: number, id: string, depth: number, parentId: string | null): number {
    nodes.push({ id, n: currN, depth, parentId });
    pushTrace('CALL', id, currN, `Computing fib(${currN})`);

    if (mode === 'memo' && cache[currN] !== undefined) {
      memoHits.push(id);
      nodeValues[id] = cache[currN];
      pushTrace('MEMO_HIT', id, currN, `Cache hit! fib(${currN}) is already computed as ${cache[currN]}`);
      return cache[currN];
    }

    if (currN <= 1) {
      if (mode === 'memo') cache[currN] = currN;
      nodeValues[id] = currN;
      pushTrace('RETURN', id, currN, `Base case reached: fib(${currN}) = ${currN}`);
      return currN;
    }

    const left = calc(currN - 1, id + 'L', depth + 1, id);
    pushTrace('CALL', id, currN, `Resuming fib(${currN}), now compute right child fib(${currN - 2})`);
    
    const right = calc(currN - 2, id + 'R', depth + 1, id);

    const val = left + right;
    if (mode === 'memo') cache[currN] = val;
    nodeValues[id] = val;
    pushTrace('RETURN', id, currN, `Completed fib(${currN}) = ${left} + ${right} = ${val}`);
    
    return val;
  }

  calc(n, 'root', 0, null);

  // Layout Computation (In-order traversal to assign X ranks, prevents overlaps)
  const treeMap: Record<string, TreeNode & { left: string | null; right: string | null; xRank?: number }> = {};
  nodes.forEach((node) => (treeMap[node.id] = { ...node, left: null, right: null }));
  nodes.forEach((node) => {
    if (node.parentId) {
      if (node.id.endsWith('L')) treeMap[node.parentId].left = node.id;
      else treeMap[node.parentId].right = node.id;
    }
  });

  let currentRank = 0;
  function inOrder(id: string | null) {
    if (!id) return;
    inOrder(treeMap[id].left);
    treeMap[id].xRank = currentRank++;
    inOrder(treeMap[id].right);
  }
  inOrder('root');

  const X_SPACING = 55;
  const Y_SPACING = 70;
  const PADDING_X = 60;
  const PADDING_Y = 60;

  let maxX = 0;
  let maxY = 0;

  nodes.forEach((node) => {
    node.x = (treeMap[node.id].xRank ?? 0) * X_SPACING + PADDING_X;
    node.y = node.depth * Y_SPACING + PADDING_Y;
    if (node.x > maxX) maxX = node.x;
    if (node.y > maxY) maxY = node.y;
  });

  return {
    trace,
    nodes,
    width: maxX + PADDING_X,
    height: maxY + PADDING_Y,
    type: 'tree',
  };
}

// ---