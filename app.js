// How the app works. You normally only need to edit cards.js and spreads.js.

const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

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
    { duration: 420, delay: 100 + i * 28, easing: "ease-out", fill: "both" }));
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
  window.scrollTo(0, 0);
  startSky();
}

// ── The home screen's night sky and floating deck ───────

const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const homeShown = () => !$("home").hidden && !document.hidden;

// Twinkling stars and gold dust drifting upward.
const sky = { stars: [], dust: [], running: false };

function sizeSky() {
  const c = $("sky");
  const r = Math.min(devicePixelRatio || 1, 2);
  c.width = innerWidth * r;
  c.height = innerHeight * r;
  c.getContext("2d").setTransform(r, 0, 0, r, 0, 0);
  const n = Math.round((innerWidth * innerHeight) / 9000);
  sky.stars = Array.from({ length: Math.min(n, 140) }, () => ({
    x: Math.random(), y: Math.random(),
    s: Math.random() * 1.1 + 0.3, p: Math.random() * 6, v: 0.5 + Math.random(),
  }));
  sky.dust = Array.from({ length: Math.min(Math.round(n / 4), 30) }, () => ({
    x: Math.random(), y: Math.random(),
    s: Math.random() * 1.4 + 0.7, v: 0.00025 + Math.random() * 0.0004,
  }));
}

function drawSky(t) {
  const x = $("sky").getContext("2d");
  const W = innerWidth, H = innerHeight;
  x.clearRect(0, 0, W, H);
  x.fillStyle = "#e9e2d3";
  for (const s of sky.stars) {
    x.globalAlpha = calm ? 0.6 : 0.2 + 0.8 * Math.abs(Math.sin(t / 1100 * s.v + s.p));
    x.beginPath(); x.arc(s.x * W, s.y * H, s.s, 0, 7); x.fill();
  }
  if (!calm) {
    x.fillStyle = "#e3c98f";
    for (const d of sky.dust) {
      d.y -= d.v;
      if (d.y < -0.02) { d.y = 1.02; d.x = Math.random(); }
      x.globalAlpha = 0.7 * Math.sin(Math.max(0, d.y) * Math.PI);
      x.beginPath();
      x.arc(d.x * W + Math.sin(t / 900 + d.x * 9) * 8, d.y * H, d.s, 0, 7);
      x.fill();
    }
  }
  x.globalAlpha = 1;
}

function startSky() {
  if (sky.running || !homeShown()) return;
  if (calm) { drawSky(0); return; }
  sky.running = true;
  requestAnimationFrame(function frame(t) {
    if (!homeShown()) { sky.running = false; return; }   // rests while away
    drawSky(t);
    requestAnimationFrame(frame);
  });
}

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
    const bob = el("div", "fd-bob");
    bob.style.animationDelay = `${-i * 0.45}s`;
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
    { duration: 1400, easing: "ease-out", fill: "forwards" }
  );
  rays.animate(
    [{ transform: "scale(.2) rotate(0deg)", opacity: 0 }, { transform: "scale(1) rotate(25deg)", opacity: 1, offset: 0.3 }, { transform: "scale(1.5) rotate(70deg)", opacity: 0 }],
    { duration: 1800, easing: "ease-out", fill: "forwards" }
  );
  for (let i = 0; i < 22; i++) {
    const s = el("div", "sun-spark");
    sun.append(s);
    const a = (i / 22) * Math.PI * 2 + Math.random() * 0.3;
    const r = 70 + Math.random() * 90;
    s.animate(
      [{ transform: "translate(0,0) scale(1)", opacity: 1 },
       { transform: `translate(${Math.cos(a) * r}px, ${Math.sin(a) * r}px) scale(.3)`, opacity: 0 }],
      { duration: 900 + Math.random() * 700, delay: 120, easing: "cubic-bezier(.1,.8,.3,1)", fill: "both" }
    );
  }
  setTimeout(() => sun.remove(), 2000);
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
  label.classList.remove("fade");
  await wait(700);
  fdBusy = false;
}

$("floatDeck").addEventListener("click", revealCardOfTheDay);
$("cotd").addEventListener("click", revealCardOfTheDay);

