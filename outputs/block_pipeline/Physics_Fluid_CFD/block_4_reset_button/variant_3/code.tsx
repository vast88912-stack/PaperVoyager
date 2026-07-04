import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- Fluid Dynamics Core (Jos Stam's Stable Fluids) ---
const N = 70; // Grid resolution (N x N inner cells)
const SIZE = (N + 2) * (N + 2);
const ITER = 5; // Solver iterations

const IX = (x: number, y: number) => x + (N + 2) * y;

const set_bnd = (b: number, x: Float32Array) => {
    for (let i = 1; i <= N; i++) {
        x[IX(0, i)] = b === 1 ? -x[IX(1, i)] : x[IX(1, i)];
        x[IX(N + 1, i)] = b === 1 ? -x[IX(N, i)] : x[IX(N, i)];
        x[IX(i, 0)] = b === 2 ? -x[IX(i, 1)] : x[IX(i, 1)];
        x[IX(i, N + 1)] = b === 2 ? -x[IX(i, N)] : x[IX(i, N)];
    }
    x[IX(0, 0)] = 0.5 * (x[IX(1, 0)] + x[IX(0, 1)]);
    x[IX(0, N + 1)] = 0.5 * (x[IX(1, N + 1)] + x[IX(0, N)]);
    x[IX(N + 1, 0)] = 0.5 * (x[IX(N, 0)] + x[IX(N + 1, 1)]);
    x[IX(N + 1, N + 1)] = 0.5 * (x[IX(N, N + 1)] + x[IX(N + 1, N)]);
};

const lin_solve = (b: number, x: Float32Array, x0: Float32Array, a: number, c: number) => {
    const cRecip = 1.0 / c;
    for (let k = 0; k < ITER; k++) {
        for (let j = 1; j <= N; j++) {
            for (let i = 1; i <= N; i++) {
                x[IX(i, j)] = (x0[IX(i, j)] + a * (x[IX(i - 1, j)] + x[IX(i + 1, j)] + x[IX(i, j - 1)] + x[IX(i, j + 1)])) * cRecip;
            }
        }
        set_bnd(b, x);
    }
};

const diffuse = (b: number, x: Float32Array, x0: Float32Array, diff: number, dt: number) => {
    const a = dt * diff * N * N;
    lin_solve(b, x, x0, a, 1 + 4 * a);
};

const advect = (b: number, d: Float32Array, d0: Float32Array, u: Float32Array, v: Float32Array, dt: number) => {
    let i0, j0, i1, j1;
    let x, y, s0, t0, s1, t1;
    const dt0 = dt * N;

    for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
            x = i - dt0 * u[IX(i, j)];
            y = j - dt0 * v[IX(i, j)];

            if (x < 0.5) x = 0.5;
            if (x > N + 0.5) x = N + 0.5;
            i0 = Math.floor(x);
            i1 = i0 + 1;

            if (y < 0.5) y = 0.5;
            if (y > N + 0.5) y = N + 0.5;
            j0 = Math.floor(y);
            j1 = j0 + 1;

            s1 = x - i0;
            s0 = 1.0 - s1;
            t1 = y - j0;
            t0 = 1.0 - t1;

            d[IX(i, j)] =
                s0 * (t0 * d0[IX(i0, j0)] + t1 * d0[IX(i0, j1)]) +
                s1 * (t0 * d0[IX(i1, j0)] + t1 * d0[IX(i1, j1)]);
        }
    }
    set_bnd(b, d);
};

const project = (u: Float32Array, v: Float32Array, p: Float32Array, div: Float32Array) => {
    const h = 1.0 / N;
    for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
            div[IX(i, j)] = -0.5 * h * (u[IX(i + 1, j)] - u[IX(i - 1, j)] + v[IX(i, j + 1)] - v[IX(i, j - 1)]);
            p[IX(i, j)] = 0;
        }
    }
    set_bnd(0, div);
    set_bnd(0, p);
    lin_solve(0, p, div, 1, 4);

    for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
            u[IX(i, j)] -= 0.5 * (p[IX(i + 1, j)] - p[IX(i - 1, j)]) / h;
            v[IX(i, j)] -= 0.5 * (p[IX(i, j + 1)] - p[IX(i, j - 1)]) / h;
        }
    }
    set_bnd(1, u);
    set_bnd(2, v);
};

