import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Play, Pause, SkipForward, RotateCcw, Activity, Database, 
  Network, Sliders, Zap, PowerOff, Home, Cpu, BarChart2, BookOpen 
} from 'lucide-react';

// --- Math & Tensor Utilities ---
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

// --- Activations ---
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

// --- Datasets ---
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
      X.push([cx + (Math.random()-0.5)*(noise+0.4), cy + (Math.random()-0.5)*(noise+0.4)]);
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

// --- Helper UI Components ---
const NeonSlider = ({ label, value, min, max, step, onChange, unit = '' }: any) => (
  <div className="flex flex-col space-y-2 w-full my-4">
    <div className="flex justify-between items-center">
      <label className="text-xs font-medium text-cyan-100 uppercase tracking-wider">{label}</label>
      <span className="text-sm font-mono text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">
        {value}{unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
        <Database size={14} className="text-cyan-500" />
        Dataset
      </label>
      <div className="flex gap-2">
        {datasets.map((ds) => (
          <button
            key={ds.id}
            onClick={() => onSelect(ds.id)}
            className={`flex-1 py-2 px-1 rounded-md text-xs font-bold transition-all duration-300 flex flex-col items-center gap-1 border ${
              selected === ds.id
                ? 'bg-cyan-950/50 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.4)]'
                : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-cyan-900 hover:text-cyan-700'
            }`}
          >
            <span className="text-lg">{ds.icon}</span>
            {ds.name}
          </button>
        ))}
      </div>
    </div>
  );
};

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

const MathBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg font-mono text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)] my-4 overflow-x-auto text-sm md:text-base">
    {children}
  </div>
);

