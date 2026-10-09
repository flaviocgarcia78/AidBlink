// AidBlink — narrated presentation ("pitch") video.
//
// Renders a self-contained HTML deck in Chromium, records it, and adds the
// same narration + soft music pipeline used by scripts/demo-video.mjs.
//
// It is meant to be the Colosseum "presentation video" (2–3 minutes): problem,
// approach, product proof, why Solana, traction, go-to-market and the ask.
//
// Usage:
//   npm run demo:pitch                 # app must be running on :3100
//   BASE=http://localhost:3000 node scripts/demo-pitch.mjs
//
// Env (see demo-video.mjs for the shared ones):
//   BASE, OUT, WIDTH, HEIGHT, NAME, NARRATION, TTS_*, MUSIC_VOLUME, KEEP_*
//
// edge-tts is optional but recommended:
//   pip install --target .tts edge-tts
//   TTS_PYTHONPATH=.tts npm run demo:pitch

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as audio from "./demo-audio.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { chromium } = await import("playwright").catch(() => {
  console.error(
    "\nPlaywright is required for the pitch video.\n" +
      "  npm install --no-save playwright && npx playwright install chromium\n",
  );
  process.exit(1);
});

/* -------------------------------- config -------------------------------- */

const BASE = (process.env.BASE ?? "http://localhost:3100").replace(/\/$/, "");
const OUT = process.env.OUT ?? path.resolve(process.cwd(), "docs/demo");
const NAME = process.env.NAME ?? "aidblink-pitch";
const LANG = process.env.CAPTIONS ?? "en";
const WIDTH = Number(process.env.WIDTH ?? 1440);
const HEIGHT = Number(process.env.HEIGHT ?? 900);
const KEEP_WEBM = process.env.KEEP_WEBM === "1";
const NARRATION = process.env.NARRATION !== "0";
const TTS_RATE = process.env.TTS_RATE ?? "+0%";
const MUSIC_VOLUME = Number(process.env.MUSIC_VOLUME ?? 0.5);
const VOICE_NAME =
  LANG === "pt" ? audio.audioConfig.defaultVoicePt : audio.audioConfig.defaultVoiceEn;

const ORG = {
  user: process.env.AIDBLINK_ORG_USER ?? "org@aidblink.demo",
  password: process.env.AIDBLINK_ORG_PASSWORD ?? "aidblink-org",
};
const PARTNER = {
  user: process.env.AIDBLINK_PARTNER_USER ?? "parceiro@aidblink.demo",
  password: process.env.AIDBLINK_PARTNER_PASSWORD ?? "aidblink-parceiro",
};

/* --------------------------------- deck --------------------------------- */

