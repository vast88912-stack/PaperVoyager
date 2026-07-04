import React, { useState, useEffect, useMemo } from 'react';

// --- Constants & Helpers ---

type ScoreTier = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Overlapping';

interface ScoreInfo {
  label: ScoreTier;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  gradientStops: [string, string];
  description: string;
}

const getScoreInfo = (score: number): ScoreInfo => {
  if (score >= 0.7) {
    return {
      label: 'Excellent',
      colorClass: 'text-emerald-600',
      bgClass: 'bg-emerald-50',
      borderClass: 'border-emerald-200',
      gradientStops: ['#34d399', '#059669'], // emerald-400 to emerald-600
      description: 'Clusters are dense and well-separated.',
    };
  }
  if (score >= 0.5) {
    return {
      label: 'Good',
      colorClass: 'text-blue-600',
      bgClass: 'bg-blue-50',
      borderClass: 'border-blue-200',
      gradientStops: ['#60a5fa', '#2563eb'], // blue-400 to blue-600
      description: 'Clusters are distinct but could be tighter.',
    };
  }
  if (score >= 0.25) {
    return {
      label: 'Fair',
      colorClass: 'text-purple-600',
      bgClass: 'bg-purple-50',
      borderClass: 'border-purple-200',
      gradientStops: ['#c084fc', '#7c3aed'], // purple-400 to violet-600
      description: 'Clusters are close; some overlap likely.',
    };
  }
  if (score >= 0) {
    return {
      label: 'Poor',
      colorClass: 'text-orange-600',
      bgClass: 'bg-orange-50',
      borderClass: 'border-orange-200',
      gradientStops: ['#fb923c', '#ea580c'], // orange-400 to orange-600
      description: 'Significant overlap between clusters.',
    };
  }
  return {
    label: 'Overlapping',
    colorClass: 'text-rose-600',
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-200',
    gradientStops: ['#fb7185', '#e11d48'], // rose-400 to rose-600
    description: 'Points are assigned to the wrong clusters.',
  };
};

// --- Icons ---

