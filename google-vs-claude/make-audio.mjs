// Music written in code + sound effects for the Google vs Claude reel. Same clock as the picture (timing.js).
// Music: 125 BPM pop, Am–F–C–G, a 3-3-2 hook that returns, each section starts ON a spoken title and stops 0.24 s before the next one
// (Riccardo's full stop), a new colour per section, +1 semitone lift into the CTA. SFX: ElevenLabs library from the code-video kit
// (saas-launch/audio/el, no credits) + two synthesized ones (thud, chirp). Run: node make-audio.mjs → out/music.wav, out/sfx.wav
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
await import("./words.js"); await import("./timing.js");
const { T, DUR, SECTIONS, IMPACTS, EVENTS } = globalThis.TIMING;
const SR = 48000, N = Math.round(SR * DUR), BPM = 125, BEAT = 60 / BPM, STEP = BEAT / 4, BAR = BEAT * 4;
const EL = `${process.env.HOME}/.claude/skills/code-video/saas-launch/audio/el/`;
const out = new URL("./out/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });

// ---------- tiny DSP kit (from the code-video saas-launch kit) ----------
let seed = 11;
const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1; };
const hz = (m) => 440 * 2 ** ((m - 69) / 12), TAU = Math.PI * 2;
class Bq {
  b0 = 1; b1 = 0; b2 = 0; a1 = 0; a2 = 0; x1 = 0; x2 = 0; y1 = 0; y2 = 0;
  set(type, f, q = 0.707) {
    const w = (TAU * Math.min(f, SR * 0.45)) / SR, c = Math.cos(w), al = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (type === "lp") { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; } else if (type === "hp") { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; } else { b0 = al; b1 = 0; b2 = -al; }
    const a0 = 1 + al; this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = (-2 * c) / a0; this.a2 = (1 - al) / a0; return this;
  }
  run(x) { const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2; this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y; return y; }
}
const pan = (p) => [Math.cos(((p + 1) * Math.PI) / 4), Math.sin(((p + 1) * Math.PI) / 4)];
const bus = () => ({ L: new Float32Array(N), R: new Float32Array(N) });
const music = bus(), musicVerb = bus(), hits = bus(), hitsVerb = bus(), sfx = bus(), sfxVerb = bus();
function voice(b, t0, dur, gain, p, f, send, sendGain = 0) {
  const s0 = Math.round(t0 * SR), n = Math.round(dur * SR), [l, r] = pan(p);
  for (let i = 0; i < n; i++) { const k = s0 + i; if (k < 0 || k >= N) continue; const v = f(i, i / SR, k) * gain; b.L[k] += v * l; b.R[k] += v * r; if (send) { send.L[k] += v * l * sendGain; send.R[k] += v * r * sendGain; } }
}
const env = (tt, a, d) => (tt < a ? tt / a : Math.exp(-(tt - a) / d));
function saw(f) { let ph = Math.abs(rnd()); const dt = f / SR; return () => { ph += dt; if (ph >= 1) ph -= 1; let v = 2 * ph - 1; if (ph < dt) { const x = ph / dt; v -= x + x - x * x - 1; } else if (ph > 1 - dt) { const x = (ph - 1) / dt; v -= x * x + x + x + 1; } return v; }; }
function freeverb(b, room = 0.84, damp = 0.35, spread = 23) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], aps = [556, 441, 341, 225];
  const proc = (x, off) => {
    const y = new Float32Array(N);
    for (const c of combs) { const len = Math.round(((c + off) * SR) / 44100), buf = new Float32Array(len); let idx = 0, store = 0; for (let i = 0; i < N; i++) { const o = buf[idx]; store = o * (1 - damp) + store * damp; buf[idx] = x[i] * 0.015 + store * room; y[i] += o; idx = (idx + 1) % len; } }
    for (const a of aps) { const len = Math.round(((a + off) * SR) / 44100), buf = new Float32Array(len); let idx = 0; for (let i = 0; i < N; i++) { const bo = buf[idx], v = -y[i] + bo; buf[idx] = y[i] + bo * 0.5; y[i] = v; idx = (idx + 1) % len; } }
    return y;
  };
  return { L: proc(b.L, 0), R: proc(b.R, spread) };
}

