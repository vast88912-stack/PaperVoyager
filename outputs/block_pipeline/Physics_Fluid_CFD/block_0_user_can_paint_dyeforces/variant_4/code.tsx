import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

// --- Fluid Engine (Stable Fluids) ---
const N = 80;
const SIZE = (N + 2) * (N + 2);
const ITER = 4;

const IX = (x: number, y: number) => x + (N + 2) * y;

class Fluid {
  dt: number = 0.1;
  diff: number = 0.0;
  visc: number = 0.0;
  dissipation: number = 0.99;

  s: Float32Array = new Float32Array(SIZE);
  densityR: Float32Array = new Float32Array(SIZE);
  densityG: Float32Array = new Float32Array(SIZE);
  densityB: Float32Array = new Float32Array(SIZE);
  
  densityR_prev: Float32Array = new Float32Array(SIZE);
  densityG_prev: Float32Array = new Float32Array(SIZE);
  densityB_prev: Float32Array = new Float32Array(SIZE);

  Vx: Float32Array = new Float32Array(SIZE);
  Vy: Float32Array = new Float32Array(SIZE);
  Vx_prev: Float32Array = new Float32Array(SIZE);
  Vy_prev: Float32Array = new Float32Array(SIZE);

  pressure: Float32Array = new Float32Array(SIZE);
  divergence: Float32Array = new Float32Array(SIZE);

  reset() {
    this.densityR.fill(0); this.densityR_prev.fill(0);
    this.densityG.fill(0); this.densityG_prev.fill(0);
    this.densityB.fill(0); this.densityB_prev.fill(0);
    this.Vx.fill(0); this.Vx_prev.fill(0);
    this.Vy.fill(0); this.Vy_prev.fill(0);
    this.pressure.fill(0); this.divergence.fill(0);
  }

  addDensity(x: number, y: number, r: number, g: number, b: number, amount: number) {
    const idx = IX(x, y);
    this.densityR[idx] += r * amount;
    this.densityG[idx] += g * amount;
    this.densityB[idx] += b * amount;
  }

  addVelocity(x: number, y: number, amountX: number, amountY: number) {
    const idx = IX(x, y);
    this.Vx[idx] += amountX;
    this.Vy[idx] += amountY;
  }

  step() {
    const { visc, diff, dt } = this;
    
    this.velStep(this.Vx, this.Vy, this.Vx_prev, this.Vy_prev, visc, dt);
    
    this.densStep(this.densityR, this.densityR_prev, this.Vx, this.Vy, diff, dt);
    this.densStep(this.densityG, this.densityG_prev, this.Vx, this.Vy, diff, dt);
    this.densStep(this.densityB, this.densityB_prev, this.Vx, this.Vy, diff, dt);
  }

  private setBnd(b: number, x: Float32Array) {
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

  private linSolve(b: number, x: Float32Array, x0: Float32Array, a: number, c: number) {
    for (let k = 0; k < ITER; k++) {
      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          x[IX(i, j)] = (x0[IX(i, j)] + a * (x[IX(i - 1, j)] + x[IX(i + 1, j)] + x[IX(i, j - 1)] + x[IX(i, j + 1)])) / c;
        }
      }
      this.setBnd(b, x);
    }
  }

  private diffuse(b: number, x: Float32Array, x0: Float32Array, diff: number, dt: number) {
    const a = dt * diff * N * N;
    this.linSolve(b, x, x0, a, 1 + 4 * a);
  }

  private advect(b: number, d: Float32Array, d0: Float32Array, u: Float32Array, v: Float32Array, dt: number) {
    let i0, j0, i1, j1;
    let x, y, s0, t0, s1, t1;
    const dt0 = dt * N;

    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
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
        
        d[IX(i, j)] = s0 * (t0 * d0[IX(i0, j0)] + t1 * d0[IX(i0, j1)]) +
                      s1 * (t0 * d0[IX(i1, j0)] + t1 * d0[IX(i1, j1)]);
      }
    }
    this.setBnd(b, d);
  }

  private project(u: Float32Array, v: Float32Array, p: Float32Array, div: Float32Array) {
    const h = 1.0 / N;
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        div[IX(i, j)] = -0.5 * h * (u[IX(i + 1, j)] - u[IX(i - 1, j)] + v[IX(i, j + 1)] - v[IX(i, j - 1)]);
        p[IX(i, j)] = 0;
      }
    }
    this.setBnd(0, div);
    this.setBnd(0, p);
    
    this.linSolve(0, p, div, 1, 4);
    
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        u[IX(i, j)] -= 0.5 * (p[IX(i + 1, j)] - p[IX(i - 1, j)]) / h;
        v[IX(i, j)] -= 0.5 * (p[IX(i, j + 1)] - p[IX(i, j - 1)]) / h;
      }
    }
    this.setBnd(1, u);
    this.setBnd(2, v);
  }

  private densStep(x: Float32Array, x0: Float32Array, u: Float32Array, v: Float32Array, diff: number, dt: number) {
    this.diffuse(0, x0, x, diff, dt);
    this.advect(0, x, x0, u, v, dt);
    // Dissipation
    for (let i = 0; i < SIZE; i++) x[i] *= this.dissipation;
  }

  private velStep(u: Float32Array, v: Float32Array, u0: Float32Array, v0: Float32Array, visc: number, dt: number) {
    this.diffuse(1, u0, u, visc, dt);
    this.diffuse(2, v0, v, visc, dt);
    this.project(u0, v0, this.pressure, this.divergence);
    this.advect(1, u, u0, u0, v0, dt);
    this.advect(2, v, v0, u0, v0, dt);
    this.project(u, v, this.pressure, this.divergence);
  }
}

// --- Helpers ---
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const f = (n: number, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  return [f(5), f(3