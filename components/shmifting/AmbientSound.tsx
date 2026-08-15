"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Glyph } from "./Glyph";

/* ============================================================================
   AMBIENT SOUND — Design Book §51.

     "Sound is atmospheric, not mandatory… no aggressive autoplay; user
      controls sound; silence is always valid; functional tasks must not
      require sound. Avoid turning the product into a music player."

   Every one of those lines is a constraint this component obeys literally:

   · ON BY DEFAULT. **This is a deliberate override of §51's "no aggressive
     autoplay", made by the product owner in session 2, not an oversight.**
     The camp wanted members to walk into music. Do not quietly revert it to
     silent-by-default because the Design Book says so — raise it with a human
     first. Everything else in §51 is still obeyed to the letter.
   · OFF STAYS OFF, FOREVER. The default only applies when the member has
     never expressed a preference. Once somebody turns the music off, that is
     stored and honoured on every later visit, and nothing here will start
     sound again behind their back. An unset key means "not asked yet";
     "off" means "asked, and no".
   · NOT A MUSIC PLAYER. One button. No track names, no skip, no scrubber,
     no volume slider. You cannot tell from the interface how many tracks
     exist, which is the point.
   · NOTHING IS EVER GATED BEHIND IT. No task, state or warning is carried by
     sound. Turn it off and the product is unchanged.

   The preference lives in localStorage — a per-device comfort setting, not
   camp data, so it does not belong in the database.

   The tracks come from mixkit.co, which gives music away for free. They are
   committed to the repository, so nothing here depends on a live key or an
   outside service. Mixkit does not require a credit; we give one anyway, on
   the Home page, because a camp that is built on other people's generosity
   should say so out loud.

   ── ONE CLIP AT A TIME, IN ORDER ─────────────────────────────────────────
   Each track plays all the way to its own ending before the next one is
   loaded. Nothing overlaps, nothing is cross-faded over a tail, and no clip
   is cut short to make room for the one behind it — these pieces are written
   to resolve, and talking over that ending is what makes background music
   sound like a playlist instead of a room.

   So the only fade is on the way in: a new track lifts from silence over a
   couple of seconds, which keeps the join from landing as an event. §48 asks
   for "life, not distraction", and that applies to the ears as much as the
   eyes.

   ── HOW THE VOLUME IS DRIVEN ─────────────────────────────────────────────
   One self-correcting loop, not a series of one-shot fades. `targetRef` is
   where the volume should be — LEVEL while sound is on, 0 while it is off —
   and the loop walks the element toward it and then stops itself.

   This shape was chosen after the obvious one failed in the browser. Fading
   in from `play().then(…)` left the second track playing at volume 0 with
   the button lit: audible silence, the worst outcome available. Here the
   target only ever depends on whether sound is on, so no sequence of events
   can strand the volume — a wrong value is corrected on the next tick.

   The loop is a timer and not `requestAnimationFrame`, which matters more
   than it looks. Animation frames stop in a hidden tab, and a hidden tab is
   the normal home of background music: a member reads something else while
   the camp plays behind them. On rAF, a track that ended in another tab
   would come back silent. Timers keep firing when hidden — throttled to
   about a second, which is why `dt` is clamped to a full second rather than
   a frame, so a throttled tick still advances a real slice of the fade.
   ========================================================================= */

const TRACKS = [
  "/audio/shmift-01.m4a",
  "/audio/shmift-02.m4a",
  "/audio/shmift-03.m4a",
];

/* Background level. Deliberately low: this sits under a room, a conversation
   and somebody reading an allergy warning. */
const LEVEL = 0.34;

/* Long enough to feel like weather rather than a fade. */
const FADE_IN_MS = 2600;
const FADE_OUT_MS = 1100;

const STORAGE_KEY = "shmifting:sound";

/* Where the music had got to, so crossing between the camp and Kitchen HQ
   picks the track up instead of restarting it. Those are separate layouts, so
   the player genuinely unmounts on the way through — without this you would
   hear the same opening bars every time you used the door. sessionStorage,
   not local: resuming mid-track a day later would be strange. */
