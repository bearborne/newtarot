// How the app works. You normally only need to edit cards.js and spreads.js.

const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const DECK_LOOK = 10;   // how many card backs make up the deck pile
const FAN_MAX = 22;     // most cards shown in the fan to pick from

let S = null;           // the reading in progress

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
  crypto.getRandomValues(a);
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
function cardFace(card) {
  const f = el("div", "cface");
  const placeholder = () => {
    const p = el("div", "placeholder");
    p.append(el("span", "", card.name));
    return p;
  };
  if (card.image) {
    const img = new Image();
    img.alt = card.name;
    img.src = card.image;
    img.onerror = () => img.replaceWith(placeholder());
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

function setHint(text) {
  const h = $("hint");
  h.classList.add("dim");
  setTimeout(() => { h.textContent = text; h.classList.remove("dim"); }, 200);
}

// ── 1. Choose a spread ──────────────────────────────────

SPREADS.forEach((spread) => {
  const b = el("button", "spread-btn");
  b.append(el("span", "spread-name", spread.name));
  const row = el("span", "mini-row");
  spread.positions.forEach(() => row.append(el("i")));
  b.append(row);
  b.addEventListener("click", () => startReading(spread));
  $("spreadList").append(b);
});

function showHome() {
  S = null;
  $("table").hidden = true;
  $("home").hidden = false;
  window.scrollTo(0, 0);
}

$("backBtn").addEventListener("click", showHome);
$("newBtn").addEventListener("click", showHome);

// ── 2. The table ────────────────────────────────────────

function startReading(spread) {
  const n = spread.positions.length;
  if (CARDS.length < n) {
    alert(`This spread needs ${n} cards, but cards.js only has ${CARDS.length}.`);
    return;
  }
  S = { spread, n, slots: [], picked: 0, revealed: 0, phase: "shuffle" };

  $("home").hidden = true;
  $("table").hidden = false;
  $("spreadName").textContent = spread.name;
  $("newBtn").hidden = true;

  const slots = $("slots");
  slots.innerHTML = "";
  slots.dataset.count = Math.min(n, 5);
  spread.positions.forEach((pos, i) => {
    const s = el("div", "slot");
    const box = el("div", "slot-card");
    s.append(box, el("div", "slot-label", pos.label));
    slots.append(s);
    S.slots.push({ box, card: null, tcard: null, flipped: false, i });
  });

  const deck = $("deck");
  deck.innerHTML = "";
  deck.hidden = false;
  for (let i = 0; i < DECK_LOOK; i++) {
    const c = el("div", "cback");
    c.style.transform = pileOffset(i);
    deck.append(c);
  }
  $("fan").innerHTML = "";
  $("hint").textContent = "Tap the deck to shuffle";
  $("hint").classList.remove("dim");
}

function pileOffset(i) {
  return `translate(${i * 0.5}px, ${-i * 0.6}px)`;
}

// ── Shuffle ─────────────────────────────────────────────

$("deck").addEventListener("click", async () => {
  if (!S || S.phase !== "shuffle") return;
  S.phase = "busy";
  const reading = S;
  setHint("Shuffling…");

  for (let round = 0; round < 3; round++) await riffle();
  await squareUp();
  if (S !== reading) return;   // left the table mid-shuffle

  S.order = shuffledOrder(CARDS.length);
  await fanOut();
  S.phase = "pick";
  setHint(S.n === 1 ? "Pick a card" : `Pick ${S.n} cards`);
});

// Split the pile in two, then let the halves fall back together.
function riffle() {
  const cards = [...$("deck").children];
  return Promise.all(cards.map((c, i) => {
    const side = i % 2 ? 1 : -1;
    const out = `translate(${side * 62}px, -8px) rotate(${side * 9}deg)`;
    return c.animate(
      [
        { transform: pileOffset(i) },
        { transform: out, offset: 0.35 },
        { transform: out, offset: 0.5 },
        { transform: pileOffset(i) },
      ],
      { duration: 620, delay: (cards.length - i) * 22, easing: "ease-in-out" }
    ).finished;
  }));
}

// A small tap to straighten the pile.
function squareUp() {
  return $("deck").animate(
    [{ transform: "none" }, { transform: "translateY(-6px)" }, { transform: "none" }],
    { duration: 260, easing: "ease-out" }
  ).finished;
}

// Spread the cards out in an arc, face down.
async function fanOut() {
  const count = Math.min(FAN_MAX, CARDS.length);
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
      { duration: 650, delay: i * 18, easing: "cubic-bezier(.2,.7,.2,1)", fill: "backwards" }
    );
    c.addEventListener("click", () => pick(c));
    fan.append(c);
  }
  await wait(650 + count * 18);
}

