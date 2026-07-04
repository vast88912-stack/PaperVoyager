import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- FLUID DYNAMICS IMPLEMENTATION (Jos Stam's Stable Fluids) ---

const N = 64;
const ITER = 4;
const SIZE = (N + 2) * (N + 2);

function IX(x: number, y: number) {
  return x + (N + 2) * y;
}

class Fluid {
  dt: number;
  diff: number;
  visc: number;
  fade: number;

  s: Float32Array;
  densityR: Float32Array;
  densityG: Float32Array;
  densityB: Float32Array;

  Vx: Float32Array;
  Vy: Float32Array;
  Vx0: Float32Array;
  Vy0: Float32Array;
  
  p: Float32Array; // Pressure

  constructor(dt: number, diffusion: number, viscosity: number, fade: number) {
    this.dt = dt;
    this.diff = diffusion;
    this.visc = viscosity;
    this.fade = fade;

    this.s = new Float32Array(SIZE);
    this.densityR = new Float32Array(SIZE);
    this.densityG = new Float32Array(SIZE);
    this.densityB = new Float32Array(SIZE);

    this.Vx = new Float32Array(SIZE);
    this.Vy = new Float32Array(SIZE);
    this.Vx0 = new Float32Array(SIZE);
    this.Vy0 = new Float32Array(SIZE);
    
    this.p = new Float32Array(SIZE);
  }

  reset() {
    this.densityR.fill(0);
    this.densityG.fill(0);
    this.densityB.fill(0);
    this.Vx.fill(0);
    this.Vy.fill(0);
    this.Vx0.fill(0);
    this.Vy0.fill(0);
    this.p.fill(0);
  }

  addDensity(x: number, y: number, r: number, g: number, b: number, radius: number = 1) {
    for (let j = -radius; j <= radius; j++) {
      for (let i = -radius; i <= radius; i++) {
        const cx = x + i;
        const cy = y + j;
        if (cx > 0 && cx <= N && cy > 0 && cy <= N) {
          const falloff = Math.exp(-(i * i + j * j));
          const idx = IX(cx, cy);
          this.densityR[idx] += r * falloff;
          this.densityG[idx] += g * falloff;
          this.densityB[idx] += b * falloff;
        }
      }
    }
  }

  addVelocity(x: number, y: number, amountX: number, amountY: number, radius: number = 1) {
    for (let j = -radius; j <= radius; j++) {
      for (let i = -radius; i <= radius; i++) {
        const cx = x + i;
        const cy = y + j;
        if (cx > 0 && cx <= N && cy > 0 && cy <= N) {
          const falloff = Math.exp(-(i * i + j * j));
          const idx = IX(cx, cy);
          this.Vx[idx] += amountX * falloff;
          this.Vy[idx] += amountY * falloff;
        }
      }
    }
  }

  step() {
    const visc = this.visc;
    const diff = this.diff;
    const dt = this.dt;
    const Vx = this.Vx;
    const Vy = this.Vy;
    const Vx0 = this.Vx0;
    const Vy0 = this.Vy0;
    const s = this.s;
    const p = this.p;

    this.diffuse(1, Vx0, Vx, visc, dt);
    this.diffuse(2, Vy0, Vy, visc, dt);

    this.project(Vx0, Vy0, Vx, Vy, p);

    this.advect(1, Vx, Vx0, Vx0, Vy0, dt);
    this.advect(2, Vy, Vy0, Vx0, Vy0, dt);

    this.project(Vx, Vy, Vx0, Vy0, p);

    this.diffuse(0, s, this.densityR, diff, dt);
    this.advect(0, this.densityR, s, Vx, Vy, dt);

    this.diffuse(0, s, this.densityG, diff, dt);
    this.advect(0, this.densityG, s, Vx, Vy, dt);

    this.diffuse(0, s, this.densityB, diff, dt);
    this.advect(0, this.densityB, s, Vx, Vy, dt);

    // Fade
    for (let i = 0; i < SIZE; i++) {
      this.densityR[i] *= this.fade;
      this.densityG[i] *= this.fade;
      this.densityB[i] *= this.fade;
      this.Vx[i] *= this.fade;
      this.Vy[i] *= this.fade;
    }
  }

  set_bnd(b: number, x: Float32Array) {
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

  lin_solve(b: number, x: Float32Array, x0: Float32Array, a: number, c: number) {
    const cRecip = 1.0 / c;
    for (let k = 0; k < ITER; k++) {
      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          x[IX(i, j)] =
            (x0[IX(i, j)] +
              a * (x[IX(i + 1, j)] + x[IX(i - 1, j)] + x[IX(i, j + 1)] + x[IX(i, j - 1)])) *
            cRecip;
        }
      }
      this.set_bnd(b, x);
    }
  }

  diffuse(b: number, x: Float32Array, x0: Float32Array, diff: number, dt: number) {
    const a = dt * diff * (N - 2) * (N - 2);
    this.lin_solve(b, x, x0, a, 1 + 4 * a);
  }

  advect(b: number, d: Float32Array, d0: Float32Array, u: Float32Array, v: Float32Array, dt: number) {
    let i0, j0, i1, j1;
    let x, y, s0, t0, s1, t1;
    let dt0 = dt * (N - 2);

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

        d[IX(i, j)] =
          s0 * (t0 * d0[IX(i0, j0)] + t1 * d0[IX(i0, j1)]) +
          s1 * (t0 * d0[IX(i1, j0)] + t1 * d0[IX(i1, j1)]);
      }
    }
    this.set_bnd(b, d);
  }

  project(u: Float32Array, v: Float32Array, p: Float32Array, div: Float32Array, pOut: Float32Array) {
    const h = 1.0 / N;
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        div[IX(i, j)] =
          -0.5 * h * (u[IX(i + 1, j)] - u[IX(i - 1, j)] + v[IX(i, j + 1)] - v[IX(i, j - 1)]);
        p[IX(i, j)] = 0;
      }
    }
    this.set_bnd(0, div);
    this.set_bnd(0, p);
    this.lin_solve(0, p, div, 1, 4);

    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        u[IX(i, j)] -= 0.5 * (p[IX(i + 1, j)] - p[IX(i - 1, j)]) / h;
        v[IX(i, j)] -= 0.5 * (p[IX(i, j + 1)] - p[IX(i, j - 1)]) / h;
        pOut[IX(i, j)] = p[IX(i, j)]; // Store pressure for visualization
      }
    }
    this.set_b