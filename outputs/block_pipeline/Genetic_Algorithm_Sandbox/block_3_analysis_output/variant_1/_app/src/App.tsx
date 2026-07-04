import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- GA Logic (Pure JS) ---
const POPULATION_SIZE = 150;
const MUTATION_RATE = 0.05;
const TARGET = { x: 80, y: 20 };

interface Individual {
  x: number;
  y: number;
  fitness: number;
}

interface GenerationData {
  generation: number;
  bestFitness: number;
  avgFitness: number;
}

const calculateFitness = (x: number, y: number) => {
  // Distance to target, inverted so higher is better (max ~141)
  const dist = Math.sqrt(Math.pow(x - TARGET.x, 2) + Math.pow(y - TARGET.y, 2));
  return Math.max(0, 150 - dist);
};

const createIndividual = (x?: number, y?: number): Individual => {
  const indX = x !== undefined ? x : Math.random() * 100;
  const indY = y !== undefined ? y : Math.random() * 100;
  return { x: indX, y: indY, fitness: calculateFitness(indX, indY) };
};

const initPopulation = () => Array.from({ length: POPULATION_SIZE }, () => createIndividual());

const tournamentSelection = (population: Individual[]): Individual => {
  let best = population[Math.floor(Math.random() * population.length)];
  for (let i = 1; i < 3; i++) {
    const contender = population[Math.floor(Math.random() * population.length)];
    if (contender.fitness > best.fitness) best = contender;
  }
  return best;
};

const crossover = (parentA: Individual, parentB: Individual): Individual => {
  // Arithmetic crossover
  const alpha = Math.random();
  const childX = parentA.x * alpha + parentB.x * (1 - alpha);
  const childY = parentA.y * alpha + parentB.y * (1 - alpha);
  return createIndividual(childX, childY);
};

const mutate = (ind: Individual): Individual => {
  let { x, y } = ind;
  if (Math.random() < MUTATION_RATE) x += (Math.random() - 0.5) * 20;
  if (Math.random() < MUTATION_RATE) y += (Math.random() - 0.5) * 20;
  // Keep within bounds
  x = Math.max(0, Math.min(100, x));
  y = Math.max(0, Math.min(100, y));
  return createIndividual(x, y);
};

// --- Snippet Data ---
const SNIPPETS = {
  selection: `// Tournament Selection
function select(population) {
  let best = population[Math.floor(Math.random() * population.length)];
  for(let i = 1; i < 3; i++) {
    let contender = population[Math.floor(Math.random() * population.length)];
    if(contender.fitness > best.fitness) {
      best = contender;
    }
  }
  return best;
}`,
  crossover: `// Arithmetic Crossover
function crossover(parentA, parentB) {
  const alpha = Math.random();
  const childX = parentA.x * alpha + parentB.x * (1 - alpha);
  const childY = parentA.y * alpha + parentB.y * (1 - alpha);
  return { x: childX, y: childY };
}`,
  mutation: `// Gaussian-like Mutation
function mutate(individual, mutationRate) {
  let { x, y } = individual;
  if (Math.random() < mutationRate) {
    x += (Math.random() - 0.5) * 20;
  }
  if (Math.random() < mutationRate) {
    y += (Math.random() - 0.5) * 20;
  }
  return { x, y };
}`
};

