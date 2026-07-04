import React, { useState, useEffect, useRef } from 'react';

// --- Types & Helpers ---

type QualityTier = {
  label: string;
  colorClass: string;
  bgClass: string;
  strokeClass: string;
  gradient: [string, string];
  description: string;
};

const getQualityTier = (score: number): QualityTier => {
  if (score < -0.2) {
    return {
      label: 'Poor',
      colorClass: 'text-pink-500',
      bgClass: 'bg-pink-50',
      strokeClass: 'stroke-pink-500',
      gradient: ['#ec4899', '#f43f5e'],
      description: 'Clusters are highly overlapping or misclassified.',
    };
  }
  if (score < 0.4) {
    return {
      label: 'Fair',
      colorClass: 'text-orange-400',
      bgClass: 'bg-orange-50',
      strokeClass: 'stroke-orange-400',
      gradient: ['#fb923c', '#fbbf24'],
      description: 'Clusters are somewhat overlapping.',
    };
  }
  if (score < 0.7) {
    return {
      label: 'Good',
      colorClass: 'text-teal-400',
      bgClass: 'bg-teal-50',
      strokeClass: 'stroke-teal-400',
      gradient: ['#2dd4bf', '#34d399'],
      description: 'Clusters are dense and well-separated.',
    };
  }
  return {
    label: 'Excellent',
    colorClass: 'text-purple-500',
    bgClass: 'bg-purple-50',
    strokeClass: 'stroke-purple-500',
    gradient: ['#a855f7', '#d946ef'],
    description: 'Perfectly separated, highly dense clusters.',
  };
};

// --- Subcomponents ---

const CustomSparkline = ({ data, strokeClass }: { data: number[]; strokeClass: string }) => {
  const width = 200;
  const height = 40;
  
  if (data.length < 2) return <div style={{ height }} className="w-full" />;

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      // Silhouette score ranges from -1 to 1
      const normalizedD = (d + 1) / 2;
      const y = height - normalizedD * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-12 overflow-visible">
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <polyline
        points={points}
        fill="none"
        className={`${strokeClass} transition-colors duration-300`}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#glow)"
      />
    </svg>
  );
};

// --- Main Application Component ---

export default function App() {
  const [score, setScore] = useState<number>(0.65);
  const [history, setHistory] = useState<number[]>(Array(20).fill(0.1));
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const animationRef = useRef<number | null>(null);

  const tier = getQualityTier(score);

  // Simulated optimization process
  useEffect(() => {
    if (!isAnimating) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    let currentScore = score;
    let targetScore = 0.85 + Math.random() * 0.1; // Converge towards a good score
    
    // If already high, occasionally drop it to simulate exploring a bad init
    if (currentScore > 0.8 && Math.random() < 0.05) {
      targetScore = -0.5 + Math.random() * 0.8;
    }

    const animate = () => {
      currentScore += (targetScore - currentScore) * 0.05 + (Math.random() - 0.5) * 0.02;
      currentScore = Math.max(-1, Math.min(1, currentScore)); // Clamp -1 to 1
      
      setScore(currentScore);
      setHistory((prev) => [...prev.slice(1), currentScore]);
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnimating]);

  // Handle manual slider change
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setScore(val);
    setHistory((prev) => [...prev.slice(1), val]);
    setIsAnimating(false);
  };

  // SVG Gauge calculations
  const radius = 70;
  const arcLength = Math.PI * radius;
  // Normalized score from 0 to 1
  const normalizedScore = (score + 1) / 2;
  const strokeDashoffset = arcLength - normalizedScore * arcLength;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans text-slate-800">
      <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 p-8 max-w-sm w-full border border-slate-100 relative overflow-hidden">
        
        {/* Decorative ambient background blur */}
        <div 
          className={`absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl opacity-20 transition-colors duration-700 ${tier.bgClass}`}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-800">Cluster Quality</h2>
            <p className="text-sm text-slate-400 font-medium">Silhouette Score</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${tier.bgClass} ${tier.colorClass}`}>
            {tier.label}
          </div>
        </div>

        {/* Gauge Visualization */}
        <div className="relative flex justify-center items-center mb-6">
          <svg width="180" height="100" viewBox="0 0 180 100" className="drop-shadow-sm">
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={tier.gradient[0]} />
                <stop offset="100%" stopColor={tier.gradient[1]} />
              </linearGradient>
            </defs>
            {/* Background Arc */}
            <path
              d="M 20 90 A 70 70 0 0 1 160 90"
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="12"
              strokeLinecap="round"
            />
            {/* Active Arc */}
            <path
              d="M 20 90 A 70 70 0 0 1 160 90"
              fill="none"
              stroke="url(#scoreGradient)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={arcLength}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-300 ease-out"
            />
          </svg>
          
          {/* Central Score Value */}
          <div className="absolute bottom-0 left-0 w-full flex flex-col items-center justify-end pb-2">
            <span className={`text-4xl font-extrabold tracking-tighter transition-colors duration-300 ${tier.colorClass}`}>
              {score.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-center text-sm text-slate-500 mb-8 h-10 transition-opacity duration-300">
          {tier.description}
        </p>

        {/* Sparkline History */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-slate-400 mb-2 font-semibold tracking-wide">
            <span>Optimization History</span>
            <span className={isAnimating ? 'animate-pulse text-teal-400' : ''}>
              {isAnimating ? 'Live...' : 'Paused'}
            </span>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <CustomSparkline data={history} strokeClass={tier.strokeClass} />
          </div>
        </div>

        {/* Interactive Controls */}
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <span>-1 (Worst)</span>
              <span>1 (Best)</span>
            </div>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              value={score}
              onChange={handleSliderChange}
              disabled={isAnimating}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed accent-slate-600"
            />
          </div>

          <button
            onClick={() => setIsAnimating(!isAnimating)}
            className={`w-full py-3 px-4 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 shadow-md active:scale-95 flex items-center justify-center gap-2 ${
              isAnimating 
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 shadow-slate-200/50' 
                : 'bg-slate-800 text-white hover:bg-slate-700 shadow-slate-800/20'
            }`}
          >
            {isAnimating ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pause Simulation
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Simulate K-Means Drift
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}