// ---------- instruments ----------
const PUMP = new Float32Array(N).fill(1), kicks = [];
function kick(t0, g = 1, b = music) { kicks.push(t0); let ph = 0; voice(b, t0, 0.45, 0.66 * g, 0, (i, tt) => { ph += (TAU * (50 + 130 * Math.exp(-tt * 28))) / SR; return Math.tanh(1.6 * Math.sin(ph)) * Math.exp(-tt * 6) + (i < 120 ? rnd() * 0.25 * (1 - i / 120) : 0); }); }
function clap(t0, g = 1) { const bp = new Bq().set("bp", 1350, 0.8), hp = new Bq().set("hp", 650, 0.7); voice(music, t0 - 0.018, 0.32, 0.34 * g, 0.05, (_, tt) => { const e = tt < 0.027 ? ((tt % 0.009) < 0.0055 ? [1, 0.8, 0.65][Math.floor(tt / 0.009)] : 0.05) : 0.6 * Math.exp(-(tt - 0.027) / 0.075); return hp.run(bp.run(rnd())) * e; }, musicVerb, 0.35); }
function hat(t0, g = 1, open = false, b = music) { const hp = new Bq().set("hp", 7600, 0.7), bp = new Bq().set("bp", 10500, 1.4); voice(b, t0, open ? 0.3 : 0.07, 0.1 * g, 0.28, (_, tt) => (hp.run(rnd()) * 0.6 + bp.run(rnd()) * 0.45) * Math.exp(-tt / (open ? 0.09 : 0.016))); }
function snare(t0, g = 1, b = music, vb = musicVerb) { const bp = new Bq().set("bp", 1900, 0.7); voice(b, t0, 0.14, 0.3 * g, -0.05, (_, tt) => (bp.run(rnd()) * 0.8 + 0.5 * Math.sin(TAU * 196 * tt)) * Math.exp(-tt / 0.045), vb, 0.25); }
function crash(t0, g = 1, b = hits, vb = hitsVerb) { const hp = new Bq().set("hp", 4800, 0.6); voice(b, t0, 2.2, 0.13 * g, 0.2, (_, tt) => hp.run(rnd()) * Math.min(1, tt / 0.002) * Math.exp(-tt / 0.7), vb, 0.4); }
function bass(t0, m, len, g = 1) {
  const f = hz(m), o = saw(f), lp = new Bq(); let ph = 0;
  voice(music, t0, len + 0.06, 0.27 * g, 0, (i, tt, k) => { if (i % 32 === 0) lp.set("lp", 260 + 1100 * Math.exp(-tt * 14), 0.9); ph += (TAU * f) / SR; const s = Math.sin(ph) + 0.4 * lp.run(o()); return Math.tanh(1.2 * s) * Math.min(1, tt / 0.004) * (tt < len ? 1 : Math.max(0, 1 - (tt - len) / 0.06)) * (0.35 + 0.65 * PUMP[k]); });
}
function pad(t0, t1, notes, g = 1, cut = 1000) {
  for (const m of notes) for (const d of [-7, 7]) {
    const o = saw(hz(m) * 2 ** (d / 1200)), lp = new Bq().set("lp", cut, 0.7), hp = new Bq().set("hp", 210, 0.7), dur = t1 - t0;
    voice(music, t0 - 0.03, dur + 0.4, 0.014 * g, d < 0 ? -0.45 : 0.45, (i, tt, k) => hp.run(lp.run(o())) * Math.min(1, tt / 0.2) * Math.min(1, Math.max(0, (dur + 0.4 - tt) / 0.4)) * PUMP[k], musicVerb, 0.5);
  }
}
function lead(t0, m, len, g = 1, bright = 1, echo = true, b = music, vb = musicVerb) {
  const play = (at, gg, p) => { const f = hz(m), o1 = saw(f), o2 = saw(f * 1.006), lp = new Bq(); let ph = 0;
    voice(b, at, len + 0.4, 0.07 * gg, p, (i, tt) => { if (i % 32 === 0) lp.set("lp", (900 + 4200 * Math.exp(-tt * 9)) * bright, 1.2); ph += (TAU * f) / SR; return lp.run(0.45 * o1() + 0.45 * o2() + 0.35 * Math.sin(ph)) * env(tt, 0.004, 0.26) * (tt < len ? 1 : Math.exp(-(tt - len) / 0.08)); }, vb, 0.3); };
  play(t0, g, 0.05);
  if (echo) { play(t0 + BEAT * 0.75, g * 0.3, -0.5); play(t0 + BEAT * 1.5, g * 0.12, 0.5); }
}
function mallet(t0, m, g = 1, p = 0, b = music, vb = musicVerb) { // marimba-ish pluck for the "pluck" colour
  const f = hz(m);
  voice(b, t0, 0.5, 0.11 * g, p, (_, tt) => (Math.sin(TAU * f * tt) + 0.35 * Math.sin(TAU * f * 4 * tt) * Math.exp(-tt * 40) + 0.15 * Math.sin(TAU * f * 10 * tt) * Math.exp(-tt * 90)) * env(tt, 0.002, 0.12), vb, 0.25);
}
function bell(t0, m, g = 1, b = music, vb = musicVerb) { const f = hz(m); voice(b, t0, 1.6, 0.045 * g, 0.15, (_, tt) => (Math.sin(TAU * f * tt) + 0.4 * Math.sin(TAU * f * 2.76 * tt) * Math.exp(-tt * 4) + 0.2 * Math.sin(TAU * f * 5.4 * tt) * Math.exp(-tt * 9)) * env(tt, 0.002, 0.5), vb, 0.6); }
function stab(t0, notes, g = 1, len = 0.12) {
  for (const m of notes) for (const d of [-9, 0, 9]) { const o = saw(hz(m) * 2 ** (d / 1200)), lp = new Bq(), hp = new Bq().set("hp", 320, 0.7);
    voice(music, t0, len + 0.12, 0.02 * g, ((m % 5) / 5 - 0.4) * 0.8 + d * 0.02, (i, tt, k) => { if (i % 32 === 0) lp.set("lp", 900 + 3000 * Math.exp(-tt * 16), 0.8); return hp.run(lp.run(o())) * (tt < len ? 1 : Math.exp(-(tt - len) / 0.04)) * Math.min(1, tt / 0.003) * PUMP[k]; }, musicVerb, 0.3); }
}

