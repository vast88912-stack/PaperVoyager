import React, { useState, useMemo } from 'react';

// --- Inline Icons ---
const IconThermometer = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
  </svg>
);

const IconScale = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M7 6v14h10V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const IconFlame = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 14.5A2.5 2.5 0 0011 12c-2.28 0-3-2.5-3-2.5s.5 2.5 2.5 2.5a2.5 2.5 0 002.5-2.5c0 3.5 3 4 3 6.5a6.5 6.5 0 01-13 0c0-2.5 2.5-3 2.5-6.5z" />
  </svg>
);

const IconSnowflake = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M17 5l-5 5-5-5M17 19l-5-5-5 5M2 12h20M5 7l5 5-5 5M19 7l-5 5 5 5" />
  </svg>
);

const IconBeaker = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.3 3.5l-1.3 2.6M14.7 3.5l1.3 2.6M4 21h16c1.1 0 1.6-1.3.8-2l-3.3-4.4V8a2 2 0 0 0-4 0v6.6L9.2 19c-.8.7-.3 2 .8 2z" />
  </svg>
);


// --- Helper Functions ---
// Maps 0-100 temperature to a color gradient (Blue -> Magenta -> Red)
const getTempColor = (temp: number) => {
  // 240 is blue, 360/0 is red. Interpolating from 240 up to 360.
  const hue = 240 + (temp / 100) * 120;
  return `hsl(${hue}, 85%, 60%)`;
};

const SPECIFIC_HEAT_WATER = 4.18; // J/(g*°C)

export default function App() {
  // --- State ---
  const [massA, setMassA] = useState<number>(150);
  const [tempA, setTempA] = useState<number>(80);
  
  const [massB, setMassB] = useState<number>(100);
  const [tempB, setTempB] = useState<number>(20);

  // --- Physics Calculations ---
  const mixStats = useMemo(() => {
    const totalMass = massA + massB;
    let finalTemp = 0;
    
    if (totalMass > 0) {
      // T_f = (m1*T1 + m2*T2) / (m1 + m2)
      finalTemp = ((massA * tempA) + (massB * tempB)) / totalMass;
    }

    // Q = m * c * ΔT
    const heatLost = massA * SPECIFIC_HEAT_WATER * Math.max(0, tempA - finalTemp);
    const heatGained = massB * SPECIFIC_HEAT_WATER * Math.max(0, finalTemp - tempB);

    return {
      totalMass,
      finalTemp,
      heatLost,
      heatGained
    };
  }, [massA, tempA, massB, tempB]);

  const { totalMass, finalTemp, heatLost, heatGained } = mixStats;

  // --- Components ---
  const BeakerVisual = ({ mass, temp, label, maxMass = 300 }: { mass: number, temp: number, label: string, maxMass?: number }) => {
    const heightPct = Math.min(100, Math.max(5, (mass / maxMass) * 100)); // Min 5% so it's visible, max 100%
    const color = getTempColor(temp);

    return (
      <div className="flex flex-col items-center gap-3">
        <span className="text-sm font-semibold text-gray-700 tracking-wider uppercase">{label}</span>
        <div className="relative w-28 h-48 border-x-4 border-b-4 border-white/80 rounded-b-3xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] backdrop-blur-sm bg-white/20 overflow-hidden flex items-end">
          {/* Glass glare effect */}
          <div className="absolute inset-y-0 left-2 w-4 bg-white/30 rounded-full blur-[2px] z-10 pointer-events-none" />
          
          {/* Liquid */}
          <div 
            className="w-full relative transition-all duration-700 ease-in-out"
            style={{ 
              height: `${heightPct}%`, 
              backgroundColor: color,
              boxShadow: `inset 0 -10px 20px rgba(0,0,0,0.2), inset 0 4px 10px rgba(255,255,255,0.4)`
            }}
          >
            {/* Liquid Surface */}
            <div className="absolute top-0 left-0 w-full h-3 bg-white/30 rounded-[50%] -mt-1.5 shadow-[0_2px_5px_rgba(0,0,0,0.1)]" />
            
            {/* Value overlay */}
            {mass > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20 text-white text-xs font-bold z-20">
                <span>{mass}g</span>
                <span>{temp.toFixed(1)}°C</span>
              </div>
            )}
          </div>

          {/* Measurement marks */}
          <div className="absolute inset-y-0 left-0 w-full flex flex-col justify-between py-2 pointer-events-none z-0">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-2 h-px bg-white/50 ml-1" />
            ))}
          </div>
        </div>
      </div>
    );
  };

  const SliderControl = ({ 
    label, value, setValue, min, max, unit, icon, colorClass 
  }: { 
    label: string, value: number, setValue: (v: number) => void, min: number, max: number, unit: string, icon: React.ReactNode, colorClass: string 
  }) => (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex justify-between items-center text-sm font-medium text-gray-700">
        <div className="flex items-center gap-1.5">
          <span className={colorClass}>{icon}</span>
          {label}
        </div>
        <span className="tabular-nums font-bold text-gray-900 bg-white/50 px-2 py-1 rounded-md shadow-sm border border-white/60">
          {value}{unit}
        </span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        value={value} 
        onChange={(e) => setValue(Number(e.target.value))}
        className={`w-full h-2 rounded-lg appearance-none cursor-pointer bg-black/10 shadow-inner ${colorClass.replace('text-', 'accent-')}`}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-100 to-rose-200 p-4 sm:p-8 font-sans flex items-center justify-center">
      
      {/* Background Decorative Elements */}
      <div className="fixed top-20 left-10 w-64 h-64 bg-rose-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 right-10 w-96 h-96 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-5xl bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden relative z-10 flex flex-col">
        
        {/* Header Section */}
        <header className="px-8 py-6 border-b border-white/50 bg-white/30 flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-orange-400 to-rose-500 rounded-2xl shadow-lg text-white">
            <IconBeaker className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">Thermodynamics Playground</h1>
            <p className="text-sm font-medium text-gray-600">Module 5: Mixing Hot & Cold Energy Balance</p>
          </div>
        </header>

        {/* Main Experiment Area */}
        <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Substance A (Hot) */}
          <div className="bg-white/50 rounded-3xl p-6 border border-white/60 shadow-sm flex flex-col gap-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-rose-500 pointer-events-none transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
               <IconFlame className="w-24 h-24" />
            </div>
            
            <BeakerVisual mass={massA} temp={tempA} label="Substance A" />
            
            <div className="space-y-6 z-10 bg-white/40 p-5 rounded-2xl border border-white/50 backdrop-blur-md">
              <SliderControl 
                label="Mass (m₁)" value={massA} setValue={setMassA} min={0} max={200} unit="g" 
                icon={<IconScale />} colorClass="text-rose-500"
              />
              <SliderControl 
                label="Temp (T₁)" value={tempA} setValue={setTempA} min={0} max={100} unit="°C" 
                icon={<IconThermometer />} colorClass="text-rose-500"
              />
            </div>
          </div>

          {/* The Mixture (Center) */}
          <div className="flex flex-col justify-center items-center gap-8 relative">
            {/* Visual mixing arrows */}
            <div className="absolute top-24 left-0 right-0 flex justify-between px-4 pointer-events-none opacity-40">
               <svg className="w-12 h-12 text-rose-500 transform rotate-12 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
               <svg className="w-12 h