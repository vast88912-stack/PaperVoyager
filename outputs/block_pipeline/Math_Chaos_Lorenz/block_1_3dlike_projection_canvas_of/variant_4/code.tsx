import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- Constants & Types ---
const DT = 0.008;
const MAX_HISTORY = 800;
const STEPS_PER_FRAME = 3;

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Params {
  s: number; // Sigma
  r: number; // Rho
  b: number; // Beta
}

interface Particle {
  pos: Point3D;
  history: Point3D[];
  color: number; // base hue
}

// --- Math Helpers ---
const rk4 = (p: Point3D, params: Params, dt: number): Point3D => {
  const { s, r, b } = params;
  const { x, y, z } = p;

  const dx = (x: number, y: number, z: number) => s * (y - x);
  const dy = (x: number, y: number, z: number) => x * (r - z) - y;
  const dz = (x: number, y: number, z: number) => x * y - b * z;

  const k1x = dx(x, y, z);
  const k1y = dy(x, y, z);
  const k1z = dz(x, y, z);

  const k2x = dx(x + (k1x * dt) / 2, y + (k1y * dt) / 2, z + (k1z * dt) / 2);
  const k2y = dy(x + (k1x * dt) / 2, y + (k1y * dt) / 2, z + (k1z * dt) / 2);
  const k2z = dz(x + (k1x * dt) / 2, y + (k1y * dt) / 2, z + (k1z * dt) / 2);

  const k3x = dx(x + (k2x * dt) / 2, y + (k2y * dt) / 2, z + (k2z * dt) / 2);
  const k3y = dy(x + (k2x * dt) / 2, y + (k2y * dt) / 2, z + (k2z * dt) / 2);
  const k3z = dz(x + (k2x * dt) / 2, y + (k2y * dt) / 2, z + (k2z * dt) / 2);

  const k4x = dx(x + k3x * dt, y + k3y * dt, z + k3z * dt);
  const k4y = dy(x + k3x * dt, y + k3y * dt, z + k3z * dt);
  const k4z = dz(x + k3x * dt, y + k3y * dt, z + k3z * dt);

  return {
    x: x + ((k1x + 2 * k2x + 2 * k3x + k4x) * dt) / 6,
    y: y + ((k1y + 2 * k2y + 2 * k3y + k4y) * dt) / 6,
    z: z + ((k1z + 2 * k2z + 2 * k3z + k4z) * dt) / 6,
  };
};