const highlightCode = (code: string) => {
  return code
    .replace(/(function|return|let|const|for|if)/g, '<span class="text-emerald-400">$1</span>')
    .replace(/(Math\.\w+)/g, '<span class="text-teal-300">$1</span>')
    .replace(/(\/\/.*)/g, '<span class="text-slate-500 italic">$1</span>')
    .replace(/([a-zA-Z]+)(?=\()/g, '<span class="text-blue-300">$1</span>');
};

export default function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [population, setPopulation] = useState<Individual[]>([]);
  const [history, setHistory] = useState<GenerationData[]>([]);
  const [activeSnippet, setActiveSnippet] = useState<'selection' | 'crossover' | 'mutation'>('selection');

  const scatterCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize
  useEffect(() => {
    handleReset();
  }, []);

  const handleReset = useCallback(() => {
    setPopulation(initPopulation());
    setGeneration(0);
    setHistory([]);
    setIsRunning(false);
  }, []);

  const stepGeneration = useCallback(() => {
    setPopulation((prevPop) => {
      const newPop: Individual[] = [];
      
      // Elitism: keep best 2
      const sorted = [...prevPop].sort((a, b) => b.fitness - a.fitness);
      newPop.push(sorted[0], sorted[1]);

      while (newPop.length < POPULATION_SIZE) {
        const parentA = tournamentSelection(prevPop);
        const parentB = tournamentSelection(prevPop);
        let child = crossover(parentA, parentB);
        child = mutate(child);
        newPop.push(child);
      }

      const bestFitness = sorted[0].fitness;
      const avgFitness = prevPop.reduce((sum, ind) => sum + ind.fitness, 0) / POPULATION_SIZE;

      setHistory((prev) => [...prev, { generation: prev.length, bestFitness, avgFitness }]);
      setGeneration((g) => g + 1);

      return newPop;
    });
  }, []);

  // GA Loop
  useEffect(() => {
    let timer: number;
    if (isRunning) {
      timer = window.setTimeout(() => {
        stepGeneration();
      }, 50); // 50ms per generation
    }
    return () => clearTimeout(timer);
  }, [isRunning, generation, stepGeneration]);

  // Draw Scatter Plot (Diversity)
  useEffect(() => {
    const canvas = scatterCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#022c22'; // emerald-950
    ctx.fillRect(0, 0, width, height);

    // Draw Target
    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'; // emerald-500 with opacity
    ctx.beginPath();
    ctx.arc((TARGET.x / 100) * width, (TARGET.y / 100) * height, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(16, 185, 129, 0.5)';
    ctx.beginPath();
    ctx.arc((TARGET.x / 100) * width, (TARGET.y / 100) * height, 10, 0, Math.PI * 2);
    ctx.fill();

    // Draw Population
    population.forEach((ind, i) => {
      const px = (ind.x / 100) * width;
      const py = (ind.y / 100) * height;
      
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      
      // Highlight the absolute best in the current population
      if (i === 0) {
        // Assuming population isn't sorted here, we just draw them. 
        // Actually, let's find max fitness to highlight.
      }
      
      ctx.fillStyle = `rgba(45, 212, 191, ${0.4 + (ind.fitness / 150) * 0.6})`; // teal-400
      ctx.fill();
    });

    // Highlight Best
    if (population.length > 0) {
      const best = population.reduce((prev, current) => (prev.fitness > current.fitness) ? prev : current);
      ctx.beginPath();
      ctx.arc((best.x / 100) * width, (best.y / 100) * height, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#fde047'; // yellow-300
      ctx.fill();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

  }, [population]);

  // Draw Line Chart (Fitness History)
  useEffect(() => {
    const canvas = chartCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#022c22';
    ctx.fillRect(0, 0, width, height);

    if (history.length === 0) return;

    const maxGen = Math.max(100, history.length);
    const maxFit = 150; // Known max fitness

    const drawLine = (dataKey: 'bestFitness' | 'avgFitness', color: string, lineWidth: number) => {
      ctx.beginPath();
      history.forEach((data, i) => {
        const x = (i / maxGen) * width;
        const y = height - (data[dataKey] / maxFit) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.stroke();
    };

    // Draw Average Fitness
    drawLine('avgFitness', 'rgba(20, 184, 166, 0.5)', 2); // teal-500
    // Draw Best Fitness
    drawLine('bestFitness', '#34d399', 3); // emerald-400

  }, [history]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 text-slate-200 p-4 md:p-8 font-sans selection:bg-teal-900 selection:text-teal-100">
      
      {/* Header */}
      <header className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-emerald-800/50 pb-6">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">
            Evolution Analysis
          </h1>
          <p className="text-emerald-600/80 text-sm mt-1 font-medium tracking-wide">
            GENETIC ALGORITHM SANDBOX • VARIANT 2
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-lg border border-emerald-800/30 backdrop-blur-md">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`px-6 py-2 rounded-md font-semibold transition-all duration-300 ${
              isRunning 
                ? 'bg-rose-900/50 text-rose-300 hover:bg-rose-800/60 border border-rose-700/50' 
                : 'bg-emerald-600 text-emerald-50 hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
            }`}
          >
            {isRunning ? 'Pause' : 'Evolve'}
          </button>
          <button
            onClick={stepGeneration}
            disabled={isRunning}
            className="px-4 py-2 bg-slate-800 text-teal-300 hover:bg-slate-700 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-slate-700"
          >
            Step
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-md font-medium transition-colors border border-slate-700"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Visualizations */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Top Row: Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-900/60 border border-emerald-800/30 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-emerald-500 text-xs font-bold uppercase tracking-wider mb-1">Generation</div>
              <div className="text-3xl font-light text-emerald-100">{generation}</div>
            </div>
            <div className="bg-slate-900/60 border border-emerald-800/30 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-emerald-500 text-xs font-bold uppercase tracking-wider mb-1">Best Fitness</div>
              <div className="text-3xl font-light text-teal-200">
                {history.length > 0 ? history[history.length - 1].bestFitness.toFixed(1) : '0.0'}
              </div>
            </div>
            <div className="bg-slate-900/60 border border-emerald-800/30 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-emerald-500 text-xs font-bold uppercase tracking-wider mb-1">Population Size</div>
              <div className="text-3xl font-light text-emerald-100">{POPULATION_SIZE}</div>
            </div>
          </div>

          {/* Charts Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Scatter Plot */}
            <div className="bg-slate-900/60 border border-emerald-800/30 rounded-xl p-4 backdrop-blur-sm flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-emerald-400 font-medium">Population Diversity</h3>
                <span className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-yellow-300 inline-block shadow-[0_0_5px_#fde047]"></span> Best
                </span>
              </div>
              <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-emerald-900/50 shadow-inner">
                <canvas 
                  ref={scatterCanvasRef} 
                  width={400} 
                  height={400} 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Line Chart */}
            <div className="bg-slate-900/60 border border-emerald-800/30 rounded-xl p-4 backdrop-blur-sm flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-emerald-400 font-medium">Fitness History</h3>
                <div className="flex gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-3 h-[2px] bg-emerald-400 inline-block"></span> Max</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-[2px] bg-teal-600 inline-block"></span> Avg</span>
                </div>
              </div>
              <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-emerald-900/50 shadow-inner bg-[#022c22]">
                <canvas 
                  ref={chartCanvasRef} 
                  width={400} 
                  height={400} 
                  className="w-full h-full object-cover"
                />
                {/* Axis Labels (Overlay) */}
                <div className="absolute bottom-2 right-2 text-[10px] text-emerald-700 font-mono">Generations &rarr;</div>
                <div className="absolute top-2 left-2 text-[10px] text-emerald-700 font-mono rotate-90 origin-left translate-x-2">Fitness &rarr;</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Code & Operations */}
        <div className="space-y-6 flex flex-col">
          <div className="bg-slate-900/60 border border-emerald-800/30 rounded-xl p-5 backdrop-blur-sm flex-grow flex flex-col">
            <h3 className="text-emerald-400 font-medium mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
              Genetic Operators
            </h3>
            
            {/* Tabs */}
            <div className="flex gap-2 mb-4 bg-slate-950 p-1 rounded-lg border border-emerald-900/50">
              {(['selection', 'crossover', 'mutation'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveSnippet(tab)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                    activeSnippet === tab 
                      ? 'bg-emerald-900/80 text-emerald-100 shadow-sm' 
                      : 'text-slate-500 hover:text-emerald-300 hover:bg-slate-800/50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Code Display */}
            <div className="flex-grow bg-[#0f172a] rounded-lg border border-slate-800 overflow-hidden relative group">
              <div className="absolute top-0 w-full h-6 bg-slate-800/50 border-b border-slate-700/50 flex items-center px-3 gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                <span className="ml-2 text-[10px] text-slate-500 font-mono">operator.js</span>
              </div>
              <pre className="p-4 pt-10 text-sm font-mono text-slate-300 overflow-x-auto h-full">
                <code dangerouslySetInnerHTML={{ __html: highlightCode(SNIPPETS[activeSnippet]) }} />
              </pre>
            </div>

            {/* Live Stats for Operator */}
            <div className="mt-4 grid grid-cols-2 gap-3">
               <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-3">
                 <div className="text-[10px] text-slate-500 uppercase tracking-wider">Mutation Rate</div>
                 <div className="text-lg text-teal-300 font-light">{(MUTATION_RATE * 100).toFixed(1)}%</div>
               </div>
               <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-3">
                 <div className="text-[10px] text-slate-500 uppercase tracking-wider">Crossover Type</div>
                 <div className="text-lg text-teal-300 font-light">Arithmetic</div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}