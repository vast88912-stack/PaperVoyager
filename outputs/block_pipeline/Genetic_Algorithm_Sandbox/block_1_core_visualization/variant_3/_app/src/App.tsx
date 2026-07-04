import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Activity, Dna, Settings, Code, BarChart2 } from 'lucide-react';

// --- Configuration & Math ---
const DOMAIN_MIN = -10;
const DOMAIN_MAX = 10;
const CANVAS_SIZE = 500;
const GRAPH_HEIGHT = 150;

// The "Environment" - a multi-modal 2D function to optimize
// We want to find the (x,y) that maximizes this function.
const evalFitness = (x: number, y: number): number => {
  // Peak 1 (Global max)
  const z1 = 3 * Math.exp(-((x - 3) ** 2 + (y - 3) ** 2) / 4);
  // Peak 2 (Local max)
  const z2 = 2 * Math.exp(-((x + 5) ** 2 + (y + 4) ** 2) / 6);
  // Peak 3 (Local max)
  const z3 = 1.5 * Math.exp(-((x + 2) ** 2 + (y - 6) ** 2) / 2);
  // Base undulation
  const base = Math.sin(x) * Math.cos(y) * 0.5;
  
  return z1 + z2 + z3 + base;
};

// --- Types ---
type Genome = { x: number; y: number };
type Individual = { genome: Genome; fitness: number };

// --- GA Engine (Pure JS Logic) ---
class GeneticAlgorithm {
  popSize: number;
  mutationRate: number;
  elitism: number;
  population: Individual[];
  generation: number;
  bestFitnessHistory: number[];
  bestEver: Individual | null;

  constructor(popSize: number, mutationRate: number, elitism: number = 2) {
    this.popSize = popSize;
    this.mutationRate = mutationRate;
    this.elitism = elitism;
    this.population = [];
    this.generation = 0;
    this.bestFitnessHistory = [];
    this.bestEver = null;
    this.initPopulation();
  }

  randomCoord() {
    return DOMAIN_MIN + Math.random() * (DOMAIN_MAX - DOMAIN_MIN);
  }

  initPopulation() {
    this.population = Array.from({ length: this.popSize }, () => {
      const genome = { x: this.randomCoord(), y: this.randomCoord() };
      return { genome, fitness: evalFitness(genome.x, genome.y) };
    });
    this.sortPopulation();
  }

  sortPopulation() {
    this.population.sort((a, b) => b.fitness - a.fitness);
    const currentBest = this.population[0];
    if (!this.bestEver || currentBest.fitness > this.bestEver.fitness) {
      this.bestEver = { ...currentBest, genome: { ...currentBest.genome } };
    }
  }

  tournamentSelection(k: number = 3): Individual {
    let best: Individual | null = null;
    for (let i = 0; i < k; i++) {
      const ind = this.population[Math.floor(Math.random() * this.popSize)];
      if (!best || ind.fitness > best.fitness) best = ind;
    }
    return best!;
  }

  crossover(p1: Genome, p2: Genome): Genome {
    // Blended crossover
    const alpha = Math.random();
    return {
      x: p1.x * alpha + p2.x * (1 - alpha),
      y: p1.y * alpha + p2.y * (1 - alpha)
    };
  }

  mutate(genome: Genome): Genome {
    let { x, y } = genome;
    if (Math.random() < this.mutationRate) {
      // Gaussian-like mutation
      x += (Math.random() - 0.5) * 4; 
      y += (Math.random() - 0.5) * 4;
      // Clamp to bounds
      x = Math.max(DOMAIN_MIN, Math.min(DOMAIN_MAX, x));
      y = Math.max(DOMAIN_MIN, Math.min(DOMAIN_MAX, y));
    }
    return { x, y };
  }

  step() {
    const newPopulation: Individual[] = [];

    // Elitism
    for (let i = 0; i < this.elitism; i++) {
      newPopulation.push(this.population[i]);
    }

    // Breed rest
    while (newPopulation.length < this.popSize) {
      const parent1 = this.tournamentSelection().genome;
      const parent2 = this.tournamentSelection().genome;
      
      let childGenome = this.crossover(parent1, parent2);
      childGenome = this.mutate(childGenome);
      
      newPopulation.push({
        genome: childGenome,
        fitness: evalFitness(childGenome.x, childGenome.y)
      });
    }

    this.population = newPopulation;
    this.sortPopulation();
    this.generation++;
    this.bestFitnessHistory.push(this.population[0].fitness);
    
    // Keep history manageable
    if (this.bestFitnessHistory.length > 200) {
      this.bestFitnessHistory.shift();
    }
  }
}