class FluidManager {
    s = new Float32Array(SIZE);
    density = new Float32Array(SIZE);
    Vx = new Float32Array(SIZE);
    Vy = new Float32Array(SIZE);
    Vx0 = new Float32Array(SIZE);
    Vy0 = new Float32Array(SIZE);
    p = new Float32Array(SIZE);
    div = new Float32Array(SIZE);

    addSource(x: Float32Array, s: Float32Array, dt: number) {
        for (let i = 0; i < SIZE; i++) x[i] += s[i] * dt;
    }

    step(dt: number, diff: number, visc: number) {
        // Velocity step
        this.addSource(this.Vx, this.Vx0, dt);
        this.addSource(this.Vy, this.Vy0, dt);
        
        // Swap arrays
        let temp = this.Vx0; this.Vx0 = this.Vx; this.Vx = temp;
        temp = this.Vy0; this.Vy0 = this.Vy; this.Vy = temp;
        
        diffuse(1, this.Vx, this.Vx0, visc, dt);
        diffuse(2, this.Vy, this.Vy0, visc, dt);
        
        project(this.Vx, this.Vy, this.p, this.div);
        
        temp = this.Vx0; this.Vx0 = this.Vx; this.Vx = temp;
        temp = this.Vy0; this.Vy0 = this.Vy; this.Vy = temp;
        
        advect(1, this.Vx, this.Vx0, this.Vx0, this.Vy0, dt);
        advect(2, this.Vy, this.Vy0, this.Vx0, this.Vy0, dt);
        
        project(this.Vx, this.Vy, this.p, this.div);

        // Density step
        this.addSource(this.density, this.s, dt);
        
        temp = this.s; this.s = this.density; this.density = temp;
        
        diffuse(0, this.density, this.s, diff, dt);
        
        temp = this.s; this.s = this.density; this.density = temp;
        
        advect(0, this.density, this.s, this.Vx, this.Vy, dt);

        // Clear inputs
        for (let i = 0; i < SIZE; i++) {
            this.s[i] = 0;
            this.Vx0[i] = 0;
            this.Vy0[i] = 0;
        }
    }

    clear() {
        this.s.fill(0);
        this.density.fill(0);
        this.Vx.fill(0);
        this.Vy.fill(0);
        this.Vx0.fill(0);
        this.Vy0.fill(0);
        this.p.fill(0);
        this.div.fill(0);
    }
}

// --- UI Components ---

