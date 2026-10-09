// AidBlink — narrated demo video generator.
//
// Drives the running app with Playwright, very slowly, and produces a narrated
// screencast: an MP4 with burned-in captions (and a sidecar .srt).
//
// The recording connects a wallet named "Phantom". Playwright cannot drive the
// real Phantom extension reliably, so the script injects a Wallet-Adapter
// compatible provider at `window.phantom.solana` that signs with a real Devnet
// keypair and sends the transaction to the cluster. The donation shown in the
// video is therefore a genuine on-chain transfer (verifiable on the explorer).
//
// When edge-tts is available, the recording is also narrated: every caption is
// synthesized to speech, the pauses are sized to the spoken lines, and a soft
// royalty-free ambient bed is generated with ffmpeg and mixed in. Install it
// on demand (no API key):
//
//   pip install --target .tts edge-tts
//   TTS_PYTHONPATH=.tts npm run demo:video
//
// Without it the script still produces the silent video.
//
// Usage:
//   node scripts/demo-video.mjs                 # app must be running on :3100
//   BASE=http://localhost:3000 node scripts/demo-video.mjs
//   SPEED=1.3 CAPTIONS=en OUT=docs/demo node scripts/demo-video.mjs
//
// Env:
//   BASE      App base URL                (default http://localhost:3100)
//   OUT       Output directory            (default docs/demo)
//   CAPTIONS  en | pt                     (default en)
//   SPEED     Pause multiplier            (default 1)
//   WIDTH     Viewport width              (default 1440)
//   HEIGHT    Viewport height             (default 900)
//   RESET     1 to reset the demo via API (default 1)
//   NARRATION 0 to skip narration + music (default 1 when edge-tts is present)
//   TTS_PYTHON      python binary               (default python3)
//   TTS_PYTHONPATH  path to the edge-tts install
//   TTS_VOICE_EN / TTS_VOICE_PT  override the neural voice
//   TTS_RATE        voice rate                   (default -4%)
//   MUSIC_VOLUME    background music level 0-1   (default 0.5)
//   KEEP_WEBM 1 to keep the intermediate .webm   (default 0)
//   KEEP_AUDIO 1 to keep intermediate TTS/audio  (default 0)
//   DEMO_WALLET_KEYPAIR  Devnet keypair used as the demo "Phantom" wallet
//                        (default ~/.config/solana/id.json)
//   SOLANA_RPC_URL       RPC for the real donation
//                        (default https://api.devnet.solana.com)

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import * as web3 from "@solana/web3.js";
import * as audio from "./demo-audio.mjs";

const { Connection, Keypair, Transaction } = web3;

/**
 * The video tooling (Playwright + a static ffmpeg) is intentionally NOT part of
 * the project's dependencies, so a normal `npm install` stays lean. Install it
 * on demand:
 *
 *   npm install --no-save playwright ffmpeg-static
 *   npx playwright install chromium
 */
async function loadChromium() {
  try {
    const mod = await import("playwright");
    return mod.chromium;
  } catch {
    console.error(
      [
        "",
        "Playwright is required to record the demo video.",
        "Install the optional tooling first:",
        "",
        "  npm install --no-save playwright ffmpeg-static",
        "  npx playwright install chromium",
        "",
        "Then re-run:  npm run demo:video",
        "",
      ].join("\n"),
    );
    process.exit(1);
  }
}

async function loadFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try {
    const mod = await import("ffmpeg-static");
    return mod.default;
  } catch {
    return null; // keep the .webm; conversion is best-effort
  }
}

const chromium = await loadChromium();
const ffmpegPath = await loadFfmpeg();

const BASE = process.env.BASE ?? "http://localhost:3100";
const OUT = path.resolve(process.env.OUT ?? "docs/demo");
const LANG = (process.env.CAPTIONS ?? "en").toLowerCase().startsWith("pt") ? "pt" : "en";
const SPEED = Number(process.env.SPEED ?? 1) || 1;
const WIDTH = Number(process.env.WIDTH ?? 1440);
const HEIGHT = Number(process.env.HEIGHT ?? 900);
const RESET = process.env.RESET !== "0";
const KEEP_WEBM = process.env.KEEP_WEBM === "1";
const KEEP_AUDIO = process.env.KEEP_AUDIO === "1";
const NAME = process.env.NAME ?? "aidblink-demo";
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

/* ------------------------- on-chain demo wallet ------------------------- */

/**
 * Real-keypair "Phantom" for the recording.
 *
 * `window.phantom.solana` is filled in with a Wallet-Adapter-compatible
 * provider (see PHANTOM_INIT). Its `signAndSendTransaction` delegates to the
 * Node process, which signs with `donor` and broadcasts to Devnet. The result
 * is a genuine on-chain donation that can be inspected in the explorer.
 */
