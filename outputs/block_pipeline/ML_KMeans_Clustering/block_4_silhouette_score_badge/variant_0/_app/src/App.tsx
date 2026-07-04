import React, { useState, useMemo } from 'react';
import { Info, CheckCircle2, AlertTriangle, XCircle, Activity, ChevronRight } from 'lucide-react';

// --- Types & Interfaces ---
type ScoreConfig = {
  color: string;
  bg: string;
  border: string;
  icon: React.ElementType;
  label: string;
  description: string;
};

// --- Helper Functions ---
const getScoreConfig = (score: number): ScoreConfig => {
  if (score >= 0.7) {
    return {
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      icon: CheckCircle2,
      label: 'Excellent',
      description: 'Dense and well-separated clusters.',
    };
  }
  if (score >= 0.5) {
    return {
      color: 'text-cyan-500',
      bg: 'bg-cyan-50',
      border: 'border-cyan-200',
      icon: CheckCircle2,
      label: 'Good',
      description: 'Reasonable cluster structure found.',
    };
  }
  if (score >= 0.25) {
    return {
      color: 'text-amber-500',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: AlertTriangle,
      label: 'Fair',
      description: 'Weak structure; clusters may be artificial.',
    };
  }
  if (score >= 0.0) {
    return {
      color: 'text-orange-500',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      icon: AlertTriangle,
      label: 'Poor',
      description: 'Overlapping or poorly separated clusters.',
    };
  }
  return {
    color: 'text-rose-500',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    icon: XCircle,
    label: 'Invalid',
    description: 'Incorrect clustering; points assigned to wrong clusters.',
  };
};

// --- Components ---

const SilhouetteBadge = ({ score }: { score: number }) => {
  const config = getScoreConfig(score);
  const Icon = config.icon;

  // Math for SVG Circle Gauge
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  // Map score (-1 to 1) to percentage (0 to 100)
  const percentage = (score + 1) / 2;
  const strokeDashoffset = circumference - percentage * circumference;

  return (
    <div className={`relative flex flex-col items-center p-6 rounded-3xl border-2 transition-colors duration-500 ${config.bg} ${config.border} shadow-sm`}>
      {/* Info Tooltip Icon */}
      <div className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-help group">
        <Info size={18} />
        <div className="absolute right-0 w-48 p-2 mt-2 text-xs text-white bg-slate-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
          The Silhouette Score ranges from -1 to 1. It measures how similar an object is to its own cluster compared to other clusters.
        </div>
      </div>

      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">
        Silhouette Score
      </h3>

      {/* Gauge */}
      <div className="relative flex items-center justify-center w-32 h-32 mb-4">
        <svg className="absolute inset-0 w-full h-full transform -rotate-90 drop-shadow-sm">
          {/* Background Track */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-slate-200/50"
          />
          {/* Progress Track */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={`transition-all duration-700 ease-out ${config.color}`}
          />
        </svg>
        
        {/* Score Display inside Gauge */}
        <div className="flex flex-col items-center justify-center z-10">
          <span className={`text-3xl font-black tracking-tighter transition-colors duration-500 ${config.color}`}>
            {score > 0 ? '+' : ''}{score.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Status Label */}
      <div className="flex items-center gap-2 mb-2">
        <Icon size={20} className={`transition-colors duration-500 ${config.color}`} />
        <span className={`text-lg font-bold transition-colors duration-500 ${config.color}`}>
          {config.label}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-600 text-center max-w-[200px] h-10 leading-tight">
        {config.description}
      </p>
    </div>
  );
};

const MockClusterViz = ({ score }: { score: number }) => {
  // Generate stable random points
  const points = useMemo(() => {
    return Array.from({ length: 150 }).map((_, i) => {
      const cluster = i % 3;
      // Random angle and distance for base position
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random();
      return { id: i, cluster, angle, dist };
    });
  }, []);

  const centers = [
    { x: 30, y: 30, color: 'bg-rose-400' },
    { x: 70, y: 30, color: 'bg-cyan-400' },
    { x: 50, y: 70, color: 'bg-violet-400' },
  ];

  // Calculate spread based on score. 
  // Score 1.0 -> tight clusters (spread multiplier ~ 10)
  // Score 0.0 -> overlapping (spread multiplier ~ 35)
  // Score -1.0 -> completely mixed (spread multiplier ~ 60)
  const spreadMultiplier = 15 + ((1 - score) * 25);

  return (
    <div className="relative w-full h-64 bg-white rounded-3xl border-2 border-slate-100 shadow-inner overflow-hidden">
      <div className="absolute top-4 left-4 flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
        <Activity size={14} />
        Live Cluster Preview
      </div>
      
      {points.map((p) => {
        const center = centers[p.cluster];
        // Calculate position with dynamic spread
        const x = center.x + Math.cos(p.angle) * p.dist * spreadMultiplier;
        const y = center.y + Math.sin(p.angle) * p.dist * spreadMultiplier;

        return (
          <div
            key={p.id}
            className={`absolute w-2.5 h-2.5 rounded-full opacity-80 mix-blend-multiply transition-all duration-700 ease-out ${center.color}`}
            style={{
              left: `${Math.max(5, Math.min(95, x))}%`,
              top: `${Math.max(5, Math.min(95, y))}%`,
              transform: 'translate(-50%, -50%)'
            }}
          />
        );
      })}

      {/* Centroids */}
      {centers.map((c, i) => (
        <div
          key={`center-${i}`}
          className="absolute w-4 h-4 bg-white border-4 border-slate-800 rounded-full shadow-md z-10 transition-all duration-700"
          style={{ left: `${c.x}%`, top: `${c.y}%`, transform: 'translate(-50%, -50%)' }}
        />
      ))}
    </div>
  );
};

export default function App() {
  const [score, setScore] = useState<number>(0.65);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans text-slate-800 selection:bg-cyan-200">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        
        {/* Left Column: Interactive Controls & Context */}
        <div className="md:col-span-7 space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-100 text-cyan-700 text-xs font-bold uppercase tracking-widest mb-4">
              Module 5 <ChevronRight size={12} /> Evaluation
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-4">
              Silhouette Score Badge
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              Evaluate the quality of your K-Means clustering in real-time. 
              Adjust the slider below to simulate different clustering outcomes and see how the badge and point cloud react.
            </p>
          </div>

          {/* Interactive Slider Control */}
          <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm">
            <div className="flex justify-between items-end mb-4">
              <label htmlFor="score-slider" className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                Simulate Score
              </label>
              <span className="text-2xl font-black text-slate-800">
                {score.toFixed(2)}
              </span>
            </div>
            
            <input
              id="score-slider"
              type="range"
              min="-1"
              max="1"
              step="0.01"
              value={score}
              onChange={(e) => setScore(parseFloat(e.target.value))}
              className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 transition-all"
            />
            
            <div className="flex justify-between text-xs font-medium text-slate-400 mt-2">
              <span>-1.0 (Incorrect)</span>
              <span>0.0 (Overlapping)</span>
              <span>1.0 (Perfect)</span>
            </div>
          </div>

          {/* Mock Visualization */}
          <MockClusterViz score={score} />
        </div>

        {/* Right Column: The Badge Component */}
        <div className="md:col-span-5 flex justify-center">
          <div className="w-full max-w-sm">
            <SilhouetteBadge score={score} />
          </div>
        </div>

      </div>
    </div>
  );
}