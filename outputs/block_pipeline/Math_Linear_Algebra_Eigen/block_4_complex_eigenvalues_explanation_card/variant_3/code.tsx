import React, { useState, useEffect, useRef } from 'react';

// --- Icons ---
const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
    <path d="M3 3v5h5"></path>
  </svg>
);

// --- Types ---
type Mode = 'real' | 'imaginary' | 'complex';

interface Point {
  x: number;
  y: number;
}

// --- Constants & Helpers ---
const MAX_STEPS = 40;
const SVG_SIZE = 340;
const CENTER = SVG_SIZE / 2;

// Numeric stability guard to prevent exploding vectors
const SAFE_MAX = 10000;
const safeCalc = (val: number) => {
  if (isNaN(val)) return 0;
  return Math.max(-SAFE_MAX, Math.min(SAFE_MAX, val));
};

export default function App() {
  const [mode, setMode] = useState<Mode>('complex');
  const [step, setStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate sequence of points representing v, Av, A^2v...
  const points: Point[] = React.useMemo(() => {
    const pts: Point[] = [];
    for (let n = 0; n <= MAX_STEPS; n++) {
      let x = 0, y = 0;
      if (mode === 'real') {
        // Pure scaling (eigenvalues are real: 1.04 and 0.8)
        x = 100 * Math.pow(1.04, n);
        y = 100 * Math.pow(0.8, n);
      } else if (mode === 'imaginary') {
        // Pure rotation (eigenvalues are pure imaginary: +/- i)
        // Represents a rotation matrix
        const theta = (Math.PI / 8) * n;
        x = 120 * Math.cos(theta);
        y = 120 * Math.sin(theta);
      } else if (mode === 'complex') {
        // Rotation + Scaling (complex eigenvalues: a +/- bi)
        // r < 1 -> inward spiral (stable)
        const r = 0.94;
        const theta = (Math.PI / 6) * n;
        x = 140 * Math.pow(r, n) * Math.cos(theta);
        y = 140 * Math.pow(r, n) * Math.sin(theta);
      }
      pts.push({ x: safeCalc(x), y: safeCalc(y) });
    }
    return pts;
  }, [mode]);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setStep((prev) => {
          if (prev >= MAX_STEPS) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 100);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setStep(0);
    setIsPlaying(true);
  };

  const handleReplay = () => {
    setStep(0);
    setIsPlaying(true);
  };

  // Convert logical coordinates to SVG canvas coordinates
  const toSVG = (p: Point): Point => ({
    x: CENTER + p.x,
    y: CENTER - p.y // Y-axis is inverted in SVG
  });

  const currentPoint = toSVG(points[step]);
  const pathData = points
    .slice(0, step + 1)
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toSVG(p).x} ${toSVG(p).y}`)
    .join(' ');

  const getExplanation = () => {
    switch (mode) {
      case 'real':
        return {
          title: "Real Eigenvalues",
          subtitle: "Pure Stretching",
          desc: "When eigenvalues are real, the matrix purely stretches or squishes space along specific eigenvector lines. The vector never rotates, it simply moves outward or inward.",
          math: <span className="text-slate-600">λ = <span className="text-indigo-600 font-bold">a</span></span>,
          matrix: [["1.04", "0"], ["0", "0.80"]]
        };
      case 'imaginary':
        return {
          title: "Pure Imaginary",
          subtitle: "Pure Rotation",
          desc: "When eigenvalues are pure imaginary (no real part), the transformation implies pure rotation. Power iteration results in an endless circular orbit without scaling.",
          math: <span className="text-slate-600">λ = <span className="text-emerald-600 font-bold">±bi</span></span>,
          matrix: [["0", "-1"], ["1", "0"]]
        };
      case 'complex':
        return {
          title: "Complex Conjugates",
          subtitle: "Scaling + Rotation",
          desc: "Complex eigenvalues come in pairs (a ± bi). The real part dictates scaling, while the imaginary part causes rotation. Repeated applications cause the vector to spiral.",
          math: <span className="text-slate-600">λ = <span className="text-indigo-600 font-bold">a</span> ± <span className="text-emerald-600 font-bold">bi</span></span>,
          matrix: [["a", "-b"], ["b", "a"]]
        };
    }
  };

  const info = getExplanation();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative font-sans overflow-hidden">
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'linear-gradient(to right, #cbd5e1 1px, transparent 1px), linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      />

      {/* Main Card */}
      <div className="bg-white/90 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-3xl border border-slate-200/60 max-w-5xl w-full mx-auto relative z-10 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Column: Explanatory Content */}
        <div className="flex-1 p-8 md:p-12 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold tracking-wide uppercase mb-6">
              <InfoIcon />
              Eigen Explorer
            </div>
            
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              Complex Eigenvalues
            </h1>
            <p className="text-slate-500 text-base leading-relaxed mb-8">
              Eigenvectors usually show directions that only stretch. But what if a matrix rotates space? 
              The algebra "breaks," resulting in complex numbers that encode rotation.
            </p>

            {/* Mode Selectors */}
            <div className="space-y-3 mb-8">
              {(['real', 'imaginary', 'complex'] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => handleModeChange(m)}
                  className={`w-full text-left px-5 py-4 rounded-xl transition-all duration-200 border ${
                    mode === m 
                      ? 'bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-500/20' 
                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`font-semibold text-sm ${mode === m ? 'text-indigo-900' : 'text-slate-700'}`}>
                        {m === 'real' ? 'Real Eigenvalues' : m === 'imaginary' ? 'Pure Imaginary' : 'Complex (a ± bi)'}
                      </h3>
                      <p className={`text-xs mt-1 ${mode === m ? 'text-indigo-700/70' : 'text-slate-500'}`}>
                        {m === 'real' ? 'Vectors stretch along an axis.' : m === 'imaginary' ? 'Vectors rotate endlessly.' : 'Vectors spiral (rotate + scale).'}
                      </p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${mode === m ? 'border-indigo-600' : 'border-slate-300'}`}>
                      {mode === m && <div className="w-2 h-2 bg-indigo-600 rounded-full" />}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Mathematical Anatomy Card */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Mathematical Anatomy</h4>
            <div className="flex items-center justify-between mb-4">
              <div className="font-mono text-lg">{info.math}</div>
              <div className="text-right">
                <div className="text-xs font-medium text-slate-500">{info.subtitle}</div>
              </div>
            </div>
            
            <div className="flex gap-6 items-center">
              <div className="bg-white border border-slate-200 rounded-lg p-3 font-mono text-sm text-center shadow-sm">
                <div className="flex gap-4">
                  <div className="flex flex-col gap-1">
                    <span>{info.matrix[0][0]}</span>
                    <span>{info.matrix[1][0]}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span>{info.matrix[0][1]}</span>
                    <span>{info.matrix[1][1]}</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed flex-1">
                {info.desc}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Visualization */}
        <div className="flex-1 bg-white p-8 md:p-12 flex flex-col items-center justify-center relative min-h-[400px]">
          
          {/* Controls */}
          <div className="absolute top-6 right-6 flex items-center gap-3">
            <div className="font-mono text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100">
              Iteration: {step} / {MAX_STEPS}
            </div>
            <button 
              onClick={isPlaying ? () => setIsPlaying(false) : handleReplay}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
              title={isPlaying ? "Pause" : "Replay"}
            >
              {isPlaying ? <PlayIcon /> : <RefreshIcon />}
            </button>
          </div>

          {/* SVG Coordinate System */}
          <div className="relative border border-slate-100 bg-slate-50/50 rounded-2xl shadow-inner overflow-hidden">
            <svg 
              width={SVG_SIZE} 
              height={SVG_SIZE} 
              viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
              className="block"
            >
              {/* Grid Lines */}
              <defs>
                <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5"/>
                </pattern>
                <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <polygon points="0 0, 6 3, 0 6" fill="#4f46e5" />
                </marker>
              </defs>
              <rect width="100%" height="100%" fill="url(#smallGrid)" />
              
              {/* Axes */}
              <line x1="0" y1={CENTER} x2={SVG_SIZE} y2={CENTER} stroke="#cbd5e1" strokeWidth="1.5" />
              <line x1={CENTER} y1="0" x2={CENTER} y2={SVG_SIZE} stroke="#cbd5e1" strokeWidth="1.5" />

              {/* Trajectory Path */}
              {step > 0 && (
                <path 
                  d={pathData} 
                  fill="none" 
                  stroke="#94a3b8" 
                  strokeWidth="1.5" 
                  strokeDasharray="4 4"
                  className="opacity-50"
                />
              )}

              {/* Past Points */}
              {points.slice(0, step).map((p, i) => (
                <circle 
                  key={i} 
                  cx={toSVG(p).x} 
                  cy={toSVG(p).y} 
                  r="2.5" 
                  fill="#94a3b8" 
                  className="opacity-40"
                />
              ))}

              {/* Current Vector */}
              <line 
                x1={CENTER} 
                y1={CENTER} 
                x2={currentPoint.x} 
                y2={currentPoint.y} 
                stroke="#4f46e5" 
                strokeWidth="2.5" 
                markerEnd="url(#arrowhead)"
                className="transition-all duration-100 ease-linear"
              />

              {/* Origin dot */}
              <circle cx={CENTER} cy={CENTER} r="4" fill="#1e293b" />
            </svg>
            
            {/* Overlay Indicator */}
            <div className="absolute bottom-4 left-4 right-4 text-center">
               <span className="inline-block bg-white/80 backdrop-blur text-slate-600 text-xs px-3 py-1.5 rounded-md border border-slate-200/50 shadow-sm font-medium">
                 Tracing Aⁿv₀
               </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}