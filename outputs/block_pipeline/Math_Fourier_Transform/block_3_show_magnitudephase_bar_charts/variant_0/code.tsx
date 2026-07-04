import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// --- Types & Interfaces ---
interface Harmonic {
  n: number;
  a: number;
  b: number;
  mag: number;
  phase: number;
}

interface Point {
  x: number;
  y: number;
}

// --- Constants ---
const NUM_SAMPLES = 512;
const MAX_HARMONICS = 64;
const DEFAULT_HARMONICS = 24;

// --- Signal Generators ---
const generateSquare = (): number[] => {
  const sig = new Array(NUM_SAMPLES);
  for (let i = 0; i < NUM_SAMPLES; i++) {
    sig[i] = i < NUM_SAMPLES / 2 ? 1 : -1;
  }
  return sig;
};

const generateSawtooth = (): number[] => {
  const sig = new Array(NUM_SAMPLES);
  for (let i = 0; i < NUM_SAMPLES; i++) {
    sig[i] = 2 * (i / NUM_SAMPLES) - 1;
  }
  return sig;
};

const generateTriangle = (): number[] => {
  const sig = new Array(NUM_SAMPLES);
  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = i / NUM_SAMPLES;
    sig[i] = t < 0.5 ? 4 * t - 1 : 3 - 4 * t;
  }
  return sig;
};

// --- Math Helpers ---
const computeFourier = (signal: number[], numHarmonics: number): Harmonic[] => {
  const N = signal.length;
  const coeffs: Harmonic[] = [];

  // DC Component (n=0)
  let a0 = 0;
  for (let i = 0; i < N; i++) a0 += signal[i];
  a0 /= N;
  coeffs.push({ n: 0, a: a0, b: 0, mag: Math.abs(a0), phase: a0 < 0 ? Math.PI : 0 });

  // Harmonics (n > 0)
  for (let n = 1; n <= numHarmonics; n++) {
    let an = 0;
    let bn = 0;
    for (let i = 0; i < N; i++) {
      const t = i / N;
      const theta = 2 * Math.PI * n * t;
      an += signal[i] * Math.cos(theta);
      bn += signal[i] * Math.sin(theta);
    }
    an *= 2 / N;
    bn *= 2 / N;
    
    const mag = Math.sqrt(an * an + bn * bn);
    // Phase is atan2(-b, a) so that a*cos + b*sin = mag * cos(theta + phase)
    // If magnitude is very small, force phase to 0 to avoid noisy charts
    const phase = mag > 0.01 ? Math.atan2(-bn, an) : 0;
    
    coeffs.push({ n, a: an, b: bn, mag, phase });
  }
  return coeffs;
};

const reconstructSignal = (coeffs: Harmonic[], N: number, activeHarmonics: Set<number>): number[] => {
  const recon = new Array(N).fill(0);
  for (let i = 0; i < N; i++) {
    const t = i / N;
    if (activeHarmonics.has(0)) {
      recon[i] += coeffs[0].a;
    }
    for (let n = 1; n < coeffs.length; n++) {
      if (!activeHarmonics.has(n)) continue;
      const theta = 2 * Math.PI * n * t;
      recon[i] += coeffs[n].a * Math.cos(theta) + coeffs[n].b * Math.sin(theta);
    }
  }
  return recon;
};

// --- Components ---

// 1. Bar Chart Component (Reusable for Magnitude and Phase)
interface BarChartProps {
  title: string;
  data: Harmonic[];
  dataKey: 'mag' | 'phase';
  yMin: number;
  yMax: number;
  color: string;
  activeHarmonics: Set<number>;
  onToggleHarmonic: (n: number) => void;
  yLabel: string;
  formatTooltip: (val: number) => string;
}