export default function App() {
  // --- State ---
  const [isRunning, setIsRunning] = useState(false);
  const [popSize, setPopSize] = useState(150);
  const [mutRate, setMutRate] = useState(0.15);
  
  // UI Display State (updated periodically to avoid render thrashing)
  const [uiStats, setUiStats] = useState({ gen: 0, bestFit: 0 });
  const [showCode, setShowCode] = useState(false);

  // --- Refs ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const graphRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const gaRef = useRef<GeneticAlgorithm | null>(null);
  const reqRef = useRef<number>();

  // --- Initialization ---
  const resetSimulation = useCallback(() => {
    gaRef.current = new GeneticAlgorithm(popSize, mutRate);
    setUiStats({ gen: 0, bestFit: gaRef.current.bestEver?.fitness || 0 });
    draw(); // Draw initial state
  }, [popSize, mutRate]);

  useEffect(() => {
    // Generate static heatmap background once
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = CANVAS_SIZE;
    bgCanvas.height = CANVAS_SIZE;
    const ctx = bgCanvas.getContext('2d');
    if (ctx) {
      const imgData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
      const data = imgData.data;
      
      // Expected range of our fitness function is roughly [-1, 4]
      for (let py = 0; py < CANVAS_SIZE; py++) {
        for (let px = 0; px < CANVAS_SIZE; px++) {
          const x = (px / CANVAS_SIZE) * (DOMAIN_MAX - DOMAIN_MIN) + DOMAIN_MIN;
          const y = ((CANVAS_SIZE - py) / CANVAS_SIZE) * (DOMAIN_MAX - DOMAIN_MIN) + DOMAIN_MIN; // Invert Y for math coords
          const z = evalFitness(x, y);
          
          // Map Z to color (Dark Slate to Bright Cyan/Teal)
          const norm = Math.max(0, Math.min(1, (z + 1) / 5)); // Normalize 0 to 1
          
          const i = (py * CANVAS_SIZE + px) * 4;
          // Interpolate from rgb(2, 6, 23) [slate-950] to rgb(45, 212, 191) [teal-400]
          data[i] = 2 + norm * (45 - 2);       // R
          data[i + 1] = 6 + norm * (212 - 6);  // G
          data[i + 2] = 23 + norm * (191 - 23); // B
          data[i + 3] = 255;                   // A
        }
      }
      ctx.putImageData(imgData, 0, 0);
      bgCanvasRef.current = bgCanvas;
    }

    resetSimulation();
  }, [resetSimulation]);


  // --- Rendering ---
  const draw = useCallback(() => {
    const ga = gaRef.current;
    if (!ga || !canvasRef.current || !graphRef.current) return;

    // 1. Draw Population Map
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      // Draw cached background
      if (bgCanvasRef.current) {
        ctx.drawImage(bgCanvasRef.current, 0, 0);
      } else {
        ctx.fillStyle = '#020617'; // fallback background
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      }

      // Draw individuals
      ctx.fillStyle = 'rgba(167, 243, 208, 0.6)'; // emerald-200 with opacity
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.9)'; // emerald-400

      ga.population.forEach((ind, i) => {
        // Map domain to canvas
        const cx = ((ind.genome.x - DOMAIN_MIN) / (DOMAIN_MAX - DOMAIN_MIN)) * CANVAS_SIZE;
        const cy = CANVAS_SIZE - ((ind.genome.y - DOMAIN_MIN) / (DOMAIN_MAX - DOMAIN_MIN)) * CANVAS_SIZE; // Invert Y

        ctx.beginPath();
        // Highlight best individual
        if (i === 0) {
          ctx.arc(cx, cy, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#fde047'; // yellow-300
          ctx.fill();
          ctx.stroke();
          // Reset style
          ctx.fillStyle = 'rgba(167, 243, 208, 0.6)'; 
        } else {
          ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // 2. Draw Fitness Graph
    const gCtx = graphRef.current.getContext('2d');
    if (gCtx) {
      const width = graphRef.current.width;
      const height = graphRef.current.height;
      gCtx.clearRect(0, 0, width, height);

      const history = ga.bestFitnessHistory;
      if (history.length > 1) {
        gCtx.beginPath();
        gCtx.strokeStyle = '#2dd4bf'; // teal-400
        gCtx.lineWidth = 2;
        gCtx.lineJoin = 'round';

        const minFit = Math.min(...history) - 0.5;
        const maxFit = Math.max(...history) + 0.5;
        const range = maxFit - minFit || 1;

        history.forEach((fit, i) => {
          const x = (i / (history.length - 1)) * width;
          const y = height - ((fit - minFit) / range) * height;
          if (i === 0) gCtx.moveTo(x, y);
          else gCtx.lineTo(x, y);
        });
        gCtx.stroke();

        // Fill under line
        gCtx.lineTo(width, height);
        gCtx.lineTo(0, height);
        gCtx.fillStyle = 'rgba(45, 212, 191, 0.1)';
        gCtx.fill();
      }
    }
  }, []);

  // --- Loop ---
  const tick = useCallback(() => {
    if (gaRef.current) {
      gaRef.current.step();
      draw();
      
      // Throttle React state updates
      if (gaRef.current.generation % 5 === 0) {
        setUiStats({
          gen: gaRef.current.generation,
          bestFit: gaRef.current.bestEver?.fitness || 0
        });
      }
    }
    if (isRunning) {
      reqRef.current = requestAnimationFrame(tick);
    }
  }, [isRunning, draw]);

  useEffect(() => {
    if (isRunning) {
      reqRef.current = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(reqRef.current!);
  }, [isRunning, tick]);

  const handleStep = () => {
    if (gaRef.current) {
      gaRef.current.step();
      draw();
      setUiStats({
        gen: gaRef.current.generation,
        bestFit: gaRef.current.bestEver?.fitness || 0
      });
    }
  };


  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-mono p-4 md:p-8 flex flex-col items-center">
      
      {/* Header */}
      <header className="w-full max-w-6xl flex items-center justify-between mb-8 border-b border-emerald-900/50 pb-4">
        <div className="flex items-center gap-3">
          <Dna className="text-emerald-400 w-8 h-8" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent tracking-tight">
            GA Sandbox <span className="text-sm font-normal text-slate-500 tracking-normal">// Visualization Module</span>
          </h1>
        </div>
        <div className="flex items-center gap-4 text-sm bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-500" />
            <span>Gen: <span className="text-teal-400 font-bold">{uiStats.gen.toString().padStart(4, '0')}</span></span>
          </div>
          <div className="w-px h-4 bg-slate-700"></div>
          <div>
            Best Fitness: <span className="text-emerald-400 font-bold">{uiStats.bestFit.toFixed(4)}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Panel: Controls & Graph */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Controls Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl shadow-emerald-900/10">
            <h2 className="text-emerald-500 font-semibold mb-4 flex items-center gap-2 uppercase tracking-wider text-xs">
              <Settings className="w-4 h-4" /> Parameters
            </h2>
            
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label>Population Size</label>
                  <span className="text-teal-400">{popSize}</span>
                </div>
                <input 
                  type="range" min="20" max="500" step="10" 
                  value={popSize}
                  onChange={(e) => setPopSize(parseInt(e.target.value))}
                  disabled={isRunning}
                  className="w-full accent-emerald-500 cursor-pointer opacity-80 hover:opacity-100 disabled:opacity-50"
                />
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label>Mutation Rate</label>
                  <span className="text-teal-400">{(mutRate * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" min="0.01" max="0.5" step="0.01" 
                  value={mutRate}
                  onChange={(e) => setMutRate(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer opacity-80 hover:opacity-100"
                />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap gap-2">
              <button 
                onClick={() => setIsRunning(!isRunning)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-bold transition-all ${
                  isRunning 
                    ? 'bg-slate-800 text-red-400 hover:bg-slate-700' 
                    : 'bg-emerald-600 text-slate-50 hover:bg-emerald-500 shadow-[0_0_15px_rgba(5,150,105,0.4)]'
                }`}
              >
                {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isRunning ? 'PAUSE' : 'EVOLVE'}
              </button>
              
              <button 
                onClick={handleStep}
                disabled={isRunning}
                className="p-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
                title="Step forward 1 generation"
              >
                <SkipForward className="w-5 h-5" />
              </button>
              
              <button 
                onClick={resetSimulation}
                className="p-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-emerald-400 transition-colors"