// How the app works. You normally only need to edit cards.js and spreads.js.

const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const DECK_LOOK = 10;   // how many card backs make up the deck pile
const FAN_MAX = 22;     // most cards shown in the fan to pick from

let S = null;           // the reading in progress

// ── Options (remembered on this device) ─────────────────

const OPTIONS = [
  { id: "tags",      name: "Tags",           note: "Show the golden tag boxes" },
  { id: "court",     name: "Court cards",    note: "Add the Pages and Knights to the deck" },
  { id: "reversals", name: "Reversed cards", note: "Cards can come out upside down" },
];
const SET = { tags: false, court: false, reversals: false };
try { Object.assign(SET, JSON.parse(localStorage.getItem("tarot-options")) || {}); } catch {}

function saveOptions() {
  try { localStorage.setItem("tarot-options", JSON.stringify(SET)); } catch {}
}

// The cards in play: the Pages and Knights only when Court cards is on.
function activeDeck() {
  return CARDS.filter((c) => SET.court || !c.court);
}

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
  box.checked = !!SET[o.id];
  box.addEventListener("change", () => {
    SET[o.id] = box.checked;
    saveOptions();
    applyOptions();
    hideTip();
  });
  row.append(text, box);
  $("options").append(row);
});
applyOptions();

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
  const deck = activeDeck();
  if (deck.length < n) {
    alert(`This spread needs ${n} cards, but the deck only has ${deck.length}.`);
    return;
  }
  S = { spread, n, deck, slots: [], picked: 0, revealed: 0, phase: "shuffle" };

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
    S.slots.push({ box, card: null, reversed: false, tcard: null, flipped: false, i });
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

  S.order = shuffledOrder(S.deck.length);
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
  slot.card = S.deck[+fanCard.dataset.card];
  slot.reversed = SET.reversals && rand(2) === 1;
  preload(slot.card);   // start loading the picture now, so it's ready to turn
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

function fillTags(box, card) {
  box.innerHTML = "";
  (card.tags || []).forEach((id) => box.append(tagBox(id)));
  box.hidden = !box.children.length;
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
$("moreBtn").addEventListener("click", () => openDetails(S.slots[openIndex].card, openIndex, S.slots[openIndex].reversed));

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
// posIndex = the card's place in the reading, or null from the card list.

function openDetails(card, posIndex, reversed) {
  const sheet = el("div", "sheet details");
  const bar = el("header", "bar");
  const back = el("button", "link", "‹ Back");
  bar.append(back);

  const body = el("div", "details-body");
  const pic = el("div", "details-card");
  const face = cardFace(card, false, reversed);
  face.style.height = "100%";
  pic.append(face);
  body.append(pic);

  if (posIndex != null && S) {
    const label = el("p", "pos-label");
    const question = el("p", "pos-question");
    showPosition(posIndex, label, question);
    body.append(label, question);
  }
  body.append(el("h2", "", card.name));
  if (reversed) body.append(el("p", "reversed-note", "Reversed"));
  const tags = el("div", "tags");
  fillTags(tags, card);
  const text = el("div", "details-text");
  fillText(text, card.details || card.short, "Add the details for this card in cards.js.");
  body.append(tags, text);

  sheet.append(bar, body);
  document.body.append(sheet);
  slideIn(sheet);
  back.addEventListener("click", async () => {
    await slideOut(sheet);
    sheet.remove();
  });
}

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
    b.addEventListener("click", () => openDetails(card, null));
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

// Lets the app open without internet once it has been visited.
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js");
}
