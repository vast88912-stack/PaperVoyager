import React, { useState, useEffect, useRef } from 'react';

// --- Types & Interfaces ---
interface GenerationMetric {
  generation: number;
  bestFitness: number;
  avgFitness: number;
  diversity: number;
}

interface Individual {
  id: number;
  traitX: number;
  traitY: number;
  fitness: number;
}

// --- Mock Data & Simulation Helpers ---
const POPULATION_SIZE = 100;
const MAX_GENERATIONS = 200;

const generateInitialPopulation = (): Individual[] => {
  return Array.from({ length: POPULATION_SIZE }, (_, i) => ({
    id: i,
    traitX: Math.random(),
    traitY: Math.random(),
    fitness: Math.random() * 20,
  }));
};

const CODE_SNIPPETS = {
  selection: `// Roulette Wheel Selection
function selectParent(population) {
  const totalFitness = population.reduce((sum, ind) => sum + ind.fitness, 0);
  let slice = Math.random() * totalFitness;
  
  for (let i = 0; i < population.length; i++) {
    slice -= population[i].fitness;
    if (slice <= 0) return population[i];
  }
  return population[population.length - 1];
}`,
  crossover: `// Single-Point Crossover
function crossover(parentA, parentB) {
  const crossoverPoint = Math.floor(Math.random() * parentA.genes.length);
  const childGenes = [
    ...parentA.genes.slice(0, crossoverPoint),
    ...parentB.genes.slice(crossoverPoint)
  ];
  return new Individual(childGenes);
}`,
  mutation: `// Random Mutation
function mutate(individual, mutationRate) {
  for (let i = 0; i < individual.genes.length; i++) {
    if (Math.random() < mutationRate) {
      // Flip bit or perturb value
      individual.genes[i] = 1 - individual.genes[i]; 
    }
  }
}`
};

