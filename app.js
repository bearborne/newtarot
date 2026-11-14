// How the app works. You normally only need to edit cards.js and spreads.js.

const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// A little life in every movement: n give or take `amt` (12% by default),
// so no two flips, fans or flights play out exactly alike.
const vary = (n, amt = 0.12) => n * (1 + (Math.random() * 2 - 1) * amt);
// A random number between -n and n.
const wobble = (n) => (Math.random() * 2 - 1) * n;

// Every animation in the app gets a slightly different speed and start,
// unless the person has asked for reduced motion.
{
  const plain = Element.prototype.animate;
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  Element.prototype.animate = function (frames, opts) {
    if (!still.matches && opts != null) {
      opts = typeof opts === "number" ? { duration: opts } : { ...opts };
      if (opts.duration > 1) opts.duration = vary(opts.duration);
      if (opts.delay > 0) opts.delay = vary(opts.delay, 0.18);
    }
    return plain.call(this, frames, opts);
  };
}

const DECK_LOOK = 10;   // how many card backs make up the deck pile
const FAN_MAX = 22;     // most cards shown in the fan to pick from

let S = null;           // the reading in progress

// ── Options (remembered on this device) ─────────────────

const OPTIONS = [
  { id: "tags",      name: "Tags",           note: "Show the golden tag boxes" },
  { id: "court",     name: "Court cards",    note: "Add the Pages, Knights, Queens and Kings" },
  { id: "reversals", name: "Reversed cards", note: "Cards can come out upside down" },
];
const SET = { tags: false, court: false, reversals: false };

// Reads the saved switches. Only known switches, only true/false.
function loadOptions() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem("tarot-options")) || {}; } catch {}
  OPTIONS.forEach((o) => { SET[o.id] = saved[o.id] === true; });
}
loadOptions();

function saveOptions() {
  try { localStorage.setItem("tarot-options", JSON.stringify(SET)); } catch {}
}

// How a picked card travels from the fan to the spread. "surprise"
// picks one of the quick flashes at random for each card pulled.
const PICK_FX = [
  { id: "surprise", name: "Surprise me" },
  { id: "rune",     name: "Rune flash" },
  { id: "star",     name: "Star streak" },
  { id: "ember",    name: "Ember blink" },
  { id: "bolt",     name: "Gold lightning" },
  { id: "moon",     name: "Moon blink" },
  { id: "classic",  name: "Slow flight" },
];
let pickFx = "surprise";
try {
  const saved = localStorage.getItem("tarot-pickfx");
  if (PICK_FX.some((p) => p.id === saved)) pickFx = saved;
} catch {}

// A fresh one for every card pulled, never the same one twice in a row
// (also across readings).
let lastPickFx = null;
function nextPickFx() {
  if (pickFx !== "surprise") return pickFx;
  const quick = PICK_FX.filter((p) => p.id !== "surprise" && p.id !== "classic" && p.id !== lastPickFx);
  lastPickFx = quick[rand(quick.length)].id;
  return lastPickFx;
}

// The cards in play: the Pages, Knights, Queens and Kings only when Court cards is on.
function activeDeck() {
  return CARDS.filter((c) => SET.court || !c.court);
}

// ── Your history and notes (kept on this device) ────────
// Every reading and card of the day is saved in "tarot-history",
// your notes on the cards in "tarot-notes". Export a backup from the
// History screen to keep them safe or move them to another device.

const HISTORY_KEY = "tarot-history";
const NOTES_KEY = "tarot-notes";

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    keepData();
    return true;
  } catch {
    return false;
  }
}

// Asks the browser to keep this app's data, instead of clearing it
// when the device runs low on space.
let askedToKeep = false;
function keepData() {
  if (askedToKeep) return;
  askedToKeep = true;
  try { navigator.storage?.persist?.().catch(() => {}); } catch {}
}

function loadHistory() {
  const h = readJSON(HISTORY_KEY, []);
  return Array.isArray(h) ? h.filter((r) => r && Array.isArray(r.cards)) : [];
}

// cards: [{ name, rev, label }]
function addReading(spreadName, cards) {
  const h = loadHistory();
  h.push({ id: `${Date.now()}-${rand(1e6)}`, t: Date.now(), spread: spreadName, cards });
  writeJSON(HISTORY_KEY, h);
}

function removeReading(id) {
  writeJSON(HISTORY_KEY, loadHistory().filter((r) => r.id !== id));
}

function loadNotes() {
  const n = readJSON(NOTES_KEY, {});
  return n && typeof n === "object" && !Array.isArray(n) ? n : {};
}

const noteFor = (card) => loadNotes()[card.name] || "";

function saveNote(card, text) {
  const n = loadNotes();
  if (text.trim()) n[card.name] = text;
  else delete n[card.name];
  return writeJSON(NOTES_KEY, n);
}

// Every time a card was drawn, newest first.
function drawsOf(card) {
  const out = [];
  loadHistory().forEach((r) => r.cards.forEach((c) => {
    if (c.name === card.name) out.push({ t: r.t, spread: r.spread, label: c.label, rev: !!c.rev });
  }));
  return out.sort((a, b) => b.t - a.t);
}

// Dates in English to match the app, e.g. "12 Nov 2026" and "18:42".
const dateText = (t) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const timeText = (t) => new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

if (loadHistory().length || Object.keys(loadNotes()).length) keepData();

// ── Helpers ─────────────────────────────────────────────

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// A fair random whole number from 0 to n-1.
function rand(n) {
  const a = new Uint32Array(1);
  const limit = 2 ** 32 - (2 ** 32 % n);   // skip the uneven top end so every result is exactly as likely
  do crypto.getRandomValues(a); while (a[0] >= limit);
  return a[0] % n;
}

// The deck's order after a real shuffle.
function shuffledOrder(n) {
  const a = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fillText(box, text, emptyNote) {
  box.innerHTML = "";
  const parts = (text || "").trim().split(/\n\s*\n/).filter((p) => p.trim());
  if (!parts.length) {
    box.append(el("p", "empty-note", emptyNote));
    return;
  }
  parts.forEach((p) => box.append(el("p", "", p.trim())));
}

// The face of a card: its picture, or its name if it has none yet.
// small = use the little picture from cards/small (for the card list).
function cardFace(card, small, reversed) {
  const f = el("div", reversed ? "cface reversed" : "cface");
  const placeholder = () => {
    const p = el("div", "placeholder");
    p.append(el("span", "", card.name));
    return p;
  };
  if (card.image) {
    const img = new Image();
    img.alt = card.name;
    img.decoding = "async";
    if (small) {
      img.loading = "lazy";
      img.src = card.image.replace(/^cards\//, "cards/small/");
      img.onerror = () => {
        img.onerror = () => img.replaceWith(placeholder());
        img.src = card.image;
      };
    } else {
      img.src = card.image;
      img.onerror = () => img.replaceWith(placeholder());
    }
    f.append(img);
  } else {
    f.append(placeholder());
  }
  return f;
}

// Waits (briefly) for a card's picture so it never turns to a blank face.
function preload(card) {
  if (!card.image) return Promise.resolve();
  const img = new Image();
  img.src = card.image;
  return Promise.race([img.decode().catch(() => {}), wait(1500)]);
}

// A small game-style title that appears just above the cards when one is
// revealed: ornaments slide out, the name glows in letter by letter,
// holds for a moment, then fades away. It never covers the cards and
// taps go straight through it.
// above = the y position (in px) the title's bottom edge sits at;
// limit = the lowest y its top edge may reach (the bottom of the header).
function revealTitle(name, sub = "", above = 120, limit = 0) {
  document.querySelector(".rpg-title")?.remove();
  const box = el("div", "rpg-title");
  box.style.top = `${above}px`;
  box.setAttribute("aria-hidden", "true");
  const line = () => { const l = el("div", "rpg-line"); l.append(el("i"), el("b"), el("i")); return l; };
  const lineTop = line(), lineBottom = line();
  const word = el("div", "rpg-name");
  // Letters grouped by word, so a long name wraps between words, not inside one.
  name.split(" ").forEach((w, wi) => {
    if (wi) word.append(" ");
    const group = el("span", "rpg-word");
    [...w].forEach((ch) => group.append(el("span", "rpg-letter", ch)));
    word.append(group);
  });
  box.append(lineTop, word);
  if (sub) box.append(el("div", "rpg-sub", sub));
  box.append(lineBottom);
  document.body.append(box);
  // Short on room (a two-row spread): drop the top ornament. Never go
  // over the header or off the top of the screen.
  if (above - box.offsetHeight < limit) lineTop.remove();
  const minTop = Math.max(limit, 6) + box.offsetHeight;
  if (above < minTop) box.style.top = `${minTop}px`;
  if (!calm) box.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: "ease-out" });

  const hold = 1300 + name.length * 25;
  if (calm) {
    box.animate([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }],
      { duration: hold + 600, fill: "forwards" }).finished.then(() => box.remove());
    return;
  }
  [lineTop, lineBottom].forEach((l) => l.animate(
    [{ transform: "scaleX(0)", opacity: 0 }, { transform: "scaleX(1)", opacity: 1 }],
    { duration: 500, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" }));
  word.querySelectorAll(".rpg-letter").forEach((s, i) => s.animate(
    [{ opacity: 0, filter: "blur(4px)", transform: "translateY(5px) scale(1.25)" },
     { opacity: 1, filter: "blur(0)", transform: "none" }],
    { duration: 420, delay: 100 + i * 28 + wobble(14), easing: "ease-out", fill: "both" }));
  box.querySelector(".rpg-sub")?.animate(
    [{ opacity: 0, letterSpacing: ".45em" }, { opacity: 1, letterSpacing: ".25em" }],
    { duration: 600, delay: 200 + name.length * 28, easing: "ease-out", fill: "both" });
  box.animate(
    [{ opacity: 1, transform: "translateY(-100%)" }, { opacity: 0, transform: "translateY(calc(-100% - 8px))" }],
    { duration: 500, delay: hold, easing: "ease-in", fill: "forwards" }
  ).finished.then(() => box.remove());
}

function setHint(text) {
  const h = $("hint");
  h.classList.add("dim");
  setTimeout(() => { h.textContent = text; h.classList.remove("dim"); }, 200);
}

// ── 1. Choose a spread ──────────────────────────────────

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

// A little fan of card backs, drawn like the real deck: dark, with a thin
// gold outline, an inner line and a small circle.
function spreadFan(n) {
  const W = 46, H = 30, w = 11, h = 18;
  const spread = n === 1 ? 0 : Math.min(14, 5 + n * 3);
  let cards = "";
  for (let k = 0; k < n; k++) {
    const a = n === 1 ? 0 : -spread + (2 * spread * k) / (n - 1);
    const x = W / 2 + (k - (n - 1) / 2) * 3.2, y = H / 2 + 3 + Math.abs(a) * 0.12;
    cards += `<g transform="translate(${x} ${y}) rotate(${a})">`
      + `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="1.6" fill="#2a2436" stroke="#c9a96e" stroke-width=".9"/>`
      + `<rect x="${-w / 2 + 1.8}" y="${-h / 2 + 1.8}" width="${w - 3.6}" height="${h - 3.6}" rx=".8" fill="none" stroke="#c9a96e" stroke-opacity=".45" stroke-width=".5"/>`
      + `<circle r="${w * 0.17}" fill="none" stroke="#c9a96e" stroke-width=".6"/></g>`;
  }
  return `<svg class="spread-fan" viewBox="0 0 ${W} ${H}" aria-hidden="true">${cards}</svg>`;
}

SPREADS.forEach((spread) => {
  const n = spread.positions.length;
  const b = el("button", "spread-btn");
  b.setAttribute("aria-label", spread.name);
  b.innerHTML = spreadFan(n);
  b.append(el("span", "spread-num", ROMAN[n - 1] || String(n)), el("span", "spread-word", n === 1 ? "card" : "cards"));
  b.addEventListener("click", () => startReading(spread));
  $("spreadList").append(b);
});

// The on/off switches under the spreads.
function applyOptions() {
  document.body.classList.toggle("no-tags", !SET.tags);
}

OPTIONS.forEach((o) => {
  const row = el("label", "option");
  const text = el("span", "option-text");
  text.append(el("span", "option-name", o.name), el("span", "option-note", o.note));
  const box = el("input");
  box.type = "checkbox";
  box.className = "switch";
  box.id = `opt-${o.id}`;
  box.autocomplete = "off";   // stop the browser putting back old switch states
  box.dataset.opt = o.id;
  box.checked = SET[o.id];
  box.addEventListener("change", () => {
    SET[o.id] = box.checked;
    saveOptions();
    applyOptions();
    if (o.id === "court") buildFloatDeck();
    hideTip();
  });
  row.append(text, box);
  $("options").append(row);
});
applyOptions();

// Pick magic: one button that steps through the styles.
{
  const row = el("div", "option");
  const text = el("span", "option-text");
  text.append(el("span", "option-name", "Pick magic"), el("span", "option-note", "How a picked card flies to the spread"));
  const btn = el("button", "pick-fx-btn");
  const show = () => { btn.textContent = PICK_FX.find((p) => p.id === pickFx).name; };
  show();
  btn.setAttribute("aria-label", "Pick magic: tap to change");
  btn.addEventListener("click", () => {
    const i = PICK_FX.findIndex((p) => p.id === pickFx);
    pickFx = PICK_FX[(i + 1) % PICK_FX.length].id;
    try { localStorage.setItem("tarot-pickfx", pickFx); } catch {}
    show();
    hideTip();
  });
  row.append(text, btn);
  $("options").append(row);
}

// When the page is shown again (back button, reopened app), make the
// switches match what is saved, so what you see is what is used.
function syncOptions() {
  loadOptions();
  document.querySelectorAll("#options .switch").forEach((b) => { b.checked = SET[b.dataset.opt]; });
  applyOptions();
  buildFloatDeck();
}
addEventListener("pageshow", syncOptions);

function showHome() {
  S = null;
  resetMagic();
  $("table").hidden = true;
  $("home").hidden = false;
  placeCotdWords();   // measured again now the home screen is showing
  window.scrollTo(0, 0);
  startSky();
}

// ── The home screen's night sky and floating deck ───────

const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const homeShown = () => !$("home").hidden && !document.hidden;

// Twinkling stars and gold dust drifting upward, on a canvas that runs
// while shown() is true. The home screen has one, and so does Sky now.
function makeStarfield(canvas, shown) {
  const f = { stars: [], dust: [], running: false };
  f.size = () => {
    const r = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * r;
    canvas.height = innerHeight * r;
    canvas.getContext("2d").setTransform(r, 0, 0, r, 0, 0);
    const n = Math.round((innerWidth * innerHeight) / 9000);
    f.stars = Array.from({ length: Math.min(n, 140) }, () => ({
      x: Math.random(), y: Math.random(),
      s: Math.random() * 1.1 + 0.3, p: Math.random() * 6, v: 0.5 + Math.random(),
    }));
    f.dust = Array.from({ length: Math.min(Math.round(n / 4), 30) }, () => ({
      x: Math.random(), y: Math.random(),
      s: Math.random() * 1.4 + 0.7, v: 0.00025 + Math.random() * 0.0004,
    }));
  };
  f.draw = (t) => {
    const x = canvas.getContext("2d");
    const W = innerWidth, H = innerHeight;
    x.clearRect(0, 0, W, H);
    x.fillStyle = "#e9e2d3";
    for (const s of f.stars) {
      x.globalAlpha = calm ? 0.6 : 0.2 + 0.8 * Math.abs(Math.sin(t / 1100 * s.v + s.p));
      x.beginPath(); x.arc(s.x * W, s.y * H, s.s, 0, 7); x.fill();
    }
    if (!calm) {
      x.fillStyle = "#e3c98f";
      for (const d of f.dust) {
        d.y -= d.v;
        if (d.y < -0.02) { d.y = 1.02; d.x = Math.random(); }
        x.globalAlpha = 0.7 * Math.sin(Math.max(0, d.y) * Math.PI);
        x.beginPath();
        x.arc(d.x * W + Math.sin(t / 900 + d.x * 9) * 8, d.y * H, d.s, 0, 7);
        x.fill();
      }
    }
    x.globalAlpha = 1;
  };
  f.start = () => {
    if (f.running || !shown()) return;
    if (calm) { f.draw(0); return; }
    f.running = true;
    requestAnimationFrame(function frame(t) {
      if (!shown()) { f.running = false; return; }   // rests while away
      f.draw(t);
      requestAnimationFrame(frame);
    });
  };
  return f;
}

const homeSky = makeStarfield($("sky"), homeShown);
const sizeSky = () => homeSky.size();
const drawSky = (t) => homeSky.draw(t);
const startSky = () => homeSky.start();

// The card of the day is drawn at random from the deck in play the
// moment you reveal it (with Court cards and Reversed cards as set),
// then kept until tomorrow.
const FD_ANGLES = [-22, -11, 0, 11, 22];
let fdBusy = false;

function dayStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Today's drawn card, or null if it hasn't been revealed yet today.
// If a switch has since been turned off, it's drawn again.
function todaysCard() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem("tarot-cotd")); } catch {}
  if (!saved || saved.day !== dayStamp()) return null;
  const card = activeDeck().find((c) => c.name === saved.name);
  if (!card) return null;                      // a court card, now switched off
  if (saved.reversed && !SET.reversals) return null;
  return { card, reversed: !!saved.reversed };
}

function drawCardOfTheDay() {
  const deck = activeDeck();
  const pick = { card: deck[rand(deck.length)], reversed: SET.reversals && rand(2) === 1 };
  try {
    localStorage.setItem("tarot-cotd", JSON.stringify(
      { day: dayStamp(), name: pick.card.name, reversed: pick.reversed }));
  } catch {}
  addReading("Card of the day", [{ name: pick.card.name, rev: pick.reversed, label: "" }]);
  return pick;
}

function cotdName({ card, reversed }) {
  return reversed ? `${card.name}, reversed` : card.name;
}

// Puts the drawn card's face on the middle card of the floating deck.
function setFdFace(pick) {
  const flip = $("floatDeck").children[2].querySelector(".fd-flip");
  flip.querySelector(".cface")?.remove();
  flip.append(cardFace(pick.card, true, pick.reversed));
}

// Once the card of the day is turned, its keywords hover around it,
// drifting like the cards themselves: half on each side, in a loose
// zigzag, always clear of the card's face and inside the screen.
function showCotdWords(pick, fadeIn) {
  const box = $("floatDeck");
  box.querySelector(".fd-words")?.remove();
  const words = filled(keywordsFor(pick.card, pick.reversed)).slice(0, 6);
  if (!words.length) return;
  const ring = el("div", "fd-words");
  ring.setAttribute("aria-hidden", "true");
  const spans = words.map((w, i) => {
    const word = el("span", "fd-word", w);
    word.style.setProperty("--fx", `${wobble(7).toFixed(1)}px`);
    word.style.setProperty("--fy", `${vary(-9, 0.35).toFixed(1)}px`);
    word.style.animationDuration = `${vary(0.9).toFixed(2)}s, ${vary(4.2, 0.25).toFixed(2)}s`;
    word.style.animationDelay = `${fadeIn ? (0.15 + i * 0.12).toFixed(2) : 0}s, ${(-Math.random() * 4).toFixed(2)}s`;
    if (!fadeIn) word.style.animationName = "none, fd-drift";
    word.dataset.side = i % 2 ? "1" : "-1";   // alternate sides, so the order reads across
    word.dataset.jx = Math.random().toFixed(3);
    word.dataset.jy = wobble(1).toFixed(3);
    ring.append(word);
    return word;
  });
  box.append(ring);
  placeCotdWords();
}

function placeCotdWords() {
  const box = $("floatDeck");
  const words = [...box.querySelectorAll(".fd-word")];
  const mid = box.children[2];
  if (!words.length || !mid) return;
  const ch = mid.offsetHeight * 1.12;              // the lifted card's size
  const half = (mid.offsetWidth * 1.12) / 2;
  const room = box.clientWidth / 2 - 8;            // from the centre to the screen's edge
  const cy = -12;                                  // the lifted card sits a little above centre
  [-1, 1].forEach((side) => {
    const list = words.filter((w) => +w.dataset.side === side);
    list.forEach((w, k) => {
      w.style.fontSize = "";
      let width = w.offsetWidth;
      const inner = half + 14;
      // A long word on a narrow screen gets a little smaller rather than overlap.
      if (inner + width > room) {
        const f = Math.max(0.7, (room - inner) / width);
        w.style.fontSize = `${(parseFloat(getComputedStyle(w).fontSize) * f).toFixed(1)}px`;
        width = w.offsetWidth;
      }
      const spare = Math.max(0, room - inner - width);
      // Every other word steps out a little further, for a zigzag.
      const out = Math.min(spare, (k % 2 ? 0.55 : 0.12 + 0.2 * +w.dataset.jx) * Math.min(spare, ch * 0.35));
      const x = side * (inner + out + width / 2);
      const n = list.length;
      const t = n === 1 ? 0 : k / (n - 1) - 0.5;   // -0.5 … 0.5 down the side
      const y = cy + t * ch * 0.82 + +w.dataset.jy * ch * 0.04 + (side > 0 ? ch * 0.08 : 0);
      w.style.setProperty("--x", `${x.toFixed(1)}px`);
      w.style.setProperty("--y", `${y.toFixed(1)}px`);
    });
  });
}

function showCotdLabel(pick) {
  $("cotd").textContent = `Card of the day · ${cotdName(pick)}`;
  $("floatDeck").setAttribute("aria-label", `Card of the day: ${cotdName(pick)}`);
}

function buildFloatDeck() {
  const box = $("floatDeck");
  box.innerHTML = "";
  FD_ANGLES.forEach((a, i) => {
    const c = el("div", "fd-card");
    c.style.setProperty("--a", `${a}deg`);
    c.style.transitionDuration = `${vary(0.6).toFixed(2)}s`;
    const bob = el("div", "fd-bob");
    // Each card floats at its own pace and height.
    bob.style.animationDelay = `${(-i * 0.45 + wobble(0.2)).toFixed(2)}s`;
    bob.style.animationDuration = `${vary(3.2, 0.15).toFixed(2)}s`;
    bob.style.setProperty("--bob", `${vary(-6, 0.3).toFixed(1)}px`);
    const flip = el("div", "fd-flip");
    flip.append(el("div", "cback"));
    bob.append(flip);
    c.append(bob);
    box.append(c);
  });
  box.setAttribute("role", "button");
  fdBusy = false;
  const pick = todaysCard();
  if (pick) {
    setFdFace(pick);
    box.children[2].classList.add("lift", "turned", "revealed");
    showCotdLabel(pick);
    showCotdWords(pick, false);
  } else {
    box.setAttribute("aria-label", "Reveal card of the day");
    $("cotd").textContent = "Reveal card of the day";
  }
}

// A burst of sunlight: a bright glow, turning rays and flying sparks.
function sunburst() {
  const sun = el("div", "sun");
  const glow = el("div", "sun-glow");
  const rays = el("div", "sun-rays");
  sun.append(rays, glow);
  $("floatDeck").append(sun);
  glow.animate(
    [{ transform: "scale(0)", opacity: 1 }, { transform: "scale(5)", opacity: 1, offset: 0.35 }, { transform: "scale(9)", opacity: 0 }],
    { duration: 750, easing: "ease-out", fill: "forwards" }
  );
  rays.animate(
    (() => {
      // the rays turn either way, by a different amount each time
      const dir = Math.random() < 0.5 ? -1 : 1, start = wobble(20), turn = vary(70, 0.3) * dir;
      return [{ transform: `scale(.2) rotate(${start}deg)`, opacity: 0 },
        { transform: `scale(${vary(1, 0.1)}) rotate(${start + turn * 0.36}deg)`, opacity: 1, offset: 0.3 },
        { transform: `scale(${vary(1.5, 0.12)}) rotate(${start + turn}deg)`, opacity: 0 }];
    })(),
    { duration: 950, easing: "ease-out", fill: "forwards" }
  );
  for (let i = 0; i < 22; i++) {
    const s = el("div", "sun-spark");
    sun.append(s);
    const a = (i / 22) * Math.PI * 2 + Math.random() * 0.3;
    const r = 70 + Math.random() * 90;
    s.animate(
      [{ transform: "translate(0,0) scale(1)", opacity: .75 },
       { transform: `translate(${Math.cos(a) * r}px, ${Math.sin(a) * r}px) scale(.3)`, opacity: 0 }],
      { duration: 500 + Math.random() * 350, delay: 60, easing: "cubic-bezier(.1,.8,.3,1)", fill: "both" }
    );
  }
  setTimeout(() => sun.remove(), 1200);   // room for the slowest variation
}

// First tap: the card rises, bursts in sunlight and turns over.
// After that, a tap opens the card's page.
async function revealCardOfTheDay() {
  if (fdBusy) return;
  const today = todaysCard();
  if (today) { openDetails([detailsItem(today.card, today.reversed, "Card of the day")]); return; }
  fdBusy = true;
  const pick = drawCardOfTheDay();
  setFdFace(pick);
  const mid = $("floatDeck").children[2];
  const label = $("cotd");
  label.classList.add("fade");
  mid.classList.add("lift");
  if (!calm) { await wait(350); sunburst(); await wait(250); }
  mid.classList.add("turned", "revealed");
  revealTitle(pick.card.name, pick.reversed ? "Card of the day · Reversed" : "Card of the day",
    mid.getBoundingClientRect().top - 4, document.querySelector(".home-head h1").getBoundingClientRect().bottom);
  showCotdLabel(pick);
  showCotdWords(pick, true);
  label.classList.remove("fade");
  await wait(700);
  fdBusy = false;
}

$("floatDeck").addEventListener("click", revealCardOfTheDay);
$("cotd").addEventListener("click", revealCardOfTheDay);

addEventListener("resize", () => { sizeSky(); if (calm) drawSky(0); placeCotdWords(); });
document.addEventListener("visibilitychange", startSky);
sizeSky();
buildFloatDeck();
document.fonts?.ready.then(placeCotdWords);   // the words' widths change once the font loads
startSky();

$("backBtn").addEventListener("click", showHome);
$("newBtn").addEventListener("click", showHome);
$("summaryBtn").addEventListener("click", () => {
  const entries = tableEntries(), title = S.spread.name;
  summonSummary((magic) => openSummary(entries, title, magic));
});

// ── 2. The table ────────────────────────────────────────

function startReading(spread) {
  const n = spread.positions.length;
  const deck = activeDeck();
  if (deck.length < n) {
    alert(`This spread needs ${n} cards, but the deck only has ${deck.length}.`);
    return;
  }
  S = { spread, n, deck, slots: [], picked: 0, revealed: 0, phase: "shuffle" };
  resetMagic();

  $("home").hidden = true;
  $("table").hidden = false;
  $("endActions").hidden = true;

  const slots = $("slots");
  slots.innerHTML = "";
  slots.dataset.count = Math.min(n, 5);
  layoutSlots();
  spread.positions.forEach((pos, i) => {
    const s = el("div", "slot");
    const box = el("div", "slot-card");
    // The card's name and its key word appear here once it's turned over.
    const nameEl = el("div", "slot-name", " ");
    const kwEl = el("div", "slot-kw", " ");
    s.append(box, nameEl, kwEl);
    slots.append(s);
    S.slots.push({ box, nameEl, kwEl, card: null, reversed: false, tcard: null, flipped: false, i });
  });

  const pile = $("deck");
  pile.innerHTML = "";
  pile.hidden = false;
  for (let i = 0; i < DECK_LOOK; i++) {
    const c = el("div", "cback");
    c.style.transform = pileOffset(i);
    pile.append(c);
  }
  $("fan").innerHTML = "";
  $("hint").textContent = "Tap the deck to spread the cards";
  $("hint").classList.remove("dim");
}

// How many cards go in each row. Every spread, of any size, fits on one
// screen with the deck: the cards shrink to the room left over rather
// than the page ever needing a scroll (see .slots in style.css).
function slotGrid(n, wide = innerWidth >= 700) {
  const cols = wide
    ? (n <= 6 ? n : Math.ceil(n / Math.ceil(n / 6)))
    : (n <= 3 ? n : n === 4 ? 2 : Math.min(5, Math.ceil(n / 2)));
  return { cols, rows: Math.ceil(n / cols) };
}
function layoutSlots() {
  if (!S) return;
  const { cols, rows } = slotGrid(S.n);
  $("slots").style.setProperty("--cols", cols);
  $("slots").style.setProperty("--rows", rows);
}
addEventListener("resize", layoutSlots);

function pileOffset(i) {
  return `translate(${i * 0.5}px, ${-i * 0.6}px)`;
}

// ── Spread the cards ────────────────────────────────────
// Tapping the deck shuffles it (instantly, out of sight) and fans the
// cards out to pick from.

$("deck").addEventListener("click", async () => {
  if (!S || S.phase !== "shuffle") return;
  S.phase = "busy";
  S.order = shuffledOrder(S.deck.length);
  setHint(S.n === 1 ? "Pick a card" : `Pick ${S.n} cards`);
  await fanOut();
  S.phase = "pick";
});

// Spread the cards out in an arc, face down.
async function fanOut() {
  const count = Math.min(FAN_MAX, S.deck.length);
  const width = Math.min(48, count * 4);
  const fan = $("fan");
  fan.innerHTML = "";
  $("deck").hidden = true;

  for (let i = 0; i < count; i++) {
    const a = (count === 1 ? 0 : -width / 2 + (width * i) / (count - 1)) + wobble(0.6);
    const c = el("div", "cback fan-card");
    c.style.setProperty("--a", `${a}deg`);
    c.dataset.card = S.order[i];
    c.dataset.angle = a;
    c.animate(
      [{ transform: "rotate(0deg)" }, { transform: `rotate(${a}deg)` }],
      { duration: 380, delay: i * 8, easing: "cubic-bezier(.2,.7,.2,1)", fill: "backwards" }
    );
    c.addEventListener("click", () => pick(c));
    fan.append(c);
  }
  await wait(380 + count * 8);
}

// ── Pick ────────────────────────────────────────────────

