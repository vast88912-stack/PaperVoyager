import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// --- Types ---
type Harmonic = {
  mag: number;
  phase: number;
};

// --- Constants ---
const MAX_HARMONICS = 30;
const MAG_MAX = 1.5;
const PHASE_MAX = Math.PI;

// --- Helper Functions ---
const generatePresets = (type: 'square' | 'sawtooth' | 'triangle' | 'reset'): Harmonic[] => {
  const newH: Harmonic[] = [];
  for (let i = 1; i <= MAX_HARMONICS; i++) {
    if (type === 'square') {
      newH.push({
        mag: i % 2 !== 0 ? 4 / (i * Math.PI) : 0,
        phase: -Math.PI / 2,
      });
    } else if (type === 'sawtooth') {
      newH.push({
        mag: 2 / (i * Math.PI),
        phase: i % 2 !== 0 ? -Math.PI / 2 : Math.PI / 2,
      });
    } else if (type === 'triangle') {
      newH.push({
        mag: i % 2 !== 0 ? 8 / Math.pow(i * Math.PI, 2) : 0,
        phase: i % 4 === 1 ? -Math.PI / 2 : Math.PI / 2,
      });
    } else {
      newH.push({ mag: 0, phase: 0 });
    }
  }
  return newH;
};

// --- Components ---

// 1. Interactive Bar Chart for Magnitude and Phase
interface InteractiveChartProps {
  data: number[];
  min: number;
  max: number;
  title: string;
  color: string;
  baseline: 'bottom' | 'center';
  onChange: (index: number, value: number) => void;
  formatTooltip?: (val: number) => string;
}

