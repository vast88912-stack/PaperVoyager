import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

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
  
  add: (a: Matrix, b: Matrix): Matrix => // b is expected to be [1, cols] for broadcasting
    a.map(row => row.map((val, j) => val + b[0][j])),
  
  sub: (a: Matrix, b: Matrix): Matrix =>
    a.map((row, i) => row.map((val, j) => val - b[i][j])),
  
  mul: (a: Matrix, b: Matrix): Matrix => // Element-wise
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
};

// --- Datasets ---
function generateDataset(type: string, numPoints = 200): { X: Matrix; Y: Matrix } {
  const X: Matrix = [];
  const Y: Matrix = [];
  
  for (let i = 0; i < numPoints; i++) {
    if (type === 'xor') {
      const x1 = Math.random() * 2 - 1;
      const x2 = Math.random() * 2 - 1;
      const label = (x1 * x2 > 0) ? 0 : 1;
      // Add noise
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

// --- Main Component ---
export default function App() {
  // UI State
  const [datasetType, setDatasetType] = useState<string>('xor');
  const [hiddenNeurons, setHiddenNeurons] = useState<number>(4);
  const [activationName, setActivationName] = useState<keyof typeof activations>('tanh');
  const [learningRate, setLearningRate] = useState<number>(0.1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'forward' | 'backward'>('forward');
  const [ablated, setAblated] = useState<Set<number>>(new Set());
  
  // Render State (Synced from ML Engine occasionally for performance)
  const [epoch, setEpoch] = useState(0);
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const [renderData, setRenderData] = useState<{
    W1: Matrix; W2: Matrix;
    nodeActs: { input: number[], hidden: number[], output: number[] };
    nodeGrads: { hidden: number[], output: number[] };
  } | null>(null);

  // ML Engine State (Mutable to avoid React re-render overhead during training loop)
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

  // Initialize Network
  const initNetwork = useCallback(() => {
    const { X, Y } = generateDataset(datasetType);
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
  }, [datasetType, hiddenNeurons]);

  useEffect(() => {
    initNetwork();
  }, [initNetwork]);

  // Training Step
  const trainStep = useCallback(() => {
    const { X, Y, W1, b1, W2, b2 } = ml.current;
    const N = X.length;
    const act = activations[activationName];

    // --- Forward Pass ---
    let Z1 = mat.add(mat.dot(X, W1), b1);
    
    // Apply Ablation
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
    loss /= N;

    // --- Backward Pass ---
    const dZ2 = mat.sub(A2, Y); // For sigmoid + BCE
    const dW2 = mat.scale(mat.dot(mat.transpose(A1), dZ2), 1 / N);
    const db2 = mat.scale(mat.sumAxis0(dZ2), 1 / N);

    let dA1 = mat.dot(dZ2, mat.transpose(W2));
    let dZ1 = mat.mul(dA1, mat.map(Z1, act.df));

    // Apply Ablation to gradients
    if (ablated.size > 0) {
      dZ1 = dZ1.map(row => row.map((val, j) => ablated.has(j) ? 0 : val));
    }

    const dW1 = mat.scale(mat.dot(mat.transpose(X), dZ1), 1 / N);
    const db1 = mat.scale(mat.sumAxis0(dZ1), 1 / N);

    // --- Update Weights ---
    ml.current.W1 = mat.sub(W1, mat.scale(dW1, learningRate));
    ml.current.b1 = mat.sub(b1, mat.scale(db1, learningRate));
    ml.current.W2 = mat.sub(W2, mat.scale(dW2, learningRate));
    ml.current.b2 = mat.sub(b2, mat.scale(db2, learningRate));
    ml.current.epoch += 1;
    ml.current.lossHistory.push(loss);

    // Keep history manageable
    if (ml.current.lossHistory.length > 200) {
      ml.current.lossHistory.shift();
    }

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

  // Training Loop
  useEffect(() => {
    if (!isPlaying) return;
    let frameCount = 0;

    const loop = () => {
      const actsAndGrads = trainStep();
      frameCount++;
      // Throttle React updates to 15fps for smooth UI while training fast
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

  const toggleAblation = (index: number) => {
    setAblated(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // --- SVG Rendering Helpers ---
  const getEdgeColor = (weight: number) => {
    const val = Math.max(-1, Math.min(1, weight));
    // Neon Blue for negative, Neon Orange for positive
    if (val < 0) return `rgba(6, 182, 212, ${Math.abs(val) * 0.8 + 0.2})`; // Cyan
    return `rgba(249, 115, 22, ${Math.abs(val) * 0.8 + 0.2})`; // Orange
  };

  const getNodeGlow = (val: number, isAblated: boolean) => {
    if (isAblated) return 'none';
    const intensity = Math.min(1, val * 2);
    const color = viewMode === 'forward' ? '236, 72, 153' : '234, 179, 8'; // Pink or Yellow
    return `drop-shadow(0 0 ${intensity * 15}px rgba(${color}, ${intensity}))`;
  };

  const renderNetwork = () => {
    if (!renderData) return null;
    const { W1, W2, nodeActs, nodeGrads } = renderData;

    const width = 800;
    const height = 500;
    
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
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Edges W1 */}
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

        {/* Edges W2 */}
        {hiddenY.map((y1, j) => {
          const isAblated = ablated.has(j);
          const weight = W2[j][0];
          return (
            <line 
              key={`w2-${j}-0`}
              x1={layerX[1]} y1={y1}