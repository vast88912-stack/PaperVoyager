import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Activity, 
  Share2, 
  Layers, 
  GitMerge, 
  Zap, 
  RefreshCw, 
  Play, 
  Info,
  ChevronRight,
  Settings
} from 'lucide-react';

// --- Math & Helper Utils ---

const generateGraph = (nodes, connectivity) => {
  const adj = Array(nodes).fill(0).map(() => Array(nodes).fill(0));
  const positions = [];
  const radius = 150;
  
  for (let i = 0; i < nodes; i++) {
    const angle = (i / nodes) * 2 * Math.PI;
    positions.push({
      x: 200 + radius * Math.cos(angle),
      y: 200 + radius * Math.sin(angle),
      id: i
    });
    for (let j = 0; j < nodes; j++) {
      if (i !== j && Math.random() < connectivity) {
        adj[i][j] = 1;
        adj[j][i] = 1; // Undirected
      }
    }
  }
  return { adj, positions };
};

// Simple matrix vector multiplication
const matVecMul = (mat, vec) => {
  return mat.map(row => row.reduce((sum, val, idx) => sum + val * vec[idx], 0));
};

// Softmax function
const softmax = (arr) => {
  const max = Math.max(...arr);
  const exps = arr.map(x => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(x => x / sum);
};

// Color scales
const getColor = (value) => {
  // Heatmap style: Blue (low) -> Purple -> Red (high)
  const clamped = Math.max(0, Math.min(1, value));
  const r = Math.floor(clamped * 255);
  const b = Math.floor((1 - clamped) * 255);
  return `rgb(${r}, 0, ${b})`;
};

// --- Components ---

const SidebarControl = ({ label, children, description }) => (
  <div className="mb-6 border-b border-gray-700 pb-4 last:border-0">
    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
      {label}
    </label>
    <div className="mb-2">{children}</div>
    {description && (
      <p className="text-xs text-gray-500 italic leading-relaxed">
        {description}
      </p>
    )}
  </div>
);

const Slider = ({ value, min, max, step, onChange, label }) => (
  <div className="w-full">
    <div className="flex justify-between text-xs mb-1 text-gray-300">
      <span>{min}</span>
      <span className="font-mono text-blue-400">{value}</span>
      <span>{max}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
    />
  </div>
);

const Toggle = ({ value, onChange, label }) => (
  <div className="flex items-center justify-between cursor-pointer" onClick={() => onChange(!value)}>
    <span className="text-sm text-gray-300 select-none">{label}</span>
    <div className={`w-10 h-5 rounded-full relative transition-colors ${value ? 'bg-blue-600' : 'bg-gray-600'}`}>
      <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
  </div>
);

// --- Modules ---

// 1. GNN Architecture Explorer
const ArchitectureExplorer = ({ setLog }) => {
  const [arch, setArch] = useState('GCN');
  const [layers, setLayers] = useState(3);
  const [param1, setParam1] = useState(2); // Heads for GAT, Aggregator for SAGE

  // UseMemo for layout calculation to avoid re-layout on every tick
  const visualizationData = useMemo(() => {
    const layerSpacing = 120;
    const nodeSpacing = 40;
    const layerHeight = 200;
    
    const nodes = [];
    const links = [];
    
    for (let l = 0; l < layers; l++) {
      const x = 100 + l * layerSpacing;
      // Visualizing a "layer" as a column of nodes
      const nodeCount = 5; // Fixed width for simplicity
      
      for (let n = 0; n < nodeCount; n++) {
        const y = 50 + n * nodeSpacing;
        nodes.push({ id: `l${l}-n${n}`, x, y, layer: l });
        
        // Connections to next layer
        if (l < layers - 1) {
          for (let nextN = 0; nextN < nodeCount; nextN++) {
             // Logic changes based on Architecture
             let opacity = 0.2;
             let color = '#4B5563'; // gray-600
             
             if (arch === 'GAT') {
                // Visualize "heads" as multiple colored lines
                opacity = 0.5;
                color = nextN === n ? '#60A5FA' : '#4B5563'; 
             } else if (arch === 'GraphSAGE') {
                // Visualize aggregation (arrows converging)
                opacity = 0.3;
             }

             links.push({
               source: { x, y },
               target: { x: x + layerSpacing, y: 50 + nextN * nodeSpacing },
               opacity,
               color,
               id: `l${l}-n${n}-to-l${l+1}-n${nextN}`
             });
          }
        }
      }
    }
    return { nodes, links };
  }, [arch, layers, param1]);

  useEffect(() => {
    setLog(`[ARCH] Selected: ${arch} | Layers: ${layers} | ${arch === 'GAT' ? `Heads: ${param1}` : `Aggregator Variant: ${param1}`}`);
  }, [arch, layers, param1, setLog]);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex gap-4 p-4 bg-gray-800 border-b border-gray-700">
        <select 
          value={arch} 
          onChange={(e) => setArch(e.target.value)}
          className="bg-gray-900 border border-gray-600 text-white text-sm rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="GCN">Graph Convolutional Network (GCN)</option>
          <option value="GAT">Graph Attention Network (GAT)</option>
          <option value="GraphSAGE">GraphSAGE</option>
        </select>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Layers:</span>
          <input 
            type="number" min="1" max="6" 
            value={layers} onChange={(e) => setLayers(Number(e.target.value))}
            className="w-16 bg-gray-900 border border-gray-600 text-white text-sm rounded-lg p-2"
          />
        </div>

        {arch === 'GAT' && (
           <div className="flex items-center gap-2">
             <span className="text-sm text-gray-400">Heads:</span>
             <input type="range" min="1" max="8" value={param1} onChange={e => setParam1(parseInt(e.target.value))} className="w-24" />
             <span className="text-xs font-mono">{param1}</span>
           </div>
        )}
      </div>

      <div className="flex-1 relative bg-gray-900 overflow-hidden flex items-center justify-center">
        <svg width="100%" height="100%" viewBox="0 0 800 400" className="max-w-4xl">
          <defs>
             <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
               <path d="M 0 0 L 10 5 L 0 10 z" fill="#6B7280" />
             </marker>
          </defs>
          
          {/* Labels */}
          {Array.from({length: layers}).map((_, i) => (
            <text key={`label-${i}`} x={100 + i * 120} y={30} textAnchor="middle" className="fill-gray-400 text-xs font-bold uppercase">
              {i === 0 ? 'Input' : i === layers - 1 ? 'Output' : `Hidden ${i}`}
            </text>
          ))}

          {/* Links */}
          {visualizationData.links.map((link) => (
             <line 
                key={link.id}
                x1={link.source.x} y1={link.source.y}
                x2={link.target.x} y2={link.target.y}
                stroke={link.color}
                strokeWidth={arch === 'GAT' ? 1.5 : 1}
                opacity={link.opacity}
             />
          ))}

          {/* Nodes */}
          {visualizationData.nodes.map((node) => (
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
              <circle r={12} className="fill-gray-800 stroke-blue-500 stroke-2" />
              {arch === 'GraphSAGE' && (
                <circle r={4} className="fill-green-400 animate-pulse" />
              )}
              {arch === 'GAT' && (
                <circle r={6} className="fill-purple-500 opacity-50" />
              )}
            </g>
          ))}
          
          {/* Architecture Overlay Text */}
          <text x="50%" y="90%" textAnchor="middle" className="fill-gray-500 text-sm font-mono">
            {arch === 'GCN' && "H' = σ(D⁻¹/²AD⁻¹/²HW)"}
            {arch === 'GAT' && `h_i' = ||_{k=1}^${param1} σ(Σ a_ij W^k h_j)`}
            {arch === 'GraphSAGE' && `h_v = σ(W \cdot CONCAT(h_v, AGG({h_u, u ∈ N(v)})))`}
          </text>
        </svg>
      </div>
    </div>
  );
};

// 2. Graph Convolution Simulation
const ConvolutionSimulation = ({ setLog }) => {
  const NODE_COUNT = 5;
  
  // State
  const [features, setFeatures] = useState([0.1, 0.5, 0.8, 0.2, 0.9]); // Scalar features for visualization simplicity
  const [adj, setAdj] = useState([
    [0, 1, 1, 0, 0],
    [1, 0, 1, 1, 0],
    [1, 1, 0, 0, 1],
    [0, 1, 0, 0, 1],
    [0, 0, 1, 1, 0]
  ]);
  const [mode, setMode] = useState('spatial'); // 'spatial' or 'spectral'

  const positions = useMemo(() => {
     // Fixed pentagon layout
     const r = 100;
     const cx = 250, cy = 150;
     return Array(NODE_COUNT).fill(0).map((_, i) => ({
       x: cx + r * Math.cos(i * 2 * Math.PI / NODE_COUNT - Math.PI/2),
       y: cy + r * Math.sin(i * 2 * Math.PI / NODE_COUNT - Math.PI/2)
     }));
  }, []);

  const performConvolution = useCallback(() => {
    // 1. Calculate Degree Matrix D (diagonal)
    const degrees = adj.map(row => row.reduce((a,b) => a+b, 0));
    
    // 2. Perform message passing / aggregation
    // For GCN spatial approx: h_i' = mean(h_j for j in N(i) U {i})
    // For simplicity here, we do a basic averaging aggregation + self loop
    
    const newFeatures = features.map((f, i) => {
      let sum = f; // Self loop
      let count = 1;
      
      adj[i].forEach((connected, j) => {
        if (connected) {
          sum += features[j];
          count++;
        }
      });
      
      // Normalize (analogous to D inverse)
      const val = sum / count;
      // Simple Activation (ReLU-ish but keeping range 0-1 for color)
      return Math.min(1, Math.max(0, val));
    });

    setFeatures(newFeatures);
    setLog(`[CONV] Step Complete. Avg Feature Value: ${(newFeatures.reduce((a,b)=>a+b,0)/NODE_COUNT).toFixed(3)}`);
  }, [adj, features, setLog]);

  const toggleEdge = (i, j) => {
    if (i === j) return;
    const newAdj = [...adj];
    newAdj[i][j] = newAdj[i][j] ? 0 : 1;
    newAdj[j][i] = newAdj[j][i] ? 0 : 1; // Keep symmetric
    setAdj(newAdj);
  };

  return (
    <div className="flex h-full">
      {/* Sidebar Controls Specific to Module */}
      <div className="w-64 bg-gray-800 p-4 border-r border-gray-700 overflow-y-auto">
        <h3 className="font-bold text-gray-100 mb-4 flex items-center gap-2">
          <Settings size={16} /> Convolution Params
        </h3>
        
        <SidebarControl label="Adjacency Matrix" description="Click grid to toggle edges (connections).">
          <div className="grid grid-cols-5 gap-1 mb-2">
            {adj.map((row, i) => (
              row.map((val, j) => (
                <div 
                  key={`${i}-${j}`}
                  onClick={() => toggleEdge(i, j)}
                  className={`w-6 h-6 flex items-center justify-center text-[10px] cursor-pointer rounded
                    ${i === j ? 'bg-gray-900 text-gray-600 cursor-not-allowed' : 
                      val ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-500 hover:bg-gray-600'}`}
                >
                  {val}
                </div>
              ))
            ))}
          </div>
        </SidebarControl>

        <SidebarControl label="Node Features" description="Initial signal intensity per node.">
           <div className="space-y-2">
             {features.map((f, i) => (
               <div key={i} className="flex items-center gap-2">
                 <span className="text-xs text-gray-400 w-4">N{i}</span>
                 <input 
                   type="range" min="0" max="1" step="0.1"
                   value={f}
                   onChange={(e) => {
                     const nf = [...features];
                     nf[i] = parseFloat(e.target.value);
                     setFeatures(nf);
                   }}
                   className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                 />
               </div>
             ))}
           </div>
        </SidebarControl>

        <button 
          onClick={performConvolution}
          className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded flex items-center justify-center gap-2 font-bold transition-colors"
        >
          <RefreshCw size={16} /> Convolution Step
        </button>
      </div>

      {/* Vis Area */}
      <div className="flex-1 bg-gray-900 relative flex items-center justify-center">
        <svg width="500" height="300" viewBox="0 0 500 300">
          {/* Edges */}
          {adj.map((row, i) => (
            row.map((val, j) => {
              if (i < j && val) { // Draw once per pair
                 return (
                   <line 
                     key={`edge-${i}-${j}`}
                     x1={positions[i].x} y1={positions[i].y}
                     x2={positions[j].x} y2={positions[j].y}
                     stroke="#4B5563"
                     strokeWidth="2"
                   />
                 )
              }
              return null;
            })
          ))}

          {/* Nodes */}
          {positions.map((pos, i) => (
             <g key={`node-${i}`} transform={`translate(${pos.x}, ${pos.y})`}>
               <circle 
                 r={20} 
                 fill={getColor(features[i])}
                 stroke="white"
                 strokeWidth="2"
                 className="transition-all duration-500"
               />
               <text y={5} textAnchor="middle" className="text-xs font-bold pointer-events-none mix-blend-difference fill-white">
                 {features[i].toFixed(1)}
               </text>
             </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

// 3. Attention Mechanism (GAT)
const AttentionSimulation = ({ setLog }) => {
  const NODE_COUNT = 6;
  const [selectedNode, setSelectedNode] = useState(0);
  const [similarity, setSimilarity] = useState(0.5); // Abstract "similarity" of features
  
  // Memoize graph structure
  const { positions, edges } = useMemo(() => {
    const radius = 120;
    const center = { x: 300, y: 200 };
    const pos = [{ x: center.x, y: center.y, id: 0 }]; // Center node 0
    
    // Surrounding nodes
    for(let i=1; i<NODE_COUNT; i++) {
        const angle = ((i-1) / (NODE_COUNT-1)) * 2 * Math.PI;
        pos.push({
            x: center.x + radius * Math.cos(angle),
            y: center.y + radius * Math.sin(angle),
            id: i
        });
    }
    
    // Connect center to all others for visualization
    const e = [];
    for(let i=1; i<NODE_COUNT; i++) e.push({ s: 0, t: i });
    
    return { positions: pos, edges: e };
  }, []);

  // Calculate attention coefficients
  // α_ij = exp(LeakyReLU(a^T [Whi || Whj])) / Σ...
  // Simplified: Attention weight proportional to similarity slider + random noise per node fixed by index
  const attentionWeights = useMemo(() => {
    // Generate raw scores based on similarity slider and a deterministic "feature difference"
    const rawScores = [];
    for (let i = 1; i < NODE_COUNT; i++) {
      // Simulate: closer nodes in feature space get higher attention
      // We pretend node i's feature compatibility with node 0 is fixed, modulated by slider
      const inherentCompatibility = 1 - (Math.abs(i - 3) * 0.2); // Just some variation
      const score = inherentCompatibility * similarity * 10;
      rawScores.push(score);
    }
    
    // Softmax
    const maxScore = Math.max(...rawScores);
    const exps = rawScores.map(s => Math.exp(s - maxScore));
    const sum = exps.reduce((a,b) => a+b, 0);
    const weights = exps.map(e => e / sum);
    
    // Log updates
    return weights;
  }, [similarity]);

  useEffect(() => {
    setLog(`[GAT] Attention Weights for Node 0: [${attentionWeights.map(w => w.toFixed(2)).join(', ')}]`);
  }, [attentionWeights, setLog]);

  return (
    <div className="flex h-full">
       <div className="w-64 bg-gray-800 p-4 border-r border-gray-700">
         <h3 className="font-bold text-gray-100 mb-4">GAT Attention</h3>
         <SidebarControl label="Feature Similarity" description="Adjusts similarity between central node and neighbors. Higher similarity -> Higher Attention.">
            <Slider 
              min={0.1} max={2.0} step={0.1} 
              value={similarity} 
              onChange={setSimilarity} 
            />
         </SidebarControl>
         
         <div className="mt-4 p-3 bg-gray-700 rounded text-xs font-mono">
            <div className="font-bold text-purple-300 mb-2">Alpha Values (α_0j):</div>
            {attentionWeights.map((w, i) => (
              <div key={i} className="flex justify-between mb-1">
                <span>N{i+1}:</span>
                <div className="w-24 bg-gray-900 rounded h-3 overflow-hidden">
                  <div className="bg-purple-500 h-full transition-all duration-300" style={{width: `${w * 100}%`}} />
                </div>
                <span>{w.toFixed(2)}</span>
              </div>
            ))}
         </div>
       </div>

       <div className="flex-1 bg-gray-900 flex items-center justify-center">
         <svg width="600" height="400" viewBox="0 0 600 400">
            {/* Edges with opacity based on attention */}
            {edges.map((e, idx) => {
               const weight = attentionWeights[idx];
               return (
                 <line 
                   key={`edge-${e.t}`}
                   x1={positions[e.s].x} y1={positions[e.s].y}
                   x2={positions[e.t].x} y2={positions[e.t].y}
                   stroke="#8B5CF6"
                   strokeWidth={1 + weight * 8}
                   opacity={0.3 + weight}
                   className="transition-all duration-500"
                 />
               );
            })}

            {/* Nodes */}
            {positions.map((pos, i) => (
              <g key={pos.id} transform={`translate(${pos.x}, ${pos.y})`}>
                 <circle 
                   r={i === 0 ? 25 : 15 + (i > 0 ? attentionWeights[i-1] * 20 : 0)} 
                   fill={i === 0 ? '#3B82F6' : '#1F2937'}
                   stroke={i === 0 ? 'white' : '#8B5CF6'}
                   strokeWidth={i === 0 ? 2 : 1 + (i > 0 ? attentionWeights[i-1] * 3 : 0)}
                   className="transition-all duration-500"
                 />
                 <text y={4} textAnchor="middle" fill="white" className="text-xs font-bold pointer-events-none">
                   {i === 0 ? 'Target' : `N${i}`}
                 </text>
                 {i > 0 && (
                   <text y={-25} textAnchor="middle" fill="#A78BFA" className="text-[10px] font-mono transition-all">
                     α={attentionWeights[i-1].toFixed(2)}
                   </text>
                 )}
              </g>
            ))}
         </svg>
       </div>
    </div>
  );
};

// 4. Skip Connections Impact
const SkipConnectionSimulation = ({ setLog }) => {
  const [layers, setLayers] = useState(10);
  const [useSkip, setUseSkip] = useState(true);
  const [learningRate, setLearningRate] = useState(0.01);

  // Generate synthetic loss data
  const chartData = useMemo(() => {
    const epochs = 50;
    const data = [];
    
    // Simulation Logic:
    // Without skip connections, deep networks suffer from vanishing gradients -> slower convergence or higher plateau.
    // Skip connections maintain gradient flow -> lower loss.
    
    let currentLoss = 2.5; // Initial loss
    
    for (let i = 0; i < epochs; i++) {
      // Degradation factor increases with layers if no skip connection
      const degradation = useSkip ? 1 : (1 + layers * 0.05);
      
      // Decay logic
      const decay = learningRate * (10 / degradation); 
      const noise = (Math.random() - 0.5) * 0.05;
      
      currentLoss = currentLoss - decay + noise;
      currentLoss = Math.max(0.1, currentLoss); // Floor
      
      data.push({ epoch: i, loss: currentLoss });
    }
    
    return data;
  }, [layers, useSkip, learningRate]);

  useEffect(() => {
    const finalLoss = chartData[chartData.length-1].loss.toFixed(4);
    setLog(`[SKIP] Layers: ${layers}, Skip: ${useSkip}, Final Loss: ${finalLoss}`);
  }, [chartData, layers, useSkip, setLog]);

  // SVG Chart helpers
  const width = 500;
  const height = 300;
  const padding = 40;
  
  const points = chartData.map((d, i) => {
    const x = padding + (i / 50) * (width - 2 * padding);
    const y = height - padding - (d.loss / 3) * (height - 2 * padding); // Map loss 0-3 to height
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="flex h-full">
      <div className="w-64 bg-gray-800 p-4 border-r border-gray-700">
        <h3 className="font-bold text-gray-100 mb-4">Deep GNN Training</h3>
        <SidebarControl label="Network Depth" description="Number of layers in the GNN.">
          <Slider min={2} max={30} step={1} value={layers} onChange={setLayers} />
        </SidebarControl>
        
        <SidebarControl label="Training Params">
           <div className="mb-2">
             <label className="text-xs text-gray-400">Learning Rate</label>
             <Slider min={0.001} max={0.1} step={0.001} value={learningRate} onChange={setLearningRate} />
           </div>
           <Toggle label="Use Skip Connections" value={useSkip} onChange={setUseSkip} />
        </SidebarControl>
        
        <div className="bg-gray-700 p-3 rounded text-xs mt-4">
           <p className="mb-1 text-gray-300">Theory:</p>
           <p className="text-gray-400 italic">
             Without skip connections (ResNet style), deeper networks (Layers &gt; 10) suffer from over-smoothing and vanishing gradients, leading to higher loss.
           </p>
        </div>
      </div>

      <div className="flex-1 bg-gray-900 flex flex-col items-center justify-center p-8">
         <h4 className="text-gray-400 mb-2 font-mono uppercase text-sm tracking-widest">Training Loss vs Epochs</h4>
         <svg width={width} height={height} className="bg-gray-800 rounded-lg shadow-xl">
           {/* Axes */}
           <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#4B5563" />
           <line x1={padding} y1={padding} x2={padding} y2={height-padding} stroke="#4B5563" />
           
           {/* Grid */}
           {[0.5, 1.0, 1.5, 2.0, 2.5].map(tick => {
              const y = height - padding - (tick / 3) * (height - 2 * padding);
              return (
                <g key={tick}>
                  <line x1={padding} y1={y} x2={width-padding} y2={y} stroke="#374151" strokeDasharray="4" />
                  <text x={padding - 10} y={y+3} textAnchor="end" className="text-[10px] fill-gray-500">{tick}</text>
                </g>
              )
           })}

           {/* Data Line */}
           <polyline 
             points={points} 
             fill="none" 
             stroke={useSkip ? "#10B981" : "#EF4444"} 
             strokeWidth="3" 
             strokeLinecap="round"
             className="transition-all duration-300"
           />
           
           {/* Legend */}
           <text x={width - 150} y={padding + 20} className="fill-gray-400 text-xs">
              Config: {layers} Layers, {useSkip ? 'ResNet' : 'Plain'}
           </text>
         </svg>
      </div>
    </div>
  );
};

// 5. GraphSAINT Sampling
const SamplingSimulation = ({ setLog }) => {
  const [samplingRate, setSamplingRate] = useState(0.3);
  const [step, setStep] = useState(0);
  
  // Memoize large graph
  const { adj, positions, edges } = useMemo(() => {
    const nodes = 40;
    const { adj, positions } = generateGraph(nodes, 0.15);
    const edges = [];
    for(let i=0; i<nodes; i++) {
      for(let j=i+1; j<nodes; j++) {
        if (adj[i][j]) edges.push({ s: i, t: j });
      }
    }
    return { adj, positions, edges };
  }, []);

  // Determine sampled nodes for current step
  const sampledData = useMemo(() => {
    // Pseudo-random sampling based on step to make it deterministic but changing
    const sampledNodeIndices = new Set();
    const count = Math.floor(positions.length * samplingRate);
    
    // Simple random node sampler
    // Use step as seed offset
    const indices = Array.from({length: positions.length}, (_, i) => i);
    // Fisher-Yates shuffle approximation with step
    for(let i = indices.length - 1; i > 0; i--){
      const j = (Math.floor((Math.sin(step * 999 + i) * 0.5 + 0.5) * (i + 1))) % (i+1);
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    
    indices.slice(0, count).forEach(idx => sampledNodeIndices.add(idx));

    const sampledEdges = edges.filter(e => sampledNodeIndices.has(e.s) && sampledNodeIndices.has(e.t));
    
    return { nodes: sampledNodeIndices, edges: sampledEdges };
  }, [positions, edges, samplingRate, step]);

  useEffect(() => {
     setLog(`[SAINT] Epoch ${step}: Sampled ${sampledData.nodes.size} Nodes, ${sampledData.edges.length} Edges. Rate: ${samplingRate}`);
  }, [step, sampledData, samplingRate, setLog]);

  return (
    <div className="flex h-full">
      <div className="w-64 bg-gray-800 p-4 border-r border-gray-700">
        <h3 className="font-bold text-gray-100 mb-4">GraphSAINT Sampling</h3>
        <SidebarControl label="Sampling Rate" description="Fraction of nodes to keep per subgraph batch.">
           <Slider min={0.1} max={1.0} step={0.1} value={samplingRate} onChange={setSamplingRate} />
        </SidebarControl>

        <button 
           onClick={() => setStep(s => s + 1)}
           className="w-full bg-green-600 hover:bg-green-500 text-white py-2 rounded flex items-center justify-center gap-2 font-bold mb-4"
        >
          <Play size={16} /> Next Batch
        </button>

        <div className="bg-gray-700 p-3 rounded text-xs space-y-2">
           <div className="flex justify-between border-b border-gray-600 pb-1">
             <span className="text-gray-400">Total Nodes:</span>
             <span className="text-white">{positions.length}</span>
           </div>
           <div className="flex justify-between border-b border-gray-600 pb-1">
             <span className="text-gray-400">Sampled Nodes:</span>
             <span className="text-green-400 font-bold">{sampledData.nodes.size}</span>
           </div>
           <div className="flex justify-between">
             <span className="text-gray-400">Induced Edges:</span>
             <span className="text-green-400 font-bold">{sampledData.edges.length}</span>
           </div>
        </div>
      </div>

      <div className="flex-1 bg-gray-900 overflow-hidden flex items-center justify-center p-4">
         <div className="relative border border-gray-700 rounded-lg bg-gray-900 shadow-2xl">
           <svg width="600" height="500" viewBox="0 0 400 400">
             {/* All Edges (faint) */}
             {edges.map((e, i) => (
               <line key={`base-e-${i}`} 
                 x1={positions[e.s].x} y1={positions[e.s].y} 
                 x2={positions[e.t].x} y2={positions[e.t].y}
                 stroke="#374151" strokeWidth="1" opacity="0.5"
               />
             ))}
             
             {/* Sampled Edges (Bright) */}
             {sampledData.edges.map((e, i) => (
                <line key={`samp-e-${i}`} 
                 x1={positions[e.s].x} y1={positions[e.s].y} 
                 x2={positions[e.t].x} y2={positions[e.t].y}
                 stroke="#10B981" strokeWidth="2"
               />
             ))}

             {/* Nodes */}
             {positions.map((p, i) => {
               const isSampled = sampledData.nodes.has(i);
               return (
                 <circle key={i}
                   cx={p.x} cy={p.y}
                   r={isSampled ? 6 : 3}
                   fill={isSampled ? "#10B981" : "#4B5563"}
                   className="transition-all duration-300"
                 />
               );
             })}
           </svg>
         </div>
      </div>
    </div>
  );
};

// --- Main Application Shell ---

const NavButton = ({ active, id, icon: Icon, label, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors
      ${active === id 
        ? 'bg-blue-600 text-white border-r-4 border-blue-300' 
        : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
  >
    <Icon size={18} />
    {label}
  </button>
);

export default function GraphNeuralNetworksDeepDive() {
  const [activeModule, setActiveModule] = useState('arch');
  const [logs, setLogs] = useState([]);
  const logContainerRef = useRef(null);

  const addLog = useCallback((msg) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${msg}`, ...prev].slice(0, 50)); // Keep last 50
  }, []);

  useEffect(() => {
     addLog("System Initialized. Welcome to GNN Deep Dive.");
  }, [addLog]);

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 font-sans overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Share2 size={20} className="text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight text-white">
            GNN<span className="text-blue-500">DeepDive</span>
          </h1>
        </div>
        <div className="text-xs text-gray-500 flex items-center gap-4">
           <span className="flex items-center gap-1"><Activity size={12}/> Interactive Review</span>
           <span className="flex items-center gap-1"><Info size={12}/> v1.0.0</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <nav className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col py-4">
          <div className="px-4 mb-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Modules</div>
          <NavButton active={activeModule} id="arch" icon={Layers} label="Architectures" onClick={setActiveModule} />
          <NavButton active={activeModule} id="conv" icon={RefreshCw} label="Graph Convolution" onClick={setActiveModule} />
          <NavButton active={activeModule} id="gat" icon={Zap} label="Attention (GAT)" onClick={setActiveModule} />
          <NavButton active={activeModule} id="skip" icon={GitMerge} label="Skip Connections" onClick={setActiveModule} />
          <NavButton active={activeModule} id="saint" icon={Activity} label="GraphSAINT" onClick={setActiveModule} />
        </nav>

        {/* Workspace */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Main Stage */}
          <main className="flex-1 relative overflow-hidden bg-gray-950">
            {activeModule === 'arch' && <ArchitectureExplorer setLog={addLog} />}
            {activeModule === 'conv' && <ConvolutionSimulation setLog={addLog} />}
            {activeModule === 'gat' && <AttentionSimulation setLog={addLog} />}
            {activeModule === 'skip' && <SkipConnectionSimulation setLog={addLog} />}
            {activeModule === 'saint' && <SamplingSimulation setLog={addLog} />}
          </main>

          {/* Log Panel */}
          <div className="h-32 bg-gray-900 border-t border-gray-800 flex flex-col">
            <div className="px-4 py-1 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
               <span className="text-xs font-mono text-gray-400">SYSTEM LOGS</span>
               <button onClick={() => setLogs([])} className="text-[10px] text-gray-500 hover:text-white">CLEAR</button>
            </div>
            <div ref={logContainerRef} className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1">
              {logs.map((log, i) => (
                <div key={i} className="text-gray-400 border-l-2 border-blue-900 pl-2">
                  <span className="text-blue-500 opacity-50 mr-2">{log.split(']')[0]}]</span>
                  <span className="text-gray-300">{log.split(']').slice(1).join(']')}</span>
                </div>
              ))}
              {logs.length === 0 && <span className="text-gray-600 italic">No logs generated yet...</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}