// --- Main Application Component ---
export default function App() {
  // Navigation State
  const [activeModule, setActiveModule] = useState<'hero' | 'network' | 'controls' | 'analysis' | 'theory'>('hero');

  // Shared ML State
  const [datasetType, setDatasetType] = useState<string>('xor');
  const [noise, setNoise] = useState<number>(10);
  const [batchSize, setBatchSize] = useState<number>(16);
  const [hiddenNeurons, setHiddenNeurons] = useState<number>(4);
  const [activationName, setActivationName] = useState<keyof typeof activations>('tanh');
  const [learningRate, setLearningRate] = useState<number>(0.1);
  const [regularization, setRegularization] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [ablated, setAblated] = useState<Set<number>>(new Set());
  
  const [epoch, setEpoch] = useState(0);
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const [renderData, setRenderData] = useState<{
    W1: Matrix; W2: Matrix;
    nodeActs: { input: number[], hidden: number[], output: number[] };
    nodeGrads: { hidden: number[], output: number[] };
  } | null>(null);

  const ml = useRef({
    X: [] as Matrix,
    Y: [] as Matrix,
    W1: [] as Matrix,
    b1: [] as Matrix,
    W2: [] as Matrix,
    b2: [] as Matrix,
    epoch: 0,
    lossHistory: [] as number[],
  });

  const animationRef = useRef<number>();

  // Hoisted from renderHero / renderAnalysis / renderTheory (hooks must live at component level)
  const heroCanvasRef = useRef<HTMLCanvasElement>(null);
  const [heroMousePos, setHeroMousePos] = useState({ x: -1000, y: -1000 });
  const analysisCanvasRef = useRef<HTMLCanvasElement>(null);
  const [theoryActiveTab, setTheoryActiveTab] = useState('architecture');

  // Initialize Network
  const initNetwork = useCallback(() => {
    const { X, Y } = generateDataset(datasetType, 200, noise);
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
  }, [datasetType, hiddenNeurons, noise]);

  useEffect(() => {
    initNetwork();
  }, [initNetwork]);

  // Hero canvas animation (hoisted from renderHero)
  useEffect(() => {
    const canvas = heroCanvasRef.current;
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
        const dxMouse = particles[i].x - heroMousePos.x;
        const dyMouse = particles[i].y - heroMousePos.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        if (distMouse < 200) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(heroMousePos.x, heroMousePos.y);
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
      particles.forEach(p => { p.update(); p.draw(ctx); });
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [heroMousePos]);

  // Analysis decision boundary canvas (hoisted from renderAnalysis)
  const lossPath = useMemo(() => {
    if (lossHistory.length === 0) return '';
    const width = 400;
    const height = 150;
    const dx = width / 100;
    const maxLoss = Math.max(1, ...lossHistory);
    return lossHistory.reduce((path, loss, i) => {
      const x = i * dx;
      const y = height - (loss / maxLoss) * height;
      return i === 0 ? `M ${x} ${y}` : `${path} L ${x} ${y}`;
    }, '');
  }, [lossHistory]);

  useEffect(() => {
    const canvas = analysisCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.createImageData(width, height);

    const { W1, b1, W2, b2 } = ml.current;
    if (!W1 || W1.length === 0) return;

    const act = activations[activationName].f;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nx = (x / width) * 2 - 1;
        const ny = (y / height) * 2 - 1;

        let z2 = b2[0][0];
        for (let j = 0; j < hiddenNeurons; j++) {
          if (ablated.has(j)) continue;
          let z1 = nx * W1[0][j] + ny * W1[1][j] + b1[0][j];
          let a1 = act(z1);
          z2 += a1 * W2[j][0];
        }
        let pred = 1 / (1 + Math.exp(-z2));

        const idx = (y * width + x) * 4;
        imageData.data[idx] = Math.floor(pred * 236 + (1 - pred) * 6);
        imageData.data[idx + 1] = Math.floor(pred * 72 + (1 - pred) * 182);
        imageData.data[idx + 2] = Math.floor(pred * 153 + (1 - pred) * 212);
        imageData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, [epoch, ablated, activationName, hiddenNeurons]);

  // Training Step
  const trainStep = useCallback(() => {
    const { X, Y, W1, b1, W2, b2 } = ml.current;
    const N = X.length;
    const act = activations[activationName];

    // Forward Pass
    let Z1 = mat.add(mat.dot(X, W1), b1);
    if (ablated.size > 0) {
      Z1 = Z1.map(row => row.map((val, j) => ablated.has(j) ? 0 : val));
    }
    let A1 = mat.map(Z1, act.f);
    let Z2 = mat.add(mat.dot(A1, W2), b2);
    let A2 = mat.map(Z2, activations.sigmoid.f);

    // Loss (BCE)
    let loss = 0;
    for (let i = 0; i < N; i++) {
      const y = Y[i][0];
      const yHat = Math.max(Math.min(A2[i][0], 0.9999), 0.0001);
      loss += -(y * Math.log(yHat) + (1 - y) * Math.log(1 - yHat));
    }
    
    // Regularization
    if (regularization > 0) {
      let regLoss = 0;
      for(let i=0; i<W1.length; i++) for(let j=0; j<W1[0].length; j++) regLoss += W1[i][j]*W1[i][j];
      for(let i=0; i<W2.length; i++) for(let j=0; j<W2[0].length; j++) regLoss += W2[i][j]*W2[i][j];
      loss += (regularization / (2*N)) * regLoss;
    }
    loss /= N;

    // Backward Pass
    const dZ2 = mat.sub(A2, Y); 
    let dW2 = mat.scale(mat.dot(mat.transpose(A1), dZ2), 1 / N);
    const db2 = mat.scale(mat.sumAxis0(dZ2), 1 / N);

    let dA1 = mat.dot(dZ2, mat.transpose(W2));
    let dZ1 = mat.mul(dA1, mat.map(Z1, act.df));

    if (ablated.size > 0) {
      dZ1 = dZ1.map(row => row.map((val, j) => ablated.has(j) ? 0 : val));
    }

    let dW1 = mat.scale(mat.dot(mat.transpose(X), dZ1), 1 / N);
    const db1 = mat.scale(mat.sumAxis0(dZ1), 1 / N);

    if (regularization > 0) {
      dW2 = mat.add(dW2, mat.scale(W2, regularization/N));
      dW1 = mat.add(dW1, mat.scale(W1, regularization/N));
    }

    // Update Weights
    ml.current.W1 = mat.sub(W1, mat.scale(dW1, learningRate));
    ml.current.b1 = mat.sub(b1, mat.scale(db1, learningRate));
    ml.current.W2 = mat.sub(W2, mat.scale(dW2, learningRate));
    ml.current.b2 = mat.sub(b2, mat.scale(db2, learningRate));
    ml.current.epoch += 1;
    ml.current.lossHistory.push(loss);

    if (ml.current.lossHistory.length > 100) {
      ml.current.lossHistory.shift();
    }

    return { A1, A2, dZ1, dZ2 };
  }, [activationName, learningRate, ablated, regularization]);

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
      if (frameCount % 4 === 0) {
        updateRenderState(actsAndGrads);
      }
      animationRef.current = requestAnimationFrame(loop);
    };
    animationRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, trainStep, updateRenderState]);

  const handleStep = () => {
    const actsAndGrads = trainStep();
    updateRenderState(actsAndGrads);
  };

  const handleReset = () => {
    setIsPlaying(false);
    initNetwork();
  };

  const toggleAblation = (index: number) => {
    setAblated(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // --- Render Modules ---

  const renderHero = () => {
    // heroCanvasRef, heroMousePos, setHeroMousePos and the useEffect are hoisted to App level
    return (
      <div
        className="relative h-full w-full overflow-hidden bg-slate-950 flex items-center justify-center"
        onMouseMove={(e) => setHeroMousePos({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY })}
        onMouseLeave={() => setHeroMousePos({ x: -1000, y: -1000 })}
      >
        <canvas ref={heroCanvasRef} className="absolute inset-0 z-0 pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto">
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
          <button 
            onClick={() => setActiveModule('network')}
            className="group relative px-8 py-4 bg-transparent overflow-hidden rounded-lg border border-cyan-500/50 hover:border-cyan-400 transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]"
          >
            <div className="absolute inset-0 bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors duration-300"></div>
            <span className="relative text-cyan-300 font-semibold tracking-wide flex items-center justify-center gap-2">
              Launch Viewer
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
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
  };

  const renderNetwork = () => {
    if (!renderData) return <div className="p-8 text-slate-400">Initializing...</div>;
    const { W1, W2, nodeActs } = renderData;

    const width = 800;
    const height = 500;
    const layerX = [150, 400, 650];
    const inputY = [height/2 - 60, height/2 + 60];
    const hiddenY = Array.from({length: hiddenNeurons}, (_, i) => 
      height/2 + (i - (hiddenNeurons-1)/2) * (400 / Math.max(hiddenNeurons, 2))
    );
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
      <div className="h-full w-full flex flex-col p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">Network Architecture</h2>
          <div className="flex gap-4 items-center">
            <div className="text-xs text-slate-500 uppercase">Epoch <span className="text-cyan-400 font-mono text-lg ml-2">{epoch.toString().padStart(5, '0')}</span></div>
            <button onClick={handleReset} className="p-2 text-slate-400 hover:text-cyan-400 bg-slate-900 rounded"><RotateCcw size={16}/></button>
            <button onClick={handleStep} className="p-2 text-slate-400 hover:text-cyan-400 bg-slate-900 rounded"><SkipForward size={16}/></button>
            <button onClick={() => setIsPlaying(!isPlaying)} className={`px-4 py-2 rounded font-bold text-sm ${isPlaying ? 'bg-fuchsia-900/50 text-fuchsia-400' : 'bg-cyan-900/50 text-cyan-400'}`}>
              {isPlaying ? 'PAUSE' : 'TRAIN'}
            </button>
          </div>
        </div>
        <div className="flex-1 bg-slate-900/50 rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full max-w-4xl">
            {inputY.map((y1, i) => 
              hiddenY.map((y2, j) => {
                const isAblated = ablated.has(j);
                const weight = W1[i][j];
                return (
                  <line 
                    key={`w1-${i}-${j}`}
                    x1={layerX[0]} y1={y1} x2={layerX[1]} y2={y2}
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
                  key={`w2-${j}-0`}
                  x1={layerX[1]} y1={y1} x2={layerX[2]} y2={outputY[0]}
                  stroke={isAblated ? '#374151' : getEdgeColor(weight)}
                  strokeWidth={isAblated ? 1 : Math.max(1, Math.abs(weight) * 3)}
                  className="transition-all duration-200"
                />
              );
            })}
            
            {/* Input Nodes */}
            {inputY.map((y, i) => (
              <g key={`in-${i}`}>
                <circle cx={layerX[0]} cy={y} r={15} fill="#0f172a" stroke="#06b6d4" strokeWidth={2} style={{ filter: getNodeGlow(nodeActs.input[i], false) }} />
                <text x={layerX[0]-30} y={y+5} fill="#06b6d4" fontSize="12" className="font-mono">X{i+1}</text>
              </g>
            ))}
            
            {/* Hidden Nodes */}
            {hiddenY.map((y, i) => {
              const isAblated = ablated.has(i);
              return (
                <g key={`hid-${i}`} onClick={() => toggleAblation(i)} className="cursor-pointer">
                  <circle cx={layerX[1]} cy={y} r={15} fill="#0f172a" stroke={isAblated ? '#ef4444' : '#06b6d4'} strokeWidth={2} style={{ filter: getNodeGlow(nodeActs.hidden[i], isAblated) }} />
                  {isAblated && <line x1={layerX[1]-10} y1={y-10} x2={layerX[1]+10} y2={y+10} stroke="#ef4444" strokeWidth={2} />}
                </g>
              );
            })}

            {/* Output Node */}
            <g>
              <circle cx={layerX[2]} cy={outputY[0]} r={15} fill="#0f172a" stroke="#06b6d4" strokeWidth={2} style={{ filter: getNodeGlow(nodeActs.output[0], false) }} />
              <text x={layerX[2]+25} y={outputY[0]+5} fill="#06b6d4" fontSize="12" className="font-mono">Y</text>
            </g>
          </svg>
        </div>
        <div className="mt-4 text-center text-sm text-slate-500">Click a hidden neuron to ablate (freeze) it. Orange edges are positive weights, cyan are negative.</div>
      </div>
    );
  };

  const renderControls = () => (
    <div className="h-full w-full p-6 overflow-y-auto">
      <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 mb-6">Hyperparameters & Data</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 mb-4 text-cyan-400 border-b border-slate-800 pb-2">
            <Database size={16} />
            <h2 className="text-sm font-semibold uppercase tracking-wider">Data Source</h2>
          </div>
          <DatasetSelector selected={datasetType} onSelect={(val: string) => { setDatasetType(val); initNetwork(); }} />
          <NeonSlider label="Noise Level" value={noise} min={0} max={50} step={1} onChange={(val: number) => { setNoise(val); initNetwork(); }} unit="%" />
          <NeonSlider label="Batch Size" value={batchSize} min={1} max={64} step={1} onChange={setBatchSize} />
        </div>

        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 mb-4 text-cyan-400 border-b border-slate-800 pb-2">
            <Network size={16} />
            <h2 className="text-sm font-semibold uppercase tracking-wider">Architecture</h2>
          </div>
          <NeonSlider 
            label="Hidden Neurons" 
            value={hiddenNeurons} min={1} max={8} step={1} 
            onChange={(val: number) => { setHiddenNeurons(val); initNetwork(); }} 
          />
          <NeonSelect 
            label="Activation" icon={Activity} value={activationName} onChange={setActivationName}
            options={[
              { value: 'relu', label: 'ReLU' },
              { value: 'tanh', label: 'Tanh' },
              { value: 'sigmoid', label: 'Sigmoid' },
              { value: 'linear', label: 'Linear' }
            ]} 
          />
          <div className="mt-6 p-4 bg-slate-950/50 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-medium text-fuchsia-300 uppercase tracking-wider flex items-center gap-2">
                <PowerOff size={12} /> Neuron Ablation
              </label>
            </div>
            <div className="flex justify-center gap-3 flex-wrap">
              {Array.from({ length: hiddenNeurons }).map((_, i) => {
                const isFrozen = ablated.has(i);
                return (
                  <button
                    key={i} onClick={() => toggleAblation(i)}
                    className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isFrozen ? 'bg-slate-900 border-2 border-fuchsia-900/50 text-fuchsia-700' : 'bg-cyan-950 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-900'
                    }`}
                  >
                    <span className="text-xs font-mono font-bold">{i + 1}</span>
                    {isFrozen && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-full h-0.5 bg-fuchsia-600 rotate-45"></div></div>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 mb-4 text-cyan-400 border-b border-slate-800 pb-2">
            <Sliders size={16} />
            <h2 className="text-sm font-semibold uppercase tracking-wider">Hyperparameters</h2>
          </div>
          <div className="flex flex-col space-y-2 w-full mt-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-cyan-100 uppercase tracking-wider flex items-center gap-2">
                <Zap size={12} className="text-cyan-500" /> Learning Rate
              </label>
              <span className="text-sm font-mono text-cyan-400">{learningRate.toFixed(4)}</span>
            </div>
            <input
              type="range" min="-4" max="0" step="0.1" value={Math.log10(learningRate)}
              onChange={(e) => setLearningRate(Math.pow(10, parseFloat(e.target.value)))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
          <NeonSelect 
            label="Regularization" value={regularization.toString()} onChange={(val: string) => setRegularization(parseFloat(val))}
            options={[
              { value: '0', label: 'None' },
              { value: '0.001', label: 'L2 (0.001)' },
              { value: '0.01', label: 'L2 (0.01)' },
              { value: '0.1', label: 'L2 (0.1)' }
            ]} 
          />
        </div>
      </div>
    </div>
  );

  const renderAnalysis = () => {
    // analysisCanvasRef, lossPath, and the useEffect are hoisted to App level
    const currentLoss = lossHistory.length > 0 ? lossHistory[lossHistory.length - 1].toFixed(4) : '1.0000';

    return (
      <div className="h-full w-full p-6 overflow-y-auto">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">Analysis & Output</h2>
          <div className="flex gap-4 items-center">
            <div className="text-xs text-slate-500 uppercase">Epoch <span className="text-cyan-400 font-mono text-lg ml-2">{epoch.toString().padStart(5, '0')}</span></div>
            <button onClick={() => setIsPlaying(!isPlaying)} className={`px-4 py-2 rounded font-bold text-sm ${isPlaying ? 'bg-pink-900/50 text-pink-400' : 'bg-green-900/50 text-green-400'}`}>
              {isPlaying ? 'PAUSE' : 'RESUME'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    <GlowFilter id="glow-green" color="#4ade80" />
                  </defs>
                  {[0, 1].map((inputIdx) =>
                    Array.from({length: hiddenNeurons}).map((_, hiddenIdx) => {
                      const isAblated = ablated.has(hiddenIdx);
                      const gradMag = renderData ? renderData.nodeGrads.hidden[hiddenIdx] : 0;
                      return (
                        <path
                          key={`w1-${inputIdx}-${hiddenIdx}`}
                          d={`M 100 ${75 + inputIdx * 50} C 200 ${75 + inputIdx * 50}, 200 ${25 + hiddenIdx * (150/Math.max(1, hiddenNeurons-1))}, 300 ${25 + hiddenIdx * (150/Math.max(1, hiddenNeurons-1))}`}
                          fill="none" stroke={isAblated ? '#1f2937' : '#ec4899'}
                          strokeWidth={isAblated ? 1 : 1 + gradMag * 10}
                          strokeOpacity={isAblated ? 0.3 : 0.4 + gradMag * 2}
                          filter={!isAblated && gradMag > 0.05 ? 'url(#glow-pink)' : ''}
                          strokeDasharray="5, 5"
                          className={!isAblated && isPlaying ? 'animate-[dash_1s_linear_infinite_reverse]' : ''}
                        />
                      );
                    })
                  )}
                  {Array.from({length: hiddenNeurons}).map((_, hiddenIdx) => {
                    const isAblated = ablated.has(hiddenIdx);
                    const gradMag = renderData ? renderData.nodeGrads.output[0] : 0;
                    return (
                      <path
                        key={`w2-${hiddenIdx}`}
                        d={`M 300 ${25 + hiddenIdx * (150/Math.max(1, hiddenNeurons-1))} C 400 ${25 + hiddenIdx * (150/Math.max(1, hiddenNeurons-1))}, 400 100, 500 100`}
                        fill="none" stroke={isAblated ? '#1f2937' : '#06b6d4'}
                        strokeWidth={isAblated ? 1 : 1 + gradMag * 10}
                        strokeOpacity={isAblated ? 0.3 : 0.5 + gradMag * 2}
                        filter={!isAblated && gradMag > 0.05 ? 'url(#glow-cyan)' : ''}
                        strokeDasharray="8, 8"
                        className={!isAblated && isPlaying ? 'animate-[dash_1s_linear_infinite_reverse]' : ''}
                      />
                    );
                  })}
                  {[0, 1].map((i) => (
                    <g key={`in-${i}`} transform={`translate(100, ${75 + i * 50})`}>
                      <circle r="12" fill="#111827" stroke="#4ade80" strokeWidth="2" filter="url(#glow-green)" />
                      <text x="-25" y="4" fill="#4ade80" fontSize="10" className="opacity-70">X{i}</text>
                    </g>
                  ))}
                  {Array.from({length: hiddenNeurons}).map((_, i) => {
                    const isAblated = ablated.has(i);
                    return (
                      <g key={`h-${i}`} transform={`translate(300, ${25 + i * (150/Math.max(1, hiddenNeurons-1))})`}>
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
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex flex-col">
              <h2 className="text-sm uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span> Decision Boundary
              </h2>
              <div className="flex-1 flex items-center justify-center bg-black rounded-lg border border-slate-800 p-2 relative">
                <canvas ref={analysisCanvasRef} width={80} height={80} className="w-full aspect-square rounded shadow-[0_0_20px_rgba(6,182,212,0.15)]" style={{ imageRendering: 'pixelated' }} />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-full h-[1px] bg-white/10 absolute"></div>
                  <div className="h-full w-[1px] bg-white/10 absolute"></div>
                </div>
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
    // theoryActiveTab / setTheoryActiveTab are hoisted to App level
    const activeTab = theoryActiveTab;
    const TABS = [
      { id: 'architecture', title: 'Architecture', icon: '🧠' },
      { id: 'forward', title: 'Forward Pass', icon: '➡️' },
      { id: 'activations', title: 'Activations', icon: '⚡' },
      { id: 'backprop', title: 'Backpropagation', icon: '⬅️' },
      { id: 'loss', title: 'Loss & Gradients', icon: '📉' }
    ];

    return (
      <div className="h-full w-full p-6 overflow-y-auto flex justify-center">
        <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-12 border-b border-slate-800 pb-4 mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 tracking-tight">Theory & Reference</h1>
              <p className="text-slate-400 mt-1 text-sm font-mono">Neural Net Forward/Backward Viewer</p>
            </div>
          </div>
          <div className="md:col-span-3 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
            {TABS.map((tab) => (
              <button
                key={tab.id} onClick={() => setActiveTheoryTab(tab.id)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-300 min-w-max md:min-w-full ${
                  activeTab === tab.id ? 'bg-slate-800/80 border-l-4 border-cyan-400 text-cyan-300' : 'bg-slate-900/50 border-l-4 border-transparent text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span className="font-semibold text-sm tracking-wide">{tab.title}</span>
              </button>
            ))}
          </div>
          <div className="md:col-span-9 bg-slate-900/40 border border-slate-800 rounded-xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
            {activeTab === 'architecture' && (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-bold text-white mb-4">Multi-Layer Perceptron (MLP)</h2>
                <p className="text-slate-300 leading-relaxed mb-4">A single hidden-layer MLP is the simplest form of a deep neural network. It consists of three parts:</p>
                <ul className="space-y-3 text-slate-400 list-disc pl-5">
                  <li><span className="text-cyan-400 font-bold">Input Layer:</span> Features fed into the network (e.g., x, y coordinates).</li>
                  <li><span className="text-purple-400 font-bold">Hidden Layer:</span> Neurons that apply linear transformations followed by non-linear activations.</li>
                  <li><span className="text-pink-400 font-bold">Output Layer:</span> Produces the final prediction.</li>
                </ul>
              </div>
            )}
            {activeTab === 'forward' && (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-bold text-white mb-4">The Forward Pass</h2>
                <p className="text-slate-300 leading-relaxed mb-4">Data flows from left to right. Each neuron computes a weighted sum of its inputs, adds a bias, and passes the result through an activation function.</p>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg text-purple-400 font-semibold mb-2">1. Hidden Layer Calculation</h3>
                    <MathBlock>
                      <div className="mb-2 text-slate-400"># Linear Step</div>
                      Z<sup className="text-xs">(1)</sup> = W<sup className="text-xs">(1)</sup> · X + b<sup className="text-xs">(1)</sup><br /><br />
                      <div className="mb-2 text-slate-400"># Activation Step</div>
                      A<sup className="text-xs">(1)</sup> = f(Z<sup className="text-xs">(1)</sup>)
                    </MathBlock>
                  </div>
                  <div>
                    <h3 className="text-lg text-pink-400 font-semibold mb-2">2. Output Layer Calculation</h3>
                    <MathBlock>
                      <div className="mb-2 text-slate-400"># Linear Step</div>
                      Z<sup className="text-xs">(2)</sup> = W<sup className="text-xs">(2)</sup> · A<sup className="text-xs">(1)</sup> + b<sup className="text-xs">(2)</sup><br /><br />
                      <div className="mb-2 text-slate-400"># Final Prediction</div>
                      Y<sub className="text-xs">pred</sub> = σ(Z<sup className="text-xs">(2)</sup>)
                    </MathBlock>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'activations' && (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-bold text-white mb-4">Activation Functions</h2>
                <p className="text-slate-300 leading-relaxed mb-4">Without activation functions, neural networks would just be linear regression models. Non-linearities allow them to warp space and solve complex problems.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-slate-800/50 p-4 rounded border border-cyan-500/30">
                    <h4 className="text-cyan-400 font-bold mb-2">ReLU</h4>
                    <p className="text-xs text-slate-400 font-mono mb-2">f(x) = max(0, x)</p>
                    <p className="text-sm text-slate-300">Standard for hidden layers. Fast to compute, prevents vanishing gradients.</p>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded border border-pink-500/30">
                    <h4 className="text-pink-400 font-bold mb-2">Sigmoid</h4>
                    <p className="text-xs text-slate-400 font-mono mb-2">f(x) = 1 / (1 + e^-x)</p>
                    <p className="text-sm text-slate-300">Squashes values to [0, 1]. Great for binary classification outputs.</p>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded border border-purple-500/30">
                    <h4 className="text-purple-400 font-bold mb-2">Tanh</h4>
                    <p className="text-xs text-slate-400 font-mono mb-2">f(x) = (e^x - e^-x)/(e^x + e^-x)</p>
                    <p className="text-sm text-slate-300">Squashes to [-1, 1]. Often performs better than sigmoid in hidden layers.</p>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'backprop' && (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-bold text-white mb-4">Backpropagation</h2>
                <p className="text-slate-300 leading-relaxed mb-4">Backprop is how the network learns. It propagates the error backwards from the output layer to the input layer using the Chain Rule of Calculus.</p>
                <MathBlock>
                  <div className="mb-2 text-pink-400"># 1. Error at Output</div>
                  δ<sup className="text-xs">(2)</sup> = dL/dZ<sup className="text-xs">(2)</sup> = Y<sub className="text-xs">pred</sub> - Y<sub className="text-xs">true</sub><br /><br />
                  <div className="mb-2 text-purple-400"># 2. Output Gradients</div>
                  ∂L/∂W<sup className="text-xs">(2)</sup> = δ<sup className="text-xs">(2)</sup> · (A<sup className="text-xs">(1)</sup>)<sup className="text-xs">T</sup><br /><br />
                  <div className="mb-2 text-cyan-400"># 3. Error at Hidden</div>
                  δ<sup className="text-xs">(1)</sup> = (W<sup className="text-xs">(2)T</sup> · δ<sup className="text-xs">(2)</sup>) ⊙ f'(Z<sup className="text-xs">(1)</sup>)<br /><br />
                  <div className="mb-2 text-cyan-300"># 4. Hidden Gradients</div>
                  ∂L/∂W<sup className="text-xs">(1)</sup> = δ<sup className="text-xs">(1)</sup> · X<sup className="text-xs">T</sup>
                </MathBlock>
              </div>
            )}
            {activeTab === 'loss' && (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-bold text-white mb-4">Loss Functions & Optimization</h2>
                <p className="text-slate-300 leading-relaxed mb-4">The Loss Function defines "how wrong" the network is. The optimizer adjusts the weights to minimize this loss over time.</p>
                <h3 className="text-lg text-pink-400 font-semibold mt-6 mb-2">Binary Cross-Entropy Loss</h3>
                <MathBlock>L = - [ y · log(ŷ) + (1 - y) · log(1 - ŷ) ]</MathBlock>
                <h3 className="text-lg text-cyan-400 font-semibold mt-6 mb-2">Gradient Descent Update</h3>
                <MathBlock>
                  W<sub className="text-xs">new</sub> = W<sub className="text-xs">old</sub> - η · (∂L/∂W)<br />
                  b<sub className="text-xs">new</sub> = b<sub className="text-xs">old</sub> - η · (∂L/∂b)
                </MathBlock>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans selection:bg-cyan-500/30">
      {/* Sidebar Navigation */}
      <div className="w-20 md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-20">
        <div className="p-4 border-b border-slate-800 flex items-center justify-center md:justify-start gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-500 to-fuchsia-500 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.5)]">
            <Network size={18} className="text-white" />
          </div>
          <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 hidden md:block">NN Viewer</span>
        </div>
        <nav className="flex-1 py-4 flex flex-col gap-2 px-2">
          {[
            { id: 'hero', icon: Home, label: 'Introduction' },
            { id: 'network', icon: Cpu, label: 'Network Graph' },
            { id: 'controls', icon: Sliders, label: 'Controls' },
            { id: 'analysis', icon: BarChart2, label: 'Analysis' },
            { id: 'theory', icon: BookOpen, label: 'Theory' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id as any)}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                activeModule === item.id 
                  ? 'bg-slate-800 text-cyan-400 shadow-[inset_2px_0_0_#22d3ee]' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <item.icon size={20} className="min-w-[20px]" />
              <span className="hidden md:block text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Area — always render all modules, use CSS to show/hide so canvas refs stay mounted */}
      <div className="flex-1 relative overflow-hidden bg-slate-950">
        <div className={activeModule === 'hero' ? 'h-full' : 'hidden'}>{renderHero()}</div>
        <div className={activeModule === 'network' ? 'h-full' : 'hidden'}>{renderNetwork()}</div>
        <div className={activeModule === 'controls' ? 'h-full' : 'hidden'}>{renderControls()}</div>
        <div className={activeModule === 'analysis' ? 'h-full' : 'hidden'}>{renderAnalysis()}</div>
        <div className={activeModule === 'theory' ? 'h-full' : 'hidden'}>{renderTheory()}</div>
      </div>
    </div>
  );
}