import React, { useState, useRef, useEffect } from "react";

type FibAlgo = "naive" | "memo" | "tabulation";
type Step =
  | { type: "call"; n: number; parent?: number }
  | { type: "return"; n: number; value: number }
  | { type: "table_update"; n: number; value: number };

const ACCENT = "bg-blue-500";
const ACCENT_TEXT = "text-blue-600";
const FOCUS = "ring-2 ring-blue-400";
const BTN =
  "px-3 py-1 rounded font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300";

function* fibNaiveTrace(n: number, parent?: number): Generator<Step, number> {
  yield { type: "call", n, parent };
  if (n <= 1) {
    yield { type: "return", n, value: n };
    return n;
  }
  const left = yield* fibNaiveTrace(n - 1, n);
  const right = yield* fibNaiveTrace(n - 2, n);
  const val = left + right;
  yield { type: "return", n, value: val };
  return val;
}

function* fibMemoTrace(
  n: number,
  memo: Record<number, number> = {},
  parent?: number
): Generator<Step, number> {
  yield { type: "call", n, parent };
  if (n in memo) {
    yield { type: "return", n, value: memo[n] };
    return memo[n];
  }
  if (n <= 1) {
    memo[n] = n;
    yield { type: "return", n, value: n };
    return n;
  }
  const left = yield* fibMemoTrace(n - 1, memo, n);
  const right = yield* fibMemoTrace(n - 2, memo, n);
  memo[n] = left + right;
  yield { type: "return", n, value: memo[n] };
  return memo[n];
}

function* fibTabulationTrace(n: number): Generator<Step, number> {
  const table: number[] = [];
  for (let i = 0; i <= n; ++i) {
    if (i <= 1) {
      table[i] = i;
    } else {
      table[i] = table[i - 1] + table[i - 2];
    }
    yield { type: "table_update", n: i, value: table[i] };
  }
  return table[n];
}

