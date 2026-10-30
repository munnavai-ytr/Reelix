// Easing curves and spring physics calculator for animations and keyframes
import { EasingType } from './types';

export function evaluateEasing(t: number, easing: EasingType = 'linear'): number {
  const clampT = Math.max(0, Math.min(1, t));

  switch (easing) {
    case 'linear':
      return clampT;
    case 'ease':
      // standard cubic-bezier(0.25, 0.1, 0.25, 1)
      return cubicBezier(clampT, 0.25, 0.1, 0.25, 1);
    case 'ease-in':
      return clampT * clampT;
    case 'ease-out':
      return clampT * (2 - clampT);
    case 'ease-in-out':
      return clampT < 0.5 ? 2 * clampT * clampT : -1 + (4 - 2 * clampT) * clampT;
    case 'spring':
      // Damped harmonic oscillator simulation
      return 1 - Math.exp(-6 * clampT) * Math.cos(10 * clampT);
    case 'bezier':
      // Smooth cinematic ease (0.16, 1, 0.3, 1)
      return cubicBezier(clampT, 0.16, 1, 0.3, 1);
    default:
      return clampT;
  }
}

// Cubic bezier approximation
function cubicBezier(t: number, p1x: number, p1y: number, p2x: number, p2y: number): number {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;

  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;

  function sampleCurveX(tVal: number): number {
    return ((ax * tVal + bx) * tVal + cx) * tVal;
  }
  function sampleCurveY(tVal: number): number {
    return ((ay * tVal + by) * tVal + cy) * tVal;
  }

  // Newton-Raphson solve for t
  let t2 = t;
  for (let i = 0; i < 6; i++) {
    const x2 = sampleCurveX(t2) - t;
    if (Math.abs(x2) < 1e-4) return sampleCurveY(t2);
    const d2 = (3 * ax * t2 + 2 * bx) * t2 + cx;
    if (Math.abs(d2) < 1e-4) break;
    t2 -= x2 / d2;
  }
  return sampleCurveY(Math.max(0, Math.min(1, t2)));
}
