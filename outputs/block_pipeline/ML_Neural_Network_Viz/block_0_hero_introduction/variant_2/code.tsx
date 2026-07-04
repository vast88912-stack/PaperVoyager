import React, { useEffect, useRef, useState } from 'react';

// --- Utility Classes for Canvas Animation ---
class Neuron {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  activation: number;
  targetActivation: number;

  constructor(width: number, height: number) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.vx = (Math.random() - 0.5) * 0.8;
    this.vy = (Math.random() - 0.5) * 0.8;
    this.radius = Math.random() * 2 + 1.5;
    this.activation = 0;
    this.targetActivation = 0;
  }

  update(width: number, height: number, mouseX: number, mouseY: number) {
    this.x += this.vx;
    this.y += this.vy;

    // Bounce off edges
    if (this.x < 0 || this.x > width) this.vx *= -1;
    if (this.y < 0 || this.y > height) this.vy *= -1;

    // Calculate distance to mouse for interactive activation
    const dx = mouseX - this.x;
    const dy = mouseY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 180) {
      // Glow stronger when close to mouse (simulating forward pass input)
      this.targetActivation = 1 - dist / 180;
    } else {
      // Random sporadic firing (simulating background noise/learning)
      if (Math.random() < 0.001) {
        this.targetActivation = 1;
      } else {
        this.targetActivation = 0;
      }
    }

    // Smooth activation transition
    this.activation += (this.targetActivation - this.activation) * 0.05;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + this.activation * 2, 0, Math.PI * 2);
    
    // Neon glow effect based on activation
    const r = Math.floor(0 + this.activation * 255); // Cyan to Magenta shift
    const g = Math.floor(243 - this.activation * 243);
    const b = 255;
    
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.4 + this.activation * 0.6})`;
    ctx.shadowBlur = 15 + this.activation * 20;
    ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 1)`;
    ctx.fill();
    ctx.shadowBlur = 0; // reset
  }
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [isHoveringCTA, setIsHoveringCTA] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let neurons: Neuron[] = [];
    const connectionDistance = 140;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Re-initialize neurons based on screen size
      const neuronCount = Math.floor((canvas.width * canvas.height) / 15000);
      neurons = Array.from({ length: neuronCount }, () => new Neuron(canvas.width, canvas.height));
    };

    window.addEventListener('resize', resize);
    resize();

    const render = () => {
      // Dark background with slight transparency for trails
      ctx.fillStyle = 'rgba(9, 9, 11, 0.3)'; // Tailwind slate-950
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.globalCompositeOperation = 'lighter';

      // Update and draw connections (synapses)
      for (let i = 0; i < neurons.length; i++) {
        for (let j = i + 1; j < neurons.length; j++) {
          const dx = neurons[i].x - neurons[j].x;
          const dy = neurons[i].y - neurons[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDistance) {
            ctx.beginPath();
            ctx.moveTo(neurons[i].x, neurons[i].y);
            ctx.lineTo(neurons[j].x, neurons[j].y);

            const opacity = 1 - dist / connectionDistance;
            const combinedActivation = (neurons[i].activation + neurons[j].activation) / 2;
            
            // Line color shifts from dim cyan to bright magenta based on activation
            const r = Math.floor(0 + combinedActivation * 255);
            const g = Math.floor(255 - combinedActivation * 255);
            const b = 255;

            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity * (0.2 + combinedActivation * 0.8)})`;
            ctx.lineWidth = 1 + combinedActivation * 2;
            ctx.stroke();
          }
        }
      }

      // Draw neurons (nodes)
      neurons.forEach(neuron => {
        neuron.update(canvas.width, canvas.height, mousePos.x, mousePos.y);
        neuron.draw(ctx);
      });

      ctx.globalCompositeOperation = 'source-over';
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
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
      ref={containerRef}
      className="relative min-h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-fuchsia-500/30"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Custom Styles for specific animations not in standard Tailwind */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(2deg); }
        }
        @keyframes float-fast {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        .animate-float-slow { animation: float-slow 6s ease-in-out infinite; }
        .animate-float-fast { animation: float-fast 4s ease-in-out infinite; }
        .text-glow { text-shadow: 0 0 20px rgba(217, 70, 239, 0.5), 0 0 40px rgba(6, 182, 212, 0.3); }
      `}} />

      {/* Interactive Background Canvas */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 z-0 pointer-events-none"
      />

      {/* Radial Gradient Overlays for depth */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_0%,#09090b_100%)] opacity-80 pointer-events-none" />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-950/20 via-transparent to-slate-950 pointer-events-none" />

      {/* Main Hero Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-20 mx-auto max-w-7xl">
        
        {/* Top Badge */}
        <div className="animate-float-slow mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 backdrop-blur-md">
          <span className="flex h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse"></span>
          <span className="text-xs font-semibold tracking-wider text-cyan-300 uppercase">ChatGPT Edition • Interactive ML Educator</span>
        </div>

        {/* Hero Title */}
        <div className="text-center max-w-4xl space-y-4">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-2 leading-tight text-glow">
            See the Pulse of <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-fuchsia-500">
              Neural Networks
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mt-6">
            Dive into the black box. Build a single hidden-layer MLP, toggle ablations, and visualize <strong className="text-slate-200">forward passes</strong> and <strong className="text-slate-200">backpropagation gradients</strong> flowing in real-time.
          </p>
        </div>

        {/* Feature Tags (Floating below text) */}
        <div className="flex flex-wrap justify-center gap-4 mt-10 text-sm font-medium text-slate-300">
          {['Architecture Editor', 'Live Gradients', 'Loss Curves', 'Node Ablation'].map((feature, idx) => (
            <div 
              key={feature}
              className="px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm shadow-xl flex items-center gap-2 hover:border-fuchsia-500/50 transition-colors cursor-default"
              style={{ animationDelay: `${idx * 0.2}s` }}
            >
              <svg className="w-4 h-4 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {feature}
            </div>
          ))}
        </div>

        {/* Call to Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 mt-14 items-center animate-float-fast">
          <button 
            onMouseEnter={() => setIsHoveringCTA(true)}
            onMouseLeave={() => setIsHoveringCTA(false)}
            className="group relative px-8 py-4 rounded-xl font-bold text-white transition-all duration-300 hover:scale-105"
          >
            <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-600 blur-md transition-opacity duration-300 ${isHoveringCTA ? 'opacity-100' : 'opacity-60'}`}></div>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-600"></div>
            <div className="relative flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Launch Neural Sandbox
            </div>
          </button>

          <button className="px-8 py-4 rounded-xl font-semibold text-slate-300 border border-slate-700 hover:bg-slate-800 hover:text-white transition-all duration-300 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            Explore Datasets
          </button>
        </div>

      </div>

      {/* Decorative Bottom Glow */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-fuchsia-900/20 to-transparent z-0 pointer-events-none" />
    </div>
  );
}