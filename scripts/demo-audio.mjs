// AidBlink — demo audio pipeline.
//
// Turns the recorded, silent screencast into a narrated video:
//   1. synthesize each caption with edge-tts (free neural voices, no API key)
//   2. lay the narration out on the exact caption timeline
//   3. generate a soft, royalty-free ambient bed with ffmpeg
//   4. mix narration + music and mux them onto the MP4
//
// edge-tts is optional. Install it on demand and point TTS_PYTHONPATH at it:
//   pip install --target .tts edge-tts
//   TTS_PYTHONPATH=.tts npm run demo:video

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_RATE = 24000; // mono s16le, matches edge-tts output
const BYTES_PER_SAMPLE = 2;

/* ------------------------------- ffmpeg -------------------------------- */

let ffmpegPath = null;

export async function loadFfmpegBin() {
  if (ffmpegPath) return ffmpegPath;
  if (process.env.FFMPEG) {
    ffmpegPath = process.env.FFMPEG;
    return ffmpegPath;
  }
  try {
    const mod = await import("ffmpeg-static");
    ffmpegPath = mod.default;
  } catch {
    ffmpegPath = null;
  }
  return ffmpegPath;
}

function run(args) {
  try {
    return execFileSync(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
  } catch (error) {
    const stderr = String(error.stderr ?? "").trim().split("\n").slice(-6).join("\n");
    throw new Error(`ffmpeg failed (${error.status}):\n${stderr}`);
  }
}

/** Duration in seconds of a media file, parsed from ffmpeg's banner. */
export function probeDuration(file) {
  let stderr = "";
  try {
    execFileSync(ffmpegPath, ["-hide_banner", "-i", file], {
      stdio: ["ignore", "ignore", "pipe"],
    });
  } catch (error) {
    stderr = String(error.stderr ?? "");
  }
  const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  if (!match) return 0;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

/* --------------------------------- TTS --------------------------------- */

/** Locate the project's edge-tts helper script. */
export function ttsScript() {
  return path.join(__dirname, "edge-tts.py");
}

export function ttsAvailable(python = process.env.TTS_PYTHON ?? "python3") {
  try {
    execFileSync(python, ["-c", "import edge_tts"], {
      stdio: "ignore",
      env: { ...process.env, PYTHONPATH: pythonPath() },
    });
    return true;
  } catch {
    return false;
  }
}

function pythonPath() {
  const extra = process.env.TTS_PYTHONPATH ?? "";
  const current = process.env.PYTHONPATH ?? "";
  return [extra, current].filter(Boolean).join(path.delimiter);
}

/**
 * Synthesize a list of unique {text, file} entries in one Python process.
 * Returns a map text -> { pcm, buffer, duration }.
 */
export function synthesize(
  entries,
  { voice, rate = "+0%", dir, python = process.env.TTS_PYTHON ?? "python3" },
) {
  mkdirSync(dir, { recursive: true });
  const manifest = entries.map((entry, index) => ({
    text: cleanText(entry.text),
    voice,
    out: path.join(dir, `v${String(index).padStart(3, "0")}.mp3`),
  }));
  const manifestPath = path.join(dir, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  console.log(`· synthesizing ${manifest.length} narration clips (${voice})…`);
  execFileSync(python, [ttsScript(), manifestPath, rate], {
    stdio: "inherit",
    env: { ...process.env, PYTHONPATH: pythonPath() },
  });

  const result = new Map();
  manifest.forEach((entry, index) => {
    const pcm = path.join(dir, `v${String(index).padStart(3, "0")}.pcm`);
    run(["-y", "-i", entry.out, "-f", "s16le", "-ac", "1", "-ar", String(SAMPLE_RATE), pcm]);
    const buffer = readFileSync(pcm);
    result.set(entries[index].text, {
      pcm,
      buffer,
      duration: buffer.length / (SAMPLE_RATE * BYTES_PER_SAMPLE),
      words: readWords(`${entry.out}.words.json`),
    });
  });
  return result;
}

/** Per-word boundaries emitted by edge-tts (seconds, relative to the clip). */
function readWords(file) {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Split a narration into short, readable phrases and time each one.
 *
 * When edge-tts word boundaries are available (and their count matches the
 * narration tokens) the phrases inherit the exact per-word timings, so the
 * captions advance in sync with the voice. Otherwise the phrases are spread
 * proportionally over the clip duration as a best-effort fallback.
 */
export function buildPhrases(text, words, duration, maxWords = 7) {
  const raw = String(text ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (raw.length === 0) return [];

  const enders = /[.!?]$/;
  const soft = /[,;:—–]$/;
  const groups = [];
  let current = [];
  for (let i = 0; i < raw.length; i += 1) {
    const token = raw[i];
    current.push(token);
    const count = current.length;
    if (enders.test(token) || (soft.test(token) && count >= 3)) {
      groups.push(current);
      current = [];
      continue;
    }
    if (count >= maxWords) {
      const next = raw[i + 1];
      // Hold one extra token when it closes the sentence, so we never orphan
      // "mile." or "help." at the end of a phrase.
      if (next && enders.test(next)) continue;
      // Prefer breaking after the last soft stop (comma/colon) inside the group.
      let cut = -1;
      for (let j = current.length - 1; j >= 1; j -= 1) {
        if (soft.test(current[j])) {
          cut = j;
          break;
        }
      }
      if (cut >= 1) {
        groups.push(current.slice(0, cut + 1));
        current = current.slice(cut + 1);
      } else {
        groups.push(current);
        current = [];
      }
    }
  }
  if (current.length) groups.push(current);

  const aligned = Array.isArray(words) && words.length === raw.length;
  let cursor = 0;
  const phrases = groups.map((group) => {
    const first = cursor;
    const last = cursor + group.length - 1;
    cursor += group.length;
    const phrase = { text: group.join(" "), start: 0, end: 0 };
    if (aligned) {
      phrase.start = words[first].s;
      phrase.end = words[last].s + words[last].d;
    }
    return phrase;
  });
  if (aligned) return phrases;

  const total = phrases.reduce((n, p) => n + p.text.length, 0) || 1;
  let at = 0;
  for (const phrase of phrases) {
    const span = (phrase.text.length / total) * duration;
    phrase.start = at;
    phrase.end = at + span;
    at += span;
  }
  return phrases;
}

/** edge-tts reads punctuation; normalize a few symbols for a natural read. */
function cleanText(text) {
  return text
    .replace(/\s*·\s*/g, ", ")
    .replace(/\s*—\s*/g, ", ")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/* --------------------------- narration layout -------------------------- */

/**
 * Assemble a single PCM track placing each cue's narration at its start time.
 * `totalSeconds` defines the track length (normally the video duration).
 */
export function assembleNarration(cues, voiceMap, totalSeconds, outPcm) {
  const totalSamples = Math.ceil(totalSeconds * SAMPLE_RATE);
  const track = Buffer.alloc(totalSamples * BYTES_PER_SAMPLE);
  for (const cue of cues) {
    const voice = voiceMap.get(cue.text);
    if (!voice) continue;
    const offset = Math.round(cue.start * SAMPLE_RATE) * BYTES_PER_SAMPLE;
    if (offset >= track.length) continue;
    const length = Math.min(voice.buffer.length, track.length - offset);
    voice.buffer.copy(track, offset, 0, length);
  }
  writeFileSync(outPcm, track);
  return { pcm: outPcm, duration: totalSamples / SAMPLE_RATE };
}

/* --------------------------------- music ------------------------------- */

/**
 * A soft, royalty-free ambient bed generated with ffmpeg: a slow four-note
 * arpeggio (A minor) over a gently drifting pad. No external asset, no license.
 */
export function makeMusic(durationSeconds, outPcm) {
  const note =
    "if(lt(mod(floor(t/3),4),1),220,if(lt(mod(floor(t/3),4),2),261.63,if(lt(mod(floor(t/3),4),3),329.63,440)))";
  const expr = [
    `0.42*exp(-3*mod(t,3))*sin(2*PI*(${note})*t)`,
    "0.16*sin(2*PI*110*t)*(0.7+0.3*sin(2*PI*0.050*t))",
    "0.12*sin(2*PI*164.81*t)*(0.7+0.3*sin(2*PI*0.037*t))",
    "0.10*sin(2*PI*220*t)*(0.7+0.3*sin(2*PI*0.061*t))",
  ].join("+");
  run([
    "-y",
    "-f",
    "lavfi",
    "-i",
    `aevalsrc='${expr}':s=${SAMPLE_RATE}:d=${durationSeconds.toFixed(3)}`,
    "-af",
    "lowpass=f=3000,aecho=0.8:0.7:80|160:0.25|0.15,volume=0.8",
    "-f",
    "s16le",
    "-ac",
    "1",
    "-ar",
    String(SAMPLE_RATE),
    outPcm,
  ]);
  return outPcm;
}

/* --------------------------------- mix --------------------------------- */

/**
 * Mix narration (foreground) with the music bed (quiet, faded) and mux the
 * result onto the silent MP4.
 */
export function mixAndMux({ video, narration, music, out, musicVolume = 0.5, duration }) {
  const fadeOut = Math.max(0, duration - 5);
  const filter = [
    "[1:a]loudnorm=I=-16:TP=-1.5:LRA=11[nar]",
    `[2:a]volume=${musicVolume},afade=t=in:st=0:d=3,afade=t=out:st=${fadeOut.toFixed(2)}:d=5[mus]`,
    "[nar][mus]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]",
  ].join(";");
  run([
    "-y",
    "-i",
    video,
    "-f",
    "s16le",
    "-ar",
    String(SAMPLE_RATE),
    "-ac",
    "1",
    "-i",
    narration,
    "-f",
    "s16le",
    "-ar",
    String(SAMPLE_RATE),
    "-ac",
    "1",
    "-i",
    music,
    "-filter_complex",
    filter,
    "-map",
    "0:v",
    "-map",
    "[a]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    out,
  ]);
  return out;
}

export const audioConfig = {
  sampleRate: SAMPLE_RATE,
  defaultVoiceEn: process.env.TTS_VOICE_EN ?? "en-US-AndrewMultilingualNeural",
  defaultVoicePt: process.env.TTS_VOICE_PT ?? "pt-BR-ThalitaMultilingualNeural",
  home: os.homedir(),
};
