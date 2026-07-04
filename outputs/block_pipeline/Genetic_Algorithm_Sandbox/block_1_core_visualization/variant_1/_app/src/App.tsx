import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// --- Icons ---
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>;
const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>;
const StepForwardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>;
const RotateCcwIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 9 9 3 15 9"></polyline><path d="M21 21v-4a8 8 0 0 0-14-5"></path></svg>;
const CodeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>;
const ActivityIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;

// --- Constants & Types ---
type ProblemType = 'TSP' | 'FunctionMax' | 'Knapsack';

interface GAState {
  population: any[];
  generation: number;
  bestFitness: number;
  bestIndividual: any;
  fitnessHistory: number[];
  diversity: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;

// --- Helper Functions ---

// Math & Random Utils
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min) + min);
const randFloat = (min: number, max: number) => Math.random() * (max - min) + min;
const shuffle = (array: any[]) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// --- Problem Definitions ---

// 1. TSP (Traveling Salesman Problem)
const NUM_CITIES = 25;
const generateCities = () => Array.from({ length: NUM_CITIES }, () => ({
  x: randFloat(50, CANVAS_WIDTH - 50),
  y: randFloat(50, CANVAS_HEIGHT - 50)
}));

const fitnessTSP = (ind: number[], cities: {x:number, y:number}[]) => {
  let dist = 0;
  for (let i = 0; i < ind.length; i++) {
    const c1 = cities[ind[i]];
    const c2 = cities[ind[(i + 1) % ind.length]];
    dist += Math.hypot(c1.x - c2.x, c1.y - c2.y);
  }
  return 10000 / dist; // Higher is better
};

const crossoverTSP = (p1: number[], p2: number[]) => {
  const start = randInt(0, p1.length);
  const end = randInt(0, p1.length);
  const [min, max] = [Math.min(start, end), Math.max(start, end)];
  const child = new Array(p1.length).fill(-1);
  for (let i = min; i <= max; i++) child[i] = p1[i];
  let p2Idx = 0;
  for (let i = 0; i < p1.length; i++) {
    if (child[i] === -1) {
      while (child.includes(p2[p2Idx])) p2Idx++;
      child[i] = p2[p2Idx];
    }
  }
  return child;
};

const mutateTSP = (ind: number[], rate: number) => {
  const mut = [...ind];
  for (let i = 0; i < mut.length; i++) {
    if (Math.random() < rate) {
      const j = randInt(0, mut.length);
      [mut[i], mut[j]] = [mut[j], mut[i]];
    }
  }
  return mut;
};

// 2. Function Maximization (2D Alpine/Ackley-like surface)
const fitnessFuncMax = (ind: number[]) => {
  const [x, y] = ind;
  // Complex landscape with a global maximum near center
  const cx = CANVAS_WIDTH / 2;
  const cy = CANVAS_HEIGHT / 2;
  const dist = Math.hypot(x - cx, y - cy);
  const wave = Math.sin(x / 20) * Math.cos(y / 20) * 50;
  return Math.max(0, 1000 - dist + wave);
};

const crossoverFuncMax = (p1: number[], p2: number[]) => {
  const alpha = Math.random();
  return [
    p1[0] * alpha + p2[0] * (1 - alpha),
    p1[1] * alpha + p2[1] * (1 - alpha)
  ];
};

const mutateFuncMax = (ind: number[], rate: number) => {
  return [
    Math.max(0, Math.min(CANVAS_WIDTH, ind[0] + (Math.random() < rate ? randFloat(-50, 50) : 0))),
    Math.max(0, Math.min(CANVAS_HEIGHT, ind[1] + (Math.random() < rate ? randFloat(-50, 50) : 0)))
  ];
};

// 3. Knapsack
const NUM_ITEMS = 40;
const MAX_WEIGHT = 200;
const generateItems = () => Array.from({ length: NUM_ITEMS }, () => ({
  weight: randFloat(5, 25),
  value: randFloat(10, 100)
}));

