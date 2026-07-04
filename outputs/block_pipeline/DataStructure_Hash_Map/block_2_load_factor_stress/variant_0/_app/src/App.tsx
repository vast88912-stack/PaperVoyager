import React, { useState, useMemo } from 'react';

// --- Math Helpers for Expected Probe Counts ---
// Formulas based on standard hashing analysis (e.g., Knuth)
// alpha = load factor (n/m)

const calcChaining = (alpha: number) => ({
  successful: 1 + alpha / 2,
  unsuccessful: 1 + alpha,
});

const calcLinear = (alpha: number) => ({
  successful: 0.5 * (1 + 1 / (1 - alpha)),
  unsuccessful: 0.5 * (1 + 1 / Math.pow(1 - alpha, 2)),
});

const calcQuadratic = (alpha: number) => ({
  // Approximation assuming uniform hashing
  successful: alpha === 0 ? 1 : (1 / alpha) * Math.log(1 / (1 - alpha)),
  unsuccessful: 1 / (1 - alpha),
});

export default function App() {
  const [alpha, setAlpha] = useState<number>(0.5);

  // Calculate current stats
  const stats = useMemo(() => ({
    chaining: calcChaining(alpha),
    linear: calcLinear(alpha),
    quadratic: calcQuadratic(alpha),
  }), [alpha]);

  // --- SVG Chart Configuration ---
  const chartWidth = 800;
  const chartHeight = 320;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;
  
  const maxProbesChart = 20; // Cap Y-axis at 20 probes for better visualization

  const getX = (a: number) => padding.left + (a / 0.95) * graphWidth;
  const getY = (p: number) => padding.top + graphHeight - (Math.min(p, maxProbesChart) / maxProbesChart) * graphHeight;

  // Generate path data for the chart (Unsuccessful searches)
  const paths = useMemo(() => {
    const steps = 50;
    let pathChaining = '';
    let pathLinear = '';
    let pathQuadratic = '';

    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * 0.95;
      const x = getX(a);
      
      const cY = getY(calcChaining(a).unsuccessful);
      const lY = getY(calcLinear(a).unsuccessful);
      const qY = getY(calcQuadratic(a).unsuccessful);

      if (i === 0) {
        pathChaining += `M ${x},${cY} `;
        pathLinear += `M ${x},${lY} `;
        pathQuadratic += `M ${x},${qY} `;
      } else {
        pathChaining += `L ${x},${cY} `;
        pathLinear += `L ${x},${lY} `;
        pathQuadratic += `L ${x},${qY} `;
      }
    }
    return { pathChaining, pathLinear, pathQuadratic };
  }, []);

  const isDangerZone = alpha > 0.7;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-6 font-sans text-slate-800 flex flex-col items-center">
      
      {/* Header */}
      <header className="max-w-5xl w-full text-center mb-10 mt-8">
        <div className="inline-block bg-white/60 backdrop-blur-md px-6 py-2 rounded-full shadow-sm border border-orange-100 mb-4">
          <span className="text-orange-500 font-bold tracking-wider uppercase text-sm">Module 3</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 mb-4 tracking-tight">
          Load Factor <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-400">Stress Test</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Watch what happens to performance as the hash map fills up! 
          Adjust the load factor (α) to see how different collision resolution strategies handle the pressure.
        </p>
      </header>

      <main className="max-w-5xl w-full space-y-8">
        
        {/* Control Panel */}
        <section className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border-2 border-white p-8 relative overflow-hidden">
          {isDangerZone && (
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-400 via-red-500 to-rose-400 animate-pulse" />
          )}
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1 w-full">
              <div className="flex justify-between items-end mb-4">
                <label htmlFor="alpha-slider" className="text-xl font-bold text-slate-700 flex items-center gap-2">
                  Load Factor (α)
                  <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-md">n / m</span>
                </label>
                <span className={`text-3xl font-black ${isDangerZone ? 'text-rose-500' : 'text-indigo-500'}`}>
                  {alpha.toFixed(2)}
                </span>
              </div>
              
              <input
                id="alpha-slider"
                type="range"
                min="0"
                max="0.95"
                step="0.01"
                value={alpha}
                onChange={(e) => setAlpha(parseFloat(e.target.value))}
                className="w-full h-4 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
                style={{
                  background: `linear-gradient(to right, ${isDangerZone ? '#f43f5e' : '#6366f1'} ${(alpha / 0.95) * 100}%, #e2e8f0 ${(alpha / 0.95) * 100}%)`
                }}
              />
              
              <div className="flex justify-between text-xs font-semibold text-slate-400 mt-2 px-1">
                <span>0.0 (Empty)</span>
                <span>0.5 (Half Full)</span>
                <span className="text-rose-400">0.95 (Critical)</span>
              </div>
            </div>

            <div className="w-full md:w-1/3 bg-slate-50 rounded-2xl p-4 border border-slate-100 shadow-inner">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">What is α?</h3>
              <p className="text-sm text-slate-600">
                The ratio of stored items to available buckets. As α approaches 1, open addressing strategies suffer from <strong>clustering</strong>, causing probe counts to skyrocket!
              </p>
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Separate Chaining Card */}
          <div className="bg-gradient-to-b from-teal-50 to-white rounded-3xl p-6 shadow-lg border border-teal-100 relative overflow-hidden group hover:-translate-y-1 transition-transform">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-teal-200 rounded-full opacity-20 group-hover:scale-150 transition-transform duration-500" />
            <h2 className="text-2xl font-bold text-teal-800 mb-1">Separate Chaining</h2>
            <p className="text-teal-600 text-sm mb-6 font-medium h-10">Linked lists handle collisions gracefully.</p>
            
            <div className="space-y-4">
              <StatRow label="Successful Search" value={stats.chaining.successful} color="teal" />
              <StatRow label="Unsuccessful Search" value={stats.chaining.unsuccessful} color="teal" />
            </div>
          </div>

          {/* Linear Probing Card */}
          <div className="bg-gradient-to-b from-rose-50 to-white rounded-3xl p-6 shadow-lg border border-rose-100 relative overflow-hidden group hover:-translate-y-1 transition-transform">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-200 rounded-full opacity-20 group-hover:scale-150 transition-transform duration-500" />
            <h2 className="text-2xl font-bold text-rose-800 mb-1">Linear Probing</h2>
            <p className="text-rose-600 text-sm mb-6 font-medium h-10">Suffers heavily from primary clustering.</p>
            
            <div className="space-y-4">
              <StatRow label="Successful Search" value={stats.linear.successful} color="rose" />
              <StatRow label="Unsuccessful Search" value={stats.linear.unsuccessful} color="rose" />
            </div>
          </div>

          {/* Quadratic Probing Card */}
          <div className="bg-gradient-to-b from-purple-50 to-white rounded-3xl p-6 shadow-lg border border-purple-100 relative overflow-hidden group hover:-translate-y-1 transition-transform">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-200 rounded-full opacity-20 group-hover:scale-150 transition-transform duration-500" />
            <h2 className="text-2xl font-bold text-purple-800 mb-1">Quadratic Probing</h2>
            <p className="text-purple-600 text-sm mb-6 font-medium h-10">Avoids primary clustering, but still degrades.</p>
            
            <div className="space-y-4">
              <StatRow label="Successful Search" value={stats.quadratic.successful} color="purple" />
              <StatRow label="Unsuccessful Search" value={stats.quadratic.unsuccessful} color="purple" />
            </div>
          </div>
        </section>

        {/* Chart Section */}
        <section className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Expected Probes vs Load Factor</h2>
              <p className="text-slate-500 text-sm">Showing Unsuccessful Search (Worst-case scenario)</p>
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-sm font-semibold">
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-teal-400 rounded-full" /> <span className="text-teal-700">Chaining</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-rose-400 rounded-full" /> <span className="text-rose-700">Linear</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-purple-400 rounded-full" /> <span className="text-purple-700">Quadratic</span>
              </div>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <svg 
              viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
              className="w-full h-auto min-w-[600px] bg-slate-50/50 rounded-2xl"
            >
              {/* Grid Lines */}
              {[0, 5, 10, 15, 20].map((val) => (
                <g key={`grid-y-${val}`}>
                  <line 
                    x1={padding.left} 
                    y1={getY(val)} 
                    x2={chartWidth - padding.right} 
                    y2={getY(val)} 
                    stroke="#e2e8f0" 
                    strokeWidth="1" 
                    strokeDasharray="4 4" 
                  />
                  <text x={padding.left - 10} y={getY(val) + 4} textAnchor="end" fontSize="12" fill="#94a3b8" fontWeight="600">
                    {val}{val === 20 ? '+' : ''}
                  </text>
                </g>
              ))}

              {/* X Axis Labels */}
              {[0, 0.25, 0.5, 0.75, 0.95].map((val) => (
                <g key={`grid-x-${val}`}>
                  <text x={getX(val)} y={chartHeight - 10} textAnchor="middle" fontSize="12" fill="#94a3b8" fontWeight="600">
                    α = {val}
                  </text>
                </g>
              ))}

              {/* Axes */}
              <line x1={padding.left} y1={getY(0)} x2={chartWidth - padding.right} y2={getY(0)} stroke="#cbd5e1" strokeWidth="2" />
              <line x1={padding.left} y1={padding.top} x2={padding.left} y2={getY(0)} stroke="#cbd5e1" strokeWidth="2" />

              {/* Data Paths */}
              <path d={paths.pathChaining} fill="none" stroke="#2dd4bf" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm" />
              <path d={paths.pathQuadratic} fill="none" stroke="#c084fc" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm" />
              <path d={paths.pathLinear} fill="none" stroke="#fb7185" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm" />

              {/* Current Alpha Indicator */}
              <g transform={`translate(${getX(alpha)}, 0)`}>
                <line 
                  x1="0" y1={padding.top} 
                  x2="0" y2={getY(0)} 
                  stroke="#6366f1" 
                  strokeWidth="2" 
                  strokeDasharray="6 4" 
                />
                <rect x="-24" y={padding.top - 10} width="48" height="24" rx="12" fill="#6366f1" />
                <text x="0" y={padding.top + 6} textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">
                  {alpha.toFixed(2)}
                </text>

                {/* Points on lines */}
                <circle cx="0" cy={getY(stats.chaining.unsuccessful)} r="6" fill="#2dd4bf" stroke="white" strokeWidth="2" />
                <circle cx="0" cy={getY(stats.quadratic.unsuccessful)} r="6" fill="#c084fc" stroke="white" strokeWidth="2" />
                <circle cx="0" cy={getY(stats.linear.unsuccessful)} r="6" fill="#fb7185" stroke="white" strokeWidth="2" />
              </g>
            </svg>
          </div>
          
          <div className="mt-6 bg-indigo-50 text-indigo-800 p-4 rounded-xl text-sm font-medium border border-indigo-100 flex items-start gap-3">
            <span className="text-xl">💡</span>
            <p>
              Notice how <strong>Linear Probing</strong> hits a wall after α = 0.7? This is why most hash map implementations (like Java's HashMap or Python's dict) force a <strong>rehash</strong> (resizing the array) well before the load factor reaches 0.75!
            </p>
          </div>
        </section>

      </main>
    </div>
  );
}

// --- Subcomponents ---

function StatRow({ label, value, color }: { label: string, value: number, color: 'teal' | 'rose' | 'purple' }) {
  const isHigh = value > 10;
  const isExtreme = value > 50;
  
  const colorMap = {
    teal: 'bg-teal-100 text-teal-800',
    rose: 'bg-rose-100 text-rose-800',
    purple: 'bg-purple-100 text-purple-800',
  };

  const displayValue = isExtreme ? '50+' : value.toFixed(2);

  return (
    <div className="flex justify-between items-center bg-white/60 p-3 rounded-2xl border border-white shadow-sm">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        {isHigh && !isExtreme && <span className="text-xs font-bold text-orange-500 animate-pulse">High</span>}
        {isExtreme && <span className="text-xs font-bold text-rose-600 animate-pulse">Critical</span>}
        <span className={`font-black text-lg px-3 py-1 rounded-xl ${colorMap[color]} ${isExtreme ? 'bg-rose-500 text-white' : ''}`}>
          {displayValue}
        </span>
      </div>
    </div>
  );
}