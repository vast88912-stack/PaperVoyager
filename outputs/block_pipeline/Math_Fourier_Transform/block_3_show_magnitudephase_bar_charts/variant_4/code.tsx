import React, { useState, useMemo, useRef, useEffect } from 'react';

// --- Math & Signal Generation ---

type SignalType = 'square' | 'sawtooth' | 'triangle' | 'noise';

interface Harmonic {
  n: number;
  a: number; // Cosine coefficient
  b: number; // Sine coefficient
  mag: number;
  phase: number;
  active: boolean;
}

const EPSILON = 1e-10;

function generateHarmonics(type: SignalType, numHarmonics: number): Harmonic[] {
  return Array.from({ length: numHarmonics }, (_, i) => {
    const n = i + 1;
    let a = 0;
    let b = 0;

    switch (type) {
      case 'square':
        // Square wave: b_n = 4/(pi*n) for odd n, 0 for even n. a_n = 0.
        if (n % 2 !== 0) {
          b = 4 / (Math.PI * n);
        }
        break;
      case 'sawtooth':
        // Sawtooth wave: b_n = 2/(pi*n) * (-1)^(n+1)
        b = (2 / (Math.PI * n)) * (n % 2 === 0 ? -1 : 1);
        break;
      case 'triangle':
        // Triangle wave: a_n = 8/(pi^2 * n^2) for odd n. b_n = 0
        if (n % 2 !== 0) {
          // (-1)^((n-1)/2)
          const sign = ((n - 1) / 2) % 2 === 0 ? 1 : -1;
          a = (8 / (Math.PI * Math.PI * n * n)) * sign;
        }
        break;
      case 'noise':
        // Random real coefficients
        a = (Math.random() - 0.5) * (2 / Math.sqrt(n));
        b = (Math.random() - 0.5) * (2 / Math.sqrt(n));
        break;
    }

    // Clean up float imprecision
    if (Math.abs(a) < EPSILON) a = 0;
    if (Math.abs(b) < EPSILON) b = 0;

    const mag = Math.sqrt(a * a + b * b);
    // Phase in radians, range [-pi, pi]
    // Convention: C_n * cos(nwt + phi_n) -> a_n cos - b_n sin ? 
    // Usually atan2(-b, a)
    let phase = mag > EPSILON ? Math.atan2(-b, a) : 0;

    return { n, a, b, mag, phase, active: true };
  });
}

// --- Components ---

