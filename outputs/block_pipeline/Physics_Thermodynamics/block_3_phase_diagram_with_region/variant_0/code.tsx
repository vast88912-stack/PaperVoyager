import React, { useState } from 'react';

type RegionKey = 'solid' | 'liquid' | 'gas' | 'supercritical' | 'triple' | 'critical' | null;

interface RegionInfo {
  title: string;
  subtitle: string;
  description: string;
  color: string;
  bgLight: string;
  properties: { label: string; value: string }[];
}

const REGION_DATA: Record<string, RegionInfo> = {
  solid: {
    title: 'Solid Phase',
    subtitle: 'Rigid Lattice Structure',
    description: 'Molecules are tightly packed in a regular pattern and vibrate in place. Intermolecular forces are strong enough to hold them in a fixed arrangement.',
    color: 'text-blue-600',
    bgLight: 'bg-blue-50',
    properties: [
      { label: 'Shape', value: 'Definite' },
      { label: 'Volume', value: 'Definite' },
      { label: 'Compressibility', value: 'Very Low' },
      { label: 'Molecular Motion', value: 'Vibration only' },
    ],
  },
  liquid: {
    title: 'Liquid Phase',
    subtitle: 'Fluid & Cohesive',
    description: 'Molecules are close together but can slide past one another. The substance flows to take the shape of its container while maintaining a constant volume.',
    color: 'text-teal-600',
    bgLight: 'bg-teal-50',
    properties: [
      { label: 'Shape', value: 'Indefinite' },
      { label: 'Volume', value: 'Definite' },
      { label: 'Compressibility', value: 'Low' },
      { label: 'Molecular Motion', value: 'Sliding / Flowing' },
    ],
  },
  gas: {
    title: 'Gas Phase',
    subtitle: 'Highly Energetic',
    description: 'Molecules move rapidly and freely, spreading out to fill any container. Intermolecular forces are largely overcome by kinetic energy.',
    color: 'text-orange-600',
    bgLight: 'bg-orange-50',
    properties: [
      { label: 'Shape', value: 'Indefinite' },
      { label: 'Volume', value: 'Indefinite' },
      { label: 'Compressibility', value: 'High' },
      { label: 'Molecular Motion', value: 'Rapid / Random' },
    ],
  },
  supercritical: {
    title: 'Supercritical Fluid',
    subtitle: 'Beyond the Critical Point',
    description: 'At temperatures and pressures above the critical point, distinct liquid and gas phases do not exist. It can effuse through solids like a gas, and dissolve materials like a liquid.',
    color: 'text-purple-600',
    bgLight: 'bg-purple-50',
    properties: [
      { label: 'Density', value: 'Liquid-like' },
      { label: 'Viscosity', value: 'Gas-like' },
      { label: 'Phase Boundaries', value: 'None' },
      { label: 'Diffusivity', value: 'High' },
    ],
  },
  triple: {
    title: 'Triple Point',
    subtitle: 'Thermodynamic Equilibrium',
    description: 'The exact temperature and pressure at which the solid, liquid, and gas phases of a substance coexist in perfect thermodynamic equilibrium.',
    color: 'text-rose-600',
    bgLight: 'bg-rose-50',
    properties: [
      { label: 'Degrees of Freedom', value: 'Zero' },
      { label: 'Coexisting Phases', value: 'Solid, Liquid, Gas' },
      { label: 'Significance', value: 'Calibration reference' },
    ],
  },
  critical: {
    title: 'Critical Point',
    subtitle: 'End of the Phase Boundary',
    description: 'The end point of the phase equilibrium curve. Beyond this temperature and pressure, there is no distinction between the liquid and gas phases.',
    color: 'text-indigo-600',
    bgLight: 'bg-indigo-50',
    properties: [
      { label: 'Latent Heat', value: 'Zero' },
      { label: 'Surface Tension', value: 'Zero' },
      { label: 'Density Fluctuation', value: 'Infinite (Opalescence)' },
    ],
  },
};

