import React, { useState, useEffect, useMemo } from 'react';
import { Thermometer, Droplet, Flame, Snowflake, Play, RotateCcw, Info, ArrowRight, Equal } from 'lucide-react';

// Specific heat capacity of water (J/g°C or kJ/kg°C)
const SPECIFIC_HEAT = 4.184;

// Helper to map temperature (0-100) to a color (Blue -> Magenta -> Red)
const getTempColor = (temp: number) => {
  const clampedTemp = Math.max(0, Math.min(100, temp));
  const hue = 240 + (clampedTemp / 100) * 120; // 240 is Blue, 360 is Red
  return `hsl(${hue}, 85%, 55%)`;
};

// Component for the Beaker/Tank
const Tank = ({ 
  mass, 
  temp, 
  maxMass, 
  label, 
  isResult = false,
  opacity = 1
}: { 
  mass: number, 
  temp: number, 
  maxMass: number, 
  label: string,
  isResult?: boolean,
  opacity?: number
}) => {
  const fillPercentage = Math.min((mass / maxMass) * 100, 100);
  const color = getTempColor(temp);

  return (
    <div className="flex flex-col items-center transition-opacity duration-300" style={{ opacity }}>
      <span className="mb-2 font-semibold text-slate-700">{label}</span>
      <div className={`relative w-28 h-40 border-b-4 border-x-4 border-white/80 rounded-b-2xl overflow-hidden shadow-[inset_0_0_15px_rgba(0,0,0,0.1)] bg-white/30 backdrop-blur-sm ${isResult ? 'w-36 h-48' : ''}`}>
        {/* Fill */}
        <div
          className="absolute bottom-0 w-full transition-all duration-[50ms] ease-linear shadow-[0_-4px_10px_rgba(0,0,0,0.1)]"
          style={{ 
            height: `${fillPercentage}%`, 
            backgroundColor: color,
            opacity: mass > 0 ? 0.9 : 0
          }}
        >
          {/* Liquid surface reflection */}
          <div className="absolute top-0 w-full h-2 bg-white/30 rounded-t-[50%]" />
        </div>
      </div>
      <div className="mt-4 flex flex-col items-center text-sm font-medium text-slate-600 bg-white/50 px-3 py-1.5 rounded-lg shadow-sm">
        <div className="flex items-center gap-1">
          <Droplet size={14} className="text-blue-500" />
          <span>{mass.toFixed(1)} kg</span>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <Thermometer size={14} className="text-red-500" />
          <span>{temp.toFixed(1)} °C</span>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  // State for Substance A (Cold usually, but can be anything)
  const [massA, setMassA] = useState<number>(2);
  const [tempA, setTempA] = useState<number>(10);

  // State for Substance B (Hot usually)
  const [massB, setMassB] = useState<number>(3);
  const [tempB, setTempB] = useState<number>(80);

  // Animation and Mix State
  const [isMixed, setIsMixed] = useState<boolean>(false);
  const [mixProgress, setMixProgress] = useState<number>(0);

  // Derived calculations
  const finalMass = massA + massB;
  const finalTemp = (massA * tempA + massB * tempB) / finalMass;
  
  // Determine which is hot and which is cold for the energy balance
  const isAHotter = tempA > tempB;
  const hotTemp = isAHotter ? tempA : tempB;
  const hotMass = isAHotter ? massA : massB;
  const coldTemp = isAHotter ? tempB : tempA;
  const coldMass = isAHotter ? massB : massA;

  const deltaTHot = hotTemp - finalTemp;
  const deltaTCold = finalTemp - coldTemp;
  const heatTransferred = hotMass * SPECIFIC_HEAT * deltaTHot; // in kJ

  // Animation Loop
  useEffect(() => {
    let timer: number;
    if (isMixed && mixProgress < 1) {
      timer = requestAnimationFrame(() => {
        setMixProgress((prev) => Math.min(prev + 0.015, 1));
      });
    }
    return () => cancelAnimationFrame(timer);
  }, [isMixed, mixProgress]);

  const handleMix = () => {
    setIsMixed(true);
    setMixProgress(0);
  };

  const handleReset = () => {
    setIsMixed(false);
    setMixProgress(0);
  };

  // Dynamic values during animation
  const currentMassA = massA * (1 - mixProgress);
  const currentMassB = massB * (1 - mixProgress);
  const currentMassMix = finalMass * mixProgress;
  const maxContainerMass = 10; // For scaling the SVG heights

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-100 to-rose-100 p-6 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between bg-white/60 backdrop-blur-md px-6 py-4 rounded-2xl shadow-sm border border-white/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl shadow-md">
              <Flame className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-red-600">
                Thermal Mixing & Energy Balance
              </h1>
              <p className="text-sm text-slate-500 font-medium">Explore the First Law of Thermodynamics</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-500 bg-white/50 px-3 py-1.5 rounded-full">
            <Info size={16} />
            <span>Assuming perfectly insulated containers (Q_loss = 0)</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Controls */}
          <div className="lg:col-span-4 space-y-6">
            {/* Substance A Card */}
            <div className="bg-white/70 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-white/60 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-blue-400" />
              <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2 mb-6">
                <Snowflake className="text-blue-500" size={20} />
                Substance A (Water)
              </h2>
              
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-sm font-medium text-slate-600 mb-2">
                    <span>Mass (m₁)</span>
                    <span>{massA.toFixed(1)} kg</span>
                  </div>
                  <input 
                    type="range" min="0.5" max="5" step="0.1" 
                    value={massA} 
                    onChange={(e) => setMassA(Number(e.target.value))}
                    disabled={isMixed}
                    className="w-full accent-blue-500 disabled:opacity-50"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm font-medium text-slate-600 mb-2">
                    <span>Temperature (T₁)</span>
                    <span>{tempA.toFixed(1)} °C</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" step="1" 
                    value={tempA} 
                    onChange={(e) => setTempA(Number(e.target.value))}
                    disabled={isMixed}
                    className="w-full accent-blue-500 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Substance B Card */}
            <div className="bg-white/70 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-white/60 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-red-400" />
              <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2 mb-6">
                <Flame className="text-red-500" size={20} />
                Substance B (Water)
              </h2>
              
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-sm font-medium text-slate-600 mb-2">
                    <span>Mass (m₂)</span>
                    <span>{massB.toFixed(1)} kg</span>
                  </div>
                  <input 
                    type="range" min="0.5" max="5" step="0.1" 
                    value={massB} 
                    onChange={(e) => setMassB(Number(e.target.value))}
                    disabled={isMixed}
                    className="w-full accent-red-500 disabled:opacity-50"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm font-medium text-slate-600 mb-2">
                    <span>Temperature (T₂)</span>
                    <span>{tempB.toFixed(1)} °C</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" step="1" 
                    value={tempB} 
                    onChange={(e) => setTempB(Number(e.target.value))}
                    disabled={isMixed}
                    className="w-full accent-red-500 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              {!isMixed ? (
                <button 
                  onClick={handleMix}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex justify-center items-center gap-2 transform hover:-translate-y-0.5"
                >
                  <Play size={20} fill="currentColor" /> Mix Substances
                </button>
              ) : (
                <button 
                  onClick={handleReset}
                  className="flex-1 bg-white text-slate-700 hover:bg-slate-50 border-2 border-slate-200 py-4 rounded-2xl font-bold text-lg shadow-sm hover:shadow-md transition-all flex justify-center items-center gap-2 transform hover:-translate-y-0.5"
                >
                  <RotateCcw size={20} /> Reset Experiment
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Visualization & Math */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Visualization Stage */}
            <div className="bg-white/50 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white/60 flex-1 flex flex-col justify-center items-center min-h-[400px]">
              <div className="flex items-end justify-center w-full max-w-2xl gap-8 md:gap-16">
                
                {/* Tank A */}
                <div className="transform transition-transform duration-500" style={{ transform: isMixed ? 'scale(0.9) translateY(20px)' : 'scale(1)' }}>
                  <Tank mass={currentMassA} temp={tempA} maxMass={maxContainerMass} label="Substance A" opacity={isMixed ? 1 - mixProgress * 0.5 : 1} />
                </div>

                {/* Mixing Arrows */}
                <div className="flex flex-col items-center justify-center pb-16 space-y-4 opacity-70">
                  <ArrowRight size={32} className={`text-slate-400 transition-all duration-500 ${isMixed ? 'translate-x-4 text-orange-400' : ''}`} />
                </div>

                {/* The Mixture Tank */}
                <div className="relative">
                  {/* Glowing background effect for the final tank */}
                  <div className={`absolute -inset-10 bg-gradient-to-t from-orange-200 to-transparent blur-2xl rounded-full transition-opacity duration-1000 ${mixProgress === 1 ? 'opacity-50' : 'opacity-0'}`} />
                  <Tank 
                    mass={currentMassMix} 
                    temp={finalTemp} 
                    maxMass={maxContainerMass * 2} 
                    label="Final Mixture" 
                    isResult={true}
                  />
                </div>

                {/* Mixing Arrows */}
                <div className="flex flex-col items-center justify-center pb-16 space-y-4 opacity-70 rotate-180">
                  <ArrowRight size={32} className={`text-slate-400 transition-all duration-500 ${isMixed ? 'translate-x-4 text-orange-400' : ''}`} />
                </div>

                {/* Tank B */}
                <div className="transform transition-transform duration-500" style={{ transform: isMixed ? 'scale(0.9) translateY(20px)' : 'scale(1)' }}>
                  <Tank mass={currentMassB} temp={tempB} maxMass={maxContainerMass} label="Substance B" opacity={isMixed ? 1 - mixProgress * 0.5 : 1} />
                </div>

              </div>
            </div>

            {/* Energy Balance Math Card */}
            <div className={`bg-slate-800 text-white p-6 md:p-8 rounded-3xl shadow-2xl transition-all duration-700 transform ${mixProgress > 0.5 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}`}>
              <h3 className="text-xl font-bold text-orange-300 mb-6 flex items-center gap-2">
                <Equal size={20} /> Energy Balance Equation
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Heat Gained */}
                <div className="bg-slate-700/50 p-5 rounded-2xl border border-slate-600">
                  <h4 className="text-blue-300 font-semibold mb-3 flex items-center gap-2">
                    <ArrowRight size={16} className="rotate-[-45deg]" /> Heat Gained (Cold)
                  </h4>
                  <div className="font-mono text-sm space-y-2 text-slate-300">
                    <p>Q_gained = m_cold × c × ΔT_cold</p>
                    <p>Q_gained = {coldMass.toFixed(1)} × 4.184 × ({finalTemp.toFixed(1)} - {coldTemp.toFixed(1)})</p>
                    <div className="pt-2 mt-2 border-t border-slate-600 font-bold text-blue-200 text-lg">
                      = {heatTransferred.toFixed(1)} kJ
                    </div>
                  </div>
                </div>

                {/* Heat Lost */}
                <div className="bg-slate-700/50 p-5 rounded-2xl border border-slate-600">
                  <h4 className="text-red-300 font-semibold mb-3 flex items-center gap-2">
                    <ArrowRight size={16} className="rotate-[45deg]" /> Heat Lost (Hot)
                  </h4>
                  <div className="font-mono text-sm space-y-2 text-slate-300">
                    <p>Q_lost = m_hot × c × ΔT_hot</p>
                    <p>Q_lost = {hotMass.toFixed(1)} × 4.184 × ({hotTemp.toFixed(1)} - {finalTemp.toFixed(1)})</p>
                    <div className="pt-2 mt-2 border-t border-slate-600 font-bold text-red-200 text-lg">
                      = {heatTransferred.toFixed(1)} kJ
                    </div>
                  </div>
                </div>
              </div>

              {/* Conclusion */}
              <div className="mt-6 text-center bg-slate-900/50 py-4 rounded-xl border border-slate-700">
                <p className="text-slate-300 font-medium">
                  Final Equilibrium Temperature (T_f) = <span className="text-white text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-red-400">{finalTemp.toFixed(1)} °C</span>
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}