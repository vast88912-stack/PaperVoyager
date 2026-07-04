import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, RefreshCw, Activity, Layers, Database, Eye, Zap, Settings2 } from 'lucide-react';

// --- Math & ML Utilities ---

const relu = (x: number) => Math.max(0, x);
const d_relu = (x: number) => (x > 0 ? 1 : 0);
const tanh = (x: number) => Math.tanh(x);
const d_tanh = (x: number) => 1 - Math.pow(Math.tanh(x), 2);
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

const activate = (x: number, type: string) => {
  if (type === 'relu') return relu(x);
  if (type === 'tanh') return tanh(x);
  return sigmoid(x);
};

const d_activate = (x: number, type: string) => {
  if (type === 'relu') return d_relu(x);
  if (type === 'tanh') return d_tanh(x);
  const s = sigmoid(x);
  return s * (1 - s);
};

// --- Data Generation ---

const generateData = (type: string, numPoints: number = 200) => {
  const data: [number, number, number][] = [];
  for (let i = 0; i < numPoints; i++) {
    if (type === 'xor') {
      const x = Math.random() * 2 - 1;
      const y = Math.random() * 2 - 1;
      const label = (x > 0 && y > 0) || (x < 0 && y < 0) ? 0 : 1;
      // Add slight noise
      data.push([x + (Math.random() - 0.5) * 0.2, y + (Math.random() - 0.5) * 0.2, label]);
    } else if (type === 'spiral') {
      const n = i / (numPoints / 2);
      const r = 0.5 * n;
      const t = 1.5 * n * Math.PI;
      const classId = i < numPoints / 2 ? 0 : 1;
      const offset = classId === 0 ? 0 : Math.PI;
      const x = r * Math.sin(t + offset) + (Math.random() - 0.5) * 0.1;
      const y = r * Math.cos(t + offset) + (Math.random() - 0.5) * 0.1;
      data.push([x, y, classId]);
    } else if (type === 'blobs') {
      const classId = i < numPoints / 2 ? 0 : 1;
      const cx = classId === 0 ? -0.5 : 0.5;
      const cy = classId === 0 ? -0.5 : 0.5;
      const x = cx + (Math.random() - 0.5) * 0.6;
      const y = cy + (Math.random() - 0.5) * 0.6;
      data.push([x, y, classId]);
    }
  }
  return data;
};

// --- Types ---

type NetState = {
  W1: number[][];
  b1: number[];
  W2: number[][];
  b2: number[];
  dW1: number[][];
  db1: number[];
  dW2: number[][];
  db2: number[];
  lossHistory: number[];
  epoch: number;
};

export default function App() {
  // --- UI State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [datasetType, setDatasetType] = useState<'xor' | 'spiral' | 'blobs'>('xor');
  const [hiddenSize, setHiddenSize] = useState(4);
  const [activation, setActivation] = useState<'relu' | 'tanh' | 'sigmoid'>('tanh');
  const [learningRate, setLearningRate] = useState(0.05);
  const [viewMode, setViewMode] = useState<'forward' | 'backward'>('forward');
  const [ablatedNeurons, setAblatedNeurons] = useState<Set<number>>(new Set());
  const [tick, setTick] = useState(0); // Used to force React renders from the animation loop

  // --- Refs for Mutable ML State ---
  const net = useRef<NetState>({
    W1: [], b1: [], W2: [], b2: [],
    dW1: [], db1: [], dW2: [], db2: [],
    lossHistory: [], epoch: 0
  });
  const trainData = useRef<[number, number, number][]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();

  // --- Initialization ---
  const initNetwork = useCallback(() => {
    const H = hiddenSize;
    net.current = {
      W1: Array(2).fill(0).map(() => Array(H).fill(0).map(() => (Math.random() - 0.5) * 2)),
      b1: Array(H).fill(0).map(() => (Math.random() - 0.5) * 0.5),
      W2: Array(H).fill(0).map(() => [(Math.random() - 0.5) * 2]),
      b2: [(Math.random() - 0.5) * 0.5],
      dW1: Array(2).fill(0).map(() => Array(H).fill(0)),
      db1: Array(H).fill(0),
      dW2: Array(H).fill(0).map(() => [0]),
      db2: [0],
      lossHistory: [],
      epoch: 0
    };
    trainData.current = generateData(datasetType);
    setAblatedNeurons(new Set());
    setTick(t => t + 1);
  }, [hiddenSize, datasetType]);

  useEffect(() => {
    initNetwork();
  }, [initNetwork]);

  // --- Training Logic ---
  const trainStep = useCallback(() => {
    const { W1, b1, W2, b2 } = net.current;
    const data = trainData.current;
    const batchSize = data.length;
    const H = hiddenSize;

    let totalLoss = 0;

    // Reset gradients
    const dW1 = Array(2).fill(0).map(() => Array(H).fill(0));
    const db1 = Array(H).fill(0);
    const dW2 = Array(H).fill(0).map(() => [0]);
    let db2 = 0;

    for (let i = 0; i < batchSize; i++) {
      const [x1, x2, y] = data[i];

      // Forward Pass
      const Z1 = Array(H).fill(0);
      const A1 = Array(H).fill(0);
      for (let j = 0; j < H; j++) {
        Z1[j] = x1 * W1[0][j] + x2 * W1[1][j] + b1[j];
        A1[j] = ablatedNeurons.has(j) ? 0 : activate(Z1[j], activation);
      }

      let z2 = b2[0];
      for (let j = 0; j < H; j++) {
        z2 += A1[j] * W2[j][0];
      }
      const a2 = sigmoid(z2);

      // Loss (BCE)
      totalLoss += -(y * Math.log(a2 + 1e-8) + (1 - y) * Math.log(1 - a2 + 1e-8));

      // Backward Pass
      const dz2 = a2 - y;
      db2 += dz2;

      for (let j = 0; j < H; j++) {
        dW2[j][0] += A1[j] * dz2;
        if (!ablatedNeurons.has(j)) {
          const da1 = dz2 * W2[j][0];
          const dz1 = da1 * d_activate(Z1[j], activation);
          dW1[0][j] += x1 * dz1;
          dW1[1][j] += x2 * dz1;
          db1[j] += dz1;
        }
      }
    }

    // Average gradients and update
    for (let j = 0; j < H; j++) {
      dW2[j][0] /= batchSize;
      W2[j][0] -= learningRate * dW2[j][0];

      dW1[0][j] /= batchSize;
      dW1[1][j] /= batchSize;
      W1[0][j] -= learningRate * dW1[0][j];
      W1[1][j] -= learningRate * dW1[1][j];

      db1[j] /= batchSize;
      b1[j] -= learningRate * db1[j];
    }
    db2 /= batchSize;
    b2[0] -= learningRate * db2;

    // Update State
    net.current.dW1 = dW1;
    net.current.db1 = db1;
    net.current.dW2 = dW2;
    net.current.db2 = [db2];
    net.current.epoch += 1;
    
    const avgLoss = totalLoss / batchSize;
    if (net.current.epoch % 5 === 0) {
      net.current.lossHistory.push(avgLoss);
      if (net.current.lossHistory.length > 50) net.current.lossHistory.shift();
    }
  }, [hiddenSize, activation, learningRate, ablatedNeurons]);

  // --- Animation Loop ---
  const loop = useCallback(() => {
    if (!isPlaying) return;
    // Do multiple steps per frame for faster visual learning
    for (let i = 0; i < 5; i++) trainStep();
    setTick(t => t + 1);
    requestRef.current = requestAnimationFrame(loop);
  }, [isPlaying, trainStep]);

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(loop);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying,