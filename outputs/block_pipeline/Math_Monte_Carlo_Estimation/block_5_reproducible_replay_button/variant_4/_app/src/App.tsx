import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// --- Math & PRNG Utilities ---
// Mulberry32 PRNG for exact reproducibility based on a seed
function getRNG(seed: number) {
  let a = seed;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller transform for Normal(0, 1)
function randomNormal(rng: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// --- Types ---
type ExperimentType = 'pi' | 'area' | 'option';

interface SimulationResult {
  estimate: number;
  variance: number;
  n: number;
  history: { n: number; estimate: number; error: number }[];
  trueValue?: number;
}

// --- Main Application Component ---
export default function App() {
  // Application State
  const [activeTab, setActiveTab] = useState<ExperimentType>('pi');
  const [seed, setSeed] = useState<number>(1337);
  const [sampleSize, setSampleSize] = useState<number>(5000);
  const [useVarianceReduction, setUseVarianceReduction] = useState<boolean>(false);
  
  // Replay & Animation State
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [replayProgress, setReplayProgress] = useState<number>(1); // 0 to 1
  
  // Results State
  const [result, setResult] = useState<SimulationResult | null>(null);

  // Refs for rendering
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>();

  // --- Core Simulation Logic ---
  const simulateStep = useCallback((
    type: ExperimentType, 
    rng: () => number, 
    useVR: boolean
  ): { value: number; point?: { x: number; y: number; color: string } } => {
    if (type === 'pi') {
      const x = rng();
      const y = rng();
      const inCircle = x * x + y * y <= 1.0;
      // In Variance Reduction mode, use antithetic-like grid stratification (simplified as 1 - x)
      // Actually, for Pi, let's keep it simple: Standard is random point. VR uses antithetic (x,y) and (1-x, 1-y).
      let value = inCircle ? 4 : 0;
      
      if (useVR) {
        const inCircleAnti = (1 - x) * (1 - x) + (1 - y) * (1 - y) <= 1.0;
        value = ((inCircle ? 4 : 0) + (inCircleAnti ? 4 : 0)) / 2;
      }

      return {
        value,
        point: { 
          x, 
          y, 
          color: inCircle ? '#14b8a6' : '#f97316' // Teal if inside, Orange if outside
        }
      };
    } 
    
    if (type === 'area') {
      // Integrate sin(x) from 0 to pi. True area = 2.
      const x = rng() * Math.PI;
      let value = Math.sin(x) * Math.PI; // f(x) * (b-a)
      
      if (useVR) {
        // Antithetic variate: x and pi - x
        const x2 = Math.PI - x;
        value = (Math.sin(x) * Math.PI + Math.sin(x2) * Math.PI) / 2;
      }
      
      return {
        value,
        point: { x: x / Math.PI, y: Math.sin(x), color: '#14b8a6' } // x normalized 0-1 for plotting
      };
    }

    if (type === 'option') {
      // European Call Option - Black Scholes MC
      const S0 = 100, K = 100, T = 1, r = 0.05, sigma = 0.2;
      const z = randomNormal(rng);
      
      const ST = S0 * Math.exp((r - 0.5 * sigma * sigma) * T + sigma * Math.sqrt(T) * z);
      let payoff = Math.max(ST - K, 0) * Math.exp(-r * T);

      let ST2 = 0;
      if (useVR) {
        // Antithetic variate: use -z
        ST2 = S0 * Math.exp((r - 0.5 * sigma * sigma) * T + sigma * Math.sqrt(T) * -z);
        const payoff2 = Math.max(ST2 - K, 0) * Math.exp(-r * T);
        payoff = (payoff + payoff2) / 2;
      }

      // Point for plotting: x is z (clamped for visual), y is ST
      return {
        value: payoff,
        point: { 
          x: (z + 4) / 8, // Normalize Z roughly to 0-1
          y: Math.min((useVR ? (ST+ST2)/2 : ST) / 200, 1), // Normalize ST roughly to 0-1 
          color: payoff > 0 ? '#14b8a6' : '#f97316'
        }
      };
    }

    return { value: 0 };
  }, []);

  const getTrueValue = (type: ExperimentType) => {
    if (type === 'pi') return Math.PI;
    if (type === 'area') return 2.0;
    if (type === 'option') return 10.4506; // Approx Black-Scholes exact price
    return 0;
  };

  // --- Run / Replay Orchestrator ---
  const executeSimulation = useCallback((animated: boolean) => {
    // 1. Reset state & canvas
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    
    const rng = getRNG(seed);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw backdrop functions if needed
      if (activeTab === 'area') {
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for(let i=0; i<=canvas.width; i++) {
          const x = (i / canvas.width) * Math.PI;
          const y = canvas.height - Math.sin(x) * canvas.height;
          if(i===0) ctx.moveTo(i, y);
          else ctx.lineTo(i, y);
        }
        ctx.stroke();
      }
    }

    let n = 0;
    let mean = 0;
    let M2 = 0;
    const history: { n: number; estimate: number; error: number }[] = [];
    const trueVal = getTrueValue(activeTab);

    // If instant run, process all points immediately
    if (!animated) {
      for (let i = 1; i <= sampleSize; i++) {
        const { value, point } = simulateStep(activeTab, rng, useVarianceReduction);
        n += 1;
        const delta = value - mean;
        mean += delta / n;
        M2 += delta * (value - mean);
        
        // Save history sparsely to keep memory footprint low
        if (i < 100 || i % Math.ceil(sampleSize / 200) === 0 || i === sampleSize) {
          history.push({ n, estimate: mean, error: Math.sqrt(M2 / n) / Math.sqrt(n) });
        }

        // Draw point
        if (ctx && point) {
          ctx.fillStyle = point.color + '88'; // Add slight transparency
          ctx.fillRect(point.x * canvas!.width, canvas!.height - point.y * canvas!.height, 2, 2);
        }
      }

      setResult({
        estimate: mean,
        variance: M2 / n,
        n,
        history,
        trueValue: trueVal
      });
      setReplayProgress(1);
      setIsReplaying(false);
      return;
    }

    // If animated replay, chunk the processing to hit 60fps smoothly
    setIsReplaying(true);
    setReplayProgress(0);
    
    const chunks = 60; // target 60 frames for the animation
    const chunkSize = Math.ceil(sampleSize / chunks);

    const processChunk = () => {
      const targetN = Math.min(n + chunkSize, sampleSize);
      
      while (n < targetN) {
        n++;
        const { value, point } = simulateStep(activeTab, rng, useVarianceReduction);
        const delta = value - mean;
        mean += delta / n;
        M2 += delta * (value - mean);

        if (n < 100 || n % Math.ceil(sampleSize / 200) === 0 || n === sampleSize) {
          history.push({ n, estimate: mean, error: Math.sqrt(M2 / n) / Math.sqrt(n) });
        }

        if (ctx && point) {
          ctx.fillStyle = point.color + 'aa';
          ctx.fillRect(point.x * canvas!.width, canvas!.height - point.y * canvas!.height, 2, 2);
        }
      }

      setResult({
        estimate: mean,
        variance: M2 / n,
        n,
        history: [...history], // shallow copy to trigger React update
        trueValue: trueVal
      });
      setReplayProgress(n / sampleSize);

      if (n < sampleSize) {
        animFrameRef.current = requestAnimationFrame(processChunk);
      } else {
        setIsReplaying(false);
      }
    };

    animFrameRef.current = requestAnimationFrame(processChunk);

  }, [seed, sampleSize, activeTab, useVarianceReduction, simulateStep]);

  // Run instantly on config change
  useEffect(() => {
    executeSimulation(false);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [executeSimulation]);


  // --- Render Helpers ---
  const standardError = result ? Math.sqrt(result.variance / result.n) : 0;
  const ciLower = result ? result.estimate - 1.96 * standardError : 0;
  const ciUpper = result ? result.estimate + 1.96 * standardError : 0;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-mono flex flex-col selection:bg-teal-500/30">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-[#1e293b]/50 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <svg className="w-5 h-5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Monte Carlo Estimator Lab</h1>
        </div>
        <div className="text-xs text-slate-500 font-sans bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/50">
          Quant-Minded Frontend Edition
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
        
        {/* Left Panel - Controls */}
        <aside className="lg:col-span-3 flex flex-col gap-6">
          
          {/* Experiment Tabs */}
          <div className="bg-[#1e293b] rounded-xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 bg-slate-800/30">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Experiment</h2>
            </div>
            <div className="flex flex-col p-2 gap-1">
              {(['pi', 'area', 'option'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 rounded-lg text-left text-sm transition-all duration-200 ${
                    activeTab === tab 
                      ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-inner' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {tab === 'pi' && '1. Pi Estimation (Circle)'}
                  {tab === 'area' && '2. Integral sin(x)'}
                  {tab === 'option' && '3. European Call Option'}
                </button>
              ))}
            </div>
          </div>

          {/* Engine Parameters */}
          <div className="bg-[#1e293b] rounded-xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 bg-slate-800/30">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Engine Params</h2>
            </div>
            <div className="p-5 flex flex-col gap-6">