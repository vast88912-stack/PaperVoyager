import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Icons ---
const PlayIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
);
const PauseIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
);
const StepIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="5" y1="4" x2="5" y2="20"></line><polygon points="9 4 21 12 9 20 9 4"></polygon></svg>
);
const RefreshIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21l5.25 4.64"/></svg>
);
const CodeIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
);
const SettingsIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
);
const ActivityIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
);

// --- Constants & Math ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;

// Fitness Landscape: A mixture of Gaussians (peaks and valleys)
// Simulating an organic "nutrient gradient"
const PEAKS = [
  { cx: 0.2, cy: 0.3, sigma: 0.1, height: 1.0 },
  { cx: 0.8, cy: 0.7, sigma: 0.15, height: 1.2 },
  { cx: 0.5, cy: 0.8, sigma: 0.08, height: 0.8 },
  { cx: 0.7, cy: 0.2, sigma: 0.12, height: 0.6 },
];

const calculateFitness = (x: number, y: number) => {
  let z = 0;
  for (const peak of PEAKS) {
    const dx = x - peak.cx;
    const dy = y - peak.cy;
    const distSq = dx * dx + dy * dy;
    z += peak.height * Math.exp(-distSq / (2 * peak.sigma * peak.sigma));
  }
  // Add some high-frequency noise for complexity
  z += 0.1 * Math.sin(x * 20) * Math.cos(y * 20);
  return Math.max(0, z); // Ensure positive
};

// --- GA Classes ---
class Individual {
  x: number;
  y: number;
  fitness: number;

  constructor(x?: number, y?: number) {
    this.x = x !== undefined ? x : Math.random();
    this.y = y !== undefined ? y : Math.random();
    this.fitness = 0;
  }

  evaluate() {
    this.fitness = calculateFitness(this.x, this.y);
  }

  clone() {
    const child = new Individual(this.x, this.y);
    child.fitness = this.fitness;
    return child;
  }
}

