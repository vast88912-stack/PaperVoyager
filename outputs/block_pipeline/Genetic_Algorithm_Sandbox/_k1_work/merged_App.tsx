import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, SkipForward, RotateCcw, Activity, Dna, Settings2, 
  Maximize, StepForward, Briefcase, Map, TrendingUp, BookOpen, 
  BarChart3, Home, Code2, Target, Network
} from 'lucide-react';

// --- Types & Interfaces ---
type ProblemType = 'tsp' | 'knapsack' | 'function';
type ViewType = 'hero' | 'sandbox' | 'analysis' | 'theory';

interface GAIndividual {
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

interface AnalysisIndividual {
  id: number;
  traitX: number;
  traitY: number;
  fitness: number;
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

// --- Shared UI Components ---
const SliderControl = ({ label, value, min, max, step, onChange, unit = '', description }: any) => (
  <div className="flex flex-col space-y-2 mb-6 group">
    <div className="flex justify-between items-end">
      <div>
        <label className="text-sm font-medium text-emerald-300 group-hover:text-emerald-200 transition-colors">
          {label}
        </label>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <span className="text-lg font-mono text-cyan-400 bg-slate-900/50 px-2 py-1 rounded border border-cyan-900/30">
        {value}{unit}
      </span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
    />
  </div>
);

const StatCard = ({ title, value, icon, color = "text-slate-100" }: any) => (
  <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 flex items-center space-x-4 hover:bg-slate-900/60 transition-colors">
    <div className="text-3xl opacity-80">{icon}</div>
    <div>
      <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{title}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  </div>
);

const CodeBlock = ({ title, code }: any) => (
  <div className="rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
    <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
      <span className="text-sm font-medium text-slate-300">{title}</span>
      <div className="flex gap-1.5">
        <div className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500/50"></div>
        <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
        <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
      </div>
    </div>
    <div className="bg-[#0d1117] p-4 overflow-x-auto">
      <pre className="text-sm font-mono leading-relaxed">
        <code className="text-emerald-300/90">
          {code.split('\n').map((line: string, i: number) => {
            const highlightedLine = line
              .replace(/(function|const|let|return|if)/g, '<span class="text-purple-400">$1</span>')
              .replace(/(Math\.random|Math\.floor)/g, '<span class="text-cyan-300">$1</span>')
              .replace(/(\/\/.*)/g, '<span class="text-slate-500 italic">$1</span>')
              .replace(/([0-9]+)/g, '<span class="text-amber-300">$1</span>');
            return (
              <div key={i} className="table-row">
                <span className="table-cell text-slate-600 select-none pr-4 text-right w-8">{i + 1}</span>
                <span className="table-cell" dangerouslySetInnerHTML={{ __html: highlightedLine }} />
              </div>
            );
          })}
        </code>
      </pre>
    </div>
  </div>
);

// --- Main Application ---
export default function App() {
  const [activeView, setActiveView] = useState<ViewType>('hero');

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-emerald-500/30">
      
      {/* Global Sidebar Navigation */}
      <nav className="w-20 md:w-64 border-r border-slate-800 bg-slate-950/80 backdrop-blur-xl flex flex-col z-50">
        <div className="h-20 flex items-center justify-center md:justify-start md:px-6 border-b border-slate-800">
          <Dna className="w-8 h-8 text-emerald-400" />
          <span className="hidden md:block ml-3 font-bold text-xl tracking-tight text-slate-100">EvoSandbox</span>
        </div>
        <div className="flex-1 py-6 flex flex-col gap-2 px-3">
          {[
            { id: 'hero', icon: Home, label: 'Home' },
            { id: 'sandbox', icon: Settings2, label: 'Sandbox' },
            { id: 'analysis', icon: BarChart3, label: 'Analysis' },
            { id: 'theory', icon: BookOpen, label: 'Theory' },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as ViewType)}
                className={`flex items-center justify-center md:justify-start px-4 py-3 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="hidden md:block ml-3 font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
        {activeView === 'hero' && <HeroView onLaunch={() => setActiveView('sandbox')} />}
        {activeView === 'sandbox' && <SandboxView />}
        {activeView === 'analysis' && <AnalysisView />}
        {activeView === 'theory' && <TheoryView />}
      </main>
    </div>
  );
}

// --- View Modules ---

function HeroView({ onLaunch }: { onLaunch: () => void }) {
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
        if (Math.sqrt(dx * dx + dy * dy) < 100) {
          this.x -= dx * 0.02; this.y -= dy * 0.02;
        }
      }
      draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color; ctx.fill();
      }
    }

    const init = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
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
            ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(16, 185, 129, ${(1 - distance / 80) * 0.3})`;
            ctx.lineWidth = 1; ctx.stroke();
          }
        }
      }
      particles.forEach((p) => { p.update(canvas.width, canvas.height); p.draw(ctx); });
      animationFrameId = requestAnimationFrame(animate);
    };

    init(); animate();
    const handleResize = () => init();
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top;
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
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center px-4">
      <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-60 w-full h-full" />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_100%)] opacity-80" />

      <div className="relative z-10 flex flex-col items-center">
        <div className="inline-flex items-center gap-4 px-4 py-2 mb-8 rounded-full bg-slate-900/50 border border-slate-800 backdrop-blur-md shadow-xl">
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

        <h1 className="max-w-4xl text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
          Explore the Power of <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500">
            Evolution Through Code
          </span>
        </h1>

        <p className="max-w-2xl text-lg md:text-xl text-slate-400 mb-10 leading-relaxed">
          An interactive Genetic Algorithm Sandbox. Visualize selection, crossover, and mutation as they solve complex optimization problems in real-time.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
          <button onClick={onLaunch} className="group flex items-center gap-2 px-8 py-4 text-base font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full hover:from-emerald-300 hover:to-cyan-300 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:-translate-y-1">
            <Play className="w-5 h-5 fill-slate-950" /> Start Evolving
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full px-4">
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
    </div>
  );
}