const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const DONOR_PATH =
  process.env.DEMO_WALLET_KEYPAIR ??
  path.join(os.homedir(), ".config", "solana", "id.json");
const donor = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync(DONOR_PATH, "utf8"))),
);
const chain = new Connection(RPC_URL, "confirmed");
let lastDonationSignature = null;

async function signAndSend(b64) {
  const tx = Transaction.from(Buffer.from(b64, "base64"));
  tx.sign(donor);
  const signature = await chain.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  await chain.confirmTransaction(signature, "confirmed");
  lastDonationSignature = signature;
  console.log("· on-chain donation confirmed:", signature);
  return signature;
}

async function signOnly(b64) {
  const tx = Transaction.from(Buffer.from(b64, "base64"));
  tx.partialSign(donor);
  return tx
    .serialize({ requireAllSignatures: false, verifySignatures: false })
    .toString("base64");
}

/** Runs in the browser: installs a Phantom-shaped provider. */
function PHANTOM_INIT() {
  if (window.__abPhantomInstalled) return;
  const listeners = Object.create(null);
  const emit = (event, ...args) => {
    for (const fn of listeners[event] ?? []) {
      try {
        fn(...args);
      } catch {
        /* ignore */
      }
    }
  };
  const b64 = (bytes) => btoa(String.fromCharCode(...bytes));
  const provider = {
    isPhantom: true,
    isConnected: false,
    publicKey: null,
    async connect() {
      const bytes = Uint8Array.from(await window.__aidblinkConnect());
      provider.publicKey = {
        toBytes: () => bytes,
        toBase58: () => "",
        toString: () => "Phantom",
        equals: (other) => {
          try {
            const b = other.toBytes();
            return b.length === bytes.length && b.every((v, i) => v === bytes[i]);
          } catch {
            return false;
          }
        },
      };
      provider.isConnected = true;
      emit("connect", provider.publicKey);
      return { publicKey: provider.publicKey };
    },
    async disconnect() {
      provider.isConnected = false;
      provider.publicKey = null;
      emit("disconnect");
    },
    async signAndSendTransaction(transaction) {
      const serialized = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });
      const signature = await window.__aidblinkSignAndSend(b64(serialized));
      emit("transaction", signature);
      return { signature };
    },
    async signTransaction(transaction) {
      const serialized = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });
      const signed = await window.__aidblinkSign(b64(serialized));
      const bytes = Uint8Array.from(atob(signed), (c) => c.charCodeAt(0));
      return { serialize: () => bytes, signatures: transaction.signatures };
    },
    async signAllTransactions(txs) {
      return Promise.all(txs.map((t) => provider.signTransaction(t)));
    },
    async signMessage(message) {
      const signed = await window.__aidblinkSignMessage(b64(message));
      return { signature: Uint8Array.from(atob(signed), (c) => c.charCodeAt(0)) };
    },
    on(event, fn) {
      (listeners[event] ??= []).push(fn);
      return provider;
    },
    off(event, fn) {
      listeners[event] = (listeners[event] ?? []).filter((f) => f !== fn);
      return provider;
    },
    removeAllListeners(event) {
      if (event) delete listeners[event];
      else for (const key of Object.keys(listeners)) delete listeners[key];
      return provider;
    },
  };
  window.phantom = { solana: provider };
  window.solana = provider;
  window.isPhantomInstalled = true;
  window.__abPhantomInstalled = true;
}

/* ------------------------------- captions ------------------------------- */

