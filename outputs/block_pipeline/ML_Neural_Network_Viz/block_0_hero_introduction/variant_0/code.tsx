import React, { useEffect, useRef, useState } from 'react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      baseColor: string;
      glowColor: string;
      activation: number;
      layer: number;

      constructor(x: number, y: number, layer: number) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 2 + 2;
        this.layer = layer; // 0: input, 1: hidden, 2: output
        
        const colors = [
          { base: '#0891b2', glow: '#22d3ee' }, // Cyan
          { base: '#c026d3', glow: '#f0abfc' }, // Fuchsia
          { base: '#16a34a', glow: '#4ade80' }  // Green
        ];
        
        const colorSet = colors[this.layer % colors.length];
        this.baseColor = colorSet.base;
        this.glowColor = colorSet.glow;
        this.activation = Math.random();
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvas!.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas!.height) this.vy *= -1;

        // Randomly pulse activation
        if (Math.random() < 0.01) {
          this.activation = 1.0;
        } else {
          this.activation = Math.max(0.1, this.activation - 0.02);
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        if (this.activation > 0.5) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = this.glowColor;
          ctx.fillStyle = '#ffffff';
        } else {
          ctx.shadowBlur = 0;
          ctx.fillStyle = this.baseColor;
        }
        
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
      }
    }

    const initParticles = () => {
      particles = [];
      const numParticles = Math.floor((window.innerWidth * window.innerHeight) / 15000);
      
      for (let i = 0; i < numParticles; i++) {
        // Assign rough layers based on X position to simulate a network
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        let layer = 1;
        if (x < canvas.width * 0.33) layer = 0;
        else if (x > canvas.width * 0.66) layer = 2;
        
        particles.push(new Particle(x, y, layer));
      }
    };

    const drawLines = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            // Only connect adjacent layers or same layer occasionally
            const layerDiff = Math.abs(particles[i].layer - particles[j].layer);
            if (layerDiff > 1) continue;

            const opacity = 1 - distance / 150;
            const combinedActivation = (particles[i].activation + particles[j].activation) / 2;
            
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            
            if (combinedActivation > 0.6) {
              ctx.strokeStyle = `rgba(34, 211, 238, ${opacity * combinedActivation})`; // Glowing cyan line
              ctx.lineWidth = 1.5;
            } else {
              ctx.strokeStyle = `rgba(71, 85, 105, ${opacity * 0.3})`; // Dim slate line
              ctx.lineWidth = 0.5;
            }
            
            ctx.stroke();
          }
        }

        // Mouse interaction
        const dxMouse = particles[i].x - mousePos.x;
        const dyMouse = particles[i].y - mousePos.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        
        if (distMouse < 200) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(mousePos.x, mousePos.y);
          ctx.strokeStyle = `rgba(240, 171, 252, ${1 - distMouse / 200})`; // Fuchsia interaction
          ctx.lineWidth = 1;
          ctx.stroke();
          particles[i].activation = 1; // Activate on hover
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw background gradient
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width
      );
      gradient.addColorStop(0, '#020617'); // slate-950
      gradient.addColorStop(1, '#000000');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawLines();
      
      particles.forEach(particle => {
        particle.update();
        particle.draw(ctx);
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mousePos]);

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: -1000, y: -1000 });
  };

  return (
    <div 
      className="relative min-h-screen w-full overflow-hidden bg-slate-950 flex items-center justify-center font-sans selection:bg-cyan-500/30"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Canvas Background */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 z-0 pointer-events-none"
      />

      {/* Hero Content Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center max-w-5xl mx-auto">
        
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/80 border border-cyan-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.15)]">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
          </span>
          <span className="text-xs font-medium tracking-wider text-cyan-300 uppercase">
            ChatGPT Edition
          </span>
        </div>

        {/* Main Headline */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 drop-shadow-lg">
          Demystify the <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-green-400 animate-gradient-x">
            Black Box
          </span>
        </h1>

        {/* Subheadline */}
        <p className="max-w-2xl text-lg md:text-xl text-slate-300 mb-10 leading-relaxed font-light">
          An interactive ML educator. Build a single hidden-layer MLP, visualize live forward passes, and watch backpropagation gradients flow in real-time. 
          <strong className="font-medium text-white"> No heavy libraries, just pure intuition.</strong>
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <button className="group relative px-8 py-4 bg-transparent overflow-hidden rounded-lg border border-cyan-500/50 hover:border-cyan-400 transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]">
            <div className="absolute inset-0 bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors duration-300"></div>
            <span className="relative text-cyan-300 font-semibold tracking-wide flex items-center justify-center gap-2">
              Launch Viewer
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
          
          <button className="px-8 py-4 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-300 font-medium hover:bg-slate-800 hover:text-white transition-all duration-300 backdrop-blur-sm">
            Explore Datasets
          </button>
        </div>

        {/* Feature Highlights (Bottom row) */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-4xl w-full border-t border-slate-800/50 pt-10">
          <div className="flex flex-col gap-2">
            <div className="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-white font-medium">Live Activations</h3>
            <p className="text-sm text-slate-400">Watch neurons glow as data flows through the network during the forward pass.</p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-10 w-10 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h3 className="text-white font-medium">Visual Backprop</h3>
            <p className="text-sm text-slate-400">Trace gradients backwards to see exactly how weights are updated to minimize loss.</p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h3 className="text-white font-medium">Interactive Ablation</h3>
            <p className="text-sm text-slate-400">Freeze or disable specific neurons to instantly see how the model's decision boundary shifts.</p>
          </div>
        </div>

      </div>

      {/* Custom CSS for gradient animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes gradient-x {
          0%, 100% {
            background-size: 200% 200%;
            background-position: left center;
          }
          50% {
            background-size: 200% 200%;
            background-position: right center;
          }
        }
        .animate-gradient-x {
          animation: gradient-x 4s ease infinite;
        }
      `}} />
    </div>
  );
}