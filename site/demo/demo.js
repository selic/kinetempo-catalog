/* Kinetempo web demo — a compact port of the app's engine (steps → phases), sounds and schematic figure. */
(function () {
  const COLORS = { idle: '#233044', prep: '#2b5ea8', squeeze: '#e85d2a', hold: '#c9431c', lift: '#d98b1f', release: '#2b8fb3', move: '#7c5cd6', timer: '#3b6fb6', rest: '#1f8a70', done: '#1a2b45' };
  const LABEL = { prep: 'Get ready', squeeze: 'Squeeze', hold: 'Hold', lift: 'Lift', release: 'Release', move: 'Move', timer: 'Timer', rest: 'Relax' };
  const HINT = { prep: 'Starting soon…', squeeze: 'Hold, keep breathing', hold: 'Hold it there', lift: 'Lift slowly', release: 'Lower with control', move: 'Move through the range', timer: 'Keep going', rest: 'Let go, breathe' };
  const PRESETS = [
    { id: 'quadSets', title: 'Quad isometrics', steps: [{ tone: 'squeeze', ms: 8000 }, { tone: 'rest', ms: 4000 }], reps: 25, anim: 'quadSets' },
    { id: 'slr', title: 'Straight-leg raise', steps: [{ tone: 'squeeze', ms: 2000, label: 'Lock the knee', ticks: false }, { tone: 'lift', ms: 2000, ticks: false }, { tone: 'hold', ms: 3000, ticks: false }, { tone: 'release', ms: 3000, label: 'Lower slowly', ticks: false }, { tone: 'rest', ms: 2000 }], reps: 12, anim: 'straightLegRaise' },
    { id: 'heel', title: 'Heel slides', steps: [{ tone: 'move', ms: 4000, label: 'Slide in (≤90°)', ticks: false }, { tone: 'move', ms: 4000, label: 'Slide out', ticks: false }], reps: 12, anim: 'heelSlides' },
    { id: 'pumps', title: 'Ankle pumps', steps: [{ tone: 'move', ms: 1000, label: 'Toes up', ticks: false }, { tone: 'move', ms: 1000, label: 'Toes down', ticks: false }], reps: 20, anim: 'anklePumps' },
    { id: 'prop', title: 'Heel prop (timer)', steps: [{ tone: 'timer', ms: 60000, label: 'Relax and let it hang' }], reps: 1, anim: 'heelProp' },
  ];
  const PREP = 3000;

  // ---- engine ----
  function build(p) {
    const phases = [];
    let t = 0;
    const push = (ph) => { if (ph.ms > 0) { phases.push({ ...ph, start: t, end: t + ph.ms, index: phases.length }); t += ph.ms; } };
    push({ tone: 'prep', ms: PREP, rep: 0, stepIndex: -1 });
    const lastActive = p.steps.map((s) => s.tone).lastIndexOf(p.steps.filter((s) => s.tone !== 'rest').at(-1)?.tone);
    for (let rep = 1; rep <= p.reps; rep++) {
      p.steps.forEach((s, i) => {
        if (rep === p.reps && s.tone === 'rest' && i > lastActive) return;
        push({ tone: s.tone, ms: s.ms, rep, stepIndex: i, label: s.label, ticks: s.ticks ?? s.tone !== 'rest', completes: i === lastActive });
      });
    }
    return { phases, total: t };
  }
  function stateAt(s, el) {
    if (el >= s.total) return { done: true };
    let lo = 0, hi = s.phases.length - 1;
    while (lo <= hi) { const m = (lo + hi) >> 1; const p = s.phases[m]; if (el < p.start) hi = m - 1; else if (el >= p.end) lo = m + 1; else return { done: false, phase: p, remaining: p.end - el, progress: (el - p.start) / p.ms, total: el / s.total }; }
    return { done: true };
  }
  function cues(s) {
    const out = [];
    for (const p of s.phases) {
      out.push({ at: p.start, kind: p.tone });
      if ((p.ticks || p.tone === 'prep') && p.ms >= 4000) for (const b of [3000, 2000, 1000]) if (p.end - b > p.start) out.push({ at: p.end - b, kind: 'tick' });
    }
    out.push({ at: s.total, kind: 'finish' });
    return out.sort((a, b) => a.at - b.at);
  }

  // ---- audio (WebAudio, same envelopes as the app) ----
  let ctx = null;
  const audio = () => { try { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); } catch (e) { ctx = null; } return ctx; };
  function beep(f, dur, at, vol = 0.5, type = 'sine', glide) {
    const c = audio(), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, at); if (glide) o.frequency.exponentialRampToValueAtTime(glide, at + dur);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(c.destination); o.start(at); o.stop(at + dur + 0.05);
  }
  const SOUND = {
    squeeze: (at) => { beep(660, 0.12, at); beep(880, 0.18, at + 0.13); }, hold: (at) => SOUND.squeeze(at),
    lift: (at) => beep(440, 0.25, at, 0.5, 'sine', 880), release: (at) => beep(880, 0.25, at, 0.5, 'sine', 440),
    move: (at) => beep(587, 0.16, at, 0.5, 'triangle'), timer: (at) => SOUND.move(at), rest: (at) => beep(330, 0.28, at, 0.45),
    prep: (at) => { beep(440, 0.12, at, 0.4); beep(440, 0.12, at + 0.18, 0.4); }, tick: (at) => beep(1050, 0.06, at, 0.25, 'square'),
    finish: (at) => { beep(523, 0.15, at); beep(659, 0.15, at + 0.16); beep(784, 0.3, at + 0.32); },
  };

  // ---- figure (port of LegFigure + builtin poses) ----
  const THIGH = 60, SHANK = 58, FOOT = 22, TORSO = 74, HEAD_R = 14, HIP = { x: 132, y: 86 }, BED = 96;
  const rad = (d) => (d * Math.PI) / 180, ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x))), pulse = (t) => 0.5 - 0.5 * Math.cos(2 * Math.PI * t);
  function thighForHeel(k) { const a = 60, b = 55, phi = rad(k); let lo = 0, hi = phi; for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (a * Math.sin(m) + b * Math.sin(m - phi) > 0) hi = m; else lo = m; } return ((lo + hi) / 2) * 180 / Math.PI; }
  const base = { thigh: 0, knee: 0, ankle: 0, quad: 0, prop: null, arrow: null };
  const POSE = {
    quadSets: ({ tone, progress, loop }) => tone === null ? { ...base, quad: pulse(loop), knee: -2 * pulse(loop) } : { ...base, quad: tone !== 'rest' && tone !== 'prep' ? 0.6 + 0.4 * Math.min(1, progress * 4) : Math.max(0, 0.5 - progress), knee: tone !== 'rest' && tone !== 'prep' ? -3 : 0 },
    heelSlides: ({ tone, stepIndex, progress, loop }) => { let k, arrow = null; if (tone === null || stepIndex < 0) k = 90 * pulse(loop); else if (tone === 'rest') k = 0; else if (stepIndex % 2 === 0) { k = 90 * ease(progress); arrow = 'in'; } else { k = 90 * (1 - ease(progress)); arrow = 'out'; } return { ...base, knee: k, thigh: thighForHeel(k), ankle: 5, quad: 0.2, arrow }; },
    straightLegRaise: ({ tone, stepIndex, progress, loop }) => { const top = 35; if (tone === null || stepIndex < 0) { const t = pulse(loop); return { ...base, thigh: top * t, quad: 0.5 + 0.5 * t }; } switch (tone) { case 'squeeze': return { ...base, knee: -3, quad: 0.6 + 0.4 * Math.min(1, progress * 3) }; case 'lift': return { ...base, thigh: top * ease(progress), quad: 1, arrow: 'up' }; case 'hold': return { ...base, thigh: top, quad: 1 }; case 'release': return { ...base, thigh: top * (1 - ease(progress)), quad: 0.8, arrow: 'down' }; default: return { ...base, quad: 0.1 }; } },
    heelProp: ({ loop }) => ({ ...base, thigh: 4, knee: -6 - 2 * pulse(loop), prop: 'pillow', arrow: 'down' }),
    anklePumps: ({ tone, stepIndex, progress, loop }) => { let a; if (tone === null || stepIndex < 0) a = 25 - 50 * pulse(loop); else if (tone === 'rest') a = 0; else a = stepIndex % 2 === 0 ? -25 + 50 * ease(progress) : 25 - 50 * ease(progress); return { ...base, ankle: a, arrow: a > 0 ? 'up' : 'down' }; },
  };
  function mix(a, b, t) { const h = (s) => [0, 2, 4].map((i) => parseInt(s.slice(1 + i, 3 + i), 16)); const A = h(a), B = h(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * Math.max(0, Math.min(1, t)))).join(',')})`; }
  function drawFigure(svg, pose, accent) {
    const th = rad(pose.thigh), knee = { x: HIP.x + THIGH * Math.cos(th), y: HIP.y - THIGH * Math.sin(th) }, sh = th - rad(pose.knee);
    const ankle = { x: knee.x + SHANK * Math.cos(sh), y: knee.y - SHANK * Math.sin(sh) }, fa = sh + rad(90 + pose.ankle), toe = { x: ankle.x + FOOT * Math.cos(fa), y: ankle.y - FOOT * Math.sin(fa) };
    const mid = { x: (knee.x + ankle.x) / 2, y: (knee.y + ankle.y) / 2 };
    const arrows = { up: `M${mid.x} ${mid.y - 22} l0 -16 m-6 6 l6 -6 l6 6`, down: `M${mid.x} ${mid.y - 38} l0 16 m-6 -6 l6 6 l6 -6`, in: `M${ankle.x + 4} ${BED + 12} l-18 0 m6 -6 l-6 6 l6 6`, out: `M${ankle.x - 14} ${BED + 12} l18 0 m-6 -6 l6 6 l-6 -6` };
    const L = (x1, y1, x2, y2, c, w, o = 1) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-opacity="${o}" stroke-linecap="round"/>`;
    svg.innerHTML = L(8, BED, 292, BED, '#fff', 3, 0.35) + (pose.prop ? `<rect x="${ankle.x - 16}" y="${BED - 14}" width="32" height="12" rx="6" fill="rgba(255,255,255,.45)"/>` : '') +
      L(HIP.x, HIP.y, HIP.x - TORSO, HIP.y - 4, '#fff', 12, 0.85) + L(HIP.x - TORSO + 6, HIP.y - 2, HIP.x - 18, HIP.y + 1, '#fff', 6, 0.55) + L(HIP.x - TORSO, HIP.y - 4, HIP.x - TORSO - 10, HIP.y - 5, '#fff', 7, 0.85) +
      `<circle cx="${HIP.x - TORSO - 10 - HEAD_R}" cy="${HIP.y - 6}" r="${HEAD_R}" fill="rgba(255,255,255,.85)"/>` +
      L(HIP.x, HIP.y, knee.x, knee.y, mix('#ffffff', accent, pose.quad), 9 + 2 * pose.quad) + L(knee.x, knee.y, ankle.x, ankle.y, '#fff', 8) + L(ankle.x, ankle.y, toe.x, toe.y, '#fff', 7) +
      `<circle cx="${knee.x}" cy="${knee.y}" r="4" fill="#0e1420" opacity=".35"/>` + (pose.arrow ? `<path d="${arrows[pose.arrow]}" stroke="${accent}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` : '');
  }

  // ---- UI ----
  const $ = (id) => document.getElementById(id);
  const el = { demo: $('demo'), title: $('title'), clock: $('clock'), phase: $('phase'), count: $('count'), hint: $('hint'), dots: $('dots'), bar: $('bar'), cfg: $('cfg'), start: $('start'), reset: $('reset'), skip: $('skip'), fig: $('fig'), presets: $('presets') };
  let preset = PRESETS[0], sched = build(preset), cueList = cues(sched), running = false, anchor = 0, pausedAt = 0, raf = 0, timer = 0, nextCue = 0, lastIdx = -2, doneFlag = false;
  const fmt = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  function selectPreset(p) { preset = p; sched = build(p); cueList = cues(sched); reset(); }
  PRESETS.forEach((p) => { const b = document.createElement('button'); b.textContent = p.title; b.onclick = () => { selectPreset(p); [...el.presets.children].forEach((x) => x.classList.toggle('on', x === b)); }; if (p === preset) b.classList.add('on'); el.presets.appendChild(b); });

  function renderIdle() {
    el.demo.style.background = COLORS.idle; el.title.textContent = preset.title; el.phase.textContent = 'Ready?';
    const first = preset.steps[0]; el.count.textContent = first.ms >= 60000 ? fmt(first.ms) : Math.round(first.ms / 1000); el.count.classList.toggle('small', first.ms >= 60000);
    el.hint.textContent = preset.steps.map((s) => `${s.label || LABEL[s.tone]} ${s.ms >= 60000 ? fmt(s.ms) : Math.round(s.ms / 1000) + 's'}`).join(' → ') + (preset.reps > 1 ? ` · ×${preset.reps}` : '');
    el.clock.textContent = `0:00 / ${fmt(sched.total)}`; el.bar.style.width = '0%';
    el.dots.innerHTML = preset.reps > 1 ? Array.from({ length: preset.reps }, () => '<i></i>').join('') : '';
    el.cfg.innerHTML = preset.steps.map((s) => `<span>${s.label || LABEL[s.tone]} <b>${s.ms >= 60000 ? fmt(s.ms) : Math.round(s.ms / 1000) + 's'}</b></span>`).join('') + `<span>Session <b>${fmt(sched.total)}</b></span>`;
    el.start.textContent = 'Start'; el.skip.hidden = true;
  }
  function frame() {
    const now = performance.now(), elapsed = now - anchor, st = stateAt(sched, elapsed), loop = (now % 4000) / 4000;
    // audio: arm cues up to 2.5 s ahead on the audio clock
    if (running && ctx) { const horizon = elapsed + 2500; while (nextCue < cueList.length && cueList[nextCue].at <= horizon) { const c = cueList[nextCue++]; if (elapsed - c.at < 400) SOUND[c.kind]?.(ctx.currentTime + Math.max(0, c.at - elapsed) / 1000); } }
    el.clock.textContent = `${fmt(Math.min(elapsed, sched.total))} / ${fmt(sched.total)}`; el.bar.style.width = `${Math.min(100, (elapsed / sched.total) * 100)}%`;
    if (st.done) { finish(); return; }
    const p = st.phase, tone = p.tone;
    if (p.index !== lastIdx) { lastIdx = p.index; el.demo.style.background = COLORS[tone]; el.phase.textContent = (p.label || LABEL[tone]).toUpperCase(); el.hint.textContent = HINT[tone]; [...el.dots.children].forEach((d, i) => { d.className = i + 1 < p.rep ? 'on' : i + 1 === p.rep ? 'act' : ''; }); }
    const secs = Math.max(1, Math.ceil(st.remaining / 1000)); el.count.textContent = secs >= 60 ? fmt(secs * 1000) : secs; el.count.classList.toggle('small', secs >= 60);
    drawFigure(el.fig, POSE[preset.anim]({ tone, stepIndex: p.stepIndex, progress: st.progress, loop }), COLORS[tone]);
  }
  function idleLoop() { if (running) return; drawFigure(el.fig, POSE[preset.anim]({ tone: null, stepIndex: -1, progress: 0, loop: (performance.now() % 4000) / 4000 }), COLORS[preset.steps[0].tone]); requestAnimationFrame(idleLoop); }
  function start() {
    audio();
    if (doneFlag) { reset(); }
    if (!running) { running = true; anchor = performance.now() - pausedAt; lastIdx = -2; nextCue = cueList.findIndex((c) => c.at > pausedAt); if (nextCue < 0) nextCue = cueList.length; el.start.textContent = 'Pause'; el.skip.hidden = false; clearInterval(timer); timer = setInterval(frame, 50); frame(); }
    else { running = false; pausedAt = performance.now() - anchor; clearInterval(timer); el.start.textContent = 'Resume'; el.demo.style.background = COLORS.idle; el.phase.textContent = 'Paused'; idleLoop(); }
  }
  function reset() { running = false; doneFlag = false; pausedAt = 0; clearInterval(timer); renderIdle(); idleLoop(); }
  function skip() { const st = stateAt(sched, performance.now() - anchor); if (st.done) return; const target = st.phase.end; if (running) anchor = performance.now() - target; else pausedAt = target; nextCue = cueList.findIndex((c) => c.at > target); if (!running) { lastIdx = -2; } }
  function finish() { running = false; doneFlag = true; clearInterval(timer); el.demo.style.background = COLORS.done; el.phase.textContent = 'Done!'; el.count.textContent = '✓'; el.count.classList.remove('small'); el.hint.textContent = `${preset.reps > 1 ? preset.reps + ' reps · ' : ''}${fmt(sched.total)}`; [...el.dots.children].forEach((d) => (d.className = 'on')); el.bar.style.width = '100%'; el.start.textContent = 'Again'; el.skip.hidden = true; pausedAt = 0; }
  el.start.onclick = start; el.reset.onclick = reset; el.skip.onclick = skip;
  reset();
})();
