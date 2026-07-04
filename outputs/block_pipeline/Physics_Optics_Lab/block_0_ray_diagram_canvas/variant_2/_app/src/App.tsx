import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// --- Types ---
type Point = { x: number; y: number };
type Vector = { x: number; y: number };

type ObjectType = 'source' | 'lens' | 'mirror' | 'medium';

interface BaseObject {
  id: string;
  type: ObjectType;
  x: number;
  y: number;
}

interface SourceObject extends BaseObject {
  type: 'source';
  angle: number; // in degrees
}

interface LensObject extends BaseObject {
  type: 'lens';
  focalLength: number; // positive for convex, negative for concave
  height: number;
}

interface MirrorObject extends BaseObject {
  type: 'mirror';
  angle: number; // in degrees
  length: number;
}

interface MediumObject extends BaseObject {
  type: 'medium';
  width: number;
  height: number;
  ior: number; // Index of Refraction
}

type OpticObject = SourceObject | LensObject | MirrorObject | MediumObject;

type RaySegment = {
  start: Point;
  end: Point;
  intensity: number;
};

// --- Math Helpers ---
const deg2rad = (deg: number) => (deg * Math.PI) / 180;
const rad2deg = (rad: number) => (rad * 180) / Math.PI;
const normalize = (v: Vector): Vector => {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
};
const dot = (v1: Vector, v2: Vector) => v1.x * v2.x + v1.y * v2.y;
const distance = (p1: Point, p2: Point) => Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);

// Line-line intersection
function intersectSegments(
  p1: Point, p2: Point,
  p3: Point, p4: Point
): { point: Point; t: number; normal: Vector } | null {
  const den = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(den) < 1e-6) return null; // parallel

  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / den;
  const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / den;

  if (t > 1e-4 && u >= 0 && u <= 1) { // t > epsilon to avoid self-intersection
    const pt = { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
    // Normal to segment p3-p4
    const dx = p4.x - p3.x;
    const dy = p4.y - p3.y;
    let normal = normalize({ x: -dy, y: dx });
    return { point: pt, t, normal };
  }
  return null;
}

const reflect = (dir: Vector, normal: Vector): Vector => {
  const dDotN = dot(dir, normal);
  return {
    x: dir.x - 2 * dDotN * normal.x,
    y: dir.y - 2 * dDotN * normal.y,
  };
};

const refract = (dir: Vector, normal: Vector, n1: number, n2: number): Vector => {
  const r = n1 / n2;
  const c = -dot(normal, dir);
  const rad = 1 - r * r * (1 - c * c);
  
  if (rad < 0) {
    // Total Internal Reflection
    return reflect(dir, normal);
  }
  
  const coeff = r * c - Math.sqrt(rad);
  return {
    x: r * dir.x + coeff * normal.x,
    y: r * dir.y + coeff * normal.y,
  };
};

