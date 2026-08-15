#!/usr/bin/env node
/* ============================================================================
   SHMIFTING ASSET ANIMATOR

   CLAUDE.md §0.3 draws a hard line: OpenAI generates, FAL animates.
   This script never creates artwork. It takes an asset that already exists in
   public/assets and gives it the ambient life the Design Book asks for:

     §48 "The world should feel alive even when nobody is touching it.
          Motion should generally be subtle, slow, ambient, organic,
          occasional. The goal: life, not distraction."

   So every prompt below describes drifting, flickering and breathing — never
   a camera move, never a new object, never a story. The source frame must
   still be recognisably the same picture.

   The API key is read from the environment and never printed (CLAUDE.md §0.3).

     node scripts/animate-assets.mjs
     node scripts/animate-assets.mjs --only=hero-home
     node scripts/animate-assets.mjs --list
   ========================================================================= */

import "dotenv/config";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = join(ROOT, "public", "assets");
const OUT = join(ROOT, "public", "motion");

/* Seedance 1.0 Pro, top quality. Two of its native parameters do work the
   Design Book would otherwise ask a prompt to beg for:

     camera_fixed    §48 wants ambient motion, never camera work. This pins
                     the camera outright instead of hoping the model listens.
     end_image_url   the clip is told to END on the frame it STARTED on, so
                     the last frame meets the first and the loop closes with
                     no visible seam. Ambient motion that jumps every five
                     seconds is a distraction, which is the one thing §48
                     forbids.

   The Pro endpoint is required for the loop: on the Lite endpoint
   `end_image_url` is deprecated and ignored. */
const MODEL = "fal-ai/bytedance/seedance/v1/pro/image-to-video";
const RESOLUTION = "1080p";

/* Shared constraint. Repeated in every prompt because these models drift
   toward cinematic camera work if you let them. */
const MOTION_RULES = `
The camera does NOT move: no pan, no zoom, no dolly, no parallax, no rack
focus. The composition, the colours and the flat screen-printed illustration
style stay exactly as they are in the source frame. Nothing new enters the
frame. Nothing leaves. No morphing, no shape changes, no text.
Only very slow, gentle, ambient motion within the existing artwork.
The motion is a loop: the final frame must match the opening frame exactly,
so the clip can repeat forever without a visible cut.
`.trim();

const CLIPS = [
  {
    name: "hero-home",
    source: "hero-home.webp",
    purpose: "Shmifter Home — the world breathing behind the countdown",
    duration: "5",
    prompt: `Subtle ambient life inside a flat illustrated poster. The steam
rising from the pot drifts and curls upward very slowly. The small flames of
the campfire flicker gently. The stars and small dots twinkle softly, fading in
and out. The eye in the sun blinks once, slowly. Everything else is completely
still — the hands do not move, the vial does not move, the tents do not move.`,
  },
  {
    name: "hero-locked",
    source: "hero-locked.webp",
    purpose: "THE KITCHEN IS LOCKED — the final calm (Design Book §71)",
    duration: "5",
    prompt: `Deep quiet in a flat illustrated night scene. The stars twinkle
very slowly. A last thin wisp of smoke drifts upward from the cooled embers
beneath the pot. The moon glows almost imperceptibly brighter and dimmer, like
a slow breath. Nothing else moves at all. The mood is settled, finished and
peaceful.`,
  },
  {
    name: "flame-lit",
    source: "flame-lit.webp",
    purpose: "Voting token — a flame that behaves like a flame",
    duration: "5",
    prompt: `A single flat illustrated flame flickering gently in place on a
plain background. The flame's outline wavers softly and organically, the way a
candle moves in still air. The small eye inside it blinks once, slowly. The
tiny sparks near the tip drift upward and fade. The flame stays centred and
keeps its shape and its layered colours.`,
  },
];

/* ------------------------------------------------------------------------ */

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.slice(7).split(",").map((s) => s.trim()) : null;
const force = argv.includes("--force");

