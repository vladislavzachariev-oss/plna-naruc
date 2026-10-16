/* Plná náruč — ukázka. Vladislav Zachariev, Whyte Lynx. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const backOut = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2; };
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;

gsap.registerPlugin(ScrollTrigger);

/* ---------- květy ---------- */
const FL = {
  pivonka:            { name: 'Pivoňka',          c: '#e98ab7', r: .94, m: [5, 6] },
  pryskyrnik:         { name: 'Pryskyřník',       c: '#f46c49', r: .95, m: [3, 4, 5, 6] },
  sasanka:            { name: 'Sasanka',          c: '#edeae4', r: .94, m: [2, 3, 4, 5] },
  jirina:             { name: 'Jiřina',           c: '#8a1028', r: .94, m: [7, 8, 9, 10] },
  krasenka:           { name: 'Krásenka',         c: '#dd4db3', r: .88, m: [7, 8, 9, 10] },
  ruze:               { name: 'Zahradní růže',    c: '#f5a263', r: .95, m: [6, 7, 8, 9, 10] },
  chrpa:              { name: 'Chrpa',            c: '#5362d3', r: .88, m: [6, 7, 8] },
  'pryskyrnik-zluty': { name: 'Žlutý pryskyřník', c: '#f9c102', r: .97, m: [3, 4, 5, 6] }
};
const IDS = Object.keys(FL);
const IMG = {};
IDS.forEach(id => { const i = new Image(); i.decoding = 'async'; i.src = `img/${id}.webp`; IMG[id] = i; });

/* ---------- smooth scroll ---------- */
const lenis = new Lenis({ duration: reduce ? 0 : 1.1, smoothWheel: !reduce });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(t => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const id = a.getAttribute('href');
  if (id.length < 2) return;
  const el = $(id); if (!el) return;
  e.preventDefault();
  lenis.scrollTo(el, { offset: id === '#top' ? 0 : -60 });
}));
window.__go = y => lenis.scrollTo(y, { immediate: true, force: true });

/* ---------- toast ---------- */
const toastEl = $('#toast'); let toastT;
const toast = msg => {
  toastEl.textContent = msg; toastEl.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 3600);
};

/* ---------- nav ---------- */
const nav = $('#nav');
const setNav = () => { const h = document.getElementById('hero'); nav.classList.toggle('is-solid', scrollY > h.offsetHeight * .45); };
addEventListener('scroll', setNav, { passive: true }); setNav();

/* =========================================================
   1. ÚVOD — květy padají na nápis (Matter.js)
   ========================================================= */