export default function App() {
  // --- State ---
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [generation, setGeneration] = useState<number>(0);
  const [metrics, setMetrics] = useState<GenerationMetric[]>([]);
  const [population, setPopulation] = useState<Individual[]>([]);
  const [activeTab, setActiveTab] = useState<keyof typeof CODE_SNIPPETS>('selection');

  // Refs for Canvas
  const graphCanvasRef = useRef<HTMLCanvasElement>(null);
  const scatterCanvasRef = useRef<HTMLCanvasElement>(null);

  // --- Simulation Logic (Mocking the GA process for analysis) ---
  useEffect(() => {
    // Initialize
    if (generation === 0 && population.length === 0) {
      const initPop = generateInitialPopulation();
      setPopulation(initPop);
      setMetrics([{
        generation: 0,
        bestFitness: Math.max(...initPop.map(i => i.fitness)),
        avgFitness: initPop.reduce((sum, i) => sum + i.fitness, 0) / POPULATION_SIZE,
        diversity: 1.0
      }]);
    }

    let timer: number;
    if (isRunning && generation < MAX_GENERATIONS) {
      timer = window.setInterval(() => {
        setGeneration(prev => prev + 1);
        
        setPopulation(prevPop => {
          // Simulate convergence: move towards a "perfect" trait at (0.7, 0.3)
          const targetX = 0.7;
          const targetY = 0.3;
          
          return prevPop.map(ind => {
            // Move slightly towards target + add some random mutation noise
            const dx = (targetX - ind.traitX) * 0.05 + (Math.random() - 0.5) * 0.05;
            const dy = (targetY - ind.traitY) * 0.05 + (Math.random() - 0.5) * 0.05;
            
            const newX = Math.max(0, Math.min(1, ind.traitX + dx));
            const newY = Math.max(0, Math.min(1, ind.traitY + dy));
            
            // Fitness increases as they get closer to target
            const dist = Math.sqrt(Math.pow(targetX - newX, 2) + Math.pow(targetY - newY, 2));
            const newFitness = Math.min(100, ind.fitness + (1 - dist) * 2 + (Math.random() * 2));

            return { ...ind, traitX: newX, traitY: newY, fitness: newFitness };
          });
        });

      }, 100); // 100ms per generation
    } else if (generation >= MAX_GENERATIONS) {
      setIsRunning(false);
    }

    return () => clearInterval(timer);
  }, [isRunning, generation, population.length]);

  // Update metrics when population changes
  useEffect(() => {
    if (population.length > 0 && generation > 0) {
      const best = Math.max(...population.map(i => i.fitness));
      const avg = population.reduce((sum, i) => sum + i.fitness, 0) / POPULATION_SIZE;
      
      // Calculate mock diversity (spread of traits)
      const xs = population.map(i => i.traitX);
      const ys = population.map(i => i.traitY);
      const spreadX = Math.max(...xs) - Math.min(...xs);
      const spreadY = Math.max(...ys) - Math.min(...ys);
      const diversity = Math.max(0, Math.min(1, (spreadX + spreadY) / 2));

      setMetrics(prev => [...prev, { generation, bestFitness: best, avgFitness: avg, diversity }]);
    }
  }, [population, generation]);

  // --- Canvas Drawing: Fitness Graph ---
  useEffect(() => {
    const canvas = graphCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw Grid & Axes
    ctx.strokeStyle = '#134e4a'; // teal-900
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 5; i++) {
      const y = padding + (height - 2 * padding) * (i / 5);
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#2dd4bf'; // teal-400
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    if (metrics.length === 0) return;

    const maxGen = MAX_GENERATIONS;
    const maxFit = 100;

    const getX = (gen: number) => padding + (gen / maxGen) * (width - 2 * padding);
    const getY = (fit: number) => height - padding - (fit / maxFit) * (height - 2 * padding);

    // Draw Avg Fitness
    ctx.beginPath();
    ctx.strokeStyle = '#0284c7'; // sky-600
    ctx.lineWidth = 2;
    metrics.forEach((m, i) => {
      if (i === 0) ctx.moveTo(getX(m.generation), getY(m.avgFitness));
      else ctx.lineTo(getX(m.generation), getY(m.avgFitness));
    });
    ctx.stroke();

    // Draw Best Fitness
    ctx.beginPath();
    ctx.strokeStyle = '#4ade80'; // green-400
    ctx.lineWidth = 2;
    metrics.forEach((m, i) => {
      if (i === 0) ctx.moveTo(getX(m.generation), getY(m.bestFitness));
      else ctx.lineTo(getX(m.generation), getY(m.bestFitness));
    });
    ctx.stroke();

  }, [metrics]);

  // --- Canvas Drawing: Population Scatter ---
  useEffect(() => {
    const canvas = scatterCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 20;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background grid
    ctx.strokeStyle = '#0f172a'; // slate-900
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

    // Draw Individuals
    const maxFit = Math.max(...population.map(p => p.fitness), 1);

    population.forEach(ind => {
      const x = padding + ind.traitX * (width - 2 * padding);
      const y = padding + ind.traitY * (height - 2 * padding);
      
      // Color based on relative fitness
      const relativeFit = ind.fitness / maxFit;
      
      ctx.beginPath();
      ctx.arc(x, y, 4 + relativeFit * 3, 0, Math.PI * 2);
      
      // Bio-luminescent coloring
      const r = Math.floor(13 + relativeFit * 61);   // 13 -> 74
      const g = Math.floor(148 + relativeFit * 74);  // 148 -> 222
      const b = Math.floor(136 - relativeFit * 56);  // 136 -> 80
      
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.4 + relativeFit * 0.6})`;
      ctx.fill();
      
      if (relativeFit > 0.95) {
        ctx.strokeStyle = '#a3e635'; // lime-400
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

  }, [population]);

  const currentMetrics = metrics[metrics.length - 1] || { bestFitness: 0, avgFitness: 0, diversity: 0 };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-6 font-sans selection:bg-teal-900 selection:text-teal-100">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-teal-900/50 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-green-500">
              Evolutionary Analysis
            </h1>
            <p className="text-sm text-teal-700 mt-1">Real-time monitoring of genetic algorithm performance</p>
          </div>
          
          <div className="mt-4 md:mt-0 flex space-x-3">
            <button 
              onClick={() => setIsRunning(!isRunning)}
              className={`px-6 py-2 rounded-md font-semibold transition-all shadow-lg ${
                isRunning 
                  ? 'bg-rose-900/50 text-rose-400 border border-rose-800 hover:bg-rose-900/70' 
                  : 'bg-teal-900/50 text-teal-400 border border-teal-800 hover:bg-teal-900/70'
              }`}
            >
              {isRunning ? 'Pause Evolution' : 'Resume Evolution'}
            </button>
            <button 
              onClick={() => {
                setIsRunning(false);
                setGeneration(0);
                setPopulation([]);
                setMetrics([]);
              }}
              className="px-4 py-2 rounded-md font-semibold bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 transition-all"
            >
              Reset
            </button>
          </div>
        </header>

        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Generation" value={`${generation} / ${MAX_GENERATIONS}`} icon="🧬" />
          <StatCard title="Best Fitness" value={currentMetrics.bestFitness.toFixed(2)} icon="🏆" color="text-green-400" />
          <StatCard title="Avg Fitness" value={currentMetrics.avgFitness.toFixed(2)} icon="📈" color="text-sky-400" />
          <StatCard 
            title="Pop. Diversity" 
            value={`${(currentMetrics.diversity * 100).toFixed(1)}%`} 
            icon="🌐" 
            color={currentMetrics.diversity < 0.2 ? 'text-rose-400' : 'text-teal-400'} 
          />
        </div>

        {/* Main Visualizations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Fitness Graph */}
          <div className="bg-slate-900/50 border border-teal-900/30 rounded-xl p-5 shadow-2xl shadow-teal-900/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-600 to-green-500 opacity-50"></div>
            <h2 className="text-lg font-semibold text-teal-100 mb-4 flex items-center">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
              Fitness Progression
            </h2>
            <div className="relative w-full aspect-video bg-slate-950/50 rounded-lg border border-slate-800">
              <canvas 
                ref={graphCanvasRef} 
                width={600} 
                height={300} 
                className="w-full h-full object-contain"
              />
              {/* Legend */}
              <div className="absolute top-4 left-12 flex flex-col space-y-1 text-xs bg-slate-900/80 p-2 rounded border border-slate-700">
                <div className="flex items-center"><span className="w-3 h-1 bg-green-400 mr-2"></span> Best Fitness</div>
                <div className="flex items-center"><span className="w-3 h-1 bg-sky-600 mr-2"></span> Avg Fitness</div>
              </div>
            </div>
          </div>

          {/* Population Scatter */}
          <div className="bg-slate-900/50 border border-teal-900/30 rounded-xl p-5 shadow-2xl shadow-teal-900/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-emerald-600 opacity-50"></div>
            <h2 className="text-lg font-semibold text-teal-100 mb-4 flex items-center">
              <span className="w-2 h-2 rounded-full bg-teal-500 mr-2 animate-pulse"></span>
              Population Diversity Map
            </h2>
            <div className="relative w-full aspect-video bg-slate-950/50 rounded-lg border border-slate-800">
              <canvas 
                ref={scatterCanvasRef} 
                width={600} 
                height={300} 
                className="w-full h-full object-contain"
              />
            </div>
          </div>

        </div>

        {/* Code Snippets Section */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="flex border-b border-slate-800 bg-slate-950/50">
            {(Object.keys(CODE_SNIPPETS) as Array<keyof typeof CODE_SNIPPETS>).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab 
                    ? 'text-teal-300 border-b-2 border-teal-400 bg-slate-900' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'
                }`}
              >
                {tab} Logic
              </button>
            ))}
          </div>
          <div className="p-4 bg-[#0d1117] overflow-x-auto">
            <pre className="text-sm font-mono text-slate-300 leading-relaxed">
              <code>
                {CODE_SNIPPETS[activeTab].split('\n').map((line, i) => {
                  // Extremely basic syntax highlighting simulation
                  let formattedLine = line;
                  const isComment = line.trim().startsWith('//');
                  
                  return (
                    <div key={i} className="table-row">
                      <span className="table-cell text-slate-600 select-none pr-4 text-right w-8">{i + 1}</span>
                      <span className={`table-cell ${isComment ? 'text-teal-700 italic' : ''}`}>
                        {isComment ? line : (
                          <span dangerouslySetInnerHTML={{
                            __html: line
                              .replace(/function/g, '<span class="text-rose-400">function</span>')
                              .replace(/return/g, '<span class="text-rose-400">return</span>')
                              .replace(/const|let|var/g, '<span class="text-sky-400">$&</span>')
                              .replace(/Math\.(random|floor|max|min)/g, '<span class="text-emerald-400">$&</span>')
                              .replace(/for|if/g, '<span class="text-purple-400">$&</span>')
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

// --- Subcomponents ---

function StatCard({ title, value, icon, color = "text-slate-100" }: { title: string, value: string | number, icon: string, color?: string }) {
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 flex items-center space-x-4 hover:bg-slate-900/60 transition-colors">
      <div className="text-3xl opacity-80">{icon}</div>
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{title}</div>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
      </div>
    </div>
  );
}