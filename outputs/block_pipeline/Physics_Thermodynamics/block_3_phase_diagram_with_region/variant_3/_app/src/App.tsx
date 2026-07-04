import React, { useState, useRef, useEffect } from 'react';
import { Snowflake, Droplets, Cloud, Sparkles, Info, Settings2 } from 'lucide-react';

type Phase = 'solid' | 'liquid' | 'gas' | 'supercritical' | null;

const PHASE_INFO = {
  solid: {
    title: 'Solid Phase',
    icon: <Snowflake className="w-6 h-6 text-cyan-500" />,
    color: 'bg-cyan-100 border-cyan-300 text-cyan-900',
    fill: 'fill-cyan-400',
    description: 'Particles are tightly packed in a rigid structure. They vibrate in place but do not move past one another. Occurs at lower temperatures and higher pressures.',
    details: ['High Density', 'Fixed Shape', 'Fixed Volume']
  },
  liquid: {
    title: 'Liquid Phase',
    icon: <Droplets className="w-6 h-6 text-blue-500" />,
    color: 'bg-blue-100 border-blue-300 text-blue-900',
    fill: 'fill-blue-500',
    description: 'Particles are close together but have enough energy to slide past each other. The substance flows to take the shape of its container.',
    details: ['Medium Density', 'Variable Shape', 'Fixed Volume']
  },
  gas: {
    title: 'Gas Phase',
    icon: <Cloud className="w-6 h-6 text-orange-500" />,
    color: 'bg-orange-100 border-orange-300 text-orange-900',
    fill: 'fill-orange-400',
    description: 'Particles are widely spaced and move rapidly in all directions. They have enough kinetic energy to overcome intermolecular forces entirely.',
    details: ['Low Density', 'Variable Shape', 'Variable Volume']
  },
  supercritical: {
    title: 'Supercritical Fluid',
    icon: <Sparkles className="w-6 h-6 text-purple-500" />,
    color: 'bg-purple-100 border-purple-300 text-purple-900',
    fill: 'fill-purple-500',
    description: 'Beyond the critical point, distinct liquid and gas phases cease to exist. It can effuse through solids like a gas, and dissolve materials like a liquid.',
    details: ['High Density', 'Highly Diffusive', 'No Phase Boundary']
  }
};