const hero = (() => {
  const { Engine, Bodies, Body, Composite, Events, Query, Constraint, Vertices, Sleeping } = Matter;
  const sec = $('#hero'), cv = $('#garden'), ctx = cv.getContext('2d'), hint = $('#hint');
  const engine = Engine.create({ enableSleeping: true, positionIterations: 8, velocityIterations: 6 });
  const world = engine.world;
  const st = { W: 0, H: 0, dpr: 1, F: 0, letters: [], statics: [], flowers: [], visible: true, ready: false, taps: 0, throws: 0, hopT: 0 };
  const LETTER = '#f6f1e8';
  /* tvary písmen v rámečku glyfu (0..1): tam, kde je písmeno duté, je i těleso duté */
  const SHAPES = {
    A: [['poly', [[.37, 0], [.63, 0], [1, 1], [0, 1]]]],
    L: [['rect', 0, 0, .36, 1], ['rect', 0, .7, 1, 1]],
    U: [['rect', 0, 0, .34, .74], ['rect', .66, 0, 1, .74], ['rect', 0, .6, 1, 1]],
    C: [['rect', 0, .14, .36, .86], ['rect', .14, 0, .94, .3], ['rect', .14, .7, .94, 1]]
  };
  const setFont = px => { ctx.font = `900 ${px}px Archivo, "Arial Black", sans-serif`; if ('fontStretch' in ctx) ctx.fontStretch = 'expanded'; };

  function layout() {
    const W = sec.clientWidth, H = sec.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
    Object.assign(st, { W, H, dpr });
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const lines = W / H > 1.05 ? ['PLNÁ NÁRUČ'] : ['PLNÁ', 'NÁRUČ'];
    const pad = clamp(W * .03, 16, 44);
    setFont(100);
    const widest = Math.max(...lines.map(l => ctx.measureText(l).width));
    const F = Math.min((W - pad * 2) / widest * 100, H * (lines.length > 1 ? .2 : .3));
    setFont(F); st.F = F;
    const cap = ctx.measureText('N').actualBoundingBoxAscent;
    const lastBase = H - Math.max(pad * .6, H * .03);
    st.letters = [];
    lines.forEach((line, li) => {
      const base = lastBase - (lines.length - 1 - li) * cap * 1.4;
      const x0 = (W - ctx.measureText(line).width) / 2;
      [...line].forEach((ch, i) => {
        if (ch === ' ') return;
        const x = x0 + ctx.measureText(line.slice(0, i)).width;
        const bch = ch.normalize('NFD')[0];
        const mb = ctx.measureText(bch), m = ctx.measureText(ch);
        const core = { l: x - mb.actualBoundingBoxLeft, r: x + mb.actualBoundingBoxRight, t: base - mb.actualBoundingBoxAscent, b: base + mb.actualBoundingBoxDescent };
        const top = base - m.actualBoundingBoxAscent;
        st.letters.push({ ch, bch, x, y: base, core, accTop: top < core.t - 2 ? top : null, off: 0, v: 0 });
      });
    });
    buildStatics();
  }

  function rectBody(x0, y0, x1, y1, li) {
    const w = Math.max(2, x1 - x0), h = Math.max(2, y1 - y0);
    const b = Bodies.rectangle((x0 + x1) / 2, (y0 + y1) / 2, w, h, { isStatic: true, friction: .5, restitution: .12, chamfer: { radius: Math.min(5, w / 4, h / 4) } });
    b.plugin.li = li; return b;
  }
  function buildStatics() {
    if (st.statics.length) Composite.remove(world, st.statics);
    const { W, H } = st, T = 400;
    st.statics = [
      Bodies.rectangle(W / 2, H + T / 2, W * 3, T, { isStatic: true, friction: .6 }),
      Bodies.rectangle(-T / 2, -H / 2, T, H * 5, { isStatic: true }),
      Bodies.rectangle(W + T / 2, -H / 2, T, H * 5, { isStatic: true })
    ];
    st.letters.forEach((L, li) => {
      const c = L.core, w = c.r - c.l, h = c.b - c.t;
      (SHAPES[L.bch] || [['rect', 0, 0, 1, 1]]).forEach(p => {
        if (p[0] === 'rect') { st.statics.push(rectBody(c.l + p[1] * w, c.t + p[2] * h, c.l + p[3] * w, c.t + p[4] * h, li)); return; }
        const verts = p[1].map(([u, v]) => ({ x: c.l + u * w, y: c.t + v * h }));
        const ctr = Vertices.centre(verts);
        const b = Bodies.fromVertices(ctr.x, ctr.y, [verts], { isStatic: true, friction: .5, restitution: .12 });
        b.plugin.li = li; st.statics.push(b);
      });
      if (L.accTop != null) {
        const cx = (c.l + c.r) / 2, aw = w * .42;
        st.statics.push(rectBody(cx - aw / 2, L.accTop, cx + aw / 2, c.t - h * .05, li));
      }
    });
    Composite.add(world, st.statics);
  }

  const baseSize = () => clamp(Math.min(st.W, st.H) * .145, 52, 116);
  const maxFlowers = () => st.W < 700 ? 44 : 76;
  function addFlower(x, y, o = {}) {
    const id = o.id || IDS[(Math.random() * IDS.length) | 0];
    const size = baseSize() * rand(.78, 1.22);
    const b = Bodies.circle(x, y, size / 2 * FL[id].r * .95, { restitution: .3, friction: .35, frictionAir: .012, density: .0016, angle: rand(0, 6.283), sleepThreshold: 80 });
    b.plugin.fl = { id, size, born: performance.now(), pop: !!o.pop, dying: 0 };
    Body.setVelocity(b, { x: o.vx || 0, y: o.vy || 0 });
    Body.setAngularVelocity(b, rand(-.12, .12));
    Composite.add(world, b); st.flowers.push(b);
    let alive = st.flowers.filter(f => !f.plugin.fl.dying);
    while (alive.length > maxFlowers()) { alive.shift().plugin.fl.dying = performance.now(); alive = st.flowers.filter(f => !f.plugin.fl.dying); }
    return b;
  }
  function rain(n) {
    for (let i = 0; i < n; i++) {
      const go = () => addFlower(rand(st.W * .04, st.W * .96), -rand(60, 240));
      reduce ? go() : setTimeout(go, 250 + i * 70);
    }
  }
  function settle(steps = 360) { for (let i = 0; i < steps; i++) Engine.update(engine, 1000 / 60); }

  /* dopad na písmeno — písmeno se zhoupne */
  Events.on(engine, 'collisionStart', e => {
    for (const p of e.pairs) {
      const a = p.bodyA, b = p.bodyB;
      const li = 'li' in a.plugin ? a.plugin.li : 'li' in b.plugin ? b.plugin.li : null;
      const f = a.plugin.fl ? a : b.plugin.fl ? b : null;
      if (li == null || !f) continue;
      const sp = Math.hypot(f.velocity.x, f.velocity.y);
      if (sp > 2.5) st.letters[li].v += Math.min(sp, 20) * .32;
    }
  });

  /* ---------- kreslení ---------- */
  const shadow = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(4,8,52,.5)'); gr.addColorStop(.5, 'rgba(4,8,52,.22)'); gr.addColorStop(1, 'rgba(4,8,52,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return c;
  })();
  function scaleOf(f, now) {
    let k = 1;
    if (f.pop) { const t = Math.min(1, (now - f.born) / 420); k = Math.max(.05, backOut(t)); if (t >= 1) f.pop = false; }
    if (f.dying) k *= Math.max(0, 1 - (now - f.dying) / 450);
    return k;
  }
  function draw(now) {
    const { W, H, dpr } = st;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    setFont(st.F); ctx.fillStyle = LETTER; ctx.textBaseline = 'alphabetic';
    for (const L of st.letters) ctx.fillText(L.ch, L.x, L.y + L.off);
    const ks = st.flowers.map(b => scaleOf(b.plugin.fl, now));
    st.flowers.forEach((b, i) => {
      const s = b.plugin.fl.size * ks[i] * 1.3;
      ctx.drawImage(shadow, b.position.x - s / 2 + s * .05, b.position.y - s / 2 + s * .1, s, s);
    });
    st.flowers.forEach((b, i) => {
      const f = b.plugin.fl, im = IMG[f.id], s = f.size * ks[i];
      if (s <= .5 || !im.complete || !im.naturalWidth) return;
      ctx.save(); ctx.translate(b.position.x, b.position.y); ctx.rotate(b.angle);
      ctx.drawImage(im, -s / 2, -s / 2, s, s); ctx.restore();
    });
  }
  function cleanDying(now) {
    const dead = st.flowers.filter(b => b.plugin.fl.dying && now - b.plugin.fl.dying > 450);
    if (!dead.length) return;
    Composite.remove(world, dead);
    st.flowers = st.flowers.filter(b => !dead.includes(b));
  }
  function springLetters() {
    for (const L of st.letters) { L.off += L.v; L.v += -L.off * .22; L.v *= .78; if (Math.abs(L.off) < .01 && Math.abs(L.v) < .01) L.off = L.v = 0; }
  }
  let acc = 0, last = performance.now();
  function tick() {
    const now = performance.now();
    if (!st.ready || !st.visible || document.hidden) { last = now; return; }
    acc += Math.min(50, now - last); last = now;
    let n = 0;
    while (acc >= 1000 / 60 && n < 3) { Engine.update(engine, 1000 / 60); acc -= 1000 / 60; n++; }
    if (n === 3) acc = 0;
    springLetters(); cleanDying(now); draw(now);
  }
  gsap.ticker.add(tick);

  /* ---------- ruka: chytit, hodit, klepnout ---------- */
  let drag = null, down = null;
  const ptr = { x: -1e4, y: -1e4, vx: 0, vy: 0, t: 0 };
  const local = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const live = () => st.flowers.filter(f => !f.plugin.fl.dying);
  function hitFlower(p) {
    const hits = Query.point(live(), p);
    if (hits.length) return hits[hits.length - 1];
    if (!coarse) return null;
    let best = null, bd = 18;
    for (const b of live()) { const d = Math.hypot(b.position.x - p.x, b.position.y - p.y) - b.circleRadius; if (d < bd) { bd = d; best = b; } }
    return best;
  }
  const doneHint = () => { if (st.taps + st.throws >= 2) hint.classList.add('is-done'); };

  cv.addEventListener('touchstart', e => { const t = e.touches[0]; if (t && hitFlower(local(t))) e.preventDefault(); }, { passive: false });
  cv.addEventListener('pointerdown', e => {
    const p = local(e); down = { x: p.x, y: p.y, t: performance.now() };
    const b = hitFlower(p);
    if (!b) return;
    Sleeping.set(b, false);
    drag = Constraint.create({ pointA: { x: p.x, y: p.y }, bodyB: b, pointB: { x: p.x - b.position.x, y: p.y - b.position.y }, stiffness: .2, damping: .1, length: 0 });
    Composite.add(world, drag); sec.classList.add('is-grab');
    try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  });
  cv.addEventListener('pointermove', e => {
    const p = local(e), now = performance.now(), dt = now - ptr.t;
    if (dt > 0 && dt < 120) { ptr.vx = (p.x - ptr.x) / dt * 16; ptr.vy = (p.y - ptr.y) / dt * 16; } else { ptr.vx = ptr.vy = 0; }
    ptr.x = p.x; ptr.y = p.y; ptr.t = now;
    if (drag) { drag.pointA.x = p.x; drag.pointA.y = p.y; return; }
    if (coarse) return;
    sec.classList.toggle('is-over', !!hitFlower(p));
    const sp = Math.hypot(ptr.vx, ptr.vy);
    if (sp < 5) return;
    for (const b of live()) {
      const d = Math.hypot(b.position.x - p.x, b.position.y - p.y), R = b.plugin.fl.size * .85;
      if (d > R) continue;
      const k = (1 - d / R) * .14;
      Sleeping.set(b, false);
      Body.setVelocity(b, { x: b.velocity.x + clamp(ptr.vx, -30, 30) * k, y: b.velocity.y + clamp(ptr.vy, -30, 30) * k - .6 });
      Body.setAngularVelocity(b, b.angularVelocity + ptr.vx * .002);
    }
  });
  const release = () => { if (drag) { Composite.remove(world, drag); drag = null; sec.classList.remove('is-grab'); st.throws++; doneHint(); } };
  cv.addEventListener('pointerup', e => {
    const p = local(e);
    const tap = !drag && down && Math.hypot(p.x - down.x, p.y - down.y) < 8 && performance.now() - down.t < 450;
    release(); down = null;
    if (!tap) return;
    let y = p.y;
    const inLetter = Query.point(st.statics, p)[0];
    if (inLetter) y = inLetter.bounds.min.y - baseSize() * .6;
    addFlower(p.x, y, { pop: true, vy: -rand(5, 10), vx: rand(-3, 3) });
    st.taps++; doneHint();
  });
  cv.addEventListener('pointercancel', () => { release(); down = null; });
  cv.addEventListener('pointerleave', () => sec.classList.remove('is-over'));

  /* rolování — hromada povyskočí */
  lenis.on('scroll', ({ velocity }) => {
    if (reduce || !st.visible) return;
    const now = performance.now();
    if (Math.abs(velocity) < 7 || now - st.hopT < 420 || scrollY > st.H * .85) return;
    st.hopT = now;
    const k = clamp(Math.abs(velocity) / 34, .25, 1);
    for (const b of live()) {
      if (b.position.y < st.H * .25) continue;
      Sleeping.set(b, false);
      Body.setVelocity(b, { x: b.velocity.x + rand(-1.6, 1.6) * k, y: b.velocity.y - rand(4, 9) * k });
      Body.setAngularVelocity(b, b.angularVelocity + rand(-.12, .12) * k);
    }
  });

  new IntersectionObserver(es => { st.visible = es[0].isIntersecting; }, { threshold: 0 }).observe(sec);
  let rw = innerWidth, rh = innerHeight, rT;
  addEventListener('resize', () => {
    clearTimeout(rT);
    rT = setTimeout(() => {
      if (innerWidth === rw && Math.abs(innerHeight - rh) < 90) return;
      rw = innerWidth; rh = innerHeight;
      layout();
      for (const b of st.flowers) Body.setPosition(b, { x: clamp(b.position.x, 20, st.W - 20), y: Math.min(b.position.y, st.H * .4) });
    }, 180);
  });

  /* kolik květů se vejde mezi text a nápis, aby hromada nezakryla tlačítka */
  function fillCount() {
    const cb = $('#heroCopy').getBoundingClientRect().bottom - sec.getBoundingClientRect().top;
    const top = Math.min(...st.letters.map(L => L.accTop ?? L.core.t));
    const free = Math.max(60, top - cb - 16);
    const s = baseSize();
    return Math.round(clamp(st.W * free * (st.W < st.H ? .6 : .78) / (s * s * .95), 12, 44));
  }
  const start = () => {
    layout(); st.ready = true;
    st.rain = fillCount();
    rain(st.rain);
    if (reduce) settle();
  };
  Promise.race([document.fonts.load('900 100px Archivo', 'PLNÁ NÁRUČ'), new Promise(r => setTimeout(r, 2500))])
    .then(() => document.fonts.ready).catch(() => {}).then(start);

  return { st, settle, addFlower, count: () => live().length };
})();