async function pick(fanCard) {
  if (!S || S.phase !== "pick" || fanCard.dataset.taken) return;
  fanCard.dataset.taken = "1";
  const reading = S;

  const slot = S.slots[S.picked++];
  slot.card = S.deck[+fanCard.dataset.card];
  slot.reversed = SET.reversals && rand(2) === 1;
  preload(slot.card);   // start loading the picture now, so it's ready to turn
  const allPicked = S.picked === S.n;
  if (allPicked) {
    S.phase = "busy";
    addReading(S.spread.name, S.slots.map((s) =>
      ({ name: s.card.name, rev: s.reversed, label: S.spread.positions[s.i].label })));
  }
  else {
    const left = S.n - S.picked;
    setHint(left === 1 ? "Pick 1 more" : `Pick ${left} more`);
  }

  // The card that will sit in the spread, face down.
  const t = el("div", "tcard");
  t.style.setProperty("--flip", `${vary(0.75).toFixed(2)}s`);
  const inner = el("div", "tcard-inner");
  const back = el("div", "face cback");
  const face = cardFace(slot.card, false, slot.reversed);
  face.classList.add("face");
  inner.append(back, face);
  t.append(inner);
  t.style.visibility = "hidden";
  t.addEventListener("click", () => turn(slot));
  slot.box.append(t);
  slot.tcard = t;

  // Fly a copy from the fan to its place in the spread.
  const r = fanCard.getBoundingClientRect();
  const w = fanCard.offsetWidth, h = fanCard.offsetHeight;
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const a = +fanCard.dataset.angle;
  const target = slot.box.getBoundingClientRect();
  const dx = target.left + target.width / 2 - cx;
  const dy = target.top + target.height / 2 - cy;
  const scale = target.width / w;

  const flyer = el("div", "cback flyer");
  Object.assign(flyer.style, {
    left: `${cx - w / 2}px`, top: `${cy - h / 2}px`,
    width: `${w}px`, height: `${h}px`,
  });
  document.body.append(flyer);
  fanCard.style.visibility = "hidden";

  const fx = calm ? "classic" : nextPickFx();
  if (fx === "classic") {
    if (!calm) magicFlight(flyer, fanCard);
    // Each card lifts a little differently on its way: higher or lower, a touch of tilt.
    const lift = vary(26, 0.3), tilt = a + wobble(4), peak = vary(0.2, 0.25);
    await flyer.animate(
      [
        { transform: `rotate(${a}deg)` },
        { transform: `translate(${wobble(6)}px, -${lift}px) rotate(${tilt}deg) scale(${vary(1.08, 0.03)})`, offset: peak },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
      ],
      { duration: 700, easing: "cubic-bezier(.4,0,.2,1)" }
    ).finished;
  } else {
    // One of the quick flashes (pickfx.js).
    await PickFX.play(fx, {
      flyer, card: t,
      from: { x: cx, y: cy, w, h, a },
      to: { x: cx + dx, y: cy + dy, w: target.width, h: target.height },
    });
  }
  t.style.visibility = "";
  flyer.remove();
  slot.placed = true;   // it can be turned over now, even before the rest are picked
  if (S !== reading) return;
  if (fx === "classic" && !calm) magicLand(slot.i);
  magicStep();   // each card laid down adds the next element of the circle, faintly

  if (allPicked) {
    await wait(150);
    await gatherFan();
    if (S !== reading) return;
    S.phase = "turn";
    refreshKeywords();   // now that every card is known
    if (S.revealed === S.n) setHint("");
    else setHint(S.n === 1 ? "Tap the card to turn it over" : "Tap a card to turn it over");
  }
}

// Sweep the rest of the cards away once the spread is full.
async function gatherFan() {
  const cards = [...$("fan").children].filter((c) => !c.dataset.taken);
  await Promise.all(cards.map((c, i) => c.animate(
    [
      { transform: `rotate(${c.dataset.angle}deg)`, opacity: 1 },
      { transform: `rotate(${wobble(3)}deg) translateY(${vary(60, 0.25)}px)`, opacity: 0 },
    ],
    { duration: 500, delay: i * 10, easing: "ease-in", fill: "forwards" }
  ).finished));
  $("fan").innerHTML = "";
}

// ── Turn ────────────────────────────────────────────────

// Snaps a card that is still turning straight to its finished state.
function finishTurn(slot) {
  const inner = slot.tcard.querySelector(".tcard-inner");
  inner.style.transition = "none";
  void inner.offsetWidth;   // apply the end state now
  inner.style.transition = "";
  slot.turning = false;
}

// The keywords under each turned card. The one most linked to the rest of
// the spread comes first, in bold with a glow; it's worked out again as
// more cards join the spread.
function refreshKeywords() {
  S.slots.forEach((s) => {
    if (!s.flipped || !s.kwEl) return;
    const all = filled(keywordsFor(s.card, s.reversed));
    const key = spreadKeyword(s);
    s.kwEl.textContent = "";
    if (!all.length) { s.kwEl.textContent = " "; return; }
    // The key word on its own line; the others (on wide screens only)
    // in a block of fixed height, so every card's words line up.
    s.kwEl.append(el("b", "kw-key", key || all[0]));
    const rest = all.filter((w) => w.toLowerCase() !== (key || all[0]).toLowerCase());
    s.kwEl.append(el("span", "kw-rest", rest.join(" · ") || " "));
  });
}

async function turn(slot) {
  // Any card already laid in the spread can be turned, even while others are still being picked.
  if (!S || !slot.placed) return;
  if (slot.turning) return;   // already on its way over
  if (!slot.flipped) {
    // Tapping a new card cuts short the one still turning and its title.
    S.slots.forEach((s) => { if (s.turning && s !== slot) finishTurn(s); });
    clearTimeout(S.titleTimer);
    document.querySelector(".rpg-title")?.remove();

    slot.turning = true;
    slot.flipped = true;
    S.lastTurn = slot;
    const reading = S;
    await preload(slot.card);
    if (S !== reading) return;   // left the table meanwhile
    slot.tcard.classList.add("flipped");
    // Another card was tapped while this one's picture loaded: skip straight to the end.
    const cut = S.lastTurn !== slot;
    if (cut) finishTurn(slot);
    magicReveal(slot.i);
    slot.nameEl.replaceChildren(el("span", "slot-name-text", slot.card.name));
    refreshKeywords();
    slot.nameEl.classList.add("shown");
    slot.kwEl.classList.add("shown");
    const pos = S.spread.positions[slot.i].label;
    const sub = [S.n > 1 || pos !== "Your card" ? pos : "", slot.reversed ? "Reversed" : ""]
      .filter(Boolean).join(" · ");
    // Just above the top row of cards.
    const cardsTop = Math.min(...S.slots.map((s) => s.box.getBoundingClientRect().top));
    const header = document.querySelector("#table .bar").getBoundingClientRect().bottom;
    if (!cut) {
      clearTimeout(S.titleTimer);
      S.titleTimer = setTimeout(() => {
        if (S === reading && S.lastTurn === slot) revealTitle(slot.card.name, sub, cardsTop - 8, header);
      }, 250);
    }
    S.revealed++;
    const last = S.revealed === S.n;
    await wait(800);
    if (S !== reading) return;
    slot.turning = false;
    if (last) {
      setHint("");
      $("summaryBtn").hidden = false;
      $("endActions").hidden = false;
      $("endActions").animate([{ opacity: 0 }, { opacity: 1 }], 400);
    }
    return;   // turning a card only shows it; tap it again to read it
  }
  openReadingCard(slot.i);
}

// ── The table's magic ───────────────────────────────────
// Drawn on a canvas behind the cards, faint enough never to compete
// with them. A revealed card gets a burst of light and a slowly turning
// ring of runes; energy then travels along a line to the next card.
// Once every card is turned, threads from all of them meet in the
// middle and a great rune circle forms around the spread, turning for
// as long as the reading stays open.

// Runes as little line drawings (in a 12 × 16 box), so every phone shows them:
// flowing, calligraphic marks, many with a dot of light beside them.
const dot = (x, y, r = 0.55) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const RUNE_D = [
  "M9 2C2 3 2 13 9 14" + dot(7, 8),                                   // crescent and star
  "M6 8C1 6 2 0 6 1C10 2 9 6 6 8C2 10 2 16 6 15C10 14 10 10 6 8",      // the knot
  "M9 5C9 1 3 1 3 5C3 8 9 8 9 5C9 10 7 14 3 16",                      // the hook
  "M2 14L10 2" + dot(9, 10),                                          // the shard
  "M9 2C4 2 4 7 7 7C3 7 3 13 9 13M2 1L11 15",                         // the struck echo
  "M6 1L11 8L6 15L1 8ZM6 5L8 8L6 11L4 8Z",                            // the seal
  "M9 1C5 1 5 6 6 9C7 12 5 15 2 14" + dot(9, 12),                     // the long s
  "M1 4L5 14L11 1M3 9H9",                                             // the barred check
  "M2 3C2 10 10 10 10 3M6 1V15M3 15H9",                               // the trident
  "M4 1C10 4 10 12 3 15" + dot(3, 7),                                 // the turned j
  "M6 1C1 5 1 11 3 15M6 1C11 5 11 11 9 15M6 4V8" + dot(6, 11, 1.5),   // the arch and orb
  "M3 1V9C3 15 10 15 10 9V5" + dot(6, 5),                             // the cup
  "M2 3L7 8L2 13M6 3L11 8L6 13",                                      // the twin chevron
  "M1 2C4 6 5 10 6 15C7 9 9 4 12 3" + dot(10, 9),                     // the reed
  "M6 15V7C6 2 1 1 1 5M6 7C6 2 11 1 11 5",                            // the horns
  "M10 3C5 0 2 5 6 8C10 11 7 16 2 13" + dot(10, 14),                  // the serpent
  "M3 15V5C3 1 9 1 9 5C9 8 5 8 5 5",                                  // the curl
  "M2 9V5C2 1 10 1 10 5V9M6 1V15M4 12H8",                             // the gate
];
const RUNES = RUNE_D.map((d) => new Path2D(d));
const SEAL = 5;

const GOLD = "201, 169, 110";
const MG = { cv: null, ctx: null, running: false, cards: [], travels: [], links: [], finale: 0, w: 0, h: 0,
  flyers: [], ghosts: [], flares: [], motes: [], steps: [] };

function sizeMagic() {
  const c = $("magic");
  const r = Math.min(devicePixelRatio || 1, 2);
  MG.w = innerWidth; MG.h = innerHeight;
  c.width = MG.w * r;
  c.height = MG.h * r;
  MG.cv = c;
  MG.ctx = c.getContext("2d");
  MG.ctx.setTransform(r, 0, 0, r, 0, 0);
  // The frames layer, above the cards.
  MG.r = r;
  const f = $("frames");
  f.width = c.width;
  f.height = c.height;
  MG.frx = f.getContext("2d");
  MG.frx.setTransform(r, 0, 0, r, 0, 0);
}

function resetMagic() {
  MG.cards = []; MG.travels = []; MG.links = []; MG.finale = 0; MG.great = null; MG.portal = false;
  MG.flyers = []; MG.ghosts = []; MG.flares = []; MG.motes = []; MG.steps = []; MG.total = 0; MG.waitAt = null; MG.burst = false;
  if (MG.ctx) MG.ctx.clearRect(0, 0, MG.w, MG.h);
  if (MG.frx) MG.frx.clearRect(0, 0, MG.w, MG.h);
}

// Picking a card: a small flare where it leaves the fan, a trail of
// sparks with circling runes while it flies, and a flare where it lands.
// Everything eases in and out, so nothing pops on or off.

function rectGeom(r) {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, rx: r.width / 2, ry: r.height / 2 };
}

function magicFlight(flyer, fanCard) {
  if (!MG.ctx) sizeMagic();
  const now = performance.now();
  const from = rectGeom(fanCard.getBoundingClientRect());
  // A small sigil flares where the card leaves the fan, and sparks burst from it.
  MG.flares.push({ geom: () => from, at: now, dur: 700, runes: [], small: true });
  burstMotes(from.x, from.y, 14, Math.max(from.rx, from.ry) * 0.6);
  MG.flyers.push({ el: flyer, trail: [], at: now, runes: Array.from({ length: 6 }, () => rand(RUNES.length)) });
  startMagic();
}

function magicLand(i) {
  const now = performance.now();
  MG.flares.push({ geom: () => cardGeom(i), at: now, dur: 1300, runes: Array.from({ length: 8 }, () => rand(RUNES.length)) });
  const g = cardGeom(i);
  burstMotes(g.x, g.y, 26, Math.hypot(g.rx, g.ry) * 0.7);
  startMagic();
}

// Rises quickly, then fades slowly (p from 0 to 1).
const swell = (p, rise = 0.18) => (p < rise ? p / rise : Math.max(0, 1 - (p - rise) / (1 - rise)));

// The colours of the pick magic: mostly gold, with warm amber and a little arcane violet.
const MOTE_COLOURS = ["255, 226, 160", "255, 236, 200", "255, 190, 110", "200, 160, 255"];

// Sparks thrown out from a point, drifting and fading.
function burstMotes(x, y, n, r0) {
  const now = performance.now();
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + Math.random() * 0.4;
    const v = 0.05 + Math.random() * 0.09;
    MG.motes.push({ x: x + Math.cos(a) * r0, y: y + Math.sin(a) * r0, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.02,
      at: now, life: 600 + Math.random() * 600, r: 1 + Math.random() * 1.8, col: MOTE_COLOURS[k % MOTE_COLOURS.length] });
  }
}

// A perfect circle drawn in from the top, as far as `drawn` (0 to 1).
function sigilRing(ctx, x, y, R, drawn, alpha, width = 1.2) {
  ctx.strokeStyle = `rgba(255, 224, 165, ${alpha})`;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(x, y, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * drawn);
  ctx.stroke();
}

// The sparks streaming behind a flying card: a bright core with a warm halo.
function drawSparks(ctx, t, trail, alpha) {
  for (let k = 0; k < trail.length - 1; k++) {
    const q1 = trail[k], q2 = trail[k + 1];
    const steps = Math.max(1, Math.min(7, Math.round(Math.hypot(q2.x - q1.x, q2.y - q1.y) / 5)));
    for (let s = 0; s < steps; s++) {
      const u = s / steps, kk = k + u, fall = 1 - kk / trail.length;
      const a = alpha * fall;
      if (a <= 0.01) continue;
      const x = q1.x + (q2.x - q1.x) * u + Math.sin(t / 90 + kk * 2) * 5 * (1 - fall);
      const y = q1.y + (q2.y - q1.y) * u + Math.cos(t / 110 + kk * 2) * 5 * (1 - fall);
      const R = 7 * fall + 2;
      const halo = ctx.createRadialGradient(x, y, 0, x, y, R);
      halo.addColorStop(0, `rgba(255, 240, 205, ${0.75 * a})`);
      halo.addColorStop(0.4, `rgba(255, 190, 110, ${0.35 * a})`);
      halo.addColorStop(1, "rgba(200, 150, 255, 0)");
      ctx.fillStyle = halo;
      ctx.fillRect(x - R, y - R, R * 2, R * 2);
    }
  }
}

