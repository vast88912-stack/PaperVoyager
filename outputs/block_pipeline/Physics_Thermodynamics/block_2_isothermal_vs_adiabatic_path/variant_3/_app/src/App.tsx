import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, RotateCcw, Thermometer, Box, Activity, Zap, Info } from 'lucide-react';

// --- Constants & Physics Setup ---
const V_START = 10; // Liters
const V_END = 30; // Liters
const P_START = 100; // kPa
const T_START = 300; // K
const GAMMA = 1.4; // Diatomic gas (air)

// Calculate nR based on starting conditions: P*V = nR*T => nR = P*V / T
const nR = (P_START * V_START) / T_START; // 3.333

export default function App() {
  const [activeProcess, setActiveProcess] = useState<'isothermal' | 'adiabatic'>('isothermal');
  const [volume, setVolume] = useState<number>(V_START);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [direction, setDirection] = useState<'expansion' | 'compression'>('expansion');

  // --- Physics Calculations ---
  // Isothermal: T is constant. P = P0 * V0 / V
  const pIso = (v: number) => (P_START * V_START) / v;
  const tIso = (v: number) => T_START;
  const wIso = (v: number) => P_START * V_START * Math.log(v / V_START); // Work done

  // Adiabatic: P * V^gamma = constant. P = P0 * (V0/V)^gamma
  const pAdi = (v: number) => P_START * Math.pow(V_START / v, GAMMA);
  const tAdi = (v: number) => T_START * Math.pow(V_START / v, GAMMA - 1);
  const wAdi = (v: number) => (P_START * V_START - pAdi(v) * v) / (GAMMA - 1); // Work done

  // Current State
  const currentP = activeProcess === 'isothermal' ? pIso(volume) : pAdi(volume);
  const currentT = activeProcess === 'isothermal' ? tIso(volume) : tAdi(volume);
  const currentW = activeProcess === 'isothermal' ? wIso(volume) : wAdi(volume);

  // --- Animation Loop ---
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      if (!isPlaying) return;
      
      const deltaTime = time - lastTime;
      lastTime = time;

      // Speed of volume change (Liters per millisecond)
      const speed = 0.01; 
      const deltaV = speed * deltaTime;

      setVolume((prevV) => {
        let nextV = prevV + (direction === 'expansion' ? deltaV : -deltaV);
        
        // Handle bounds and auto-pause or reverse
        if (nextV >= V_END) {
          nextV = V_END;
          setIsPlaying(false);
          setDirection('compression');
        } else if (nextV <= V_START) {
          nextV = V_START;
          setIsPlaying(false);
          setDirection('expansion');
        }
        return nextV;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, direction]);

  const handleReset = () => {
    setIsPlaying(false);
    setVolume(V_START);
    setDirection('expansion');
  };

  const togglePlay = () => {
    if (!isPlaying && volume === V_END && direction === 'expansion') {
      setDirection('compression');
    } else if (!isPlaying && volume === V_START && direction === 'compression') {
      setDirection('expansion');
    }
    setIsPlaying(!isPlaying);
  };

  // --- SVG Charting logic ---
  const svgWidth = 600;
  const svgHeight = 400;
  const padding = { top: 20, right: 30, bottom: 50, left: 60 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  const vMax = 35;
  const pMax = 110;

  const scaleX = useCallback((v: number) => padding.left + (v / vMax) * plotWidth, [plotWidth, padding.left]);
  const scaleY = useCallback((p: number) => padding.top + plotHeight - (p / pMax) * plotHeight, [plotHeight, padding.top]);

  // Generate paths for curves
  const generateCurve = useCallback((pFunction: (v: number) => number) => {
    const points = [];
    for (let v = V_START; v <= V_END; v += 0.5) {
      points.push(`${scaleX(v)},${scaleY(pFunction(v))}`);
    }
    return `M ${points.join(' L ')}`;
  }, [scaleX, scaleY]);

  const isoPath = useMemo(() => generateCurve(pIso), [generateCurve]);
  const adiPath = useMemo(() => generateCurve(pAdi), [generateCurve]);

  // Generate Area under curve (Work)
  const generateArea = useCallback((pFunction: (v: number) => number, currentV: number) => {
    const points = [];
    // If compressing from end, we shade from V_START up to currentV
    const endV = currentV; 
    
    for (let v = V_START; v <= endV; v += 0.5) {
      points.push(`${scaleX(v)},${scaleY(pFunction(v))}`);
    }
    // Add the final precise point
    if (endV % 0.5 !== 0) {
      points.push(`${scaleX(endV)},${scaleY(pFunction(endV))}`);
    }
    
    // Close the polygon down to the x-axis
    points.push(`${scaleX(endV)},${scaleY(0)}`);
    points.push(`${scaleX(V_START)},${scaleY(0)}`);
    
    return `M ${points.join(' L ')} Z`;
  }, [scaleX, scaleY]);

  // Map Temperature to a color (Hot = Red, Cold = Blue)
  const getTempColor = (t: number) => {
    // T ranges from ~193K to 300K in this simulation
    const normalized = Math.max(0, Math.min(1, (t - 190) / (300 - 190)));
    // Hue from 220 (Blue) to 0 (Red)
    const hue = 220 * (1 - normalized);
    return `hsl(${hue}, 80%, 55%)`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-rose-200 p-4 md:p-8 font-sans text-slate-800 flex flex-col items-center">
      {/* Header */}
      <div className="max-w-6xl w-full mb-8 text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-rose-600 mb-2">
          Thermo Playground
        </h1>
        <p className="text-lg text-slate-600 font-medium">Isothermal vs Adiabatic Path Animator</p>
      </div>

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Controls & Simulation (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Concept Card */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/50">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
              <Activity className="text-orange-500" /> Choose Process
            </h2>
            <div className="flex bg-slate-200/50 p-1 rounded-2xl mb-6">
              <button
                onClick={() => { setActiveProcess('isothermal'); if (!isPlaying) setVolume(V_START); }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${
                  activeProcess === 'isothermal' 
                  ? 'bg-orange-500 text-white shadow-md scale-[1.02]' 
                  : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Isothermal
              </button>
              <button
                onClick={() => { setActiveProcess('adiabatic'); if (!isPlaying) setVolume(V_START); }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${
                  activeProcess === 'adiabatic' 
                  ? 'bg-rose-500 text-white shadow-md scale-[1.02]' 
                  : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Adiabatic
              </button>
            </div>

            <div className="text-sm text-slate-600 mb-4 h-16">
              {activeProcess === 'isothermal' ? (
                <p><strong className="text-orange-600">Isothermal:</strong> Temperature remains constant (<span className="italic">ΔT = 0</span>). The system slowly exchanges heat with the surroundings. Pressure drops inversely with volume.</p>
              ) : (
                <p><strong className="text-rose-600">Adiabatic:</strong> No heat is exchanged (<span className="italic">Q = 0</span>). The system does work at the expense of its own internal energy, causing temperature to drop rapidly.</p>
              )}
            </div>

            {/* Animation Controls */}
            <div className="flex items-center gap-4 bg-white/50 p-3 rounded-2xl border border-white shadow-sm mb-6">
              <button 
                onClick={togglePlay}
                className="w-12 h-12 flex items-center justify-center bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition shadow-md"
              >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              </button>
              <button 
                onClick={handleReset}
                className="w-12 h-12 flex items-center justify-center bg-white text-slate-700 rounded-xl hover:bg-slate-50 transition border border-slate-200 shadow-sm"
              >
                <RotateCcw size={20} />
              </button>
              <div className="flex-1 px-2">
                <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1">
                  <span>10L</span>
                  <span>Volume</span>
                  <span>30L</span>
                </div>
                <input 
                  type="range" 
                  min={V_START} 
                  max={V_END} 
                  step="0.1" 
                  value={volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    setIsPlaying(false);
                  }}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>
            </div>

            {/* Piston Visualizer */}
            <div className="relative h-24 bg-slate-100 rounded-2xl border-2 border-slate-200 overflow-hidden flex items-center p-2 shadow-inner">
              {/* Cylinder walls */}
              <div className="absolute top-2 bottom-2 left-2 w-full border-y-4 border-l-4 border-slate-400 rounded-l-lg opacity-50 z-10 pointer-events-none" />
              
              {/* Gas body */}
              <div 
                className="h-full rounded-sm transition-colors duration-100 ease-linear shadow-[inset_0_0_20px_rgba(0,0,0,0.1)]"
                style={{ 
                  width: `${(volume / vMax) * 100}%`,
                  backgroundColor: getTempColor(currentT),
                  opacity: 0.8
                }}
              >
                {/* Gas Particles Effect (Simulated with SVG pattern) */}
                <svg width="100%" height="100%">
                  <pattern id="particles" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.4)" />
                    <circle cx="7" cy="8" r="1.5" fill="rgba(255,255,255,0.2)" />
                  </pattern>
                  <rect width="100%" height="100%" fill="url(#particles)" />
                </svg>
              </div>
              
              {/* Piston Head */}
              <div 
                className="absolute h-[calc(100%-16px)] w-6 bg-gradient-to-r from-slate-400 to-slate-500 rounded-md shadow-[-4px_0_10px_rgba(0,0,0,0.2)] border border-slate-600 z-20 flex items-center justify-center"
                style={{ left: `calc(${(volume / vMax) * 100}% + 8px)` }}
              >
                <div className="w-1 h-8 bg-slate-300 rounded-full opacity-50"></div>
              </div>
              {/* Piston Rod */}
              <div 
                className="absolute h-3 bg-gradient-to-b from-slate-300 via-slate-100 to-slate-400 z-10"
                style={{ 
                  left: `calc(${(volume / vMax) * 100}% + 32px)`,
                  width: '100%'
                }}
              />
            </div>
            <div className="text-center mt-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
              Piston Simulator
            </div>
          </div>

          {/* Real-time Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/70 backdrop-blur-xl p-4 rounded-2xl shadow-lg border border-white/50">
              <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold mb-1">
                <Box size={16} /> Pressure
              </div>
              <div className="text-2xl font-black text-slate-800">
                {currentP.toFixed(1)} <span className="text-sm font-bold text-slate-400">kPa</span>
              </div>
            </div>
            <div className="bg-white/70 backdrop-blur-xl p-4 rounded-2xl shadow-lg border border-white/50">
              <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold mb-1">
                <Wind size={16} /> Volume
              </div>
              <div className="text-2xl font-black text-slate-800">
                {volume.toFixed(1)} <span className="text-sm font-bold text-slate-400">L</span>
              </div>
            </div>
            <div className="bg-white/70 backdrop-blur-xl p-4 rounded-2xl shadow-lg border border-white/50">
              <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold mb-1">
                <Thermometer size={16} /> Temperature
              </div>
              <div className="text-2xl font-black" style={{ color: getTempColor(currentT) }}>
                {currentT.toFixed(0)} <span className="text-sm font-bold opacity-50">K</span>
              </div>
            </div>
            <div className="bg-white/70 backdrop-blur-xl p-4 rounded-2xl shadow-lg border border-white/50">
              <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold mb-1">
                <Zap size={16} /> Work Done
              </div>
              <div className="text-2xl font-black text-green-600">
                {currentW.toFixed(0)} <span className="text-sm font-bold text-green-400">J</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: P-V Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/60 flex flex-col relative overflow-hidden">
          
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800">P-V Diagram</h2>
              <p className="text-sm text-slate-500 font-medium">Pressure vs. Volume Graph</p>
            </div>
            {/* Legend */}
            <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm text-xs font-bold">
              <div className="flex items-center gap-2 text-orange-600">
                <div className="w-4 h-1 bg-orange-500 rounded-full" /> Isothermal
              </div>
              <div className="flex items-center gap-2 text-rose-600">
                <div className="w-4 h-1 bg-rose-500 rounded-full" /> Adiabatic
              </div>
            </div>
          </div>

          <div className="flex-1 w-full relative min-h-[350px] flex items-center justify-center">
            <svg 
              viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
              className="w-full h-auto drop-shadow-sm overflow-visible