/* =========================================================
   2. PÁS — jména květin se při rolování natahují
   ========================================================= */
const band = $('#band');
band.insertAdjacentHTML('beforeend', band.innerHTML);
const bandImgs = $$('img', band);
let bx = 0, bVel = 0, wd = 100, bandVis = false;
lenis.on('scroll', ({ velocity }) => { bVel = velocity; });
ScrollTrigger.create({ trigger: '.band', start: 'top bottom', end: 'bottom top', onToggle: s => { bandVis = s.isActive; } });
gsap.ticker.add(() => {
  if (!bandVis) return;
  const v = clamp(bVel, -50, 50); bVel *= .9;
  wd = lerp(wd, clamp(100 + v * 1.5, 62, 125), .1);
  band.style.setProperty('--wd', wd.toFixed(1));
  const dir = v < -1 ? -1 : 1;
  if (!reduce) bx -= (1 + Math.abs(v) * .22) * dir;
  const bw = band.scrollWidth / 2;
  if (bx < -bw) bx += bw;
  if (bx > 0) bx -= bw;
  band.style.transform = `translate3d(${bx.toFixed(1)}px,0,0)`;
  bandImgs.forEach((im, i) => { im.style.transform = `rotate(${(bx * .5 + i * 47).toFixed(1)}deg)`; });
});

