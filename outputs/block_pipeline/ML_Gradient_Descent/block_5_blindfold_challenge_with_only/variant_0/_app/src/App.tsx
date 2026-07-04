import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Logical game state (used for math and instant updates)
  const gameState = useRef({
    pos: { x: 0, y: 0 },
    path: [] as { x: number; y: number }[],
    lr: 0.1,
    target: { x: 0, y: 0 },
    won: false,
    diverged: false,
  });

  // Animated position for smooth rendering
  const animPos = useRef({ x: 0, y: 0 });

  // UI State (synced with game state for rendering sidebar)
  const [uiState, setUiState] = useState({
    steps: 0,
    loss: 0,
    gradMag: 0,
    lr: 0.1,
    won: false,
    diverged: false,
  });

  // Initialize or Reset the game
  const handleReset = useCallback(() => {
    // Randomize target between -8 and 8
    const tx = (Math.random() - 0.5) * 16;
    const ty = (Math.random() - 0.5) * 16;

    // Randomize start pos, ensure it's