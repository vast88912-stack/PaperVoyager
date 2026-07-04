import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- Fluid Simulation Constants & Helpers ---
const N = 100;
const SIZE = (N + 2) * (N + 2);
const ITER = 4;

const IX = (x: number, y: number) => x + (N + 2) * y;

function hsvToRgb(h: number, s: number, v: number) {
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return [r * 255, g * 255, b * 255];
}

class FluidSolver {
  s: Float32Array;
  densityR: Float32Array;
  densityG: Float32Array;
  densityB: Float32Array;
  densityR0: Float32Array;
  densityG0: Float32Array;
  densityB0: Float32Array;
  Vx: Float32Array;
  Vy: Float32Array;
  Vx0: Float32Array;
  Vy0: Float32Array;
  p: Float32Array;
  div: Float32Array;
  mask: Uint8Array;

  constructor() {
    this.s = new Float32Array(SIZE);
    this.densityR = new Float32Array(SIZE);
    this.densityG = new Float32Array(SIZE);
    this.densityB = new Float32Array(SIZE);
    this.densityR0 = new Float32Array(SIZE);
    this.densityG0 = new Float32Array(SIZE);
    this.densityB0 = new Float32Array(SIZE);
    this.Vx = new Float32Array(SIZE);
    this.Vy = new Float32Array(SIZE);
    this.Vx0 = new Float32Array(SIZE);
    this.Vy0 = new Float32Array(SIZE);
    this.p = new Float32Array(SIZE);
    this.div = new Float32Array(SIZE);
    this.mask = new Uint8Array(SIZE);
  }

  reset() {
    this.densityR.fill(0); this.densityG.fill(0); this.densityB.fill(0);
    this.densityR0.fill(0); this.densityG0.fill(0); this.densityB0.fill(0);
    this.Vx.fill(0); this.Vy.fill(0);
    this.Vx0.fill(0); this.Vy0.fill(0);
    this.p.fill(0); this.div.fill(0);
    this.mask.fill(0);
  }

  setObstacle(cx: number, cy: number, radius: number) {
    this.mask.fill(0);
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        const dx = i - cx;
        const dy = j - cy;
        if (dx * dx + dy * dy <= radius * radius) {
          this.mask[IX(i, j)] = 1;
        }
      }
    }
  }

  addVelocity(x: number, y: number, amountX: number, amountY: number, radius: number = 2) {
    for (let j = -radius; j <= radius; j++) {
      for (let i = -radius; i <= radius; i++) {
        if (i * i + j * j <= radius * radius) {
          const px = Math.floor(x + i);
          const py = Math.floor(y + j);
          if (px > 0 && px <= N && py > 0 && py <= N && !this.mask[IX(px, py)]) {
            const idx = IX(px, py);
            this.Vx[idx] += amountX;
            this.Vy[idx] += amountY;
          }
        }
      }
    }
  }

  addDye(x: number, y: number, r: number, g: number, b: number, radius: number = 2) {
    for (let j = -radius; j <= radius; j++) {
      for (let i = -radius; i <= radius; i++) {
        if (i * i + j * j <= radius * radius) {
          const px = Math.floor(x + i);
          const py = Math.floor(y + j);
          if (px > 0 && px <= N && py > 0 && py <= N && !this.mask[IX(px, py)]) {
            const idx = IX(px, py);
            this.densityR[idx] += r;
            this.densityG[idx] += g;
            this.densityB[idx] += b;
          }
        }
      }
    }
  }

  setBnd(b: number, x: Float32Array) {
    for (let i = 1; i <= N; i++) {
      x[IX(0, i)] = b === 1 ? -x[IX(1, i)] : x[IX(1, i)];
      x[IX(N + 1, i)] = b === 1 ? -x[IX(N, i)] : x[IX(N, i)];
      x[IX(i, 0)] = b === 2 ? -x[IX(i, 1)] : x[IX(i, 1)];
      x[IX(i, N + 1)] = b === 2 ? -x[IX(i, N)] : x[IX(i, N)];
    }
    x[IX(0, 0)] = 0.5 * (x[IX(1, 0)] + x[IX(0, 1)]);
    x[IX(0, N + 1)] = 0.5 * (x[IX(1, N + 1)] + x[IX(0, N)]);
    x[IX(N + 1, 0)] = 0.5 * (x[IX(N, 0)] + x[IX(N + 1, 1)]);
    x[IX(N + 1, N + 1)] = 0.5 * (x[IX(N, N + 1)] + x[IX(N + 1, N)]);
  }

  linSolve(b: number, x: Float32Array, x0: Float32Array, a: number, c: number) {
    const cRecip = 1.0 / c;
    for (let k = 0; k < ITER; k++) {
      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          if (this.mask[IX(i, j)]) {
            x[IX(i, j)] = 0;
            continue;
          }
          x[IX(i, j)] =
            (x0[IX(i, j)] +
              a * (x[IX(i + 1, j)] + x[IX(i - 1, j)] + x[IX(i, j + 1)] + x[IX(i, j - 1)])) *
            cRecip;
        }
      }
      this.setBnd(b, x);
    }
  }

  diffuse(b: number, x: Float32Array, x0: Float32Array, diff: number, dt: number) {
    const a = dt * diff * N * N;
    this.linSolve(b, x, x0, a, 1 + 4 * a);
  }

  advect(b: number, d: Float32Array, d0: Float32Array, u: Float32Array, v: Float32Array, dt: number) {
    let i0, j0, i1, j1;
    let x, y, s0, t0, s1, t1;
    const dt0 = dt * N;
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        if (this.mask[IX(i, j)]) {
          d[IX(i, j)] = 0;
          continue;
        }
        x = i - dt0 * u[IX(i, j)];
        y = j - dt0 * v[IX(i, j)];
        if (x < 0.5) x = 0.5;
        if (x > N + 0.5) x = N + 0.5;
        i0 = Math.floor(x);
        i1 = i0 + 1;
        if (y < 0.5) y = 0.5;
        if (y > N + 0.5) y = N + 0.5;
        j0 = Math.floor(y);
        j1 = j0 + 1;
        s1 = x - i0;
        s0 = 1.0 - s1;
        t1 = y - j0;
        t0 = 1.0 - t1;
        d[IX(i, j)] =
          s0 * (t0 * d0[IX(i0, j0)] + t1 * d0[IX(i0, j1)]) +
          s1 * (t0 * d0[IX(i1, j0)] + t1 * d0[IX(i1, j1)]);
      }
    }
    this.setBnd(b, d);
  }

  project(u: Float32Array, v: Float32Array, p: Float32Array, div: Float32Array) {
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        if (this.mask[IX(i, j)]) continue;
        div[IX(i, j)] =
          (-0.5 * (u[IX(i + 1, j)] - u[IX(i - 1, j)] + v[IX(i, j + 1)] - v[IX(i, j - 1)])) / N;
        p[IX(i, j)] = 0;
      }
    }
    this.setBnd(0, div);
    this.setBnd(0, p);
    this.linSolve(0, p, div, 1, 4);
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        if (this.mask[IX(i, j)]) {
          u[IX(i, j)] = 0;
          v[IX(i, j)] = 0;
          continue;
        }
        u[IX(i, j)] -= 0.5 * N * (p[IX(i +