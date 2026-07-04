import React, { useState, useMemo } from 'react';

// --- Types & Interfaces ---
type SignalType = 'square' | 'sawtooth' | 'triangle';

interface HarmonicData {
  n: number;
  a: number;
  b: number;
  magnitude: number;
  phase: number;
}

// --- Math Helpers ---
const computeHarmonics = (type: SignalType, numHarmonics: number): HarmonicData[] => {
  const harmonics: HarmonicData[] = [];
  
  for (let n = 1; n <= numHarmonics; n++) {
    let a = 0;
    let b = 0;

    if (type === 'square') {
      // Square wave: odd harmonics only
      if (n % 2 !== 0) {
        b = 4 / (n * Math.PI);
      }
    } else if (type === 'sawtooth') {
      // Sawtooth wave: all harmonics
      b = (2 / (n * Math.PI)) * (n % 2 === 0 ? -1 : 1);
    } else if (type === 'triangle') {
      // Triangle wave: odd harmonics only, alternating signs
      if (n % 2 !== 0) {
        const sign = ((n - 1) / 2) % 2 === 0 ? 1 : -1;
        a = (8 / (n * n * Math.PI * Math.PI)) * sign;
      }
    }

    const magnitude = Math.sqrt(a * a + b * b);
    // If magnitude is practically zero, force phase to 0 to avoid messy charts
    const phase = magnitude > 1e-5 ? Math.atan2(b, a) : 0;

    harmonics.push({ n, a, b, magnitude, phase });
  }
  return harmonics;
};

// --- Components ---

