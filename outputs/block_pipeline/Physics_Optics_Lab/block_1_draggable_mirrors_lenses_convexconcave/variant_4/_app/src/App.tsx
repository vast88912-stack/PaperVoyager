import React, { useState, useRef, PointerEvent as ReactPointerEvent } from 'react';

// --- Types ---
type ElementType = 'mirror' | 'convex' | 'concave' | 'medium';

interface OpticElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  rotation: number;
  focalLength: number; // For lenses
  width: number;       // For mediums
  height: number;      // For mediums/mirrors
  refractiveIndex: number; // For mediums
}

// --- Helper Functions ---
const generateId = () => Math.random().toString(36).substr(2, 9);

// --- Component ---
export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State
  const [elements, setElements] = useState<OpticElement[]>([
    {
      id: generateId(),
      type: 'convex',
      x: 300,
      y: 250,
      rotation: 0,
      focalLength: 100,
      width: 40,
      height: 120,
      refractiveIndex: 1.5,
    },
    {
      id: generateId(),
      type: 'mirror',
      x: 600,
      y: 250,
      rotation: 45,
      focalLength: 0,
      width: 10,
      height: 150,
      refractiveIndex: 0,
    }
  ]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // --- Interaction Handlers ---
  const handlePointerDown = (e: ReactPointerEvent<SVGGElement>, id: string) => {
    e.stopPropagation();
    const el = elements.find(el => el.id === id);
    if (!el || !containerRef.current) return;

    // Bring to front
    setElements(prev => {
      const filtered = prev.filter(p => p.id !== id);
      return [...filtered, el];
    });

    setSelectedId(id);
    setDraggingId(id);
    
    // Calculate offset relative to SVG coordinates
    const rect = containerRef.current.getBoundingClientRect();
    const svgX = e.clientX - rect.left;
    const svgY = e.clientY - rect.top;
    setDragOffset({ x: svgX - el.x, y: svgY - el.y });
    
    // Capture pointer to track outside the element
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!draggingId || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const svgX = e.clientX - rect.left;
    const svgY = e.clientY - rect.top;

    setElements(prev => prev.map(el => {
      if (el.id === draggingId) {
        return { ...el, x: svgX - dragOffset.x, y: svgY - dragOffset.y };
      }
      return el;
    }));
  };

  const handlePointerUp = (e: ReactPointerEvent<SVGSVGElement | SVGGElement>) => {
    if (draggingId) {
      (e.target as Element).releasePointerCapture(e.pointerId);
      setDraggingId(null);
    }
  };

  const handleBackgroundClick = () => {
    setSelectedId(null);
  };

  const addElement = (type: ElementType) => {
    const newEl: OpticElement = {
      id: generateId(),
      type,
      x: 400,
      y: 300,
      rotation: 0,
      focalLength: type === 'convex' ? 100 : type === 'concave' ? -100 : 0,
      width: type === 'medium' ? 120 : 40,
      height: type === 'medium' ? 80 : 120,
      refractiveIndex: 1.5,
    };
    setElements([...elements, newEl]);
    setSelectedId(newEl.id);
  };

  const updateSelected = (updates: Partial<OpticElement>) => {
    setElements(prev => prev.map(el => 
      el.id === selectedId ? { ...el, ...updates } : el
    ));
  };

  const deleteSelected = () => {
    setElements(prev => prev.filter(el => el.id !== selectedId));
    setSelectedId(null);
  };

  const selectedElement = elements.find(el => el.id === selectedId);

  // --- Render Helpers ---
  const renderElementShape = (el: OpticElement) => {
    const { type, width, height, focalLength } = el;
    const isSelected = selectedId === el.id;
    const strokeColor = isSelected ? '#ef4444' : '#1e3a8a';
    const strokeWidth = isSelected ? 3 : 2;
    const fillColor = 'rgba(219, 234, 254, 0.4)'; // Light blue transparent

    switch (type) {
      case 'convex': {
        // Dynamic biconvex shape based on height and width
        const qx = width / 2;
        const qy = height / 4;
        const path = `M 0 ${-height/2} Q ${qx} ${-qy} ${qx} 0 Q ${qx} ${qy} 0 ${height/2} Q ${-qx} ${qy} ${-qx} 0 Q ${-qx} ${-qy} 0 ${-height/2} Z`;
        return (
          <g>
            <path d={path} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
            {isSelected && (
              <>
                <circle cx={focalLength} cy="0" r="4" fill="#ef4444" />
                <circle cx={-focalLength} cy="0" r="4" fill="#ef4444" />
                <text x={focalLength - 5} y="-10" fontSize="12" fill="#ef4444" fontFamily="monospace">F</text>
                <text x={-focalLength - 5} y="-10" fontSize="12" fill="#ef4444" fontFamily="monospace">F'</text>
                <line x1={-focalLength} y1={0} x2={focalLength} y2={0} stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
              </>
            )}
          </g>
        );
      }
      case 'concave': {
        const qx = width / 2;
        const eX = width / 2 - 10; 
        const path = `M ${-eX} ${-height/2} L ${eX} ${-height/2} Q ${-qx/2} ${-height/4} ${-qx/2} 0 Q ${-qx/2} ${height/4} ${eX} ${height/2} L ${-eX} ${height/2} Q ${qx/2} ${height/4} ${qx/2} 0 Q ${qx/2} ${-height/4} ${-eX} ${-height/2} Z`;
        return (
          <g>
            <path d={path} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
            {isSelected && (
              <>
                <circle cx={Math.abs(focalLength)} cy="0" r="4" fill="#ef4444" />
                <circle cx={-Math.abs(focalLength)} cy="0" r="4" fill="#ef4444" />
                <text x={Math.abs(focalLength) - 5} y="-10" fontSize="12" fill="#ef4444" fontFamily="monospace">F</text>
                <text x={-Math.abs(focalLength) - 5} y="-10" fontSize="12" fill="#ef4444" fontFamily="monospace">F'</text>
                <line x1={-Math.abs(focalLength)} y1={0} x2={Math.abs(focalLength)} y2={0} stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
              </>
            )}
          </g>
        );
      }
      case 'mirror': {
        const h = height / 2;
        // Hatch lines for the back of the mirror
        const hatchSpacing = 10;
        const hatches = [];
        for (let i = -h + 5; i < h; i += hatchSpacing) {
          hatches.push(<line key={i} x1="0" y1={i} x2="10" y2={i + 10} stroke={strokeColor} strokeWidth="1" opacity="0.6" />);
        }
        return (
          <g>
            <line x1="0" y1={-h} x2="0" y2={h} stroke={strokeColor} strokeWidth={isSelected ? 4 : 3} />
            <g>{hatches}</g>
            {isSelected && (
              <line x1="-50" y1="0" x2="0" y2="0" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
            )}
          </g>
        );
      }
      case 'medium': {
        return (
          <g>
            <rect 
              x={-width/2} 
              y={-height/2} 
              width={width} 
              height={height} 
              fill="rgba(167, 243, 208, 0.4)" 
              stroke={strokeColor} 
              strokeWidth={strokeWidth} 
              rx="4"
            />
            <text x="0" y="5" textAnchor="middle" fontSize="14" fill={strokeColor} fontFamily="monospace" className="pointer-events-none select-none">
              n={el.refractiveIndex.toFixed(2)}
            </text>
          </g>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col font-sans text-slate-800 select-none">
      
      {/* Top Header - Lab Notebook Style */}
      <header className="px-6 py-4 border-b-2 border-slate-200 bg-[#fdfbf7] flex justify-between items-end relative z-10 shadow-sm">
        <div>
          <h1 className="text-3xl font-serif text-slate-800 tracking-tight flex items-baseline gap-3">
            Optics Lab <span className="text-lg font-mono text-slate-400 font-normal">Vol. 1</span>
          </h1>
          <p className="text-slate-500 font-mono text-sm mt-1">Experiment: Draggable Lenses, Mirrors, & Mediums</p>
        </div>
        <div className="font-mono text-sm text-slate-400 border-b border-slate-300 pb-1 px-2">
          Date: {new Date().toLocaleDateString()}
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex relative overflow-hidden">
        
        {/* Left Toolbar */}
        <div className="w-64 bg-white border-r border-slate-200 shadow-[2px_0_8px_-4px_rgba(0,0,0,0.1)] z-10 flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase font-mono mb-1">Component Bin</h2>
            <p className="text-xs text-slate-500">Add optical elements to the workbench.</p>
          </div>
          
          <div className="p-4 flex flex-col gap-3 flex-1 overflow-y-auto">
            <button onClick={() => addElement('convex')} className="flex items-center gap-3 p-3 rounded-lg border-2 border-slate-200 bg-[#fdfbf7] hover:border-blue-300 hover:bg-blue-50 transition-colors group">
              <svg width="24" height="24" viewBox="-12 -12 24 24" className="text-blue-700">
                <path d="M 0 -10 Q 8 -5 8 0 Q 8 5 0 10 Q -8 5 -8 0 Q -8 -5 0 -10 Z" fill="rgba(219,234,254,0.5)" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span className="font-medium text-sm text-slate-700 group-hover:text-blue-800">Convex Lens</span>
            </button>
            
            <button onClick={() => addElement('concave')} className="flex items-center gap-3 p-3 rounded-lg border-2 border-slate-200 bg-[#fdfbf7] hover:border-blue-300 hover:bg-blue-50 transition-colors group">
              <svg width="24" height="24" viewBox="-12 -12 24 24" className="text-blue-700">
                <path d="M -8 -10 L 8 -10 Q 2 -5 2 0 Q 2 5 8 10 L -8 10 Q -2 5 -2 0 Q -2 -5 -8 -10 Z" fill="rgba(219,234,254,0.5)" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span className="font-medium text-sm text-slate-700 group-hover:text-blue-800">Concave Lens</span>
            </button>

            <button onClick={() => addElement('mirror')} className="flex items-center gap-3 p-3 rounded-lg border-2 border-slate-200 bg-[#fdfbf7] hover:border-blue-300 hover:bg-blue-50 transition-colors group">
              <svg width="24" height="24" viewBox="-12 -12 24 24" className="text-slate-700">
                <line x1="0" y1="-10" x2="0" y2="10" stroke="currentColor" strokeWidth="2" />
                <line x1="0" y1="-8" x2="5" y2="-3" stroke="currentColor" strokeWidth="1" />
                <line x1="0" y1="-3" x2="5" y2="2" stroke="currentColor" strokeWidth="1" />
                <line x1="0" y1="2" x2="5" y2="7" stroke="currentColor" strokeWidth="1" />
              </svg>
              <span className="font-medium text-sm text-slate-700 group-hover:text-slate-900">Plane Mirror</span>
            </button>

            <button onClick={() => addElement('medium')} className="flex items-center gap-3 p-3 rounded-lg border-2 border-slate-200 bg-[#fdfbf7] hover:border-blue-300 hover:bg-blue-50 transition-colors group">
              <svg width="24" height="24" viewBox="-12 -12 24 24" className="text-emerald-700">
                <rect x="-8" y="-8" width="16" height="16" fill="rgba(167,243,208,0.5)" stroke="currentColor" strokeWidth="2" rx="2" />
              </svg>
              <span className="font-medium text-sm text-slate-700 group-hover:text-emerald-800">Glass Medium</span>
            </button>
          </div>

          {/* Properties Panel (Visible when selected) */}
          <div className={`p-5 bg-white border-t border-slate-200 transition-opacity duration-200 ${selectedElement ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase font-mono">Properties</h2>
              {selectedElement && (
                <button onClick={deleteSelected} className="text-red-400 hover:text-red-600 p-1" title="Delete Element">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              )}
            </div>
            
            {selectedElement ? (
              <div className="space-y-4 font-mono text-sm">
                <div>
                  <label className="flex justify-between text-slate-500 mb-1">
                    <span>Rotation</span>
                    <span className="text-slate-800">{selectedElement.rotation}°</span>
                  </label>
                  <input 
                    type="range" min="0" max="360" value={selectedElement.rotation}
                    onChange={(e) => updateSelected({ rotation: parseInt(e.target.value) })}
                    className="w-full accent-blue-600"
                  />
                </div>

                {(selectedElement.type === 'convex' || selectedElement.type === 'concave') && (
                  <div>
                    <label className="flex justify-between text-slate-500 mb-1">
                      <span>Focal Length</span>
                      <span className="text-slate-800">{selectedElement.focalLength}px</span>
                    </label>
                    <input 
                      type="range" min="30" max="250" value={Math.abs(selectedElement.focalLength)}
                      onChange={(e) => updateSelected({ 
                        focalLength: selectedElement.type === 'concave' ? -parseInt(e.target.value) : parseInt(e.target.value) 
                      })}
                      className="w-full accent-blue-600"
                    />
                  </div>
                )}

                {selectedElement.type === 'medium' && (
                  <div>
                    <label className="flex justify-between text-slate-500 mb-1">
                      <span>Refractive Index (n)</span>
                      <span className="text-slate-800">{selectedElement.refractiveIndex.toFixed(2)}</span>
                    </label>
                    <input 
                      type="range" min="1.0" max="2.5" step="0.05" value={selectedElement.refractiveIndex}
                      onChange={(e) => updateSelected({ refractiveIndex: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-600"
                    />
                  </div>
                )}

                {selectedElement.type === 'medium' && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-slate-500 mb-1">Width</label>
                      <input 
                        type="number" value={selectedElement.width}
                        onChange={(e) => updateSelected({ width: parseInt(e.target.value) || 10 })}
                        className="w-full p-1 border border-slate-300 rounded bg-slate-50"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-slate-500 mb-1">Height</label>
                      <input 
                        type="number" value={selectedElement.height}
                        onChange={(e) => updateSelected({ height: parseInt(e.target.value) || 10 })}
                        className="w-full p-1 border border-slate-300 rounded bg-slate-50"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-slate-400 text-sm font-mono italic text-center py-4">
                Select an element on the canvas to adjust its properties.
              </div>
            )}
          </div>
        </div>

        {/* Canvas Area */}
        <div 
          ref={containerRef}
          className="flex-1 relative cursor-crosshair overflow-hidden bg-[#fdfbf7]"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <svg 
            className="w-full h-full"
            onClick={handleBackgroundClick}
          >
            <defs>
              {/* Lab Notebook Grid Pattern */}
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <rect width="40" height="40" fill="none" />
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e0e8f5" strokeWidth="1" />
              </pattern>
              <pattern id="grid-major" width="200" height="200" patternUnits="userSpaceOnUse">
                <rect width="200" height="200" fill="url(#grid)" />
                <path d="M 200 0 L 0 0 0 200" fill="none" stroke="#c0cdec" strokeWidth="1.5" />
              </pattern>
              {/* Drop Shadow for realistic effect */}
              <filter id="drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.1" />
              </filter>
            </defs>
            
            <rect width="100%" height="100%" fill="url(#grid-major)" />

            {/* Elements */}
            {elements.map(el => (
              <g 
                key={el.id}
                transform={`translate(${el.x}, ${el.y}) rotate(${el.rotation})`}
                onPointerDown={(e) => handlePointerDown(e, el.id)}
                className={draggingId === el.id ? 'cursor-grabbing' : 'cursor-grab'}
                style={{ filter: 'url(#drop-shadow)' }}
              >
                {/* Invisible larger hit area for easier dragging */}
                <rect x="-40" y="-80" width="80" height="160" fill="transparent" />
                {renderElementShape(el)}
              </g>
            ))}
          </svg>

          {/* Overlays / Hints */}
          {!elements.length && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-slate-400 font-mono text-lg flex items-center gap-2">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Drag items from the Component Bin to begin
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}