function SandboxView() {
  const [problem, setProblem] = useState<ProblemType>('tsp');
  const [popSize, setPopSize] = useState<number>(100);
  const [mutRate, setMutRate] = useState<number>(0.05);
  const [elitism, setElitism] = useState<number>(2);
  const [maxGen, setMaxGen] = useState<number>(500);
  
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [generation, setGeneration] = useState<number>(0);
  const [population, setPopulation] = useState<GAIndividual[]>([]);
  const [history, setHistory] = useState<number[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const initPopulation = useCallback(() => {
    const initialPop: GAIndividual[] = Array.from({ length: popSize }, () => {
      const chromo = generateRandomChromosome(problem);
      return { chromosome: chromo, fitness: evaluateFitness(chromo, problem) };
    });
    initialPop.sort((a, b) => b.fitness - a.fitness);
    setPopulation(initialPop);
    setGeneration(0);
    setHistory([initialPop[0].fitness]);
    setIsRunning(false);
  }, [problem, popSize]);

  useEffect(() => { initPopulation(); }, [initPopulation]);

  const stepGA = useCallback(() => {
    setPopulation((prevPop) => {
      const newPop: GAIndividual[] = [];
      for (let i = 0; i < elitism; i++) newPop.push(prevPop[i]);

      const selectParent = () => {
        let best = prevPop[Math.floor(Math.random() * popSize)];
        for (let i = 1; i < 5; i++) {
          const contender = prevPop[Math.floor(Math.random() * popSize)];
          if (contender.fitness > best.fitness) best = contender;
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
        newPop.push({ chromosome: childChromo, fitness: evaluateFitness(childChromo, problem) });
      }

      newPop.sort((a, b) => b.fitness - a.fitness);
      setHistory((prev) => [...prev, newPop[0].fitness]);
      setGeneration((prev) => prev + 1);
      return newPop;
    });
  }, [elitism, mutRate, popSize, problem]);

  useEffect(() => {
    let timer: number;
    if (isRunning && generation < maxGen) {
      timer = window.setTimeout(() => stepGA(), 30);
    } else if (generation >= maxGen) {
      setIsRunning(false);
    }
    return () => clearTimeout(timer);
  }, [isRunning, generation, maxGen, stepGA]);

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
        ctx.arc(city.x * width, city.y * height, 5, 0, Math.PI * 2);
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
        ctx.beginPath(); ctx.roundRect(x, y, cellW, cellH, 6); ctx.fill(); ctx.stroke();

        ctx.fillStyle = isSelected ? '#a7f3d0' : '#64748b';
        ctx.font = '12px monospace'; ctx.textAlign = 'center';
        ctx.fillText(`v:${item.value}`, x + cellW/2, y + cellH/2 - 4);
        ctx.fillText(`w:${item.weight}`, x + cellW/2, y + cellH/2 + 12);
      });
    }
    else if (problem === 'function') {
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
      for(let i=0; i<=10; i++) {
        ctx.beginPath(); ctx.moveTo(i*width/10, 0); ctx.lineTo(i*width/10, height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i*height/10); ctx.lineTo(width, i*height/10); ctx.stroke();
      }
      population.forEach((ind, i) => {
        const [x, y] = ind.chromosome;
        ctx.beginPath();
        ctx.arc(x * width, y * height, i === 0 ? 8 : 4, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? '#10b981' : 'rgba(45, 212, 191, 0.4)';
        if (i === 0) { ctx.shadowColor = '#10b981'; ctx.shadowBlur = 15; } 
        else { ctx.shadowBlur = 0; }
        ctx.fill();
      });
      ctx.shadowBlur = 0;
    }
  }, [population, problem]);

  return (
    <div className="flex h-full w-full">
      {/* Left Sidebar Controls */}
      <aside className="w-80 border-r border-slate-800 bg-slate-900/40 p-6 flex flex-col gap-8 overflow-y-auto">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Settings2 className="w-4 h-4 text-emerald-500" /> Environment
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {[
              { id: 'tsp', name: 'Travelling Salesman', icon: Map },
              { id: 'knapsack', name: 'Knapsack', icon: Briefcase },
              { id: 'function', name: 'Function Max', icon: TrendingUp }
            ].map((p) => {
              const Icon = p.icon;
              const isActive = problem === p.id;
              return (
                <button
                  key={p.id} onClick={() => { setProblem(p.id as ProblemType); setIsRunning(false); }}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    isActive ? 'bg-emerald-900/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-slate-900/40 border-slate-800 hover:border-emerald-700/50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className={`font-semibold text-sm ${isActive ? 'text-emerald-100' : 'text-slate-300'}`}>{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Dna className="w-4 h-4 text-cyan-500" /> Parameters
          </h3>
          <SliderControl label="Population Size" description="Individuals per generation" value={popSize} min={10} max={500} step={10} onChange={setPopSize} />
          <SliderControl label="Mutation Rate" description="Random gene alteration" value={mutRate} min={0.01} max={1.0} step={0.01} unit="%" onChange={setMutRate} />
          <SliderControl label="Elitism Count" description="Top individuals preserved" value={elitism} min={0} max={20} step={1} onChange={setElitism} />
          <SliderControl label="Max Generations" description="Termination condition" value={maxGen} min={10} max={2000} step={10} onChange={setMaxGen} />
        </div>
      </aside>

      {/* Main Visualization Area */}
      <main className="flex-1 flex flex-col p-6 gap-6 overflow-hidden">
        <header className="flex items-center justify-between bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsRunning(!isRunning)} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${isRunning ? 'bg-amber-900/20 text-amber-400 border border-amber-700/50' : 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-500'}`}>
              {isRunning ? <><Pause className="w-5 h-5" /> Pause</> : <><Play className="w-5 h-5" /> Start</>}
            </button>
            <button onClick={() => { setIsRunning(false); stepGA(); }} disabled={isRunning} className="p-3 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 disabled:opacity-50">
              <StepForward className="w-5 h-5" />
            </button>
            <button onClick={initPopulation} className="p-3 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hover:bg-rose-900/30 hover:text-rose-400">
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-950/50 px-4 py-2 rounded-full border border-slate-800">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-slate-300">Gen: <strong className="text-emerald-400 font-mono">{generation}</strong></span>
            </div>
            <div className="flex items-center gap-2 bg-slate-950/50 px-4 py-2 rounded-full border border-slate-800">
              <Maximize className="w-4 h-4 text-teal-400" />
              <span className="text-sm text-slate-300">Best Fit: <strong className="text-teal-400 font-mono">{history[history.length-1]?.toFixed(2) || '0.00'}</strong></span>
            </div>
          </div>
        </header>

        <div className="flex-1 bg-slate-900/30 border border-slate-800 rounded-2xl flex items-center justify-center p-4 relative">
          <canvas ref={canvasRef} width={800} height={600} className="w-full h-full object-contain" />
        </div>
      </main>
    </div>
  );
}

function AnalysisView() {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [generation, setGeneration] = useState<number>(0);
  const [metrics, setMetrics] = useState<GenerationMetric[]>([]);
  const [population, setPopulation] = useState<AnalysisIndividual[]>([]);
  const [activeTab, setActiveTab] = useState<'selection' | 'crossover' | 'mutation'>('selection');

  const graphCanvasRef = useRef<HTMLCanvasElement>(null);
  const scatterCanvasRef = useRef<HTMLCanvasElement>(null);

  const POPULATION_SIZE = 100;
  const MAX_GENERATIONS = 200;

  useEffect(() => {
    if (generation === 0 && population.length === 0) {
      const initPop = Array.from({ length: POPULATION_SIZE }, (_, i) => ({
        id: i, traitX: Math.random(), traitY: Math.random(), fitness: Math.random() * 20,
      }));
      setPopulation(initPop);
      setMetrics([{ generation: 0, bestFitness: Math.max(...initPop.map(i => i.fitness)), avgFitness: initPop.reduce((sum, i) => sum + i.fitness, 0) / POPULATION_SIZE, diversity: 1.0 }]);
    }

    let timer: number;
    if (isRunning && generation < MAX_GENERATIONS) {
      timer = window.setInterval(() => {
        setGeneration(prev => prev + 1);
        setPopulation(prevPop => {
          const targetX = 0.7; const targetY = 0.3;
          return prevPop.map(ind => {
            const dx = (targetX - ind.traitX) * 0.05 + (Math.random() - 0.5) * 0.05;
            const dy = (targetY - ind.traitY) * 0.05 + (Math.random() - 0.5) * 0.05;
            const newX = Math.max(0, Math.min(1, ind.traitX + dx));
            const newY = Math.max(0, Math.min(1, ind.traitY + dy));
            const dist = Math.sqrt(Math.pow(targetX - newX, 2) + Math.pow(targetY - newY, 2));
            const newFitness = Math.min(100, ind.fitness + (1 - dist) * 2 + (Math.random() * 2));
            return { ...ind, traitX: newX, traitY: newY, fitness: newFitness };
          });
        });
      }, 100);
    } else if (generation >= MAX_GENERATIONS) {
      setIsRunning(false);
    }
    return () => clearInterval(timer);
  }, [isRunning, generation, population.length]);

  useEffect(() => {
    if (population.length > 0 && generation > 0) {
      const best = Math.max(...population.map(i => i.fitness));
      const avg = population.reduce((sum, i) => sum + i.fitness, 0) / POPULATION_SIZE;
      const xs = population.map(i => i.traitX);
      const ys = population.map(i => i.traitY);
      const diversity = Math.max(0, Math.min(1, (Math.max(...xs) - Math.min(...xs) + Math.max(...ys) - Math.min(...ys)) / 2));
      setMetrics(prev => [...prev, { generation, bestFitness: best, avgFitness: avg, diversity }]);
    }
  }, [population, generation]);

  useEffect(() => {
    const canvas = graphCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas;
    const padding = 40;
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = '#134e4a'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i <= 5; i++) {
      const y = padding + (height - 2 * padding) * (i / 5);
      ctx.moveTo(padding, y); ctx.lineTo(width - padding, y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#2dd4bf'; ctx.beginPath();
    ctx.moveTo(padding, padding); ctx.lineTo(padding, height - padding); ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    if (metrics.length === 0) return;
    const getX = (gen: number) => padding + (gen / MAX_GENERATIONS) * (width - 2 * padding);
    const getY = (fit: number) => height - padding - (fit / 100) * (height - 2 * padding);

    ctx.beginPath(); ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 2;
    metrics.forEach((m, i) => i === 0 ? ctx.moveTo(getX(m.generation), getY(m.avgFitness)) : ctx.lineTo(getX(m.generation), getY(m.avgFitness)));
    ctx.stroke();

    ctx.beginPath(); ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2;
    metrics.forEach((m, i) => i === 0 ? ctx.moveTo(getX(m.generation), getY(m.bestFitness)) : ctx.lineTo(getX(m.generation), getY(m.bestFitness)));
    ctx.stroke();
  }, [metrics]);

  useEffect(() => {
    const canvas = scatterCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas;
    const padding = 20;
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath(); ctx.moveTo(padding + i * ((width - 2 * padding) / 10), padding); ctx.lineTo(padding + i * ((width - 2 * padding) / 10), height - padding); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(padding, padding + i * ((height - 2 * padding) / 10)); ctx.lineTo(width - padding, padding + i * ((height - 2 * padding) / 10)); ctx.stroke();
    }

    if (population.length === 0) return;
    const maxFit = Math.max(...population.map(p => p.fitness), 1);

    population.forEach(ind => {
      const x = padding + ind.traitX * (width - 2 * padding);
      const y = padding + ind.traitY * (height - 2 * padding);
      const relativeFit = ind.fitness / maxFit;
      
      ctx.beginPath(); ctx.arc(x, y, 4 + relativeFit * 3, 0, Math.PI * 2);
      const r = Math.floor(13 + relativeFit * 61);
      const g = Math.floor(148 + relativeFit * 74);
      const b = Math.floor(136 - relativeFit * 56);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.4 + relativeFit * 0.6})`;
      ctx.fill();
      if (relativeFit > 0.95) { ctx.strokeStyle = '#a3e635'; ctx.lineWidth = 2; ctx.stroke(); }
    });
  }, [population]);

  const currentMetrics = metrics[metrics.length - 1] || { bestFitness: 0, avgFitness: 0, diversity: 0 };
  const CODE_SNIPPETS = {
    selection: `// Roulette Wheel Selection\nfunction selectParent(population) {\n  const totalFitness = population.reduce((sum, ind) => sum + ind.fitness, 0);\n  let slice = Math.random() * totalFitness;\n  for (let i = 0; i < population.length; i++) {\n    slice -= population[i].fitness;\n    if (slice <= 0) return population[i];\n  }\n  return population[population.length - 1];\n}`,
    crossover: `// Single-Point Crossover\nfunction crossover(parentA, parentB) {\n  const crossoverPoint = Math.floor(Math.random() * parentA.genes.length);\n  const childGenes = [\n    ...parentA.genes.slice(0, crossoverPoint),\n    ...parentB.genes.slice(crossoverPoint)\n  ];\n  return new Individual(childGenes);\n}`,
    mutation: `// Random Mutation\nfunction mutate(individual, mutationRate) {\n  for (let i = 0; i < individual.genes.length; i++) {\n    if (Math.random() < mutationRate) {\n      individual.genes[i] = 1 - individual.genes[i]; \n    }\n  }\n}`
  };

  return (
    <div className="h-full overflow-y-auto p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-teal-900/50 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-green-500">Evolutionary Analysis</h1>
            <p className="text-sm text-teal-700 mt-1">Real-time monitoring of genetic algorithm performance</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <button onClick={() => setIsRunning(!isRunning)} className={`px-6 py-2 rounded-md font-semibold transition-all shadow-lg ${isRunning ? 'bg-rose-900/50 text-rose-400 border border-rose-800' : 'bg-teal-900/50 text-teal-400 border border-teal-800'}`}>
              {isRunning ? 'Pause Evolution' : 'Resume Evolution'}
            </button>
            <button onClick={() => { setIsRunning(false); setGeneration(0); setPopulation([]); setMetrics([]); }} className="px-4 py-2 rounded-md font-semibold bg-slate-800 text-slate-400 border border-slate-700">Reset</button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Generation" value={`${generation} / ${MAX_GENERATIONS}`} icon="🧬" />
          <StatCard title="Best Fitness" value={currentMetrics.bestFitness.toFixed(2)} icon="🏆" color="text-green-400" />
          <StatCard title="Avg Fitness" value={currentMetrics.avgFitness.toFixed(2)} icon="📈" color="text-sky-400" />
          <StatCard title="Pop. Diversity" value={`${(currentMetrics.diversity * 100).toFixed(1)}%`} icon="🌐" color={currentMetrics.diversity < 0.2 ? 'text-rose-400' : 'text-teal-400'} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/50 border border-teal-900/30 rounded-xl p-5 shadow-2xl relative overflow-hidden">
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

          <div className="bg-slate-900/50 border border-teal-900/30 rounded-xl p-5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-emerald-600 opacity-50"></div>
            <h2 className="text-lg font-semibold text-teal-100 mb-4 flex items-center"><span className="w-2 h-2 rounded-full bg-teal-500 mr-2 animate-pulse"></span>Population Diversity Map</h2>
            <div className="relative w-full aspect-video bg-slate-950/50 rounded-lg border border-slate-800">
              <canvas ref={scatterCanvasRef} width={600} height={300} className="w-full h-full object-contain" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="flex border-b border-slate-800 bg-slate-950/50">
            {(['selection', 'crossover', 'mutation'] as const).map((tab) => (
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

function TheoryView() {
  const [activeSection, setActiveSection] = useState('intro');
  const SECTIONS = [
    { id: 'intro', title: 'Biological Inspiration', icon: Dna },
    { id: 'operators', title: 'Genetic Operators', icon: BookOpen },
    { id: 'problems', title: 'Optimization Problems', icon: Target },
    { id: 'code', title: 'Algorithm Implementation', icon: Code2 },
  ];

  return (
    <div className="h-full overflow-y-auto p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <header className="border-b border-emerald-500/20 pb-6 mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Genetic Algorithm Theory & Reference</h1>
          <p className="text-sm text-emerald-200/60 mt-2">Understanding bio-inspired computing</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <nav className="space-y-2 md:col-span-1">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button key={section.id} onClick={() => setActiveSection(section.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'hover:bg-white/5 text-slate-400 hover:text-slate-200 border border-transparent'}`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : ''}`} />
                  <span className="font-medium text-left">{section.title}</span>
                </button>
              );
            })}
          </nav>

          <div className="md:col-span-3 bg-slate-900/40 border border-emerald-500/10 rounded-2xl p-6 md:p-8 shadow-xl">
            {activeSection === 'intro' && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-emerald-50">Biological Inspiration</h2>
                <p className="text-lg leading-relaxed text-slate-300">Genetic Algorithms (GAs) are search heuristics that mimic the process of natural evolution. They reflect the process of natural selection where the fittest individuals are selected for reproduction in order to produce offspring of the next generation.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                  <div className="p-5 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/5 border border-white/5"><h4 className="text-lg font-bold text-white mb-2">Population</h4><p className="text-sm text-slate-300">A subset of all the possible (encoded) solutions to the given problem.</p></div>
                  <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/5 border border-white/5"><h4 className="text-lg font-bold text-white mb-2">Chromosomes</h4><p className="text-sm text-slate-300">One such solution to the given problem. Often represented as an array or string.</p></div>
                  <div className="p-5 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/5 border border-white/5"><h4 className="text-lg font-bold text-white mb-2">Gene</h4><p className="text-sm text-slate-300">One element position of a chromosome. Represents a specific trait or variable.</p></div>
                  <div className="p-5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/5 border border-white/5"><h4 className="text-lg font-bold text-white mb-2">Fitness Function</h4><p className="text-sm text-slate-300">A function that assigns a score to each chromosome, determining how 'good' the solution is.</p></div>
                </div>
              </div>
            )}
            {activeSection === 'operators' && (
              <div className="space-y-8">
                <h2 className="text-3xl font-bold text-emerald-50">Genetic Operators</h2>
                <div className="space-y-4">
                  <h3 className="text-2xl font-semibold text-emerald-400 border-b border-emerald-500/20 pb-2">1. Selection</h3>
                  <p className="text-slate-300">The goal of selection is to highlight the fittest individuals and pass their genes to the next generation.</p>
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-semibold text-emerald-400 border-b border-emerald-500/20 pb-2">2. Crossover (Recombination)</h3>
                  <p className="text-slate-300">Crossover is the process of combining the genetic information of two parents to generate new offspring.</p>
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-semibold text-emerald-400 border-b border-emerald-500/20 pb-2">3. Mutation</h3>
                  <p className="text-slate-300">Mutation introduces random tweaks to the chromosome to maintain genetic diversity and prevent premature convergence to local optima.</p>
                </div>
              </div>
            )}
            {activeSection === 'problems' && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-emerald-50">Optimization Problems</h2>
                <div className="space-y-6 mt-6">
                  <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-xl border-l-4 border-emerald-500 shadow-lg">
                    <h3 className="text-xl font-bold text-emerald-300 mb-2">0/1 Knapsack Problem</h3>
                    <p className="text-slate-400 mb-4">Given a set of items, each with a weight and a value, determine which items to include in a collection so that the total weight is less than or equal to a given limit and the total value is as large as possible.</p>
                  </div>
                  <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-xl border-l-4 border-cyan-500 shadow-lg">
                    <h3 className="text-xl font-bold text-cyan-300 mb-2">Travelling Salesman Problem (TSP)</h3>
                    <p className="text-slate-400 mb-4">Given a list of cities and the distances between each pair of cities, what is the shortest possible route that visits each city exactly once and returns to the origin city?</p>
                  </div>
                </div>
              </div>
            )}
            {activeSection === 'code' && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-emerald-50">Algorithm Implementation</h2>
                <CodeBlock title="1. Single-Point Crossover" code={`function crossover(parentA, parentB) {\n  const point = Math.floor(Math.random() * parentA.length);\n  const child1 = [...parentA.slice(0, point), ...parentB.slice(point)];\n  const child2 = [...parentB.slice(0, point), ...parentA.slice(point)];\n  return [child1, child2];\n}`} />
                <CodeBlock title="2. Bit-Flip Mutation" code={`function mutate(chromosome, mutationRate) {\n  return chromosome.map(gene => {\n    if (Math.random() < mutationRate) return gene === 1 ? 0 : 1;\n    return gene;\n  });\n}`} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}