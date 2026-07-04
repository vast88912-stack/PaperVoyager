import React, { useState, useMemo } from 'react';

const MATERIALS = {
  water: { id: 'water', name: 'Water', c: 4184, colorBase: 'blue' },
  oil: { id: 'oil', name: 'Olive Oil', c: 1670, colorBase: 'yellow' },
  ethanol: { id: 'ethanol', name: 'Ethanol', c: 2440, colorBase: 'purple' },
};

// Helper to get a temperature-based color (Blue -> Cyan -> Green -> Yellow -> Red)
const getTempColor = (temp: number) => {
  // Clamp temp between 0 and 100 for the color scale
  const clamped = Math.max(0, Math.min(100, temp));
  const hue = 240 - (clamped / 100) * 240; // 240 is Blue, 0 is Red
  return `hsl(${hue}, 85%, 55%)`;
};

const formatNumber = (num: number) => {
  return num.toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
};

export default function App() {
  // State for Source A (Cold typically, but can be anything)
  const [matA, setMatA] = useState<keyof typeof MATERIALS>('water');
  const [massA, setMassA] = useState<number>(5); // kg
  const [tempA, setTempA] = useState<number>(10); // °C

  // State for Source B (Hot typically)
  const [matB, setMatB] = useState<keyof typeof MATERIALS>('water');
  const [massB, setMassB] = useState<number>(5); // kg
  const [tempB, setTempB] = useState<number>(90); // °C

  // Derived Calculations
  const { tempF, massF, energyTransfer, qA, qB } = useMemo(() => {
    const cA = MATERIALS[matA].c;
    const cB = MATERIALS[matB].c;

    const mF = massA + massB;
    // Tf = (m1*c1*T1 + m2*c2*T2) / (m1*c1 + m2*c2)
    const tF = (massA * cA * tempA + massB * cB * tempB) / (massA * cA + massB * cB);

    // Energy transferred: Q = m * c * |Tf - Ti|
    const qA_val = massA * cA * (tF - tempA); // Positive if A gains heat, negative if loses
    const qB_val = massB * cB * (tF - tempB); // Positive if B gains heat, negative if loses

    return {
      tempF: tF,
      massF: mF,
      energyTransfer: Math.abs(qA_val), // Joules
      qA: qA_val,
      qB: qB_val,
    };
  }, [matA, massA, tempA, matB, massB, tempB]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-red-50 to-yellow-100 p-4 md:p-8 font-sans text-slate-800 flex flex-col items-center">
      {/* Header */}
      <div className="max-w-5xl w-full mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600 drop-shadow-sm mb-4">
          Thermal Mixing & Energy Balance
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Explore the First Law of Thermodynamics. Mix two substances and observe how thermal energy flows from the hotter object to the colder one until thermal equilibrium is reached.
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Source A Card */}
        <div className="bg-white/70 backdrop-blur-xl shadow-xl rounded-3xl p-6 border border-white/50 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-blue-400"></div>
          <h2 className="text-2xl font-bold text-slate-700 mb-4">Substance A</h2>
          
          <div className="flex-1 flex justify-center items-end mb-6 h-48">
            <Tank mass={massA} maxMass={10} temp={tempA} label="A" />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-500 mb-1">Material</label>
              <select 
                value={matA} 
                onChange={(e) => setMatA(e.target.value as keyof typeof MATERIALS)}
                className="w-full bg-slate-100 border-none rounded-xl p-2 text-slate-700 focus:ring-2 focus:ring-blue-400 outline-none"
              >
                {Object.values(MATERIALS).map(m => (
                  <option key={m.id} value={m.id}>{m.name} (c={m.c} J/kg°C)</option>
                ))}
              </select>
            </div>
            
            <div>
              <div className="flex justify-between text-sm font-semibold text-slate-500 mb-1">
                <span>Mass (m₁)</span>
                <span>{formatNumber(massA)} kg</span>
              </div>
              <input 
                type="range" min="0.1" max="10" step="0.1" 
                value={massA} onChange={(e) => setMassA(parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm font-semibold text-slate-500 mb-1">
                <span>Temperature (T₁)</span>
                <span>{formatNumber(tempA)} °C</span>
              </div>
              <input 
                type="range" min="0" max="100" step="1" 
                value={tempA} onChange={(e) => setTempA(parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Mixture / Equilibrium Card */}
        <div className="bg-white/80 backdrop-blur-2xl shadow-2xl rounded-3xl p-6 border border-white/60 flex flex-col relative transform lg:scale-105 z-10">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-red-400"></div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">Equilibrium</h2>
          <p className="text-center text-sm text-slate-500 mb-4">Final Mixture</p>
          
          <div className="flex-1 flex justify-center items-end mb-6 h-56">
            <Tank mass={massF} maxMass={20} temp={tempF} label="Mix" isMix />
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 shadow-inner border border-slate-100">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Final Temp (T_f)</p>
                <p className="text-3xl font-black" style={{ color: getTempColor(tempF) }}>
                  {formatNumber(tempF)}<span className="text-lg">°C</span>
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Mass</p>
                <p className="text-3xl font-black text-slate-700">
                  {formatNumber(massF)}<span className="text-lg">kg</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Source B Card */}
        <div className="bg-white/70 backdrop-blur-xl shadow-xl rounded-3xl p-6 border border-white/50 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-red-400"></div>
          <h2 className="text-2xl font-bold text-slate-700 mb-4">Substance B</h2>
          
          <div className="flex-1 flex justify-center items-end mb-6 h-48">
            <Tank mass={massB} maxMass={10} temp={tempB} label="B" />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-500 mb-1">Material</label>
              <select 
                value={matB} 
                onChange={(e) => setMatB(e.target.value as keyof typeof MATERIALS)}
                className="w-full bg-slate-100 border-none rounded-xl p-2 text-slate-700 focus:ring-2 focus:ring-red-400 outline-none"
              >
                {Object.values(MATERIALS).map(m => (
                  <option key={m.id} value={m.id}>{m.name} (c={m.c} J/kg°C)</option>
                ))}
              </select>
            </div>
            
            <div>
              <div className="flex justify-between text-sm font-semibold text-slate-500 mb-1">
                <span>Mass (m₂)</span>
                <span>{formatNumber(massB)} kg</span>
              </div>
              <input 
                type="range" min="0.1" max="10" step="0.1" 
                value={massB} onChange={(e) => setMassB(parseFloat(e.target.value))}
                className="w-full accent-red-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm font-semibold text-slate-500 mb-1">
                <span>Temperature (T₂)</span>
                <span>{formatNumber(tempB)} °C</span>
              </div>
              <input 
                type="range" min="0" max="100" step="1" 
                value={tempB} onChange={(e) => setTempB(parseFloat(e.target.value))}
                className="w-full accent-red-500"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Energy Balance Section */}
      <div className="max-w-5xl w-full mt-8 bg-white/80 backdrop-blur-xl shadow-xl rounded-3xl p-6 md:p-8 border border-white/50">
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Energy Balance (1st Law of Thermodynamics)
        </h3>

        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          
          {/* Equation Breakdown */}
          <div className="flex-1 w-full bg-slate-50 rounded-2xl p-6 border border-slate-200 shadow-inner">
            <div className="text-center mb-4">
              <span className="font-mono text-lg font-semibold text-slate-700">
                Q<sub>gained</sub> + Q<sub>lost</sub> = 0
              </span>
            </div>
            
            <div className="space-y-3 font-mono text-sm text-slate-600">
              <div className="flex justify-between items-center p-2 rounded bg-white shadow-sm">
                <span>Q<sub>A</sub> = m₁·c₁·(T<sub>f</sub> - T₁)</span>
                <span className={`font-bold ${qA > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                  {qA > 0 ? '+' : ''}{(qA / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} kJ
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-white shadow-sm">
                <span>Q<sub>B</sub> = m₂·c₂·(T<sub>f</sub> - T₂)</span>
                <span className={`font-bold ${qB > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                  {qB > 0 ? '+' : ''}{(qB / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} kJ
                </span>
              </div>
            </div>
          </div>

          {/* Visual Energy Transfer */}
          <div className="flex-1 w-full flex flex-col items-center justify-center">
            <p className="text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wide">Energy Transferred</p>
            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500 mb-4">
              {(energyTransfer / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} kJ
            </div>
            
            {/* Transfer Bar */}
            <div className="w-full max-w-sm h-6 bg-slate-200 rounded-full overflow-hidden flex relative shadow-inner">
              <div 
                className="h-full bg-blue-400 transition-all duration-500 ease-out flex items-center justify-center"
                style={{ width: `${qA > 0 ? 50 : 50}%` }}
              >
              </div>
              <div 
                className="h-full bg-red-400 transition-all duration-500 ease-out flex items-center justify-center"
                style={{ width: `${qB > 0 ? 50 : 50}%` }}
              >
              </div>
              
              {/* Overlay indicator */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white px-3 py-1 rounded-full text-xs font-bold shadow-md text-slate-700 flex items-center gap-2">
                  {tempA < tempB ? (
                    <>
                      <span className="text-blue-500">A</span>
                      <span>← Heat Flow ←</span>
                      <span className="text-red-500">B</span>
                    </>
                  ) : tempA > tempB ? (
                    <>
                      <span className="text-red-500">A</span>
                      <span>→ Heat Flow →</span>
                      <span className="text-blue-500">B</span>
                    </>
                  ) : (
                    <span>Equilibrium</span>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Sub-component for the Tank visualization
function Tank({ mass, maxMass, temp, label, isMix = false }: { mass: number, maxMass: number, temp: number, label: string, isMix?: boolean }) {
  const heightPercent = Math.min(100, Math.max(5, (mass / maxMass) * 100));
  const color = getTempColor(temp);

  return (
    <div className={`relative flex items-end justify-center border-x-4 border-b-4 border-slate-300 rounded-b-2xl bg-white/50 backdrop-blur-sm shadow-inner overflow-hidden transition-all duration-300 ${isMix ? 'w-32 h-48' : 'w-24 h-40'}`}>
      
      {/* Liquid Fill */}
      <div 
        className="absolute bottom-0 w-full transition-all duration-700 ease-in-out"
        style={{ 
          height: `${heightPercent}%`, 
          backgroundColor: color,
          opacity: 0.85,
          boxShadow: `inset 0 10px 20px rgba(255,255,255,0.3), inset 0 -10px 20px rgba(0,0,0,0.1)`
        }}
      >
        {/* Liquid Surface */}
        <div className="absolute top-0 w-full h-3 -mt-1.5 rounded-[50%] bg-white/30 border border-white/20"></div>
        
        {/* Subtle bubbles/particles effect could go here, keeping it clean for now */}
      </div>

      {/* Grid Lines */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between py-2 opacity-20">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-full border-b border-slate-500 border-dashed"></div>
        ))}
      </div>

      {/* Label */}
      <div className="absolute -bottom-8 font-bold text-slate-400 text-lg">
        {label}
      </div>
    </div>
  );
}