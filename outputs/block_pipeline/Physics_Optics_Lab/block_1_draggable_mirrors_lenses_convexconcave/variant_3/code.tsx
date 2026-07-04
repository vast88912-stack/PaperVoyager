import React, { useState, useRef, useCallback } from 'react';

// --- Types ---
type ElementType = 'mirror' | 'lens-convex' | 'lens-concave' | 'medium';

interface Point {
  x: number;
  y: number;
}

interface OpticElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  rotation: number; // degrees
  width: number;
  height: number;
  // Specific properties
  focalLength?: number; // for lenses
  refractiveIndex?: number; // for medium
}

// --- Initial Data ---
const INITIAL_ELEMENTS: OpticElement[] = [
  { id: '1', type: 'mirror', x: 200, y: 300, rotation: -45, width: 10, height: 100 },
  { id: '2', type: 'lens-convex', x: 400, y: 300, rotation: 0, width: 30, height: 120, focalLength: 50 },
  { id: '3', type: 'lens-concave', x: 600, y: 300, rotation: 0, width: 30, height: 120, focalLength: -50 },
  { id: '4', type: 'medium', x: 800, y: 300, rotation: 0, width: 100, height: 100, refractiveIndex: 1.5 },
];

export default function App() {
  const [elements, setElements] = useState<OpticElement[]>(INITIAL_ELEMENTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // --- Interaction Handlers ---

  const getSvgCoordinates = (e: React.PointerEvent | PointerEvent): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    return {
      x: (e.clientX - CTM.e) / CTM.a,
      y: (e.clientY - CTM.f) / CTM.d
    };
  };

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation(); // Prevent deselecting
    const coords = getSvgCoordinates(e);
    const element = elements.find(el => el.id === id);
    if (element) {
      setSelectedId(id);
      setIsDragging(true);
      setDragOffset({
        x: coords.x - element.x,
        y: coords.y - element.y
      });
      
      // Bring to front by moving to end of array
      setElements(prev => {
        const filtered = prev.filter(el => el.id !== id);
        return [...filtered, element];
      });
    }
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !selectedId) return;
    const coords = getSvgCoordinates(e);
    
    setElements(prev => prev.map(el => {
      if (el.id === selectedId) {
        return {
          ...el,
          x: coords.x - dragOffset.x,
          y: coords.y - dragOffset.y
        };
      }
      return el;
    }));
  }, [isDragging, selectedId, dragOffset]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleCanvasClick = () => {
    if (!isDragging) {
      setSelectedId(null);
    }
  };

  // --- Actions ---
  const addElement = (type: ElementType) => {
    const newElement: OpticElement = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      x: 500,
      y: 300,
      rotation: 0,
      width: type === 'medium' ? 100 : (type === 'mirror' ? 10 : 30),
      height: type === 'medium' ? 100 : 120,
      focalLength: type === 'lens-convex' ? 50 : (type === 'lens-concave' ? -50 : undefined),
      refractiveIndex: type === 'medium' ? 1.5 : undefined,
    };
    setElements([...elements, newElement]);
    setSelectedId(newElement.id);
  };

  const updateSelectedElement = (updates: Partial<OpticElement>) => {
    setElements(prev => prev.map(el => 
      el.id === selectedId ? { ...el, ...updates } : el
    ));
  };

  const deleteSelected = () => {
    setElements(prev => prev.filter(el => el.id !== selectedId));
    setSelectedId(null);
  };

  // --- Render Helpers ---
  const renderElementShape = (el: OpticElement) => {
    const isSelected = el.id === selectedId;
    const strokeColor = isSelected ? '#3b82f6' : '#475569';
    const strokeWidth = isSelected ? 3 : 2;

    switch (el.type) {
      case 'mirror':
        // Generate hatch marks for the mirror back
        const hatches = [];
        for (let i = -el.height / 2 + 5; i < el.height / 2; i += 8) {
          hatches.push(<line key={i} x1="0" y1={i} x2="-10" y2={i + 5} stroke={strokeColor} strokeWidth="1.5" />);
        }
        return (
          <g>
            <line x1="0" y1={-el.height / 2} x2="0" y2={el.height / 2} stroke={strokeColor} strokeWidth={strokeWidth} />
            {hatches}
            {/* Invisible larger hitbox */}
            <rect x="-20" y={-el.height / 2} width="40" height={el.height} fill="transparent" />
          </g>
        );

      case 'lens-convex':
        // Bi-convex shape using quadratic bezier curves
        const ctrlX = el.width;
        return (
          <g>
            <path 
              d={`M 0,${-el.height/2} Q ${ctrlX},0 0,${el.height/2} Q ${-ctrlX},0 0,${-el.height/2} Z`}
              fill="#cffafe" 
              fillOpacity={0.6}
              stroke={strokeColor} 
              strokeWidth={strokeWidth}
              className="transition-colors"
            />
          </g>
        );

      case 'lens-concave':
        // Bi-concave shape
        const w2 = el.width / 2;
        const h2 = el.height / 2;
        return (
          <g>
            <path 
              d={`M ${-w2},${-h2} L ${w2},${-h2} Q 0,0 ${w2},${h2} L ${-w2},${h2} Q 0,0 ${-w2},${-h2} Z`}
              fill="#cffafe" 
              fillOpacity={0.6}
              stroke={strokeColor} 
              strokeWidth={strokeWidth}
            />
          </g>
        );

      case 'medium':
        // Glass block
        return (
          <g>
            <rect 
              x={-el.width / 2} 
              y={-el.height / 2} 
              width={el.width} 
              height={el.height} 
              fill="#fef08a" 
              fillOpacity={0.4}
              stroke={strokeColor} 
              strokeWidth={strokeWidth} 
              rx="4"
            />
            {isSelected && (
              <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fill="#854d0e" className="text-xs font-mono font-bold pointer-events-none select-none">
                n={el.refractiveIndex?.toFixed(2)}
              </text>
            )}
          </g>
        );
      default:
        return null;
    }
  };

  const selectedElementData = elements.find(e => e.id === selectedId);

  return (
    <div className="flex h-screen w-full bg-[#fdfbf7] font-sans text-slate-800 overflow-hidden">
      
      {/* Sidebar / Tools */}
      <div className="w-72 bg-white border-r border-slate-200 shadow-sm flex flex-col z-10">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a10 10 0 0 1 10 10" />
              <path d="M12 2a10 10 0 0 0-10 10" />
            </svg>
            Optics Lab
          </h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Interactive Notebook</p>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Components</h2>
          <div className="grid grid-cols-2 gap-2 mb-8">
            <button onClick={() => addElement('mirror')} className="flex flex-col items-center p-3 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-blue-300 transition-all group">
              <svg width="32" height="32" viewBox="0 0 32 32" className="mb-2 text-slate-600 group-hover:text-blue-600">
                <line x1="16" y1="4" x2="16" y2="28" stroke="currentColor" strokeWidth="2" />
                <line x1="16" y1="8" x2="8" y2="12" stroke="currentColor" strokeWidth="1" />
                <line x1="16" y1="16" x2="8" y2="20" stroke="currentColor" strokeWidth="1" />
                <line x1="16" y1="24" x2="8" y2="28" stroke="currentColor" strokeWidth="1" />
              </svg>
              <span className="text-xs font-medium">Mirror</span>
            </button>
            <button onClick={() => addElement('lens-convex')} className="flex flex-col items-center p-3 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-blue-300 transition-all group">
               <svg width="32" height="32" viewBox="0 0 32 32" className="mb-2 text-slate-600 group-hover:text-blue-600">
                <path d="M 16,4 Q 24,16 16,28 Q 8,16 16,4 Z" fill="#e0f2fe" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span className="text-xs font-medium">Convex</span>
            </button>
            <button onClick={() => addElement('lens-concave')} className="flex flex-col items-center p-3 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-blue-300 transition-all group">
               <svg width="32" height="32" viewBox="0 0 32 32" className="mb-2 text-slate-600 group-hover:text-blue-600">
                <path d="M 10,4 L 22,4 Q 16,16 22,28 L 10,28 Q 16,16 10,4 Z" fill="#e0f2fe" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span className="text-xs font-medium">Concave</span>
            </button>
            <button onClick={() => addElement('medium')} className="flex flex-col items-center p-3 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-blue-300 transition-all group">
               <svg width="32" height="32" viewBox="0 0 32 32" className="mb-2 text-slate-600 group-hover:text-blue-600">
                <rect x="8" y="8" width="16" height="16" fill="#fef08a" stroke="currentColor" strokeWidth="2" rx="2" />
              </svg>
              <span className="text-xs font-medium">Medium</span>
            </button>
          </div>

          {selectedElementData && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold text-slate-700 capitalize">
                  {selectedElementData.type.replace('-', ' ')}
                </h2>
                <button onClick={deleteSelected} className="text-red-500 hover:text-red-700 p-1 bg-red-50 hover:bg-red-100 rounded">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Rotation Control */}
                <div>
                  <label className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Rotation</span>
                    <span className="font-mono">{selectedElementData.rotation}°</span>
                  </label>
                  <input 
                    type="range" 
                    min="-180" max="180" 
                    value={selectedElementData.rotation}
                    onChange={(e) => updateSelectedElement({ rotation: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                {/* Specific Controls */}
                {(selectedElementData.type === 'lens-convex' || selectedElementData.type === 'lens-concave') && (
                  <div>
                    <label className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Focal Length (f)</span>
                      <span className="font-mono">{selectedElementData.focalLength}</span>
                    </label>
                    <input 
                      type="range" 
                      min={selectedElementData.type === 'lens-convex' ? "10" : "-100"} 
                      max={selectedElementData.type === 'lens-convex' ? "100" : "-10"} 
                      value={selectedElementData.focalLength}
                      onChange={(e) => updateSelectedElement({ focalLength: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                )}

                {selectedElementData.type === 'medium' && (
                  <div>
                    <label className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Refractive Index (n)</span>
                      <span className="font-mono">{selectedElementData.refractiveIndex?.toFixed(2)}</span>
                    </label>
                    <input 
                      type="range" 
                      min="1.0" max="3.0" step="0.05"
                      value={selectedElementData.refractiveIndex}
                      onChange={(e) => updateSelectedElement({ refractiveIndex: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                )}
                
                {selectedElementData.type === 'medium' && (
                  <div>
                    <label className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Width</span>
                    </label>
                    <input 
                      type="range" 
                      min="40" max="300" 
                      value={selectedElementData.width}
                      onChange={(e) => updateSelectedElement({ width: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-500"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          
          {!selectedElementData && (
             <div className="mt-8 p-4 border-2 border-dashed border-slate-200 rounded-xl text-center">
               <p className="text-sm text-slate-400">Select an element on the canvas to edit properties.</p>
             </div>
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative cursor-crosshair">
        <svg 
          ref={svgRef}
          className="w-full h-full"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerDown={handleCanvasClick}
        >
          {/* Lab Notebook Grid Pattern */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e0e7ff" strokeWidth="1" />
            </pattern>
            <pattern id="grid-large" width="200" height="200" patternUnits="userSpaceOnUse">
              <rect width="200" height="200" fill="url(#grid)" />
              <path d="M 200 0 L 0 0 0 200" fill="none" stroke="#c7d2fe" strokeWidth="2" />
            </pattern>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.1" />
            </filter>
          </defs>

          {/* Background Grid */}
          <rect width="100%" height="100%" fill="url(#grid-large)" />
          
          {/* Vertical margin line (notebook aesthetic) */}
          <line x1="80" y1="0" x2="80" y2="100%" stroke="#fecdd3" strokeWidth="2" />

          {/* Render Optical Elements */}
          {elements.map((el) => (
            <g
              key={el.id}
              transform={`translate(${el.x}, ${el.y}) rotate(${el.rotation})`}
              onPointerDown={(e) => handlePointerDown(e, el.id)}
              style={{ cursor: isDragging && selectedId === el.id ? 'grabbing' : 'grab' }}
              filter={selectedId === el.id ? 'url(#shadow)' : undefined}
            >
              {/* Center Pivot Indicator when selected */}
              {selectedId === el.id && (
                <circle cx="0" cy="0" r="4" fill="#ef4444" className="pointer-events-none" />
              )}
              
              {renderElementShape(el)}
              
              {/* Optional: Render focal points for lenses when selected */}
              {selectedId === el.id && el.focalLength && (
                <g className="pointer-events-none opacity-50">
                  <line x1={-el.focalLength} y1="-5" x2={-el.focalLength} y2="5" stroke="#3b82f6" strokeWidth="2" />
                  <line x1={-el.focalLength - 5} y1="0" x2={-el.focalLength + 5} y2="0" stroke="#3b82f6" strokeWidth="2" />
                  <text x={-el.focalLength} y="-10" textAnchor="middle" fill="#3b82f6" fontSize="10" className="font-mono">F</text>
                  
                  <line x1={el.focalLength} y1="-5" x2={el.focalLength} y2="5" stroke="#3b82f6" strokeWidth="2" />
                  <line x1={el.focalLength - 5} y1="0" x2={el.focalLength + 5} y2="0" stroke="#3b