/* =========================================================
   3. MANIFEST — slova se rozsvěcují
   ========================================================= */
const man = $('#manifest');
[...man.childNodes].forEach(n => {
  if (n.nodeType !== 3) return;
  const frag = document.createDocumentFragment();
  n.textContent.split(/(\s+)/).forEach(w => {
    if (!w) return;
    if (/^\s+$/.test(w)) { frag.append(w); return; }
    const s = document.createElement('span'); s.className = 'w'; s.textContent = w; frag.append(s);
  });
  n.replaceWith(frag);
});
const words = $$('.w', man), manImgs = $$('img', man);
ScrollTrigger.create({
  trigger: man, start: 'top 82%', end: 'bottom 48%', scrub: true,
  onUpdate: s => {
    const p = s.progress * (words.length + 2);
    words.forEach((w, i) => { w.style.opacity = clamp(p - i, .14, 1).toFixed(2); });
    manImgs.forEach((im, i) => { im.style.transform = `rotate(${(s.progress * 220 * (i % 2 ? -1 : 1)).toFixed(1)}deg)`; });
  }
});

/* =========================================================
   4. DLAŽDICE — na dotyku se rozvinou samy
   ========================================================= */
if (coarse) {
  const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-in', e.isIntersecting)), { threshold: .6 });
  $$('.tile').forEach(t => io.observe(t));
}

