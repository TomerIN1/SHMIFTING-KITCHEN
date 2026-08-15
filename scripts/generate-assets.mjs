#!/usr/bin/env node
/* ============================================================================
   SHMIFTING ASSET GENERATOR

   Design Book §55/§56 and CLAUDE.md §9 are the reason this file exists:
   missing artwork must never be replaced with emojis, icon packs or CSS
   drawings. It must be *made*, inside the established visual language.

   §55 is explicit that a request must never be a bare prompt like
   "psychedelic tomato" — every generation carries the full Shmifting visual
   context below, derived from the Design Book and measured off
   /design_book/golden_reference/02.png.

   The API key is read from the environment and is never printed, logged or
   inspected (CLAUDE.md §0.3).

     node scripts/generate-assets.mjs            # generate anything missing
     node scripts/generate-assets.mjs --only=hero-home,flame-lit
     node scripts/generate-assets.mjs --force    # regenerate everything
     node scripts/generate-assets.mjs --list
   ========================================================================= */

import "dotenv/config";
import { writeFile, mkdir, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "assets");

/* ---------------------------------------------------------------------------
   THE SHMIFTING VISUAL CONTRACT
   Every prompt is prefixed with this. It is the Design Book, compressed.
   ------------------------------------------------------------------------ */

const STYLE = `
STYLE — this is a fixed, established illustration style. Follow it exactly.

Flat 2D screen-printed poster illustration in the style of a 1970s psychedelic
risograph print. Bold confident near-black outlines (colour #0B0C10) around
every shape, line weight slightly irregular and hand-drawn, never a perfect
mathematical vector. Flat fills only. Visible halftone dot texture and paper
grain inside the fills, like real riso ink slightly misregistered.

STRICT COLOUR PALETTE — use only these, no others:
  coral pink   #E8788E
  deep pink    #C7566F
  lavender     #A76DB4
  deep purple  #7E4F8C
  sun gold     #F6A83C
  peach orange #F58A46
  terracotta   #E4703F
  dusty blue   #748F9E
  sage green   #86B083
  warm cream   #F4E6C8
  outline ink  #0B0C10

MOOD: desert surrealism. Warm, weird, communal, handmade, slightly irreverent,
adult. Ordinary objects quietly behave strangely — a single calm open eye
inside an object, a hand emerging where a hand should not be, steam becoming
stars, a vegetable with legs. Surreal but never disturbing, never chaotic.

HARD RULES — these are absolute:
- NO gradients, NO glow, NO neon, NO glassmorphism, NO metallic, NO 3D render,
  NO photorealism, NO drop shadows, NO lens flare, NO bevels.
- NO cute preschool cartoon proportions. This is adult poster art, not a
  children's book. Weird, not childish.
- NO text, NO letters, NO words, NO numbers, NO signatures anywhere.
- NO generic Burning Man clichés: no goggles, no dreamcatchers, no mandalas,
  no tribal patterns, no rainbow gradients.
- Every element must sit inside the palette above.
`.trim();

const ON_CHARCOAL = `
BACKGROUND: deep charcoal #12131A, filling the whole frame edge to edge.
Not black, not grey — the same charcoal throughout. Composition is dense and
poster-like, with objects layered and overlapping, and small discoveries
tucked into the corners.
`.trim();

const TRANSPARENT = `
BACKGROUND: fully transparent. A single isolated object, centred, occupying
roughly 75% of the frame with generous empty transparent margin on all four
sides — the object must not touch or bleed off any edge. No background
scenery, no ground shadow, no frame, no card, no container, no backing shape
of any kind. Just the object, cut out.
`.trim();

/* ---------------------------------------------------------------------------
   THE ASSET LIST
   Each entry documents what CLAUDE.md §10 asks for: name, purpose, subject,
   composition, ratio, background.
   ------------------------------------------------------------------------ */

