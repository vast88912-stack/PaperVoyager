import React, { useEffect, useRef } from 'react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    // Set canvas size
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', resize);
    resize();

    // Simulation state
    // We'll simulate a particle descending a 2D bowl function with momentum
    let x = width * 0.8;
    let y = height * 0.2;
    let vx = 0;
    let vy = 0;
    const trail: { x: number; y: number }[] = [];
    const maxTrail = 150;

    const centerX = width / 2;
    const centerY = height / 2;

    // Hyperparameters for the hero animation
    const lr = 0.02;
    const momentum = 0.92;

    const drawContours = () => {
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.05)'; // Faint teal
      ctx.lineWidth = 1;
      for (let r = 50; r < Math.max(width, height); r += 60) {
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, r, r * 0.6, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    const animate = () => {
      ctx.fillStyle = '#111827'; // gray-900 (charcoal)
      ctx.fillRect(0, 0, width, height);

      drawContours();

      // Calculate gradient (derivative of distance to center)
      // Scaled down to make the animation smooth
      const dx = (x - centerX) * 0.01;
      const dy = (y - centerY) * 0.01;

      // Update velocities (Momentum)
      vx = vx * momentum - lr * dx * 100;
      vy = vy * momentum - lr * dy * 100;

      // Update position
      x += vx;
      y += vy;

      // Add to trail
      trail.push({ x, y });
      if (trail.length > maxTrail) {
        trail.shift();
      }

      // Draw trail
      if (trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) {
          ctx.lineTo(trail[i].x, trail[i].y);
        }
        
        // Gradient for trail
        const gradient = ctx.createLinearGradient(
          trail[0].x, trail[0].y, 
          trail[trail.length - 1].x, trail[trail.length - 1].y
        );
        gradient.addColorStop(0, 'rgba(45, 212, 191, 0)');
        gradient.addColorStop(1, 'rgba(45, 212, 191, 0.8)');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }

      // Draw current point
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#2dd4bf'; // teal-400
      ctx.fill();
      
      // Glow effect
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#2dd4bf';
      ctx.fill();
      ctx.shadowBlur = 0; // reset

      // Reset animation if it settles
      if (Math.abs(vx) < 0.1 && Math.abs(vy) < 0.1 && Math.abs(x - centerX) < 5 && Math.abs(y - centerY) < 5) {
        setTimeout(() => {
          x = Math.random() * width;
          y = Math.random() * height * 0.3;
          vx = 0;
          vy = 0;
          trail.length = 0;
        }, 1000);
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-gray-900 overflow-hidden font-sans text-gray-100 flex items-center">
      {/* Background Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
        style={{ display: 'block' }}
      />

      {/* Overlay Gradient for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/80 to-transparent z-0" />

      {/* Hero Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-12 lg:px-24 w-full">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-sm font-medium mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            Interactive ML Visualization
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Master the Math of <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-200">
              Machine Learning
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl leading-relaxed">
            Step into the Gradient Descent Playground. Demystify the engines of neural networks by visualizing Vanilla GD, Momentum, and Adam optimizers on interactive 2D landscapes. No papers, just pure intuition.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-gray-900 bg-teal-400 rounded-lg overflow-hidden transition-all hover:bg-teal-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-gray-900">
              <span className="absolute w-0 h-0 transition-all duration-500 ease-out bg-white rounded-full group-hover:w-56 group-hover:h-56 opacity-10"></span>
              <span className="relative flex items-center gap-2">
                Enter Playground
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </span>
            </button>
            
            <button className="inline-flex items-center justify-center px-8 py-4 font-bold text-teal-400 border-2 border-teal-400/30 rounded-lg transition-all hover:bg-teal-400/10 hover:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-gray-900">
              Take the Blindfold Challenge
            </button>
          </div>

          {/* Feature Highlights */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-gray-800 pt-8">
            <div>
              <div className="text-teal-400 font-bold text-xl mb-1">3</div>
              <div className="text-gray-500 text-sm">Distinct 2D Functions (Bowl, Saddle, Rastrigin)</div>
            </div>
            <div>
              <div className="text-teal-400 font-bold text-xl mb-1">Real-time</div>
              <div className="text-gray-500 text-sm">Mathematical path rendering & animation</div>
            </div>
            <div>
              <div className="text-teal-400 font-bold text-xl mb-1">Compare</div>
              <div className="text-gray-500 text-sm">Side-by-side optimizer performance</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}