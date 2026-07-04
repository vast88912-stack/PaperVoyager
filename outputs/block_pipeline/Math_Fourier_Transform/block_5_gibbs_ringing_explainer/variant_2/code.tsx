import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Pause, ZoomIn, ZoomOut, Info, AlertTriangle, ArrowRight, Activity } from 'lucide-react';

export default function App() {
  const [harmonics, setHarmonics] = useState<number>(5);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [zoomed, setZoomed] = useState<boolean>(false);

  // Auto-play effect
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setHarmonics((prev) => {
        if (prev >= 60) return 1;
        return prev + 1;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Dimensions & Scales
  const width = 800;
  const height = 450;
  
  // Viewport definitions
  const xMin = zoomed ? -0.1 : -0.5;
  const xMax = zoomed ? 1.0 : Math.PI * 2 + 0.5;
  const yMin = zoomed ? 0.5 : -1.5;
  const yMax = zoomed ? 1.5 : 1.5;

  const scaleX = (x: number) => ((x - xMin) / (xMax - xMin)) * width;
  const scaleY = (y: number) => height - ((y - yMin) / (yMax - yMin)) * height;

  // Constants
  const GIBBS_LIMIT = 1.1789797; // Theoretical max for square wave of amplitude 1

  // Generate paths and points
  const { pathData, peakX, peakY, targetPath } = useMemo(() => {
    const resolution = zoomed ? 600 : 1000;
    let path = '';
    
    // Fourier Series Approximation
    for (let i = 0; i <= resolution; i++) {
      const t = xMin + (i / resolution) * (xMax - xMin);
      let sum = 0;
      // Calculate up to N harmonics (k = 1, 3, 5... 2N-1)
      for (let n = 1; n <= harmonics; n++) {
        const k = 2 * n - 1;
        sum += (4 / Math.PI) * (Math.sin(k * t) / k);
      }
      
      const px = scaleX(t);
      const py = scaleY(sum);
      
      if (i === 0) path += `M ${px} ${py} `;
      else path += `L ${px} ${py} `;
    }

    // Target Square Wave Path
    const tStart = scaleX(0);
    const tMid = scaleX(Math.PI);
    const tEnd = scaleX(Math.PI * 2);
    const yHigh = scaleY(1);
    const yLow = scaleY(-1);
    const yZero = scaleY(0);
    
    const target = `
      M ${scaleX(xMin)} ${yHigh}
      L ${tStart} ${yHigh}
      L ${tStart} ${yHigh}
      L ${tStart} ${yLow}
      M ${tStart} ${yHigh}
      L ${tMid} ${yHigh}
      L ${tMid} ${yLow}
      L ${tEnd} ${yLow}
      L ${tEnd} ${yHigh}
      L ${scaleX(xMax)} ${yHigh}
    `;

    // Calculate Peak (First overshoot)
    // For sum of N terms (k=1,3..2N-1), the peak occurs at t = pi / (2N)
    const tPeak = Math.PI / (2 * harmonics);
    let pY = 0;
    for (let n = 1; n <= harmonics; n++) {
      const k = 2 * n - 1;
      pY += (4 / Math.PI) * (Math.sin(k * tPeak) / k);
    }

    return { 
      pathData: path, 
      peakX: tPeak, 
      peakY: pY,
      targetPath: target
    };
  }, [harmonics, zoomed, xMin, xMax]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800 flex flex-col items-center">
      
      {/* Header */}
      <header className="max-w-6xl w-full mb-8 flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Activity className="w-8 h-8 text-indigo-600" />
            The Gibbs Phenomenon
          </h1>
          <p className="text-slate-500 mt-2 max-w-2xl">
            When approximating a signal with jump discontinuities (like a square wave) using a truncated Fourier series, 
            the approximation oscillates wildly near the jumps. This irreducible overshoot is called <strong>Gibbs Ringing</strong>.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Visualization */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            
            {/* Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    isPlaying ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? 'Pause Animation' : 'Animate Harmonics'}
                </button>
                <div className="h-6 w-px bg-slate-300"></div>
                <button
                  onClick={() => setZoomed(!zoomed)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  {zoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
                  {zoomed ? 'Reset View' : 'Zoom to Peak'}
                </button>
              </div>
              <div className="text-sm font-semibold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                N = {harmonics}
              </div>
            </div>

            {/* Canvas */}
            <div className="relative w-full aspect-video bg-white overflow-hidden p-6">
              <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                {/* Grid Lines */}
                {[...Array(11)].map((_, i) => {
                  const y = scaleY(-1.5 + i * 0.3);
                  if (y < 0 || y > height) return null;
                  return (
                    <line key={`h-${i}`} x1={0} y1={y} x2={width} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                  );
                })}
                
                {/* Axes */}
                <line x1={0} y1={scaleY(0)} x2={width} y2={scaleY(0)} stroke="#cbd5e1" strokeWidth="2" />
                <line x1={scaleX(0)} y1={0} x2={scaleX(0)} y2={height} stroke="#cbd5e1" strokeWidth="2" />
                
                {/* Theoretical Limit Line */}
                <line 
                  x1={0} 
                  y1={scaleY(GIBBS_LIMIT)} 
                  x2={width} 
                  y2={scaleY(GIBBS_LIMIT)} 
                  stroke="#ef4444" 
                  strokeWidth="1.5" 
                  strokeDasharray="6,6" 
                  opacity={0.4}
                />
                <text x={10} y={scaleY(GIBBS_LIMIT) - 10} fill="#ef4444" fontSize="12" fontWeight="600" opacity={0.7}>
                  Gibbs Limit (~1.18)
                </text>

                {/* Target Square Wave */}
                <path d={targetPath} stroke="#94a3b8" strokeWidth="2" fill="none" strokeDasharray="4,4" />

                {/* Fourier Approximation */}
                <path d={pathData} stroke="#4f46e5" strokeWidth="2.5" fill="none" strokeLinejoin="round" />

                {/* Highlight Peak */}
                {peakX >= xMin && peakX <= xMax && (
                  <g transform={`translate(${scaleX(peakX)}, ${scaleY(peakY)})`}>
                    <circle cx={0} cy={0} r={5} fill="#ef4444" className="animate-pulse" />
                    <circle cx={0} cy={0} r={12} fill="#ef4444" opacity="0.2" />
                    
                    {/* Peak Annotation Tooltip-style */}
                    {zoomed && (
                      <g transform="translate(15, -15)">
                        <rect x={0} y={-24} width={110} height={24} rx={4} fill="#1e293b" />
                        <text x={8} y={-7} fill="white" fontSize="12" fontWeight="500">
                          Max: {peakY.toFixed(4)}
                        </text>
                        <path d="M -5 0 L 0 -5 L 0 -10 Z" fill="#1e293b" />
                      </g>
                    )}
                  </g>
                )}
                
                {/* Discontinuity Label */}
                {!zoomed && (
                  <g transform={`translate(${scaleX(0)}, ${scaleY(1.5)})`}>
                    <rect x={-60} y={0} width={120} height={24} rx={4} fill="#f8fafc" stroke="#e2e8f0" />
                    <text x={0} y={16} fill="#64748b" fontSize="12" textAnchor="middle" fontWeight="500">
                      Jump Discontinuity
                    </text>
                  </g>
                )}
              </svg>
            </div>
          </div>

          {/* Slider Control */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-end mb-4">
              <div>
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Number of Harmonics (N)</label>
                <p className="text-xs text-slate-500 mt-1">Controls the highest frequency sine wave in the sum.</p>
              </div>
              <span className="text-3xl font-light text-indigo-600">{harmonics}</span>
            </div>
            <input
              type="range"
              min="1"
              max="60"
              value={harmonics}
              onChange={(e) => {
                setHarmonics(parseInt(e.target.value));
                setIsPlaying(false);
              }}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
              <span>1 Harmonic (Sine Wave)</span>
              <span>60 Harmonics (Dense Ringing)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Explainer */}
        <div className="flex flex-col gap-6">
          
          {/* Key Takeaways */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500 rounded-full blur-3xl opacity-20"></div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-indigo-400" />
              What's happening?
            </h2>
            <div className="space-y-4 text-sm text-slate-300 leading-relaxed relative z-10">
              <p>
                Notice how the approximation <strong>never perfectly flattens out</strong> near the vertical jump, no matter how many harmonics you add.
              </p>
              <div className="bg-white/10 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                <p className="text-white font-medium mb-1">The Overshoot Limit</p>
                <p>
                  As <span className="font-mono text-indigo-300">N → ∞</span>, the maximum peak doesn't disappear. 
                  Instead, it converges to exactly <strong>~8.95%</strong> of the jump's size.
                </p>
              </div>
              <p>
                Because our square wave jumps from <span className="font-mono bg-black/20 px-1 rounded">-1</span> to <span className="font-mono bg-black/20 px-1 rounded">1</span> (a total jump of 2), 
                the peak overshoots the target value of 1 by roughly <span className="font-mono text-amber-300">0.1789</span>.
              </p>
            </div>
          </div>

          {/* Live Metrics */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">Live Metrics</h3>
            
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-sm text-slate-600 font-medium">Current Peak Amplitude</span>
              <span className="font-mono font-bold text-indigo-600">{peakY.toFixed(5)}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-sm text-slate-600 font-medium">Distance from Jump (t)</span>
              <span className="font-mono font-bold text-emerald-600">{peakX.toFixed(5)}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-sm text-slate-600 font-medium">Overshoot Percentage</span>
              <span className="font-mono font-bold text-amber-600">
                {(((peakY - 1) / 2) * 100).toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Mathematical Insight */}
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 text-amber-900">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Why doesn't it go away?
            </h3>
            <p className="text-sm leading-relaxed mb-4">
              Fourier series try to build discontinuous jumps out of perfectly smooth, continuous sine waves. 
              The sharp corners force the high-frequency sines to align in a way that inherently produces a ripple.
            </p>
            <p className="text-sm leading-relaxed">
              As you increase <strong>N</strong>, the ripple gets infinitely squeezed toward the jump (width → 0), 
              but its height remains stubbornly fixed.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}