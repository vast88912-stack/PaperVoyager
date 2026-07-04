import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// --- MATH & ML UTILITIES ---
const ACTIVATIONS = {
  relu: {
    f: (x) => Math.max(0, x),
    df: (x) => (x > 0 ? 1 : 0),
  },
  tanh: {
    f: (x) => Math.tanh(x),
    df: (x) => 1 - Math.pow(Math.tanh(x), 2),
  },
  sigmoid: {
    f: (x) => 1 / (1 + Math.exp(-x)),
    df: (x) => {
      const s = 1 / (1 + Math.exp(-x));
      return s * (1 - s);
    },
  },
};

const generateDataset = (type, numPoints = 200) => {
  const points = [];
  const noise = 0.15;
  for (let i = 0; i < numPoints; i++) {
    if (type === 'xor') {
      const x = Math.random() * 2 - 1;
      const y = Math.random() * 2 - 1;
      const label = (x > 0 && y > 0) || (x < 0 && y < 0) ? 0 : 1;
      points.push({
        x: x + (Math.random() * 2 - 1) * noise,
        y: y + (Math.random() * 2 - 1) * noise,
        label,
      });
    } else if (type === 'blobs') {
      const label = i % 2;
      const cx = label === 1 ? 0.5 : -0.5;
      const cy = label === 1 ? 0.5 : -0.5;
      points.push({
        x: cx + (Math.random() * 2 - 1) * noise * 2,
        y: cy + (Math.random() * 2 - 1) * noise * 2,
        label,
      });
    } else if (type === 'spiral') {
      const label = i % 2;
      const r = (i / numPoints) * 1.5;
      const t = (label * Math.PI) + (i / numPoints) * Math.PI * 4;
      points.push({
        x: r * Math.sin(t) + (Math.random() * 2 - 1) * noise * 0.5,
        y: r * Math.cos(t) + (Math.random() * 2 - 1) * noise * 0.5,
        label,
      });
    }
  }
  return points;
};

const initWeights = (hiddenSize) => ({
  W1: [
    Array.from({ length: hiddenSize }, () => Math.random() * 2 - 1),
    Array.from({ length: hiddenSize }, () => Math.random() * 2 - 1),
  ],
  b1: Array.from({ length: hiddenSize }, () => Math.random() * 2 - 1),
  W2: Array.from({ length: hiddenSize }, () => Math.random() * 2 - 1),
  b2: [Math.random() * 2 - 1],
});