const CAPTIONS = {
  en: {
    openKicker: "Solana Blinks · Devnet",
    openTitle: "AidBlink",
    openSub: "Emergency aid in a single link",
    introVoice: "Every donation should be traceable to real help.",
    home1:
      "Emergency aid often disappears between the donation and the person it should reach.",
    home2:
      "AidBlink closes that loop: real on-chain funding, and benefits that can't be double-spent.",
    contribute1: "Step 1 · Contribute. A supporter opens the Blink and connects a wallet.",
    contribute2: "They pick an amount — here, 0.1 SOL.",
    contribute3: "Connect Phantom. The wallet signs a real Devnet transaction.",
    contribute5: "Approve. A genuine on-chain transfer, not a simulation.",
    contribute6: "Confirmed on-chain. The contribution is now in the aid pool.",
    explorer2: "The explorer shows the signature, the program and the treasury.",
    blink2:
      "It's a standard Solana Blink — a shareable transaction link, rendered in our own client.",
    login1: "Step 2 · Administer. The organization signs in to manage the pool.",
    login2: "A demo gate with example users.",
    admin1: "The dashboard reads the aid pool live from the on-chain ledger.",
    admin2: "Raised, available, allocated and redeemed — anchored to the treasury.",
    admin3: "Record a pseudonymous request — no personal data, just a reference.",
    admin4: "Set a small amount and create the request.",
    admin5: "It's pending. Approving issues a signed voucher.",
    admin6: "Approved — the voucher is issued.",
    voucher1: "Step 3 · Deliver. The beneficiary gets a QR link.",
    voucher2: "The QR carries a signed token; single use is enforced server-side.",
    partner1: "The partner terminal is a separate role. Sign in as the partner.",
    redeem1: "The partner verifies the signed token.",
    redeem2: "Redeemed — the voucher is spent.",
    redeem3: "Now try the exact same token again.",
    redeem4: "Rejected. A benefit can only be used once — and the attempt is logged.",
    admin7: "Back on the dashboard: the redemption and the blocked attempt are on record.",
    endKicker: "AidBlink · Solana Devnet",
    endTitle: "From a contribution on-chain…",
    endSub: "…to a benefit delivered exactly once.",
    endUrl: "github.com/flaviocgarcia78/AidBlink",
    endVoice: "AidBlink. Transparent funding, and aid delivered where it's needed.",
  },
  pt: {
    openKicker: "Solana Blinks · Devnet",
    openTitle: "AidBlink",
    openSub: "Ajuda emergencial em um único link",
    introVoice: "Toda doação deveria ser rastreável até virar ajuda real.",
    home1:
      "A ajuda emergencial muitas vezes se perde entre a doação e quem deveria recebê-la.",
    home2:
      "O AidBlink fecha esse ciclo: financiamento real on-chain e benefícios que não podem ser usados duas vezes.",
    contribute1: "Etapa 1 · Contribuir. A pessoa abre o Blink e conecta uma carteira.",
    contribute2: "Ela escolhe um valor — aqui, 0,1 SOL.",
    contribute3: "Conecte a Phantom. A carteira assina uma transação real na Devnet.",
    contribute5: "Aprovar. Uma transferência real on-chain, não uma simulação.",
    contribute6: "Confirmado on-chain. A contribuição já está no fundo de ajuda.",
    explorer2: "O explorer mostra a assinatura, o programa e a tesouraria.",
    blink2:
      "É um Blink padrão da Solana — um link de transação, renderizado no nosso próprio cliente.",
    login1: "Etapa 2 · Administrar. A organização entra para gerir o fundo.",
    login2: "Um portão de demonstração com usuários de exemplo.",
    admin1: "O painel lê o fundo de ajuda ao vivo do registro on-chain.",
    admin2: "Arrecadado, disponível, alocado e resgatado — ancorados na tesouraria.",
    admin3: "Registre um pedido pseudônimo — sem dados pessoais, só uma referência.",
    admin4: "Defina um valor pequeno e crie o pedido.",
    admin5: "Está pendente. Aprovar emite um voucher assinado.",
    admin6: "Aprovado — o voucher foi emitido.",
    voucher1: "Etapa 3 · Entregar. A pessoa recebe um link com QR.",
    voucher2: "O QR carrega um token assinado; o uso único é garantido no servidor.",
    partner1: "O terminal do parceiro é outro papel. Entre como parceiro.",
    redeem1: "O parceiro verifica o token assinado.",
    redeem2: "Resgatado — o voucher está gasto.",
    redeem3: "Agora tente o mesmo token outra vez.",
    redeem4: "Rejeitado. Um benefício só pode ser usado uma vez — e a tentativa fica registrada.",
    admin7: "De volta ao painel: o resgate e a tentativa bloqueada ficam registrados.",
    endKicker: "AidBlink · Solana Devnet",
    endTitle: "De uma contribuição on-chain…",
    endSub: "…a um benefício entregue exatamente uma vez.",
    endUrl: "github.com/flaviocgarcia78/AidBlink",
    endVoice: "AidBlink. Financiamento transparente e ajuda entregue onde é necessária.",
  },
};
const C = CAPTIONS[LANG];

/* ----------------------------- narration/SRT ---------------------------- */

const cues = [];
let t0 = Date.now();
let cueStart = null;
let cueText = "";
let cueVisible = true;
let cueAudioStart = 0;
let cueAudioDuration = 0;
/** text -> { pcm, buffer, duration }; filled before recording when TTS is on. */
let VOICE = new Map();

function startCue(text, visible = true) {
  const t = (Date.now() - t0) / 1000;
  if (cueStart !== null) {
    cues.push({ start: cueStart, end: t, text: cueText, visible: cueVisible });
  }
  cueStart = t;
  cueText = text;
  cueVisible = visible;
}
function endCue() {
  if (cueStart !== null) {
    cues.push({
      start: cueStart,
      end: (Date.now() - t0) / 1000,
      text: cueText,
      visible: cueVisible,
    });
    cueStart = null;
  }
}

