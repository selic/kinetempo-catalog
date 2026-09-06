/**
 * The little figure in the header, solved the way the app solves it: segment
 * lengths and joint flexion angles in degrees, zero at the neutral pose. This is
 * a trimmed port of the app's `src/anim/pose.ts` — standing orientation only,
 * which is all the header needs — so the mark moves like the real thing rather
 * than being a drawing of it.
 */
(() => {
  const host = document.getElementById('brand-figure');
  if (!host) return;

  const SEG = { torso: 74, neck: 14, head: 14, thigh: 60, shank: 58, foot: 22, upperArm: 48, forearm: 42 };
  const GROUND_Y = -(SEG.thigh + SEG.shank);
  const rad = (d) => (d * Math.PI) / 180;
  const step = (from, deg, len) => ({ x: from.x + len * Math.cos(rad(deg)), y: from.y + len * Math.sin(rad(deg)) });

  /** Standing: the body frame needs no rotation and no mirror, so world angle = local angle. */
  function solve(a) {
    const hip = { x: 0, y: 0 };
    const torsoLocal = 90 - a.torso;
    const shoulder = step(hip, torsoLocal, SEG.torso);
    const neck = step(shoulder, torsoLocal - a.neck, SEG.neck);
    const head = step(neck, torsoLocal - a.neck, SEG.head);
    const leg = (h, k, an) => {
      const thigh = torsoLocal + 180 + h;
      const knee = step(hip, thigh, SEG.thigh);
      const ankle = step(knee, thigh - k, SEG.shank);
      return { knee, ankle, toe: step(ankle, thigh - k + 90 + an, SEG.foot) };
    };
    const arm = (s, e) => {
      const upper = torsoLocal + 180 + s;
      const elbow = step(shoulder, upper, SEG.upperArm);
      return { elbow, hand: step(elbow, upper + e, SEG.forearm) };
    };
    const near = leg(a.hip, a.knee, a.ankle);
    // The far limbs carry their own angles, the way the app's `*Far` joints do —
    // side-on, a perfectly symmetric figure would be a single vertical line.
    const far = leg(a.hipFar, a.kneeFar, a.ankleFar);
    const armNear = arm(a.shoulder, a.elbow);
    const armFar = arm(a.shoulderFar, a.elbowFar);
    const s = { hip, shoulder, neck, head, ...near, elbow: armNear.elbow, hand: armNear.hand,
      kneeFar: far.knee, ankleFar: far.ankle, toeFar: far.toe, elbowFar: armFar.elbow, handFar: armFar.hand };
    // Anchored by the feet, not the hip: bending the knees lowers the body.
    const dy = GROUND_Y - Math.min(s.ankle.y, s.toe.y, s.ankleFar.y, s.toeFar.y);
    for (const k of Object.keys(s)) s[k] = { x: s[k].x, y: s[k].y + dy };
    return s;
  }

  /**
   * Standing hip extension with the wall for balance: the hands rest on the
   * icon, the stance leg carries the weight, and the working leg swings back
   * from the hip. Nothing about the trunk moves, so the hands stay put on the
   * wall — only the shoulder angle is solved once, to reach it.
   */
  const WALL_X = 86;
  const BASE = { torso: 5, neck: -3, hip: -3, knee: 4, ankle: -3, hipFar: -1, kneeFar: 3, ankleFar: 0, shoulder: 80, elbow: 10, shoulderFar: 74, elbowFar: 12 };
  const BACK = { hip: -38, knee: 11, ankle: -13 };

  /** Reach for the wall: the one angle that has to be solved, and only once. */
  const SHOULDER = (() => {
    let lo = 40, hi = 120;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (solve({ ...BASE, shoulder: mid }).hand.x < WALL_X) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  })();

  const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));
  const poseAt = (t) => ({
    ...BASE,
    shoulder: SHOULDER,
    shoulderFar: SHOULDER - 6,
    hip: BASE.hip + (BACK.hip - BASE.hip) * t,
    knee: BASE.knee + (BACK.knee - BASE.knee) * t,
    ankle: BASE.ankle + (BACK.ankle - BASE.ankle) * t,
  });

  // Back 1.4 s, hold 0.6 s, return 1.4 s, rest 1.0 s.
  const CYCLE = 4400;
  function swingAt(ms) {
    const t = (ms % CYCLE) / 1000;
    if (t < 1.4) return ease(t / 1.4);
    if (t < 2.0) return 1;
    if (t < 3.4) return 1 - ease((t - 2.0) / 1.4);
    return 0;
  }

  // The app's viewBox assumes y-up; drawing it y-down would leave the frame
  // lopsided, so measure what the whole squat actually sweeps and fit that.
  const bounds = (() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i <= 24; i++) {
      const s = solve(poseAt(i / 24));
      for (const p of Object.values(s)) {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, -p.y); maxY = Math.max(maxY, -p.y);
      }
    }
    const pad = SEG.head + 8;
    // No padding on the wall side: mirrored, that edge is where the hands meet the icon.
    return { minX: minX - pad, minY: minY - pad, width: WALL_X - (minX - pad), height: Math.max(maxY, -GROUND_Y) - minY + 2 * pad };
  })();

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`);
  svg.setAttribute('aria-hidden', 'true');
  const line = (w, opacity) => {
    const l = document.createElementNS(NS, 'line');
    l.setAttribute('stroke-width', w);
    l.setAttribute('stroke-linecap', 'round');
    l.setAttribute('stroke', '#fff');
    if (opacity) l.setAttribute('stroke-opacity', opacity);
    svg.appendChild(l);
    return l;
  };
  const parts = {
    armFar: line(7, '0.45'), forearmFar: line(6, '0.45'), legFar: line(9, '0.45'), shankFar: line(8, '0.45'), footFar: line(7, '0.45'),
    torso: line(11), neck: line(7), thigh: line(10), shank: line(9), foot: line(8), arm: line(7), forearm: line(6),
  };
  parts.thigh.setAttribute('stroke', '#e85d2a');
  const head = document.createElementNS(NS, 'circle');
  head.setAttribute('r', SEG.head);
  head.setAttribute('fill', '#fff');
  svg.appendChild(head);
  host.appendChild(svg);

  // World y points up; the SVG's points down.
  const set = (el, a, b) => {
    el.setAttribute('x1', a.x); el.setAttribute('y1', -a.y);
    el.setAttribute('x2', b.x); el.setAttribute('y2', -b.y);
  };

  function draw(t) {
    const s = solve(poseAt(t));
    set(parts.legFar, s.hip, s.kneeFar); set(parts.shankFar, s.kneeFar, s.ankleFar); set(parts.footFar, s.ankleFar, s.toeFar);
    set(parts.armFar, s.shoulder, s.elbowFar); set(parts.forearmFar, s.elbowFar, s.handFar);
    set(parts.torso, s.hip, s.shoulder); set(parts.neck, s.shoulder, s.head);
    set(parts.thigh, s.hip, s.knee); set(parts.shank, s.knee, s.ankle); set(parts.foot, s.ankle, s.toe);
    set(parts.arm, s.shoulder, s.elbow); set(parts.forearm, s.elbow, s.hand);
    head.setAttribute('cx', s.head.x); head.setAttribute('cy', -s.head.y);
  }

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    draw(0.7);
    return;
  }
  const started = performance.now();
  const tick = (now) => { draw(swingAt(now - started)); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
})();