// The magic around a card in flight, drawn above the cards (the card itself
// still flies on top). Its trail and rune circle linger and fade once it lands.
function drawFlightsTop(ctx, t) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  MG.flyers = MG.flyers.filter((f) => {
    if (!f.el.isConnected) {
      MG.ghosts.push({ trail: f.trail, runes: f.runes, at: t, p: f.trail[0], R: f.R || 30 });
      return false;
    }
    const r = f.el.getBoundingClientRect();
    const p = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    f.trail.unshift(p);
    if (f.trail.length > 18) f.trail.pop();
    const a = Math.min(1, (t - f.at) / 180);
    drawSparks(ctx, t, f.trail, a);
    if (rand(3) === 0) burstMotes(p.x, p.y, 1, Math.max(r.width, r.height) * 0.3);   // sparks shed as it flies
    f.R = Math.max(r.width, r.height) * 0.72;
    const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, f.R * 1.25);
    glow.addColorStop(0, `rgba(255, 220, 150, ${0.4 * a})`);
    glow.addColorStop(0.6, `rgba(190, 140, 255, ${0.12 * a})`);
    glow.addColorStop(1, "rgba(190, 140, 255, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(p.x - f.R * 1.25, p.y - f.R * 1.25, f.R * 2.5, f.R * 2.5);
    // A turning circle of runes around the card.
    sigilRing(ctx, p.x, p.y, f.R, a, 0.75 * a);
    ctx.save();
    ctx.setLineDash([2, 5]);
    ctx.lineDashOffset = t / 25;
    sigilRing(ctx, p.x, p.y, f.R * 0.86, a, 0.45 * a, 1);
    ctx.restore();
    f.runes.forEach((rn, k) => {
      const ang = t / 420 + (k / f.runes.length) * Math.PI * 2;
      rune(ctx, RUNES[rn], p.x + Math.cos(ang) * f.R * 1.13, p.y + Math.sin(ang) * f.R * 1.13, 9, ang + Math.PI / 2, 0.9 * a);
    });
    return true;
  });

  MG.ghosts = MG.ghosts.filter((g) => {
    const p = (t - g.at) / 500;
    if (p >= 1 || !g.p) return false;
    // The trail drains into the landing spot while the circle opens out and fades.
    const n = Math.max(1, Math.round(g.trail.length * (1 - p)));
    drawSparks(ctx, t, g.trail.slice(0, n), 1 - p);
    sigilRing(ctx, g.p.x, g.p.y, g.R * (1 + p * 0.35), 1, 0.75 * (1 - p));
    g.runes.forEach((rn, k) => {
      const ang = t / 420 + (k / g.runes.length) * Math.PI * 2;
      const d = g.R * (1.13 + 0.4 * p);
      rune(ctx, RUNES[rn], g.p.x + Math.cos(ang) * d, g.p.y + Math.sin(ang) * d, 9, ang + Math.PI / 2, 0.9 * (1 - p));
    });
    return true;
  });

  MG.motes = MG.motes.filter((m) => {
    const age = t - m.at;
    if (age >= m.life) return false;
    if (age < 0) return true;
    const p = age / m.life;
    const x = m.x + m.vx * age, y = m.y + m.vy * age - p * p * 8;
    const a = (1 - p) * (p < 0.1 ? p / 0.1 : 1);
    const R = m.r * 3;
    const g = ctx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, `rgba(${m.col}, ${0.95 * a})`);
    g.addColorStop(1, `rgba(${m.col}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - R, y - R, R * 2, R * 2);
    return true;
  });
  ctx.restore();
}

// The sigils where a card leaves the fan and where it lands, drawn behind
// the cards: perfect circles that draw themselves in from the top, with an
// inner ring, a six-pointed star and a ring of runes, turning as they fade.
function drawFlights(ctx, t) {
  MG.flares = MG.flares.filter((f) => {
    const p = (t - f.at) / f.dur;
    if (p >= 1 || p < 0) return p < 0;
    const g = f.geom();
    const a = swell(p, 0.15);
    const drawn = Math.min(1, p / 0.28);
    const R = (f.small ? Math.max(g.rx, g.ry) * 1.05 : Math.hypot(g.rx, g.ry) * 1.04) * (0.94 + p * 0.1);
    const spin = p * 0.9;
    ctx.save();
    // A flash of light at the centre.
    const flash = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, R * 1.1);
    flash.addColorStop(0, `rgba(255, 232, 180, ${0.5 * a})`);
    flash.addColorStop(0.55, `rgba(200, 150, 255, ${0.14 * a})`);
    flash.addColorStop(1, "rgba(200, 150, 255, 0)");
    ctx.fillStyle = flash;
    ctx.fillRect(g.x - R * 1.1, g.y - R * 1.1, R * 2.2, R * 2.2);
    ctx.shadowColor = `rgba(255, 210, 130, ${a})`;
    ctx.shadowBlur = 10;
    sigilRing(ctx, g.x, g.y, R, drawn, 0.85 * a, 1.4);
    sigilRing(ctx, g.x, g.y, R * 0.9, drawn, 0.5 * a, 0.9);
    if (!f.small) {
      // A six-pointed star inscribed in the inner ring.
      ctx.strokeStyle = `rgba(255, 224, 165, ${0.4 * a * drawn})`;
      ctx.lineWidth = 0.9;
      for (let tri = 0; tri < 2; tri++) {
        ctx.beginPath();
        for (let k = 0; k <= 3; k++) {
          const ang = spin + tri * Math.PI / 3 + (k / 3) * Math.PI * 2 - Math.PI / 2;
          const X = g.x + Math.cos(ang) * R * 0.9, Y = g.y + Math.sin(ang) * R * 0.9;
          k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
    f.runes.forEach((rn, k) => {
      const ang = (k / f.runes.length) * Math.PI * 2 - Math.PI / 2 + spin;
      if ((k + 0.5) / f.runes.length > drawn) return;   // runes appear as the ring reaches them
      rune(ctx, RUNES[rn], g.x + Math.cos(ang) * R * 1.1, g.y + Math.sin(ang) * R * 1.1, 10, ang + Math.PI / 2, 0.9 * a);
    });
    return true;
  });
}

// ── The elements around a turned card ───────────────────
// Fire smoulders with rising embers, Water ripples in waves along the
// edge, Air sends gusts sweeping past, and Earth rolls glinting stones
// around the border. Major cards follow their sign or planet.

const PLANET_ELEMENT = { Sun: "Fire", Mars: "Fire", Jupiter: "Fire", Pluto: "Fire", Moon: "Water", Neptune: "Water",
  Mercury: "Air", Uranus: "Air", Venus: "Earth", Saturn: "Earth" };

function elementFor(card) {
  return elementOf(card) || PLANET_ELEMENT[((card.correspondences || {}).astrology || "").split(" ")[0]] || null;
}

// ── The elemental frames ────────────────────────────────
// Shelved for now: set to true to bring the frames back.
const FRAMES_ON = false;
// Each turned card gets a painted frame on its own edge, in its element's
// colour: fire burning, water rolling in crests, earth's stones, dirt and
// gems travelling round, and air flowing in ribbons. They're drawn on a
// layer above the cards, fade in once as the card finishes turning, then
// keep moving slowly. Nothing reaches below the card, so its name stays clear.

const FRAME_FADE = 1100;   // how long the fade-in takes, in ms
const FRAME_DELAY = 350;   // starts as the card finishes turning over

// How deep the frame reaches into the card on each side, as a share of the
// card's width. Each card's white margin is measured from its own picture
// (up to the first dark line: the picture's outline, or the box around its
// title), so the frame covers the margin but never the picture or its text.
// Until a card is measured, a safe narrow margin is used.
const FRAME_INSET = { t: 0.03, r: 0.048, b: 0.07, l: 0.034 };
const frameInsets = new Map();   // card name → measured inset

function measureInset(card) {
  if (!card.image || frameInsets.has(card.name)) return;
  frameInsets.set(card.name, null);   // measuring
  const img = new Image();
  const measure = () => {
    const W = img.naturalWidth, H = img.naturalHeight;
    if (!W || !H) { frameInsets.set(card.name, FRAME_INSET); return; }
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(img, 0, 0);
    const data = x.getImageData(0, 0, W, H).data;
    const dark = (px, py) => { const k = (py * W + px) * 4; return data[k] + data[k + 1] + data[k + 2] < 300; };
    // From one edge inward, how far until the first dark pixel.
    const run = (len, at) => { for (let k = 0; k < len; k++) if (at(k)) return k; return len; };
    const lines = [0.25, 0.4, 0.55, 0.7];
    // The nearest dark line on each side wins, so nothing inside is ever covered.
    const side = (fn) => Math.min(...lines.map(fn));
    const l = side((f) => run(W / 4, (k) => dark(k, Math.round(H * f))));
    const r = side((f) => run(W / 4, (k) => dark(W - 1 - k, Math.round(H * f))));
    const t = side((f) => run(H / 5, (k) => dark(Math.round(W * f), k)));
    const b = side((f) => run(H / 5, (k) => dark(Math.round(W * f), H - 1 - k)));
    // A little short of the line, as a share of the width.
    const share = (px) => Math.max(0.02, (px - 1) / W);
    frameInsets.set(card.name, { t: share(t), r: share(r), b: share(b), l: share(l) });
  };
  img.onload = () => { try { measure(); } catch { frameInsets.set(card.name, FRAME_INSET); } };
  img.onerror = () => frameInsets.set(card.name, FRAME_INSET);
  img.src = card.image;
}

// A card's inset, turned round for a reversed card.
function insetFor(card, reversed) {
  const m = frameInsets.get(card.name) || FRAME_INSET;
  return reversed ? { t: m.b, r: m.l, b: m.t, l: m.r } : m;
}

// A point on the frame, s from 0 to 1 going clockwise from the top-left
// corner. off is a depth in pixels: positive is outside the card's edge,
// negative is inside, where -ins.i means the frame's inner edge (on each
// side that lands at that side's own inset). Also gives the outward
// direction, the direction along the edge, and the distance to the
// nearest corner.
function framePoint(g, s, off, ins) {
  const dep = (k) => (off >= 0 || !ins ? off : off * (ins[k] / ins.i));
  const L = g.x - dep("l"), R = g.x + g.w + dep("r"), T = g.y - dep("t"), Bt = g.y + g.h + dep("b");
  const w = R - L, h = Bt - T, per = 2 * (w + h);
  let q = (((s % 1) + 1) % 1) * per;
  if (q < w) return [L + q, T, 0, -1, 1, 0, Math.min(q, w - q)];
  q -= w;
  if (q < h) return [R, T + q, 1, 0, 0, 1, Math.min(q, h - q)];
  q -= h;
  if (q < w) return [R - q, Bt, 0, 1, -1, 0, Math.min(q, w - q)];
  q -= w;
  return [L, Bt - q, -1, 0, 0, -1, Math.min(q, h - q)];
}

// The four corners of the frame at a given depth (see framePoint).
function frameCorners(g, off, ins) {
  const dep = (k) => (off >= 0 ? off : off * (ins[k] / ins.i));
  const L = g.x - dep("l"), R = g.x + g.w + dep("r"), T = g.y - dep("t"), B = g.y + g.h + dep("b");
  return [[L, T], [R, T], [R, B], [L, B]];
}

// The frame's inner edge, as a box.
function frameInner(g, ins) {
  return { x: g.x + ins.l, y: g.y + ins.t, w: g.w - ins.l - ins.r, h: g.h - ins.t - ins.b };
}

function frameHash(k) {
  const v = Math.sin(k * 127.1 + 3.7) * 43758.5453;
  return v - Math.floor(v);
}

const FRAME_BASE = {
  Fire: ["#4a0a02", "#a82a08"], Water: ["#123a6e", "#2a6bb8"],
  Earth: ["#070608", "#151214"], Air: ["#36578a", "#6e8fbf"],   // earth is near black, so its gems stand out
};
const FRAME_GEMS = ["#5fd08a", "#f0c45a", "#b58cf0", "#5ab8e0", "#e86a7a"];

// Rough stone outlines, made once.
const FRAME_STONES = Array.from({ length: 40 }, (_, k) => {
  const n = 6 + Math.floor(frameHash(k) * 3);
  return Array.from({ length: n }, (_, j) => {
    const a = (j / n) * Math.PI * 2, r = 0.75 + 0.35 * frameHash(k * 7 + j);
    return [Math.cos(a) * r, Math.sin(a) * r];
  });
});

function frameBand(x, g, o, ins, r) {
  const n = frameInner(g, ins);
  x.beginPath();
  x.roundRect(g.x - o, g.y - o, g.w + 2 * o, g.h + 2 * o, r + o);
  x.roundRect(n.x, n.y, n.w, n.h, 2);
}

// The slow flicker of the flame tips.
// Low spatial frequencies give broad, rolling tongues rather than spikes.
function flameNoise(x, y, t) {
  return 0.5 * Math.sin(x * 0.11 + y * 0.16 + t / 340)
    + 0.32 * Math.sin(x * 0.19 - y * 0.12 + t / 470 + 1.3)
    + 0.18 * Math.sin(x * 0.07 + y * 0.24 + t / 260 + 4.1);
}

// The frames are an accent on the card's edge, not a second picture:
// everything (band, flames, waves, stones) is drawn at half its full size,
// it reaches only halfway into the white margin, and it's a little see-through.
const FRAME_SCALE = 0.5;
const FRAME_OPACITY = 0.8;

// g = the card's box { x, y, w, h }; age = ms since the frame began.
function drawFrame(x, g, el, t, age, inset = FRAME_INSET) {
  const B = Math.max(3.5, g.w * 0.085 * FRAME_SCALE), o = B * 0.3, r = 6;
  // i is the frame's depth inside the card on the sides; each side's own
  // depth comes from FRAME_INSET, and every effect is spread to fill it.
  const k0 = g.w * FRAME_SCALE;
  const ins = { t: k0 * inset.t, r: k0 * inset.r, b: k0 * inset.b, l: k0 * inset.l };
  const i = ins.i = ins.l, d = (o - i) / 2, inner = frameInner(g, ins);
  const pp = 2 * (g.w + g.h);
  const a = Math.min(1, age / FRAME_FADE), fade = a * a * (3 - 2 * a);
  if (fade <= 0) return;
  const P = (s, off) => framePoint(g, s, off, ins);
  const steps = Math.max(120, Math.round(pp / 2.2));

  x.save();
  // Nothing below the card's bottom edge, so the name underneath stays clear.
  x.beginPath();
  x.rect(g.x - B * 6, g.y - B * 8, g.w + B * 12, g.h + B * 8 + o + 1);
  x.clip();
  x.globalAlpha = fade * FRAME_OPACITY;
  const base = FRAME_BASE[el];
  const grad = x.createLinearGradient(g.x, g.y, g.x + g.w, g.y + g.h);
  grad.addColorStop(0, base[1]); grad.addColorStop(0.5, base[0]); grad.addColorStop(1, base[1]);
  frameBand(x, g, o, ins, r);
  x.fillStyle = grad;
  x.fill("evenodd");

  if (el === "Fire") {
    // A line of heat glowing along the inner edge…
    x.save();
    x.shadowColor = "rgba(255, 120, 30, .9)";
    x.shadowBlur = 7;
    x.strokeStyle = "rgba(255, 170, 60, .7)";
    x.lineWidth = B * 0.25;
    x.beginPath();
    x.roundRect(inner.x - B * 0.1, inner.y - B * 0.1, inner.w + B * 0.2, inner.h + B * 0.2, 2);
    x.stroke();
    x.restore();
    // …then the flames in four layers, red outside to a white-hot core.
    [[1.0, "rgba(235, 70, 15, .96)", 1], [0.74, "rgba(255, 145, 30, .97)", 0.9],
     [0.5, "rgba(255, 215, 90, .98)", 0.8], [0.27, "rgba(255, 248, 215, .97)", 0.7]].forEach(([sz, col, amp], li) => {
      x.beginPath();
      for (let k = 0; k <= steps; k++) {
        const [px, py] = P(k / steps, -i + B * 0.15);
        k ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      for (let k = steps; k >= 0; k--) {
        const [px, py, nx, ny] = P(k / steps, -i + B * 0.15);
        const up = 0.4 + 0.6 * Math.max(0, -ny) + 0.2 * Math.abs(nx);   // tallest along the top
        // Rounded crests (a gentle power), and kept low so the fire hugs the frame.
        const peak = Math.pow(Math.max(0, flameNoise(px, py, t + li * 120) * 0.5 + 0.5), 1.25);
        const hh = B * (sz * 0.6 + sz * 0.55 * amp * peak * up);
        let dx = nx, dy = ny - 0.35 * up;
        const m = Math.hypot(dx, dy) || 1;
        x.lineTo(px + (dx / m) * hh, py + (dy / m) * hh);
      }
      x.closePath();
      x.fillStyle = col;
      if (!li) {
        x.save();
        x.shadowColor = "rgba(255, 90, 20, .95)";
        x.shadowBlur = 8;
        x.fill();
        x.restore();
      } else x.fill();
    });
    for (let k = 0; k < 12; k++) {
      const ph = (t / 3800 + k / 12) % 1;
      const [ex, ey] = P(frameHash(k + 9) * 0.5 + 0.75 * (k % 2), o);
      x.fillStyle = `rgba(255, ${230 - ph * 100}, ${150 - ph * 100}, ${0.95 * (1 - ph)})`;
      x.beginPath();
      x.arc(ex + Math.sin(t / 600 + k) * 2, ey - ph * B * 3.8, 1.1, 0, Math.PI * 2);
      x.fill();
    }
  }

  if (el === "Water") {
    for (let j = 0; j < 2; j++) {
      x.strokeStyle = j ? "rgba(150, 210, 255, .5)" : "rgba(220, 240, 255, .45)";
      x.lineWidth = B * (j ? 0.16 : 0.1);
      x.beginPath();
      for (let k = 0; k <= steps; k++) {
        const s = k / steps;
        const off = d + B * 0.25 * Math.sin((s * pp) / (B * 2.2) - t / 900 + j * 2);
        const [px, py, nx, ny] = P(s, 0);
        k ? x.lineTo(px + nx * off, py + ny * off) : x.moveTo(px + nx * off, py + ny * off);
      }
      x.stroke();
    }
    // Crests rolling round; each shrinks away before a corner and grows back after it.
    const m = Math.round(pp / (B * 3.4)), span = (B * 1.7) / pp;
    for (let k = 0; k < m; k++) {
      const s = (k / m + t / 42000) % 1;
      const [b1x, b1y, nx, ny, tx, ty, c1] = P(s, -i + B * 0.15);
      const q2 = P(s + span, -i + B * 0.15);
      if (q2[2] !== nx || q2[3] !== ny) continue;
      const ca = Math.max(0, Math.min(1, Math.min(c1, q2[6]) / (B * 1.4)));
      if (ca <= 0) continue;
      const hc = B * 0.95 * (0.55 + 0.45 * ca);
      const px = b1x + tx * B * 1.2 + nx * hc, py = b1y + ty * B * 1.2 + ny * hc;
      const ex = b1x + tx * B * 1.7, ey = b1y + ty * B * 1.7;
      x.save();
      x.globalAlpha = fade * FRAME_OPACITY * ca;
      x.fillStyle = "rgba(90, 170, 235, .95)";
      x.beginPath();
      x.moveTo(b1x, b1y);
      x.quadraticCurveTo(b1x + tx * B * 0.6 + nx * hc * 1.1, b1y + ty * B * 0.6 + ny * hc * 1.1, px, py);
      x.quadraticCurveTo(px + tx * B * 0.35 - nx * hc * 0.2, py + ty * B * 0.35 - ny * hc * 0.2, px - nx * hc * 0.3 + tx * B * 0.1, py - ny * hc * 0.3 + ty * B * 0.1);
      x.quadraticCurveTo(ex - nx * B * 0.1, ey - ny * B * 0.1, ex, ey);
      x.closePath();
      x.fill();
      x.strokeStyle = "rgba(235, 248, 255, .95)";
      x.lineWidth = Math.max(1, B * 0.12);
      x.beginPath();
      x.moveTo(b1x + tx * B * 0.3 + nx * hc * 0.4, b1y + ty * B * 0.3 + ny * hc * 0.4);
      x.quadraticCurveTo(b1x + tx * B * 0.7 + nx * hc * 1.05, b1y + ty * B * 0.7 + ny * hc * 1.05, px, py);
      x.quadraticCurveTo(px + tx * B * 0.3, py + ty * B * 0.3, px - nx * hc * 0.25 + tx * B * 0.12, py - ny * hc * 0.25 + ty * B * 0.12);
      x.stroke();
      x.restore();
    }
    for (let k = 0; k < 5; k++) {
      const ph = (t / 2400 + k / 5) % 1;
      const [ex, ey, nx, ny] = P(frameHash(k + 4), o);
      x.fillStyle = `rgba(200, 235, 255, ${0.9 * Math.sin(ph * Math.PI)})`;
      x.beginPath();
      x.arc(ex + nx * ph * B * 1.5, ey + ny * ph * B * 1.5 - ph * B, 1.1, 0, Math.PI * 2);
      x.fill();
    }
  }

  if (el === "Earth") {
    const flow = t / 70000;   // the whole band slowly travels round
    x.save();
    frameBand(x, g, o, ins, r);
    x.clip("evenodd");
    for (let k = 0; k < 70; k++) {   // specks of dirt
      const [px, py] = P((frameHash(k + 20) + flow) % 1, d + (frameHash(k + 50) - 0.5) * B * 0.8);
      x.fillStyle = k % 3 ? "rgba(30, 20, 10, .55)" : "rgba(150, 115, 75, .6)";
      x.beginPath();
      x.arc(px, py, 0.6 + frameHash(k) * 0.8, 0, Math.PI * 2);
      x.fill();
    }
    const ns = Math.round(pp / (B * 1.25));   // stones, turning as they roll
    for (let k = 0; k < ns; k++) {
      const s = (k / ns + frameHash(k) * 0.012 + flow) % 1;
      const rr = B * (0.28 + 0.22 * frameHash(k + 3));
      const [px, py] = P(s, d + (frameHash(k + 11) - 0.5) * B * 0.45);
      const tone = 95 + Math.floor(frameHash(k + 5) * 60);
      x.save();
      x.translate(px, py);
      x.rotate(((s * pp) / rr) * (k % 2 ? 1 : -1) * 0.3);
      x.beginPath();
      FRAME_STONES[k % 40].forEach(([u, v], j) => (j ? x.lineTo(u * rr, v * rr) : x.moveTo(u * rr, v * rr)));
      x.closePath();
      x.fillStyle = `rgb(${tone}, ${tone - 6}, ${tone - 16})`;
      x.fill();
      x.strokeStyle = "rgba(20, 14, 8, .7)";
      x.lineWidth = 0.6;
      x.stroke();
      x.fillStyle = "rgba(255, 250, 235, .28)";
      x.beginPath();
      x.ellipse(-rr * 0.25, -rr * 0.3, rr * 0.35, rr * 0.2, -0.5, 0, Math.PI * 2);
      x.fill();
      x.restore();
    }
    const ng = Math.round(pp / (B * 5));   // cut gems among them
    for (let k = 0; k < ng; k++) {
      const [px, py] = P((k / ng + 0.03 + flow) % 1, d);
      const sz = B * 0.36;
      x.save();
      x.translate(px, py);
      x.rotate(Math.sin(t / 1800 + k) * 0.25);
      x.fillStyle = FRAME_GEMS[k % 5];
      x.beginPath();
      x.moveTo(0, -sz); x.lineTo(sz * 0.75, -sz * 0.2); x.lineTo(sz * 0.45, sz); x.lineTo(-sz * 0.45, sz); x.lineTo(-sz * 0.75, -sz * 0.2);
      x.closePath();
      x.fill();
      x.fillStyle = "rgba(255, 255, 255, .55)";
      x.beginPath();
      x.moveTo(0, -sz); x.lineTo(sz * 0.38, -sz * 0.2); x.lineTo(-sz * 0.38, -sz * 0.2);
      x.closePath();
      x.fill();
      x.restore();
    }
    x.restore();
    for (let k = 0; k < ng; k++) {   // now and then a gem catches the light
      const gp = ((t + k * 1300) % 4200) / 4200;
      if (gp >= 0.12) continue;
      const [px, py] = P((k / ng + 0.03 + flow) % 1, d);
      const ga = Math.sin((gp / 0.12) * Math.PI), L = B * 0.9 * ga;
      x.strokeStyle = `rgba(255, 250, 230, ${ga})`;
      x.lineWidth = 1;
      x.beginPath();
      x.moveTo(px - L, py); x.lineTo(px + L, py); x.moveTo(px, py - L); x.lineTo(px, py + L);
      x.stroke();
    }
    for (let k = 0; k < 7; k++) {   // crumbs breaking off the edge
      const ph = (t / 1900 + k / 7) % 1;
      const [ex, ey, nx, ny] = P((frameHash(k + 31) * 0.5 + 0.5 * (k % 2) + flow) % 1, o);
      x.fillStyle = `rgba(140, 105, 70, ${0.85 * (1 - ph)})`;
      x.beginPath();
      x.arc(ex + nx * ph * B * 0.8, ey + ny * ph * B * 0.8 + ph * ph * B * 1.5, 0.9 + frameHash(k) * 0.8, 0, Math.PI * 2);
      x.fill();
    }
  }

  if (el === "Air") {
    x.lineCap = "round";
    x.lineJoin = "round";
    // Ribbons of wind: long dashes gliding round the frame.
    for (let j = 0; j < 3; j++) {
      x.save();
      x.strokeStyle = `rgba(244, 238, 222, ${0.85 - j * 0.12})`;
      x.lineWidth = B * (0.2 - j * 0.035);
      x.setLineDash([B * (3.2 + j), B * (1.6 + j * 0.6)]);
      x.lineDashOffset = (-t * B) / (380 + j * 90);
      x.beginPath();
      for (let k = 0; k <= steps; k++) {
        const s = k / steps;
        const off = d + B * 0.3 * Math.sin((s * pp) / (B * 1.8) + j * 2.1 + t / 1800);
        const [px, py, nx, ny] = P(s, 0);
        k ? x.lineTo(px + nx * off, py + ny * off) : x.moveTo(px + nx * off, py + ny * off);
      }
      x.closePath();
      x.stroke();
      x.restore();
    }
    // A small turning spiral in each corner.
    frameCorners(g, d, ins).forEach(([cx, cy], k) => {
      x.strokeStyle = "rgba(250, 246, 235, .9)";
      x.lineWidth = Math.max(0.8, B * 0.09);
      x.beginPath();
      const rot = (t / 2200) * (k % 2 ? 1 : -1);
      for (let u = 0; u <= 1; u += 0.025) {
        const an = rot + u * Math.PI * 2.6, rr = B * (0.42 - u * 0.34);
        u ? x.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr) : x.moveTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr);
      }
      x.stroke();
    });
  }

  // The gold rails on either side of the band.
  x.setLineDash([]);
  x.strokeStyle = "#c9a96e";
  x.lineWidth = 1.4;
  x.beginPath();
  x.roundRect(g.x - o, g.y - o, g.w + 2 * o, g.h + 2 * o, r + o);
  x.stroke();
  x.strokeStyle = "rgba(201, 169, 110, .85)";
  x.lineWidth = 1;
  x.beginPath();
  x.roundRect(inner.x, inner.y, inner.w, inner.h, 2);
  x.stroke();
  x.restore();
}

// Draws every turned card's frame on the layer above the cards.
function drawFrames(t) {
  const x = MG.frx;
  if (!x) return;
  x.clearRect(0, 0, MG.w, MG.h);
  if (!S || !FRAMES_ON) return;
  MG.cards.forEach((c, i) => {
    if (!c || !c.element || !S.slots[i]) return;
    const r = S.slots[i].box.getBoundingClientRect();
    const slot = S.slots[i];
    drawFrame(x, { x: r.left, y: r.top, w: r.width, h: r.height }, c.element, t, t - c.at - FRAME_DELAY,
      insetFor(slot.card, slot.reversed));
  });
}

// Where a card sits on screen: its centre and half its size.
function cardGeom(i) {
  const r = S.slots[i].box.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, rx: r.width / 2, ry: r.height / 2 };
}

// A card was revealed: light it, then send energy on to the next card.
function magicReveal(i) {
  if (!S) return;
  if (!MG.ctx) sizeMagic();
  const now = performance.now();
  const fresh = !MG.cards[i];
  if (fresh) {
    MG.cards[i] = { at: now, runes: Array.from({ length: 8 }, () => rand(RUNES.length)), spin: rand(2) ? 1 : -1,
      element: S.slots[i].card ? elementFor(S.slots[i].card) : null };
    if (FRAMES_ON && S.slots[i].card) measureInset(S.slots[i].card);
  }
  const waiting = S.slots.map((s, k) => k).filter((k) => !MG.cards[k]);
  // Each card turned adds the next element of the circle; the last one
  // turned brings the whole circle together instead.
  if (waiting.length && fresh) magicStep();
  if (waiting.length) {
    const next = waiting.find((k) => k > i) ?? waiting[0];
    MG.travels.push({ from: i, to: next, at: now, dur: vary(1100) });
  } else if (!MG.finale) {
    MG.finale = now + 500;   // all turned: the threads gather
  }
  startMagic();
}

function startMagic() {
  if (MG.running) return;
  MG.running = true;
  requestAnimationFrame(function frame(t) {
    if (!S || $("table").hidden || document.hidden) { MG.running = false; return; }
    const now = calm ? performance.now() + 10000 : t;   // reduced motion: draw everything already settled
    drawMagic(now);
    drawFrames(now);
    if (MG.frx) drawFlightsTop(MG.frx, now);
    if (calm) { MG.running = false; return; }   // reduced motion: one still frame
    requestAnimationFrame(frame);
  });
}

function rune(ctx, path, x, y, size, angle, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(size / 16, size / 16);
  ctx.translate(-6, -8);
  // Each rune glows softly, like light cut into the air.
  ctx.shadowColor = `rgba(255, 210, 130, ${Math.min(1, alpha * 1.2)})`;
  ctx.shadowBlur = 7;
  ctx.strokeStyle = `rgba(255, 228, 175, ${alpha})`;
  ctx.lineWidth = 19 / size;   // a little over 1px on screen
  ctx.stroke(path);
  ctx.restore();
}

// The paths energy takes: from the top of one card's rune ring, in an
// arc over the cards, down to the top of the next (so it's never hidden
// behind them). bend lifts the arc higher.
function arcPath(a, b, bend) {
  const s = { x: a.x, y: a.y - a.ry - 14 }, e = { x: b.x, y: b.y - b.ry - 14 };
  const c = { x: (s.x + e.x) / 2, y: Math.min(s.y, e.y) - 18 - Math.abs(e.x - s.x) * bend };
  return [s, c, e];
}

// A straight-ish path to a point (used for the threads meeting at the end).
function pointPath(a, to, bend) {
  const s = { x: a.x, y: a.y - a.ry - 14 };
  const c = { x: (s.x + to.x) / 2 + (to.y - s.y) * bend, y: (s.y + to.y) / 2 };
  return [s, c, to];
}

// A point along a path (p from 0 to 1).
function curvePoint([s, c, e], p) {
  const q = 1 - p;
  return { x: q * q * s.x + 2 * q * p * c.x + p * p * e.x, y: q * q * s.y + 2 * q * p * c.y + p * p * e.y };
}

function strokeCurve(ctx, path, upTo = 1) {
  ctx.beginPath();
  const steps = 28;
  for (let k = 0; k <= steps * upTo; k++) {
    const p = curvePoint(path, k / steps);
    k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
  }
  ctx.stroke();
}

function drawMagic(t) {
  drawMagicLayer(t);
  softenUnderText(t);
}

// The magic thins out behind each turned card's name and keywords, so
// the gold words never sit on gold runes. One soft oval per card, its
// edge fading away gradually (close to a bell curve), so it reads as the
// light simply growing quieter there rather than a cut-out. It eases in
// as the words appear.
function softenUnderText(t) {
  const ctx = MG.ctx;
  if (!ctx || !S) return;
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  S.slots.forEach((s, i) => {
    const c = MG.cards[i];
    if (!c || !s.nameEl.classList.contains("shown")) return;
    const a = Math.min(1, Math.max(0, (t - c.at - 200) / 900));
    if (a <= 0) return;
    const k = a * a * (3 - 2 * a);
    const r1 = s.nameEl.getBoundingClientRect(), r2 = s.kwEl.getBoundingClientRect();
    const left = Math.min(r1.left, r2.left), right = Math.max(r1.right, r2.right);
    const top = Math.min(r1.top, r2.top), bottom = Math.max(r1.bottom, r2.bottom);
    if (right <= left || bottom <= top) return;
    const cx = (left + right) / 2, cy = (top + bottom) / 2;
    const rx = (right - left) / 2 + 34, ry = (bottom - top) / 2 + 22;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rx, ry);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    [[0, 0.92], [0.35, 0.88], [0.55, 0.72], [0.7, 0.5], [0.82, 0.28], [0.92, 0.1], [1, 0]]
      .forEach(([o, v]) => g.addColorStop(o, `rgba(0, 0, 0, ${(v * k).toFixed(3)})`));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  ctx.restore();
}

function drawMagicLayer(t) {
  const ctx = MG.ctx;
  ctx.clearRect(0, 0, MG.w, MG.h);
  if (!S) return;
  const geo = S.slots.map((s, i) => cardGeom(i));
  const fin = MG.finale && t >= MG.finale ? Math.min(1, (t - MG.finale) / 1600) : 0;
  const pulse = 0.85 + 0.15 * Math.sin(t / 1400);
  ctx.lineCap = "round";

  // Threads already travelled: faint lines, flowing once all are joined.
  MG.links.forEach(({ from, to, bend }) => {
    ctx.save();
    ctx.setLineDash([2, 7]);
    ctx.lineDashOffset = -t / 60;
    ctx.strokeStyle = `rgba(${GOLD}, ${(0.16 + 0.12 * fin) * pulse})`;
    ctx.lineWidth = 1;
    strokeCurve(ctx, arcPath(geo[from], geo[to], bend));
    ctx.restore();
  });

  // Energy on its way to the next card: a bright head with a trail.
  MG.travels = MG.travels.filter((tr) => {
    const p = Math.min(1, (t - tr.at) / tr.dur);
    tr.bend = tr.bend ?? 0.15;
    const path = arcPath(geo[tr.from], geo[tr.to], tr.bend);
    if (p >= 1) {
      MG.links.push({ from: tr.from, to: tr.to, bend: tr.bend });
      MG.cards[tr.to] || (MG.waitAt = { i: tr.to, at: t });
      return false;
    }
    const e = 1 - Math.pow(1 - p, 3);
    ctx.strokeStyle = `rgba(${GOLD}, .26)`;
    ctx.lineWidth = 1;
    strokeCurve(ctx, path, e);
    for (let k = 0; k < 10; k++) {
      const q = Math.max(0, e - k * 0.025);
      const pt = curvePoint(path, q);
      ctx.fillStyle = `rgba(255, 226, 170, ${0.55 * (1 - k / 10)})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.4 * (1 - k / 12), 0, Math.PI * 2);
      ctx.fill();
    }
    return true;
  });

  // A card the energy has reached, waiting to be turned: a soft breathing ring.
  if (MG.waitAt && !MG.cards[MG.waitAt.i] && geo[MG.waitAt.i]) {
    const g = geo[MG.waitAt.i];
    const a = 0.1 + 0.08 * Math.sin((t - MG.waitAt.at) / 420);
    ctx.strokeStyle = `rgba(${GOLD}, ${a})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(g.x, g.y, g.rx + 10, g.ry + 10, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawFlights(ctx, t);

  // Each revealed card: its burst of light and its turning ring of runes.
  MG.cards.forEach((c, i) => {
    if (!c) return;
    const g = geo[i];
    const age = t - c.at;
    if (age < 1000) {
      const p = age / 1000;
      const r = (g.ry + 30) * (0.4 + p * 1.1);
      const grad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, r);
      grad.addColorStop(0, `rgba(255, 226, 170, ${0.32 * (1 - p)})`);
      grad.addColorStop(1, "rgba(255, 226, 170, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(g.x - r, g.y - r, r * 2, r * 2);
    }
    const show = Math.min(1, age / 700);
    const rx = g.rx + 12, ry = g.ry + 12;
    ctx.save();
    ctx.setLineDash([1, 5]);
    ctx.lineDashOffset = (t / 90) * c.spin;
    ctx.strokeStyle = `rgba(${GOLD}, ${0.22 * show * pulse})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(g.x, g.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // A pool of soft light beneath the card.
    ctx.save();
    ctx.translate(g.x, g.y + g.ry + 4);
    ctx.scale(1, 0.22);
    const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, g.rx * 1.25);
    pool.addColorStop(0, `rgba(255, 214, 140, ${0.3 * show * pulse})`);
    pool.addColorStop(1, "rgba(255, 214, 140, 0)");
    ctx.fillStyle = pool;
    ctx.fillRect(-g.rx * 1.25, -g.rx * 1.25, g.rx * 2.5, g.rx * 2.5);
    ctx.restore();
    c.runes.forEach((r, k) => {
      const ang = (k / c.runes.length) * Math.PI * 2 + (t / 26000) * c.spin;
      const x = g.x + Math.cos(ang) * (rx + 9), y = g.y + Math.sin(ang) * (ry + 9);
      const tw = 0.75 + 0.25 * Math.sin(t / 900 + k * 1.7);
      rune(ctx, RUNES[r], x, y, 10, 0, 0.8 * show * tw);
    });
  });

  // Where the great circle sits: a perfect circle around the spread. A tall
  // spread on a narrow screen can't fit inside one, so there it passes behind the cards.
  const finaleOn = MG.finale && t >= MG.finale;
  if (!finaleOn && !MG.steps.length) return;
  const left = Math.min(...geo.map((g) => g.x - g.rx)), right = Math.max(...geo.map((g) => g.x + g.rx));
  const top = Math.min(...geo.map((g) => g.y - g.ry)), bottom = Math.max(...geo.map((g) => g.y + g.ry));
  const cx = (left + right) / 2, cy = (top + bottom) / 2;
  const header = document.querySelector("#table .bar").getBoundingClientRect().bottom;
  const R1 = Math.round(Math.max((right - left) / 2 + 26, Math.min((bottom - top) / 2 + 26, MG.w * 0.48)));

  // All turned: threads from every card meet in a seal above the spread,
  // then the circle comes together. Until then, it shows only the elements
  // that picking and turning have added so far.
  let seal = null, from = null;
  if (finaleOn) {
    const gather = Math.min(1, (t - MG.finale) / 900);
    // The threads meet in a seal just above the spread, where nothing covers it.
    const sealAt = { x: cx, y: Math.max(top - 44, header + 16) };
    geo.forEach((g, i) => {
      const path = pointPath(g, sealAt, i % 2 ? 0.15 : -0.15);
      ctx.strokeStyle = `rgba(${GOLD}, ${0.14 * pulse})`;
      ctx.lineWidth = 1;
      strokeCurve(ctx, path, gather);
      if (gather < 1) {
        const pt = curvePoint(path, gather);
        ctx.fillStyle = "rgba(255, 226, 170, .6)";
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    // Where the great circle is, for the summary's portal to take it over.
    MG.great = { cx, cy, R1, from: MG.finale + 900 };
    if (gather >= 1) {
      seal = sealAt;
      from = MG.finale + 900;
      // The moment it comes together: sparks shower out over the cards.
      if (!MG.burst && !calm) {
        MG.burst = true;
        burstMotes(cx, cy, 70, R1 * 0.25);
        burstMotes(cx, cy, 90, R1);
      }
    }
  }
  if (!MG.portal) drawArcaneCircle(ctx, t, { cx, cy, R1, seal, from });
}

// ── The great arcane circle ─────────────────────────────
// Forms around the whole spread once every card is turned: perfect circles
// of faint golden light, laid out with strict symmetry but never evenly.
// The inner sigil sweeps itself in from the top: a ring of runes broken
// by small node circles, a hexagram whose points touch the band, a smaller
// inner ring and three satellite circles riding on the rim. Then light
// gathers, ripples run outward, each reaching further than the last, and
// a larger sigil grows out of the inner one: a second band of runes, two
// crossed squares cutting through the inner circle, and broken arcs
// beyond, long and short in turn. The two turn slowly against each other
// while glints spark at their crossings and dust drifts between them.
//
// Both sigils are drawn once, glow and all, into pictures of their own;
// each frame only turns and fades those pictures and adds the live light.

const ARC_GLOW = "255, 190, 110", ARC_CORE = "255, 236, 200";
const arcSeg = (v, a, b) => Math.min(1, Math.max(0, (v - a) / (b - a)));
const easeIO = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(2 - 2 * p, 2) / 2);
const easeOut = (p) => 1 - Math.pow(1 - p, 3);
// A small number from 0 to 1 that's always the same for the same n.
const hash01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// Adds a rune to a path, centred at (x, y), `size` tall, turned by angle
// (the angle of a point on a circle plus 90° stands it upright, facing out).
function addRune(path, k, x, y, size, angle) {
  const m = new DOMMatrix().translateSelf(x, y).rotateSelf((angle * 180) / Math.PI).scaleSelf(size / 16).translateSelf(-6, -8);
  path.addPath(RUNES[k % RUNES.length], m);
}

// A blank square picture for a sigil of radius R, centred on its middle.
function sigilCanvas(R, scale) {
  const size = 2 * (R + 30);
  const c = document.createElement("canvas");
  c.width = c.height = Math.ceil(size * scale);
  const x = c.getContext("2d");
  x.scale(scale, scale);
  x.translate(size / 2, size / 2);
  x.lineCap = "round";
  x.lineJoin = "round";
  return { c, x, size, scale };
}

// Strokes a path into a sigil picture as golden light, in three layers like
// light cut into the air: a wide amber haze, a warm glow, and a thin,
// almost white-hot core.
const ARC_DEEP = "255, 160, 70", ARC_HOT = "255, 249, 232";
function lightStroke(s, path, alpha, w) {
  const x = s.x;
  x.save();
  x.shadowColor = `rgba(${ARC_DEEP}, ${0.45 * alpha})`;
  x.shadowBlur = 9 * s.scale;
  x.strokeStyle = `rgba(${ARC_DEEP}, ${0.07 * alpha})`;
  x.lineWidth = w * 3.2;
  x.stroke(path);
  x.shadowColor = `rgba(${ARC_GLOW}, ${0.8 * alpha})`;
  x.shadowBlur = 4 * s.scale;
  x.strokeStyle = `rgba(${ARC_GLOW}, ${0.32 * alpha})`;
  x.lineWidth = w * 1.8;
  x.stroke(path);
  x.shadowBlur = 0;
  x.strokeStyle = `rgba(${ARC_HOT}, ${Math.min(1, alpha * 1.15)})`;
  x.lineWidth = w * 0.85;
  x.stroke(path);
  x.restore();
}

// A smaller copy of a picture (the browser smooths it as it shrinks).
function shrink(src, f) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(src.width * f));
  c.height = Math.max(1, Math.round(src.height * f));
  const x = c.getContext("2d");
  x.imageSmoothingQuality = "high";
  x.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

// The bloom of a sigil: its light, blurred at two widths and laid
// together, kept small (it is soft, so it scales up without losing
// anything). Drawn under the crisp lines, it makes the light spill into
// the air around them. Made once, by shrinking: no slow blur filters.
function makeBloom(s) {
  const q = shrink(shrink(s.c, 0.5), 0.5);   // a quarter: the tight glow
  const e = shrink(q, 0.5), w = shrink(shrink(e, 0.5), 0.5);   // an eighth and a thirty-second: the wide glow
  const c = document.createElement("canvas");
  c.width = q.width; c.height = q.height;
  const x = c.getContext("2d");
  x.globalCompositeOperation = "lighter";
  x.imageSmoothingQuality = "high";
  // Mostly the tight glow that hugs the lines; only a little of the wide one.
  x.globalAlpha = 0.7;
  x.drawImage(q, 0, 0);
  x.globalAlpha = 0.35;
  x.drawImage(e, 0, 0, c.width, c.height);
  x.globalAlpha = 0.2;
  x.drawImage(w, 0, 0, c.width, c.height);
  // warm it towards amber, so the bloom reads as heat around gold light
  x.globalCompositeOperation = "source-atop";
  x.fillStyle = `rgba(${ARC_DEEP}, .25)`;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

// A soft round dot of light, drawn once and reused for every spark and mote.
let glowDot = null;
function glowSprite() {
  if (glowDot) return glowDot;
  glowDot = document.createElement("canvas");
  glowDot.width = glowDot.height = 64;
  const x = glowDot.getContext("2d");
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, `rgba(${ARC_HOT}, 1)`);
  g.addColorStop(0.15, `rgba(${ARC_CORE}, .85)`);
  g.addColorStop(0.4, `rgba(${ARC_GLOW}, .28)`);
  g.addColorStop(1, `rgba(${ARC_DEEP}, 0)`);
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  return glowDot;
}
function glowAt(ctx, x, y, r, alpha) {
  if (alpha <= 0.01) return;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(glowSprite(), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

const circlePath = (p, r, x = 0, y = 0) => { p.moveTo(x + r, y); p.arc(x, y, r, 0, Math.PI * 2); return p; };

// A band of runes around a circle of radius r: n places, with a small node
// circle instead of a rune at every `every`-th place.
function runeBand(s, r, n, every, size, offset, alpha) {
  const runes = new Path2D(), nodes = new Path2D();
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (k % every === 0) {
      circlePath(nodes, size * 0.42, x, y);
      circlePath(nodes, size * 0.08, x, y);
    } else {
      addRune(runes, (k * 7 + offset) % RUNES.length, x, y, size * (k % 2 ? 1 : 0.86), a + Math.PI / 2);
    }
  }
  lightStroke(s, runes, alpha, 0.85);
  lightStroke(s, nodes, alpha * 0.9, 0.8);
}

// A regular polygon of n points on a circle of radius r, its lines running
// a little past each point.
function starLines(path, r, n, turn, over) {
  for (let k = 0; k < n; k++) {
    const a1 = turn + (k / n) * Math.PI * 2, a2 = turn + ((k + 1) / n) * Math.PI * 2;
    const p1 = { x: Math.cos(a1) * r, y: Math.sin(a1) * r }, p2 = { x: Math.cos(a2) * r, y: Math.sin(a2) * r };
    const d = Math.hypot(p2.x - p1.x, p2.y - p1.y), ux = (p2.x - p1.x) / d, uy = (p2.y - p1.y) / d;
    path.moveTo(p1.x - ux * over, p1.y - uy * over);
    path.lineTo(p2.x + ux * over, p2.y + uy * over);
  }
}

// The drawn sigils, kept by size: the table and the summary each use their own.
const SIGILS = new Map();
function sigilsFor(R1) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const key = `${R1}|${dpr}`;
  if (!SIGILS.has(key)) {
    if (SIGILS.size > 6) SIGILS.delete(SIGILS.keys().next().value);   // forget old sizes after resizing
    SIGILS.set(key, buildSigils(R1, dpr));
  }
  return SIGILS.get(key);
}