const InteractiveChart: React.FC<InteractiveChartProps> = ({
  data,
  min,
  max,
  title,
  color,
  baseline,
  onChange,
  formatTooltip = (v) => v.toFixed(2),
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerEvent = useCallback(
    (e: React.PointerEvent<SVGSVGElement> | PointerEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const barWidth = rect.width / data.length;
      const index = Math.floor(x / barWidth);

      if (index < 0 || index >= data.length) return;
      setHoverIndex(index);

      if (e.buttons !== 1) return; // Only trigger if left mouse button is pressed

      const normalizedY = 1 - y / rect.height; // 0 at bottom, 1 at top
      const value = min + normalizedY * (max - min);
      const clamped = Math.max(min, Math.min(max, value));

      onChange(index, clamped);
    },
    [data.length, min, max, onChange]
  );

  useEffect(() => {
    const handlePointerUp = () => setIsDragging(false);
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, []);

  return (
    <div className="flex flex-col space-y-2 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        {hoverIndex !== null && (
          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
            n={hoverIndex + 1}: {formatTooltip(data[hoverIndex])}
          </span>
        )}
      </div>
      <svg
        ref={svgRef}
        className="w-full h-40 cursor-crosshair touch-none"
        onPointerDown={(e) => {
          setIsDragging(true);
          handlePointerEvent(e);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (isDragging) handlePointerEvent(e);
          else {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const barWidth = rect.width / data.length;
            const index = Math.floor(x / barWidth);
            if (index >= 0 && index < data.length) setHoverIndex(index);
          }
        }}
        onPointerLeave={() => setHoverIndex(null)}
      >
        {/* Grid lines */}
        <line x1="0" y1="0" x2="100%" y2="0" stroke="#f1f5f9" strokeWidth="1" />
        <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="0" y1="100%" x2="100%" y2="100%" stroke="#f1f5f9" strokeWidth="1" />

        {data.map((val, i) => {
          const w = 100 / data.length;
          const x = i * w;
          let y, h;

          if (baseline === 'bottom') {
            const pct = Math.max(0, Math.min(1, val / max));
            h = pct * 100;
            y = 100 - h;
          } else {
            // Center baseline (for phase: -PI to PI)
            const range = max - min;
            const zeroY = 100 - ((0 - min) / range) * 100;
            const valY = 100 - ((val - min) / range) * 100;
            y = Math.min(zeroY, valY);
            h = Math.abs(zeroY - valY);
            // Ensure minimum height of 1px for visibility if 0
            if (h < 1) {
              h = 1;
              y = zeroY;
            }
          }

          const isHovered = hoverIndex === i;

          return (
            <g key={i}>
              {/* Invisible interaction area */}
              <rect x={`${x}%`} y="0" width={`${w}%`} height="100%" fill="transparent" />
              {/* Actual Bar */}
              <rect
                x={`${x + w * 0.1}%`}
                y={`${y}%`}
                width={`${w * 0.8}%`}
                height={`${h}%`}
                fill={color}
                opacity={isHovered ? 1 : 0.7}
                rx="2"
                className="transition-all duration-75"
              />
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
        <span>n=1</span>
        <span>Frequency Domain (Harmonics)</span>
        <span>n={MAX_HARMONICS}</span>
      </div>
    </div>
  );
};

// 2. Main App Component
export default function App() {
  const [harmonics, setHarmonics] = useState<Harmonic[]>(generatePresets('square'));
  const [activeN, setActiveN] = useState<number>(15);
  const [isAnimating, setIsAnimating] = useState(false);

  // Time domain reconstruction path
  const pathData = useMemo(() => {
    const points = 500;
    let path = '';
    for (let i = 0; i <= points; i++) {
      const t = (i / points) * Math.PI * 4; // 2 periods
      let y = 0;
      for (let n = 1; n <= activeN; n++) {
        const h = harmonics[n - 1];
        y += h.mag * Math.cos(n * t + h.phase);
      }
      
      // Map to SVG coordinates (width: 800, height: 300)
      const svgX = (i / points) * 800;
      const svgY = 150 - y * 100; // Scale amplitude

      if (i === 0) path += `M ${svgX} ${svgY} `;
      else path += `L ${svgX} ${svgY} `;
    }
    return path;
  }, [harmonics, activeN]);

  // Animation effect
  useEffect(() => {
    let interval: number;
    if (isAnimating) {
      setActiveN(1);
      interval = window.setInterval(() => {
        setActiveN((prev) => {
          if (prev >= MAX_HARMONICS) {
            setIsAnimating(false);
            return MAX_HARMONICS;
          }
          return prev + 1;
        });
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isAnimating]);

  const handleMagChange = useCallback((index: number, value: number) => {
    setHarmonics((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], mag: value };
      return next;
    });
  }, []);

  const handlePhaseChange = useCallback((index: number, value: number) => {
    setHarmonics((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], phase: value };
      return next;
    });
  }, []);

  const exportCSV = () => {
    let csv = 'Harmonic,Magnitude,Phase(rad)\n';
    harmonics.forEach((h, i) => {
      csv += `${i + 1},${h.mag.toFixed(6)},${h.phase.toFixed(6)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fourier_coefficients.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 md:p-10 selection:bg-indigo-100">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Fourier Sketchpad
            </h1>
            <p className="text-slate-500 mt-1">Shape the frequency domain to reconstruct signals in real-time.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setHarmonics(generatePresets('square'))} className="px-4 py-2 text-sm font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">Square</button>
            <button onClick={() => setHarmonics(generatePresets('sawtooth'))} className="px-4 py-2 text-sm font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">Sawtooth</button>
            <button onClick={() => setHarmonics(generatePresets('triangle'))} className="px-4 py-2 text-sm font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">Triangle</button>
            <button onClick={() => setHarmonics(generatePresets('reset'))} className="px-4 py-2 text-sm font-medium bg-slate-100 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors shadow-sm">Reset</button>
            <button onClick={exportCSV} className="px-4 py-2 text-sm font-medium bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors shadow-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export CSV
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Time Domain & Explainer */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Reconstruction Canvas */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Time Domain Reconstruction</h2>
                  <p className="text-sm text-slate-500">f(t) = Σ Aₙ cos(nωt + φₙ)</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-slate-600">N = {activeN}</span>
                  <button 
                    onClick={() => setIsAnimating(true)}
                    disabled={isAnimating}
                    className="p-2 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                    title="Animate Reconstruction"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  </button>
                </div>
              </div>

              <div className="relative w-full overflow-hidden bg-slate-50 rounded-xl border border-slate-100">
                <svg viewBox="0 0 800 300" className="w-full h-auto drop-shadow-sm">
                  {/* Axes */}
                  <line x1="0" y1="150" x2="800" y2="150" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
                  <line x1="400" y1="0" x2="400" y2="300" stroke="#cbd5e1" strokeWidth="1" />
                  
                  {/* Reconstructed Signal */}
                  <path 
                    d={pathData} 
                    fill="none" 
                    stroke="#4f46e5" 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="transition-all duration-300 ease-out"
                  />
                </svg>
              </div>

              {/* Slider for N */}
              <div className="mt-6 flex items-center gap-4">
                <span className="text-xs font-mono text-slate-400">1</span>
                <input 
                  type="range" 
                  min="1" 
                  max={MAX_HARMONICS} 
                  value={activeN} 
                  onChange={(e) => {
                    setActiveN(parseInt(e.target.value));
                    setIsAnimating(false);