import React, { useState, useRef, useEffect, useMemo, PointerEvent as ReactPointerEvent } from 'react';

// --- Shared Types & Helpers ---

type Point = { x: number; y: number };
type Vector = { x: number; y: number };

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
  let ratio = n1 / n2;
  if (cosI < 0) {
    cosI = -cosI;
    n = { x: -normal.x, y: -normal.y };
  }
  const sinT2 = ratio * ratio * (1 - cosI * cosI);
  if (sinT2 > 1) return null;
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
    if (dotProduct(rayDir, normal) > 0) {
      normal = { x: -normal.x, y: -normal.y };
    }
    return { point, t, normal };
  }
  return null;
};

// --- Block 1: Ray Diagram Canvas ---

interface RaySegment { start: Point; end: Point; isWave?: boolean; }
interface Annotation { point: Point; normal: Vector; angleIn: number; angleOut: number; textIn: string; textOut: string; }
type B1ElementType = 'mirror' | 'lens' | 'block';
interface B1OpticElement { id: string; type: B1ElementType; x: number; y: number; width: number; height: number; angle: number; focalLength?: number; n?: number; }

function RayDiagramModule() {
  const [elements, setElements] = useState<B1OpticElement[]>([
    { id: '1', type: 'lens', x: 400, y: 300, width: 20, height: 150, angle: 0, focalLength: 150 },
    { id: '2', type: 'mirror', x: 700, y: 300, width: 10, height: 150, angle: -30 },
    { id: '3', type: 'block', x: 400, y: 500, width: 150, height: 100, angle: 0, n: 1.5 },
  ]);
  const [lightSource, setLightSource] = useState({ x: 100, y: 300, angle: 0 });
  const [mode, setMode] = useState<'ray' | 'wave'>('ray');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string | 'light'; offsetX: number; offsetY: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { rays, annotations } = useMemo(() => {
    const MAX_BOUNCES = 15;
    const computedRays: RaySegment[] = [];
    const computedAnnotations: Annotation[] = [];
    let currentOrigin = { ...lightSource };
    let currentDir = { x: Math.cos((lightSource.angle * Math.PI) / 180), y: Math.sin((lightSource.angle * Math.PI) / 180) };
    let currentMediumN = 1.0;

    for (let bounce = 0; bounce < MAX_BOUNCES; bounce++) {
      let closestHit: { point: Point; t: number; normal: Vector; element: B1OpticElement; side?: string } | null = null;

      elements.forEach((el) => {
        if (el.type === 'mirror') {
          const rad = (el.angle * Math.PI) / 180;
          const dx = Math.sin(rad) * (el.height / 2);
          const dy = -Math.cos(rad) * (el.height / 2);
          const p1 = { x: el.x - dx, y: el.y - dy };
          const p2 = { x: el.x + dx, y: el.y + dy };
          const hit = getLineIntersection(currentOrigin, currentDir, p1, p2);
          if (hit && (!closestHit || hit.t < closestHit.t)) closestHit = { ...hit, element: el };
        } else if (el.type === 'lens') {
          const p1 = { x: el.x, y: el.y - el.height / 2 };
          const p2 = { x: el.x, y: el.y + el.height / 2 };
          const hit = getLineIntersection(currentOrigin, currentDir, p1, p2);
          if (hit && (!closestHit || hit.t < closestHit.t)) closestHit = { ...hit, element: el };
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
            if (hit && (!closestHit || hit.t < closestHit.t)) closestHit = { ...hit, element: el, side: side.name };
          });
        }
      });

      if (!closestHit) {
        computedRays.push({ start: currentOrigin, end: { x: currentOrigin.x + currentDir.x * 2000, y: currentOrigin.y + currentDir.y * 2000 } });
        break;
      }

      const hit = closestHit as NonNullable<typeof closestHit>;
      computedRays.push({ start: currentOrigin, end: hit.point });

      if (hit.element.type === 'mirror') {
        currentDir = reflect(currentDir, hit.normal);
      } else if (hit.element.type === 'lens') {
        const h = hit.point.y - hit.element.y;
        const f = hit.element.focalLength || 100;
        const incomingAngle = Math.atan2(currentDir.y, currentDir.x);
        const outgoingAngle = incomingAngle - h / f;
        currentDir = { x: Math.cos(outgoingAngle), y: Math.sin(outgoingAngle) };
      } else if (hit.element.type === 'block') {
        const n1 = currentMediumN;
        const n2 = currentMediumN === 1.0 ? (hit.element.n || 1.5) : 1.0;
        const refractedDir = refract(currentDir, hit.normal, n1, n2);
        const angleIn = Math.acos(Math.abs(dotProduct(currentDir, hit.normal))) * (180 / Math.PI);
        let angleOut = 0;

        if (refractedDir) {
          angleOut = Math.acos(Math.abs(dotProduct(refractedDir, hit.normal))) * (180 / Math.PI);
          currentDir = refractedDir;
          currentMediumN = n2;
        } else {
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

  const getMouseCoords = (e: React.PointerEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    return { x: (e.clientX - CTM.e) / CTM.a, y: (e.clientY - CTM.f) / CTM.d };
  };

  const handlePointerDown = (e: React.PointerEvent, id: string | 'light' | 'bg') => {
    e.stopPropagation();
    if (id === 'bg') {
      setSelectedId(null);
      return;
    }
    const coords = getMouseCoords(e);
    setSelectedId(id === 'light' ? null : id);
    if (id === 'light') {
      setDragging({ id, offsetX: coords.x - lightSource.x, offsetY: coords.y - lightSource.y });
    } else {
      const el = elements.find((el) => el.id === id);
      if (el) setDragging({ id, offsetX: coords.x - el.x, offsetY: coords.y - el.y });
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

  const handlePointerUp = () => setDragging(null);

  const addElement = (type: B1ElementType) => {
    const newEl: B1OpticElement = {
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
    <div className="flex h-full w-full bg-slate-950">
      <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col z-10">
        <div className="p-6 flex-1 overflow-y-auto space-y-8">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Environment</h3>
            <div className="flex items-center justify-between bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button onClick={() => setMode('ray')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'ray' ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}>Ray Model</button>
              <button onClick={() => setMode('wave')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'wave' ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}>Wave Model</button>
            </div>
            <div className="space-y-2">
              <label className="flex justify-between text-sm font-medium text-slate-300">Light Angle <span>{lightSource.angle}°</span></label>
              <input type="range" min="-90" max="90" value={lightSource.angle} onChange={(e) => setLightSource({ ...lightSource, angle: Number(e.target.value) })} className="w-full accent-blue-500" />
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Add Elements</h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => addElement('lens')} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm font-medium text-slate-200 hover:bg-slate-700 transition-all">
                + Lens
              </button>
              <button onClick={() => addElement('mirror')} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm font-medium text-slate-200 hover:bg-slate-700 transition-all">
                + Mirror
              </button>
              <button onClick={() => addElement('block')} className="col-span-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm font-medium text-slate-200 hover:bg-slate-700 transition-all">
                + Glass Block
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 relative cursor-crosshair touch-none" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
        <svg ref={svgRef} className="w-full h-full" onPointerDown={(e) => handlePointerDown(e, 'bg')}>
          {rays.map((ray, i) => (
            <React.Fragment key={i}>
              <line x1={ray.start.x} y1={ray.start.y} x2={ray.end.x} y2={ray.end.y} stroke="#fde047" strokeWidth="2" opacity="0.8" />
              {mode === 'wave' && renderWavefronts(ray)}
            </React.Fragment>
          ))}
          {elements.map(el => {
            const isSelected = el.id === selectedId;
            const strokeColor = isSelected ? '#60a5fa' : '#475569';
            if (el.type === 'mirror') {
              const rad = (el.angle * Math.PI) / 180;
              const dx = Math.sin(rad) * (el.height / 2);
              const dy = -Math.cos(rad) * (el.height / 2);
              return <line key={el.id} x1={el.x - dx} y1={el.y - dy} x2={el.x + dx} y2={el.y + dy} stroke={strokeColor} strokeWidth="6" onPointerDown={(e) => handlePointerDown(e, el.id)} className="cursor-pointer" />;
            }
            if (el.type === 'lens') {
              return <ellipse key={el.id} cx={el.x} cy={el.y} rx={el.width/2} ry={el.height/2} fill="#38bdf8" fillOpacity="0.2" stroke={strokeColor} strokeWidth="2" onPointerDown={(e) => handlePointerDown(e, el.id)} className="cursor-pointer" />;
            }
            if (el.type === 'block') {
              return <rect key={el.id} x={el.x - el.width/2} y={el.y - el.height/2} width={el.width} height={el.height} fill="#818cf8" fillOpacity="0.15" stroke={strokeColor} strokeWidth="2" onPointerDown={(e) => handlePointerDown(e, el.id)} className="cursor-pointer" />;
            }
            return null;
          })}
          <g transform={`translate(${lightSource.x}, ${lightSource.y})`} onPointerDown={(e) => handlePointerDown(e, 'light')} className="cursor-pointer">
            <circle r="12" fill="#fef08a" fillOpacity="0.2" />
            <circle r="6" fill="#eab308" />
          </g>
          {annotations.map((ann, i) => (
            <g key={i}>
              <line x1={ann.point.x} y1={ann.point.y} x2={ann.point.x + ann.normal.x * 30} y2={ann.point.y + ann.normal.y * 30} stroke="#64748b" strokeDasharray="4 4" />
              <text x={ann.point.x + 10} y={ann.point.y - 10} fill="#94a3b8" fontSize="12" className="font-mono">{ann.textIn}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

// --- Block 2: Draggable Mirrors, Lenses ---

type B2ElementType = 'mirror' | 'convex' | 'concave' | 'medium';
interface B2OpticalElement { id: string; type: B2ElementType; x: number; y: number; rotation: number; width: number; height: number; }

function DraggableElementsModule() {
  const [elements, setElements] = useState<B2OpticalElement[]>([
    { id: '1', type: 'convex', x: 300, y: 200, rotation: 0, width: 40, height: 120 },
    { id: '2', type: 'mirror', x: 500, y: 150, rotation: 45, width: 10, height: 100 },
    { id: '3', type: 'medium', x: 150, y: 350, rotation: 0, width: 120, height: 80 },
  ]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [activeElement, setActiveElement] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: ReactPointerEvent, id: string, isRotationHandle: boolean = false) => {
    e.stopPropagation();
    setActiveElement(id);
    const el = elements.find((el) => el.id === id);
    if (!el) return;
    if (isRotationHandle) {
      setRotatingId(id);
    } else {
      setDraggingId(id);
      setDragOffset({ x: e.clientX - el.x, y: e.clientY - el.y });
    }
    if (e.target instanceof Element) e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent) => {
    if (draggingId) {
      setElements((prev) => prev.map((el) => el.id === draggingId ? { ...el, x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y } : el));
    } else if (rotatingId && boardRef.current) {
      const el = elements.find((e) => e.id === rotatingId);
      if (!el) return;
      const rect = boardRef.current.getBoundingClientRect();
      const centerX = el.x + el.width / 2;
      const centerY = el.y + el.height / 2;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const angle = Math.atan2(mouseY - centerY, mouseX - centerX) * (180 / Math.PI);
      setElements((prev) => prev.map((item) => item.id === rotatingId ? { ...item, rotation: angle + 90 } : item));
    }
  };

  const handlePointerUp = (e: ReactPointerEvent) => {
    setDraggingId(null);
    setRotatingId(null);
    if (e.target instanceof Element && e.target.hasPointerCapture(e.pointerId)) e.target.releasePointerCapture(e.pointerId);
  };

  const addElement = (type: B2ElementType) => {
    const newEl: B2OpticalElement = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      x: 200 + Math.random() * 100,
      y: 200 + Math.random() * 100,
      rotation: 0,
      width: type === 'medium' ? 100 : type === 'mirror' ? 20 : 40,
      height: type === 'medium' ? 100 : 120,
    };
    setElements([...elements, newEl]);
    setActiveElement(newEl.id);
  };

  const deleteActiveElement = () => {
    if (activeElement) {
      setElements(elements.filter(e => e.id !== activeElement));
      setActiveElement(null);
    }
  };

  const renderElementShape = (el: B2OpticalElement) => {
    const isSelected = activeElement === el.id;
    const strokeColor = isSelected ? '#3b82f6' : '#64748b';
    const strokeWidth = isSelected ? 2 : 1.5;
    switch (el.type) {
      case 'convex':
        return (
          <svg width={el.width} height={el.height} viewBox="0 0 40 120" className="overflow-visible">
            <path d="M 20 0 Q 40 60 20 120 Q 0 60 20 0 Z" fill="rgba(56, 189, 248, 0.15)" stroke={strokeColor} strokeWidth={strokeWidth} />
          </svg>
        );
      case 'concave':
        return (
          <svg width={el.width} height={el.height} viewBox="0 0 40 120" className="overflow-visible">
            <path d="M 0 0 Q 15 60 0 120 L 40 120 Q 25 60 40 0 Z" fill="rgba(56, 189, 248, 0.15)" stroke={strokeColor} strokeWidth={strokeWidth} />
          </svg>
        );
      case 'mirror':
        return (
          <svg width={el.width} height={el.height} viewBox="0 0 20 120" className="overflow-visible">
            <line x1="10" y1="0" x2="10" y2="120" stroke={strokeColor} strokeWidth="3" />
            {Array.from({ length: 12 }).map((_, i) => (
              <line key={i} x1="10" y1={i * 10 + 5} x2="18" y2={i * 10 + 10} stroke={strokeColor} strokeWidth="1" />
            ))}
          </svg>
        );
      case 'medium':
        return (
          <svg width={el.width} height={el.height} className="overflow-visible">
            <rect x="0" y="0" width={el.width} height={el.height} fill="rgba(56, 189, 248, 0.1)" stroke={strokeColor} strokeWidth={strokeWidth} />
          </svg>
        );
      default: return null;
    }
  };

  return (
    <div className="flex h-full w-full bg-slate-950">
      <div className="w-72 bg-slate-900 border-r border-slate-800 z-10 flex flex-col">
        <div className="p-6 flex-1 overflow-y-auto">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Components</h2>
          <div className="space-y-3">
            <button onClick={() => addElement('convex')} className="w-full flex items-center p-3 rounded-lg border border-slate-800 hover:border-blue-500 hover:bg-slate-800 transition-colors group">
              <div className="w-8 h-8 flex items-center justify-center mr-3 opacity-70 group-hover:opacity-100">
                <svg width="16" height="24" viewBox="0 0 20 40"><path d="M 10 0 Q 20 20 10 40 Q 0 20 10 0 Z" fill="rgba(56,189,248,0.2)" stroke="#3b82f6" strokeWidth="1.5" /></svg>
              </div>
              <span className="font-medium text-slate-300">Convex Lens</span>
            </button>
            <button onClick={() => addElement('concave')} className="w-full flex items-center p-3 rounded-lg border border-slate-800 hover:border-blue-500 hover:bg-slate-800 transition-colors group">
              <div className="w-8 h-8 flex items-center justify-center mr-3 opacity-70 group-hover:opacity-100">
                <svg width="16" height="24" viewBox="0 0 20 40"><path d="M 0 0 Q 8 20 0 40 L 20 40 Q 12 20 20 0 Z" fill="rgba(56,189,248,0.2)" stroke="#3b82f6" strokeWidth="1.5" /></svg>
              </div>
              <span className="font-medium text-slate-300">Concave Lens</span>
            </button>
            <button onClick={() => addElement('mirror')} className="w-full flex items-center p-3 rounded-lg border border-slate-800 hover:border-blue-500 hover:bg-slate-800 transition-colors group">
              <div className="w-8 h-8 flex items-center justify-center mr-3 opacity-70 group-hover:opacity-100">
                <svg width="12" height="24" viewBox="0 0 12 40">
                  <line x1="4" y1="0" x2="4" y2="40" stroke="#3b82f6" strokeWidth="2" />
                  <line x1="4" y1="5" x2="10" y2="10" stroke="#3b82f6" strokeWidth="1" />
                  <line x1="4" y1="15" x2="10" y2="20" stroke="#3b82f6" strokeWidth="1" />
                  <line x1="4" y1="25" x2="10" y2="30" stroke="#3b82f6" strokeWidth="1" />
                  <line x1="4" y1="35" x2="10" y2="40" stroke="#3b82f6" strokeWidth="1" />
                </svg>
              </div>
              <span className="font-medium text-slate-300">Plane Mirror</span>
            </button>
            <button onClick={() => addElement('medium')} className="w-full flex items-center p-3 rounded-lg border border-slate-800 hover:border-blue-500 hover:bg-slate-800 transition-colors group">
              <div className="w-8 h-8 flex items-center justify-center mr-3 opacity-70 group-hover:opacity-100">
                <rect width="20" height="20" fill="rgba(56,189,248,0.2)" stroke="#3b82f6" strokeWidth="1.5" />
              </div>
              <span className="font-medium text-slate-300">Glass Block</span>
            </button>
          </div>
          {activeElement && (
            <div className="mt-8 p-4 bg-slate-950 rounded-lg border border-slate-800">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Properties</h3>
              <div className="text-sm text-slate-400 mb-4">Selected: {elements.find(e => e.id === activeElement)?.type}</div>
              <button onClick={deleteActiveElement} className="w-full py-2 px-4 bg-red-900/30 text-red-400 rounded border border-red-900/50 hover:bg-red-900/50 transition-colors text-sm font-medium">Remove Element</button>
            </div>
          )}
        </div>
      </div>
      <div 
        className="flex-1 relative cursor-crosshair touch-none"
        ref={boardRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={() => setActiveElement(null)}
        style={{ backgroundImage: `linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)`, backgroundSize: '20px 20px', backgroundPosition: '-1px -1px' }}
      >
        {elements.map((el) => {
          const isSelected = activeElement === el.id;
          return (
            <div
              key={el.id}
              className="absolute touch-none select-none"
              style={{ left: el.x, top: el.y, width: el.width, height: el.height, transform: `rotate(${el.rotation}deg)`, transformOrigin: 'center center', cursor: draggingId === el.id ? 'grabbing' : 'grab', zIndex: isSelected ? 10 : 1 }}
              onPointerDown={(e) => handlePointerDown(e, el.id)}
            >
              {renderElementShape(el)}
              {isSelected && (
                <div className="absolute left-1/2 -top-8 w-6 h-6 -ml-3 bg-slate-800 border-2 border-blue-500 rounded-full cursor-alias flex items-center justify-center shadow-sm hover:scale-110 transition-transform" onPointerDown={(e) => handlePointerDown(e, el.id, true)}>
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <div className="absolute top-full left-1/2 w-px h-6 bg-blue-500/50 -ml-[0.5px]" />
                </div>
              )}
              {isSelected && <div className="absolute inset-0 border border-blue-500/50 border-dashed pointer-events-none -m-1" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Block 3: Snell's Law Angles ---

function SnellsLawModule() {
  const [theta1Deg, setTheta1Deg] = useState<number>(45);
  const [n1, setN1] = useState<number>(1.0);
  const [n2, setN2] = useState<number>(1.5);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const theta1Rad = (theta1Deg * Math.PI) / 180;
  const sinTheta2 = (n1 / n2) * Math.sin(theta1Rad);
  const isTIR = Math.abs(sinTheta2) > 1.0;
  const theta2Rad = isTIR ? 0 : Math.asin(sinTheta2);
  const theta2Deg = isTIR ? 0 : (theta2Rad * 180) / Math.PI;
  const RAY_LENGTH = 250;
  const ARC_RADIUS = 50;

  const handlePointerDown = (e: ReactPointerEvent<SVGCircleElement>) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!isDragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    let angleRad = Math.atan2(Math.abs(dx), -dy);
    let angleDeg = (angleRad * 180) / Math.PI;
    if (angleDeg < 0) angleDeg = 0;
    if (angleDeg > 89.9) angleDeg = 89.9;
    setTheta1Deg(angleDeg);
  };

  const handlePointerUp = () => setIsDragging(false);

  const getMediumName = (n: number) => {
    if (n === 1.0) return 'Vacuum / Air';
    if (n === 1.33) return 'Water';
    if (n === 1.5) return 'Crown Glass';
    if (n === 2.42) return 'Diamond';
    return 'Custom Medium';
  };

  const getMediumColor = (n: number) => {
    const baseOpacity = Math.min(0.8, (n - 1) * 0.3);
    return `rgba(51, 65, 85, ${baseOpacity})`;
  };

  return (
    <div className="h-full w-full bg-slate-950 p-4 md:p-8 flex flex-col items-center overflow-y-auto">
      <div className="w-full max-w-6xl bg-slate-900 shadow-2xl rounded-sm border border-slate-800 overflow-hidden flex flex-col relative">
        <div className="border-b border-slate-800 bg-slate-900 p-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 relative z-10">
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-100 tracking-tight">Snell's Law</h1>
            <p className="text-slate-400 font-mono text-sm mt-1 uppercase tracking-widest">Experiment 03: Refraction</p>
          </div>
        </div>
        <div className="flex flex-col lg:flex-row flex-1">
          <div className="w-full lg:w-2/3 relative border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-950 overflow-hidden min-h-[500px]">
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-10" xmlns="http://www.w3.org/2000/svg">
              <defs><pattern id="grid3" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#3b82f6" strokeWidth="1"/></pattern></defs>
              <rect width="100%" height="100%" fill="url(#grid3)" />
            </svg>
            <svg ref={svgRef} className="w-full h-full touch-none" viewBox="-300 -300 600 600" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
              <rect x="-300" y="-300" width="600" height="300" fill={getMediumColor(n1)} />
              <rect x="-300" y="0" width="600" height="300" fill={getMediumColor(n2)} />
              <line x1="-300" y1="0" x2="300" y2="0" stroke="#475569" strokeWidth="3" />
              <line x1="0" y1="-280" x2="0" y2="280" stroke="#64748b" strokeWidth="2" strokeDasharray="8 8" />
              <text x="10" y="-270" className="font-mono text-xs fill-slate-500">Normal</text>
              <path d={`M 0 -${ARC_RADIUS} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 0 ${-ARC_RADIUS * Math.sin(theta1Rad)} ${-ARC_RADIUS * Math.cos(theta1Rad)}`} fill="none" stroke="#ef4444" strokeWidth="2" />
              <text x={-ARC_RADIUS * Math.sin(theta1Rad / 2) - 15} y={-ARC_RADIUS * Math.cos(theta1Rad / 2) - 10} className="font-serif italic text-sm fill-red-400 font-bold">θ₁</text>
              {!isTIR && (
                <>
                  <path d={`M 0 ${ARC_RADIUS} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 0 ${ARC_RADIUS * Math.sin(theta2Rad)} ${ARC_RADIUS * Math.cos(theta2Rad)}`} fill="none" stroke="#3b82f6" strokeWidth="2" />
                  <text x={ARC_RADIUS * Math.sin(theta2Rad / 2) + 10} y={ARC_RADIUS * Math.cos(theta2Rad / 2) + 20} className="font-serif italic text-sm fill-blue-400 font-bold">θ₂</text>
                </>
              )}
              <line x1={-RAY_LENGTH * Math.sin(theta1Rad)} y1={-RAY_LENGTH * Math.cos(theta1Rad)} x2="0" y2="0" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
              <g transform={`translate(${-RAY_LENGTH * Math.sin(theta1Rad)}, ${-RAY_LENGTH * Math.cos(theta1Rad)})`} className="cursor-grab active:cursor-grabbing" onPointerDown={handlePointerDown}>
                <circle r="16" fill="#450a0a" stroke="#ef4444" strokeWidth="3" className="hover:scale-110 transition-transform" />
                <circle r="6" fill="#ef4444" />
                <polygon points="-4,-6 4,-6 0,8" fill="#ef4444" transform={`rotate(${180 - theta1Deg}) translate(0, 25)`} />
              </g>
              <line x1="0" y1="0" x2={RAY_LENGTH * Math.sin(theta1Rad)} y2={-RAY_LENGTH * Math.cos(theta1Rad)} stroke="#f97316" strokeWidth={isTIR ? 4 : 2} strokeDasharray={isTIR ? "none" : "6 4"} strokeLinecap="round" opacity={isTIR ? 1 : 0.6} />
              {!isTIR && <line x1="0" y1="0" x2={RAY_LENGTH * Math.sin(theta2Rad)} y2={RAY_LENGTH * Math.cos(theta2Rad)} stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" />}
              {isTIR && <text x="0" y="150" textAnchor="middle" className="font-mono text-lg fill-red-500 font-bold tracking-widest">TOTAL INTERNAL REFLECTION</text>}
            </svg>
            <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur px-3 py-1 rounded border border-slate-800 shadow-sm pointer-events-none">
              <p className="font-mono text-xs text-slate-400">Medium 1: <span className="font-bold text-slate-200">{getMediumName(n1)}</span> (n₁ = {n1.toFixed(2)})</p>
            </div>
            <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur px-3 py-1 rounded border border-slate-800 shadow-sm pointer-events-none">
              <p className="font-mono text-xs text-slate-400">Medium 2: <span className="font-bold text-slate-200">{getMediumName(n2)}</span> (n₂ = {n2.toFixed(2)})</p>
            </div>
          </div>
          <div className="w-full lg:w-1/3 bg-slate-900 p-6 flex flex-col gap-8">
            <div className="space-y-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800 pb-2">Parameters</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>Incident Angle (θ₁)</label>
                  <span className="font-mono text-sm bg-slate-950 px-2 py-1 rounded border border-slate-800 shadow-sm w-16 text-right text-slate-200">{theta1Deg.toFixed(1)}°</span>
                </div>
                <input type="range" min="0" max="89.9" step="0.1" value={theta1Deg} onChange={(e) => setTheta1Deg(parseFloat(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-slate-300">Refractive Index (n₁)</label>
                  <span className="font-mono text-sm bg-slate-950 px-2 py-1 rounded border border-slate-800 shadow-sm w-16 text-right text-slate-200">{n1.toFixed(2)}</span>
                </div>
                <input type="range" min="1.0" max="3.0" step="0.01" value={n1} onChange={(e) => setN1(parseFloat(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-400" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-slate-300">Refractive Index (n₂)</label>
                  <span className="font-mono text-sm bg-slate-950 px-2 py-1 rounded border border-slate-800 shadow-sm w-16 text-right text-slate-200">{n2.toFixed(2)}</span>
                </div>
                <input type="range" min="1.0" max="3.0" step="0.01" value={n2} onChange={(e) => setN2(parseFloat(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              </div>
            </div>
            <div className="mt-auto space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800 pb-2">Observation Notes</h2>
              <div className="bg-slate-950 p-4 rounded-md border border-slate-800 shadow-sm font-serif text-lg text-center relative overflow-hidden">
                <div className="mb-2 text-slate-500 text-sm italic">Snell's Law</div>
                <div className="flex items-center justify-center gap-2 text-slate-200">
                  <span>n₁</span><span className="text-red-400">sin(θ₁)</span><span>=</span><span>n₂</span><span className="text-blue-400">sin(θ₂)</span>
                </div>
                <div className="my-3 border-t border-slate-800"></div>
                <div className="flex flex-col gap-1 font-mono text-sm text-slate-400 text-left">
                  <div className="flex justify-between"><span>{n1.toFixed(2)} × sin({theta1Deg.toFixed(1)}°)</span><span>= {(n1 * Math.sin(theta1Rad)).toFixed(3)}</span></div>
                  <div className="flex justify-between"><span>{n2.toFixed(2)} × sin({isTIR ? 'ERR' : theta2Deg.toFixed(1)}°)</span><span>= {isTIR ? '> 1.0 (TIR)' : (n2 * Math.sin(theta2Rad)).toFixed(3)}</span></div>
                </div>
              </div>
              <div className={`p-4 rounded-md border font-mono text-sm flex flex-col items-center justify-center text-center transition-colors ${isTIR ? 'bg-red-950/30 border-red-900 text-red-400' : 'bg-blue-950/30 border-blue-900 text-blue-400'}`}>
                <span className="uppercase text-xs font-bold opacity-70 mb-1">Resulting Angle</span>
                <span className="text-2xl font-bold">{isTIR ? 'T.I.R.' : `θ₂ = ${theta2Deg.toFixed(1)}°`}</span>
                {!isTIR && n1 > n2 && <span className="text-xs mt-2 opacity-80">Critical Angle: {(Math.asin(n2/n1) * 180 / Math.PI).toFixed(1)}°</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Block 4: Focal Length Slider ---

function FocalLengthModule() {
  const [focalLength, setFocalLength] = useState<number>(150);
  const width = 800;
  const height = 500;
  const cx = width / 2;
  const cy = height / 2;
  const rayOffsets = [-120, -60, 0, 60, 120];

  const lensPath = useMemo(() => {
    if (focalLength === 0) return `M ${cx - 10} 50 L ${cx + 10} 50 L ${cx + 10} 450 L ${cx - 10} 450 Z`;
    if (focalLength > 0) {
      const curve = Math.min(120, 15000 / focalLength);
      return `M ${cx} 50 Q ${cx + curve} ${cy} ${cx} 450 Q ${cx - curve} ${cy} ${cx} 50`;
    }
    const w = Math.min(40, 15000 / Math.abs(focalLength));
    return `M ${cx - w} 50 L ${cx + w} 50 Q ${cx} ${cy} ${cx + w} 450 L ${cx - w} 450 Q ${cx} ${cy} ${cx - w} 50`;
  }, [focalLength, cx, cy]);

  return (
    <div className="h-full w-full bg-slate-950 p-8 flex flex-col items-center overflow-y-auto">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 shadow-2xl rounded-lg overflow-hidden flex flex-col">
        <div className="border-b border-slate-800 bg-slate-900 p-4 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight uppercase flex items-center gap-3 text-slate-100">
              <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded-sm text-xl">Lab 04</span>
              Focal Length
            </h1>
            <p className="text-slate-400 font-mono text-sm mt-1">Experiment: Refraction & Lens Behavior</p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-1/3 border-r border-slate-800 p-6 bg-slate-900 flex flex-col gap-8">
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-md">
              <h2 className="font-bold text-lg mb-4 border-b border-slate-800 pb-2 text-slate-200">Lens Parameters</h2>
              <div className="flex flex-col gap-2">
                <label className="flex justify-between font-mono text-sm font-semibold text-slate-300">
                  <span>Focal Length (f)</span>
                  <span className="text-blue-400">{focalLength > 0 ? '+' : ''}{focalLength} mm</span>
                </label>
                <input type="range" min="-300" max="300" step="10" value={focalLength} onChange={(e) => setFocalLength(Number(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                <div className="flex justify-between text-xs font-mono text-slate-500 mt-1">
                  <span>Concave (-)</span><span>Flat</span><span>Convex (+)</span>
                </div>
              </div>
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-lg mb-2 flex items-center gap-2 text-slate-200">Lab Notes</h2>
              <div className="font-mono text-sm text-slate-300 space-y-3 bg-slate-950 p-4 border border-slate-800 rounded-md h-full">
                <p><strong>Lens Type:</strong> {focalLength > 0 ? 'Convex (Converging)' : focalLength < 0 ? 'Concave (Diverging)' : 'Planar (Neutral)'}</p>
                <p><strong>Behavior:</strong> Parallel incident rays are refracted {focalLength > 0 ? 'towards' : focalLength < 0 ? 'away from' : 'straight through'} the optical axis.</p>
                {focalLength !== 0 && <p><strong>Focal Point:</strong> Rays {focalLength > 0 ? 'intersect at' : 'appear to originate from'} f = {focalLength}mm.</p>}
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <span className="block text-xs text-slate-500 mb-1">Lens Maker's Equation:</span>
                  <code className="bg-slate-900 px-2 py-1 rounded border border-slate-800 text-xs text-slate-400">1/f = (n-1)(1/R₁ - 1/R₂)</code>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full md:w-2/3 relative bg-slate-950 overflow-hidden min-h-[500px]">
            <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="block">
              <defs>
                <pattern id="grid4" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="1" /></pattern>
                <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#ef4444" /></marker>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid4)" />
              <line x1="0" y1={cy} x2={width} y2={cy} stroke="#475569" strokeWidth="2" strokeDasharray="10 5" />
              <text x="10" y={cy - 10} className="font-mono text-xs fill-slate-500">Optical Axis</text>
              {focalLength !== 0 && (
                <>
                  <circle cx={cx + focalLength} cy={cy} r="4" fill="#38bdf8" />
                  <text x={cx + focalLength - 5} y={cy + 20} className="font-mono text-sm font-bold fill-slate-300">F</text>
                  <circle cx={cx - focalLength} cy={cy} r="4" fill="#38bdf8" />
                  <text x={cx - focalLength - 5} y={cy + 20} className="font-mono text-sm font-bold fill-slate-300">F'</text>
                </>
              )}
              <path d={lensPath} fill="#38bdf8" fillOpacity="0.2" stroke="#38bdf8" strokeWidth="3" className="transition-all duration-300 ease-in-out" />
              <line x1={cx} y1="20" x2={cx} y2={height - 20} stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
              {rayOffsets.map((offset, index) => {
                const yi = cy + offset;
                const m = focalLength === 0 ? 0 : -offset / focalLength;
                const xMid = cx + (width - cx) / 2;
                const yMid = yi + m * (xMid - cx);
                const yEnd = yi + m * (width - cx);
                return (
                  <g key={`ray-${index}`}>
                    <line x1="0" y1={yi} x2={cx / 2} y2={yi} stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowhead)" />
                    <line x1={cx / 2} y1={yi} x2={cx} y2={yi} stroke="#ef4444" strokeWidth="2" />
                    <line x1={cx} y1={yi} x2={xMid} y2={yMid} stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowhead)" />
                    <line x1={xMid} y1={yMid} x2={width} y2={yEnd} stroke="#ef4444" strokeWidth="2" />
                    {focalLength < 0 && offset !== 0 && <line x1={cx} y1={yi} x2={cx + focalLength} y2={cy} stroke="#64748b" strokeWidth="2" strokeDasharray="6 4" />}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Block 5: Wave/Particle Toggle ---

type Mode = 'wave' | 'particle';
interface Particle { x: number; y: number; vx: number; vy: number; active: boolean; }

function WaveParticleModule() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const [mode, setMode] = useState<Mode>('wave');
  const [slitSeparation, setSlitSeparation] = useState<number>(80);
  const [wavelength, setWavelength] = useState<number>(25);
  const [isAnimating, setIsAnimating] = useState<boolean>(true);
  const timeRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const histogramRef = useRef<number[]>(new Array(150).fill(0));

  useEffect(() => {
    histogramRef.current = new Array(150).fill(0);
    particlesRef.current = [];
  }, [mode, slitSeparation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;
    const sourceX = 50;
    const sourceY = H / 2;
    const barrierX = W / 2;
    const screenX = W - 100;
    const slitWidth = 15;

    const render = () => {
      if (!isAnimating) {
        requestRef.current = requestAnimationFrame(render);
        return;
      }
      timeRef.current += 1;
      const t = timeRef.current;
      ctx.clearRect(0, 0, W, H);
      const slit1Y = H / 2 - slitSeparation / 2;
      const slit2Y = H / 2 + slitSeparation / 2;

      ctx.fillStyle = mode === 'wave' ? '#3b82f6' : '#ef4444';
      ctx.beginPath();
      ctx.arc(sourceX, sourceY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '12px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Source', sourceX - 20, sourceY - 15);

      ctx.fillStyle = '#334155';
      ctx.fillRect(barrierX - 5, 0, 10, slit1Y - slitWidth / 2);
      ctx.fillRect(barrierX - 5, slit1Y + slitWidth / 2, 10, slitSeparation - slitWidth);
      ctx.fillRect(barrierX - 5, slit2Y + slitWidth / 2, 10, H - (slit2Y + slitWidth / 2));
      ctx.fillText('Double Slit', barrierX - 35, 20);

      ctx.fillStyle = '#64748b';
      ctx.fillRect(screenX, 0, 4, H);
      ctx.fillText('Detector', screenX - 25, 20);

      if (mode === 'wave') {
        const waveSpeed = 1.5;
        const phaseOffset = t * waveSpeed;
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
        for (let r = phaseOffset % wavelength; r < (barrierX - sourceX); r += wavelength) {
          ctx.beginPath();
          ctx.arc(sourceX, sourceY, r, -Math.PI / 3, Math.PI / 3);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)';
        const maxRadius = Math.hypot(screenX - barrierX, H);
        for (let r = phaseOffset % wavelength; r < maxRadius; r += wavelength) {
          ctx.beginPath(); ctx.arc(barrierX, slit1Y, r, -Math.PI / 2, Math.PI / 2); ctx.stroke();
          ctx.beginPath(); ctx.arc(barrierX, slit2Y, r, -Math.PI / 2, Math.PI / 2); ctx.stroke();
        }
        for (let y = 0; y < H; y += 2) {
          const d1 = Math.hypot(screenX - barrierX, y - slit1Y);
          const d2 = Math.hypot(screenX - barrierX, y - slit2Y);
          const delta = Math.abs(d1 - d2);
          const phase = (delta / wavelength) * Math.PI;
          const intensity = Math.pow(Math.cos(phase), 2);
          ctx.fillStyle = `rgba(59, 130, 246, ${intensity * 0.9})`;
          ctx.fillRect(screenX + 4, y, intensity * 60, 2);
        }
      } else {
        for (let i = 0; i < 3; i++) {
          const targetY = H/2 + (Math.random() - 0.5) * (slitSeparation + 60);
          const angle = Math.atan2(targetY - sourceY, barrierX - sourceX);
          const speed = 4 + Math.random() * 2;
          particlesRef.current.push({ x: sourceX, y: sourceY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, active: true });
        }
        ctx.fillStyle = '#ef4444';
        const binSize = H / histogramRef.current.length;
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          if (!p.active) continue;
          p.x += p.vx;
          p.y += p.vy;
          if (p.x >= barrierX - 5 && p.x <= barrierX + 5) {
            const inSlit1 = Math.abs(p.y - slit1Y) < slitWidth / 2;
            const inSlit2 = Math.abs(p.y - slit2Y) < slitWidth / 2;
            if (!inSlit1 && !inSlit2) { p.active = false; continue; }
          }
          if (p.x >= screenX) {
            p.active = false;
            const binIndex = Math.floor(p.y / binSize);
            if (binIndex >= 0 && binIndex < histogramRef.current.length) histogramRef.current[binIndex] += 1;
            continue;
          }
          ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2); ctx.fill();
        }
        if (t % 60 === 0) particlesRef.current = particlesRef.current.filter(p => p.active);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
        for (let i = 0; i < histogramRef.current.length; i++) {
          const count = histogramRef.current[i];
          if (count > 0) {
            const barLength = Math.min(count * 0.5, 80);
            ctx.fillRect(screenX + 4, i * binSize, barLength, binSize + 0.5);
          }
        }
      }
      requestRef.current = requestAnimationFrame(render);
    };
    requestRef.current = requestAnimationFrame(render);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [mode, slitSeparation, wavelength, isAnimating]);

  return (
    <div className="h-full w-full bg-slate-950 text-slate-200 font-mono p-4 md:p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto relative z-10">
        <header className="mb-8 border-b border-slate-800 pb-4">
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 mb-2">Wave-Particle Duality</h1>
          <p className="text-slate-400 text-sm max-w-2xl">Investigate the nature of light using the classic double-slit experiment.</p>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-6 bg-slate-900 p-5 rounded-sm border border-slate-800 shadow-sm relative">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Model Toggle</h2>
              <div className="flex bg-slate-950 p-1 rounded-md border border-slate-800">
                <button onClick={() => setMode('wave')} className={`flex-1 py-2 text-sm font-semibold rounded transition-colors ${mode === 'wave' ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}>Wave</button>
                <button onClick={() => setMode('particle')} className={`flex-1 py-2 text-sm font-semibold rounded transition-colors ${mode === 'particle' ? 'bg-slate-800 text-red-400' : 'text-slate-500 hover:text-slate-300'}`}>Particle</button>
              </div>
            </div>
            <div className="space-y-5 pt-4 border-t border-slate-800">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Parameters</h2>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">Slit Separation</label>
                  <span className="text-xs text-slate-500">{slitSeparation} nm</span>
                </div>
                <input type="range" min="30" max="120" value={slitSeparation} onChange={(e) => setSlitSeparation(Number(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-400" />
              </div>
              <div className={`transition-opacity duration-300 ${mode === 'particle' ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                <div className="flex justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">Wavelength (λ)</label>
                  <span className="text-xs text-slate-500">{wavelength} nm</span>
                </div>
                <input type="range" min="15" max="50" value={wavelength} onChange={(e) => setWavelength(Number(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              </div>
            </div>
            <div className="pt-4 border-t border-slate-800">
              <button onClick={() => setIsAnimating(!isAnimating)} className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded transition-colors">
                {isAnimating ? 'Pause Simulation' : 'Resume Simulation'}
              </button>
              {mode === 'particle' && (
                <button onClick={() => { histogramRef.current = new Array(150).fill(0); }} className="w-full mt-2 py-2 px-4 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 text-sm font-semibold rounded transition-colors">
                  Clear Detector
                </button>
              )}
            </div>
          </div>
          <div className="lg:col-span-3 bg-slate-950 rounded-sm border border-slate-800 shadow-sm overflow-hidden flex items-center justify-center min-h-[500px]">
            <canvas ref={canvasRef} className="w-full h-full block" />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main App Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('ray');

  const tabs = [
    { id: 'ray', label: 'Ray Diagram' },
    { id: 'draggable', label: 'Draggable Elements' },
    { id: 'snell', label: "Snell's Law" },
    { id: 'focal', label: 'Focal Length' },
    { id: 'wave', label: 'Wave/Particle' },
  ];

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 font-sans overflow-hidden">
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-50 shrink-0">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Optics Lab
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex-1 relative overflow-hidden">
        {activeTab === 'ray' && <RayDiagramModule />}
        {activeTab === 'draggable' && <DraggableElementsModule />}
        {activeTab === 'snell' && <SnellsLawModule />}
        {activeTab === 'focal' && <FocalLengthModule />}
        {activeTab === 'wave' && <WaveParticleModule />}
      </div>
    </div>
  );
}