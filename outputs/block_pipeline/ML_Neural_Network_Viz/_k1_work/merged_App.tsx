import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Play, Pause, SkipForward, RotateCcw, Activity, Database, Network, 
  Sliders, Zap, PowerOff, BookOpen, GitMerge, Calculator, ChevronRight, 
  Info, LineChart, Layers
} from 'lucide-react';

// --- Types & Math Utilities ---
type Matrix = number[][];

const mat = {
  create: (rows: number, cols: number, fill = 0): Matrix =>
    Array.from({ length: rows }, () => Array(cols).fill(fill)),
  random: (rows: number, cols: number): Matrix =>
    Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => (Math.random() * 2 - 1) * 0.5)
    ),
  dot: (a: Matrix, b: Matrix): Matrix => {
    const result = mat.create(a.length, b[0].length);
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < b[0].length; j++) {
        let sum = 0;
        for (let k = 0; k < a[0].length; k++) {
          sum += a[i][k] * b[k][j];
        }
        result[i][j] = sum;
      }
    }
    return result;
  },
  add: (a: Matrix, b: Matrix): Matrix => 
    a.map(row => row.map((val, j) => val + b[0][j])),
  sub: (a: Matrix, b: Matrix): Matrix =>
    a.map((row, i) => row.map((val, j) => val - b[i][j])),
  mul: (a: Matrix, b: Matrix): Matrix => 
    a.map((row, i) => row.map((val, j) => val * b[i][j])),
  scale: (a: Matrix, scalar: number): Matrix =>
    a.map(row => row.map(val => val * scalar)),
  transpose: (a: Matrix): Matrix =>
    a[0].map((_, colIndex) => a.map(row => row[colIndex])),
  map: (a: Matrix, fn: (val: number) => number): Matrix =>
    a.map(row => row.map(val => fn(val))),
  sumAxis0: (a: Matrix): Matrix => {
    const result = mat.create(1, a[0].length);
    for (let j = 0; j < a[0].length; j++) {
      let sum = 0;
      for (let i = 0; i < a.length; i++) {
        sum += a[i][j];
      }
      result[0][j] = sum;
    }
    return result;
  },
  meanAbsAxis0: (a: Matrix): number[] => {
    const result = Array(a[0].length).fill(0);
    for (let j = 0; j < a[0].length; j++) {
      let sum = 0;
      for (let i = 0; i < a.length; i++) {
        sum += Math.abs(a[i][j]);
      }
      result[j] = sum / a.length;
    }
    return result;
  }
};

const activations = {
  relu: {
    f: (x: number) => Math.max(0, x),
    df: (z: number) => (z > 0 ? 1 : 0),
  },
  tanh: {
    f: (x: number) => Math.tanh(x),
    df: (z: number) => 1 - Math.pow(Math.tanh(z), 2),
  },
  sigmoid: {
    f: (x: number) => 1 / (1 + Math.exp(-x)),
    df: (z: number) => {
      const s = 1 / (1 + Math.exp(-z));
      return s * (1 - s);
    },
  },
  linear: {
    f: (x: number) => x,
    df: () => 1,
  }
};

function generateDataset(type: string, numPoints = 200, noiseLevel = 10): { X: Matrix; Y: Matrix } {
  const X: Matrix = [];
  const Y: Matrix = [];
  const noise = noiseLevel / 100;
  
  for (let i = 0; i < numPoints; i++) {
    if (type === 'xor') {
      const x1 = Math.random() * 2 - 1;
      const x2 = Math.random() * 2 - 1;
      const label = (x1 * x2 > 0) ? 0 : 1;
      X.push([x1 + (Math.random()-0.5)*noise, x2 + (Math.random()-0.5)*noise]);
      Y.push([label]);
    } else if (type === 'blobs') {
      const label = Math.random() > 0.5 ? 1 : 0;
      const cx = label === 1 ? 0.5 : -0.5;
      const cy = label === 1 ? 0.5 : -0.5;
      X.push([cx + (Math.random()-0.5)*(0.5 + noise), cy + (Math.random()-0.5)*(0.5 + noise)]);
      Y.push([label]);
    } else if (type === 'spiral') {
      const label = Math.random() > 0.5 ? 1 : 0;
      const r = Math.random() * 1.5;
      const theta = r * 4 + (label === 1 ? Math.PI : 0) + (Math.random()-0.5)*noise;
      X.push([r * Math.cos(theta), r * Math.sin(theta)]);
      Y.push([label]);
    }
  }
  return { X, Y };
}

// --- Shared UI Components ---
const GlowFilter = ({ id, color }: { id: string; color: string }) => (
  <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation="3" result="blur" />
    <feMerge>
      <feMergeNode in="blur" />
      <feMergeNode in="blur" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
);

