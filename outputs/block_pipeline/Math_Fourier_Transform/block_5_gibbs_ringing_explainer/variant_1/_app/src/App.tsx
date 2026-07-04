import React, { useState, useEffect, useMemo, useRef } from 'react';

// --- Math & Helper Functions ---

// Computes the Fourier series approximation for a square wave
// n_terms: number of non-zero terms (1st term is fundamental, 2nd is 3rd harmonic, etc.)
const computeSquareWaveFourier = (t: number, n_terms: number): number => {
  let sum = 0;
  for (let i = 1; i <= n_terms; i++) {
    const k = 2 * i - 1; // Odd harmonics: 1, 3, 5, 7...
    sum += Math.sin(k * t) / k;
  }
  return sum * (4 / Math.PI);
};

// SVG Coordinate mapping
const SVG_WIDTH = 1000;
const SVG_HEIGHT = 500;
const X_MAX = 4 * Math.PI; // Show two full periods
const Y_MAX = 1.6; // Y axis range from -1.6 to 1.6

const mapX = (t: number) => (t / X_MAX) * SVG_WIDTH;
const mapY = (val: number) => (SVG_HEIGHT / 2) - (val / Y_MAX) * (SVG_HEIGHT / 2);

// Constant for the theoretical Gibbs overshoot (~8.95% above the jump)
const GIBBS_OVERSHOOT_VAL = 1.08949;