/* =========================================================
   5. SESTAV SI KYTICI — stonky do vázy, vítr pod kurzorem
   ========================================================= */
const STEMS = {
  pivonka:    { w: 406, h: 910, px: .481, py: .994, hy: .134 },
  ruze:       { w: 358, h: 893, px: .473, py: .995, hy: .126 },
  jirina:     { w: 263, h: 893, px: .559, py: .994, hy: .130 },
  sasanka:    { w: 202, h: 896, px: .486, py: .993, hy: .113 },
  krasenka:   { w: 255, h: 896, px: .533, py: .992, hy: .118 },
  pryskyrnik: { w: 230, h: 893, px: .434, py: .994, hy: .113 },
  chrpa:      { w: 193, h: 885, px: .504, py: .992, hy: .108 }
};
const BQ_NAMES = { pivonka: 'Pivoňkové ráno', ruze: 'Meruňkový podvečer', jirina: 'Vínová neděle', sasanka: 'Tichá sasanka', krasenka: 'Letní louka', pryskyrnik: 'Korálový den', chrpa: 'Modrá z nebe' };
const MAXS = 15;
const stage = $('#stage'), stemsEl = $('#stems'), picker = $('#picker');
const VASE = { w: 865, h: 900, mouthY: .014, mouthX: .503, mouthW: .54 };
const bq = [];
const build = { name: '', stems: 0 };

Object.keys(STEMS).forEach(id => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'pick'; b.dataset.id = id;
  b.setAttribute('aria-label', `Přidat do vázy: ${FL[id].name}`);
  b.innerHTML = `<img src="img/${id}.webp" alt=""><span>${FL[id].name.replace('Zahradní r', 'R')}</span><b>0</b>`;
  b.addEventListener('click', () => { stopSeed(); addStem(id); b.classList.remove('is-pop'); void b.offsetWidth; b.classList.add('is-pop'); });
  picker.append(b);
});