const fitnessKnapsack = (ind: number[], items: {weight:number, value:number}[]) => {
  let w = 0;
  let v = 0;
  for (let i = 0; i < ind.length; i++) {
    if (ind[i] === 1) {
      w += items[i].weight;
      v += items[i].value;
    }
  }
  return w > MAX_WEIGHT ? 0 : v;
};

const crossoverKnapsack = (p1: number[], p2: number[]) => {
  return p1.map((bit, i) => Math.random() < 0.5 ? bit : p2[i]);
};

const mutateKnapsack = (ind: number[], rate: number) => {
  return ind.map(bit => Math.random() < rate ? 1 - bit : bit);
};

// --- Main Component ---
export default function App() {
  // UI State
  const [problem, setProblem] = useState<ProblemType>('TSP');
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'crossover' | 'mutation'>('crossover');
  
  // GA Parameters
  const [popSize, setPopSize] = useState(100);
  const [mutRate, setMutRate] = useState(0.05);
  const [elitism, setElitism] = useState(2);
  const [maxGens, setMaxGens] = useState(500);

  // Problem Context (Cities, Items)
  const [context, setContext] = useState<any>(null);

  // GA State
  const [gaState, setGaState] = useState<GAState>({
    population: [],
    generation: 0,
    bestFitness: 0,
    bestIndividual: null,
    fitnessHistory: [],
    diversity: 0
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();

  // Initialize Simulation
  const initSimulation = useCallback(() => {
    let initialPop: any[] = [];
    let newContext = null;

    if (problem === 'TSP') {
      newContext = generateCities();
      const baseInd = Array.from({ length: NUM_CITIES }, (_, i) => i);
      initialPop = Array.from({ length: popSize }, () => shuffle(baseInd));
    } else if (problem === 'FunctionMax') {
      initialPop = Array.from({ length: popSize }, () => [randFloat(0, CANVAS_WIDTH), randFloat(0, CANVAS_HEIGHT)]);
    } else if (problem === 'Knapsack') {
      newContext = generateItems();
      initialPop = Array.from({ length: popSize }, () => Array.from({ length: NUM_ITEMS }, () => Math.random() < 0.2 ? 1 : 0));
    }

    setContext(newContext);
    setGaState({
      population: initialPop,
      generation: 0,
      bestFitness: 0,
      bestIndividual: null,
      fitnessHistory: [],
      diversity: 100
    });
    setIsRunning(false);
  }, [problem, popSize]);

  // Initial load & problem change
  useEffect(() => {
    initSimulation();
  }, [initSimulation]);

  // Evolution Step
  const evolve = useCallback(() => {
    setGaState(prev => {
      if (prev.generation >= maxGens) {
        setIsRunning(false);
        return prev;
      }

      const { population, fitnessHistory } = prev;
      
      // 1. Evaluate Fitness
      let fitnesses: number[] = [];
      if (problem === 'TSP') fitnesses = population.map(ind => fitnessTSP(ind, context));
      else if (problem === 'FunctionMax') fitnesses = population.map(ind => fitnessFuncMax(ind));
      else if (problem === 'Knapsack') fitnesses = population.map(ind => fitnessKnapsack(ind, context));

      // Find Best
      let maxFit = -Infinity;
      let bestInd = null;
      let totalFit = 0;
      
      const popWithFit = population.map((ind, i) => {
        const f = fitnesses[i];
        if (f > maxFit) { maxFit = f; bestInd = ind; }
        totalFit += f;
        return { ind, fit: f };
      });

      // Sort for Elitism
      popWithFit.sort((a, b) => b.fit - a.fit);
      
      // 2. Selection (Tournament)
      const select = () => {
        const tSize = 3;
        let best = popWithFit[randInt(0, popSize)];
        for(let i=1; i<tSize; i++) {
          const contender = popWithFit[randInt(0, popSize)];
          if (contender.fit > best.fit) best = contender;
        }
        return best.ind;
      };

      // 3. Crossover & Mutation
      const newPop: any[] = [];
      
      // Elitism
      for (let i = 0; i < elitism && i < popSize; i++) {
        newPop.push(popWithFit[i].ind);
      }

      while (newPop.length < popSize) {
        const p1 = select();
        const p2 = select();
        let child;

        if (problem === 'TSP') child = crossoverTSP(p1, p2);
        else if (problem === 'FunctionMax') child = crossoverFuncMax(p1, p2);
        else if (problem === 'Knapsack') child = crossoverKnapsack(p1, p2);

        if (problem === 'TSP') child = mutateTSP(child, mutRate);
        else if (problem === 'FunctionMax') child = mutateFuncMax(child, mutRate);
        else if (problem === 'Knapsack') child = mutateKnapsack(child, mutRate);

        newPop.push(child);
      }

      // Calculate simple diversity metric (unique fitnesses / popSize)
      const uniqueFits = new Set(fitnesses.map(f => Math.round(f * 100))).size;
      const diversity = (uniqueFits / popSize) * 100;

      return {
        population: newPop,
        generation: prev.generation + 1,
        bestFitness: maxFit,
        bestIndividual: bestInd,
        fitnessHistory: [...fitnessHistory, maxFit],
        diversity
      };
    });
  }, [problem, context, popSize, mutRate, elitism, maxGens]);

  // Animation Loop
  useEffect(() => {
    if (isRunning) {
      const loop = () => {
        evolve();
        requestRef.current = requestAnimationFrame(loop);
      };
      requestRef.current = requestAnimationFrame(loop);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isRunning, evolve]);

  // Canvas Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#020617'; // slate-950
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const { population, bestIndividual } = gaState;
    if (!population.length) return;

    if (problem === 'TSP' && context) {
      // Draw faint paths for population
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.05)'; // emerald-500 very faint
      ctx.lineWidth = 1;
      for (let i = 0; i < Math.min(20, population.length); i++) {
        const ind = population[i];
        ctx.beginPath();
        for (let j = 0; j < ind.length; j++) {
          const c = context[ind[j]];
          if (j === 0) ctx.moveTo(c.x, c.y);
          else ctx.lineTo(c.x, c.y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Draw best path
      if (bestIndividual) {
        ctx.strokeStyle = '#06b6d4'; // cyan-500
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let j = 0; j < bestIndividual.length; j++) {
          const c = context[bestIndividual[j]];
          if (j === 0) ctx.moveTo(c.x, c.y);
          else ctx.lineTo(c.x, c.y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Draw cities
      ctx.fillStyle = '#f8fafc'; // slate-50
      context.forEach((c: any) => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

    } else if (problem === 'FunctionMax') {
      // Draw background landscape (simplified concentric rings)
      const cx = CANVAS_WIDTH / 2;
      const cy = CANVAS_HEIGHT / 2;
      for(let r=400; r>0; r-=40) {
        ctx.fillStyle = `rgba(16, 185, 129, ${0.02 + (400-r)/4000})`;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw population
      ctx.fillStyle = 'rgba(6, 182, 212, 0.6)'; // cyan-500
      population.forEach(ind => {
        ctx.beginPath();
        ctx.arc(ind[0], ind[1], 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw best
      if (bestIndividual) {
        ctx.fillStyle = '#10b981'; // emerald-500
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(bestIndividual[0], bestIndividual[1], 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

    } else if (problem === 'Knapsack' && context) {
      // Draw Items Grid
      const cols = 8;
      const padding = 20;
      const w = (CANVAS_WIDTH - padding * 2) / cols;
      const h = 60;

      context.forEach((item: any, i: number) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = padding + col * w;
        const y = padding + row * h;
        
        const isSelected = bestIndividual ? bestIndividual[i] === 1 : false;
        
        ctx.fillStyle = isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(51, 65, 85, 0.3)';
        ctx.strokeStyle = isSelected ? '#10b981' : '#334155';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.roundRect(x + 5, y + 5, w - 10, h - 10, 8);
        ctx.fill();