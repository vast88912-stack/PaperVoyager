import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, StepForward, RotateCcw, Activity, Network, MousePointerClick, ChevronRight } from 'lucide-react';

// --- MATH & ML UTILS ---
type ActivationFunction = 'relu' | 'sigmoid' | 'tanh';

const Activations = {
  relu: (x: number) => Math.max(0, x),
  sigmoid: (x: number) => 1 / (1 + Math.exp(-x)),
  tanh: (x: number) => Math.tanh(x),
};

const Derivatives = {
  relu: (x: number) => (x > 0 ? 1 : 0),
  sigmoid: (x: number) => {
    const s = Activations.sigmoid(x);
    return s * (1 - s);
  },
  tanh: (x: number) => {
    const t = Math.tanh(x);
    return 1 - t * t;
  },
};

const randomWeight = () => (Math.random() * 2 - 1) * 0.5;

// --- DATASETS ---
type DatasetType = 'xor' | 'blobs' | 'spiral';

function generateData(type: DatasetType, numPoints = 200): { X: number[][]; Y: number[][] } {
  const X: number[][] = [];
  const Y: number[][] = [];

  for (let i = 0; i < numPoints; i++) {
    if (type === 'xor') {
      const x1 = Math.random() * 2 - 1;
      const x2 = Math.random() * 2 - 1;
      const label = x1 * x2 > 0 ? 1 : 0;
      // Add a little noise
      X.push([x1 + (Math.random() - 0.5) * 0.2, x2 + (Math.random() - 0.5) * 0.2]);
      Y.push([label]);
    } else if (type === 'blobs') {
      const label = Math.random() > 0.5 ? 1 : 0;
      const center = label === 1 ? [0.6, 0.6] : [-0.6, -0.6];
      X.push([
        center[0] + (Math.random() - 0.5) * 0.8,
        center[1] + (Math.random() - 0.5) * 0.8,
      ]);
      Y.push([label]);
    } else if (type === 'spiral') {
      const label = Math.random() > 0.5 ? 1 : 0;
      const r = (i / numPoints) * 1.5 + 0.1;
      const t = 1.25 * r * Math.PI + (label === 1 ? Math.PI : 0);
      X.push([
        r * Math.sin(t) + (Math.random() - 0.5) * 0.1,
        r * Math.cos(t) + (Math.random() - 0.5) * 0.1,
      ]);
      Y.push([label]);
    }
  }
  return { X, Y };
}

// --- TYPES ---
interface Weights {
  W1: number[][];
  b1: number[];
  W2: number[][];
  b2: number[];
}

interface ForwardCache {
  Z1: number[][];
  A1: number[][];
  Z2: number[][];
  A2: number[][];
}

