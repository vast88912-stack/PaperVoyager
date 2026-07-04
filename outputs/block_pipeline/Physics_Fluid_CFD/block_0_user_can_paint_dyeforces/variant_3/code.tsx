import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- Fluid Dynamics Engine ---
// Based on Jos Stam's "Real-Time Fluid Dynamics for Games"

const N = 70; // Grid resolution (N x N inner grid). Modest size for CPU real-time JS.
const SIZE = (N + 2) * (N + 2);
const ITER = 4; // Solver iterations

const IX = (x: number, y: number) => x + (N + 2) * y;

class Fluid {
  public dt: number = 0.1;
  public diff: number = 0.0000;
  public visc: number = 0.0000;

  public s: Float32Array = new Float32Array(SIZE);
  public densityR: Float32Array = new Float32Array(SIZE);
  public densityG: Float32Array = new Float32Array(SIZE);
  public densityB: Float32Array = new Float32Array(SIZE);
  public densityR_prev: Float32Array = new Float32Array(SIZE);
  public densityG_prev: Float32Array = new Float32Array(SIZE);
  public densityB_prev: Float32Array = new Float32Array(SIZE);

  public u: Float32Array = new Float32Array(SIZE);
  public v: Float32Array = new Float32Array(SIZE);
  public u_prev: Float32Array = new Float32Array(SIZE);
  public v_prev: Float32Array = new Float32Array(SIZE);

  public p: Float32Array = new Float32Array(SIZE);
  public div: Float32Array = new Float32Array(SIZE);

  constructor() {
    this.reset();
  }

  public reset() {
    this.s.fill(0);
    this.densityR.fill(0); this.densityG.fill(0); this.densityB.fill(0);
    this.densityR_prev.fill(0); this.densityG_prev.fill(0); this.densityB_prev.fill(0);
    this.u.fill(0); this.v.fill(0);
    this.u_prev.fill(0); this.v_prev.fill(0);
    this.p.fill(0); this.div.fill(0);
  }

  private add_source(x: Float32Array, s: Float32Array, dt: number) {
    for (let i = 0; i < SIZE; i++) x[i] += dt * s[i];
  }

