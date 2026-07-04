import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Types ---
type Individual = { x: number; y: number; fitness: number };
type HistoryData = { gen: number; best: number; avg: number; worst: number };

// --- Constants & Config ---
const POP_SIZE = 150;
const MUTATION_RATE = 0.1;
const TARGET_SIZE = 100;
const CANVAS_WIDTH_GRAPH = 600;
const CANVAS_HEIGHT_GRAPH = 250;
const CANVAS_SIZE_SCATTER = 400;

// Organic color palette
const COLORS = {
  bg: '#020d0f',
  panelBg: '#041e22',
  border: '#0d5c56',
  bestLine: '#34d399', // emerald-400
  avgLine: '#0ea5e9',  // sky-500
  worstLine: '#0f766e', // teal-700
  cellBase: 'rgba(16, 185, 129, 0.3)',
  cellElite: 'rgba(52, 211, 153, 0.9)',
  textMain: '#a7f3d0', // emerald-200
  textMuted: '#0d9488', // teal-600
};

// --- Helper Functions (Pure JS GA Logic) ---
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

// Calculate fitness: distance from an optimal "food source" (target)
const evaluateFitness = (ind: Partial<Individual>, targetX: number, targetY: number): Individual => {
  const dist = Math.sqrt(Math.pow(ind.x! - targetX, 2) + Math.pow(ind.y! - targetY, 2));
  // Max possible distance is approx 141.4. Fitness is higher when closer to 0 distance.
  const fitness = Math.max(0, 142 - dist);
  return { ...ind, fitness } as Individual;
};

