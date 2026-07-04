import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Play, Pause, SkipForward, RotateCcw, Activity, Database, Network, 
  Sliders, Zap, PowerOff, BookOpen, GitMerge, Calculator, ChevronRight, Info 
} from 'lucide-react';

// --- Shared Math & Tensor Utilities ---
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
    df: (z: number) => 1,
  }
};

function generateDataset(type: string, numPoints = 200): { X: Matrix; Y: Matrix } {
  const X: Matrix = [];
  const Y: Matrix = [];
  
  for (let i = 0; i < numPoints; i++) {
    if (type === 'xor') {
      const x1 = Math.random() * 2 - 1;
      const x2 = Math.random() * 2 - 1;
      const label = (x1 * x2 > 0) ? 0 : 1;
      X.push([x1 + (Math.random()-0.5)*0.2, x2 + (Math.random()-0.5)*0.2]);
      Y.push([label]);
    } else if (type === 'blobs') {
      const label = Math.random() > 0.5 ? 1 : 0;
      const cx = label === 1 ? 0.5 : -0.5;
      const cy = label === 1 ? 0.5 : -0.5;
      X.push([cx + (Math.random()-0.5)*0.6, cy + (Math.random()-0.5)*0.6]);
      Y.push([label]);
    } else if (type === 'spiral') {
      const label = Math.random() > 0.5 ? 1 : 0;
      const r = Math.random() * 1.5;
      const theta = r * 4 + (label === 1 ? Math.PI : 0) + (Math.random()-0.5)*0.5;
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
          <option key={opt.value} value={opt.value} className="bg-slate-900 text-cyan-300">
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-cyan-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </div>
    </div>
  </div>
);

const DatasetSelector = ({ selected, onSelect }: any) => {
  const datasets = [
    { id: 'spiral', name: 'Spiral', icon: '🌀' },
    { id: 'xor', name: 'XOR', icon: '✖️' },
    { id: 'blobs', name: 'Blobs', icon: '🫧' }
  ];
  return (
    <div className="flex flex-col space-y-2 w-full my-4">
      <label className="text-xs font-medium text-cyan-100 uppercase tracking-wider flex items-center gap-2">
        <Database size={14} className="text-cyan-500" /> Dataset
      </label>
      <div className="flex gap-2">
        {datasets.map((ds) => (
          <button
            key={ds.id} onClick={() => onSelect(ds.id)}
            className={`flex-1 py-2 px-1 rounded-md text-xs font-bold transition-all duration-300 flex flex-col items-center gap-1 border ${
              selected === ds.id
                ? 'bg-cyan-950/50 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.4)]'
                : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-cyan-900 hover:text-cyan-700'
            }`}
          >
            <span className="text-lg">{ds.icon}</span>{ds.name}
          </button>
        ))}
      </div>
    </div>
  );
};

// --- View Modules ---

function HeroView() {
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
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 2 + 2;
        this.layer = layer;
        const colors = [
          { base: '#0891b2', glow: '#22d3ee' },
          { base: '#c026d3', glow: '#f0abfc' },
          { base: '#16a34a', glow: '#4ade80' }
        ];
        const colorSet = colors[this.layer % colors.length];
        this.baseColor = colorSet.base;
        this.glowColor = colorSet.glow;
        this.activation = Math.random();
      }

      update() {
        this.x += this.vx; this.y += this.vy;
        if (this.x < 0 || this.x > canvas!.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas!.height) this.vy *= -1;
        if (Math.random() < 0.01) this.activation = 1.0;
        else this.activation = Math.max(0.1, this.activation - 0.02);
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        if (this.activation > 0.5) {
          ctx.shadowBlur = 15; ctx.shadowColor = this.glowColor; ctx.fillStyle = '#ffffff';
        } else {
          ctx.shadowBlur = 0; ctx.fillStyle = this.baseColor;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
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

    const drawLines = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            const layerDiff = Math.abs(particles[i].layer - particles[j].layer);
            if (layerDiff > 1) continue;
            const opacity = 1 - distance / 150;
            const combinedActivation = (particles[i].activation + particles[j].activation) / 2;
            
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            
            if (combinedActivation > 0.6) {
              ctx.strokeStyle = `rgba(34, 211, 238, ${opacity * combinedActivation})`;
              ctx.lineWidth = 1.5;
            } else {
              ctx.strokeStyle = `rgba(71, 85, 105, ${opacity * 0.3})`;
              ctx.lineWidth = 0.5;
            }
            ctx.stroke();
          }
        }
        const dxMouse = particles[i].x - mousePos.x;
        const dyMouse = particles[i].y - mousePos.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        if (distMouse < 200) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(mousePos.x, mousePos.y);
          ctx.strokeStyle = `rgba(240, 171, 252, ${1 - distMouse / 200})`;
          ctx.lineWidth = 1;
          ctx.stroke();
          particles[i].activation = 1;
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width
      );
      gradient.addColorStop(0, '#020617');
      gradient.addColorStop(1, '#000000');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawLines();
      particles.forEach(particle => {
        particle.update();
        particle.draw(ctx);
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mousePos]);

  return (
    <div 
      className="relative min-h-full w-full overflow-hidden bg-slate-950 flex items-center justify-center font-sans selection:bg-cyan-500/30"
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setMousePos({ x: -1000, y: -1000 })}
    >
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center max-w-5xl mx-auto py-20">
        <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/80 border border-cyan-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.15)]">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
          </span>
          <span className="text-xs font-medium tracking-wider text-cyan-300 uppercase">ChatGPT Edition</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 drop-shadow-lg">
          Demystify the <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-green-400 animate-gradient-x">Black Box</span>
        </h1>
        <p className="max-w-2xl text-lg md:text-xl text-slate-300 mb-10 leading-relaxed font-light">
          An interactive ML educator. Build a single hidden-layer MLP, visualize live forward passes, and watch backpropagation gradients flow in real-time. 
          <strong className="font-medium text-white"> No heavy libraries, just pure intuition.</strong>
        </p>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-4xl w-full border-t border-slate-800/50 pt-10">
          <div className="flex flex-col gap-2">
            <div className="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-2">
              <Activity className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="text-white font-medium">Live Activations</h3>
            <p className="text-sm text-slate-400">Watch neurons glow as data flows through the network during the forward pass.</p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-10 w-10 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center mb-2">
              <GitMerge className="w-5 h-5 text-fuchsia-400" />
            </div>
            <h3 className="text-white font-medium">Visual Backprop</h3>
            <p className="text-sm text-slate-400">Trace gradients backwards to see exactly how weights are updated to minimize loss.</p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-2">
              <PowerOff className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-white font-medium">Interactive Ablation</h3>
            <p className="text-sm text-slate-400">Freeze or disable specific neurons to instantly see how the model's decision boundary shifts.</p>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes gradient-x {
          0%, 100% { background-size: 200% 200%; background-position: left center; }
          50% { background-size: 200% 200%; background-position: right center; }
        }
        .animate-gradient-x { animation: gradient-x 4s ease infinite; }
      `}} />
    </div>
  );
}

function CoreView() {
  const [datasetType, setDatasetType] = useState<string>('xor');
  const [hiddenNeurons, setHiddenNeurons] = useState<number>(4);
  const [activationName, setActivationName] = useState<keyof typeof activations>('tanh');
  const [learningRate, setLearningRate] = useState<number>(0.1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'forward' | 'backward'>('forward');
  const [ablated, setAblated] = useState<Set<number>>(new Set());
  
  const [epoch, setEpoch] = useState(0);
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const [renderData, setRenderData] = useState<{
    W1: Matrix; W2: Matrix;
    nodeActs: { input: number[], hidden: number[], output: number[] };
    nodeGrads: { hidden: number[], output: number[] };
  } | null>(null);

  const ml = useRef({
    X: [] as Matrix, Y: [] as Matrix,
    W1: [] as Matrix, b1: [] as Matrix,
    W2: [] as Matrix, b2: [] as Matrix,
    epoch: 0, lossHistory: [] as number[],
  });

  const animationRef = useRef<number>();

  const initNetwork = useCallback(() => {
    const { X, Y } = generateDataset(datasetType);
    ml.current = {
      X, Y,
      W1: mat.random(2, hiddenNeurons), b1: mat.create(1, hiddenNeurons, 0),
      W2: mat.random(hiddenNeurons, 1), b2: mat.create(1, 1, 0),
      epoch: 0, lossHistory: [],
    };
    setEpoch(0); setLossHistory([]); setAblated(new Set());
    updateRenderState();
  }, [datasetType, hiddenNeurons]);

  useEffect(() => { initNetwork(); }, [initNetwork]);

  const trainStep = useCallback(() => {
    const { X, Y, W1, b1, W2, b2 } = ml.current;
    const N = X.length;
    const act = activations[activationName];

    let Z1 = mat.add(mat.dot(X, W1), b1);
    if (ablated.size > 0) Z1 = Z1.map(row => row.map((val, j) => ablated.has(j) ? 0 : val));
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
    if (ablated.size > 0) dZ1 = dZ1.map(row => row.map((val, j) => ablated.has(j) ? 0 : val));

    const dW1 = mat.scale(mat.dot(mat.transpose(X), dZ1), 1 / N);
    const db1 = mat.scale(mat.sumAxis0(dZ1), 1 / N);

    ml.current.W1 = mat.sub(W1, mat.scale(dW1, learningRate));
    ml.current.b1 = mat.sub(b1, mat.scale(db1, learningRate));
    ml.current.W2 = mat.sub(W2, mat.scale(dW2, learningRate));
    ml.current.b2 = mat.sub(b2, mat.scale(db2, learningRate));
    ml.current.epoch += 1;
    ml.current.lossHistory.push(loss);
    if (ml.current.lossHistory.length > 200) ml.current.lossHistory.shift();

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
      if (frameCount % 4 === 0) updateRenderState(actsAndGrads);
      animationRef.current = requestAnimationFrame(loop);
    };
    animationRef.current = requestAnimationFrame(loop);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isPlaying, trainStep, updateRenderState]);

  const handleStep = () => { updateRenderState(trainStep()); };
  const toggleAblation = (index: number) => {
    setAblated(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const getEdgeColor = (weight: number) => {
    const val = Math.max(-1, Math.min(1, weight));
    if (val < 0) return `rgba(6, 182, 212, ${Math.abs(val) * 0.8 + 0.2})`;
    return `rgba(249, 115, 22, ${Math.abs(val) * 0.8 + 0.2})`;
  };

  const getNodeGlow = (val: number, isAblated: boolean) => {
    if (isAblated) return 'none';
    const intensity = Math.min(1, val * 2);
    const color = viewMode === 'forward' ? '236, 72, 153' : '234, 179, 8';
    return `drop-shadow(0 0 ${intensity * 15}px rgba(${color}, ${intensity}))`;
  };

  const renderNetwork = () => {
    if (!renderData) return null;
    const { W1, W2, nodeActs, nodeGrads } = renderData;
    const width = 800; const height = 500;
    const layerX = [150, 400, 650];
    const inputY = [height/2 - 60, height/2 + 60];
    const hiddenY = Array.from({length: hiddenNeurons}, (_, i) => 
      height/2 + (i - (hiddenNeurons-1)/2) * (400 / Math.max(hiddenNeurons, 2))
    );
    const outputY = [height/2];
    const nodes = [
      { layer: 0, y: inputY, acts: nodeActs.input, grads: [0,0] },
      { layer: 1, y: hiddenY, acts: nodeActs.hidden, grads: nodeGrads.hidden },
      { layer: 2, y: outputY, acts: nodeActs.output, grads: nodeGrads.output },
    ];

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        {inputY.map((y1, i) => 
          hiddenY.map((y2, j) => {
            const isAblated = ablated.has(j);
            const weight = W1[i][j];
            return (
              <line 
                key={`w1-${i}-${j}`} x1={layerX[0]} y1={y1} x2={layerX[1]} y2={y2}
                stroke={isAblated ? '#374151' : getEdgeColor(weight)}
                strokeWidth={isAblated ? 1 : Math.max(1, Math.abs(weight) * 3)}
                className="transition-all duration-200"
              />
            );
          })
        )}
        {hiddenY.map((y1, j) => {
          const isAblated = ablated.has(j);
          const weight = W2[j][0];
          return (
            <line 
              key={`w2-${j}-0`} x1={layerX[1]} y1={y1} x2={layerX[2]} y2={outputY[0]}
              stroke={isAblated ? '#374151' : getEdgeColor(weight)}
              strokeWidth={isAblated ? 1 : Math.max(1, Math.abs(weight) * 3)}
              className="transition-all duration-200"
            />
          );
        })}
        {nodes.map((layer, lIdx) =>
          layer.y.map((y, nIdx) => {
            const isAblated = lIdx === 1 && ablated.has(nIdx);
            const act = layer.acts[nIdx] || 0;
            return (
              <circle
                key={`node-${lIdx}-${nIdx}`} cx={layerX[lIdx]} cy={y} r={15}
                fill="#0f172a" stroke={isAblated ? '#374151' : (lIdx === 2 ? '#06b6d4' : '#ec4899')}
                strokeWidth={2} style={{ filter: getNodeGlow(act, isAblated) }}
                onClick={() => lIdx === 1 && toggleAblation(nIdx)}
                className={lIdx === 1 ? "cursor-pointer" : ""}
              />
            );
          })
        )}
      </svg>
    );
  };

  return (
    <div className="min-h-full bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-5xl bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-cyan-400">Core Visualization</h2>
            <p className="text-sm text-slate-500">Epoch: {epoch} | Loss: {lossHistory[lossHistory.length-1]?.toFixed(4) || 'N/A'}</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setViewMode(v => v === 'forward' ? 'backward' : 'forward')} className="px-4 py-2 bg-slate-800 text-slate-300 border border-slate-700 rounded hover:bg-slate-700 transition-colors">
              Mode: {viewMode}
            </button>
            <button onClick={() => setIsPlaying(!isPlaying)} className="px-4 py-2 bg-cyan-950 text-cyan-400 border border-cyan-800 rounded hover:bg-cyan-900 transition-colors">
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button onClick={handleStep} className="px-4 py-2 bg-slate-800 text-slate-300 border border-slate-700 rounded hover:bg-slate-700 transition-colors">
              Step
            </button>
          </div>
        </div>
        <div className="w-full aspect-video bg-black/50 rounded-xl border border-slate-800 overflow-hidden">
          {renderNetwork()}
        </div>
      </div>
    </div>
  );
}

function ControlsView() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [dataset, setDataset] = useState('spiral');
  const [noise, setNoise] = useState(10);
  const [batchSize, setBatchSize] = useState(16);
  const [hiddenNeurons, setHiddenNeurons] = useState(5);
  const [activation, setActivation] = useState('relu');
  const [frozenNeurons, setFrozenNeurons] = useState<number[]>([]);
  const [learningRate, setLearningRate] = useState(0.03);
  const [regularization, setRegularization] = useState(0);

  useEffect(() => {
    let interval: number;
    if (isPlaying) interval = window.setInterval(() => setEpoch(prev => prev + 1), 50);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const toggleNeuronAblation = (index: number) => {
    setFrozenNeurons(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  };

  const handleReset = () => { setIsPlaying(false); setEpoch(0); setFrozenNeurons([]); };

  return (
    <div className="min-h-full bg-slate-950 flex items-center justify-center p-6 font-sans text-slate-200">
      <div className="w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden relative flex flex-col">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-600 via-fuchsia-500 to-cyan-600 opacity-70"></div>
        <div className="px-6 py-4 border-b border-slate-800/80 flex justify-between items-center bg-slate-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-950/50 rounded-lg border border-cyan-800/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]">
              <Network className="text-cyan-400" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 tracking-wide">NEURAL_NET_VIEWER</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Control Module v1.0</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800">
            <button onClick={handleReset} className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-950/30 rounded-lg transition-all" title="Reset Network"><RotateCcw size={16} /></button>
            <button onClick={() => { setIsPlaying(false); setEpoch(e => e + 1); }} className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-950/30 rounded-lg transition-all" title="Step Forward"><SkipForward size={16} /></button>
            <button onClick={() => setIsPlaying(!isPlaying)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${isPlaying ? 'bg-fuchsia-950/40 text-fuchsia-400 border border-fuchsia-800/50 shadow-[0_0_15px_rgba(217,70,239,0.3)]' : 'bg-cyan-950/40 text-cyan-400 border border-cyan-800/50 shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:bg-cyan-900/60'}`}>
              {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
              {isPlaying ? 'PAUSE' : 'TRAIN'}
            </button>
            <div className="ml-2 px-3 py-1 bg-black/50 rounded-lg border border-slate-800 flex flex-col items-center justify-center min-w-[80px]">
              <span className="text-[9px] text-slate-500 uppercase">Epoch</span>
              <span className="text-sm font-mono text-cyan-300">{epoch.toString().padStart(5, '0')}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-slate-800/50">
          <div className="bg-slate-950 p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-4 text-cyan-400 border-b border-slate-800 pb-2">
              <Database size={16} /><h2 className="text-sm font-semibold uppercase tracking-wider">Data Source</h2>
            </div>
            <DatasetSelector selected={dataset} onSelect={setDataset} />
            <div className="mt-4 space-y-2">
              <NeonSlider label="Noise Level" value={noise} min={0} max={50} step={1} onChange={setNoise} unit="%" />
              <NeonSlider label="Batch Size" value={batchSize} min={1} max={64} step={1} onChange={setBatchSize} />
            </div>
          </div>
          <div className="bg-slate-950 p-6 flex flex-col relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-cyan-900/20 blur-[50px] rounded-full pointer-events-none"></div>
            <div className="flex items-center gap-2 mb-4 text-cyan-400 border-b border-slate-800 pb-2">
              <Network size={16} /><h2 className="text-sm font-semibold uppercase tracking-wider">Architecture</h2>
            </div>
            <NeonSlider label="Hidden Neurons" value={hiddenNeurons} min={1} max={8} step={1} onChange={(val: number) => { setHiddenNeurons(val); setFrozenNeurons(prev => prev.filter(i => i < val)); }} />
            <NeonSelect label="Activation" icon={Activity} value={activation} onChange={setActivation} options={[{ value: 'relu', label: 'ReLU' }, { value: 'tanh', label: 'Tanh' }, { value: 'sigmoid', label: 'Sigmoid' }, { value: 'linear', label: 'Linear' }]} />
            <div className="mt-6 p-4 bg-slate-900/40 rounded-xl border border-slate-800/80">
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-medium text-fuchsia-300 uppercase tracking-wider flex items-center gap-2"><PowerOff size={12} />Neuron Ablation</label>
                <span className="text-[10px] text-slate-500">Click to freeze</span>
              </div>
              <div className="flex justify-center gap-3 flex-wrap">
                {Array.from({ length: hiddenNeurons }).map((_, i) => {
                  const isFrozen = frozenNeurons.includes(i);
                  return (
                    <button key={i} onClick={() => toggleNeuronAblation(i)} className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isFrozen ? 'bg-slate-900 border-2 border-fuchsia-900/50 text-fuchsia-700 shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]' : 'bg-cyan-950 border border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.4)] hover:bg-cyan-900 hover:shadow-[0_0_20px_rgba(34,211,238,0.6)]'}`} title={isFrozen ? `Unfreeze Neuron ${i+1}` : `Freeze Neuron ${i+1}`}>
                      <span className="text-xs font-mono font-bold">{i + 1}</span>
                      {isFrozen && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-full h-0.5 bg-fuchsia-600 rotate-45 shadow-[0_0_5px_rgba(217,70,239,0.8)]"></div></div>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="bg-slate-950 p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-4 text-cyan-400 border-b border-slate-800 pb-2">
              <Sliders size={16} /><h2 className="text-sm font-semibold uppercase tracking-wider">Hyperparameters</h2>
            </div>
            <div className="space-y-6 mt-2">
              <div className="flex flex-col space-y-2 w-full">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-cyan-100 uppercase tracking-wider flex items-center gap-2"><Zap size={12} className="text-cyan-500" />Learning Rate</label>
                  <span className="text-sm font-mono text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">{learningRate.toFixed(4)}</span>
                </div>
                <input type="range" min="-4" max="0" step="0.1" value={Math.log10(learningRate)} onChange={(e) => setLearningRate(Math.pow(10, parseFloat(e.target.value)))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300 transition-all shadow-[0_0_10px_rgba(34,211,238,0.2)]" />
                <div className="flex justify-between text-[10px] text-slate-600 font-mono"><span>0.0001</span><span>1.0</span></div>
              </div>
              <NeonSelect label="Regularization" value={regularization.toString()} onChange={(val: string) => setRegularization(parseFloat(val))} options={[{ value: '0', label: 'None' }, { value: '0.001', label: 'L1 (0.001)' }, { value: '0.003', label: 'L1 (0.003)' }, { value: '0.01', label: 'L2 (0.01)' }, { value: '0.03', label: 'L2 (0.03)' }]} />
            </div>
            <div className="mt-auto pt-6">
              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800/50 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Status</span>
                  <span className={`font-mono font-bold ${isPlaying ? 'text-lime-400 drop-shadow-[0_0_5px_rgba(163,230,53,0.8)]' : 'text-slate-400'}`}>{isPlaying ? 'TRAINING...' : 'IDLE'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Active Nodes</span>
                  <span className="font-mono text-cyan-400">{hiddenNeurons - frozenNeurons.length} / {hiddenNeurons}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalysisView() {
  const HIDDEN_NEURONS = 4;
  const MAX_HISTORY = 100;
  const [isRunning, setIsRunning] = useState(true);
  const [epoch, setEpoch] = useState(0);
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const [ablated, setAblated] = useState<boolean[]>(Array(HIDDEN_NEURONS).fill(false));
  const [gradients, setGradients] = useState<{ w1: number[]; w2: number[] }>({
    w1: Array(HIDDEN_NEURONS).fill(0), w2: Array(HIDDEN_NEURONS).fill(0),
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setEpoch((prev) => prev + 1);
      setLossHistory((prev) => {
        const activeNeurons = ablated.filter((a) => !a).length;
        const capacityPenalty = (HIDDEN_NEURONS - activeNeurons) * 0.15;
        const baseLoss = Math.exp(-epoch / 50) * 0.8;
        const noise = Math.random() * 0.05;
        const currentLoss = Math.min(1, Math.max(0, baseLoss + capacityPenalty + noise));
        const newHistory = [...prev, currentLoss];
        if (newHistory.length > MAX_HISTORY) newHistory.shift();
        return newHistory;
      });
      setGradients({
        w1: ablated.map((isAblated) => (isAblated ? 0 : Math.random() * 0.5 + 0.1)),
        w2: ablated.map((isAblated) => (isAblated ? 0 : Math.random() * 0.8 + 0.2)),
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isRunning, epoch, ablated]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width; const height = canvas.height;
    const currentLoss = lossHistory[lossHistory.length - 1] || 1;
    const imageData = ctx.createImageData(width, height);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nx = (x / width) * 2 - 1;
        const ny = (y / height) * 2 - 1;
        const target = nx * ny > 0 ? 1 : 0;
        let prediction = target;
        if (Math.random() < currentLoss) prediction = Math.random();
        if (ablated[0] && nx < 0 && ny > 0) prediction = 0.5;
        if (ablated[1] && nx > 0 && ny > 0) prediction = 0.5;
        if (ablated[2] && nx < 0 && ny < 0) prediction = 0.5;
        if (ablated[3] && nx > 0 && ny < 0) prediction = 0.5;
        const idx = (y * width + x) * 4;
        const r = Math.floor(prediction * 236 + (1 - prediction) * 6);
        const g = Math.floor(prediction * 72 + (1 - prediction) * 182);
        const b = Math.floor(prediction * 153 + (1 - prediction) * 212);
        imageData.data[idx] = r; imageData.data[idx + 1] = g; imageData.data[idx + 2] = b; imageData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, [lossHistory, ablated]);

  const lossPath = useMemo(() => {
    if (lossHistory.length === 0) return '';
    const width = 400; const height = 150; const dx = width / MAX_HISTORY;
    return lossHistory.reduce((path, loss, i) => {
      const x = i * dx; const y = height - loss * height;
      return i === 0 ? `M ${x} ${y}` : `${path} L ${x} ${y}`;
    }, '');
  }, [lossHistory]);

  const toggleAblation = (index: number) => {
    setAblated((prev) => { const next = [...prev]; next[index] = !next[index]; return next; });
  };

  const currentLoss = lossHistory.length > 0 ? lossHistory[lossHistory.length - 1].toFixed(4) : '1.0000';

  return (
    <div className="min-h-full bg-slate-950 text-slate-200 p-6 font-mono selection:bg-pink-500/30">
      <header className="mb-8 border-b border-slate-800 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">Analysis & Output</h1>
          <p className="text-slate-400 text-sm mt-1">Live Forward/Backward Pass Visualization</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wider">Epoch</div>
            <div className="text-xl text-cyan-400 font-bold">{epoch.toString().padStart(5, '0')}</div>
          </div>
          <button onClick={() => setIsRunning(!isRunning)} className={`px-4 py-2 rounded border ${isRunning ? 'border-pink-500 text-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.4)]' : 'border-green-400 text-green-400 shadow-[0_0_10px_rgba(74,222,128,0.4)]'} transition-all hover:bg-slate-900`}>
            {isRunning ? 'PAUSE' : 'RESUME'}
          </button>
        </div>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-pink-500 to-transparent opacity-50"></div>
            <h2 className="text-sm uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>Gradient Flow (Backprop)</h2>
            <div className="w-full h-64 relative flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 600 200">
                <defs>
                  <GlowFilter id="glow-pink" color="#ec4899" />
                  <GlowFilter id="glow-cyan" color="#06b6d4" />
                  <GlowFilter id="glow-green" color="#4ade80" />
                </defs>
                {[0, 1].map((inputIdx) =>
                  [0, 1, 2, 3].map((hiddenIdx) => {
                    const isAblated = ablated[hiddenIdx];
                    const gradMag = gradients.w1[hiddenIdx];
                    return (
                      <path key={`w1-${inputIdx}-${hiddenIdx}`} d={`M 100 ${75 + inputIdx * 50} C 200 ${75 + inputIdx * 50}, 200 ${25 + hiddenIdx * 50}, 300 ${25 + hiddenIdx * 50}`} fill="none" stroke={isAblated ? '#1f2937' : '#ec4899'} strokeWidth={isAblated ? 1 : 1 + gradMag * 4} strokeOpacity={isAblated ? 0.3 : 0.4 + gradMag * 0.6} filter={!isAblated && gradMag > 0.2 ? 'url(#glow-pink)' : ''} strokeDasharray="5, 5" className={!isAblated && isRunning ? 'animate-[dash_1s_linear_infinite_reverse]' : ''} />
                    );
                  })
                )}
                {[0, 1, 2, 3].map((hiddenIdx) => {
                  const isAblated = ablated[hiddenIdx];
                  const gradMag = gradients.w2[hiddenIdx];
                  return (
                    <path key={`w2-${hiddenIdx}`} d={`M 300 ${25 + hiddenIdx * 50} C 400 ${25 + hiddenIdx * 50}, 400 100, 500 100`} fill="none" stroke={isAblated ? '#1f2937' : '#06b6d4'} strokeWidth={isAblated ? 1 : 1 + gradMag * 5} strokeOpacity={isAblated ? 0.3 : 0.5 + gradMag * 0.5} filter={!isAblated && gradMag > 0.2 ? 'url(#glow-cyan)' : ''} strokeDasharray="8, 8" className={!isAblated && isRunning ? 'animate-[dash_1s_linear_infinite_reverse]' : ''} />
                  );
                })}
                {[0, 1].map((i) => (
                  <g key={`in-${i}`} transform={`translate(100, ${75 + i * 50})`}>
                    <circle r="12" fill="#111827" stroke="#4ade80" strokeWidth="2" filter="url(#glow-green)" />
                    <text x="-25" y="4" fill="#4ade80" fontSize="10" className="opacity-70">X{i}</text>
                  </g>
                ))}
                {[0, 1, 2, 3].map((i) => {
                  const isAblated = ablated[i];
                  return (
                    <g key={`h-${i}`} transform={`translate(300, ${25 + i * 50})`}>
                      <circle r="14" fill="#111827" stroke={isAblated ? '#374151' : '#eab308'} strokeWidth="2" filter={isAblated ? '' : 'url(#glow-cyan)'} />
                      {isAblated && <line x1="-10" y1="-10" x2="10" y2="10" stroke="#ef4444" strokeWidth="3" />}
                    </g>
                  );
                })}
                <g transform="translate(500, 100)">
                  <circle r="16" fill="#111827" stroke="#06b6d4" strokeWidth="3" filter="url(#glow-cyan)" />
                  <text x="25" y="4" fill="#06b6d4" fontSize="12" className="opacity-90">Y</text>
                </g>
              </svg>
            </div>
            <style>{`@keyframes dash { to { stroke-dashoffset: 20; } }`}</style>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h2 className="text-sm uppercase tracking-widest text-slate-400 mb-4">Ablation Controls</h2>
            <p className="text-xs text-slate-500 mb-4">Freeze specific neurons to observe the impact on gradient flow and decision boundary.</p>
            <div className="flex gap-4">
              {ablated.map((isAblated, idx) => (
                <button key={idx} onClick={() => toggleAblation(idx)} className={`flex-1 py-3 rounded-lg border flex flex-col items-center justify-center transition-all ${isAblated ? 'bg-red-950/30 border-red-900 text-red-500' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-cyan-500 hover:shadow-[0_0_10px_rgba(6,182,212,0.3)]'}`}>
                  <span className="text-xs uppercase tracking-wider mb-1">Neuron {idx}</span>
                  <span className={`text-sm font-bold ${isAblated ? 'text-red-500' : 'text-green-400'}`}>{isAblated ? 'FROZEN' : 'ACTIVE'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex flex-col">
            <h2 className="text-sm uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>Decision Boundary</h2>
            <div className="flex-1 flex items-center justify-center bg-black rounded-lg border border-slate-800 p-2 relative">
              <canvas ref={canvasRef} width={80} height={80} className="w-full aspect-square rounded image-rendering-pixelated shadow-[0_0_20px_rgba(6,182,212,0.15)]" style={{ imageRendering: 'pixelated' }} />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-full h-[1px] bg-white/10 absolute"></div>
                <div className="h-full w-[1px] bg-white/10 absolute"></div>
              </div>
            </div>
            <div className="mt-4 flex justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1"><div className="w-3 h-3 bg-cyan-400 rounded-sm"></div> Class 0</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 bg-pink-500 rounded-sm"></div> Class 1</span>
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
              <div className="absolute inset-0 flex flex-col justify-between p-0 pointer-events-none opacity-20">
                {[...Array(5)].map((_, i) => (<div key={i} className="w-full border-b border-slate-500 h-0"></div>))}
              </div>
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
}

const InteractiveNeuron = () => {
  const [x1, setX1] = useState(1.0);
  const [x2, setX2] = useState(-0.5);
  const [w1, setW1] = useState(0.8);
  const [w2, setW2] = useState(-1.2);
  const [b, setB] = useState(0.5);
  const [act, setAct] = useState<'ReLU' | 'Sigmoid' | 'Tanh'>('ReLU');

  const z = x1 * w1 + x2 * w2 + b;
  const a = act === 'ReLU' ? activations.relu.f(z) : act === 'Sigmoid' ? activations.sigmoid.f(z) : activations.tanh.f(z);

  const getGlow = (val: number, max: number = 2) => {
    const intensity = Math.min(Math.abs(val) / max, 1);
    return `rgba(34, 211, 238, ${intensity * 0.8})`;
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-slate-900/50 rounded-xl border border-slate-700 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] flex items-center gap-2"><Play size={20} /> Interactive Forward Pass</h3>
        <select value={act} onChange={(e) => setAct(e.target.value as any)} className="bg-slate-800 text-cyan-300 border border-cyan-500/50 rounded px-3 py-1 outline-none focus:border-cyan-400">
          <option value="ReLU">ReLU</option><option value="Sigmoid">Sigmoid</option><option value="Tanh">Tanh</option>
        </select>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="relative w-full aspect-video bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center">
          <svg viewBox="0 0 400 200" className="w-full h-full">
            <defs>
              <filter id="glow-neuron">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <path d="M 100 50 L 250 100" stroke={w1 >= 0 ? '#22d3ee' : '#f43f5e'} strokeWidth={Math.max(1, Math.abs(w1) * 3)} opacity={0.6} />
            <path d="M 100 150 L 250 100" stroke={w2 >= 0 ? '#22d3ee' : '#f43f5e'} strokeWidth={Math.max(1, Math.abs(w2) * 3)} opacity={0.6} />
            <path d="M 250 30 L 250 80" stroke="#a78bfa" strokeWidth={Math.max(1, Math.abs(b) * 3)} strokeDasharray="4,4" opacity={0.6} />
            <circle cx="100" cy="50" r="20" fill="#0f172a" stroke="#22d3ee" strokeWidth="2" style={{ boxShadow: `0 0 10px ${getGlow(x1)}` }} filter="url(#glow-neuron)" />
            <text x="100" y="55" fill="#fff" fontSize="12" textAnchor="middle" className="font-mono">x₁</text>
            <circle cx="100" cy="150" r="20" fill="#0f172a" stroke="#22d3ee" strokeWidth="2" filter="url(#glow-neuron)" />
            <text x="100" y="155" fill="#fff" fontSize="12" textAnchor="middle" className="font-mono">x₂</text>
            <circle cx="250" cy="20" r="15" fill="#0f172a" stroke="#a78bfa" strokeWidth="2" filter="url(#glow-neuron)" />
            <text x="250" y="24" fill="#fff" fontSize="10" textAnchor="middle" className="font-mono">b</text>
            <circle cx="250" cy="100" r="30" fill="#0f172a" stroke={a > 0 ? '#22d3ee' : '#475569'} strokeWidth="3" filter="url(#glow-neuron)" />
            <text x="250" y="95" fill="#fff" fontSize="12" textAnchor="middle" className="font-mono">Σ</text>
            <text x="250" y="115" fill="#94a3b8" fontSize="10" textAnchor="middle" className="font-mono">f(z)</text>
            <path d="M 280 100 L 360 100" stroke={a > 0 ? '#22d3ee' : '#475569'} strokeWidth={Math.max(1, Math.abs(a) * 4)} opacity={0.8} filter="url(#glow-neuron)" />
            <circle cx="360" cy="100" r="15" fill="#0f172a" stroke={a > 0 ? '#22d3ee' : '#475569'} strokeWidth="2" filter="url(#glow-neuron)" />
            <text x="360" y="104" fill="#fff" fontSize="12" textAnchor="middle" className="font-mono">a</text>
            <text x="160" y="65" fill={w1 >= 0 ? '#67e8f9' : '#fda4af'} fontSize="10" className="font-mono">w₁={w1.toFixed(1)}</text>
            <text x="160" y="145" fill={w2 >= 0 ? '#67e8f9' : '#fda4af'} fontSize="10" className="font-mono">w₂={w2.toFixed(1)}</text>
          </svg>
        </div>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-xs text-slate-400 font-mono flex justify-between"><span>x₁ (Input 1)</span> <span className="text-cyan-300">{x1.toFixed(2)}</span></label><input type="range" min="-2" max="2" step="0.1" value={x1} onChange={(e) => setX1(parseFloat(e.target.value))} className="w-full accent-cyan-400" /></div>
            <div className="space-y-1"><label className="text-xs text-slate-400 font-mono flex justify-between"><span>w₁ (Weight 1)</span> <span className={w1 >= 0 ? 'text-cyan-300' : 'text-pink-300'}>{w1.toFixed(2)}</span></label><input type="range" min="-2" max="2" step="0.1" value={w1} onChange={(e) => setW1(parseFloat(e.target.value))} className="w-full accent-cyan-400" /></div>
            <div className="space-y-1"><label className="text-xs text-slate-400 font-mono flex justify-between"><span>x₂ (Input 2)</span> <span className="text-cyan-300">{x2.toFixed(2)}</span></label><input type="range" min="-2" max="2" step="0.1" value={x2} onChange={(e) => setX2(parseFloat(e.target.value))} className="w-full accent-cyan-400" /></div>
            <div className="space-y-1"><label className="text-xs text-slate-400 font-mono flex justify-between"><span>w₂ (Weight 2)</span> <span className={w2 >= 0 ? 'text-cyan-300' : 'text-pink-300'}>{w2.toFixed(2)}</span></label><input type="range" min="-2" max="2" step="0.1" value={w2} onChange={(e) => setW2(parseFloat(e.target.value))} className="w-full accent-cyan-400" /></div>
            <div className="space-y-1 col-span-2"><label className="text-xs text-slate-400 font-mono flex justify-between"><span>b (Bias)</span> <span className="text-purple-300">{b.toFixed(2)}</span></label><input type="range" min="-2" max="2" step="0.1" value={b} onChange={(e) => setB(parseFloat(e.target.value))} className="w-full accent-purple-400" /></div>
          </div>
          <div className="mt-4 p-4 bg-slate-950 rounded border border-slate-800 font-mono text-sm space-y-2">
            <div className="flex justify-between"><span className="text-slate-400">1. Linear Combination (z):</span><span className="text-slate-300">z = (x₁·w₁) + (x₂·w₂) + b</span></div>
            <div className="flex justify-between text-cyan-200"><span></span><span>z = ({x1.toFixed(1)}·{w1.toFixed(1)}) + ({x2.toFixed(1)}·{w2.toFixed(1)}) + {b.toFixed(1)}</span></div>
            <div className="flex justify-between text-cyan-400 font-bold border-b border-slate-800 pb-2"><span></span><span>z = {z.toFixed(3)}</span></div>
            <div className="flex justify-between pt-2"><span className="text-slate-400">2. Activation (a):</span><span className="text-slate-300">a = {act}(z)</span></div>
            <div className="flex justify-between text-cyan-400 font-bold drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]"><span></span><span>a = {a.toFixed(3)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActivationCard = ({ name, formula, derivative, pathD, color }: any) => (
  <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-800 hover:border-slate-600 transition-colors flex flex-col gap-4">
    <h4 className="text-lg font-bold text-slate-200">{name}</h4>
    <div className="w-full aspect-square bg-slate-950 rounded-lg border border-slate-800 relative flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.5 }}></div>
      <div className="absolute w-full h-[1px] bg-slate-600 top-1/2"></div>
      <div className="absolute h-full w-[1px] bg-slate-600 left-1/2"></div>
      <svg viewBox="0 0 100 100" className="w-full h-full relative z-10 overflow-visible">
        <defs>
          <filter id={`glow-${name}`}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <path d={pathD} fill="none" stroke={color} strokeWidth="3" filter={`url(#glow-${name})`} />
      </svg>
    </div>
    <div className="font-mono text-sm space-y-2">
      <div className="flex justify-between"><span className="text-slate-500">f(x)</span><span className="text-slate-300">{formula}</span></div>
      <div className="flex justify-between"><span className="text-slate-500">f'(x)</span><span className="text-slate-300">{derivative}</span></div>
    </div>
  </div>
);

const BackpropAnimation = () => (
  <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-700 shadow-[0_0_20px_rgba(244,114,182,0.1)] overflow-hidden relative">
    <style>{`@keyframes flow-reverse { from { stroke-dashoffset: 20; } to { stroke-dashoffset: 0; } } .animate-flow-reverse { animation: flow-reverse 1s linear infinite; }`}</style>
    <h3 className="text-xl font-bold text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.5)] mb-4 flex items-center gap-2"><GitMerge size={20} /> The Chain Rule in Action</h3>
    <p className="text-slate-300 mb-6">Backpropagation computes the gradient of the loss function with respect to every weight by applying the chain rule backwards from the output.</p>
    <div className="w-full h-48 bg-slate-950 rounded-lg border border-slate-800 relative flex items-center justify-center">
      <svg viewBox="0 0 600 150" className="w-full h-full">
        <defs>
          <filter id="glow-pink-bp">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect x="50" y="50" width="80" height="50" rx="8" fill="#0f172a" stroke="#475569" strokeWidth="2" />
        <text x="90" y="80" fill="#fff" fontSize="14" textAnchor="middle" className="font-mono">Weight (w)</text>
        <rect x="250" y="50" width="80" height="50" rx="8" fill="#0f172a" stroke="#475569" strokeWidth="2" />
        <text x="290" y="80" fill="#fff" fontSize="14" textAnchor="middle" className="font-mono">Neuron (a)</text>
        <rect x="450" y="50" width="80" height="50" rx="8" fill="#0f172a" stroke="#475569" strokeWidth="2" />
        <text x="490" y="80" fill="#fff" fontSize="14" textAnchor="middle" className="font-mono">Loss (L)</text>
        <path d="M 130 65 L 250 65" stroke="#334155" strokeWidth="2" />
        <path d="M 330 65 L 450 65" stroke="#334155" strokeWidth="2" />
        <path d="M 450 85 L 330 85" stroke="#f472b6" strokeWidth="3" strokeDasharray="10,10" className="animate-flow-reverse" filter="url(#glow-pink-bp)" />
        <path d="M 250 85 L 130 85" stroke="#f472b6" strokeWidth="3" strokeDasharray="10,10" className="animate-flow-reverse" filter="url(#glow-pink-bp)" />
        <text x="390" y="115" fill="#f9a8d4" fontSize="14" textAnchor="middle" className="font-mono">∂L / ∂a</text>
        <text x="190" y="115" fill="#f9a8d4" fontSize="14" textAnchor="middle" className="font-mono">∂a / ∂w</text>
        <rect x="150" y="10" width="300" height="30" rx="4" fill="#1e293b" stroke="#f472b6" strokeWidth="1" opacity="0.8" />
        <text x="300" y="30" fill="#fbcfe8" fontSize="14" textAnchor="middle" className="font-mono">∂L/∂w = (∂L/∂a) × (∂a/∂w)</text>
      </svg>
    </div>
  </div>
);

function TheoryView() {
  const [theoryTab, setTheoryTab] = useState('forward');
  const TABS = [
    { id: 'forward', label: 'Forward Pass', icon: ChevronRight },
    { id: 'activations', label: 'Activations', icon: Activity },
    { id: 'loss', label: 'Loss & Gradients', icon: Calculator },
    { id: 'backprop', label: 'Backpropagation', icon: GitMerge },
  ];

  return (
    <div className="min-h-full bg-slate-950 text-slate-200 p-4 md:p-8 font-sans selection:bg-cyan-900 selection:text-cyan-100">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/50 border border-cyan-800/50 text-cyan-400 text-sm font-mono mb-4">
            <BookOpen size={16} /><span>Theory & Reference Module</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]">Neural Network Internals</h1>
          <p className="text-slate-400 text-lg max-w-2xl">Explore the mathematics that power multi-layer perceptrons. Interact with the formulas, visualize activation functions, and trace the flow of gradients.</p>
        </header>
        <nav className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = theoryTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setTheoryTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${isActive ? 'bg-cyan-950/50 text-cyan-300 border border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'bg-slate-900/50 text-slate-400 border border-transparent hover:bg-slate-800 hover:text-slate-200'}`}>
                <Icon size={18} />{tab.label}
              </button>
            );
          })}
        </nav>
        <main className="min-h-[600px]">
          {theoryTab === 'forward' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-slate-100">The Forward Pass</h2>
                  <p className="text-slate-300 leading-relaxed">The forward pass is how a neural network makes predictions. Data flows from the input layer, through hidden layers, to the output layer.</p>
                  <p className="text-slate-300 leading-relaxed">Inside each artificial neuron, two operations occur:</p>
                  <ul className="space-y-4 mt-4">
                    <li className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400 font-bold">1</div>
                      <div>
                        <strong className="text-slate-200 block mb-1">Linear Combination</strong>
                        <span className="text-slate-300">z = w₁x₁ + w₂x₂ + b</span>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-pink-950 border border-pink-500/50 flex items-center justify-center text-pink-400 font-bold">2</div>
                      <div>
                        <strong className="text-slate-200 block mb-1">Activation Function</strong>
                        <span className="text-slate-300">a = f(z)</span>
                      </div>
                    </li>
                  </ul>
                </div>
                <InteractiveNeuron />
              </div>
            </div>
          )}
          {theoryTab === 'activations' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ActivationCard name="ReLU" formula="max(0, x)" derivative="1 if x > 0 else 0" pathD="M 10 50 L 50 50 L 90 10" color="#22d3ee" />
              <ActivationCard name="Sigmoid" formula="1 / (1 + e^-x)" derivative="f(x)(1 - f(x))" pathD="M 10 90 C 40 90, 60 10, 90 10" color="#f472b6" />
              <ActivationCard name="Tanh" formula="(e^x - e^-x) / (e^x + e^-x)" derivative="1 - f(x)^2" pathD="M 10 90 C 30 90, 70 10, 90 10" color="#a855f7" />
            </div>
          )}
          {theoryTab === 'loss' && (
             <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <h3 className="text-xl font-bold text-cyan-400 mb-4">Loss & Gradients</h3>
               <p className="text-slate-300">Loss measures how far off the network's predictions are from the true labels. Gradients indicate the direction to adjust weights to minimize this loss.</p>
             </div>
          )}
          {theoryTab === 'backprop' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <BackpropAnimation />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// --- Main App Layout ---
export default function App() {
  const [activeModule, setActiveModule] = useState('hero');

  const modules = [
    { id: 'hero', label: 'Introduction', icon: Info },
    { id: 'core', label: 'Visualization', icon: Network },
    { id: 'controls', label: 'Controls', icon: Sliders },
    { id: 'analysis', label: 'Analysis', icon: Activity },
    { id: 'theory', label: 'Theory', icon: BookOpen },
  ];

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-50">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">
            NeuralNet Viewer
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {modules.map(m => (
            <button
              key={m.id}
              onClick={() => setActiveModule(m.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeModule === m.id
                  ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-800/50 shadow-[0_0_10px_rgba(34,211,238,0.1)]'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <m.icon size={18} />
              <span className="font-medium">{m.label}</span>
            </button>
          ))}
        </nav>
      </div>
      <div className="flex-1 overflow-y-auto relative bg-slate-950">
        {activeModule === 'hero' && <HeroView />}
        {activeModule === 'core' && <CoreView />}
        {activeModule === 'controls' && <ControlsView />}
        {activeModule === 'analysis' && <AnalysisView />}
        {activeModule === 'theory' && <TheoryView />}
      </div>
    </div>
  );
}