if (argv.includes("--list")) {
  for (const c of CLIPS) {
    console.log(`${c.name.padEnd(14)} ← ${c.source.padEnd(20)} ${c.purpose}`);
  }
  process.exit(0);
}

const KEY = process.env.FAL_KEY;
if (!KEY) {
  console.error(
    "FAL_KEY is not set. It lives in .env — this script reads it from the\n" +
      "environment and never inspects the file (CLAUDE.md §0.3).",
  );
  process.exit(1);
}

const headers = {
  Authorization: `Key ${KEY}`,
  "Content-Type": "application/json",
};

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function submit(clip) {
  const buffer = await readFile(join(ASSETS, clip.source));
  const dataUri = `data:image/webp;base64,${buffer.toString("base64")}`;

  const res = await fetch(`https://queue.fal.run/${MODEL}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      image_url: dataUri,
      /* Start and end on the same frame — this is what makes it loop. */
      end_image_url: dataUri,
      prompt: `${clip.prompt.replace(/\s+/g, " ").trim()}\n\n${MOTION_RULES}`,
      duration: clip.duration,
      resolution: RESOLUTION,
      camera_fixed: true,
      aspect_ratio: "auto",
    }),
  });

  if (!res.ok) {
    throw new Error(`submit ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return res.json();
}

async function waitFor(statusUrl, responseUrl, label) {
  const deadline = Date.now() + 12 * 60 * 1000;
  let last = "";

  while (Date.now() < deadline) {
    const res = await fetch(statusUrl, { headers });
    if (!res.ok) {
      throw new Error(`status ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const json = await res.json();

    if (json.status !== last) {
      process.stdout.write(` ${json.status.toLowerCase()}…`);
      last = json.status;
    }

    if (json.status === "COMPLETED") {
      const out = await fetch(responseUrl, { headers });
      if (!out.ok) {
        throw new Error(`result ${out.status}`);
      }
      return out.json();
    }

    if (json.status === "FAILED") {
      throw new Error(`generation failed: ${JSON.stringify(json).slice(0, 300)}`);
    }

    await sleep(5000);
  }

  throw new Error(`timed out waiting for ${label}`);
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const queue = CLIPS.filter((c) => !only || only.includes(c.name));
  let made = 0;
  const failed = [];

  console.log(`SHMIFTING motion → public/motion (${queue.length} clips)\n`);

  for (const clip of queue) {
    const target = join(OUT, `${clip.name}.mp4`);

    if (!force && (await exists(target))) {
      console.log(`· ${clip.name} — already animated, skipping`);
      continue;
    }
    if (!(await exists(join(ASSETS, clip.source)))) {
      console.log(`· ${clip.name} — source ${clip.source} missing, skipping`);
      failed.push(clip.name);
      continue;
    }

    process.stdout.write(`⟳ ${clip.name}`);
    const started = Date.now();

    try {
      const queued = await submit(clip);
      const statusUrl =
        queued.status_url ??
        `https://queue.fal.run/${MODEL}/requests/${queued.request_id}/status`;
      const responseUrl =
        queued.response_url ??
        `https://queue.fal.run/${MODEL}/requests/${queued.request_id}`;

      const result = await waitFor(statusUrl, responseUrl, clip.name);
      const url = result?.video?.url ?? result?.output?.video?.url;
      if (!url) throw new Error("no video url in response");

      const video = await fetch(url);
      const buffer = Buffer.from(await video.arrayBuffer());
      await writeFile(target, buffer);
      made++;

      console.log(
        ` done (${(buffer.length / 1e6).toFixed(1)} MB, ${((Date.now() - started) / 1000).toFixed(0)}s)`,
      );
    } catch (error) {
      failed.push(clip.name);
      console.log(` FAILED — ${error.message}`);
    }
  }

  console.log(`\nanimated ${made} · failed ${failed.length}`);
  if (failed.length) {
    console.log(`retry: node scripts/animate-assets.mjs --only=${failed.join(",")}`);
    process.exitCode = 1;
  }
}

main();
