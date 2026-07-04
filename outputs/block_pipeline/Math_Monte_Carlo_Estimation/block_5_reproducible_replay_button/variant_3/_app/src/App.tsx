import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// --- MATH & PRNG UTILITIES ---
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function boxMuller(prng: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = prng();
  while (v === 0) v = prng();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return num;
}

// --- ICONS (Zero Dependency) ---
const PlayIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
const PauseIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>;
const StepIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>;
const ResetIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;
const HashIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>;
const ShieldIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const TargetIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const FastForwardIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>;

// --- TYPES ---
type ExperimentType = 'pi' | 'auc' | 'option';

interface HistoryPoint {
  n: number;
  est: number;
  lowerCI: number;
  upperCI: number;
}

// --- MAIN APP COMPONENT ---
export default function App() {
  const [activeTab, setActiveTab] = useState<ExperimentType>('pi');
  
  // Settings State
  const [totalSamples, setTotalSamples] = useState(10000);
  const [seed, setSeed] = useState(42);
  const [useVarianceReduction, setUseVarianceReduction] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  
  // Playback State
  const [playState, setPlayState] = useState<'idle' | 'playing' | 'paused' | 'done'>('idle');
  const [currentN, setCurrentN] = useState(0);
  const [estimate, setEstimate] = useState(0);
  const [variance, setVariance] = useState(0);
  const [ci, setCi] = useState<[number, number]>([0, 0]);
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  // Engine Refs (mutated during animation frame)
  const engineRef = useRef({
    prng: mulberry32(seed),
    sum: 0,
    sumSq: 0,
    n: 0,
    historyBuffer: [] as HistoryPoint[],
    pointsBuffer: [] as any[] // For canvas drawing
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);

  // --- EXPERIMENT DEFINITIONS ---
  const experimentParams = useMemo(() => {
    switch (activeTab) {
      case 'pi':
        return {
          title: 'Pi Estimation',
          trueValue: Math.PI,
          desc: 'Monte Carlo dart throwing to estimate π. Variance reduction uses Antithetic Variates.',
          yDomain: [2.8, 3.5]
        };
      case 'auc':
        return {
          title: 'Area Under Curve',
          trueValue: 2.0, // Integral of sin(x) from 0 to pi
          desc: 'Integrating f(x) = sin(x) on [0, π].',
          yDomain: [1.5, 2.5]
        };
      case 'option':
        return {
          title: 'European Call Option',
          trueValue: 10.4506, // approx BS price for S=100, K=100, r=0.05, v=0.2, T=1
          desc: 'Pricing using geometric Brownian motion. VR applies Antithetic Variates to normal shocks.',
          yDomain: [8.0, 13.0]
        };
    }
  }, [activeTab]);

  // --- CORE SIMULATION LOGIC ---
  const resetEngine = useCallback((newSeed = seed) => {
    engineRef.current = {
      prng: mulberry32(newSeed),
      sum: 0,
      sumSq: 0,
      n: 0,
      historyBuffer: [],
      pointsBuffer: []
    };
    setCurrentN(0);
    setEstimate(0);
    setVariance(0);
    setCi([0, 0]);
    setHistory([]);
    setPlayState('idle');

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [seed]);

  // Restart when experiment changes
  useEffect(() => {
    resetEngine();
  }, [activeTab, useVarianceReduction, resetEngine]);

  const stepSimulation = useCallback((count: number) => {
    const eng = engineRef.current;
    if (eng.n >= totalSamples) return false;

    let localSum = 0;
    let localSumSq = 0;
    const pts = [];
    
    const actualCount = Math.min(count, totalSamples - eng.n);

    for (let i = 0; i < actualCount; i++) {
      let val = 0;
      let ptData = null;

      if (activeTab === 'pi') {
        const x = eng.prng();
        const y = eng.prng();
        
        if (useVarianceReduction) {
          // Antithetic
          const x2 = 1 - x;
          const y2 = 1 - y;
          const v1 = (x * x + y * y <= 1) ? 4 : 0;
          const v2 = (x2 * x2 + y2 * y2 <= 1) ? 4 : 0;
          val = (v1 + v2) / 2;
          ptData = { x, y, hit: v1 === 4 };
        } else {
          val = (x * x + y * y <= 1) ? 4 : 0;
          ptData = { x, y, hit: val === 4 };
        }
      } 
      else if (activeTab === 'auc') {
        const x = eng.prng() * Math.PI;
        
        if (useVarianceReduction) {
          const x2 = Math.PI - x;
          const v1 = Math.PI * Math.sin(x);
          const v2 = Math.PI * Math.sin(x2);
          val = (v1 + v2) / 2;
          ptData = { x: x / Math.PI, y: Math.sin(x), hit: true };
        } else {
          val = Math.PI * Math.sin(x);
          ptData = { x: x / Math.PI, y: Math.sin(x), hit: true };
        }
      }
      else if (activeTab === 'option') {
        const z = boxMuller(eng.prng);
        const S0 = 100, K = 100, r = 0.05, v = 0.2, T = 1;
        
        if (useVarianceReduction) {
          const ST1 = S0 * Math.exp((r - 0.5 * v * v) * T + v * Math.sqrt(T) * z);
          const ST2 = S0 * Math.exp((r - 0.5 * v * v) * T + v * Math.sqrt(T) * (-z));
          const payoff1 = Math.exp(-r * T) * Math.max(ST1 - K, 0);
          const payoff2 = Math.exp(-r * T) * Math.max(ST2 - K, 0);
          val = (payoff1 + payoff2) / 2;
          ptData = { x: eng.n + i, y: ST1, hit: ST1 > K };
        } else {
          const ST = S0 * Math.exp((r - 0.5 * v * v) * T + v * Math.sqrt(T) * z);
          val = Math.exp(-r * T) * Math.max(ST - K, 0);
          ptData = { x: eng.n + i, y: ST, hit: ST > K };
        }
      }

      localSum += val;
      localSumSq += val * val;
      if (pts.length < 500) pts.push(ptData); // Cap points buffered per frame
    }

    eng.sum += localSum;
    eng.sumSq += localSumSq;
    eng.n += actualCount;
    eng.pointsBuffer = pts;

    const mean = eng.sum / eng.n;
    const varEst = eng.n > 1 ? (eng.sumSq / eng.n - mean * mean) * (eng.n / (eng.n - 1)) : 0;
    const se = Math.sqrt(varEst / eng.n);
    const ciLow = mean - 1.96 * se;
    const ciHigh = mean + 1.96 * se;

    // Save history sparingly for performance
    if (eng.n % Math.max(1, Math.floor(totalSamples / 100)) === 0 || eng.n === totalSamples) {
      eng.historyBuffer.push({ n: eng.n, est: mean, lowerCI: ciLow, upperCI: ciHigh });
    }

    // Sync to React State
    setCurrentN(