const BarChart: React.FC<BarChartProps> = ({
  title,
  data,
  dataKey,
  yMin,
  yMax,
  color,
  activeHarmonics,
  onToggleHarmonic,
  yLabel,
  formatTooltip
}) => {
  const [hovered, setHovered] = useState<Harmonic | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const range = yMax - yMin;
  const zeroY = range === 0 ? 50 : ((yMax - 0) / range) * 100; // Percentage from top

  return (
    <div className="flex flex-col w-full bg-white rounded-xl shadow-sm border border-slate-200 p-4 relative">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">{title}</h3>
        {hovered && (
          <div className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">
            n={hovered.n}: {formatTooltip(hovered[dataKey])}
          </div>
        )}
      </div>
      
      <div className="relative w-full h-48">
        <svg 
          ref={svgRef}
          width="100%" 
          height="100%" 
          viewBox="0 0 100 100" 
          preserveAspectRatio="none"
          className="overflow-visible"
          onMouseLeave={() => setHovered(null)}
        >
          {/* Y-Axis Zero Line */}
          <line x1="0" y1={zeroY} x2="100" y2={zeroY} stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="1 1" />
          
          {/* Y-Axis Labels (approximate) */}
          <text x="-1" y="4" fontSize="4" textAnchor="end" fill="#94a3b8">{yMax.toFixed(1)}</text>
          <text x="-1" y="98" fontSize="4" textAnchor="end" fill="#94a3b8">{yMin.toFixed(1)}</text>
          <text x="-1" y={zeroY + 1.5} fontSize="4" textAnchor="end" fill="#94a3b8">0</text>

          {/* Bars */}
          {data.map((d, i) => {
            const val = d[dataKey];
            const isActive = activeHarmonics.has(d.n);
            
            // Calculate bar dimensions
            const barWidth = 100 / data.length;
            const x = i * barWidth;
            
            let y, height;
            if (val >= 0) {
              y = ((yMax - val) / range) * 100;
              height = zeroY - y;
            } else {
              y = zeroY;
              height = ((0 - val) / range) * 100;
            }

            // Ensure a minimum height for visibility if it's not exactly zero
            if (height < 0.5 && val !== 0) height = 0.5;

            return (
              <g key={d.n} 
                 className="cursor-pointer transition-opacity duration-200"
                 style={{ opacity: isActive ? 1 : 0.3 }}
                 onClick={() => onToggleHarmonic(d.n)}
                 onMouseEnter={() => setHovered(d)}
              >
                {/* Invisible wider rect for easier hovering */}
                <rect x={x} y="0" width={barWidth} height="100" fill="transparent" />
                {/* Actual Bar */}
                <rect 
                  x={x + barWidth * 0.1} 
                  y={y} 
                  width={barWidth * 0.8} 
                  height={height} 
                  fill={color}
                  rx="0.5"
                />
              </g>
            );
          })}
        </svg>
      </div>
      <div className="text-center text-xs text-slate-400 mt-2">Harmonic Index (n)</div>
    </div>
  );
};