// The circle's elements, in the order they appear: each card picked or
// turned adds the next one, faintly, and the last card turned brings in
// the rest and lights them all. Each materialises where it stands, in a
// magical fade. group: part of the inner sigil (turning with it) or the outer one.
const ARC_PARTS = [
  { key: "core",    group: "in" },    // the innermost circle
  { key: "midband", group: "in" },    // the small ring of runes round it
  { key: "star",    group: "in" },    // the six-pointed star
  { key: "ring",    group: "in" },    // the main ring's lines
  { key: "runes",   group: "in" },    // the main band of runes
  { key: "sats",    group: "in" },    // three small circles riding the rim
  { key: "oring",   group: "out" },   // the outer ring's lines
  { key: "orunes",  group: "out" },   // the outer band of runes
  { key: "squares", group: "out" },   // two crossed squares
  { key: "arcs",    group: "out" },   // broken arcs and ticks at the edge
  // The crown: the outermost ring, brought only by the final reveal. Unlike
  // the rest it has no solid line: a string of beads carrying eight rune
  // medallions, turning on its own, slowly, against the ring inside it.
  { key: "crown",   group: "crown", final: true },
];
// The elements the picks and turns share out; the final ones come with the last card turned.
const STEPPED = ARC_PARTS.filter((e) => !e.final);

function buildSigils(R1, dpr) {
  const R2 = Math.round(R1 * 1.34 + 12), R3 = R2 + 44;   // R3: where the crown runs
  // Big pictures are drawn at a lower resolution: the light is soft anyway.
  const scale = Math.min(dpr, 2000 / (2 * (R3 + 60)));
  const TAU = Math.PI * 2, top = -Math.PI / 2, Rm = R1 * 0.56;
  // Each element is its own picture (just big enough for it), with its own
  // bloom, and `radius` is where sparks twinkle as it materialises.
  const parts = {}, radius = {};
  const part = (key, R, r) => { const s = sigilCanvas(R, scale); parts[key] = s; radius[key] = r; return s; };

  // The innermost circle.
  lightStroke(part("core", R1 * 0.3 + 4, R1 * 0.3), circlePath(circlePath(new Path2D(), R1 * 0.3), R1 * 0.3 - 5), 0.45, 0.7);
  // The small ring of runes round it.
  const mid = part("midband", Rm + 4, Rm);
  lightStroke(mid, circlePath(circlePath(new Path2D(), Rm), Rm - 13), 0.4, 0.6);
  runeBand(mid, Rm - 6.5, 6 * Math.max(3, Math.round((TAU * Rm) / 18 / 6)), 1e9, 8, 5, 0.45);
  // The six-pointed star, its points touching the main ring's inner line.
  const hex = new Path2D();
  for (let tri = 0; tri < 2; tri++) {
    hex.moveTo(Math.cos(top + tri * Math.PI) * (R1 - 22), Math.sin(top + tri * Math.PI) * (R1 - 22));
    for (let k = 1; k <= 3; k++) {
      const ang = top + tri * Math.PI + (k / 3) * TAU;
      hex.lineTo(Math.cos(ang) * (R1 - 22), Math.sin(ang) * (R1 - 22));
    }
  }
  lightStroke(part("star", R1 - 18, R1 - 22), hex, 0.45, 0.7);
  // The main ring's lines.
  const ring = part("ring", R1 + 8, R1);
  lightStroke(ring, circlePath(new Path2D(), R1), 0.85, 1.2);
  lightStroke(ring, circlePath(new Path2D(), R1 - 22), 0.6, 0.8);
  lightStroke(ring, circlePath(new Path2D(), R1 + 5), 0.3, 0.5);
  // The main band of runes.
  const per = Math.max(4, Math.round((TAU * R1) / 24 / 6));
  runeBand(part("runes", R1 - 2, R1 - 11), R1 - 11, 6 * per, per, 11, 0, 0.75);
  // Three small circles riding the rim, each with a rune at its heart.
  const rs = Math.max(13, R1 * 0.11);
  const sats = part("sats", R1 + rs + 2, R1);
  const sat = new Path2D(), satRunes = new Path2D();
  for (let k = 0; k < 3; k++) {
    const ang = top + (k / 3) * TAU + Math.PI / 3;
    const x = Math.cos(ang) * R1, y = Math.sin(ang) * R1;
    circlePath(sat, rs, x, y);
    circlePath(sat, rs * 0.72, x, y);
    addRune(satRunes, [SEAL, 8, 14][k], x, y, rs * 0.9, ang + Math.PI / 2);
  }
  lightStroke(sats, sat, 0.6, 0.8);
  lightStroke(sats, satRunes, 0.7, 0.8);

  // The outer ring's lines.
  const oring = part("oring", R2 + 4, R2);
  lightStroke(oring, circlePath(new Path2D(), R2), 0.8, 1.1);
  lightStroke(oring, circlePath(new Path2D(), R2 - 26), 0.55, 0.8);
  // The outer band of runes.
  const oper = Math.max(3, Math.round((TAU * R2) / 26 / 8));
  runeBand(part("orunes", R2 - 2, R2 - 13), R2 - 13, 8 * oper, oper, 12.5, 3, 0.7);
  // Two crossed squares whose corners sit on the band and whose sides cut through the inner circle.
  const sq = new Path2D();
  starLines(sq, R2 - 26, 4, top, 16);
  starLines(sq, R2 - 26, 4, top + Math.PI / 4, 16);
  lightStroke(part("squares", R2 - 6, R2 - 26), sq, 0.42, 0.75);
  // Broken arcs at the very edge, long on the quarters and short between, and fine ticks.
  const edge = part("arcs", R2 + 24, R2 + 13);
  const arcs = new Path2D();
  for (let k = 0; k < 8; k++) {
    const m = top + (k / 8) * TAU, half = (k % 2 ? 7 : 17) * (Math.PI / 180);
    arcs.moveTo(Math.cos(m - half) * (R2 + 13), Math.sin(m - half) * (R2 + 13));
    arcs.arc(0, 0, R2 + 13, m - half, m + half);
  }
  lightStroke(edge, arcs, 0.5, 0.8);
  const ticks = new Path2D();
  for (let k = 0; k < 72; k++) {
    const ang = (k / 72) * TAU, l = k % 9 === 0 ? 7 : 3;
    ticks.moveTo(Math.cos(ang) * (R2 + 3), Math.sin(ang) * (R2 + 3));
    ticks.lineTo(Math.cos(ang) * (R2 + 3 + l), Math.sin(ang) * (R2 + 3 + l));
  }
  lightStroke(edge, ticks, 0.3, 0.6);

  // The crown: unlike every other ring, no solid line at all. A string of
  // beads of light runs round, carrying eight medallions, each a small
  // double circle holding a large rune; the beads swell towards each
  // medallion and dwindle midway between, where a tiny star marks the gap.
  const crown = part("crown", R3 + 22, R3);
  const M = 8, medR = 15;
  const beads = new Path2D(), meds = new Path2D(), medRunes = new Path2D(), gaps = new Path2D();
  for (let k = 0; k < M; k++) {
    const a = top + (k / M) * TAU, x = Math.cos(a) * R3, y = Math.sin(a) * R3;
    circlePath(meds, medR, x, y);
    circlePath(meds, medR - 4, x, y);
    addRune(medRunes, [SEAL, 10, 14, 8][k % 4], x, y, 15, a + Math.PI / 2);
    // the beads between this medallion and the next
    const span = TAU / M, clear = (medR + 7) / R3, n = Math.max(6, Math.round(((span - 2 * clear) * R3) / 10));
    for (let j = 0; j < n; j++) {
      const u = (j + 0.5) / n, b = a + clear + u * (span - 2 * clear);
      if (Math.abs(u - 0.5) < 0.5 / n) continue;   // the middle bead gives way to the star
      const r = 0.7 + 1.5 * Math.abs(u - 0.5) * 2;   // larger near the medallions
      circlePath(beads, r, Math.cos(b) * R3, Math.sin(b) * R3);
    }
    const m = a + span / 2, sx = Math.cos(m) * R3, sy = Math.sin(m) * R3, s = 3.6;
    gaps.moveTo(sx - s, sy); gaps.lineTo(sx + s, sy);
    gaps.moveTo(sx, sy - s); gaps.lineTo(sx, sy + s);
  }
  lightStroke(crown, beads, 0.55, 0.9);
  lightStroke(crown, meds, 0.55, 0.8);
  lightStroke(crown, medRunes, 0.65, 0.85);
  lightStroke(crown, gaps, 0.45, 0.6);

  // The whole inner and outer sigils, each laid together from its
  // elements, for the summary's portal to turn as one.
  const compose = (R, group) => {
    const c = sigilCanvas(R, scale);
    ARC_PARTS.filter((e) => e.group === group).forEach(({ key }) => {
      const p = parts[key];
      c.x.drawImage(p.c, -p.size / 2, -p.size / 2, p.size, p.size);
    });
    c.bloom = makeBloom(c);
    return c;
  };
  Object.values(parts).forEach((p) => { p.bloom = makeBloom(p); });
  return { R1, R2, R3, parts, radius, inner: compose(R1, "in"), outer: compose(R2 + 24, "out") };
}

// Draws a sigil picture centred at (cx, cy), turned, scaled and faded:
// its bloom first, spilling light round it (`glow` sets how much), then
// the crisp lines on top. Meant for a canvas drawing with "lighter".
function drawSigil(ctx, s, cx, cy, rot, k, alpha, glow = 1) {
  if (alpha <= 0.005) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.scale(k, k);
  if (s.bloom && glow > 0) {
    ctx.globalAlpha = Math.min(1, alpha * glow * 0.4);
    ctx.drawImage(s.bloom, -s.size / 2, -s.size / 2, s.size, s.size);
  }
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(s.c, -s.size / 2, -s.size / 2, s.size, s.size);
  ctx.restore();
}

// A star flare where light crosses: a hot core, long thin rays across
// and shorter ones up and down, and faint diagonal glints, like the
// sparkles where the lines cross in the reference art.
function glint(ctx, x, y, r, alpha) {
  if (alpha <= 0.01) return;
  alpha = Math.min(1, alpha);
  glowAt(ctx, x, y, r * 2.2, alpha * 0.9);
  const ray = (dx, dy, len, w, a) => {
    const g = ctx.createLinearGradient(x - dx * len, y - dy * len, x + dx * len, y + dy * len);
    g.addColorStop(0, `rgba(${ARC_GLOW}, 0)`);
    g.addColorStop(0.5, `rgba(${ARC_HOT}, ${a})`);
    g.addColorStop(1, `rgba(${ARC_GLOW}, 0)`);
    ctx.strokeStyle = g;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x - dx * len, y - dy * len);
    ctx.lineTo(x + dx * len, y + dy * len);
    ctx.stroke();
  };
  ray(1, 0, r * 3.4, 1, 0.9 * alpha);
  ray(0, 1, r * 2.2, 0.9, 0.75 * alpha);
  ray(0.7071, 0.7071, r * 1.1, 0.6, 0.35 * alpha);
  ray(0.7071, -0.7071, r * 1.1, 0.6, 0.35 * alpha);
}

// Energy running through the rings: comets of light, two to a ring,
// coursing round in turn one way and the other, as if power flowed
// through the circle. radii: [radius, direction, speed]; `fast` speeds them up.
// Each comet is one smooth stroke along its ring whose light fades evenly
// from its head back to nothing (a gradient that runs round the circle),
// with a soft hairline glow under it and a small, gentle head.
function ringPulses(ctx, t, cx, cy, radii, alpha, fast = 1) {
  if (alpha <= 0.01) return;
  const TAU = Math.PI * 2;
  ctx.save();
  ctx.lineCap = "round";
  radii.forEach(([r, dir, sp], j) => {
    for (let n = 0; n < 2; n++) {
      const head = dir * (t / sp) * fast + n * Math.PI + j * 1.7;
      const len = 0.42 + 0.12 * Math.sin(t / 1900 + j + n);   // its tail, in radians
      // The tail runs back from the head against the direction of travel.
      const a0 = dir > 0 ? head - len : head, a1 = dir > 0 ? head : head + len;
      const fadeIn = (o) => {
        if (!ctx.createConicGradient) return `rgba(${ARC_GLOW}, ${o * 0.5})`;
        const g = ctx.createConicGradient(a0, cx, cy), L = len / TAU;
        // brightness along the tail, eased so it thins out smoothly to nothing
        for (let k = 0; k <= 8; k++) {
          const u = k / 8, along = dir > 0 ? u : 1 - u;   // 0 at the tail's end, 1 at the head
          g.addColorStop(u * L, `rgba(${along > 0.8 ? ARC_HOT : ARC_GLOW}, ${o * Math.pow(along, 1.7)})`);
        }
        g.addColorStop(Math.min(1, L + 0.002), `rgba(${ARC_GLOW}, 0)`);
        return g;
      };
      ctx.beginPath();
      ctx.arc(cx, cy, r, a0, a1);
      ctx.strokeStyle = fadeIn(alpha * 0.25);
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.strokeStyle = fadeIn(alpha * 0.85);
      ctx.lineWidth = 1.1;
      ctx.stroke();
      glowAt(ctx, cx + Math.cos(head) * r, cy + Math.sin(head) * r, 4.5, alpha * 0.8);
    }
  });
  ctx.restore();
}

// Light that lives: the circle is drawn into a scratch canvas, then masked
// so its lines fade and return here and there instead of burning evenly.
// Around the ring, the brightness drifts in waves at several speeds; on
// top of that, soft patches dim the lines in passing spots, swelling and
// clearing on their own time. strength 0 leaves it steady; draw(x) draws
// the circle into the scratch canvas, in screen coordinates.
const FLICK = { c: null, x: null };
function livingLight(ctx, t, { cx, cy, R1, R2, extent, strength = 1, seed = 0, mask = null }, draw) {
  const main = ctx.canvas, m = ctx.getTransform(), d = m.a || 1;
  if (!FLICK.c) { FLICK.c = document.createElement("canvas"); FLICK.x = FLICK.c.getContext("2d"); }
  if (FLICK.c.width !== main.width || FLICK.c.height !== main.height) {
    FLICK.c.width = main.width; FLICK.c.height = main.height;
  }
  const x = FLICK.x;
  x.setTransform(d, 0, 0, d, 0, 0);
  // Only the part of the screen the circle covers.
  const W = main.width / d, H = main.height / d;
  const L = Math.max(0, Math.floor(cx - extent)), T = Math.max(0, Math.floor(cy - extent));
  const Rr = Math.min(W, Math.ceil(cx + extent)), B = Math.min(H, Math.ceil(cy + extent));
  if (Rr <= L || B <= T) return;
  x.globalCompositeOperation = "source-over";
  x.globalAlpha = 1;
  x.clearRect(L, T, Rr - L, B - T);
  x.save();
  x.globalCompositeOperation = "lighter";
  draw(x);
  x.restore();
  // An extra shape to keep (feathered fragments of the circle, while it is still forming).
  if (mask) {
    x.globalCompositeOperation = "destination-in";
    x.fillStyle = mask(x);
    x.fillRect(L, T, Rr - L, B - T);
    x.globalCompositeOperation = "source-over";
  }

  if (strength > 0) {
    // Soft round patches where the lines fade out for a while, then return,
    // drifting a little as they go. Only round, feathered shapes: anything
    // with a straight edge would read as the light being cut.
    x.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 11; i++) {
      const period = 2800 + hash01(i + seed * 7) * 4200;
      const tt = t + hash01(i + 40) * period, n = Math.floor(tt / period), ph = (tt % period) / period;
      const a = hash01(n * 3 + i) * Math.PI * 2 + ph * 0.25 * (i % 2 ? 1 : -1);
      const r = R1 * 0.5 + hash01(n * 5 + i + 9) * (R2 + 20 - R1 * 0.5);
      const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
      const size = 45 + hash01(n * 7 + i) * 85;
      const s = strength * 0.8 * Math.sin(Math.PI * ph) ** 2;
      if (s < 0.02) continue;
      const g = x.createRadialGradient(px, py, 0, px, py, size);
      g.addColorStop(0, `rgba(0, 0, 0, ${s})`);
      g.addColorStop(0.45, `rgba(0, 0, 0, ${s * 0.7})`);
      g.addColorStop(1, "rgba(0, 0, 0, 0)");
      x.fillStyle = g;
      x.fillRect(px - size, py - size, size * 2, size * 2);
    }
    x.globalCompositeOperation = "source-over";
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(FLICK.c, L * d, T * d, (Rr - L) * d, (B - T) * d, L * d, T * d, (Rr - L) * d, (B - T) * d);
  ctx.restore();
}

// ── The circle, element by element ──────────────────────
// The circle's elements (ARC_PARTS) are shared out, in order, over every
// card picked and every card turned: a spread of n cards has 2n steps, and
// the earlier steps take any extra. Each step but the last adds its
// elements faintly, one after another; the last card turned adds the final
// ones and lights them all, so the circle comes together on the final
// reveal. One card: picking it draws the inner five, turning it the outer
// five. Five cards: one element a step, the outermost on the last turn.

const PART_INTRO = 1300;     // how long an element takes to materialise (ms)
const PART_STAGGER = 260;    // between elements that arrive in the same step (ms)
const FINAL_STAGGER = 150;   // between the last elements, arriving in the final flare (ms)

// Which step brings element i in, and its place among that step's elements.
function partStep(i, steps) {
  const N = STEPPED.length, base = Math.floor(N / steps), extra = N % steps;
  let start = 0;
  for (let s = 0; s < steps; s++) {
    const size = base + (s < extra ? 1 : 0);
    if (i < start + size) return { step: s, order: i - start };
    start += size;
  }
  return { step: steps - 1, order: 0 };
}

function magicStep() {
  if (!S) return;
  if (!MG.ctx) sizeMagic();
  MG.total = Math.min(STEPPED.length, 2 * S.n);
  if (MG.steps.length >= MG.total - 1) return;   // the last step is the final reveal
  MG.steps.push(performance.now());
  startMagic();
}

