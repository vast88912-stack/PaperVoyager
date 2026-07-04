import React, { useState, useEffect, useMemo, useRef } from 'react';

// --- Math & Signal Generation Helpers ---

const PI = Math.PI;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const Y_DOMAIN = 1.8; // -1.8 to 1.8
const X_DOMAIN = 2 * PI;

// Map logical coordinates to SVG canvas coordinates
const mapX = (x: number) => (x / X_DOMAIN) * CANVAS_WIDTH;
const mapY = (y: number) => (CANVAS_HEIGHT / 2) - (y / Y_DOMAIN) * (CANVAS_HEIGHT / 2);

type Point = { x: number; y: number };

const generateSquareWave = (points: number): Point[] => {
  const data: Point[] = [];
  for (let i = 0; i <= points; i++) {
    const x = (i / points) * X_DOMAIN;
    // Ideal square wave: 1 for [0, pi), -1 for [pi, 2pi)
    const y = x < PI ? 1 : -1;
    data.push({ x, y });
  }
  // To make the vertical lines sharp in the SVG, we insert exact points
  const midPointIdx = Math.floor(points / 2);
  data.splice(midPointIdx, 0, { x: PI, y: 1 }, { x: PI, y: -1 });
  return data;
};

const generateSawtoothWave = (points: number): Point[] => {
  const data: Point[] = [];
  for (let i = 0; i <= points; i++) {
    const x = (i / points) * X_DOMAIN;
    // Ideal sawtooth wave: starts at 0, goes to pi, jumps to -pi
    let y = 1 - (x / PI);
    if (x === 0) y = 0; // Center the start
    if (x === 2 * PI) y = 0;
    data.push({ x, y });
  }
  return data;
};

const generateFourierSquare = (terms: number, points: number): Point[] => {
  const data: Point[] = [];
  for (let i = 0; i <= points; i++) {
    const x = (i / points) * X_DOMAIN;
    let y = 0;
    for (let k = 1; k <= terms; k++) {
      const n = 2 * k - 1; // Odd harmonics: 1, 3, 5...
      y += (4 / PI) * (Math.sin(n * x) / n);
    }
    data.push({ x, y });
  }
  return data;
};

const generateFourierSawtooth = (terms: number, points: number): Point[] => {
  const data: Point[] = [];
  for (let i = 0; i <= points; i++) {
    const x = (i / points) * X_DOMAIN;
    let y = 0;
    for (let n = 1; n <= terms; n++) {
      y += (2 / PI) * (Math.sin(n * x) / n);
    }
    data.push({ x, y });
  }
  return data;
};

// --- Icons ---

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mr-2">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mr-2">
    <rect x="6" y="4" width="4" height="16"></rect>
    <rect x="14" y="4" width="4" height="16"></rect>
  </svg>
);

const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