export default function App() {
  const [terms, setTerms] = useState<number>(5);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showOvershoot, setShowOvershoot] = useState<boolean>(true);
  const [showIdeal, setShowIdeal] = useState<boolean>(true);

  const animationRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);

  // --- Animation Loop ---
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const animate = (time: number) => {
      if (time - lastUpdateRef.current > 150) { // Update every 150ms
        setTerms((prev) => {
          if (prev >= 50) return 1;
          return prev + 1;
        });
        lastUpdateRef.current = time;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying]);

  // --- Path Generation ---
  const fourierPath = useMemo(() => {
    const points = 800; // Resolution
    let d = '';
    for (let i = 0; i <= points; i++) {
      const t = (i / points) * X_MAX;
      const val = computeSquareWaveFourier(t, terms);
      const x = mapX(t);
      const y = mapY(val);
      d += i === 0 ? `M ${x} ${y} ` : `L ${x} ${y} `;
    }
    return d;
  }, [terms]);

  const idealSquarePath = useMemo(() => {
    // Square wave with amplitude 1, period 2PI
    // Jumps at 0, PI, 2PI, 3PI, 4PI
    const p0 = mapX(0);
    const p1 = mapX(Math.PI);
    const p2 = mapX(2 * Math.PI);
    const p3 = mapX(3 * Math.PI);
    const p4 = mapX(4 * Math.PI);
    
    const yHigh = mapY(1);
    const yLow = mapY(-1);
    const yZero = mapY(0);

    return `
      M ${p0} ${yZero}
      L ${p0} ${yHigh} L ${p1} ${yHigh}
      L ${p1} ${yLow} L ${p2} ${yLow}
      L ${p2} ${yHigh} L ${p3} ${yHigh}
      L ${p3} ${yLow} L ${p4} ${yLow}
      L ${p4} ${yZero}
    `;
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-5 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              Fourier Sketchpad
            </h1>
            <p className="text-sm text-slate-500 mt-1">Interactive Signal Processing: The Gibbs Phenomenon</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
        
        {/* Left Column: Visualization & Controls */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Canvas Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="font-semibold text-slate-700">Time Domain Reconstruction</h2>
              <div className="flex gap-3 text-sm">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={showIdeal} 
                    onChange={(e) => setShowIdeal(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  Ideal Signal
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={showOvershoot} 
                    onChange={(e) => setShowOvershoot(e.target.checked)}
                    className="rounded text-rose-500 focus:ring-rose-500 border-slate-300"
                  />
                  Gibbs Limit
                </label>
              </div>
            </div>

            {/* SVG Plot */}
            <div className="relative w-full aspect-[2/1] bg-white p-4">
              <svg 
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} 
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                {/* Grid Lines */}
                <g className="text-slate-200" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4">
                  <line x1="0" y1={mapY(0)} x2={SVG_WIDTH} y2={mapY(0)} strokeDasharray="none" strokeWidth="2" />
                  <line x1="0" y1={mapY(1)} x2={SVG_WIDTH} y2={mapY(1)} />
                  <line x1="0" y1={mapY(-1)} x2={SVG_WIDTH} y2={mapY(-1)} />
                  
                  {/* Vertical Pi markers */}
                  {[1, 2, 3, 4].map((i) => (
                    <line key={i} x1={mapX(i * Math.PI)} y1="0" x2={mapX(i * Math.PI)} y2={SVG_HEIGHT} />
                  ))}
                </g>

                {/* Y-Axis Labels */}
                <g className="text-[12px] fill-slate-400 font-mono select-none">
                  <text x="10" y={mapY(1) - 10}>1.0</text>
                  <text x="10" y={mapY(0) - 10}>0.0</text>
                  <text x="10" y={mapY(-1) - 10}>-1.0</text>
                </g>

                {/* X-Axis Labels */}
                <g className="text-[12px] fill-slate-400 font-mono select-none text-center">
                  <text x={mapX(Math.PI) + 10} y={mapY(0) + 20}>π</text>
                  <text x={mapX(2 * Math.PI) + 10} y={mapY(0) + 20}>2π</text>
                  <text x={mapX(3 * Math.PI) + 10} y={mapY(0) + 20}>3π</text>
                </g>

                {/* Theoretical Gibbs Overshoot Lines */}
                {showOvershoot && (
                  <g className="text-rose-400/60" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4">
                    <line x1="0" y1={mapY(GIBBS_OVERSHOOT_VAL)} x2={SVG_WIDTH} y2={mapY(GIBBS_OVERSHOOT_VAL)} />
                    <line x1="0" y1={mapY(-GIBBS_OVERSHOOT_VAL)} x2={SVG_WIDTH} y2={mapY(-GIBBS_OVERSHOOT_VAL)} />
                    <text x="10" y={mapY(GIBBS_OVERSHOOT_VAL) - 8} className="fill-rose-500 text-[11px] font-mono stroke-none">+1.0895 (≈9% overshoot)</text>
                  </g>
                )}

                {/* Ideal Square Wave */}
                {showIdeal && (
                  <path 
                    d={idealSquarePath} 
                    fill="none" 
                    stroke="#cbd5e1" 
                    strokeWidth="2" 
                    strokeDasharray="8 4"
                  />
                )}

                {/* Fourier Approximation */}
                <path 
                  d={fourierPath} 
                  fill="none" 
                  stroke="#4f46e5" 
                  strokeWidth="2.5" 
                  strokeLinejoin="round"
                  className="transition-all duration-75 ease-linear"
                />
              </svg>
            </div>

            {/* Controls */}
            <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row items-center gap-6">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full transition-all shadow-sm ${
                  isPlaying 
                    ? 'bg-rose-100 text-rose-600 hover:bg-rose-200' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'
                }`}
              >
                {isPlaying ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>
                ) : (
                  <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>

              <div className="flex-1 w-full flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-medium text-slate-700">
                    Number of Harmonics (N)
                  </label>
                  <span className="text-2xl font-bold text-indigo-600 font-mono w-12 text-right">
                    {terms}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="50" 
                  value={terms} 
                  onChange={(e) => {
                    setTerms(parseInt(e.target.value));
                    setIsPlaying(false);
                  }}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-slate-400 font-mono mt-1">
                  <span>1 (Sine wave)</span>
                  <span>Highest Freq: {2 * terms - 1}x</span>
                  <span>50 (Complex)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Equation Display */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 flex items-center justify-center text-indigo-900 font-serif text-lg overflow-x-auto">
            <div className="whitespace-nowrap flex items-center gap-3">
              <span>f(t) ≈</span>
              <span className="text-2xl">4/π</span>
              <span className="text-3xl font-light">∑</span>
              <div className="flex flex-col text-sm items-center justify-center -mt-2">
                <span>N={terms}</span>
                <span className="mt-4">n=1,3,5...</span>
              </div>
              <span className="ml-2">
                <span className="text-xl">sin(n·t)</span> / <span className="text-xl">n</span>
              </span>
            </div>
          </div>

        </div>

        {/* Right Column: Explainer */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800">What is Gibbs Ringing?</h3>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              When you try to approximate a signal with sharp jumps (like a square wave) using a sum of smooth, continuous sine waves (Fourier series), you get an interesting artifact.
            </p>
            <p className="text-slate-600 text-sm leading-relaxed">
              Notice the "wiggles" right before and after the square wave drops or rises. This overshoot is known as the <strong>Gibbs Phenomenon</strong>.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800">The 9% Rule</h3>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Try dragging the slider to increase the number of harmonics (<span className="font-mono text-xs bg-slate-100 px-1 rounded">N</span>). 
            </p>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                <span>The wiggles get <strong>narrower</strong>, hugging closer to the jump.</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                <span>But the height of the overshoot <strong>never goes away!</strong></span>
              </li>
            </ul>
            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-700 italic">
              Even with infinite terms, the overshoot approaches exactly <strong className="text-rose-500">~8.95%</strong> of the jump's magnitude. It is a fundamental mathematical limit.
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Why does it happen?</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              A perfect vertical jump requires infinite frequencies to construct perfectly. Because we truncate the series (or because real-world systems have bandwidth limits), the missing high frequencies cause the remaining waves to "pile up" constructively near the discontinuity.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}