// High-Quality Reset Button (Variant 4)
function PurgeButton({ onPurge }: { onPurge: () => void }) {
    const [progress, setProgress] = useState(0);
    const [isHolding, setIsHolding] = useState(false);
    const requestRef = useRef<number>();
    const startTimeRef = useRef<number>(0);

    const animateFill = useCallback((time: number) => {
        if (!startTimeRef.current) startTimeRef.current = time;
        const elapsed = time - startTimeRef.current;
        const newProgress = Math.min((elapsed / 600) * 100, 100); 
        
        setProgress(newProgress);

        if (newProgress >= 100) {
            onPurge();
            setIsHolding(false);
            setProgress(0);
            startTimeRef.current = 0;
            // Create a small visual burst effect
            const btn = document.getElementById('purge-btn');
            if (btn) {
                btn.style.transform = 'scale(1.1)';
                setTimeout(() => { btn.style.transform = 'scale(1)' }, 150);
            }
        } else {
            requestRef.current = requestAnimationFrame(animateFill);
        }
    }, [onPurge]);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        setIsHolding(true);
        startTimeRef.current = 0;
        requestRef.current = requestAnimationFrame(animateFill);
    };

    const handlePointerUp = () => {
        setIsHolding(false);
        setProgress(0);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };

    useEffect(() => {
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    const isDanger = progress > 60;

    return (
        <div className="mt-8 flex flex-col items-center">
            <label className="text-xs uppercase tracking-widest text-slate-500 mb-2 font-semibold">
                System Purge
            </label>
            <button
                id="purge-btn"
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className={`
                    relative w-full h-12 rounded-lg font-bold text-sm tracking-widest uppercase shadow-lg
                    overflow-hidden transition-all duration-100 border-2 select-none
                    ${isDanger ? 'border-red-500 text-white animate-pulse' : 'border-slate-700 text-slate-300 hover:border-slate-500'}
                `}
                style={{
                    transformOrigin: 'center center'
                }}
            >
                {/* Background Fill */}
                <div 
                    className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-500 opacity-80"
                    style={{ 
                        width: `${progress}%`,
                        transition: isHolding ? 'none' : 'width 0.3s ease-out'
                    }} 
                />
                
                {/* Button Text */}
                <span className="relative z-10 flex items-center justify-center w-full h-full pointer-events-none drop-shadow-md">
                    {progress > 0 && progress < 100 ? 'Hold to Purge...' : 'Purge Fluids'}
                </span>
                
                {/* Glitch Overlay effect when danger */}
                {isDanger && (
                    <div className="absolute inset-0 bg-white mix-blend-overlay opacity-20 animate-ping pointer-events-none" />
                )}
            </button>
        </div>
    );
}


// Main App
export default function App() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fluidRef = useRef<FluidManager>(new FluidManager());
    const [viscosity, setViscosity] = useState<number>(0.00001);
    const [diffusion, setDiffusion] = useState<number>(0.0001);
    const [timeStep, setTimeStep] = useState<number>(0.1);
    const [showPressure, setShowPressure] = useState<boolean>(false);
    const [fps, setFps] = useState<number>(0);
    const [preset, setPreset] = useState<string>('none');
    
    // Input state
    const isDrawing = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        let animationId: number;
        let lastTime = performance.now();
        let frameCount = 0;
        let lastFpsTime = performance.now();

        const render = () => {
            const now = performance.now();
            const elapsed = now - lastTime;
            
            // Limit to ~60fps maximum
            if (elapsed > 16) {
                lastTime = now - (elapsed % 16);
                const fluid = fluidRef.current;
                
                // Apply preset continuous forces
                if (preset === 'smoke') {
                    // Inject upward at bottom middle
                    const cx = Math.floor(N / 2);
                    const cy = N - 2;
                    fluid.s[IX(cx, cy)] += 500;
                    fluid.s[IX(cx+1, cy)] += 500;
                    fluid.Vy0[IX(cx, cy)] -= 150;
                    fluid.Vy0[IX(cx+1, cy)] -= 150;
                } else if (preset === 'vortex') {
                    // Swirling forces in center
                    const cx = Math.floor(N / 2);
                    const cy = Math.floor(N / 2);
                    fluid.s[IX(cx - 5, cy)] += 100;
                    fluid.s[IX(cx + 5, cy)] += 100;
                    fluid.Vy0[IX(cx - 5, cy)] += 50;
                    fluid.Vy0[IX(cx + 5, cy)] -= 50;
                    fluid.Vx0[IX(cx, cy - 5)] -= 50;
                    fluid.Vx0[IX(cx, cy + 5)] += 50;
                }

                // Step simulation
                fluid.step(timeStep, diffusion, viscosity);

                // Render to canvas
                const width = canvas.width;
                const height = canvas.height;
                const imgData = ctx.createImageData(width, height);
                const data = imgData.data;

                const cellW = width / N;
                const cellH = height / N;

                for (let j = 1; j <= N; j++) {
                    for (let i = 1; i <= N; i++) {
                        const d = fluid.density[IX(i, j)];
                        const p = showPressure ? fluid.p[IX(i, j)] : 0;
                        
                        // Vivid cyan/pink dye mapping based on density
                        let r = 0, g = 0, b = 0;
                        
                        if (showPressure) {
                            // Map pressure to red (positive) and blue (negative)
                            if (p > 0) r = Math.min(255, p * 50000);
                            else b = Math.min(255, -p * 50000);
                            
                            // Blend dye on top
                            g = Math.min(255, d * 255);
                        } else {
                            // Bright cyan to white
                            r = Math.min(255, d * 100);
                            g = Math.min(255, d * 200 + 50 * d);
                            b = Math.min(255, d * 255 + 100 * d);
                        }

                        // Fill cell in image data
                        const pxX = Math.floor((i - 1) * cellW);
                        const pxY = Math.floor((j - 1) * cellH);
                        const endX = Math.floor(i * cellW);
                        const endY = Math.floor(j * cellH);

                        for (let y = pxY; y < endY; y++) {
                            for (let x = pxX; x < endX; x++) {
                                const idx = (y * width + x) * 4;
                                data[idx] = r;
                                data[idx + 1] = g;
                                data[idx + 2] = b;
                                data[idx + 3] = 255;
                            }
                        }
                    }
                }
                ctx.putImageData(imgData, 0, 0);

                frameCount++;
                if (now - lastFpsTime >= 1000) {
                    setFps(frameCount);
                    frameCount = 0;
                    lastFpsTime = now;
                }
            }
            animationId = requestAnimationFrame(render);
        };

        animationId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animationId);
    }, [viscosity, diffusion, timeStep, showPressure, preset]);

    const handlePointerEvent = (e: React.PointerEvent<HTMLCanvasElement>, type: 'down' | 'move' | 'up') => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const i = Math.floor((x / canvas.width) * N) + 1;
        const j = Math.floor((y / canvas.height) * N) + 1;

        if (i < 1 || i > N || j < 1 || j > N) {
            isDrawing.current = false;
            return;
        }

        if (type === 'down') {
            isDrawing.current = true;
            lastMouse.current = { x, y };
        } else if (type === 'up') {
            isDrawing.current = false;
        } else if (type === 'move' && isDrawing.current) {
            const dx = x - lastMouse.current.x;
            const dy = y - lastMouse.current.y;
            
            const fluid = fluidRef.current;
            
            // Inject density and velocity in a small radius
            const radius = 2;
            for (let rj = -radius; rj <= radius; rj++) {
                for (let ri = -radius; ri <= radius; ri++) {
                    const ni = i + ri;
                    const nj = j + rj;
                    if (ni >= 1 && ni <= N && nj >= 1 && nj <= N) {
                        const dist = Math.sqrt(ri*ri + rj*rj);
                        if (dist <= radius) {
                            const force = (1 - dist/radius) * 10;
                            fluid.s[IX(ni, nj)] += force * 50;
                            fluid.Vx0[IX(ni, nj)] += dx * force;
                            fluid.Vy0[IX(ni, nj)] += dy * force;
                        }
                    }
                }
            }
            lastMouse.current = { x, y };
        }
    };

    return (
        <div className="flex h-screen w-full bg-slate-950 text-slate-200 overflow-hidden font-sans">
            {/* Sidebar */}
            <div className="w-80 border-r border-slate-800 bg-slate-900/50 p-6 flex flex-col gap-6 backdrop-blur-md shadow-2xl z-10">
                <div className="flex flex-col gap-1 border-b border-slate-800 pb-4">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                        2D Fluid Sandbox
                    </h1>
                    <div className="flex justify-between items-center text-xs font-mono text-slate-500">
                        <span>Grid: {N}x{N}</span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            {fps} FPS
                        </span>
                    </div>
                </div>

                <div className="flex flex-col gap-5 flex-grow">
                    {/* Controls */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-slate-300 flex justify-between">
                            Viscosity 
                            <span className="text-slate-500 font-mono text-xs">{viscosity.toExponential(1)}</span>
                        </label>
                        <input 
                            type="range" min="0" max="0.001" step="0.00001" 
                            value={viscosity} onChange={e => setViscosity(parseFloat(e.target.value))}
                            className="w-full accent-cyan-500"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-slate-300 flex justify-between">
                            Diffusion
                            <span className="text-slate-500 font-mono text-xs">{diffusion.toExponential(1)}</span>
                        </label>
                        <input 
                            type="range" min="0" max="0.005" step="0.0001" 
                            value={diffusion} onChange