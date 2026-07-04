import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Activity, Dna, Settings2, Code2, Maximize } from 'lucide-react';

// --- Types & Interfaces ---
type ProblemType = 'tsp' | 'knapsack' | 'function';

interface Individual {
  chromosome: any;
  fitness: number;
}

interface Point {
  x: number;
  y: number;
}

interface Item {
  weight: number;
  value: number;
}

// --- Constants & Problem Data ---
const NUM_CITIES = 25;
const CITIES: Point[] = Array.from({ length: NUM_CITIES }, () => ({
  x: Math.random() * 0.8 + 0.1,
  y: Math.random() * 0.8 + 0.1,
}));

const NUM_ITEMS = 35;
const MAX_WEIGHT = 100;
const ITEMS: Item[] = Array.from({ length: NUM_ITEMS }, () => ({
  weight: Math.floor(Math.random() * 15) + 1,
  value: Math.floor(Math.random() * 20) + 1,
}));

// --- Helper Functions ---
const calculateDistance = (p1: Point, p2: Point) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

const evaluateFitness = (chromosome: any, problem: ProblemType): number => {
  if (problem === 'tsp') {
    let dist = 0;
    for (let i = 0; i < chromosome.length - 1; i++) {
      dist += calculateDistance(CITIES[chromosome[i]], CITIES[chromosome[i + 1]]);
    }
    dist += calculateDistance(CITIES[chromosome[chromosome.length - 1]], CITIES[chromosome[0]]);
    return 100 / dist; // Higher is better
  } 
  else if (problem === 'knapsack') {
    let weight = 0;
    let value = 0;
    for (let i = 0; i < chromosome.length; i++) {
      if (chromosome[i] === 1) {
        weight += ITEMS[i].weight;
        value += ITEMS[i].value;
      }
    }
    return weight > MAX_WEIGHT ? 0.1 : value;
  } 
  else {
    // Function Max: f(x,y) = sin(10x) * cos(10y) + exp(-(x-0.5)^2 - (y-0.5)^2)
    const [x, y] = chromosome;
    const term1 = Math.sin(x * 10) * Math.cos(y * 10);
    const term2 = Math.exp(-Math.pow(x - 0.5, 2) - Math.pow(y - 0.5, 2));
    return term1 + term2 + 2; // +2 to keep it positive
  }
};