addEventListener("resize", () => { sizeSky(); if (calm) drawSky(0); });
document.addEventListener("visibilitychange", startSky);
sizeSky();
buildFloatDeck();
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
  $("spreadName").textContent = spread.name;
  $("endActions").hidden = true;

  const slots = $("slots");
  slots.innerHTML = "";
  slots.dataset.count = Math.min(n, 5);
  spread.positions.forEach((pos, i) => {
    const s = el("div", "slot");
    const box = el("div", "slot-card");
    // The card's name and its key word appear here once it's turned over.
    const nameEl = el("div", "slot-name", " ");
    const kwEl = el("div", "slot-kw", " ");
    s.append(box, nameEl, kwEl, el("div", "slot-label", pos.label));
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
    const a = count === 1 ? 0 : -width / 2 + (width * i) / (count - 1);
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
  if (!calm) magicFlight(flyer, fanCard);

  await flyer.animate(
    [
      { transform: `rotate(${a}deg)` },
      { transform: `translate(0, -26px) rotate(${a}deg) scale(1.08)`, offset: 0.2 },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
    ],
    { duration: 700, easing: "cubic-bezier(.4,0,.2,1)" }
  ).finished;
  t.style.visibility = "";
  flyer.remove();
  slot.placed = true;   // it can be turned over now, even before the rest are picked
  if (S !== reading) return;
  if (!calm) magicLand(slot.i);

  if (allPicked) {
    await wait(150);
    await gatherFan();
    if (S !== reading) return;
    S.phase = "turn";
    refreshKeywords();   // now that every card is known
    if (S.revealed === S.n) setHint(S.n === 1 ? "Tap the card to read it" : "Tap any card to read it");
    else setHint(S.n === 1 ? "Tap the card to turn it over" : S.revealed ? "Tap a card to turn it over, or a turned one to read it" : "Tap a card to turn it over");
  }
}

// Sweep the rest of the cards away once the spread is full.
async function gatherFan() {
  const cards = [...$("fan").children].filter((c) => !c.dataset.taken);
  await Promise.all(cards.map((c, i) => c.animate(
    [
      { transform: `rotate(${c.dataset.angle}deg)`, opacity: 1 },
      { transform: "rotate(0deg) translateY(60px)", opacity: 0 },
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

// The key word under each turned card, recalculated as more cards join the spread.
function refreshKeywords() {
  S.slots.forEach((s) => { if (s.flipped && s.kwEl) s.kwEl.textContent = spreadKeyword(s) || " "; });
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
    slot.nameEl.textContent = slot.card.name;
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
    const last = S.revealed === S.n, first = S.revealed === 1;
    await wait(800);
    if (S !== reading) return;
    slot.turning = false;
    if (last) {
      setHint(S.n === 1 ? "Tap the card to read it" : "Tap any card to read it");
      $("summaryBtn").hidden = false;
      $("endActions").hidden = false;
      $("endActions").animate([{ opacity: 0 }, { opacity: 1 }], 400);
    } else if (first && S.picked === S.n && S.phase === "turn") {
      setHint("Tap a turned card to read it");   // while still picking, the pick hint stays
    }
    return;   // turning a card only shows it; tap it again to read it
  }
  openQuick(slot.i);
}

// ── The table's magic ───────────────────────────────────
// Drawn on a canvas behind the cards, faint enough never to compete
// with them. A revealed card gets a burst of light and a slowly turning
// ring of runes; energy then travels along a line to the next card.
// Once every card is turned, threads from all of them meet in the
// middle and a great rune circle forms around the spread, turning for
// as long as the reading stays open.

// Runes as little line drawings (in a 12 × 16 box), so every phone shows them.
const RUNES = [
  "M3 0V16M3 3L9 0M3 8L9 5",            // fehu
  "M2 16V0L8 5V16",                     // uruz
  "M3 0V16M3 4L8 8L3 12",               // thurisaz
  "M3 0V16M3 0L9 4M3 5L9 9",            // ansuz
  "M3 16V0L8 4L3 8L9 16",               // raidho
  "M8 2L3 8L8 14",                      // kenaz
  "M2 2L10 14M10 2L2 14",               // gebo
  "M6 0V16",                            // isa
  "M6 16V0M6 6L1 0M6 6L11 0",           // algiz
  "M8 0L3 6L9 10L4 16",                 // sowilo
  "M6 16V0M1 5L6 0L11 5",               // tiwaz
  "M3 0V16M3 0L9 4L3 8L9 12L3 16",      // berkano
  "M2 16V0M10 16V0M2 0L10 8M10 0L2 8",  // mannaz
  "M2 16L9 6L6 0L3 6L10 16",            // othala
  "M1 2V14L11 2V14L1 2",                // dagaz
  "M6 0L11 8L6 16L1 8Z",                // ingwaz
].map((d) => new Path2D(d));

const GOLD = "201, 169, 110";
const MG = { cv: null, ctx: null, running: false, cards: [], travels: [], links: [], finale: 0, w: 0, h: 0,
  flyers: [], ghosts: [], flares: [], motes: [] };

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
  MG.cards = []; MG.travels = []; MG.links = []; MG.finale = 0;
  MG.flyers = []; MG.ghosts = []; MG.flares = []; MG.motes = [];
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
  Earth: ["#3b2817", "#5e4126"], Air: ["#36578a", "#6e8fbf"],
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

// g = the card's box { x, y, w, h }; age = ms since the frame began.
function drawFrame(x, g, el, t, age, inset = FRAME_INSET) {
  const B = Math.max(7, g.w * 0.085), o = B * 0.3, r = 6;
  // i is the frame's depth inside the card on the sides; each side's own
  // depth comes from FRAME_INSET, and every effect is spread to fill it.
  const ins = { t: g.w * inset.t, r: g.w * inset.r, b: g.w * inset.b, l: g.w * inset.l };
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
  x.globalAlpha = fade;
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
    x.shadowBlur = 14;
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
        x.shadowBlur = 16;
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
      x.globalAlpha = fade * ca;
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
  if (!S) return;
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
  if (!MG.cards[i]) {
    MG.cards[i] = { at: now, runes: Array.from({ length: 8 }, () => rand(RUNES.length)), spin: rand(2) ? 1 : -1,
      element: S.slots[i].card ? elementFor(S.slots[i].card) : null };
    if (S.slots[i].card) measureInset(S.slots[i].card);
  }
  const waiting = S.slots.map((s, k) => k).filter((k) => !MG.cards[k]);
  if (waiting.length) {
    const next = waiting.find((k) => k > i) ?? waiting[0];
    MG.travels.push({ from: i, to: next, at: now, dur: 1100 });
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
  if (MG.waitAt && !MG.cards[MG.waitAt.i]) {
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

  // All turned: threads from every card meet in the middle, then a great
  // rune circle forms around the whole spread and keeps turning.
  if (MG.finale && t >= MG.finale) {
    const left = Math.min(...geo.map((g) => g.x - g.rx)), right = Math.max(...geo.map((g) => g.x + g.rx));
    const top = Math.min(...geo.map((g) => g.y - g.ry)), bottom = Math.max(...geo.map((g) => g.y + g.ry));
    const cx = (left + right) / 2, cy = (top + bottom) / 2;
    const header = document.querySelector("#table .bar").getBoundingClientRect().bottom;
    // The great circle hugs the spread, but stays clear of the header and the screen's edges.
    const RX = Math.min((right - left) / 2 + 30, MG.w / 2 - 24);
    const RY = Math.max(40, Math.min((bottom - top) / 2 + 34, cy - header - 26));
    const gather = Math.min(1, (t - MG.finale) / 900);
    // The threads meet in a seal just above the spread, where nothing covers it.
    const seal = { x: cx, y: Math.max(top - 44, header + 16) };
    geo.forEach((g, i) => {
      const path = pointPath(g, seal, i % 2 ? 0.15 : -0.15);
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
    if (gather >= 1) {
      const bloom = Math.min(1, (t - MG.finale - 900) / 1400);
      // A small glowing seal where the threads meet.
      const sealR = 7 + 2 * Math.sin(t / 700);
      const grad = ctx.createRadialGradient(seal.x, seal.y, 0, seal.x, seal.y, 26);
      grad.addColorStop(0, `rgba(255, 226, 170, ${0.28 * bloom})`);
      grad.addColorStop(1, "rgba(255, 226, 170, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(seal.x - 26, seal.y - 26, 52, 52);
      ctx.strokeStyle = `rgba(${GOLD}, ${0.4 * bloom})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(seal.x, seal.y, sealR, 0, Math.PI * 2);
      ctx.stroke();
      rune(ctx, RUNES[15], seal.x, seal.y, 10, t / 9000, 0.85 * bloom);   // ingwaz at the heart
      // The great circle, drawn outward from the top, then its runes.
      ctx.save();
      ctx.strokeStyle = `rgba(${GOLD}, ${0.2 * bloom * pulse})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, RX, RY, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * bloom);
      ctx.stroke();
      ctx.setLineDash([1, 6]);
      ctx.lineDashOffset = t / 70;
      ctx.beginPath();
      ctx.ellipse(cx, cy, RX + 8, RY + 8, 0, 0, Math.PI * 2 * bloom);
      ctx.stroke();
      ctx.restore();
      const count = Math.max(12, Math.round((RX + RY) / 14));
      for (let k = 0; k < count; k++) {
        if (k / count > bloom) break;
        const ang = (k / count) * Math.PI * 2 - (t / 40000);
        const x = cx + Math.cos(ang) * (RX + 18), y = cy + Math.sin(ang) * (RY + 18);
        const tw = 0.6 + 0.4 * Math.sin(t / 1100 + k);
        rune(ctx, RUNES[(k * 7) % RUNES.length], x, y, 10, ang + Math.PI / 2, 0.65 * tw * bloom);
      }
    }
  }
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
  beginnings: ["begin", "new ", "spark", "seed", "potential", "opportunit", "venture", "dawn", "readiness", "preparation", "groundwork", "inspiration"],
  intuition:  ["intuition", "knowing", "dream", "subconscious", "mystery", "unknown", "imagination", "insight", "perception", "recepti", "sensitiv", "listening", "inner guidance", "inner teacher", "night mind", "beneath the surface"],
  heart:      ["love", "heart", "feeling", "emotion", "compassion", "empathy", "romance", "connection", "union", "partnership", "attraction", "care", "kindness", "nurtur", "tender"],
  together:   ["community", "friend", "family", "together", "belonging", "team", "collaborat", "cooperat", "sharing", "shared", "lineage", "heritage", "legacy", "group", "support", "partnership", "mutual"],
  stillness:  ["rest", "stillness", "pause", "patience", "calm", "serenity", "peace", "retreat", "recovery", "restoration", "waiting", "letting be", "solitude", "replenish", "pacing", "delays"],
  reflection: ["reflection", "introspection", "contemplation", "review", "re-evaluation", "assessment", "awareness", "discernment", "perspective", "wisdom", "questioning", "inner", "lessons"],
  change:     ["change", "transformation", "transition", "ending", "closure", "release", "moving on", "rebirth", "turning", "cycles", "sudden", "breakthrough", "revelation", "clearing", "letting go", "surrender", "liberation", "unfinished", "last step"],
  renewal:    ["renewal", "healing", "hope", "recovery", "rekindled", "restoration", "rebirth", "new dawn", "replenish", "faith", "serenity"],
  truth:      ["truth", "clarity", "honest", "clear", "fairness", "accountab", "reason", "principles", "integrity", "insight", "revelation", "unspoken", "mental fog"],
  will:       ["will", "drive", "determination", "ambition", "action", "courage", "boldness", "conviction", "focus", "momentum", "energy", "passion", "fire", "speed", "standing firm", "persever", "persist", "resilience", "endurance", "strength"],
  structure:  ["structure", "stability", "security", "foundation", "discipline", "authority", "leadership", "control", "rigid", "routine", "responsibility", "boundaries", "tradition", "stewardship", "reliability", "steadiness", "conservation", "saving"],
  abundance:  ["abundance", "prosperity", "wealth", "generosity", "giving", "receiving", "reward", "fulfilment", "contentment", "satisfaction", "gratitude", "enough", "pleasure", "comfort"],
  craft:      ["skill", "craft", "mastery", "practice", "dedication", "diligence", "study", "learning", "effort", "work", "manifestation", "resourceful", "practical", "cultivation", "follow-through", "consistency"],
  joy:        ["joy", "celebration", "play", "pleasure", "happiness", "warmth", "vitality", "milestone", "enthusiasm", "innocence"],
  freedom:    ["freedom", "liberation", "independence", "free spirit", "spontaneity", "adventure", "exploration", "journey", "discovery", "expansion", "unconventional", "seeking", "curiosity"],
  shadow:     ["attachment", "habits", "desire", "doubt", "worry", "fear", "self-limiting", "defensive", "conflict", "grief", "heartache", "exhaustion", "weariness", "isolation", "restless", "impatience", "perfectionism", "rigid", "urgency", "friction", "hesitation"],
  balance:    ["balance", "harmony", "moderation", "alignment", "adaptability", "flexibility", "priorities", "juggling", "integration", "wholeness", "heart and mind", "realignment"],
  choice:     ["choice", "choos", "decision", "options", "weighing", "direction", "planning", "vision", "foresight", "intention", "discernment", "crossroad"],
  self:       ["self-", "worth", "confidence", "authenticity", "recognition", "visibility", "personal truth", "embodiment", "inner child", "validation"],
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
  beginnings: ["Beginnings", "Something new is asking to be started or welcomed.", "What is ready to begin?"],
  intuition:  ["Intuition", "Inner knowing and dreams are speaking; listening inward is part of the answer.", "What do you already sense, beneath the thinking?"],
  heart:      ["The heart", "Feelings and relationships sit at the centre of this reading.", "What is your heart asking for?"],
  together:   ["Belonging", "Other people, community and support play a part here.", "Who walks this part of the path with you?"],
  stillness:  ["Stillness", "Rest, patience and pause return again and again.", "Where could a pause serve you more than a push?"],
  reflection: ["Reflection", "The reading turns inward, toward awareness and honest review.", "What becomes clear when you look inward?"],
  change:     ["Change", "Something is transforming; endings and transitions make room for what comes next.", "What is ready to change, and what is it making room for?"],
  renewal:    ["Renewal", "Healing and hope run through the cards.", "What is quietly healing in you?"],
  truth:      ["Truth and clarity", "Honesty and clear seeing are being asked for.", "What truth would set things in order?"],
  will:       ["Will and action", "Energy, courage and drive are there to move things forward.", "Where does your energy want to go?"],
  structure:  ["Foundations", "Structure, boundaries and responsibility are in focus.", "What foundation would help you feel secure?"],
  abundance:  ["Abundance", "Giving, receiving and contentment are recurring threads.", "What are you ready to receive?"],
  craft:      ["Craft and effort", "Skill, practice and steady work are part of the path.", "What deserves your patient effort?"],
  joy:        ["Joy", "Celebration and lightness are close at hand.", "What could you let yourself enjoy?"],
  freedom:    ["Exploration", "Curiosity and the wish to explore are calling.", "Where is curiosity leading you?"],
  shadow:     ["Inner work", "Some cards point to tender places, doubts, attachments or weariness, that are ready to be seen with kindness.", "What tender place is ready to be met with kindness?"],
  balance:    ["Balance", "Harmony and gentle adjustment between different parts of life.", "What needs rebalancing?"],
  choice:     ["Choice and direction", "A direction is being chosen; vision and intention matter.", "Which direction feels true to you?"],
  self:       ["Self-worth", "How you see and value yourself is part of the story.", "How could you value yourself a little more?"],
};

const ELEMENT_TEXT = {
  Fire:  "passion, will and creative energy",
  Water: "feelings, intuition and relationships",
  Air:   "thought, truth and communication",
  Earth: "the body, work, home and the material world",
};

const NUMBER_TEXT = {
  1: "beginnings and pure potential", 2: "balance, choice and partnership", 3: "growth, creation and collaboration",
  4: "stability, rest and structure", 5: "challenge and change", 6: "harmony, giving and moving on",
  7: "reflection and inner work", 8: "movement, mastery and inner power", 9: "ripening and near completion",
  10: "completion and the start of a new cycle",
};

const RANK_TEXT = {
  Page: "messages, study and fresh starts", Knight: "movement and pursuit",
  Queen: "inner mastery and nurturing", King: "outer mastery and leadership",
};

// Things in the pictures, and what they stand for.
const SYMBOLS = [
  ["water", /\b(water|pool|stream|river|pond|streams)\b/, "feeling and the flow of the unconscious"],
  ["the moon", /\b(moon|crescent)\b/, "intuition, cycles and what is hidden"],
  ["the sun", /\b(sun|sunflowers?)\b/, "clarity, vitality and awareness"],
  ["stars", /\bstars?\b/, "hope and guidance"],
  ["mountains", /\b(mountains?|peaks?|cliff)\b/, "challenge and a higher view"],
  ["trees and growth", /\b(tree|vines?|garden|wheat|leaves|wood)\b/, "growth and rootedness"],
  ["clouds", /\bclouds?\b/, "the unseen, spirit and gifts from beyond"],
  ["the sea", /\b(sea|ships?|boat|waves)\b/, "the depths of feeling and life's movement"],
  ["flowers", /\b(flowers?|roses?|lil(y|ies)|lotus|garland)\b/, "blossoming, beauty and purity"],
  ["crowns", /\bcrown(ed)?\b/, "mastery and higher purpose"],
  ["lions", /\blions?\b/, "courage and instinct"],
  ["horses", /\bhorses?\b/, "movement and drive"],
  ["dogs and wolves", /\b(dogs?|wolf)\b/, "loyalty and instinct"],
  ["children", /\b(child|children)\b/, "innocence and new life"],
  ["angels", /\bangel('s)?\b/, "guidance and blessing"],
  ["pillars and thresholds", /\b(pillars?|arch(way)?|gateway)\b/, "thresholds and the meeting of opposites"],
  ["paths and bridges", /\b(path|road|bridge)\b/, "the journey ahead"],
  ["castles and homes", /\b(castle|town|city|house|home|houses)\b/, "security and what has been built"],
];

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

// ── How neighbouring cards meet ─────────────────────────

const ELEMENT_PAIRS = {
  "Fire+Fire": "passion doubles and burns brighter",
  "Water+Water": "feeling deepens",
  "Air+Air": "thought sharpens",
  "Earth+Earth": "steadiness builds on steadiness",
  "Air+Fire": "ideas fan the flame, giving energy a direction",
  "Earth+Water": "feeling finds form and nourishment",
  "Fire+Water": "passion and feeling pull against each other and ask for balance",
  "Air+Earth": "ideas meet practical reality and ask to be grounded",
  "Earth+Fire": "drive slowly becomes something real",
  "Air+Water": "feelings look for words",
};

const numberOf = (card) => (card.court ? null : +((card.correspondences || {}).number || NaN));

function pairLine(a, b, nameA, nameB) {
  const bits = [];
  const ea = elementOf(a.card), eb = elementOf(b.card);
  if (ea && eb) bits.push(ELEMENT_PAIRS[[ea, eb].sort().join("+")]);
  const na = numberOf(a.card), nb = numberOf(b.card);
  const minorA = !isMajorCard(a.card), minorB = !isMajorCard(b.card);
  if (minorA && minorB && na >= 1 && nb >= 1) {
    if (nb === na + 1) bits.push("the numbers climb, a natural step forward");
    else if (nb === na) bits.push("the same number sounds twice, so its lesson is underlined");
    else if (nb < na) bits.push("the numbers step back, returning to an earlier stage");
  }
  if (!minorA && minorB) bits.push("a larger lesson arrives in everyday life");
  if (minorA && !minorB) bits.push("an everyday matter opens onto something larger");
  if (!a.reversed && b.reversed) bits.push("the energy turns inward");
  if (a.reversed && !b.reversed) bits.push("what was held back begins to flow");
  if (!bits.length) return null;
  const text = bits.slice(0, 2).join("; ");
  return { head: `${nameA} → ${nameB}`, text: text.charAt(0).toUpperCase() + text.slice(1) + "." };
}

// ── The story of the whole spread ───────────────────────

function storyLines(entries) {
  const n = entries.length;
  const themes = entries.map((e) => new Set(filled(keywordsFor(e.card, e.reversed)).flatMap(themesOf)));
  const key = entries.map((e) => linkedKeyword(e, entries));
  const first = themes[0], last = themes[n - 1];
  const lines = [];
  if (n === 2) lines.push(`It starts with ${key[0]} and leads toward ${key[1]}.`);
  else if (n > 2) {
    const mid = key[Math.floor((n - 1) / 2)];
    lines.push(`It starts with ${key[0]}, turns on ${mid}, and leads toward ${key[n - 1]}.`);
  }
  const has = (set, ...ts) => ts.some((t) => set.has(t));
  if (n > 1) {
    if (has(first, "change", "shadow") && has(last, "renewal", "beginnings", "joy")) {
      lines.push("The arc runs from an ending or a hard place toward renewal.");
    } else if (has(first, "stillness", "shadow", "reflection") && has(last, "will", "freedom", "beginnings")) {
      lines.push("The arc runs from stillness toward movement: what has been resting is ready to act.");
    } else if (has(first, "will", "freedom") && has(last, "stillness", "reflection")) {
      lines.push("The arc runs from action toward rest: after the effort comes reflection.");
    } else if (has(first, "heart", "together") && has(last, "self", "freedom")) {
      lines.push("The arc runs from others toward yourself: connection becomes self-knowledge.");
    }
    const half = Math.ceil(n / 2);
    const earlyRev = entries.slice(0, half).filter((e) => e.reversed).length;
    const lateRev = entries.slice(half).filter((e) => e.reversed).length;
    if (earlyRev && !lateRev) lines.push("Reversed cards come early and upright ones later: things are opening up.");
    if (!earlyRev && lateRev) lines.push("Upright cards come first and reversed ones later: the reading turns inward as it goes.");
  }
  return lines;
}

// ── The summary itself ──────────────────────────────────
// Card names stay in the row of cards at the top; the text speaks of
// places and patterns instead.

const countOf = (k, n) => (n === 2 && k === 2 ? "both cards" : `${k} of the ${n} cards`);

function patternParts(entries) {
  const n = entries.length;
  const parts = [];
  const kw = entries.map((e) => filled(keywordsFor(e.card, e.reversed)).map((w) => w.toLowerCase()));

  // Themes, by how many cards touch them.
  const themeCount = {};
  kw.forEach((words) => new Set(words.flatMap(themesOf)).forEach((t) => (themeCount[t] = (themeCount[t] || 0) + 1)));
  const themes = Object.keys(themeCount).filter((t) => themeCount[t] >= 2)
    .sort((a, b) => themeCount[b] - themeCount[a]).slice(0, 4);
  if (themes.length) {
    parts.push(["Repeating themes", themes.map((t) =>
      ({ head: THEME_TEXT[t][0], text: `${THEME_TEXT[t][1]} In ${countOf(themeCount[t], n)}.` }))]);
  }

  // Words shared by two or more cards: whole keywords, or words inside them.
  const STOP = new Set(["with", "from", "into", "your", "self", "that", "the", "and", "what", "inner", "new"]);
  const wordCount = {};
  kw.forEach((words) => {
    const seen = new Set();
    words.forEach((k) => {
      seen.add(k);
      k.split(/[\s-]+/).filter((w) => w.length > 3 && !STOP.has(w)).forEach((w) => seen.add(w));
    });
    seen.forEach((w) => (wordCount[w] = (wordCount[w] || 0) + 1));
  });
  const words = Object.keys(wordCount).filter((w) => wordCount[w] >= 2)
    .sort((a, b) => wordCount[b] - wordCount[a] || b.length - a.length);
  const shown = words.filter((w) => !words.some((o) => o !== w && o.includes(w) && wordCount[o] === wordCount[w])).slice(0, 5);
  if (shown.length) parts.push(["Repeating words", shown.map((w) => ({ head: w, text: `In ${countOf(wordCount[w], n)}.` }))]);

  // Symbolism.
  const sym = [];
  const els = {};
  entries.forEach((e) => { const x = elementOf(e.card); if (x) els[x] = (els[x] || 0) + 1; });
  const topEl = Object.keys(els).sort((a, b) => els[b] - els[a])[0];
  if (topEl && els[topEl] >= 2) sym.push({ head: topEl, text: `${countOf(els[topEl], n)} belong to ${topEl}: ${ELEMENT_TEXT[topEl]}.` });
  if (n >= 4) {
    const missing = Object.keys(ELEMENT_TEXT).filter((x) => !els[x]);
    if (missing.length === 1) sym.push({ head: `No ${missing[0]}`, text: `${missing[0]}, ${ELEMENT_TEXT[missing[0]]}, is quiet here; it may be what to bring in.` });
  }
  const majors = entries.filter((e) => isMajorCard(e.card)).length;
  if (majors >= 2 && majors >= Math.ceil(n / 2)) {
    sym.push({ head: "Major Arcana", text: `${countOf(majors, n)} are Major Arcana: this touches deeper life lessons, beyond day-to-day matters.` });
  } else if (!majors && n >= 3) {
    sym.push({ head: "Minor Arcana only", text: "Every card is a Minor card: this lies within everyday life, where your own choices shape it." });
  }
  const nums = {};
  entries.forEach((e) => { const x = numberOf(e.card); if (x >= 1 && x <= 10) nums[x] = (nums[x] || 0) + 1; });
  Object.keys(nums).filter((k) => nums[k] >= 2).forEach((k) =>
    sym.push({ head: `The number ${k}`, text: `${countOf(nums[k], n)} share it: ${NUMBER_TEXT[k]}.` }));
  const ranks = {};
  entries.filter((e) => e.card.court).forEach((e) => { const r = e.card.name.split(" ")[0]; ranks[r] = (ranks[r] || 0) + 1; });
  Object.keys(ranks).filter((r) => ranks[r] >= 2).forEach((r) =>
    sym.push({ head: `${r}s`, text: `${countOf(ranks[r], n)} are ${r}s: ${RANK_TEXT[r]}.` }));
  const stars = {};
  entries.forEach((e) => starsOf(e.card).forEach((s) => (stars[s] = (stars[s] || 0) + 1)));
  Object.keys(stars).filter((s) => stars[s] >= 2).forEach((s) => {
    const name = s === "Sun" || s === "Moon" ? `the ${s}` : s;
    sym.push({ head: `Under ${name}`, text: `${countOf(stars[s], n)} share ${name} in their astrology.` });
  });
  SYMBOLS.forEach(([name, re, meaning]) => {
    const k = entries.filter((e) => filled(e.card.picture).some((p) => re.test(p.toLowerCase()))).length;
    if (k >= 2) sym.push({ head: name, text: `In ${k} of the pictures: ${meaning}.` });
  });
  const revs = entries.filter((e) => e.reversed).length;
  if (revs && revs >= Math.ceil(n / 2)) {
    sym.push({ head: "Reversed cards", text: `${countOf(revs, n)} are reversed: much of this is happening inwardly, still forming or asking for attention.` });
  }
  if (sym.length) parts.push(["Symbolism", sym.slice(0, 7)]);
  return { parts, themes, topEl, els, majors, revs };
}

function listSection(title, items) {
  const sec = el("section", "summary-part");
  sec.append(el("p", "asks-title", title));
  const ul = el("ul");
  items.forEach(({ head, text, sub }) => {
    const li = el("li");
    if (head) li.append(el("strong", "", head));
    li.append(el("span", "", text));
    if (sub) li.append(el("em", "summary-q", sub));
    ul.append(li);
  });
  sec.append(ul);
  return sec;
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
  const row = el("div", "related-row summary-cards");
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

  // One lens at a time, stepped through with arrows (or the dots below),
  // and the parts that change with it.
  const lenses = lensesFor(entries);
  const lensBox = el("div", "lens");
  const prev = el("button", "nav-btn", "‹"), next = el("button", "nav-btn", "›");
  prev.setAttribute("aria-label", "Previous way of reading");
  next.setAttribute("aria-label", "Next way of reading");
  const lensName = el("p", "lens-name");
  lensName.setAttribute("aria-live", "polite");
  lensBox.append(prev, lensName, next);
  const dots = el("div", "lens-dots");
  const lensPart = el("div");
  let current = 0;
  const render = () => {
    const lens = lenses[current];
    if (lens) lensName.textContent = lens.name;
    [...dots.children].forEach((c, i) => c.classList.toggle("on", i === current));
    entries.forEach((e, i) => { placeLabels[i].textContent = lens ? placeName(lens, i, e) : e.label || ""; });
    lensPart.innerHTML = "";
    if (!lens) return;
    lensPart.append(listSection("The reading", entries.map((e, i) => ({
      head: placeName(lens, i, e),
      // The place is already the heading, so drop the line's own "Ahead: " lead-in.
      text: (() => { const t = placeLine(e, lens.places[i], i).replace(/^[^:]+:\s*/, ""); return t.charAt(0).toUpperCase() + t.slice(1); })(),
      sub: lens.own && e.question ? e.question : "",
    }))));
    const pairs = [];
    for (let i = 0; i < n - 1; i++) {
      const p = pairLine(entries[i], entries[i + 1], placeName(lens, i, entries[i]), placeName(lens, i + 1, entries[i + 1]));
      if (p) pairs.push(p);
    }
    if (pairs.length) lensPart.append(listSection("How the cards meet", pairs));
  };
  lenses.forEach((lens, i) => {
    const d = el("button");
    d.setAttribute("aria-label", lens.name);
    d.addEventListener("click", () => { current = i; render(); });
    dots.append(d);
  });
  const step = (k) => { current = (current + k + lenses.length) % lenses.length; render(); };
  prev.addEventListener("click", () => step(-1));
  next.addEventListener("click", () => step(1));
  if (lenses.length > 1) side.append(el("p", "lens-title", "Read it as"), lensBox, dots);
  main.append(lensPart);
  render();

  // The patterns, the story and the question don't depend on the lens.
  const { parts, themes, topEl, els, majors, revs } = patternParts(entries);
  const story = el("section", "summary-part summary-meaning");
  story.append(el("p", "asks-title", "The story"));
  const lines = [];
  if (themes.length) lines.push(`This reading circles around ${listNames(themes.slice(0, 2).map((t) => THEME_TEXT[t][0].toLowerCase()))}.`);
  lines.push(...storyLines(entries));
  if (topEl && els[topEl] >= 2) lines.push(`With ${topEl} strongest, the answer lies close to ${ELEMENT_TEXT[topEl]}.`);
  if (majors >= 2 && majors >= Math.ceil(n / 2)) lines.push("With so many Major cards, this is a meaningful chapter rather than a passing moment.");
  if (revs && revs >= Math.ceil(n / 2)) lines.push("Give what is still forming time and gentle attention.");
  lines.forEach((l) => story.append(el("p", "", l)));
  main.append(story);
  parts.forEach(([t, list]) => main.append(listSection(t, list)));

  const asks = el("div", "asks summary-asks");
  asks.append(el("p", "asks-title", "The reading asks"));
  const ql = el("ul");
  ql.append(el("li", "", themes.length ? THEME_TEXT[themes[0]][2] : "What links these cards for you?"));
  asks.append(ql);
  main.append(asks);

  sheet.append(bar, body);
  document.body.append(sheet);
  if (magic && !calm) appearWithMagic(sheet, body);
  else slideIn(sheet);
  back.addEventListener("click", async () => {
    await slideOut(sheet);
    sheet.remove();
  });
}

// The summary page arriving out of the light: it clears from a soft blur,
// then its parts rise into place one after another.
function appearWithMagic(sheet, body) {
  sheet.hidden = false;
  sheet.style.zIndex = ++Z;
  sheet.scrollTop = 0;
  sheet.animate(
    [{ opacity: 0, filter: "blur(8px) brightness(1.6)", transform: "scale(1.04)" },
     { opacity: 1, filter: "blur(0) brightness(1)", transform: "none" }],
    { duration: 700, easing: "cubic-bezier(.2,.8,.2,1)" }
  );
  [...body.querySelectorAll(".col-side > *, .col-main > *")].forEach((part, i) => part.animate(
    [{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }],
    { duration: 550, delay: 250 + i * 80, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }
  ));
}

// Before the summary opens: the runes around every card spiral in to the
// middle of the screen, form a turning circle, and flare into light; the
// summary appears inside that light.
let summoning = false;
function summonSummary(open) {
  if (calm) { open(false); return; }
  if (summoning) return;   // already on its way
  summoning = true;
  const cv = el("canvas", "summon");
  const r = Math.min(devicePixelRatio || 1, 2);
  const W = innerWidth, H = innerHeight;
  cv.width = W * r; cv.height = H * r;
  document.body.append(cv);
  const ctx = cv.getContext("2d");
  ctx.setTransform(r, 0, 0, r, 0, 0);
  ctx.lineCap = "round";
  const centre = { x: W / 2, y: H * 0.45 };
  const R = Math.min(W, H) * 0.3;
  // Runes start on the rings around the turned cards (from History, there are none on screen).
  const motes = [];
  const onTable = S && !$("table").hidden;
  (onTable ? S.slots : []).forEach((s, i) => {
    const g = cardGeom(i);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + i;
      motes.push({ x: g.x + Math.cos(a) * (g.rx + 20), y: g.y + Math.sin(a) * (g.ry + 20),
        rn: rand(RUNES.length), delay: i * 60 + k * 25, end: (motes.length * 2.4) % (Math.PI * 2) });
    }
  });
  const start = performance.now();
  let opened = false;
  requestAnimationFrame(function frame(now) {
    const t = now - start;
    ctx.clearRect(0, 0, W, H);
    // 1. The runes spiral in toward the circle (0–750ms).
    motes.forEach((m) => {
      const p = Math.min(1, Math.max(0, (t - m.delay) / 700));
      const e = 1 - Math.pow(1 - p, 3);
      const ang = m.end + (1 - e) * 2.2 + t / 900;
      const tx = centre.x + Math.cos(ang) * R, ty = centre.y + Math.sin(ang) * R;
      const x = m.x + (tx - m.x) * e, y = m.y + (ty - m.y) * e;
      const a = Math.min(1, p * 3) * (t < 1050 ? 1 : Math.max(0, 1 - (t - 1050) / 300));
      ctx.fillStyle = `rgba(255, 226, 170, ${0.35 * a})`;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      rune(ctx, RUNES[m.rn], x, y, 12, ang + Math.PI / 2, 0.9 * a);
    });
    // 2. The circle forms and turns (400–1100ms).
    const c = Math.min(1, Math.max(0, (t - 400) / 500));
    if (c > 0) {
      ctx.save();
      ctx.shadowColor = "rgba(255, 210, 130, .9)";
      ctx.shadowBlur = 12;
      ctx.strokeStyle = `rgba(255, 228, 175, ${0.7 * c})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(centre.x, centre.y, R * 1.06, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * c);
      ctx.stroke();
      ctx.setLineDash([2, 6]);
      ctx.lineDashOffset = -t / 30;
      ctx.beginPath();
      ctx.arc(centre.x, centre.y, R * 0.8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * c);
      ctx.stroke();
      ctx.restore();
    }
    // 3. It flares into light that fills the screen (850–1250ms)…
    const f = Math.min(1, Math.max(0, (t - 850) / 400));
    if (f > 0) {
      const fade = t < 1300 ? 1 : Math.max(0, 1 - (t - 1300) / 550);
      const rad = Math.hypot(W, H) * (0.15 + f);
      const g = ctx.createRadialGradient(centre.x, centre.y, 0, centre.x, centre.y, rad);
      g.addColorStop(0, `rgba(255, 236, 200, ${0.95 * fade})`);
      g.addColorStop(0.5, `rgba(255, 214, 150, ${0.75 * f * fade})`);
      g.addColorStop(1, `rgba(40, 30, 50, ${0.6 * f * fade})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    // …and the summary opens inside the light, which then clears.
    if (!opened && t >= 1150) { opened = true; open(true); }
    if (t < 1900) requestAnimationFrame(frame);
    else { cv.remove(); summoning = false; }
  });
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
const filled = (list) => (list || []).map((x) => String(x).trim()).filter(Boolean);
const hasRevKeywords = (card) => filled(card.reversedKeywords).length > 0;
const hasRevQuestions = (card) => filled(card.reversedQuestions).length > 0;
const keywordsFor = (card, reversed) =>
  reversed && hasRevKeywords(card) ? card.reversedKeywords : card.keywords;
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
$("moreBtn").addEventListener("click", () => {
  const items = S.slots.map((s) => {
    const label = el("p"), question = el("p");
    showPosition(s.i, label, question);
    return detailsItem(s.card, s.reversed, label.textContent, question.textContent);
  });
  openDetails(items, openIndex);
});

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
  const body = el("div", "details-body two-col");
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
    app: "Deck o' Yigito",
    version: 1,
    exported: new Date().toISOString(),
    history: loadHistory(),
    notes: loadNotes(),
  };
  const stamp = new Date().toISOString().slice(0, 10);
  const name = `deck-o-yigito-backup-${stamp}.json`;
  const file = new File([JSON.stringify(data, null, 2)], name, { type: "application/json" });

  // On a phone: the share sheet, so it can go to Files, iCloud Drive or email.
  if (!canHover && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Deck o' Yigito backup" });
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
    alert("That file doesn't look like a Deck o' Yigito backup.");
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