const ASSETS = [
  /* --- World heroes (Design Book §25 World Density) --------------------- */
  {
    name: "hero-home",
    purpose: "Shmifter Home hero — the first thing a camp member ever sees",
    size: "1536x1024",
    background: "opaque",
    prompt: `A wide desert-night poster scene. At the centre, two large open
hands reach toward each other from left and right — one lavender purple, one
peach orange — and between their fingertips floats a small glass vial with a
cork stopper, filled with desert dust, with a tiny heart inside it. Below the
hands sits a big black cooking pot, and rising out of the pot is an entire
miniature desert camp: little tents, a bonfire, tiny seated silhouettes of
friends eating together, distant layered mountains. Steam curls up from the pot
and turns into stars. A round sun with one calm open eye watches from the upper
area. Scattered around the edges: desert plants, a cactus with a single eye, a
few floating kitchen utensils, small sparkles and dots. Dense, layered,
poster-like composition with objects overlapping.`,
  },
  {
    name: "hero-vote",
    purpose: "Voting screen hero — THE GREAT MENU VOTE",
    size: "1536x1024",
    background: "opaque",
    prompt: `A wide poster scene about giving fire to food. In the centre a
large black cooking pot sits over dancing flames in coral pink, sun gold and
peach. Three separate stylised flames float in the air above the pot, evenly
spaced, each one a distinct rounded flame shape with a bold outline, and each
flame has a single tiny open eye inside it. Reaching in from the lower left and
lower right, two illustrated hands offer flames upward, as if making a gift of
them. Around the pot float three different plates of food seen from above, each
plate a slightly different colour from the palette. Small vegetables with faces
and legs peek from behind the pot. Steam becomes stars overhead.`,
  },
  {
    name: "hero-menu",
    purpose: "Final Menu reveal — festival lineup feeling, Bible §16",
    size: "1536x1024",
    background: "opaque",
    prompt: `A wide celebratory desert-night poster. A very long communal table
runs across the frame in exaggerated perspective, absolutely loaded with
serving bowls, big platters, bread, fruit, steaming pots and jugs. Illustrated
people of many shapes sit along both sides of the table, leaning toward each
other, passing dishes hand to hand, laughing. Above the table hangs a string of
small round lights. Behind them, layered desert mountains and a huge crescent
moon with a calm face holding a steaming cup. Stars and sparkles scattered
across the sky. Generous, abundant, communal — a feast, not a restaurant.`,
  },
  {
    name: "hero-profile",
    purpose: "Food profile — 'we want you to eat well', Bible §10",
    size: "1536x1024",
    background: "opaque",
    prompt: `A warm poster scene about being fed with care. In the centre, two
cupped hands hold up a single plate toward the viewer, offering it. On the
plate sits a small surreal arrangement of food that has quiet personality — a
tomato with one open eye, a sprig of herb, a piece of bread. Around the plate,
floating in a loose circle, are separate small food objects: a chilli pepper
with legs, a bulb of garlic with an eye, a lemon, a carrot, a jug. To one side
stands a single illustrated person in a wide-brimmed hat, one hand raised in a
small friendly wave. Desert plants and a few stars fill the corners.`,
  },
  {
    name: "hero-shifts",
    purpose: "Shifts — the desert clock, Design Book §39",
    size: "1536x1024",
    background: "opaque",
    prompt: `A wide poster scene about sharing kitchen work across a day. The
composition reads left to right as a day cycle: on one side a rising sun with a
calm open eye and a slightly sweating face, in the middle a high bright sun, on
the other side a crescent moon with a sleepy face holding a steaming cup.
Beneath them, a row of illustrated people work together at a long field-kitchen
counter — one stirring an enormous pot, one chopping vegetables, one carrying a
stack of bowls, one handing a utensil to the next person. They physically pass
objects between each other. Steam rises and becomes stars. Desert plants and
scattered sparkles fill the edges.`,
  },
  {
    name: "hero-locked",
    purpose: "THE KITCHEN IS LOCKED — the final calm, Design Book §71",
    size: "1536x1024",
    background: "opaque",
    prompt: `A wide, calm, quiet desert-night poster. A single large cooking pot
sits closed in the centre with its lid on, resting, no flames beneath it — the
fire has gone out and only soft embers remain. The pot has one closed, peaceful
sleeping eye on its lid. Around it, kitchen tools lie neatly arranged and
still. Behind, a huge full moon and a wide field of stars over layered desert
mountains. Two small figures sit close together on the ground in the distance,
looking out at the horizon. Everything is settled and complete. Much emptier
and quieter than a busy scene — lots of calm negative space.`,
  },
  {
    name: "hero-empty",
    purpose: "Shared empty state — 'nothing here yet', Bible §39",
    size: "1024x1024",
    background: "opaque",
    prompt: `A square poster scene of patient waiting. A single empty cooking
pot sits in the middle of an open desert, lid tilted slightly ajar, with one
large calm open eye looking directly at the viewer from inside the pot's
opening. Nothing is cooking. A couple of desert plants lean in from the sides,
and one small round creature with legs waits beside the pot, also looking at
the viewer. A few stars overhead. Sparse, patient, gently funny — mostly empty
space with the pot small and alone in the middle.`,
  },

  /* --- Objects (Design Book §54 asset families) ------------------------- */
  {
    name: "flame-lit",
    purpose: "Voting token, given state — Bible §13, Design Book §38",
    size: "1024x1024",
    background: "transparent",
    prompt: `A single stylised flame, seen straight on, filling most of the
frame. Rounded organic teardrop flame silhouette with a bold hand-drawn
near-black outline. Flat layered fills: a deep coral pink outer layer, a peach
orange middle layer, and a sun gold core. One single small calm open eye sits
in the middle of the gold core, looking straight ahead. Tiny sparks float just
off the tip of the flame. Confident, warm, alive.`,
  },
  {
    name: "flame-unlit",
    purpose: "Voting token, still available to give",
    size: "1024x1024",
    background: "transparent",
    prompt: `A single stylised flame, seen straight on, filling most of the
frame — exactly the same rounded teardrop silhouette and the same bold
hand-drawn near-black outline as a lit flame, but dormant. Flat fill in a
single muted dusty blue #748F9E only, with no inner layers and no gold. One
single small closed sleeping eye, drawn as a simple curved line, sits in the
middle. No sparks. Quiet and waiting.`,
  },
  {
    name: "memory-vial",
    purpose: "The Memory Vial — Design Book §18",
    size: "1024x1024",
    background: "transparent",
    prompt: `A single small glass vial with a round cork stopper, standing
upright, filled most of the way with fine desert dust in warm cream and peach
tones. A tiny coral pink heart floats inside the dust. A thin string is tied
around the neck of the vial with a small charm hanging from it. Bold hand-drawn
near-black outline, flat fills, a couple of simple straight highlight lines on
the glass. A few tiny sparkles float around it.`,
  },
  {
    name: "pot",
    purpose: "The Pot — central kitchen symbol, Design Book §20",
    size: "1024x1024",
    background: "transparent",
    prompt: `A large round black cooking pot with two side handles, seen from
the front. Curls of steam rise from the open top, and the topmost curls turn
into small stars. One single calm open eye sits on the front belly of the pot,
looking straight ahead. Small flames in coral pink and sun gold lick around the
base. Bold hand-drawn near-black outline, flat fills, riso grain texture.`,
  },
  {
    name: "sun-morning",
    purpose: "Breakfast marker — Design Book §22",
    size: "1024x1024",
    background: "transparent",
    prompt: `A round sun in sun gold with irregular hand-drawn rays of uneven
length radiating around it. The sun has a simple calm face: two open eyes and a
small curved mouth, plus one tiny bead of sweat at the temple, as if it has
just woken up and is already too warm. Bold hand-drawn near-black outline, flat
fill, halftone dot texture inside the disc.`,
  },
  {
    name: "sun-high",
    purpose: "Lunch marker",
    size: "1024x1024",
    background: "transparent",
    prompt: `A round sun at full midday strength in sun gold and peach orange,
with long irregular hand-drawn rays radiating in every direction, some rays
wavy. The sun has a determined face with two open eyes and a flat straight
mouth, plus two beads of sweat. Bold hand-drawn near-black outline, flat fills,
halftone dot texture.`,
  },
  {
    name: "moon-evening",
    purpose: "Dinner marker — 'a tired moon holding coffee', Design Book §22",
    size: "1024x1024",
    background: "transparent",
    prompt: `A crescent moon in lavender purple with a calm sleepy face in
profile — one half-closed eye and a small content mouth. The crescent has a
small hand emerging from its inner curve, holding a steaming cup. Two or three
small stars float nearby. Bold hand-drawn near-black outline, flat fill,
halftone dot texture.`,
  },
  {
    name: "hand-giving",
    purpose: "Primary action motif — Design Book §17",
    size: "1024x1024",
    background: "transparent",
    prompt: `A single open human hand in lavender purple, palm facing up and
open, fingers slightly spread, reaching up and forward as if offering
something. The wrist is at the bottom edge of the frame. One small calm open
eye sits in the centre of the palm. Small sparkles float just above the
fingertips. Bold hand-drawn near-black outline, flat fill, halftone dot
texture. Elegant and elongated, not cartoonish.`,
  },
  {
    name: "signpost",
    purpose: "Navigation motif — the wooden signpost from Golden Reference 02",
    size: "1024x1536",
    background: "transparent",
    prompt: `A tall weathered wooden signpost standing alone, seen straight on.
A single vertical wooden post with visible hand-drawn wood grain. No signs,
arrows or boards attached to it — just the bare post, with a couple of small
nail holes and a small desert plant growing at its base. Bold hand-drawn
near-black outline, flat fills in warm terracotta and cream tones, halftone dot
texture.`,
  },
  {
    name: "veg-tomato",
    purpose: "Ingredient character — shopping & recipes, Design Book §45",
    size: "1024x1024",
    background: "transparent",
    prompt: `A single round tomato in coral pink with a small sage green stem,
standing on two thin bare legs with simple shoes, mid-stride as if walking
somewhere with purpose. One single calm open eye in the middle of the fruit.
Bold hand-drawn near-black outline, flat fill, halftone dot texture.`,
  },
  {
    name: "veg-garlic",
    purpose: "Ingredient character",
    size: "1024x1024",
    background: "transparent",
    prompt: `A single bulb of garlic in warm cream with visible hand-drawn
segment lines and a papery top, standing on two thin bare legs with simple
shoes. One single large calm open eye in the centre of the bulb, looking
straight ahead. Bold hand-drawn near-black outline, flat fill, halftone dot
texture.`,
  },
  {
    name: "veg-chili",
    purpose: "Spice level marker — food profile",
    size: "1024x1024",
    background: "transparent",
    prompt: `A single long curved chilli pepper in deep coral pink with a sage
green stem, standing upright on two thin legs, with two thin arms — one arm
raised in a confident wave. It has a small mischievous face with two open eyes
and a wide grin. Bold hand-drawn near-black outline, flat fill, halftone dot
texture.`,
  },
  {
    name: "shopping-bag",
    purpose: "Shopping section motif — Design Book §45",
    size: "1024x1024",
    background: "transparent",
    prompt: `A large paper shopping bag in warm cream, slightly lopsided and
overstuffed, with vegetables escaping over its rim — a carrot, a leafy green, a
lemon and a tomato with one open eye, all tumbling out at different angles as
if trying to get away. The bag itself has two small legs at the bottom. Bold
hand-drawn near-black outline, flat fills, halftone dot texture.`,
  },
  {
    name: "eye-mark",
    purpose: "The recurring Shmifting eye — dividers and small accents, §19",
    size: "1024x1024",
    background: "transparent",
    prompt: `A single stylised open eye, seen straight on, filling the frame. An
almond-shaped outline with a hand-drawn irregular edge, a lavender purple iris,
a near-black pupil, and short irregular lashes radiating outward like tiny rays.
Three small sparkles float around it. Bold hand-drawn near-black outline, flat
fills, halftone dot texture. Calm and watchful, not scary.`,
  },
];

