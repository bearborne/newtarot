// ───────────────────────────────────────────────────────────────
//  YOUR DECK
//  Each card sits between { and }, followed by a comma.
//
//    name    – the card's title
//    image   – the picture file inside the "cards" folder
//              (leave it as "" to show just the name)
//    tags    – the card's tags, using the names from tags.js,
//              e.g. ["dawnbringer", "crossroads"]
//    short   – a line or two, shown when the card is first turned
//    details – the longer page, shown under "More about this card".
//              Leave an empty line between paragraphs.
//
//  Text goes between ` backticks ` so it can span several lines.
//
//  Pictures: the original 1909 Rider-Waite-Smith deck, drawn by
//  Pamela Colman Smith (public domain), scans from Wikimedia Commons.
// ───────────────────────────────────────────────────────────────

const CARDS = [

  // ── MAJOR ARCANA ──

  {
    name: "The Fool",
    image: "cards/the-fool.jpg",
    tags: ["naivety", "the-first-flame", "into-the-unknown"],
    short: ``,
    details: ``,
  },
  {
    name: "The Magician",
    image: "cards/the-magician.jpg",
    tags: ["focus", "the-first-flame", "starlight", "brilliance"],
    short: ``,
    details: ``,
  },
  {
    name: "The High Priestess",
    image: "cards/the-high-priestess.jpg",
    tags: ["wisdom-within", "introspection", "instinct"],
    short: ``,
    details: ``,
  },
  {
    name: "The Empress",
    image: "cards/the-empress.jpg",
    tags: ["lunar-light"],
    short: ``,
    details: ``,
  },
  {
    name: "The Emperor",
    image: "cards/the-emperor.jpg",
    tags: ["confidence"],
    short: ``,
    details: ``,
  },
  {
    name: "The Hierophant",
    image: "cards/the-hierophant.jpg",
    tags: [],
    short: ``,
    details: ``,
  },
  {
    name: "The Lovers",
    image: "cards/the-lovers.jpg",
    tags: ["companionship"],
    short: ``,
    details: ``,
  },
  {
    name: "The Chariot",
    image: "cards/the-chariot.jpg",
    tags: ["focus", "voyage"],
    short: ``,
    details: ``,
  },
  {
    name: "Strength",
    image: "cards/strength.jpg",
    tags: ["confidence", "perseverance"],
    short: ``,
    details: ``,
  },
  {
    name: "The Hermit",
    image: "cards/the-hermit.jpg",
    tags: ["duskbringer", "wisdom-within", "introspection", "detachment", "desertion"],
    short: ``,
    details: ``,
  },
  {
    name: "Wheel of Fortune",
    image: "cards/wheel-of-fortune.jpg",
    tags: ["hand-of-fate", "chaos", "harbinger"],
    short: ``,
    details: ``,
  },
  {
    name: "Justice",
    image: "cards/justice.jpg",
    tags: ["balance", "grand-justice"],
    short: ``,
    details: ``,
  },
  {
    name: "The Hanged Man",
    image: "cards/the-hanged-man.jpg",
    tags: ["hand-of-fate", "inhibition", "stagnation"],
    short: ``,
    details: ``,
  },
  {
    name: "Death",
    image: "cards/death.jpg",
    tags: ["death-decay", "chaos"],
    short: ``,
    details: ``,
  },
  {
    name: "Temperance",
    image: "cards/temperance.jpg",
    tags: ["balance", "armistice"],
    short: ``,
    details: ``,
  },
  {
    name: "The Devil",
    image: "cards/the-devil.jpg",
    tags: ["temptress", "interference", "inhibition", "hunger", "materialism"],
    short: ``,
    details: ``,
  },
  {
    name: "The Tower",
    image: "cards/the-tower.jpg",
    tags: ["death-decay", "interruption", "chaos", "terror", "harbinger"],
    short: ``,
    details: ``,
  },
  {
    name: "The Star",
    image: "cards/the-star.jpg",
    tags: ["dawnbringer", "starlight", "affliction"],
    short: ``,
    details: ``,
  },
  {
    name: "The Moon",
    image: "cards/the-moon.jpg",
    tags: ["lunar-light", "interference", "deception", "instinct", "terror"],
    short: ``,
    details: ``,
  },
  {
    name: "The Sun",
    image: "cards/the-sun.jpg",
    tags: ["dawnbringer", "brilliance"],
    short: ``,
    details: ``,
  },
  {
    name: "Judgement",
    image: "cards/judgement.jpg",
    tags: ["hand-of-fate", "grand-justice", "avoidance", "harbinger"],
    short: ``,
    details: ``,
  },
  {
    name: "The World",
    image: "cards/the-world.jpg",
    tags: ["dawnbringer", "recognition", "into-the-unknown", "fulfillment"],
    short: ``,
    details: ``,
  },

  // ── WANDS ──

  {
    name: "Ace of Wands",
    image: "cards/ace-of-wands.jpg",
    tags: ["the-first-flame"],
    short: ``,
    details: ``,
  },
  {
    name: "Two of Wands",
    image: "cards/two-of-wands.jpg",
    tags: [],
    short: ``,
    details: ``,
  },
  {
    name: "Three of Wands",
    image: "cards/three-of-wands.jpg",
    tags: ["voyage", "into-the-unknown"],
    short: ``,
    details: ``,
  },
  {
    name: "Four of Wands",
    image: "cards/four-of-wands.jpg",
    tags: ["celebration"],
    short: ``,
    details: ``,
  },
  {
    name: "Five of Wands",
    image: "cards/five-of-wands.jpg",
    tags: ["strife"],
    short: ``,
    details: ``,
  },
  {
    name: "Six of Wands",
    image: "cards/six-of-wands.jpg",
    tags: ["confidence", "recognition"],
    short: ``,
    details: ``,
  },
  {
    name: "Seven of Wands",
    image: "cards/seven-of-wands.jpg",
    tags: ["perseverance", "strife"],
    short: ``,
    details: ``,
  },
  {
    name: "Eight of Wands",
    image: "cards/eight-of-wands.jpg",
    tags: [],
    short: ``,
    details: ``,
  },
  {
    name: "Nine of Wands",
    image: "cards/nine-of-wands.jpg",
    tags: ["duskbringer", "perseverance"],
    short: ``,
    details: ``,
  },
  {
    name: "Ten of Wands",
    image: "cards/ten-of-wands.jpg",
    tags: ["duskbringer", "overburdened"],
    short: ``,
    details: ``,
  },
  {
    name: "Queen of Wands",
    image: "cards/queen-of-wands.jpg",
    tags: ["temptress"],
    short: ``,
    details: ``,
  },
  {
    name: "King of Wands",
    image: "cards/king-of-wands.jpg",
    tags: [],
    short: ``,
    details: ``,
  },

  // ── CUPS ──

  {
    name: "Ace of Cups",
    image: "cards/ace-of-cups.jpg",
    tags: [],
    short: ``,
    details: ``,
  },
  {
    name: "Two of Cups",
    image: "cards/two-of-cups.jpg",
    tags: ["companionship", "concord"],
    short: ``,
    details: ``,
  },
  {
    name: "Three of Cups",
    image: "cards/three-of-cups.jpg",
    tags: [],
    short: ``,
    details: ``,
  },
  {
    name: "Four of Cups",
    image: "cards/four-of-cups.jpg",
    tags: ["stagnation", "detachment"],
    short: ``,
    details: ``,
  },
  {
    name: "Five of Cups",
    image: "cards/five-of-cups.jpg",
    tags: ["heartrend", "infestinger"],
    short: ``,
    details: ``,
  },
  {
    name: "Six of Cups",
    image: "cards/six-of-cups.jpg",
    tags: [],
    short: ``,
    details: ``,
  },
  {
    name: "Seven of Cups",
    image: "cards/seven-of-cups.jpg",
    tags: ["temptress", "starlight", "hunger", "infestinger"],
    short: ``,
    details: ``,
  },
  {
    name: "Eight of Cups",
    image: "cards/eight-of-cups.jpg",
    tags: ["interruption", "avoidance", "detachment"],
    short: ``,
    details: ``,
  },
  {
    name: "Nine of Cups",
    image: "cards/nine-of-cups.jpg",
    tags: ["celebration", "fulfillment"],
    short: ``,
    details: ``,
  },
  {
    name: "Ten of Cups",
    image: "cards/ten-of-cups.jpg",
    tags: ["celebration", "companionship", "fulfillment"],
    short: ``,
    details: ``,
  },
  {
    name: "Queen of Cups",
    image: "cards/queen-of-cups.jpg",
    tags: ["instinct"],
    short: ``,
    details: ``,
  },
  {
    name: "King of Cups",
    image: "cards/king-of-cups.jpg",
    tags: [],
    short: ``,
    details: ``,
  },

  // ── SWORDS ──

  {
    name: "Ace of Swords",
    image: "cards/ace-of-swords.jpg",
    tags: ["brilliance"],
    short: ``,
    details: ``,
  },
  {
    name: "Two of Swords",
    image: "cards/two-of-swords.jpg",
    tags: ["deception", "armistice"],
    short: ``,
    details: ``,
  },
  {
    name: "Three of Swords",
    image: "cards/three-of-swords.jpg",
    tags: ["heartrend", "desertion"],
    short: ``,
    details: ``,
  },
  {
    name: "Four of Swords",
    image: "cards/four-of-swords.jpg",
    tags: ["introspection", "interruption", "lunar-light", "armistice", "pestilence"],
    short: ``,
    details: ``,
  },
  {
    name: "Five of Swords",
    image: "cards/five-of-swords.jpg",
    tags: ["strife"],
    short: ``,
    details: ``,
  },
  {
    name: "Six of Swords",
    image: "cards/six-of-swords.jpg",
    tags: ["voyage"],
    short: ``,
    details: ``,
  },
  {
    name: "Seven of Swords",
    image: "cards/seven-of-swords.jpg",
    tags: ["mindgames", "interference", "deception", "avoidance"],
    short: ``,
    details: ``,
  },
  {
    name: "Eight of Swords",
    image: "cards/eight-of-swords.jpg",
    tags: ["mindgames", "inhibition", "stagnation"],
    short: ``,
    details: ``,
  },
  {
    name: "Nine of Swords",
    image: "cards/nine-of-swords.jpg",
    tags: ["mindgames", "overburdened", "affliction", "terror"],
    short: ``,
    details: ``,
  },
  {
    name: "Ten of Swords",
    image: "cards/ten-of-swords.jpg",
    tags: ["death-decay", "heartrend", "pestilence"],
    short: ``,
    details: ``,
  },
  {
    name: "Queen of Swords",
    image: "cards/queen-of-swords.jpg",
    tags: [],
    short: ``,
    details: ``,
  },
  {
    name: "King of Swords",
    image: "cards/king-of-swords.jpg",
    tags: [],
    short: ``,
    details: ``,
  },

  // ── PENTACLES ──

  {
    name: "Ace of Pentacles",
    image: "cards/ace-of-pentacles.jpg",
    tags: [],
    short: ``,
    details: ``,
  },
  {
    name: "Two of Pentacles",
    image: "cards/two-of-pentacles.jpg",
    tags: ["balance", "overburdened"],
    short: ``,
    details: ``,
  },
  {
    name: "Three of Pentacles",
    image: "cards/three-of-pentacles.jpg",
    tags: ["recognition", "concord"],
    short: ``,
    details: ``,
  },
  {
    name: "Four of Pentacles",
    image: "cards/four-of-pentacles.jpg",
    tags: ["materialism"],
    short: ``,
    details: ``,
  },
  {
    name: "Five of Pentacles",
    image: "cards/five-of-pentacles.jpg",
    tags: ["affliction", "infestinger", "pestilence", "desertion"],
    short: ``,
    details: ``,
  },
  {
    name: "Six of Pentacles",
    image: "cards/six-of-pentacles.jpg",
    tags: ["grand-justice", "concord"],
    short: ``,
    details: ``,
  },
  {
    name: "Seven of Pentacles",
    image: "cards/seven-of-pentacles.jpg",
    tags: [],
    short: ``,
    details: ``,
  },
  {
    name: "Eight of Pentacles",
    image: "cards/eight-of-pentacles.jpg",
    tags: ["focus"],
    short: ``,
    details: ``,
  },
  {
    name: "Nine of Pentacles",
    image: "cards/nine-of-pentacles.jpg",
    tags: ["materialism"],
    short: ``,
    details: ``,
  },
  {
    name: "Ten of Pentacles",
    image: "cards/ten-of-pentacles.jpg",
    tags: [],
    short: ``,
    details: ``,
  },
  {
    name: "Queen of Pentacles",
    image: "cards/queen-of-pentacles.jpg",
    tags: [],
    short: ``,
    details: ``,
  },
  {
    name: "King of Pentacles",
    image: "cards/king-of-pentacles.jpg",
    tags: [],
    short: ``,
    details: ``,
  },
];