// ---------- arrangement ----------
const CH = { Am: [[57, 60, 64, 69], 45], F: [[57, 60, 65, 69], 41], C: [[55, 60, 64, 67], 48], G: [[55, 59, 62, 67], 43] };
const HOOK = { // 3-3-2 hook, 16th steps [step, midi, length]
  Am: [[0, 69, 2], [3, 72, 2], [6, 76, 2], [8, 74, 2], [10, 72, 2], [12, 76, 4]],
  F: [[0, 69, 2], [3, 72, 2], [6, 77, 2], [8, 76, 2], [10, 72, 2], [12, 69, 4]],
  C: [[0, 67, 2], [3, 72, 2], [6, 76, 2], [8, 79, 2], [10, 76, 2], [12, 74, 2], [14, 72, 2]],
  G: [[0, 71, 2], [3, 74, 2], [6, 79, 2], [8, 77, 2], [10, 74, 2], [12, 71, 4]],
};
const ROLL = new Set(["intro", "rest"]); // snare roll INTO the stop before "Three differences" and before "Monday"
for (const pass of [0, 1]) { // pass 0 = drums (they write the sidechain pump), pass 1 = everything that pumps
if (pass === 1) for (const tk of kicks) { const s0 = Math.round(tk * SR); for (let i = 0; i < Math.round(0.3 * SR); i++) { const k = s0 + i; if (k >= N) break; const tt = i / SR; PUMP[k] = Math.min(PUMP[k], 1 - 0.5 * Math.exp(-tt / 0.11) * Math.min(1, tt / 0.004 + 0.3)); } }
for (const sec of SECTIONS) {
  const lift = sec.lift || 0, cta = sec.colour === "cta", prog4 = cta ? ["Am", "F", "G", "C"] : ["Am", "F", "C", "G"];
  const bars = Math.ceil((sec.t1 - sec.t0) / BAR - 1e-6);
  for (let b = 0; b < bars; b++) {
    const t0 = sec.t0 + b * BAR, name = prog4[b % 4], [notes0, root0] = CH[name], notes = notes0.map((m) => m + lift), root = root0 + lift;
    const last = cta && b === 3; // the CTA ends on one held chord
    if (last) break;
    const end = Math.min(sec.t1, t0 + BAR), soft = sec.colour === "intro" && b < 2, full = sec.colour === "full" || cta;
    for (let s = 0; s < 16; s++) {
      const t = t0 + s * STEP; if (t >= sec.t1 - 0.12) break;
      if (pass === 0 && soft) { if (s === 0 || s === 8) kick(t, 0.75); if (s % 2 === 0) hat(t, s % 4 ? 0.45 : 0.7); }
      else if (pass === 0) {
        if (s === 0 || s === 6 || s === 8 || (b % 4 === 3 && s === 14)) kick(t, s === 0 ? 1.05 : 0.95);
        if (s === 4 || s === 12) clap(t, full ? 1.05 : 0.95);
        if (full ? true : s % 2 === 0) hat(t, s % 2 ? 0.5 : 0.9);
        if (full && s % 8 === 2) hat(t, 0.6, true);
      }
      if (pass === 0) continue;
      if (!soft && full && s % 4 === 2) stab(t, notes.map((m) => m + 12), 0.8);
      if (!soft && [0, 3, 6, 8, 11, 14].includes(s)) bass(t, root + (s === 6 || s === 14 ? 12 : 0), STEP * (s === 6 || s === 14 ? 1 : 1.6), 0.95);
      if (sec.colour === "pluck" && s % 2 === 0) { const arp = [0, 1, 2, 3, 2, 1, 3, 2]; mallet(t, notes[arp[(s / 2) % 8]] + 12, s % 4 ? 0.6 : 0.85, ((s % 8) - 3.5) * 0.12); }
    }
    if (ROLL.has(sec.name) && b === bars - 1 && pass === 0) for (let k = 0; k < 8; k++) { const t = sec.t1 - (8 - k) * (STEP / 1.5); if (t > t0) snare(t, 0.35 + 0.08 * k); }
    if (pass === 0) continue;
    pad(t0, end, notes, full ? 1.1 : 0.85, soft ? 750 : 1100);
    // hook: full in the intro + hook/CTA sections, first three notes only when the voice is dense
    const hookMode = sec.colour === "intro" ? (b < 2 ? "full" : "sparse") : sec.colour === "hook" ? (b % 2 === 0 ? "full" : "sparse") : full ? (b % 2 === 0 ? "full" : "sparse") : "";
    if (hookMode) HOOK[name].forEach(([st, m, len], j) => {
      const t = t0 + st * STEP; if (t >= sec.t1 - 0.12 || (hookMode === "sparse" && j > 2)) return;
      lead(t, m + lift, len * STEP, soft ? 0.7 : 0.85, soft ? 0.6 : 1);
      if (cta) lead(t, m + lift + 12, len * STEP, 0.35, 1.2, false);
      if ((sec.colour === "hook" || cta) && j === 0) bell(t, m + lift + 12, 0.8);
    });
  }
  if (cta && pass === 0) kick(sec.t0 + 3 * BAR, 0.9);
  if (cta && pass === 1) { // last chord: C (I) lifted, rings out under the end card
    const tl = sec.t0 + 3 * BAR, [n0, r0] = CH.C, notes = n0.map((m) => m + lift);
    crash(tl, 0.8, music, musicVerb);
    pad(tl, DUR, notes, 1.2, 1300);
    notes.forEach((m, j) => bell(tl + j * 0.02, m + 12, 0.7));
    voice(music, tl, DUR - tl, 0.22, 0, (_, tt) => Math.tanh(1.2 * Math.sin(TAU * hz(r0 + lift) * tt)) * Math.min(1, tt / 0.005) * Math.exp(-tt / 1.4));
  }
}
}

