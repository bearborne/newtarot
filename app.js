// How the app works. You normally only need to edit cards.js.

const card = document.getElementById("card");
const front = document.getElementById("front");
const hint = document.getElementById("hint");
const reading = document.getElementById("reading");
const nameEl = document.getElementById("name");
const textEl = document.getElementById("text");
const again = document.getElementById("again");

let busy = false;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// A fair random pick, using the phone's secure random numbers.
function randomIndex(n) {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] % n;
}

// Builds the card's face and its page. Waits for the picture to load
// so the card never flips over to an empty face.
async function prepare(c) {
  front.innerHTML = "";
  let shown = false;
  if (c.image) {
    const img = new Image();
    img.alt = c.name;
    img.src = c.image;
    try {
      await img.decode();
      front.appendChild(img);
      shown = true;
    } catch (e) { /* no picture yet: show the name instead */ }
  }
  if (!shown) {
    const p = document.createElement("div");
    p.className = "placeholder";
    p.textContent = c.name;
    front.appendChild(p);
  }

  nameEl.textContent = c.name;
  textEl.innerHTML = "";
  (c.text || "").trim().split(/\n\s*\n/).forEach((para) => {
    if (!para.trim()) return;
    const p = document.createElement("p");
    p.textContent = para.trim();
    textEl.appendChild(p);
  });
}

async function draw() {
  if (busy || !CARDS.length) return;
  busy = true;

  // If a card is already showing, turn it face down first.
  if (card.classList.contains("flipped")) {
    reading.classList.remove("show");
    card.classList.remove("flipped");
    await wait(700);
  }

  await prepare(CARDS[randomIndex(CARDS.length)]);
  hint.classList.add("hidden");
  card.classList.add("flipped");
  await wait(600);
  reading.classList.add("show");
  busy = false;
}

card.addEventListener("click", draw);
again.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
  draw();
});

// Lets the app open without internet once it has been visited.
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js");
}
