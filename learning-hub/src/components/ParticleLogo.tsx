"use client";

/**
 * ParticleLogo: a particle field that cycles through a sequence of shapes (3D sphere → Saigon Technology
 * mark → words), rotating in 3D, with pointer repulsion and spring return. Our own Canvas 2D
 * implementation of the "particle sequence" idea (reference: effect-labs.com generator-particles).
 * DESIGN_SYSTEM.md → Brand → Particle logo.
 *
 * - Pauses when off screen or when the tab is hidden.
 * - prefers-reduced-motion: draws the last "mark" step once, no animation, no pointer effect.
 */
import { useEffect, useRef } from "react";
import { BRAND, ST_MARK } from "@/lib/brand";

export type ParticleStep = { kind: "sphere" } | { kind: "mark" } | { kind: "text"; text: string; weight?: number };

type Props = {
  width: number;
  height: number;
  steps?: ParticleStep[];
  /** particle count */
  count?: number;
  /** dot radius in CSS px */
  dot?: number;
  /** ms each shape is held */
  hold?: number;
  /** ms for the morph between shapes (includes left→right stagger) */
  transition?: number;
  /** pointer repulsion radius in CSS px (0 = off) */
  repel?: number;
  /** colour of the mark's white strokes / text base: light on dark mode, dark on light mode */
  ink: string;
  /** start scattered and fly in */
  intro?: boolean;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
};

const GRAD = [BRAND.green, BRAND.teal, BRAND.blue].map(hex);

function hex(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function grad(t: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, t)) * (GRAD.length - 1);
  const i = Math.min(GRAD.length - 2, Math.floor(x));
  const f = x - i;
  return [0, 1, 2].map((k) => GRAD[i][k] + (GRAD[i + 1][k] - GRAD[i][k]) * f) as [number, number, number];
}

type Target = { x: Float32Array; y: Float32Array; z: Float32Array; r: Float32Array; g: Float32Array; b: Float32Array; spin: boolean };

/** Sample filled pixels of something drawn on an offscreen canvas → n points in [-1,1] space. */
function sampleDrawing(n: number, aspect: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, colorOf: (r: number, g: number, b: number, u: number) => [number, number, number]): Target {
  const H = 220;
  const W = Math.round(H * aspect);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  draw(ctx, W, H);
  const data = ctx.getImageData(0, 0, W, H).data;
  const pts: number[] = [];
  const step = Math.max(1, Math.floor(Math.sqrt((W * H) / (n * 3))));
  for (let y = 0; y < H; y += step)
    for (let x = 0; x < W; x += step) {
      const o = (y * W + x) * 4;
      if (data[o + 3] > 128) pts.push(x, y, data[o], data[o + 1], data[o + 2]);
    }
  const m = pts.length / 5 || 1;
  const t = alloc(n, false);
  const scale = 2 / H; // y ∈ [-1, 1], x ∈ [-aspect, aspect]; projected with R = height / 2
  for (let i = 0; i < n; i++) {
    const k = (Math.floor((i * m) / n) + (i % 3)) % m;
    const px = pts[k * 5] ?? W / 2;
    const py = pts[k * 5 + 1] ?? H / 2;
    t.x[i] = (px - W / 2 + (Math.random() - 0.5) * step) * scale;
    t.y[i] = (py - H / 2 + (Math.random() - 0.5) * step) * scale;
    t.z[i] = (Math.random() - 0.5) * 0.12;
    const [r, g, b] = colorOf(pts[k * 5 + 2] ?? 255, pts[k * 5 + 3] ?? 255, pts[k * 5 + 4] ?? 255, px / W);
    t.r[i] = r;
    t.g[i] = g;
    t.b[i] = b;
  }
  return t;
}

function alloc(n: number, spin: boolean): Target {
  return { x: new Float32Array(n), y: new Float32Array(n), z: new Float32Array(n), r: new Float32Array(n), g: new Float32Array(n), b: new Float32Array(n), spin };
}

