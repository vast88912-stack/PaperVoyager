import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Settings, Sun, Move, CircleDot, MousePointer2, Plus, Trash2, RotateCcw, Waves, Zap } from 'lucide-react';

// --- Types ---
type Point = { x: number; y: number };
type Vector = { x: number; y: number };

type ElementType = 'mirror' | 'lens' | 'block';

interface OpticalElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  // For mirrors and blocks
  width?: number;
  height?: number;
  angle?: number; // in radians
  // For lenses
  focalLength?: number;
  // For blocks
  refractiveIndex?: number;
}

interface RaySegment {
  start: Point;
  end: Point;
  intensity: number;
  isWave?: boolean;
  normal?: Vector;
  angleIn?: number;
  angleOut?: number;
}

// --- Math & Physics Helpers ---
const EPSILON = 0.01;

const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Point, b: Point): Vector => ({ x: a.x - b.x, y: a.y - b.y });
const mult = (v: Vector, s: number): Vector => ({ x: v.x * s, y: v.y * s });
const mag = (v: Vector): number => Math.sqrt(v.x * v.x + v.y * v.y);
const norm = (v: Vector): Vector => {
  const m = mag(v);
  return m === 0 ? { x: 0, y: 0 } : { x: v.x / m, y: v.y / m };
};
const dot = (a: Vector, b: Vector): number => a.x * b.x + a.y * b.y;
const cross = (a: Vector, b: Vector): number => a.x * b.y - a.y * b.x;
const rotate = (v: Vector, angle: number): Vector => ({
  x: v.x * Math.cos(angle) - v.y * Math.sin(angle),
  y: v.x * Math.sin(angle) + v.y * Math.cos(angle),
});

// Ray intersection with line segment
function raySegmentIntersect(
  rayOrigin: Point,
  rayDir: Vector,
  p1: Point,
  p2: Point
): { t: number; point: Point; normal: Vector } | null {
  const v1 = sub(rayOrigin, p1);
  const v2 = sub(p2, p1);
  const v3 = { x: -rayDir.y, y: rayDir.x };

  const dotProd = dot(v2, v3);
  if (Math.abs(dotProd) < 0.000001) return null;

  const t1 = cross(v2, v1) / dotProd;
  const t2 = dot(v1, v3) / dotProd;

  if (t1 > EPSILON && t2 >= 0 && t2 <= 1) {
    let normal = norm({ x: -v2.y, y: v2.x });
    // Ensure normal faces the incoming ray
    if (dot(normal, rayDir) > 0) {
      normal = mult(normal, -1);
    }
    return {
      t: t1,
      point: add(rayOrigin, mult(rayDir, t1)),
      normal,
    };
  }
  return null;
}

// Ray intersection with Axis-Aligned Bounding Box (AABB)
function rayRectIntersect(
  rayOrigin: Point,
  rayDir: Vector,
  x: number,
  y: number,
  w: number,
  h: number
): { t: number; point: Point; normal: Vector } | null {
  const left = x - w / 2;
  const right = x + w / 2;
  const top = y - h / 2;
  const bottom = y + h / 2;

  const segments = [
    { p1: { x: left, y: top }, p2: { x: right, y: top }, n: { x: 0, y: -1 } }, // Top
    { p1: { x: right, y: top }, p2: { x: right, y: bottom }, n: { x: 1, y: 0 } }, // Right
    { p1: { x: right, y: bottom }, p2: { x: left, y: bottom }, n: { x: 0, y: 1 } }, // Bottom
    { p1: { x: left, y: bottom }, p2: { x: left, y: top }, n: { x: -1, y: 0 } }, // Left
  ];

  let closest: { t: number; point: Point; normal: Vector } | null = null;

  for (const seg of segments) {
    const hit = raySegmentIntersect(rayOrigin, rayDir, seg.p1, seg.p2);
    if (hit) {
      if (!closest || hit.t < closest.t) {
        closest = { ...hit, normal: seg.n };
      }
    }
  }

  // If we are inside the box, the normal should point inwards
  if (closest && rayOrigin.x > left && rayOrigin.x < right && rayOrigin.y > top && rayOrigin.y < bottom) {
    closest.normal = mult(closest.normal, -1);
  }

  return closest;
}

