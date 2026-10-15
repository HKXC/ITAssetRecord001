"use client";

import { useEffect, useRef } from "react";

/**
 * Decorative particle field behind the public auth screens.
 *
 * Design constraints (this sits on a login page, so it must never be the reason the page
 * feels slow):
 *   - particle count derives from viewport area and is hard-capped;
 *   - the O(n²) connection pass is dropped on low-power devices, and dropped again if the
 *     frame budget is actually missed — so it degrades instead of janking;
 *   - `prefers-reduced-motion` renders exactly one static frame and never starts a loop;
 *   - the loop stops while the tab is hidden (no CPU burn in a background tab);
 *   - everything is torn down on unmount (Strict Mode runs effects twice in dev).
 *
 * The routines below are arrow `const`s rather than `function` declarations on purpose:
 * TypeScript does not carry a null-narrowing into a hoisted declaration, and this keeps
 * `canvas`/`ctx` provably non-null without a single `!`.
 *
 * It is decorative only: `aria-hidden` and `pointer-events: none` mean it can disappear
 * entirely without changing what the page communicates or how it is operated.
 */
export function AuthBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cores = navigator.hardwareConcurrency ?? 8;
    const memory = (navigator as { deviceMemory?: number }).deviceMemory ?? 8;
    const lowPower = cores <= 2 || memory <= 2;

    const EMERALD = "52, 211, 153";
    const GRID_STEP = 64;
    const MAX_DIST = 130;
    /** ms per frame that still counts as ~60fps; beyond this we shed work. */
    const FRAME_BUDGET = 26;
    const SAMPLE_FRAMES = 90;

    type Particle = { x: number; y: number; vx: number; vy: number; r: number; a: number };

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let rafId = 0;
    let previousTime = 0;
    let slowFrames = 0;
    let shedWork = false;

    /** Area-derived count, clamped so neither an ultrawide nor a phone runs away with it. */
    const particleBudget = (): number => {
      const base = Math.round((width * height) / 22_000);
      const cap = lowPower ? 24 : 64;
      return Math.max(12, Math.min(cap, base));
    };

    const spawn = (): void => {
      const count = shedWork ? Math.round(particleBudget() * 0.55) : particleBudget();
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.32,
        vy: (Math.random() - 0.5) * 0.32,
        r: Math.random() * 1.4 + 0.4,
        a: Math.random() * 0.45 + 0.12,
      }));
    };

    const resize = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      spawn();
    };

    const drawGrid = (): void => {
      ctx.strokeStyle = `rgba(${EMERALD}, 0.05)`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let x = GRID_STEP; x < width; x += GRID_STEP) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
      }
      for (let y = GRID_STEP; y < height; y += GRID_STEP) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
      }
      ctx.stroke();
    };

    const drawConnections = (): void => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance >= MAX_DIST) continue;
          ctx.strokeStyle = `rgba(${EMERALD}, ${(1 - distance / MAX_DIST) * 0.16})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    };

    const render = (move: boolean): void => {
      ctx.clearRect(0, 0, width, height);
      drawGrid();

      for (const p of particles) {
        if (move) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${EMERALD}, ${p.a})`;
        ctx.fill();
      }

      // Connections are the expensive part — first thing to go when frames slip.
      if (!lowPower && !shedWork) drawConnections();
    };

    const frame = (time: number): void => {
      rafId = requestAnimationFrame(frame);

      if (previousTime) {
        const delta = time - previousTime;
        if (delta > FRAME_BUDGET) slowFrames += 1;
        else slowFrames = Math.max(0, slowFrames - 1);

        if (!shedWork && slowFrames >= SAMPLE_FRAMES) {
          shedWork = true;
          spawn();
          slowFrames = 0;
        }
      }
      previousTime = time;

      render(true);
    };

    const start = (): void => {
      if (rafId || motionQuery.matches || document.hidden) return;
      previousTime = 0;
      slowFrames = 0;
      rafId = requestAnimationFrame(frame);
    };

    const stop = (): void => {
      if (!rafId) return;
      cancelAnimationFrame(rafId);
      rafId = 0;
    };

    /** Re-evaluate whenever motion preference or tab visibility changes. */
    const sync = (): void => {
      if (motionQuery.matches) {
        stop();
        render(false); // one static frame — no animation at all
      } else {
        start();
      }
    };

    const handleVisibility = (): void => {
      if (document.hidden) stop();
      else start();
    };

    let resizeHandle = 0;
    const handleResize = (): void => {
      window.clearTimeout(resizeHandle);
      resizeHandle = window.setTimeout(() => {
        resize();
        if (motionQuery.matches || document.hidden) render(false);
      }, 150);
    };

    resize();
    sync();

    motionQuery.addEventListener("change", sync);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("resize", handleResize);

    return () => {
      stop();
      window.clearTimeout(resizeHandle);
      motionQuery.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="auth-canvas" aria-hidden="true" />;
}
