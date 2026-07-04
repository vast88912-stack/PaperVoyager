import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Math & Function Definitions ---

type Topology = {
  id: string;
  name: string;
  equation: string;
  description: string;
  fn: (x: number, y: number) => number;
  domain: [number, number]; // [min, max] for both x and y
  zRange: [number, number];
  learningRate: number; // Suggested LR for the preview animation
};

const TOPOLOGIES: Topology[] = [
  {
    id: 'bowl',
    name: 'Convex Bowl',
    equation: 'f(x,y) = x² + y²',
    description: 'The "Hello World" of optimization. A perfectly smooth convex surface with a single global minimum at (0,0). Gradient descent converges reliably here.',
    fn: (x, y) => x * x + y * y,
    domain: [-2, 2],
    zRange: [0, 8],
    learningRate: 0.1,
  },
  {
    id: 'saddle',
    name: 'Saddle Point',
    equation: 'f(x,y) = x² - y²',
    description: 'A classic non-convex challenge. The center is a minimax point: a minimum along one axis and a maximum along the other. Vanilla GD can get stuck here.',
    fn: (x, y) => x * x - y * y,
    domain: [-2, 2],
    zRange: [-4, 4],
    learningRate: 0.05,
  },
  {
    id: 'rastrigin',
    name: 'Rastrigin Function',
    equation: 'f(x,y) = 20 + x² - 10cos(2πx) + y² - 10cos(2πy)',
    description: 'A highly non-convex landscape littered with local minima. Simulates complex neural network loss landscapes. Requires momentum or Adam to escape traps.',
    fn: (x, y) => 20 + (x * x - 10 * Math.cos(2 * Math.PI * x)) + (y * y - 10 * Math.cos(2 * Math.PI * y)),
    domain: [-2.5, 2.5],
    zRange: [0, 45],
    learningRate: 0.01,
  }
];

// Finite difference gradient computation
const getGradient = (fn: (x: number, y: number) => number, x: number, y: number, h = 0.0001): [number, number] => {
  const dx = (fn(x + h, y) - fn(x - h, y)) / (2 * h);
  const dy = (fn(x, y + h) - fn(x, y - h)) / (2 * h);
  return [dx, dy];
};

// Map normalized value [0,1] to Charcoal/Teal gradient
const getColor = (t: number): string => {
  // Charcoal: rgb(31, 41, 55)
  // Dark Teal: rgb(15, 118, 110)
  // Bright Teal: rgb(45, 212, 191)
  
  // Custom multi-stop interpolation
  if (t < 0.5) {
    const t2 = t * 2; // 0 to 1
    const r = Math.round(31 + t2 * (15 - 31));
    const g = Math.round(41 + t2 * (118 - 41));
    const b = Math.round(55 + t2 * (110 - 55));
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const t2 = (t - 0.5) * 2; // 0 to 1
    const r = Math.round(15 + t2 * (45 - 15));
    const g = Math.round(118 + t2 * (212 - 118));
    const b = Math.round(110 + t2 * (191 - 110));
    return `rgb(${r}, ${g}, ${b})`;
  }
};

// --- Components ---

interface TopologyCardProps {
  topology: Topology;
  isSelected: boolean;
  onSelect: () => void;
}

