import React, { useState, useEffect, useRef } from 'react';
import { Activity, Dna, Code2, Play, Pause, RotateCcw, Maximize2, GitMerge, Shuffle } from 'lucide-react';

// --- Types & Interfaces ---
interface DataPoint {
  generation: number;
  bestFitness: number;
  avgFitness: number;
}

interface Individual {
  x: number;
  y: number;
  fitness: number;
}

// --- Mock Simulation Logic (to drive the Analysis/Output view) ---
const TARGET_X = 0.75;
const TARGET_Y = 0.25;

const calculateFitness = (x: number, y: number) => {
  // Distance to target, inverted so higher is better. Max fitness = 1.0
  const dist = Math.sqrt(Math.pow(x - TARGET_X, 2) + Math.pow(y - TARGET_Y, 2));
  return Math.max(0, 1 - dist * 1.5); 
};

const generateInitialPopulation = (size: number): Individual[] => {
  return Array.from({ length: size }, () => {
    const x = Math.random();
    const y = Math.random();
    return { x, y, fitness: calculateFitness(x, y) };
  });
};

// --- Main Component ---
export default function App() {
  const [isRunning, setIsRunning] = useState(true);
  const [generation, setGeneration] = useState(0);
  const [history, setHistory] = useState<DataPoint[]>([]);
  const [population, setPopulation] = useState<Individual[]>([]);
  const [activeTab, setActiveTab] = useState<'selection' | 'crossover' | 'mutation'>('crossover');

  const POPULATION_SIZE = 100;
  const MAX_GENERATIONS = 200;

  // Initialize
  useEffect(() => {
    resetSimulation();
  }, []);

  // Simulation Loop
  useEffect(() => {
    let intervalId: number;

    if (isRunning && generation < MAX_GENERATIONS) {
      intervalId = window.setInterval(() => {
        setGeneration((prev) => prev + 1);
        
        // Evolve population (mock logic for visual effect)
        setPopulation((prevPop) => {
          const newPop = prevPop.map(ind => {
            // Move slowly towards target to simulate learning, with some noise
            const moveX = (TARGET_X - ind.x) * 0.05 + (Math.random() - 0.5) * 0.1;
            const moveY = (TARGET_Y - ind.y) * 0.05 + (Math.random() - 0.5) * 0.1;
            let newX = Math.max(0, Math.min(1, ind.x + moveX));
            let newY = Math.max(0, Math.min(1, ind.y + moveY));
            
            // Random mutation jumps
            if (Math.random() < 0.05) {
                newX = Math.random();
                newY = Math.random();
            }

            return { x: newX, y: newY, fitness: calculateFitness(newX, newY) };
          });
          return newPop;
        });

      }, 100); // 100ms per generation
    } else if (generation >= MAX_GENERATIONS) {
        setIsRunning(false);
    }

    return () => clearInterval(intervalId);
  }, [isRunning, generation]);

  // Update History
  useEffect(() => {
    if (population.length > 0) {
      const best = Math.max(...population.map(p => p.fitness));
      const avg = population.reduce((sum, p) => sum + p.fitness, 0) / population.length;
      
      setHistory(prev => {
        const newHist = [...prev, { generation, bestFitness: best, avgFitness: avg }];
        // Keep last 100 points for smooth charting
        if (newHist.length > MAX_GENERATIONS) newHist.shift();
        return newHist;
      });
    }
  }, [population, generation]);

  const resetSimulation = () => {
    setGeneration(0);
    setHistory([]);
    setPopulation(generateInitialPopulation(POPULATION_SIZE));
    setIsRunning(true);
  };

  const currentBest = history.length > 0 ? history[history.length - 1].bestFitness : 0;
  const currentAvg = history.length > 0 ? history[history.length - 1].avgFitness : 0;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans p-4 md:p-8 flex flex-col gap-6 selection:bg-emerald-500/30">
      
      {/* Header / Top Stats Bar */}
      <header className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-2xl border border-emerald-900/30 backdrop-blur-md shadow-lg shadow-emerald-950/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <Activity className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">Evolutionary Analysis</h1>
            <p className="text-xs text-emerald-500/70 font-mono">Run ID: GA-ENV-2048 // 2D Function Max</p>
          </div>
        </div>

        <div className="flex gap-6 items-center">
          <StatBox label="Generation" value={generation.toString().padStart(3, '0')} />
          <StatBox label="Best Fitness" value={currentBest.toFixed(4)} highlight />
          <StatBox label="Pop Diversity" value={((1 - currentAvg/currentBest) * 100).toFixed(1) + '%'} />
          
          <div className="h-8 w-px bg-slate-800 mx-2"></div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setIsRunning(!isRunning)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 hover:border-emerald-500/50"
              title={isRunning ? "Pause" : "Resume"}
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-400" />}
            </button>
            <button 
              onClick={resetSimulation}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 hover:border-rose-500/50"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        
        {/* Left Column: Visualizations */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Fitness Progression Chart */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 flex flex-col shadow-inner shadow-black/50 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                <Activity className="w-32 h-32 text-emerald-400" />
            </div>
            <h2 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              Fitness Trajectory
            </h2>
            <div className="h-64 w-full rounded-xl overflow-hidden relative">
              <FitnessChart history={history} maxGen={MAX_GENERATIONS} />
            </div>
            <div className="flex gap-4 mt-4 text-xs font-mono justify-center">
              <div className="flex items-center gap-2"><span className="w-3 h-0.5 bg-emerald-400 block"></span> Best Fitness</div>
              <div className="flex items-center gap-2"><span className="w-3 h-0.5 bg-cyan-700 block"></span> Avg Fitness</div>
            </div>
          </div>

          {/* Population Distribution Scatter */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 flex flex-col shadow-inner shadow-black/50">
            <h2 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
              <Maximize2 className="w-4 h-4 text-cyan-500" />
              Population Spatial Distribution (Gen {generation})
            </h2>
            <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="w-64 h-64 rounded-xl border border-slate-700/50 bg-[#0a0f1c] relative overflow-hidden shrink-0">
                    <PopulationScatter population={population} target={{x: TARGET_X, y: TARGET_Y}} />
                </div>
                <div className="flex-1 space-y-4">
                    <p className="text-sm text-slate-400 leading-relaxed">
                        Visualizing the current generation in the 2D solution space. 
                        The <span className="text-rose-400 font-bold">×</span> marks the global optimum. 
                        Brighter, larger nodes represent individuals with higher fitness.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                            <div className="text-xs text-slate-500 mb-1">Convergence Metric</div>
                            <div className="font-mono text-emerald-400 text-lg">
                                {population.length > 0 ? (population.filter(p => p.fitness > 0.9).length / population.length * 100).toFixed(0) : 0}%
                            </div>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                            <div className="text-xs text-slate-500 mb-1">Best Gene (X, Y)</div>
                            <div className="font-mono text-cyan-400 text-sm">
                                {population.length > 0 ? 
                                    `[${population.reduce((prev, current) => (prev.fitness > current.fitness) ? prev : current).x.toFixed(2)}, ` +
                                    `${population.reduce((prev, current) => (prev.fitness > current.fitness) ? prev : current).y.toFixed(2)}]` 
                                : '[0, 0]'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>

        {/* Right Column: Code & Mechanics Analysis */}
        <div className="flex flex-col gap-6">
          
          {/* Best Individual Decoder */}
          <div className="bg-slate-900/60 border border-emerald-900/40 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-cyan-500"></div>
            <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <Dna className="w-4 h-4 text-emerald-400" />
              Alpha Specimen Analysis
            </h2>
            <div className="space-y-3">
               <div className="flex justify-between items-end border-b border-slate-800 pb-2">
                   <span className="text-xs text-slate-500">Phenotype Expressed</span>
                   <span className="font-mono text-emerald-400">Fitness: {currentBest.toFixed(5)}</span>
               </div>
               
               <div className="bg-[#050b14] p-3 rounded-lg border border-slate-800/60 font-mono text-xs text-slate-400 break-all leading-tight">
                  <span className="text-slate-600">// Binary representation of best genes</span><br/>
                  <span className="text-emerald-500/50">01001101 01100011 11001010 00110001</span><br/>
                  <span className="text-cyan-500/50">10110100 11110000 01010101 10001010</span>
               </div>

               <div className="pt-2 flex flex-col gap-2 text-sm">
                   <div className="flex justify-between">
                       <span className="text-slate-500">Survival Probability:</span>
                       <span className="text-slate-300">98.4%</span>
                   </div>
                   <div className="flex justify-between">
                       <span className="text-slate-500">Mating Pool Rank:</span>
                       <span className="text-emerald-400">#1 (Elite)</span>
                   </div>
               </div>
            </div>
          </div>

          {/* Engine Mechanics / Code View */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col flex-1 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
                <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-slate-400" />
                    Engine Mechanics
                </h2>
                <div className="flex gap-1 bg-slate-950 p-1 rounded-md border border-slate-800">
                    <TabButton active={activeTab === 'selection'} onClick={() => setActiveTab('selection')} icon={<Activity className="w-3 h-3"/>} label="Sel" />
                    <TabButton active={activeTab === 'crossover'} onClick={() => setActiveTab('crossover')} icon={<GitMerge className="w-3 h-3"/>} label="Cross" />
                    <TabButton active={activeTab === 'mutation'} onClick={() => setActiveTab('mutation')} icon={<Shuffle className="w-3 h-3"/>} label="Mut" />
                </div>
            </div>
            
            <div className="p-4 bg-[#0a0f1c] flex-1 overflow-y-auto custom-scrollbar">
                <CodeSnippet type={activeTab} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// --- Subcomponents ---

const StatBox = ({ label, value, highlight = false }: { label: string, value: string, highlight?: boolean }) => (
  <div className="flex flex-col">
    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">{label}</span>
    <span className={`font-mono text-lg leading-none ${highlight ? 'text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'text-slate-200'}`}>
      {value}
    </span>
  </div>
);

const TabButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors ${
            active ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
        }`}
    >
        {icon}
        {label}
    </button>
);

// Canvas Chart Component
const FitnessChart = ({ history, maxGen }: { history: DataPoint[], maxGen: number }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Handle high DPI displays for crisp lines
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        
        const width = rect.width;
        const height = rect.height;

        ctx.clearRect(0, 0, width, height);

        if (history.length === 0) return;

        // Draw grid lines
        ctx.strokeStyle = '#1e293b'; // slate-800
        ctx.lineWidth = 1;
        for(let i=0; i<=4; i++) {
            const y = (height - 20) * (i/4) + 10;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        const paddingX = 10;
        const paddingY = 10;
        const drawWidth = width - paddingX * 2;
        const drawHeight = height - paddingY * 2;

        const mapX = (gen: number) => paddingX + (gen / maxGen) * drawWidth;
        const mapY = (fit: number) => paddingY + drawHeight - (fit * drawHeight); // Assuming max fitness is 1

        // Draw Avg Fitness (Background line)
        ctx.beginPath();
        ctx.strokeStyle = '#0e7490'; // cyan-700
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        history.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(mapX(pt.generation), mapY(pt.avgFitness));
            else ctx.lineTo(mapX(pt.generation), mapY(pt.avgFitness));
        });
        ctx.stroke();

        // Draw Best Fitness
        ctx.beginPath();
        ctx.strokeStyle = '#34d399'; // emerald-400
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        
        // Create gradient fill under best fitness
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(52, 211, 153, 0.2)');
        gradient.addColorStop(1, 'rgba(52, 211, 153, 0)');

        ctx.moveTo(mapX(history[0].generation), height); // Start from bottom for fill
        
        history.forEach((pt) => {
             ctx.lineTo(mapX(pt.generation), mapY(pt.bestFitness));
        });
        
        const lastPt = history[history.length-1];
        ctx.lineTo(mapX(lastPt.generation), height); // End at bottom
        ctx.fillStyle = gradient;
        ctx.fill();

        // Stroke the actual best line
        ctx.beginPath();
        history.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(mapX(pt.generation), mapY(pt.bestFitness));
            else ctx.lineTo(mapX(pt.generation), mapY(pt.bestFitness));
        });
        ctx.stroke();

        // Draw current point glow
        if (history.length > 0) {
            const lastX = mapX(lastPt.generation);
            const lastY = mapY(lastPt.bestFitness);
            
            ctx.beginPath();
            ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#10b981'; // emerald-500
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(lastX, lastY, 10, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(52, 211, 153, 0.3)';
            ctx.fill();
        }

    }, [history, maxGen]);

    return (
        <canvas 
            ref={canvasRef} 
            className="absolute inset-0 w-full h-full"
            style={{ width: '100%', height: '100%' }}
        />
    );
};

// Canvas Scatter Component
const PopulationScatter = ({ population, target }: { population: Individual[], target: {x:number, y:number} }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        
        const width = rect.width;
        const height = rect.height;

        ctx.clearRect(0, 0, width, height);

        // Draw Target (Optimum)
        const tx = target.x * width;
        const ty = target.y * height;
        ctx.strokeStyle = '#fb7185'; // rose-400
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx - 6, ty - 6); ctx.lineTo(tx + 6, ty + 6);
        ctx.moveTo(tx + 6, ty - 6); ctx.lineTo(tx - 6, ty + 6);
        ctx.stroke();

        // Draw Population
        population.forEach(ind => {
            const x = ind.x * width;
            const y = ind.y * height;
            
            // Size and color based on fitness
            const radius = 2 + (ind.fitness * 4);
            const alpha = 0.3 + (ind.fitness * 0.7);
            
            // Create organic looking nodes (radial gradient)
            const radGrad = ctx.createRadialGradient(x, y, 0, x, y, radius);
            
            if (ind.fitness > 0.8) {
                radGrad.addColorStop(0, `rgba(167, 243, 208, ${alpha})`); // emerald-200
                radGrad.addColorStop(1, `rgba(16, 185, 129, ${alpha})`);  // emerald-500
            } else {
                radGrad.addColorStop(0, `rgba(56, 189, 248, ${alpha})`); // sky-400
                radGrad.addColorStop(1, `rgba(3, 105, 161, ${alpha})`);  // sky-700
            }

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = radGrad;
            ctx.fill();
        });

    }, [population, target]);

    return (
        <canvas 
            ref={canvasRef} 
            className="absolute inset-0 w-full h-full"
            style={{ width: '100%', height: '100%' }}
        />
    );
};

// Simple Code Highlighter Component
const CodeSnippet = ({ type }: { type: 'selection' | 'crossover' | 'mutation' }) => {
    
    const snippets = {
        selection: `// Tournament Selection
function select(population, tournamentSize = 3) {
  let best = null;
  for (let i = 0; i < tournamentSize; i++) {
    const randomInd = population[
      Math.floor(Math.random() * population.length)
    ];
    if (!best || randomInd.fitness > best.fitness) {
      best = randomInd;
    }
  }
  return best;
}`,
        crossover: `// Uniform Crossover
function crossover(parentA, parentB) {
  const childGene = {};
  // Iterate through properties (e.g., x, y)
  for (let key in parentA) {
    if (key === 'fitness') continue;
    
    // 50% chance to inherit from either parent
    childGene[key] = Math.random() < 0.5 
      ? parentA[key] 
      : parentB[key];
  }
  return childGene;
}`,
        mutation: `// Gaussian Mutation
function mutate(individual, mutationRate) {
  for (let key in individual) {
    if (key === 'fitness') continue;
    
    if (Math.random() < mutationRate) {
      // Add random noise to gene
      const noise = (Math.random() - 0.5) * 0.1;
      individual[key] += noise;
      
      // Clamp bounds [0, 1]
      individual[key] = Math.max(0, 
        Math.min(1, individual[key])
      );
    }
  }
  return individual;
}`
    };

    const code = snippets[type];

    // Ultra basic manual syntax highlighting for visual effect
    const renderHighlightedCode = () => {
        const lines = code.split('\n');
        return lines.map((line, i) => {
            let formattedLine = line;
            if (line.trim().startsWith('//')) {
                return <div key={i} className="text-slate-500">{line}</div>;
            }
            // highlight keywords
            formattedLine = formattedLine.replace(/(function|return|let|const|for|if|continue)/g, '<span class="text-rose-400">$1</span>');
            // highlight built-ins
            formattedLine = formattedLine.replace(/(Math|random|