// Map 3D to 2D screen space
const project = (
  p: Point3D,
  theta: number,
  phi: number,
  width: number,
  height: number
) => {
  // Center the attractor roughly around origin
  const xc = p.x;
  const yc = p.y;
  const zc = p.z - 25; 

  // Rotate Y axis (theta)
  const x1 = xc * Math.cos(theta) - zc * Math.sin(theta);
  const z1 = xc * Math.sin(theta) + zc * Math.cos(theta);
  const y1 = yc;

  // Rotate X axis (phi)
  const y2 = y1 * Math.cos(phi) - z1 * Math.sin(phi);
  const z2 = y1 * Math.sin(phi) + z1 * Math.cos(phi);
  const x2 = x1;

  // Perspective projection
  const distance = 120;
  const zPlane = distance + z2;
  // Prevent division by zero or rendering behind camera
  if (zPlane <= 0.1) return null; 

  const fov = Math.min(width, height) * 0.9;
  const scale = fov / zPlane;

  return {
    u: width / 2 + x2 * scale,
    v: height / 2 + y2 * scale,
    zDepth: z2, // for z-sorting or coloring
  };
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // App State
  const [params, setParams] = useState<Params>({ s: 10, r: 28, b: 2.667 });
  const [chaosMode, setChaosMode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Interaction State
  const angleRef = useRef({ theta: 0.5, phi: 0.2 });
  const dragRef = useRef({ isDragging: false, lastX: 0, lastY: 0 });

  // Simulation State
  const particlesRef = useRef<Particle[]>([]);

  // Initialize Particles
  const resetParticles = useCallback(() => {
    if (chaosMode) {
      // 3 particles with tiny perturbation in X
      particlesRef.current = [
        { pos: { x: 1, y: 1, z: 1 }, history: [], color: 190 }, // Cyan
        { pos: { x: 1.001, y: 1, z: 1 }, history: [], color: 320 }, // Pink
        { pos: { x: 1.002, y: 1, z: 1 }, history: [], color: 50 }, // Yellow
      ];
    } else {
      // 1 single main particle
      particlesRef.current = [
        { pos: { x: 1, y: 1, z: 1 }, history: [], color: 210 }, // Blueish
      ];
    }
  }, [chaosMode]);

  // Initial setup & param changes
  useEffect(() => {
    // Parse URL params if any on mount
    const searchParams = new URLSearchParams(window.location.search);
    const s = parseFloat(searchParams.get('s') || '');
    const r = parseFloat(searchParams.get('r') || '');
    const b = parseFloat(searchParams.get('b') || '');
    const c = searchParams.get('c') === 'true';
    
    if (!isNaN(s) && !isNaN(r) && !isNaN(b)) {
      setParams({ s, r, b });
      if (c) setChaosMode(true);
    }
    
    resetParticles();
  }, [chaosMode, resetParticles]);

  // Main Render Loop
  const renderLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Update Simulation
    for (let step = 0; step < STEPS_PER_FRAME; step++) {
      particlesRef.current.forEach((particle) => {
        particle.history.push({ ...particle.pos });
        if (particle.history.length > MAX_HISTORY) {
          particle.history.shift();
        }
        particle.pos = rk4(particle.pos, params, DT);
      });
    }

    // Auto-rotate slowly if not dragging
    if (!dragRef.current.isDragging) {
      angleRef.current.theta += 0.002;
    }

    // Clear Canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw Axis/Bounding Box (Subtle)
    drawAxes(ctx, angleRef.current.theta, angleRef.current.phi, width, height);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'lighter';

    // Draw Trails
    particlesRef.current.forEach((particle) => {
      const hist = particle.history;
      if (hist.length < 2) return;

      // Project all points
      const projPoints = hist.map((p) =>
        project(p, angleRef.current.theta, angleRef.current.phi, width, height)
      );

      for (let i = 1; i < projPoints.length; i++) {
        const p1 = projPoints[i - 1];
        const p2 = projPoints[i];

        if (!p1 || !p2) continue;

        const ageRatio = i / projPoints.length; // 0 (old) to 1 (new)
        
        ctx.beginPath();
        ctx.moveTo(p1.u, p1.v);
        ctx.lineTo(p2.u, p2.v);

        // Calculate visual properties
        // Base thickness on age, fade out old points
        ctx.lineWidth = 1 + ageRatio * 2.5;
        
        // Dynamic hue based on Z-depth or velocity, plus base color
        const zShift = (p2.zDepth || 0) * 1.5;
        const hue = (particle.color + zShift) % 360;
        
        // Opacity drops sharply for older points
        const alpha = Math.pow(ageRatio, 2); 

        ctx.strokeStyle = `hsla(${hue}, 90%, 65%, ${alpha})`;
        ctx.stroke();
      }

      // Draw "head" glow
      const head = projPoints[projPoints.length - 1];
      if (head) {
        ctx.beginPath();
        ctx.arc(head.u, head.v, 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${particle.color}, 100%, 80%)`;
        ctx.shadowBlur = 15;
        ctx.shadowColor = `hsl(${particle.color}, 100%, 60%)`;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }
    });

    ctx.globalCompositeOperation = 'source-over';

    requestRef.current = requestAnimationFrame(renderLoop);
  }, [params]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [renderLoop]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse/Touch Interaction Handlers
  const handleDown = (e: React.MouseEvent | React.TouchEvent) => {
    dragRef.current.isDragging = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragRef.current.lastX = clientX;
    dragRef.current.lastY = clientY;
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragRef.current.isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const dx = clientX - dragRef.current.lastX;
    const dy = clientY - dragRef.current.lastY;

    angleRef.current.theta += dx * 0.005;
    angleRef.current.phi += dy * 0.005;

    // Clamp Phi to avoid flipping upside down completely
    angleRef.current.phi = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, angleRef.current.phi));

    dragRef.current.lastX = clientX;
    dragRef.current.lastY = clientY;
  };

  const handleUp = () => {
    dragRef.current.isDragging = false;
  };

  // Export URL
  const handleShare = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('s', params.s.toString());
    url.searchParams.set('r', params.r.toString());
    url.searchParams.set('b', params.b.toFixed(3));
    url.searchParams.set('c', chaosMode.toString());
    
    window.history.replaceState({}, '', url.toString());
    navigator.clipboard.writeText(url.toString());
    
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden font-sans text-slate-200 select-none">
      
      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onMouseDown={handleDown}
        onMouseMove={handleMove}
        onMouseUp={handleUp}
        onMouseLeave={handleUp}
        onTouchStart={handleDown}
        onTouchMove={handleMove}
        onTouchEnd={handleUp}
      />

      {/* Vignette Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.8)_100%)]" />

      {/* UI Top Left - Title */}
      <div className="absolute top-6 left-6 pointer-events-none">
        <h1 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">
          Lorenz Attractor
        </h1>
        <p className="text-slate-400 text-sm font-medium mt-1 tracking-wide">
          3D-Like Projection Canvas
        </p>
        <p className="text-slate-600 text-xs mt-2 italic flex items-center gap-2">
          <svg className="w-4 h-4 animate-pulse"