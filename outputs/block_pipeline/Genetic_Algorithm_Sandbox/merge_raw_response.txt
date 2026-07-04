import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, SkipForward, StepForward, RotateCcw, Activity, Dna, 
  Settings2, Code2, Maximize, Briefcase, Map, TrendingUp, BookOpen, 
  Lightbulb, ChevronRight, ChevronDown, Scissors, Dices, Trophy, 
  Home, BarChart2, Network 
} from 'lucide-react';

// --- Types & Interfaces ---
type ProblemType = 'tsp' | 'knapsack' | 'function';
type TabType = 'hero' | 'visualizer' | 'controls' | 'analysis' | 'theory';

interface Individual {
  chromosome: any;
  fitness: number;
  traitX: number;
  traitY: number;
}

interface Point {
  x: number;
  y: number;
}

interface Item {
  weight: number;
  value: number;
}

interface GenerationMetric {
  generation: number;
  bestFitness: number;
  avgFitness: number;
  diversity: number;
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
    return 100 / dist; 
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
    const [x, y] = chromosome;
    const term1 = Math.sin(x * 10) * Math.cos(y * 10);
    const term2 = Math.exp(-Math.pow(x - 0.5, 2) - Math.pow(y - 0.5, 2));
    return term1 + term2 + 2; 
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

const getTraits = (chromosome: any, problem: ProblemType) => {
  if (problem === 'function') return { x: chromosome[0], y: chromosome[1] };
  if (problem === 'knapsack') {
    let w = 0, v = 0;
    chromosome.forEach((gene: number, i: number) => {
      if (gene) { w += ITEMS[i].weight; v += ITEMS[i].value; }
    });
    return { x: Math.min(1, w / MAX_WEIGHT), y: Math.min(1, v / 300) };
  }
  if (problem === 'tsp') {
    return { x: chromosome[0] / NUM_CITIES, y: chromosome[Math.floor(NUM_CITIES/2)] / NUM_CITIES };
  }
  return { x: Math.random(), y: Math.random() };
};

// --- Custom Icons (from Hero Block) ---
const DnaIcon = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 15c6.667-6 13.333 0 20-6" />
    <path d="M9 22c1.798-1.998 2.518-3.995 2.808-5.993" />
    <path d="M15 2c-1.798 1.998-2.518 3.995-2.808 5.993" />
    <path d="m17 6-2.5-2.5" />
    <path d="m14 8-1-1" />
    <path d="m7 18 2.5 2.5" />
    <path d="m3.5 14.5.5.5" />
    <path d="m20 9 .5.5" />
    <path d="m6.5 12.5 1 1" />
    <path d="m16.5 10.5 1 1" />
    <path d="m10 16 1.5 1.5" />
  </svg>
);