// the full stops: music (and its reverb) is silent between sections; impacts live on their own bus
const gate = new Float32Array(N);
for (const sec of SECTIONS) { const a = Math.round(sec.t0 * SR), b = Math.min(N, Math.round(sec.t1 * SR)); for (let k = Math.max(0, a - 48); k < Math.min(N, b + 1200); k++) gate[k] = Math.max(gate[k], k < a ? (k - a + 48) / 48 : k < b ? 1 : 1 - (k - b) / 1200); }

// impacts on every title: boom-ish low hit + crash (+ the 1·2·3 notes + the "So… delete Google?" tension)
for (const ti of IMPACTS) {
  crash(ti, ti === T.cta ? 1.1 : 0.9);
  voice(hits, ti, 1.6, 0.55, 0, (_, tt) => Math.sin(TAU * (38 * tt + 30 * (1 - Math.exp(-tt * 3)) / 3)) * Math.min(1, tt / 0.008) * Math.exp(-tt / 0.55));
}
T.nums.forEach((tn, i) => { const t = tn + 0.1; mallet(t, [72, 76, 79][i], 1.6, (i - 1) * 0.4, hits, hitsVerb); bell(t, [84, 88, 91][i], 0.6, hits, hitsVerb); });
{ // tension under "So… delete Google?": low drone + clock ticks + a reverse swell into "No."
  const a = T.so2, b = T.no, f = hz(33);
  voice(hits, a, b - a + 0.05, 0.16, 0, (_, tt) => (Math.sin(TAU * f * tt) + 0.3 * Math.sin(TAU * f * 2 * tt)) * Math.min(1, tt / 0.4) * Math.min(1, (b - a - tt + 0.05) / 0.05));
  for (let t = a + BEAT / 2; t < b - 0.1; t += BEAT / 2) hat(t, 0.6, false, hits);
  const hp = new Bq().set("hp", 2500, 0.6);
  voice(hits, b - 1.0, 1.0, 0.16, 0, (_, tt) => hp.run(rnd()) * (tt / 1.0) ** 3, hitsVerb, 0.3);
}