/**
 * Start a new narration cue, first padding so the previous line finishes
 * playing. This sizes each caption window to the spoken narration, so the
 * audio and the visuals stay in sync without hand-tuning every pause.
 */
async function beginCue(page, text, visible = true) {
  // Several actions often share one caption (e.g. fill a field, then click).
  // Repeating the same line must not restart the cue nor replay the narration.
  if (cueStart !== null && text === cueText) return;
  const now = Date.now();
  if (cueStart !== null && cueAudioDuration > 0) {
    const until = cueAudioStart + cueAudioDuration * 1000 + 400;
    if (now < until) await page.waitForTimeout(until - now);
  }
  startCue(text, visible);
  cueAudioStart = Date.now();
  cueAudioDuration = VOICE.get(text)?.duration ?? 0;
}

/** Recording time needed to let a cue's spoken narration finish. */
function cueMillis(text, minMs) {
  const duration = VOICE.get(text)?.duration ?? 0;
  return Math.max(minMs, Math.round((duration + 0.8) * 1000));
}

/** Wait until the current cue's narration has finished (for the last cue). */
async function waitForCue(page) {
  if (cueStart === null || cueAudioDuration <= 0) return;
  const until = cueAudioStart + cueAudioDuration * 1000 + 300;
  const now = Date.now();
  if (now < until) await page.waitForTimeout(until - now);
}
function srtTime(sec) {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  const f = String(ms % 1000).padStart(3, "0");
  return `${h}:${m}:${s},${f}`;
}
function buildSrt() {
  return cues
    .filter((c) => c.visible && c.end - c.start > 0.05 && c.text.trim())
    .map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`)
    .join("\n");
}

/* ------------------------------- overlay -------------------------------- */

const OVERLAY_CSS = `
  #__ab_caption { position:fixed; left:0; right:0; bottom:0; z-index:2147483647;
    display:flex; align-items:flex-end; justify-content:center; padding:20px 96px 26px;
    background:linear-gradient(to top, rgba(2,6,23,.94), rgba(2,6,23,.6) 62%, transparent);
    transition:opacity .35s ease; pointer-events:none; }
  #__ab_caption > span { max-width:940px; text-align:center; color:#fff;
    font-family:Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-weight:500; font-size:22px; line-height:1.45; letter-spacing:.1px;
    text-shadow:0 2px 14px rgba(0,0,0,.75); }
  #__ab_badge { position:fixed; left:26px; top:84px; z-index:2147483646;
    padding:9px 15px; border-radius:999px; background:rgba(16,185,129,.96); color:#052e22;
    font-family:Inter, system-ui, sans-serif; font-weight:800; font-size:12px; line-height:1;
    letter-spacing:.14em; text-transform:uppercase; box-shadow:0 8px 22px rgba(2,6,23,.28);
    transition:opacity .35s ease; pointer-events:none; }
  #__ab_spot { position:fixed; z-index:2147483645; pointer-events:none;
    border:3px solid rgba(16,185,129,.98); border-radius:16px;
    box-shadow:0 0 0 5px rgba(16,185,129,.22), 0 0 34px rgba(16,185,129,.5);
    transition:opacity .35s ease; }
  #__ab_cursor { position:fixed; z-index:2147483647; pointer-events:none; left:0; top:0;
    transition:left .5s cubic-bezier(.2,.7,.2,1), top .5s cubic-bezier(.2,.7,.2,1); }