export default function App() {
  const [hovered, setHovered] = useState<RegionKey>(null);

  const activeData = hovered ? REGION_DATA[hovered] : null;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-100 via-red-50 to-rose-100 flex items-center justify-center p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-6xl w-full flex flex-col gap-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-rose-600">
            Thermo Playground
          </h1>
          <p className="text-lg text-rose-900/70 font-medium">
            Phase Diagram Explorer
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden flex flex-col lg:flex-row">
          
          {/* Left: Interactive SVG Diagram */}
          <div className="flex-1 p-6 md:p-10 relative flex items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-200/60">
            <div className="w-full max-w-lg aspect-square relative">
              <svg
                viewBox="-15 -10 130 130"
                className="w-full h-full drop-shadow-sm"
                onMouseLeave={() => setHovered(null)}
              >
                {/* Defs for patterns/gradients */}
                <defs>
                  <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(0,0,0,0.03)" strokeWidth="0.5" />
                  </pattern>
                </defs>

                {/* Background Grid */}
                <rect x="0" y="0" width="100" height="100" fill="url(#grid)" />

                {/* --- REGIONS --- */}
                <g className="transition-opacity duration-300">
                  {/* Solid Region */}
                  <path
                    d="M 0 95 Q 20 85 40 70 Q 45 35 50 0 L 0 0 Z"
                    className={`cursor-pointer transition-all duration-300 ${
                      hovered === 'solid' ? 'fill-blue-300' : 'fill-blue-100'
                    } ${hovered && hovered !== 'solid' ? 'opacity-40' : 'opacity-90'}`}
                    onMouseEnter={() => setHovered('solid')}
                  />
                  
                  {/* Liquid Region */}
                  <path
                    d="M 50 0 Q 45 35 40 70 Q 70 55 80 20 L 80 0 Z"
                    className={`cursor-pointer transition-all duration-300 ${
                      hovered === 'liquid' ? 'fill-teal-300' : 'fill-teal-100'
                    } ${hovered && hovered !== 'liquid' ? 'opacity-40' : 'opacity-90'}`}
                    onMouseEnter={() => setHovered('liquid')}
                  />

                  {/* Gas Region */}
                  <path
                    d="M 0 95 Q 20 85 40 70 Q 70 55 80 20 L 100 20 L 100 100 L 0 100 Z"
                    className={`cursor-pointer transition-all duration-300 ${
                      hovered === 'gas' ? 'fill-orange-300' : 'fill-orange-100'
                    } ${hovered && hovered !== 'gas' ? 'opacity-40' : 'opacity-90'}`}
                    onMouseEnter={() => setHovered('gas')}
                  />

                  {/* Supercritical Region */}
                  <path
                    d="M 80 20 L 80 0 L 100 0 L 100 20 Z"
                    className={`cursor-pointer transition-all duration-300 ${
                      hovered === 'supercritical' ? 'fill-purple-300' : 'fill-purple-100'
                    } ${hovered && hovered !== 'supercritical' ? 'opacity-40' : 'opacity-90'}`}
                    onMouseEnter={() => setHovered('supercritical')}
                  />
                </g>

                {/* --- BOUNDARY LINES --- */}
                <g fill="none" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  {/* Sublimation Curve */}
                  <path d="M 0 95 Q 20 85 40 70" />
                  {/* Melting Curve */}
                  <path d="M 40 70 Q 45 35 50 0" />
                  {/* Vaporization Curve */}
                  <path d="M 40 70 Q 70 55 80 20" />
                </g>

                {/* --- DASHED GUIDELINES --- */}
                <g fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2">
                  {/* Critical Point Lines */}
                  <path d="M 80 20 L 80 100" />
                  <path d="M 80 20 L 0 20" />
                  {/* Triple Point Lines */}
                  <path d="M 40 70 L 40 100" />
                  <path d="M 40 70 L 0 70" />
                </g>

                {/* --- POINTS --- */}
                {/* Triple Point */}
                <g 
                  className="cursor-pointer"
                  onMouseEnter={() => setHovered('triple')}
                >
                  <circle cx="40" cy="70" r="6" fill="transparent" />
                  <circle 
                    cx="40" cy="70" r="2.5" 
                    className={`transition-all duration-300 ${hovered === 'triple' ? 'fill-rose-500 scale-150' : 'fill-slate-8