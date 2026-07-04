import React, { useState, useMemo, useEffect } from 'react';

export default function App() {
  const [lr, setLr] = useState<number>(0.1);
  const [animatedLr, setAnimatedLr] = useState<number>(lr);

  // Smoothly animate the LR for the visualization when preset buttons are clicked
  useEffect(() => {
    let animationFrame: number;
    const animate = () => {
      setAnimatedLr((prev) => {
        const diff = lr - prev;
        if (Math.abs(diff) < 0.001) return lr;
        return prev + diff * 0.15;
      });
      animationFrame = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, [lr]);

  // Math for 1D visualization: f(x) = x^2, f'(x) = 2x
  const startX = 4;
  const nextX = startX - animatedLr * (2 * startX);
  
  const getStatus = (currentLr: number) => {
    if (currentLr === 0) return { text: "Stuck. No learning.", color: "text-gray-400" };
    if (currentLr > 0 && currentLr < 0.1) return { text: "Learning too slowly...", color: "text-teal-600" };
    if (currentLr >= 0.1 && currentLr < 0.45) return { text: "Converging smoothly", color: "text-teal-400" };
    if (currentLr >= 0.45 && currentLr <= 0.55) return { text: "Optimal step!", color: "text-green-400" };
    if (currentLr > 0.55 && currentLr < 1) return { text: "Overshooting (Oscillating)", color: "text-yellow-400" };
    if (currentLr === 1) return { text: "Trapped in perfect oscillation", color: "text-orange-400" };
    return { text: "Diverging! Loss explosion 💥", color: "text-red-500" };
  };

  const status = getStatus(lr);

  // SVG Coordinate mapping
  const width = 600;
  const height = 240;
  const mapX = (x: number) => width / 2 + x * 50;
  const mapY = (y: number) => height - 30 - y * 10;

  // Generate parabola path f(x) = x^2
  const pathData = useMemo(() => {
    let d = "";
    for (let x = -6; x <= 6; x += 0.2) {
      const px = mapX(x);
      const py = mapY(x * x);
      if (x === -6) d += `M ${px} ${py} `;
      else d += `L ${px} ${py} `;
    }
    return d;
  }, []);

  const presets = [
    { label: "Tiny", value: 0.02 },
    { label: "Good", value: 0.15 },
    { label: "Perfect", value: 0.5 },
    { label: "High", value: 0.85 },
    { label: "Diverge", value: 1.1 },
  ];

  return (
    <div className="min-h-screen bg-[#0f1115] text-gray-200 flex flex-col items-center justify-center p-6 font-sans">
      
      <div className="max-w-3xl w-full bg-[#161b22] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#1a2028]">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <span className="text-teal-400 text-3xl">η</span> Learning Rate Control
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Adjust the step size to see how it affects a single gradient descent step on <code className="text-teal-300 bg-teal-900/30 px-1 rounded">f(x) = x²</code>
            </p>
          </div>
          <div className={`text-right font-mono text-xl font-semibold bg-gray-900 px-4 py-2 rounded-lg border border-gray-700 shadow-inner min-w-[100px] text-center ${status.color}`}>
            {lr.toFixed(3)}
          </div>
        </div>

        {/* Visualization Area */}
        <div className="w-full relative bg-[#0d1014] overflow-hidden flex justify-center py-8">
          {/* Grid Background */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
               style={{ backgroundImage: 'linear-gradient(#2dd4bf 1px, transparent 1px), linear-gradient(90deg, #2dd4bf 1px, transparent 1px)', backgroundSize: '40px 40px', backgroundPosition: 'center' }}>
          </div>

          <svg width={width} height={height} className="overflow-visible drop-shadow-lg">
            {/* Axis */}
            <line x1="0" y1={mapY(0)} x2={width} y2={mapY(0)} stroke="#333" strokeWidth="2" strokeDasharray="4 4" />
            <line x1={mapX(0)} y1="0" x2={mapX(0)} y2={height} stroke="#333" strokeWidth="2" strokeDasharray="4 4" />

            {/* Parabola */}
            <path d={pathData} fill="none" stroke="#2dd4bf" strokeWidth="3" opacity="0.4" />

            {/* Arrow connecting start to next */}
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill={lr > 1 ? "#ef4444" : "#2dd4bf"} />
              </marker>
            </defs>

            {/* Step visualization */}
            {animatedLr > 0 && (
              <path 
                d={`M ${mapX(startX)} ${mapY(startX * startX)} Q ${mapX((startX + nextX) / 2)} ${mapY(Math.max(startX * startX, nextX * nextX) + 5)} ${mapX(nextX)} ${mapY(nextX * nextX)}`}
                fill="none" 
                stroke={animatedLr > 1 ? "#ef4444" : "#2dd4bf"} 
                strokeWidth="2" 
                strokeDasharray="5 5"
                markerEnd="url(#arrowhead)"
                className="transition-all duration-75"
              />
            )}

            {/* Start Point */}
            <circle cx={mapX(startX)} cy={mapY(startX * startX)} r="6" fill="#14b8a6" className="shadow-teal-500/50" />
            <text x={mapX(startX) + 12} y={mapY(startX * startX) - 10} fill="#9ca3af" fontSize="12" fontWeight="bold">Start</text>

            {/* Next Point */}
            <circle 
              cx={mapX(nextX)} 
              cy={mapY(nextX * nextX)} 
              r="7" 
              fill={animatedLr > 1 ? "#ef4444" : "#2dd4bf"} 
              stroke="#0f1115"
              strokeWidth="2"
            />
            <text x={mapX(nextX) - 15} y={mapY(nextX * nextX) - 15} fill={animatedLr > 1 ? "#ef4444" : "#2dd4bf"} fontSize="14" fontWeight="bold" textAnchor="middle">
              Step 1
            </text>
          </svg>
        </div>

        {/* Controls Area */}
        <div className="p-8 bg-[#161b22] flex flex-col gap-6">
          
          <div className="flex justify-between items-end">
            <label className="text-gray-300 font-medium tracking-wide text-sm uppercase">Adjust Learning Rate</label>
            <span className={`text-sm font-semibold animate-pulse ${status.color}`}>
              {status.text}
            </span>
          </div>

          <div className="relative w-full flex items-center">
            <input 
              type="range" 
              min="0" 
              max="1.2" 
              step="0.005" 
              value={lr}
              onChange={(e) => setLr(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-teal-500 hover:accent-teal-400 transition-all z-10"
              style={{
                background: `linear-gradient(to right, #14b8a6 ${(lr / 1.2) * 100}%, #1f2937 ${(lr / 1.2) * 100}%)`
              }}
            />
            {/* Markers on the track */}
            <div className="absolute w-full flex justify-between px-1 pointer-events-none top-4 text-xs text-gray-500">
              <span>0.0</span>
              <span className="relative -left-2 text-green-700/50">| 0.5</span>
              <span className="relative -left-2 text-red-700/50">| 1.0</span>
              <span>1.2</span>
            </div>
          </div>

          <div className="flex gap-3 mt-4 flex-wrap">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => setLr(p.value)}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 border 
                  ${lr === p.value 
                    ? 'bg-teal-500/10 border-teal-500 text-teal-400 shadow-[0_0_10px_rgba(20,184,166,0.2)]' 
                    : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-gray-200 hover:border-gray-500'}`}
              >
                {p.label}
              </button>
            ))}
          </div>

        </div>

        {/* Info Footer */}
        <div className="bg-gray-900/50 p-4 border-t border-gray-800 text-xs text-gray-500 flex justify-between">
          <p>Formula: <span className="font-mono text-gray-400">x_new = x_old - η * ∇f(x_old)</span></p>
          <p>Gradient at Start: <span className="font-mono text-gray-400">∇f(4) = 8</span></p>
        </div>
      </div>
    </div>
  );
}