// ---------- sound effects ----------
const cache = {};
function sample(name) {
  if (cache[name]) return cache[name];
  if (name === "thud" || name === "chirp") { // synthesized
    const n = Math.round((name === "thud" ? 0.32 : 0.16) * SR), L = new Float32Array(n), lp = new Bq().set("lp", 900, 0.7); let ph = 0;
    for (let i = 0; i < n; i++) { const tt = i / SR;
      if (name === "thud") { ph += (TAU * (46 + 60 * Math.exp(-tt * 30))) / SR; L[i] = 0.9 * Math.sin(ph) * Math.exp(-tt * 11) + 0.5 * lp.run(rnd()) * Math.exp(-tt * 60); }
      else { ph += (TAU * (420 + 1100 * (tt / 0.16) ** 0.7)) / SR; L[i] = 0.55 * Math.sin(ph) * Math.min(1, tt / 0.005) * Math.min(1, (0.16 - tt) / 0.04); } }
    let peak = 0; for (let i = 0; i < n; i++) if (Math.abs(L[i]) > Math.abs(L[peak])) peak = i;
    return (cache[name] = { L, R: L, peak });
  }
  const b = readFileSync(EL + name + ".f32"), n = b.length / 8, L = new Float32Array(n), R = new Float32Array(n);
  let peak = 0, best = 0;
  for (let i = 0; i < n; i++) { L[i] = b.readFloatLE(i * 8); R[i] = b.readFloatLE(i * 8 + 4); const a = Math.max(Math.abs(L[i]), Math.abs(R[i])); if (a > best) { best = a; peak = i; } }
  return (cache[name] = { L, R, peak });
}
const VARIANTS = { click: ["click_1", "click_2", "click_3"], key: ["key_0", "key_2", "key2_1", "key2_2"] };
const ANCHOR_PEAK = new Set(["whoosh", "whip", "tunnel", "riser"]), DARK = new Set(["whoosh", "whip", "riser"]);
const used = {};
for (const e of EVENTS) {
  const vs = VARIANTS[e.kind], name = vs ? vs[(used[e.kind] = (used[e.kind] ?? -1) + 1) % vs.length] : e.kind;
  const s = sample(name), rate = e.pitch ?? 1, g = e.gain ?? 1, [pl, pr] = pan(e.pan ?? 0);
  const len = Math.floor(s.L.length / rate), shift = ANCHOR_PEAK.has(e.kind) ? s.peak / rate : 0;
  const s0 = Math.round(e.t * SR - shift), soft = DARK.has(e.kind), lpL = new Bq().set("lp", 4000, 0.6), lpR = new Bq().set("lp", 4000, 0.6), hpL = new Bq().set("hp", 170, 0.7), hpR = new Bq().set("hp", 170, 0.7);
  for (let i = 0; i < len; i++) {
    const k = s0 + i; if (k < 0 || k >= N) continue;
    const x = i * rate, j = Math.floor(x), fr = x - j, j1 = Math.min(j + 1, s.L.length - 1);
    let l = s.L[j] + (s.L[j1] - s.L[j]) * fr, r = s.R[j] + (s.R[j1] - s.R[j]) * fr;
    if (soft) { l = hpL.run(lpL.run(l)); r = hpR.run(lpR.run(r)); }
    sfx.L[k] += l * g * pl * 1.41; sfx.R[k] += r * g * pr * 1.41; sfxVerb.L[k] += l * g * 0.1; sfxVerb.R[k] += r * g * 0.1;
  }
}