function buildTarget(step: ParticleStep, n: number, aspect: number, ink: [number, number, number], font: string): Target {
  if (step.kind === "sphere") {
    const t = alloc(n, true);
    const ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      t.x[i] = Math.cos(ga * i) * r * 0.78;
      t.y[i] = y * 0.78;
      t.z[i] = Math.sin(ga * i) * r * 0.78;
      const [cr, cg, cb] = grad((y + 1) / 2);
      t.r[i] = cr;
      t.g[i] = cg;
      t.b[i] = cb;
    }
    return t;
  }
  if (step.kind === "mark") {
    const inkPath = new Path2D(ST_MARK.ink);
    const accPath = new Path2D(ST_MARK.accent);
    return sampleDrawing(
      n,
      aspect,
      (ctx, w, h) => {
        const s = (h * 0.86) / ST_MARK.height;
        ctx.translate((w - ST_MARK.width * s) / 2, (h - ST_MARK.height * s) / 2);
        ctx.scale(s, s);
        ctx.fillStyle = "#ffffff";
        ctx.fill(inkPath);
        ctx.fillStyle = BRAND.green;
        ctx.fill(accPath);
      },
      (r, g, b) => (g > 200 && r > 200 ? ink : hex(BRAND.green)),
    );
  }
  const text = step.text;
  return sampleDrawing(
    n,
    aspect,
    (ctx, w, h) => {
      let size = h * 0.5;
      ctx.font = `${step.weight ?? 700} ${size}px ${font}`;
      const tw = ctx.measureText(text).width;
      if (tw > w * 0.84) size *= (w * 0.84) / tw;
      ctx.font = `${step.weight ?? 700} ${size}px ${font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      ctx.fillText(text, w / 2, h / 2);
    },
    (_r, _g, _b, u) => grad(u),
  );
}

export default function ParticleLogo({
  width,
  height,
  steps = [{ kind: "sphere" }, { kind: "mark" }],
  count = 1400,
  dot = 1.3,
  hold = 2600,
  transition = 1400,
  repel = 70,
  ink,
  intro = true,
  className,
  style,
  ariaLabel = `${BRAND.company} logo`,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const stepsKey = JSON.stringify(steps);

  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | undefined;
    // Text steps are sampled from canvas text, so wait for the web fonts first.
    document.fonts.ready.then(() => {
      if (!cancelled) stop = start();
    });
    return () => {
      cancelled = true;
      stop?.();
    };

    function start(): (() => void) | undefined {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const list = JSON.parse(stepsKey) as ParticleStep[];
    const n = count;
    const aspect = width / height;
    const inkRGB = hex(ink);
    const font = getComputedStyle(document.body).getPropertyValue("--font-display").trim() || "sans-serif";
    const targets = list.map((s) => buildTarget(s, n, aspect, inkRGB, `${font}, Inter, sans-serif`));
    const R = height * 0.5; // [-1,1] (height) → px
    const cx = width / 2;
    const cy = height / 2;
    const FOV = 4.5;

    // particle state (2D screen space, springs) + colour
    const px = new Float32Array(n), py = new Float32Array(n), vx = new Float32Array(n), vy = new Float32Array(n);
    const cr = new Float32Array(n), cg = new Float32Array(n), cb = new Float32Array(n);
    const delay = new Float32Array(n);
    const t0 = targets[0];
    for (let i = 0; i < n; i++) {
      px[i] = intro && !reduced ? Math.random() * width : cx + t0.x[i] * R;
      py[i] = intro && !reduced ? Math.random() * height : cy + t0.y[i] * R;
      cr[i] = t0.r[i];
      cg[i] = t0.g[i];
      cb[i] = t0.b[i];
    }

    let cur = 0;
    let stepStart = performance.now();
    const stagger = transition * 0.45;
    const setStaggerFor = (t: Target) => {
      for (let i = 0; i < n; i++) delay[i] = ((t.x[i] / aspect + 1) / 2) * stagger + Math.random() * 60;
    };
    setStaggerFor(t0);

    let mx = -1e4, my = -1e4;
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
    };
    const onLeave = () => {
      mx = my = -1e4;
    };
    if (repel > 0 && !reduced) {
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerleave", onLeave);
    }

    let angle = 0;
    const draw = (now: number, animate: boolean) => {
      const t = targets[cur];
      const elapsed = now - stepStart;
      if (animate && list.length > 1 && elapsed > hold + transition) {
        cur = (cur + 1) % targets.length;
        stepStart = now;
        setStaggerFor(targets[cur]);
      }
      // sphere spins; flat shapes (mark, words) settle to a gentle sway so wide text stays inside the canvas
      angle = t.spin ? angle + 0.006 : angle * 0.94 + Math.sin(now / 1600) * (0.0025 / Math.max(1, aspect / 1.5));
      const ca = Math.cos(angle), sa = Math.sin(angle);
      ctx.clearRect(0, 0, width, height);
      const tt = targets[cur];
      const colorK = 0.06;
      for (let i = 0; i < n; i++) {
        const go = !animate || now - stepStart > delay[i];
        // rotate target around Y, perspective project
        const x = tt.x[i] * ca + tt.z[i] * sa;
        const z = -tt.x[i] * sa + tt.z[i] * ca;
        const s = FOV / (FOV + z);
        const gx = cx + x * R * s;
        const gy = cy + tt.y[i] * R * s;
        if (!animate) {
          px[i] = gx;
          py[i] = gy;
        } else {
          if (go) {
            vx[i] += (gx - px[i]) * 0.045;
            vy[i] += (gy - py[i]) * 0.045;
            cr[i] += (tt.r[i] - cr[i]) * colorK;
            cg[i] += (tt.g[i] - cg[i]) * colorK;
            cb[i] += (tt.b[i] - cb[i]) * colorK;
          }
          if (repel > 0) {
            const dx = px[i] - mx, dy = py[i] - my;
            const d2 = dx * dx + dy * dy;
            if (d2 < repel * repel && d2 > 0.01) {
              const d = Math.sqrt(d2);
              const f = (1 - d / repel) * 2.4;
              vx[i] += (dx / d) * f;
              vy[i] += (dy / d) * f;
            }
          }
          vx[i] *= 0.82;
          vy[i] *= 0.82;
          px[i] += vx[i];
          py[i] += vy[i];
        }
        const depth = Math.max(0.25, Math.min(1, 0.55 + (1 - z) * 0.4));
        const size = dot * s;
        ctx.globalAlpha = depth;
        ctx.fillStyle = `rgb(${cr[i] | 0},${cg[i] | 0},${cb[i] | 0})`;
        ctx.fillRect(px[i] - size / 2, py[i] - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
      void t;
    };

    if (reduced) {
      // static: show the mark (or last step) immediately
      const markIdx = list.findIndex((s) => s.kind === "mark");
      cur = markIdx >= 0 ? markIdx : list.length - 1;
      const tt = targets[cur];
      for (let i = 0; i < n; i++) {
        cr[i] = tt.r[i];
        cg[i] = tt.g[i];
        cb[i] = tt.b[i];
      }
      draw(performance.now(), false);
      return;
    }

    let raf = 0;
    let visible = true;
    const loop = (now: number) => {
      raf = 0;
      if (!visible || document.hidden) return;
      draw(now, true);
      raf = requestAnimationFrame(loop);
    };
    const wake = () => {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver((es) => {
      visible = es.some((e) => e.isIntersecting);
      wake();
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", wake);
    wake();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", wake);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
    }
  }, [width, height, stepsKey, count, dot, hold, transition, repel, ink, intro]);

  return <canvas ref={ref} role="img" aria-label={ariaLabel} className={className} style={{ width, height, display: "block", ...style }} />;
}
