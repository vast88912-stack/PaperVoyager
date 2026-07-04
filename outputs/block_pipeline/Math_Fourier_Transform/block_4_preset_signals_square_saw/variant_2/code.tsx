import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

// --- Types & Constants ---
type Point = { t: number; y: number };
type Harmonic = { n: number; an: number; bn: number; mag: number; phase: number };
type PresetType = 'square' | 'sawtooth' | 'triangle' | 'custom';

const NUM_SAMPLES = 500;
const MAX_HARMONICS = 50;

// --- Helper Functions ---
const generatePoints = (preset: PresetType): Point[] => {
  const points: Point[] = [];
  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = i / NUM_SAMPLES;
    let y = 0;
    if (preset === 'square') {
      y = t < 0.5 ? 1 : -1;
    } else if (preset === 'sawtooth') {
      y = 2 * (t - Math.floor(t + 0.5));
    } else if (preset === 'triangle') {
      y = 2 * Math.abs(2 * (t - Math.floor(t + 0.5))) - 1;
    } else {
      // Default custom to a flat line, user draws over it
      y = 0;
    }
    points.push({ t, y });
  }
  return points;
};

// --- Main Component ---
export default function App() {
  const [preset, setPreset] = useState<PresetType>('square');
  const [numHarmonics, setNumHarmonics] = useState<number>(10);
  const [originalSignal, setOriginalSignal] = useState<Point[]>(generatePoints('square'));
  const [isAnimating, setIsAnimating] = useState<boolean>(true);
  const [scanTime, setScanTime] = useState<number>(0);

  const canvasRef = useRef<SVGSVGElement>(null);
  const isDrawing = useRef(false);

  // Handle Preset Changes
  useEffect(() => {
    if (preset !== 'custom') {
      setOriginalSignal(generatePoints(preset));
    }
  }, [preset]);

  // Animation Loop
  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      if (isAnimating) {
        const dt = time - lastTime;
        setScanTime((prev) => (prev + dt * 0.0005) % 1);
      }
      lastTime = time;
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [isAnimating]);

  // Compute Fourier Coefficients (Riemann Sum)
  const { a0, harmonics } = useMemo(() => {
    let sumA0 = 0;
    for (const p of originalSignal) {
      sumA0 += p.y;
    }
    const computedA0 = sumA0 / NUM_SAMPLES;

    const computedHarmonics: Harmonic[] = [];
    for (let n = 1; n <= MAX_HARMONICS; n++) {
      let an = 0;
      let bn = 0;
      for (const p of originalSignal) {
        const angle = 2 * Math.PI * n * p.t;
        an += p.y * Math.cos(angle);
        bn += p.y * Math.sin(angle);
      }
      an *= 2 / NUM_SAMPLES;
      bn *= 2 / NUM_SAMPLES;
      computedHarmonics.push({
        n,
        an,
        bn,
        mag: Math.sqrt(an * an + bn * bn),
        phase: Math.atan2(-bn, an),
      });
    }

    return { a0: computedA0, harmonics: computedHarmonics };
  }, [originalSignal]);

  // Reconstruct Signal based on selected number of harmonics
  const reconstructedSignal = useMemo(() => {
    return originalSignal.map((p) => {
      let y = a0;
      for (let i = 0; i < numHarmonics; i++) {
        const h = harmonics[i];
        const angle = 2 * Math.PI * h.n * p.t;
        y += h.an * Math.cos(angle) + h.bn * Math.sin(angle);
      }
      return { t: p.t, y };
    });
  }, [originalSignal, a0, harmonics, numHarmonics]);

  // Custom Drawing Handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setPreset('custom');
    isDrawing.current = true;
    updateSignalFromPointer(e);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawing.current) return;
    updateSignalFromPointer(e);
  }, []);

  const handlePointerUp = useCallback(() => {
    isDrawing.current = false;
  }, []);

  const updateSignalFromPointer = (e: React.PointerEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const t = Math.max(0, Math.min(1, x / rect.width));
    const val = Math.max(-1.5, Math.min(1.5, -(y - rect.height / 2) / (rect.height / 3)));

    setOriginalSignal((prev) => {
      const next = [...prev];
      // Find closest index
      const idx = Math.floor(t * NUM_SAMPLES);
      if (idx >= 0 && idx < NUM_SAMPLES) {
        // Smooth brush effect around the point
        const brushSize = 15;
        for (let i = -brushSize; i <= brushSize; i++) {
          const targetIdx = idx + i;
          if (targetIdx >= 0 && targetIdx < NUM_SAMPLES) {
            const distance = Math.abs(i) / brushSize;
            const weight = Math.cos(distance * Math.PI / 2); // easing
            next[targetIdx].y = next[targetIdx].y * (1 - weight) + val * weight;
          }
        }
      }
      return next;
    });
  };

  // Export to CSV
  const exportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,t,original_y,reconstructed_y\n' +
      originalSignal
        .map((p, i) => `${p.t.toFixed(4)},${p.y.toFixed(4)},${reconstructedSignal[i].y.toFixed(4)}`)
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'fourier_signal.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Path generators
  const toSvgPath = (points: Point[]) => {
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.t * 1000} ${150 - p.y * 100}`)
      .join(' ');
  };

  // Get current scanline value
  const scanIdx = Math.floor(scanTime * NUM_SAMPLES);
  const currentScanPoint = reconstructedSignal[scanIdx] || reconstructedSignal[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 md:p-8 flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Fourier Sketchpad
          </h1>
          <p className="text-slate-500 mt-1">Draw or select a periodic signal to see its Fourier Series approximation.</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </header>

      <main className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Sidebar Controls */}
        <aside className="w-full lg:w-80 flex flex-col gap-6 flex-shrink-0">
          
          {/* Presets Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Preset Signals</h2>
            <div className="grid grid-cols-2 gap-3">
              {(['square', 'sawtooth', 'triangle', 'custom'] as PresetType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setPreset(type)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all border ${
                    preset === type
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-inner'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            {preset === 'custom' && (
              <p className="text-xs text-slate-500 mt-3 italic">
                Draw directly on the Time Domain chart!
              </p>
            )}
          </div>

          {/* Harmonics Control */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Harmonics</h2>
              <span className="bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded text-xs">
                N = {numHarmonics}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max={MAX_HARMONICS}
              value={numHarmonics}
              onChange={(e) => setNumHarmonics(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-2">
              <span>1 (Sine)</span>
              <span>{MAX_HARMONICS} (Detailed)</span>
            </div>
          </div>

          {/* Gibbs Explainer Box */}
          <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-20">
              <svg className="w-16 h-16 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-amber-800 font-bold mb-2 flex items-center gap-2 relative z-10">
              Gibbs Phenomenon
            </h3>
            <p className="text-sm text-amber-900 leading-relaxed relative z-10">
              Notice the "ringing" or overshoots at the sharp corners of the Square or Sawtooth waves? 
              This is the <strong>Gibbs Phenomenon</strong>. No matter how many harmonics you add, the continuous sine waves will always overshoot the jump by about <strong>~9%</strong>.
            </p>
          </div>

        </aside>

        {/* Main Charts Area */}
        <section className="flex-1 flex flex-col gap-6 min-w-0 w-full">
          
          {/* Time Domain Chart */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-800">Time Domain <span className="text-slate-400 font-normal">f(t)</span></h2>
              <button
                onClick={() => setIsAnimating(!isAnimating)}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                {isAnimating ? (
                  <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg> Pause</>
                ) : (
                  <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Play</>
                )}
              </button>
            </div>
            
            <div 
              className="relative w-full h-64 bg-slate-50 rounded-lg border border-slate-100 overflow-hidden cursor-crosshair touch-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              <svg
                ref={canvasRef}
                viewBox="0 0 1000 300"
                className="w-full h-full"
                preserveAspectRatio="none"
              >
                {/* Grid Lines */}
                <line x1="0" y1="50" x2="1000" y2="50" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="0" y1="150" x2="1000" y2="150" stroke="#cbd5e1" strokeWidth="2" />
                <line x1="0" y1="250" x2="1000" y2="250" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                
                {/* Original Signal */}
                <path
                  d={toSvgPath(originalSignal)}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="3"
                  strokeDasharray="8 4"
                  className="opacity-60"
                />
                
                {/* Reconstructed Signal */}
                <path
                  d={toSvgPath(reconstructedSignal)}
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Animation Scanline */}
                {isAnimating && (
                  <g transform={`translate(${scanTime * 1000}, 0)`}>
                    <line x1="0" y1="0" x2="0" y2="300" stroke="#f43f5e" strokeWidth="1" className="opacity-50" />
                    <circle cx="0" cy={150 - currentScanPoint.y * 100} r="6" fill="#f43f5e" />
                  </g>
                )}
              </svg>
            </div>
            
            <div className="flex justify-between mt-3 text-xs text-slate-400 font-mono">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-0.5 bg-slate-400 border-t border-dashed border-slate-400"></span> Original
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-0.5 bg-indigo-600"></span> Reconstructed
              </div>
            </div>
          </div>

          {/* Frequency Domain Chart */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Frequency Domain <span className="text-slate-400 font-normal">Magnitude</span></h2>
            
            <div className="relative w-full h-48 bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
              <svg viewBox={`0 0 ${MAX_HARMONICS * 20} 200`} className="w-full h-full" preserveAspectRatio="none">
                {/* Base Axis */}
                <line x1="0" y1="180" x2={MAX_HARMONICS * 20} y2="180" stroke="#cbd5e1" strokeWidth="2" />
                
                {/* Magnitude Stems */}
                {harmonics.map((h, i) => {
                  const x = h.n * 20 - 10;
                  const height = Math.min(160, h.mag * 100); // Scale roughly to fit
                  const y = 180 - height;
                  const isActive = i < numHarmonics;
                  
                  return (
                    <g key={h.n} className={isActive ? 'opacity-100' : 'opacity-20 transition-opacity'}>
                      <line x1={x} y1="180" x2={x} y2={y} stroke={isActive ? '#4f46e5' : '#94a3b8'} strokeWidth="4" strokeLinecap="round" />
                      <circle cx={x} cy={y} r="4" fill={isActive ? '#312e81' : '#64748b'} />
                      {/* Label for first few harmonics */}
                      {h.n <= 10 && isActive && (
                        <text x={x} y={195} fontSize="10" fill="#64748b" textAnchor="middle" fontFamily="monospace">
                          {h.n}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

        </section>
      </main>
    </div>
  );
}