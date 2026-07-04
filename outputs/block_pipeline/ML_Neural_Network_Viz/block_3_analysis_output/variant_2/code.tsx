import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// --- Micro-MLP Engine (Plain JS) ---
const HIDDEN_SIZE = 5;

const createNN = () => ({
  W1: Array.from({ length: 2 }, () => Array.from({ length: HIDDEN_SIZE }, () => Math.random() * 2 - 1)),
  b1: Array(HIDDEN_SIZE).fill(0),
  W2: Array.from({ length: HIDDEN_SIZE }, () => [Math.random() * 2 - 1]),
  b2: [0]
});

const forwardPass = (x, nn, ablated) => {
  let a1 = [];
  for (let i = 0; i < HIDDEN_SIZE; i++) {
    let val = x[0] * nn.W1[0][i] + x[1] * nn.W1[1][i] + nn.b1[i];
    let act = Math.tanh(val);
    if (ablated[i]) act = 0; 
    a1.push(act);
  }
  let z2 = 0;
  for (let i = 0; i < HIDDEN_SIZE; i++) {
    z2 += a1[i] * nn.W2[i][0];
  }
  z2 += nn.b2[0];
  let a2 = 1 / (1 + Math.exp(-z2));
  return { a1, a2 };
};

const trainBatch = (X, Y, nn, ablated, lr) => {
  let dW1 = [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0]];
  let db1 = [0, 0, 0, 0, 0];
  let dW2 = [[0], [0], [0], [0], [0]];
  let db2 = [0];
  let totalLoss = 0;
  let m = X.length;

  for (let s = 0; s < m; s++) {
    let x = X[s];
    let y = Y[s][0];
    let { a1, a2 } = forwardPass(x, nn, ablated);

    // BCE Loss
    let loss = -(y * Math.log(a2 + 1e-8) + (1 - y) * Math.log(1 - a2 + 1e-8));
    totalLoss += loss;

    let dz2 = a2 - y;
    db2[0] += dz2;
    for (let i = 0; i < HIDDEN_SIZE; i++) {
      dW2[i][0] += a1[i] * dz2;
    }

    for (let i = 0; i < HIDDEN_SIZE; i++) {
      if (ablated[i]) continue;
      let da1 = dz2 * nn.W2[i][0];
      let dz1 = da1 * (1 - a1[i] * a1[i]); 
      db1[i] += dz1;
      dW1[0][i] += x[0] * dz1;
      dW1[1][i] += x[1] * dz1;
    }
  }

  for (let i = 0; i < HIDDEN_SIZE; i++) {
    nn.W2[i][0] -= lr * (dW2[i][0] / m);
    nn.W1[0][i] -= lr * (dW1[0][i] / m);
    nn.W1[1][i] -= lr * (dW1[1][i] / m);
    nn.b1[i] -= lr * (db1[i] / m);
  }
  nn.b2[0] -= lr * (db2[0] / m);

  return totalLoss / m;
};

// --- Datasets ---
const DATASETS = {
  xor: {
    X: [[-0.8, -0.8], [-0.8, 0.8], [0.8, -0.8], [0.8, 0.8]],
    Y: [[0], [1], [1], [0]]
  },
  blobs: {
    X: [[-0.6, -0.6], [-0.5, -0.7], [-0.7, -0.5], [0.6, 0.6], [0.5, 0.7], [0.7, 0.5]],
    Y: [[0], [0], [0], [1], [1], [1]]
  },
  spiral: {
    X: Array.from({length: 40}, (_, i) => {
      let r = (i / 40) * 0.8;
      let t = (i / 40) * Math.PI * 2;
      return i % 2 === 0 ? [r * Math.sin(t), r * Math.cos(t)] : [-r * Math.sin(t), -r * Math.cos(t)];
    }),
    Y: Array.from({length: 40}, (_, i) => [i % 2])
  }
};

// --- Components ---

