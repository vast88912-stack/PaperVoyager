import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Activity, BarChart2, Info, Download, Edit3, RefreshCw, 
  Waves, Play, Pause, Square, Triangle, Zap, Menu, X, ChevronRight
} from 'lucide-react';

// --- Types & Constants ---
type Tab = 'sketchpad' | 'spectra' | 'gibbs';
type SignalType = 'square' | 'sawtooth' | 'triangle' | 'custom';

const SAMPLE_RATE = 512;
const MAX_HARMONICS = 50;

interface FourierCoefficient {
  n: number;
  a: number;
  b: number;
  mag: number;
  phase: number;
}

// --- Helper Functions ---
const generateDiscretePreset = (type: SignalType): number[] => {
  const newSignal = new Array(SAMPLE_RATE).fill(0);
  for (let i = 0; i < SAMPLE_RATE; i++) {
    const t = i / SAMPLE_RATE;
    if (type === 'square') {
      newSignal[i] = t < 0.5 ? 1 : -1;
    } else if (type === 'sawtooth') {
      newSignal[i] = 2 * t - 1;
    } else if (type === 'triangle') {
      if (t < 0.25) newSignal[i] = 4 * t;
      else if (t < 0.75) newSignal[i] = 2 - 4 * t;
      else newSignal[i] = 4 * t - 4;
    }
  }
  return newSignal;
};

const computeTheoreticalHarmonics = (type: SignalType, numHarmonics: number): FourierCoefficient[] => {
  const harmonics: FourierCoefficient[] = [];
  for (let n = 1; n <= numHarmonics; n++) {
    let a = 0;
    let b = 0;
    if (type === 'square') {
      if (n % 2 !== 0) b = 4 / (n * Math.PI);
    } else if (type === 'sawtooth') {
      b = (2 / (n * Math.PI)) * (n % 2 === 0 ? -1 : 1);
    } else if (type === 'triangle') {
      if (n % 2 !== 0) {
        const sign = ((n - 1) / 2) % 2 === 0 ? 1 : -1;
        a = (8 / (n * n * Math.PI * Math.PI)) * sign;
      }
    }
    const mag = Math.sqrt(a * a + b * b);
    const phase = mag > 1e-5 ? Math.atan2(b, a) : 0;
    harmonics.push({ n, a, b, mag, phase });
  }
  return harmonics;
};

// --- Sub-Modules ---

