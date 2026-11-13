// ───────────────────────────────────────────────────────────────
//  WHAT'S IN THE PICTURES
//  The reading summary uses this to find symbols that come back
//  across the cards of a spread, and which way the figures look.
//
//  SYMBOLS – every symbol, with:
//    name    – what the summary calls it, after a count:
//              "2 crowns", so make it plural
//    meaning – what it stands for, in a word or two (it must fit
//              on one line of a small tile)
//
//  PICTURES – one line per card:
//    facing  – where the main figure looks, as you see the card:
//              "left", "right", "back" (turned away from you),
//              or "" (looking out at you, or no single figure)
//    symbols – the symbols in its picture, using the ids above
//
//  To add a symbol, add it to SYMBOLS and then to the cards that
//  show it.
// ───────────────────────────────────────────────────────────────

const SYMBOLS = {
  water:       { name: "waters", meaning: "the unconscious" },
  sea:         { name: "seas", meaning: "deep feeling" },
  moon:        { name: "moons", meaning: "intuition" },
  sun:         { name: "suns", meaning: "clarity" },
  stars:       { name: "stars", meaning: "hope" },
  mountains:   { name: "mountains", meaning: "challenge" },
  cliff:       { name: "edges", meaning: "a leap" },
  clouds:      { name: "clouds", meaning: "the unseen" },
  hand:        { name: "cloud hands", meaning: "a gift" },
  trees:       { name: "trees", meaning: "growth" },
  harvest:     { name: "harvests", meaning: "reward" },
  flowers:     { name: "flowers", meaning: "desire, purity" },
  sunflowers:  { name: "sunflowers", meaning: "joy" },
  crowns:      { name: "crowns", meaning: "mastery" },
  thrones:     { name: "thrones", meaning: "authority" },
  wreaths:     { name: "wreaths", meaning: "victory" },
  lions:       { name: "lions", meaning: "courage" },
  horses:      { name: "horses", meaning: "drive" },
  dogs:        { name: "dogs", meaning: "loyalty" },
  birds:       { name: "birds", meaning: "messages" },
  fish:        { name: "fish", meaning: "imagination" },
  serpents:    { name: "serpents", meaning: "wisdom" },
  creatures:   { name: "creatures", meaning: "wholeness" },
  angels:      { name: "angels", meaning: "guidance" },
  children:    { name: "children", meaning: "innocence" },
  nakedness:   { name: "bare figures", meaning: "truth" },
  pillars:     { name: "pillars", meaning: "thresholds" },
  veils:       { name: "veils", meaning: "secrets" },
  towers:      { name: "towers", meaning: "ambition" },
  homes:       { name: "homes", meaning: "security" },
  paths:       { name: "paths", meaning: "the way ahead" },
  bonds:       { name: "bindings", meaning: "restraint" },
  infinity:    { name: "∞ signs", meaning: "endless flow" },
  scales:      { name: "scales", meaning: "fairness" },
  goldsky:     { name: "golden skies", meaning: "optimism" },
  darksky:     { name: "dark skies", meaning: "a hard season" },
  fire:        { name: "flames", meaning: "passion" },
  butterflies: { name: "butterflies", meaning: "new thinking" },
};

