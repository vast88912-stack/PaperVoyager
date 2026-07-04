import React, { useState, useRef, PointerEvent, useEffect } from 'react';

type ElementType = 'mirror' | 'convex' | 'concave' | 'medium';

interface OpticalElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
}

export default function App() {
  const [elements, setElements] = useState<OpticalElement[]>([
    { id: '1', type: 'convex', x: 300, y: 200, rotation: 0, width: 40, height: 120 },
    { id: '2', type: 'mirror', x: 500, y: 150, rotation: 45, width: 10, height: 100 },
    { id: '3', type: 'medium', x: 150, y: 350, rotation: 0, width: 120, height: 80 },
  ]);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [activeElement, setActiveElement] = useState<string | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: PointerEvent, id: string, isRotationHandle: boolean = false) => {
    e.stopPropagation();
    setActiveElement(id);
    const el = elements.find((el) => el.id === id);
    if (!el) return;

    if (isRotationHandle) {
      setRotatingId(id);
    } else {
      setDraggingId(id);
      setDragOffset({
        x: e.clientX - el.x,
        y: e.clientY - el.y,
      });
    }
    
    if (e.target instanceof Element) {
      e.target.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (draggingId) {
      setElements((prev) =>
        prev.map((el) =>
          el.id === draggingId
            ? { ...el, x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y }
            : el
        )
      );
    } else if (rotatingId && boardRef.current) {
      const el = elements.find((e) => e.id === rotatingId);
      if (!el) return;
      
      const rect = boardRef.current.getBoundingClientRect();
      const centerX = el.x + el.width / 2;
      const centerY = el.y + el.height / 2;
      
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const angle = Math.atan2(mouseY - centerY, mouseX - centerX) * (180 / Math.PI);
      
      setElements((prev) =>
        prev.map((item) =>
          item.id === rotatingId ? { ...item, rotation: angle + 90 } : item
        )
      );
    }
  };

  const handlePointerUp = (e: PointerEvent) => {
    setDraggingId(null);
    setRotatingId(null);
    if (e.target instanceof Element && e.target.hasPointerCapture(e.pointerId)) {
      e.target.releasePointerCapture(e.pointerId);
    }
  };

  const addElement = (type: ElementType) => {
    const newEl: OpticalElement = {
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

  const renderElementShape = (el: OpticalElement) => {
    const isSelected = activeElement === el.id;
    const strokeColor = isSelected ? '#2563eb' : '#475569';
    const strokeWidth = isSelected ? 2 : 1.5;

    switch (el.type) {
      case 'convex':
        return (
          <svg width={el.width} height={el.height} viewBox="0 0 40 120" className="overflow-visible">
            <path
              d="M 20 0 Q 40 60 20 120 Q 0 60 20 0 Z"
              fill="rgba(186, 230, 253, 0.4)"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              className="backdrop-blur-sm"
            />
          </svg>
        );
      case 'concave':
        return (
          <svg width={el.width} height={el.height} viewBox="0 0 40 120" className="overflow-visible">
            <path
              d="M 0 0 Q 15 60 0 120 L 40 120 Q 25 60 40 0 Z"
              fill="rgba(186, 230, 253, 0.4)"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              className="backdrop-blur-sm"
            />
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
            <rect
              x="0"
              y="0"
              width={el.width}
              height={el.height}
              fill="rgba(186, 230, 253, 0.3)"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              className="backdrop-blur-md"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#fdfbf7] font-sans text-slate-800 overflow-hidden selection:bg-blue-200">
      {/* Sidebar / Toolbar */}
      <div className="w-72 bg-white border-r border-slate-200 shadow-sm z-10 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-2xl font-serif font-bold text-slate-800 tracking-tight">Optics Lab</h1>
          <p className="text-xs text-slate-500 mt-1 font-mono uppercase tracking-wider">Experiment Notebook</p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Components</h2>
          
          <div className="space-y-3">
            <button
              onClick={() => addElement('convex')}
              className="w-full flex items-center p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-colors group"
            >
              <div className="w-8 h-8 flex items-center justify-center mr-3 opacity-70 group-hover:opacity-100">
                <svg width="16" height="24" viewBox="0 0 20 40">
                  <path d="M 10 0 Q 20 20 10 40 Q 0 20 10 0 Z" fill="#bae6fd" stroke="#3b82f6" strokeWidth="1.5" />
                </svg>
              </div>
              <span className="font-medium text-slate-700">Convex Lens</span>
            </button>

            <button
              onClick={() => addElement('concave')}
              className="w-full flex items-center p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-colors group"
            >
              <div className="w-8 h-8 flex items-center justify-center mr-3 opacity-70 group-hover:opacity-100">
                <svg width="16" height="24" viewBox="0 0 20 40">
                  <path d="M 0 0 Q 8 20 0 40 L 20 40 Q 12 20 20 0 Z" fill="#bae6fd" stroke="#3b82f6" strokeWidth="1.5" />
                </svg>
              </div>
              <span className="font-medium text-slate-700">Concave Lens</span>
            </button>

            <button
              onClick={() => addElement('mirror')}
              className="w-full flex items-center p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-colors group"
            >
              <div className="w-8 h-8 flex items-center justify-center mr-3 opacity-70 group-hover:opacity-100">
                <svg width="12" height="24" viewBox="0 0 12 40">
                  <line x1="4" y1="0" x2="4" y2="40" stroke="#3b82f6" strokeWidth="2" />
                  <line x1="4" y1="5" x2="10" y2="10" stroke="#3b82f6" strokeWidth="1" />
                  <line x1="4" y1="15" x2="10" y2="20" stroke="#3b82f6" strokeWidth="1" />
                  <line x1="4" y1="25" x2="10" y2="30" stroke="#3b82f6" strokeWidth="1" />
                  <line x1="4" y1="35" x2="10" y2="40" stroke="#3b82f6" strokeWidth="1" />
                </svg>
              </div>
              <span className="font-medium text-slate-700">Plane Mirror</span>
            </button>

            <button
              onClick={() => addElement('medium')}
              className="w-full flex items-center p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-colors group"
            >
              <div className="w-8 h-8 flex items-center justify-center mr-3 opacity-70 group-hover:opacity-100">
                <rect width="20" height="20" fill="#bae6fd" stroke="#3b82f6" strokeWidth="1.5" />
              </div>
              <span className="font-medium text-slate-700">Glass Block</span>
            </button>
          </div>

          {activeElement && (
            <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Properties</h3>
              <div className="text-sm text-slate-600 mb-4">
                Selected: {elements.find(e => e.id === activeElement)?.type}
              </div>
              <button
                onClick={deleteActiveElement}
                className="w-full py-2 px-4 bg-red-50 text-red-600 rounded border border-red-200 hover:bg-red-100 transition-colors text-sm font-medium"
              >
                Remove Element
              </button>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-slate-100 text-xs text-slate-400 text-center">
          Drag to move • Drag handle to rotate
        </div>
      </div>

      {/* Canvas Area */}
      <div 
        className="flex-1 relative cursor-crosshair touch-none"
        ref={boardRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={() => setActiveElement(null)}
        style={{
          backgroundImage: `
            linear-gradient(#cbd5e1 1px, transparent 1px),
            linear-gradient(90deg, #cbd5e1 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: '-1px -1px'
        }}
      >
        {/* Notebook Margin Line */}
        <div className="absolute left-10 top-0 bottom-0 w-px bg-red-300 opacity-60 pointer-events-none" />
        <div className="absolute left-11 top-0 bottom-0 w-px bg-red-300 opacity-60 pointer-events-none" />

        {/* Render Elements */}
        {elements.map((el) => {
          const isSelected = activeElement === el.id;
          return (
            <div
              key={el.id}
              className="absolute touch-none select-none"
              style={{
                left: el.x,
                top: el.y,
                width: el.width,
                height: el.height,
                transform: `rotate(${el.rotation}deg)`,
                transformOrigin: 'center center',
                cursor: draggingId === el.id ? 'grabbing' : 'grab',
                zIndex: isSelected ? 10 : 1,
              }}
              onPointerDown={(e) => handlePointerDown(e, el.id)}
            >
              {renderElementShape(el)}
              
              {/* Rotation Handle */}
              {isSelected && (
                <div 
                  className="absolute left-1/2 -top-8 w-6 h-6 -ml-3 bg-white border-2 border-blue-500 rounded-full cursor-alias flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                  onPointerDown={(e) => handlePointerDown(e, el.id, true)}
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  {/* Connecting line */}
                  <div className="absolute top-full left-1/2 w-px h-6 bg-blue-300 -ml-[0.5px]" />
                </div>
              )}

              {/* Bounding Box for selection */}
              {isSelected && (
                <div className="absolute inset-0 border border-blue-400 border-dashed pointer-events-none -m-1" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}