// --- MAIN COMPONENT ---
export default function App() {
  // Configuration State
  const [datasetType, setDatasetType] = useState('xor');
  const [hiddenSize, setHiddenSize] = useState(4);
  const [activationType, setActivationType] = useState('tanh');
  const [learningRate, setLearningRate] = useState(0.05);
  const [isTraining, setIsTraining] = useState(false);
  const [viewMode, setViewMode] = useState('forward'); // 'forward' | 'backward'
  const [ablatedNodes, setAblatedNodes] = useState(new Set());

  // Data & Network State
  const [dataset, setDataset] = useState([]);
  const [epoch, setEpoch] = useState(0);
  const [lossHistory, setLossHistory] = useState([]);
  const [networkVisuals, setNetworkVisuals] = useState({
    W1: [], b1: [], W2: [], b2: [], a1: [], a2: 0, dW1: [], dW2: [], recentPt: null
  });

  // Refs for performance loop
  const netRef = useRef(initWeights(hiddenSize));
  const datasetRef = useRef([]);
  const reqRef = useRef(null);
  const canvasRef = useRef(null);
  const epochRef = useRef(0);
  const lossHistRef = useRef([]);

  // Setup / Reset
  const resetNetwork = useCallback(() => {
    netRef.current = initWeights(hiddenSize);
    epochRef.current = 0;
    lossHistRef.current = [];
    setEpoch(0);
    setLossHistory([]);
    setAblatedNodes(new Set());
    const newData = generateDataset(datasetType);
    setDataset(newData);
    datasetRef.current = newData;
  }, [hiddenSize, datasetType]);

  useEffect(() => {
    resetNetwork();
  }, [resetNetwork]);

  // Training Loop
  useEffect(() => {
    if (!isTraining) return;

    const { f: actF, df: actDf } = ACTIVATIONS[activationType];
    const { f: outF, df: outDf } = ACTIVATIONS.sigmoid;
    const batchSize = 10;
    const updateFreq = 3; // Frames before UI update

    let frameCount = 0;

    const loop = () => {
      const net = netRef.current;
      const data = datasetRef.current;
      if (data.length === 0) return;

      let batchLoss = 0;
      let gradW1 = [[...Array(hiddenSize).fill(0)], [...Array(hiddenSize).fill(0)]];
      let gradB1 = [...Array(hiddenSize).fill(0)];
      let gradW2 = [...Array(hiddenSize).fill(0)];
      let gradB2 = [0];

      let lastA1 = [...Array(hiddenSize).fill(0)];
      let lastA2 = 0;
      let lastPt = data[0];

      // Mini-batch SGD
      for (let b = 0; b < batchSize; b++) {
        const pt = data[Math.floor(Math.random() * data.length)];
        lastPt = pt;

        // --- Forward Pass ---
        let z1 = [];
        let a1 = [];
        for (let i = 0; i < hiddenSize; i++) {
          let val = pt.x * net.W1[0][i] + pt.y * net.W1[1][i] + net.b1[i];
          z1.push(val);
          // Ablation check
          a1.push(ablatedNodes.has(i) ? 0 : actF(val));
        }
        let z2 = net.b2[0];
        for (let i = 0; i < hiddenSize; i++) {
          z2 += a1[i] * net.W2[i];
        }
        let a2 = outF(z2);

        lastA1 = a1;
        lastA2 = a2;

        // Loss (MSE)
        const err = a2 - pt.label;
        batchLoss += err * err;

        // --- Backward Pass ---
        let d_a2 = err; // Derivative of MSE is actually 2 * err, scaled into LR
        let d_z2 = d_a2 * outDf(z2);

        gradB2[0] += d_z2;
        let d_a1 = [];
        for (let i = 0; i < hiddenSize; i++) {
          gradW2[i] += a1[i] * d_z2;
          d_a1.push(net.W2[i] * d_z2);
        }

        for (let i = 0; i < hiddenSize; i++) {
          if (ablatedNodes.has(i)) continue;
          let d_z1 = d_a1[i] * actDf(z1[i]);
          gradB1[i] += d_z1;
          gradW1[0][i] += pt.x * d_z1;
          gradW1[1][i] += pt.y * d_z1;
        }
      }

      // Update Weights
      for (let i = 0; i < hiddenSize; i++) {
        net.W1[0][i] -= learningRate * (gradW1[0][i] / batchSize);
        net.W1[1][i] -= learningRate * (gradW1[1][i] / batchSize);
        net.b1[i] -= learningRate * (gradB1[i] / batchSize);
        net.W2[i] -= learningRate * (gradW2[i] / batchSize);
      }
      net.b2[0] -= learningRate * (gradB2[0] / batchSize);

      epochRef.current += batchSize;

      if (frameCount % updateFreq === 0) {
        const avgLoss = batchLoss / batchSize;
        lossHistRef.current.push(avgLoss);
        if (lossHistRef.current.length > 50) lossHistRef.current.shift();

        setEpoch(epochRef.current);
        setLossHistory([...lossHistRef.current]);
        setNetworkVisuals({
          W1: net.W1, b1: net.b1, W2: net.W2, b2: net.b2,
          a1: lastA1, a2: lastA2, recentPt: lastPt,
          dW1: gradW1, dW2: gradW2 // Capture grads for visualization
        });
      }

      frameCount++;
      reqRef.current = requestAnimationFrame(loop);
    };

    reqRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqRef.current);
  }, [isTraining, hiddenSize, activationType, learningRate, ablatedNodes]);

  // Decision Boundary Canvas Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 50;
    const imgData = ctx.createImageData(size, size);
    const net = netRef.current;
    const { f: actF } = ACTIVATIONS[activationType];
    const { f: outF } = ACTIVATIONS.sigmoid;

    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const px = (x / size) * 2.4 - 1.2;
        const py = (y / size) * 2.4 - 1.2;

        let a1 = [];
        for (let i = 0; i < hiddenSize; i++) {
          let val = px * net.W1[0][i] + py * net.W1[1][i] + net.b1[i];
          a1.push(ablatedNodes.has(i) ? 0 : actF(val));
        }
        let z2 = net.b2[0];
        for (let i = 0; i < hiddenSize; i++) {
          z2 += a1[i] * net.W2[i];
        }
        let val2 = outF(z2);

        const idx = (y * size + x) * 4;
        // Colors: Label 0 -> Cyan (0, 243, 255), Label 1 -> Magenta (255, 0, 255)
        imgData.data[idx] = Math.round(val2 * 255);       // R
        imgData.data[idx + 1] = Math.round((1 - val2) * 243); // G
        imgData.data[idx + 2] = 255;                      // B
        imgData.data[idx + 3] = 255;                      // A
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }, [networkVisuals, hiddenSize, activationType, ablatedNodes]);

  const toggleAblation = (index) => {
    setAblatedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // SVG Coordinates setup
  const svgWidth = 600;
  const svgHeight = 400;
  const inNodes = [
    {