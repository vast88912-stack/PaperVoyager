import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Domain & Math Constants ---
const DOMAIN = { minX: -10, maxX: 10, minY: -10, maxY: 10 };
const CANVAS_SIZE = 600;
const SCALE_X = CANVAS_SIZE / (DOMAIN.maxX - DOMAIN.minX);
const SCALE_Y = CANVAS_SIZE / (DOMAIN.maxY - DOMAIN.minY);

// Target function: Elongated Bowl
// f(x,y) = 0.5 * (x - 4)^2 + 2 * (y + 3)^2
// Global minimum at (4, -3) where f(x,y) = 0
const TARGET_X = 4;
const TARGET_Y = -3;

function computeLoss(x: number, y: number): number {
  return 0.5 * Math.pow(x - TARGET_X, 2) + 2 * Math.pow(y - TARGET_Y, 2);
}

function computeGradient(x: number, y: number): { dx: number; dy: number } {
  const dx = x - TARGET_X;          // derivative of 0.5*(x-4)^2
  const dy = 4 * (y - TARGET_Y);    // derivative of 2*(y+3)^2
  return { dx, dy };
}

// Map logical coordinates to SVG coordinates
function mapX(x: number) {
  return (x - DOMAIN.minX) * SCALE_X;
}

function mapY(y: number) {
  return (DOMAIN.maxY - y) * SCALE_Y; // Invert Y axis for screen
}

type OptimizerType = 'manual' | 'gd' | 'momentum' | 'adam';

interface Point {
  x: number;
  y: number;
}