// --- Main Component ---
export default function App() {
  // State
  const [objects, setObjects] = useState<OpticObject[]>([
    { id: 'src1', type: 'source', x: 100, y: 300, angle: 0 },
    { id: 'lens1', type: 'lens', x: 400, y: 300, height: 200, focalLength: 150 },
    { id: 'mirror1', type: 'mirror', x: 750, y: 300, length: 150, angle: 45 },
    { id: 'med1', type: 'medium', x: 400, y: 550, width: 200, height: 100, ior: 1.5 },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [mode, setMode] = useState<'wave' | 'particle'>('wave');
  const [showNormals, setShowNormals] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);

  // --- Raytracing Engine ---
  const rays = useMemo(() => {
    let segments: RaySegment[] = [];
    let normalsToDraw: { start: Point; end: Point }[] = [];
    const MAX_BOUNCES = 15;

    const sources = objects.filter((o): o is SourceObject => o.type === 'source');
    
    sources.forEach(source => {
      let currentPt = { x: source.x, y: source.y };
      let currentDir = { x: Math.cos(deg2rad(source.angle)), y: Math.sin(deg2rad(source.angle)) };
      let intensity = 1.0;

      for (let bounce = 0; bounce < MAX_BOUNCES; bounce++) {
        let closestHit: { pt: Point; t: number; obj: OpticObject; normal: Vector; extra?: any } | null = null;

        // Find intersections with all objects
        objects.forEach(obj => {
          if (obj.id === source.id && bounce === 0) return;

          if (obj.type === 'mirror') {
            const m = obj as MirrorObject;
            const dx = Math.cos(deg2rad(m.angle)) * m.length / 2;
            const dy = Math.sin(deg2rad(m.angle)) * m.length / 2;
            const p3 = { x: m.x - dx, y: m.y - dy };
            const p4 = { x: m.x + dx, y: m.y + dy };
            
            // Ray is a long segment
            const p2 = { x: currentPt.x + currentDir.x * 2000, y: currentPt.y + currentDir.y * 2000 };
            const hit = intersectSegments(currentPt, p2, p3, p4);
            
            if (hit && (!closestHit || hit.t < closestHit.t)) {
              closestHit = { pt: hit.point, t: hit.t, obj, normal: hit.normal };
            }
          } 
          else if (obj.type === 'lens') {
            const l = obj as LensObject;
            // Approximate lens as a vertical line segment
            const p3 = { x: l.x, y: l.y - l.height / 2 };
            const p4 = { x: l.x, y: l.y + l.height / 2 };
            
            const p2 = { x: currentPt.x + currentDir.x * 2000, y: currentPt.y + currentDir.y * 2000 };
            const hit = intersectSegments(currentPt, p2, p3, p4);

            if (hit && (!closestHit || hit.t < closestHit.t)) {
              closestHit = { pt: hit.point, t: hit.t, obj, normal: hit.normal, extra: { hitY: hit.point.y - l.y } };
            }
          }
          else if (obj.type === 'medium') {
            const m = obj as MediumObject;
            const hw = m.width / 2;
            const hh = m.height / 2;
            
            // 4 boundaries. Enforce clockwise winding so normals point OUTWARDS.
            const edges = [
              [{ x: m.x - hw, y: m.y - hh }, { x: m.x + hw, y: m.y - hh }], // Top
              [{ x: m.x + hw, y: m.y - hh }, { x: m.x + hw, y: m.y + hh }], // Right
              [{ x: m.x + hw, y: m.y + hh }, { x: m.x - hw, y: m.y + hh }], // Bottom
              [{ x: m.x - hw, y: m.y + hh }, { x: m.x - hw, y: m.y - hh }], // Left
            ];

            const p2 = { x: currentPt.x + currentDir.x * 2000, y: currentPt.y + currentDir.y * 2000 };

            edges.forEach(edge => {
              const hit = intersectSegments(currentPt, p2, edge[0], edge[1]);
              if (hit && (!closestHit || hit.t < closestHit.t)) {
                closestHit = { pt: hit.point, t: hit.t, obj, normal: hit.normal };
              }
            });
          }
        });

        if (closestHit) {
          const hit = closestHit as NonNullable<typeof closestHit>;
          segments.push({ start: currentPt, end: hit.pt, intensity });

          if (showNormals) {
            normalsToDraw.push({
              start: hit.pt,
              end: { x: hit.pt.x + hit.normal.x * 30, y: hit.pt.y + hit.normal.y * 30 }
            });
          }

          // Calculate new direction
          if (hit.obj.type === 'mirror') {
            currentDir = reflect(currentDir, hit.normal);
            intensity *= 0.95; // slight loss
          } 
          else if (hit.obj.type === 'lens') {
            const l = hit.obj as LensObject;
            const h = hit.extra.hitY;
            // Thin lens paraxial approximation: delta_theta = -h / f
            // Assume ray enters from left or right.
            const incidentAngle = Math.atan2(currentDir.y, currentDir.x);
            
            // Adjust sign based on direction to handle rays from both sides roughly correctly
            const dirSign = Math.sign(currentDir.x) || 1;
            const deltaTheta = -(h / l.focalLength) * dirSign;
            
            const newAngle = incidentAngle + deltaTheta;
            currentDir = { x: Math.cos(newAngle), y: Math.sin(newAngle) };
          }
          else if (hit.obj.type === 'medium') {
            const m = hit.obj as MediumObject;
            // Determine if entering or exiting
            const dDotN = dot(currentDir, hit.normal);
            let n1 = 1.0; // Air
            let n2 = m.ior;
            let normalToUse = hit.normal;

            if (dDotN > 0) {
              // Ray is exiting (moving in same direction as OUTWARD normal)
              n1 = m.ior;
              n2 = 1.0;
              normalToUse = { x: -hit.normal.x, y: -hit.normal.y }; // Flip normal for refract math
            }

            currentDir = refract(currentDir, normalToUse, n1, n2);
            // If TIR occurred, refract returns reflected vector.
          }

          currentPt = { x: hit.pt.x + currentDir.x * 0.1, y: hit.pt.y + currentDir.y * 0.1 }; // Offset slightly to avoid immediate re-intersection
        } else {
          // No hit, go to infinity (or edge of screen)
          const endPt = { x: currentPt.x + currentDir.x * 2000, y: currentPt.y + currentDir.y * 2000 };
          segments.push({