const SLIDES = [
  {
    kicker: "Crypto World's Fair · Solana",
    title: "AidBlink",
    sub: "Emergency aid in a single link.",
    narration:
      "This is AidBlink: emergency aid in a single link, built on Solana.",
  },
  {
    kicker: "The problem",
    title: "Aid loses its way in the last mile",
    bullets: [
      "Donors can't see whether help actually arrived",
      "Organizations reconcile aid in spreadsheets",
      "The same benefit can be claimed twice",
      "People in need can't manage wallets or fees",
    ],
    narration:
      "Emergency aid breaks down in the last mile. Donors can't see whether their money became real help. Organizations reconcile aid in spreadsheets. The same benefit can be claimed twice. And the people receiving aid should never need a wallet or pay fees.",
  },
  {
    kicker: "Our approach",
    title: "Keep crypto where it earns its keep",
    columns: [
      {
        h: "On-chain",
        items: ["Funding", "Transparency", "Auditability"],
      },
      {
        h: "Off-chain",
        items: ["The human last mile", "Pseudonymous requests", "One-time vouchers"],
      },
    ],
    narration:
      "Our approach is to keep crypto exactly where it earns its keep: funding, transparency and auditability. And to keep the human flow simple and wallet-free.",
  },
  {
    kicker: "How it works",
    title: "Three steps, one closed loop",
    steps: [
      "1 · Contribute — a Solana Blink",
      "2 · Administer — allocate from the on-chain pool",
      "3 · Deliver — a one-time voucher, no wallet",
    ],
    narration:
      "A supporter contributes through a Solana Blink. The organization allocates that pool to real, pseudonymous needs. The person in need receives a one-time voucher, with no wallet and no fees, that a partner redeems exactly once.",
  },
  {
    kicker: "Product · Contribute",
    title: "A contribution is a real on-chain transfer",
    shot: "contribute",
    narration:
      "Let me show it. A supporter opens the Blink, connects Phantom, and sends a genuine Devnet transaction. This is not a mock-up: the contribution is confirmed on-chain.",
  },
  {
    kicker: "Product · Administer",
    title: "The pool is read from the chain",
    shot: "admin",
    narration:
      "The organization dashboard reads the aid pool live from the on-chain ledger: raised, available, allocated and redeemed. A budget guard prevents allocating more than was actually raised.",
  },
  {
    kicker: "Product · Deliver",
    title: "One benefit, used exactly once",
    shot: "redeem",
    narration:
      "Approving a request issues a signed voucher. The partner verifies it once; a second attempt is rejected and logged. Single use is a server-side state transition, not a property of the QR code.",
  },
  {
    kicker: "Built for trust",
    title: "Real on-chain. Honest about the rest.",
    columns: [
      {
        h: "Real (Devnet)",
        items: [
          "Anchor program deployed",
          "Contributions recorded as PDAs",
          "Treasury balance read from chain",
        ],
      },
      {
        h: "Simulated",
        items: ["Benefit amounts", "Partner and redemption", "USD value at a demo rate"],
      },
    ],
    narration:
      "We are explicit about the line. The Anchor program and the contributions are real, on Devnet. Benefit amounts, partners and redemption are simulated. Being honest about what's real is what makes the demo credible.",
  },
  {
    kicker: "Why Solana",
    title: "Blinks turn any link into funding",
    bullets: [
      "A contribution is a shareable Action link",
      "Any wallet, any post, any QR code",
      "No app to install, no new account",
    ],
    narration:
      "Solana Blinks make distribution unstoppable. A contribution is just a shareable Action link, so any post, message or QR code can become a funding entry point, with any wallet and no app to install.",
  },
  {
    kicker: "Traction",
    title: "Working today, open-source",
    bullets: [
      "Anchor program deployed and verified on Devnet",
      "Real donations tested end-to-end",
      "Typed client and a public audit-style dashboard",
    ],
    narration:
      "This is not a concept. We already have an Anchor program deployed and verified on Devnet, real donations tested end-to-end, and an open-source repo with a typed client and a public dashboard.",
  },
  {
    kicker: "Go-to-market",
    title: "Start where aid is already distributed",
    bullets: [
      "Community organizations and NGOs in Brazil",
      "Blinks baked into each organization's own channels",
      "Expand to any cause that pays out benefits",
    ],
    narration:
      "Our go-to-market starts with community organizations and NGOs in Brazil that already distribute emergency aid. Their existing channels become the distribution, and the model expands to any cause that pays out benefits.",
  },
  {
    kicker: "The ask",
    title: "Build the standard for traceable aid",
    narration:
      "We are applying to Colosseum to pilot with real organizations, harden the on-chain program, and turn AidBlink into the standard way to fund aid transparently on Solana.",
  },
  {
    kicker: "AidBlink · Solana Devnet",
    big: "AidBlink",
    sub: "github.com/flaviocgarcia78/AidBlink",
    narration: "",
    hold: 4.5,
  },
];

/* --------------------------------- styles -------------------------------- */

const CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; background: #020617; }
body {
  font-family: Inter, "Segoe UI", system-ui, -apple-system, sans-serif;
  color: #e2e8f0; -webkit-font-smoothing: antialiased;
}
#stage { position: fixed; inset: 0; }
.slide {
  position: absolute; inset: 0; padding: 84px 100px 78px;
  display: flex; flex-direction: column; justify-content: center;
  background:
    radial-gradient(1100px 620px at 78% -12%, rgba(16,185,129,.20), transparent 60%),
    radial-gradient(900px 560px at -10% 108%, rgba(45,212,191,.12), transparent 60%),
    linear-gradient(160deg, #020617 0%, #06101f 55%, #030b16 100%);
}
.slide::after {
  content: ""; position: absolute; inset: 0; pointer-events: none; opacity: .35;
  background-image: linear-gradient(rgba(148,163,184,.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148,163,184,.05) 1px, transparent 1px);
  background-size: 46px 46px;
  mask-image: radial-gradient(circle at 50% 42%, #000 45%, transparent 78%);
}
.kicker, .slide h1, .sub, .bullets, .steps, .cols, .big, .shot, footer {
  position: relative; z-index: 2;
}
.kicker {
  color: #34d399; font-weight: 800; font-size: 16px; letter-spacing: .18em;
  text-transform: uppercase; margin-bottom: 14px;
  opacity: 0; transform: translateY(10px);
}
.slide h1 {
  font-size: 44px; line-height: 1.08; letter-spacing: -.02em; color: #f8fafc;
  font-weight: 800; max-width: 1000px; margin-bottom: 22px;
  opacity: 0; transform: translateY(14px);
}
.slide.with-shot { justify-content: flex-start; }
.slide.with-shot h1 { font-size: 34px; max-width: 1080px; margin-bottom: 12px; }
.slide.with-shot .kicker { margin-bottom: 10px; }
.sub { font-size: 22px; color: #94a3b8; font-weight: 500; opacity: 0; transform: translateY(12px); }
.big { font-size: 84px; font-weight: 900; letter-spacing: -.03em; line-height: 1;
  background: linear-gradient(120deg,#f8fafc,#34d399); -webkit-background-clip: text;
  background-clip: text; color: transparent; margin-bottom: 20px; opacity: 0; transform: translateY(16px); }
ul.bullets { list-style: none; display: grid; gap: 16px; margin-top: 6px; }
ul.bullets li {
  position: relative; padding-left: 34px; font-size: 23px; line-height: 1.35; color: #cbd5e1;
  opacity: 0; transform: translateX(14px);
}
ul.bullets li::before {
  content: ""; position: absolute; left: 6px; top: 11px; width: 12px; height: 12px;
  border-radius: 4px; background: #10b981; box-shadow: 0 0 18px rgba(16,185,129,.7);
}
.steps { display: grid; gap: 18px; margin-top: 8px; }
.step {
  font-size: 24px; font-weight: 600; color: #e2e8f0;
  padding: 18px 24px; border-radius: 16px;
  background: rgba(15,23,42,.7); border: 1px solid rgba(52,211,153,.28);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
  opacity: 0; transform: translateY(12px);
}
.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 6px; }
.col { padding: 26px 28px; border-radius: 18px; background: rgba(15,23,42,.68);
  border: 1px solid rgba(148,163,184,.18); opacity: 0; transform: translateY(12px); }
.col h4 { font-size: 17px; letter-spacing: .12em; text-transform: uppercase; color: #34d399; margin-bottom: 12px; }
.col:last-child h4 { color: #94a3b8; }
.col ul { list-style: none; display: grid; gap: 10px; }
.col li { font-size: 20px; color: #cbd5e1; }
.shot {
  margin-top: 18px; border-radius: 16px; overflow: hidden; align-self: stretch;
  flex: 1 1 auto; min-height: 0; background: #0b1220;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(148,163,184,.25); box-shadow: 0 30px 80px rgba(2,6,23,.6);
  opacity: 0; transform: translateY(18px) scale(.985);
}
.shot img {
  display: block; max-width: 100%; max-height: 100%; width: auto; height: auto;
  object-fit: contain; transform-origin: 50% 40%; animation: kenburns 16s ease-out forwards;
}
@keyframes kenburns { from { transform: scale(1.04) } to { transform: scale(1.0) } }
footer {
  position: absolute; top: 44px; right: 100px; bottom: auto; left: auto;
  display: flex; align-items: center; gap: 14px;
  font-size: 14px; color: #64748b; letter-spacing: .04em; z-index: 2;
}
footer .mark { color: #34d399; font-weight: 800; letter-spacing: .08em; }
/* progressive caption (phrase-by-phrase, synced to the narration) */
#pcap {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 6;
  display: flex; align-items: flex-end; justify-content: center;
  padding: 20px 120px 30px; pointer-events: none;
}
#pcap span {
  max-width: 1020px; text-align: center; color: #f1f5f9;
  font-size: 23px; line-height: 1.42; font-weight: 500; letter-spacing: .1px;
  background: rgba(2,6,23,.72); border-radius: 14px; padding: 12px 22px;
  box-shadow: 0 10px 34px rgba(2,6,23,.45); text-shadow: 0 1px 8px rgba(0,0,0,.6);
  opacity: 0; transition: opacity .22s ease;
}
/* entrance */
#stage.in .kicker { animation: up .7s .05s ease-out forwards; }
#stage.in h1 { animation: up .7s .18s ease-out forwards; }
#stage.in .sub { animation: up .7s .30s ease-out forwards; }
#stage.in .big { animation: up .7s .18s ease-out forwards; }
#stage.in ul.bullets li { animation: slideIn .6s ease-out forwards; }
#stage.in ul.bullets li:nth-child(1) { animation-delay: .34s }
#stage.in ul.bullets li:nth-child(2) { animation-delay: .46s }
#stage.in ul.bullets li:nth-child(3) { animation-delay: .58s }
#stage.in ul.bullets li:nth-child(4) { animation-delay: .70s }
#stage.in .steps .step { animation: up .6s ease-out forwards; }
#stage.in .steps .step:nth-child(1) { animation-delay: .34s }
#stage.in .steps .step:nth-child(2) { animation-delay: .50s }
#stage.in .steps .step:nth-child(3) { animation-delay: .66s }
#stage.in .cols .col { animation: up .6s ease-out forwards; }
#stage.in .cols .col:nth-child(1) { animation-delay: .36s }
#stage.in .cols .col:nth-child(2) { animation-delay: .52s }
#stage.in .shot { animation: up .7s .32s ease-out forwards; }
@keyframes up { to { opacity: 1; transform: translateY(0); } }
@keyframes slideIn { to { opacity: 1; transform: translateX(0); } }
`;

/* ------------------------------ screenshot ------------------------------- */

async function sessionValue(role) {
  const creds = role === "partner" ? PARTNER : ORG;
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, user: creds.user, password: creds.password }),
  });
  if (!res.ok) throw new Error(`login ${role} failed: ${res.status}`);
  const cookies =
    typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const raw = cookies.find((c) => c.startsWith("aidblink_session="));
  if (!raw) throw new Error(`no session cookie for ${role}`);
  return raw.slice("aidblink_session=".length, raw.indexOf(";") === -1 ? undefined : raw.indexOf(";"));
}

async function captureShots(browser) {
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT } });
  const page = await ctx.newPage();
  const shots = {};
  const grab = async (url, key, role) => {
    if (role) {
      const value = await sessionValue(role);
      await ctx.addCookies([{ name: "aidblink_session", value, url: BASE }]);
    }
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(2200);
      shots[key] = (await page.screenshot({ type: "png" })).toString("base64");
      console.log(`· captured ${key}`);
    } catch (error) {
      console.log(`· could not capture ${key}: ${error?.message ?? error}`);
    }
  };
  await grab(`${BASE}/contribute`, "contribute");
  await grab(`${BASE}/admin`, "admin", "org");
  await grab(`${BASE}/redeem`, "redeem", "partner");
  await ctx.close();
  return shots;
}

/* ------------------------------- rendering ------------------------------- */

function slideHtml(slide, shots) {
  const esc = (v) => v;
  const bullets = slide.bullets
    ? `<ul class="bullets">${slide.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`
    : "";
  const steps = slide.steps
    ? `<div class="steps">${slide.steps.map((b) => `<div class="step">${esc(b)}</div>`).join("")}</div>`
    : "";
  const cols = slide.columns
    ? `<div class="cols">${slide.columns
        .map(
          (c) =>
            `<div class="col"><h4>${esc(c.h)}</h4><ul>${c.items
              .map((i) => `<li>${esc(i)}</li>`)
              .join("")}</ul></div>`,
        )
        .join("")}</div>`
    : "";
  const shot =
    slide.shot && shots[slide.shot]
      ? `<div class="shot"><img src="data:image/png;base64,${shots[slide.shot]}"/></div>`
      : "";
  const big = slide.big ? `<div class="big">${esc(slide.big)}</div>` : "";
  return `<section class="slide ${slide.shot ? "with-shot" : ""}">
    ${slide.kicker ? `<div class="kicker">${esc(slide.kicker)}</div>` : ""}
    ${slide.title ? `<h1>${esc(slide.title)}</h1>` : ""}
    ${slide.sub ? `<p class="sub">${esc(slide.sub)}</p>` : ""}
    ${big}${bullets}${steps}${cols}${shot}
    <footer><span class="mark">AidBlink</span><span>Solana · Crypto World's Fair</span></footer>
  </section>`;
}

/**
 * Install the phrase timeline for the slide. Each phrase is revealed at its
 * own start time (seconds, relative to the slide) and the caption fades at the
 * end of the slide. Timers are cleared when the next slide begins.
 */
async function scheduleCaption(page, phrases, hold) {
  await page
    .evaluate(
      ({ phrases, hold }) => {
        const el = document.querySelector("#pcap > span");
        if (!el) return;
        if (window.__pcTimers) window.__pcTimers.forEach(clearTimeout);
        window.__pcTimers = [];
        if (!phrases.length) {
          el.style.opacity = "0";
          return;
        }
        el.textContent = phrases[0].text;
        el.style.opacity = "1";
        phrases.slice(1).forEach((phrase) => {
          window.__pcTimers.push(
            setTimeout(() => {
              el.textContent = phrase.text;
            }, Math.max(0, phrase.start * 1000)),
          );
        });
        window.__pcTimers.push(
          setTimeout(() => {
            el.style.opacity = "0";
          }, hold * 1000),
        );
      },
      { phrases, hold },
    )
    .catch(() => undefined);
}

/* --------------------------------- main --------------------------------- */

mkdirSync(OUT, { recursive: true });
const RAW_DIR = path.join(OUT, ".raw-pitch");
rmSync(RAW_DIR, { recursive: true, force: true });
mkdirSync(RAW_DIR, { recursive: true });
const AUDIO_DIR = path.join(OUT, ".audio-pitch");

const ffmpegPath = await audio.loadFfmpegBin();
const ffmpeg = ffmpegPath ?? process.env.FFMPEG;

/* narration */
let VOICE = new Map();
if (NARRATION && audio.ttsAvailable()) {
  const texts = [...new Set(SLIDES.map((s) => s.narration).filter((t) => t && t.trim()))];
  try {
    VOICE = audio.synthesize(
      texts.map((text) => ({ text })),
      { voice: VOICE_NAME, rate: TTS_RATE, dir: path.join(AUDIO_DIR, LANG) },
    );
    console.log(`· narration ready (${VOICE.size} lines, ${VOICE_NAME})`);
  } catch (error) {
    console.error("· narration failed; continuing:", error?.message ?? error);
    VOICE = new Map();
  }
} else if (NARRATION) {
  console.log("· narration unavailable (needs edge-tts); slides use fixed timing");
}

const browser = await chromium.launch({ headless: true });
const shots = await captureShots(browser);

if (process.env.CHECK === "1") {
  const checkCtx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT } });
  const checkPage = await checkCtx.newPage();
  await checkPage.setContent(
    `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head>` +
      `<body><div id="stage"></div><div id="pcap"><span></span></div></body></html>`,
  );
  for (const [i, slide] of SLIDES.entries()) {
    await checkPage.evaluate((html) => {
      const stage = document.getElementById("stage");
      stage.classList.remove("in");
      stage.innerHTML = html;
      void stage.offsetWidth;
      stage.classList.add("in");
    }, slideHtml(slide, shots));
    await checkPage.waitForTimeout(900);
    const info = await checkPage.evaluate(() => {
      const box = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { t: Math.round(r.top), b: Math.round(r.bottom), l: Math.round(r.left), r: Math.round(r.right) };
      };
      const slideEl = document.querySelector(".slide");
      return {
        vw: innerWidth,
        vh: innerHeight,
        scroll: slideEl ? slideEl.scrollHeight : 0,
        h1: box(document.querySelector(".slide h1")),
        shot: box(document.querySelector(".shot")),
        foot: box(document.querySelector("footer")),
      };
    });
    const overflow = info.scroll > info.vh + 1 ? "  <-- OVERFLOW" : "";
    console.log(
      `· slide ${String(i).padStart(2, "0")}${slide.shot ? ` [${slide.shot}]` : ""}` +
        ` vh=${info.vh} scroll=${info.scroll} h1=${info.h1?.t}..${info.h1?.b}` +
        ` shot=${info.shot ? `${info.shot.t}..${info.shot.b}` : "-"}` +
        ` foot=${info.foot?.t}..${info.foot?.b}${overflow}`,
    );
  }
  await checkCtx.close();
  await browser.close();
  process.exit(0);
}

const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  recordVideo: { dir: RAW_DIR, size: { width: WIDTH, height: HEIGHT } },
});
const page = await context.newPage();
const video = page.video();

await page.setContent(
  `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head>` +
    `<body><div id="stage"></div><div id="pcap"><span></span></div></body></html>`,
);

const audioCues = [];
const captionCues = [];
const t0 = Date.now();
for (const slide of SLIDES) {
  await page.evaluate((html) => {
    const stage = document.getElementById("stage");
    stage.classList.remove("in");
    stage.innerHTML = html;
    void stage.offsetWidth;
    stage.classList.add("in");
  }, slideHtml(slide, shots));

  const voice = VOICE.get(slide.narration);
  const narrated = voice?.duration ?? 0;
  const words = (slide.narration || "").trim().split(/\s+/).filter(Boolean).length;
  const fallback = slide.narration ? Math.max(5, words / 2.4) : (slide.hold ?? 3.5);
  const hold = slide.hold ?? (narrated > 0 ? narrated + 0.7 : fallback + 0.7);
  const start = (Date.now() - t0) / 1000;
  const end = start + hold;
  if (slide.narration) audioCues.push({ start, end, text: slide.narration, visible: true });

  // Progressive captions: short phrases revealed as the narration is spoken.
  const phrases = slide.narration
    ? audio.buildPhrases(slide.narration, voice?.words, narrated || hold)
    : [];
  for (const phrase of phrases) {
    captionCues.push({
      start: start + phrase.start,
      end: start + Math.min(phrase.end, hold),
      text: phrase.text,
      visible: true,
    });
  }
  await scheduleCaption(page, phrases, hold);

  await page.waitForTimeout(Math.round(hold * 1000));
}

await context.close();
const rawPath = await video.path();
await browser.close();

/* ------------------------------ postprocess ----------------------------- */

const webmOut = path.join(OUT, `${NAME}.webm`);
const mp4Out = path.join(OUT, `${NAME}.mp4`);
const srtOut = path.join(OUT, `${NAME}.srt`);
const posterOut = path.join(OUT, `${NAME}-poster.jpg`);

if (rawPath && existsSync(rawPath)) {
  rmSync(webmOut, { force: true });
  renameSync(rawPath, webmOut);
}

if (existsSync(webmOut) && ffmpeg) {
  execFileSync(
    ffmpeg,
    ["-y", "-i", webmOut, "-c:v", "libx264", "-preset", "medium", "-crf", "26",
     "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4Out],
    { stdio: "inherit" },
  );
}

if (existsSync(mp4Out) && ffmpeg) {
  const total = audio.probeDuration(mp4Out);
  mkdirSync(AUDIO_DIR, { recursive: true });
  const narration = audio.assembleNarration(
    audioCues,
    VOICE,
    total,
    path.join(AUDIO_DIR, `narration-${LANG}.pcm`),
  );
  const music = audio.makeMusic(total, path.join(AUDIO_DIR, `music-${LANG}.pcm`));
  const narrated = path.join(OUT, `${NAME}.narrated.mp4`);
  audio.mixAndMux({
    video: mp4Out,
    narration: narration.pcm,
    music,
    out: narrated,
    duration: total,
    musicVolume: MUSIC_VOLUME,
  });
  renameSync(narrated, mp4Out);
  try {
    execFileSync(
      ffmpeg,
      ["-y", "-ss", "4", "-i", mp4Out, "-frames:v", "1", "-q:v", "3", posterOut],
      { stdio: ["ignore", "ignore", "ignore"] },
    );
  } catch (error) {
    console.error("· poster failed:", error?.message ?? error);
  }
} else if (existsSync(webmOut) && !KEEP_WEBM) {
  rmSync(webmOut, { force: true });
}
if (!KEEP_WEBM) rmSync(webmOut, { force: true });

function srtTime(sec) {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  const f = String(ms % 1000).padStart(3, "0");
  return `${h}:${m}:${s},${f}`;
}
const srt = captionCues
  .filter((c) => c.visible && c.text.trim())
  .map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`)
  .join("\n");
if (srt) writeFileSync(srtOut, srt, "utf8");

try {
  if (readdirSync(RAW_DIR).length === 0) rmSync(RAW_DIR, { recursive: true, force: true });
} catch {
  /* ignore */
}
if (process.env.KEEP_AUDIO !== "1") rmSync(AUDIO_DIR, { recursive: true, force: true });

const duration = existsSync(mp4Out) ? audio.probeDuration(mp4Out) : 0;
console.log("\nDone.");
console.log(`· video : ${path.relative(process.cwd(), mp4Out)} (${duration.toFixed(1)}s)`);
console.log(`· captions: ${path.relative(process.cwd(), srtOut)}`);
if (existsSync(posterOut)) console.log(`· poster : ${path.relative(process.cwd(), posterOut)}`);