// A faint warm haze in the air around the circle, with a breath of violet
// at its edge where it meets the night.
function arcHaze(ctx, cx, cy, r, alpha) {
  if (alpha <= 0.01) return;
  const g = ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
  g.addColorStop(0, `rgba(${ARC_DEEP}, ${0.025 * alpha})`);
  g.addColorStop(0.55, `rgba(${ARC_DEEP}, ${0.035 * alpha})`);
  g.addColorStop(0.8, `rgba(150, 100, 220, ${0.025 * alpha})`);
  g.addColorStop(1, "rgba(150, 100, 220, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
}

// The great circle, as far as it has come. Before the final reveal (from
// is null) only the elements the steps have added show, faintly. The final
// reveal (from: when it started) is always its climax, however much was
// left to add: light bursts at its heart, a shockwave races outward, the
// last elements materialise in quick succession as the whole circle flares
// far brighter than it will rest, and sparks shower out over the cards.
// Then it settles, whole: energy runs round its rings, sparks flare where
// its lines cross and dust drifts.
// Every element turns on its own: its own direction and a pace of its own,
// far apart from the others (degrees a second, the sign the direction),
// from the innermost circle sweeping round to the crown barely drifting.
// Its speed also swings, slowing and picking up again over a long cycle
// (seconds), so it never lurches. Neighbours mostly turn against each other.
const SPIN_DEG = {
  //        pace   cycle  phase
  core:    [ 9.0,   7.0, 0.0],
  midband: [-6.0,   8.0, 1.1],
  star:    [ 4.0,   9.0, 2.3],
  ring:    [-1.6,  11.0, 0.7],
  runes:   [ 2.8,   8.5, 3.1],
  sats:    [ 5.0,   7.5, 4.2],
  oring:   [-1.1,  12.0, 1.9],
  orunes:  [ 2.2,  10.0, 5.0],
  squares: [-3.0,   9.5, 2.8],
  arcs:    [ 0.7,  14.0, 0.4],
  crown:   [-0.5,  16.0, 3.6],
};
// The same in the units partTurn works in: T is ms per radian (signed),
// P is ms per radian of the speed's swing.
const SPIN = Object.fromEntries(Object.entries(SPIN_DEG).map(([k, [deg, cyc, ph]]) =>
  [k, [(1000 * 180) / Math.PI / deg, (cyc * 1000) / (Math.PI * 2), ph]]));
// Its angle at time t: a steady turn plus a slow swing whose speed is 0.75
// of the steady one, so the total speed rises and falls between a quarter
// and one and three-quarters of its pace without ever turning back.
function partTurn(key, t) {
  const [T, P, ph] = SPIN[key];
  return t / T + 0.75 * (P / Math.abs(T)) * Math.sin(t / P + ph);
}

function drawArcaneCircle(ctx, t, { cx, cy, R1, seal, from }) {
  const TAU = Math.PI * 2, top = -Math.PI / 2;
  const S2 = sigilsFor(R1), R2 = S2.R2, Rm = R1 * 0.56;
  const el = from == null ? -1 : t - from;
  const breathe = 0.86 + 0.14 * Math.sin(t / 2300);
  // The bloom breathes on its own slow beat, out of step with the lines.
  const glow = 0.85 + 0.2 * Math.sin(t / 1700) * Math.sin(t / 3900 + 1);
  // Faint while it gathers; full once the last card is turned.
  const together = from == null ? 0 : easeIO(arcSeg(el, 0, 1500));
  // The final reveal's flare: up fast, then easing back down to rest.
  const surge = from == null ? 0 : easeIO(swell(arcSeg(el, 0, 3000), 0.12));

  // Where each element has got to: those the steps added so far, then
  // the rest in quick succession as the final reveal flares.
  const total = MG.total || 2 * (S ? S.n : 5);
  let rank = 0;
  const state = ARC_PARTS.map((e, i) => {
    // The crown comes only with the final reveal, the last to arrive, just after the rest.
    if (e.final) {
      if (from == null) return null;
      const p = arcSeg(t - (from + 60 + rank * FINAL_STAGGER + 220), 0, PART_INTRO + 300);
      return p > 0 ? { e, i, p, early: false } : null;
    }
    const { step, order } = partStep(i, total);
    let at = MG.steps[step];
    const early = at != null;
    if (early) at += order * PART_STAGGER;
    else {
      if (from == null) return null;
      at = from + 60 + rank++ * FINAL_STAGGER;
    }
    const p = arcSeg(t - at, 0, PART_INTRO);
    return p > 0 ? { e, i, p, early } : null;
  }).filter(Boolean);
  const cascadeEnd = 60 + Math.max(0, rank - 1) * FINAL_STAGGER + PART_INTRO;
  const has = (key) => state.some((s) => s.e.key === key && s.p >= 1);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  // The seal where the threads met (on the table, at the end).
  if (seal) {
    const sb = arcSeg(el, 0, 900);
    const sg = ctx.createRadialGradient(seal.x, seal.y, 0, seal.x, seal.y, 24);
    sg.addColorStop(0, `rgba(${ARC_GLOW}, ${0.25 * sb})`);
    sg.addColorStop(1, `rgba(${ARC_GLOW}, 0)`);
    ctx.fillStyle = sg;
    ctx.fillRect(seal.x - 24, seal.y - 24, 48, 48);
    rune(ctx, RUNES[SEAL], seal.x, seal.y, 10, t / 9000, 0.7 * sb);
  }

  arcHaze(ctx, cx, cy, (from == null ? R2 : S2.R3) * 1.25, (0.35 + 0.65 * together + 1.5 * surge) * (state.length / ARC_PARTS.length) * breathe);

  // The final reveal: a burst of light at the heart, and a shockwave
  // racing out past the edge of the circle.
  if (surge > 0) {
    glowAt(ctx, cx, cy, R1 * 1.1, 0.5 * surge);
    const w = arcSeg(el, 0, 1500);
    if (w < 1) {
      const r = R1 * 0.2 + (S2.R3 * 1.2 - R1 * 0.2) * easeOut(w), a = 1 - w;   // out past the crown
      ctx.lineWidth = 9 * a + 2;
      ctx.strokeStyle = `rgba(${ARC_GLOW}, ${0.22 * a})`;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = `rgba(${ARC_HOT}, ${0.75 * a})`;
      ctx.stroke();
    }
  }

  // Draws one element as far as it has materialised: it fades up while its
  // glow swells and settles, easing in a touch from larger, and flares
  // with the rest of the circle in the final reveal. Each turns at its own
  // drifting pace (partTurn).
  const draw = (x, { e, p, early }) => {
    const full = e.group === "in" ? 0.55 : 0.5;
    const q = easeIO(p);
    const a = full * breathe * (early ? 0.6 + 0.4 * together : 1) * q * (1 + 1.1 * surge);
    const k = 1 + 0.035 * (1 - easeOut(p));
    const g = glow * (1 + 2.2 * Math.sin(Math.PI * p) ** 2) * (1 + 1.6 * surge);
    const rot = partTurn(e.key, t);
    drawSigil(x, S2.parts[e.key], cx, cy, rot, k, a, g);
  };
  livingLight(ctx, t, { cx, cy, R1, R2, extent: S2.R3 + 40, strength: 1 - 0.85 * surge }, (x) => state.forEach((s) => draw(x, s)));

  // Sparks twinkling along each element as it materialises.
  state.forEach(({ i, p }) => {
    if (p >= 1) return;
    const r = S2.radius[ARC_PARTS[i].key];
    for (let j = 0; j < 5; j++) {
      const ph = arcSeg(p, j * 0.12, j * 0.12 + 0.5);
      if (ph <= 0 || ph >= 1) continue;
      const ang = hash01(i * 13 + j) * TAU;
      glint(ctx, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 4 + 3 * hash01(i + j * 7), 0.8 * Math.sin(Math.PI * ph));
    }
  });

  // Energy running round the rings that have formed: faint while it
  // gathers, full once it's whole.
  const radii = [];
  if (has("core")) radii.push([R1 * 0.3, -1, 3000]);
  if (has("midband")) radii.push([Rm, 1, 3600]);
  if (has("ring")) radii.push([R1, 1, 5200], [R1 - 22, -1, 4300]);
  if (has("oring")) radii.push([R2, -1, 7600], [R2 - 26, 1, 6400]);
  if (radii.length) ringPulses(ctx, t, cx, cy, radii, (0.25 + 0.3 * (from == null ? 0 : arcSeg(el, cascadeEnd - 600, cascadeEnd + 900))) * breathe);

  // Sparks where lines cross: the star's points, the small circles on the
  // rim and the squares' corners, each on its own slow beat.
  const spark = (x, y, r, i, a) => {
    const v = Math.max(0, Math.sin(t / (1300 + (i % 5) * 270) + i * 2.17));
    glint(ctx, x, y, r, a * v * v * (0.5 + 0.5 * together));
  };
  if (has("crown")) {
    // a soft spark now and then on the crown's medallions
    for (let i = 0; i < 8; i++) {
      const ang = top + (i / 8) * TAU + partTurn("crown", t);
      spark(cx + Math.cos(ang) * S2.R3, cy + Math.sin(ang) * S2.R3, 5, i + 60, 0.4);
    }
  }
  if (has("star")) {
    for (let i = 0; i < 6; i++) {
      const ang = top + (i / 6) * TAU + partTurn("star", t);
      spark(cx + Math.cos(ang) * (R1 - 22), cy + Math.sin(ang) * (R1 - 22), 5, i, 0.6);
    }
  }
  if (has("sats")) {
    for (let i = 0; i < 3; i++) {
      const ang = top + (i / 3) * TAU + Math.PI / 3 + partTurn("sats", t);
      spark(cx + Math.cos(ang) * R1, cy + Math.sin(ang) * R1, 8, i + 20, 0.5);
    }
  }
  if (has("squares")) {
    for (let i = 0; i < 8; i++) {
      const ang = top + (i / 8) * TAU + partTurn("squares", t);
      spark(cx + Math.cos(ang) * (R2 - 26), cy + Math.sin(ang) * (R2 - 26), i % 2 ? 5 : 7, i + 40, 0.65);
    }
  }

  // Glowing dust drifting round between the circles and rising slowly off
  // them, each mote twinkling on its own time, once it comes together.
  if (together > 0) {
    for (let i = 0; i < 60; i++) {
      const r = R1 * 0.5 + hash01(i) * (R2 + 30 - R1 * 0.5);
      const ang = hash01(i + 100) * TAU + (t / (16000 + hash01(i + 200) * 30000)) * (i % 2 ? 1 : -1);
      const life = 5000 + hash01(i + 400) * 6000, ph = ((t + hash01(i + 500) * life) % life) / life;
      const tw = Math.max(0, Math.sin(t / (700 + hash01(i + 300) * 1400) + i)) * Math.sin(Math.PI * ph);
      const a = 0.7 * tw * together;
      if (a < 0.02) continue;
      const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r - ph * 26;
      glowAt(ctx, x, y, 1.6 + hash01(i + 600) * (i % 5 ? 3 : 7), a);
    }
  }
  ctx.restore();
}

addEventListener("resize", () => { if (MG.ctx) { sizeMagic(); if (calm && S) { drawMagic(performance.now() + 10000); drawFrames(performance.now() + 10000); } } });
document.addEventListener("visibilitychange", () => { if (S && !$("table").hidden && MG.cards.length) startMagic(); });

// ── The key word under each card ────────────────────────
// Of a card's keywords, the one most connected to the other cards in the
// spread. Keywords are linked through shared themes: "rest" and "pause"
// both belong to stillness, "grief" and "healing" to the heart's work…
// A keyword shared word for word with another card counts most. With no
// links at all, the card's first (most central) keyword is used.

const THEMES = {
  beginnings: ["begin", "a new start", "spark", "seed", "potential", "opportunit", "venture", "dawn", "readiness", "preparation", "groundwork", "inspiration"],
  intuition:  ["intuition", "inner knowing", "dream", "subconscious", "mystery", "unknown", "imagination", "insight", "perception", "recepti", "sensitiv", "listening", "inner guidance", "inner teacher", "night mind", "beneath the surface"],
  heart:      ["love", "feelings, bonds", "feeling", "emotion", "compassion", "empathy", "romance", "connection", "union", "partnership", "attraction", "care", "kindness", "nurtur", "tender"],
  together:   ["community", "support", "family", "together", "belonging", "team", "collaborat", "cooperat", "sharing", "shared", "lineage", "heritage", "legacy", "group", "support", "partnership", "mutual"],
  stillness:  ["rest", "rest, patience", "pause", "patience", "calm", "serenity", "peace", "retreat", "recovery", "restoration", "waiting", "letting be", "solitude", "replenish", "pacing", "delays"],
  reflection: ["reflection", "looking inward", "contemplation", "review", "re-evaluation", "assessment", "awareness", "discernment", "perspective", "wisdom", "questioning", "inner", "lessons"],
  change:     ["change", "transition", "transition", "ending", "closure", "release", "moving on", "rebirth", "turning", "cycles", "sudden", "breakthrough", "revelation", "clearing", "letting go", "surrender", "liberation", "unfinished", "last step"],
  renewal:    ["renewal", "healing, hope", "hope", "recovery", "rekindled", "restoration", "rebirth", "new dawn", "replenish", "faith", "serenity"],
  truth:      ["truth", "clarity", "honest", "clear", "fairness", "accountab", "reason", "principles", "integrity", "insight", "revelation", "unspoken", "mental fog"],
  will:       ["will", "courage", "determination", "ambition", "action", "courage", "boldness", "conviction", "focus", "momentum", "energy", "passion", "fire", "speed", "standing firm", "persever", "persist", "resilience", "endurance", "strength"],
  structure:  ["structure", "stability", "security", "foundation", "discipline", "authority", "leadership", "control", "rigid", "routine", "responsibility", "boundaries", "tradition", "stewardship", "reliability", "steadiness", "conservation", "saving"],
  abundance:  ["abundance", "giving, receiving", "wealth", "generosity", "giving", "receiving", "reward", "fulfilment", "contentment", "satisfaction", "gratitude", "enough", "pleasure", "comfort"],
  craft:      ["skill", "steady work", "mastery", "practice", "dedication", "diligence", "study", "learning", "effort", "work", "manifestation", "resourceful", "practical", "cultivation", "follow-through", "consistency"],
  joy:        ["joy", "celebration", "play", "pleasure", "happiness", "warmth", "vitality", "milestone", "enthusiasm", "innocence"],
  freedom:    ["freedom", "curiosity", "independence", "free spirit", "spontaneity", "adventure", "exploration", "journey", "discovery", "expansion", "unconventional", "seeking", "curiosity"],
  shadow:     ["attachment", "tender places", "desire", "doubt", "worry", "fear", "self-limiting", "defensive", "conflict", "grief", "heartache", "exhaustion", "weariness", "isolation", "restless", "impatience", "perfectionism", "rigid", "urgency", "friction", "hesitation"],
  balance:    ["balance", "harmony", "moderation", "alignment", "adaptability", "flexibility", "priorities", "juggling", "integration", "wholeness", "heart and mind", "realignment"],
  choice:     ["choice", "direction", "decision", "options", "weighing", "direction", "planning", "vision", "foresight", "intention", "discernment", "crossroad"],
  self:       ["self-", "self-value", "confidence", "authenticity", "recognition", "visibility", "personal truth", "embodiment", "inner child", "validation"],
};

function themesOf(keyword) {
  const k = ` ${keyword.toLowerCase()} `;
  return Object.keys(THEMES).filter((t) => THEMES[t].some((stem) => k.includes(stem)));
}

function spreadKeyword(slot) {
  return linkedKeyword(slot, S.slots.filter((s) => s.card));
}

// entry and spread: { card, reversed } — the card, and every card in its reading.
function linkedKeyword(entry, spread) {
  const own = filled(keywordsFor(entry.card, entry.reversed));
  if (!own.length) return "";
  const others = spread.filter((s) => s !== entry).map((s) => {
    const words = filled(keywordsFor(s.card, s.reversed)).map((w) => w.toLowerCase());
    // How many of that card's keywords fall under each theme.
    const themes = {};
    words.flatMap(themesOf).forEach((t) => { themes[t] = (themes[t] || 0) + 1; });
    return { words, themes };
  });
  let best = own[0], bestScore = 0;
  own.forEach((k) => {
    const mine = themesOf(k);
    const score = others.reduce((sum, o) =>
      sum + (o.words.includes(k.toLowerCase()) ? 3 : 0) + mine.reduce((n, t) => n + (o.themes[t] || 0), 0), 0);
    if (score > bestScore) { best = k; bestScore = score; }
  });
  return best;
}

// ── The reading's summary ───────────────────────────────
// Built from the cards themselves: the themes and words they share,
// their elements, numbers, stars and pictures, and what that adds up to.

const THEME_TEXT = {
  beginnings: ["Beginnings", "something to start", "What is ready to begin?"],
  intuition:  ["Intuition", "inner knowing", "What do you already sense, beneath the thinking?"],
  heart:      ["Heart", "feelings, bonds", "What is your heart asking for?"],
  together:   ["Belonging", "others, support", "Who walks this part of the path with you?"],
  stillness:  ["Stillness", "rest, patience", "Where could a pause serve you more than a push?"],
  reflection: ["Reflection", "looking inward", "What becomes clear when you look inward?"],
  change:     ["Change", "endings, transitions", "What is ready to change, and what is it making room for?"],
  renewal:    ["Renewal", "healing, hope", "What is quietly healing in you?"],
  truth:      ["Truth", "honesty, clarity", "What truth would set things in order?"],
  will:       ["Will", "energy, courage", "Where does your energy want to go?"],
  structure:  ["Foundations", "stability, limits", "What foundation would help you feel secure?"],
  abundance:  ["Abundance", "giving, receiving", "What are you ready to receive?"],
  craft:      ["Craft", "skill, steady work", "What deserves your patient effort?"],
  joy:        ["Joy", "celebration", "What could you let yourself enjoy?"],
  freedom:    ["Exploration", "curiosity", "Where is curiosity leading you?"],
  shadow:     ["Inner work", "tender places", "What tender place is ready to be met with kindness?"],
  balance:    ["Balance", "harmony", "What needs rebalancing?"],
  choice:     ["Choice", "direction", "Which direction feels true to you?"],
  self:       ["Self-worth", "how you value yourself", "How could you value yourself a little more?"],
};

const ELEMENT_TEXT = { Fire: "passion, will", Water: "feelings, dreams", Air: "thought, truth", Earth: "the body, work" };

const NUMBER_TEXT = {
  1: "beginnings", 2: "balance, choice", 3: "growth", 4: "stability", 5: "challenge",
  6: "harmony", 7: "reflection", 8: "mastery", 9: "near completion", 10: "completion",
};

const RANK_TEXT = { Page: "messages, study", Knight: "pursuit", Queen: "inner mastery", King: "outer mastery" };

const isMajorCard = (card) => CARDS.indexOf(card) < 22;

function elementOf(card) {
  const suit = card.name.split(" of ")[1];
  if (suit) return { Wands: "Fire", Cups: "Water", Swords: "Air", Pentacles: "Earth" }[suit] || null;
  const e = (card.correspondences || {}).element || "";
  return ["Fire", "Water", "Air", "Earth"].find((x) => e.includes(x)) || null;
}

const listNames = (xs) => xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

// ── Reading the spread through a lens ───────────────────
// A lens gives each place in the spread a meaning (Past, Challenge,
// Advice…), and each card is read in that place using its inReading
// phrases from cards.js. The summary's buttons switch between lenses.

// How a card reads in each kind of place. {g} = what the card brings,
// {a} = its advice, {c} = its challenge. Two wordings for variety.
const PLACES = {
  past:      ["Past",        ["Behind you: {g}.", "Where you come from: {g}."]],
  present:   ["Present",     ["Now: {g}.", "At the centre right now: {g}."]],
  future:    ["Future",      ["Ahead: {g}.", "Coming into view: {g}."]],
  situation: ["Situation",   ["The situation: {g}.", "What's here: {g}."]],
  challenge: ["Challenge",   ["The challenge: {c}.", "What asks you to grow: {c}."]],
  advice:    ["Advice",      ["The advice: {a}.", "What helps: {a}."]],
  outcome:   ["Outcome",     ["Where this leads: {g}.", "The direction it's taking: {g}."]],
  hidden:    ["Hidden",      ["Beneath the surface: {g}."]],
  root:      ["Root",        ["At the root of it: {g}."]],
  self:      ["You",         ["What you bring: {g}."]],
  other:     ["Them",        ["What they bring: {g}."]],
  between:   ["Between you", ["Between you: {g}."]],
  mind:      ["Mind",        ["In your thoughts: {g}."]],
  body:      ["Body",        ["In your body and daily life: {g}."]],
  heart:     ["Heart",       ["In your heart: {g}."]],
  spirit:    ["Spirit",      ["In your spirit: {g}."]],
  keep:      ["Keep",        ["Worth keeping: {g}."]],
  release:   ["Release",     ["Ready to release: whatever stands in the way of {c}."]],
  welcome:   ["Welcome",     ["Ready to welcome: {g}."]],
  strength:  ["Gift",        ["Your gift: {g}."]],
  pathA:     ["Path A",      ["One path: {g}."]],
  pathB:     ["Path B",      ["The other path: {g}."]],
  message:   ["Message",     ["The message: {g}."]],
  lesson:    ["Lesson",      ["The lesson: {c}."]],
};

// The ways to read a spread, by its number of cards.
const LENSES = {
  1: [["message"], ["advice"], ["lesson"]],
  2: [["present", "future"], ["self", "other"], ["pathA", "pathB"], ["challenge", "advice"], ["keep", "release"]],
  3: [["past", "present", "future"], ["situation", "challenge", "advice"], ["mind", "body", "spirit"],
      ["self", "other", "between"], ["keep", "release", "welcome"], ["root", "present", "outcome"],
      ["strength", "challenge", "advice"]],
  4: [["past", "present", "future", "advice"], ["situation", "challenge", "advice", "outcome"],
      ["mind", "body", "heart", "spirit"], ["self", "other", "between", "outcome"]],
  5: [["past", "present", "future", "challenge", "advice"], ["situation", "hidden", "challenge", "advice", "outcome"],
      ["root", "past", "present", "future", "outcome"], ["mind", "body", "heart", "spirit", "advice"]],
};

// Recognises a spread position's own label ("Past", "The obstacle"…).
const PLACE_WORDS = [
  ["past", /\bpast|behind|before\b/i], ["present", /\bpresent|now|today\b/i], ["future", /\bfuture|next|ahead|coming\b/i],
  ["challenge", /\bchallenge|obstacle|block/i], ["advice", /\badvice|guidance|what to do|action\b/i],
  ["outcome", /\boutcome|result|where it leads/i], ["hidden", /\bhidden|subconscious|unseen\b/i],
  ["root", /\broot|foundation|cause\b/i], ["self", /^(you|yourself|self)$/i], ["other", /\bthem|other|partner\b/i],
  ["between", /\bbetween|relationship\b/i], ["mind", /\bmind\b/i], ["body", /\bbody\b/i], ["heart", /\bheart\b/i],
  ["spirit", /\bspirit|soul\b/i], ["strength", /\bstrength|gift\b/i],
];

function placeOf(label) {
  const hit = PLACE_WORDS.find(([, re]) => re.test(label || ""));
  return hit ? hit[0] : null;
}

// The lenses on offer: the spread's own positions first, if they say something.
function lensesFor(entries) {
  const n = entries.length;
  const out = [];
  const labelled = entries.some((e) => e.label && !/^card \d+$/i.test(e.label) && e.label !== "Your card");
  if (labelled) {
    out.push({ name: "As laid out", places: entries.map((e) => placeOf(e.label) || "own"), own: true });
  }
  (LENSES[Math.min(n, 5)] || []).forEach((places) => {
    if (places.length !== n) return;
    out.push({ name: places.map((p) => PLACES[p][0]).join(" · "), places });
  });
  return out;
}

function phrases(card, reversed) {
  const r = card.inReading || {};
  const g = (reversed ? r.reversed : r.upright) || filled(keywordsFor(card, reversed)).slice(0, 2).join(" and ");
  const a = (reversed ? r.reversedAdvice : r.advice) || r.advice || `stay with ${g}`;
  const c = r.challenge || g;
  return { g, a, c };
}

// One card read in one place of the lens.
function placeLine(entry, place, i) {
  const { g, a, c } = phrases(entry.card, entry.reversed);
  // A reversed card also carries its advice, so it always points somewhere.
  const withAdvice = (line) => (entry.reversed ? `${line.slice(0, -1)}; ${a}.` : line);
  if (place === "own") return withAdvice(`${entry.label}: ${g}.`);
  const forms = PLACES[place][1];
  const form = forms[(CARDS.indexOf(entry.card) + i) % forms.length];
  const line = form.replace("{g}", g).replace("{a}", a).replace("{c}", c);
  return form.includes("{g}") ? withAdvice(line) : line;
}

const placeName = (lens, i, entry) => (lens.own ? entry.label : PLACES[lens.places[i]][0]);

// ── How a card follows the one before it ────────────────
// A short note shown under the later card's line in "The reading".

const numberOf = (card) => (card.court ? null : +((card.correspondences || {}).number || NaN));

function pairLine(a, b) {
  const bits = [];
  const na = numberOf(a.card), nb = numberOf(b.card);
  const minorA = !isMajorCard(a.card), minorB = !isMajorCard(b.card);
  if (minorA && minorB && na >= 1 && nb >= 1) {
    if (nb === na + 1) bits.push("numbers climb: a step forward");
    else if (nb === na) bits.push("same number: its lesson underlined");
    else if (nb < na) bits.push("numbers fall: an earlier stage");
  }
  if (!minorA && minorB) bits.push("a big lesson enters daily life");
  if (minorA && !minorB) bits.push("a daily matter opens up");
  if (!a.reversed && b.reversed) bits.push("energy turns inward");
  if (a.reversed && !b.reversed) bits.push("held energy flows");
  if (!bits.length) return "";
  return bits.slice(0, 2).join("; ");
}

// ── The arc of the whole spread ─────────────────────────
// One line on where the spread travels, from its first card to its last:
// these clauses, then the number arcs (numberArcBits), joined. (Themes,
// elements and counts have their own tiles, so they aren't repeated here.)

function arcBits(entries) {
  const n = entries.length;
  if (n < 2) return [];
  const themes = entries.map((e) => new Set(filled(keywordsFor(e.card, e.reversed)).map((w) => w.toLowerCase()).flatMap(themesOf)));
  const first = themes[0], last = themes[n - 1];
  const has = (set, ...ts) => ts.some((t) => set.has(t));
  const bits = [];
  if (has(first, "change", "shadow") && has(last, "renewal", "beginnings", "joy")) bits.push("from a hard place to renewal");
  else if (has(first, "stillness", "shadow", "reflection") && has(last, "will", "freedom", "beginnings")) bits.push("from rest to action");
  else if (has(first, "will", "freedom") && has(last, "stillness", "reflection")) bits.push("from effort to rest");
  else if (has(first, "heart", "together") && has(last, "self", "freedom")) bits.push("from others to yourself");
  // Pairs already note a single card turning; this is the spread as a whole.
  if (n >= 3) {
    const half = Math.ceil(n / 2);
    const earlyRev = entries.slice(0, half).filter((e) => e.reversed).length;
    const lateRev = entries.slice(half).filter((e) => e.reversed).length;
    if (earlyRev && !lateRev) bits.push("opening up as it goes");
    if (!earlyRev && lateRev) bits.push("turning inward as it goes");
  }
  return bits;
}

// ── The summary itself ──────────────────────────────────
// Card names stay in the row of cards at the top; the text speaks of
// places and patterns instead.

const countOf = (k, n) => (n === 2 && k === 2 ? "both cards" : `${k} of the ${n} cards`);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// The places (0, 1, 2…) of the cards in a spread that pass a test.
const whichCards = (entries, test) => entries.map((e, i) => (test(e, i) ? i : -1)).filter((i) => i >= 0);

// The themes each card's keywords touch, one set per card.
const themeSets = (entries) =>
  entries.map((e) => new Set(filled(keywordsFor(e.card, e.reversed)).map((w) => w.toLowerCase()).flatMap(themesOf)));

// A section of the summary. Its items are either list lines
// { head, text, cards } or, with tiles: true, small tiles seen at a glance:
// { top, n, main, note, tone, cards } — e.g. n 2, main "crowns".
// perCard: one tile per card, lined up like the row of cards.
// Every item's `cards` are the places it is found in, so tapping it can
// light them up (see the threads in openSummary).
const part = (title, items, opts = {}) => ({ title, items, ...opts });

const NUMBER_WORDS = ["", "aces", "twos", "threes", "fours", "fives", "sixes", "sevens", "eights", "nines", "tens"];
const ELEMENTS = ["Fire", "Water", "Air", "Earth"];

function patternParts(entries) {
  const n = entries.length;
  const parts = [];
  const kw = entries.map((e) => filled(keywordsFor(e.card, e.reversed)).map((w) => w.toLowerCase()));
  const sets = themeSets(entries);
  const tally = (lists) => {
    const c = {};
    lists.forEach((s) => new Set(s).forEach((x) => (c[x] = (c[x] || 0) + 1)));
    return c;
  };
  const top = (c, k) => Object.keys(c).filter((x) => c[x] >= 2).sort((a, b) => c[b] - c[a]).slice(0, k);

  // Themes.
  const themeCount = tally(sets);
  const themes = top(themeCount, 4);
  if (themes.length) {
    parts.push(part("Themes", themes.map((t) => ({
      n: themeCount[t], main: THEME_TEXT[t][0], note: THEME_TEXT[t][1],
      cards: whichCards(entries, (e, i) => sets[i].has(t)),
    })), { tiles: true }));
  }

  // Words shared by two or more cards: whole keywords, or words inside them.
  const STOP = new Set(["with", "from", "into", "your", "self", "that", "the", "and", "what", "inner", "new"]);
  const seen = kw.map((words) => {
    const s = new Set();
    words.forEach((k) => {
      s.add(k);
      k.split(/[\s-]+/).filter((w) => w.length > 3 && !STOP.has(w)).forEach((w) => s.add(w));
    });
    return s;
  });
  const wordCount = tally(seen);
  const words = Object.keys(wordCount).filter((w) => wordCount[w] >= 2)
    .sort((a, b) => wordCount[b] - wordCount[a] || b.length - a.length);
  const shown = words.filter((w) => !words.some((o) => o !== w && o.includes(w) && wordCount[o] === wordCount[w])).slice(0, 6);
  if (shown.length) {
    parts.push(part("Shared words", shown.map((w) => ({
      n: wordCount[w], main: w, cards: whichCards(entries, (e, i) => seen[i].has(w)),
    })), { tiles: true }));
  }

  // What's in the pictures (symbols.js).
  const pics = entries.map((e) => new Set((PICTURES[e.card.name] || {}).symbols || []));
  const symCount = tally(pics);
  const syms = top(symCount, 6).filter((x) => SYMBOLS[x]);
  // (Shown together with the symbolism below, as "Symbols".)
  const picTiles = syms.map((x) => ({
    n: symCount[x], main: SYMBOLS[x].name, note: SYMBOLS[x].meaning,
    cards: whichCards(entries, (e, i) => pics[i].has(x)),
  }));

  // Elements: all four, the missing ones dimmed.
  const els = {};
  entries.forEach((e) => { const x = elementFor(e.card); if (x) els[x] = (els[x] || 0) + 1; });
  const topEl = Object.keys(els).sort((a, b) => els[b] - els[a])[0];
  if (n >= 2) {
    parts.push(part("Elements", [...ELEMENTS].sort((a, b) => (els[b] || 0) - (els[a] || 0)).map((x) => ({
      n: els[x] || 0, main: x, note: els[x] ? ELEMENT_TEXT[x].split(",")[0] : "missing",
      tone: els[x] ? (els[x] >= 2 && x === topEl ? "good" : "") : "quiet",
      cards: whichCards(entries, (e) => elementFor(e.card) === x),
    })), { tiles: true, cols: 4 }));
  }

  // Symbolism: Major cards, numbers, ranks, stars, reversals.
  const sym = [];
  const majorCards = whichCards(entries, (e) => isMajorCard(e.card));
  const majors = majorCards.length;
  if (majors >= 2 && majors >= Math.ceil(n / 2)) sym.push({ n: majors, main: "Major", note: "life lessons", cards: majorCards });
  else if (!majors && n >= 3) sym.push({ n: 0, main: "Major", note: "everyday matters", tone: "quiet" });
  const nums = tally(entries.map((e) => { const x = numberOf(e.card); return x >= 1 && x <= 10 ? [x] : []; }));
  top(nums, 3).forEach((k) => sym.push({ n: nums[k], main: NUMBER_WORDS[k], note: NUMBER_TEXT[k],
    cards: whichCards(entries, (e) => numberOf(e.card) === +k) }));
  const ranks = tally(entries.map((e) => (e.card.court ? [rankOf(e.card)] : [])));
  top(ranks, 4).forEach((r) => sym.push({ n: ranks[r], main: `${r}s`, note: RANK_TEXT[r],
    cards: whichCards(entries, (e) => e.card.court && rankOf(e.card) === r) }));
  const stars = tally(entries.map((e) => starsOf(e.card)));
  top(stars, 3).forEach((s) => sym.push({ n: stars[s], main: s, note: "astrology",
    cards: whichCards(entries, (e) => starsOf(e.card).includes(s)) }));
  const revCards = whichCards(entries, (e) => e.reversed);
  const revs = revCards.length;
  if (revs && revs >= Math.ceil(n / 2)) sym.push({ n: revs, main: "reversed", note: "still forming", cards: revCards });
  // Symbols: what's in the pictures and the cards' symbolism, as one set of
  // tiles, the most shared first (the sort keeps ties in order), at most 3 rows.
  const symbols = [...picTiles, ...sym].sort((a, b) => b.n - a.n).slice(0, 9);
  if (symbols.length) parts.push(part("Symbols", symbols, { tiles: true }));
  return { parts, themes, topEl, els, majors, revs };
}

// ── Deeper patterns: how the cards act on each other ────
// These name the cards by their place in the spread, so they follow
// the lens: nameOf(i) gives the name of place i.

// Where the figures look. The spread is laid out left to right, so a
// figure looking right looks toward the next card, one looking left
// toward the card before. A reversed card turns its gaze around.
function facingOf(e) {
  const f = (PICTURES[e.card.name] || {}).facing || "";
  if (!e.reversed) return f;
  return f === "left" ? "right" : f === "right" ? "left" : f;
}

function gazePart(entries, nameOf) {
  const n = entries.length;
  const f = entries.map(facingOf);
  if (n < 2 || !f.some(Boolean)) return null;
  const tiles = f.map((d, i) => ({
    top: nameOf(i),
    main: { left: "←", right: "→", back: "↑" }[d] || "·",
    note: d === "left" ? (i ? "back" : "outward")
      : d === "right" ? (i < n - 1 ? "ahead" : "beyond")
      : d === "back" ? "away" : "",
    tone: d ? "" : "quiet",
    cards: d === "left" && i ? [i - 1, i] : d === "right" && i < n - 1 ? [i, i + 1] : [i],
  }));
  const list = [];
  const lefts = whichCards(entries, (e, i) => f[i] === "left");
  const rights = whichCards(entries, (e, i) => f[i] === "right");
  if (n >= 3 && lefts.length >= Math.ceil(n * 0.6)) list.push({ head: "Most look back", text: "The past holds the attention.", cards: lefts });
  else if (n >= 3 && rights.length >= Math.ceil(n * 0.6)) list.push({ head: "Most look ahead", text: "The reading leans forward.", cards: rights });
  for (let i = 0; i < n - 1; i++) {
    if (f[i] === "right" && f[i + 1] === "left") list.push({ head: `${nameOf(i)} → ← ${nameOf(i + 1)}`, text: "Face to face: read them together.", cards: [i, i + 1] });
    if (f[i] === "left" && f[i + 1] === "right") list.push({ head: `${nameOf(i)} ← → ${nameOf(i + 1)}`, text: "Back to back: not yet speaking.", cards: [i, i + 1] });
  }
  return part("Gaze", tiles, { tiles: true, perCard: true, list });
}

// Cards that mirror each other: the same force seen from two sides.
const MIRRORS = [
  ["The Magician", "The High Priestess", "doing and knowing"],
  ["The Empress", "The Emperor", "nurture and structure"],
  ["The High Priestess", "The Hierophant", "inner and taught wisdom"],
  ["The Lovers", "The Devil", "a chosen bond, a binding one"],
  ["The Chariot", "Strength", "force and gentleness"],
  ["Justice", "The Hanged Man", "deciding and surrendering"],
  ["Death", "Judgement", "an ending, then an awakening"],
  ["Temperance", "The Devil", "moderation and excess"],
  ["The Tower", "The Star", "the fall, then hope"],
  ["The Moon", "The Sun", "fear and clarity"],
  ["The Fool", "The World", "the start and the completion"],
  ["Wheel of Fortune", "The World", "a turn and an arrival"],
];

// Themes that pull against each other when different cards carry them.
const TENSIONS = [
  ["stillness", "will", "Rest ↔ action", "pause or push?", "How could rest and action both have their place?"],
  ["freedom", "structure", "Freedom ↔ roots", "roam or settle?", "How could you be free and still feel held?"],
  ["heart", "truth", "Heart ↔ head", "feeling and thinking disagree", "Where do your heart and your head disagree?"],
  ["joy", "shadow", "Joy ↔ hurt", "both are here", "Can joy and what still hurts sit side by side?"],
  ["self", "together", "Self ↔ others", "both need room", "How could you honour yourself and the people around you?"],
  ["change", "structure", "Change ↔ stability", "move or hold?", "What needs to change, and what needs to stay?"],
  ["intuition", "craft", "Dream ↔ work", "vision needs practice", "How could a dream be given a practical first step?"],
];

function tensionsOf(entries) {
  const sets = themeSets(entries);
  return TENSIONS.map(([a, b, head, text, ask]) => {
    const A = whichCards(entries, (e, i) => sets[i].has(a) && !sets[i].has(b));
    const B = whichCards(entries, (e, i) => sets[i].has(b) && !sets[i].has(a));
    return A.length && B.length ? { head, text, ask, cards: [...A, ...B].sort((x, y) => x - y) } : null;
  }).filter(Boolean).slice(0, 2);
}

// As compact tiles: { top, main, note, cards } — e.g. main "Rest ↔ action",
// note "pause or push?".
function mirrorItems(entries, nameOf) {
  const items = [];
  const sorted = (...xs) => xs.sort((x, y) => x - y);
  const at = (name) => entries.findIndex((e) => e.card.name === name);
  const short = (name) => name.replace(/^The /, "");
  MIRRORS.forEach(([a, b, text]) => {
    const i = at(a), j = at(b);
    if (i >= 0 && j >= 0) items.push({ main: `${short(a)} ↔ ${short(b)}`, note: text, cards: sorted(i, j) });
  });
  // The beginning and the end of a suit; the inner and outer mastery of an element.
  entries.forEach((e, i) => {
    const suit = e.card.name.split(" of ")[1];
    if (!suit) return;
    entries.forEach((g, j) => {
      if (j === i || g.card.name.split(" of ")[1] !== suit) return;
      if (e.card.name.startsWith("Ace") && g.card.name.startsWith("Ten")) {
        items.push({ top: suit, main: "Ace ↔ Ten", note: "seed to harvest", cards: sorted(i, j) });
      }
      if (rankOf(e.card) === "Queen" && rankOf(g.card) === "King") {
        items.push({ top: suit, main: "Queen ↔ King", note: "inner, outer mastery", cards: sorted(i, j) });
      }
    });
  });
  // A Major card's number echoed by a Minor card.
  entries.forEach((e, i) => {
    const k = CARDS.indexOf(e.card);
    if (k < 1 || k > 10) return;
    const echo = whichCards(entries, (g) => !isMajorCard(g.card) && numberOf(g.card) === k);
    if (echo.length) items.push({ top: [i, ...echo].map(nameOf).join(" ↔ "), main: `${k} ↔ ${k}`, note: "lesson in daily life", cards: sorted(i, ...echo) });
  });
  tensionsOf(entries).forEach(({ head, text, cards }) => items.push({ main: head, note: text, cards }));
  return items.slice(0, 5);
}

// ── Number arcs ─────────────────────────────────────────
// The Fool's journey through the Major cards, in three rows of seven.
const STAGES = ["the threshold", "the outer world", "the inner world", "the greater forces"];
const stageOf = (k) => (k === 0 ? 0 : k <= 7 ? 1 : k <= 14 ? 2 : 3);

// Short clauses for the reading's arc line (see arcBits): how the Minor
// cards' numbers move, and where the Major cards sit on the Fool's journey.
// nameOf(i) names place i in the chosen lens.
function numberArcBits(entries, nameOf) {
  const bits = [];
  const pips = whichCards(entries, (e) => !isMajorCard(e.card) && numberOf(e.card) >= 1);
  if (pips.length >= 3) {
    const v = pips.map((i) => numberOf(entries[i].card));
    const d = v.slice(1).map((x, k) => Math.sign(x - v[k]));
    const max = Math.max(...v), min = Math.min(...v);
    const peak = v.indexOf(max), low = v.indexOf(min);
    if (d.every((x) => x >= 0) && d.some((x) => x > 0)) bits.push("the numbers rise");
    else if (d.every((x) => x <= 0) && d.some((x) => x < 0)) bits.push("the numbers fall back");
    else if (peak > 0 && peak < v.length - 1 && d[0] > 0 && d[d.length - 1] < 0) bits.push(`the numbers peak at ${nameOf(pips[peak])}`);
    else if (low > 0 && low < v.length - 1 && d[0] < 0 && d[d.length - 1] > 0) bits.push(`the numbers dip at ${nameOf(pips[low])}`);
    else if (d.some((x) => x)) bits.push("the numbers rise and fall");
  }
  const majors = whichCards(entries, (e) => isMajorCard(e.card));
  const st = majors.map((i) => stageOf(CARDS.indexOf(entries[i].card)));
  if (majors.length >= 2) {
    const kinds = [...new Set(st)];
    if (kinds.length === 1) bits.push(`the Majors all from ${STAGES[kinds[0]]}`);
    else if (st.every((s, k) => !k || s >= st[k - 1])) bits.push("forward on the Fool's journey");
    else if (st.every((s, k) => !k || s <= st[k - 1])) bits.push("back on the Fool's journey");
    else bits.push("across the Fool's journey");
  }
  return bits;
}

// What the reading asks: questions for the spread as a whole (from its
// themes, elements and patterns), then one from each card, headed by the
// place it holds in the chosen lens.
const ELEMENT_ASK = {
  Fire:  ["Where is your energy and courage pulling you?", "Where could a little more passion or courage help?"],
  Water: ["What are your feelings telling you here?", "What would change if you let yourself feel this fully?"],
  Air:   ["What would an honest, clear look show you?", "What thought or conversation is waiting to be had?"],
  Earth: ["What practical step would ground this?", "What would help this take root in daily life?"],
};
function summaryQuestions(entries, lens) {
  const n = entries.length;
  const { themes, topEl, els, majors, revs } = patternParts(entries);
  const whole = themes.slice(0, 3).map((t) => THEME_TEXT[t][2]);
  if (topEl && els[topEl] >= 2) whole.push(ELEMENT_ASK[topEl][0]);
  const missing = Object.keys(ELEMENT_ASK).filter((x) => !els[x]);
  if (n >= 4 && missing.length === 1) whole.push(ELEMENT_ASK[missing[0]][1]);
  if (majors >= 2 && majors >= Math.ceil(n / 2)) whole.push("What larger lesson might this chapter be teaching you?");
  if (revs && revs >= Math.ceil(n / 2)) whole.push("What is still forming, and needs time rather than pressure?");
  if (n >= 3) whole.push("How do the first card and the last speak to each other?");
  // From the deeper patterns: a tension, two figures facing each other.
  const nameOf = (i) => (lens ? placeName(lens, i, entries[i]) : entries[i].label || entries[i].card.name);
  const t = tensionsOf(entries)[0];
  if (t) whole.push(t.ask);
  const f = entries.map(facingOf);
  const meet = f.findIndex((d, i) => d === "right" && f[i + 1] === "left");
  if (meet >= 0) whole.push(`What are ${nameOf(meet)} and ${nameOf(meet + 1)} saying to each other?`);
  whole.push("What is one small step you could take this week?");
  if (!themes.length) whole.unshift(n > 1 ? "What links these cards for you?" : "Where does this card show up in your life right now?");

  // As many questions for the reading as it has cards (each card asks one too).
  const asked = [...new Set(whole)].slice(0, n);
  const used = new Set(asked);
  const each = entries.map((e, i) => {
    const q = filled(questionsFor(e.card, e.reversed)).find((x) => !used.has(x));
    if (!q) return null;
    used.add(q);
    return { head: lens ? placeName(lens, i, e) : e.label || e.card.name, text: q };
  }).filter(Boolean);
  return { whole: asked, each };
}
// The questions, in two boxes: the reading's own, and one from each card.
function fillSummaryAsks(wholeBox, eachBox, entries, lens) {
  const { whole, each } = summaryQuestions(entries, lens);
  wholeBox.innerHTML = "";
  wholeBox.append(el("p", "asks-title", "The reading asks"));
  const ul = el("ul");
  whole.forEach((q) => ul.append(el("li", "", q)));
  wholeBox.append(ul);
  eachBox.innerHTML = "";
  eachBox.hidden = !each.length;
  if (!each.length) return;
  eachBox.append(el("p", "asks-title", "Each card asks"));
  const ul2 = el("ul", "asks-each");
  each.forEach(({ head, text }) => {
    const li = el("li");
    li.append(el("strong", "", head), el("span", "", text));
    ul2.append(li);
  });
  eachBox.append(ul2);
}

// Buttons that belong together stay one line each, all at the same size:
// the text shrinks together until the longest one fits.
function fitOneLine(buttons) {
  const fit = () => {
    if (!buttons[0] || !buttons[0].isConnected) return;
    buttons.forEach((b) => (b.style.fontSize = ""));
    const base = parseFloat(getComputedStyle(buttons[0]).fontSize);
    let k = 1;
    buttons.forEach((b) => {
      const cs = getComputedStyle(b);
      const room = b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const need = b.scrollWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      if (need > room && room > 0) k = Math.min(k, room / need);
    });
    if (k < 1) buttons.forEach((b) => (b.style.fontSize = `${Math.max(10, Math.floor(base * k * 0.98 * 2) / 2)}px`));
  };
  requestAnimationFrame(fit);
  document.fonts?.ready.then(fit);
  const ro = new ResizeObserver(fit);
  ro.observe(buttons[0]);
}

// A pattern found in certain cards can be tapped to light them up.
function threadable(node, cards, head) {
  if (!cards || !cards.length) return;
  node.dataset.cards = cards.join(",");
  node.dataset.head = head || "";
  node.tabIndex = 0;
  node.setAttribute("role", "button");
  node.setAttribute("aria-pressed", "false");
}

function listItems(items) {
  const ul = el("ul");
  items.forEach(({ head, text, sub, link, cards }) => {
    const li = el("li");
    threadable(li, cards, head);
    if (head) li.append(el("strong", "", head));
    // link: how this card follows the one before it
    if (link) li.append(el("em", "summary-link", `↳ ${cap(link)}`));
    li.append(el("span", "", text));
    if (sub) li.append(el("em", "summary-q", sub));
    ul.append(li);
  });
  return ul;
}

function listSection(title, items) {
  const sec = el("section", "summary-part");
  sec.append(el("p", "asks-title", title), listItems(items));
  return sec;
}

// A section from part(): small tiles in a grid (one per card, lined up
// like the row of cards, when perCard), or plain list lines.
function partSection(p, cardCols) {
  if (!p.tiles) return listSection(p.title, p.items);
  const sec = el("section", "summary-part tile-part");
  sec.append(el("p", "asks-title", p.title));
  // Per card: one column per card, like the row of cards. Otherwise tiles
  // share the full width in balanced rows (1, 2, 3 across; 4 → 2 + 2,
  // 5 → 3 + 2); a fixed count (the four elements) sets its own columns.
  // wrap: a tile's lines may wrap (for longer pairs like card names).
  const grid = el("div", `tiles${p.perCard ? " per-card" : p.cols ? " wide" : ""}${p.wrap ? " wrap" : ""}`);
  const k = p.items.length;
  if (p.perCard) grid.style.setProperty("--cols", cardCols);
  else grid.style.setProperty("--per", p.cols || (k <= 3 ? k : Math.ceil(k / Math.ceil(k / 3))));
  p.items.forEach((t) => {
    const tile = el("div", `tile${t.tone ? ` ${t.tone}` : ""}`);
    if (t.top) tile.append(el("span", "tile-top", t.top));
    tile.append(el("span", "tile-main", t.n != null ? cap(String(t.main)) : t.main));
    // The count as pips, one for each card it is found in (a ring for none).
    if (t.n != null) {
      const pips = el("span", "tile-pips", t.n ? Array(t.n).fill("●").join("\u200b") : "○");
      pips.setAttribute("aria-label", `in ${t.n} card${t.n === 1 ? "" : "s"}`);
      tile.append(pips);
    }
    if (t.note) tile.append(el("span", "tile-note", t.note));
    threadable(tile, t.cards, [t.top, t.n, t.main].filter((x) => x != null && x !== "").join(" "));
    grid.append(tile);
  });
  sec.append(grid);
  if (p.legend) sec.append(el("p", "tile-legend", p.legend));
  if (p.list && p.list.length) sec.append(listItems(p.list));
  return sec;
}

// A golden thread through the lit cards of a row: a gentle arc from one
// card's centre to the next, drawn over the row in an SVG of its own.
const SVG_NS = "http://www.w3.org/2000/svg";
function drawThread(box, targets, lit, animate) {
  box.querySelectorAll(":scope > .thread-svg").forEach((s) => s.remove());
  if (lit.length < 2) return;
  const r = box.getBoundingClientRect();
  if (!r.width) return;
  const pts = lit.map((i) => {
    const b = targets[i].getBoundingClientRect();
    return [b.left - r.left + b.width / 2, b.top - r.top + b.height / 2];
  });
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let k = 1; k < pts.length; k++) {
    const [x0, y0] = pts[k - 1], [x1, y1] = pts[k];
    const lift = Math.max(8, Math.hypot(x1 - x0, y1 - y0) * 0.22);
    d += ` Q${(x0 + x1) / 2},${(y0 + y1) / 2 - lift} ${x1},${y1}`;
  }
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "thread-svg");
  svg.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", d);
  svg.append(path);
  pts.forEach(([x, y]) => {
    const c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("cx", x);
    c.setAttribute("cy", y);
    c.setAttribute("r", 3.5);
    svg.append(c);
  });
  box.append(svg);
  if (animate && !calm) {
    const len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
      { duration: 500 + 140 * pts.length, easing: "cubic-bezier(.4,0,.2,1)" });
    [...svg.querySelectorAll("circle")].forEach((c, k) => c.animate(
      [{ opacity: 0, transform: "scale(0)" }, { opacity: 1, transform: "scale(1)" }],
      { duration: 300, delay: k * 140, fill: "backwards", easing: "ease-out" }));
  }
}

