import React, { useState, useEffect } from 'react';
import { Activity, Info, Sparkles, Target, ChevronRight, BarChart2 } from 'lucide-react';

// --- Types & Helpers ---

type ScoreTheme = {
  label: string;
  description: string;
  color: string;
  bgLight: string;
  bgSolid: string;
  border: string;
  shadow: string;
};

const getScoreTheme = (score: number): ScoreTheme => {
  if (score < 0) {
    return {
      label: 'Poor',
      description: 'Clusters are overlapping or misclassified.',
      color: 'text-pink-500',
      bgLight: 'bg-pink-50',
      bgSolid: 'bg-pink-400',
      border: 'border-pink-200',
      shadow: 'shadow-pink-200',
    };
  }
  if (score < 0.4) {
    return {
      label: 'Fair',
      description: 'Clusters are highly overlapping.',
      color: 'text-yellow-500',
      bgLight: 'bg-yellow-50',
      bgSolid: 'bg-yellow-400',
      border: 'border-yellow-200',
      shadow: 'shadow-yellow-200',
    };
  }
  if (score < 0.7) {
    return {
      label: 'Good',
      description: 'Clusters are well separated.',
      color: 'text-purple-500',
      bgLight: 'bg-purple-50',
      bgSolid: 'bg-purple-400',
      border: 'border-purple-200',
      shadow: 'shadow-purple-200',
    };
  }
  return {
    label: 'Excellent',
    description: 'Dense and perfectly separated clusters.',
    color: 'text-cyan-500',
    bgLight: 'bg-cyan-50',
    bgSolid: 'bg-cyan-400',
    border: 'border-cyan-200',
    shadow: 'shadow-cyan-200',
  };
};

// --- Components ---

const CompactBadge = ({ score }: { score: number }) => {
  const theme = getScoreTheme(score);
  
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${theme.bgLight} ${theme.border} transition-colors duration-500`}>
      <Activity size={14} className={theme.color} />
      <span className="text-sm font-semibold text-slate-700">
        Silhouette: <span className={theme.color}>{score.toFixed(3)}</span>
      </span>
    </div>
  );
};

const DetailedScoreCard = ({ score }: { score: number }) => {
  const theme = getScoreTheme(score);
  const percentage = ((score + 1) / 2) * 100; // Map -1..1 to 0..100%

  return (
    <div className="relative overflow-hidden bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/50 w-full max-w-md transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/60">
      {/* Background Candy Glow */}
      <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-20 ${theme.bgSolid} transition-colors duration-700`} />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${theme.bgLight} ${theme.color} transition-colors duration-500`}>
              <Target size={20} />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">Silhouette Score</h3>
          </div>
          <div className="group relative cursor-help">
            <Info size={18} className="text-slate-400 hover:text-slate-600 transition-colors" />
            <div className="absolute right-0 w-64 p-3 mt-2 text-xs text-slate-600 bg-white border border-slate-100 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
              Measures how similar an object is to its own cluster compared to other clusters. Ranges from -1 to +1.
            </div>
          </div>
        </div>

        {/* Score Display */}
        <div className="flex items-end gap-3 mb-2">
          <span className="text-5xl font-black text-slate-800 tracking-tighter">
            {score > 0 ? '+' : ''}{score.toFixed(2)}
          </span>
          <div className={`px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide uppercase border ${theme.bgLight} ${theme.color} ${theme.border} mb-1 transition-colors duration-500`}>
            {theme.label}
          </div>
        </div>
        <p className="text-sm text-slate-500 mb-8 h-5 transition-colors duration-500">
          {theme.description}
        </p>

        {/* Gauge / Bar */}
        <div className="relative pt-4">
          {/* Track */}
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
            <div className="h-full w-1/4 bg-pink-100" />
            <div className="h-full w-[20%] bg-yellow-100" />
            <div className="h-full w-[15%] bg-purple-100" />
            <div className="h-full w-[40%] bg-cyan-100" />
          </div>

          {/* Center Zero Marker */}
          <div className="absolute top-2 bottom-0 left-1/2 w-px bg-slate-300 z-0" />
          <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[10px] font-medium text-slate-400">- 0 -</span>
          <span className="absolute -top-1 left-0 text-[10px] font-medium text-slate-400">-1</span>
          <span className="absolute -top-1 right-0 text-[10px] font-medium text-slate-400">+1</span>

          {/* Animated Thumb */}
          <div 
            className="absolute top-2.5 -ml-2.5 w-5 h-5 rounded-full bg-white border-2 shadow-md transition-all duration-700 ease-out z-10 flex items-center justify-center"
            style={{ 
              left: `${percentage}%`,
              borderColor: theme.color.replace('text-', '') // Hacky but works for tailwind classes in this controlled env
            }}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${theme.bgSolid}`} />
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Application / Demo Wrapper ---

export default function App() {
  const [score, setScore] = useState(0.65);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  // Auto-play simulation
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setScore((prev) => {
        // Random walk between -0.5 and 0.95
        const change = (Math.random() - 0.5) * 0.3;
        const newScore = Math.max(-0.5, Math.min(0.95, prev + change));
        return Number(newScore.toFixed(2));
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans selection:bg-cyan-100 selection:text-cyan-900">
      
      {/* Header */}
      <div className="mb-12 text-center max-w-lg">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-widest mb-4 shadow-sm">
          <Sparkles size={14} className="text-cyan-500" />
          K-Means & Friends Lab
        </div>
        <h1 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">
          Silhouette Score Badge
        </h1>
        <p className="text-slate-500 text-sm">
          A dynamic, candy-themed visualization component for evaluating cluster quality in real-time.
        </p>
      </div>

      {/* Main Showcase Area */}
      <div className="flex flex-col items-center gap-8 w-full max-w-4xl">
        
        {/* Top Bar Context (Simulating the lab UI) */}
        <div className="w-full max-w-2xl bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white shadow-inner">
              <BarChart2 size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Current Model</h2>
              <p className="text-xs text-slate-500">K-Means++ (k=4)</p>
            </div>
          </div>
          
          {/* Compact Badge Variant */}
          <CompactBadge score={score} />
        </div>

        {/* Detailed Card Variant */}
        <DetailedScoreCard score={score} />

        {/* Controls (For demonstration purposes) */}
        <div className="w-full max-w-md bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mt-4">
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-bold text-slate-700">Interactive Demo Control</label>
            <button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${
                isAutoPlaying 
                  ? 'bg-rose-100 text-rose-600 hover:bg-rose-200' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {isAutoPlaying ? 'Stop Simulation' : 'Auto Simulate'}
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-slate-400">-1</span>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              value={score}
              onChange={(e) => setScore(parseFloat(e.target.value))}
              disabled={isAutoPlaying}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:opacity-50"
            />
            <span className="text-xs font-medium text-slate-400">+1</span>
          </div>
          <div className="mt-4 flex gap-2 justify-center">
            {[-0.4, 0.2, 0.6, 0.85].map((preset) => (
              <button
                key={preset}
                onClick={() => setScore(preset)}
                disabled={isAutoPlaying}
                className="text-[10px] px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-50 transition-colors"
              >
                Set {preset}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}