import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity, Play, Pause, RotateCcw, TrendingDown, Zap, Target, Layers } from 'lucide-react';

// Candy color palette
const COLORS = {
  primary: '#FF6B9E', // Candy Pink
  secondary: '#45E3FF', // Cyan
  tertiary: '#FFD166', // Yellow
  quaternary: '#C56CD6', // Purple
  background: '#FAFAFA',
  card: '#FFFFFF',
  text: '#334155',
  grid: '#E2E8F0',
};

type Algorithm = 'K-Means' | 'MiniBatch' | 'K-Medoids' | 'GMM';

interface DataPoint {
  iteration: number;
  inertia: number;
  baseline?: number;
}

const ALGORITHMS: { name: Algorithm; icon: React.FC<any>; color: string; desc: string }[] = [
  { name: 'K-Means', icon: Target, color: COLORS.primary, desc: 'Standard Lloyd\'s algorithm' },
  { name: 'MiniBatch', icon: Zap, color: COLORS.secondary, desc: 'Stochastic updates (noisy)' },
  { name: 'K-Medoids', icon: Layers, color: COLORS.tertiary, desc: 'PAM discrete jumps' },
  { name: 'GMM', icon: Activity, color: COLORS.quaternary, desc: 'EM Log-Likelihood (inverted)' },
];

