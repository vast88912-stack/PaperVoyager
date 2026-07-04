import React, { useState, useRef, useEffect, useMemo } from 'react';

// --- Math & Physics Helpers ---

type Point = { x: number; y: number };
type Vector = { x: number; y: number };

interface RaySegment {
  start: Point;
  end: Point;
  isWave?: boolean;
}

interface Annotation {
  point: Point;
  normal: Vector;
  angleIn: number;
  angleOut: number;
  textIn: string;
  textOut: string;
}

type ElementType = 'mirror' | 'lens' | 'block';

interface OpticElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number; // For mirrors
  focalLength?: number; // For lenses
  n?: number; // Refractive index for blocks
}

const normalize = (v: Vector): Vector => {
  const len = Math.hypot(v.x, v.y);
  return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
};

const dotProduct = (v1: Vector, v2: Vector): number => v1.x * v2.x + v1.y * v2.y;

const reflect = (dir: Vector, normal: Vector): Vector => {
  const dot = dotProduct(dir, normal);
  return {
    x: dir.x - 2 * dot * normal.x,
    y: dir.y - 2 * dot * normal.y,
  };
};

const refract = (dir: Vector, normal: Vector, n1: number, n2: number): Vector | null => {
  let cosI = -dotProduct(dir, normal);
  let n = normal;
  
  // If ray is exiting the medium, invert normal and swap indices
  let ratio = n1 / n2;
  if (cosI < 0) {
    cosI = -cosI;
    n = { x: -normal.x, y: -normal.y };
  }

  const sinT2 = ratio * ratio * (1 - cosI * cosI);
  if (sinT2 > 1) return null; // Total Internal Reflection

  const cosT = Math.sqrt(1 - sinT2);
  return {
    x: ratio * dir.x + (ratio * cosI - cosT) * n.x,
    y: ratio * dir.y + (ratio * cosI - cosT) * n.y,
  };
};

const getLineIntersection = (
  rayOrigin: Point,
  rayDir: Vector,
  p3: Point,
  p4: Point
): { point: Point; t: number; normal: Vector } | null => {
  const p1 = rayOrigin;
  const p2 = { x: rayOrigin.x + rayDir.x, y: rayOrigin.y + rayDir.y };

  const den = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(den) < 0.00001) return null;

  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / den;
  const u = ((p1.x - p3.x) * (p1.y - p2.y) - (p1.y - p3.y) * (p1.x - p2.x)) / den;

  if (t > 0.001 && u >= 0 && u <= 1) {
    const point = { x: p1.x + t * rayDir.x, y: p1.y + t * rayDir.y };
    const dx = p4.x - p3.x;
    const dy = p4.y - p3.y;
    let normal = normalize({ x: -dy, y: dx });
    
    // Ensure normal faces the incoming ray
    if (dotProduct(rayDir, normal) > 0) {
      normal = { x: -normal.x, y: -normal.y };
    }

    return { point, t, normal };
  }
  return null;
};

// --- Main Component ---