export default function App() {
  const [signalType, setSignalType] = useState<SignalType>('square');
  const [numHarmonics, setNumHarmonics] = useState<number>(15);
  const [hoveredHarmonic, setHoveredHarmonic] = useState<number | null>(null);

  const harmonics = useMemo(() => computeHarmonics(signalType, numHarmonics), [signalType, numHarmonics]);

  // Chart Dimensions
  const svgWidth = 800;
  const svgHeight = 240;
  const margin = { top: 20, right: 20, bottom: 30, left: 50 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  // Scales
  const maxMagnitude = Math.max(1.5, ...harmonics.map(h => h.magnitude));
  const barWidth = Math.max(2, (plotWidth / numHarmonics) - 4);

  const formatNumber = (num: number) => num.toFixed(3);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8 font-sans selection:bg-indigo-200">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header & Controls */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fourier Frequency Domain</h1>
            <p className="text-sm text-slate-500 mt-1">Explore magnitude and phase spectra of periodic signals.</p>
          </div>

          <div className="flex flex-col gap-4 w-full md:w-auto">
            <div className="flex bg-slate-100 p-1 rounded-lg self-start">
              {(['square', 'sawtooth', 'triangle'] as SignalType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setSignalType(type)}
                  className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${
                    signalType === type
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <label htmlFor="harmonics-slider" className="text-sm font-medium text-slate-700 whitespace-nowrap">
                Harmonics (N): <span className="text-indigo-600 w-6 inline-block">{numHarmonics}</span>
              </label>
              <input
                id="harmonics-slider"
                type="range"
                min="1"
                max="50"
                value={numHarmonics}
                onChange={(e) => setNumHarmonics(parseInt(e.target.value, 10))}
                className="w-full md:w-48 accent-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Magnitude Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Magnitude Spectrum</h2>
              <p className="text-xs text-slate-500">Amplitude of each frequency component (Mₙ = √(aₙ² + bₙ²))</p>
            </div>
            {hoveredHarmonic !== null && (
              <div className="text-right text-sm bg-indigo-50 px-3 py-1.5 rounded-md border border-indigo-100">
                <span className="font-semibold text-indigo-700">n = {hoveredHarmonic}</span>
                <span className="mx-2 text-slate-300">|</span>
                <span className="text-slate-700">Mag: {formatNumber(harmonics[hoveredHarmonic - 1].magnitude)}</span>
              </div>
            )}
          </div>

          <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[600px]">
              {/* Grid Lines */}
              {[0, 0.5, 1.0, 1.5].map((val) => {
                if (val > maxMagnitude && val !== 0) return null;
                const y = margin.top + plotHeight - (val / maxMagnitude) * plotHeight;
                return (
                  <g key={`grid-mag-${val}`}>
                    <line x1={margin.left} y1={y} x2={svgWidth - margin.right} y2={y} className="stroke-slate-200" strokeDasharray="4 4" />
                    <text x={margin.left - 10} y={y + 4} className="text-[10px] fill-slate-400 text-end" textAnchor="end">{val.toFixed(1)}</text>
                  </g>
                );
              })}

              {/* X Axis */}
              <line 
                x1={margin.left} 
                y1={margin.top + plotHeight} 
                x2={svgWidth - margin.right} 
                y2={margin.top + plotHeight} 
                className="stroke-slate-400 stroke-2" 
              />
              
              {/* Bars */}
              {harmonics.map((h, i) => {
                const x = margin.left + (i * (plotWidth / numHarmonics)) + (plotWidth / numHarmonics) / 2 - barWidth / 2;
                const barH = (h.magnitude / maxMagnitude) * plotHeight;
                const y = margin.top + plotHeight - barH;
                const isHovered = hoveredHarmonic === h.n;

                return (
                  <g key={`mag-${h.n}`}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barH}
                      className={`transition-all duration-300 ease-out cursor-pointer ${
                        h.magnitude < 1e-5 ? 'fill-transparent' : isHovered ? 'fill-indigo-400' : 'fill-indigo-600'
                      }`}
                      rx={2}
                      onMouseEnter={() => setHoveredHarmonic(h.n)}
                      onMouseLeave={() => setHoveredHarmonic(null)}
                    />
                    {/* X-axis labels for sparse harmonics or every 5th */}
                    {(numHarmonics <= 20 || h.n % 5 === 0 || h.n === 1) && (
                      <text 
                        x={x + barWidth / 2} 
                        y={margin.top + plotHeight + 16} 
                        className={`text-[10px] text-center transition-colors ${isHovered ? 'fill-indigo-600 font-bold' : 'fill-slate-400'}`}
                        textAnchor="middle"
                      >
                        {h.n}
                      </text>
                    )}
                  </g>
                );
              })}
              <text x={svgWidth / 2} y={svgHeight - 2} className="text-[11px] fill-slate-500 font-medium" textAnchor="middle">
                Harmonic Number (n)
              </text>
            </svg>
          </div>
        </div>

        {/* Phase Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Phase Spectrum</h2>
              <p className="text-xs text-slate-500">Phase shift of each frequency component (φₙ = atan2(bₙ, aₙ))</p>
            </div>
            {hoveredHarmonic !== null && (
              <div className="text-right text-sm bg-teal-50 px-3 py-1.5 rounded-md border border-teal-100">
                <span className="font-semibold text-teal-700">n = {hoveredHarmonic}</span>
                <span className="mx-2 text-slate-300">|</span>
                <span className="text-slate-700">Phase: {(harmonics[hoveredHarmonic - 1].phase / Math.PI).toFixed(2)}π</span>
              </div>
            )}
          </div>

          <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[600px]">
              {/* Grid Lines (-π, -π/2, 0, π/2, π) */}
              {[
                { val: Math.PI, label: 'π' },
                { val: Math.PI / 2, label: 'π/2' },
                { val: 0, label: '0' },
                { val: -Math.PI / 2, label: '-π/2' },
                { val: -Math.PI, label: '-π' }
              ].map((tick) => {
                const y = margin.top + plotHeight / 2 - (tick.val / Math.PI) * (plotHeight / 2);
                return (
                  <g key={`grid-phase-${tick.label}`}>
                    <line 
                      x1={margin.left} 
                      y1={y} 
                      x2={svgWidth - margin.right} 
                      y2={y} 
                      className={tick.val === 0 ? "stroke-slate-400 stroke-2" : "stroke-slate-200"} 
                      strokeDasharray={tick.val === 0 ? "none" : "4 4"} 
                    />
                    <text x={margin.left - 10} y={y + 4} className="text-[10px] fill-slate-400 text-end" textAnchor="end">
                      {tick.label}
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              {harmonics.map((h, i) => {
                const x = margin.left + (i * (plotWidth / numHarmonics)) + (plotWidth / numHarmonics) / 2 - barWidth / 2;
                const centerY = margin.top + plotHeight / 2;
                const barH = Math.abs((h.phase / Math.PI) * (plotHeight / 2));
                const y = h.phase >= 0 ? centerY - barH : centerY;
                const isHovered = hoveredHarmonic === h.n;

                // Only draw bar if magnitude is significant
                const isSignificant = h.magnitude > 1e-5;

                return (
                  <g key={`phase-${h.n}`}>
                    {isSignificant && (
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={Math.max(barH, 2)} // Min height of 2px if it's exactly 0 but significant
                        className={`transition-all duration-300 ease-out cursor-pointer ${
                          isHovered ? 'fill-teal-400' : 'fill-teal-500'
                        }`}
                        rx={2}
                        onMouseEnter={() => setHoveredHarmonic(h.n)}
                        onMouseLeave={() => setHoveredHarmonic(null)}
                      />
                    )}
                    
                    {/* Invisible hit area for easier hovering on zero-phase significant harmonics */}
                    <rect
                      x={x - 2}
                      y={margin.top}
                      width={barWidth + 4}
                      height={plotHeight}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredHarmonic(h.n)}
                      onMouseLeave={() => setHoveredHarmonic(null)}
                    />

                    {/* X-axis labels */}
                    {(numHarmonics <= 20 || h.n % 5 === 0 || h.n === 1) && (
                      <text 
                        x={x + barWidth / 2} 
                        y={margin.top + plotHeight + 16} 
                        className={`text-[10px] text-center transition-colors ${isHovered ? 'fill-teal-600 font-bold' : 'fill-slate-400'}`}
                        textAnchor="middle"
                      >
                        {h.n}
                      </text>
                    )}
                  </g>
                );
              })}
              <text x={svgWidth / 2} y={svgHeight - 2} className="text-[11px] fill-slate-500 font-medium" textAnchor="middle">
                Harmonic Number (n)
              </text>
            </svg>
          </div>
        </div>

        {/* Insight Panel */}
        <div className="bg-indigo-50/50 rounded-xl p-5 border border-indigo-100 flex items-start gap-4">
          <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-indigo-900 mb-1">Signal Insights: {signalType.charAt(0).toUpperCase() + signalType.slice(1)} Wave</h3>
            <p className="text-sm text-indigo-800/80 leading-relaxed">
              {signalType === 'square' && "Notice how the even harmonics (n=2, 4, 6...) have zero magnitude. The phase alternates between π/2 and -π/2 depending on the sine terms. The slow 1/n decay in magnitude is what causes the sharp transitions and Gibbs ringing in the time domain."}
              {signalType === 'sawtooth' && "Unlike the square wave, the sawtooth contains all integer harmonics. The magnitude decays at a rate of 1/n. The phase alternates between π/2 and -π/2 for each successive harmonic."}
              {signalType === 'triangle' && "The triangle wave only contains odd harmonics, but their magnitude decays much faster at a rate of 1/n². This rapid decay explains why the triangle wave looks much smoother than square or sawtooth waves. Phases alternate between 0 and π."}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}