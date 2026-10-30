// One clock for picture (reel.html) and sound (make-audio.mjs). Every time = a spoken word onset from words.js.
(() => {
  const W = globalThis.WORDS, w = (i) => W[i][1];
  const T = {
    google1: w(2), and: w(3), claude1: w(6), almost: w(7), same: w(9), so: w(11), one: w(14), list: w(18), links: w(20),
    other: w(23), gives2: w(24), answer: w(27),
    three: w(28), diffs: w(29),
    d1: w(30), d1g: w(31), library: w(34), catalog: w(35), shows: w(37), where: w(39), look: w(41),
    d1c: w(42), librarian: w(45), reads: w(47), foryou: w(49), explains1: w(51),
    d2: w(52), fresh: w(53), news: w(57), hours: w(58), prices: w(61), google2: w(62), writing: w(63), planning: w(64), understanding: w(65), claude2: w(66),
    d3: w(67), google3: w(68), everyone: w(70), same3: w(72), list3: w(73), claude3: w(74), details: w(78),
    gift: w(80), sixty: w(84), fishing: w(85), under: w(87), euros: w(89),
    sum: w(90), finds: w(91), claude4: w(92), explains2: w(93),
    so2: w(94), del: w(95), delG: w(96), no: w(97),
    rest: w(98), where2: w(101), restaurant: w(103), claude5: w(105), pick: w(108), what: w(109),
    cta: w(112), this7: w(114), made7: w(118), claude7: w(120), noAE: w(121), comment: w(124), claudeWord: w(125), send2: w(128), prompt: w(131), end: W[131][2],
  };
  T.nums = [T.three + 0.04, T.diffs, T.diffs + 0.16];            // 1 · 2 · 3 slam onto the floor             // 1 · 2 · 3 land
  T.rows = Array.from({ length: 10 }, (_, i) => T.list + 0.12 + i * 0.08); // link rows tick in
  T.answerCard = T.gives2;                                       // blank card rises, fills on "answer?"
  // your details type into the chat bubble as they are spoken; the reply card lands on "euros."
  T.typed = [["A gift for my dad,", w(79), w(84) - 0.1], [" 60,", w(84), w(84) + 0.26], [" loves fishing,", w(85), w(87) - 0.2], [" under €50.", w(87), w(89) + 0.12]];
  T.keys = T.typed.flatMap(([txt, a, b]) => [...txt].map((ch, i) => [a + ((b - a) * i) / txt.length, ch]));
  T.send = T.euros + 0.22, T.made = T.euros + 0.3;

  // CTA (option B): the terminal types the prompt, 4 checks, "No After Effects" gets struck, CLAUDE types into a comment box, the prompt PDF flies in
  T.promptType = [T.cta + 0.4, w(118) - 0.05]; T.checks = [0, 1, 2, 3].map((i) => w(121) + 0.25 + i * 0.16);
  T.strike = w(123) + 0.2; T.post = w(125) + 0.45; T.pdf = w(128);
  const DUR = 50.2;

  // music: each section's downbeat sits on a spoken title; the bed stops ~0.25 s before the next title (Riccardo's full stop)
  const SECTIONS = [
    { name: "intro", t0: 0, t1: T.three - 0.24, colour: "intro" },
    { name: "d1", t0: T.d1, t1: T.d2 - 0.24, colour: "pluck" },
    { name: "d2", t0: T.d2, t1: T.d3 - 0.24, colour: "hook" },
    { name: "d3", t0: T.d3, t1: T.so2 - 0.05, colour: "full" },
    { name: "rest", t0: T.no, t1: T.cta - 0.24, colour: "pluck" },
    { name: "cta", t0: T.cta, t1: DUR, colour: "cta", lift: 1 },
  ];
  const IMPACTS = [T.three, T.d1, T.d2, T.d3, T.no, T.cta];

  const pop = (t, g = 0.5, pitch = 1, pan = 0) => ({ t, kind: "pop", gain: g * 0.75, pitch: pitch * 1.15, pan });
  const thud = (t, g = 0.7, pitch = 1, pan = 0) => ({ t, kind: "thud", gain: g, pitch, pan });
  const tick = (t, g = 0.3, pitch = 1.5, pan = 0) => ({ t, kind: "click", gain: g, pitch, pan });
  const whoosh = (t, g = 0.5, pan = 0) => ({ t, kind: "whoosh", gain: g, pan });
  const EVENTS = [
    // hook
    thud(0.1, 0.6, 1.1), pop(T.google1, 0.35, 1.1),
    { t: T.and + 0.14, kind: "whip", gain: 0.7, pan: 0.3 }, thud(T.claude1, 0.65, 1.05, 0.1),
    whoosh(T.almost + 0.2, 0.35), { t: T.same, kind: "sparkle", gain: 0.5 },
    pop(T.so, 0.25, 1.0), pop(T.one, 0.3, 0.9, -0.3), whoosh(T.list + 0.05, 0.3, -0.3),
    ...T.rows.map((t, i) => tick(t, 0.22, 1.4 + (i % 3) * 0.08, -0.3)), pop(T.links, 0.3, 1.15, -0.3),
    pop(T.other, 0.3, 1.0, 0.3), whoosh(T.answerCard + 0.05, 0.25, 0.3), { t: T.answer + 0.08, kind: "ting", gain: 0.75, pan: 0.3 },
    // three differences
    { t: T.three, kind: "boom", gain: 0.6 }, pop(T.three + 0.02, 0.4, 0.9),
    ...T.nums.map((t, i) => thud(t + 0.1, 0.8, 1 + i * 0.12, (i - 1) * 0.4)),
    // 1: catalog vs librarian
    { t: T.d1, kind: "whoosh", gain: 0.5 }, pop(T.d1 + 0.3, 0.4, 1.1, -0.2), { t: T.d1g, kind: "slide", gain: 0.45, pitch: 0.8 }, pop(T.catalog, 0.3),
    pop(T.shows, 0.25, 1.2), { t: T.where, kind: "slide", gain: 0.5, pitch: 1.2 }, { t: T.look, kind: "scan", gain: 0.28 },
    { t: T.d1c, kind: "whip", gain: 0.65, pan: 0.3 }, thud(T.d1c + 0.3, 0.6, 1.3, 0.2), pop(T.librarian, 0.3), pop(T.librarian + 0.35, 0.3, 0.9, 0.2),
    { t: T.reads, kind: "slide", gain: 0.35, pitch: 1.4 }, ...[0, 1, 2, 3].map((i) => tick(T.reads + 0.15 + i * 0.1, 0.18, 1.7)),
    whoosh(T.foryou + 0.15, 0.35), { t: T.explains1 + 0.1, kind: "ting", gain: 0.45 },
    // 2: fresh facts vs thinking
    { t: T.d2, kind: "click", gain: 0.5, pitch: 0.8 }, whoosh(T.d2 + 0.05, 0.45), { t: T.fresh - 0.3, kind: "scan", gain: 0.2 }, pop(T.fresh, 0.25),
    pop(w(56), 0.45, 1.0, -0.35), pop(T.hours, 0.45, 1.08, -0.35), pop(T.prices, 0.45, 1.16, -0.35), { t: T.google2, kind: "lock", gain: 0.45, pan: -0.3 },
    pop(T.writing, 0.45, 1.0, 0.35), pop(T.planning, 0.45, 1.08, 0.35), pop(T.understanding, 0.45, 1.16, 0.35), { t: T.claude2, kind: "lock", gain: 0.45, pan: 0.3 },
    // 3: same list vs made for you
    { t: T.d3, kind: "click", gain: 0.5, pitch: 0.8 }, { t: T.d3 + 0.02, kind: "tunnel", gain: 0.4 }, pop(T.google3, 0.3),
    ...[0, 1, 2].map((i) => pop(T.everyone + i * 0.1, 0.35, 0.9 + i * 0.08, (i - 1) * 0.4)),
    ...[0, 1, 2].map((i) => ({ t: T.same3 + 0.08 + i * 0.09, kind: "slide", gain: 0.28, pitch: 1.3 + i * 0.1, pan: (i - 1) * 0.4 })), pop(T.list3, 0.25),
    { t: T.claude3 + 0.1, kind: "whip", gain: 0.55 }, pop(T.details, 0.3), pop(w(77), 0.35, 1.1, 0.35),
    ...T.keys.map(([t, ch], i) => ({ t, kind: "key", gain: ch === " " ? 0.12 : 0.22, pitch: 0.96 + ((i * 7) % 5) * 0.025, pan: 0.15 })),
    { t: T.send, kind: "send", gain: 0.45 }, { t: T.made + 0.2, kind: "ting", gain: 0.5 },
    // summary + delete? no.
    whoosh(T.sum + 0.05, 0.25), pop(T.sum, 0.35, 1.0, -0.3), pop(T.claude4, 0.3, 1.1), { t: T.explains2, kind: "scan", gain: 0.3 }, thud(T.so2, 0.45),
    { t: T.del, kind: "buzz", gain: 0.24, pan: -0.2 }, pop(T.del + 0.05, 0.4, 0.85, -0.2), { t: T.no, kind: "boom", gain: 0.56 }, pop(T.no + 0.1, 0.4, 0.75),
    // restaurant
    { t: T.rest, kind: "tunnel", gain: 0.35 }, pop(T.where2, 0.25), thud(T.restaurant + 0.18, 0.75, 1.0, -0.2), pop(T.restaurant + 0.2, 0.35, 1.2, -0.2),
    { t: T.claude5, kind: "slide", gain: 0.6, pan: 0.3 }, { t: T.pick, kind: "scan", gain: 0.3, pan: 0.3 }, { t: T.what + 0.1, kind: "ting", gain: 0.45, pan: 0.3 },
    // CTA
    { t: T.cta, kind: "boom", gain: 0.42 }, whoosh(T.cta + 0.02, 0.5),
    ...Array.from({ length: 12 }, (_, i) => ({ t: T.promptType[0] + ((T.promptType[1] - T.promptType[0]) * i) / 12, kind: "key", gain: 0.2, pitch: 0.97 + ((i * 7) % 5) * 0.02, pan: -0.1 })),
    ...T.checks.map((t, i) => pop(t, 0.35, 1.1 + i * 0.06)),
    { t: T.strike, kind: "slide", gain: 0.4, pitch: 0.7 },
    pop(T.comment - 0.1, 0.4, 1.0), ...[0, 1, 2, 3, 4, 5].map((i) => ({ t: T.claudeWord + i * 0.06, kind: "key", gain: 0.28, pitch: 1 + i * 0.02, pan: 0.1 })),
    { t: T.post, kind: "click", gain: 0.6 }, { t: T.pdf, kind: "whoosh", gain: 0.45 }, { t: T.pdf + 0.32, kind: "ting", gain: 0.55 },
  ];
  globalThis.TIMING = { W, T, DUR, SECTIONS, IMPACTS, EVENTS };
})();