export default function App() {
  const [elements, setElements] = useState<OpticElement[]>([
    { id: '1', type: 'lens', x: 400, y: 300, width: 20, height: 150, angle: 0, focalLength: 150 },
    { id: '2', type: 'mirror', x: 700, y: 300, width: 10, height: 150, angle: -30 },
    { id: '3', type: 'block', x: 400, y: 500, width: 150, height: 100, angle: 0, n: 1.5 },
  ]);

  const [lightSource, setLightSource] = useState({ x: 100, y: 300, angle: 0 });
  const [mode, setMode] = useState<'ray' | 'wave'>('ray');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string | 'light'; offsetX: number; offsetY: number } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  // --- Ray Tracing Engine ---
  const { rays, annotations } = useMemo(() => {
    const MAX_BOUNCES = 15;
    const computedRays: RaySegment[] = [];
    const computedAnnotations: Annotation[] = [];
    
    let currentOrigin = { ...lightSource };
    let currentDir = { x: Math.cos((lightSource.angle * Math.PI) / 180), y: Math.sin((lightSource.angle * Math.PI) / 180) };
    let currentMediumN = 1.0; // Air

    for (let bounce = 0; bounce < MAX_BOUNCES; bounce++) {
      let closestHit: { point: Point; t: number; normal: Vector; element: OpticElement; side?: string } | null = null;

      elements.forEach((el) => {
        if (el.type === 'mirror') {
          const rad = (el.angle * Math.PI) / 180;
          const dx = Math.sin(rad) * (el.height / 2);
          const dy = -Math.cos(rad) * (el.height / 2);
          const p1 = { x: el.x - dx, y: el.y - dy };
          const p2 = { x: el.x + dx, y: el.y + dy };
          
          const hit = getLineIntersection(currentOrigin, currentDir, p1, p2);
          if (hit && (!closestHit || hit.t < closestHit.t)) {
            closestHit = { ...hit, element: el };
          }
        } else if (el.type === 'lens') {
          const p1 = { x: el.x, y: el.y - el.height / 2 };
          const p2 = { x: el.x, y: el.y + el.height / 2 };
          const hit = getLineIntersection(currentOrigin, currentDir, p1, p2);
          if (hit && (!closestHit || hit.t < closestHit.t)) {
            closestHit = { ...hit, element: el };
          }
        } else if (el.type === 'block') {
          const hw = el.width / 2;
          const hh = el.height / 2;
          const sides = [
            { p1: { x: el.x - hw, y: el.y - hh }, p2: { x: el.x + hw, y: el.y - hh }, name: 'top' },
            { p1: { x: el.x + hw, y: el.y - hh }, p2: { x: el.x + hw, y: el.y + hh }, name: 'right' },
            { p1: { x: el.x + hw, y: el.y + hh }, p2: { x: el.x - hw, y: el.y + hh }, name: 'bottom' },
            { p1: { x: el.x - hw, y: el.y + hh }, p2: { x: el.x - hw, y: el.y - hh }, name: 'left' },
          ];

          sides.forEach((side) => {
            const hit = getLineIntersection(currentOrigin, currentDir, side.p1, side.p2);
            if (hit && (!closestHit || hit.t < closestHit.t)) {
              closestHit = { ...hit, element: el, side: side.name };
            }
          });
        }
      });

      if (!closestHit) {
        computedRays.push({
          start: currentOrigin,
          end: { x: currentOrigin.x + currentDir.x * 2000, y: currentOrigin.y + currentDir.y * 2000 },
        });
        break;
      }

      const hit = closestHit as NonNullable<typeof closestHit>;
      computedRays.push({ start: currentOrigin, end: hit.point });

      // Calculate new direction
      if (hit.element.type === 'mirror') {
        currentDir = reflect(currentDir, hit.normal);
      } else if (hit.element.type === 'lens') {
        // Thin lens approximation: angle changes by h/f
        const h = hit.point.y - hit.element.y;
        const f = hit.element.focalLength || 100;
        const incomingAngle = Math.atan2(currentDir.y, currentDir.x);
        // Deflection depends on whether it's convex (f>0) or concave (f<0)
        const outgoingAngle = incomingAngle - h / f;
        currentDir = { x: Math.cos(outgoingAngle), y: Math.sin(outgoingAngle) };
      } else if (hit.element.type === 'block') {
        const n1 = currentMediumN;
        const n2 = currentMediumN === 1.0 ? (hit.element.n || 1.5) : 1.0;
        
        const refractedDir = refract(currentDir, hit.normal, n1, n2);
        
        // Snell's Law Annotation
        const angleIn = Math.acos(Math.abs(dotProduct(currentDir, hit.normal))) * (180 / Math.PI);
        let angleOut = 0;

        if (refractedDir) {
          angleOut = Math.acos(Math.abs(dotProduct(refractedDir, hit.normal))) * (180 / Math.PI);
          currentDir = refractedDir;
          currentMediumN = n2;
        } else {
          // TIR
          angleOut = angleIn;
          currentDir = reflect(currentDir, hit.normal);
        }

        computedAnnotations.push({
          point: hit.point,
          normal: hit.normal,
          angleIn,
          angleOut,
          textIn: `${angleIn.toFixed(1)}°`,
          textOut: refractedDir ? `${angleOut.toFixed(1)}°` : 'TIR',
        });
      }

      currentOrigin = hit.point;
    }

    return { rays: computedRays, annotations: computedAnnotations };
  }, [elements, lightSource]);

  // --- Interaction Handlers ---
  const getMouseCoords = (e: React.PointerEvent) => {
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
    const coords = getMouseCoords(e);
    setSelectedId(id === 'light' ? null : id);
    
    if (id === 'light') {
      setDragging({ id, offsetX: coords.x - lightSource.x, offsetY: coords.y - lightSource.y });
    } else {
      const el = elements.find((el) => el.id === id);
      if (el) {
        setDragging({ id, offsetX: coords.x - el.x, offsetY: coords.y - el.y });
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const coords = getMouseCoords(e);
    const newX = coords.x - dragging.offsetX;
    const newY = coords.y - dragging.offsetY;

    if (dragging.id === 'light') {
      setLightSource({ ...lightSource, x: newX, y: newY });
    } else {
      setElements(elements.map((el) => (el.id === dragging.id ? { ...el, x: newX, y: newY } : el)));
    }
  };

  const handlePointerUp = () => {
    setDragging(null);
  };

  const addElement = (type: ElementType) => {
    const newEl: OpticElement = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      x: 500,
      y: 300,
      width: type === 'block' ? 100 : 20,
      height: type === 'block' ? 100 : 150,
      angle: 0,
      focalLength: type === 'lens' ? 150 : undefined,
      n: type === 'block' ? 1.5 : undefined,
    };
    setElements([...elements, newEl]);
    setSelectedId(newEl.id);
  };

  const updateSelected = (updates: Partial<OpticElement>) => {
    setElements(elements.map((el) => (el.id === selectedId ? { ...el, ...updates } : el)));
  };

  const selectedElement = elements.find((el) => el.id === selectedId);

  // --- Render Helpers ---
  const renderWavefronts = (ray: RaySegment) => {
    const dx = ray.end.x - ray.start.x;
    const dy = ray.end.y - ray.start.y;
    const len = Math.hypot(dx, dy);
    const dir = { x: dx / len, y: dy / len };
    const normal = { x: -dir.y, y: dir.x };
    
    const waveSpacing = 20;
    const waveWidth = 40;
    const fronts = [];
    
    for (let d = waveSpacing; d < len; d += waveSpacing) {
      const cx = ray.start.x + dir.x * d;
      const cy = ray.start.y + dir.y * d;
      fronts.push(
        <line
          key={`${ray.start.x}-${d}`}
          x1={cx - normal.x * waveWidth / 2}
          y1={cy - normal.y * waveWidth / 2}
          x2={cx + normal.x * waveWidth / 2}
          y2={cy + normal.y * waveWidth / 2}
          stroke="#ef4444"
          strokeWidth="2"
          strokeOpacity="0.4"
        />
      );
    }
    return fronts;
  };

  return (
    <div className="flex h-screen w-full bg-[#fdfbf7] font-sans text-slate-800 overflow-hidden">
      {/* Sidebar Controls */}
      <div className="w-80 bg-white border-r border-slate-200 shadow-sm flex flex-col z-10">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Optics Lab
          </h1>
          <p className="text-sm text-slate-500 mt-1">Interactive Ray & Wave Simulator</p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-8">
          {/* Global Controls */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Environment</h3>
            
            <div className="flex items-center justify-between bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setMode('ray')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'ray' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Ray Model
              </button>
              <button
                onClick={() => setMode('wave')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'wave' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Wave Model
              </button>
            </div>

            <div className="space-y-2">
              <label className="flex justify-between text-sm font-medium text-slate-700">
                Light Angle <span>{lightSource.angle}°</span>
              </label>
              <input
                type="range"
                min="-90"
                max="90"
                value={lightSource.angle}
                onChange={(e) => setLightSource({ ...lightSource, angle: Number(e.target.value) })}
                className="w-full accent-blue-600"
              />
            </div>
          </div>

          {/* Add Elements */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Add Elements</h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => addElement('lens')} className="px-3 py-2 bg-white border border-slate-200 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-blue-300 transition-all shadow-sm">
                + Lens
              </button>
              <button onClick={() => addElement('mirror')} className="px-3 py-2 bg-white border border-slate-200 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-blue-300 transition-all shadow-sm">
                + Mirror
              </button>
              <button onClick={() => addElement('block')} className="col-span