const NeonSlider = ({ label, value, min, max, step, onChange, unit = '' }: any) => (
  <div className="flex flex-col space-y-2 w-full my-4">
    <div className="flex justify-between items-center">
      <label className="text-xs font-medium text-cyan-100 uppercase tracking-wider">{label}</label>
      <span className="text-sm font-mono text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">
        {value}{unit}
      </span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300 transition-all shadow-[0_0_10px_rgba(34,211,238,0.2)]"
    />
  </div>
);

const NeonSelect = ({ label, value, options, onChange, icon: Icon }: any) => (
  <div className="flex flex-col space-y-2 w-full my-4">
    <label className="text-xs font-medium text-cyan-100 uppercase tracking-wider flex items-center gap-2">
      {Icon && <Icon size={14} className="text-cyan-500" />}
      {label}
    </label>
    <div className="relative">
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-900/50 border border-cyan-900 text-cyan-300 text-sm rounded-md focus:ring-cyan-500 focus:border-cyan-500 block p-2.5 appearance-none outline-none transition-all hover:border-cyan-700 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
      >
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value} className="bg-slate-900 text-cyan-300">{opt.label}</option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-cyan-600">
        <ChevronRight className="w-4 h-4 rotate-90" />
      </div>
    </div>
  </div>
);

// --- Main Application ---
export default function App() {
  // Global State
  const [activeTab, setActiveTab] = useState('hero');
  const [datasetType, setDatasetType] = useState<string>('xor');
  const [noiseLevel, setNoiseLevel] = useState<number>(10);
  const [hiddenNeurons, setHiddenNeurons] = useState<number>(4);
  const [activationName, setActivationName] = useState<keyof typeof activations>('tanh');
  const [learningRate, setLearningRate] = useState<number>(0.03);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [ablated, setAblated] = useState<Set<number>>(new Set());
  
  // Render State
  const [epoch, setEpoch] = useState(0);
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const [renderData, setRenderData] = useState<{
    W1: Matrix; W2: Matrix;
    nodeActs: { input: number[], hidden: number[], output: number[] };
    nodeGrads: { hidden: number[], output: number[] };
  } | null>(null);

  // ML Engine State
  const ml = useRef({
    X: [] as Matrix, Y: [] as Matrix,
    W1: [] as Matrix, b1: [] as Matrix,
    W2: [] as Matrix, b2: [] as Matrix,
    epoch: 0, lossHistory: [] as number[],
  });

  const animationRef = useRef<number>();

  const initNetwork = useCallback(() => {
    const { X, Y } = generateDataset(datasetType, 200, noiseLevel);
    ml.current = {
      X, Y,
      W1: mat.random(2, hiddenNeurons),
      b1: mat.create(1, hiddenNeurons, 0),
      W2: mat.random(hiddenNeurons, 1),
      b2: mat.create(1, 1, 0),
      epoch: 0,
      lossHistory: [],
    };
    setEpoch(0);
    setLossHistory([]);
    setAblated(new Set());
    updateRenderState();
  }, [datasetType, hiddenNeurons, noiseLevel]);

  useEffect(() => { initNetwork(); }, [initNetwork]);

  const trainStep = useCallback(() => {
    const { X, Y, W1, b1, W2, b2 } = ml.current;
    const N = X.length;
    const act = activations[activationName];

    let Z1 = mat.add(mat.dot(X, W1), b1);
    if (ablated.size > 0) {
      Z1 = Z1.map(row => row.map((val, j) => ablated.has(j) ? 0 : val));
    }

    let A1 = mat.map(Z1, act.f);
    let Z2 = mat.add(mat.dot(A1, W2), b2);
    let A2 = mat.map(Z2, activations.sigmoid.f);

    let loss = 0;
    for (let i = 0; i < N; i++) {
      const y = Y[i][0];
      const yHat = Math.max(Math.min(A2[i][0], 0.9999), 0.0001);
      loss += -(y * Math.log(yHat) + (1 - y) * Math.log(1 - yHat));
    }
    loss /= N;

    const dZ2 = mat.sub(A2, Y);
    const dW2 = mat.scale(mat.dot(mat.transpose(A1), dZ2), 1 / N);
    const db2 = mat.scale(mat.sumAxis0(dZ2), 1 / N);

    let dA1 = mat.dot(dZ2, mat.transpose(W2));
    let dZ1 = mat.mul(dA1, mat.map(Z1, act.df));

    if (ablated.size > 0) {
      dZ1 = dZ1.map(row => row.map((val, j) => ablated.has(j) ? 0 : val));
    }

    const dW1 = mat.scale(mat.dot(mat.transpose(X), dZ1), 1 / N);
    const db1 = mat.scale(mat.sumAxis0(dZ1), 1 / N);

    ml.current.W1 = mat.sub(W1, mat.scale(dW1, learningRate));
    ml.current.b1 = mat.sub(b1, mat.scale(db1, learningRate));
    ml.current.W2 = mat.sub(W2, mat.scale(dW2, learningRate));
    ml.current.b2 = mat.sub(b2, mat.scale(db2, learningRate));
    ml.current.epoch += 1;
    ml.current.lossHistory.push(loss);

    if (ml.current.lossHistory.length > 100) ml.current.lossHistory.shift();

    return { A1, A2, dZ1, dZ2 };
  }, [activationName, learningRate, ablated]);

  const updateRenderState = useCallback((actsAndGrads?: any) => {
    const { W1, W2, epoch, lossHistory, X } = ml.current;
    setEpoch(epoch);
    setLossHistory([...lossHistory]);

    let nodeActs = { input: [0,0], hidden: Array(hiddenNeurons).fill(0), output: [0] };
    let nodeGrads = { hidden: Array(hiddenNeurons).fill(0), output: [0] };

    if (actsAndGrads) {
      nodeActs.input = mat.meanAbsAxis0(X);
      nodeActs.hidden = mat.meanAbsAxis0(actsAndGrads.A1);
      nodeActs.output = mat.meanAbsAxis0(actsAndGrads.A2);
      nodeGrads.hidden = mat.meanAbsAxis0(actsAndGrads.dZ1);
      nodeGrads.output = mat.meanAbsAxis0(actsAndGrads.dZ2);
    }
    setRenderData({ W1, W2, nodeActs, nodeGrads });
  }, [hiddenNeurons]);

  useEffect(() => {
    if (!isPlaying) return;
    let frameCount = 0;
    const loop = () => {
      const actsAndGrads = trainStep();
      frameCount++;
      if (frameCount % 3 === 0) updateRenderState(actsAndGrads);
      animationRef.current = requestAnimationFrame(loop);
    };
    animationRef.current = requestAnimationFrame(loop);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isPlaying, trainStep, updateRenderState]);

  const toggleAblation = (index: number) => {
    setAblated(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // --- Render Functions for Tabs ---

  const renderHero = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      let animationFrameId: number;
      let particles: any[] = [];

      const resizeCanvas = () => {
        canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
        canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
        initParticles();
      };

      class Particle {
        x: number; y: number; vx: number; vy: number; radius: number;
        baseColor: string; glowColor: string; activation: number; layer: number;
        constructor(x: number, y: number, layer: number) {
          this.x = x; this.y = y;
          this.vx = (Math.random() - 0.5) * 0.5; this.vy = (Math.random() - 0.5) * 0.5;
          this.radius = Math.random() * 2 + 2; this.layer = layer;
          const colors = [
            { base: '#0891b2', glow: '#22d3ee' },
            { base: '#c026d3', glow: '#f0abfc' },
            { base: '#16a34a', glow: '#4ade80' }
          ];
          const colorSet = colors[this.layer % colors.length];
          this.baseColor = colorSet.base; this.glowColor = colorSet.glow;
          this.activation = Math.random();
        }
        update(w: number, h: number) {
          this.x += this.vx; this.y += this.vy;
          if (this.x < 0 || this.x > w) this.vx *= -1;
          if (this.y < 0 || this.y > h) this.vy *= -1;
          if (Math.random() < 0.01) this.activation = 1.0;
          else this.activation = Math.max(0.1, this.activation - 0.02);
        }
        draw(ctx: CanvasRenderingContext2D) {
          ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
          if (this.activation > 0.5) {
            ctx.shadowBlur = 15; ctx.shadowColor = this.glowColor; ctx.fillStyle = '#ffffff';
          } else {
            ctx.shadowBlur = 0; ctx.fillStyle = this.baseColor;
          }
          ctx.fill(); ctx.shadowBlur = 0;
        }
      }

      const initParticles = () => {
        particles = [];
        const numParticles = Math.floor((canvas.width * canvas.height) / 15000);
        for (let i = 0; i < numParticles; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          let layer = 1;
          if (x < canvas.width * 0.33) layer = 0;
          else if (x > canvas.width * 0.66) layer = 2;
          particles.push(new Particle(x, y, layer));
        }
      };

      const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
              if (Math.abs(particles[i].layer - particles[j].layer) > 1) continue;
              const opacity = 1 - dist / 150;
              const act = (particles[i].activation + particles[j].activation) / 2;
              ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
              if (act > 0.6) {
                ctx.strokeStyle = `rgba(34, 211, 238, ${opacity * act})`; ctx.lineWidth = 1.5;
              } else {
                ctx.strokeStyle = `rgba(71, 85, 105, ${opacity * 0.3})`; ctx.lineWidth = 0.5;
              }
              ctx.stroke();
            }
          }
          const dxM = particles[i].x - mousePos.x; const dyM = particles[i].y - mousePos.y;
          const distM = Math.sqrt(dxM * dxM + dyM * dyM);
          if (distM < 200) {
            ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(mousePos.x, mousePos.y);
            ctx.strokeStyle = `rgba(240, 171, 252, ${1 - distM / 200})`; ctx.lineWidth = 1; ctx.stroke();
            particles[i].activation = 1;
          }
        }
        particles.forEach(p => { p.update(canvas.width, canvas.height); p.draw(ctx); });
        animationFrameId = requestAnimationFrame(animate);
      };

      window.addEventListener('resize', resizeCanvas);
      resizeCanvas(); animate();
      return () => { window.removeEventListener('resize', resizeCanvas); cancelAnimationFrame(animationFrameId); };
    }, [mousePos]);

    return (
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden"
           onMouseMove={e => setMousePos({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY })}
           onMouseLeave={() => setMousePos({ x: -1000, y: -1000 })}>
        <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center text-center max-w-4xl px-6">
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/80 border border-cyan-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
            <span className="text-xs font-medium tracking-wider text-cyan-300 uppercase">ChatGPT Edition</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 drop-shadow-lg">
            Demystify the <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-green-400">Black Box</span>
          </h1>
          <p className="text-lg text-slate-300 mb-10 leading-relaxed font-light">
            An interactive ML educator. Build a single hidden-layer MLP, visualize live forward passes, and watch backpropagation gradients flow in real-time.
          </p>
          <button onClick={() => setActiveTab('viewer')} className="group relative px-8 py-4 bg-transparent overflow-hidden rounded-lg border border-cyan-500/50 hover:border-cyan-400 transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]">
            <div className="absolute inset-0 bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors duration-300"></div>
            <span className="relative text-cyan-300 font-semibold tracking-wide flex items-center gap-2">
              Launch Viewer <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </div>
      </div>
    );
  };

  const renderViewer = () => {
    if (!renderData) return <div className="p-8 text-slate-400">Initializing...</div>;
    const { W1, W2, nodeActs } = renderData;
    const width = 800; const height = 500;
    const layerX = [150, 400, 650];
    const inputY = [height/2 - 60, height/2 + 60];
    const hiddenY = Array.from({length: hiddenNeurons}, (_, i) => height/2 + (i - (hiddenNeurons-1)/2) * (350 / Math.max(hiddenNeurons, 2)));
    const outputY = [height/2];

    const getEdgeColor = (weight: number) => {
      const val = Math.max(-1, Math.min(1, weight));
      if (val < 0) return `rgba(6, 182, 212, ${Math.abs(val) * 0.8 + 0.2})`;
      return `rgba(249, 115, 22, ${Math.abs(val) * 0.8 + 0.2})`;
    };
    const getNodeGlow = (val: number, isAblated: boolean) => {
      if (isAblated) return 'none';
      const intensity = Math.min(1, val * 2);
      return `drop-shadow(0 0 ${intensity * 15}px rgba(236, 72, 153, ${intensity}))`;
    };

    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-4xl aspect-video bg-slate-900/50 rounded-2xl border border-slate-800 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
            {/* Edges W1 */}
            {inputY.map((y1, i) => hiddenY.map((y2, j) => {
              const isAblated = ablated.has(j);
              const weight = W1[i][j];
              return <line key={`w1-${i}-${j}`} x1={layerX[0]} y1={y1} x2={layerX[1]} y2={y2} stroke={isAblated ? '#374151' : getEdgeColor(weight)} strokeWidth={isAblated ? 1 : Math.max(1, Math.abs(weight) * 3)} className="transition-all duration-200" />;
            }))}
            {/* Edges W2 */}
            {hiddenY.map((y1, j) => {
              const isAblated = ablated.has(j);
              const weight = W2[j][0];
              return <line key={`w2-${j}`} x1={layerX[1]} y1={y1} x2={layerX[2]} y2={outputY[0]} stroke={isAblated ? '#374151' : getEdgeColor(weight)} strokeWidth={isAblated ? 1 : Math.max(1, Math.abs(weight) * 3)} className="transition-all duration-200" />;
            })}
            {/* Nodes */}
            {inputY.map((y, i) => (
              <g key={`in-${i}`}>
                <circle cx={layerX[0]} cy={y} r={16} fill="#0f172a" stroke="#22d3ee" strokeWidth={2} style={{ filter: getNodeGlow(nodeActs.input[i], false) }} />
                <text x={layerX[0]-30} y={y+4} fill="#22d3ee" fontSize="12" className="font-mono">X{i+1}</text>
              </g>
            ))}
            {hiddenY.map((y, i) => {
              const isAblated = ablated.has(i);
              return (
                <g key={`hid-${i}`} onClick={() => toggleAblation(i)} className="cursor-pointer">
                  <circle cx={layerX[1]} cy={y} r={18} fill="#0f172a" stroke={isAblated ? '#374151' : '#ec4899'} strokeWidth={2} style={{ filter: getNodeGlow(nodeActs.hidden[i], isAblated) }} className="transition-all" />
                  {isAblated && <line x1={layerX[1]-10} y1={y-10} x2={layerX[1]+10} y2={y+10} stroke="#ef4444" strokeWidth={3} />}
                </g>
              );
            })}
            <g>
              <circle cx={layerX[2]} cy={outputY[0]} r={20} fill="#0f172a" stroke="#eab308" strokeWidth={2} style={{ filter: getNodeGlow(nodeActs.output[0], false) }} />
              <text x={layerX[2]+30} y={outputY[0]+4} fill="#eab308" fontSize="12" className="font-mono">Y</text>
            </g>
          </svg>
          <div className="absolute bottom-4 left-4 text-xs text-slate-500 font-mono">Click hidden nodes to ablate</div>
        </div>
      </div>
    );
  };

  const renderControls = () => (
    <div className="w-full h-full flex items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-800/80 flex justify-between items-center bg-slate-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-950/50 rounded-lg border border-cyan-800/50"><Sliders className="text-cyan-400" size={20} /></div>
            <div>
              <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">PARAMETERS</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800">
            <button onClick={initNetwork} className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-950/30 rounded-lg transition-all"><RotateCcw size={16} /></button>
            <button onClick={() => { setIsPlaying(false); trainStep(); updateRenderState(); }} className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-950/30 rounded-lg transition-all"><SkipForward size={16} /></button>
            <button onClick={() => setIsPlaying(!isPlaying)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${isPlaying ? 'bg-fuchsia-950/40 text-fuchsia-400 border border-fuchsia-800/50' : 'bg-cyan-950/40 text-cyan-400 border border-cyan-800/50 hover:bg-cyan-900/60'}`}>
              {isPlaying ? <Pause size={16} /> : <Play size={16} />} {isPlaying ? 'PAUSE' : 'TRAIN'}
            </button>
            <div className="ml-2 px-3 py-1 bg-black/50 rounded-lg border border-slate-800 flex flex-col items-center min-w-[80px]">
              <span className="text-[9px] text-slate-500 uppercase">Epoch</span>
              <span className="text-sm font-mono text-cyan-300">{epoch.toString().padStart(5, '0')}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-slate-800/50">
          <div className="bg-slate-950 p-6">
            <div className="flex items-center gap-2 mb-4 text-cyan-400 border-b border-slate-800 pb-2"><Database size={16} /><h2 className="text-sm font-semibold uppercase">Data Source</h2></div>
            <div className="flex gap-2 mb-6">
              {[{id:'spiral', icon:'🌀'}, {id:'xor', icon:'✖️'}, {id:'blobs', icon:'🫧'}].map(ds => (
                <button key={ds.id} onClick={() => setDatasetType(ds.id)} className={`flex-1 py-2 rounded-md text-xs font-bold flex flex-col items-center gap-1 border ${datasetType === ds.id ? 'bg-cyan-950/50 border-cyan-400 text-cyan-300' : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-cyan-900'}`}>
                  <span className="text-lg">{ds.icon}</span>{ds.id.toUpperCase()}
                </button>
              ))}
            </div>
            <NeonSlider label="Noise Level" value={noiseLevel} min={0} max={50} step={1} onChange={setNoiseLevel} unit="%" />
          </div>
          <div className="bg-slate-950 p-6">
            <div className="flex items-center gap-2 mb-4 text-cyan-400 border-b border-slate-800 pb-2"><Network size={16} /><h2 className="text-sm font-semibold uppercase">Architecture</h2></div>
            <NeonSlider label="Hidden Neurons" value={hiddenNeurons} min={1} max={8} step={1} onChange={(v: number) => { setHiddenNeurons(v); setAblated(new Set()); }} />
            <NeonSelect label="Activation" icon={Activity} value={activationName} onChange={setActivationName} options={[{value:'relu',label:'ReLU'},{value:'tanh',label:'Tanh'},{value:'sigmoid',label:'Sigmoid'},{value:'linear',label:'Linear'}]} />
          </div>
          <div className="bg-slate-950 p-6">
            <div className="flex items-center gap-2 mb-4 text-cyan-400 border-b border-slate-800 pb-2"><Zap size={16} /><h2 className="text-sm font-semibold uppercase">Hyperparameters</h2></div>
            <div className="flex flex-col space-y-2 w-full mb-6">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-cyan-100 uppercase">Learning Rate</label>
                <span className="text-sm font-mono text-cyan-400">{learningRate.toFixed(4)}</span>
              </div>
              <input type="range" min="-4" max="0" step="0.1" value={Math.log10(learningRate)} onChange={(e) => setLearningRate(Math.pow(10, parseFloat(e.target.value)))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400" />
            </div>
            <div className="mt-auto pt-6">
              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800/50 flex flex-col gap-2">
                <div className="flex justify-between text-xs"><span className="text-slate-500">Status</span><span className={`font-mono font-bold ${isPlaying ? 'text-lime-400' : 'text-slate-400'}`}>{isPlaying ? 'TRAINING...' : 'IDLE'}</span></div>
                <div className="flex justify-between text-xs"><span className="text-slate-500">Active Nodes</span><span className="font-mono text-cyan-400">{hiddenNeurons - ablated.size} / {hiddenNeurons}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalysis = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    // Draw Decision Boundary
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || !renderData) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const { W1, W2 } = ml.current;
      const b1 = ml.current.b1;
      const b2 = ml.current.b2;
      const actF = activations[activationName].f;
      const w = canvas.width; const h = canvas.height;
      const imgData = ctx.createImageData(w, h);

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const nx = (x / w) * 2 - 1;
          const ny = (y / h) * 2 - 1;
          
          let hidden = [];
          for(let j=0; j<hiddenNeurons; j++) {
            if(ablated.has(j)) { hidden.push(0); continue; }
            let z = nx*W1[0][j] + ny*W1[1][j] + b1[0][j];
            hidden.push(actF(z));
          }
          let outZ = b2[0][0];
          for(let j=0; j<hiddenNeurons; j++) {
            outZ += hidden[j] * W2[j][0];
          }
          const outA = 1 / (1 + Math.exp(-outZ));

          const idx = (y * w + x) * 4;
          imgData.data[idx] = Math.floor(outA * 236 + (1 - outA) * 6);
          imgData.data[idx + 1] = Math.floor(outA * 72 + (1 - outA) * 182);
          imgData.data[idx + 2] = Math.floor(outA * 153 + (1 - outA) * 212);
          imgData.data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }, [renderData, activationName, ablated, hiddenNeurons]);

    const lossPath = useMemo(() => {
      if (lossHistory.length === 0) return '';
      const width = 400; const height = 150;
      const dx = width / 100;
      const maxLoss = Math.max(...lossHistory, 1);
      return lossHistory.reduce((path, loss, i) => {
        const x = i * dx;
        const y = height - (loss / maxLoss) * height;
        return i === 0 ? `M ${x} ${y}` : `${path} L ${x} ${y}`;
      }, '');
    }, [lossHistory]);

    const currentLoss = lossHistory.length > 0 ? lossHistory[lossHistory.length - 1].toFixed(4) : '1.0000';

    return (
      <div className="w-full h-full p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
              <h2 className="text-sm uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span> Gradient Flow (Backprop)
              </h2>
              <div className="w-full h-64 relative flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 600 200">
                  <defs>
                    <GlowFilter id="glow-pink" color="#ec4899" />
                    <GlowFilter id="glow-cyan" color="#06b6d4" />
                  </defs>
                  {renderData && [0, 1].map((inputIdx) =>
                    Array.from({length: hiddenNeurons}).map((_, hiddenIdx) => {
                      const isAblated = ablated.has(hiddenIdx);
                      const gradMag = renderData.nodeGrads.hidden[hiddenIdx] || 0;
                      const yH = 25 + hiddenIdx * (150/Math.max(1, hiddenNeurons-1));
                      return (
                        <path key={`gw1-${inputIdx}-${hiddenIdx}`}
                          d={`M 100 ${75 + inputIdx * 50} C 200 ${75 + inputIdx * 50}, 200 ${yH}, 300 ${yH}`}
                          fill="none" stroke={isAblated ? '#1f2937' : '#ec4899'}
                          strokeWidth={isAblated ? 1 : 1 + gradMag * 10}
                          strokeOpacity={isAblated ? 0.3 : 0.4 + gradMag}
                          filter={!isAblated && gradMag > 0.05 ? 'url(#glow-pink)' : ''}
                          strokeDasharray="5, 5" className={!isAblated && isPlaying ? 'animate-[dash_1s_linear_infinite_reverse]' : ''}
                        />
                      );
                    })
                  )}
                  {renderData && Array.from({length: hiddenNeurons}).map((_, hiddenIdx) => {
                    const isAblated = ablated.has(hiddenIdx);
                    const gradMag = renderData.nodeGrads.output[0] || 0;
                    const yH = 25 + hiddenIdx * (150/Math.max(1, hiddenNeurons-1));
                    return (
                      <path key={`gw2-${hiddenIdx}`}
                        d={`M 300 ${yH} C 400 ${yH}, 400 100, 500 100`}
                        fill="none" stroke={isAblated ? '#1f2937' : '#06b6d4'}
                        strokeWidth={isAblated ? 1 : 1 + gradMag * 10}
                        strokeOpacity={isAblated ? 0.3 : 0.5 + gradMag}
                        filter={!isAblated && gradMag > 0.05 ? 'url(#glow-cyan)' : ''}
                        strokeDasharray="8, 8" className={!isAblated && isPlaying ? 'animate-[dash_1s_linear_infinite_reverse]' : ''}
                      />
                    );
                  })}
                  {[0, 1].map((i) => (
                    <circle key={`gin-${i}`} cx="100" cy={75 + i * 50} r="12" fill="#111827" stroke="#4ade80" strokeWidth="2" />
                  ))}
                  {Array.from({length: hiddenNeurons}).map((_, i) => {
                    const yH = 25 + i * (150/Math.max(1, hiddenNeurons-1));
                    return <circle key={`gh-${i}`} cx="300" cy={yH} r="14" fill="#111827" stroke={ablated.has(i) ? '#374151' : '#eab308'} strokeWidth="2" />;
                  })}
                  <circle cx="500" cy="100" r="16" fill="#111827" stroke="#06b6d4" strokeWidth="3" />
                </svg>
              </div>
              <style>{`@keyframes dash { to { stroke-dashoffset: 20; } }`}</style>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h2 className="text-sm uppercase tracking-widest text-slate-400 mb-4">Ablation Controls</h2>
              <div className="flex gap-4 flex-wrap">
                {Array.from({length: hiddenNeurons}).map((_, idx) => {
                  const isAblated = ablated.has(idx);
                  return (
                    <button key={idx} onClick={() => toggleAblation(idx)} className={`flex-1 min-w-[80px] py-3 rounded-lg border flex flex-col items-center justify-center transition-all ${isAblated ? 'bg-red-950/30 border-red-900 text-red-500' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-cyan-500'}`}>
                      <span className="text-xs uppercase tracking-wider mb-1">Node {idx+1}</span>
                      <span className={`text-sm font-bold ${isAblated ? 'text-red-500' : 'text-green-400'}`}>{isAblated ? 'FROZEN' : 'ACTIVE'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex flex-col">
              <h2 className="text-sm uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span> Decision Boundary
              </h2>
              <div className="flex-1 flex items-center justify-center bg-black rounded-lg border border-slate-800 p-2 relative">
                <canvas ref={canvasRef} width={50} height={50} className="w-full aspect-square rounded shadow-[0_0_20px_rgba(6,182,212,0.15)]" style={{ imageRendering: 'pixelated' }} />
              </div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex-1 flex flex-col">
              <div className="flex justify-between items-end mb-4">
                <h2 className="text-sm uppercase tracking-widest text-slate-400">Loss Curve</h2>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase">Current Loss</div>
                  <div className="text-lg text-pink-500 font-bold drop-shadow-[0_0_5px_rgba(236,72,153,0.8)]">{currentLoss}</div>
                </div>
              </div>
              <div className="flex-1 relative w-full min-h-[150px] bg-black/50 rounded border border-slate-800 overflow-hidden">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
                  <defs>
                    <GlowFilter id="glow-loss" color="#ec4899" />
                    <linearGradient id="loss-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ec4899" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {lossHistory.length > 0 && <path d={`${lossPath} L 400 150 L 0 150 Z`} fill="url(#loss-grad)" />}
                  <path d={lossPath} fill="none" stroke="#ec4899" strokeWidth="2" filter="url(#glow-loss)" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTheory = () => {
    const [x1, setX1] = useState(1.0); const [x2, setX2] = useState(-0.5);
    const [w1, setW1] = useState(0.8); const [w2, setW2] = useState(-1.2);
    const [b, setB] = useState(0.5);
    const z = x1 * w1 + x2 * w2 + b;
    const a = Math.max(0, z); // ReLU for demo

    return (
      <div className="w-full h-full p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
            <h3 className="text-xl font-bold text-cyan-400 mb-4">Interactive Forward Pass (Single Neuron)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="relative w-full aspect-video bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center">
                <svg viewBox="0 0 400 200" className="w-full h-full">
                  <path d="M 100 50 L 250 100" stroke={w1 >= 0 ? '#22d3ee' : '#f43f5e'} strokeWidth={Math.max(1, Math.abs(w1) * 3)} opacity={0.6} />
                  <path d="M 100 150 L 250 100" stroke={w2 >= 0 ? '#22d3ee' : '#f43f5e'} strokeWidth={Math.max(1, Math.abs(w2) * 3)} opacity={0.6} />
                  <circle cx="100" cy="50" r="20" fill="#0f172a" stroke="#22d3ee" strokeWidth="2" />
                  <text x="100" y="55" fill="#fff" fontSize="12" textAnchor="middle">x₁</text>
                  <circle cx="100" cy="150" r="20" fill="#0f172a" stroke="#22d3ee" strokeWidth="2" />
                  <text x="100" y="155" fill="#fff" fontSize="12" textAnchor="middle">x₂</text>
                  <circle cx="250" cy="100" r="30" fill="#0f172a" stroke={a > 0 ? '#22d3ee' : '#475569'} strokeWidth="3" />
                  <text x="250" y="95" fill="#fff" fontSize="12" textAnchor="middle">Σ</text>
                  <text x="250" y="115" fill="#94a3b8" fontSize="10" textAnchor="middle">ReLU</text>
                  <path d="M 280 100 L 360 100" stroke={a > 0 ? '#22d3ee' : '#475569'} strokeWidth={Math.max(1, Math.abs(a) * 4)} />
                  <circle cx="360" cy="100" r="15" fill="#0f172a" stroke={a > 0 ? '#22d3ee' : '#475569'} strokeWidth="2" />
                  <text x="360" y="104" fill="#fff" fontSize="12" textAnchor="middle">a</text>
                </svg>
              </div>
              <div className="flex flex-col gap-4 font-mono text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs text-slate-400">x₁</label><input type="range" min="-2" max="2" step="0.1" value={x1} onChange={e=>setX1(parseFloat(e.target.value))} className="w-full" /></div>
                  <div><label className="text-xs text-slate-400">w₁</label><input type="range" min="-2" max="2" step="0.1" value={w1} onChange={e=>setW1(parseFloat(e.target.value))} className="w-full" /></div>
                  <div><label className="text-xs text-slate-400">x₂</label><input type="range" min="-2" max="2" step="0.1" value={x2} onChange={e=>setX2(parseFloat(e.target.value))} className="w-full" /></div>
                  <div><label className="text-xs text-slate-400">w₂</label><input type="range" min="-2" max="2" step="0.1" value={w2} onChange={e=>setW2(parseFloat(e.target.value))} className="w-full" /></div>
                  <div className="col-span-2"><label className="text-xs text-slate-400">b (bias)</label><input type="range" min="-2" max="2" step="0.1" value={b} onChange={e=>setB(parseFloat(e.target.value))} className="w-full" /></div>
                </div>
                <div className="bg-slate-950 p-4 rounded border border-slate-800 mt-2">
                  <div className="text-slate-400">z = (x₁·w₁) + (x₂·w₂) + b</div>
                  <div className="text-cyan-200">z = ({x1}·{w1}) + ({x2}·{w2}) + {b} = {z.toFixed(2)}</div>
                  <div className="text-slate-400 mt-2">a = ReLU(z)</div>
                  <div className="text-cyan-400 font-bold">a = {a.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-800">
              <h4 className="font-bold text-slate-200 mb-2">ReLU</h4>
              <svg viewBox="0 0 100 100" className="w-full aspect-square bg-slate-950 rounded border border-slate-800 mb-2">
                <path d="M 0 50 L 50 50 L 100 0" fill="none" stroke="#22d3ee" strokeWidth="3" />
              </svg>
              <div className="text-xs font-mono text-slate-400">f(x) = max(0, x)</div>
            </div>
            <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-800">
              <h4 className="font-bold text-slate-200 mb-2">Tanh</h4>
              <svg viewBox="0 0 100 100" className="w-full aspect-square bg-slate-950 rounded border border-slate-800 mb-2">
                <path d="M 0 100 C 40 100, 60 0, 100 0" fill="none" stroke="#f472b6" strokeWidth="3" />
              </svg>
              <div className="text-xs font-mono text-slate-400">f(x) = tanh(x)</div>
            </div>
            <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-800">
              <h4 className="font-bold text-slate-200 mb-2">Sigmoid</h4>
              <svg viewBox="0 0 100 100" className="w-full aspect-square bg-slate-950 rounded border border-slate-800 mb-2">
                <path d="M 0 100 C 50 100, 50 0, 100 0" fill="none" stroke="#4ade80" strokeWidth="3" />
              </svg>
              <div className="text-xs font-mono text-slate-400">f(x) = 1 / (1 + e^-x)</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TABS = [
    { id: 'hero', icon: Info, label: 'Introduction' },
    { id: 'viewer', icon: Network, label: 'Network Viewer' },
    { id: 'controls', icon: Sliders, label: 'Parameters' },
    { id: 'analysis', icon: LineChart, label: 'Analysis' },
    { id: 'theory', icon: BookOpen, label: 'Theory' }
  ];

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 font-sans overflow-hidden selection:bg-cyan-900 selection:text-cyan-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-20 shadow-xl">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3 text-cyan-400 mb-1">
            <Layers size={24} />
            <span className="font-bold tracking-wider">ML_VIEWER</span>
          </div>
          <div className="text-xs text-slate-500 font-mono">v2.0 ChatGPT Edition</div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${isActive ? 'bg-cyan-950/50 text-cyan-300 border border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.1)]' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'}`}>
                <Icon size={18} className={isActive ? 'text-cyan-400' : ''} />
                {tab.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-950 rounded p-3 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500">Engine</span>
            <span className="flex items-center gap-1 text-xs font-mono text-lime-400"><div className="w-2 h-2 rounded-full bg-lime-400 animate-pulse"></div> ONLINE</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative bg-slate-950 overflow-hidden">
        {activeTab === 'hero' && renderHero()}
        {activeTab === 'viewer' && renderViewer()}
        {activeTab === 'controls' && renderControls()}
        {activeTab === 'analysis' && renderAnalysis()}
        {activeTab === 'theory' && renderTheory()}
      </main>
    </div>
  );
}