// --- Main Component ---
export default function App() {
  // UI State
  const [params, setParams] = useState({
    popSize: 150,
    mutationRate: 0.05,
    crossoverRate: 0.7,
    elitism: 2,
  });
  const [stats, setStats] = useState({
    generation: 0,
    bestFitness: 0,
    avgFitness: 0,
  });
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'params'|'code'>('params');

  // Refs for animation loop
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reqRef = useRef<number>();
  const populationRef = useRef<Individual[]>([]);
  const frameCountRef = useRef(0);

  // Initialize Population
  const initPopulation = useCallback(() => {
    const pop = [];
    for (let i = 0; i < params.popSize; i++) {
      const ind = new Individual();
      ind.evaluate();
      pop.push(ind);
    }
    populationRef.current = pop;
    setStats({ generation: 0, bestFitness: 0, avgFitness: 0 });
    setHistory([]);
    draw(pop);
  }, [params.popSize]);

  useEffect(() => {
    initPopulation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount, manual reset handles other cases

  // GA Operations
  const tournamentSelection = (pop: Individual[], k = 3): Individual => {
    let best = pop[Math.floor(Math.random() * pop.length)];
    for (let i = 1; i < k; i++) {
      const competitor = pop[Math.floor(Math.random() * pop.length)];
      if (competitor.fitness > best.fitness) best = competitor;
    }
    return best;
  };

  const crossover = (p1: Individual, p2: Individual): Individual => {
    if (Math.random() > params.crossoverRate) return p1.clone();
    // Arithmetic crossover (blend)
    const alpha = Math.random();
    const childX = p1.x * alpha + p2.x * (1 - alpha);
    const childY = p1.y * alpha + p2.y * (1 - alpha);
    return new Individual(childX, childY);
  };

  const mutate = (ind: Individual) => {
    if (Math.random() < params.mutationRate) {
      // Small Gaussian-like perturbation
      ind.x += (Math.random() - 0.5) * 0.1;
      ind.y += (Math.random() - 0.5) * 0.1;
      // Clamp to bounds
      ind.x = Math.max(0, Math.min(1, ind.x));
      ind.y = Math.max(0, Math.min(1, ind.y));
    }
  };

  const evolve = useCallback(() => {
    const currentPop = populationRef.current;
    
    // Sort by fitness descending
    currentPop.sort((a, b) => b.fitness - a.fitness);
    
    const newPop: Individual[] = [];
    
    // Elitism
    for (let i = 0; i < params.elitism && i < currentPop.length; i++) {
      newPop.push(currentPop[i].clone());
    }

    // Breed rest
    while (newPop.length < params.popSize) {
      const p1 = tournamentSelection(currentPop);
      const p2 = tournamentSelection(currentPop);
      const child = crossover(p1, p2);
      mutate(child);
      child.evaluate();
      newPop.push(child);
    }

    // Evaluate stats
    let sumFit = 0;
    let bestFit = 0;
    newPop.forEach(ind => {
      sumFit += ind.fitness;
      if (ind.fitness > bestFit) bestFit = ind.fitness;
    });

    populationRef.current = newPop;
    
    setStats(prev => ({
      generation: prev.generation + 1,
      bestFitness: bestFit,
      avgFitness: sumFit / params.popSize
    }));
    
    setHistory(prev => [...prev, bestFit]);

  }, [params]);

  // Drawing
  const drawLandscape = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // We create a rough heatmap of the fitness landscape
    // To save performance, we draw the major peaks as radial gradients
    ctx.fillStyle = '#020617'; // slate-950
    ctx.fillRect(0, 0, width, height);

    ctx.globalCompositeOperation = 'screen';
    PEAKS.forEach(peak => {
      const cx = peak.cx * width;
      const cy = peak.cy * height;
      const radius = peak.sigma * width * 2;
      
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      // Organic deep greens and blues
      gradient.addColorStop(0, `rgba(16, 185, 129, ${peak.height * 0.3})`); // emerald-500
      gradient.addColorStop(0.5, `rgba(6, 182, 212, ${peak.height * 0.1})`); // cyan-500
      gradient.addColorStop(1, 'rgba(2, 6, 23, 0)'); // transparent

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
  };

  const draw = useCallback((pop: Individual[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;

    // Draw background landscape once or fade
    drawLandscape(ctx, width, height);

    // Draw population
    pop.forEach((ind, i) => {
      const x = ind.x * width;
      const y = ind.y * height;
      
      // Color based on fitness (relative to current max for visual variance)
      const maxFitInPop = Math.max(...pop.map(p => p.fitness));
      const normalizedFit = maxFitInPop > 0 ? ind.fitness / maxFitInPop : 0;
      
      ctx.beginPath();
      // Higher fitness = larger, brighter green. Lower = smaller, dimmer blue.
      const size = 2 + normalizedFit * 4;
      ctx.arc(x, y, size, 0, Math.PI * 2);
      
      if (i < params.elitism) {
        // Elites get a special halo
        ctx.fillStyle = '#fde047'; // yellow-300
        ctx.shadowColor = '#fef08a';
        ctx.shadowBlur = 10;
      } else {
        const r = Math.floor(16 + normalizedFit * 100);
        const g = Math.floor(185 * normalizedFit);
        const b = Math.floor(212 + (1 - normalizedFit) * 40);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.5 + normalizedFit * 0.5})`;
        ctx.shadowBlur = 0;
      }
      
      ctx.fill();
    });
  }, [params.elitism]);

  // Animation Loop
  const loop = useCallback(() => {
    if (isRunning) {
      frameCountRef.current++;
      // Control evolution speed visually
      if (frameCountRef.current % 3 === 0) {
         evolve();
         draw(populationRef.current);
      }
      reqRef.current = requestAnimationFrame(loop);
    }
  }, [isRunning, evolve, draw]);

  useEffect(() => {
    if (isRunning) {
      reqRef.current = requestAnimationFrame(loop);
    } else {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    }
    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [isRunning, loop]);

  // Handlers
  const handleStep = () => {
    evolve();
    draw(populationRef.current);
  };

  const handleReset = () => {
    setIsRunning(false);
    initPopulation();
  };

  // Sparkline Chart Component for History
  const Sparkline = ({ data }: { data: number[] }) => {
    if (data.length === 0) return null;
    const max = Math.max(...data, 1.5); // Ensure scale accommodates landscape peaks
    const min = 0;
    const points = data.map((d, i) => {
      const x = (i / Math.max(1, data.length - 1)) * 100;
      const y = 100 - ((d - min) / (max - min)) * 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="w-full h-24 relative mt-2 border border-slate-800 bg-slate-900 rounded overflow-hidden">
        <svg preserveAspectRatio="none" className="w-full h-full text-emerald-500 overflow-visible" viewBox="0 -10 100 120">
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            points={points}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="absolute top-1 left-2 text-xs text-slate-500 font-mono">Best Fitness</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans p-4 md:p-8 flex flex-col items-center">
      
      {/* Header */}
      <header className="w-full max-w-6xl flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center gap-2">
            <ActivityIcon className="w-6 h-6 text-emerald-400" />
            Bio-Optimizer: Spatial GA
          </h1>
          <p className="text-sm text-slate-500 mt-1">Simulating evolution to find peak nutrient concentrations.</p>
        </div>
        
        {/* Main Controls */}
        <div className="flex gap-3 bg-slate-900 p-1.5 rounded-lg border border-slate-800">
          <button 
            onClick={() => setIsRunning(!isRunning)}
            className={`p-2 rounded flex items-center gap-2 font-medium transition-colors ${isRunning ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'}`}
          >
            {isRunning ? <PauseIcon /> : <PlayIcon />}
            {isRunning ? 'Pause' : 'Start'}
          </button>
          <button 
            onClick={handleStep} disabled={isRunning}
            className="p-2 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
            title="Step One Generation"
          >
            <StepIcon />
          </button>
          <button 
            onClick={handleReset}
            className="p-2 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Reset Population"
          >
            <RefreshIcon />
          </button>
        </div>
      </header>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          
          {/* Stats Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h2 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Simulation Stats</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-3xl font-light text-white font-mono">{stats.generation}</div>
                <div className="text-xs text-slate-500 mt-1">Generation</div>
              </div>
              <div>
                <div className="text-3xl font-light text-emerald-400 font-mono">{stats.bestFitness.toFixed(2)}</div>
                <div className="text-xs text-slate-500 mt-1">Best Fitness</div>
              </div>
            </div>
            <Sparkline data={history} />
          </div>

          {/* Config / Code Tabs */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex-1 flex flex-col">
            <div className="flex border-b border-slate-800">
              <button 
                onClick={() => setActiveTab('params')}
                className={`flex-1 py-3 text-sm font-medium