`;

async function inject(page) {
  await page
    .evaluate((css) => {
      if (document.getElementById("__ab_style")) return;
      const style = document.createElement("style");
      style.id = "__ab_style";
      style.textContent = css;
      document.head.appendChild(style);

      const cap = document.createElement("div");
      cap.id = "__ab_caption";
      cap.innerHTML = "<span></span>";
      document.body.appendChild(cap);

      const badge = document.createElement("div");
      badge.id = "__ab_badge";
      badge.textContent = "";
      document.body.appendChild(badge);

      const cursor = document.createElement("div");
      cursor.id = "__ab_cursor";
      cursor.innerHTML =
        '<svg width="28" height="28" viewBox="0 0 24 24" fill="#0f172a" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"><path d="M5 3l14 8-6 1.6L10 20z"/></svg>';
      document.body.appendChild(cursor);
    }, OVERLAY_CSS)
    .catch(() => undefined);
}

async function say(page, badge, text) {
  await beginCue(page, text, true);
  await page
    .evaluate(
      ({ badge, text }) => {
        const b = document.getElementById("__ab_badge");
        if (b) b.textContent = badge;
        const c = document.querySelector("#__ab_caption > span");
        if (c) c.textContent = text;
      },
      { badge, text },
    )
    .catch(() => undefined);
}

/** Narration without an on-screen caption (used for intro/outro title cards). */
async function voiceOnly(page, text) {
  await beginCue(page, text, false);
}

async function moveCursor(page, x, y) {
  await page
    .evaluate(
      ({ x, y }) => {
        const el = document.getElementById("__ab_cursor");
        if (el) {
          el.style.left = `${x - 2}px`;
          el.style.top = `${y - 2}px`;
        }
      },
      { x, y },
    )
    .catch(() => undefined);
  await page.waitForTimeout(Math.round(420 * SPEED));
}

async function spotlight(page, box) {
  await page
    .evaluate((b) => {
      let el = document.getElementById("__ab_spot");
      if (!el) {
        el = document.createElement("div");
        el.id = "__ab_spot";
        document.body.appendChild(el);
      }
      el.style.opacity = "1";
      el.style.left = `${b.x - 9}px`;
      el.style.top = `${b.y - 9}px`;
      el.style.width = `${b.width + 18}px`;
      el.style.height = `${b.height + 18}px`;
    }, box)
    .catch(() => undefined);
}
async function clearSpotlight(page) {
  await page
    .evaluate(() => {
      const el = document.getElementById("__ab_spot");
      if (el) el.style.opacity = "0";
    })
    .catch(() => undefined);
}

async function hold(page, seconds) {
  await page.waitForTimeout(Math.round(seconds * 1000 * SPEED));
}

/** Scroll a locator into view, spotlight it, move the cursor and click it. */
async function act(page, locator, { badge, text, click = true, seconds = 0.9 } = {}) {
  await locator.waitFor({ state: "visible", timeout: 20000 });
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(Math.round(250 * SPEED));
  if (text) await say(page, badge, text);
  const box = await locator.boundingBox();
  if (box) {
    await moveCursor(page, box.x + box.width / 2, box.y + box.height / 2);
    await spotlight(page, box);
  }
  await locator.hover().catch(() => undefined);
  await hold(page, seconds);
  if (click) await locator.click();
  await clearSpotlight(page);
  await page.waitForTimeout(Math.round(250 * SPEED));
}

async function titleCard(page, kicker, title, sub, url, ms = 3200) {
  await page
    .evaluate(
      ({ kicker, title, sub, url }) => {
        let el = document.getElementById("__ab_title");
        if (!el) {
          el = document.createElement("div");
          el.id = "__ab_title";
          document.body.appendChild(el);
        }
        el.style.cssText =
          "position:fixed; inset:0; z-index:2147483646; display:flex; flex-direction:column;" +
          "align-items:center; justify-content:center; text-align:center; padding:48px;" +
          "background:radial-gradient(1200px 620px at 50% 38%, #065f46, #020617 72%);" +
          "color:#fff; opacity:0; transition:opacity .55s ease;" +
          'font-family:Inter, system-ui, -apple-system, "Segoe UI", sans-serif;';
        el.innerHTML =
          `<p style="margin:0; font-size:15px; font-weight:800; letter-spacing:.3em; text-transform:uppercase; color:#6ee7b7;">${kicker}</p>` +
          `<h1 style="margin:20px 0 0; font-size:78px; font-weight:800; letter-spacing:-.025em;">${title}</h1>` +
          `<p style="margin:14px 0 0; font-size:25px; color:#cbd5e1;">${sub}</p>` +
          (url
            ? `<p style="margin:26px 0 0; font-size:17px; color:#94a3b8;">${url}</p>`
            : "");
      },
      { kicker, title, sub, url: url ?? "" },
    )
    .catch(() => undefined);
  await page.waitForTimeout(60);
  await page
    .evaluate(() => {
      const el = document.getElementById("__ab_title");
      if (el) el.style.opacity = "1";
    })
    .catch(() => undefined);
  await hold(page, ms / 1000);
  await page
    .evaluate(() => {
      const el = document.getElementById("__ab_title");
      if (el) el.style.opacity = "0";
    })
    .catch(() => undefined);
  await page.waitForTimeout(650);
  await page
    .evaluate(() => {
      const el = document.getElementById("__ab_title");
      if (el) el.remove();
    })
    .catch(() => undefined);
}

/* ------------------------------ navigation ------------------------------ */

async function go(page, url, marker) {
  await page.goto(url.startsWith("http") ? url : BASE + url, {
    waitUntil: "domcontentloaded",
  });
  await page.locator(marker).first().waitFor({ state: "visible", timeout: 25000 });
  await inject(page);
  await page.waitForTimeout(Math.round(700 * SPEED));
}

/* ------------------------------- API reset ------------------------------ */

async function resetDemo() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "org", user: ORG.user, password: ORG.password }),
  });
  if (!res.ok) throw new Error(`Login for reset failed: ${res.status}`);
  const cookies =
    typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const session = cookies
    .map((c) => c.split(";")[0])
    .find((c) => c.startsWith("aidblink_session="));
  if (!session) throw new Error("No session cookie returned");
  const reset = await fetch(`${BASE}/api/demo/reset`, {
    method: "POST",
    headers: { Cookie: session, "Content-Type": "application/json" },
    body: "{}",
  });
  if (!reset.ok) throw new Error(`Reset failed: ${reset.status}`);
  console.log("· demo state reset");
}

/* --------------------------------- main --------------------------------- */

mkdirSync(OUT, { recursive: true });
const RAW_DIR = path.join(OUT, ".raw");
rmSync(RAW_DIR, { recursive: true, force: true });
mkdirSync(RAW_DIR, { recursive: true });

if (RESET) await resetDemo();

/* --- Narration: synthesize every caption before recording, so the pacing can
       be derived from the spoken length of each line. --- */
const AUDIO_DIR = path.join(OUT, ".audio");
if (NARRATION) {
  const ff = await audio.loadFfmpegBin();
  if (ff && audio.ttsAvailable()) {
    const texts = [
      ...new Set(
        Object.values(C).filter((v) => typeof v === "string" && v.trim().length > 0),
      ),
    ];
    try {
      VOICE = audio.synthesize(
        texts.map((text) => ({ text })),
        { voice: VOICE_NAME, rate: TTS_RATE, dir: path.join(AUDIO_DIR, LANG) },
      );
      console.log(`· narration ready (${VOICE.size} lines, ${VOICE_NAME})`);
    } catch (error) {
      console.error("· narration setup failed; recording silent:", error?.message ?? error);
      VOICE = new Map();
    }
  } else {
    console.log(
      "· narration unavailable (needs ffmpeg-static + edge-tts); recording silent. " +
        "See scripts/demo-video.mjs for setup.",
    );
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  recordVideo: { dir: RAW_DIR, size: { width: WIDTH, height: HEIGHT } },
  deviceScaleFactor: 1,
});
await context.addInitScript(PHANTOM_INIT);
const page = await context.newPage();
await page.exposeFunction("__aidblinkConnect", () =>
  Array.from(donor.publicKey.toBytes()),
);
await page.exposeFunction("__aidblinkSignAndSend", signAndSend);
await page.exposeFunction("__aidblinkSign", signOnly);
await page.exposeFunction("__aidblinkSignMessage", () =>
  Buffer.alloc(64).toString("base64"),
);
const video = page.video();
t0 = Date.now();

try {
  await voiceOnly(page, C.introVoice);
  await titleCard(page, C.openKicker, C.openTitle, C.openSub, null, cueMillis(C.introVoice, 2200));

  /* --- Home --- */
  await go(page, "/", "text=Emergency aid in a");
  await say(page, "AidBlink", C.home1);
  await hold(page, 2.0);
  await say(page, "AidBlink", C.home2);
  await hold(page, 2.0);

  /* --- Contribute (real wallet: Phantom + on-chain donation) --- */
  await go(page, "/contribute", "text=Choose an amount");
  await say(page, "Step 1 · Contribute", C.contribute1);
  await hold(page, 1.8);
  const amountBtn = page.getByRole("button", { name: /0\.1 SOL/ }).first();
  await act(page, amountBtn, {
    badge: "Step 1 · Contribute",
    text: C.contribute2,
    seconds: 1.4,
  });

  // Connect the injected "Phantom" wallet.
  const walletBtn = page.locator("button.wallet-adapter-button").first();
  await act(page, walletBtn, {
    badge: "Step 1 · Contribute",
    text: C.contribute3,
    seconds: 1.6,
  });
  const phantomOption = page
    .locator(".wallet-adapter-modal-list .wallet-adapter-button")
    .filter({ hasText: "Phantom" })
    .first();
  await phantomOption.waitFor({ state: "visible", timeout: 15000 });
  await act(page, phantomOption, {
    badge: "Step 1 · Contribute",
    text: C.contribute3,
    seconds: 1.2,
  });

  // Real, signed Devnet contribution.
  const donateBtn = page
    .getByRole("button", { name: /Contribute 0\.1 SOL/ })
    .first();
  await donateBtn.waitFor({ state: "visible", timeout: 20000 });
  await inject(page);
  await hold(page, 1);
  await act(page, donateBtn, {
    badge: "Step 1 · Contribute",
    text: C.contribute5,
    seconds: 1.6,
  });
  const explorerLink = page
    .getByRole("link", { name: /View on Solana Explorer/ })
    .first();
  await explorerLink.waitFor({ state: "visible", timeout: 45000 });
  // Warm the on-chain balance cache now (post-donation) so the admin
  // dashboard reads the pool live without a slow cold RPC fetch.
  fetch(`${BASE}/api/balance`).catch(() => undefined);
  await say(page, "Step 1 · Contribute", C.contribute6);
  await hold(page, 2.2);

  /* --- Block explorer: the transaction is really on Devnet --- */
  const explorerHref =
    (await explorerLink.getAttribute("href")) ??
    `https://explorer.solana.com/tx/${lastDonationSignature}?cluster=devnet`;
  await act(page, explorerLink, {
    badge: "Proof · Devnet",
    click: false,
    seconds: 1.4,
  });
  await page.goto(explorerHref, { waitUntil: "domcontentloaded" });
  await inject(page);
  await page
    .locator("text=Transaction")
    .first()
    .waitFor({ state: "visible", timeout: 45000 })
    .catch(() => undefined);
  await say(page, "Proof · Devnet", C.explorer2);
  await hold(page, 2.6);
  await page.evaluate(() => window.scrollBy(0, 760));
  await hold(page, 2.2);

  // Back to the app (the built-in Blink client is showcased in the pitch).
  await go(page, "/contribute", "text=Choose an amount");

  /* --- Organization login --- */
  await act(page, page.getByRole("link", { name: "Sign in" }).first(), {
    badge: "Step 2 · Administer",
    text: C.login1,
    seconds: 1.2,
  });
  await page.locator('form input[autocomplete="username"]').waitFor();
  await say(page, "Step 2 · Administer", C.login2);
  await page.locator('form input[autocomplete="username"]').fill(ORG.user);
  await page.locator('form input[type="password"]').fill(ORG.password);
  await hold(page, 1.6);
  await act(page, page.locator('form button[type="submit"]'), {
    badge: "Step 2 · Administer",
    text: C.login2,
    seconds: 1.1,
  });
  await page
    .locator("text=Organization dashboard")
    .first()
    .waitFor({ timeout: 20000 });
  await inject(page);

  /* --- Administer --- */
  await say(page, "Step 2 · Administer", C.admin1);
  await hold(page, 1.6);
  const available = page.locator("text=Available").first();
  await act(page, available, { click: false, seconds: 1.2 });
  await hold(page, 0.6);

  const refInput = page.getByLabel("Beneficiary reference");
  await act(page, refInput, { text: C.admin3, click: false, seconds: 0.9 });
  await refInput.fill("BEN-2210");
  await hold(page, 0.7);
  await act(page, page.getByRole("button", { name: "Food assistance" }), {
    badge: "Step 2 · Administer",
    text: C.admin3,
    seconds: 0.8,
  });
  const amountInput = page.locator('input[type="number"]').first();
  await act(page, amountInput, {
    badge: "Step 2 · Administer",
    text: C.admin4,
    click: false,
    seconds: 0.9,
  });
  await amountInput.fill("5");
  await act(page, page.getByLabel("Note (optional)"), {
    badge: "Step 2 · Administer",
    text: C.admin4,
    click: false,
    seconds: 0.8,
  });
  await page.getByLabel("Note (optional)").fill("Meal basket");
  await hold(page, 1);
  await act(page, page.getByRole("button", { name: "Create request" }), {
    badge: "Step 2 · Administer",
    text: C.admin4,
    seconds: 0.9,
  });
  await page
    .getByText("Request created for BEN-2210.")
    .waitFor({ timeout: 15000 });
  await say(page, "Step 2 · Administer", C.admin5);
  await hold(page, 1.5);

  const newRow = page.locator("li").filter({ hasText: "BEN-2210" }).first();
  await act(page, newRow.getByRole("button", { name: "Approve" }), {
    badge: "Step 2 · Administer",
    text: C.admin5,
    seconds: 1.0,
  });
  await page
    .getByText(/Approved REQ-\d+\. Voucher VCH-\d+ issued\./)
    .waitFor({ timeout: 15000 });
  await say(page, "Step 2 · Administer", C.admin6);
  await hold(page, 1.5);

  const voucherLink = page
    .getByRole("link", { name: /Open voucher VCH-\d+/ })
    .first();
  await voucherLink.scrollIntoViewIfNeeded();
  await hold(page, 1.2);

  /* --- Voucher --- */
  await act(page, voucherLink, {
    badge: "Step 3 · Deliver",
    text: C.voucher1,
    seconds: 1.0,
  });
  await page.locator("text=Benefit voucher").first().waitFor({ timeout: 20000 });
  await inject(page);
  await say(page, "Step 3 · Deliver", C.voucher1);
  await hold(page, 2.2);
  const redeemHref = await page
    .getByRole("link", { name: "Open in partner simulator" })
    .getAttribute("href");
  await say(page, "Step 3 · Deliver", C.voucher2);
  await hold(page, 2.2);

  /* --- Partner login --- */
  await act(page, page.getByRole("button", { name: "Sign out" }), {
    badge: "Step 3 · Deliver",
    text: C.partner1,
    seconds: 0.9,
  });
  await page.locator("text=Emergency aid in a").first().waitFor({ timeout: 20000 });
  await inject(page);
  await go(page, "/login?next=/redeem&role=partner", "form");
  await say(page, "Step 3 · Deliver", C.partner1);
  await page.locator('form input[autocomplete="username"]').fill(PARTNER.user);
  await page.locator('form input[type="password"]').fill(PARTNER.password);
  await hold(page, 1.2);
  await act(page, page.locator('form button[type="submit"]'), {
    badge: "Step 3 · Deliver",
    text: C.partner1,
    seconds: 0.9,
  });
  await page.locator("text=Partner terminal").first().waitFor({ timeout: 20000 });
  await inject(page);

  /* --- Redeem twice --- */
  await go(page, redeemHref ?? "/redeem", "text=Verify a voucher");
  await say(page, "Step 3 · Deliver", C.redeem1);
  await hold(page, 1.4);
  const verifyBtn = page.getByRole("button", { name: "Verify & redeem" });
  await act(page, verifyBtn, {
    badge: "Step 3 · Deliver",
    text: C.redeem1,
    seconds: 1.0,
  });
  await page
    .getByText("Voucher redeemed successfully")
    .waitFor({ timeout: 15000 });
  await say(page, "Step 3 · Deliver", C.redeem2);
  await hold(page, 1.6);
  await act(page, verifyBtn, {
    badge: "Step 3 · Deliver",
    text: C.redeem3,
    seconds: 1.0,
  });
  await page
    .getByText(/already redeemed/i)
    .first()
    .waitFor({ timeout: 15000 });
  await say(page, "Step 3 · Deliver", C.redeem4);
  await hold(page, 2.2);

  await voiceOnly(page, C.endVoice);
  await titleCard(page, C.endKicker, C.endTitle, C.endSub, C.endUrl, cueMillis(C.endVoice, 2600));
  await waitForCue(page);
} catch (err) {
  console.error("· recording error:", err?.message ?? err);
  process.exitCode = 1;
} finally {
  endCue();
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

if (existsSync(webmOut)) {
  if (ffmpegPath) {
    execFileSync(
      ffmpegPath,
      [
        "-y",
        "-i",
        webmOut,
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "27",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        mp4Out,
      ],
      { stdio: "inherit" },
    );
    execFileSync(
      ffmpegPath,
      ["-y", "-ss", "3", "-i", mp4Out, "-frames:v", "1", "-q:v", "3", posterOut],
      { stdio: "inherit" },
    );
  }
  if (!KEEP_WEBM) rmSync(webmOut, { force: true });
}

/* --- Narration + background music (optional) --- */
if (VOICE.size > 0 && ffmpegPath && existsSync(mp4Out)) {
  try {
    const total = audio.probeDuration(mp4Out);
    mkdirSync(AUDIO_DIR, { recursive: true });
    const narration = audio.assembleNarration(
      cues,
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
    execFileSync(
      ffmpegPath,
      ["-y", "-ss", "3", "-i", mp4Out, "-frames:v", "1", "-q:v", "3", posterOut],
      { stdio: "inherit" },
    );
    console.log(`· narration + music mixed (${total.toFixed(1)}s)`);
  } catch (error) {
    console.error("· audio mix failed; keeping silent video:", error?.message ?? error);
  }
}

const srt = buildSrt();
if (srt) {
  writeFileSync(srtOut, srt, "utf8");
}

// Remove the raw recording directory if empty.
try {
  if (readdirSync(RAW_DIR).length === 0) rmSync(RAW_DIR, { recursive: true, force: true });
} catch {
  /* ignore */
}
if (!KEEP_AUDIO) rmSync(AUDIO_DIR, { recursive: true, force: true });

console.log("\nDone.");
console.log(`· video : ${path.relative(process.cwd(), mp4Out)}`);
console.log(`· captions: ${path.relative(process.cwd(), srtOut)} (${cues.length} cues)`);
if (ffmpegPath) console.log(`· poster : ${path.relative(process.cwd(), posterOut)}`);
if (VOICE.size > 0) console.log(`· narration: ${VOICE_NAME} + soft background music`);
