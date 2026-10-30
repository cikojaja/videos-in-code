// Renders reel.html with headless Chrome over CDP (no packages).
//   node capture.mjs stills 0 1.5 3.2 …   → stills/t-<sec>.png (+ ?safe overlay with --safe)
//   node capture.mjs video [workers]      → frames/ (jpeg) → reel-video.mp4 (30 fps, silent)
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const DIR = new URL(".", import.meta.url).pathname, FPS = 30;
const [mode = "stills", ...rest] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function browser(port, query = "") {
  const proc = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-color-profile=srgb", `--remote-debugging-port=${port}`,
    `--user-data-dir=${join(tmpdir(), "gc-reel-" + port)}`, "--allow-file-access-from-files", "--window-size=1080,1920", "about:blank"], { stdio: "ignore" });
  let target;
  for (let i = 0; i < 60 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page"); } catch { await sleep(200); } }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let id = 0; const waiting = new Map();
  ws.addEventListener("message", (m) => { const d = JSON.parse(m.data); if (d.id && waiting.has(d.id)) { waiting.get(d.id)(d); waiting.delete(d.id); }
    if (d.method === "Runtime.exceptionThrown") console.error("page error:", d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text); });
  const send = (method, params = {}) => new Promise((r) => { const n = ++id; waiting.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
  const evaluate = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 600)); return r.result?.result?.value; };
  await send("Page.enable"); await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `file://${DIR}reel.html${query}` });
  for (let i = 0; i < 100 && !(await evaluate("document.readyState === 'complete' && !!window.seek").catch(() => false)); i++) await sleep(100);
  await evaluate("document.fonts.ready.then(() => true)");
  const shot = async (t, format = "png") => { await evaluate(`seek(${t})`); return Buffer.from((await send("Page.captureScreenshot", { format, quality: format === "jpeg" ? 94 : undefined })).result.data, "base64"); };
  return { shot, evaluate, close: () => { ws.close(); proc.kill(); } };
}

if (mode === "stills") {
  const safe = rest.includes("--safe"), times = rest.filter((a) => a !== "--safe").map(Number);
  const b = await browser(9341, safe ? "?safe=1" : "");
  mkdirSync(join(DIR, "stills"), { recursive: true });
  for (const t of times) writeFileSync(join(DIR, "stills", `t-${t.toFixed(2)}.png`), await b.shot(t));
  b.close(); console.log(`${times.length} stills → stills/`);
} else {
  const workers = Number(rest[0] || 4), b0 = await browser(9350), dur = await b0.evaluate("window.DUR"); b0.close();
  const total = Math.round(dur * FPS), frames = join(DIR, "frames");
  rmSync(frames, { recursive: true, force: true }); mkdirSync(frames, { recursive: true });
  const t0 = Date.now();
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const b = await browser(9360 + w);
    for (let f = w; f < total; f += workers) writeFileSync(join(frames, `f${String(f).padStart(5, "0")}.jpg`), await b.shot(f / FPS, "jpeg"));
    b.close();
  }));
  console.log(`${readdirSync(frames).length}/${total} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  execFileSync("ffmpeg", ["-y", "-v", "error", "-framerate", String(FPS), "-i", join(frames, "f%05d.jpg"), "-vf", "noise=c0s=2:c0f=t,format=yuv420p",
    "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-maxrate", "14M", "-bufsize", "28M", "-tune", "grain", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
    "-movflags", "+faststart", join(DIR, "reel-video.mp4")]);
  console.log("→ reel-video.mp4");
}