const TopologyCard: React.FC<TopologyCardProps> = ({ topology, isSelected, onSelect }) => {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const animCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const animRef = useRef<number>();

  const drawBackground = useCallback(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const [minDomain, maxDomain] = topology.domain;
    const [minZ, maxZ] = topology.zRange;
    const range = maxDomain - minDomain;

    // Resolution for rendering (block size)
    const res = 4;

    for (let px = 0; px < width; px += res) {
      for (let py = 0; py < height; py += res) {
        // Map pixel to domain
        const x = minDomain + (px / width) * range;
        const y = maxDomain - (py / height) * range; // Invert Y for standard Cartesian

        const z = topology.fn(x, y);
        
        // Normalize Z
        let normZ = (z - minZ) / (maxZ - minZ);
        normZ = Math.max(0, Math.min(1, normZ));

        ctx.fillStyle = getColor(1 - normZ); // Invert so lower is darker/charcoal, higher is teal
        ctx.fillRect(px, py, res, res);
      }
    }

    // Draw contours (simple thresholding)
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let px = 0; px < width; px += 2) {
      for (let py = 0; py < height; py += 2) {
        const x = minDomain + (px / width) * range;
        const y = maxDomain - (py / height) * range;
        const z = topology.fn(x, y);
        const normZ = (z - minZ) / (maxZ - minZ);
        
        // Add subtle contour lines
        if (Math.abs((normZ * 10) % 1) < 0.1) {
             ctx.fillRect(px, py, 2, 2);
        }
      }
    }
  }, [topology]);

  useEffect(() => {
    drawBackground();
  }, [drawBackground]);

  // Handle preview animation on hover
  useEffect(() => {
    const canvas = animCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    if (!isHovered && !isSelected) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const [minDomain, maxDomain] = topology.domain;
    const range = maxDomain - minDomain;
    
    // Starting point (random edge)
    let currentX = minDomain + Math.random() * range;
    let currentY = maxDomain; // Start near top

    // Specific starting logic for better visuals
    if (topology.id === 'saddle') {
      currentX = (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random() * 0.5);
      currentY = (Math.random() > 0.5 ? 1 : -1) * (0.1 + Math.random() * 0.5);
    } else if (topology.id === 'bowl') {
      const angle = Math.random() * Math.PI * 2;
      currentX = Math.cos(angle) * 1.8;
      currentY = Math.sin(angle) * 1.8;
    }

    let path: [number, number][] = [[currentX, currentY]];
    let step = 0;

    const mapToScreen = (x: number, y: number) => {
      const px = ((x - minDomain) / range) * canvas.width;
      const py = ((maxDomain - y) / range) * canvas.height;
      return [px, py];
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw path
      if (path.length > 1) {
        ctx.beginPath();
        const [startX, startY] = mapToScreen(path[0][0], path[0][1]);
        ctx.moveTo(startX, startY);
        for (let i = 1; i < path.length; i++) {
          const [px, py] = mapToScreen(path[i][0], path[i][1]);
          ctx.lineTo(px, py);
        }
        ctx.strokeStyle = '#2dd4bf'; // Teal-400
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Add glow
        ctx.shadowColor = '#2dd4bf';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset
      }

      // Draw current particle
      const [px, py] = mapToScreen(currentX, currentY);
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      
      // Outer ring
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // GD Update
      if (step < 150) { // Limit steps
        const [dx, dy] = getGradient(topology.fn, currentX, currentY);
        currentX -= topology.learningRate * dx;
        currentY -= topology.learningRate * dy;
        path.push([currentX, currentY]);
        step++;
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isHovered, isSelected, topology]);

  return (
    <div 
      className={`relative flex flex-col rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ease-out border-2 group
        ${isSelected 
          ? 'border-teal-400 bg-gray-800 shadow-[0_0_30px_rgba(45,212,191,0.2)] transform -translate-y-1' 
          : 'border-gray-700 bg-gray-900/50 hover:border-teal-700 hover:bg-gray-800'
        }`}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Visual Canvas Area */}
      <div className="relative w-full aspect-square border-b border-gray-700/50 overflow-hidden bg-gray-950">
        <canvas 
          ref={bgCanvasRef} 
          width={400} 
          height={400} 
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <canvas 
          ref={animCanvasRef} 
          width={400} 
          height={400} 
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Overlay Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60" />
        
        {/* Label badge inside canvas */}
        <div className="absolute top-4 left-4">
          <span className={`px-3 py-1 text-xs font-mono font-bold rounded-full uppercase tracking-wider transition-colors
            ${isSelected ? 'bg-teal-400 text-gray-900' : 'bg-gray-800/80 text-teal-500 backdrop-blur-sm group-hover:bg-teal-900/50'}
          `}>
            {topology.id.toUpperCase()}
          </span>
        </div>

        {/* Play icon hint */}
        <div className={`absolute bottom-4 right-4 text-teal-400 transition-opacity duration-300 ${isHovered || isSelected ? 'opacity-100' : 'opacity-0'}`}>
          <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-white mb-2 font-sans tracking-tight">
          {topology.name}
        </h3>
        <div className="mb-4 text-teal-300 font-mono text-sm bg-gray-950/50 p-2 rounded border border-gray-800 overflow-hidden text-ellipsis whitespace-nowrap">
          {topology.equation}
        </div>
        <p className="text-gray-400 text-sm leading-relaxed flex-grow">
          {topology.description}
        </p>

        {/* Selection Indicator */}
        <div className="mt-6 flex items-center justify-between">
          <div className="text-xs font-mono text-gray-500">
            DOMAIN: [{topology.domain[0]}, {topology.domain[1]}]²
          </div>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
            ${isSelected ? 'border-teal-400 bg-teal-400' : 'border-gray-600'}
          `}>
            {isSelected && (
              <svg className="w-4 h-4 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [selectedId, setSelectedId] = useState<string>(TOPOLOGIES[0].id);

  return (
    <div className="min-h-screen bg-[#111827] text-gray-100 font-sans selection:bg-teal-500/30">
      
      {/* Header / Hero Section */}
      <header className="pt-16 pb-12 px-8 max-w-7xl mx-auto border-b border-gray-800">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-400/10 text-teal-400 text-sm font-mono mb-6 border border-teal-400/20">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
          Module 01 / Environment Setup
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
          Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-200">Topography</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-3xl leading-relaxed">
          Before diving into optimizers, we need a landscape to traverse. Select a 2D function below to set the stage. Hover over the views to see how a naive gradient descent particle reacts.
        </p>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {TOPOLOGIES.map((topology) => (
            <TopologyCard
              key={topology.id}
              topology={topology}
              isSelected={selectedId === topology.id}
              onSelect={() => setSelectedId(topology.id)}
            />
          ))}
        </div>

        {/* Next Step Action (Stub for context) */}
        <div className="mt-16 flex justify-end">
          <button className="group flex items-center gap-3 bg-teal-500 hover:bg-teal-400 text-gray-900 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(45,212,191,0.5)] transform hover:-translate-y-1">
            Initialize Environment
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </main>

      {/* Decorative background elements */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-teal-900/20 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-teal-800/10 blur-[120px]"></div>
      </div>
    </div>
  );
}