export default function App() {
  const [hoveredPhase, setHoveredPhase] = useState<Phase>(null);
  const [isAnomalous, setIsAnomalous] = useState(false); // e.g., Water (negative slope) vs CO2 (positive slope)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // SVG Coordinate configuration
  const width = 600;
  const height = 400;
  
  // Key points
  const tpX = 220; // Triple Point X
  const tpY = 260; // Triple Point Y
  const cpX = 460; // Critical Point X
  const cpY = 120; // Critical Point Y
  
  // Boundary limits
  const leftX = 60;
  const rightX = 560;
  const topY = 40;
  const bottomY = 360;

  // The fusion line (solid-liquid boundary) slope changes based on standard vs anomalous (like water)
  // Anomalous expands when freezing, so increasing pressure LOWERS the melting point (leans left).
  const fusionTopX = isAnomalous ? 160 : 260;

  // SVG Paths for Regions
  // Using exact boundaries so they tile perfectly
  const solidPath = `M ${leftX} ${topY} L ${fusionTopX} ${topY} L ${tpX} ${tpY} Q ${140} ${300} ${leftX} ${bottomY} Z`;
  const liquidPath = `M ${fusionTopX} ${topY} L ${cpX} ${topY} L ${cpX} ${cpY} Q ${320} ${200} ${tpX} ${tpY} Z`;
  const gasPath = `M ${leftX} ${bottomY} Q ${140} ${300} ${tpX} ${tpY} Q ${320} ${200} ${cpX} ${cpY} L ${rightX} ${cpY} L ${rightX} ${bottomY} Z`;
  const supercriticalPath = `M ${cpX} ${topY} L ${rightX} ${topY} L ${rightX} ${cpY} L ${cpX} ${cpY} Z`;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-100 to-rose-100 p-8 font-sans text-slate-800 flex items-center justify-center">
      
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Interactive Diagram */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          
          <div className="bg-white/60 backdrop-blur-xl border border-white/50 p-6 rounded-3xl shadow-xl">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-rose-600 mb-2">
                  Phase Diagram
                </h1>
                <p className="text-slate-600 font-medium">Explore the states of matter across temperature and pressure.</p>
              </div>
              
              <button 
                onClick={() => setIsAnomalous(!isAnomalous)}
                className="flex items-center gap-2 px-4 py-2 bg-white/80 hover:bg-white rounded-full shadow-sm border border-slate-200 text-sm font-semibold transition-colors text-slate-700"
              >
                <Settings2 className="w-4 h-4" />
                {isAnomalous ? "Anomalous (e.g. H₂O)" : "Standard (e.g. CO₂)"}
              </button>
            </div>

            {/* SVG Container */}
            <div 
              ref={containerRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredPhase(null)}
              className="relative w-full aspect-video bg-white/40 rounded-2xl border border-slate-200 overflow-hidden shadow-inner cursor-crosshair"
            >
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                {/* Grid & Axes */}
                <g className="text-slate-300 stroke-current" strokeWidth="1" strokeDasharray="4 4">
                  {[100, 180, 260].map(y => <line key={`hy-${y}`} x1={leftX} y1={y} x2={rightX} y2={y} />)}
                  {[160, 260, 360, 460].map(x => <line key={`vx-${x}`} x1={x} y1={topY} x2={x} y2={bottomY} />)}
                </g>

                {/* Regions */}
                <path 
                  d={solidPath} 
                  className={`${PHASE_INFO.solid.fill} transition-all duration-500 cursor-pointer ${hoveredPhase === 'solid' ? 'opacity-40' : 'opacity-10'}`}
                  onMouseEnter={() => setHoveredPhase('solid')}
                />
                <path 
                  d={liquidPath} 
                  className={`${PHASE_INFO.liquid.fill} transition-all duration-500 cursor-pointer ${hoveredPhase === 'liquid' ? 'opacity-40' : 'opacity-10'}`}
                  onMouseEnter={() => setHoveredPhase('liquid')}
                />
                <path 
                  d={gasPath} 
                  className={`${PHASE_INFO.gas.fill} transition-all duration-500 cursor-pointer ${hoveredPhase === 'gas' ? 'opacity-40' : 'opacity-10'}`}
                  onMouseEnter={() => setHoveredPhase('gas')}
                />
                <path 
                  d={supercriticalPath} 
                  className={`${PHASE_INFO.supercritical.fill} transition-all duration-500 cursor-pointer ${hoveredPhase === 'supercritical' ? 'opacity-40' : 'opacity-10'}`}
                  onMouseEnter={() => setHoveredPhase('supercritical')}
                />

                {/* Boundaries (Solid Lines) */}
                <g className="stroke-slate-700 pointer-events-none" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  {/* Fusion Line */}
                  <path d={`M ${tpX} ${tpY} L ${fusionTopX} ${topY}`} className="transition-all duration-500" />
                  {/* Sublimation Line */}
                  <path d={`M ${leftX} ${bottomY} Q ${140} ${300} ${tpX} ${tpY}`} />
                  {/* Vaporization Line */}
                  <path d={`M ${tpX} ${tpY} Q ${320} ${200} ${cpX} ${cpY}`} />
                </g>

                {/* Supercritical Boundaries (Dashed) */}
                <g className="stroke-slate-400 pointer-events-none" fill="none" strokeWidth="2" strokeDasharray="6 6">
                  <path d={`M ${cpX} ${cpY} L ${cpX} ${topY}`} />
                  <path d={`M ${cpX} ${cpY} L ${rightX} ${cpY}`} />
                </g>

                {/* Axes Lines */}
                <g className="stroke-slate-800 pointer-events-none" strokeWidth="3">
                  <line x1={leftX} y1={topY} x2={leftX} y2={bottomY} />
                  <line x1={leftX} y1={bottomY} x2={rightX} y2={bottomY} />
                </g>

                {/* Axis Labels */}
                <text x={leftX - 20} y={height / 2} transform={`rotate(-90 ${leftX - 20} ${height / 2})`} className="fill-slate-700 text-sm font-bold pointer-events-none" textAnchor="middle">Pressure (P)</text>
                <text x={width / 2} y={bottomY + 30} className="fill-slate-700 text-sm font-bold pointer-events-none" textAnchor="middle">Temperature (T)</text>

                {/* Points of Interest */}
                <g className="pointer-events-none">
                  {/* Triple Point */}
                  <circle cx={tpX} cy={tpY} r="5" className="fill-white stroke-slate-800" strokeWidth="3" />
                  <text x={tpX + 10} y={tpY + 20} className="fill-slate-800 text-xs font-bold bg-white">Triple Point</text>
                  
                  {/* Critical Point */}
                  <circle cx={cpX} cy={cpY} r="5" className="fill-white stroke-rose-600" strokeWidth="3" />
                  <text x={cpX - 10} y={cpY - 15} className="fill-rose-700 text-xs font-bold" textAnchor="end">Critical Point</text>
                </g>

                {/* Region Labels (Static) */}
                <text x={120} y={150} className={`text-xl font-black pointer-events-none transition-opacity ${hoveredPhase === 'solid' ? 'opacity-100 fill-cyan-700' : 'opacity-30 fill-slate-500'}`}>SOLID</text>
                <text x={300} y={120} className={`text-xl font-black pointer-events-none transition-opacity ${hoveredPhase === 'liquid' ? 'opacity-100 fill-blue-700' : 'opacity-30 fill-slate-500'}`}>LIQUID</text>
                <text x={350} y={300} className={`text-xl font-black pointer-events-none transition-opacity ${hoveredPhase === 'gas' ? 'opacity-100 fill-orange-700' : 'opacity-30 fill-slate-500'}`}>GAS</text>
                <text x={500} y={80} className={`text-sm font-black pointer-events-none transition-opacity ${hoveredPhase === 'supercritical' ? 'opacity-100 fill-purple-700' : 'opacity-30 fill-slate-500'}`} textAnchor="middle">SUPERCRITICAL<br/>FLUID</text>
              </svg>

              {/* Dynamic Hover Tooltip */}
              {hoveredPhase && (
                <div 
                  className="absolute pointer-events-none transition-transform duration-75 ease-out"
                  style={{ 
                    left: `${mousePos.x}px`, 
                    top: `${mousePos.y}px`,
                    transform: 'translate(15px, 15px)'
                  }}
                >
                  <div className={`px-4 py-2 rounded-xl shadow-lg border backdrop-blur-md ${PHASE_INFO[hoveredPhase].color} bg-opacity-90`}>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      {PHASE_INFO[hoveredPhase].icon}
                      <span className="font-bold">{PHASE_INFO[hoveredPhase].title}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-4 flex gap-4 text-xs font-medium text-slate-500 justify-center">
              <span className="flex items-center gap-1"><div className="w-3 h-0.5 bg-slate-700 rounded-full" /> Phase Boundaries</span>
              <span className="flex items-center gap-1"><div className="w-3 h-0.5 border-t-2 border-dashed border-slate-400" /> Supercritical Boundaries</span>
            </div>
          </div>
        </div>

        {/* Right Column: Info Card */}
        <div className="flex flex-col gap-6">
          <div className={`flex-1 transition-all duration-500 bg-white/80 backdrop-blur-xl rounded-3xl p-8 border shadow-xl ${hoveredPhase ? PHASE_INFO[hoveredPhase].color.