import React, { useState, useEffect } from 'react';
import { Play, Info, BarChart3, Settings2, BookOpen, Zap, Activity } from 'lucide-react';

// --- Custom Hook for Hero Animation ---
// Simulates sorting algorithms for the visual race track in the hero section.
function useSimulatedSort(speed: number, type: 'fast' | 'slow') {
  const [arr, setArr] = useState<number[]>([]);
  const [active, setActive] = useState<number[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const reset = () => {
      // Generate random array of 30 elements
      setArr(Array.from({ length: 30 }, () => Math.floor(Math.random() * 85) + 15));
      setIsComplete(false);
      setActive([]);
    };
    
    reset();

    const interval = setInterval(() => {
      setArr(prev => {
        if (prev.length === 0) return prev;
        
        let next = [...prev];
        let isSorted = true;
        
        // Check if sorted
        for(let i = 0; i < next.length - 1; i++) {
          if(next[i] > next[i+1]) {
            isSorted = false;
            break;
          }
        }
        
        if(isSorted) {
          setIsComplete(true);
          setActive([]);
          clearInterval(interval);
          // Auto-restart the race after 3 seconds
          timeoutId = setTimeout(reset, 3000);
          return next;
        }

        let newActive: number[] = [];
        
        if (type === 'fast') {
          // Simulate O(n log n) by doing multiple valid swaps per tick
          let swaps = 0;
          let attempts = 0;
          while(swaps < 4 && attempts < 20) {
             let idx = Math.floor(Math.random() * (next.length - 1));
             if (next[idx] > next[idx+1]) {
               let temp = next[idx];
               next[idx] = next[idx+1];
               next[idx+1] = temp;
               newActive.push(idx, idx+1);
               swaps++;
             }
             attempts++;
          }
        } else {
           // Simulate O(n^2) Bubble Sort (one swap per tick)
           for(let i = 0; i < next.length - 1;