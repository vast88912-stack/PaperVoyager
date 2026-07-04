import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Activity, Target, Settings2, BarChart3 } from 'lucide-react';

// --- Types & Interfaces ---
type Point = { x: number; y: number };
type DatasetType = 'blobs' | 'moons' | 'concentric';
type InitMethod = 'random' | 'kmeans++' | 'farthest';

// --- Constants & Colors ---
const CANDY_COLORS = [
  '#FF9AA2', // Pink
  '#FFB7B2', // Peach
  '#FFDAC1', // Orange/Light
  '#E2F0CB', // Lime Green
  '#B5EAD7', // Mint
  '#C7CEEA', // Periwinkle
  '#F1CBFF', // Lilac
  '#BFFFF0', // Cyan-ish
  '#FDFD96', // Pastel Yellow
  '#FFD1DC', // Pastel Pink
];

const UNASSIGNED_COLOR = '#E2E8F0'; // Slate 200

// --- Math & Distance Helpers ---
const distSq = (p1: Point, p2: Point) => (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
const dist = (p1: Point, p2: Point) => Math.sqrt(distSq(p1, p2));

// Box-Muller transform for Gaussian noise
const randomGaussian = (mean = 0, stdev = 1) => {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
};

// --- Dataset Generators ---
const generatePoints = (type: DatasetType, numPoints: number = 250): Point[] => {
  const points: Point[] = [];
  if (type === 'blobs') {
    const centers = [
      { x: 0.25, y: 0.25 }, { x: 0.75, y: 0.25 },
      { x: 0.25, y: 0.75 }, { x: 0.75, y: 0.75 },
      { x: 0.5, y: 0.5 }
    ];
    for (let i = 0; i < numPoints; i++) {
      const center = centers[i % centers.length];
      points.push({
        x: Math.max(0.05, Math.min(0.95, randomGaussian(center.x, 0.08))),
        y: Math.max(0.05, Math.min(0.95, randomGaussian(center.y, 0.08)))
      });
    }
  } else if (type === 'moons') {
    for (let i = 0; i < numPoints; i++) {
      const isTop = i % 2 === 0;
      const t = Math.random() * Math.PI;
      if (isTop) {
        points.push({
          x: 0.2 + 0.3 * Math.cos(t) + randomGaussian(0, 0.03),
          y: 0.4 - 0.3 * Math.sin(t) + randomGaussian(0, 0.03)
        });
      } else {
        points.push({
          x: 0.5 + 0.3 * Math.cos(t) + randomGaussian(0, 0.03),
          y: 0.6 + 0.3 * Math.sin(t) + randomGaussian(0, 0.03)
        });
      }
    }
  } else if (type === 'concentric') {
    for (let i = 0; i < numPoints; i++) {
      const isInner = i % 3 === 0;
      const r = isInner ? 0.15 + randomGaussian(0, 0.02) : 0.4 + randomGaussian(0, 0.03);
      const theta = Math.random() * 2 * Math.PI;
      points.push({
        x: 0.5 + r * Math.cos(theta),
        y: 0.5 + r * Math.sin(theta)
      });
    }
  }
  return points;
};

// --- Main Application Component ---
export default function App() {
  // UI State
  const [k, setK] = useState<number>(3);
  const [dataset, setDataset] = useState<DatasetType>('blobs');
  const [initMethod, setInitMethod] = useState<InitMethod>('kmeans++');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [stepCount, setStepCount] = useState<number>(0);
  const [inertiaHistory, setInertiaHistory] = useState<number[]>([]);
  const [silhouette, setSilhouette] = useState<number | null>(null);

  // Canvas & Animation Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Data Refs (to avoid React re-render lag during 60fps animation)
  const pointsRef = useRef<Point[]>([]);
  const assignmentsRef = useRef<number[]>([]);
  const centroidsRef = useRef<Point[]>([]);
  const targetCentroidsRef = useRef<Point[]>([]);
  const centroidHistoryRef = useRef<Point[][]>([]);
  
  // Animation State Refs
  const animProgressRef = useRef<number>(1); // 0 to 1
  const animStateRef = useRef<'idle' | 'moving' | 'converged'>('idle');

  // --- Initialization Logic ---
  const initializeKMeans = useCallback(() => {
    setIsPlaying(false);
    setStepCount(0);
    setInertiaHistory([]);
    setSilhouette(null);
    animStateRef.current = 'idle';
    animProgressRef.current = 1;

    const pts = generatePoints(dataset, 300);
    pointsRef.current = pts;
    assignmentsRef.current = new Array(pts.length).fill(-1);

    let initialCentroids: Point[] = [];
    
    if (initMethod === 'random') {
      // Pick K random unique points
      const shuffled = [...pts].sort(() => 0.5 - Math.random());
      initialCentroids = shuffled.slice(0, k).map(p => ({ ...p }));
    } else if (initMethod === 'kmeans++') {
      initialCentroids.push({ ...pts[Math.floor(Math.random() * pts.length)] });
      for (let i = 1; i < k; i++) {
        const dists = pts.map(p => {
          let minDist = Infinity;
          for (const c of initialCentroids) {
            const d = distSq(p, c);
            if (d < minDist) minDist = d;
          }
          return minDist;
        });
        const sumDist = dists.reduce((a, b) => a + b, 0);
        let r = Math.random() * sumDist;
        for (let j = 0; j < pts.length; j++) {
          r -= dists[j];
          if (r <= 0) {
            initialCentroids.push({ ...pts[j] });
            break;
          }
        }
      }
    } else if (initMethod === 'farthest') {
      initialCentroids.push({ ...pts[Math.floor(Math.random() * pts.length)] });
      for (let i = 1; i < k; i++) {
        let maxDist = -1;
        let farthestPoint = pts[0];
        for (const p of pts) {
          let minDistToC = Infinity;
          for (const c of initialCentroids) {
            const d = distSq(p, c);
            if (d < minDistToC) minDistToC = d;
          }
          if (minDistToC > maxDist) {
            maxDist = minDistToC;
            farthestPoint = p;
          }
        }
        initialCentroids.push({ ...farthestPoint });
      }
    }

    centroidsRef.current = initialCentroids;
    targetCentroidsRef.current = initialCentroids;
    centroidHistoryRef.current = initialCentroids.map(c => [{ ...c }]);

    // Initial assignment
    assignPoints();
    drawFrame();
  }, [dataset, k, initMethod]);

  useEffect(() => {
    initializeKMeans();
  }, [initializeKMeans]);

  // --- Algorithm Steps ---
  const assignPoints = () => {
    const pts = pointsRef.current;
    const cents = centroidsRef.current;
    let changed = false;
    let currentInertia = 0;

    const newAssignments = pts.map(p => {
      let bestK = 0;
      let minDist = Infinity;
      cents.forEach((c, idx) => {
        const d = distSq(p, c);
        if (d < minDist) {
          minDist = d;
          bestK = idx;
        }
      });
      currentInertia += minDist;
      return bestK;
    });

    for (let i = 0; i < pts.length; i++) {
      if (assignmentsRef.current[i] !== newAssignments[i]) {
        changed = true;
      }
    }

    assignmentsRef.current = newAssignments;
    setInertiaHistory(prev => [...prev, currentInertia]);
    return changed;
  };

  const calculateSilhouette = () => {
    const pts = pointsRef.current;
    const assignments = assignmentsRef.current;
    if (pts.length === 0 || k < 2) return 0;

    let totalSilhouette = 0;
    
    // Pre-group points
    const clusters: number[][] = Array.from({ length: k }, () => []);
    assignments.forEach((cIdx, pIdx) => {
      if (cIdx >= 0 && cIdx < k) clusters[cIdx].push(pIdx);
    });

    for (let i = 0; i < pts.length; i++) {
      const myClusterIdx = assignments[i];
      if (myClusterIdx < 0) continue;
      const myCluster = clusters[myClusterIdx];
      
      if (myCluster.length <= 1) continue; // s(i) = 0

      // Calculate a(i)
      let a = 0;
      for (const otherIdx of myCluster) {
        if (otherIdx !== i) a += dist(pts[i], pts[otherIdx]);
      }
      a /= (myCluster.length - 1);

      // Calculate b(i)
      let b = Infinity;
      for (let c = 0; c < k; c++) {
        if (c === myClusterIdx || clusters[c].length === 0) continue;
        let avgDist = 0;
        for (const otherIdx of clusters[c]) {
          avgDist += dist(pts[i], pts[otherIdx]);
        }
        avgDist /= clusters[c].length;
        if (avgDist < b) b = avgDist;
      }

      const s = (b - a) / Math.max(a, b);
      totalSilhouette += s;
    }
    return totalSilhouette / pts.length;
  };

  const prepareNextStep = () => {
    if (animStateRef.current === 'converged') return false;

    const pts = pointsRef.current;
    const assign = assignmentsRef.current;
    const cents = centroidsRef.current;

    const sums = Array.from({ length: k }, () => ({ x: 0, y: 0, count: 0 }));
    
    pts.forEach((p, i) => {
      const cluster = assign[i];
      if (cluster >= 0) {
        sums[cluster].x += p.x;
        sums[cluster].y += p.y;
        sums[cluster].count += 1;
      }
    });

    const newCentroids = cents.map((c, i) => {
      if (sums[i].count === 0) return { ...c }; // Keep if empty
      return {
        x: sums[i].x / sums[i].count,
        y: sums[i].y / sums[i].count
      };
    });

    let maxDrift = 0;
    for (let i = 0; i < k; i++) {
      maxDrift = Math.max(maxDrift, dist(cents[i], newCentroids[i]));
    }

    if (maxDrift < 0.001) {
      animStateRef.current = 'converged';
      setIsPlaying(false);
      setSilhouette(calculateSilhouette());
      return false;
    }

    targetCentroidsRef.current = newCentroids;
    animProgressRef.current = 0;
    animStateRef.current = 'moving';
    
    // Update history
    newCentroids.forEach((nc, i) => {
      centroidHistoryRef.current[i].push({ ...nc });
    });

    setStepCount(s => s + 1);
    return true;
  };

  const stepForward = () => {
    if (animStateRef.current === 'idle') {
      prepareNextStep();
    } else if (animStateRef.current === 'moving' && animProgressRef.current >= 1) {
      centroidsRef.current = targetCentroidsRef.current;
      assignPoints();
      prepareNextStep();
    }
  };

  // --- Animation Loop ---
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const pts = pointsRef.current;
    const assign = assignmentsRef.current;
    
    // 1. Draw Points
    pts.forEach((p, i) => {
      const cluster = assign[i];
      ctx.beginPath();
      ctx.arc(p.x * width, p.y * height, 4, 0, Math.PI * 2);
      ctx.fillStyle = cluster >= 0 ? CANDY_COLORS[cluster % CANDY_COLORS.length] : UNASSIGNED_COLOR;
      ctx.fill();
      // Subtle border for points
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0,0,0,0.05)';
      ctx.stroke();
    });

    // Interpolate Centroids if moving
    const t = animProgressRef.current;
    const currentDrawCentroids = centroidsRef.current.map((c, i) => {
      const target = targetCentroidsRef.current[i];
      // Ease out cubic
      const easeT = 1 - Math.pow(1 - t, 3);
      return {
        x: c.x + (target.x - c.x) * easeT,
        y: c.y + (target.y - c.y) * easeT
      };
    });

    // 2. Draw Trails (Drift History)
    centroidHistoryRef.current.forEach((history, i) => {
      if (history.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(history[0].x * width, history[0].y * height);
      for (let j = 1; j < history.length - 1; j++) {
        ctx.lineTo(history[j].x * width, history[j].y * height);
      }
      // Line to currently drawing position
      ctx.lineTo(currentDrawCentroids[i].x * width, currentDrawCentroids[i].y * height);
      ctx.strokeStyle = CANDY_COLORS[i % CANDY_COLORS.length];
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    });

    // 3. Draw Centroids
    currentDrawCentroids.forEach((c, i) => {
      const cx = c.x * width;
      const cy = c.y * height;
      
      // Shadow
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;

      // Outer circle
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fillStyle = CANDY_COLORS[i % CANDY_COLORS.length];
      ctx.fill();
      
      // Reset shadow for stroke
      ctx.shadowColor = 'transparent';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Inner dot
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    });

  }, []);

  const animate = useCallback((time: number) => {
    if (animStateRef.current === 'moving') {
      animProgressRef.current += 0.03; // Animation speed
      if (animProgressRef.current >= 1) {
        animProgressRef.current = 1;
        centroidsRef.current = targetCentroidsRef.current;
        assignPoints();
        animStateRef.current = 'idle';
      }
    } else if (isPlaying && animStateRef.current === 'idle') {
      // Small pause between steps
      setTimeout(() => {
        if (isPlaying) prepareNextStep();
      }, 200);
    }
    
    drawFrame();
    requestRef.current = requestAnimationFrame(animate);
  }, [isPlaying, drawFrame]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [animate]);

  // --- Render Helpers ---
  const chartPoints = useMemo(() => {
    if (inertiaHistory.length < 2) return null;
    const maxInertia = Math.max(...inertiaHistory);
    const minInertia = Math.min(...inertiaHistory);
    const range = maxInertia - minInertia || 1;
    
    return inertiaHistory.map((val, i) => {
      const x = (i / (inertiaHistory.length - 1)) * 100;
      const y =