const ChevronDownIcon = ({ className = '' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const ActivityIcon = ({ className = '' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const InfoIcon = ({ className = '' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// --- Main Badge Component ---

const SilhouetteBadge = ({ score }: { score: number }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const info = getScoreInfo(score);

  // Math for the SVG Gauge
  const radius = 40;
  const circumference = Math.PI * radius; // Half-circle
  // Map -1..1 to 0..1
  const normalizedScore = (score + 1) / 2;
  const dashoffset = circumference - normalizedScore * circumference;

  // Simulate individual cluster scores that average out to the main score
  // This gives the badge a very realistic "Data Viz" feel
  const clusterScores = useMemo(() => {
    return [
      Math.max(-1, Math.min(1, score + 0.12)),
      Math.max(-1, Math.min(1, score - 0.08)),
      Math.max(-1, Math.min(1, score - 0.04)),
    ];
  }, [score]);

  return (
    <div className="relative font-sans w-72">
      {/* Compact Badge (Always Visible) */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl shadow-sm border transition-all duration-300 hover:shadow-md ${info.bgClass} ${info.borderClass}`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-full bg-white shadow-sm ${info.colorClass}`}>
            <ActivityIcon />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Silhouette Score
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-lg font-bold ${info.colorClass}`}>
                {score.toFixed(3)}
              </span>
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md bg-white/60 ${info.colorClass}`}>
                {info.label}
              </span>
            </div>
          </div>
        </div>
        <ChevronDownIcon
          className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded Details Panel */}
      <div
        className={`absolute top-full left-0 right-0 mt-2 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 overflow-hidden transition-all duration-500 origin-top z-10 ${
          isExpanded ? 'opacity-100 scale-y-100 pointer-events-auto' : 'opacity-0 scale-y-0 pointer-events-none'
        }`}
      >
        <div className="p-5">
          {/* Gauge Viz */}
          <div className="relative flex flex-col items-center justify-center h-28 mb-2">
            <svg viewBox="0 0 100 55" className="w-40 h-auto overflow-visible">
              <defs>
                <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={info.gradientStops[0]} />
                  <stop offset="100%" stopColor={info.gradientStops[1]} />
                </linearGradient>
              </defs>
              {/* Background Arc */}
              <path
                d="M 10 50 A 40 40 0 0 1 90 50"
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="8"
                strokeLinecap="round"
              />
              {/* Value Arc */}
              <path
                d="M 10 50 A 40 40 0 0 1 90 50"
                fill="none"
                stroke="url(#gauge-gradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashoffset}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute bottom-0 flex flex-col items-center">
              <span className="text-3xl font-black text-slate-800 tracking-tight">
                {score.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest -mt-1">
                Global Avg
              </span>
            </div>
          </div>

          <p className="text-xs text-center text-slate-500 mb-5 px-2">
            {info.description}
          </p>

          {/* Cluster Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 pb-1">
              <span>Cluster</span>
              <div className="flex-1 px-4 flex justify-between">
                <span>-1</span>
                <span>0</span>
                <span>1</span>
              </div>
              <span className="w-8 text-right">Score</span>
            </div>

            {clusterScores.map((cs, i) => {
              // Center-aligned bar math (-1 to 1)
              const width = Math.abs(cs) * 50;
              const left = cs >= 0 ? 50 : 50 - width;
              const isPositive = cs >= 0;

              return (
                <div key={i} className="flex items-center text-xs group">
                  <div className="w-12 flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${isPositive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    <span className="text-slate-600 font-medium">C{i + 1}</span>
                  </div>
                  
                  <div className="flex-1 h-3 bg-slate-50 rounded-full relative overflow-hidden shadow-inner mx-2">
                    {/* Zero line */}
                    <div className="absolute top-0 bottom-0 w-[2px] bg-slate-200 left-1/2 -ml-[1px] z-10" />
                    {/* Value Bar */}
                    <div
                      className={`absolute top-0 bottom-0 rounded-full transition-all duration-700 ease-out ${
                        isPositive ? 'bg-gradient-to-r from-emerald-300 to-emerald-400' : 'bg-gradient-to-l from-rose-300 to-rose-400'
                      }`}
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                      }}
                    />
                  </div>
                  
                  <span className={`w-8 text-right font-mono font-medium ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {cs.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-start gap-2 text-[10px] text-slate-400 leading-tight">
            <InfoIcon className="shrink-0 mt-0.5 text-slate-300" />
            <p>Score relates distance to intra-cluster points vs nearest neighboring cluster.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- App Wrapper / Showcase ---

export default function App() {
  const [simulatedScore, setSimulatedScore] = useState(0.68);

  // Auto-animate score for demonstration purposes on load
  useEffect(() => {
    const timer = setTimeout(() => {
      setSimulatedScore(0.82);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 font-sans">
      <div className="max-w-md w-full flex flex-col items-center gap-12">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            K-Means & Friends Lab
          </h1>
          <p className="text-sm text-slate-500">
            Interactive Silhouette Score Badge (Variant 3)
          </p>
        </div>

        {/* The Badge Showcase */}
        <div className="relative z-20">
          <SilhouetteBadge score={simulatedScore} />
        </div>

        {/* Controls */}
        <div className="w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6 mt-16 z-0">
          <div>
            <label className="flex justify-between items-center text-sm font-semibold text-slate-700 mb-4">
              <span>Adjust Model Quality</span>
              <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                score: {simulatedScore.toFixed(2)}
              </span>
            </label>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              value={simulatedScore}
              onChange={(e) => setSimulatedScore(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            />
          </div>
          
          <div className="flex gap-2 justify-between">
            <button
              onClick={() => setSimulatedScore(-0.45)}
              className="flex-1 py-2 px-3 text-xs font-medium rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
            >
              Simulate Bad
            </button>
            <button
              onClick={() => setSimulatedScore(0.35)}
              className="flex-1 py-2 px-3 text-xs font-medium rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
            >
              Simulate Fair
            </button>
            <button
              onClick={() => setSimulatedScore(0.85)}
              className="flex-1 py-2 px-3 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
            >
              Simulate Good
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}