function stageGeo() {
  const sw = stage.clientWidth, sh = stage.clientHeight;
  const vh = sh * .4, vw = vh * VASE.w / VASE.h;
  const vx = sw / 2 - vw / 2, vy = sh * .96 - vh;
  const my = vy + vh * VASE.mouthY;
  return { sw, sh, vh, vw, my, px: vx + vw * VASE.mouthX, py: my + vh * .12, mouth: vw * VASE.mouthW };
}
function arrange() {
  const n = bq.length;
  const spread = Math.min(.78, .2 + n * .05);
  bq.forEach((s, i) => {
    const t = n === 1 ? 0 : i / (n - 1) * 2 - 1;
    s.base = t * spread + s.jit;
    s.f = clamp(1 - .26 * Math.abs(t) ** 1.3 - s.jitH, .55, 1);
    s.el.style.zIndex = String(Math.round((1 - s.f) * 100));
  });
}
function refreshBuild() {
  const counts = {};
  bq.forEach(s => { if (!s.leave) counts[s.id] = (counts[s.id] || 0) + 1; });
  const live = bq.filter(s => !s.leave);
  $$('.pick', picker).forEach(b => { const c = counts[b.dataset.id] || 0; b.querySelector('b').textContent = c; b.classList.toggle('has', c > 0); });
  $('#bCount').textContent = live.length;
  const kinds = Object.keys(counts);
  let name = 'Zatím prázdná váza';
  if (live.length) {
    const dom = kinds.sort((a, b) => counts[b] - counts[a])[0];
    name = kinds.length >= 4 ? 'Kytice „Plná náruč“' : kinds.length === 3 ? 'Kytice „Zahrada po dešti“' : `Kytice „${BQ_NAMES[dom]}“`;
  }
  $('#bName').textContent = name; build.name = name; build.stems = live.length;
  let r = 0, g = 0, b = 0;
  live.forEach(s => { const c = parseInt(FL[s.id].c.slice(1), 16); r += c >> 16; g += (c >> 8) & 255; b += c & 255; });
  if (live.length) {
    const k = .34, n = live.length, P = [239, 231, 218];
    stage.style.setProperty('--stage', `rgb(${Math.round(lerp(P[0], r / n, k))},${Math.round(lerp(P[1], g / n, k))},${Math.round(lerp(P[2], b / n, k))})`);
  } else stage.style.removeProperty('--stage');
}
function addStem(id, quiet) {
  if (bq.filter(s => !s.leave).length >= MAXS) { toast('Víc se do vázy nevejde. Patnáct stonků je plná náruč.'); return; }
  const el = document.createElement('img');
  el.className = 'stem'; el.src = `img/stonek-${id}.webp`; el.alt = '';
  stemsEl.append(el);
  const s = { id, el, base: 0, ang: rand(-.5, .5), v: 0, y: quiet || reduce ? 0 : -1, vy: 0, jit: rand(-.05, .05), jitH: rand(0, .1), f: 1, o: 1, leave: false };
  const at = Math.floor(Math.random() * (bq.length + 1));
  bq.splice(at, 0, s);
  arrange(); refreshBuild(); wakeStage();
}
function clearStems() {
  bq.forEach(s => { s.leave = true; s.vy = -rand(14, 24); s.v += rand(-.06, .06); });
  refreshBuild(); wakeStage();
}
function shuffleStems() {
  for (let i = bq.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bq[i], bq[j]] = [bq[j], bq[i]]; }
  bq.forEach(s => { s.jit = rand(-.05, .05); s.jitH = rand(0, .1); s.v += rand(-.05, .05); });
  arrange(); wakeStage();
}
$('#bShuffle').addEventListener('click', () => { if (!bq.length) { toast('Váza je prázdná. Nejdřív přidejte pár květů.'); return; } shuffleStems(); });
$('#bClear').addEventListener('click', () => { stopSeed(); if (bq.length) clearStems(); });
$('#bSend').addEventListener('click', () => {
  if (!build.stems) { toast('Nejdřív dejte do vázy aspoň jeden květ.'); return; }
  toast(`${build.name} by teď šla k nám. Tohle je ukázka, nic se neobjednává.`);
});

/* vítr pod kurzorem */
const wind = { x: -1e4, y: -1e4, vx: 0, t: 0 };
stage.addEventListener('pointermove', e => {
  const r = stage.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, now = performance.now(), dt = now - wind.t;
  wind.vx = dt > 0 && dt < 120 ? (x - wind.x) / dt * 16 : 0;
  wind.x = x; wind.y = y; wind.t = now; wakeStage();
});
stage.addEventListener('pointerleave', () => { wind.vx = 0; wind.x = -1e4; });

