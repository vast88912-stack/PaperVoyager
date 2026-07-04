import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, RotateCcw, Settings2, Thermometer, Zap, Activity, Info } from 'lucide-react';

const GAMMA = 1.4; // Diatomic gas

type ProcessType = 'isothermal' | 'adiabatic';
type DirectionType = 'expansion' | 'compression';

export default function App() {
  const [process, setProcess] = useState<ProcessType>('isothermal');
  const [direction, setDirection] = useState<DirectionType>('expansion');
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // Animation Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime: number;

    const animate = (time: number) => {
      if (!lastTime) lastTime = time;
      const delta = time - lastTime;
      lastTime = time;

      if (isPlaying) {
        setProgress((p) => {
          const next = p + delta * 0.0003; // Animation speed
          if (next >= 1) {
            setIsPlaying(false);
            return 1;
          }
          return next;
        });
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying]);

  // Reset progress when changing modes
  useEffect(() => {
    setProgress(0);
    setIsPlaying(false);
  }, [process, direction]);

  // Thermodynamic State Configuration
  const stateConfig = useMemo(() => {
    const vi = direction === 'expansion' ? 2 : 5;
    const pi = direction === 'expansion' ? 4 : 1.5;
    const vf = direction === 'expansion' ? 5 : 2;
    const ti = pi * vi;
    return { vi, pi, vf, ti };
  }, [direction]);

  // Current Thermodynamic Values
  const vCurr = stateConfig.vi + (stateConfig.vf - stateConfig.vi) * progress;
  let pCurr = 0;
  let tCurr = 0;
  let wCurr = 0;
  let qCurr = 0;
  let uCurr = 0;

  if (process === 'isothermal') {
    pCurr = (stateConfig.pi * stateConfig.vi) / vCurr;
    tCurr = stateConfig.ti;
    wCurr = stateConfig.pi * stateConfig.vi * Math.log(vCurr / stateConfig.vi);
    qCurr = wCurr;
    uCurr = 0;
  } else {
    const k = stateConfig.pi * Math.pow(stateConfig.vi, GAMMA);
    pCurr = k / Math.pow(vCurr, GAMMA);
    tCurr = pCurr * vCurr;
    wCurr = (stateConfig.pi * stateConfig.vi - pCurr * vCurr) / (GAMMA - 1);
    qCurr = 0;
    uCurr = -wCurr;
  }

  // --- SVG Graph Helpers ---
  const scaleX = (v: number) => 50 + (v / 6) * 400;
  const scaleY = (p: number) => 350 - (p / 6) * 300;

  const generatePath = (type: ProcessType, vStart: number, vEnd: number, pStart: number) => {
    let d = '';
    const steps = 50;
    for (let i = 0; i <= steps; i++) {
      const v = vStart + (vEnd - vStart) * (i / steps);
      let p = 0;
      if (type === 'isothermal') {
        p = (pStart * vStart) / v;
      } else {
        const k = pStart * Math.pow(vStart, GAMMA);
        p = k / Math.pow(v, GAMMA);
      }
      const ptX = scaleX(v);
      const ptY = scaleY(p);
      d += i === 0 ? `M ${ptX} ${ptY} ` : `L ${ptX} ${ptY} `;
    }
    return d;
  };

  const activePath = generatePath(process, stateConfig.vi, stateConfig.vf, stateConfig.pi);
  const secondaryPath = generatePath(
    process === 'isothermal' ? 'adiabatic' : 'isothermal',
    stateConfig.vi,
    stateConfig.vf,
    stateConfig.pi
  );

  const getAreaPath = () => {
    let d = '';
    const steps = Math.max(1, Math.floor(progress * 50));
    for (let i = 0; i <= steps; i++) {
      const v = stateConfig.vi + (vCurr - stateConfig.vi) * (i / steps);
      let p = 0;
      if (process === 'isothermal') {
        p = (stateConfig.pi * stateConfig.vi) / v;
      } else {
        const k = stateConfig.pi * Math.pow(stateConfig.vi, GAMMA);
        p = k / Math.pow(v, GAMMA);
      }
      const ptX = scaleX(v);
      const ptY = scaleY(p);
      d += i === 0 ? `M ${ptX} ${ptY} ` : `L ${ptX} ${ptY} `;
    }
    d += `L ${scaleX(vCurr)} ${scaleY(0)} L ${scaleX(stateConfig.vi)} ${scaleY(0)} Z`;
    return d;
  };

  // --- Visuals Helpers ---
  const getGasColor = (t: number) => {
    const tMin = 5.5;
    const tMax = 11.0;
    const ratio = Math.max(0, Math.min(1, (t - tMin) / (tMax - tMin)));
    const hue = 240 - ratio * 240; // 240 is Blue, 0 is Red
    return `hsl(${hue}, 80%, 65%)`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 text-slate-800 p-6 font-sans flex items-center justify-center">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Header spanning full width */}
        <div className="lg:col-span-12 flex items-center justify-between bg-white/60 backdrop-blur-md px-6 py-4 rounded-2xl shadow-sm border border-orange-100/50">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent flex items-center gap-2">
              <Zap className="w-6 h-6 text-orange-500" />
              Thermo Playground
            </h1>
            <p className="text-sm text-slate-500 font-medium">Isothermal vs Adiabatic Path Animator</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white rounded-lg font-semibold shadow-md transition-all active:scale-95"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={() => { setProgress(0); setIsPlaying(false); }}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-semibold shadow-sm border border-slate-200 transition-all active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>

        {/* Left Column: Controls & Stats */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Controls Card */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/50">
            <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-slate-400" /> Process Settings
            </h2>
            
            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                  Thermodynamic Path
                </label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {(['isothermal', 'adiabatic'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setProcess(p)}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg capitalize transition-all ${
                        process === p
                          ? 'bg-white text-orange-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                  Direction
                </label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {(['expansion', 'compression'] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDirection(d)}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg capitalize transition-all ${
                        direction === d
                          ? 'bg-white text-rose-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-orange-50 rounded-xl border border-orange-100 text-sm text-slate-600 leading-relaxed">
              <Info className="w-4 h-4 inline-block mr-1 text-orange-500 mb-0.5" />
              {process === 'isothermal' 
                ? "In an isothermal process, temperature remains constant. The gas exchanges heat with its surroundings to do work."
                : "In an adiabatic process, there is no heat exchange (Q=0). The gas's internal energy changes to do work, causing temperature to shift."}
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-white