// entries: [{ card, reversed, label, question }]
// magic = arrive out of the light of the summon, instead of sliding up.
function openSummary(entries, title, magic = false) {
  const n = entries.length;
  const sheet = el("div", "sheet details");
  const bar = el("header", "bar");
  const back = el("button", "link", "‹ Back");
  bar.append(back, el("span", "bar-title", "Reading summary"), el("span", "bar-space"));

  // Two columns on a wide screen: the cards and the lens on the left,
  // the reading on the right. On a phone they stack.
  const body = el("div", "details-body two-col summary-page");
  const side = el("div", "col-side"), main = el("div", "col-main");
  body.append(side, main);
  side.append(el("h2", "summary-title", title));

  // The cards, with the place each one holds in the chosen lens.
  const items = entries.map((e) => detailsItem(e.card, e.reversed, e.label, e.question || ""));
  // All the cards in view at once, never a sideways scroll: one row up
  // to five, then two (or more) even rows.
  const row = el("div", "summary-cards");
  const cardCols = n <= 5 ? n : Math.min(5, Math.ceil(n / 2));
  row.style.setProperty("--cols", cardCols);
  const placeLabels = entries.map((e, i) => {
    const b = el("button", "related-card");
    const lab = el("span", "related-label");
    const pic = el("div", "related-pic");
    const face = cardFace(e.card, true, e.reversed);
    face.style.height = "100%";
    pic.append(face);
    b.append(lab, pic, el("span", "related-name", e.card.name));
    const k = linkedKeyword(e, entries);
    if (k) b.append(el("span", "summary-kw", k));
    b.addEventListener("click", () => openDetails(items, i));
    row.append(b);
    return lab;
  });
  side.append(row);

  // Threads: tapping a pattern lights up the cards it is found in, joined
  // by a golden thread. When the row of cards has scrolled out of view (on
  // a phone), a slim strip of the cards rises at the bottom to show it.
  const cardEls = [...row.children];
  const strip = el("div", "thread-strip");
  strip.hidden = true;
  const stripHead = el("span", "thread-strip-head");
  const stripRow = el("div", "thread-strip-row");
  const stripClose = el("button", "thread-strip-close", "×");
  stripClose.setAttribute("aria-label", "Hide the thread");
  const minis = entries.map((e, i) => {
    const m = el("button", "thread-mini");
    m.setAttribute("aria-label", e.card.name);
    const face = cardFace(e.card, true, e.reversed);
    face.style.height = "100%";
    m.append(face);
    m.addEventListener("click", () => openDetails(items, i));
    stripRow.append(m);
    return m;
  });
  strip.append(stripHead, stripRow, stripClose);
  let thread = null;     // { li, cards, head }
  let rowInView = true;
  const showThread = (animate = false) => {
    if (thread && !thread.li.isConnected) thread = null;   // its section was redrawn
    const lit = thread ? thread.cards : [];
    [[row, cardEls], [stripRow, minis]].forEach(([box, list]) => {
      box.classList.toggle("threading", !!thread);
      list.forEach((c, i) => c.classList.toggle("lit", lit.includes(i)));
    });
    strip.hidden = !thread || rowInView;
    sheet.classList.toggle("has-strip", !strip.hidden);
    if (thread) stripHead.textContent = thread.head;
    drawThread(row, cardEls.map((c) => c.querySelector(".related-pic")), lit, animate);
    drawThread(stripRow, minis, strip.hidden ? [] : lit, animate);
  };
  const pickThread = (li) => {   // li: any tappable pattern, line or tile
    if (thread) { thread.li.classList.remove("on"); thread.li.setAttribute("aria-pressed", "false"); }
    if (!li || (thread && thread.li === li)) { thread = null; showThread(); return; }
    li.classList.add("on");
    li.setAttribute("aria-pressed", "true");
    thread = { li, cards: li.dataset.cards.split(",").map(Number), head: li.dataset.head };
    rowInView = rowShows();
    showThread(true);
  };
  main.addEventListener("click", (ev) => {
    const li = ev.target.closest("[data-cards]");
    if (li) pickThread(li);
  });
  main.addEventListener("keydown", (ev) => {
    const li = ev.target.closest("[data-cards]");
    if (li && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); pickThread(li); }
  });
  stripClose.addEventListener("click", () => pickThread(null));
  // Is most of the row of cards still on screen?
  const rowShows = () => {
    const r = row.getBoundingClientRect(), s = sheet.getBoundingClientRect();
    const seen = Math.min(r.bottom, s.bottom) - Math.max(r.top, s.top);
    return r.height > 0 && seen > r.height * 0.4;
  };
  let ticking = false;
  sheet.addEventListener("scroll", () => {
    if (ticking || !thread) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const now = rowShows();
      if (now !== rowInView) { rowInView = now; showThread(!now); }
    });
  }, { passive: true });
  new ResizeObserver(() => thread && showThread()).observe(row);

  // Every lens as its own button; the chosen one is lit, and the parts
  // that change with it follow.
  const lenses = lensesFor(entries);
  const lensBox = el("div", "lens");
  lensBox.setAttribute("role", "group");
  lensBox.setAttribute("aria-label", "Read it as");
  // The page's layout, top to bottom (side by side on a wide screen):
  //   left:  the reading (shared words right under its title, then the
  //          arc line, number arcs included), themes
  //   right: symbols, gaze, mirrors & tensions, elements
  //   below: the reading asks (left), each card asks (right)
  // Slots marked "lens" are refilled when the lens changes.
  const leftCol = el("div", "sum-col"), rightCol = el("div", "sum-col");
  const lensPart = el("div", "sum-slot");     // lens
  const gazeSlot = el("div", "sum-slot");     // lens
  const mirrorSlot = el("div", "sum-slot");   // lens
  const asks = el("div", "asks summary-asks");
  const asksEach = el("div", "asks summary-asks");
  const spreadArc = arcBits(entries);
  // The patterns that don't depend on the lens, by their titles.
  const patterns = {};
  patternParts(entries).parts.forEach((p) => (patterns[p.title] = p));
  // Shared words: their tiles alone (no title of their own), under the
  // reading's title. A fresh copy each time the reading is redrawn.
  const sharedTiles = () => patterns["Shared words"] && partSection(patterns["Shared words"], cardCols).querySelector(".tiles");
  let current = 0;
  const render = () => {
    const lens = lenses[current];
    [...lensBox.children].forEach((c, i) => {
      c.classList.toggle("on", i === current);
      c.setAttribute("aria-pressed", i === current ? "true" : "false");
    });
    entries.forEach((e, i) => { placeLabels[i].textContent = lens ? placeName(lens, i, e) : e.label || ""; });
    // The deeper patterns name the cards by their place, so they follow the lens.
    const nameOf = (i) => (lens ? placeName(lens, i, entries[i]) : entries[i].label || entries[i].card.name);
    const fill = (slot, p) => {
      slot.innerHTML = "";
      if (p && p.items.length) slot.append(partSection(p, cardCols));
    };
    // The arc line: where the spread travels, then how its numbers move.
    const bits = [...spreadArc, ...numberArcBits(entries, nameOf)];
    const arc = bits.length ? `${cap(bits.join(", "))}.` : "";
    fill(gazeSlot, gazePart(entries, nameOf));
    fill(mirrorSlot, part("Mirrors & tensions", mirrorItems(entries, nameOf), { tiles: true, wrap: true }));
    fillSummaryAsks(asks, asksEach, entries, lens);
    lensPart.innerHTML = "";
    if (lens) {
      // One section: the arc of the whole spread on top, then each card in
      // its place, with a short note on how it follows the card before it.
      const sec = listSection("The reading", entries.map((e, i) => ({
        head: placeName(lens, i, e),
        // The place is already the heading, so drop the line's own "Ahead: " lead-in.
        text: (() => { const t = placeLine(e, lens.places[i], i).replace(/^[^:]+:\s*/, ""); return t.charAt(0).toUpperCase() + t.slice(1); })(),
        sub: lens.own && e.question ? e.question : "",
        link: i ? pairLine(entries[i - 1], e) : "",
        cards: [i],
      })));
      const title = sec.querySelector(".asks-title");
      if (arc) title.after(el("p", "summary-arc", arc));
      const sw = sharedTiles();
      if (sw) title.after(sw);
      lensPart.append(sec);
    } else if (arc || patterns["Shared words"]) {
      const sec = el("section", "summary-part");
      sec.append(el("p", "asks-title", "The reading"));
      const sw = sharedTiles();
      if (sw) sec.append(sw);
      if (arc) sec.append(el("p", "summary-arc", arc));
      lensPart.append(sec);
    }
    showThread();
  };
  lenses.forEach((lens, i) => {
    const b = el("button", "lens-btn", lens.name);
    b.addEventListener("click", () => { current = i; render(); });
    lensBox.append(b);
  });
  if (lenses.length > 1) {
    side.append(el("p", "lens-title", "Read it as"), lensBox);
    fitOneLine([...lensBox.children]);
  }
  render();

  const sectionOf = (title) => patterns[title] && partSection(patterns[title], cardCols);
  const put = (col, ...xs) => xs.forEach((x) => x && col.append(x));
  put(leftCol, lensPart, sectionOf("Themes"));
  put(rightCol, sectionOf("Symbols"), gazeSlot, mirrorSlot, sectionOf("Elements"));
  const asksRow = el("div", "sum-asks");
  asksRow.append(asks, asksEach);
  main.append(leftCol, rightCol, asksRow);

  sheet.append(bar, body, strip);
  document.body.append(sheet);
  if (magic && !calm) appearWithMagic(sheet, body);
  else slideIn(sheet);
  back.addEventListener("click", async () => {
    await slideOut(sheet);
    sheet.remove();
  });
  return sheet;
}

// The summary page arriving through the arcane portal: the page itself is
// revealed by the widening window, while its parts brighten out of the
// light and rise into place one after another.
function appearWithMagic(sheet, body) {
  sheet.hidden = false;
  sheet.style.zIndex = ++Z;
  sheet.scrollTop = 0;
  sheet.animate(
    [{ filter: "brightness(1.7)" }, { filter: "brightness(1)" }],
    { duration: 900, easing: "cubic-bezier(.2,.8,.2,1)" }
  );
  // (The cards fly in on their own, out of the portal: see emergeCards.)
  [...body.querySelectorAll(".col-side > :not(.summary-cards), .sum-col > *, .sum-asks > *")].forEach((part, i) => part.animate(
    [{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }],
    { duration: 520, delay: 200 + Math.min(i, 10) * 55, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }
  ));
}

// Before the summary opens: the cards' light converges in the middle of
// the screen, the arcane circle spins up there, and the summary appears
// through it (arcanePortal, below).
let summoning = false;
function summonSummary(open) {
  if (calm) { open(false); return; }
  if (summoning) return;   // already on its way
  summoning = true;
  // The turned cards on the table; from the History there are none on screen.
  const onTable = S && !$("table").hidden;
  const points = onTable ? S.slots.map((s, i) => {
    const g = cardGeom(i);
    return { x: g.x, y: g.y, w: g.rx * 2, h: g.ry * 2, el: s.tcard };
  }) : [];
  const total = arcanePortal(points, () => open(true));
  setTimeout(() => { summoning = false; }, total);
}

// ── Opening the summary: the arcane portal ──────────────
// Light streaks from every card to the middle of the screen while the
// table dims. The great arcane circle forms there and spins up, faster
// and brighter, its runes blurring. At its height the middle opens like a
// window: the summary shows inside the rune ring, then the window widens
// and pushes the circle outward until the summary fills the screen.
// The cards themselves are swallowed: each is drawn along its streak into
// the spinning circle, shrinking and twisting as it falls in, and once the
// window opens they fly back out of it to their places on the summary.
// open() must return the summary's sheet, which is revealed through the window.