export default function App() {
  // --- State ---
  const [pos, setPos] = useState<Point>({ x: -8, y: 8 });
  const [path, setPath] = useState<Point[]>([{ x: -8, y: 8 }]);
  const [isRevealed, setIsRevealed] = useState(false);
  const [optimizer, setOptimizer] = useState<OptimizerType>('gd');
  const [learningRate, setLearningRate] = useState<number>(0.1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [loss, setLoss] = useState<number>(computeLoss(-8, 8));

  // Optimizer internal state
  const optState = useRef({
    v_x: 0,
    v_y: 0,
    m_x: 0,
    m_y: 0,
    t: 0
  });

  const animationRef = useRef<number>();
  const simPosRef = useRef<Point>({ x: -8, y: 8 });

  // --- Core Optimizer Step Logic ---
  const takeStep = useCallback(() => {
    const currentPos = simPosRef.current;
    const { dx, dy } = computeGradient(currentPos.x, currentPos.y);
    let nextX = currentPos.x;
    let nextY = currentPos.y;

    const state = optState.current;

    if (optimizer === 'gd' || optimizer === 'manual') {
      nextX = currentPos.x - learningRate * dx;
      nextY = currentPos.y - learningRate * dy;
    } else if (optimizer === 'momentum') {
      const beta = 0.9;
      state.v_x = beta * state.v_x + (1 - beta) * dx;
      state.v_y = beta * state.v_y + (1 - beta) * dy;
      nextX = currentPos.x - learningRate * state.v_x;
      nextY = currentPos.y - learningRate * state.v_y;
    } else if (optimizer === 'adam') {
      const beta1 = 0.9;
      const beta2 = 0.999;
      const epsilon = 1e-8;
      state.t += 1;

      state.m_x = beta1 * state.m_x + (1 - beta1) * dx;
      state.m_y = beta1 * state.m_y + (1 - beta1) * dy;
      
      state.v_x = beta2 * state.v_x + (1 - beta2) * (dx * dx);
      state.v_y = beta2 * state.v_y + (1 - beta2) * (dy * dy);

      const m_hat_x = state.m_x / (1 - Math.pow(beta1, state.t));
      const m_hat_y = state.m_y / (1 - Math.pow(beta1, state.t));
      const v_hat_x = state.v_x / (1 - Math.pow(beta2, state.t));
      const v_hat_y = state.v_y / (1 - Math.pow(beta2, state.t));

      nextX = currentPos.x - learningRate * (m_hat_x / (Math.sqrt(v_hat_x) + epsilon));
      nextY = currentPos.y - learningRate * (m_hat_y / (Math.sqrt(v_hat_y) + epsilon));
    }

    // Update refs and state
    simPosRef.current = { x: nextX, y: nextY };
    
    setPos({ x: nextX, y: nextY });
    setPath((prev) => [...prev, { x: nextX, y: nextY }]);
    setLoss(computeLoss(nextX, nextY));

    return { x: nextX, y: nextY };
  }, [learningRate, optimizer]);

  // --- Animation Loop ---
  const loop = useCallback(() => {
    const newPos = takeStep();
    const currentLoss = computeLoss(newPos.x, newPos.y);
    
    if (currentLoss < 0.01 || simPosRef.current.x > 20 || simPosRef.current.x < -20) {
      setIsAnimating(false);
      return;
    }
    animationRef.current = requestAnimationFrame(loop);
  }, [takeStep]);

  useEffect(() => {
    if (isAnimating) {
      animationRef.current = requestAnimationFrame(loop);
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isAnimating, loop]);

  // --- Interactions ---
  const handleReset = () => {
    setIsAnimating(false);
    const start = { x: -8, y: 8 };
    setPos(start);
    setPath([start]);
    setLoss(computeLoss(start.x, start.y));
    simPosRef.current = start;
    optState.current = { v_x: 0, v_y: 0, m_x: 0, m_y: 0, t: 0 };
  };

  const currentGradient = computeGradient(pos.x, pos.y);
  const arrowScale = 15; // Visual scaling for the gradient arrow

  return (
    <div className="flex h-screen w-full bg-gray-900 text-gray-200 font-sans overflow-hidden">
      
      {/* Sidebar Controls */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col p-6 shadow-2xl z-10">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-teal-400 mb-2 leading-tight">
            Blindfold<br/>Challenge
          </h1>
          <p className="text-sm text-gray-400">
            Navigate the optimization landscape using <strong>only</strong> the gradient sensor. Tune your hyperparameters to avoid overshooting!
          </p>
        </div>

        {/* Telemetry Panel */}
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
          <h2 className="text-xs uppercase tracking-wider text-gray-500 mb-3 font-semibold">Sensor Telemetry</h2>
          <div className="flex justify-between items-end mb-3">
            <span className="text-sm text-gray-400">Loss</span>
            <span className={`text-xl font-mono ${loss < 0.1 ? 'text-green-400 font-bold' : 'text-teal-300'}`}>
              {loss.toFixed(4)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="block text-xs text-gray-500 mb-1">∇x (Horiz)</span>
              <span className="font-mono text-sm">{currentGradient.dx.toFixed(2)}</span>
            </div>
            <div>
              <span className="block text-xs text-gray-500 mb-1">∇y (Vert)</span>
              <span className="font-mono text-sm">{currentGradient.dy.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Hyperparameters */}
        <div className="mb-6 space-y-5">
          <div>
            <label className="flex justify-between text-sm mb-2 font-medium">
              <span>Learning Rate (α)</span>
              <span className="text-teal-400 font-mono">{learningRate.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0.01"
              max="1.0"
              step="0.01"
              value={learningRate}
              onChange={(e) => setLearningRate(parseFloat(e.target.value))}
              className="w-full accent-teal-500"
            />
            <p className="text-xs text-gray-500 mt-1">Hint: The vertical axis is steeper!</p>
          </div>

          <div>
            <label className="block text-sm mb-2 font-medium">Optimizer</label>
            <div className="grid grid-cols-2 gap-2">
              {(['manual', 'gd', 'momentum', 'adam'] as OptimizerType[]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setOptimizer(opt)}
                  className={`py-1.5 text-xs font-semibold rounded border transition-colors ${
                    optimizer === opt
                      ? 'bg-teal-500 text-gray-900 border-teal-500'
                      : 'bg-gray-800 text-gray-400 border-gray-600 hover:border-gray-400'
                  }`}
                >
                  {opt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!isAnimating) takeStep();
              }}
              disabled={isAnimating || loss < 0.01}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded font-medium disabled:opacity-50 transition-colors"
            >
              Step Manually
            </button>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              disabled={optimizer === 'manual' || loss < 0.01}
              className={`flex-1 py-2 rounded font-medium transition-colors ${
                isAnimating 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-teal-500 hover:bg-teal-400 text-gray-900'
              } disabled:opacity-50`}
            >
              {isAnimating ? 'Stop' : 'Auto Run'}
            </button>
          </div>
          
          <button
            onClick={() => setIsRevealed(!isRevealed)}
            className="w-full border border-teal-500/50 text-teal-400 hover:bg-teal-500/10 py-2 rounded font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isRevealed ? 'Hide Landscape' : 'Reveal Landscape'}
          </button>
          
          <button
            onClick={handleReset}
            className="w-full text-gray-500 hover:text-gray-300 text-sm py-2 underline decoration-gray-600 underline-offset-4"
          >
            Reset Environment
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative flex flex-col items-center justify-center bg-gray-950 p-8">
        
        {/* Top Status */}
        {loss < 0.01 && (
          <div className="absolute top-8 px-6 py-3 bg-teal-500 text-gray-900 rounded-full font-bold shadow-[0_0_20px_rgba(45,212,191,0.5)] animate-pulse z-20">
            Target Minimum Reached! Loss: {loss.toFixed(6)}
          </div>
        )}

        <div className="relative shadow-2xl rounded-xl overflow-hidden