let stageVis = false, stageAwake = 0;
const wakeStage = () => { stageAwake = performance.now(); };
function stageFrame() {
  if (!stageVis) return;
  const now = performance.now();
  if (now - stageAwake > 4000 && !bq.some(s => s.leave || s.y !== 0)) return;
  const G = stageGeo(), t = now / 1000;
  stemsEl.style.setProperty('--cut', (G.my + G.vh * .05).toFixed(1) + 'px');
  stemsEl.style.setProperty('--mx', (G.px - G.mouth * .46).toFixed(1) + 'px');
  stemsEl.style.setProperty('--mw', (G.mouth * .92).toFixed(1) + 'px');
  for (let i = bq.length - 1; i >= 0; i--) {
    const s = bq[i], S = STEMS[s.id];
    /* stonek má stejné měřítko pro všechny; kratší jen hlouběji zastrčíme do vázy */
    const Hs = G.sh * 1.02, Ws = Hs * S.w / S.h;
    const oy = clamp((G.py - G.sh * .045) * s.f / Hs, .3, S.py);
    const headX = G.px + Math.sin(s.ang) * Hs * (oy - S.hy), headY = G.py - Math.cos(s.ang) * Hs * (oy - S.hy);
    let push = 0;
    if (!coarse && wind.x > -1e3) {
      const d = Math.hypot(headX - wind.x, headY - wind.y);
      if (d < 170) push = clamp(wind.vx, -40, 40) * .0011 * (1 - d / 170);
    }
    const target = s.base + (reduce ? 0 : Math.sin(t * .9 + i * 1.7) * .012);
    s.v += (target - s.ang) * .06 + push; s.v *= .9; s.ang += s.v;
    if (s.leave) { s.vy += .9; s.y += s.vy * 2; s.o -= .028; }
    else if (s.y !== 0) { s.vy += (0 - s.y) * .08; s.vy *= .82; s.y += s.vy; if (Math.abs(s.y) < .001 && Math.abs(s.vy) < .001) s.y = 0; }
    const yo = s.leave ? s.y : s.y * G.sh * .6;
    s.el.style.width = Ws.toFixed(1) + 'px';
    s.el.style.height = Hs.toFixed(1) + 'px';
    s.el.style.transformOrigin = `${(S.px * 100).toFixed(1)}% ${(oy * 100).toFixed(2)}%`;
    s.el.style.transform = `translate3d(${(G.px - Ws * S.px).toFixed(1)}px,${(G.py - Hs * oy + yo).toFixed(1)}px,0) rotate(${s.ang.toFixed(4)}rad)`;
    s.el.style.opacity = Math.max(0, s.o).toFixed(2);
    if (s.leave && s.o <= 0) { s.el.remove(); bq.splice(i, 1); }
  }
  if (wind.vx) wind.vx *= .8;
}
gsap.ticker.add(stageFrame);
/* úvodní kytice; jakmile sáhne člověk, zbytek se už nepřidá */
let seeded = false, seedT = [];
function stopSeed() { seeded = true; seedT.forEach(clearTimeout); seedT = []; }
ScrollTrigger.create({
  trigger: stage, start: 'top bottom', end: 'bottom top',
  onToggle: s => { stageVis = s.isActive; if (s.isActive) wakeStage(); }
});
ScrollTrigger.create({
  trigger: stage, start: 'top 70%',
  onEnter: () => {
    if (seeded) return; seeded = true;
    ['pivonka', 'ruze', 'jirina', 'sasanka', 'chrpa'].forEach((id, i) => reduce ? addStem(id, true) : seedT.push(setTimeout(() => addStem(id), 200 + i * 260)));
  }
});

/* =========================================================
   6. CO PRÁVĚ KVETE
   ========================================================= */