/* ------------------------------------------------------------------------ */

const argv = process.argv.slice(2);
const force = argv.includes("--force");
const onlyArg = argv.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.slice(7).split(",").map((s) => s.trim()) : null;

if (argv.includes("--list")) {
  for (const a of ASSETS) {
    console.log(`${a.name.padEnd(18)} ${a.size.padEnd(10)} ${a.background.padEnd(12)} ${a.purpose}`);
  }
  process.exit(0);
}

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) {
  console.error(
    "OPENAI_API_KEY is not set. It lives in .env — this script reads it from\n" +
    "the environment and never inspects the file (CLAUDE.md §0.3).",
  );
  process.exit(1);
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function generate(asset) {
  const body = {
    model: "gpt-image-1",
    prompt: [
      STYLE,
      asset.background === "transparent" ? TRANSPARENT : ON_CHARCOAL,
      `SUBJECT:\n${asset.prompt.replace(/\s+/g, " ").trim()}`,
    ].join("\n\n"),
    size: asset.size,
    quality: "high",
    output_format: "png",
    n: 1,
  };
  if (asset.background === "transparent") body.background = "transparent";

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    /* Print the API's message, never the request headers. */
    const text = await res.text();
    throw new Error(`${res.status} ${text.slice(0, 400)}`);
  }

  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error("no image data in response");
  return Buffer.from(b64, "base64");
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const queue = ASSETS.filter((a) => !only || only.includes(a.name));
  let made = 0;
  let skipped = 0;
  const failed = [];

  console.log(`SHMIFTING assets → public/assets (${queue.length} candidates)\n`);

  for (const asset of queue) {
    const file = join(OUT, `${asset.name}.png`);
    if (!force && (await exists(file))) {
      skipped++;
      console.log(`· ${asset.name} — already exists, skipping`);
      continue;
    }

    process.stdout.write(`⟳ ${asset.name} … `);
    const started = Date.now();
    try {
      const buffer = await generate(asset);
      await writeFile(file, buffer);
      made++;
      console.log(
        `done (${(buffer.length / 1024).toFixed(0)} kB, ${((Date.now() - started) / 1000).toFixed(0)}s)`,
      );
    } catch (error) {
      failed.push(asset.name);
      console.log(`FAILED — ${error.message}`);
    }
  }

  console.log(`\ngenerated ${made} · skipped ${skipped} · failed ${failed.length}`);
  if (failed.length) {
    console.log(`retry with: node scripts/generate-assets.mjs --only=${failed.join(",")}`);
    process.exitCode = 1;
  }
}

main();