// ---------- mix down ----------
const mv = freeverb(musicVerb, 0.86, 0.4), hv = freeverb(hitsVerb, 0.88, 0.4), sv = freeverb(sfxVerb, 0.8, 0.45);
const duck = new Float32Array(N).fill(1), HITS = new Set(["pop", "ting", "click", "lock", "send", "sparkle", "buzz", "thud", "chirp"]);
for (const e of EVENTS) if (HITS.has(e.kind)) { const s0 = Math.round((e.t - 0.01) * SR), depth = 0.25 * Math.min(1, (e.gain ?? 1) * 1.5);
  for (let i = 0; i < Math.round(0.45 * SR); i++) { const k = s0 + i; if (k < 0 || k >= N) continue; const tt = i / SR; duck[k] = Math.min(duck[k], 1 - depth * (tt < 0.01 ? tt / 0.01 : tt < 0.12 ? 1 : Math.exp(-(tt - 0.12) / 0.12))); } }
const fadeOut = (i) => Math.min(1, (N - i) / (1.2 * SR));
const ML = new Float32Array(N), MR = new Float32Array(N), SL = new Float32Array(N), SR_ = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const g = gate[i] * duck[i] * fadeOut(i);
  ML[i] = Math.tanh(((music.L[i] + mv.L[i]) * g + (hits.L[i] + hv.L[i]) * fadeOut(i)) * 1.4) / 1.4;
  MR[i] = Math.tanh(((music.R[i] + mv.R[i]) * g + (hits.R[i] + hv.R[i]) * fadeOut(i)) * 1.4) / 1.4;
  SL[i] = Math.tanh((sfx.L[i] + sv.L[i]) * 1.1) / 1.1; SR_[i] = Math.tanh((sfx.R[i] + sv.R[i]) * 1.1) / 1.1;
}
function write(name, L, R) {
  const data = Buffer.alloc(N * 8);
  for (let i = 0; i < N; i++) { data.writeFloatLE(L[i], i * 8); data.writeFloatLE(R[i], i * 8 + 4); }
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVE", 8); h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34); h.write("data", 36); h.writeUInt32LE(data.length, 40);
  writeFileSync(out + name, Buffer.concat([h, data]));
}
write("music.wav", ML, MR); write("sfx.wav", SL, SR_);
console.log(`audio: ${EVENTS.length} sound events, ${kicks.length} kicks, ${DUR} s → out/music.wav, out/sfx.wav`);
