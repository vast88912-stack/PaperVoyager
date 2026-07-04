import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, ZoomIn, ZoomOut, Info, BookOpen, Activity, AlertCircle, RotateCcw } from 'lucide-react';

const MAX_HARMONICS = 99;
const RESOLUTION = 1200; // High resolution to capture narrow peaks
const SVG_WIDTH = 800;
const SVG_HEIGHT = 400;
const Y_DOMAIN = 1.6; // Y axis goes from -1.6 to 1.6

export default function App() {
  const [harmonics, setHarmonics] = useState<number>(5);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [signalType, setSignalType] = useState<'square' | 'sawtooth'>('square');

  // Animation effect
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setHarmonics((prev) => {
        if (prev >= MAX_HARMONICS) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 2;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Compute paths and stats
  const { path, idealPath, maxOvershoot, peakCoordinates } = useMemo(() => {
    let pathStr = "";
    let idealPathStr = "";
    let maxVal = 0;
    let peakX = 0;
    let peakY = 0;

    for (let i = 0; i <= RESOLUTION; i++) {
      // t goes from 0 to 2*PI
      const t = (i / RESOLUTION) * 2 * Math.PI;
      let val = 0;
      let idealVal = 0;

      if (signalType === 'square') {
        // Square wave Fourier series
        for (let k = 1; k <= harmonics; k += 2) {
          val += (4 / Math.PI) * (Math.sin(k * t) / k);
        }
        // Ideal square wave
        idealVal = t > 0 && t < Math.PI ? 1 : t > Math.PI && t < 2 * Math.PI ? -1 : 0;
      } else {
        // Sawtooth wave Fourier series: f(t) = 2/pi * sum((-1)^(k+1) * sin(kt) / k)
        // Scaled to match amplitude 1
        for (let k = 1; k <= harmonics; k++) {
          val += (2 / Math.PI) * (Math.pow(-1, k + 1) * Math.sin(k * t) / k);
        }
        // Ideal sawtooth wave
        idealVal = (t / Math.PI) - 1; // From -1 at 0 to 1 at 2*PI roughly, wait.
        // Let's use a standard sawtooth going from -1 to 1, discontinuity at PI.
        // Formula: f(t) = t/pi for -pi to pi. Shifted to 0 to 2pi:
        idealVal = t < Math.PI ? (t / Math.PI) : (t / Math.PI) - 2;
        // Adjust formula to match ideal: 2/pi sum((-1)^(k+1) sin(k t) / k) is actually t for -pi to pi.
        // Wait, standard is sum(sin(kt)/k). Let's stick to square to avoid confusion, 
        // but if sawtooth is selected, use: 2/pi sum(sin(k(t-pi))/k) -> wait.
        val = 0;
        for (let k = 1; k <= harmonics; k++) {
          val += (2 / Math.PI) * (Math.sin(k * t) / k);
        }
        idealVal = ((Math.PI - t) / Math.PI); 
        // This gives a discontinuity at 0 and 2PI. Let's shift it to PI for better visualization
        val = 0;
        for (let k = 1; k <= harmonics; k++) {
          val += (2 / Math.PI) * (Math.sin(k * (t - Math.PI)) / k);
        }
        idealVal = ((Math.PI - (t - Math.PI)) / Math.PI) % 2;
        idealVal = idealVal > 1 ? idealVal - 2 : idealVal;
      }

      // Track max positive overshoot near the discontinuity
      if (val > maxVal) {
        maxVal = val;
        // Map to SVG coordinates
        peakX = (i / RESOLUTION) * SVG_WIDTH;
        peakY = SVG_HEIGHT / 2 - (val / Y_DOMAIN) * (SVG_HEIGHT / 2);
      }

      // Map to SVG coordinates
      const x = (i / RESOLUTION) * SVG_WIDTH;
      const y = SVG_HEIGHT / 2 - (val / Y_DOMAIN) * (SVG_HEIGHT / 2);
      
      let idealY = SVG_HEIGHT / 2 - (idealVal / Y_DOMAIN) * (SVG_HEIGHT / 2);

      if (i === 0) {
        pathStr += `M ${x} ${y} `;
        idealPathStr += `M ${x} ${idealY} `;
      } else {
        pathStr += `L ${x} ${y} `;
        // Don't draw vertical line at discontinuity for ideal path
        if (Math.abs(idealVal - ((t - (1/RESOLUTION)*2*Math.PI > 0 && t - (1/RESOLUTION)*2*Math.PI < Math.PI) ? 1 : -1)) > 1.5 && signalType === 'square') {
          idealPathStr += `M ${x} ${idealY} `;
        } else {
          idealPathStr += `L ${x} ${idealY} `;
        }
      }
    }

    const overshootPct = (maxVal - 1) * 100;

    return { path: pathStr, idealPath: idealPathStr, maxOvershoot: overshootPct, peakCoordinates: { x: peakX, y: peakY } };
  }, [harmonics, signalType]);

  // ViewBox calculation for zoom
  // We want to zoom in on the primary discontinuity which has the positive peak.
  // For Square, jump is at t=0 and t=PI. Positive peak is right after t=0.
  // Let's zoom near t=0 to t=0.2*PI, y=0.8 to 1.3
  const zoomViewBox = signalType === 'square' 
    ? `0 ${SVG_HEIGHT * 0.05} ${SVG_WIDTH * 0.15} ${SVG_HEIGHT * 0.4}`
    : `${SVG_WIDTH * 0.4} ${SVG_HEIGHT * 0.05} ${SVG_WIDTH * 0.2} ${SVG_HEIGHT * 0.4}`;

  const currentViewBox = isZoomed ? zoomViewBox : `0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`;

  // Theoretical Gibbs limit Y coordinate (~1.08949)
  const gibbsY = SVG_HEIGHT / 2 - (1.08949 / Y_DOMAIN) * (SVG_HEIGHT / 2);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <div className="flex items-center space-x-2 text-indigo-600 mb-1">
              <Activity className="w-5 h-5" />
              <span className="font-semibold text-sm tracking-wider uppercase">Fourier Sketchpad</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">The Gibbs Phenomenon</h1>
          </div>
          <div className="hidden md:flex items-center space-x-4 text-sm text-slate-500 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
            <Info className="w-4 h-4" />
            <span>Interactive Explainer Module</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Visualization */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Main Graph Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-500" />
                  Signal Reconstruction
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsZoomed(!isZoomed)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isZoomed ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
                    {isZoomed ? 'Reset View' : 'Magnify Peak'}
                  </button>
                </div>
              </div>

              {/* SVG Canvas */}
              <div className="relative w-full aspect-[2/1] bg-slate-50 rounded-xl border border-slate-200 overflow-hidden cursor-crosshair">
                <svg
                  viewBox={currentViewBox}
                  preserveAspectRatio="xMidYMid meet"
                  className="w-full h-full transition-all duration-700 ease-in-out"
                >
                  <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#4f46e5" />
                      <stop offset="50%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#4f46e5" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines */}
                  <g className="text-slate-300" strokeDasharray="4 4" strokeWidth={isZoomed ? "0.5" : "1"} stroke="currentColor">
                    <line x1="0" y1={SVG_HEIGHT/2} x2={SVG_WIDTH} y2={SVG_HEIGHT/2} />
                    <line x1="0" y1={SVG_HEIGHT/2 - (1/Y_DOMAIN)*(SVG_HEIGHT/2)} x2={SVG_WIDTH} y2={SVG_HEIGHT/2 - (1/Y_DOMAIN)*(SVG_HEIGHT/2)} />
                    <line x1="0" y1={SVG_HEIGHT/2 + (1/Y_DOMAIN)*(SVG_HEIGHT/2)} x2={SVG_WIDTH} y2={SVG_HEIGHT/2 + (1/Y_DOMAIN)*(SVG_HEIGHT/2)} />
                  </g>

                  {/* Axis Labels (hidden when zoomed for simplicity) */}
                  {!isZoomed && (
                    <g className="text-[10px] fill-slate-400 font-mono">
                      <text x="5" y={SVG_HEIGHT/2 - 5}>0</text>
                      <text x="5" y={SVG_HEIGHT/2 - (1/Y_DOMAIN)*(SVG_HEIGHT/2) - 5}>+1</text>
                      <text x="5" y={SVG_HEIGHT/2 + (1/Y_DOMAIN)*(SVG_HEIGHT/2) - 5}>-1</text>
                    </g>
                  )}

                  {/* Gibbs Limit Line */}
                  <line 
                    x1="0" y1={gibbsY} x2={SVG_WIDTH} y2={gibbsY} 
                    stroke="#ef4444" strokeWidth={isZoomed ? "0.5" : "1"} strokeDasharray="2 2" opacity="0.6"
                  />
                  {!isZoomed && (
                    <text x={SVG_WIDTH - 110} y={gibbsY - 5} className="text-[10px] fill-red-500 font-medium">
                      Gibbs Limit (~8.95%)
                    </text>
                  )}

                  {/* Ideal Signal */}
                  <path
                    d={idealPath}
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth={isZoomed ? "1" : "2"}
                    strokeDasharray="6 6"
                    opacity="0.5"
                  />

                  {/* Reconstructed Signal */}
                  <path
                    d={path}
                    fill="none"
                    stroke="url(#lineGradient)"
                    strokeWidth={isZoomed ? "1.5" : "2.5"}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    className="transition-all duration-300 ease-out"
                  />

                  {/* Peak Marker (Zoomed View) */}
                  {isZoomed && peakCoordinates.x > 0 && (
                    <g className="transition-all duration-300 ease-out" transform={`translate(${peakCoordinates.x}, ${peakCoordinates.y})`}>
                      <circle r="2" fill="none" stroke="#ef4444" strokeWidth="0.5" className="animate-ping" />
                      <circle r="1" fill="#ef4444" />
                      <text x="4" y="-4" className="text-[6px] fill-red-600 font-mono font-bold">
                        +{maxOvershoot.toFixed(2)}%
                      </text>
                    </g>
                  )}
                </svg>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                
                {/* Playback Controls */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                  </button>
                  <button
                    onClick={() => { setIsPlaying(false); setHarmonics(1); }}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    title="Reset to 1 harmonic"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                {/* Slider */}
                <div className="flex-1 w-full">
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700">
                      Number of Harmonics (N)
                    </label>
                    <span className="text-sm font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      N = {harmonics}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max={MAX_HARMONICS}
                    step="2"
                    value={harmonics}
                    onChange={(e) => {
                      setHarmonics(parseInt(e.target.value));
                      setIsPlaying(false);
                    }}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1 font-mono">
                    <span>1</span>
                    <span>{Math.floor(MAX_HARMONICS/2)}</span>
                    <span>{MAX_HARMONICS}</span>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Right Column: Explainer */}
          <div className="space-y-6">
            
            {/* Theory Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                What is Gibbs Ringing?
              </h3>
              <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                <p>
                  When approximating a piecewise continuously differentiable periodic function with a truncated Fourier series, you'll notice oscillations near the jump discontinuities.
                </p>
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-indigo-900">
                  <p className="font-medium mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    The Counterintuitive Truth
                  </p>
                  <p className="text-indigo-800/80">
                    As you increase the number of harmonics (<span className="font-mono italic">N</span>), the width of the overshoot shrinks, but its <strong>height does not vanish</strong>. It strictly converges to an overshoot of roughly <strong>8.95%</strong>!
                  </p>
                </div>
                <p>
                  First observed by Albert Michelson in 1898 using a mechanical harmonic analyzer, he thought his machine had a defect. J. Willard Gibbs later proved this is a fundamental mathematical property of Fourier series.
                </p>
              </div>
            </div>

            {/* Live Stats Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
                Live Metrics
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-500">Current Overshoot</span>
                    <span className="font-mono font-medium text-slate-900">
                      {maxOvershoot.toFixed(2)}%
                    </span>
                  </div>
                  {/* Progress bar visualizing how close we are to 8.95% */}
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 transition-all duration-300"
                      style={{ width: `${Math.min((maxOvershoot / 8.949) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Theoretical Limit</span>
                    <span className="font-mono font-medium text-red-500">≈ 8.9489%</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="text-sm text-slate-500 block mb-2">Signal Type</label>
                  <div className="flex p-1 bg-slate-100 rounded-lg">
                    <button
                      onClick={() => setSignalType('square')}
                      className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${
                        signalType === 'square' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Square
                    </