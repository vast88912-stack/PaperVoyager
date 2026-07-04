import React, { useState, useMemo, useEffect } from 'react';

export default function App() {
  const [harmonics, setHarmonics] = useState<number>(5);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Constants for visualization
  const WIDTH = 600;
  const HEIGHT = 400;
  const POINTS = 500;
  const MAX_Y = 1.5; // Y-axis range: [-1.5, 1.5]
  const THEORETICAL_OVERSHOOT = 1.1789797; // ~1.18 or 9% overshoot of the jump (jump is 2, so 0.09 * 2 = 0.18. 1 + 0.18 = 1.18)

  // Auto-play effect
  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        setHarmonics((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return prev + 1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Generate signal data
  const signalData = useMemo(() => {
    const data = [];
    let currentMax = 0;

    for (let i = 0; i <= POINTS; i++) {
      const t = (i / POINTS) * 2 * Math.PI;
      
      // Ideal Square Wave (1 for 0 < t < pi, -1 for pi < t < 2pi)
      // At exactly 0, pi, 2pi we can set to 0 or just let it be 1/-1.
      let ideal = 0;
      if (t > 0 && t < Math.PI) ideal = 1;
      else if (t > Math.PI && t < 2 * Math.PI) ideal = -1;

      // Fourier Approximation
      let approximation = 0;
      // Square wave Fourier series: (4/pi) * sum(sin(n*t)/n) for odd n
      for (let n = 1; n <= harmonics * 2; n += 2) {
        approximation += (4 / Math.PI) * (Math.sin(n * t) / n);
      }

      if (Math.abs(approximation) > currentMax) {
        currentMax = Math.abs(approximation);
      }

      data.push({ t, ideal, approximation });
    }
    return { data, currentMax };
  }, [harmonics]);

  // SVG Path generation
  const { idealPath, approxPath } = useMemo(() => {
    let iPath = '';
    let aPath = '';

    signalData.data.forEach((pt, index) => {
      const x = (pt.t / (2 * Math.PI)) * WIDTH;
      const yIdeal = HEIGHT / 2 - (pt.ideal / MAX_Y) * (HEIGHT / 2);
      const yApprox = HEIGHT / 2 - (pt.approximation / MAX_Y) * (HEIGHT / 2);

      if (index === 0) {
        iPath += `M ${x} ${yIdeal} `;
        aPath += `M ${x} ${yApprox} `;
      } else {
        // For ideal path, draw vertical lines at jumps
        if (Math.abs(signalData.data[index].ideal - signalData.data[index - 1].ideal) > 1) {
          iPath += `L ${x} ${HEIGHT / 2 - (signalData.data[index - 1].ideal / MAX_Y) * (HEIGHT / 2)} `;
        }
        iPath += `L ${x} ${yIdeal} `;
        aPath += `L ${x} ${yApprox} `;
      }
    });

    return { idealPath: iPath, approxPath: aPath };
  }, [signalData]);

  // Export to CSV
  const handleExportCSV = () => {
    let csvContent = "Time(rad),Ideal,Approximation\n";
    signalData.data.forEach(row => {
      csvContent += `${row.t.toFixed(4)},${row.ideal},${row.approximation.toFixed(6)}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `gibbs_harmonics_${harmonics}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const overshootPercent = (((signalData.currentMax - 1) / 2) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-6xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col lg:flex-row">
        
        {/* Left Panel: Visualization */}
        <div className="w-full lg:w-3/5 bg-slate-900 p-6 md:p-10 flex flex-col relative">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-1">Interactive Signal</h2>
            <p className="text-slate-400 text-sm">Time Domain Representation</p>
          </div>

          <div className="flex-grow flex items-center justify-center relative w-full aspect-video lg:aspect-auto bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-inner">
            <svg 
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`} 
              className="w-full h-full drop-shadow-md"
              preserveAspectRatio="none"
            >
              {/* Grid Lines */}
              <line x1="0" y1={HEIGHT/2} x2={WIDTH} y2={HEIGHT/2} stroke="#334155" strokeWidth="2" />
              <line x1={WIDTH/2} y1="0" x2={WIDTH/2} y2={HEIGHT} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
              
              {/* Theoretical Overshoot Lines */}
              <line 
                x1="0" 
                y1={HEIGHT / 2 - (THEORETICAL_OVERSHOOT / MAX_Y) * (HEIGHT / 2)} 
                x2={WIDTH} 
                y2={HEIGHT / 2 - (THEORETICAL_OVERSHOOT / MAX_Y) * (HEIGHT / 2)} 
                stroke="#ef4444" 
                strokeWidth="1" 
                strokeDasharray="4 4" 
                opacity="0.5"
              />
              <line 
                x1="0" 
                y1={HEIGHT / 2 - (-THEORETICAL_OVERSHOOT / MAX_Y) * (HEIGHT / 2)} 
                x2={WIDTH} 
                y2={HEIGHT / 2 - (-THEORETICAL_OVERSHOOT / MAX_Y) * (HEIGHT / 2)} 
                stroke="#ef4444" 
                strokeWidth="1" 
                strokeDasharray="4 4" 
                opacity="0.5"
              />

              {/* Ideal Signal */}
              <path d={idealPath} fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="6 6" opacity="0.6" />
              
              {/* Fourier Approximation */}
              <path d={approxPath} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            {/* Legend / Overlay */}
            <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-sm border border-slate-700 p-3 rounded-lg text-xs space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-slate-500 border-t-2 border-dashed border-slate-500"></div>
                <span className="text-slate-300">Ideal Square Wave</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-sky-400"></div>
                <span className="text-slate-300">Fourier Series (N={harmonics})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-red-500 border-t-2 border-dashed border-red-500"></div>
                <span className="text-slate-300">~9% Overshoot Limit</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-8 space-y-4">
            <div className="flex justify-between items-end">
              <label className="text-slate-300 font-medium text-sm flex flex-col">
                Number of Harmonics (N)
                <span className="text-sky-400 text-2xl font-bold mt-1">{harmonics}</span>
              </label>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                  isPlaying 
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50' 
                    : 'bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 border border-sky-500/50'
                }`}
              >
                {isPlaying ? 'Stop Animation' : 'Auto-Play'}
              </button>
            </div>
            <input 
              type="range" 
              min="1" 
              max="100" 
              value={harmonics} 
              onChange={(e) => {
                setHarmonics(parseInt(e.target.value));
                setIsPlaying(false);
              }}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>1 (Sine Wave)</span>
              <span>100 (Dense Approximation)</span>
            </div>
          </div>
        </div>

        {/* Right Panel: Explainer */}
        <div className="w-full lg:w-2/5 p-6 md:p-10 flex flex-col justify-between bg-white">
          <div>
            <div className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold tracking-wider uppercase mb-4">
              Signal Processing 101
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 leading-tight">
              The Gibbs Phenomenon
            </h1>
            
            <div className="space-y-4 text-slate-600 leading-relaxed">
              <p>
                When you try to approximate a signal with a jump discontinuity (like a square wave) using a Fourier series, you'll notice something strange at the edges.
              </p>
              <p>
                No matter how many harmonics <span className="font-semibold text-slate-800">(N)</span> you add, the approximation always overshoots the jump. This peculiar behavior is known as <strong>Gibbs Ringing</strong>.
              </p>
              
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 shadow-sm my-6">
                <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Why does this happen?
                </h3>
                <p className="text-sm">
                  Fourier series use continuous sine and cosine waves. A sudden, instantaneous jump is impossible for continuous functions to perfectly trace without infinite frequencies. The sum converges pointwise, but not uniformly, causing the energy to "bunch up" near the discontinuity.
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <div>
                  <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">Current Overshoot</p>
                  <p className="text-2xl font-bold text-indigo-900">~{overshootPercent}%</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">Theoretical Limit</p>
                  <p className="text-2xl font-bold text-indigo-900">8.95%</p>
                </div>
              </div>
              
              <p className="text-sm italic text-slate-500 mt-4">
                Notice how increasing N squeezes the ringing closer to the jump, but the peak amplitude of the overshoot never disappears!
              </p>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-100">
            <button 
              onClick={handleExportCSV}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export Signal to CSV
            </button>
            <p className="text-center text-xs text-slate-400 mt-3">
              Downloads the current time-domain approximation (400 points)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}