// --- Main App Component ---
export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('hero');

  // Global GA State
  const [problem, setProblem] = useState<ProblemType>('tsp');
  const [popSize, setPopSize] = useState<number>(100);
  const [mutRate, setMutRate] = useState<number>(0.05);
  const [elitism, setElitism] = useState<number>(2);
  const [maxGenerations, setMaxGenerations] = useState<number>(500);
  
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [generation, setGeneration] = useState<number>(0);
  const [population, setPopulation] = useState<Individual[]>([]);
  const [history, setHistory] = useState<number[]>([]);
  const [metrics, setMetrics] = useState<GenerationMetric[]>([]);

  const initPopulation = useCallback(() => {
    const initialPop: Individual[] = Array.from({ length: popSize }, () => {
      const chromo = generateRandomChromosome(problem);
      const fitness = evaluateFitness(chromo, problem);
      const traits = getTraits(chromo, problem);
      return { chromosome: chromo, fitness, traitX: traits.x, traitY: traits.y };
    });
    initialPop.sort((a, b) => b.fitness - a.fitness);
    
    setPopulation(initialPop);
    setGeneration(0);
    setHistory([initialPop[0].fitness]);
    
    const avgFitness = initialPop.reduce((sum, ind) => sum + ind.fitness, 0) / popSize;
    setMetrics([{ generation: 0, bestFitness: initialPop[0].fitness, avgFitness, diversity: 1.0 }]);
    setIsRunning(false);
  }, [problem, popSize]);

  useEffect(() => {
    initPopulation();
  }, [initPopulation]);

  const stepGA = useCallback(() => {
    setPopulation((prevPop) => {
      const newPop: Individual[] = [];
      
      for (let i = 0; i < elitism; i++) {
        if (prevPop[i]) newPop.push(prevPop[i]);
      }

      const selectParent = () => {
        const tournamentSize = 5;
        let best = prevPop[Math.floor(Math.random() * prevPop.length)];
        for (let i = 1; i < tournamentSize; i++) {
          const contender = prevPop[Math.floor(Math.random() * prevPop.length)];
          if (contender && contender.fitness > best.fitness) best = contender;
        }
        return best;
      };

      while (newPop.length < popSize) {
        const p1 = selectParent().chromosome;
        const p2 = selectParent().chromosome;
        let childChromo: any;

        if (problem === 'tsp') {
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
          childChromo = p1.map((gene: number, i: number) => (Math.random() > 0.5 ? gene : p2[i]));
        } else {
          childChromo = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
        }

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

        const fitness = evaluateFitness(childChromo, problem);
        const traits = getTraits(childChromo, problem);
        newPop.push({ chromosome: childChromo, fitness, traitX: traits.x, traitY: traits.y });
      }

      newPop.sort((a, b) => b.fitness - a.fitness);
      
      const bestFit = newPop[0].fitness;
      const avgFit = newPop.reduce((sum, ind) => sum + ind.fitness, 0) / popSize;
      
      const xs = newPop.map(i => i.traitX);
      const ys = newPop.map(i => i.traitY);
      const spreadX = Math.max(...xs) - Math.min(...xs);
      const spreadY = Math.max(...ys) - Math.min(...ys);
      const diversity = Math.max(0, Math.min(1, (spreadX + spreadY) / 2));

      setHistory((prev) => [...prev, bestFit]);
      setGeneration((prev) => {
        const nextGen = prev + 1;
        setMetrics((mPrev) => [...mPrev, { generation: nextGen, bestFitness: bestFit, avgFitness: avgFit, diversity }]);
        if (nextGen >= maxGenerations) setIsRunning(false);
        return nextGen;
      });
      
      return newPop;
    });
  }, [elitism, mutRate, popSize, problem, maxGenerations]);

  useEffect(() => {
    let timer: number;
    if (isRunning && generation < maxGenerations) {
      timer = window.setTimeout(() => {
        stepGA();
      }, 30);
    }
    return () => clearTimeout(timer);
  }, [isRunning, generation, maxGenerations, stepGA]);

  const togglePlay = () => setIsRunning(!isRunning);
  const handleStep = () => { setIsRunning(false); stepGA(); };
  const handleReset = () => { setIsRunning(false); initPopulation(); };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-emerald-500/30">
      
      {/* Sidebar Navigation */}
      <aside className="w-20 lg:w-64 flex flex-col bg-slate-900/80 border-r border-slate-800 z-50">
        <div className="h-20 flex items-center justify-center lg:justify-start lg:px-6 border-b border-slate-800">
          <DnaIcon className="w-8 h-8 text-emerald-400" />
          <span className="hidden lg:block ml-3 font-bold text-xl tracking-tight text-emerald-400">EvoSandbox</span>
        </div>
        <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
          {[
            { id: 'hero', icon: Home, label: 'Home' },
            { id: 'visualizer', icon: Activity, label: 'Visualizer' },
            { id: 'controls', icon: Settings2, label: 'Controls' },
            { id: 'analysis', icon: BarChart2, label: 'Analysis' },
            { id: 'theory', icon: BookOpen, label: 'Theory' },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
                className={`flex items-center justify-center lg:justify-start p-3 lg:px-4 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                }`}
                title={item.label}
              >
                <Icon className="w-6 h-6 lg:w-5 lg:h-5" />
                <span className="hidden lg:block ml-3 font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
        {activeTab === 'hero' && <HeroModule setActiveTab={setActiveTab} />}
        {activeTab === 'visualizer' && (
          <VisualizerModule 
            problem={problem} setProblem={setProblem}
            popSize={popSize} setPopSize={setPopSize}
            mutRate={mutRate} setMutRate={setMutRate}
            elitism={elitism} setElitism={setElitism}
            generation={generation} history={history} population={population}
            isRunning={isRunning} togglePlay={togglePlay} handleStep={handleStep} handleReset={handleReset}
          />
        )}
        {activeTab === 'controls' && (
          <ControlsModule 
            problem={problem} setProblem={setProblem}
            popSize={popSize} setPopSize={setPopSize}
            mutRate={mutRate} setMutRate={setMutRate}
            elitism={elitism} setElitism={setElitism}
            maxGenerations={maxGenerations} setMaxGenerations={setMaxGenerations}
            isRunning={isRunning} togglePlay={togglePlay} handleStep={handleStep} handleReset={handleReset}
            generation={generation}
          />
        )}
        {activeTab === 'analysis' && (
          <AnalysisModule 
            metrics={metrics} population={population} 
            isRunning={isRunning} togglePlay={togglePlay} handleReset={handleReset}
            generation={generation} maxGenerations={maxGenerations}
          />
        )}
        {activeTab === 'theory' && <TheoryModule />}
      </main>
    </div>
  );
}

// ==========================================
// MODULE COMPONENTS
// ==========================================

