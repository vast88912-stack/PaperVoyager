import React, { useState, useCallback, useEffect } from 'react';
// Runtime deps: lucide-react

import { 
  MapPin, 
  Target, 
  Square, 
  Weight, 
  Eraser, 
  RefreshCw, 
  Grid2X2,
  Download
} from 'lucide-react';

const ROWS = 21;
const COLS = 45;

type CellData = {
  row: number;
  col: number;
  isStart: boolean;
  isEnd: boolean;
  isWall: boolean;
  weight: number;
};

type EditMode = 'start' | 'end' | 'wall' | 'weight' | 'eraser';

const createInitialGrid = (): CellData[][] => {
  const grid: CellData[][] = [];
  for (let row = 0; row < ROWS; row++) {
    const currentRow: CellData[] = [];
    for (let col = 0; col < COLS; col++) {
      currentRow.push({
        row,
        col,
        isStart: row === 10 && col === 8,
        isEnd: row === 10 && col === 36,
        isWall: false,
        weight: 1,
      });
    }
    grid.push(currentRow);
  }
  return grid;
};

export default function App() {
  const [grid, setGrid] = useState<CellData[][]>(createInitialGrid());
  const [mode, setMode] = useState<EditMode>('wall');
  const [isMousePressed, setIsMousePressed] = useState(false);
  const [seed, setSeed] = useState<string>('');

  useEffect(() => {
    setSeed(Math.random().toString(36).substring(2, 10).toUpperCase());
  }, []);

  const updateCell = useCallback((row: number, col: number, currentMode: EditMode) => {
    setGrid((prevGrid) => {
      const newGrid = prevGrid.map(r => [...r]);
      const cell = newGrid[row][col];

      if (currentMode === 'start') {
        // Clear previous start
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (newGrid[r][c].isStart) newGrid[r][c].isStart = false;
          }
        }
        cell.isStart = true;
        cell.isWall = false;
        cell.weight = 1;
      } else if (currentMode === 'end') {
        // Clear previous end
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (newGrid[r][c].isEnd) newGrid[r][c].isEnd = false;
          }
        }
        cell.isEnd = true;
        cell.isWall = false;
        cell.weight = 1;
      } else if (currentMode === 'wall') {
        if (!cell.isStart && !cell.isEnd) {
          cell.isWall = true;
          cell.weight = 1;
        }
      } else if (currentMode === 'weight') {
        if (!cell.isStart && !cell.isEnd && !cell.isWall) {
          cell.weight = 5; // Set a high weight for demonstration
        }
      } else if (currentMode === 'eraser') {
        if (!cell.isStart && !cell.isEnd) {
          cell.isWall = false;
          cell.weight = 1;
        }
      }

      return newGrid;
    });
  }, []);

  const handleMouseDown = (row: number, col: number) => {
    setIsMousePressed(true);
    updateCell(row, col, mode);
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (!isMousePressed) return;
    updateCell(row, col, mode);
  };

  const handleMouseUp = () => {
    setIsMousePressed(false);
  };

  const clearGrid = () => {
    setGrid(createInitialGrid());
    setSeed(Math.random().toString(36).substring(2, 10).toUpperCase());
  };

  const generateRandomMaze = () => {
    setGrid((prev) => {
      const newGrid = prev.map(r => [...r]);
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cell = newGrid[r][c];
          if (!cell.isStart && !cell.isEnd) {
            cell.isWall = Math.random() < 0.25;
            cell.weight = !cell.isWall && Math.random() < 0.1 ? 5 : 1;
          }
        }
      }
      return newGrid;
    });
    setSeed(Math.random().toString(36).substring(2, 10).toUpperCase());
  };

  const exportGrid = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(grid));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `grid_${seed}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const ModeButton = ({ value, icon: Icon, label, colorClass }: { value: EditMode, icon: any, label: string, colorClass: string }) => {
    const isActive = mode === value;
    return (
      <button
        onClick={() => setMode(value)}
        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 ${
          isActive 
            ? `bg-gray-900 border-${colorClass}-500 shadow-[0_0_15px_rgba(var(--color-${colorClass}-500),0.4)] text-${colorClass}-400` 
            : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
        }`}
      >
        <Icon size={24} className="mb-1" />
        <span className="text-xs font-semibold tracking-wider uppercase">{label}</span>
      </button>
    );
  };

  return (
    <div 
      className="min-h-screen bg-[#0a0a0f] text-gray-100 font-mono flex flex-col select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header */}
      <header className="border-b border-gray-800/60 bg-[#0f0f16]/80 backdrop-blur-md p-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            <Grid2X2 className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
              GRID_EDITOR
            </h1>
            <p className="text-xs text-cyan-500/70 font-medium">SYS.SEED // {seed}</p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={generateRandomMaze}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-900/30 border border-purple-500/50 text-purple-300 hover:bg-purple-800/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all duration-300"
          >
            <RefreshCw size={16} />
            <span className="text-sm font-bold">GEN_MAZE</span>
          </button>
          <button 
            onClick={clearGrid}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-900/30 border border-rose-500/50 text-rose-300 hover:bg-rose-800/50 hover:shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all duration-300"
          >
            <Eraser size={16} />
            <span className="text-sm font-bold">WIPE</span>
          </button>
          <button 
            onClick={exportGrid}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-900/30 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-800/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-300"
          >
            <Download size={16} />
            <span className="text-sm font-bold">EXPORT</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar Tools */}
        <aside className="w-24 border-r border-gray-800/60 bg-[#0f0f16]/50 p-4 flex flex-col gap-4">
          <ModeButton value="start" icon={MapPin} label="Start" colorClass="lime" />
          <ModeButton value="end" icon={Target} label="Goal" colorClass="rose" />
          <ModeButton value="wall" icon={Square} label="Wall" colorClass="cyan" />
          <ModeButton value="weight" icon={Weight} label="Weight" colorClass="purple" />
          <ModeButton value="eraser" icon={Eraser} label="Erase" colorClass="gray" />
        </aside>

        {/* Grid Canvas */}
        <div className="flex-1 flex items-center justify-center p-8 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-[#0a0a0f] to-[#0a0a0f] overflow-auto">
          <div 
            className="grid gap-[1px] bg-gray-800/50 border border-gray-700/50 p-[1px] rounded-sm shadow-[0_0_30px_rgba(0,0,0,0.8)]"
            style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
            onMouseLeave={handleMouseUp}
          >
            {grid.map((row, rowIndex) => (
              row.map((cell, colIndex) => {
                let cellClasses = "w-6 h-6 transition-all duration-150 ease-in-out ";
                
                if (cell.isStart) {
                  cellClasses += "bg-lime-400 shadow-[0_0_12px_#a3e635] z-10 scale-110 rounded-sm";
                } else if (cell.isEnd) {
                  cellClasses += "bg-rose-500 shadow-[0_0_12px_#f43f5e] z-10 scale-110 rounded-sm";
                } else if (cell.isWall) {
                  cellClasses += "bg-cyan-500/20 border border-cyan-400/50 shadow-[inset_0_0_8px_rgba(34,211,238,0.3)]";
                } else if (cell.weight > 1) {
                  cellClasses += "bg-purple-900/40 border border-purple-500/30 flex items-center justify-center";
                } else {
                  cellClasses += "bg-[#13131a] hover:bg-gray-800";
                }

                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={cellClasses}
                    onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                    onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                    onDragStart={(e) => e.preventDefault()}
                  >
                    {cell.weight > 1 && !cell.isStart && !cell.isEnd && !cell.isWall && (
                      <div className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_5px_#c084fc]" />
                    )}
                  </div>
                );
              })
            ))}
          </div>
        </div>
      </main>

      {/* Footer Status */}
      <footer className="border-t border-gray-800/60 bg-[#0f0f16] px-6 py-2 flex justify-between items-center text-xs text-gray-500">
        <div className="flex gap-6">
          <span className="flex items-center gap-2"><div className="w-2 h-2 bg-lime-400 shadow-[0_0_5px_#a3e635] rounded-full"></div> Start Node</span>
          <span className="flex items-center gap-2"><div className="w-2 h-2 bg-rose-500 shadow-[0_0_5px_#f43f5e] rounded-full"></div> Target Node</span>
          <span className="flex items-center gap-2"><div className="w-2 h-2 border border-cyan-400 bg-cyan-500/20 rounded-sm"></div> Wall Boundary</span>
          <span className="flex items-center gap-2"><div className="w-2 h-2 bg-purple-400 shadow-[0_0_5px_#c084fc] rounded-full"></div> High Cost (Weight)</span>
        </div>
        <div>
          STATUS: <span className="text-cyan-400 font-bold">AWAITING_EXECUTION</span>
        </div>
      </footer>
    </div>
  );
}