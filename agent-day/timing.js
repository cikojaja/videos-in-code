// One clock for picture (reel.html) and sound (make-audio.mjs). 100 BPM: a bar = 2.4 s; every scene edge sits on a bar.
// Every hour runs the same production line, so the offsets are shared: trigger → Telegram → AI agent → Claude → Done.
(() => {
  const BAR = 2.4, B = [1, 3, 5, 7, 9].map((b) => b * BAR), END = 11 * BAR, DUR = 13 * BAR; // hook 1 bar, 5 hours × 2 bars, end 2 bars = 31.2 s
  const N = { trig: 0.25, tg: 0.9, agent: 1.4, claude: 2.4, done: 3.55 };   // when each flow node lights (inside an hour)
  const TAP = [null, 3.4, 3.4, 1.25, 1.35];                                  // the one tap per hour (news needs none)
  const CLAUDE = [true, true, true, true, true];                             // Claude has a part in every job (reminders: it read the time)
  const MSG = [[0.45, 1.1, 2.4], [0.45, 2.9], [0.45, 1.9, 2.6], [0.45, 1.45, 2.1, 2.9], [0.45, 1.55, 2.9]]; // chat items arrive (buttons show clean ≥ 0.6 s before their tap)
  const EVENTS = [{ t: 0.02, kind: "arrive", gain: 0.5 }, { t: 1.85, kind: "whoosh", gain: 0.55 }];
  B.forEach((b, i) => {
    EVENTS.push({ t: b, kind: "slide", gain: 0.5 }, { t: b + 0.06, kind: "click", gain: 0.45, pitch: 0.8 });
    EVENTS.push({ t: b + N.trig, kind: "key", gain: 0.35 }, { t: b + N.tg, kind: "key", gain: 0.35, pitch: 1.12 }, { t: b + N.agent, kind: "scan", gain: 0.3 });
    if (CLAUDE[i]) EVENTS.push({ t: b + N.claude, kind: "sparkle", gain: 0.35 });
    EVENTS.push({ t: b + N.done, kind: "ting", gain: 0.55 });
    MSG[i].forEach((m, j) => EVENTS.push({ t: b + m, kind: i === 3 && j === 1 ? "send" : "pop", gain: 0.45, pitch: 1 + j * 0.06 }));
    if (TAP[i] != null) EVENTS.push({ t: b + TAP[i], kind: "click", gain: 0.6 });
  });
  EVENTS.push({ t: END, kind: "whip", gain: 0.5 });
  [0, 1, 2, 3, 4].forEach((k) => EVENTS.push({ t: END + 0.35 + k * 0.15, kind: "pop", gain: 0.5, pitch: 1 + k * 0.08 }));
  EVENTS.push({ t: END + 1.6, kind: "whoosh", gain: 0.5 }, { t: END + 1.9, kind: "lock", gain: 0.6 }, { t: END + 2.6, kind: "chime", gain: 0.45 });
  const SECTIONS = [{ name: "intro", t0: 0, t1: B[0], colour: "intro" },
    ...B.map((t0, i) => ({ name: "h" + i, t0, t1: t0 + 2 * BAR, colour: ["pluck", "pluck", "full", "full", "pluck"][i] })),
    { name: "end", t0: END, t1: DUR, colour: "cta", lift: 1 }];
  globalThis.TIMING = { BAR, B, END, DUR, N, TAP, CLAUDE, MSG, SECTIONS, IMPACTS: [...B, END], EVENTS, T: {} };
})();
