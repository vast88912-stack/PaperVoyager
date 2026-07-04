import React, { useState, useEffect, useRef } from 'react';

// --- Icons (Embedded to avoid external dependencies) ---
const ActivityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </svg>
);

const DnaIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 15c6.667-6 13.333 0 20-6"></path>
    <path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993"></path>
    <path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993"></path>
    <path d="m17 6-2.5-2.5"></path>
    <path d="m14 8-1.5-1.5"></path>
    <path d="m7 18 2.5 2.5"></path>
    <path d="m3.5 14.5.5.5"></path>
    <path d="m20 9 .5.5"></path>
    <path d="m6.5 12.5 2 2"></path>
    <path d="m15.5 11.5 2 2"></path>
    <path d="m10 16 1.5 1.5"></path>
  </svg>
);

const CodeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6"></polyline>
    <polyline points="8 6 2 12 8 18"></polyline>
  </svg>
);

// --- Types ---
interface GenerationData {
  gen: number;
  bestFitness: number;
  avgFitness: number;
  diversity: number;
}

// --- Main Component ---
export default function App() {
  const [history, setHistory] = useState<GenerationData[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const [activeTab, setActiveTab] = useState<'graph' | 'logic'>('graph');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maxGenerations = 200;

  // Simulate Evolution Data
  useEffect(() => {
    if (!isRunning) return;

    let currentGen = history.length;
    
    if (currentGen >= maxGenerations) {
      setIsRunning(false);
      return;
    }

    const interval = setInterval(() => {
      setHistory(prev => {
        const last = prev.length > 0 ? prev[prev.length - 1] : { bestFitness: 10, avgFitness: 5, diversity: 100 };
        const nextGen = prev.length;
        
        // Simulated learning curve (logarithmic-ish growth with noise)
        const learningRate = Math.max(0.1, 1 - (nextGen / maxGenerations));
        const jump = Math.random() > 0.9 ? Math.random() * 15 : Math.random() * 2;
        
        let newBest = last.bestFitness + (jump * learningRate);
        let newAvg = last.avgFitness + ((newBest - last.avgFitness) * 0.1) + (Math.random() * 2 - 1);
        
        if (newAvg > newBest) newAvg = newBest - Math.random();
        
        // Diversity drops over time as population converges
        let newDiversity = Math.max(5, 100 * Math.exp(-nextGen / 70) + (Math.random() * 5 - 2.5));

        return [...prev, {
          gen: nextGen,
          bestFitness: newBest,
          avgFitness: newAvg,
          diversity: newDiversity
        }];
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isRunning, history.length]);

  // Render Canvas Graph
  useEffect(() => {
    if (activeTab !== 'graph') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    // Clear and background
    ctx.clearRect(0, 0, width, height);
    
    if (history.length === 0) return;

    // Determine scales
    const maxFit = Math.max(...history.map(d => d.bestFitness), 100);
    const padX = 40;
    const padY = 30;
    
    const scaleX = (width - padX * 2) / maxGenerations;
    const scaleY = (height - padY * 2) / maxFit;

    // Draw Grid (Organic looking, faint)
    ctx.strokeStyle = 'rgba(20, 184, 166, 0.1)'; // Teal faint
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let i=0; i<=5; i++) {
        const y = height - padY - (i * (maxFit/5) * scaleY);
        ctx.moveTo(padX, y);
        ctx.lineTo(width - padX, y);
    }
    ctx.stroke();

    // Helper to draw lines
    const drawLine = (key: 'bestFitness' | 'avgFitness', color: string, glow: string) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 10;
      ctx.shadowColor = glow;
      ctx.lineJoin = 'round';
      
      history.forEach((d, i) => {
        const x = padX + d.gen * scaleX;
        const y = height - padY - d[key] * scaleY;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0; // reset
    };

    // Draw Average Fitness (Cyan)
    drawLine('avgFitness', '#22d3ee', 'rgba(34, 211, 238, 0.5)');
    
    // Draw Best Fitness (Emerald)
    drawLine('bestFitness', '#34d399', 'rgba(52, 211, 153, 0.8)');

    // Axes labels
    ctx.fillStyle = '#99f6e4';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GENERATIONS', width/2, height - 5);
    
    ctx.save();
    ctx.translate(15, height/2);
    ctx.rotate(-Math.PI/2);
    ctx.fillText('FITNESS SCORE', 0, 0);
    ctx.restore();

  }, [history, activeTab]);

  const latest = history[history.length - 1] || { gen: 0, bestFitness: 0, avgFitness: 0, diversity: 100 };

  return (
    <div className="min-h-screen bg-[#021114] text-teal-50 font-sans p-4 md:p-8 selection:bg-teal-500/30">
      
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-teal-900/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[60%] bg-emerald-900/20 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10 space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-teal-800/50 pb-4">
          <div>
            <h1 className="text-2xl font-light tracking-tight text-white flex items-center gap-2">
              <DnaIcon />
              Evolutionary Analysis
            </h1>
            <p className="text-teal-400/60 text-sm mt-1">Real-time biological computing metrics</p>
          </div>
          
          <div className="mt-4 md:mt-0 flex gap-3">
             <button 
                onClick={() => setIsRunning(!isRunning)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 border ${
                  isRunning 
                    ? 'bg-teal-900/30 border-teal-500/30 text-teal-300 hover:bg-teal-900/50' 
                    : 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                }`}
              >
                {isRunning ? 'Suspend Evolution' : 'Resume Evolution'}
              </button>
              <button 
                onClick={() => setHistory([])}
                className="px-4 py-1.5 rounded-full text-sm font-medium bg-slate-800/50 border border-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                Reset
              </button>
          </div>
        </header>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard title="Generation" value={latest.gen} max={maxGenerations} color="teal" />
          <MetricCard title="Peak Fitness" value={latest.bestFitness.toFixed(1)} color="emerald" glow />
          <MetricCard title="Mean Fitness" value={latest.avgFitness.toFixed(1)} color="cyan" />
          <MetricCard 
            title="Pop. Diversity" 
            value={`${latest.diversity.toFixed(1)}%`} 
            color={latest.diversity > 30 ? "emerald" : latest.diversity > 10 ? "yellow" : "red"} 
          />
        </div>

        {/* Main Content Area */}
        <div className="bg-[#051a1e]/80 backdrop-blur-xl border border-teal-900/50 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
          
          {/* Tabs */}
          <div className="flex border-b border-teal-900/50 bg-black/20">
            <button 
              onClick={() => setActiveTab('graph')}
              className={`flex-1 py-3 px-6 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'graph' ? 'text-emerald-400 border-b-2 border-emerald-400 bg-teal-900/10' : 'text-teal-600 hover:text-teal-400'}`}
            >
              <ActivityIcon /> Fitness Trajectory
            </button>
            <button 
              onClick={() => setActiveTab('logic')}
              className={`flex-1 py-3 px-6 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'logic' ? 'text-emerald-400 border-b-2 border-emerald-400 bg-teal-900/10' : 'text-teal-600 hover:text-teal-400'}`}
            >
              <CodeIcon /> Genetic Operators
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6 relative min-h-[400px]">
            {activeTab === 'graph' ? (
              <div className="h-[400px] w-full relative">
                 <canvas 
                    ref={canvasRef} 
                    width={800} 
                    height={400} 
                    className="w-full h-full object-contain"
                  />
                  {/* Graph Legend */}
                  <div className="absolute top-0 right-0 flex gap-4 text-xs font-mono bg-[#021114]/80 p-2 rounded-bl-lg border-b border-l border-teal-900/50">
                    <div className="flex items-center gap-2"><span className="w-3 h-0.5 bg-emerald-400 shadow-[0_0_5px_#34d399]"></span> Best</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-0.5 bg-cyan-400 shadow-[0_0_5px_#22d3ee]"></span> Avg</div>
                  </div>
              </div>
            ) : (
              <div className="h-[400px] w-full overflow-y-auto custom-scrollbar flex flex-col md:flex-row gap-6">
                
                <div className="flex-1 space-y-4">
                  <h3 className="text-teal-300 font-medium text-sm flex items-center gap-2 uppercase tracking-wider">
                    <DnaIcon /> Crossover (Mating)
                  </h3>
                  <div className="bg-[#021114] p-4 rounded-lg border border-teal-900/50 font-mono text-xs text-teal-50/70 overflow-x-auto">
<pre className="text-teal-400">function</pre> <span className="text-emerald-300">uniformCrossover</span>(parentA, parentB) {'{'}
  <br/>  <span className="text-slate-400">// Mix genetic material organically</span>
  <br/>  <span className="text-teal-400">let</span> child = [];
  <br/>  <span className="text-teal-400">for</span> (<span className="text-teal-400">let</span> i = 0; i &lt; parentA.<span className="text-cyan-200">length</span>; i++) {'{'}
  <br/>    <span className="text-slate-400">// 50% chance to inherit from either parent</span>
  <br/>    <span className="text-teal-400">if</span> (Math.<span className="text-cyan-200">random</span>() &gt; 0.5) {'{'}
  <br/>      child.<span className="text-cyan-200">push</span>(parentA[i]);
  <br/>    {'}'} <span className="text-teal-400">else</span> {'{'}
  <br/>      child.<span className="text-cyan-200">push</span>(parentB[i]);
  <br/>    {'}'}
  <br/>  {'}'}
  <br/>  <span className="text-teal-400">return</span> child;
<br/>{'}'}
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <h3 className="text-teal-300 font-medium text-sm flex items-center gap-2 uppercase tracking-wider">
                    <ActivityIcon /> Mutation (Variation)
                  </h3>
                  <div className="bg-[#021114] p-4 rounded-lg border border-teal-900/50 font-mono text-xs text-teal-50/70 overflow-x-auto">
<pre className="text-teal-400">function</pre> <span className="text-emerald-300">mutate</span>(genome, mutationRate) {'{'}
  <br/>  <span className="text-slate-400">// Introduce random biological anomalies</span>
  <br/>  <span className="text-teal-400">for</span> (<span className="text-teal-400">let</span> i = 0; i &lt; genome.<span className="text-cyan-200">length</span>; i++) {'{'}
  <br/>    <span className="text-teal-400">if</span> (Math.<span className="text-cyan-200">random</span>() &lt; mutationRate) {'{'}
  <br/>      <span className="text-slate-400">// Flip bit for knapsack, swap for TSP, etc.</span>
  <br/>      genome[i] = !genome[i]; <span className="text-slate-400">// Example: bit flip</span>
  <br/>    {'}'}
  <br/>  {'}'}
  <br/>  <span className="text-teal-400">return</span> genome;
<br/>{'}'}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Simple global styles for scrollbar included via inline style element to remain single-file pure */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(2, 17, 20, 0.5); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(20, 184, 166, 0.3); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(20, 184, 166, 0.5); }
      `}} />
    </div>
  );
}

// --- Helper Components ---

interface MetricCardProps {
  title: string;
  value: string | number;
  max?: number;
  color: 'teal' | 'emerald' | 'cyan' | 'yellow' | 'red';
  glow?: boolean;
}

function MetricCard({ title, value, max, color, glow }: MetricCardProps) {
  const colorMap = {
    teal: 'text-teal-400 border-teal-900/50 bg-teal-950/30',
    emerald: 'text-emerald-400 border-emerald-900/50 bg-emerald-950/30',
    cyan: 'text-cyan-400 border-cyan-900/50 bg-cyan-950/30',
    yellow: 'text-yellow-400 border-yellow-900/50 bg-yellow-950/30',
    red: 'text-red-400 border-red-900/50 bg-red-950/30',
  };

  const glowClass = glow ? `shadow-[0_0_30px_-5px_var(--tw-shadow-color)] shadow-${color}-500/20` : '';
  const progress = max && typeof value === 'number' ? (value / max) * 100 : null;

  return (
    <div className={`p-4 rounded-xl border backdrop-blur-sm relative overflow-hidden ${colorMap[color]} ${glowClass}`}>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-100/50 mb-1">{title}</h3>
      <div className="text-2xl font-light font-mono">{value}</div>
      
      {/* Optional Progress bar for generation count */}
      {progress !== null && (
        <div className="absolute bottom-0 left-0 h-1 bg-black/40 w-full">
          <div 
            className={`h-full bg-${color}-500/50 transition-all duration-300`} 
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}