const PICTURES = {
  // ── Major Arcana ──
  "The Fool":           { facing: "left",  symbols: ["sun", "mountains", "cliff", "flowers", "dogs", "goldsky"] },
  "The Magician":       { facing: "",      symbols: ["infinity", "flowers", "serpents", "goldsky", "trees"] },
  "The High Priestess": { facing: "",      symbols: ["moon", "pillars", "veils", "water", "thrones", "crowns"] },
  "The Empress":        { facing: "",      symbols: ["stars", "harvest", "trees", "water", "thrones", "crowns", "veils", "goldsky"] },
  "The Emperor":        { facing: "",      symbols: ["mountains", "thrones", "crowns", "water"] },
  "The Hierophant":     { facing: "",      symbols: ["pillars", "thrones", "crowns", "flowers"] },
  "The Lovers":         { facing: "",      symbols: ["angels", "nakedness", "sun", "trees", "serpents", "mountains", "clouds", "fire"] },
  "The Chariot":        { facing: "",      symbols: ["stars", "moon", "crowns", "homes", "water", "goldsky"] },
  "Strength":           { facing: "left",  symbols: ["lions", "infinity", "flowers", "mountains", "goldsky"] },
  "The Hermit":         { facing: "left",  symbols: ["stars", "mountains", "cliff"] },
  "Wheel of Fortune":   { facing: "",      symbols: ["creatures", "angels", "lions", "birds", "serpents", "clouds"] },
  "Justice":            { facing: "",      symbols: ["scales", "pillars", "veils", "thrones", "crowns"] },
  "The Hanged Man":     { facing: "",      symbols: ["trees", "bonds"] },
  "Death":              { facing: "right", symbols: ["horses", "flowers", "wreaths", "sun", "towers", "water", "children", "crowns", "sea"] },
  "Temperance":         { facing: "",      symbols: ["angels", "water", "paths", "mountains", "sun", "crowns", "flowers"] },
  "The Devil":          { facing: "",      symbols: ["bonds", "nakedness", "fire", "darksky", "thrones"] },
  "The Tower":          { facing: "",      symbols: ["towers", "fire", "crowns", "cliff", "darksky", "clouds"] },
  "The Star":           { facing: "left",  symbols: ["stars", "water", "nakedness", "birds", "trees", "mountains"] },
  "The Moon":           { facing: "",      symbols: ["moon", "dogs", "towers", "paths", "water", "mountains"] },
  "The Sun":            { facing: "",      symbols: ["sun", "children", "horses", "sunflowers", "nakedness", "wreaths"] },
  "Judgement":          { facing: "",      symbols: ["angels", "nakedness", "children", "mountains", "water", "clouds", "wreaths"] },
  "The World":          { facing: "",      symbols: ["wreaths", "creatures", "nakedness", "infinity", "clouds"] },

  // ── Wands ──
  "Ace of Wands":       { facing: "",      symbols: ["hand", "clouds", "homes", "trees", "mountains", "water"] },
  "Two of Wands":       { facing: "left",  symbols: ["sea", "water", "homes", "mountains", "flowers"] },
  "Three of Wands":     { facing: "back",  symbols: ["sea", "mountains", "cliff", "goldsky"] },
  "Four of Wands":      { facing: "",      symbols: ["wreaths", "homes", "flowers", "goldsky"] },
  "Five of Wands":      { facing: "",      symbols: [] },
  "Six of Wands":       { facing: "right", symbols: ["horses", "wreaths"] },
  "Seven of Wands":     { facing: "",      symbols: ["cliff"] },
  "Eight of Wands":     { facing: "",      symbols: ["water", "homes", "trees"] },
  "Nine of Wands":      { facing: "",      symbols: ["mountains"] },
  "Ten of Wands":       { facing: "right", symbols: ["homes", "trees"] },
  "Page of Wands":      { facing: "right", symbols: ["mountains", "serpents"] },
  "Knight of Wands":    { facing: "left",  symbols: ["horses", "mountains", "serpents"] },
  "Queen of Wands":     { facing: "",      symbols: ["sunflowers", "lions", "thrones", "crowns"] },
  "King of Wands":      { facing: "left",  symbols: ["lions", "serpents", "thrones", "crowns"] },

  // ── Cups ──
  "Ace of Cups":        { facing: "",      symbols: ["hand", "clouds", "water", "birds", "flowers"] },
  "Two of Cups":        { facing: "",      symbols: ["lions", "homes", "wreaths"] },
  "Three of Cups":      { facing: "",      symbols: ["harvest", "wreaths", "flowers"] },
  "Four of Cups":       { facing: "",      symbols: ["hand", "clouds", "trees", "mountains"] },
  "Five of Cups":       { facing: "left",  symbols: ["water", "homes", "paths", "darksky"] },
  "Six of Cups":        { facing: "",      symbols: ["children", "flowers", "homes"] },
  "Seven of Cups":      { facing: "back",  symbols: ["clouds", "serpents", "towers", "crowns", "wreaths"] },
  "Eight of Cups":      { facing: "back",  symbols: ["moon", "mountains", "water", "darksky", "paths"] },
  "Nine of Cups":       { facing: "",      symbols: ["goldsky"] },
  "Ten of Cups":        { facing: "back",  symbols: ["children", "homes", "water", "trees"] },
  "Page of Cups":       { facing: "left",  symbols: ["fish", "sea", "flowers"] },
  "Knight of Cups":     { facing: "right", symbols: ["horses", "water", "mountains", "fish"] },
  "Queen of Cups":      { facing: "left",  symbols: ["sea", "thrones", "crowns", "angels", "fish"] },
  "King of Cups":       { facing: "",      symbols: ["sea", "thrones", "crowns", "fish"] },

  // ── Swords ──
  "Ace of Swords":      { facing: "",      symbols: ["hand", "clouds", "crowns", "mountains", "wreaths"] },
  "Two of Swords":      { facing: "",      symbols: ["bonds", "moon", "sea", "water"] },
  "Three of Swords":    { facing: "",      symbols: ["clouds", "darksky"] },
  "Four of Swords":     { facing: "",      symbols: [] },
  "Five of Swords":     { facing: "",      symbols: ["sea", "clouds"] },
  "Six of Swords":      { facing: "right", symbols: ["water", "sea", "children"] },
  "Seven of Swords":    { facing: "right", symbols: ["goldsky"] },
  "Eight of Swords":    { facing: "",      symbols: ["bonds", "homes", "water"] },
  "Nine of Swords":     { facing: "",      symbols: ["darksky", "flowers"] },
  "Ten of Swords":      { facing: "",      symbols: ["darksky", "water", "mountains"] },
  "Page of Swords":     { facing: "left",  symbols: ["clouds", "birds", "mountains", "trees"] },
  "Knight of Swords":   { facing: "left",  symbols: ["horses", "clouds", "birds", "butterflies", "trees"] },
  "Queen of Swords":    { facing: "right", symbols: ["clouds", "birds", "butterflies", "thrones", "crowns"] },
  "King of Swords":     { facing: "",      symbols: ["clouds", "birds", "butterflies", "thrones", "crowns"] },

  // ── Pentacles ──
  "Ace of Pentacles":   { facing: "",      symbols: ["hand", "clouds", "flowers", "trees", "pillars", "mountains", "paths"] },
  "Two of Pentacles":   { facing: "",      symbols: ["infinity", "sea"] },
  "Three of Pentacles": { facing: "",      symbols: ["pillars"] },
  "Four of Pentacles":  { facing: "",      symbols: ["homes", "crowns"] },
  "Five of Pentacles":  { facing: "right", symbols: ["darksky"] },
  "Six of Pentacles":   { facing: "",      symbols: ["scales", "homes"] },
  "Seven of Pentacles": { facing: "left",  symbols: ["harvest", "trees"] },
  "Eight of Pentacles": { facing: "right", symbols: ["homes", "paths"] },
  "Nine of Pentacles":  { facing: "",      symbols: ["birds", "harvest", "trees", "homes", "goldsky"] },
  "Ten of Pentacles":   { facing: "",      symbols: ["dogs", "children", "pillars", "homes"] },
  "Page of Pentacles":  { facing: "right", symbols: ["trees", "mountains", "flowers", "goldsky"] },
  "Knight of Pentacles": { facing: "right", symbols: ["horses", "harvest", "goldsky"] },
  "Queen of Pentacles": { facing: "",      symbols: ["flowers", "trees", "thrones", "crowns", "mountains", "goldsky"] },
  "King of Pentacles":  { facing: "",      symbols: ["harvest", "homes", "thrones", "crowns", "goldsky"] },
};
