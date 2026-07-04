import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

// --- SVGs for zero-dependency icons ---
const IconPlay = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>;
const IconRefresh = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>;
const IconChart = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"></path><path d="m19 9-5 5-4-4-3 3"></path></svg>;
const IconSettings = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const IconInfo = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>;

// --- PRNG (Mulberry32) for reproducible results ---
function mulberry32(a: number) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// --- Types ---
type ExperimentType = 'pi' | 'area' | 'option';

interface HistoryPoint {
  n: number;
  mean: number;
  stdErr: number;
}

interface SimulationResult {
  mean: number;
  stdErr: number;
  ciLower: number;
  ciUpper: number;
  history: HistoryPoint[];
  trueValue: number;
}

// --- Main Application Component ---
export default function App() {
  const [activeTab, setActiveTab] = useState<ExperimentType>('pi');
  const [targetN, setTargetN] = useState<number>(10000);
  const [currentN, setCurrentN] = useState<number>(10000);
  const [seed, setSeed] = useState<number>(0x1A2B3C);
  const [useIS, setUseIS] = useState<boolean>(false);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);

  // --- Simulation Logic ---
  const results = useMemo<SimulationResult>(() => {
    const prng = mulberry32(seed);
    let sum = 0;
    let sumSq = 0;
    const history: HistoryPoint[] = [];
    
    // Determine step size for chart history to keep performance high
    const recordStep = Math.max(10, Math.floor(currentN / 100));
    let trueValue = 0;

    for (let i = 1; i <= currentN; i++) {
      let val = 0;

      if (activeTab === 'pi') {
        trueValue = Math.PI;
        const x = prng() * 2 - 1;
        const y = prng() * 2 - 1;
        val = (x * x + y * y <= 1) ? 4 : 0;
      } 
      else if (activeTab === 'area') {
        // Integral of 4x^3 from 0 to 1. True value = 1.
        trueValue = 1.0;
        if (useIS) {
          // Importance sampling: sample from p(x) = 2x
          const u = prng();
          const x = Math.sqrt(u); // Inverse CDF
          val = 2 * x * x; // f(x)/p(x) = 4x^3 / 2x
        } else {
          const x = prng();
          val = 4 * x * x * x;
        }
      } 
      else if (activeTab === 'option') {
        // European Call: S0=100, K=100, r=0.05, sigma=0.2, T=1
        trueValue = 10.4506;
        const u1 = prng();
        const u2 = prng();
        // Box-Muller transform for standard normal Z
        let z = Math.sqrt(-2.0 * Math.log(u1 || 1e-9)) * Math.cos(2.0 * Math.PI * u2);

        if (useIS) {
          // Shift mean by 0.5 to sample more ITM paths
          const shift = 0.5;
          z = z + shift;
          const ST = 100 * Math.exp((0.05 - 0.5 * 0.04) * 1 + 0.2 * z);
          const payoff = Math.max(ST - 100, 0);
          // Likelihood ratio W = exp(-shift * Z + 0.5 * shift^2)
          const lr = Math.exp(-shift * z + 0.5 * shift * shift);
          val = payoff * lr * Math.exp(-0.05);
        } else {
          const ST = 100 * Math.exp((0.05 - 0.5 * 0.04) * 1 + 0.2 * z);
          val = Math.max(ST - 100, 0) * Math.exp(-0.05);
        }
      }

      sum += val;
      sumSq += val * val;

      if (i % recordStep === 0 || i === currentN) {
        const mean = sum / i;
        const variance = (sumSq / i) - (mean * mean);
        const stdErr = Math.sqrt(Math.max(0, variance) / i);
        history.push({ n: i, mean, stdErr });
      }
    }

    const mean = sum / currentN;
    const variance = (sumSq / currentN) - (mean * mean);
    const stdErr = Math.sqrt(Math.max(0, variance) / currentN);

    return {
      mean,
      stdErr,
      ci