const StemChart = ({
  data,
  dataKey,
  yMin,
  yMax,
  color,
  title,
  yLabel,
  onToggleHarmonic,
}: {
  data: Harmonic[];
  dataKey: 'mag' | 'phase';
  yMin: number;
  yMax: number;
  color: string;
  title: string;
  yLabel: string;
  onToggleHarmonic: (n: number) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredN, setHoveredN] = useState<number | null>(null);

  useEffect(() => {
    const observeTarget = containerRef.current;
    if (!observeTarget) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(observeTarget);
    return () => resizeObserver.unobserve(observeTarget);
  }, []);

  const { width, height } = dimensions;
  const margin = { top: 30, right: 30, bottom: 40, left: 60 };
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);

  const nMax = data.length;
  
  // Scales
  const xScale = (n: number) => ((n - 0.5) / nMax) * innerWidth;
  const yScale = (val: number) => {
    const range = yMax - yMin;
    const normalized = (val - yMin) / range;
    return innerHeight - normalized * innerHeight;
  };

  const zeroY = yScale(0);

  // Generate grid lines (Y axis)
  const yTicks = useMemo(() => {
    const ticks = [];
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      ticks.push(yMin + (yMax - yMin) * (i / steps));
    }
    return ticks;
  }, [yMin, yMax]);

  return (
    <div className="flex flex-col h-full w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/50">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <span className="text-xs text-slate-400 font-mono">{yLabel}</span>
      </div>
      
      <div className="flex-1 relative p-2" ref={containerRef}>
        {width > 0 && height > 0 && (
          <svg width={width} height={height} className="absolute top-0 left-0">
            <g transform={`translate(${margin.left}, ${margin.top})`}>
              {/* Y-Axis Grid & Labels */}
              {yTicks.map((tick, i) => {
                const yPos = yScale(tick);
                return (
                  <g key={`y-tick-${i}`}>
                    <line
                      x1={0}
                      y1={yPos}
                      x2={innerWidth}
                      y2={yPos}
                      stroke="#e2e8f0"
                      strokeDasharray={tick === 0 ? "0" : "4 4"}
                      strokeWidth={tick === 0 ? 2 : 1}
                    />
                    <text
                      x={-10}
                      y={yPos}
                      alignmentBaseline="middle"
                      textAnchor="end"
                      className="text-[10px] fill-slate-400 font-mono"
                    >
                      {tick.toFixed(2)}
                    </text>
                  </g>
                );
              })}

              {/* X-Axis Base Line */}
              <line
                x1={0}
                y1={zeroY}
                x2={innerWidth}
                y2={zeroY}
                stroke="#94a3b8"
                strokeWidth={2}
              />

              {/* Data Stems */}
              {data.map((d) => {
                const xPos = xScale(d.n);
                const yPos = yScale(d[dataKey]);
                const isHovered = hoveredN === d.n;
                const isActive = d.active;
                
                return (
                  <g
                    key={`stem-${d.n}`}
                    onMouseEnter={() => setHoveredN(d.n)}
                    onMouseLeave={() => setHoveredN(null)}
                    onClick={() => onToggleHarmonic(d.n)}
                    className="cursor-pointer"
                  >
                    {/* Invisible wider line for easier hovering */}
                    <line
                      x1={xPos}
                      y1={zeroY}
                      x2={xPos}
                      y2={yPos}
                      stroke="transparent"
                      strokeWidth={16}
                    />
                    
                    {/* Actual Stem */}
                    <line
                      x1={xPos}
                      y1={zeroY}
                      x2={xPos}
                      y2={yPos}
                      stroke={isActive ? color : '#cbd5e1'}
                      strokeWidth={isHovered ? 4 : 2}
                      className="transition-all duration-200"
                    />
                    
                    {/* Stem Cap (Circle) */}
                    <circle
                      cx={xPos}
                      cy={yPos}
                      r={isHovered ? 6 : 4}
                      fill={isActive ? (isHovered ? '#fff' : color) : '#f8fafc'}
                      stroke={isActive ? color : '#cbd5e1'}
                      strokeWidth={2}
                      className="transition-all duration-200"
                    />

                    {/* X-Axis Label for few harmonics or hovered */}
                    {(isHovered || (nMax <= 20 && d.n % 2 !== 0) || d.n === 1 || d.n === nMax) && (
                      <text
                        x={xPos}
                        y={innerHeight + 20}
                        textAnchor="middle"
                        className={`text-[10px] font-mono transition-colors ${
                          isHovered ? 'fill-indigo-600 font-bold' : 'fill-slate-400'
                        }`}
                      >
                        {d.n}
                      </text>
                    )}

                    {/* Tooltip */}
                    {isHovered && (
                      <g transform={`translate(${xPos}, ${yPos - 15})`}>
                        <rect
                          x={-35}
                          y={-24}
                          width={70}
                          height={20}
                          rx={4}
                          fill="#1e293b"
                          className="shadow-lg"
                        />
                        <text
                          x={0}
                          y={-10}
                          textAnchor="middle"
                          fill="#fff"
                          className="text-[11px] font-mono"
                        >
                          {d[dataKey].toFixed(3)}
                        </text>
                        <polygon
                          points="-4,-4 4,-4 0,0"
                          fill="#1e293b"
                        />
                      </g>
                    )}
                  </g>
                );
              })}
              
              {/* X Axis Title */}
              <text
                x={innerWidth / 2}
                y={innerHeight + 35}
                textAnchor="middle"
                className="text-xs fill-slate-500 font-medium"
              >
                Harmonic Number (n)
              </text>
            </g>
          </svg>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [signalType, setSignalType] = useState<SignalType>('square');
  const [numHarmonics, setNumHarmonics] = useState<number>(20);
  const [harmonics, setHarmonics] = useState<Harmonic[]>([]);

  // Initialize and update harmonics
  useEffect(() => {
    setHarmonics(generateHarmonics(signalType, numHarmonics));
  }, [signalType, numHarmonics]);

  // Derived max values for chart scaling
  const maxMag = useMemo(() => {
    const max = Math.max(...harmonics.map((h) => h.mag));
    return max > 0 ? Math.ceil(max * 1.2 * 10) / 10 : 1.5;
  }, [harmonics]);

  const toggleHarmonic = (n: number) => {
    setHarmonics(prev => 
      prev.map(h => h.n === n ? { ...h, active: !h.active } : h)
    );
  };

  const exportCSV = () => {
    const headers = ['n', 'a_n', 'b_n', 'Magnitude', 'Phase(rad)'];
    const rows = harmonics.map(h => 
      [h.n, h.a.toFixed(6), h.b.toFixed(6), h.mag.toFixed(6), h.phase.toFixed(6)].join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `fourier_${signalType}_N${numHarmonics}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-6 flex flex-col font-sans">
      
      {/* Header & Controls */}
      <div className="max-w-6xl w-full mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6 flex flex-col md:flex-row items-center justify-between gap-6">
        
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
              <path d="M2 12h4l3-9 5 18 3-9h5"/>
            </svg>
            Fourier Spectrum Analysis
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Visualize Magnitude & Phase spectra for periodic signals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          {/* Signal Preset Selector */}
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {(['square', 'sawtooth', 'triangle', 'noise'] as SignalType[]).map((type) => (
              <button
                key={type}
                onClick={() => setSignalType(type)}
                className={`px-4 py-2 text-sm font-medium rounded-md capitalize transition-colors ${
                  signalType === type
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Harmonics Slider */}
          <div className="flex flex-col gap-1 min-w-[150px]">
            <div className="flex justify-between text-xs font-medium text-slate-600">
              <span>Harmonics (N)</span>
              <span className="text-indigo-600 bg-indigo-50 px-1.5 rounded">{numHarmonics}</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={numHarmonics}
              onChange={(e) => setNumHarmonics(parseInt(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>

          {/* Export Button */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-slate-900"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="max-w-6xl w-full mx-auto flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[500px]">
        {/* Magnitude Chart */}
        <StemChart
          data={harmonics}
          dataKey="mag"
          yMin={0}
          yMax={maxMag}
          color="#6366f1" // indigo-500
          title="Magnitude Spectrum"
          yLabel="|Cₙ|"
          onToggleHarmonic={toggleHarmonic}
        />

        {/* Phase Chart */}
        <StemChart
          data={harmonics}
          dataKey="phase"
          yMin={-Math.PI * 1.2}
          yMax={Math.PI * 1.2}
          color="#f43f5e" // rose-500
          title="Phase Spectrum"
          yLabel="∠Cₙ (rad)"
          onToggleHarmonic={toggleHarmonic}
        />
      </div>

      {/* Footer info */}
      <div className="max-w-6xl w-full mx-auto mt-6 text-center text-sm text-slate-400">
        <p>Tip: Click on individual stems to mute/unmute specific harmonics in the reconstruction.</p>
      </div>

    </div>
  );
}