  private set_bnd(b: number, x: Float32Array) {
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

  private lin_solve(b: number, x: Float32Array, x0: Float32Array, a: number, c: number) {
    const cRecip = 1.0 / c;
    for (let k = 0; k < ITER; k++) {
      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          x[IX(i, j)] = (x0[IX(i, j)] + a * (x[IX(i + 1, j)] + x[IX(i - 1, j)] + x[IX(i, j + 1)] + x[IX(i, j - 1)])) * cRecip;
        }
      }
      this.set_bnd(b, x);
    }
  }

  private diffuse(b: number, x: Float32Array, x0: Float32Array, diff: number, dt: number) {
    const a = dt * diff * N * N;
    this.lin_solve(b, x, x0, a, 1 + 4 * a);
  }

  private advect(b: number, d: Float32Array, d0: Float32Array, u: Float32Array, v: Float32Array, dt: number) {
    let i0, j0, i1, j1;
    let x, y, s0, t0, s1, t1;
    let dt0 = dt * N;
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        x = i - dt0 * u[IX(i, j)];
        y = j - dt0 * v[IX(i, j)];
        if (x < 0.5) x = 0.5; if (x > N + 0.5) x = N + 0.5;
        i0 = Math.floor(x); i1 = i0 + 1;
        if (y < 0.5) y = 0.5; if (y > N + 0.5) y = N + 0.5;
        j0 = Math.floor(y); j1 = j0 + 1;
        s1 = x - i0; s0 = 1.0 - s1;
        t1 = y - j0; t0 = 1.0 - t1;
        d[IX(i, j)] = s0 * (t0 * d0[IX(i0, j0)] + t1 * d0[IX(i0, j1)]) +
                      s1 * (t0 * d0[IX(i1, j0)] + t1 * d0[IX(i1, j1)]);
      }
    }
    this.set_bnd(b, d);
  }

  private project(u: Float32Array, v: Float32Array, p: Float32Array, div: Float32Array) {
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        div[IX(i, j)] = -0.5 * (u[IX(i + 1, j)] - u[IX(i - 1, j)] + v[IX(i, j + 1)] - v[IX(i, j - 1)]) / N;
        p[IX(i, j)] = 0;
      }
    }
    this.set_bnd(0, div); this.set_bnd(0, p);
    this.lin_solve(0, p, div, 1, 4);
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        u[IX(i, j)] -= 0.5 * N * (p[IX(i + 1, j)] - p[IX(i - 1, j)]);
        v[IX(i, j)] -= 0.5 * N * (p[IX(i, j + 1)] - p[IX(i, j - 1)]);
      }
    }
    this.set_bnd(1, u); this.set_bnd(2, v);
  }

  private densityStep(x: Float32Array, x0: Float32Array, u: Float32Array, v: Float32Array, diff: number, dt: number) {
    this.add_source(x, x0, dt);
    let temp = x0; x0 = x; x = temp;
    this.diffuse(0, x, x0, diff, dt);
    temp = x0; x0 = x; x = temp;
    this.advect(0, x, x0, u, v, dt);
    // Overwrite the original array references content to maintain links
    for(let i=0; i<SIZE; i++) x0[i] = x[i]; 
  }

  public step() {
    // Velocity Step
    this.add_source(this.u, this.u_prev, this.dt);
    this.add_source(this.v, this.v_prev, this.dt);
    
    let temp = this.u_prev; this.u_prev = this.u; this.u = temp;
    temp = this.v_prev; this.v_prev = this.v; this.v = temp;
    
    this.diffuse(1, this.u, this.u_prev, this.visc, this.dt);
    this.diffuse(2, this.v, this.v_prev, this.visc, this.dt);
    
    this.project(this.u, this.v, this.p, this.div);
    
    temp = this.u_prev; this.u_prev = this.u; this.u = temp;
    temp = this.v_prev; this.v_prev = this.v; this.v = temp;
    
    this.advect(1, this.u, this.u_prev, this.u_prev, this.v_prev, this.dt);
    this.advect(2, this.v, this.v_prev, this.u_prev, this.v_prev, this.dt);
    
    this.project(this.u, this.v, this.p, this.div);

    // Density Steps (RGB)
    this.densityStep(this.densityR, this.densityR_prev, this.u, this.v, this.diff, this.dt);
    this.densityStep(this.densityG, this.densityG_prev, this.u, this.v, this.diff, this.dt);
    this.densityStep(this.densityB, this.densityB_prev, this.u, this.v, this.diff, this.dt);

    // Fade density slightly to prevent canvas from filling up completely over time
    for (let i = 0; i < SIZE; i++) {
        this.densityR[i] *= 0.995;
        this.densityG[i] *= 0.995;
        this.densityB[i] *= 0.995;
    }

    // Reset inputs
    this.u_prev.fill(0); this.v_prev.fill(0);
    this.densityR_prev.fill(0); this.densityG_prev.fill(0); this.densityB_prev.fill(0);
  }

  public addVelocity(x: number, y: number, amountX: number, amountY: number, radius: number) {
    const cx = Math.floor(x * N);
    const cy = Math.floor(y * N);
    const R = Math.floor(radius * N);
    for (let j = cy - R; j <= cy + R; j++) {
      for (let i = cx - R; i <= cx + R; i++) {
        if (i > 0 && i <= N && j > 0 && j <= N) {
          const dx = i - cx; const dy = j - cy;
          if (dx * dx + dy * dy <= R * R) {
            const idx = IX(i, j);
            this.u_prev[idx] += amountX;
            this.v_prev[idx] += amountY;
          }
        }
      }
    }
  }

  public addDensity(x: