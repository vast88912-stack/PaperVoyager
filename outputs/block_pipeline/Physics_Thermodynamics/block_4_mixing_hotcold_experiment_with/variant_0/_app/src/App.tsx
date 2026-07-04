import React, { useState, useMemo } from 'react';

// --- Icons ---
const FlameIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
  </svg>
);

const SnowflakeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <line x1="12" y1="2" x2="12" y2="22"></line>
    <path d="m20 16-4-4 4-4"></path>
    <path d="m4 8 4 4-4 4"></path>
    <path d="m16 4-4 4-4-4"></path>
    <path d="m8 20 4-4 4 4"></path>
  </svg>
);

const ThermometerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path>
  </svg>
);

const DropletIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22a5 5 0 0 0 5-5c0-2-2.5-7-5-12-2.5 5-5 10-5 12a5 5 0 0 0 5 5z"></path>
  </svg>
);

const ActivityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </svg>
);

// --- Helper Functions ---
const getTempColor = (temp: number) => {
  // Map 0-100 to HSL: 240 (Blue) to 0 (Red)
  const clamped = Math.max(0, Math.min(100, temp));
  const hue = 240 - (clamped / 100) * 240;
  return `hsl(${hue}, 85%, 55%)`;
};

// --- Components ---
const Beaker = ({ mass, maxMass, temp, label, width = "w-24", height = "h-40" }: { mass: number, maxMass: number, temp: number, label: string, width?: string, height?: string }) => {
  const fillPercentage = Math.min(100, Math.max(5, (mass / maxMass) * 100));
  const color = getTempColor(temp);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-sm font-semibold text-slate-600">{label}</div>
      <div className={`${width} ${height} border-4 border-slate-300 border-t-0 rounded-b-2xl relative overflow-hidden bg-white/40 shadow-inner`}>
        {/* Liquid */}
        <div 
          className="absolute bottom-0 w-full transition-all duration-700 ease-in-out flex items-start justify-center pt-2"
          style={{ height: `${fillPercentage}%`, backgroundColor: color }}
        >
          {/* Liquid Reflection */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 pointer-events-none" />
          {/* Bubbles for hot temps */}
          {temp > 60 && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-50">
              <div className="w-2 h-2 bg-white rounded-full absolute bottom-2 left-4 animate-ping" style={{ animationDuration: '1.5s' }} />
              <div className="w-1.5 h-1.5 bg-white rounded-full absolute bottom-4 right-6 animate-ping" style={{ animationDuration: '1.2s', animationDelay: '0.3s' }} />
              <div className="w-2.5 h-2.5 bg-white rounded-full absolute bottom-1 left-10 animate-ping" style={{ animationDuration: '1.8s', animationDelay: '0.6s' }} />
            </div>
          )}
        </div>
        {/* Glass glare */}
        <div className="absolute top-0 right-2 bottom-2 w-2 bg-gradient-to-b from-white/40 to-white/0 rounded-full pointer-events-none" />
      </div>
      <div className="text-xs font-mono bg-white/80 px-2 py-1 rounded-md shadow-sm border border-slate-100">
        {temp.toFixed(1)} °C
      </div>
    </div>
  );
};

export default function App() {
  // State for Hot Substance
  const [hot, setHot] = useState({ mass: 50, temp: 80, c: 4.18 });
  // State for Cold Substance
  const [cold, setCold] = useState({ mass: 50, temp: 20, c: 4.18 });

  // Derived Calculations
  const finalState = useMemo(() => {
    const hotEnergy = hot.mass * hot.c * hot.temp;
    const coldEnergy = cold.mass * cold.c * cold.temp;
    const totalHeatCapacity = (hot.mass * hot.c) + (cold.mass * cold.c);
    
    const finalTemp = (hotEnergy + coldEnergy) / totalHeatCapacity;
    const totalMass = hot.mass + cold.mass;
    
    const energyTransferred = hot.mass * hot.c * (hot.temp - finalTemp);

    return { finalTemp, totalMass, energyTransferred };
  }, [hot, cold]);

  const maxIndividualMass = 100;
  const maxCombinedMass = maxIndividualMass * 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-orange-100 p-4 md:p-8 font-sans text-slate-800 selection:bg-orange-200">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 drop-shadow-sm">
            Thermo Playground
          </h1>
          <p className="text-lg text-slate-600 font-medium max-w-2xl mx-auto">
            Mixing Hot & Cold: Explore the First Law of Thermodynamics and energy balance.
          </p>
        </header>

        {/* Main Experiment Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Hot Controls */}
          <div className="bg-white/70 backdrop-blur-xl shadow-xl rounded-3xl p-6 border border-red-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-red-500 pointer-events-none">
              <FlameIcon />
            </div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                <FlameIcon />
              </div>
              <h2 className="text-2xl font-bold text-slate-700">Hot Fluid</h2>
            </div>

            <div className="flex gap-6">
              <div className="flex-1 space-y-6">
                {/* Mass Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-semibold text-slate-600">
                    <span className="flex items-center gap-1"><DropletIcon /> Mass (m₁)</span>
                    <span>{hot.mass} g</span>
                  </div>
                  <input 
                    type="range" min="10" max="100" step="1" 
                    value={hot.mass} onChange={(e) => setHot({...hot, mass: Number(e.target.value)})}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                </div>

                {/* Temp Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-semibold text-slate-600">
                    <span className="flex items-center gap-1"><ThermometerIcon /> Temp (T₁)</span>
                    <span>{hot.temp} °C</span>
                  </div>
                  <input 
                    type="range" min="50" max="100" step="1" 
                    value={hot.temp} onChange={(e) => setHot({...hot, temp: Number(e.target.value)})}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                </div>

                {/* Specific Heat Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-semibold text-slate-600">
                    <span className="flex items-center gap-1"><ActivityIcon /> Specific Heat (c₁)</span>
                    <span>{hot.c.toFixed(2)} J/g°C</span>
                  </div>
                  <input 
                    type="range" min="1" max="5" step="0.01" 
                    value={hot.c} onChange={(e) => setHot({...hot, c: Number(e.target.value)})}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                </div>
              </div>
              
              <div className="flex-shrink-0 flex items-center justify-center pl-4 border-l border-slate-200/60">
                <Beaker mass={hot.mass} maxMass={maxIndividualMass} temp={hot.temp} label="Source 1" />
              </div>
            </div>
          </div>

          {/* Cold Controls */}
          <div className="bg-white/70 backdrop-blur-xl shadow-xl rounded-3xl p-6 border border-blue-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-blue-500 pointer-events-none">
              <SnowflakeIcon />
            </div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                <SnowflakeIcon />
              </div>
              <h2 className="text-2xl font-bold text-slate-700">Cold Fluid</h2>
            </div>

            <div className="flex gap-6">
              <div className="flex-1 space-y-6">
                {/* Mass Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-semibold text-slate-600">
                    <span className="flex items-center gap-1"><DropletIcon /> Mass (m₂)</span>
                    <span>{cold.mass} g</span>
                  </div>
                  <input 
                    type="range" min="10" max="100" step="1" 
                    value={cold.mass} onChange={(e) => setCold({...cold, mass: Number(e.target.value)})}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Temp Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-semibold text-slate-600">
                    <span className="flex items-center gap-1"><ThermometerIcon /> Temp (T₂)</span>
                    <span>{cold.temp} °C</span>
                  </div>
                  <input 
                    type="range" min="0" max="49" step="1" 
                    value={cold.temp} onChange={(e) => setCold({...cold, temp: Number(e.target.value)})}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Specific Heat Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-semibold text-slate-600">
                    <span className="flex items-center gap-1"><ActivityIcon /> Specific Heat (c₂)</span>
                    <span>{cold.c.toFixed(2)} J/g°C</span>
                  </div>
                  <input 
                    type="range" min="1" max="5" step="0.01" 
                    value={cold.c} onChange={(e) => setCold({...cold, c: Number(e.target.value)})}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex-shrink-0 flex items-center justify-center pl-4 border-l border-slate-200/60">
                <Beaker mass={cold.mass} maxMass={maxIndividualMass} temp={cold.temp} label="Source 2" />
              </div>
            </div>
          </div>

        </div>

        {/* Results & Energy Balance */}
        <div className="bg-white/80 backdrop-blur-2xl shadow-2xl rounded-3xl p-8 border border-white/50">
          <div className="flex flex-col md:flex-row items-center gap-12">
            
            {/* Final Mixture Visual */}
            <div className="flex-shrink-0 flex flex-col items-center">
              <h3 className="text-xl font-bold text-slate-700 mb-4">Final Mixture</h3>
              <Beaker 
                mass={finalState.totalMass} 
                maxMass={maxCombinedMass} 
                temp={finalState.finalTemp} 
                label={`Total: ${finalState.totalMass} g`}
                width="w-32"
                height="h-48"
              />
            </div>

            {/* Energy Balance Math */}
            <div className="flex-1 w-full space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Energy Balance</h3>
                <p className="text-slate-500 text-sm">
                  Assuming no heat is lost to the surroundings, the heat energy lost by the hot fluid equals the heat energy gained by the cold fluid.
                </p>
              </div>

              {/* Equation Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4">
                  <div className="text-red-600 font-bold mb-2 text-sm uppercase tracking-wider">Heat Lost (Q_out)</div>
                  <div className="font-mono text-sm space-y-1 text-slate-700">
                    <div>Q = m₁ × c₁ × (T₁ - T_f)</div>
                    <div>Q = {hot.mass} × {hot.c.toFixed(2)} × ({hot.temp} - {finalState.finalTemp.toFixed(1)})</div>
                    <div className="text-lg font-bold text-red-600 mt-2 border-t border-red-200 pt-2">
                      {finalState.energyTransferred.toFixed(0)} Joules
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
                  <div className="text-blue-600 font-bold mb-2 text-sm uppercase tracking-wider">Heat Gained (Q_in)</div>
                  <div className="font-mono text-sm space-y-1 text-slate-700">
                    <div>Q = m₂ × c₂ × (T_f - T₂)</div>
                    <div>Q = {cold.mass} × {cold.c.toFixed(2)} × ({finalState.finalTemp.toFixed(1)} - {cold.temp})</div>
                    <div className="text-lg font-bold text-blue-600 mt-2 border-t border-blue-200 pt-2">
                      {finalState.energyTransferred.toFixed(0)} Joules
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Balance Bar */}
              <div className="pt-4">
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                  <span>Energy Transfer Flow</span>
                </div>
                <div className="h-6 w-full bg-slate-100 rounded-full overflow-hidden flex relative shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500"
                    style={{ width: '50%' }}
                  />
                  <div 
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500"
                    style={{ width: '50%' }}
                  />
                  {/* Center marker */}
                  <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-white shadow-sm transform -translate-x-1/2" />
                  
                  {/* Animated arrows indicating flow */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60">
                    <svg className="w-6 h-6 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                <div className="flex justify-between text-xs font-medium text-slate-500 mt-2">
                  <span>Hot Source Cooling</span>
                  <span>Cold Source Warming</span>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}