// 2. Main App Component
export default function App() {
  const [signal, setSignal] = useState<number[]>(generateSquare());
  const [numHarmonics, setNumHarmonics] = useState<number>(DEFAULT_HARMONICS);
  const [activeHarmonics, setActiveHarmonics] = useState<Set<number>>(
    new Set(Array.from({ length: DEFAULT_HARMONICS + 1 }, (_, i) => i))
  );
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastDrawPoint, setLastDrawPoint] = useState<Point | null>(null);

  // Compute Fourier Coefficients
  const coeffs = useMemo(() => computeFourier(signal, numHarmonics), [signal, numHarmonics]);
  
  // Reconstruct Signal based on active harmonics
  const reconstructed = useMemo(() => reconstructSignal(coeffs, NUM_SAMPLES, activeHarmonics), [coeffs, activeHarmonics]);

  // Max magnitude for chart scaling
  const maxMag = useMemo(() => {
    const max = Math.max(...coeffs.map(c => c.mag));
    return max > 1 ? max : 1.5; // Minimum scale
  }, [coeffs]);

  // Handle Harmonic Toggling
  const toggleHarmonic = useCallback((n: number) => {
    setActiveHarmonics(prev => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }, []);

  // Handle Presets
  const loadPreset = (generator: () => number[]) => {
    setSignal(generator());
    setActiveHarmonics(new Set(Array.from({ length: numHarmonics + 1 }, (_, i) => i)));
  };

  // Canvas Drawing Logic
  const drawOnCanvas = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Map to signal space
    const sampleIdx = Math.floor((x / rect.width) * NUM_SAMPLES);
    const signalVal = -((y / rect.height) * 3 - 1.5); // Map Y to [-1.5, 1.5]

    setSignal(prev => {
      const next = [...prev];
      
      // Interpolate if we have a last point to avoid gaps when drawing fast
      if (lastDrawPoint) {
        const startIdx = Math.min(lastDrawPoint.x, sampleIdx);
        const endIdx = Math.max(lastDrawPoint.x, sampleIdx);
        const startY = lastDrawPoint.x === startIdx ? lastDrawPoint.y : signalVal;
        const endY = lastDrawPoint.x === endIdx ? lastDrawPoint.y : signalVal;

        for (let i = startIdx; i <= endIdx; i++) {
          if (i >= 0 && i < NUM_SAMPLES) {
            const t = endIdx === startIdx ? 0 : (i - startIdx) / (endIdx - startIdx);
            next[i] = startY + t * (endY - startY);
          }
        }
      } else {
        if (sampleIdx >= 0 && sampleIdx < NUM_SAMPLES) {
          next[sampleIdx] = signalVal;
        }
      }
      return next;
    });

    setLastDrawPoint({ x: sampleIdx, y: signalVal });
  }, [isDrawing, lastDrawPoint]);

  const stopDrawing = () => {
    setIsDrawing(false);
    setLastDrawPoint(null);
  };

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw Grid / Zero line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    const drawPath = (data: number[], color: string, lineWidth: number, isDashed = false) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      if (isDashed) ctx.setLineDash([5, 5]);
      else ctx.setLineDash([]);

      for (let i = 0; i < NUM_SAMPLES; i++) {
        const x = (i / NUM_SAMPLES) * width;
        // Map [-1.5, 1.5] to [height, 0]
        const y = height - ((data[i] + 1.5) / 3) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    // Draw Original Signal (Gray)
    drawPath(signal, '#94a3b8', 2, true);
    
    // Draw Reconstructed Signal (Rose)
    drawPath(reconstructed, '#e11d48', 3);

  }, [signal, reconstructed]);

  // Handle Harmonics Slider Change
  const handleHarmonicsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newN = parseInt(e.target.value, 10);
    setNumHarmonics(newN);
    // Auto-activate new harmonics
    setActiveHarmonics(prev => {
      const next = new Set(prev);
      for (let i = 0; i <= newN; i++) next.add(i);
      return next;
    });
  };

  // Export CSV
  const exportCSV = () => {
    let csv = "n,Magnitude,Phase(rad),a_n,b_n\n";
    coeffs.forEach(c => {
      csv += `${c.n},${c.mag.toFixed(4)},${c.phase.toFixed(4)},${c.a.toFixed(4)},${c.b.toFixed(4)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fourier_coefficients.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header & Controls */}
        <header className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Fourier Sketchpad
            </h1>
            <p className="text-sm text-slate-500 mt-1">Draw a signal or pick a preset to see its frequency components.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button onClick={() => loadPreset(generateSquare)} className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-white hover:shadow-sm transition-all">Square</button>
              <button onClick={() => loadPreset(generateSawtooth)} className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-white hover:shadow-sm transition-all">Sawtooth</button>
              <button onClick={() => loadPreset(generateTriangle)} className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-white hover:shadow-sm transition-all">Triangle</button>
            </div>
            
            <div className="flex items-center gap-3 bg-slate-100 px-4 py-2 rounded-lg">
              <label className="text-sm font-medium text-slate-600">Harmonics: {numHarmonics}</label>
              <input 
                type="range" 
                min="1" 
                max={MAX_HARMONICS} 
                value={numHarmonics} 
                onChange={handleHarmonicsChange}
                className="w-32 accent-indigo-600"
              />
            </div>

            <button onClick={exportCSV} className="px-4 py-2 bg-indigo-50 text-indigo-700 text-sm font-semibold rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200">
              Export CSV
            </button>
          </div>
        </header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Time Domain Canvas */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Time Domain</h3>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1"><div className="w-3 h-0.5 bg-slate-400 border-dashed border-t border-slate-400"></div> Drawn</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-0.5 bg-rose-600"></div> Reconstructed</span>
                </div>
              </div>
              
              <div className="relative w-full aspect-square bg-slate-50 rounded-lg border border-slate-200 overflow-hidden cursor-crosshair touch-none">
                <canvas
                  ref={canvasRef}
                  width={512}
                  height={512}
                  className="w-full h-full block"
                  onMouseDown={(e) => { setIsDrawing(true); drawOnCanvas(e); }}
                  onMouseMove={drawOnCanvas}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={(e) => { setIsDrawing(true