const MON = ['Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čvn', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro'];
const MON_FULL = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];
const MON_IN = ['v lednu', 'v únoru', 'v březnu', 'v dubnu', 'v květnu', 'v červnu', 'v červenci', 'v srpnu', 'v září', 'v říjnu', 'v listopadu', 'v prosinci'];
const monthsEl = $('#months'), bloomEl = $('#bloom'), nowEl = $('#seasonNow');
const ORDER = ['pivonka', 'pryskyrnik', 'sasanka', 'jirina', 'krasenka', 'ruze', 'chrpa', 'pryskyrnik-zluty'];
ORDER.forEach(id => {
  const f = FL[id], d = document.createElement('div');
  d.className = 'bl'; d.dataset.id = id; d.style.setProperty('--c', f.c);
  d.innerHTML = `<div class="bl__img"><img src="img/${id}.webp" alt="${f.name}" loading="lazy"></div><h3>${f.name}</h3><p>${MON_FULL[f.m[0] - 1]} – ${MON_FULL[f.m[f.m.length - 1] - 1]}</p>`;
  bloomEl.append(d);
});
MON.forEach((m, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', MON_FULL[i]); b.textContent = m;
  b.addEventListener('click', () => setMonth(i + 1, true));
  monthsEl.append(b);
});
monthsEl.addEventListener('keydown', e => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  e.preventDefault();
  setMonth((season.m + (e.key === 'ArrowRight' ? 0 : -2) + 12) % 12 + 1, true, true);
});
const season = { m: new Date().getMonth() + 1 };
const join = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' a ' + a[a.length - 1];
function setMonth(m, user, focus) {
  season.m = m;
  $$('button', monthsEl).forEach((b, i) => { const on = i + 1 === m; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
  const inS = [];
  $$('.bl', bloomEl).forEach(d => { const on = FL[d.dataset.id].m.includes(m); d.classList.toggle('is-in', on); if (on) inS.push(FL[d.dataset.id].name.toLowerCase()); });
  const when = MON_IN[m - 1], When = when[0].toUpperCase() + when.slice(1);
  nowEl.innerHTML = inS.length
    ? `${When} kvete <em>${join(inS)}</em>.`
    : `${When} venku nekvete nic z naší osmičky. <em>Zeptejte se, co se dá sehnat.</em>`;
}
setMonth(season.m);

/* =========================================================
   7. OBJEDNÁVKA — kartička se píše s Vámi
   ========================================================= */
const msg = $('#msg'), cardMsg = $('#cardMsg'), card = $('#card');
const updCard = () => { const v = msg.value.trim(); cardMsg.textContent = v || 'Všechno nejlepší!'; cardMsg.classList.toggle('is-ph', !v); };
msg.addEventListener('input', updCard); updCard();
const order = $('#objednat');
const tiltX = gsap.quickTo(card, 'rotationY', { duration: .8, ease: 'power3' });
const tiltY = gsap.quickTo(card, 'rotationX', { duration: .8, ease: 'power3' });
gsap.set(card, { transformPerspective: 900, rotation: -4 });
if (!coarse && !reduce) {
  order.addEventListener('pointermove', e => {
    const r = card.getBoundingClientRect();
    tiltX(clamp((e.clientX - (r.left + r.width / 2)) / 30, -14, 14));
    tiltY(clamp(-(e.clientY - (r.top + r.height / 2)) / 30, -12, 12));
  });
  order.addEventListener('pointerleave', () => { tiltX(0); tiltY(0); });
}
$('#orderForm').addEventListener('submit', e => {
  e.preventDefault();
  toast('Děkujeme! Tohle je ukázka, poptávka se nikam neodeslala.');
});

/* =========================================================
   PATIČKA — písmena se roztahují pod kurzorem
   ========================================================= */
const word = $('.foot__word');
[...word.childNodes].forEach(n => {
  if (n.nodeType !== 3) return;
  const frag = document.createDocumentFragment();
  [...n.textContent].forEach(ch => {
    if (ch === ' ') { frag.append(' '); return; }
    const s = document.createElement('span'); s.className = 'l'; s.textContent = ch; frag.append(s);
  });
  n.replaceWith(frag);
});
const fLetters = $$('.l', word), foot = $('.foot');
let fx = -1e4, fy = -1e4, fOn = false, footVis = false;
foot.addEventListener('pointermove', e => { fx = e.clientX; fy = e.clientY; fOn = true; }, { passive: true });
foot.addEventListener('pointerleave', () => { fOn = false; });
ScrollTrigger.create({ trigger: foot, start: 'top bottom', end: 'bottom top', onToggle: s => { footVis = s.isActive; } });
gsap.ticker.add(() => {
  if (!footVis) return;
  const t = performance.now() / 1000;
  const rects = fLetters.map(l => l.getBoundingClientRect());
  fLetters.forEach((l, i) => {
    const r = rects[i];
    let k;
    if (fOn && !coarse) { const d = Math.hypot(r.left + r.width / 2 - fx, r.top + r.height / 2 - fy); k = Math.exp(-(d * d) / (2 * 140 * 140)); }
    else k = reduce ? .4 : .5 + .5 * Math.sin(t * 1.2 - i * .6);
    const cur = +l.dataset.k || 0, nk = cur + (k - cur) * .12; l.dataset.k = nk.toFixed(4);
    l.style.fontVariationSettings = `"wdth" ${(70 + 55 * nk).toFixed(1)}, "wght" ${Math.round(600 + 300 * nk)}`;
  });
});

/* ---------- start ---------- */
addEventListener('load', () => { document.documentElement.classList.add('ready'); ScrollTrigger.refresh(); });

window.__hero = hero;
window.__build = ids => { bq.slice().forEach(s => s.el.remove()); bq.length = 0; stopSeed(); ids.forEach(id => addStem(id, true)); };
window.__month = m => setMonth(m);
window.__state = () => ({
  flowers: hero.count(), rain: hero.st.rain, letters: hero.st.letters.length, F: Math.round(hero.st.F), heroVisible: hero.st.visible,
  stems: build.stems, bouquet: build.name, month: season.m, season: $('#seasonNow').textContent,
  wd: +wd.toFixed(1), nav: nav.className, scroll: Math.round(scrollY)
});
})();
