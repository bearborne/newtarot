// ── Card-pick magic ─────────────────────────────────────
// Five quick flashes for a card leaving the fan and landing in the
// spread. Each one is over in under half a second; only the sparks and
// light linger a moment after the card has landed.
//
//   rune   – Rune flash: a circle snaps open, the card whips over on a
//            streak of light, a second circle flashes round the slot
//   star   – Star streak: the card pinches into a star, streaks over and
//            bursts open
//   ember  – Ember blink: the card burns into embers that swirl up and
//            fuse back into the card, which then cools
//   bolt   – Gold lightning: a forked bolt strikes the slot and the card
//            appears in the flash
//   moon   – Moon blink: silver dust, a little crescent arcs over as a
//            ring of moonlight closes on the slot, and the card blinks in
//
// PickFX.play(style, { flyer, card, from, to }) moves `flyer` (a card
// back at the fan card's place) and resolves once it sits exactly over
// the slot, ready to be swapped for the real card. `card` is that real
// card (still hidden); some styles give it a little after-glow.

const PickFX = (() => {
  const GL = "255, 214, 140";        // warm gold light
  const MOON = "215, 224, 255";      // cool silver light
  const EMBER = "255, 170, 70";

  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const eo = (u) => 1 - Math.pow(1 - u, 3);
  const lr = (a, b, u) => a + (b - a) * u;
  const bq = (a, b, c, u) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * b + u * u * c;

  // One canvas over everything (even the flying card), taps pass through.
  let cv = null, ctx = null, W = 0, H = 0, running = false, last = 0;
  const drawers = [];   // each draws one frame and returns false when done
  const sparks = [];

  function setup() {
    if (!cv) {
      cv = document.createElement("canvas");
      cv.className = "pickfx";
      cv.setAttribute("aria-hidden", "true");
      document.body.append(cv);
      addEventListener("resize", size);
    }
    size();
  }
  function size() {
    // Soft light needs no extra sharpness; a lighter canvas keeps it smooth.
    const r = Math.min(devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    cv.width = W * r; cv.height = H * r;
    ctx = cv.getContext("2d");
    ctx.setTransform(r, 0, 0, r, 0, 0);
  }

  function add(fn) {
    const t0 = performance.now();
    drawers.push((now) => fn((now - t0) / 1000));
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, W, H);
    for (let i = drawers.length - 1; i >= 0; i--) {
      ctx.save();
      const keep = drawers[i](now);
      ctx.restore();
      if (!keep) drawers.splice(i, 1);
    }
    drawSparks(dt);
    if (drawers.length || sparks.length) requestAnimationFrame(frame);
    else { running = false; ctx.clearRect(0, 0, W, H); cv.style.zIndex = ""; }
  }

  // ── Little drawing helpers ──
  // No canvas shadowBlur anywhere: it is very slow and made picks stutter.
  // Glows are pre-drawn soft dots (sprites) and lines stroked three times,
  // wide and faint under narrow and bright.

  const spriteCache = {};
  function sprite(col) {
    if (spriteCache[col]) return spriteCache[col];
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d").createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255, 252, 240, 1)");
    g.addColorStop(0.18, `rgba(${col}, .9)`);
    g.addColorStop(0.45, `rgba(${col}, .25)`);
    g.addColorStop(1, `rgba(${col}, 0)`);
    const x = c.getContext("2d");
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return (spriteCache[col] = c);
  }
  // A glowing dot of radius r (the glow reaches about 3r).
  function dot(x, y, r, a, col) {
    if (a <= 0) return;
    ctx.globalAlpha = a;
    const R = r * 3;
    ctx.drawImage(sprite(col), x - R, y - R, R * 2, R * 2);
  }
  // Strokes the current path as a glowing line.
  function glowStroke(col, w, a = 1) {
    ctx.globalAlpha = a;
    ctx.lineWidth = w * 5;
    ctx.strokeStyle = `rgba(${col}, .07)`;
    ctx.stroke();
    ctx.lineWidth = w * 2.4;
    ctx.strokeStyle = `rgba(${col}, .22)`;
    ctx.stroke();
    ctx.lineWidth = w;
    ctx.strokeStyle = `rgba(${col}, 1)`;
    ctx.stroke();
  }
  function glowOn() { ctx.globalCompositeOperation = "lighter"; }
  function flash(x, y, r, a, col = GL) {
    if (a <= 0 || r <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255, 255, 240, ${a})`);
    g.addColorStop(0.3, `rgba(${col}, ${0.6 * a})`);
    g.addColorStop(1, `rgba(${col}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }
  function ring(x, y, r, a, w = 2, col = GL) {
    if (a <= 0) return;
    ctx.save();
    glowOn();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    glowStroke(col, w, a);
    ctx.restore();
  }
  // A rune circle: two rings drawn in as far as p (0 to 1), marks between
  // them and a six-pointed star once it is nearly closed. sy squashes it
  // into an ellipse, as if lying flat on the table.
  function runeCircle(x, y, r, p, rot, a, sy = 1) {
    if (a <= 0 || p <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, sy);
    ctx.rotate(rot);
    glowOn();
    // Both rings and all the marks go into one path, stroked once with glow.
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, p * Math.PI * 2);
    ctx.moveTo(r * 0.74, 0);
    ctx.arc(0, 0, r * 0.74, 0, -p * Math.PI * 2, true);
    const m = Math.max(3, r * 0.06);
    for (let i = 0; i < 12 && i / 12 <= p; i++) {
      // a mark in its own little frame, rotated out onto the ring
      const ang = (i / 12) * Math.PI * 2, c = Math.cos(ang), s = Math.sin(ang);
      const P = (u, v) => [c * (r * 0.87 + u) - s * v, s * (r * 0.87 + u) + c * v];
      const line = (pts, close) => {
        pts.forEach(([u, v], k) => { const [X, Y] = P(u, v); k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
        if (close) ctx.closePath();
      };
      if (i % 3 === 0) line([[-m, 0], [0, -m], [m, 0], [0, m]], true);
      else if (i % 3 === 1) { line([[-m, -m * 0.6], [m, -m * 0.6]]); line([[0, -m * 0.6], [0, m]]); }
      else line([[-m, m], [0, -m], [m, m]]);
    }
    glowStroke(GL, 1.3, a);
    if (p > 0.6) {
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const ang = (k * Math.PI * 4) / 6 - Math.PI / 2;
        const px = Math.cos(ang) * r * 0.74, py = Math.sin(ang) * r * 0.74;
        k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      glowStroke(GL, 1, a * seg(p, 0.6, 1));
    }
    ctx.restore();
  }
  // A four-pointed star of light.
  function star(x, y, s, a) {
    if (a <= 0 || s <= 0) return;
    ctx.save();
    glowOn();
    dot(x, y, s * 0.9, a, GL);
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgb(255, 243, 214)";
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x, y, x + s, y);
    ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y);
    ctx.quadraticCurveTo(x, y, x, y - s);
    ctx.fill();
    ctx.restore();
  }
  // A streak of light behind something moving; keeps fading once it stops.
  function makeTrail(keep = 0.12, width = 5, col = GL) {
    const pts = [];
    return {
      push(x, y, t) { pts.push({ x, y, t }); },
      draw(t) {
        while (pts.length && t - pts[0].t > keep) pts.shift();
        if (pts.length < 2) return pts.length > 0;
        ctx.save();
        glowOn();
        ctx.lineCap = "round";
        for (let i = 1; i < pts.length; i++) {
          const a = 1 - (t - pts[i].t) / keep;
          ctx.beginPath();
          ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
          ctx.lineTo(pts[i].x, pts[i].y);
          glowStroke(col, width * a * 0.6 + 0.5, a);
        }
        ctx.restore();
        return true;
      },
    };
  }
  // A small glowing crescent moon, horns to the upper right.
  function crescent(x, y, r, a) {
    if (a <= 0 || r <= 0) return;
    dot(x, y, r * 0.9, 0.55 * a, MOON);
    ctx.save();
    glowOn();
    ctx.globalAlpha = a;
    // Everything except the bite taken out of the moon's disc.
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.arc(x + r * 0.48, y - r * 0.28, r * 0.86, 0, Math.PI * 2);
    ctx.clip("evenodd");
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(240, 244, 255, 1)";
    ctx.fill();
    ctx.restore();
  }
  // Sparks thrown out from a point.
  function burst(x, y, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2, v = (o.v || 60) * (0.4 + Math.random());
      const life = (o.life || 0.5) * (0.6 + Math.random() * 0.6);
      sparks.push({
        x: x + (Math.random() - 0.5) * (o.spread || 6), y: y + (Math.random() - 0.5) * (o.spread || 6),
        vx: Math.cos(ang) * v + (o.vx || 0), vy: Math.sin(ang) * v + (o.vy || 0),
        life, max: life, r: (o.size || 1.6) * (0.5 + Math.random()), col: o.col || "255, 236, 190",
      });
    }
    if (!running) add(() => false);
  }
  function drawSparks(dt) {
    if (!sparks.length) return;
    ctx.save();
    glowOn();
    const drag = Math.pow(0.02, dt);
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      if ((p.life -= dt) <= 0) { sparks.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= drag; p.vy *= drag;
      const a = p.life / p.max;
      dot(p.x, p.y, p.r * (0.6 + a * 0.6), a, p.col);
    }
    ctx.restore();
  }

  // Where the flyer is right now (its centre), for trails that follow it.
  const centre = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

  // ── The five styles ──
  // f = from (the fan card: x, y centre, w, h, a = its tilt in degrees)
  // to = the slot (x, y centre, w, h); m = transforms for the flyer.

  async function rune(flyer, f, to, m) {
    const K = f.h / 60;
    add((t) => {
      runeCircle(f.x, f.y + f.h * 0.45, f.h * 0.78, eo(seg(t, 0, 0.1)), t * 3, 1 - seg(t, 0.15, 0.45), 0.32);
      flash(f.x, f.y, f.h * 0.85, 0.5 * (1 - seg(t, 0.02, 0.2)));
      return t < 0.45;
    });
    const trail = makeTrail(0.1, 5 * K);
    let flying = true;
    add((t) => { if (flying) { const p = centre(flyer); trail.push(p.x, p.y, t); } return trail.draw(t) || flying; });
    const midX = (f.x + to.x) / 2 - 55 * K, midY = (f.y + to.y) / 2;
    await flyer.animate([
      { transform: m.start },
      { transform: `translate(${midX - f.x}px, ${midY - f.y}px) rotate(${f.a * 0.3 - 8}deg) scale(${lr(1, m.scale, 0.5)})`, offset: 0.5 },
      { transform: m.end },
    ], { duration: 240, delay: 60, easing: "cubic-bezier(.45,0,.35,1)", fill: "forwards" }).finished;
    flying = false;
    const R = Math.hypot(to.w, to.h) / 2 * 1.12;
    burst(to.x, to.y, 55, { v: 220 * K, spread: to.w * 0.6 });
    add((t) => {
      flash(to.x, to.y, R * 1.4, 1 - seg(t, 0, 0.25));
      runeCircle(to.x, to.y, R, eo(seg(t, 0, 0.1)), -t * 3, 1 - seg(t, 0.15, 0.6));
      return t < 0.6;
    });
  }

  async function starStreak(flyer, f, to, m) {
    const K = f.h / 60;
    flyer.animate([{ transform: m.start, opacity: 1 }, { transform: `${m.start} scale(.1)`, opacity: 0 }],
      { duration: 80, easing: "ease-in", fill: "forwards" });
    const trail = makeTrail(0.12, 5 * K);
    const midX = (f.x + to.x) / 2 + 40 * K, midY = (f.y + to.y) / 2;
    let landed = false;
    add((t) => {
      if (t < 0.08) { const s = seg(t, 0, 0.08); star(f.x, f.y, 14 * K * s, s); return true; }
      const u = eo(seg(t, 0.08, 0.27));
      if (u < 1) {
        const x = bq(f.x, midX, to.x, u), y = bq(f.y, midY, to.y, u);
        trail.push(x, y, t);
        star(x, y, 11 * K, 1);
        if (Math.random() < 0.6) burst(x, y, 1, { v: 12, life: 0.35, size: 1.2 });
      }
      return trail.draw(t) || u < 1;
    });
    await wait(270);
    burst(to.x, to.y, 70, { v: 240 * K, life: 0.55, spread: to.w * 0.3 });
    add((t) => {
      flash(to.x, to.y, to.h * 0.9, 1 - seg(t, 0, 0.22));
      ring(to.x, to.y, lr(to.w * 0.15, to.h * 1.2, eo(seg(t, 0, 0.42))), 1 - seg(t, 0, 0.42), 2);
      star(to.x, to.y, to.w * 0.4 * (1 - seg(t, 0, 0.14)), 1 - seg(t, 0, 0.14));
      return t < 0.45;
    });
    await flyer.animate([
      { transform: `${m.end} rotate(-90deg) scale(.01)`, opacity: 1 },
      { transform: m.end, opacity: 1 },
    ], { duration: 150, easing: "cubic-bezier(.2,.9,.3,1.15)", fill: "forwards" }).finished;
  }

  async function ember(flyer, f, to, m, card) {
    const K = f.h / 60;
    const rad = (f.a * Math.PI) / 180;
    // The card burns away from the bottom up, embers rising off the edge.
    flyer.animate([{ clipPath: "inset(0 0 0 0)" }, { clipPath: "inset(0 0 100% 0)" }],
      { duration: 110, easing: "linear", fill: "forwards" });
    add((t) => {
      const b = seg(t, 0, 0.11);
      if (b >= 1) return false;
      const d = f.h / 2 - f.h * b;   // the edge, measured down from the centre
      const ex = f.x - Math.sin(rad) * d, ey = f.y + Math.cos(rad) * d;
      const hx = Math.cos(rad) * f.w / 2, hy = Math.sin(rad) * f.w / 2;
      ctx.save();
      glowOn();
      ctx.beginPath();
      ctx.moveTo(ex - hx, ey - hy);
      ctx.lineTo(ex + hx, ey + hy);
      glowStroke("255, 200, 110", 2.4);
      ctx.restore();
      flash(f.x, f.y, f.h * 0.7, 0.6 * b, EMBER);
      for (let k = 0; k < 4; k++) {
        const u = Math.random() - 0.5;
        burst(ex + hx * 2 * u, ey + hy * 2 * u, 1, { v: 40 * K, vy: -60 * K, life: 0.45, col: Math.random() < 0.5 ? EMBER : "255, 226, 160", spread: 2 });
      }
      return true;
    });
    // The embers swirl straight over to the slot.
    add((t) => {
      const u = seg(t, 0.05, 0.36);
      if (u >= 1) return false;
      if (u <= 0) return true;
      const e = eo(u);
      const cx = lr(f.x, to.x, e), cy = lr(f.y, to.y, e);
      ctx.save();
      glowOn();
      const al = Math.sin(Math.PI * u), size = 1.7 * Math.max(1, K * 0.7);
      for (let k = 0; k < 60; k++) {
        const ang = k * 2.4 + u * 10;
        const r = (12 + (k % 9) * 3) * K * (1 - u * 0.8);
        const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r * 0.7 - (1 - u) * k * 0.25 * K;
        dot(x, y, size, al, k % 3 ? "255, 160, 60" : "255, 226, 160");
      }
      ctx.restore();
      return true;
    });
    await wait(300);
    // …and fuse back into the card from the top down, a glowing edge writing it in.
    add((t) => {
      const rv = eo(seg(t, 0, 0.2));
      flash(to.x, to.y, to.h * 0.8, 0.7 * (1 - seg(t, 0, 0.3)), EMBER);
      if (rv >= 1) return t < 0.3;
      const ey = to.y - to.h / 2 + to.h * rv;
      ctx.save();
      glowOn();
      ctx.beginPath();
      ctx.moveTo(to.x - to.w / 2 - 1, ey);
      ctx.lineTo(to.x + to.w / 2 + 1, ey);
      glowStroke("255, 210, 120", 2.4);
      ctx.restore();
      burst(to.x + (Math.random() - 0.5) * to.w, ey, 3, { v: 30, vy: -30, life: 0.4, col: "255, 190, 90", spread: 2 });
      return true;
    });
    await flyer.animate([
      { transform: m.end, clipPath: "inset(0 0 100% 0)", filter: "sepia(1) saturate(3) brightness(1.5)" },
      { transform: m.end, clipPath: "inset(0 0 0% 0)", filter: "sepia(.8) saturate(2.4) brightness(1.3)" },
    ], { duration: 200, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" }).finished;
    // The card cools from ember-hot back to its own colours.
    card.animate([
      { filter: "sepia(.8) saturate(2.4) brightness(1.3)" },
      { filter: "none" },
    ], { duration: 700, easing: "ease-out" });
  }

  async function bolt(flyer, f, to, m, card) {
    const K = f.h / 60;
    const top = { x: f.x, y: f.y - f.h * 0.3 }, end = { x: to.x, y: to.y + to.h * 0.4 };
    const pts = [top];
    const n = 9;
    for (let i = 1; i < n; i++) {
      const u = i / n;
      pts.push({ x: lr(top.x, end.x, u) + (Math.random() - 0.5) * 46 * K, y: lr(top.y, end.y, u) });
    }
    pts.push(end);
    const forks = [0, 1, 2].map(() => {
      const p = pts[2 + Math.floor(Math.random() * 5)];
      return [p, { x: p.x + (Math.random() - 0.5) * 60 * K, y: p.y - (10 + Math.random() * 25) * K }];
    });
    burst(f.x, f.y, 20, { v: 150 * K, life: 0.3, size: 1.4 });
    add((t) => {
      const grow = seg(t, 0, 0.06);
      const vis = t < 0.22 ? 0.6 + 0.4 * Math.sin(t * 120) : 1 - seg(t, 0.22, 0.38);
      if (vis <= 0) return false;
      ctx.save();
      glowOn();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      const last = Math.max(1, Math.ceil(grow * (pts.length - 1)));
      ctx.beginPath();
      pts.slice(0, last + 1).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      glowStroke(GL, 2.6 * Math.max(1, K * 0.8), vis);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "rgba(255, 252, 240, 1)";
      ctx.stroke();   // a white-hot core
      if (grow >= 1) {
        ctx.beginPath();
        forks.forEach(([a, b]) => { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); });
        glowStroke(GL, 1.3 * Math.max(1, K * 0.8), vis);
      }
      ctx.restore();
      return true;
    });
    flyer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 30, delay: 30, fill: "forwards" });
    await wait(60);
    burst(to.x, to.y, 60, { v: 230 * K, life: 0.5, spread: to.w * 0.5 });
    pts.forEach((p) => burst(p.x, p.y, 3, { v: 40, life: 0.35, size: 1.2 }));
    add((t) => {
      flash(to.x, to.y, to.h * 1.1, 1 - seg(t, 0, 0.3));
      flash(top.x, top.y, f.h * 0.8, 0.7 * (1 - seg(t, 0, 0.2)));
      return t < 0.3;
    });
    await flyer.animate([
      { transform: `${m.end} scale(1.13)`, opacity: 1 },
      { transform: m.end, opacity: 1 },
    ], { duration: 140, easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" }).finished;
  }

  async function moon(flyer, f, to, m) {
    const K = f.h / 60;
    flyer.animate([{ transform: m.start, opacity: 1, filter: "brightness(1)" },
      { transform: `${m.start} scale(1.25)`, opacity: 0, filter: "brightness(2) hue-rotate(200deg)" }],
      { duration: 100, easing: "ease-out", fill: "forwards" });
    for (let k = 0; k < 40; k++) {
      const ang = Math.random() * Math.PI * 2;
      sparks.push({ x: f.x + (Math.random() - 0.5) * f.w, y: f.y + (Math.random() - 0.5) * f.h,
        vx: Math.cos(ang) * 60 * K, vy: -Math.random() * 90 * K, life: 0.45, max: 0.45, r: 1.4, col: MOON });
    }
    // A little crescent arcs over to the slot on a silver trail.
    const trail = makeTrail(0.12, 4 * K, MOON);
    const midX = (f.x + to.x) / 2 - 30 * K, midY = Math.min(f.y, to.y) - 40 * K;
    add((t) => {
      const u = seg(t, 0.03, 0.17);
      if (u > 0 && u < 1) {
        const e = u * u * (3 - 2 * u);
        const x = bq(f.x, midX, to.x, e), y = bq(f.y, midY, to.y, e);
        trail.push(x, y, t);
        crescent(x, y, 7 * K, 1);
        if (Math.random() < 0.5) burst(x, y, 1, { v: 14, life: 0.35, size: 1.1, col: MOON });
      }
      return trail.draw(t) || u < 1;
    });
    add((t) => {
      const rc = eo(seg(t, 0.04, 0.18));
      ring(to.x, to.y, lr(to.h * 1.1, to.h * 0.36, rc), rc > 0 ? 1 - seg(t, 0.18, 0.3) : 0, 1.6, MOON);
      return t < 0.3;
    });
    await wait(170);
    burst(to.x, to.y, 50, { v: 180 * K, life: 0.6, col: MOON, spread: to.w * 0.5 });
    add((t) => {
      flash(to.x, to.y, to.h * 1.05, 1 - seg(t, 0, 0.28), MOON);
      ring(to.x, to.y, lr(to.h * 0.4, to.h * 1.3, eo(seg(t, 0, 0.43))), 1 - seg(t, 0, 0.43), 2, MOON);
      return t < 0.45;
    });
    await flyer.animate([
      { transform: `${m.end} scale(1.1)`, opacity: 0, filter: "brightness(1.8)" },
      { transform: m.end, opacity: 1, filter: "brightness(1)" },
    ], { duration: 130, easing: "ease-out", fill: "forwards" }).finished;
  }

  const STYLES = { rune, star: starStreak, ember, bolt, moon };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // ── The reading's summary: the cards' light converges ──
  // A rune circle snaps open round every card, each card fires a streak
  // of light that spirals into the middle, a great double circle flashes
  // open there with a burst of sparks, and the light floods the screen.
  // open() is called inside that flash, so the summary appears in it.
  // points: the cards on screen ({ x, y, w, h }); none from the History.
  function summon(points, open) {
    setup();
    cv.style.zIndex = 9000;   // above every window while it plays
    const C = { x: W / 2, y: H * 0.45 };
    const R = Math.min(W, H) * 0.26;
    const src = points.length ? points : Array.from({ length: 5 }, (_, i) => {
      const ang = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      return { x: C.x + Math.cos(ang) * R * 2, y: C.y + Math.sin(ang) * R * 2, w: 0, h: 0 };
    });
    const K = Math.max(1, Math.min(W, H) / 600);

    src.forEach((p, i) => {
      const d = i * 0.035;
      const trail = makeTrail(0.16, 6 * K);
      // every streak bends the same way, so together they swirl in
      const dx = C.x - p.x, dy = C.y - p.y, L = Math.hypot(dx, dy) || 1;
      const mx = (p.x + C.x) / 2 - (dy / L) * L * 0.35, my = (p.y + C.y) / 2 + (dx / L) * L * 0.35;
      let started = false;
      add((t) => {
        const tt = t - d;
        if (tt < 0) return true;
        if (!started) {
          started = true;
          if (p.h) burst(p.x, p.y, 14, { v: 140 * K, life: 0.4, spread: p.w * 0.6 });
        }
        if (p.h) {
          runeCircle(p.x, p.y, Math.hypot(p.w, p.h) / 2 * 1.08, eo(seg(tt, 0, 0.12)), tt * 3, 1 - seg(tt, 0.15, 0.42));
          flash(p.x, p.y, p.h * 0.75, 0.6 * (1 - seg(tt, 0, 0.25)));
        }
        const u = seg(tt, 0.08, 0.36), e = u * u * (3 - 2 * u);
        if (u > 0 && u < 1) {
          const x = bq(p.x, mx, C.x, e), y = bq(p.y, my, C.y, e);
          trail.push(x, y, tt);
          star(x, y, 10 * K, 1);
          if (Math.random() < 0.5) burst(x, y, 1, { v: 14, life: 0.35, size: 1.3 });
        }
        return trail.draw(tt) || tt < 0.42;
      });
    });

    const hit = 0.36 + (src.length - 1) * 0.035;
    setTimeout(() => {
      burst(C.x, C.y, 110, { v: 460 * K, life: 0.7, spread: R * 0.25, size: 2 });
      burst(C.x, C.y, 40, { v: 200 * K, life: 0.6, spread: R * 0.2, size: 1.6, col: "200, 165, 255" });
      add((t) => {
        // the light flooding the screen, then clearing to show the summary
        const grow = eo(seg(t, 0, 0.14)), fade = 1 - seg(t, 0.2, 0.65);
        if (fade > 0) {
          const rad = Math.hypot(W, H) * (0.2 + 0.9 * grow);
          const g = ctx.createRadialGradient(C.x, C.y, 0, C.x, C.y, rad);
          g.addColorStop(0, `rgba(255, 246, 225, ${0.97 * fade})`);
          g.addColorStop(0.45, `rgba(255, 214, 150, ${0.8 * fade})`);
          g.addColorStop(1, `rgba(60, 40, 80, ${0.5 * fade})`);
          ctx.globalAlpha = 1;
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, W, H);
        }
        runeCircle(C.x, C.y, R, eo(seg(t, 0, 0.14)), t * 1.5, 1 - seg(t, 0.35, 0.8));
        runeCircle(C.x, C.y, R * 1.35, eo(seg(t, 0.03, 0.18)), -t * 1.2, 0.75 * (1 - seg(t, 0.3, 0.75)));
        ring(C.x, C.y, lr(R * 0.3, Math.hypot(W, H) * 0.7, eo(seg(t, 0, 0.6))), 1 - seg(t, 0, 0.6), 3 * K);
        return t < 0.85;
      });
    }, hit * 1000);
    setTimeout(open, (hit + 0.1) * 1000);
    return (hit + 0.85) * 1000;   // how long the whole thing lasts, in ms
  }

  return {
    summon,
    styles: Object.keys(STYLES),
    async play(style, { flyer, card, from, to }) {
      setup();
      const dx = to.x - from.x, dy = to.y - from.y, scale = to.w / from.w;
      const m = {
        scale,
        start: `rotate(${from.a}deg)`,
        end: `translate(${dx}px, ${dy}px) scale(${scale})`,
      };
      await (STYLES[style] || rune)(flyer, from, to, m, card);
    },
  };
})();