const NetworkGraph = ({ nn, ablated, onToggleAblation }) => {
  const svgRef = useRef(null);

  const renderLines = () => {
    if (!nn) return null;
    const lines = [];
    const inputY = [80, 220];
    const hiddenY = [30, 90, 150, 210, 270];
    
    // W1
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < HIDDEN_SIZE; j++) {
        if (ablated[j]) continue;
        const w = nn.W1[i][j];
        const color = w > 0 ? 'stroke-cyan-500' : 'stroke-pink-500';
        const opacity = Math.min(Math.abs(w) * 0.5, 1);
        lines.push(
          <line key={`w1-${i}-${j}`} x1="40" y1={inputY[i]} x2="160" y2={hiddenY[j]}
                className={`${color}`} strokeWidth={Math.max(1, Math.abs(w)*2)} strokeOpacity={opacity} />
        );
      }
    }
    
    // W2
    for (let j = 0; j < HIDDEN_SIZE; j++) {
      if (ablated[j]) continue;
      const w = nn.W2[j][0];
      const color = w > 0 ? 'stroke-cyan-500' : 'stroke-pink-500';
      const opacity = Math.min(Math.abs(w) * 0.5, 1);
      lines.push(
        <line key={`w2-${j}`} x1="160" y1={hiddenY[j]} x2="280" y2="150"
              className={`${color}`} strokeWidth={Math.max(1, Math.abs(w)*2)} strokeOpacity={opacity} />
      );
    }
    return lines;
  };

  return (
    <div className="relative w-full h-[320px] bg-slate-900/50 rounded-xl border border-slate-700 p-4 flex flex-col shadow-inner">
      <h3 className="text-slate-300 text-sm font-semibold tracking-wider uppercase mb-2">Network Architecture & Ablation</h3>
      <div className="flex-1 relative w-full flex justify-center items-center">
        <svg ref={svgRef} className="w-full h-full max-w-[320px]" viewBox="0 0 320 300">
          {/* Connections */}
          {renderLines()}
          
          {/* Input Nodes */}
          <circle cx="40" cy="80" r="12" className="fill-slate-800 stroke-cyan-400 stroke-2 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
          <circle cx="40" cy="220" r="12" className="fill-slate-800 stroke-pink-400 stroke-2 drop-shadow-[0_0_8px_rgba(244,114,182,0.6)]" />
          
          {/* Hidden Nodes */}
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={`h-${i}`} onClick={() => onToggleAblation(i)} className="cursor-pointer transition-transform hover:scale-110">
              <circle cx="160" cy={30 + i * 60} r="14" 
                      className={`stroke-2 transition-all duration-300 ${
                        ablated[i] 
                          ? 'fill-slate-800 stroke-slate-600' 
                          : 'fill-slate-800 stroke-purple-500 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]'
                      }`} />
              {ablated[i] && <line x1="150" y1={20 + i*60} x2="170" y2={40 + i*60} className="stroke-slate-500 stroke-2" />}
            </g>
          ))}
          
          {/* Output Node */}
          <circle cx="280" cy="150" r="16" className="fill-slate-800 stroke-lime-400 stroke-2 drop-shadow-[0_0_12px_rgba(163,230,53,0.8)]" />
        </svg>
      </div>
      <div className="text-xs text-slate-500 text-center mt-2">Click hidden neurons to freeze/ablate them.</div>
    </div>
  );
};