function useStepper(
  n: number,
  algo: FibAlgo
): [
  Step[],
  number,
  () => void,
  () => void,
  () => void,
  boolean,
  boolean,
  () => void,
  number | null
] {
  const [steps, setSteps] = useState<Step[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const genRef = useRef<Generator<Step, number>>();
  const [running, setRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSteps([]);
    setStepIdx(0);
    setResult(null);
    setRunning(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    let gen: Generator<Step, number>;
    if (algo === "naive") gen = fibNaiveTrace(n);
    else if (algo === "memo") gen = fibMemoTrace(n);
    else gen = fibTabulationTrace(n);
    genRef.current = gen;
    // Prime first step
    const { value, done } = gen.next();
    if (!done && value) setSteps([value]);
    else if (done) setResult(value as number);
    // eslint-disable-next-line
  }, [n, algo]);

  const stepForward = () => {
    if (!genRef.current) return;
    const gen = genRef.current;
    const { value, done } = gen.next();
    if (!done && value) {
      setSteps((prev) => [...prev, value]);
      setStepIdx((idx) => idx + 1);
    } else if (done) {
      setResult(value as number);
      setStepIdx((idx) => idx + 1);
    }
  };

  const stepBack = () => {
    if (stepIdx > 0) setStepIdx((idx) => idx - 1);
  };

  const reset = () => {
    setStepIdx(0);
    setRunning(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  // Run/auto-step
  useEffect(() => {
    if (!running) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    if (stepIdx >= steps.length && result !== null) {
      setRunning(false);
      return;
    }
    timerRef.current = setTimeout(() => {
      stepForward();
    }, 400);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line
  }, [running, stepIdx, steps.length, result]);

  const run = () => {
    setRunning(true);
  };

  const canStepForward = stepIdx < steps.length;
  const canStepBack = stepIdx > 0;

  return [
    steps.slice(0, stepIdx + 1),
    stepIdx,
    stepForward,
    stepBack,
    run,
    canStepForward,
    canStepBack,
    reset,
    result,
  ];
}

// --- Visualization Components ---

function CallTree({
  steps,
  highlightN,
  algo,
}: {
  steps: Step[];
  highlightN: number | null;
  algo: FibAlgo;
}) {
  // Build tree nodes from steps
  type Node = {
    n: number;
    id: string;
    parent?: string;
    children: string[];
    value?: number;
    reused?: boolean;
  };
  const nodes: Record<string, Node> = {};
  const stack: string[] = [];
  let nodeCount = 0;
  const nToId: Record<number, string[]> = {};

  steps.forEach((step) => {
    if (step.type === "call") {
      const id = `node${nodeCount++}`;
      const node: Node = {
        n: step.n,
        id,
        parent: stack.length ? stack[stack.length - 1] : undefined,
        children: [],
      };
      nodes[id] = node;
      if (node.parent) nodes[node.parent].children.push(id);
      stack.push(id);
      if (!nToId[step.n]) nToId[step.n] = [];
      nToId[step.n].push(id);
    } else if (step.type === "return") {
      const id = stack.pop();
      if (id) nodes[id].value = step.value;
    }
  });

  // Mark reused nodes for memo
  if (algo === "memo") {
    // If a call is immediately followed by return, it's a memo hit
    steps.forEach((step, i) => {
      if (
        step.type === "call" &&
        steps[i + 1] &&
        steps[i + 1].type === "return" &&
        steps[i + 1].n === step.n
      ) {
        // Find last node with this n
        const ids = nToId[step.n];
        if (ids && ids.length) {
          nodes[ids[ids.length - 1]].reused = true;
        }
      }
    });
  }

  // Layout tree: BFS by depth
  const levels: string[][] = [];
  function buildLevels(root: string, depth: number) {
    if (!levels[depth]) levels[depth] = [];
    levels[depth].push(root);
    nodes[root].children.forEach((child) => buildLevels(child, depth + 1));
  }
  const roots = Object.values(nodes).filter((n) => !n.parent);
  roots.forEach((r) => buildLevels(r.id, 0));

  // SVG layout
  const nodeW = 44,
    nodeH = 44,
    hGap = 24,
    vGap = 54;
  const svgW =
    Math.max(
      ...levels.map((lv) => lv.length * (nodeW + hGap) - hGap),
      nodeW + 2 * hGap
    ) + 20;
  const svgH = levels.length * (nodeH + vGap) + 10;

  // Compute node positions
  const positions: Record<string, { x: number; y: number }> = {};
  levels.forEach((lv, d) => {
    const rowW = lv.length * (nodeW + hGap) - hGap;
    const x0 = (svgW - rowW) / 2;
    lv.forEach((id, i) => {
      positions[id] = {
        x: x0 + i * (nodeW + hGap),
        y: 10 + d * (nodeH + vGap),
      };
    });
  });

  // Render
  return (
    <svg
      width={svgW}
      height={svgH}
      className="bg-white rounded shadow border"
      style={{ minWidth: 340, minHeight: 180 }}
    >
      {/* Edges */}
      {Object.values(nodes).map((node) =>
        node.children.map((cid) => {
          const from = positions[node.id];
          const to = positions[cid];
          return (
            <line
              key={node.id + "-" + cid}
              x1={from.x + nodeW / 2}
              y1={from.y + nodeH}
              x2={to.x + nodeW / 2}
              y2={to.y}
              stroke="#bcd"
              strokeWidth={2}
            />
          );
        })
      )}
      {/* Nodes */}
      {Object.values(nodes).map((node) => {
        const { x, y } = positions[node.id];
        const isActive = highlightN === node.n && !node.value;
        const isReused = node.reused;
        return (
          <g key={node.id}>
            <rect
              x={x}
              y={y}
              width={nodeW}
              height={nodeH}
              rx={12}
              className={`${
                isActive
                  ? ACCENT
                  : isReused
                  ? "bg-yellow-200"
                  : "bg-gray-100"
              }`}
              fill={
                isActive
                  ? "#3b82f6"
                  : isReused
                  ? "#fde68a"
                  : "#f3f4f6"
              }
              stroke={
                isActive
                  ? "#2563eb"
                  : isReused
                  ? "#f59e42"
                  : "#cbd5e1"
              }
              strokeWidth={isActive ? 3 : 1.5}
              style={{
                filter: isActive
                  ? "drop-shadow(0 0 6px #60a5fa88)"
                  : undefined,
                transition: "all 0.2s",
              }}
            />
            <text
              x={x + nodeW / 2}
              y={y + nodeH / 2 + 6}
              textAnchor="middle"
              fontWeight={isActive ? 700 : 500}
              fontSize={20}
              fill={isActive ? "#fff" : "#2563eb"}
              className={isActive ? "" : ACCENT_TEXT}
            >
              {node.n}
            </text>
            {typeof node.value === "number" && (
              <text
                x={x + nodeW / 2}
                y={y + nodeH - 6}
                textAnchor="middle"
                fontSize={13}
                fill="#64748b"
                fontWeight={500}
              >
                {node.value}
              </text>
            )}
            {isReused && (
              <g>
                <rect
                  x={x + nodeW - 18}
                  y={y + 4}
                  width={14}
                  height={14}
                  rx={4}
                  fill="#fde68a"
                  stroke="#f59e42"
                  strokeWidth={1}
                />
                <text
                  x={x + nodeW - 11}
                  y={y + 15}
                  fontSize={11}
                  fill="#b45309"
                  fontWeight={700}
                  textAnchor="middle"
                >
                  ♻
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function TableViz({
  steps,
  n,
  highlightN,
  algo,
}: {
  steps: Step[];
  n: number;
  highlightN: number | null;
  algo: FibAlgo;
}) {
  // Build table state from steps
  const table: (number | null)[] = Array(n + 1).fill(null);
  steps.forEach((step) => {
    if (step.type === "table_update" || step.type === "return") {
      table[step.n] = step.value;
    }
  });

  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-1">
        {table.map((val, i) => (
          <div
            key={i}
            className={`w-12 h-16 flex flex-col items-center justify-center rounded-lg border shadow-sm
              ${
                highlightN === i
                  ? `${ACCENT} text-white ring-2 ring-blue-400`
                  : val !== null
                  ? "bg-blue-50 border-blue-200"
                  : "bg-gray-50 border-gray-200"
              }
            `}
            style={{
              transition: "all 0.2s",
            }}
          >
            <div className="text-xs text-gray-400 mb-1">n={i}</div>
            <div className="font-bold text-lg">
              {val !== null ? val : "?"}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-gray-500">
        {algo === "tabulation"
          ? "Table fills left→right"
          : "Table shows memoized values"}
      </div>
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [n, setN] = useState(6);
  const [algo, setAlgo] = useState<FibAlgo>("naive");
  const [
    steps,
    stepIdx,
    stepForward,
    stepBack,
    run,
    canStepForward,
    canStepBack,
    reset,
    result,
  ] = useStepper(n, algo);

  // Find current highlight n
  let highlightN: number | null = null;
  if (steps.length) {
    const last = steps[steps.length - 1];
    if (last.type === "call" || last.type === "table_update")
      highlightN = last.n;
    else if (last.type === "return") highlightN = last.n;
  }

  // For tabulation, only show table, not tree
  const showTree = algo !== "tabulation";

  // Tooltips
  const algoTips: Record<FibAlgo, string> = {
    naive:
      "Naive recursion: exponential calls, recomputes subproblems.",
    memo:
      "Memoization: cache results, avoid redundant calls.",
    tabulation:
      "Tabulation: fill table iteratively, bottom-up.",
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-2">
      <div className="max-w-3xl w-full bg-white rounded-xl shadow-lg border p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="text-2xl font-bold tracking-tight text-gray-800">
            Fibonacci Visualizer
          </div>
          <span
            className="ml-2 px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700"
            title="Classic DP example"
          >
            DP Pattern: Line
          </span>
        </div>
        <div className="text-gray-600 mb-4">
          Explore how dynamic programming optimizes recursive problems.
          Step through <b>naive recursion</b>, <b>memoization</b>, and{" "}
          <b>tabulation</b> for Fibonacci numbers. Visualize the call
          tree and how subproblems are reused or collapsed into a table.
        </div>
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">n =</span>
            <input
              type="range"
              min={1}
              max={15}
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
              className="accent-blue-500"
              style={{ width: 120 }}
            />
            <span className="font-semibold text-blue-700">{n}</span>
          </div>
          <div className="flex gap-2">
            <button
              className={`${BTN} ${
                algo === "naive"
                  ? `${ACCENT} text-white`
                  : "bg-gray-100 text-blue-700"
              }`}
              onClick={() => setAlgo("naive")}
              title={algoTips.naive}
            >
              Naive
            </button>
            <button
              className={`${BTN} ${
                algo === "memo"
                  ? `${ACCENT} text-white`
                  : "bg-gray-100 text-blue-700"
              }`}
              onClick={() => setAlgo("memo")}
              title={algoTips.memo}
            >
              Memoization
            </button>
            <button
              className={`${BTN} ${
                algo === "tabulation"
                  ? `${ACCENT} text-white`
                  : "bg-gray-100 text-blue-700"
              }`}
              onClick={() => setAlgo("tabulation")}
              title={algoTips.tabulation}
            >
              Tabulation
            </button>
          </div>
          <div className="flex gap-1 ml-auto">
            <button
              className={`${BTN} bg-gray-100 text-blue-700`}
              onClick={reset}
              title="Reset"
            >
              ⟲
            </button>
            <button
              className={`${BTN} bg-gray-100 text-blue-700`}
              onClick={stepBack}
              disabled={!canStepBack}
              title="Step Back"
            >
              ◀
            </button>
            <button
              className={`${BTN} ${ACCENT} text-white`}
              onClick={stepForward}
              disabled={!canStepForward}
              title="Step Forward"
            >
              ▶
            </button>
            <button
              className={`${BTN} bg-blue-100 text-blue-700`}
              onClick={run}
              disabled={!canStepForward}
              title="Run"
            >
              ▶▶
            </button>
          </div>
        </div>
        {/* Visualization */}
        <div
          className={`flex flex-col md:flex-row gap-6 items-center md:items-start justify-center`}
        >
          {showTree && (
            <div className="flex-1 flex flex-col items-center">
              <div className="mb-2 font-semibold text-gray-700">
                Call Tree
                <span
                  className="ml-2 text-xs text-gray-400"
                  title="Each box is a function call"
                >
                  {algo === "memo" && (
                    <span>
                      <span className="ml-1">♻</span> = memo reuse
                    </span>
                  )}
                </span>
              </div>
              <CallTree
                steps={steps}
                highlightN={highlightN}
                algo={algo}
              />
            </div>
          )}
          <div className="flex-1 flex flex-col items-center">
            <div className="mb-2 font-semibold text-gray-700">
              {algo === "tabulation"
                ? "Table (Bottom-Up)"
                : "Memo Table"}
            </div>
            <TableViz
              steps={steps}
              n={n}
              highlightN={highlightN}
              algo={algo}
            />
          </div>
        </div>
        {/* Result */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <span className="text-gray-500 text-sm">fib({n}) =</span>
          <span
            className={`text-2xl font-bold ${
              result !== null ? ACCENT_TEXT : "text-gray-400"
            }`}
          >
            {result !== null ? result : "?"}
          </span>
        </div>
        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500 justify-center">
          <div>
            <span
              className="inline-block w-4 h-4 rounded mr-1 align-middle"
              style={{ background: "#3b82f6" }}
            ></span>
            Active call/subproblem
          </div>
          <div>
            <span
              className="inline-block w-4 h-4 rounded mr-1 align-middle"
              style={{ background: "#fde68a", border: "1.5px solid #f59e42" }}
            ></span>
            Memoized reuse
          </div>
          <div>
            <span
              className="inline-block w-4 h-4 rounded mr-1 align-middle"
              style={{ background: "#f3f4f6", border: "1.5px solid #cbd5e1" }}
            ></span>
            New call
          </div>
        </div>
      </div>
    </div>
  );
}