// --- MAIN COMPONENT ---
export default function App() {
  // State: Settings
  const [hiddenSize, setHiddenSize] = useState<number>(4);
  const [activation, setActivation] = useState<ActivationFunction>('relu');
  const [datasetType, setDatasetType] = useState<DatasetType>('xor');
  const [learningRate, setLearningRate] = useState<number>(0.1);

  // State: ML Data
  const [data, setData] = useState(() => generateData('xor'));
  const [weights, setWeights] = useState<Weights | null>(null);
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const [epoch, setEpoch] = useState(0);
  const [ablatedNeurons, setAblatedNeurons] = useState<Set<number>>(new Set());

  // State: App/Anim
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1); // 1 = slow visual, 10 = fast train
  const [phase, setPhase] = useState<'idle' | 'forward' | 'backward'>('idle');

  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // Initialize weights
  const resetNetwork = useCallback(() => {
    const W1 = Array(2).fill(0).map(() => Array(hiddenSize).fill(0).map(randomWeight));
    const b1 = Array(hiddenSize).fill(0);
    const W2 = Array(hiddenSize).fill(0).map(() => [randomWeight()]);
    const b2 = [0];

    setWeights({ W1, b1, W2, b2 });
    setEpoch(0);
    setLossHistory([]);
    setAblatedNeurons(new Set());
    setPhase('idle');
  }, [hiddenSize]);

  // Handle Dataset Change
  useEffect(() => {
    setData(generateData(datasetType));
    resetNetwork();
  }, [datasetType, resetNetwork]);

  // Handle Settings Change
  useEffect(() => {
    resetNetwork();
  }, [hiddenSize, resetNetwork]);

  // Core Forward Pass
  const forwardPass = useCallback((X: number[][], currentWeights: Weights) => {
    const { W1, b1, W2, b2 } = currentWeights;
    const actFn = Activations[activation];

    // Z1 = X * W1 + b1
    const Z1 = X.map((x) =>
      W1[0].map((_, j) => x[0] * W1[0][j] + x[1] * W1[1][j] + b1[j])
    );
    // A1 = act(Z1) with Ablation
    const A1 = Z1.map((row) =>
      row.map((val, j) => (ablatedNeurons.has(j) ? 0 : actFn(val)))
    );
    // Z2 = A1 * W2 + b2
    const Z2 = A1.map(
      (a) => [a.reduce((sum, val, j) => sum + val * W2[j][0], 0) + b2[0]]
    );
    // A2 = sigmoid(Z2) [binary classification]
    const A2 = Z2.map((z) => [Activations.sigmoid(z[0])]);

    return { Z1, A1, Z2, A2 };
  }, [activation, ablatedNeurons]);

  // Core Backward Pass & Update
  const trainStep = useCallback(() => {
    if (!weights) return;

    setWeights((prev) => {
      if (!prev) return prev;
      const { X, Y } = data;
      const N = X.length;

      // Forward
      const { Z1, A1, Z2, A2 } = forwardPass(X, prev);

      // Loss (Binary Cross Entropy)
      let currentLoss = 0;
      for (let i = 0; i < N; i++) {
        const y = Y[i][0];
        const a = Math.max(Math.min(A2[i][0], 1 - 1e-8), 1e-8);
        currentLoss += -(y * Math.log(a) + (1 - y) * Math.log(1 - a));
      }
      currentLoss /= N;

      setLossHistory((hist) => [...hist.slice(-99), currentLoss]);
      setEpoch((e) => e + 1);

      // Backprop
      const actDeriv = Derivatives[activation];

      // dZ2 = A2 - Y (Derivative of BCE with Sigmoid)
      const dZ2 = A2.map((a, i) => [(a[0] - Y[i][0]) / N]);

      // dW2 = A1^T * dZ2
      const dW2 = Array(hiddenSize).fill(0).map(() => [0]);
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < hiddenSize; j++) {
          dW2[j][0] += A1[i][j] * dZ2[i][0];
        }
      }
      const db2 = [dZ2.reduce((sum, val) => sum + val[0], 0)];

      // dA1 = dZ2 * W2^T
      const dA1 = dZ2.map((dz) => prev.W2.map((w) => dz[0] * w[0]));

      // dZ1 = dA1 * act'(Z1)
      const dZ1 = dA1.map((row, i) =>
        row.map((da, j) =>
          ablatedNeurons.has(j) ? 0 : da * actDeriv(Z1[i][j])
        )
      );

      // dW1 = X^T * dZ1
      const dW1 = [Array(hiddenSize).fill(0), Array(hiddenSize).fill(0)];
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < hiddenSize; j++) {
          dW1[0][j] += X[i][0] * dZ1[i][j];
          dW1[1][j] += X[i][1] * dZ1[i][j];
        }
      }
      const db1 = dZ1[0].map((_, j) => dZ1.reduce((sum, row) => sum + row[j], 0));

      // Update Weights (SGD)
      const W1_new = prev.W1.map((row, i) => row.map((w, j) => w - learningRate * dW1[i][j]));
      const b1_new = prev.b1.map((b, j) => b - learningRate * db1[j]);
      const W2_new = prev.W2.map((row, j) => [row[0] - learningRate * dW2[j][0]]);
      const b2_new = [prev.b2[0] - learningRate * db2[0]];

      return { W1: W1_new, b1: b1_new, W2: W2_new, b2: b2_new };
    });
  }, [weights, data, forwardPass, activation, ablatedNeurons, hiddenSize, learningRate]);

  // Training Loop Effect
  useEffect(() => {
    if (!isPlaying) return;

    let cancel = false;
    const loop = (timestamp: number) => {
      if (cancel) return;

      const elapsed = timestamp - lastTimeRef.current;
      
      // Speed logic
      if (speed >= 10) {
        // Fast train: multiple steps per frame
        for(let i=0; i<5; i++) trainStep();
        setPhase('idle');
        lastTimeRef.current = timestamp;
      } else {
        // Slow visual train
        const interval = 1000 / (speed * 2); 
        if (elapsed > interval) {
          setPhase((p) => {
            if (p === 'idle' || p === 'backward') return 'forward';
            if (p === 'forward') {
              trainStep(); // update occurs here
              return 'backward';
            }
            return 'idle';
          });
          lastTimeRef.current = timestamp;
        }
      }

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);
    return () => {
      cancel = true;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, trainStep, speed]);

  const toggleAblation = (idx: number) => {
    setAblatedNeurons((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // Pre-calculate decision boundary mesh
  const decisionGrid = useMemo(() => {
    if (!weights) return [];
    const resolution = 20;
    const grid: {x: number, y: number, val: number}[] = [];
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        // map 0..res to -1.5..1.5
        const x1 = (i / (resolution - 1)) * 3 - 1.5;
        const x2 = (j / (resolution - 1)) * 3 - 1.5;
        
        // single point forward pass
        const Z1 = weights.W1[0].map((_, h) => x1 * weights.W1[0][h] + x2 * weights.W1[1][h] + weights.b1[h]);
        const A1 = Z1.map((val, h) => ablatedNeurons.has(h) ? 0 : Activations[activation](val));
        const Z2 = A1.reduce((sum, val, h) => sum + val * weights.W2[h][0], 0) + weights.b2[0];
        const val = Activations.sigmoid(Z2);
        
        grid.push({ x: i, y: j, val });
      }
    }
    return grid;
  }, [weights, activation, ablatedNeurons]);


  if (!weights) return null;

  // Render Helpers
  const renderNetworkEdges = () => {
    const edges = [];
    const inputY = [100, 200];
    const hiddenY = Array(hiddenSize).fill(0).map((_, i) => 150 - (hiddenSize - 1) * 20 + i * 40);
    const outputY = 150;

    // Input -> Hidden
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < hiddenSize; j++) {
        const w = weights.W1[i][j];
        const isAblated = ablatedNeurons.has(j);
        const strokeColor = isAblated ? '#334155' : (w > 0 ? '#3b82f6' : '#ef4444');
        const opacity = isAblated ? 0.2 : Math.min(Math.abs(w) * 0.5 + 0.1, 1);
        const thickness = isAblated ? 1 : Math.min(Math.abs(w) * 3 + 1, 6);
        const isForward = phase === 'forward' && !isAblated;
        const isBackward = phase === 'backward' && !isAblated;

        edges.push(
          <path
            key={`e-in-${i}-${j}`}
            d={`M 80 ${inputY[i]} Q 180 ${inputY[i]} 280 ${hiddenY[j]}`}
            stroke={strokeColor}
            strokeWidth={thickness}
            opacity={opacity}
            fill="none"
            className={`transition-all duration-300 ${isForward ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.8)] stroke-cyan-400' : ''} ${isBackward ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] stroke-fuchsia-500' : ''}`}
          />
        );
      }
    }

    // Hidden -> Output
    for (let j = 0; j < hiddenSize; j++) {
      const w = weights.W2[j][0];
      const isAblated = ablatedNeurons.has(j);
      const strokeColor = isAblated ? '#334155' : (w > 0 ? '#3b82f6' : '#ef4444');
      const opacity = isAblated ? 0.2 : Math.min(Math.abs(w) * 0.5 + 0.1, 1);
      const thickness = isAblated ? 1 : Math.min(Math.abs(w) * 3 + 1, 6);
      const isForward = phase === 'forward' && !isAblated;
      const isBackward = phase === 'backward' && !isAblated;

      edges.push(
        <path
          key={`e-out-${j}`}
          d={`M 320 ${hiddenY[j]} Q 420 ${outputY} 520 ${outputY}`}
          stroke={strokeColor}
          strokeWidth={thickness}
          opacity={opacity}
          fill="none"
          className={`transition-all duration-300 ${isForward ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.8)] stroke-cyan-400' : ''} ${isBackward ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] stroke-fuchsia-500'