import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// --- Utility: Seedable PRNG (Mulberry32) ---
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateSeed() {
  return Math.floor(Math.random() * 1000000);
}

// --- Icons (Inline SVGs to avoid dependencies) ---
const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2v6h-6" />
    <path d="M3 12a9 9 0 1 0 2.1-5.9L21 8" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const ChartIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="m19 9-5 5-4-4-3 3" />
  </svg>
);

// --- Types ---
interface DataPoint {
  n: number;
  estimate: number;
  variance: number;
  ciLower: number;
  ciUpper: number;
}

export default function App() {
  // --- State ---
  const [activeTab, setActiveTab] = useState('pi');
  const [sampleSize, setSampleSize] = useState<number>(2000);
  const [isImportanceSampling, setIsImportanceSampling] = useState<boolean>(false);
  const [seed, setSeed] = useState<number>(1337);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);

  const requestRef = useRef<number>();
  const simStateRef = useRef({ n: 0, sum: 0, sumSq: 0, prng: () => 0 });

  // --- Simulation Logic ---
  // Estimating Pi via integral of 4/(1+x^2) from 0 to 1.
  // Standard MC: x ~ U(0,1), f(x) = 4/(1+x^2).
  // Importance Sampling: p(x) = (4-2x)/3. Inverse CDF: x = 2 - sqrt(4-3u).
  // Estimator with IS: f(x)/p(x) = (4/(1+x^2)) * (3/(4-2x)).

  const runSimulation = useCallback(() => {
    setIsRunning(true);
    setDataPoints([]);
    setHoveredPoint(null);

    simStateRef.current = {
      n: 0,
      sum: 0,
      sumSq: 0,
      prng: mulberry32(seed),
    };

    const targetN = sampleSize;
    const batchSize = Math.max(10, Math.floor(targetN / 100)); // ~100 frames to complete
    const newData: DataPoint[] = [];

    const loop = () => {
      let { n, sum, sumSq, prng } = simStateRef.current;
      const isIS = isImportanceSampling;

      let batchCount = 0;
      while (batchCount < batchSize && n < targetN) {
        n++;
        batchCount++;
        const u = prng();
        let val = 0;

        if (isIS) {
          const x = 2 - Math.sqrt(4 - 3 * u);
          val = (4 / (1 + x * x)) * (3 / (4 - 2 * x));
        } else {
          const x = u;
          val = 4 / (1 + x * x);
        }

        sum += val;
        sumSq += val * val;

        // Save data points periodically or on last step
        if (n % batchSize === 0 || n === targetN) {
          if (n > 1) {
            const mean = sum / n;
            const variance = (sumSq - (sum * sum) / n) / (n - 1);
            const se = Math.sqrt(Math.max(0, variance)) / Math.sqrt(n);
            newData.push({
              n,
              estimate: mean,
              variance: variance,
              ciLower: mean - 1.96 * se,
              ciUpper: mean + 1.96 * se,
            });
          }
        }
      }

      simStateRef.current = { n, sum, sumSq, prng };
      setDataPoints((prev) => [...prev, ...newData.splice(0, newData.length)]);

      if (n < targetN) {
        requestRef.current = requestAnimationFrame(loop);
      } else {
        setIsRunning(false);
      }
    };

    requestRef.current = requestAnimationFrame(loop);
  }, [seed, sampleSize, isImportanceSampling]);

  // Handle Play/Replay
  const handleReplay = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    runSimulation();
  };

  const handleNewSeed = () => {
    setSeed(generateSeed());
  };

  // Run initial simulation
  useEffect(() => {
    handleReplay();
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, isImportanceSampling, sampleSize]);

  // --- Chart Setup ---
  const latestData = dataPoints[dataPoints.length - 1];
  const chartWidth = 800;
  const chartHeight = 360;
  const padding = { top: 20, right: 60, bottom: 40, left: 60 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Scales
  const minN = 0;
  const maxN = sampleSize;
  const scaleX = (n: number) => padding.left + (n / maxN) * innerWidth;

  // Y Scale: Estimate (Teal)
  // Dynamic Y bounds for estimate based on CI
  const yEstMin = useMemo(() => {
    if (!dataPoints.length) return 2.8;
    return Math.min(3.0, ...dataPoints.map((d) => d.ciLower)) - 0.05;
  }, [dataPoints]);

  const yEstMax = useMemo(() => {
    if (!dataPoints.length) return 3.5;
    return Math.max(3.3, ...dataPoints.map((d) => d.ciUpper)) + 0.05;
  }, [dataPoints]);

  const scaleYEst = (val: number) => {
    return padding.top + innerHeight - ((val - yEstMin) / (yEstMax - yEstMin)) * innerHeight;
  };

  // Y Scale: Variance (Orange)
  const yVarMax = useMemo(() => {
    if (!dataPoints.length) return 0.5;
    const maxV = Math.max(...dataPoints.map((d) => d.variance));
    return maxV > 0 ? maxV * 1.2 : 0.01;
  }, [dataPoints]);

  const scaleYVar = (val: number) => {
    return padding.top + innerHeight - (val / yVarMax) * innerHeight;
  };

  // Path Generation
  const estPath = dataPoints.map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(d.n)} ${scaleYEst(d.estimate)}`).join(' ');
  const varPath = dataPoints.map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(d.n)} ${scaleYVar(d.variance)}`).join(' ');
  const ciAreaPath = dataPoints.length > 1
      ? `M ${scaleX(dataPoints[0].n)} ${scaleYEst(dataPoints[0].ciUpper)} ` +
        dataPoints.map((d) => `L ${scaleX(d.n)} ${scaleYEst(d.ciUpper)}`).join(' ') +
        ' ' +
        dataPoints.slice().reverse().map((d) => `L ${scaleX(d.n)} ${scaleYEst(d.ciLower)}`).join(' ') +
        ' Z'
      : '';

  // Hover Interaction
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dataPoints.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const nApprox = ((x - padding.left) / innerWidth) * maxN;
    
    // Find closest point
    let closest = dataPoints[0];
    let minDiff = Infinity;
    for (const pt of dataPoints) {
      const diff = Math.abs(pt.n - nApprox);
      if (diff < minDiff) {
        minDiff = diff;
        closest = pt;
      }
    }
    
    if (minDiff < maxN * 0.1 && x >= padding.left && x <= chartWidth - padding.right) {
      setHoveredPoint(closest);
    } else {
      setHoveredPoint(null);
    }
  };

  const activePoint = hoveredPoint || latestData;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col items-center p-4 md:p-8">
      {/* Top Navigation / Tabs */}
      <div className="w-full max-w-6xl mb