// A copy of an element, fixed exactly over it, for flying about the screen.
// The copy sits in a wrapper that takes the flight's transforms, so the
// copy keeps its own (a reversed card stays upside down). `look` is the
// part to copy, when it differs from what gives the place on screen.
function flyingCopy(src, z, look = src) {
  const r = src.getBoundingClientRect();
  const c = el("div");
  Object.assign(c.style, {
    position: "fixed", left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`,
    margin: "0", zIndex: z, pointerEvents: "none", transformOrigin: "50% 50%", willChange: "transform, opacity",
  });
  const copy = look.cloneNode(true);
  Object.assign(copy.style, { position: "relative", inset: "auto", width: "100%", height: "100%", margin: "0" });
  c.append(copy);
  document.body.append(c);
  return { c, x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// The cards coming back out of the portal: each flies from its heart,
// tiny and spinning, to its own place in the summary's row of cards,
// and flares softly as it lands.
function emergeCards(sheet, C) {
  [...sheet.querySelectorAll(".summary-cards .related-pic")].forEach((pic, i) => {
    const { c, x, y } = flyingCopy(pic, 9002);
    pic.style.visibility = "hidden";
    const turn = i % 2 ? 540 : -540;
    const a = c.animate([
      { transform: `translate(${C.x - x}px, ${C.y - y}px) rotate(${turn}deg) scale(.05)`, opacity: 0, filter: "brightness(3)" },
      { opacity: 1, offset: 0.2 },
      { transform: "none", opacity: 1, filter: "brightness(1)" },
    ], { duration: 1100, delay: 220 + i * 110, easing: "cubic-bezier(.16,.84,.24,1)", fill: "backwards" });
    let landed = false;
    const land = () => {
      if (landed) return;
      landed = true;
      c.remove();
      pic.style.visibility = "";
      pic.animate([{ filter: "brightness(1.8) drop-shadow(0 0 10px rgba(255, 210, 140, .9))" }, { filter: "none" }], { duration: 650, easing: "ease-out" });
    };
    a.onfinish = land;
    // If the page's animations stall (the tab hidden mid-flight), land the card anyway.
    setTimeout(land, 220 + i * 110 + 1100 + 800);
  });
}

// The arcane colours the portal's light runs through, from the first moment
// to the last: purple, deepening to indigo, then flushing pink. `veil`: the
// deep indigo the dimming over the table takes on.
const PORTAL_PALETTE = { veil: "#120B2E", light: ["#A25CFF", "#5B4BFF", "#8A4DFF", "#FF5FC8"] };
// The circles' own shades: each ring of the portal's circle is drawn in one
// of these, neighbours in different ones, so they never all look alike.
const CIRCLE_TINTS = {
  deep:   [112, 30, 205],    // deep purple
  purple: [176, 88, 255],    // purple
  light:  [228, 208, 255],   // light purple
  indigo: [72, 92, 255],     // indigo
};
const PART_TINT = {
  core: "light", midband: "indigo", star: "purple", ring: "deep", runes: "light", sats: "indigo",
  oring: "purple", orunes: "indigo", squares: "deep", arcs: "light", crown: "purple",
};
// A sigil picture (and its bloom) recoloured in one shade, made once and kept.
const TINTED = new WeakMap();
function tintedSigil(s, rgb) {
  let byTint = TINTED.get(s);
  if (!byTint) TINTED.set(s, (byTint = new Map()));
  const key = rgb.join(", ");
  if (!byTint.has(key)) {
    const tint = (src) => {
      const c = document.createElement("canvas");
      c.width = src.width; c.height = src.height;
      const x = c.getContext("2d");
      x.drawImage(src, 0, 0);
      x.globalCompositeOperation = "source-atop";   // only where there's light, keeping how strong it is
      x.fillStyle = `rgba(${key}, .88)`;            // a touch of the white-hot core still shows
      x.fillRect(0, 0, c.width, c.height);
      return c;
    };
    byTint.set(key, { c: tint(s.c), bloom: s.bloom && tint(s.bloom), size: s.size });
  }
  return byTint.get(key);
}

// The palette as the colours the portal's light is painted in. Deeper
// colours are lifted to glowing strength (same hue, brighter), since light can't glow dark.
function portalTints(p) {
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const lift = (c) => { const m = Math.max(...c); return m < 215 ? c.map((v) => Math.round((v * 215) / m)) : c; };
  return { tints: p.light.map((h) => lift(rgb(h))), veil: rgb(p.veil) };
}

function arcanePortal(points, open) {
  const W = innerWidth, H = innerHeight;
  // On the table, the portal is the great circle already turning behind the
  // spread: it takes it over where it is, as it is, and the table stops
  // drawing its own until the portal is done. From the History there is no
  // circle yet, so one forms in the middle of the screen.
  if (points.length && MG.finale && MG.ctx) drawMagic(performance.now());   // brings MG.great up to date
  const G = points.length && MG.finale && MG.great ? MG.great : null;
  const C = G ? { x: G.cx, y: G.cy } : { x: W / 2, y: H * 0.46 };
  const R1 = G ? G.R1 : Math.round(Math.min(W, H) * 0.25);
  const sig = sigilsFor(R1), R2 = sig.R2;
  if (G) MG.portal = true;
  const { tints, veil: veilTo } = portalTints(PORTAL_PALETTE);
  const far = Math.hypot(Math.max(C.x, W - C.x), Math.max(C.y, H - C.y)) + 4;
  // From the History there are no cards on screen: the light comes from the edges instead.
  const src = points.length ? points : Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    return { x: C.x + Math.cos(a) * far, y: C.y + Math.sin(a) * far, w: 0, h: 0 };
  });

  const cv = el("canvas", "portal-fx");
  cv.setAttribute("aria-hidden", "true");
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = W * dpr; cv.height = H * dpr;
  Object.assign(cv.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: 9000 });
  // The veil dimming the table goes on its own canvas underneath, so the
  // light's change of colour (a filter on the canvas above) leaves it be.
  const veilCv = cv.cloneNode();
  veilCv.className = "portal-veil";
  // The circles themselves go on one more, on top, adding their light to the rest.
  const circCv = cv.cloneNode();
  circCv.className = "portal-circles";
  circCv.style.mixBlendMode = CSS.supports("mix-blend-mode", "plus-lighter") ? "plus-lighter" : "screen";
  document.body.append(veilCv, cv, circCv);
  const ctx = cv.getContext("2d"), vctx = veilCv.getContext("2d"), cctx = circCv.getContext("2d");
  [ctx, vctx, cctx].forEach((x) => x.setTransform(dpr, 0, 0, dpr, 0, 0));

  // The turned cards, lifted off the table to be swallowed (copies above
  // the light; the real ones wait, hidden, under the summary).
  src.forEach((p) => {
    if (!p.el || !p.el.isConnected) return;
    // Only the card's face flies: the table card is a 3D flip, which a glow would flatten.
    p.fly = flyingCopy(p.el, 9001, p.el.querySelector(".cface") || p.el).c;
    p.el.style.visibility = "hidden";
  });
  // The elemental frames around the cards fade as the cards leave them.
  const frames = src.some((p) => p.fly) && $("frames");
  const framesFade = frames && frames.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, delay: 300, fill: "forwards" });
  // When each card starts falling in, and when it's gone (seconds).
  const fall = (i) => [0.3 + i * 0.08, 1.3 + i * 0.06];

  // When the window opens, how wide it is, and when it's all over (seconds).
  const OPEN = 1.6, SHOW = 2.0, END = 2.9;
  const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(2 - 2 * p, 3) / 2);
  // As it spins up, the whole circle swells to this much bigger.
  const SWELL = 1.3;
  const swellAt = (s) => 1 + (SWELL - 1) * easeInOut(arcSeg(s, 0.4, OPEN));
  const RW = R1 * 0.9 * SWELL;   // the window's first width: just inside the swollen inner ring
  const radius = (s) => s < SHOW
    ? RW * easeOut(arcSeg(s, OPEN, SHOW))
    : RW + (far - RW) * easeInOut(arcSeg(s, SHOW, END - 0.1));
  // Larger rings that appear beyond it one after another as it builds:
  // how much bigger than the outer sigil, and when each starts to draw in.
  const BEYOND = [{ k: 1.32, at: 0.6, dir: 1 }, { k: 1.7, at: 0.95, dir: -1 }];

  // Sparks thrown off the rim when the window opens.
  const dust = Array.from({ length: 70 }, (_, i) => ({
    a: hash01(i) * Math.PI * 2, v: 60 + hash01(i + 50) * 260, life: 0.5 + hash01(i + 90) * 0.7, r: 0.8 + hash01(i + 130) * 1.6,
  }));

  // Motes of light drawn in out of the air, each on its own spiral path:
  // when it sets off, how long it takes, where from, how far out, how big.
  const motes = Array.from({ length: 150 }, (_, i) => ({
    at: 0.05 + hash01(i + 300) * (OPEN - 0.55), dur: 0.7 + hash01(i + 400) * 0.5,
    a: hash01(i + 500) * Math.PI * 2, d: hash01(i + 600), r: hash01(i + 700),
  }));
  // The held breath: just before the window opens the circle slows almost
  // to a stop and draws in on itself, then lets go.
  const holdAt = (s) => arcSeg(s, OPEN - 0.45, OPEN - 0.15) * (1 - arcSeg(s, OPEN, OPEN + 0.05));
  const releaseAt = (s) => { const u = arcSeg(s, OPEN, OPEN + 0.35); return Math.sin(Math.PI * u) * (1 - u * 0.4); };

  let sheet = null, rot = 0, last = 0, pulseT = null, flare = -Math.PI / 2;
  const t0 = performance.now();
  requestAnimationFrame(function frame(now) {
    const s = (now - t0) / 1000, dt = last ? Math.min(0.05, s - last) : 0;
    last = s;
    if (s >= OPEN && !sheet) {
      sheet = open() || null;
      if (sheet) {
        sheet.style.clipPath = "circle(0px at 50% 50%)";
        emergeCards(sheet, C);
      }
    }
    const r = radius(s);
    // The light takes the palette's first colour the moment it starts and
    // runs through the rest in turn, with a flash of yellow as
    // the window opens, reaching the last colour just as it is gone.
    // (Painted over the light at the end of the frame; the veil darkens
    // into the palette's own dark colour.)
    // It starts the moment the summary is asked for and is still going as the circle disappears.
    const shift = arcSeg(s, 0, END);
    const white = arcSeg(s, OPEN - 0.06, OPEN) * (1 - arcSeg(s, OPEN, OPEN + 0.45));
    const veilRGB = [12, 10, 20].map((v, k) => Math.round(v + (veilTo[k] * 0.8 - v) * shift)).join(", ");
    if (sheet) sheet.style.clipPath = `circle(${r}px at ${C.x}px ${C.y}px)`;
    ctx.clearRect(0, 0, W, H);
    vctx.clearRect(0, 0, W, H);
    cctx.clearRect(0, 0, W, H);

    // The table dims, except through the window.
    const veil = 0.6 * arcSeg(s, 0, 0.45) * (1 - arcSeg(s, END - 0.5, END));
    vctx.fillStyle = `rgba(${veilRGB}, ${veil})`;
    vctx.fillRect(0, 0, W, H);
    if (r > 0) {
      vctx.globalCompositeOperation = "destination-out";
      vctx.beginPath();
      vctx.arc(C.x, C.y, r, 0, Math.PI * 2);
      vctx.fill();
      vctx.globalCompositeOperation = "source-over";
    }
    ctx.globalCompositeOperation = "lighter";

    // Streaks of light from the cards, swirling in to the middle. A card
    // rides its streak, slowly at first, then faster as the circle pulls
    // it in, shrinking and twisting until it's gone in a flash at the heart.
    src.forEach((p, i) => {
      const [f0, f1] = fall(i);
      const u = p.fly ? arcSeg(s, f0, f1) : arcSeg(s, i * 0.05, 0.55 + i * 0.05);
      const e = p.fly ? Math.pow(u, 2.3) : easeIO(u);
      const dx = C.x - p.x, dy = C.y - p.y;
      const m = { x: (p.x + C.x) / 2 - dy * 0.35, y: (p.y + C.y) / 2 + dx * 0.35 };
      const at = (v) => ({ x: (1 - v) * (1 - v) * p.x + 2 * (1 - v) * v * m.x + v * v * C.x, y: (1 - v) * (1 - v) * p.y + 2 * (1 - v) * v * m.y + v * v * C.y });
      if (p.fly) {
        const h = at(e);
        const turn = (i % 2 ? -1 : 1) * 620 * Math.pow(e, 1.4);
        const sc = Math.max(0.02, 1 - 0.97 * Math.pow(e, 0.75));
        // a trembling lift before it lets go of the table
        const shake = u === 0 && s > f0 - 0.3 ? Math.sin(s * 90 + i) * 1.5 * arcSeg(s, f0 - 0.3, f0) : 0;
        p.fly.style.transform = `translate(${h.x - p.x + shake}px, ${h.y - p.y}px) rotate(${turn}deg) scale(${sc})`;
        p.fly.style.opacity = String(1 - arcSeg(e, 0.82, 1));
        p.fly.style.filter = `brightness(${1 + 1.6 * e})`;
        // the flash as the circle takes it
        const gone = arcSeg(s, f1, f1 + 0.35);
        if (gone > 0 && gone < 1) {
          glint(ctx, C.x, C.y, 16 * (1 - gone) + 6, Math.sin(Math.PI * gone));
          ctx.strokeStyle = `rgba(${ARC_CORE}, ${0.5 * (1 - gone)})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(C.x, C.y, R1 * 0.15 + R1 * 0.5 * gone, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      if (p.h && u < 0.4) {
        const q = u / 0.4;
        ctx.strokeStyle = `rgba(${ARC_CORE}, ${0.7 * (1 - q)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.hypot(p.w, p.h) * (0.45 + q * 0.25), 0, Math.PI * 2);
        ctx.stroke();
      }
      if (u <= 0 || u >= 1) return;
      ctx.lineCap = "round";
      for (let k = 0; k < 12; k++) {
        const a = at(Math.max(0, e - k * 0.018)), b = at(Math.max(0, e - (k + 1) * 0.018));
        ctx.strokeStyle = `rgba(${ARC_CORE}, ${0.55 * (1 - k / 12)})`;
        ctx.lineWidth = 3 * (1 - k / 12) + 0.4;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      if (!p.fly) { const h = at(e); glint(ctx, h.x, h.y, 7, 1); }
    });

    // The circle quickens as it charges, but never to a machine's whirl: it
    // tops out at about half a turn a second and surges unevenly, as if
    // pushed along by the energy rather than driven. The table's circle
    // carries on from its own slow turn; a new one forms first.
    const surge = 1 + 0.2 * Math.sin(s * 4.3) + 0.1 * Math.sin(s * 7.7 + 1);
    const hold = holdAt(s);
    const speed = ((G ? 0 : 0.25) + 2 * Math.pow(arcSeg(s, 0.6, OPEN), 1.8) * (1 - 0.7 * arcSeg(s, OPEN, END))) * surge * (1 - 0.92 * hold);
    rot += speed * dt;
    // The energy's own clock: it carries on from the table's, then runs up to eight times as fast.
    pulseT = pulseT === null ? now : pulseT + dt * 1000 * (1 + 7 * arcSeg(s, 0.4, OPEN));
    const rotIn = G ? now / 60000 + rot : rot, rotOut = G ? -now / 90000 - rot * 0.7 : -rot * 0.7;
    // The table's circle is taken over whole (it has come together by the
    // time the summary can be opened); a new one sweeps in and grows.
    const sweep = G ? 1 : easeIO(arcSeg(s, 0.3, 0.8));
    const grow = G ? 1 : easeOut(arcSeg(s, 0.55, 1.0));
    const charge = arcSeg(s, 0.4, OPEN);
    // It swells as it spins up; then the widening window pushes it out further.
    // (It draws in while holding its breath, and kicks outward as it lets go.)
    const push = swellAt(s) * Math.max(1, r / RW) * (1 - 0.08 * hold + 0.1 * releaseAt(s));
    const fade = 1 - arcSeg(Math.max(1, r / RW), 1.25, 2.4);   // fading only once the window pushes it out
    // It starts exactly as bright as it was on the table, then grows stronger.
    const base = G ? 0.55 * (0.86 + 0.14 * Math.sin(now / 2300)) : 0.55;
    const bright = (base + 0.75 * Math.pow(charge, 1.5)) * fade;
    // Once the window is open, the circle shows only around it, never over the page inside.
    ctx.save();
    if (r > 0) {
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.arc(C.x, C.y, r, 0, Math.PI * 2);
      ctx.clip("evenodd");
    }
    // The haze and the bloom grow as it charges: the light spills further into the air.
    const glowUp = (G ? 0.85 + 0.2 * Math.sin(now / 1700) * Math.sin(now / 3900 + 1) : 1) + 0.9 * Math.pow(charge, 1.3);
    arcHaze(ctx, C.x, C.y, R2 * push * 1.3, (1 + 1.5 * charge) * fade * Math.max(sweep, 0.3));
    // At speed, the runes blur: the circle is drawn a few times, just behind
    // itself (only the first copy carries the bloom). It's drawn through the
    // same living light as on the table, whose flicker steadies into full
    // power as it charges.
    // The circles go on their own canvas, each ring in its own shade of
    // purple (CIRCLE_TINTS), untouched by the colour painted over the rest.
    cctx.save();
    if (r > 0) {
      cctx.beginPath();
      cctx.rect(0, 0, W, H);
      cctx.arc(C.x, C.y, r, 0, Math.PI * 2);
      cctx.clip("evenodd");
    }
    livingLight(cctx, G ? now : s * 1000, { cx: C.x, cy: C.y, R1: R1 * push, R2: R2 * push, extent: 4000, strength: 1 - 0.8 * charge }, (x) => {
    // The afterglow follows the charge, not the speed, so it reads as light
    // smearing behind the runes rather than a wheel's strobe.
    const blur = Math.min(4, 1 + Math.floor(charge * 3.5));
    for (let k = 0; k < blur; k++) {
      const lag = k * 0.03 * charge * (1 - hold), a = bright / (1 + k * 1.3);
      const layer = (s2, rr, kk, aa, tint) => drawSigil(x, tintedSigil(s2, CIRCLE_TINTS[tint]), C.x, C.y, rr, kk, aa, k === 0 ? glowUp : 0);
      const parts = (group, rr, kk, aa) => ARC_PARTS.forEach((e) => { if (e.group === group) layer(sig.parts[e.key], rr, kk, aa, PART_TINT[e.key]); });
      if (G) {
        // The table's circle: every element carries on from its own drifting
        // turn and spins up in its own direction, the inner ones fastest and
        // the crown most gently; each blurs just behind itself.
        ARC_PARTS.forEach((e) => {
          const dir = Math.sign(SPIN[e.key][0]), f = e.group === "in" ? 1 : e.group === "crown" ? 0.5 : 0.7;
          layer(sig.parts[e.key], partTurn(e.key, now) + dir * (rot * f - lag), push, e.group === "in" ? a : a * 0.9, PART_TINT[e.key]);
        });
      } else {
        // A circle forming afresh (from the History): the inner sigil sweeps
        // in, the outer one grows out of it, both turning as one piece.
        if (sweep < 1) {
          x.save();
          x.beginPath();
          x.moveTo(C.x, C.y);
          x.arc(C.x, C.y, sig.inner.size, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * sweep);
          x.closePath();
          x.clip();
          parts("in", rotIn - lag, push, a);
          x.restore();
        } else {
          parts("in", rotIn - lag, push, a);
        }
        const kOut = (R1 / R2 + (1 - R1 / R2) * grow) * push;
        if (grow > 0) parts("out", rotOut + lag, kOut, a * 0.9 * grow);
        if (grow > 0) layer(sig.parts.crown, rot * 0.5 + lag, kOut, a * 0.9 * grow, PART_TINT.crown);
      }
      // The larger rings: each sweeps in from the top, swelling out of the
      // ring inside it, and turns against its neighbour, faster as it builds.
      BEYOND.forEach((b, j) => {
        const p = easeOut(arcSeg(s, b.at, b.at + 0.55));
        if (p <= 0) return;
        const kb = (1 + (b.k - 1) * p) * push;
        const rotB = (b.dir > 0 ? rotIn : rotOut) * (1.2 + j * 0.3) + j;
        x.save();
        if (p < 1) {
          x.beginPath();
          x.moveTo(C.x, C.y);
          x.arc(C.x, C.y, sig.outer.size * kb, -Math.PI / 2 - Math.PI * p, -Math.PI / 2 + Math.PI * p);
          x.closePath();
          x.clip();
        }
        layer(sig.outer, rotB + lag * b.dir, kb, a * (0.75 - j * 0.15) * Math.min(1, p * 1.5), j ? "light" : "deep");
        x.restore();
      });
    }
    });
    cctx.restore();
    // Energy racing round the rings, faster and brighter as it charges.
    if (sweep >= 1) {
      const g = (R1 / R2 + (1 - R1 / R2) * grow) * push;
      const radii = [[R1 * push, 1, 5200], [(R1 - 22) * push, -1, 4300], [R1 * 0.56 * push, 1, 3600]];
      if (grow > 0.5) radii.push([R2 * g, -1, 7600], [(R2 - 26) * g, 1, 6400]);
      ringPulses(ctx, pulseT, C.x, C.y, radii, (0.55 + 0.45 * charge) * fade);
    }
    if (sweep > 0 && sweep < 1) {
      const a = -Math.PI / 2 + Math.PI * 2 * sweep;
      glint(ctx, C.x + Math.cos(a) * R1, C.y + Math.sin(a) * R1, 8, Math.sin(Math.PI * sweep));
    }
    // Motes of light drawn in from the air all round, spiralling into the
    // circle, more of them and brighter as it charges.
    ctx.lineCap = "round";
    motes.forEach((m) => {
      const p = arcSeg(s, m.at, m.at + m.dur);
      if (p <= 0 || p >= 1) return;
      const pos = (q) => {
        const u = Math.pow(q, 1.7), from = R2 * push * (1.5 + m.d * 0.9), to = R1 * 0.25 * push;
        const rr = from + (to - from) * u, a = m.a + Math.sqrt(q) * 2.6;   // curling round as soon as it sets off
        return [C.x + Math.cos(a) * rr, C.y + Math.sin(a) * rr];
      };
      const [x1, y1] = pos(p), [x0, y0] = pos(Math.max(0, p - 0.01 - 0.015 * p));   // a speck, its tail lengthening as it's pulled in
      const al = Math.sin(Math.PI * p) * (0.35 + 0.65 * charge) * fade;
      ctx.strokeStyle = `rgba(${ARC_CORE}, ${al})`;
      ctx.lineWidth = 0.8 + m.r * 1.4;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      glowAt(ctx, x1, y1, 5 + m.r * 5, al);
    });
    // The runes igniting: a flare runs round the bands, lighting each rune
    // as it passes, faster every lap as the circle charges. The band's own
    // runes are drawn again, much brighter, through a wedge trailing the flare.
    flare += (1.6 + 8 * Math.pow(charge, 1.6)) * dt;
    const ignite = (0.3 + 0.7 * charge) * fade * (1 - arcSeg(s, OPEN - 0.05, OPEN + 0.2));
    if (ignite > 0.01 && sweep >= 1) {
      const kOut = G ? push : (R1 / R2 + (1 - R1 / R2) * grow) * push;
      const turnOf = (key, inner) => G
        ? partTurn(key, now) + Math.sign(SPIN[key][0]) * rot * (inner ? 1 : 0.7)
        : inner ? rotIn : rotOut;
      const bands = [[sig.parts.runes, turnOf("runes", true), push, R1 - 11, flare, 1]];
      if (G || grow > 0.5) bands.push([sig.parts.orunes, turnOf("orunes", false), kOut, R2 - 13, -flare * 0.8 + 2, -1]);
      bands.forEach(([part, turn, k, rr, h, dir], j) => {
        const lit = ignite * (j ? 0.75 : 1);
        [[0.9, 0.35], [0.45, 0.45], [0.18, 0.6]].forEach(([len, a]) => {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(C.x, C.y);
          ctx.arc(C.x, C.y, rr * k + 30, dir > 0 ? h - len : h - 0.04, dir > 0 ? h + 0.04 : h + len);
          ctx.closePath();
          ctx.clip();
          drawSigil(ctx, part, C.x, C.y, turn, k, lit * a * 3.5, 2);
          ctx.restore();
        });
        glint(ctx, C.x + Math.cos(h) * rr * k, C.y + Math.sin(h) * rr * k, 8 + 6 * charge, lit);
      });
    }
    // Letting go: a ring of light thrown outward from the circle.
    const rel = arcSeg(s, OPEN, OPEN + 0.5);
    if (rel > 0 && rel < 1) {
      ctx.strokeStyle = `rgba(${ARC_CORE}, ${0.8 * (1 - rel)})`;
      ctx.lineWidth = 2.5 * (1 - rel) + 0.5;
      ctx.beginPath();
      ctx.arc(C.x, C.y, R1 * push * (1 + 1.4 * easeOut(rel)), 0, Math.PI * 2);
      ctx.stroke();
    }
    // Light gathering in the middle as it spins up, held tight as it holds its breath.
    if (charge > 0 && s < SHOW) {
      const core = Math.min(1, charge * (1 + 0.6 * hold)) * (1 - arcSeg(s, OPEN, SHOW));
      const g = ctx.createRadialGradient(C.x, C.y, 0, C.x, C.y, R1 * 0.9 * push);
      g.addColorStop(0, `rgba(255, 246, 225, ${0.75 * core})`);
      g.addColorStop(0.35, `rgba(${ARC_GLOW}, ${0.3 * core})`);
      g.addColorStop(1, `rgba(${ARC_GLOW}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(C.x - R1 * push, C.y - R1 * push, R1 * 2 * push, R1 * 2 * push);
    }
    // Glints flickering on the rim while it spins.
    if (s > 0.8 && s < SHOW + 0.3) {
      for (let k = 0; k < 6; k++) {
        const a = hash01(Math.floor(s * 14) * 7 + k) * Math.PI * 2;
        const rr = R1 * push * (hash01(k * 3 + Math.floor(s * 14)) > 0.5 ? 1 : R2 / R1);
        glint(ctx, C.x + Math.cos(a) * rr, C.y + Math.sin(a) * rr, 4 + 4 * charge, 0.8 * hash01(k + Math.floor(s * 14) * 11) * fade);
      }
    }
    ctx.restore();
    // The window's edge: a ring of light, with sparks flung off it as it opens.
    if (r > 0 && s < END) {
      const edge = 1 - arcSeg(s, END - 0.6, END);
      ctx.strokeStyle = `rgba(${ARC_GLOW}, ${0.35 * edge})`;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(C.x, C.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(${ARC_CORE}, ${0.9 * edge})`;
      ctx.lineWidth = 1.3;
      ctx.stroke();
      dust.forEach((d) => {
        const age = s - OPEN;
        if (age < 0 || age > d.life) return;
        const dist = RW * easeOut(Math.min(1, age / 0.4)) + d.v * age;
        const a = 1 - age / d.life;
        ctx.fillStyle = `rgba(${ARC_CORE}, ${a})`;
        ctx.fillRect(C.x + Math.cos(d.a) * dist - d.r, C.y + Math.sin(d.a) * dist - d.r, d.r * 2, d.r * 2);
      });
    }

    // The colour, painted over all the light drawn this frame (only where
    // there is light, keeping how strong it is): mostly the colour, with a
    // little of the white-hot core left showing through.
    {
      const at = shift * (tints.length - 1), i0 = Math.min(tints.length - 2, Math.floor(at));
      const f = at - i0, fs = f * f * (3 - 2 * f), A = tints[i0], B = tints[i0 + 1];
      const FLASH = [255, 214, 70];   // the flash as the window opens: a burst of yellow
      const col = A.map((v, k) => { const c = v + (B[k] - v) * fs; return Math.round(c + (FLASH[k] - c) * white); });
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = `rgba(${col.join(", ")}, ${(0.85 + 0.1 * white).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      // The circles keep their own shades, but flash yellow with the rest.
      if (white > 0.001) {
        cctx.globalCompositeOperation = "source-atop";
        cctx.fillStyle = `rgba(${FLASH.join(", ")}, ${(0.9 * white).toFixed(3)})`;
        cctx.fillRect(0, 0, W, H);
        cctx.globalCompositeOperation = "source-over";
      }
    }

    if (s < END) requestAnimationFrame(frame);
    else {
      cv.remove();
      veilCv.remove();
      circCv.remove();
      if (sheet) sheet.style.clipPath = "";
      src.forEach((p) => { if (p.fly) { p.fly.remove(); p.el.style.visibility = ""; } });
      if (framesFade) framesFade.cancel();
      MG.portal = false;   // the table draws its circle again, behind the summary
    }
  });
  return END * 1000;
}

// The reading on the table, as summary entries.
function tableEntries() {
  return S.slots.map((s) => {
    const label = el("p"), question = el("p");
    showPosition(s.i, label, question);
    return { card: s.card, reversed: s.reversed, label: label.textContent, question: question.textContent };
  });
}

// ── 3. The card window ──────────────────────────────────

let openIndex = 0;

function showPosition(i, labelEl, questionEl) {
  const pos = S.spread.positions[i];
  labelEl.textContent = S.n > 1 || pos.label !== "Your card" ? pos.label : "";
  labelEl.hidden = !labelEl.textContent;
  questionEl.textContent = pos.question || "";
  questionEl.hidden = !pos.question;
}

function fillTags(box, card) {
  box.innerHTML = "";
  (card.tags || []).forEach((id) => box.append(tagBox(id)));
  box.hidden = !box.children.length;
}

// Some cards have their own keywords and questions for when they're reversed;
// the rest use the same ones both ways.
// (Function declarations, so the home screen can use them as it first builds.)
function filled(list) { return (list || []).map((x) => String(x).trim()).filter(Boolean); }
function hasRevKeywords(card) { return filled(card.reversedKeywords).length > 0; }
const hasRevQuestions = (card) => filled(card.reversedQuestions).length > 0;
function keywordsFor(card, reversed) {
  return reversed && hasRevKeywords(card) ? card.reversedKeywords : card.keywords;
}
const questionsFor = (card, reversed) =>
  reversed && hasRevQuestions(card) ? card.reversedQuestions : card.questions;

// Keywords as one line: "trust · beginnings · freedom".
function fillKeywords(box, words) {
  box.textContent = filled(words).join(" · ");
  box.hidden = !box.textContent;
}

// The questions the card asks you.
function fillQuestions(box, questions) {
  box.innerHTML = "";
  const qs = filled(questions);
  if (qs.length) {
    box.append(el("p", "asks-title", "The card asks"));
    const list = el("ul");
    qs.forEach((q) => list.append(el("li", "", q)));
    box.append(list);
  }
  box.hidden = !qs.length;
}

function openQuick(i) {
  openIndex = i;
  const { card, reversed } = S.slots[i];
  $("quickCard").innerHTML = "";
  $("quickCard").append(cardFace(card, false, reversed));
  $("quickCard").firstChild.style.height = "100%";
  showPosition(i, $("quickPos"), $("quickQuestion"));
  $("quickName").textContent = card.name;
  $("quickReversed").hidden = !reversed;
  fillTags($("quickTags"), card);
  fillKeywords($("quickKeywords"), keywordsFor(card, reversed));
  const useReversed = reversed && (card.reversed || "").trim();
  fillText($("quickText"), useReversed ? card.reversed : card.short, "Add a short description for this card in cards.js.");
  fillQuestions($("quickAsks"), questionsFor(card, reversed));

  $("quick").hidden = false;
  $("quick").animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 });
  $("quickBox").animate(
    [{ transform: "scale(.92) translateY(10px)", opacity: 0 }, { transform: "none", opacity: 1 }],
    { duration: 320, easing: "cubic-bezier(.2,.8,.2,1)" }
  );
}

async function closeQuick() {
  await $("quick").animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200 }).finished;
  $("quick").hidden = true;
}

$("quickClose").addEventListener("click", closeQuick);
$("quick").addEventListener("click", (e) => { if (e.target === $("quick")) closeQuick(); });
// From a reading, the card page can swipe through the reading's cards.
function openReadingCard(i) {
  openIndex = i;
  const items = S.slots.map((s) => {
    const label = el("p"), question = el("p");
    showPosition(s.i, label, question);
    return detailsItem(s.card, s.reversed, label.textContent, question.textContent);
  });
  openDetails(items, i);
}
$("moreBtn").addEventListener("click", () => openReadingCard(openIndex));

// ── Windows that slide up over everything ───────────────

let Z = 100;   // the newest window sits on top

function slideIn(sheet) {
  sheet.hidden = false;
  sheet.style.zIndex = ++Z;
  sheet.scrollTop = 0;
  sheet.animate(
    [{ transform: "translateY(100%)" }, { transform: "none" }],
    { duration: 380, easing: "cubic-bezier(.2,.8,.2,1)" }
  );
}

function slideOut(sheet) {
  hideTip();
  return sheet.animate(
    [{ transform: "none" }, { transform: "translateY(100%)" }],
    { duration: 300, easing: "ease-in" }
  ).finished;
}

// ── 4. The details window ───────────────────────────────

const CORR_LABELS = { astrology: "Astrology", element: "Element", number: "Number" };

// The card's astrology, element and number, each in its own small box.
function correspondences(card) {
  const box = el("div", "corr");
  const c = card.correspondences || {};
  Object.keys(CORR_LABELS).forEach((k) => {
    if (!c[k]) return;
    const item = el("div", "corr-item");
    item.append(el("span", "corr-label", CORR_LABELS[k]), el("span", "corr-value", c[k]));
    box.append(item);
  });
  box.hidden = !box.children.length;
  return box;
}

// One side of the card, "Upright" or "Reversed": its meaning, plus its own
// keywords and questions when the two sides have different ones.
function meaning(card, rev) {
  const box = el("div", "details-text meaning");
  box.append(el("p", "asks-title", rev ? "Reversed" : "Upright"));
  if (hasRevKeywords(card)) {
    const k = el("p", "keywords");
    fillKeywords(k, keywordsFor(card, rev));
    box.append(k);
  }
  const t = el("div");
  fillText(t, rev ? card.reversed : card.short, rev ? "" : "Add a short description for this card in cards.js.");
  box.append(t);
  if (hasRevQuestions(card)) {
    const asks = el("div", "asks");
    fillQuestions(asks, questionsFor(card, rev));
    box.append(asks);
  }
  return box;
}
// What's in the picture: "The thing: what it means", one per line.
function pictureGuide(card) {
  const items = filled(card.picture);
  if (!items.length) return null;
  const box = el("div", "details-text picture-guide");
  box.append(el("p", "asks-title", "What's in the picture"));
  const list = el("ul");
  items.forEach((t) => {
    const li = el("li");
    const i = t.indexOf(": ");
    const rest = t.slice(i + 2);
    if (i > 0) li.append(el("strong", "", t.slice(0, i)), el("span", "", rest.charAt(0).toUpperCase() + rest.slice(1)));
    else li.append(el("span", "", t));
    list.append(li);
  });
  box.append(list);
  return box;
}

// ── Related cards ───────────────────────────────────────

const PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio",
  "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const COURT_RANKS = ["Page", "Knight", "Queen", "King"];

const isMajor = (card) => CARDS.indexOf(card) < 22;
const rankOf = (card) => card.name.split(" of ")[0];

// The planets and signs a card's astrology names, e.g. "Mars in Aries" → Mars, Aries.
function starsOf(card) {
  const a = (card.correspondences || {}).astrology || "";
  return [...PLANETS, ...SIGNS].filter((w) => new RegExp(`\\b${w}\\b`).test(a));
}

// Groups of cards linked to this one: by number (or rank) and by the stars.
function relatedGroups(card) {
  const deck = activeDeck().filter((c) => c !== card);
  const groups = [];
  if (card.court) {
    const rank = rankOf(card);
    groups.push({ title: `The other ${rank}s`, cards: deck.filter((c) => c.court && rankOf(c) === rank) });
  } else {
    const n = (card.correspondences || {}).number;
    if (n) groups.push({ title: `Also number ${n}`, cards: deck.filter((c) => !c.court && (c.correspondences || {}).number === n) });
  }
  const stars = starsOf(card);
  if (stars.length) {
    // A Minor card is linked to the Major cards of its planet and sign, and the other way round.
    const linked = deck.filter((c) => (isMajor(card) || isMajor(c)) && starsOf(c).some((s) => stars.includes(s)));
    const names = stars.map((s) => (s === "Sun" || s === "Moon" ? `the ${s}` : s));
    groups.push({ title: `Under ${names.join(" and ")}`, cards: linked });
  }
  return groups.filter((g) => g.cards.length);
}

function relatedCards(card) {
  const groups = relatedGroups(card);
  if (!groups.length) return null;
  const box = el("div", "details-text related");
  box.append(el("p", "asks-title", "Related cards"));
  groups.forEach((g) => {
    box.append(el("p", "related-title", g.title));
    const row = el("div", "related-row");
    g.cards.forEach((c, i) => {
      const b = el("button", "related-card");
      const pic = el("div", "related-pic");
      const face = cardFace(c, true);
      face.style.height = "100%";
      pic.append(face);
      b.append(pic, el("span", "related-name", c.name));
      b.addEventListener("click", () => openDetails(g.cards.map((x) => detailsItem(x)), i));
      row.append(b);
    });
    box.append(row);
  });
  return box;
}

// ── Your draws and your notes, on the card's page ───────

function cardHistory(card) {
  const box = el("div", "details-text card-history");
  box.append(el("p", "asks-title", "Your draws"));
  const draws = drawsOf(card);
  if (!draws.length) {
    box.append(el("p", "empty-note", "You haven't drawn this card yet."));
    return box;
  }
  const rev = draws.filter((d) => d.rev).length;
  const times = draws.length === 1 ? "once" : `${draws.length} times`;
  box.append(el("p", "history-sum",
    `Drawn ${times}${rev ? `, ${rev} of them reversed` : ""}. Last on ${dateText(draws[0].t)}.`));
  const list = el("ul", "history-list");
  draws.slice(0, 5).forEach((d) => {
    const bits = [dateText(d.t), d.spread];
    if (d.label && d.label !== "Your card") bits.push(d.label);
    if (d.rev) bits.push("reversed");
    list.append(el("li", "", bits.join(" · ")));
  });
  box.append(list);
  return box;
}

// A button that opens into a text box. Saves as you type.
function notesBox(card) {
  const box = el("div", "note-box");
  const btn = el("button", "pill small note-toggle");
  const preview = el("p", "note-preview");
  const area = el("textarea", "note-area");
  const status = el("p", "note-status");
  area.placeholder = "What does this card mean to you?";
  area.rows = 5;
  area.value = noteFor(card);
  area.hidden = status.hidden = true;

  const refresh = () => {
    const has = area.value.trim();
    btn.textContent = area.hidden ? (has ? "Your note ▾" : "Add a note ▾") : "Close note ▴";
    btn.setAttribute("aria-expanded", String(!area.hidden));
    preview.textContent = has;
    preview.hidden = !area.hidden || !has;
  };
  let timer = null;
  const save = () => {
    clearTimeout(timer);
    status.textContent = saveNote(card, area.value) ? "Saved on this device" : "Couldn't save the note";
  };
  btn.addEventListener("click", () => {
    area.hidden = status.hidden = !area.hidden;
    refresh();
    if (!area.hidden) area.focus();
  });
  area.addEventListener("input", () => {
    status.textContent = "…";
    clearTimeout(timer);
    timer = setTimeout(save, 500);
  });
  area.addEventListener("blur", () => { save(); refresh(); });
  refresh();
  box.append(btn, preview, area, status);
  return box;
}

// ── The card's page ─────────────────────────────────────
// A page shows one card from a list (a reading, the card list, related
// cards…); swipe, or use the arrows, to move through the list.

function detailsItem(card, reversed = false, label = "", question = "") {
  return { card, reversed, label, question };
}

// On a wide screen the page has two columns: the card and what identifies
// it on the left (staying in view), and its meanings and the rest on the
// right. On a phone the two simply stack.
function detailsBody({ card, reversed, label, question }) {
  const body = el("div", "details-body two-col card-page");
  const side = el("div", "col-side"), main = el("div", "col-main");
  body.append(side, main);
  const pic = el("div", "details-card");
  const face = cardFace(card, false, reversed);
  face.style.height = "100%";
  pic.append(face);
  side.append(pic);

  if (label) side.append(el("p", "pos-label", label));
  if (question) side.append(el("p", "pos-question", question));
  side.append(el("h2", "", card.name));
  if (reversed) side.append(el("p", "reversed-note", "Reversed"));
  const tags = el("div", "tags");
  fillTags(tags, card);
  // Shared keywords sit under the name; separate ones go with each side.
  const keywords = el("p", "keywords");
  fillKeywords(keywords, hasRevKeywords(card) ? [] : card.keywords);
  side.append(tags, keywords);
  if ((card.line || "").trim()) side.append(el("p", "carry-line", card.line.trim()));
  side.append(correspondences(card));

  // Upright and reversed meanings; the way the card fell comes first.
  const upright = meaning(card, false);
  const rev = (card.reversed || "").trim() ? meaning(card, true) : null;
  if (reversed && rev) main.append(rev, upright);
  else main.append(upright, ...(rev ? [rev] : []));

  if (!hasRevQuestions(card)) {
    const asks = el("div", "asks");
    fillQuestions(asks, card.questions);
    main.append(asks);
  }
  if ((card.details || "").trim()) {
    const text = el("div", "details-text");
    fillText(text, card.details, "");
    main.append(text);
  }
  [pictureGuide(card), notesBox(card), cardHistory(card), relatedCards(card)]
    .forEach((part) => part && main.append(part));
  return body;
}

function openDetails(items, index = 0) {
  const sheet = el("div", "sheet details");
  const bar = el("header", "bar");
  const back = el("button", "link", "‹ Back");
  const count = el("span", "bar-title count");
  const nav = el("span", "bar-nav");
  const prev = el("button", "nav-btn", "‹");
  const next = el("button", "nav-btn", "›");
  prev.setAttribute("aria-label", "Previous card");
  next.setAttribute("aria-label", "Next card");
  nav.append(prev, next);
  nav.hidden = items.length < 2;
  bar.append(back, count, nav);

  let i = index;
  let body = detailsBody(items[i]);
  const update = () => {
    count.textContent = items.length > 1 ? `${i + 1} of ${items.length}` : "";
    prev.disabled = i === 0;
    next.disabled = i === items.length - 1;
  };

  let moving = false;
  async function go(step) {
    const to = i + step;
    if (moving || to < 0 || to >= items.length) return;
    moving = true;
    document.activeElement?.blur();   // saves a note being written
    const old = body;
    await old.animate(
      [{ transform: "none", opacity: 1 }, { transform: `translateX(${-step * 40}px)`, opacity: 0 }],
      { duration: calm ? 1 : 160, easing: "ease-in" }
    ).finished;
    i = to;
    body = detailsBody(items[i]);
    old.replaceWith(body);
    sheet.scrollTop = 0;
    update();
    await body.animate(
      [{ transform: `translateX(${step * 40}px)`, opacity: 0 }, { transform: "none", opacity: 1 }],
      { duration: calm ? 1 : 200, easing: "ease-out" }
    ).finished;
    moving = false;
  }
  sheet.go = go;
  prev.addEventListener("click", () => go(-1));
  next.addEventListener("click", () => go(1));

  // Swipe left or right, but not while typing a note or scrolling a row of cards.
  let start = null;
  sheet.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    start = e.touches.length === 1 && !e.target.closest("textarea, .related-row")
      ? { x: t.clientX, y: t.clientY } : null;
  }, { passive: true });
  sheet.addEventListener("touchend", (e) => {
    if (!start || items.length < 2) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x, dy = t.clientY - start.y;
    start = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  });

  update();
  sheet.append(bar, body);
  document.body.append(sheet);
  slideIn(sheet);
  back.addEventListener("click", async () => {
    document.activeElement?.blur();
    await slideOut(sheet);
    sheet.remove();
  });
}