export default function App() {
  const [data, setData] = useState<DataPoint[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const [algorithm, setAlgorithm] = useState<Algorithm>('K-Means');
  const [iteration, setIteration] = useState(0);
  const [silhouetteScore, setSilhouetteScore] = useState(0.12);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const maxIterations = 50;

  // Simulate realistic inertia curves based on algorithm choice
  const generateNextInertia = (prev: number, iter: number, algo: Algorithm): number => {
    const progress = iter / maxIterations;
    const baseFloor = 1500;
    
    if (algo === 'K-Means') {
      // Smooth exponential decay
      const drop = (prev - baseFloor) * 0.82;
      return baseFloor + drop;
    } 
    else if (algo === 'MiniBatch') {
      // Noisy exponential decay
      const drop = (prev - baseFloor) * 0.85;
      const noise = (Math.random() - 0.5) * 400 * (1 - progress);
      return Math.max(baseFloor + 200, baseFloor + drop + noise);
    } 
    else if (algo === 'K-Medoids') {
      // Step-wise drops (simulating discrete medoid swaps)
      if (iter % 5 === 0 && iter < 30) {
        return baseFloor + (prev - baseFloor) * 0.6;
      }
      return prev - (Math.random() * 10); // Tiny improvements between swaps
    } 
    else if (algo === 'GMM') {
      // S-curve drop (slow start, fast drop, long tail)
      if (iter < 5) return prev * 0.98;
      if (iter < 15) return baseFloor + (prev - baseFloor) * 0.7;
      return baseFloor + (prev - baseFloor) * 0.9;
    }
    return prev;
  };

  const resetSimulation = () => {
    setIteration(0);
    setData([{ iteration: 0, inertia: 10000 }]);
    setSilhouetteScore(Math.random() * 0.2 + 0.1);
    setIsRunning(true);
  };

  useEffect(() => {
    resetSimulation();
  }, [algorithm]);

  useEffect(() => {
    if (isRunning && iteration < maxIterations) {
      timerRef.current = setTimeout(() => {
        setIteration(prev => prev + 1);
        setData(prevData => {
          const lastInertia = prevData[prevData.length - 1].inertia;
          const nextInertia = generateNextInertia(lastInertia, iteration + 1, algorithm);
          return [...prevData, { iteration: iteration + 1, inertia: nextInertia }];
        });
        
        // Simulate silhouette score improving as inertia drops
        if (iteration % 3 === 0) {
          setSilhouetteScore(prev => Math.min(0.85, prev + (Math.random() * 0.05)));
        }
      }, 250); // 250ms per iteration for smooth visual
    } else if (iteration >= maxIterations) {
      setIsRunning(false);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isRunning, iteration, algorithm]);

  const activeAlgoConfig = useMemo(() => ALGORITHMS.find(a => a.name === algorithm) || ALGORITHMS[0], [algorithm]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-100">
          <p className="text-slate-500 text-sm font-semibold mb-1">Iteration {label}</p>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeAlgoConfig.color }} />
            <p className="text-slate-800 font-bold text-lg">
              {payload[0].value.toFixed(0)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-800 font-sans p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-5xl w-full bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
        
        {/* Header Section */}
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-pink-50 rounded-xl text-pink-500">
                <TrendingDown size={24} strokeWidth={2.5} />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
                Live Inertia
              </h1>
            </div>
            <p className="text-slate-500 font-medium ml-1">Real-time convergence tracking</p>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
            {ALGORITHMS.map((algo) => {
              const Icon = algo.icon;
              const isActive = algorithm === algo.name;
              return (
                <button
                  key={algo.name}
                  onClick={() => setAlgorithm(algo.name)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                    isActive 
                      ? 'bg-white shadow-sm text-slate-800 scale-105' 
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                  }`}
                >
                  <Icon size={18} color={isActive ? algo.color : 'currentColor'} strokeWidth={isActive ? 2.5 : 2} />
                  {algo.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="p-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left Sidebar: Stats & Controls */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            
            {/* Silhouette Badge */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-3xl border border-slate-200/60 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">Silhouette Score</p>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black tracking-tighter" style={{ color: activeAlgoConfig.color }}>
                  {silhouetteScore.toFixed(3)}
                </span>
              </div>
              <div className="mt-4 w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ 
                    width: `${Math.max(0, silhouetteScore) * 100}%`,
                    backgroundColor: activeAlgoConfig.color 
                  }}
                />
              </div>
            </div>

            {/* Current Inertia Stat */}
            <div className="p-6 rounded-3xl border border-slate-100 bg-white shadow-sm">
              <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Current Inertia</p>
              <p className="text-3xl font-extrabold text-slate-700">
                {data.length > 0 ? data[data.length - 1].inertia.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '---'}
              </p>
              <p className="text-slate-400 text-xs font-semibold mt-2">
                Iteration {iteration} / {maxIterations}
              </p>
            </div>

            {/* Controls */}
            <div className="flex gap-3 mt-auto">
              <button
                onClick={() => setIsRunning(!isRunning)}
                disabled={iteration >= maxIterations}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white shadow-lg shadow-pink-500/20 transition-all hover:shadow-pink-500/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: activeAlgoConfig.color }}
              >
                {isRunning ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                {isRunning ? 'Pause' : 'Play'}
              </button>
              <button
                onClick={resetSimulation}
                className="p-4 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors font-bold"
                title="Restart Simulation"
              >
                <RotateCcw size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            <p className="text-xs text-slate-400 font-medium text-center px-4">
              {activeAlgoConfig.desc}
            </p>

          </div>

          {/* Right Area: Chart */}
          <div className="lg:col-span-3 h-[450px] bg-white rounded-3xl border border-slate-100 p-6 shadow-sm relative">
            
            {/* Chart overlay gradients for candy feel */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none rounded-3xl overflow-hidden">
              <div className="absolute top-[-50%] left-[-10%] w-[70%] h-[70%] bg-pink-100/30 rounded-full blur-3xl opacity-50 mix-blend-multiply" />
              <div className="absolute bottom-[-50%] right-[-10%] w-[70%] h-[70%] bg-cyan-100/30 rounded-full blur-3xl opacity-50 mix-blend-multiply" />
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 20, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInertia" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={activeAlgoConfig.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={activeAlgoConfig.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="8 8" vertical={false} stroke={COLORS.grid} />
                <XAxis 
                  dataKey="iteration" 
                  type="number" 
                  domain={[0, maxIterations]} 
                  tickCount={6}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  domain={[0, 11000]} 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                  dx={-10}
                  tickFormatter={(val) => `${val / 1000}k`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 2, strokeDasharray: '4 4' }} />
                
                {/* Optimal convergence line */}
                <ReferenceLine y={1500} stroke="#e2e8f0" strokeDasharray="4 4" label={{ position: 'insideBottomRight', value: 'Optimal Minimum', fill: '#94a3b8', fontSize: 12, fontWeight: 600, dy: -10 }} />

                <Area 
                  type="monotone" 
                  dataKey="inertia" 
                  stroke={activeAlgoConfig.color} 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorInertia)" 
                  animationDuration={300}
                  isAnimationActive={false} // Disabled built-in animation to let the manual state updates drive it smoothly
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}