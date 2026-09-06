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
   * A gait, not an exercise: the hip swings, the knee folds as the leg comes
   * through, the arms swing against the legs. Phase advances with distance
   * covered rather than with time, so the feet do not slide.
   */
  const STRIDE = 78;
  function poseAt(phase) {
    const leg = (ph) => ({
      hip: 24 * Math.sin(ph),
      knee: 8 + 44 * Math.pow(Math.max(0, Math.cos(ph)), 1.3),
      ankle: -7 * Math.cos(ph),
    });
    const near = leg(phase), far = leg(phase + Math.PI);
    return {
      torso: 4, neck: 0,
      hip: near.hip, knee: near.knee, ankle: near.ankle,
      hipFar: far.hip, kneeFar: far.knee, ankleFar: far.ankle,
      shoulder: -18 * Math.sin(phase), elbow: 16,
      shoulderFar: 18 * Math.sin(phase), elbowFar: 16,
    };
  }
  /** Standing still — no phase of a walk has both legs straight, so it is its own pose. */
  const STILL = { torso: 3, neck: 0, hip: 0, knee: 4, ankle: 0, hipFar: -6, kneeFar: 5, ankleFar: 0, shoulder: 5, elbow: 6, shoulderFar: -6, elbowFar: 8 };
  const KEYS = Object.keys(STILL);
  /** Eased toward the target every frame, so stopping and setting off are not a jump. */
  const approach = (from, to, k) => Object.fromEntries(KEYS.map((key) => [key, from[key] + (to[key] - from[key]) * k]));

  // The app's viewBox assumes y-up; drawing it y-down would leave the frame
  // lopsided, so measure what the whole squat actually sweeps and fit that.
  const bounds = (() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i <= 24; i++) {
      const s = solve(poseAt((i / 24) * 2 * Math.PI));
      for (const p of Object.values(s)) {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, -p.y); maxY = Math.max(maxY, -p.y);
      }
    }
    const pad = SEG.head + 8;
    return { minX: minX - pad, minY: minY - pad, width: maxX - minX + 2 * pad, height: Math.max(maxY, -GROUND_Y) - minY + 2 * pad };
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

  function draw(pose) {
    const s = solve(pose);
    set(parts.legFar, s.hip, s.kneeFar); set(parts.shankFar, s.kneeFar, s.ankleFar); set(parts.footFar, s.ankleFar, s.toeFar);
    set(parts.armFar, s.shoulder, s.elbowFar); set(parts.forearmFar, s.elbowFar, s.handFar);
    set(parts.torso, s.hip, s.shoulder); set(parts.neck, s.shoulder, s.head);
    set(parts.thigh, s.hip, s.knee); set(parts.shank, s.knee, s.ankle); set(parts.foot, s.ankle, s.toe);
    set(parts.arm, s.shoulder, s.elbow); set(parts.forearm, s.elbow, s.hand);
    head.setAttribute('cx', s.head.x); head.setAttribute('cy', -s.head.y);
  }

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    draw(STILL);
    return;
  }

  // Strolling: across the free space, a pause at each end, then back the other way.
  const SPEED = 24; // px per second — an amble, not a march
  const PAUSE = 1400;
  let x = 0, dir = 1, phase = 0, restUntil = 0, last = performance.now();
  let pose = { ...STILL };

  function tick(now) {
    const dt = Math.min(64, now - last);
    last = now;
    const span = Math.max(0, host.clientWidth - svg.getBoundingClientRect().width);
    if (now >= restUntil) {
      const dx = (SPEED * dt) / 1000;
      x += dir * dx;
      phase += (dx / STRIDE) * Math.PI;
      if (x <= 0 || x >= span) {
        x = Math.max(0, Math.min(span, x));
        dir = -dir;
        restUntil = now + PAUSE;
        phase = 0;
      }
      pose = approach(pose, poseAt(phase), 1 - Math.exp(-dt / 90));
    } else {
      pose = approach(pose, STILL, 1 - Math.exp(-dt / 160));
    }
    draw(pose);
    svg.style.transform = `translateX(${x}px) scaleX(${dir})`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
