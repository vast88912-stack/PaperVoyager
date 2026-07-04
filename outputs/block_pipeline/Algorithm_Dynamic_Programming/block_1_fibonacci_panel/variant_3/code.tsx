import React, { useState, useEffect, useMemo, useRef } from 'react';

// --- Types & Interfaces ---

type Mode = 'naive' | 'memo' | 'tabulation';

interface TraceEvent {
  type: 'call' | 'return' | 'cache_hit' | 'init_table' | 'read_table' | 'write_table' | 'done';
  id?: number;
  parentId?: number | null;
  n?: number;
  value?: number;
  x?: number;
  y?: number;
  cacheWrite?: boolean;
  index?: number;
  indices?: number[];
  target?: number;
  message: string;
}

interface NodeInfo {
  id: number;
  n: number;
  parentId: number | null;
  value?: number;
  status: 'calling' | 'returned' | 'cache_hit';
  x: number;
  y: number;
}

// --- Trace Generators ---

function generateNaiveTrace(n: number): TraceEvent[] {
  const traces: TraceEvent[] = [];
  let idCounter = 0;

  function helper(currN: number, parentId: number | null, x: number, y: number, offset: number): number {
    const id = idCounter++;
    traces.push({ type: 'call', id, parentId, n: currN, x, y, message: `Calling fib(${currN})...` });

    if (currN <= 1) {
      traces.push({ type: 'return', id, n: currN, value: currN, message: `Base case reached. Returning ${currN}.` });
      return currN;
    }

    const left = helper(currN - 1, id, x - offset, y + 60, offset / 1.8);
    const right = helper(currN - 2, id, x + offset, y + 60, offset / 1.8);
    
    const sum = left + right;
    traces.push({ type: 'return', id, n: currN, value: sum, message: `Returning ${left} + ${right} = ${sum} for fib(${currN}).` });
    return sum;
  }

  helper(n, null, 400, 40, 160);
  traces.push({ type: 'done', message: `Finished computing fib(${n}).` });
  return traces;
}

function generateMemoTrace(n: number): TraceEvent[] {
  const traces: TraceEvent[] = [];
  let idCounter = 0;
  const memo: Record<number, number> = {};

  function helper(currN: number, parentId: number | null, x: number, y: number, offset: number): number {
    const id = idCounter++;
    traces.push({ type: 'call', id, parentId, n: currN, x, y, message: `Calling fib(${currN})...` });

    if (currN in memo) {
      traces.push({ type: 'cache_hit', id, parentId, n: currN, value: memo[currN], x, y, message: `Cache hit! fib(${currN}) is already computed as ${memo[currN]}.` });
      return memo[currN];
    }

    if (currN <= 1) {
      memo[currN] = currN;
      traces.push({ type: 'return', id, n: currN, value: currN, cacheWrite: true, message: `Base case. Returning ${currN} and saving to cache.` });
      return currN;
    }

    const left = helper(currN - 1, id, x - offset, y + 60, offset / 1.8);
    const right = helper(currN - 2, id, x + offset, y + 60, offset / 1.8);
    
    const sum = left + right;
    memo[currN] = sum;
    traces.push({ type: 'return', id, n: currN, value: sum, cacheWrite: true, message: `Computed fib(${currN}) = ${sum}. Saving to cache.` });
    return sum;
  }

  helper(n, null, 400, 40, 160);
  traces.push({ type: 'done', message: `Finished computing fib(${n}) optimally.` });
  return traces;
}

function generateTabulationTrace(n: number): TraceEvent[] {
  const traces: TraceEvent[] = [];
  traces.push({ type: 'init_table', n, message: `Initializing DP table of size ${n + 1}.` });
  
  const dp: number[] = [0, 1];
  traces.push({ type: 'write_table', index: 0, value: 0, message: `Base case: dp[0] = 0` });
  
  if (n > 0) {
    traces.push({ type: 'write_table', index: 1, value: 1, message: `Base case: dp[1] = 1` });
  }

  for (let i = 2; i <= n; i++) {
    traces.push({ type: 'read_table', indices: [i - 1, i - 2], target: i, message: `Looking up dp[${i-1}] and dp[${i-2}] to compute dp[${i}]...` });
    dp[i] = dp[i - 1] + dp[i - 2];
    traces.push({ type: 'write_table', index: i, value: dp[i], message: `Computed dp[${i}] = ${dp[i-1]} + ${dp[i-2]} = ${dp[i]}` });
  }
  
  traces.push({ type: 'done', message: `Finished tabulating up to fib(${n}). Result is ${dp[n]}.` });
  return traces;
}


// --- Icons ---
const PlayIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);
const PauseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);
const StepBackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z" />
  </svg>
);
const StepFwdIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8.59 16.59L13.17 12 8.59 7.41 1