const LossChart = ({ history }) => {
  const points = useMemo(() => {
    if (history.length === 0) return "";
    const maxLoss = Math.max(...history, 1);
    const minLoss = 0;
    return history.map((loss, i) => {
      const x = (i / Math.max(history.length - 1, 1)) * 100;
      const y = 100 - ((loss - minLoss) / (maxLoss - minLoss)) * 100;
      return `${x},${y}`;
    }).join(" ");
  }, [history]);

  return (
    <div className="w-full h-48 bg-slate-900/50 rounded-xl border border-slate-700 p-4 flex flex-col relative overflow-hidden">
      <h3 className="text-slate-300 text-sm font-semibold tracking-wider uppercase mb-2">Loss Curve (Analysis)</h3>
      <div className="flex-1 w-full relative">
        <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
          <polyline points={points} fill="none" className="stroke-lime-400 drop-shadow-[0_0_5px_rgba(163,230,53,0.8)]" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        {/* Grid lines */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between border-l border-b border-slate-600/50">
          <div className="w-full border-t border-slate-700/50 h-0"></div>
          <div className="w-full border-t border-slate-700/50 h-0"></div>
          <div className="w-full border-t border-slate-700/50 h-0"></div>
        </div>
      </div>
      <div className="absolute bottom-2 right-4 text-xs font-mono text-lime-400 bg-slate-900/80 px-2 py-1 rounded">
        Loss: {history.length > 0 ? history[history.length - 1].toFixed(4) : "0.0000"}
      </div>
    </div>
  );
};

export default function App() {
  const [datasetName, setDatasetName] = useState('xor');
  const [isRunning, setIsRunning] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [currentLoss, setCurrentLoss] = useState(0);
  const [lossHistory, setLossHistory] = useState([]);
  const [ablated, setAblated] = useState(Array(HIDDEN_SIZE).fill(false));
  
  // Refs for animation loop to avoid dependency cycles
  const nnRef = useRef(createNN());
  const ablatedRef = useRef(ablated);
  const datasetRef = useRef(datasetName);
  const isRunningRef = useRef(isRunning);
  const canvasRef = useRef(null);
  const requestRef = useRef(null);

  // Sync refs
  useEffect(() => { ablatedRef.current = ablated; }, [ablated]);
  useEffect(() => { datasetRef.current = datasetName; }, [datasetName]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);

  const resetNetwork = useCallback(() => {
    nnRef.current = createNN();
    setEpoch(0);
    setCurrentLoss(0);
    setLossHistory([]);
    drawDecisionBoundary();
  }, []);

  const toggleAblation = (index) => {
    setAblated(prev => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
    // Force a redraw immediately
    setTimeout(() => drawDecisionBoundary(), 0);
  };

  const drawDecisionBoundary = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;
    const nn = nnRef.current;
    const abl = ablatedRef.current;

    for (let py = 0; py < height; py += 2) {
      for (let px = 0; px < width; px += 2) {
        // Map pixel to [-1.2, 1.2]
        const x1 = (px / width) * 2.4 - 1.2;
        const x2 = (py / height) * 2.4 - 1.2;
        
        const { a2 } = forwardPass([x1, x2], nn, abl);
        
        // Color mapping: a2 < 0.5 (Cyan), a2 > 0.5 (Pink)
        const intensity = Math.abs(a2 - 0.5) * 2; // 0 to 1
        let r, g, b;
        if (a2 > 0.5) {
          r = 236 * intensity; g = 72 * intensity; b = 153 * intensity; // Pink
        } else {
          r = 6 * intensity; g = 182 * intensity; b = 212 * intensity; // Cyan
        }

        // Fill 2x2 block for performance
        const idx = (py * width + px) * 4;
        const idxRight = idx + 4;
        const idxDown = idx + width * 4;
        const idxDownRight = idxDown + 4;

        data[idx] = data[idxRight] = data[idxDown] = data[idxDownRight] = r;
        data[idx+1] = data[idxRight+1] = data[idxDown+1] = data[idxDownRight+1] = g;
        data[idx+2] = data[idxRight+2] = data[idxDown+2] = data[idxDownRight+2] = b;
        data[idx+3] = data[idxRight+3] = data[idxDown+3] = data[idxDownRight+3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Draw dataset points
    const ds = DATASETS[datasetRef.current];
    for (let i = 0; i < ds.X.length; i++) {
      const [x1, x2] = ds.X[i];
      const y = ds.Y[i][0];
      const px = ((x1 + 1.2) / 2.4) * width;
      const py = ((x2 + 1.2) / 2.4) * height;

      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fillStyle = y === 1 ?