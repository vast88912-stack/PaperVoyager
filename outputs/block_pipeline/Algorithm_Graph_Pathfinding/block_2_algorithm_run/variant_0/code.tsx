import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, StepForward, StepBack, Shuffle, Trash2 } from 'lucide-react';

const ROWS = 15;
const COLS = 30;
const TOTAL_CELLS = ROWS * COLS;

const START_IDX = Math.floor(ROWS / 2) * COLS + 5;
const END_IDX = Math.floor(ROWS / 2) * COLS + (COLS - 6);

// Cell States
const EMPTY = 0;
const WALL = 1;
const FRONTIER = 2;
const VISITED = 3;
const PATH = 4;

type Event = { idx: number; type: number };

const getNeighbors = (idx: number): number[] => {
  const r = Math.floor(idx / COLS);
  const c = idx % COLS;
  const neighbors = [];
  if (r > 0) neighbors.push(idx - COLS); // Up
  if (c < COLS - 1) neighbors.push(idx + 1); // Right
  if (r < ROWS - 1) neighbors.push(idx + COLS); // Down
  if (c > 0) neighbors.push(idx - 1); // Left
  return neighbors;
};

const getHeuristic = (idx: number): number => {
  const r = Math.floor(idx / COLS);
  const c = idx % COLS;
  const er = Math.floor(END_IDX / COLS);
  const ec = END_IDX % COLS;
  return Math.abs(r - er) + Math.abs(c - ec);
};

export default function App() {
  const [baseGrid, setBaseGrid] = useState<Uint8Array>(new Uint8Array(TOTAL_CELLS));
  const [events, setEvents] = useState<Event[]>([]);
  const [eventIndex, setEventIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [algorithm, setAlgorithm] = useState<'BFS' | 'Dijkstra' | 'AStar' | 'Bidirectional'>('AStar');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<number>(WALL);

  // Derived grid state
  const currentGrid = new Uint8Array(baseGrid);
  for (let i = 0; i < eventIndex; i++) {
    currentGrid[events[i].idx] = events[i].type;
  }

  const runAlgorithm = useCallback(() => {
    const newEvents: Event[] = [];
    const grid = baseGrid;

    if (algorithm === 'BFS' || algorithm === 'Dijkstra') {
      // For unweighted grids, Dijkstra is functionally identical to BFS
      const queue = [START_IDX];
      const visited = new Set([START_IDX]);
      const cameFrom = new Map<number, number>();

      while (queue.length > 0) {
        const curr = queue.shift()!;
        if (curr !== START_IDX && curr !== END_IDX) newEvents.push({ idx: curr, type: VISITED });
        if (curr === END_IDX) break;

        for (const n of getNeighbors(curr)) {
          if (grid[n] === WALL || visited.has(n)) continue;
          visited.add(n);
          cameFrom.set(n, curr);
          queue.push(n);
          if (n !== END_IDX) newEvents.push({ idx: n, type: FRONTIER });
        }
      }

      let curr = cameFrom.get(END_IDX);
      const path = [];
      while (curr && curr !== START_IDX) {
        path.push(curr);
        curr = cameFrom.get(curr);
      }
      for (let i = path.length - 1; i >= 0; i--) {
        newEvents.push({ idx: path[i], type: PATH });
      }
    } else if (algorithm === 'AStar') {
      const openSet = [START_IDX];
      const cameFrom = new Map<number, number>();
      const gScore = new Map<number, number>([[START_IDX, 0]]);
      const fScore = new Map<number, number>([[START_IDX, getHeuristic(START_IDX)]]);
      const inOpenSet = new Set([START_IDX]);
      const closedSet = new Set<number>();

      while (openSet.length > 0) {
        openSet.sort((a, b) => (fScore.get(a) || Infinity) - (fScore.get(b) || Infinity));
        const curr = openSet.shift()!;
        inOpenSet.delete(curr);
        closedSet.add(curr);

        if (curr !== START_IDX && curr !== END_IDX) newEvents.push({ idx: curr, type: VISITED });
        if (curr === END_IDX) break;

        for (const n of getNeighbors(curr)) {
          if (grid[n] === WALL || closedSet.has(n)) continue;