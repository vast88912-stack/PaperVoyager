import React, { useState, useCallback, useRef } from 'react';

// --- Types ---
type ElementType = 'mirror' | 'convex-lens' | 'concave-lens' | 'medium';

interface OpticElement {
  id: string;
  type: ElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  focalLength?: number;
  refractiveIndex?: number;
}

interface DragState {
  id: string;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
}

// --- Initial Data ---
const INITIAL_ELEMENTS: OpticElement[] = [
  {
    id: 'el-1',
    type: 'convex-lens',
    name: 'Convex Lens A',
    x: 400,
    y: 300,
    width: 40,
    height: 160,
    rotation: 0,
    focalLength: 100,
    refractiveIndex: 1.5,
  },
  {
    id: 'el-2',
    type: 'mirror',
    name: 'Plane Mirror B',
    x: 600,
    y: 200,
    width: 20,
    height: 120,
    rotation: 45,
  },
  {
    id: 'el-3',
    type: 'medium',
    name: 'Glass Block',
    x: 200,
    y: 450,
    width: 150,
    height: 100,
    rotation: 0,
    refractiveIndex: 1.33,
  },
];

// --- Icons ---
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

export default function App() {
  const [elements, setElements] = useState<OpticElement[]>(INITIAL_ELEMENTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);

  // --- Handlers ---
  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    const el = elements.find((e) => e.id === id);
    if (el) {
      setDragState({
        id,
        startX: e.clientX,
        startY: e.clientY,
        initialX: el.x,
        initialY: el.y,
      });
      setSelectedId(id);
    }
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState) return;
    
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    
    setElements((prev) =>
      prev.map((el) =>
        el.id === dragState.id
          ? { ...el, x: dragState.initialX + dx, y: dragState.initialY + dy }
          : el
      )
    );
  }, [dragState]);

  const handlePointerUp = useCallback(() => {
    setDragState(null);
  }, []);

  const handleCanvasClick = () => {
    setSelectedId(null);
  };

  const addElement = (type: ElementType) => {
    const id = `el-${Date.now()}`;
    const newElement: OpticElement = {
      id,
      type,
      name: `New ${type.replace('-', ' ')}`,
      x: 300,
      y: 300,
      width: type === 'medium' ? 120 : type === 'mirror' ? 20 : 40,
      height: type === 'medium' ? 80 : 120,
      rotation: 0,
      focalLength: type.includes('lens') ? (type === 'convex-lens' ? 100 : -100) : undefined,
      refractiveIndex: type === 'medium' || type.includes('lens') ? 1.5 : undefined,
    };
    setElements((prev) => [...prev, newElement]);
    setSelectedId(id);
  };

  const updateSelected = (updates: Partial<OpticElement>) => {
    setElements((prev) =>
      prev.map((el) => (el.id === selectedId ? { ...el, ...updates } : el))
    );
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setElements((prev) => prev.filter((el) => el.id !== selectedId));
    setSelectedId(null);
  };

  const selectedElement = elements.find((el) => el.id === selectedId);

  // --- Renders ---
  const renderElementShape = (el: OpticElement) => {
    const { type, width, height } = el;
    
    switch (type) {
      case 'convex-lens':
        return (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible drop-shadow-md">
            <path 
              d={`M ${width/2} 0 Q ${width} ${height/2} ${width/2} ${height} Q 0 ${height/2} ${width/2} 0 Z`} 
              fill="rgba(56, 189, 248, 0.25)" 
              stroke="#0ea5e9" 
              strokeWidth={2} 
            />
            <line x1={width/2} y1={-20} x2={width/2} y2={height+20} stroke="#0ea5e9" strokeWidth={1} strokeDasharray="4 4" className="opacity-50" />
          </svg>
        );
      case 'concave-lens':
        return (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible drop-shadow-md">
            <path 
              d={`M 0 0 L ${width} 0 Q ${width/3} ${height/2} ${width} ${height} L 0 ${height} Q ${width*0.66} ${height/2} 0 0 Z`} 
              fill="rgba(56, 189, 248, 0.25)" 
              stroke="#0ea5e9" 
              strokeWidth={2} 
            />
            <line x1={width/2} y1={-20} x2={width/2} y2={height+20} stroke="#0ea5e9" strokeWidth={1} strokeDasharray="4 4" className="opacity-50" />
          </svg>
        );
      case 'mirror':
        return (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible drop-shadow-md">
            <line x1={width/2} y1={0} x2={width/2} y2={height} stroke="#334155" strokeWidth={4} strokeLinecap="round" />
            {Array.from({ length: Math.floor(height / 8) }).map((_, i) => (
              <line key={i} x1={width/2} y1={i * 8 + 4} x2={width/2 + 8} y2={i * 8 + 12} stroke="#64748b" strokeWidth={2} />
            ))}
          </svg>
        );
      case 'medium':
        return (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible drop-shadow-sm">
            <rect x={0} y={0} width={width} height={height} fill="rgba(52, 211, 153, 0.15)" stroke="#10b981" strokeWidth={2} rx={4} />
            <line x1={10} y1={10} x2={width - 10} y2={10} stroke="rgba(255,255,255,0.6)" strokeWidth={2} strokeLinecap="round" />
            <line x1={10} y1={18} x2={width/2} y2={18} stroke="rgba(255,255,255,0.4)" strokeWidth={2} strokeLinecap="round" />
          </svg>
        );
      default:
        return null;
    }
  };

  const gridStyle = {
    backgroundColor: '#faf9f6',
    backgroundImage: `
      linear-gradient(rgba(148, 163, 184, 0.2) 1px, transparent 1px),
      linear-gradient(90deg, rgba(148, 163, 184, 0.2) 1px, transparent 1px)
    `,
    backgroundSize: '20px 20px',
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-800 overflow-hidden">
      
      {/* Canvas Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Top Navbar / Toolbar */}
        <header className="h-14 border-b border-slate-200 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center text-white font-serif font-bold italic">
              O
            </div>
            <h1 className="font-serif text-lg font-semibold text-slate-700 tracking-wide">
              Optics Lab <span className="text-slate-400 font-normal">// Workspace</span>
            </h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => addElement('mirror')} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors border border-slate-200">
              <PlusIcon /> Mirror