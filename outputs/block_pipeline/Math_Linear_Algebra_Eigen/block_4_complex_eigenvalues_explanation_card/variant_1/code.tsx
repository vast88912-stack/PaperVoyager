import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  const [matrix, setMatrix] = useState({ a: 0.9, b: -0.5, c: 0.5, d: 0.9 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Math calculations
  const trace = matrix.a + matrix.d;
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
  const discriminant = trace * trace - 4 * determinant;
  
  const isComplex = discriminant < 0;
  const realPart = trace / 2;
  const imagPart = isComplex ? Math.sqrt(-discriminant) / 2 : 0;
  
  // Polar form for complex eigenvalues
  const magnitude = Math.sqrt(realPart * realPart + imagPart * imagPart);
  const angleRad = Math.atan2(imagPart, realPart);
  const angleDeg = (angleRad * 180) / Math.PI;

  // Presets
  const presets = [
    { name: 'Spiral In (Stable)', m: { a: 0.95, b: -0.2, c: 0.2, d: 0.95 } },
    { name: 'Pure Rotation (Center)', m: { a: 0, b: -1, c: 1, d: 0 } },
    { name: 'Spiral Out (Unstable)', m: { a: 1.05, b: -0.3, c: 0.3, d: 1.05 } },
  ];

  const handleInputChange = (field: keyof typeof matrix, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setMatrix(prev => ({ ...prev, [field]: num }));
    }
  };

  // Canvas Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const cx = width / 2;
    const cy = height / 2;
    const scale = 40; // pixels per unit

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw Grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += scale) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
    }
    for (let i = 0; i < height; i += scale) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke();
    }

    // Draw Axes
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(width, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, height); ctx.stroke();

    // Draw Trajectories (Power Iteration)
    const drawTrajectory = (startX: number, startY: number, color: string) => {
      let x = startX;
      let y = startY;
      
      ctx.beginPath();
      ctx.moveTo(cx + x * scale, cy - y * scale);
      
      // Numeric stability guard: limit iterations and max value
      const MAX_ITER = 200;
      const MAX_VAL = 1e4;
      
      for (let i = 0; i < MAX_ITER; i++) {
        const nx = matrix.a * x + matrix.b * y;
        const ny = matrix.c * x + matrix.d * y;
        
        // Guard against Infinity/NaN
        if (Math.abs(nx) > MAX_VAL || Math.abs(ny) > MAX_VAL) break;
        
        ctx.lineTo(cx + nx * scale, cy - ny * scale);
        x = nx;
        y = ny;
      }
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw start point
      ctx.beginPath();
      ctx.arc(cx + startX * scale, cy - startY * scale, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    };

    // Draw a few sample trajectories
    drawTrajectory(2, 0, '#6366f1'); // Indigo
    drawTrajectory(-2, 0, '#ec4899'); // Pink
    drawTrajectory(0, 2, '#14b8a6'); // Teal
    drawTrajectory(0, -2, '#f59e0b'); // Amber

  }, [matrix]);

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 md:p-8 text-slate-800 font-sans"
      style={{
        backgroundColor: '#f8fafc',
        backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}
    >
      <div className="max-w-5xl w-full bg-white shadow-2xl rounded-3xl overflow-hidden flex flex-col lg:flex-row border border-slate-100">
        
        {/* Left Panel: Controls & Explanation */}
        <div className="w-full lg:w-5/12 p-6 md:p-8 bg-slate-50 flex flex-col gap-6 border-r border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Complex Eigenvalues</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              When a 2x2 matrix has complex eigenvalues, it applies a <strong>rotation</strong> and a <strong>scaling</strong> to the vector space, rather than just stretching along fixed axes.
            </p>
          </div>

          {/* Matrix Editor */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Matrix Editor</h2>
            <div className="grid grid-cols-2 gap-3 mb-4 max-w-[200px] mx-auto">
              {(['a', 'b', 'c', 'd'] as const).map((key) => (
                <input
                  key={key}
                  type="number"
                  step="0.1"
                  value={matrix[key]}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  className="w-full text-center bg-slate-50 border border-slate-200 rounded-lg py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              ))}
            </div>
            
            <div className="flex flex-wrap gap-2 justify-center">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => setMatrix(preset.m)}
                  className="text-[11px] font-medium px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Math Breakdown Card */}
          <div className="flex-1 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Eigenvalue Analysis</h2>
            
            {isComplex ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                  <span className="text-sm font-medium text-slate-600">λ₁,₂</span>
                  <span className="font-mono text-indigo-700 font-semibold">
                    {realPart.toFixed(3)} ± {imagPart.toFixed(3)}i
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Magnitude (Scale)</div>
                    <div className="font-mono text-lg text-slate-700">{magnitude.toFixed(3)}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Angle (Rotation)</div>
                    <div className="font-mono text-lg text-slate-700">{angleDeg.toFixed(1)}°</div>
                  </div>
                </div>

                <div className="text-sm text-slate-600 mt-2 bg-slate-50 p-3 rounded-lg">
                  <strong>Stability: </strong> 
                  {magnitude < 0.999 ? (
                    <span className="text-emerald-600">Stable (Spirals Inward).</span>
                  ) : magnitude > 1.001 ? (
                    <span className="text-rose-600">Unstable (Spirals Outward).</span>
                  ) : (
                    <span className="text-blue-600">Neutrally Stable (Circular).</span>
                  )}
                  <br/>
                  <span className="text-xs text-slate-500 mt-1 block">
                    Because magnitude |λ| {magnitude < 0.999 ? '<' : magnitude > 1.001 ? '>' : '='} 1.
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center p-6 bg-rose-50/50 border border-rose-100 rounded-xl">
                <p className="text-rose-600 font-medium mb-1">Real Eigenvalues</p>
                <p className="text-xs text-rose-500/80">
                  Adjust the matrix to create a rotation (e.g., make b and c have opposite signs) to see complex eigenvalues.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Visualization */}
        <div className="w-full lg:w-7/12 relative bg-white min-h-[400px] lg:min-h-[600px] p-4 flex flex-col">
          <div className="absolute top-6 left-6 z-10">
            <h3 className="text-sm font-bold text-slate-800 bg-white/80 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm border border-slate-100">
              Vector Field Trajectory
            </h3>
          </div>
          
          <div className="flex-1 w-full h-full relative rounded-2xl overflow-hidden border border-slate-100 bg-slate-50/50">
            <canvas 
              ref={canvasRef} 
              className="absolute inset-0 w-full h-full cursor-crosshair"
              style={{ touchAction: 'none' }}
            />
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-xs text-slate-400 font-medium">
              Repeatedly applying the matrix to starting points traces out these paths.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}