const generateRandomChromosome = (problem: ProblemType) => {
  if (problem === 'tsp') {
    const arr = Array.from({ length: NUM_CITIES }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  } else if (problem === 'knapsack') {
    return Array.from({ length: NUM_ITEMS }, () => (Math.random() > 0.7 ? 1 : 0));
  } else {
    return [Math.random(), Math.random()];
  }
};

// --- Main Component ---
export default function App() {
  // State
  const [problem, setProblem] = useState<ProblemType>('tsp');
  const [popSize, setPopSize] = useState<number>(100);
  const [mutRate, setMutRate] = useState<number>(0.05);
  const [elitism, setElitism] = useState<number>(2);
  
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [generation, setGeneration] = useState<number>(0);
  const [population, setPopulation] = useState<Individual[]>([]);
  const [history, setHistory] = useState<number[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize Population
  const initPopulation = useCallback(() => {
    const initialPop: Individual[] = Array.from({ length: popSize }, () => {
      const chromo = generateRandomChromosome(problem);
      return { chromosome: chromo, fitness: evaluateFitness(chromo, problem) };
    });
    initialPop.sort((a, b) => b.fitness - a.fitness);
    setPopulation(initialPop);
    setGeneration(0);
    setHistory([initialPop[0].fitness]);
    setIsRunning(false);
  }, [problem, popSize]);

  // Reset when problem changes
  useEffect(() => {
    initPopulation();
  }, [initPopulation]);

  // Genetic Algorithm Step
  const stepGA = useCallback(() => {
    setPopulation((prevPop) => {
      const newPop: Individual[] = [];
      
      // Elitism
      for (let i = 0; i < elitism; i++) {
        newPop.push(prevPop[i]);
      }

      // Tournament Selection
      const selectParent = () => {
        const tournamentSize = 5;
        let best = prevPop[Math.floor(Math.random() * popSize)];
        for (let i = 1; i < tournamentSize; i++) {
          const contender = prevPop[Math.floor(Math.random() * popSize)];
          if (contender.fitness > best.fitness) best = contender;
        }
        return best;
      };

      while (newPop.length < popSize) {
        const p1 = selectParent().chromosome;
        const p2 = selectParent().chromosome;
        let childChromo: any;

        // Crossover
        if (problem === 'tsp') {
          // Order Crossover (OX1)
          const start = Math.floor(Math.random() * NUM_CITIES);
          const end = Math.floor(Math.random() * NUM_CITIES);
          const [min, max] = [Math.min(start, end), Math.max(start, end)];
          childChromo = new Array(NUM_CITIES).fill(-1);
          for (let i = min; i <= max; i++) childChromo[i] = p1[i];
          let currIdx = (max + 1) % NUM_CITIES;
          for (let i = 0; i < NUM_CITIES; i++) {
            const gene = p2[(max + 1 + i) % NUM_CITIES];
            if (!childChromo.includes(gene)) {
              childChromo[currIdx] = gene;
              currIdx = (currIdx + 1) % NUM_CITIES;
            }
          }
        } else if (problem === 'knapsack') {
          // Uniform Crossover
          childChromo = p1.map((gene: number, i: number) => (Math.random() > 0.5 ? gene : p2[i]));
        } else {
          // Arithmetic Crossover
          childChromo = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
        }

        // Mutation
        if (Math.random() < mutRate) {
          if (problem === 'tsp') {
            const idx1 = Math.floor(Math.random() * NUM_CITIES);
            const idx2 = Math.floor(Math.random() * NUM_CITIES);
            [childChromo[idx1], childChromo[idx2]] = [childChromo[idx2], childChromo[idx1]];
          } else if (problem === 'knapsack') {
            const idx = Math.floor(Math.random() * NUM_ITEMS);
            childChromo[idx] = childChromo[idx] === 1 ? 0 : 1;
          } else {
            childChromo[0] = Math.max(0, Math.min(1, childChromo[0] + (Math.random() - 0.5) * 0.2));
            childChromo[1] = Math.max(0, Math.min(1, childChromo[1] + (Math.random() - 0.5) * 0.2));
          }
        }

        newPop.push({ chromosome: childChromo, fitness: evaluateFitness(childChromo, problem) });
      }

      newPop.sort((a, b) => b.fitness - a.fitness);
      
      setHistory((prev) => [...prev, newPop[0].fitness]);
      setGeneration((prev) => prev + 1);
      
      return newPop;
    });
  }, [elitism, mutRate, popSize, problem]);

  // Animation Loop
  useEffect(() => {
    let timer: number;
    if (isRunning) {
      timer = window.setTimeout(() => {
        stepGA();
      }, 30); // ~30fps
    }
    return () => clearTimeout(timer);
  }, [isRunning, generation, stepGA]);

  // Visualization (Canvas)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || population.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const best = population[0].chromosome;

    if (problem === 'tsp') {
      // Draw Edges
      ctx.beginPath();
      ctx.moveTo(CITIES[best[0]].x * width, CITIES[best[0]].y * height);
      for (let i = 1; i < best.length; i++) {
        ctx.lineTo(CITIES[best[i]].x * width, CITIES[best[i]].y * height);
      }
      ctx.lineTo(CITIES[best[0]].x * width, CITIES[best[0]].y * height);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)'; // emerald-500
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw Cities
      CITIES.forEach((city, i) => {
        ctx.beginPath();
        ctx.arc(city.x * width, city.y * height, 4, 0, Math.PI * 2);
        ctx.fillStyle = best[0] === i ? '#10b981' : '#94a3b8'; // Highlight start city
        ctx.fill();
      });
    } 
    else if (problem === 'knapsack') {
      const cols = 7;
      const padding = 10;
      const cellW = (width - padding * (cols + 1)) / cols;
      const cellH = cellW;

      ITEMS.forEach((item, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = padding + col * (cellW + padding);
        const y = padding + row * (cellH + padding);

        const isSelected = best[i] === 1;
        
        ctx.fillStyle = isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(30, 41, 59, 0.5)';
        ctx.strokeStyle = isSelected ? '#10b981' : '#334155';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.roundRect(x, y, cellW, cellH, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isSelected ? '#a7f3d0' : '#64748b';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`v:${item.value}`, x + cellW/2, y + cellH/2 - 2);
        ctx.fillText(`w:${item.weight}`, x + cellW/2, y + cellH/2 + 10);
      });
    }
    else if (problem === 'function') {
      // Draw heat map approximation (just axes and grid for simplicity)
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      for(let i=0; i<=10; i++) {
        ctx.beginPath(); ctx.moveTo(i*width/10, 0); ctx.lineTo(i*width/10, height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i*height/10); ctx.lineTo(width, i*height/10); ctx.stroke();
      }

      // Draw population diversity
      population.forEach((ind, i) => {
        const [x, y] = ind.chromosome;
        ctx.beginPath();
        ctx.arc(x * width, y * height, i === 0 ? 6 : 3, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? '#10b981' : 'rgba(45, 212, 191, 0.4)'; // teal-400
        if (i === 0) {
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 10;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.fill();
      });
      ctx.shadowBlur = 0; // reset
    }
  }, [population, problem]);

  // SVG Graph Path Generation
  const generateGraphPath = () => {
    if (history.length === 0) return '';
    const maxFit = Math.max(...history);
    const minFit = Math.min(...history);
    const range = maxFit - minFit || 1;
    
    return history.map((fit, i) => {
      const x = (i / Math.max(history.length - 1, 1)) * 100;
      const y = 100 - ((fit - minFit) / range) * 100;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  const getCodeSnippet = () => {
    switch(problem) {
      case 'tsp': return `// Order Crossover (OX1)
const start = random(0, len);
const end = random(0, len);
const child = new Array(len).fill(-1);
// Copy sub-array from P1
for(let i=start; i<=end; i++) child[i] = p1[i];
// Fill remaining from P2
let curr = (end + 1) % len;
for(let i=0; i<len; i++) {
  const gene = p2[(end + 1 + i) % len];
  if(!child.includes(gene)) {
    child[curr] = gene;
    curr = (curr + 1) % len;
  }
}`;
      case 'knapsack': return `// Uniform Crossover & Bit-flip Mutation
const child = p1.map((gene, i) => 
  Math.random() > 0.5 ? gene : p2[i]
);

// Mutation
if (Math.random() < mutRate) {
  const idx = random(0, items.length);
  child[idx] = child[idx] === 1 ? 0 : 1;
}`;
      case 'function': return `// Arithmetic Crossover
const child = [
  (p1[0] + p2[0]) / 2,
  (p1[1] + p2[1]) / 2
];

// Gaussian-ish Mutation
if (Math.random() < mutRate) {
  child[0] += (Math.random() - 0.5) * 0.2;
  child[1] += (Math.random() - 0.5) * 0.2;
  // clamp to [0, 1]
}`;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-emerald-500/30 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <Dna className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">EvoSandbox</h1>
            <p className="text-xs text-emerald-500/80 font-medium">Bio-Inspired Computing Visualizer</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/50">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Gen: <strong className="text-emerald-400 font-mono">{generation}</strong></span>
          </div>
          <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/50">
            <Maximize className="w-4 h-4 text-teal-400" />
            <span>Best Fit: <strong className="text-teal-400 font-mono">{history[history.length-1]?.toFixed(2) || '0.00'}</strong></span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar Controls */}
        <aside className="w-80 border-r border-slate-800 bg-slate-900/30 p-6 flex flex-col gap-8 overflow-y-auto">
          
          {/* Problem Selector */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-emerald-500" /> Environment
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {(['tsp', 'knapsack', 'function'] as ProblemType[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setProblem(p)}
                  className={`px-4 py-3 rounded-lg border text-left transition-all ${
                    problem === p 
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="font-medium capitalize">{p === 'tsp' ? 'Traveling Salesman' : p === 'function' ? 'Function Max' : 'Knapsack'}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {p === 'tsp' && 'Find shortest path visiting all nodes.'}
                    {p === 'knapsack' && 'Maximize value under weight limit.'}
                    {p === 'function' && 'Find global maximum of 2D function.'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Parameters */}
          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-500" /> Parameters
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <label