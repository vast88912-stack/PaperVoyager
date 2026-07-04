import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Settings, Dna, Play, RefreshCw, Info, Activity } from 'lucide-react';

export default function App() {
  // We use a logarithmic scale for Monte Carlo sample sizes: 10^1 to 10^7
  const [power, setPower] = useState<number>(4);
  const [seed, setSeed] = useState<string>('0x1A4B9F');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Derived values
  const sampleSize = Math.floor(Math.pow(10, power));
  const expectedError = 1 / Math.sqrt(sampleSize); // O(1/sqrt(N)) rule of thumb
  const computeTimeMs = sampleSize * 0.00015; // Mock compute time based on N

  // Generate a random seed
  const generateSeed = useCallback(() => {
    const newSeed = '0x' + Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
    setSeed(newSeed);
  }, []);

  // Simulate a run
  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
    }, Math.max(500, Math.min(computeTimeMs, 3000))); // bound wait time for UX
  };

  // Generate an SVG path for a bell curve that sharpens as N increases
  const distributionCurve = useMemo(() => {
    const points = [];
    // Map standard deviation inversely to power (sqrt of N)
    // For visual purposes, we scale it so N=10 is very flat, N=10,000,000 is a spike
    const sigma = Math.max(0.5, 20 / Math.sqrt(power * 2)); 
    
    for (let x = -50; x <= 50; x += 1) {
      // Normal distribution formula scaled for SVG (100x100 box)
      const y = Math.exp(-(x * x) / (2 * sigma * sigma)) * 80;
      points.push(`${x + 50},${100 - y}`);
    }
    return `M 0,100 L ${points.join(' L ')} L 100,100 Z`;
  }, [power]);

  // Handle manual input
  const handlePreset = (val: number) => {
    setPower(val);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-mono text-slate-300">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        
        {/* Background Accents */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6 relative z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-slate-800/50 rounded-lg border border-slate-700">
              <Settings className="w-5 h-5 text-teal-400" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-orange-400 bg-clip-text text-transparent">
              MC Configuration
            </h1>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Dna className="w-4 h-4 text-orange-400" />
            <span>Seed: <span className="text-orange-300 font-bold">{seed}</span></span>
            <button 
              onClick={generateSeed}
              className="ml-2 hover:text-teal-400 transition-colors"
              title="Regenerate Seed"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Main Slider Section */}
        <div className="space-y-8 relative z-10">
          
          {/* Readout */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500 mb-1 flex items-center">
                Sample Size (N) 
                <Info className="w-3 h-3 ml-1.5 opacity-50 cursor-help" />
              </p>
              <div className="text-5xl font-black text-teal-400 tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(45,212,191,0.2)]">
                {sampleSize.toLocaleString()}
              </div>
            </div>

            <div className="flex gap-2 text-xs font-semibold">
              {[
                { label: '1K', val: 3 },
                { label: '10K', val: 4 },
                { label: '1M', val: 6 },
                { label: '10M', val: 7 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePreset(preset.val)}
                  className={`px-3 py-1.5 rounded-md border transition-all ${
                    power === preset.val 
                      ? 'bg-teal-500/20 border-teal-500/50 text-teal-300' 
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Slider Component */}
          <div className="relative pt-6 pb-2">
            <div className="absolute top-0 left-0 w-full flex justify-between text-[10px] text-slate-500 font-bold px-1">
              <span>10¹</span>
              <span>10³</span>
              <span>10⁵</span>
              <span>10⁷</span>
            </div>
            
            {/* Custom Track using inline gradient to fill to the thumb */}
            <input
              type="range"
              min="1"
              max="7"
              step="0.01"
              value={power}
              onChange={(e) => setPower(parseFloat(e.target.value))}
              className="w-full h-3 bg-slate-800 rounded-full appearance-none outline-none cursor-pointer slider-thumb"
              style={{
                background: `linear-gradient(to right, #2dd4bf ${(power - 1) / 6 * 100}%, #1e293b ${(power - 1) / 6 * 100}%)`
              }}
            />
            
            <style dangerouslySetInnerHTML={{__html: `
              .slider-thumb::-webkit-slider-thumb {
                appearance: none;
                width: 24px;
                height: 24px;
                background: #f97316;
                border: 3px solid #020617;
                border-radius: 50%;
                cursor: grab;
                box-shadow: 0 0 10px rgba(249, 115, 22, 0.5);
                transition: transform 0.1s;
              }
              .slider-thumb::-webkit-slider-thumb:active {
                cursor: grabbing;
                transform: scale(1.15);
              }
              .slider-thumb::-moz-range-thumb {
                width: 24px;
                height: 24px;
                background: #f97316;
                border: 3px solid #020617;
                border-radius: 50%;
                cursor: grab;
                box-shadow: 0 0 10px rgba(249, 115, 22, 0.5);
                transition: transform 0.1s;
              }
              .slider-thumb::-moz-range-thumb:active {
                cursor: grabbing;
                transform: scale(1.15);
              }
            `}} />
          </div>

          {/* Metrics & Visualization Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            
            {/* Stats */}
            <div className="bg-slate-950/50 rounded-xl border border-slate-800 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Est. Std Error (1/√N)</span>
                <span className="text-sm font-bold text-orange-400">
                  ±{(expectedError * 100).toFixed(4)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(2, expectedError * 100 * 10))}%` }}
                />
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-800/50">
                <span className="text-sm text-slate-400 flex items-center">
                  <Activity className="w-3 h-3 mr-1.5" /> Compute Load
                </span>
                <span className={`text-sm font-bold ${computeTimeMs > 1000 ? 'text-red-400' : 'text-teal-400'}`}>
                  ~{computeTimeMs < 1 ? '< 1' : computeTimeMs.toFixed(0)} ms
                </span>
              </div>
            </div>

            {/* Visual Variance Shrinkage */}
            <div className="bg-slate-950/50 rounded-xl border border-slate-800 p-4 flex items-center justify-center relative overflow-hidden group">
              <div className="absolute top-2 left-2 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                Distribution Density
              </div>
              <svg viewBox="0 0 100 100" className="w-full h-20 opacity-80 mt-4 overflow-visible">
                {/* Axes */}
                <line x1="0" y1="99" x2="100" y2="99" stroke="#334155" strokeWidth="1" />
                <line x1="50" y1="0" x2="50" y2="100" stroke="#334155" strokeWidth="1" strokeDasharray="2,2" />
                
                {/* Curve */}
                <path 
                  d={distributionCurve} 
                  fill="rgba(45, 212, 191, 0.15)" 
                  stroke="#2dd4bf" 
                  strokeWidth="2" 
                  className="transition-all duration-500 ease-out"
                />
              </svg>
            </div>

          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="w-full relative group overflow-hidden rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 p-[1px] font-bold text-slate-950 transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
            >
              <div className="flex items-center justify-center bg-teal-400/10 backdrop-blur-sm px-4 py-3 rounded-[11px] transition-colors group-hover:bg-transparent">
                {isSimulating ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin text-slate-950" />
                    Computing Paths...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2 fill-slate-950 text-slate-950" />
                    Lock Configuration & Run
                  </>
                )}
              </div>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}