// --- Main Component ---
export default function App() {
  // --- State ---
  const [elements, setElements] = useState<OpticalElement[]>([
    { id: 'lens1', type: 'lens', x: 400, y: 300, height: 150, focalLength: 100 },
    { id: 'mirror1', type: 'mirror', x: 700, y: 300, height: 100, angle: Math.PI / 4 },
    { id: 'block1', type: 'block', x: 550, y: 450, width: 100, height: 80, refractiveIndex: 1.5 },
  ]);

  const [lightSource, setLightSource] = useState({ x: 100, y: 300, angle: 0 });
  const [mode, setMode] = useState<'ray' | 'wave'>('ray');
  const [selectedId, setSelectedId] = useState<string | 'light' | null>(null);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement>(null);

  // --- Interaction Handlers ---
  const getMousePos = (e: React.PointerEvent | PointerEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    return {
      x: (e.clientX - CTM.e) / CTM.a,
      y: (e.clientY - CTM.f) / CTM.d,
    };
  };

  const handlePointerDown = (e: React.PointerEvent, id: string | 'light') => {
    e.stopPropagation();
    setSelectedId(id);
    setIsDragging(true);
    const pos = getMousePos(e);

    if (id === 'light') {
      setDragOffset({ x: pos.x - lightSource.x, y: pos.y - lightSource.y });
    } else {
      const el = elements.find((el) => el.id === id);
      if (el) {
        setDragOffset({ x: pos.x - el.x, y: pos.y - el.y });
      }
    }
  };

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDragging || !selectedId) return;
      const pos = getMousePos(e);

      if (selectedId === 'light') {
        setLightSource((prev) => ({ ...prev, x: pos.x - dragOffset.x, y: pos.y - dragOffset.y }));
      } else {
        setElements((prev) =>
          prev.map((el) =>
            el.id === selectedId ? { ...el, x: pos.x - dragOffset.x, y: pos.y - dragOffset.y } : el
          )
        );
      }
    },
    [isDragging, selectedId, dragOffset]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    } else {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  // --- Ray Tracing Engine ---
  const rays = useMemo(() => {
    const calculatedRays: RaySegment[] = [];
    let currentPos = { x: lightSource.x, y: lightSource.y };
    let currentDir = { x: Math.cos(lightSource.angle), y: Math.sin(lightSource.angle) };
    let intensity = 1.0;
    
    // Create multiple initial rays if in wave mode to simulate wavefronts loosely
    const numInitialRays = mode === 'wave' ? 5 : 1;
    const spread = mode === 'wave' ? 0.2 : 0; // radians

    for (let r = 0; r < numInitialRays; r++) {
      let rayPos = { ...currentPos };
      let rayAngle = lightSource.angle + (r - Math.floor(numInitialRays/2)) * spread;
      let rayDir = { x: Math.cos(rayAngle), y: Math.sin(rayAngle) };
      let rayIntensity = intensity;
      let currentN = 1.0; // Air

      for (let bounce = 0; bounce < 8; bounce++) {
        if (rayIntensity < 0.05) break;

        let closestHit: {
          t: number;
          point: Point;
          normal: Vector;
          element: OpticalElement;
        } | null = null;

        // Check intersections
        for (const el of elements) {
          let hit = null;
          if (el.type === 'mirror') {
            const dx = (el.height! / 2) * Math.sin(el.angle || 0);
            const dy = (el.height! / 2) * Math.cos(el.angle || 0);
            const p1 = { x: el.x - dx, y: el.y + dy };
            const p2 = { x: el.x + dx, y: el.y - dy };
            hit = raySegmentIntersect(rayPos, rayDir, p1, p2);
          } else if (el.type === 'lens') {
            // Treat thin lens as a vertical line segment
            const p1 = { x: el.x, y: el.y - el.height! / 2 };
            const p2 = { x: el.x, y: el.y + el.height! / 2 };
            hit = raySegmentIntersect(rayPos, rayDir, p1, p2);
          } else if (el.type === 'block') {
            hit = rayRectIntersect(rayPos, rayDir, el.x, el.y, el.width!, el.height!);
          }

          if (hit && (!closestHit || hit.t < closestHit.t)) {
            closestHit = { ...hit, element: el };
          }
        }

        if (!closestHit) {
          // Shoot to infinity
          calculatedRays.push({
            start: rayPos,
            end: add(rayPos, mult(rayDir, 2000)),
            intensity: rayIntensity,
          });
          break;
        }

        // Draw ray to hit point
        const hitPoint = closestHit.point;
        const normal = closestHit.normal;
        const el = closestHit.element;

        let angleIn = Math.acos(Math.max(-1, Math.min(1, dot(mult(rayDir, -1), normal))));
        let angleOut = angleIn;

        calculatedRays.push({
          start: rayPos,
          end: hitPoint,
          intensity: rayIntensity,
          normal,
          angleIn: (angleIn * 180) / Math.PI,
        });

        // Calculate new direction
        if (el.type === 'mirror') {
          // Reflection: R = D - 2(D.N)N
          const dotDN = dot(rayDir, normal);
          rayDir = sub(rayDir, mult(normal, 2 * dotDN));
          rayDir = norm(rayDir);
          rayIntensity *= 0.95; // slight loss
        } else if (el.type === 'lens') {
          // Thin lens approximation: bend ray based on distance from optical axis
          const yDist = hitPoint.y - el.y;
          const thetaIn = Math.atan2(rayDir.y, rayDir.x);
          const f = el.focalLength || 100;
          // tan(thetaOut) = tan(thetaIn) - y/f
          const tanOut = Math.tan(thetaIn) - yDist / f;
          const thetaOut = Math.atan(tanOut);
          rayDir = { x: Math.cos(thetaOut), y: Math.sin(thetaOut) };
          // Ensure ray keeps moving forward
          if (rayDir.x < 0 && Math.cos(thetaIn) > 0) rayDir.x *= -1;
          rayDir = norm(rayDir);
        } else if (el.type === 'block') {
          // Refraction (Snell's Law)
          const n1 = currentN;
          const n2 = currentN === 1.0 ? (el.refractiveIndex || 1.5) : 1.0;
          
          const cosI = dot(mult(rayDir, -1), normal);
          const sinI2 = 1 - cosI * cosI;
          const nRatio = n1 / n2;
          const sinT2 = nRatio * nRatio * sinI2;

          if (sinT2 > 1.0) {
            // Total Internal Reflection
            const dotDN = dot(rayDir, normal);
            rayDir = sub(rayDir, mult(normal, 2 * dotDN));
            rayDir = norm(rayDir);
          } else {
            // Refraction
            const cosT = Math.sqrt(1 - sinT2);
            rayDir = add(mult(rayDir, nRatio), mult(normal, nRatio * cosI - cosT));
            rayDir = norm(rayDir);
            currentN = n2;
            
            // Calculate angle out for display
            angleOut = Math.acos(Math.max(-1, Math.min(1, dot(mult(rayDir, -1), mult(normal, -1)))));
            calculatedRays[calculatedRays.length - 1].angleOut = (angleOut * 180) / Math.PI;
          }
        }

        // Push off surface slightly
        rayPos = add(hitPoint, mult(rayDir, EPSILON));
      }
    }

    return calculatedRays;
  }, [elements, lightSource, mode]);

  // --- UI Helpers ---
  const addElement = (type: ElementType) => {
    const newEl: OpticalElement = {
      id: `${type}-${Date.now()}`,
      type,
      x: 400 + Math.random() * 100,
      y: 300 + Math.random() * 100,
      height: type === 'block' ? 80 : 100,
      width: type === 'block' ? 100 : undefined,
      angle: 0,
      focalLength: type === 'lens' ? 100 : undefined,
      refractiveIndex: type === 'block' ? 1.5 : undefined,
    };
    setElements([...elements, newEl]);
    setSelectedId(newEl.id);
  };

  const removeSelected = () => {
    if (!selectedId || selectedId === 'light') return;
    setElements(elements.filter((el) => el.id !== selectedId));
    setSelectedId(null);
  };

  const updateSelected = (updates: Partial<OpticalElement>) => {
    if (!selectedId || selectedId === 'light') return;
    setElements(elements.map((el) => (el.id === selectedId ? { ...el, ...updates } : el)));
  };

  const selectedElement = elements.find((el) => el.id === selectedId);

  return (
    <div className="flex h-screen w-full bg-[#fdfbf7] text-slate-800 font-sans overflow-hidden">
      
      {/* Sidebar / Controls */}
      <div className="w-80 border-r border-slate-300 bg-white shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 flex flex-col">
        <div className="p-6 border-b border-slate-200 bg-[#f8f9fa]">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Zap className="text-amber-500