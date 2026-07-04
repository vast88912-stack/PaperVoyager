import React, { useState, useRef, MouseEvent } from 'react';

type RegionKey = 'solid' | 'liquid' | 'gas' | 'supercritical' | 'triple' | 'critical' | null;

interface RegionData {
  id: RegionKey;
  title: string;
  description: string;
  color: string;
  bgGlow: string;
}

const REGION_INFO: Record<Exclude<RegionKey, null>, RegionData> = {
  solid: {
    id: 'solid',
    title: 'Solid Phase',
    description: 'Molecules are tightly bound in a rigid lattice structure. Characterized by low thermal energy and high density.',
    color: 'text-blue-300',
    bgGlow: 'bg-blue-500/20',
  },
  liquid: {
    id: 'liquid',
    title: 'Liquid Phase',
    description: 'Molecules have enough thermal energy to break rigid bonds and flow, but remain closely packed due to intermolecular forces.',
    color: 'text-emerald-300',
    bgGlow: 'bg-emerald-500/20',
  },
  gas: {
    id: 'gas',
    title: 'Gaseous Phase',
    description: 'High thermal energy overcomes intermolecular forces. Molecules move freely and rapidly, expanding to fill their container.',
    color: 'text-amber-300',
    bgGlow: 'bg-amber-500/20',
  },
  supercritical: {
    id: 'supercritical',
    title: 'Supercritical Fluid',
    description: 'Beyond the critical point, distinct liquid and gas phases cease to exist. It can effuse through solids like a gas and dissolve materials like a liquid.',
    color: 'text-purple-300',
    bgGlow: 'bg-purple-500/20',
  },
  triple: {
    id: 'triple',
    title: 'Triple Point',
    description: 'The exact temperature and pressure where solid, liquid, and gas phases coexist in perfect thermodynamic equilibrium.',
    color: 'text-pink-300',
    bgGlow: 'bg-pink-500/20',
  },
  critical: {
    id: 'critical',
    title: 'Critical Point',
    description: 'The end point of the phase equilibrium curve. Above this temperature and pressure, there is no phase boundary between liquid and gas.',
    color: 'text-rose-300',
    bgGlow: 'bg-rose-500/20',
  }
};

export default function App() {
  const [activeRegion, setActiveRegion] = useState<RegionKey>(null);
  const [cursorData, setCursorData] = useState<{ T: number; P: number; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;

    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());

    if (svgP) {
      // Bounds of our graph area
      if (svgP.x >= 40 && svgP.x <= 460 && svgP.y >= 40 && svgP.y <= 360) {
        // Map SVG coordinates to Temperature (0-600 K) and Pressure (0-300 atm)
        const T = ((svgP.x - 40) / 420) * 600;
        const P = ((360 - svgP.y) / 320) * 300;
        setCursorData({ x: svgP.x, y: svgP.y, T, P });
      } else {
        setCursorData(null);
      }
    }
  };

  const handleMouseLeave = () => {
    setCursorData(null);
    setActiveRegion(null);
  };

  const activeInfo = activeRegion ? REGION_INFO[activeRegion] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-950 to-red-950 p-4 md:p-8 flex flex-col items-center font-sans text-orange-50 selection:bg-orange-500/30">
      <header className="mb-8 text-center max-w-2xl">
        <div className="inline-flex items-center justify-center space-x-3 mb-2">
          <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-200 drop-shadow-sm">
            Thermo Playground
          </h1>
        </div>
        <p className="text-orange-200/70 text-sm md:text-base font-medium">
          Explore the states of matter. Hover over the phase diagram regions to understand how temperature and pressure dictate molecular behavior.
        </p>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Interactive Diagram Column */}
        <div className="lg:col-span-2 relative group">
          {/* Decorative glow behind the diagram */}
          <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-red-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
          
          <div className="relative bg-black/50 backdrop-blur-xl border border-orange-500/20 rounded-3xl p-4 md:p-6 shadow-2xl overflow-hidden">
            <svg
              ref={svgRef}
              viewBox="0 0 500 400"
              className="w-full h-auto cursor-crosshair drop-shadow-xl select-none"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
                </pattern>
              </defs>

              {/* Background Grid */}
              <rect x="40" y="40" width="420" height="320" fill="url(#grid)" />

              {/* --- REGION POLYGONS (Interactive) --- */}
              {/* Solid Region */}
              <path
                d="M 40 40 L 220 40 Q 200 150 180 260 Q 110 310 40 360 Z"
                className={`transition-all duration-300 cursor-pointer ${activeRegion === 'solid' ? 'fill-blue-500/40' : 'fill-blue-500/10'}`}
                onMouseEnter={() => setActiveRegion('solid')}
              />
              {/* Liquid Region */}
              <path
                d="M 220 40 Q 200 150 180 260 Q 280 200 380 120 L 380 40 Z"
                className={`transition-all duration-300 cursor-pointer ${activeRegion === 'liquid' ? 'fill-emerald-500/40' : 'fill-emerald-500/10'}`}
                onMouseEnter={() => setActiveRegion('liquid')}
              />
              {/* Gas Region */}
              <path
                d="M 40 360 Q 110 310 180 260 Q 280 200 380 120 L 460 120 L 460 360 Z"
                className={`transition-all duration-300 cursor-pointer ${activeRegion === 'gas' ? 'fill-amber-500/40' : 'fill-amber-500/10'}`}
                onMouseEnter={() => setActiveRegion('gas')}
              />
              {/* Supercritical Region */}
              <path
                d="M 380 120 L 380 40 L 460 40 L 460 120 Z"
                className={`transition-all duration-300 cursor-pointer ${activeRegion === 'supercritical' ? 'fill-purple-500/40' : 'fill-purple-500/10'}`}
                onMouseEnter={() => setActiveRegion('supercritical')}
              />

              {/* --- BOUNDARY LINES (Non-interactive) --- */}
              <g className="pointer-events-none" fill="none" strokeWidth="3" filter="url(#glow)">
                {/* Sublimation Curve */}
                <path d="M 40 360 Q 110 310 180 260" stroke="rgba(255, 255, 255, 0.6)" />
                {/* Fusion Curve */}
                <path d="M 180 260 Q 200 150 220 40" stroke="rgba(255, 255, 255, 0.6)" />
                {/* Vaporization Curve */}
                <path d="M 180 260 Q 280 200 380 120" stroke="rgba(255, 255, 255, 0.6)" />
                {/* Critical Boundaries (Dashed) */}
                <path d="M 380 120 L 380 40" stroke="rgba(255, 255, 255, 0.3)" strokeDasharray="6 4" strokeWidth="2" />
                <path d="M 380 120 L 460 120" stroke="rgba(255, 255, 255, 0.3)" strokeDasharray="6 4" strokeWidth="2" />
              </g>

              {/* --- REGION LABELS (Non-interactive) --- */}
              <g className="pointer-events-none font-bold text-xs md:text-sm tracking-widest" fill="currentColor">
                <text x="100" y="150