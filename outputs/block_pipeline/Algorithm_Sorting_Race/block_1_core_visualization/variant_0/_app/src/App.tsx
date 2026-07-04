import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Types & Interfaces ---
type Item = {
  val: number;
  id: number;
};

type Action =
  | { type: 'COMPARE'; idx: [number, number] }
  | { type: 'SWAP'; idx: [number, number] }
  | { type: 'SET'; idx: number; item: Item }
  | { type: 'FINISH' };

type Algorithm = {
  name: string;
  run: (arr: Item[]) => Action[];
};

type Stats = {
  ops: number;
  writes: number;
  finished: boolean;
  isStable: boolean;
};

// --- Sorting Algorithms (Pure Functions returning Traces) ---
const bubbleSortRun = (initialArr: Item[]): Action[] => {
  const actions: Action[] = [];
  const arr = [...initialArr];
  const n = arr.length;
  for (let i = 0; i < n; i++) {
    let swapped = false;
    for (let j = 0; j < n - i - 1; j++) {
      actions.push({ type: 'COMPARE', idx: [j, j + 1] });
      if (arr[j].val > arr[j + 1].val) {
        actions.push({ type: 'SWAP',