// ── Pick ────────────────────────────────────────────────

async function pick(fanCard) {
  if (!S || S.phase !== "pick" || fanCard.dataset.taken) return;
  fanCard.dataset.taken = "1";

  const slot = S.slots[S.picked++];
  slot.card = CARDS[+fanCard.dataset.card];
  const allPicked = S.picked === S.n;
  if (allPicked) S.phase = "busy";
  else {
    const left = S.n - S.picked;
    setHint(left === 1 ? "Pick 1 more" : `Pick ${left} more`);
  }

  // The card that will sit in the spread, face down.
  const t = el("div", "tcard");
  const inner = el("div", "tcard-inner");
  const back = el("div", "face cback");
  const face = cardFace(slot.card);
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

  if (allPicked) {
    await wait(150);
    await gatherFan();
    S.phase = "turn";
    setHint(S.n === 1 ? "Tap the card to turn it over" : "Tap a card to turn it over");
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

async function turn(slot) {
  if (!S || S.phase !== "turn") return;
  if (!slot.flipped) {
    S.phase = "busy";
    await preload(slot.card);
    slot.tcard.classList.add("flipped");
    slot.flipped = true;
    S.revealed++;
    await wait(800);
    S.phase = "turn";
    if (S.revealed === S.n) {
      setHint(S.n === 1 ? "Tap the card to read it again" : "Tap any card to read it again");
      $("newBtn").hidden = false;
      $("newBtn").animate([{ opacity: 0 }, { opacity: 1 }], 400);
    }
  }
  openQuick(slot.i);
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

function openQuick(i) {
  openIndex = i;
  const card = S.slots[i].card;
  $("quickCard").innerHTML = "";
  $("quickCard").append(cardFace(card));
  $("quickCard").firstChild.style.height = "100%";
  showPosition(i, $("quickPos"), $("quickQuestion"));
  $("quickName").textContent = card.name;
  fillText($("quickText"), card.short, "Add a short meaning for this card in cards.js.");

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
$("moreBtn").addEventListener("click", () => openDetails(openIndex));

// ── 4. The details window ───────────────────────────────

function openDetails(i) {
  const card = S.slots[i].card;
  $("detailsCard").innerHTML = "";
  $("detailsCard").append(cardFace(card));
  $("detailsCard").firstChild.style.height = "100%";
  showPosition(i, $("detailsPos"), $("detailsQuestion"));
  $("detailsName").textContent = card.name;
  fillText($("detailsText"), card.details || card.short,
    "Add the details for this card in cards.js.");

  const sheet = $("details");
  sheet.hidden = false;
  sheet.scrollTop = 0;
  sheet.animate(
    [{ transform: "translateY(100%)" }, { transform: "none" }],
    { duration: 380, easing: "cubic-bezier(.2,.8,.2,1)" }
  );
}

$("detailsBack").addEventListener("click", async () => {
  const sheet = $("details");
  await sheet.animate(
    [{ transform: "none" }, { transform: "translateY(100%)" }],
    { duration: 300, easing: "ease-in" }
  ).finished;
  sheet.hidden = true;
});

// Lets the app open without internet once it has been visited.
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js");
}