function HeroModule({ setActiveTab }: { setActiveTab: (t: TabType) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generation, setGeneration] = useState(0);
  const [bestFitness, setBestFitness] = useState(0.0);

  useEffect(() => {
    const interval = setInterval(() => {
      setGeneration((prev) => prev + 1);
      setBestFitness((prev) => Math.min(99.99, prev + Math.random() * 2));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: any[] = [];
    let mouse = { x: -1000, y: -1000 };

    class Particle {
      x: number; y: number; vx: number; vy: number; radius: number; color: string;
      constructor(width: number, height: number) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 2 + 1;
        const colors = ['#10b981', '#06b6d4', '#3b82f6', '#047857'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }
      update(width: number, height: number) {
        this.x += this.vx; this.y += this.vy;
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 100) {
          this.x -= dx * 0.02;
          this.y -= dy * 0.02;
        }
      }
      draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
      }
    }

    const init = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
      const particleCount = Math.floor((canvas.width * canvas.height) / 10000);
      particles = Array.from({ length: particleCount }, () => new Particle(canvas.width, canvas.height));
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 80) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            const opacity = 1 - distance / 80;
            ctx.strokeStyle = `rgba(16, 185, 129, ${opacity * 0.3})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      particles.forEach((p) => { p.update(canvas.width, canvas.height); p.draw(ctx); });
      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();

    const handleResize = () => init();
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const handleMouseLeave = () => { mouse.x = -1000; mouse.y = -1000; };

    window.addEventListener('resize', handleResize);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative min-h-full flex flex-col items-center justify-center px-4 text-center">
      <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-60 w-full h-full" />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_100%)] opacity-80" />

      <div className="relative z-10 inline-flex items-center gap-4 px-4 py-2 mb-8 rounded-full bg-slate-900/50 border border-slate-800 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-mono text-slate-300">Generation: {generation}</span>
        </div>
        <div className="w-px h-4 bg-slate-700"></div>
        <div className="text-xs font-mono text-emerald-400">Best Fitness: {bestFitness.toFixed(2)}%</div>
      </div>

      <h1 className="relative z-10 max-w-4xl text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
        Explore the Power of <br className="hidden md:block" />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 animate-gradient-x">
          Evolution Through Code
        </span>
      </h1>

      <p className="relative z-10 max-w-2xl text-lg md:text-xl text-slate-400 mb-10 leading-relaxed">
        An interactive Genetic Algorithm Sandbox. Visualize selection, crossover, and mutation as they solve complex optimization problems in real-time.
      </p>

      <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 mb-16">
        <button onClick={() => setActiveTab('visualizer')} className="group flex items-center gap-2 px-8 py-4 text-base font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full hover:from-emerald-300 hover:to-cyan-300 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:-translate-y-1">
          <Play className="w-5 h-5 fill-slate-950" />
          Start Evolving
        </button>
        <button onClick={() => setActiveTab('theory')} className="flex items-center gap-2 px-8 py-4 text-base font-bold text-slate-300 bg-slate-900/50 border border-slate-700 rounded-full hover:bg-slate-800 hover:text-white transition-all backdrop-blur-sm hover:-translate-y-1">
          <Network className="w-5 h-5" />
          View Algorithms
        </button>
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full px-4">
        {[
          { title: 'Knapsack Problem', desc: 'Optimize resource allocation with weight constraints.', color: 'from-emerald-500/20 to-emerald-500/5', border: 'border-emerald-500/20' },
          { title: 'Travelling Salesman', desc: 'Find the shortest possible route connecting multiple cities.', color: 'from-cyan-500/20 to-cyan-500/5', border: 'border-cyan-500/20' },
          { title: 'Function Maximization', desc: 'Navigate complex 2D landscapes to find global peaks.', color: 'from-blue-500/20 to-blue-500/5', border: 'border-blue-500/20' },
        ].map((feature, idx) => (
          <div key={idx} className={`p-6 rounded-2xl bg-gradient-to-b ${feature.color} border ${feature.border} backdrop-blur-md text-left hover:-translate-y-2 transition-transform duration-300 cursor-default`}>
            <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
            <p className="text-sm text-slate-400">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function VisualizerModule({ 
  problem, setProblem, popSize, setPopSize, mutRate, setMutRate, elitism, setElitism,
  generation, history, population, isRunning, togglePlay, handleStep, handleReset 
}: any) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      ctx.beginPath();
      ctx.moveTo(CITIES[best[0]].x * width, CITIES[best[0]].y * height);
      for (let i = 1; i < best.length; i++) {
        ctx.lineTo(CITIES[best[i]].x * width, CITIES[best[i]].y * height);
      }
      ctx.lineTo(CITIES[best[0]].x * width, CITIES[best[0]].y * height);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();

      CITIES.forEach((city, i) => {
        ctx.beginPath();
        ctx.arc(city.x * width, city.y * height, 4, 0, Math.PI * 2);
        ctx.fillStyle = best[0] === i ? '#10b981' : '#94a3b8';
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
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      for(let i=0; i<=10; i++) {
        ctx.beginPath(); ctx.moveTo(i*width/10, 0); ctx.lineTo(i*width/10, height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i*height/10); ctx.lineTo(width, i*height/10); ctx.stroke();
      }
      population.forEach((ind: any, i: number) => {
        const [x, y] = ind.chromosome;
        ctx.beginPath();
        ctx.arc(x * width, y * height, i === 0 ? 6 : 3, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? '#10b981' : 'rgba(45, 212, 191, 0.4)';
        if (i === 0) { ctx.shadowColor = '#10b981'; ctx.shadowBlur = 10; } 
        else { ctx.shadowBlur = 0; }
        ctx.fill();
      });
      ctx.shadowBlur = 0;
    }
  }, [population, problem]);

  const generateGraphPath = () => {
    if (history.length === 0) return '';
    const maxFit = Math.max(...history);
    const minFit = Math.min(...history);
    const range = maxFit - minFit || 1;
    return history.map((fit: number, i: number) => {
      const x = (i / Math.max(history.length - 1, 1)) * 100;
      const y = 100 - ((fit - minFit) / range) * 100;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-slate-800 bg-slate-900/50 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <Activity className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">Live Visualizer</h1>
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

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 border-r border-slate-800 bg-slate-900/30 p-6 flex flex-col gap-8 overflow-y-auto hidden md:flex">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-emerald-500" /> Environment
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {(['tsp', 'knapsack', 'function'] as ProblemType[]).map((p) => (
                <button
                  key={p} onClick={() => setProblem(p)}
                  className={`px-4 py-3 rounded-lg border text-left transition-all ${
                    problem === p ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="font-medium capitalize">{p === 'tsp' ? 'Traveling Salesman' : p === 'function' ? 'Function Max' : 'Knapsack'}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-500" /> Quick Params
            </h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs"><label className="text-slate-400">Pop Size</label><span className="text-emerald-400 font-mono">{popSize}</span></div>
                <input type="range" min="10" max="500" step="10" value={popSize} onChange={(e) => setPopSize(Number(e.target.value))} className="w-full accent-emerald-500" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs"><label className="text-slate-400">Mutation Rate</label><span className="text-emerald-400 font-mono">{mutRate}</span></div>
                <input type="range" min="0.01" max="1.0" step="0.01" value={mutRate} onChange={(e) => setMutRate(Number(e.target.value))} className="w-full accent-emerald-500" />
              </div>
            </div>
          </div>

          <div className="space-y-3 mt-auto">
            <div className="flex gap-2">
              <button onClick={togglePlay} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all ${isRunning ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'}`}>
                {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />} {isRunning ? 'Pause' : 'Start'}
              </button>
              <button onClick={handleStep} disabled={isRunning} className="p-2.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50"><SkipForward className="w-4 h-4" /></button>
              <button onClick={handleReset} className="p-2.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw className="w-4 h-4" /></button>
            </div>
          </div>
        </aside>

        <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
          <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-2xl relative overflow-hidden flex items-center justify-center min-h-[400px]">
            <canvas ref={canvasRef} width={800} height={600} className="max-w-full max-h-full object-contain" />
          </div>
          <div className="h-48 bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2"><Activity className="w-4 h-4" /> Fitness History</h3>
            </div>
            <div className="flex-1 relative">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                <path d={generateGraphPath()} fill="none" stroke="#10b981" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlsModule({ 
  problem, setProblem, popSize, setPopSize, mutRate, setMutRate, elitism, setElitism, maxGenerations, setMaxGenerations,
  isRunning, togglePlay, handleStep, handleReset, generation 
}: any) {
  const SliderControl = ({ label, value, min, max, step, onChange, unit = '', description }: any) => (
    <div className="flex flex-col space-y-2 mb-6 group">
      <div className="flex justify-between items-end">
        <div>
          <label className="text-sm font-medium text-emerald-300 group-hover:text-emerald-200 transition-colors">{label}</label>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
        <span className="text-lg font-mono text-cyan-400 bg-slate-900/50 px-2 py-1 rounded border border-cyan-900/30">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all" />
    </div>
  );

  const problems = [
    { id: 'knapsack', name: 'Knapsack', icon: Briefcase, desc: 'Combinatorial Optimization' },
    { id: 'tsp', name: 'Travelling Salesman', icon: Map, desc: 'Pathfinding & Routing' },
    { id: 'function', name: 'Function Max', icon: TrendingUp, desc: 'Continuous Landscape' },
  ];

  return (
    <div className="min-h-full p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-5xl w-full bg-slate-900/60 backdrop-blur-xl border border-emerald-900/30 rounded-3xl shadow-2xl shadow-emerald-900/10 overflow-hidden">
        <div className="border-b border-emerald-900/30 bg-slate-900/40 p-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-emerald-950/50 rounded-2xl border border-emerald-800/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Settings2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-300 to-cyan-400 bg-clip-text text-transparent">Control Panel</h1>
              <p className="text-sm text-emerald-600/80 font-medium tracking-wide uppercase mt-1">Configure the Engine</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 bg-slate-950/50 px-4 py-2 rounded-full border border-slate-800">
            <Activity className={`w-4 h-4 ${isRunning ? 'text-emerald-400 animate-bounce' : 'text-slate-500'}`} />
            <span className="text-sm font-mono text-slate-300">Gen: <span className="text-cyan-400 font-bold">{generation.toString().padStart(4, '0')}</span></span>
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-6">
                <Map className="w-5 h-5 text-emerald-500" />
                <h2 className="text-lg font-semibold text-emerald-100">Environment Selection</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {problems.map((p) => {
                  const Icon = p.icon;
                  const isActive = problem === p.id;
                  return (
                    <button key={p.id} onClick={() => setProblem(p.id)} className={`relative flex flex-col items-center p-4 rounded-xl border transition-all duration-300 overflow-hidden ${isActive ? 'bg-emerald-900/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-slate-900/40 border-slate-800 hover:border-emerald-700/50 hover:bg-slate-800/50'}`}>
                      {isActive && <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent opacity-50 pointer-events-none" />}
                      <Icon className={`w-8 h-8 mb-3 transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <span className={`font-semibold text-sm mb-1 ${isActive ? 'text-emerald-100' : 'text-slate-300'}`}>{p.name}</span>
                      <span className="text-xs text-slate-500 text-center">{p.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800/80 mt-8">
              <h3 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">Execution Controls</h3>
              <div className="flex items-center space-x-4">
                <button onClick={togglePlay} className={`flex-1 flex items-center justify-center space-x-2 py-4 rounded-xl font-bold transition-all duration-300 ${isRunning ? 'bg-amber-900/20 text-amber-400 border border-amber-700/50 hover:bg-amber-900/40' : 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-500 hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]'}`}>
                  {isRunning ? <><Pause className="w-5 h-5" /> <span>Pause Evolution</span></> : <><Play className="w-5 h-5" /> <span>Start Evolution</span></>}
                </button>
                <button onClick={handleStep} disabled={isRunning} className="p-4 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><StepForward className="w-5 h-5" /></button>
                <button onClick={handleReset} className="p-4 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hover:bg-rose-900/30 hover:text-rose-400 hover:border-rose-800/50 transition-colors"><RotateCcw className="w-5 h-5" /></button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-950/40 rounded-2xl p-6 border border-emerald-900/20">
            <div className="flex items-center space-x-2 mb-6">
              <Dna className="w-5 h-5 text-cyan-500" />
              <h2 className="text-lg font-semibold text-cyan-100">Genetic Parameters</h2>
            </div>
            <div className="space-y-2">
              <SliderControl label="Population Size" description="Number of individuals per generation" value={popSize} min={10} max={500} step={10} onChange={setPopSize} />
              <SliderControl label="Mutation Rate" description="Probability of random gene alteration" value={mutRate} min={0.01} max={1.0} step={0.01} unit="" onChange={setMutRate} />
              <SliderControl label="Elitism Count" description="Top individuals preserved unchanged" value={elitism} min={0} max={20} step={1} onChange={setElitism} />
              <SliderControl label="Max Generations" description="Termination condition for the algorithm" value={maxGenerations} min={10} max={2000} step={10} onChange={setMaxGenerations} />
            </div>
            <div className="mt-8 p-4 rounded-xl bg-emerald-950/30 border border-emerald-900/30">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2"><span>Diversity Pressure</span><span>Convergence Speed</span></div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                <div className="h-full bg-cyan-500 transition-all duration-500" style={{ width: `${(mutRate / 1.0) * 100}%` }} />
                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(elitism / 20) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalysisModule({ metrics, population, isRunning, togglePlay, handleReset, generation, maxGenerations }: any) {
  const graphCanvasRef = useRef<HTMLCanvasElement>(null);
  const scatterCanvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState<'selection' | 'crossover' | 'mutation'>('selection');

  const CODE_SNIPPETS = {
    selection: `// Tournament Selection
function selectParent(population) {
  const tournamentSize = 5;
  let best = population[Math.floor(Math.random() * population.length)];
  for (let i = 1; i < tournamentSize; i++) {
    const contender = population[Math.floor(Math.random() * population.length)];
    if (contender.fitness > best.fitness) best = contender;
  }
  return best;
}`,
    crossover: `// Crossover (Recombination)
function crossover(p1, p2) {
  // Example: Uniform Crossover
  return p1.map((gene, i) => 
    Math.random() > 0.5 ? gene : p2[i]
  );
}`,
    mutation: `// Random Mutation
function mutate(individual, mutationRate) {
  for (let i = 0; i < individual.length; i++) {
    if (Math.random() < mutationRate) {
      // Perturb or flip gene
      individual[i] = mutateGene(individual[i]); 
    }
  }
}`
  };

  useEffect(() => {
    const canvas = graphCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#134e4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 5; i++) {
      const y = padding + (height - 2 * padding) * (i / 5);
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#2dd4bf';
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    if (metrics.length === 0) return;

    const maxGen = maxGenerations;
    const maxFit = Math.max(...metrics.map((m: any) => m.bestFitness), 10);

    const getX = (gen: number) => padding + (gen / maxGen) * (width - 2 * padding);
    const getY = (fit: number) => height - padding - (fit / maxFit) * (height - 2 * padding);

    ctx.beginPath();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    metrics.forEach((m: any, i: number) => {
      if (i === 0) ctx.moveTo(getX(m.generation), getY(m.avgFitness));
      else ctx.lineTo(getX(m.generation), getY(m.avgFitness));
    });
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    metrics.forEach((m: any, i: number) => {
      if (i === 0) ctx.moveTo(getX(m.generation), getY(m.bestFitness));
      else ctx.lineTo(getX(m.generation), getY(m.bestFitness));
    });
    ctx.stroke();
  }, [metrics, maxGenerations]);

  useEffect(() => {
    const canvas = scatterCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 20;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(padding + i * ((width - 2 * padding) / 10), padding);
      ctx.lineTo(padding + i * ((width - 2 * padding) / 10), height - padding);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(padding, padding + i * ((height - 2 * padding) / 10));
      ctx.lineTo(width - padding, padding + i * ((height - 2 * padding) / 10));
      ctx.stroke();
    }

    if (population.length === 0) return;

    const maxFit = Math.max(...population.map((p: any) => p.fitness), 1);

    population.forEach((ind: any) => {
      const x = padding + ind.traitX * (width - 2 * padding);
      const y = padding + ind.traitY * (height - 2 * padding);
      const relativeFit = ind.fitness / maxFit;
      
      ctx.beginPath();
      ctx.arc(x, y, 4 + relativeFit * 3, 0, Math.PI * 2);
      
      const r = Math.floor(13 + relativeFit * 61);
      const g = Math.floor(148 + relativeFit * 74);
      const b = Math.floor(136 - relativeFit * 56);
      
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.4 + relativeFit * 0.6})`;
      ctx.fill();
      
      if (relativeFit > 0.95) {
        ctx.strokeStyle = '#a3e635';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }, [population]);

  const currentMetrics = metrics[metrics.length - 1] || { bestFitness: 0, avgFitness: 0, diversity: 0 };

  const StatCard = ({ title, value, icon, color = "text-slate-100" }: any) => (
    <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 flex items-center space-x-4 hover:bg-slate-900/60 transition-colors">
      <div className="text-3xl opacity-80">{icon}</div>
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{title}</div>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-full p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-teal-900/50 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-green-500">Evolutionary Analysis</h1>
            <p className="text-sm text-teal-700 mt-1">Real-time monitoring of genetic algorithm performance</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <button onClick={togglePlay} className={`px-6 py-2 rounded-md font-semibold transition-all shadow-lg ${isRunning ? 'bg-rose-900/50 text-rose-400 border border-rose-800 hover:bg-rose-900/70' : 'bg-teal-900/50 text-teal-400 border border-teal-800 hover:bg-teal-900/70'}`}>
              {isRunning ? 'Pause Evolution' : 'Resume Evolution'}
            </button>
            <button onClick={handleReset} className="px-4 py-2 rounded-md font-semibold bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 transition-all">Reset</button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Generation" value={`${generation} / ${maxGenerations}`} icon="🧬" />
          <StatCard title="Best Fitness" value={currentMetrics.bestFitness.toFixed(2)} icon="🏆" color="text-green-400" />
          <StatCard title="Avg Fitness" value={currentMetrics.avgFitness.toFixed(2)} icon="📈" color="text-sky-400" />
          <StatCard title="Pop. Diversity" value={`${(currentMetrics.diversity * 100).toFixed(1)}%`} icon="🌐" color={currentMetrics.diversity < 0.2 ? 'text-rose-400' : 'text-teal-400'} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/50 border border-teal-900/30 rounded-xl p-5 shadow-2xl shadow-teal-900/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-600 to-green-500 opacity-50"></div>
            <h2 className="text-lg font-semibold text-teal-100 mb-4 flex items-center"><span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>Fitness Progression</h2>
            <div className="relative w-full aspect-video bg-slate-950/50 rounded-lg border border-slate-800">
              <canvas ref={graphCanvasRef} width={600} height={300} className="w-full h-full object-contain" />
              <div className="absolute top-4 left-12 flex flex-col space-y-1 text-xs bg-slate-900/80 p-2 rounded border border-slate-700">
                <div className="flex items-center"><span className="w-3 h-1 bg-green-400 mr-2"></span> Best Fitness</div>
                <div className="flex items-center"><span className="w-3 h-1 bg-sky-600 mr-2"></span> Avg Fitness</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-teal-900/30 rounded-xl p-5 shadow-2xl shadow-teal-900/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-emerald-600 opacity-50"></div>
            <h2 className="text-lg font-semibold text-teal-100 mb-4 flex items-center"><span className="w-2 h-2 rounded-full bg-teal-500 mr-2 animate-pulse"></span>Population Diversity Map</h2>
            <div className="relative w-full aspect-video bg-slate-950/50 rounded-lg border border-slate-800">
              <canvas ref={scatterCanvasRef} width={600} height={300} className="w-full h-full object-contain" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="flex border-b border-slate-800 bg-slate-950/50">
            {(Object.keys(CODE_SNIPPETS) as Array<keyof typeof CODE_SNIPPETS>).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'text-teal-300 border-b-2 border-teal-400 bg-slate-900' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'}`}>
                {tab} Logic
              </button>
            ))}
          </div>
          <div className="p-4 bg-[#0d1117] overflow-x-auto">
            <pre className="text-sm font-mono text-slate-300 leading-relaxed">
              <code>
                {CODE_SNIPPETS[activeTab].split('\n').map((line, i) => {
                  const isComment = line.trim().startsWith('//');
                  return (
                    <div key={i} className="table-row">
                      <span className="table-cell text-slate-600 select-none pr-4 text-right w-8">{i + 1}</span>
                      <span className={`table-cell ${isComment ? 'text-teal-700 italic' : ''}`}>
                        {isComment ? line : (
                          <span dangerouslySetInnerHTML={{
                            __html: line.replace(/function/g, '<span class="text-rose-400">function</span>').replace(/return/g, '<span class="text-rose-400">return</span>').replace(/const|let|var/g, '<span class="text-sky-400">$&</span>').replace(/Math\.(random|floor|max|min)/g, '<span class="text-emerald-400">$&</span>').replace(/for|if/g, '<span class="text-purple-400">$&</span>')
                          }} />
                        )}
                      </span>
                    </div>
                  );
                })}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function TheoryModule() {
  const [activeTab, setActiveTab] = useState<'concepts' | 'operators' | 'problems'>('concepts');
  const [openItemId, setOpenItemId] = useState<string | null>('c1');

  const THEORY_DATA: any = {
    concepts: [
      { id: 'c1', title: 'The Biological Analogy', icon: Dna, shortDesc: 'How nature inspires computational optimization.', fullDesc: <div className="space-y-3"><p>Genetic Algorithms (GAs) are search heuristics inspired by Charles Darwin\'s theory of natural evolution. They reflect the process of natural selection where the fittest individuals are selected for reproduction in order to produce offspring of the next generation.</p><ul className="list-disc pl-5 space-y-1 text-emerald-200/80"><li><strong className="text-emerald-300">Population:</strong> A set of possible solutions.</li><li><strong className="text-emerald-300">Chromosome:</strong> A single solution (often an array of bits or numbers).</li><li><strong className="text-emerald-300">Gene:</strong> A single element of a chromosome.</li><li><strong className="text-emerald-300">Fitness:</strong> A score determining how good a solution is.</li></ul></div> },
      { id: 'c2', title: 'Fitness Function', icon: Trophy, shortDesc: 'Evaluating the survival value of a solution.', fullDesc: <div className="space-y-3"><p>The fitness function takes a chromosome as input and returns a numerical score. This score represents how well the chromosome solves the given problem.</p><p>In nature, this is equivalent to an organism\'s ability to survive and reproduce in its environment. In our sandbox, a higher fitness means the solution is closer to the optimal answer.</p></div>, codeSnippet: `// Example: Maximizing the sum of an array\nfunction calculateFitness(chromosome) {\n  return chromosome.reduce((sum, gene) => sum + gene, 0);\n}` }
    ],
    operators: [
      { id: 'o1', title: 'Selection', icon: Trophy, shortDesc: 'Choosing the fittest parents for reproduction.', fullDesc: <div className="space-y-3"><p>Selection determines which individuals get to pass their genes to the next generation. Common methods include:</p><ul className="list-disc pl-5 space-y-1 text-emerald-200/80"><li><strong className="text-emerald-300">Roulette Wheel:</strong> Probability of selection is proportional to fitness.</li><li><strong className="text-emerald-300">Tournament:</strong> A random subset is chosen, and the best among them wins.</li></ul></div>, codeSnippet: `// Tournament Selection\nfunction tournamentSelect(population, tournamentSize) {\n  let best = null;\n  for(let i=0; i < tournamentSize; i++) {\n    const randomInd = population[Math.floor(Math.random() * population.length)];\n    if (!best || randomInd.fitness > best.fitness) {\n      best = randomInd;\n    }\n  }\n  return best;\n}` },
      { id: 'o2', title: 'Crossover (Recombination)', icon: Scissors, shortDesc: 'Combining genes from two parents to create offspring.', fullDesc: <div className="space-y-3"><p>Crossover mimics biological mating. By combining parts of two good solutions, we hope to create an even better solution.</p><p>For binary strings, <strong>Single-Point Crossover</strong> splits the parents at a random index and swaps the tails. For permutation problems (like TSP), special crossovers like <strong>Order-1 (OX1)</strong> are used to prevent duplicate genes.</p></div>, codeSnippet: `// Single-Point Crossover\nfunction crossover(parentA, parentB) {\n  const point = Math.floor(Math.random() * parentA.length);\n  const child1 = [...parentA.slice(0, point), ...parentB.slice(point)];\n  const child2 = [...parentB.slice(0, point), ...parentA.slice(point)];\n  return [child1, child2];\n}` },
      { id: 'o3', title: 'Mutation', icon: Dices, shortDesc: 'Introducing random genetic variations.', fullDesc: <div className="space-y-3"><p>Mutation adds random changes to offspring. This maintains genetic diversity in the population and prevents the algorithm from getting stuck in local optima (a "good enough" solution that isn\'t the absolute best).</p><p>The mutation rate is typically kept very low (e.g., 1% to 5%), much like in real biological systems.</p></div>, codeSnippet: `// Bit-flip Mutation\nfunction mutate(chromosome, mutationRate) {\n  return chromosome.map(gene => {\n    if (Math.random() < mutationRate) {\n      return gene === 0 ? 1 : 0; // Flip bit\n    }\n    return gene;\n  });\n}` }
    ],
    problems: [
      { id: 'p1', title: 'The Knapsack Problem', icon: Briefcase, shortDesc: 'Combinatorial optimization: packing the most value.', fullDesc: <div className="space-y-3"><p><strong>Scenario:</strong> You have a backpack with a weight limit. You have various items, each with a weight and a value. Which items do you pack to maximize total value without breaking the bag?</p><p><strong>GA Encoding:</strong> A binary array where <code>1</code> means "pack the item" and <code>0</code> means "leave it".</p><p><strong>Fitness:</strong> Total value of packed items. If total weight exceeds the limit, fitness drops to 0 (or receives a heavy penalty).</p></div> },
      { id: 'p2', title: 'Travelling Salesman Problem (TSP)', icon: Map, shortDesc: 'Permutation optimization: finding the shortest route.', fullDesc: <div className="space-y-3"><p><strong>Scenario:</strong> A salesperson must visit a set of cities exactly once and return to the start. What is the shortest possible route?</p><p><strong>GA Encoding:</strong> An array representing the order of cities (e.g., <code>[3, 1, 4, 2]</code>).</p><p><strong>Fitness:</strong> The inverse of the total distance (1 / distance). Shorter distance = higher fitness.</p><p className="text-cyan-300/80 text-sm italic">Note: Standard crossover/mutation ruins permutations. We must use swap mutations and order-preserving crossovers.</p></div> },
      { id: 'p3', title: 'Function Maximization', icon: TrendingUp, shortDesc: 'Continuous optimization: finding the highest peak.', fullDesc: <div className="space-y-3"><p><strong>Scenario:</strong> Given a complex mathematical terrain (a 2D or 3D function), find the highest peak (maximum value).</p><p><strong>GA Encoding:</strong> Real numbers or binary strings representing X and Y coordinates.</p><p><strong>Fitness:</strong> The output value of the mathematical function at those coordinates.</p></div> }
    ]
  };

  const CodeBlock = ({ code }: { code: string }) => (
    <div className="relative mt-4 bg-[#01161e] rounded-lg border border-emerald-900/50 overflow-hidden shadow-inner">
      <div className="flex items-center px-4 py-2 bg-[#02242e] border-b border-emerald-900/50">
        <div className="flex space-x-2"><div className="w-3 h-3 rounded-full bg-rose-500/80"></div><div className="w-3 h-3 rounded-full bg-amber-500/80"></div><div className="w-3 h-3 rounded-full bg-emerald-500/80"></div></div>
        <span className="ml-4 text-xs font-mono text-emerald-400/60">genetic_logic.js</span>
      </div>
      <pre className="p-4 text-sm font-mono text-emerald-300 overflow-x-auto"><code>{code}</code></pre>
    </div>
  );

  const AccordionCard = ({ item, isOpen, onClick }: any) => {
    const Icon = item.icon;
    return (
      <div className={`relative overflow-hidden transition-all duration-500 ease-in-out border rounded-xl backdrop-blur-sm ${isOpen ? 'bg-emerald-900/20 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 'bg-emerald-950/40 border-emerald-800/30 hover:bg-emerald-900/30 hover:border-emerald-600/50 cursor-pointer'}`}>
        {isOpen && <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>}
        <div className="p-5 flex items-start gap-4 cursor-pointer" onClick={onClick}>
          <div className={`p-3 rounded-lg transition-colors duration-300 ${isOpen ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-900/50 text-emerald-500'}`}><Icon size={24} /></div>
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <h3 className={`text-lg font-semibold transition-colors duration-300 ${isOpen ? 'text-emerald-100' : 'text-emerald-300'}`}>{item.title}</h3>
              {isOpen ? <ChevronDown className="text-emerald-500" size={20} /> : <ChevronRight className="text-emerald-600" size={20} />}
            </div>
            <p className="text-sm text-emerald-400/70 mt-1">{item.shortDesc}</p>
          </div>
        </div>
        <div className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100 pb-5' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden px-5 ml-[60px]">
            <div className="text-emerald-100/90 leading-relaxed text-sm">
              {item.fullDesc}
              {item.codeSnippet && <CodeBlock code={item.codeSnippet} />}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-full relative overflow-hidden flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-900/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/10 rounded-full blur-[120px]"></div>
      </div>
      <div className="relative z-10 w-full max-w-4xl">
        <header className="mb-12 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-950/50 border border-emerald-800/50 rounded-2xl mb-6 shadow-[0_0_20px_rgba(16,185,129,0.15)] relative group">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl blur-md group-hover:bg-emerald-400/30 transition-all duration-500"></div>
            <Dna size={40} className="text-emerald-400 relative z-10 animate-[spin_10s_linear_infinite]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-cyan-300 to-emerald-400 mb-4">Evolutionary Codex</h1>
          <p className="text-lg text-emerald-200/60 max-w-2xl mx-auto">A biological reference manual for understanding Genetic Algorithms, operators, and optimization problems.</p>
        </header>
        <nav className="flex justify-center mb-8">
          <div className="inline-flex bg-emerald-950/40 p-1.5 rounded-xl border border-emerald-800/30 backdrop-blur-md">
            {[
              { id: 'concepts', label: 'Core Concepts', icon: BookOpen },
              { id: 'operators', label: 'Genetic Operators', icon: Dna },
              { id: 'problems', label: 'Optimization Problems', icon: Lightbulb }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); setOpenItemId(THEORY_DATA[tab.id][0].id); }} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${isActive ? 'bg-emerald-600/20 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'text-emerald-500/70 hover:text-emerald-400 hover:bg-emerald-900/20'}`}>
                  <Icon size={16} /><span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
        <main className="space-y-4 min-h-[500px]">
          {THEORY_DATA[activeTab].map((item: any) => (
            <AccordionCard key={item.id} item={item} isOpen={openItemId === item.id} onClick={() => setOpenItemId(openItemId === item.id ? null : item.id)} />
          ))}
        </main>
        <footer className="mt-16 text-center text-emerald-500/40 text-sm flex items-center justify-center gap-2">
          <Dna size={14} /><span>Powered by Bio-Inspired Computation</span><Dna size={14} />
        </footer>
      </div>
    </div>
  );
}