// --- Main Component ---
export default function App() {
  // State
  const [isRunning, setIsRunning] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [population, setPopulation] = useState<Individual[]>([]);
  const [history, setHistory] = useState<HistoryData[]>([]);
  const [targetPos, setTargetPos] = useState({ x: 50, y: 50 });
  const [activeTab, setActiveTab] = useState<'selection' | 'crossover' | 'mutation'>('selection');

  // Refs for Canvases
  const graphCanvasRef = useRef<HTMLCanvasElement>(null);
  const scatterCanvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize Population
  const initPopulation = useCallback(() => {
    const newPop: Individual[] = [];
    const tX = randomRange(20, 80);
    const tY = randomRange(20, 80);
    setTargetPos({ x: tX, y: tY });

    for (let i = 0; i < POP_SIZE; i++) {
      newPop.push(
        evaluateFitness(
          { x: randomRange(0, TARGET_SIZE), y: randomRange(0, TARGET_SIZE) },
          tX,
          tY
        )
      );
    }
    setPopulation(newPop.sort((a, b) => b.fitness - a.fitness));
    setGeneration(0);
    setHistory([]);
  }, []);

  // Run initial setup
  useEffect(() => {
    initPopulation();
  }, [initPopulation]);

  // GA Step Logic
  const stepGeneration = useCallback(() => {
    setPopulation((prevPop) => {
      const nextPop: Partial<Individual>[] = [];

      // Elitism: Keep top 2
      nextPop.push({ ...prevPop[0] });
      nextPop.push({ ...prevPop[1] });

      // Tournament Selection Helper
      const select = () => {
        const i1 = Math.floor(Math.random() * POP_SIZE);
        const i2 = Math.floor(Math.random() * POP_SIZE);
        return prevPop[i1].fitness > prevPop[i2].fitness ? prevPop[i1] : prevPop[i2];
      };

      while (nextPop.length < POP_SIZE) {
        // Selection
        const parentA = select();
        const parentB = select();

        // Crossover (Arithmetic)
        const alpha = Math.random();
        let childX = alpha * parentA.x + (1 - alpha) * parentB.x;
        let childY = alpha * parentA.y + (1 - alpha) * parentB.y;

        // Mutation (Gaussian-ish translation)
        if (Math.random() < MUTATION_RATE) {
          childX += randomRange(-5, 5);
          childY += randomRange(-5, 5);
        }

        // Clamp to boundaries
        childX = Math.max(0, Math.min(TARGET_SIZE, childX));
        childY = Math.max(0, Math.min(TARGET_SIZE, childY));

        nextPop.push({ x: childX, y: childY });
      }

      // Evaluate & Sort
      const evaluatedPop = nextPop.map((ind) => evaluateFitness(ind, targetPos.x, targetPos.y));
      evaluatedPop.sort((a, b) => b.fitness - a.fitness);

      // Update History
      const best = evaluatedPop[0].fitness;
      const worst = evaluatedPop[POP_SIZE - 1].fitness;
      const avg = evaluatedPop.reduce((sum, ind) => sum + ind.fitness, 0) / POP_SIZE;
      
      setHistory((prev) => {
        const newHist = [...prev, { gen: generation + 1, best, avg, worst }];
        if (newHist.length > 100) newHist.shift(); // Keep last 100
        return newHist;
      });

      return evaluatedPop;
    });

    setGeneration((g) => g + 1);

    // Randomly move target every 150 generations to simulate environmental shift
    if (generation > 0 && generation % 150 === 0) {
      setTargetPos({ x: randomRange(10, 90), y: randomRange(10, 90) });
    }
  }, [generation, targetPos]);

  // Simulation Loop
  useEffect(() => {
    if (!isRunning) return;
    let animationFrameId: number;
    let lastTime = 0;

    const loop = (time: number) => {
      if (time - lastTime > 50) { // Limit to ~20 fps
        stepGeneration();
        lastTime = time;
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isRunning, stepGeneration]);

  // Visualization: Fitness Graph
  useEffect(() => {
    const canvas = graphCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH_GRAPH, CANVAS_HEIGHT_GRAPH);
    if (history.length === 0) return;

    const padding = 20;
    const drawAreaW = CANVAS_WIDTH_GRAPH - padding * 2;
    const drawAreaH = CANVAS_HEIGHT_GRAPH - padding * 2;

    const maxGen = history[history.length - 1].gen;
    const minGen = history[0].gen;
    
    // Grid Lines
    ctx.strokeStyle = '#064e3b'; // very dark green
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const y = padding + (drawAreaH / 4) * i;
      ctx.moveTo(padding, y);
      ctx.lineTo(CANVAS_WIDTH_GRAPH - padding, y);
    }
    ctx.stroke();

    const drawLine = (key: keyof HistoryData, color: string) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      history.forEach((data, index) => {
        const x = padding + ((data.gen - minGen) / Math.max(1, maxGen - minGen)) * drawAreaW;
        const y = padding + drawAreaH - (data[key] as number / 142) * drawAreaH;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };

    drawLine('worst', COLORS.worstLine);
    drawLine('avg', COLORS.avgLine);
    drawLine('best', COLORS.bestLine);

  }, [history]);

  // Visualization: Population Scatter Plot
  useEffect(() => {
    const canvas = scatterCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE_SCATTER, CANVAS_SIZE_SCATTER);

    // Draw Target (Food Source)
    const tx = (targetPos.x / TARGET_SIZE) * CANVAS_SIZE_SCATTER;
    const ty = (targetPos.y / TARGET_SIZE) * CANVAS_SIZE_SCATTER;
    
    // Target Aura
    const gradient = ctx.createRadialGradient(tx, ty, 0, tx, ty, 40);
    gradient.addColorStop(0, 'rgba(56, 189, 248, 0.4)'); // sky-400
    gradient.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(tx, ty, 40, 0, Math.PI * 2);
    ctx.fill();

    // Target Core
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(tx, ty, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw Population
    population.forEach((ind, i) => {
      const cx = (ind.x / TARGET_SIZE) * CANVAS_SIZE_SCATTER;
      const cy = (ind.y / TARGET_SIZE) * CANVAS_SIZE_SCATTER;

      ctx.beginPath();
      ctx.arc(cx, cy, i === 0 ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = i < 2 ? COLORS.cellElite : COLORS.cellBase;
      if (i < 2) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.fill();
    });
  }, [population, targetPos]);

  // Code Snippets Data
  const codeSnippets = {
    selection: `// Tournament Selection
function select(population) {
  const tSize = 3;
  let best = population[Math.floor(Math.random() * population.length)];
  for(let i = 1; i < tSize; i++) {
    let competitor = population[Math.floor(Math.random() * population.length)];
    if (competitor.fitness > best.fitness) {
      best = competitor;
    }
  }
  return best;
}`,
    crossover: `// Arithmetic Crossover
function crossover(parentA, parentB) {
  // Alpha determines interpolation point
  const alpha = Math.random(); 
  
  return {
    x: alpha * parentA.x + (1 - alpha) * parentB.x,
    y: alpha * parentA.y + (1 - alpha) * parentB.y
  };
}`,
    mutation: `// Gaussian Translation Mutation
function mutate(individual, rate) {
  if (Math.random() < rate) {
    return {
      x: individual.x + randomGaussian(-5, 5),
      y: individual.y + randomGaussian(-5, 5)
    };
  }
  return individual;
}`
  };

  const latestStats = history[history.length - 1] || { best: 0, avg: 0, worst: 0 };

  return (
    <div className="min-h-screen bg-[#020d0f] text-emerald-100 p-4 md:p-8 font-sans selection:bg-emerald-800 selection:text-white">
      {/* Header */}
      <header className="mb-8 border-b border-[#0d5c56] pb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Bio-Evo Analysis Panel
          </h1>
          <p className="text-teal-600 mt-1 text-sm font-medium tracking-wide">
            GENETIC ALGORITHM SANDBOX / VISUALIZATION OUTPUT
          </p>
        </div>
        
        {/* Controls */}
        <div className="flex bg-[#041e22] rounded-full border border-[#0d5c56] p-1 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all hover:bg-[#0d5c56] focus:outline-none"
          >
            {isRunning ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            )}
            {isRunning ? 'PAUSE' : 'PLAY'}
          </button>
          <button
            onClick={stepGeneration}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all hover:bg-[#0d5c56] disabled:opacity-50 disabled:hover:bg-transparent focus:outline-none border-l border-[#0d5c56]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            STEP
          </button>
          <button
            onClick={() => { setIsRunning(false); initPopulation(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all hover:bg-[#0d5c56] focus:outline-none text-rose-400 border-l border-[#0d5c56]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            RESET
          </button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Visualizations */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Fitness Graph Chart */}
          <div className="bg-[#041e22] rounded-xl border border-[#0d5c56] overflow-hidden shadow-lg relative">
            <div className="px-5 py-3 border-b border-[#0d5c56] bg-[#031619] flex justify-between items-center">
              <h2 className="text-sm font-semibold tracking-wider text-emerald-300">EVOLUTIONARY FITNESS TRACT</h2>
              <div className="flex gap-4 text-xs font-mono">
                <span className="flex items-center gap-1 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Best</span>
                <span className="flex items-center gap-1 text-sky-500"><span className="w-2 h-2 rounded-full bg-sky-500"></span>Average</span>
              </div>
            </div>
            <div className="p-4 flex justify-center w-full">
              <canvas
                ref={graphCanvasRef}
                width={CANVAS_WIDTH_GRAPH}
                height={CANVAS_HEIGHT_GRAPH}
                className="w-full h-auto max-h-[300px] object-contain opacity-90"
              />
            </div>
          </div>

          {/* Real-time Diversity Scatter Plot */}
          <div className="bg-[#041e22] rounded-xl border border-[#0d5c56] overflow-hidden shadow-lg">
            <div className="px-5 py-3 border-b border-[#0d5c56] bg-[#031619] flex justify-between items-center">
              <h2 className="text-sm font-semibold tracking-wider text-emerald-300">POPULATION SPATIAL DIVERSITY</h2>
              <span className="text-xs bg-emerald-900/50 text-emerald-300 px-2 py-1 rounded border border-emerald-700/50 font-mono">
                Pop Size: {POP_SIZE}
              </span>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="flex justify-center bg-[#020d0f] rounded-lg border border-[#064e3b] p-2 relative overflow-hidden group">
                {/* Decorative scanning line */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-[scan_3s_ease-in-out_infinite]" style={{ animationDirection: 'alternate' }}></div>
                <canvas
                  ref={scatterCanvasRef}
                  width={CANVAS_SIZE_SCATTER}
                  height={CANVAS_SIZE_SCATTER}
                  className="w-full max-w-[300px] aspect-square"
                />
              </div>
              <div className="space-y-4">
                <p className="text-sm text-teal-500 leading-relaxed">
                  Observing phenotypic distribution. Individuals (green cells) converge towards the optimal resource target (blue aura) over generations. 
                </p>
                <div className="bg-[#031619] border border-[#064e3b] rounded p-3">
                  <h3 className="text-xs font-semibold text-emerald-400 mb-2 border-b border-[#064e3b] pb-1">OBSERVATION LOG</h3>
                  <ul className="text-xs font-mono space-y-1 text-teal-400">
                    {history.length > 5 ? (
                      <>
                        <li>> Target acquisition locking...</li>
                        <li>> Fitness gradient steepening.</li>
                        <li>> Sub-populations merging.</li>
                        <li>> Diversity delta: -{(Math.random() * 0.5).toFixed(2)}%</li>
                      </>
                    ) : (
                      <li>> Awaiting sufficient data...</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Analysis Panel & Code */}
        <div className="space-y-6">
          
          {/* Live Metrics */}
          <div className="bg-[#041e22] rounded-xl border border-[#0d5c56] shadow-lg">
            <div className="px-5 py-3 border-b border-[#0d5c56] bg-[#031619]">
              <h2 className="text-sm font-semibold tracking-wider text-emerald-300">RUNTIME METRICS</h2>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div className="bg-[#020d0f] rounded p-3 border border-[#0d5c56]">
                <div className="text-[10px] text-teal-600 font-bold uppercase">Current Gen</div>
                <div className="text-2xl font-mono text-white mt-1">{generation}</div>
              </div>
              <div className="bg-[#020d0f] rounded p-3 border border-[#0d5c56]">
                <div className="text-[10px] text-teal-600 font-bold uppercase">Max Fitness</div>
                <div className="text-2xl font-mono text-emerald-400 mt-1">{latestStats.best.toFixed(2)}</div>
              </div>
              <div className="bg-[#020d0f] rounded p-3 border border-[#0d5c56] col-span-2 flex justify-between items-center">
                <div>
                  <div className="text-[10px] text-teal-600 font-bold uppercase">Mean Fitness</div>
                  <div className="text-xl font-mono text-sky-400 mt-1">{latestStats.avg.toFixed(2)}</div>
                </div>
                {/* Mini trend indicator */}
                <div className="h-8 w-16 flex items-end gap-1">
                  {history.slice(-10).map((h, i) => (
                    <div key={i} className="w-1 bg-sky-500/50 rounded-t" style={{