// The arrow keys move through the cards on the page in front.
document.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  if (e.target.closest?.("textarea, input")) return;
  const top = [...document.querySelectorAll(".sheet.details")]
    .sort((a, b) => b.style.zIndex - a.style.zIndex)[0];
  top?.go(e.key === "ArrowLeft" ? -1 : 1);
});

// ── Tags: the golden boxes ──────────────────────────────

const canHover = matchMedia("(hover: hover) and (pointer: fine)").matches;
const tip = $("tagTip");

function tagInfo(id) {
  return TAGS[id] || { name: id, meaning: "" };
}

function cardsWithTag(id) {
  return activeDeck().filter((c) => (c.tags || []).includes(id));
}

function countText(n) {
  return n === 1 ? "1 card" : `${n} cards`;
}

// With a mouse: hover shows the meaning, click shows the cards.
// On a phone: tap shows the meaning with a button to see the cards.
function tagBox(id) {
  const b = el("button", "tag", tagInfo(id).name);
  if (canHover) {
    b.addEventListener("mouseenter", () => showTip(b, id, false));
    b.addEventListener("mouseleave", hideTip);
    b.addEventListener("click", () => { hideTip(); openBrowse(id); });
  } else {
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!tip.hidden && tip.dataset.tag === id) hideTip();
      else showTip(b, id, true);
    });
  }
  return b;
}

function showTip(anchor, id, withButton) {
  const t = tagInfo(id);
  const n = cardsWithTag(id).length;
  tip.innerHTML = "";
  tip.dataset.tag = id;
  tip.append(el("div", "tip-name", t.name));
  const meaning = el("div", "tip-meaning");
  fillText(meaning, t.meaning, "Add this tag's meaning in tags.js.");
  tip.append(meaning);
  if (withButton) {
    const go = el("button", "pill small", `Show all ${countText(n)}`);
    go.addEventListener("click", () => { hideTip(); openBrowse(id); });
    tip.append(go);
  } else {
    tip.append(el("p", "tip-hint", `Click to see all ${countText(n)}`));
  }
  tip.hidden = false;

  const r = anchor.getBoundingClientRect();
  const w = tip.offsetWidth, h = tip.offsetHeight;
  const left = Math.max(12, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 12));
  let top = r.bottom + 8;
  if (top + h > innerHeight - 12) top = r.top - h - 8;
  tip.style.left = `${left}px`;
  tip.style.top = `${Math.max(12, top)}px`;
}

function hideTip() {
  tip.hidden = true;
  tip.dataset.tag = "";
}

document.addEventListener("click", (e) => {
  if (!tip.hidden && !tip.contains(e.target)) hideTip();
});
document.addEventListener("scroll", (e) => { if (e.target !== tip) hideTip(); }, true);

// ── 5. Browse the cards ─────────────────────────────────

const SUITS = ["All", "Major Arcana", "Wands", "Cups", "Swords", "Pentacles"];
const B = { suit: "All", tag: null };

function suitOf(card) {
  if (CARDS.indexOf(card) < 22) return "Major Arcana";
  return card.name.split(" of ")[1] || "Other";
}

SUITS.forEach((s) => {
  const c = el("button", "chip", s === "Major Arcana" ? "Major" : s);
  c.dataset.suit = s;
  c.addEventListener("click", () => { B.suit = s; renderBrowse(); });
  $("suitChips").append(c);
});

function renderBrowse() {
  if (!SET.tags) B.tag = null;
  const tagged = B.tag != null;
  $("tagHead").hidden = !tagged;
  $("browseFilters").hidden = tagged;

  if (tagged) {
    const t = tagInfo(B.tag);
    $("tagHeadBox").innerHTML = "";
    const box = el("span", "tag big", t.name);
    $("tagHeadBox").append(box);
    fillText($("tagHeadMeaning"), t.meaning, "");
    $("tagHeadMeaning").hidden = !t.meaning;
  } else {
    [...$("suitChips").children].forEach((c) =>
      c.classList.toggle("on", c.dataset.suit === B.suit));
    $("allTags").innerHTML = "";
    Object.keys(TAGS).forEach((id) => $("allTags").append(tagBox(id)));
    $("allTags").hidden = !$("allTags").children.length;
  }

  const list = tagged
    ? cardsWithTag(B.tag)
    : activeDeck().filter((c) => B.suit === "All" || suitOf(c) === B.suit);

  const grid = $("grid");
  grid.innerHTML = "";
  list.forEach((card) => {
    const b = el("button", "grid-card");
    const pic = el("div", "grid-pic");
    const face = cardFace(card, true);
    face.style.height = "100%";
    pic.append(face);
    b.append(pic, el("div", "grid-name", card.name));
    b.addEventListener("click", () => openDetails(list.map((c) => detailsItem(c)), list.indexOf(card)));
    grid.append(b);
  });
  if (!list.length) grid.append(el("p", "empty-note", "No cards have this tag yet."));
}

function openBrowse(tag = null) {
  hideTip();
  const browse = $("browse");
  B.tag = tag;
  renderBrowse();
  if (browse.hidden) {
    slideIn(browse);
  } else {
    // Already open: close the windows on top of it and show the new list.
    const z = +browse.style.zIndex;
    document.querySelectorAll(".sheet.details").forEach((s) => {
      if (+s.style.zIndex > z) s.remove();
    });
    browse.scrollTop = 0;
  }
}

$("browseBtn").addEventListener("click", () => { B.suit = "All"; openBrowse(null); });
$("tagClear").addEventListener("click", () => { B.tag = null; renderBrowse(); });
$("browseBack").addEventListener("click", async () => {
  const browse = $("browse");
  await slideOut(browse);
  browse.hidden = true;
});

// ── Sky now: where the planets are, at any moment ──────
// Worked out on the phone with astronomy.js, no internet needed.
// The arrows step the time back and forward by the chosen unit.

const SKY_BODIES = [...PLANETS, "Chiron"];
const GLYPHS = { Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂", Jupiter: "♃",
  Saturn: "♄", Uranus: "♅", Neptune: "♆", Pluto: "♇", Chiron: "⚷" };
const SIGN_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];
const RULES = { Sun: "you, your energy", Moon: "feelings", Mercury: "thinking, talk", Venus: "love, beauty",
  Mars: "drive, action", Jupiter: "luck, growth", Saturn: "rules, lessons", Uranus: "sudden change",
  Neptune: "dreams", Pluto: "deep change", Chiron: "old wounds, healing" };
const MOON_PHASES = ["New Moon", "Waxing crescent", "First quarter", "Waxing gibbous",
  "Full Moon", "Waning gibbous", "Last quarter", "Waning crescent"];
const MOON_ICONS = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];
const asText = (g) => g + "︎";   // a symbol, not a coloured emoji

// Chiron isn't in astronomy.js, so it's carried along its orbit from where
// NASA JPL's Horizons put it on 14 Nov 2026 (sun-centred, AU and AU/day),
// pulled by the Sun and the big planets.
const CHIRON_START = { jd: 2461358.5, pos: [16.02937033801500, 7.935677029286289, 3.478569887691327],
  vel: [-2.092831639279892e-3, 2.461004462594767e-3, 6.407684802227911e-4] };
const CHIRON_STEP = 10;   // days per step of the simulation
let chironSim = null;

function chironHelio(date) {
  const target = Astronomy.MakeTime(date);
  const t0 = Astronomy.MakeTime(new Date((CHIRON_START.jd - 2440587.5) * 864e5));
  // Start again from Horizons' date if that's nearer than where the last run stopped.
  if (!chironSim || Math.abs(target.tt - t0.tt) < Math.abs(target.tt - chironSim.Time.tt)) {
    const [x, y, z] = CHIRON_START.pos, [vx, vy, vz] = CHIRON_START.vel;
    chironSim = new Astronomy.GravitySimulator(Astronomy.Body.Sun, t0,
      [new Astronomy.StateVector(x, y, z, vx, vy, vz, t0)]);
  }
  while (Math.abs(target.tt - chironSim.Time.tt) > CHIRON_STEP) {
    const dir = Math.sign(target.tt - chironSim.Time.tt);
    chironSim.Update(chironSim.Time.AddDays(dir * CHIRON_STEP));
  }
  return chironSim.Update(target)[0];
}

function eclipticLon(body, date) {
  if (body === "Sun") return Astronomy.SunPosition(date).elon;
  if (body === "Moon") return Astronomy.EclipticGeoMoon(date).lon;
  if (body === "Chiron") {
    const c = chironHelio(date), e = Astronomy.HelioVector(Astronomy.Body.Earth, date);
    return Astronomy.Ecliptic(new Astronomy.Vector(c.x - e.x, c.y - e.y, c.z - e.z, e.t)).elon;
  }
  return Astronomy.Ecliptic(Astronomy.GeoVector(body, date, true)).elon;
}

// Degrees, minutes and seconds within the sign: 21°26′07″.
function degText(x) {
  const t = Math.floor(x * 3600), two = (n) => String(n).padStart(2, "0");
  return `${Math.floor(t / 3600)}°${two(Math.floor(t / 60) % 60)}′${two(t % 60)}″`;
}

function skyAt(date) {
  const later = new Date(date.getTime() + 3600e3);
  const bodies = SKY_BODIES.map((body) => {
    const lon = eclipticLon(body, date);
    // Retrograde: the planet seems to slip backwards along the zodiac.
    const step = ((eclipticLon(body, later) - lon + 540) % 360) - 180;
    return { body, lon, sign: Math.floor(lon / 30), deg: Math.floor(lon % 30), dms: degText(lon % 30),
      retro: step < 0 && body !== "Sun" && body !== "Moon" };
  });
  const angle = Astronomy.MoonPhase(date);
  const k = Math.round(angle / 45) % 8;
  const moon = { name: MOON_PHASES[k], icon: MOON_ICONS[k],
    lit: Math.round(Astronomy.Illumination("Moon", date).phase_fraction * 100),
    day: Math.floor(angle / 360 * 29.53) + 1 };
  return { bodies, moon };
}

// The zodiac wheel: Aries on the left, going round anticlockwise. It's
// built once and kept, so when the time steps the planets glide round
// to their new places instead of jumping.
const WHEEL = { svg: null, planets: {}, signs: [], moon: null, lit: null, raf: 0, hot: null };
const WS = 300, WC = WS / 2, WR = 136, WBAND = 20;
const WHEEL_NS = "http://www.w3.org/2000/svg";
const wheelPt = (lon, r) => { const a = Math.PI - lon * Math.PI / 180; return [WC + r * Math.cos(a), WC - r * Math.sin(a)]; };

function svgEl(parent, tag, attrs = {}, txt) {
  const e = document.createElementNS(WHEEL_NS, tag);
  Object.entries(attrs).forEach(([a, v]) => e.setAttribute(a, v));
  if (txt != null) e.textContent = txt;
  parent.append(e);
  return e;
}

function buildWheel() {
  const svg = document.createElementNS(WHEEL_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${WS} ${WS}`);
  svg.setAttribute("class", "sky-wheel");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Zodiac wheel");
  const defs = svgEl(svg, "defs");
  const glow = svgEl(defs, "filter", { id: "skyGlow", x: "-50%", y: "-50%", width: "200%", height: "200%" });
  svgEl(glow, "feGaussianBlur", { stdDeviation: "2.2", result: "b" });
  const merge = svgEl(glow, "feMerge");
  svgEl(merge, "feMergeNode", { in: "b" });
  svgEl(merge, "feMergeNode", { in: "SourceGraphic" });
  const core = svgEl(defs, "radialGradient", { id: "skyCore" });
  svgEl(core, "stop", { offset: "0", "stop-color": "#ffd682", "stop-opacity": ".2" });
  svgEl(core, "stop", { offset: ".6", "stop-color": "#ffbe5a", "stop-opacity": ".06" });
  svgEl(core, "stop", { offset: "1", "stop-color": "#ffbe5a", "stop-opacity": "0" });

  // A slowly turning ring of gold dots outside the zodiac, like the runes of the summary.
  const runes = svgEl(svg, "g", { class: "w-runes" });
  for (let i = 0; i < 72; i++) {
    const [x, y] = wheelPt(i * 5, WR + 8);
    if (i % 6 === 0) svgEl(runes, "rect", { x: x - 2, y: y - 2, width: 4, height: 4, class: "w-diamond",
      transform: `rotate(45 ${x} ${y})` });
    else svgEl(runes, "circle", { cx: x, cy: y, r: i % 2 ? .7 : 1.1, class: "w-dot" });
  }
  svgEl(svg, "circle", { cx: WC, cy: WC, r: WR - WBAND, fill: "url(#skyCore)" });
  svgEl(svg, "circle", { cx: WC, cy: WC, r: WR, class: "w-line w-draw", pathLength: 1 });
  svgEl(svg, "circle", { cx: WC, cy: WC, r: WR - WBAND, class: "w-line w-draw", pathLength: 1 });
  svgEl(svg, "circle", { cx: WC, cy: WC, r: 44, class: "w-faint w-draw", pathLength: 1 });
  // A small tick every 10°, a line across the band where each sign begins.
  for (let d = 0; d < 360; d += 10) {
    const [x1, y1] = wheelPt(d, WR - WBAND), [x2, y2] = wheelPt(d, d % 30 ? WR - WBAND + 3 : WR);
    svgEl(svg, "line", { x1, y1, x2, y2, class: d % 30 ? "w-faint" : "w-line" });
  }
  SIGN_GLYPHS.forEach((g, i) => {
    // The sign's stretch of the band, lit up when one of its planets is pointed at.
    const [ox1, oy1] = wheelPt(i * 30, WR), [ox2, oy2] = wheelPt(i * 30 + 30, WR);
    const [ix1, iy1] = wheelPt(i * 30, WR - WBAND), [ix2, iy2] = wheelPt(i * 30 + 30, WR - WBAND);
    const seg = svgEl(svg, "path", { class: "w-seg", d: `M${ox1} ${oy1} A${WR} ${WR} 0 0 1 ${ox2} ${oy2} ` +
      `L${ix2} ${iy2} A${WR - WBAND} ${WR - WBAND} 0 0 0 ${ix1} ${iy1} Z` });
    const [x, y] = wheelPt(i * 30 + 15, WR - WBAND / 2);
    const t = svgEl(svg, "text", { x, y, class: "w-sign" }, asText(g));
    t.style.animationDelay = `${i * 50}ms`;
    WHEEL.signs[i] = { seg, glyph: t };
  });
  const planets = svgEl(svg, "g");
  SKY_BODIES.forEach((body) => {
    const tick = svgEl(planets, "line", { class: "w-tick" });
    const glyph = svgEl(planets, "text", { class: "w-planet" }, asText(GLYPHS[body]));
    WHEEL.planets[body] = { tick, glyph, lon: null, ring: 0 };
  });
  WHEEL.moon = svgEl(svg, "text", { x: WC, y: WC - 6, class: "w-moon" });
  WHEEL.lit = svgEl(svg, "text", { x: WC, y: WC + 19, class: "w-lit" });
  WHEEL.svg = svg;
}

function placePlanet(p, lon, ring, alpha = 1) {
  p.lon = lon;   // where it is right now, so a step mid-glide carries on from here
  p.ring = ring;
  const [x, y] = wheelPt(lon, ring);
  p.glyph.setAttribute("x", x);
  p.glyph.setAttribute("y", y);
  p.glyph.style.opacity = alpha;
  const [x1, y1] = wheelPt(lon, WR - WBAND), [x2, y2] = wheelPt(lon, WR - WBAND - 6);
  Object.entries({ x1, y1, x2, y2 }).forEach(([a, v]) => p.tick.setAttribute(a, v));
  p.tick.style.opacity = alpha;
}

// Moves the planets to this moment's places: they sweep in from the
// centre when the wheel opens, and glide the short way round after that.
function updateWheel(bodies, moon, opening) {
  const placed = [];
  const targets = [...bodies].sort((a, b) => a.lon - b.lon).map((b) => {
    let ring = WR - WBAND - 17;   // planets near each other step inwards
    while (placed.some((q) => q.ring === ring && Math.abs(((q.lon - b.lon + 540) % 360) - 180) < 10)) ring -= 20;
    placed.push({ lon: b.lon, ring });
    const p = WHEEL.planets[b.body];
    p.sign = b.sign;
    p.glyph.classList.toggle("retro", b.retro);
    const fresh = p.lon == null || opening;
    const from = fresh ? b.lon - 140 : p.lon;
    const to = from + ((((b.lon - from) % 360) + 540) % 360) - 180;
    const fromRing = fresh ? 8 : p.ring;
    return { p, from, to, fromRing, ring, fade: fresh };
  });
  WHEEL.moon.textContent = moon.icon;
  WHEEL.lit.textContent = `${moon.lit}% lit`;
  cancelAnimationFrame(WHEEL.raf);
  const done = () => targets.forEach((t) => placePlanet(t.p, t.to, t.ring));
  if (calm) { done(); return; }
  const start = performance.now(), dur = opening ? 1400 : 900;
  const ease = (k) => 1 - Math.pow(1 - k, 3);
  WHEEL.raf = requestAnimationFrame(function frame(now) {
    targets.forEach((t, i) => {
      const delay = opening ? i * 45 : 0;
      const k = ease(Math.min(1, Math.max(0, (now - start - delay) / dur)));
      placePlanet(t.p, t.from + (t.to - t.from) * k, t.fromRing + (t.ring - t.fromRing) * k, t.fade ? k : 1);
    });
    if (now - start < dur + targets.length * 45) WHEEL.raf = requestAnimationFrame(frame);
    else done();
  });
}

// The sheet's own night sky, like the home screen's.
const skySheetShown = () => !$("skySheet").hidden && !document.hidden;
const skyField = makeStarfield($("skyStars"), skySheetShown);

const SKY_UNITS = ["Hour", "Day", "Week", "Month", "Year"];
const SKY = { at: null, unit: "Day", shown: {} };   // at: null means now

function skyStep(dir) {
  const d = new Date(SKY.at || Date.now());
  if (SKY.unit === "Hour") d.setHours(d.getHours() + dir);
  if (SKY.unit === "Day") d.setDate(d.getDate() + dir);
  if (SKY.unit === "Week") d.setDate(d.getDate() + 7 * dir);
  if (SKY.unit === "Month") d.setMonth(d.getMonth() + dir);
  if (SKY.unit === "Year") d.setFullYear(d.getFullYear() + dir);
  SKY.at = d;
  renderSky();
}

function renderSky(opening = false) {
  const box = $("skyBody");
  box.innerHTML = "";
  if (typeof Astronomy === "undefined") {
    box.append(el("p", "empty-note", "The sky couldn't be worked out on this device."));
    return;
  }
  const date = SKY.at || new Date();
  const { bodies, moon } = skyAt(date);
  box.classList.toggle("entering", opening && !calm);

  const ornament = () => { const l = el("div", "rpg-line sky-orn"); l.append(el("i"), el("b"), el("i")); return l; };
  const when = el("p", "sky-when");
  when.append(el("span", "", `${date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · ${timeText(date)}`));
  if (SKY.at) {
    const now = el("button", "link small gold sky-now", "Now");
    now.addEventListener("click", () => { SKY.at = null; renderSky(); });
    when.append(now);
  }
  box.append(ornament(), when);

  // ‹ Hour Day Week Month Year ›
  const steps = el("div", "sky-steps");
  const back = el("button", "sky-arrow", "‹"), fwd = el("button", "sky-arrow", "›");
  back.setAttribute("aria-label", `Back one ${SKY.unit.toLowerCase()}`);
  fwd.setAttribute("aria-label", `Forward one ${SKY.unit.toLowerCase()}`);
  back.addEventListener("click", () => skyStep(-1));
  fwd.addEventListener("click", () => skyStep(1));
  const units = el("div", "sky-units");
  SKY_UNITS.forEach((u) => {
    const b = el("button", `chip sky-unit${u === SKY.unit ? " on" : ""}`, u);
    b.addEventListener("click", () => { SKY.unit = u; renderSky(); });
    units.append(b);
  });
  steps.append(back, units, fwd);
  box.append(steps);

  const moonPos = bodies.find((b) => b.body === "Moon");
  const lunation = el("div", "sky-moon");
  lunation.append(el("span", "sky-moon-main", `${moon.icon} ${moon.name} · Moon in ${SIGNS[moonPos.sign]} ${moonPos.dms}`),
    el("span", "sky-moon-note", `${moon.lit}% lit · day ${moon.day} of 29`));
  flashIfChanged(lunation, "moon", lunation.textContent, opening);
  fitOneLine([lunation.firstChild]);   // phase and Moon sign stay on one line

  // On a wide screen the wheel sits beside the list; on a phone above it.
  if (!WHEEL.svg) buildWheel();
  WHEEL.svg.classList.toggle("drawing", opening && !calm);
  const cols = el("div", "sky-cols"), side = el("div", "sky-side");
  cols.append(WHEEL.svg, side);
  box.append(cols);
  WHEEL.svg.getBoundingClientRect();   // settle it in its new place before it moves
  if (opening) WHEEL.hot = null;
  updateWheel(bodies, moon, opening);

  // Two columns, read down: Sun to Mars, then Jupiter to Chiron. The Moon is in the bar above.
  const list = el("div", "sky-list");
  bodies.filter((b) => b.body !== "Moon").forEach((p, i) => {
    const row = el("div", "sky-row");
    row.style.setProperty("--i", i);
    const info = el("span", "sky-info");
    const where = el("span", "sky-where", `${SIGNS[p.sign]} ${p.dms}`);
    if (p.retro) where.append(el("span", "sky-rx", " ℞"));
    info.append(el("span", "sky-name", p.body), where, el("small", "sky-rule", RULES[p.body]));
    row.append(el("span", "sky-glyph", asText(GLYPHS[p.body])), info);
    // Pointing at a tile lights up its planet and sign on the wheel; on a phone, a tap does.
    row.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") skyHot(p.body); });
    row.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") skyHot(null); });
    let down = null;
    row.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; });
    row.addEventListener("pointerup", (e) => {
      if (e.pointerType === "mouse") return;   // a mouse already lit it by pointing
      if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 10) return;   // a scroll, not a tap
      skyHot(WHEEL.hot === p.body ? null : p.body);
    });
    row.classList.toggle("hot", WHEEL.hot === p.body);
    row.dataset.body = p.body;
    flashIfChanged(row, p.body, where.textContent, opening);
    list.append(row);
  });
  side.append(lunation, list);
  // Every sign shows at one size: if the longest doesn't fit its tile, they all shrink together.
  fitOneLine([...list.querySelectorAll(".sky-where")]);
  fitSkyToWheel();
  skyHot(WHEEL.hot);   // the sign may have changed with the time
}

// On a wide screen the Moon bar and tiles grow together until they're as
// tall as the wheel beside them (or as wide as the room left allows).
function fitSkyToWheel() {
  const side = document.querySelector("#skySheet .sky-side"), cols = side?.parentElement;
  if (!side) return;
  side.style.fontSize = "";
  if (!matchMedia("(min-width: 900px)").matches) return;
  const fit = () => {
    if (!side.isConnected) return;
    const wheel = WHEEL.svg.getBoundingClientRect();
    if (!wheel.height) return;
    const gap = parseFloat(getComputedStyle(cols).columnGap) || 0;
    const room = cols.clientWidth - wheel.width - gap;
    let size = parseFloat(getComputedStyle(side).fontSize);
    for (let i = 0; i < 3; i++) {   // text and boxes don't grow in exact proportion, so settle in a few steps
      const r = side.getBoundingClientRect();
      size *= Math.min(wheel.height / r.height, room / r.width);
      side.style.fontSize = `${size.toFixed(2)}px`;
    }
  };
  fit();
  document.fonts?.ready.then(fit);
}
addEventListener("resize", () => { if (!$("skySheet").hidden) fitSkyToWheel(); });

// Lights up one planet and the sign it's in (null: none).
function skyHot(body) {
  WHEEL.hot = body;
  WHEEL.svg?.classList.toggle("focus", !!body);
  Object.entries(WHEEL.planets).forEach(([b, p]) => {
    p.glyph.classList.toggle("hot", b === body);
    p.tick.classList.toggle("hot", b === body);
  });
  const sign = body ? WHEEL.planets[body].sign : -1;
  WHEEL.signs.forEach((s, i) => { s.seg.classList.toggle("hot", i === sign); s.glyph.classList.toggle("hot", i === sign); });
  document.querySelectorAll("#skySheet .sky-row").forEach((r) => r.classList.toggle("hot", r.dataset.body === body));
}

// A soft gold glow on whatever changed since the last step.
function flashIfChanged(node, key, value, opening) {
  if (!opening && !calm && SKY.shown[key] != null && SKY.shown[key] !== value) node.classList.add("changed");
  SKY.shown[key] = value;
}

$("skyBtn").addEventListener("click", () => {
  SKY.at = null;
  SKY.shown = {};
  renderSky(true);
  slideIn($("skySheet"));
  fitSkyToWheel();   // now it's showing and can be measured
  skyField.size();
  skyField.start();
});
$("skyBack").addEventListener("click", async () => {
  await slideOut($("skySheet"));
  $("skySheet").hidden = true;
});
addEventListener("resize", () => { if (skySheetShown()) { skyField.size(); if (calm) skyField.draw(0); } });
document.addEventListener("visibilitychange", () => skyField.start());

// ── 6. Your history ─────────────────────────────────────

function renderHistory() {
  const box = $("historyList");
  box.innerHTML = "";
  const readings = loadHistory().sort((a, b) => b.t - a.t);
  if (!readings.length) {
    box.append(el("p", "empty-note history-empty", "Your readings will appear here once you've drawn some cards."));
    return;
  }
  let day = "";
  readings.forEach((r) => {
    const d = dateText(r.t);
    if (d !== day) { day = d; box.append(el("h3", "history-day", d)); }

    const item = el("div", "reading");
    const head = el("div", "reading-head");
    head.append(el("span", "", `${timeText(r.t)} · ${r.spread}`));
    const remove = el("button", "link small", "Remove");
    remove.addEventListener("click", () => {
      if (!confirm("Remove this reading from your history?")) return;
      removeReading(r.id);
      renderHistory();
    });
    // The cards, in order; tap one to open its page and swipe through the reading.
    const known = r.cards.map((c) => ({ c, card: CARDS.find((x) => x.name === c.name) })).filter((x) => x.card);
    const items = known.map(({ c, card }) => detailsItem(card, !!c.rev, c.label && c.label !== "Your card" ? c.label : ""));

    const actions = el("span", "reading-actions");
    if (known.length) {
      const sum = el("button", "link small gold", "Summary");
      // The spread's questions, if it still exists and has them.
      const positions = (SPREADS.find((sp) => sp.name === r.spread) || {}).positions || [];
      sum.addEventListener("click", () => {
        const entries = items.map((it, i) => ({ card: it.card, reversed: it.reversed, label: it.label,
          question: (positions[i] || {}).question || "" }));
        summonSummary((magic) => openSummary(entries, r.spread, magic));
      });
      actions.append(sum);
    }
    actions.append(remove);
    head.append(actions);
    const row = el("div", "related-row");
    known.forEach(({ c, card }, i) => {
      const b = el("button", "related-card");
      const pic = el("div", "related-pic");
      const face = cardFace(card, true, !!c.rev);
      face.style.height = "100%";
      pic.append(face);
      if (items[i].label) b.append(el("span", "related-label", items[i].label));
      b.append(pic, el("span", "related-name", c.rev ? `${card.name}, reversed` : card.name));
      b.setAttribute("aria-label", `${c.label ? c.label + ": " : ""}${card.name}${c.rev ? ", reversed" : ""}`);
      b.addEventListener("click", () => openDetails(items, i));
      row.append(b);
    });
    item.append(head, row);
    box.append(item);
  });
}

$("historyBtn").addEventListener("click", () => {
  renderHistory();
  slideIn($("history"));
});
$("historyBack").addEventListener("click", async () => {
  await slideOut($("history"));
  $("history").hidden = true;
});

// ── Backups ─────────────────────────────────────────────

async function exportBackup() {
  const data = {
    app: "Bearcana",
    version: 1,
    exported: new Date().toISOString(),
    history: loadHistory(),
    notes: loadNotes(),
  };
  const stamp = new Date().toISOString().slice(0, 10);
  const name = `bearcana-backup-${stamp}.json`;
  const file = new File([JSON.stringify(data, null, 2)], name, { type: "application/json" });

  // On a phone: the share sheet, so it can go to Files, iCloud Drive or email.
  if (!canHover && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Bearcana backup" });
      return;
    } catch (e) {
      if (e.name === "AbortError") return;
    }
  }
  // On a computer: an ordinary download.
  const url = URL.createObjectURL(file);
  const a = el("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Adds a backup's readings and notes to what's here; nothing is lost.
// A note that differs from the one here is added below it.
function importBackup(data) {
  if (!data || !Array.isArray(data.history) || typeof data.notes !== "object") {
    alert("That file doesn't look like a Bearcana backup.");
    return;
  }
  const history = loadHistory();
  const ids = new Set(history.map((r) => r.id));
  let readings = 0;
  data.history.forEach((r) => {
    if (!r || !r.id || !Number.isFinite(r.t) || !Array.isArray(r.cards) || ids.has(r.id)) return;
    history.push(r);
    ids.add(r.id);
    readings++;
  });
  history.sort((a, b) => a.t - b.t);

  const notes = loadNotes();
  let added = 0;
  Object.entries(data.notes || {}).forEach(([name, text]) => {
    if (typeof text !== "string" || !text.trim()) return;
    const here = notes[name] || "";
    if (here.includes(text)) return;
    notes[name] = here.trim() ? `${here}\n\n${text}` : text;
    added++;
  });

  if (!writeJSON(HISTORY_KEY, history) || !writeJSON(NOTES_KEY, notes)) {
    alert("Couldn't save the backup on this device.");
    return;
  }
  const r = readings === 1 ? "1 reading" : `${readings} readings`;
  const n = added === 1 ? "1 note" : `${added} notes`;
  alert(`Imported ${r} and ${n}.`);
  renderHistory();
}

$("exportBtn").addEventListener("click", exportBackup);
$("importBtn").addEventListener("click", () => $("importFile").click());
$("importFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    importBackup(JSON.parse(await file.text()));
  } catch {
    alert("That file couldn't be read.");
  }
});

// Lets the app open without internet once it has been visited.
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js");
}