const POSITION_KEY = "shmifting:sound:at";

/* Long enough to cover a navigation, short enough that a tab left open over
   lunch starts fresh rather than resuming from a track it half-remembers. */
const RESUME_WINDOW_MS = 90_000;

/* What happens when a member has never said either way. */
const DEFAULT_ON = true;

/* Any of these counts as the gesture a browser is waiting for. */
const GESTURES = ["pointerdown", "keydown", "touchstart"] as const;

export function AmbientSound() {
  const audioRef = useRef<HTMLAudioElement>(null);

  const targetRef = useRef(0);
  const rateRef = useRef(LEVEL / FADE_IN_MS); /* volume units per millisecond */
  const pauseAtZeroRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const lastRef = useRef(0);

  const [on, setOn] = useState(false);
  const [index, setIndex] = useState(0);

  /* Always clears the handle as well as the timer. Leaving a stale handle
     behind is not a tidiness point: `ensureLoop` treats a non-null handle as
     "already running" and would refuse to start again for the rest of the
     page's life, which is exactly how the music once ended up playing at
     volume zero. */
  const stopLoop = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const ensureLoop = useCallback(() => {
    if (timerRef.current !== null) return;
    lastRef.current = performance.now();

    timerRef.current = window.setInterval(() => {
      const el = audioRef.current;
      if (!el) {
        stopLoop();
        return;
      }

      const now = performance.now();
      /* Clamped so a tab that was hidden for a minute does not jump, while
         still letting a throttled ~1s tick carry a real slice of the fade. */
      const dt = Math.min(1000, now - lastRef.current);
      lastRef.current = now;

      const target = targetRef.current;
      const step = rateRef.current * dt;
      const from = el.volume;
      const next =
        from < target
          ? Math.min(target, from + step)
          : Math.max(target, from - step);

      el.volume = next;

      if (next === target) {
        if (target === 0 && pauseAtZeroRef.current) {
          pauseAtZeroRef.current = false;
          el.pause();
        }
        /* Arrived. Idle until something moves the target. */
        stopLoop();
      }
    }, 40);
  }, [stopLoop]);

  /* Whether this member wants sound at all, as opposed to whether it happens
     to be playing right now. A blocked autoplay makes those two disagree. */
  const wantedRef = useRef(false);
  const disarmRef = useRef<(() => void) | null>(null);
  /* Seconds to seek to on the next successful play, set when resuming. */
  const resumeAtRef = useRef<number | null>(null);

  const disarmGesture = useCallback(() => {
    disarmRef.current?.();
    disarmRef.current = null;
  }, []);

  /* Wait for the member's first interaction anywhere, then start. This is the
     only way audible playback can begin on a first visit — browsers require a
     gesture, and treat one click on the page as consent for the whole page.
     It fires once and then unhooks itself. */
  const armGesture = useCallback(() => {
    if (disarmRef.current) return;

    const fire = () => {
      disarmGesture();
      if (wantedRef.current) setOn(true);
    };

    for (const type of GESTURES) {
      window.addEventListener(type, fire, { once: true, passive: true });
    }
    disarmRef.current = () => {
      for (const type of GESTURES) window.removeEventListener(type, fire);
    };
  }, [disarmGesture]);

  /* Decide what this visit should do, then try it. */
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      /* Private browsing can throw on access. Fall through to the default. */
    }

    /* Only an explicit "off" opts out. Anything unset means never asked. */
    const wants = stored === null ? DEFAULT_ON : stored === "on";
    wantedRef.current = wants;

    /* Pick the track back up where the last page left it. */
    try {
      const saved = sessionStorage.getItem(POSITION_KEY);
      if (saved) {
        const { i, t, at } = JSON.parse(saved) as {
          i: number;
          t: number;
          at: number;
        };
        if (Date.now() - at < RESUME_WINDOW_MS && i >= 0 && i < TRACKS.length) {
          resumeAtRef.current = t;
          setIndex(i);
        }
      }
    } catch {
      /* Unparseable or unavailable — start from the top, no harm done. */
    }

    if (wants) setOn(true);
  }, []);

  /* Remember the position on the way out. Client-side navigation unmounts us
     without a page unload, so the cleanup is the only hook that fires. */
  useEffect(() => {
    const remember = () => {
      const el = audioRef.current;
      if (!el || !wantedRef.current) return;
      try {
        sessionStorage.setItem(
          POSITION_KEY,
          JSON.stringify({ i: index, t: el.currentTime, at: Date.now() }),
        );
      } catch {}
    };

    window.addEventListener("pagehide", remember);
    return () => {
      remember();
      window.removeEventListener("pagehide", remember);
    };
  }, [index]);

  /* Runs when sound is switched on, and again on every track change: start
     the new track from silence and let the loop lift it. The ramp is armed
     before play() resolves on purpose — it must not depend on media events
     firing in any particular order. */
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !on) return;

    el.volume = 0;
    targetRef.current = LEVEL;
    rateRef.current = LEVEL / FADE_IN_MS;
    pauseAtZeroRef.current = false;
    ensureLoop();

    /* Resume mid-track after a navigation. Guarded, because seeking before
       metadata exists throws and a stale position could sit past the end. */
    const resumeAt = resumeAtRef.current;
    resumeAtRef.current = null;
    if (resumeAt !== null && resumeAt > 0) {
      const seek = () => {
        if (Number.isFinite(el.duration) && resumeAt < el.duration - 1) {
          el.currentTime = resumeAt;
        }
      };
      if (el.readyState >= 1) seek();
      else el.addEventListener("loadedmetadata", seek, { once: true });
    }

    /* Armed BEFORE the attempt, not after it fails. play() can take a moment
       to reject, and a visitor who clicks into the email field in that window
       would otherwise have their one qualifying gesture land on nothing and
       sit in silence. */
    if (wantedRef.current) armGesture();

    void el
      .play()
      .then(() => {
        /* Playing without needing them — nothing left to wait for. */
        disarmGesture();
      })
      .catch(() => {
        /* Autoplay refused. No amount of code gets around that: browsers
           require a gesture before a page may make noise. Show the button as
           off, because silence is what is actually happening, and let the
           armed listener start us on their first touch. */
        setOn(false);
      });
  }, [on, index, ensureLoop, armGesture, disarmGesture]);

  useEffect(() => {
    return () => {
      stopLoop();
      disarmGesture();
    };
  }, [stopLoop, disarmGesture]);

  /* The clip reached its own ending. Only now does the next one load. */
  function handleEnded() {
    setIndex((i) => (i + 1) % TRACKS.length);
  }

  function toggle() {
    if (on) {
      /* The one place a track is faded down mid-play: the member asked for
         silence, and a hard cut would be startling. */
      targetRef.current = 0;
      rateRef.current = LEVEL / FADE_OUT_MS;
      pauseAtZeroRef.current = true;
      ensureLoop();
      setOn(false);
      /* Say it and mean it: cancel the pending gesture too, or their very
         next click would turn the music straight back on. */
      wantedRef.current = false;
      disarmGesture();
      try {
        localStorage.setItem(STORAGE_KEY, "off");
      } catch {}
    } else {
      wantedRef.current = true;
      disarmGesture();
      setOn(true);
      try {
        localStorage.setItem(STORAGE_KEY, "on");
      } catch {}
    }
  }

  const label = on ? "לכבות את המוזיקה" : "להדליק מוזיקת רקע";

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        aria-label={label}
        title={label}
        className={[
          "no-print flex h-9 w-9 items-center justify-center rounded-[10px_8px_11px_9px]",
          "border-2 transition-colors",
          on
            ? "border-sun text-sun"
            : "border-charcoal-5 text-cream-dim hover:border-cream-dim hover:text-cream-2",
        ].join(" ")}
      >
        <Glyph name={on ? "sound" : "silence"} strokeWidth={2} />
      </button>

      <audio
        ref={audioRef}
        src={TRACKS[index]}
        preload="none"
        onEnded={handleEnded}
      />
    </>
  );
}