export default function App() {
  const [waveform, setWaveform] = useState<'square' | 'sawtooth'>('square');
  const [terms, setTerms] = useState<number>(3);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showHighlight, setShowHighlight] = useState<boolean>(true);

  // Animation logic
  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        setTerms((prev) => {
          if (prev >= 50) return 1;
          // Speed up as it gets higher to save time
          const step = prev < 10 ? 1 : prev < 30 ? 2 : 5;
          return prev + step;
        });
      }, 300);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Memoize generated paths to prevent unnecessary recalculations
  const numPoints = 800; // High resolution for smooth rendering

  const idealPath = useMemo(() => {
    const pts = waveform === 'square' ? generateSquareWave(numPoints) : generateSawtoothWave(numPoints);
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(p.x)} ${mapY(p.y)}`).join(' ');
  }, [waveform]);

  const fourierData = useMemo(() => {
    return waveform === 'square' 
      ? generateFourierSquare(terms, numPoints) 
      : generateFourierSawtooth(terms, numPoints);
  }, [terms, waveform]);

  const fourierPath = useMemo(() => {
    return fourierData.map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(p.x)} ${mapY(p.y)}`).join(' ');
  }, [fourierData]);

  // Calculate overshoot characteristics for the current approximation
  const peakData = useMemo(() => {
    if (waveform !== 'square') return null;
    // Find the max Y in the first half of the wave (x < PI)
    let maxY = -Infinity;
    let maxX = 0;
    for (const pt of fourierData) {
      if (pt.x > 0 && pt.x < PI) {
        if (pt.y > maxY) {
          maxY = pt.y;
          maxX = pt.x;
        }
      }
    }
    return { x: maxX, y: maxY };
  }, [fourierData, waveform]);

  // The theoretical Gibbs overshoot is ~8.95% of the jump.
  // Jump is 2 (from -1 to 1). 9% of 2 is ~0.179. Max theoretical peak is ~1.17898.
  const theoreticalPeak = 1.17898;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">The Gibbs Phenomenon</h1>
            <p className="text-slate-500 mt-2 text-lg">Understanding ringing artifacts in Fourier approximations</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-2">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
              Interactive Lab
            </span>
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
              Signal Processing
            </span>
          </div>
        </header>

        {/* Main Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Controls */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Parameters
              </h2>
              
              <div className="space-y-6">
                {/* Waveform Selector */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Target Waveform</label>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                      onClick={() => setWaveform('square')}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                        waveform === 'square' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Square
                    </button>
                    <button
                      onClick={() => setWaveform('sawtooth')}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                        waveform === 'sawtooth' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Sawtooth
                    </button>
                  </div>
                </div>

                {/* Terms Slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-slate-700">Number of Harmonics (N)</label>
                    <span className="text-lg font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{terms}</span>
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
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>1</span>
                    <span>25</span>
                    <span>50</span>
                  </div>
                </div>

                {/* Animation Controls */}
                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`w-full flex items-center justify-center py-2.5 px-4 rounded-lg font-medium transition-colors ${
                      isPlaying 
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isPlaying ? (
                      <><PauseIcon /> Pause Animation</>
                    ) : (
                      <><PlayIcon /> Animate Harmonics</>
                    )}
                  </button>
                </div>

                {/* Visual Toggles */}
                {waveform === 'square' && (
                  <div className="pt-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={showHighlight} 
                        onChange={(e) => setShowHighlight(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 bg-slate-100 border-slate-300"
                      />
                      <span className="text-sm text-slate-700">Highlight Overshoot Limit</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Math Readout */}
            <div className="bg-slate-900 text-slate-300 p-6 rounded-2xl shadow-sm font-mono text-sm">
              <div className="text-slate-400 mb-2 uppercase tracking-wider text-xs font-sans font-semibold">Current Function</div>
              {waveform === 'square' ? (
                <div>
                  <div className="text-white mb-2">f(t) ≈</div>
                  <div className="pl-4 border-l-2 border-slate-700 text-blue-300">
                    4/π * Σ [ sin(n·t) / n ]
                    <br/>
                    <span className="text-slate-500 text-xs">for odd n=1, 3... {2*terms-1}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-white mb-2">f(t) ≈</div>
                  <div className="pl-4 border-l-2 border-slate-700 text-blue-300">
                    2/π * Σ [ (-1)<sup>n+1</sup> sin(n·t) / n ]
                    <br/>
                    <span className="text-slate-500 text-xs">for n=1, 2... {terms}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Visualization & Explanations */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Graph Area */}
            <div className="bg-white p-2 md:p-6 rounded-2xl shadow-sm border border-slate-200 relative">
              
              {/* Overlay HUD */}
              {waveform === 'square' && peakData && terms > 1 && (
                <div className="absolute top-8 left-8 bg-white/80 backdrop-blur px-3 py-2 rounded-lg border border-slate-200 shadow-sm z-10 text-sm">
                  <div className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Peak Overshoot</div>
                  <div className="font-mono text-rose-600 font-semibold text-lg">
                    {(((peakData.y - 1) / 2) * 100).toFixed(1)}% <span className="text-slate-400 text-xs font-sans font-normal ml-1">of jump</span>
                  </div>
                </div>
              )}

              {/* The SVG Canvas */}
              <div className="relative w-full aspect-[2/1] bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                <svg 
                  viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} 
                  preserveAspectRatio="none"
                  className="w-full h-full"
                >
                  {/* Grid Lines */}
                  <g className="stroke-slate-200" strokeWidth="1" strokeDasharray="4 4">
                    <line x1="0" y1={mapY(1)} x2={CANVAS_WIDTH} y2={mapY(1)} />
                    <line x1="0" y1={mapY(-1)} x2={CANVAS_WIDTH} y2={mapY(-1)} />
                    <line x1={mapX(PI)} y1="0" x2={mapX(PI)} y2={CANVAS_HEIGHT} />
                  </g>
                  
                  {/* X and Y Axes */}
                  <g className="stroke-slate-300" strokeWidth="2">
                    <line x1="0" y1={mapY(0)} x2={CANVAS_WIDTH} y2={mapY(0)} />
                    <line x1={mapX(0)} y1="0" x2={mapX(0)} y2={CANVAS_HEIGHT} />
                  </g>

                  {/* Theoretical Peak Line (Overshoot limit) */}
                  {waveform === 'square' && showHighlight && (
                    <g className="transition-opacity duration-300">
                      <line 
                        x1="0" 
                        y1={mapY(theoreticalPeak)} 
                        x2={CANVAS_WIDTH} 
                        y2={mapY(theoreticalPeak)} 
                        className="stroke-rose-200" 
                        strokeWidth="1" 
                        strokeDasharray="2 2"
                      />
                      <text x={CANVAS_WIDTH - 100} y={mapY(theoreticalPeak) - 5} className="fill-rose-400 text-[10px] font-mono">
                        Wilbraham-Gibbs Limit
                      </text>
                    </g>
                  )}

                  {/* Ideal Waveform */}
                  <path 
                    d={idealPath} 
                    fill="none" 
                    className="stroke-slate-300" 
                    strokeWidth="3" 
                  />

                  {/* Fourier Approximation */}
                  <path 
                    d={fourierPath} 
                    fill="none" 
                    className="stroke-blue-600 drop-shadow-sm transition-all duration-75" 
                    strokeWidth="2.5" 
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />

                  {/* Highlight Peak marker */}
                  {waveform === 'square' && peakData && showHighlight && terms > 1 && (
                    <g transform={`translate(${mapX(peakData.x)}, ${mapY(peakData.y)})`}>
                      <circle 
                        r="4" 
                        className="fill-rose-500"
                      />
                      <circle 
                        r="8" 
                        className="fill-rose-500/30 animate-ping"
                      />
                    </g>
                  )}
                </svg>

                {/* Axis Labels (HTML overlay for cleaner text rendering) */}
                <div className="absolute bottom-1 left-2 text-xs text-slate-400 font-mono">0</div>
                <div className="absolute bottom-1 right-2 text-xs text-slate-400 font-mono">2π</div>
                <div className="absolute top-[50%] left-2 -translate-y-[50%] text-xs text-slate-400 font-mono bg-white/50 px-1 rounded">0</div>
              </div>
            </div>

            {/* Explanation Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center text-indigo-600 mb-3">
                  <InfoIcon />
                  <h3 className="ml-2 font-semibold text-slate-900">What is happening?</h3>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Notice how the blue approximation wave overshoots the sharp corners of the ideal gray wave. 
                  As you increase the number of harmonics <span className="font-mono text-xs bg-slate-100 px-1 rounded">N</span>, 
                  the wave gets closer to the ideal shape overall, but the overshoot <strong>never disappears</strong>. 
                  Instead, it just gets squeezed closer to the jump.
                </p>
              </div>

              <div className="bg-indigo-50 p-6 rounded-2xl shadow-sm border border-indigo-100">
                <h3 className="font-semibold text-indigo-900 mb-3">The ~9% Rule</h3>
                <p className="text-indigo-800/80 text-sm leading-relaxed">
                  Mathematically, the peak of this overshoot converges to an exact value: roughly <strong>8.95%</strong> of the jump's height. 
                  This artifact occurs because we are trying to construct a discontinuous jump using a finite sum of continuous, smooth sine waves. 
                  This is formally known as the <strong>Gibbs Phenomenon</strong>.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}