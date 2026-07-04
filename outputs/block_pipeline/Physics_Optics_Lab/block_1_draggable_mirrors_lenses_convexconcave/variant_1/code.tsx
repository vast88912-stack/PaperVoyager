import React, { useState, useRef, useEffect } from 'react';
import { MousePointer2, Move, RotateCw, Plus, Trash2, Settings2, Info } from 'lucide-react';

// --- Types ---

type ElementType = 'mirror' | 'convex' | 'concave' | 'medium';

interface OpticalElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
  focalLength?: number;
  refractiveIndex?: number;
}

// --- Helper Components: Optical Shapes ---

const HatchPattern = () => (
  <defs>
    <pattern id="hatch" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="10" stroke="#94a3b8" strokeWidth="2" />
    </pattern>
  </defs>
);

const MirrorShape = ({ width, height }: { width: number; height: number }) => (
  <svg width={width} height={height} className="overflow-visible drop-shadow-md">
    <HatchPattern />
    <rect x="0" y="0" width={width} height={height} fill="url(#hatch)" />
    <line x1={width} y1="0" x2={width} y2={height} stroke="#334155" strokeWidth="4" />
  </svg>
);

const ConvexLensShape = ({ width, height }: { width: number; height: number }) => (
  <svg width={width} height={height} className="overflow-visible drop-shadow-md">
    <path
      d={`M ${width / 2} 0 Q ${width} ${height / 2} ${width / 2} ${height} Q 0 ${height / 2} ${width / 2} 0 Z`}
      fill="rgba(186, 230, 253, 0.4)"
      stroke="#0284c7"
      strokeWidth="2"
      style={{ backdropFilter: 'blur(4px)' }}
    />
  </svg>
);

const ConcaveLensShape = ({ width, height }: { width: number; height: number }) => (
  <svg width={width} height={height} className="overflow-visible drop-shadow-md">
    <path
      d={`M 0 0 Q ${width / 2} ${height / 2} 0 ${height} L ${width} ${height} Q ${width / 2} ${height / 2} ${width} 0 Z`}
      fill="rgba(186, 230, 253, 0.4)"
      stroke="#0284c7"
      strokeWidth="2"
      style={{ backdropFilter: 'blur(4px)' }}
    />
  </svg>
);

const RefractiveMediumShape = ({ width, height }: { width: number; height: number }) => (
  <svg width={width} height={height} className="overflow-visible drop-shadow-md">
    <rect
      x="0"
      y="0"
      width={width}
      height={height}
      fill="rgba(125, 211, 252, 0.3)"
      stroke="#0ea5e9"
      strokeWidth="2"
      rx="4"
      style={{ backdropFilter: 'blur(6px)' }}
    />
  </svg>
);

// --- Main Application Component ---