function SketchpadModule() {
  const [signalType, setSignalType] = useState<SignalType>('square');
  const [signal, setSignal] = useState<number[]>(generateDiscretePreset('square'));
  const [harmonics, setHarmonics] = useState<number>(15);
  const [coefficients, setCoefficients] = useState<FourierCoefficient[]>([]);
  const [reconstructed, setReconstructed] = useState<number[]>(Array(SAMPLE_RATE).fill(0));
  const [isAnimating, setIsAnimating] = useState(false);
  const [animProgress, setAnimProgress] = useState(1);

  const timeCanvasRef = useRef<HTMLCanvasElement>(null);
  const freqCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastDrawPos = useRef<{ x: number, y: number } | null>(null);

  const loadPreset = useCallback((type: SignalType) => {
    setSignal(generateDiscretePreset(type));
    setSignalType(type);
  }, []);

  useEffect(() => {
    const coeffs: FourierCoefficient[] = [];
    for (let n = 0; n <= harmonics; n++) {
      let a = 0;
      let b = 0;
      for (let i = 0; i < SAMPLE_RATE; i++) {
        const theta = (2 * Math.PI * n * i) / SAMPLE_RATE;
        a += signal[i] * Math.cos(theta);
        b += signal[i] * Math.sin(theta);
      }
      a *= (n === 0 ? 1 / SAMPLE_RATE : 2 / SAMPLE_RATE);
      b *= (n === 0 ? 1 / SAMPLE_RATE : 2 / SAMPLE_RATE);
      coeffs.push({ n, a, b, mag: Math.sqrt(a * a + b * b), phase: Math.atan2(b, a) });
    }
    setCoefficients(coeffs);

    const recon = new Array(SAMPLE_RATE).fill(0);
    for (let i = 0; i < SAMPLE_RATE; i++) {
      let val = coeffs[0].a;
      for (let n = 1; n <= harmonics; n++) {
        const theta = (2 * Math.PI * n * i) / SAMPLE_RATE;
        val += coeffs[n].a * Math.cos(theta) + coeffs[n].b * Math.sin(theta);
      }
      recon[i] = val;
    }
    setReconstructed(recon);
  }, [signal, harmonics]);

  useEffect(() => {
    let animationFrameId: number;
    let startTime: number;
    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      const duration = 3000;
      setAnimProgress((elapsed % duration) / duration);
      if (isAnimating) animationFrameId = requestAnimationFrame(animate);
    };
    if (isAnimating) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      setAnimProgress(1);
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [isAnimating]);

  const drawTimeDomain = useCallback(() => {
    const canvas = timeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const centerY = height / 2;
    const amplitude = height * 0.4;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
    for(let i=1; i<4; i++) {
      ctx.beginPath();
      ctx.moveTo((width/4)*i, 0);
      ctx.lineTo((width/4)*i, height);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    for (let i = 0; i < SAMPLE_RATE; i++) {
      const x = (i / SAMPLE_RATE) * width;
      const y = centerY - signal[i] * amplitude;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    const drawLimit = Math.floor(SAMPLE_RATE * animProgress);
    ctx.beginPath();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    for (let i = 0; i < drawLimit; i++) {
      const x = (i / SAMPLE_RATE) * width;
      const y = centerY - reconstructed[i] * amplitude;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    if (isAnimating && drawLimit < SAMPLE_RATE && drawLimit > 0) {
      const x = (drawLimit / SAMPLE_RATE) * width;
      const y = centerY - reconstructed[drawLimit] * amplitude;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
      ctx.lineWidth = 2;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  }, [signal, reconstructed, animProgress, isAnimating]);

  const drawFreqDomain = useCallback(() => {
    const canvas = freqCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    if (coefficients.length === 0) return;

    const maxMag = Math.max(...coefficients.map(c => c.mag), 0.01);
    const barWidth = Math.max((width / (harmonics + 1)) - 2, 2);

    for (let i = 0; i <= harmonics; i++) {
      const coeff = coefficients[i];
      const barHeight = (coeff.mag / maxMag) * (height * 0.8);
      const x = i * (width / (harmonics + 1)) + 1;
      const y = height - barHeight;

      const gradient = ctx.createLinearGradient(0, y, 0, height);
      gradient.addColorStop(0, '#8b5cf6');
      gradient.addColorStop(1, '#6366f1');

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);

      if (harmonics <= 20 || i % 5 === 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(i.toString(), x + barWidth / 2, height - 5);
      }
    }
  }, [coefficients, harmonics]);

  useEffect(() => { drawTimeDomain(); }, [drawTimeDomain]);
  useEffect(() => { drawFreqDomain(); }, [drawFreqDomain]);

  const updateSignalFromMouse = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = timeCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    const index = Math.floor((x / canvas.width) * SAMPLE_RATE);
    const clampedIndex = Math.max(0, Math.min(SAMPLE_RATE - 1, index));
    
    const centerY = canvas.height / 2;
    const amplitude = canvas.height * 0.4;
    let val = (centerY - y) / amplitude;
    val = Math.max(-1.5, Math.min(1.5, val));

    setSignal(prev => {
      const newSignal = [...prev];
      if (lastDrawPos.current) {
        const lastIndex = lastDrawPos.current.x;
        const lastVal = lastDrawPos.current.y;
        const startIdx = Math.min(lastIndex, clampedIndex);
        const endIdx = Math.max(lastIndex, clampedIndex);
        for (let i = startIdx; i <= endIdx; i++) {
          const t = endIdx === startIdx ? 0 : (i - startIdx) / (endIdx - startIdx);
          newSignal[i] = lastIndex < clampedIndex ? lastVal + t * (val - lastVal) : val + t * (lastVal - val);
        }
      } else {
        newSignal[clampedIndex] = val;
      }
      lastDrawPos.current = { x: clampedIndex, y: val };
      return newSignal;
    });
  };

  const handlePointerDown = (e: any) => {
    isDrawing.current = true;
    setSignalType('custom');
    updateSignalFromMouse(e);
  };
  const handlePointerMove = (e: any) => {
    if (!isDrawing.current) return;
    updateSignalFromMouse(e);
  };
  const handlePointerUp = () => {
    isDrawing.current = false;
    lastDrawPos.current = null;
  };

  const exportCSV = () => {
    let csv = "Index,Time,OriginalSignal,ReconstructedSignal\n";
    for (let i = 0; i < SAMPLE_RATE; i++) {
      csv += `${i},${(i / SAMPLE_RATE).toFixed(4)},${signal[i].toFixed(4)},${reconstructed[i].toFixed(4)}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fourier_signal_${signalType}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Interactive Sketchpad</h1>
            <p className="text-sm text-slate-400">Draw a signal or pick a preset to see its frequency components.</p>
          </div>
        </div>
        <button onClick={exportCSV} className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors text-sm border border-slate-700">
          <Download size={16} /> Export CSV
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Preset Signals</h2>
            <div className="grid grid-cols-2 gap-3">
              {(['square', 'sawtooth', 'triangle'] as SignalType[]).map(type => (
                <button key={type} onClick={() => loadPreset(type)} className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${signalType === type ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:bg-slate-800'}`}>
                  {type === 'square' && <Square size={24} />}
                  {type === 'sawtooth' && <Zap size={24} />}
                  {type === 'triangle' && <Triangle size={24} />}
                  <span className="text-sm font-semibold capitalize">{type}</span>
                </button>
              ))}
              <button onClick={() => { setSignal(new Array(SAMPLE_RATE).fill(0)); setSignalType('custom'); }} className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${signalType === 'custom' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:bg-slate-800'}`}>
                <Edit3 size={24} />
                <span className="text-sm font-semibold">Custom</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg space-y-6">
            <div>
              <div className="flex justify-between items-end mb-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Harmonics (N)</label>
                <span className="text-lg font-bold text-indigo-400">{harmonics}</span>
              </div>
              <input type="range" min="1" max={MAX_HARMONICS} value={harmonics} onChange={(e) => setHarmonics(parseInt(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                <span>1 (Sine)</span>
                <span>{MAX_HARMONICS} (Complex)</span>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-800">
              <button onClick={() => setIsAnimating(!isAnimating)} className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-colors ${isAnimating ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/50' : 'bg-indigo-600 text-white hover:bg-indigo-500 border border-indigo-500'}`}>
                {isAnimating ? <Pause size={18} /> : <Play size={18} />}
                {isAnimating ? 'Stop Animation' : 'Animate Reconstruction'}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Time Domain (Draw Here)</h2>
              <div className="flex gap-4 text-xs font-medium">
                <div className="flex items-center gap-1 text-slate-400">
                  <div className="w-3 h-0.5 bg-slate-500 border-t border-dashed border-slate-500"></div> Original
                </div>
                <div className="flex items-center gap-1 text-blue-400">
                  <div className="w-3 h-0.5 bg-blue-500"></div> Reconstructed
                </div>
              </div>
            </div>
            <div className="relative bg-slate-950 rounded-xl border border-slate-800 overflow-hidden cursor-crosshair touch-none">
              <canvas
                ref={timeCanvasRef}
                width={800}
                height={300}
                className="w-full h-auto block"
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
              />
            </div>
          </div>

          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Frequency Domain (Magnitude)</h2>
              <span className="text-xs font-medium bg-slate-800 text-slate-400 px-2 py-1 rounded">n = 0 to {harmonics}</span>
            </div>
            <div className="relative bg-slate-950 rounded-xl border border-slate-800 overflow-hidden p-4">
              <canvas ref={freqCanvasRef} width={800} height={200} className="w-full h-auto block" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpectraModule() {
  const [signalType, setSignalType] = useState<SignalType>('square');
  const [numHarmonics, setNumHarmonics] = useState<number>(15);
  const [hoveredHarmonic, setHoveredHarmonic] = useState<number | null>(null);

  const harmonics = useMemo(() => computeTheoreticalHarmonics(signalType, numHarmonics), [signalType, numHarmonics]);

  const svgWidth = 800;
  const svgHeight = 240;
  const margin = { top: 20, right: 20, bottom: 30, left: 50 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  const maxMagnitude = Math.max(1.5, ...harmonics.map(h => h.mag));
  const barWidth = Math.max(2, (plotWidth / numHarmonics) - 4);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-teal-500/20 text-teal-400 rounded-xl">
            <BarChart2 size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Magnitude & Phase Spectra</h1>
            <p className="text-sm text-slate-400">Explore theoretical frequency components of periodic signals.</p>
          </div>
        </div>
        <div className="flex flex-col gap-4 w-full md:w-auto">
          <div className="flex bg-slate-950 p-1 rounded-lg self-start border border-slate-800">
            {(['square', 'sawtooth', 'triangle'] as SignalType[]).map((type) => (
              <button key={type} onClick={() => setSignalType(type)} className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${signalType === type ? 'bg-slate-800 text-teal-400 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>
                {type}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-slate-400 whitespace-nowrap">
              Harmonics: <span className="text-teal-400 w-6 inline-block">{numHarmonics}</span>
            </label>
            <input type="range" min="1" max="50" value={numHarmonics} onChange={(e) => setNumHarmonics(parseInt(e.target.value, 10))} className="w-full md:w-48 accent-teal-500" />
          </div>
        </div>
      </header>

      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg relative">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Magnitude Spectrum</h2>
            <p className="text-xs text-slate-400">Amplitude of each frequency component (Mₙ = √(aₙ² + bₙ²))</p>
          </div>
          {hoveredHarmonic !== null && (
            <div className="text-right text-sm bg-slate-800 px-3 py-1.5 rounded-md border border-slate-700">
              <span className="font-semibold text-teal-400">n = {hoveredHarmonic}</span>
              <span className="mx-2 text-slate-600">|</span>
              <span className="text-slate-200">Mag: {harmonics[hoveredHarmonic - 1].mag.toFixed(3)}</span>
            </div>
          )}
        </div>
        <div className="w-full overflow-x-auto bg-slate-950 rounded-xl border border-slate-800 p-4">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[600px]">
            {[0, 0.5, 1.0, 1.5].map((val) => {
              if (val > maxMagnitude && val !== 0) return null;
              const y = margin.top + plotHeight - (val / maxMagnitude) * plotHeight;
              return (
                <g key={`grid-mag-${val}`}>
                  <line x1={margin.left} y1={y} x2={svgWidth - margin.right} y2={y} className="stroke-slate-800" strokeDasharray="4 4" />
                  <text x={margin.left - 10} y={y + 4} className="text-[10px] fill-slate-500 text-end" textAnchor="end">{val.toFixed(1)}</text>
                </g>
              );
            })}
            <line x1={margin.left} y1={margin.top + plotHeight} x2={svgWidth - margin.right} y2={margin.top + plotHeight} className="stroke-slate-600 stroke-2" />
            {harmonics.map((h, i) => {
              const x = margin.left + (i * (plotWidth / numHarmonics)) + (plotWidth / numHarmonics) / 2 - barWidth / 2;
              const barH = (h.mag / maxMagnitude) * plotHeight;
              const y = margin.top + plotHeight - barH;
              const isHovered = hoveredHarmonic === h.n;
              return (
                <g key={`mag-${h.n}`}>
                  <rect x={x} y={y} width={barWidth} height={barH} className={`transition-all duration-300 ease-out cursor-pointer ${h.mag < 1e-5 ? 'fill-transparent' : isHovered ? 'fill-teal-400' : 'fill-teal-600'}`} rx={2} onMouseEnter={() => setHoveredHarmonic(h.n)} onMouseLeave={() => setHoveredHarmonic(null)} />
                  {(numHarmonics <= 20 || h.n % 5 === 0 || h.n === 1) && (
                    <text x={x + barWidth / 2} y={margin.top + plotHeight + 16} className={`text-[10px] text-center transition-colors ${isHovered ? 'fill-teal-400 font-bold' : 'fill-slate-500'}`} textAnchor="middle">{h.n}</text>
                  )}
                </g>
              );
            })}
            <text x={svgWidth / 2} y={svgHeight - 2} className="text-[11px] fill-slate-400 font-medium" textAnchor="middle">Harmonic Number (n)</text>
          </svg>
        </div>
      </div>

      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg relative">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Phase Spectrum</h2>
            <p className="text-xs text-slate-400">Phase shift of each frequency component (φₙ = atan2(bₙ, aₙ))</p>
          </div>
          {hoveredHarmonic !== null && (
            <div className="text-right text-sm bg-slate-800 px-3 py-1.5 rounded-md border border-slate-700">
              <span className="font-semibold text-rose-400">n = {hoveredHarmonic}</span>
              <span className="mx-2 text-slate-600">|</span>
              <span className="text-slate-200">Phase: {(harmonics[hoveredHarmonic - 1].phase / Math.PI).toFixed(2)}π</span>
            </div>
          )}
        </div>
        <div className="w-full overflow-x-auto bg-slate-950 rounded-xl border border-slate-800 p-4">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[600px]">
            {[{ val: Math.PI, label: 'π' }, { val: Math.PI / 2, label: 'π/2' }, { val: 0, label: '0' }, { val: -Math.PI / 2, label: '-π/2' }, { val: -Math.PI, label: '-π' }].map((tick) => {
              const y = margin.top + plotHeight / 2 - (tick.val / Math.PI) * (plotHeight / 2);
              return (
                <g key={`grid-phase-${tick.label}`}>
                  <line x1={margin.left} y1={y} x2={svgWidth - margin.right} y2={y} className={tick.val === 0 ? "stroke-slate-600 stroke-2" : "stroke-slate-800"} strokeDasharray={tick.val === 0 ? "none" : "4 4"} />
                  <text x={margin.left - 10} y={y + 4} className="text-[10px] fill-slate-500 text-end" textAnchor="end">{tick.label}</text>
                </g>
              );
            })}
            {harmonics.map((h, i) => {
              const x = margin.left + (i * (plotWidth / numHarmonics)) + (plotWidth / numHarmonics) / 2 - barWidth / 2;
              const centerY = margin.top + plotHeight / 2;
              const barH = Math.abs((h.phase / Math.PI) * (plotHeight / 2));
              const y = h.phase >= 0 ? centerY - barH : centerY;
              const isHovered = hoveredHarmonic === h.n;
              const isSignificant = h.mag > 1e-5;
              return (
                <g key={`phase-${h.n}`}>
                  {isSignificant && (
                    <rect x={x} y={y} width={barWidth} height={Math.max(barH, 2)} className={`transition-all duration-300 ease-out cursor-pointer ${isHovered ? 'fill-rose-400' : 'fill-rose-600'}`} rx={2} onMouseEnter={() => setHoveredHarmonic(h.n)} onMouseLeave={() => setHoveredHarmonic(null)} />
                  )}
                  <rect x={x - 2} y={margin.top} width={barWidth + 4} height={plotHeight} fill="transparent" className="cursor-pointer" onMouseEnter={() => setHoveredHarmonic(h.n)} onMouseLeave={() => setHoveredHarmonic(null)} />
                  {(numHarmonics <= 20 || h.n % 5 === 0 || h.n === 1) && (
                    <text x={x + barWidth / 2} y={margin.top + plotHeight + 16} className={`text-[10px] text-center transition-colors ${isHovered ? 'fill-rose-400 font-bold' : 'fill-slate-500'}`} textAnchor="middle">{h.n}</text>
                  )}
                </g>
              );
            })}
            <text x={svgWidth / 2} y={svgHeight - 2} className="text-[11px] fill-slate-400 font-medium" textAnchor="middle">Harmonic Number (n)</text>
          </svg>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700 flex items-start gap-4">
        <div className="bg-slate-800 text-slate-300 p-2 rounded-lg shrink-0">
          <Info size={20} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-200 mb-1">Signal Insights: {signalType.charAt(0).toUpperCase() + signalType.slice(1)} Wave</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            {signalType === 'square' && "Notice how the even harmonics (n=2, 4, 6...) have zero magnitude. The phase alternates between π/2 and -π/2 depending on the sine terms. The slow 1/n decay in magnitude is what causes the sharp transitions and Gibbs ringing in the time domain."}
            {signalType === 'sawtooth' && "Unlike the square wave, the sawtooth contains all integer harmonics. The magnitude decays at a rate of 1/n. The phase alternates between π/2 and -π/2 for each successive harmonic."}
            {signalType === 'triangle' && "The triangle wave only contains odd harmonics, but their magnitude decays much faster at a rate of 1/n². This rapid decay explains why the triangle wave looks much smoother than square or sawtooth waves. Phases alternate between 0 and π."}
          </p>
        </div>
      </div>
    </div>
  );
}

function GibbsModule() {
  const [harmonics, setHarmonics] = useState<number>(5);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const WIDTH = 600;
  const HEIGHT = 400;
  const POINTS = 500;
  const MAX_Y = 1.5;
  const THEORETICAL_OVERSHOOT = 1.1789797;

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

  const signalData = useMemo(() => {
    const data = [];
    let currentMax = 0;
    for (let i = 0; i <= POINTS; i++) {
      const t = (i / POINTS) * 2 * Math.PI;
      let ideal = 0;
      if (t > 0 && t < Math.PI) ideal = 1;
      else if (t > Math.PI && t < 2 * Math.PI) ideal = -1;

      let approximation = 0;
      for (let n = 1; n <= harmonics * 2; n += 2) {
        approximation += (4 / Math.PI) * (Math.sin(n * t) / n);
      }
      if (Math.abs(approximation) > currentMax) currentMax = Math.abs(approximation);
      data.push({ t, ideal, approximation });
    }
    return { data, currentMax };
  }, [harmonics]);

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
        if (Math.abs(signalData.data[index].ideal - signalData.data[index - 1].ideal) > 1) {
          iPath += `L ${x} ${HEIGHT / 2 - (signalData.data[index - 1].ideal / MAX_Y) * (HEIGHT / 2)} `;
        }
        iPath += `L ${x} ${yIdeal} `;
        aPath += `L ${x} ${yApprox} `;
      }
    });
    return { idealPath: iPath, approxPath: aPath };
  }, [signalData]);

  const overshootPercent = (((signalData.currentMax - 1) / 2) * 100).toFixed(1);

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in duration-500">
      <div className="w-full lg:w-3/5 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg flex flex-col relative">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-100 mb-1">Interactive Signal</h2>
          <p className="text-slate-400 text-sm">Time Domain Representation</p>
        </div>
        <div className="flex-grow flex items-center justify-center relative w-full aspect-video lg:aspect-auto bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-full drop-shadow-md" preserveAspectRatio="none">
            <line x1="0" y1={HEIGHT/2} x2={WIDTH} y2={HEIGHT/2} stroke="#334155" strokeWidth="2" />
            <line x1={WIDTH/2} y1="0" x2={WIDTH/2} y2={HEIGHT} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="0" y1={HEIGHT / 2 - (THEORETICAL_OVERSHOOT / MAX_Y) * (HEIGHT / 2)} x2={WIDTH} y2={HEIGHT / 2 - (THEORETICAL_OVERSHOOT / MAX_Y) * (HEIGHT / 2)} stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
            <line x1="0" y1={HEIGHT / 2 - (-THEORETICAL_OVERSHOOT / MAX_Y) * (HEIGHT / 2)} x2={WIDTH} y2={HEIGHT / 2 - (-THEORETICAL_OVERSHOOT / MAX_Y) * (HEIGHT / 2)} stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
            <path d={idealPath} fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="6 6" opacity="0.6" />
            <path d={approxPath} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
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
        <div className="mt-8 space-y-4">
          <div className="flex justify-between items-end">
            <label className="text-slate-300 font-medium text-sm flex flex-col">
              Number of Harmonics (N)
              <span className="text-sky-400 text-2xl font-bold mt-1">{harmonics}</span>
            </label>
            <button onClick={() => setIsPlaying(!isPlaying)} className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${isPlaying ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50' : 'bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 border border-sky-500/50'}`}>
              {isPlaying ? 'Stop Animation' : 'Auto-Play'}
            </button>
          </div>
          <input type="range" min="1" max="100" value={harmonics} onChange={(e) => { setHarmonics(parseInt(e.target.value)); setIsPlaying(false); }} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400" />
          <div className="flex justify-between text-xs text-slate-500">
            <span>1 (Sine Wave)</span>
            <span>100 (Dense Approximation)</span>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-2/5 p-6 bg-slate-900 rounded-2xl border border-slate-800 shadow-lg flex flex-col justify-between">
        <div>
          <div className="inline-block px-3 py-1 bg-sky-500/20 text-sky-400 rounded-full text-xs font-bold tracking-wider uppercase mb-4">
            Signal Processing 101
          </div>
          <h1 className="text-3xl font-extrabold text-slate-100 mb-4 leading-tight">
            The Gibbs Phenomenon
          </h1>
          <div className="space-y-4 text-slate-400 leading-relaxed text-sm">
            <p>When you try to approximate a signal with a jump discontinuity (like a square wave) using a Fourier series, you'll notice something strange at the edges.</p>
            <p>No matter how many harmonics <span className="font-semibold text-slate-200">(N)</span> you add, the approximation always overshoots the jump. This peculiar behavior is known as <strong>Gibbs Ringing</strong>.</p>
            <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700 shadow-sm my-6">
              <h3 className="font-bold text-slate-200 mb-2 flex items-center gap-2">
                <Info className="w-5 h-5 text-amber-500" /> Why does this happen?
              </h3>
              <p className="text-xs">Fourier series use continuous sine and cosine waves. A sudden, instantaneous jump is impossible for continuous functions to perfectly trace without infinite frequencies. The sum converges pointwise, but not uniformly, causing the energy to "bunch up" near the discontinuity.</p>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Current Overshoot</p>
                <p className="text-2xl font-bold text-sky-400">~{overshootPercent}%</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Theoretical Limit</p>
                <p className="text-2xl font-bold text-sky-400">8.95%</p>
              </div>
            </div>
            <p className="text-xs italic text-slate-500 mt-4">Notice how increasing N squeezes the ringing closer to the jump, but the peak amplitude of the overshoot never disappears!</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main App Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('sketchpad');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'sketchpad', label: 'Interactive Sketchpad', icon: <Edit3 size={18} /> },
    { id: 'spectra', label: 'Magnitude & Phase', icon: <BarChart2 size={18} /> },
    { id: 'gibbs', label: 'Gibbs Phenomenon', icon: <Waves size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col md:flex-row selection:bg-indigo-500/30">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-lg">
          <Activity size={24} /> Fourier Sketchpad
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-400 hover:text-slate-200">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:block w-full md:w-64 bg-slate-900 border-r border-slate-800 flex-shrink-0 md:h-screen md:sticky md:top-0 z-40`}>
        <div className="p-6 hidden md:flex items-center gap-3 text-indigo-400 font-bold text-xl border-b border-slate-800">
          <Activity size={28} /> Fourier
        </div>
        <nav className="p-4 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                {tab.icon}
                {tab.label}
              </div>
              {activeTab === tab.id && <ChevronRight size={16} />}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 w-full p-6 border-t border-slate-800 text-xs text-slate-500">
          <p>Signal Processing Edition</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'sketchpad' && <SketchpadModule />}
          {activeTab === 'spectra' && <SpectraModule />}
          {activeTab === 'gibbs' && <GibbsModule />}
        </div>
      </main>
    </div>
  );
}