export default function App() {
  const [elements, setElements] = useState<OpticalElement[]>([
    { id: '1', type: 'convex', x: 300, y: 200, rotation: 0, width: 40, height: 120, focalLength: 50 },
    { id: '2', type: 'mirror', x: 500, y: 150, rotation: 45, width: 10, height: 100 },
    { id: '3', type: 'medium', x: 100, y: 300, rotation: 0, width: 150, height: 100, refractiveIndex: 1.5 },
  ]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Dragging state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    mode: 'move' | 'rotate' | null;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialRotation: number;
  }>({
    isDragging: false,
    mode: null,
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    initialRotation: 0,
  });

  // --- Handlers ---

  const handleAddElement = (type: ElementType) => {
    const newElement: OpticalElement = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      x: 200 + Math.random() * 100,
      y: 200 + Math.random() * 100,
      rotation: 0,
      width: type === 'mirror' ? 10 : type === 'medium' ? 120 : 40,
      height: type === 'medium' ? 80 : 120,
      focalLength: type === 'convex' ? 50 : type === 'concave' ? -50 : undefined,
      refractiveIndex: type === 'medium' ? 1.5 : undefined,
    };
    setElements([...elements, newElement]);
    setSelectedId(newElement.id);
  };

  const handleDelete = () => {
    if (selectedId) {
      setElements(elements.filter((el) => el.id !== selectedId));
      setSelectedId(null);
    }
  };

  const handlePointerDown = (e: React.PointerEvent, id: string, mode: 'move' | 'rotate') => {
    e.stopPropagation();
    const el = elements.find((e) => e.id === id);
    if (!el) return;

    setSelectedId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setDragState({
      isDragging: true,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      initialX: el.x,
      initialY: el.y,
      initialRotation: el.rotation,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState.isDragging || !selectedId) return;

    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== selectedId) return el;

        if (dragState.mode === 'move') {
          const dx = e.clientX - dragState.startX;
          const dy = e.clientY - dragState.startY;
          return { ...el, x: dragState.initialX + dx, y: dragState.initialY + dy };
        } 
        
        if (dragState.mode === 'rotate') {
          if (!canvasRef.current) return el;
          const rect = canvasRef.current.getBoundingClientRect();
          
          // Center of the element
          const centerX = rect.left + el.x + el.width / 2;
          const centerY = rect.top + el.y + el.height / 2;
          
          const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
          let degrees = (angle * 180) / Math.PI + 90; // +90 to align with top handle
          
          // Snap to 15 degrees if shift is held
          if (e.shiftKey) {
            degrees = Math.round(degrees / 15) * 15;
          }
          
          return { ...el, rotation: degrees };
        }

        return el;
      })
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragState.isDragging) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setDragState((prev) => ({ ...prev, isDragging: false, mode: null }));
    }
  };

  const updateSelectedProperty = (key: keyof OpticalElement, value: number) => {
    setElements((prev) =>
      prev.map((el) => (el.id === selectedId ? { ...el, [key]: value } : el))
    );
  };

  const selectedElement = elements.find((e) => e.id === selectedId);

  return (
    <div className="flex h-screen w-full font-sans text-slate-800 bg-[#f8fafc] overflow-hidden">
      
      {/* Toolbox Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-indigo-600" />
          <h1 className="font-bold text-lg text-slate-700 tracking-tight">Optics Lab</h1>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Components</h2>
          <div className="space-y-2">
            <button onClick={() => handleAddElement('mirror')} className="w-full flex items-center gap-3 p-3 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:border-indigo-400 hover:text-indigo-600 hover:shadow-sm transition-all">
              <div className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded">
                <div className="w-1 h-4 bg-slate-400 border-r border-slate-600"></div>
              </div>
              Plane Mirror
              <Plus className="w-4 h-4 ml-auto opacity-50" />
            </button>
            <button onClick={() => handleAddElement('convex')} className="w-full flex items-center gap-3 p-3 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:border-indigo-400 hover:text-indigo-600 hover:shadow-sm transition-all">
              <div className="w-6 h-6 flex items-center justify-center bg-sky-50 rounded">
                <div className="w-2 h-4 bg-sky-300 rounded-[100%]"></div>
              </div>
              Convex Lens
              <Plus className="w-4 h-4 ml-auto opacity-50" />
            </button>
            <button onClick={() => handleAddElement('concave')} className="w-full flex items-center gap-3 p-3 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:border-indigo-400 hover:text-indigo-600 hover:shadow-sm transition-all">
              <div className="w-6 h-6 flex items-center justify-center bg-sky-50 rounded">
                 <div className="w-3 h-4 border-x-2 border-sky-300 rounded-[100%]"></div>
              </div>
              Concave Lens
              <Plus className="w-4 h-4 ml-auto opacity-50" />
            </button>
            <button onClick={() => handleAddElement('medium')} className="w-full flex items-center gap-3 p-3 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:border-indigo-400 hover:text-indigo-600 hover:shadow-sm transition-all">
              <div className="w-6 h-6 flex items-center justify-center bg-sky-50 rounded">
                 <div className="w-4 h-3 bg-sky-200 border border-sky-300 rounded-sm"></div>
              </div>
              Glass Block
              <Plus className="w-4 h-4 ml-auto opacity-50" />
            </button>
          </div>

          <div className="mt-8 p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
            <h3 className="text-xs font-bold text-indigo-800 flex items-center gap-1 mb-2">
              <Info className="w-3 h-3" /> Instructions
            </h3>
            <p className="text-xs text-indigo-600/80 leading-relaxed">
              Drag elements to position them on the notebook. Use the top handle to rotate. Select an element to adjust its properties.
            </p>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div 
        ref={canvasRef}
        className="flex-1 relative cursor-crosshair touch-none"
        style={{
          backgroundColor: '#fdfcf8',
          backgroundImage: `
            linear-gradient(to right, #e2e8f0 1px, transparent 1px),
            linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={() => setSelectedId(null)}
      >
        {/* Render Elements */}
        {elements.map((el) => {
          const isSelected = el.id === selectedId;
          
          return (
            <div
              key={el.id}
              className={`absolute group ${dragState.isDragging && isSelected ? 'cursor-grabbing' : 'cursor-grab'}`}
              style={{
                left: el.x,
                top: el.y,
                width: el.width,
                height: el.height,
                transform: `rotate(${el.rotation}deg)`,
                transformOrigin: 'center center',
              }}
              onPointerDown={(e) => handlePointerDown(e, el.id, 'move')}
            >
              {/* Selection Box & Handles */}
              {isSelected && (
                <div className="absolute -inset-2 border-2 border-indigo-500 border-dashed rounded pointer-events-none z-20">
                  {/* Rotation Handle */}
                  <div 
                    className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-2 border-indigo-500 rounded-full flex items-center justify-center cursor-alias pointer-events-auto hover:bg-indigo-50 transition-colors shadow-sm"
                    onPointerDown={(e) => handlePointerDown(e, el.id, 'rotate')}
                  >
                    <RotateCw className="w-3 h-3 text-indigo-600 pointer-events-none" />
                  </div>
                  {/* Connection line to rotation handle */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-indigo-500 pointer-events-none"></div>
                </div>
              )}

              {/* Element Visuals */}
              <div className="relative w-full h-full pointer-events-none">
                {el.type === 'mirror' && <MirrorShape width={el.width} height={el.height} />}
                {el.type === 'convex' && <ConvexLensShape width={el.width} height={el.height} />}
                {el.type === 'concave' && <ConcaveLensShape width={el.width} height={el.height} />}
                {el.type === 'medium' && <RefractiveMediumShape width={el.width} height={el.height} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Properties Panel */}
      <div className="w-72 bg-white border-l border-slate-200 flex flex-col shadow-sm z-10">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-bold text-slate-700">Properties</h2>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          {selectedElement ? (
            <div className="space-y-6">
              
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded">
                    <MousePointer2 className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-sm capitalize text-slate-700">
                    {selectedElement.type}
                  </span>
                </div>
                <button 
                  onClick={handleDelete}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="Delete Element"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Transform Controls */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Transform</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 flex items-center gap-1">
                      <Move className="w-3 h-3" /> X Pos
                    </label>
                    <input 
                      type="number" 
                      value={Math.round(selectedElement.x)}
                      onChange={(e) => updateSelectedProperty('x', Number(e.target.value))}
                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 flex items-center gap-1">
                      <Move className="w-3 h-3" /> Y Pos
                    </label>
                    <input 
                      type="number" 
                      value={Math.round(selectedElement.y)}
                      onChange={(e) => updateSelectedProperty('y', Number(e.target.value))}
                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-500 flex items-center gap-1">
                    <RotateCw className="w-3 h-3" /> Rotation (deg)
                  </label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="range" 
                      min="0" max="360" 
                      value={Math.round(selectedElement.rotation)}
                      onChange={(e) => updateSelectedProperty('rotation', Number(e.target.value))}
                      className="flex-1 accent-indigo-500"
                    />
                    <input 
                      type="number" 
                      value={Math.round(selectedElement.rotation)}
                      onChange={(e) => updateSelectedProperty('rotation', Number(e.target.value))}
                      className="w-16 px-2 py-1 text-sm border border-slate-200 rounded bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Optical Properties */}
              <div className="space-y-3">
                <h3 className="