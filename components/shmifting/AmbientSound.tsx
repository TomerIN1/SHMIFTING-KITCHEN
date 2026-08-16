"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
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
   · OFF LASTS THE VISIT. Switch the music off and it stays off for as long
     as that tab is open — nothing restarts it behind your back. Come back
     tomorrow and the camp is playing again, the way a room is. Making it
     permanent cost one member the entire soundtrack after a single curious
     tap, with no way to discover why.
   · NOT A MUSIC PLAYER. One button. No track names, no skip, no scrubber,
     no volume slider. You cannot tell from the interface how many tracks
     exist, which is the point.
   · NOTHING IS EVER GATED BEHIND IT. No task, state or warning is carried by
     sound. Turn it off and the product is unchanged.

   The preference lives in sessionStorage — a per-visit comfort setting, not
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

/* Silence lasts for the visit, not forever.

   It used to be localStorage, and that turned one curious tap into permanent
   silence on that device — the member never learns why the camp went quiet,
   and the music is the part of this product people remember. Ambient sound in
   a room does not work that way: you can ask for quiet, and the next time you
   walk in the room is playing again.

   §51 is still satisfied. The user controls sound, silence is always valid,
   and nothing is gated behind audio. What changed is how long "no" lasts. */
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

/* Where the camp does not play. Design Book §28: Kitchen HQ is an operational
   tool and the Lead may sit in it for an hour, so the music is held at the
   door rather than followed in.

   ── IF YOU ARE HERE TO GIVE HQ ITS MUSIC BACK, READ THIS FIRST ────────────
   This has been changed twice and the argument on each side is real, so it is
   one line on purpose. Emptying this array gives Kitchen HQ music again.

   The case for silence is §28: an hour of ambient loops while you are costing
   a menu is noise, not atmosphere.

   The case against is who actually lands here. The Kitchen Lead is redirected
   to /hq the moment they sign in, so with HQ silent the person who runs the
   camp may never hear the product's music at all — and with no control in the
   HQ header, has no way to ask for it. That is why session 2 put sound in HQ,
   and it is a fair point rather than an oversight. Session 3 chose silence
   again, with the product owner deciding explicitly.

   Whichever way this goes, change it here and nowhere else. */
const SILENT_AREAS = ["/hq"];

/* Any of these counts as the gesture a browser is waiting for.

   The list is deliberately wide and deliberately includes events that overlap.
   `pointerdown` is what fires first on a desktop click, but iOS Safari does
   NOT grant playback permission on a touch *start* — it wants `touchend` or
   the `click` that follows. A camp of people on phones is the main audience,
   so leaving those out meant the music could never begin on the device most
   members hold. Listening to all of them costs nothing: whichever arrives
   first starts the music, and the rest find it already playing. */
const GESTURES = [
  "pointerdown",
  "pointerup",
  "click",
  "keydown",
  "touchstart",
  "touchend",
] as const;

/* ── WHY THIS IS A PROVIDER AND NOT ONE SELF-CONTAINED COMPONENT ───────────
   The player used to be mounted three times — once in the welcome poster,
   once in the camp header, once in Kitchen HQ — which meant the <audio>
   element was destroyed and rebuilt on every crossing between them. Every
   rebuild needed a fresh play(), and a fresh play() is a fresh chance for the
   browser to refuse: a member who had music on the welcome screen could walk
   through the door and arrive in silence.

   So the sound now lives in the ROOT layout, above every route, and never
   unmounts for as long as the tab is open. Client navigation cannot interrupt
   it, there is nothing to resume because nothing stopped, and permission won
   once is permission kept.

   The button still has to appear inside each header, which is why the two are
   separate: `AmbientSoundProvider` owns the audio and the state, `SoundToggle`
   is the control and can be dropped wherever a header wants it. */
const SoundContext = createContext<{
  on: boolean;
  blocked: boolean;
  toggle: () => void;
} | null>(null);

export function AmbientSoundProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);

  /* Kitchen HQ is silent on purpose (Design Book §28): the Lead may sit in
     there for an hour costing a menu, and an hour of ambient music while you
     are concentrating is not atmosphere, it is noise.

     Silence here is a PAUSE, never an "off". The member never said they
     wanted quiet — they walked into a different room — so their preference is
     untouched and the camp is playing again the moment they walk back out,
     from exactly where it got to. */
  const pathname = usePathname();
  const silent = SILENT_AREAS.some((area) => pathname?.startsWith(area));

  const targetRef = useRef(0);
  const rateRef = useRef(LEVEL / FADE_IN_MS); /* volume units per millisecond */
  const pauseAtZeroRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const lastRef = useRef(0);

  const [on, setOn] = useState(false);
  const [index, setIndex] = useState(0);
  /* The browser refused, and the member has not said no. This is NOT the same
     as off, and used to look identical — a first-time visitor saw a dead grey
     button and concluded the music was broken, when one tap would have started
     it. The button now says so. */
  const [blocked, setBlocked] = useState(false);

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
     gesture, and treat one interaction on the page as consent for the rest of
     it.

     ── THE BUG THIS SHAPE EXISTS TO PREVENT ─────────────────────────────────
     This used to register with `{ once: true }` and bail out early on taps
     that landed on the sound control. Those two decisions are fine apart and
     fatal together: an ignored tap had ALREADY spent the one-shot listener, so
     the bridge went permanently dead without ever starting anything. The
     invitation banner made it near-certain — its container was full-bleed
     (`inset-x-0`), so every click in a 43px strip across the whole width of
     the screen counted as "a tap on our own controls" and quietly burned the
     listener. Measured in Chrome: click in that strip and the music could
     never start again, no matter where you clicked afterwards.

     So the listener now STAYS ARMED until playback actually succeeds. Being
     armed is free — an idle event listener costs nothing — while being
     disarmed one moment too early costs the member the entire soundtrack.
     Nothing here disarms on the way past; only `play()` resolving does, and a
     `play()` that rejects leaves it armed to try again on the next touch. */
  const armGesture = useCallback(() => {
    if (disarmRef.current) return;

    const fire = (event: Event) => {
      /* Taps on our own button belong to toggle(), which runs on click just
         after this. Starting the music here too would turn it on and then
         straight back off. Ignore it — but STAY ARMED, because this member
         has not heard anything yet. */
      const target = event.target as HTMLElement | null;
      if (target?.closest?.("[data-sound-control]")) return;
      if (!wantedRef.current) return;

      /* Already on? React bails on an unchanged value, so the play effect
         does not re-run and this costs nothing. */
      setOn(true);
    };

    /* Capture phase: a gesture is consent for the page whether or not the
       component that received it lets the event bubble. Anything that calls
       stopPropagation() — a menu, a form control, a card that swallows its
       own clicks — would otherwise hide the member's only qualifying
       interaction from us. */
    for (const type of GESTURES) {
      window.addEventListener(type, fire, { capture: true, passive: true });
    }
    disarmRef.current = () => {
      for (const type of GESTURES) {
        window.removeEventListener(type, fire, { capture: true });
      }
    };
  }, []);

  /* Decide what this visit should do, then try it. */
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem(STORAGE_KEY);
      /* Anyone who switched sound off while it was a permanent setting is
         still silenced on that device and has no way of knowing why. Clear
         the old key on sight so those devices recover by themselves. */
      localStorage.removeItem(STORAGE_KEY);
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

    /* Start fetching now, while the member is still reading the page, so the
       first gesture lands on a track that is ready to sound instead of one
       that still has to be downloaded. Only for members who want sound —
       somebody who switched it off should not pay for 2 MB they asked not to
       hear, least of all on desert mobile data. */
    if (wants && !silent && audioRef.current) {
      audioRef.current.preload = "auto";
    }

    if (wants) setOn(true);
    /* `silent` is read once, on mount, purely to decide whether to spend
       bandwidth. It is deliberately not a dependency: this effect establishes
       what the member wants and must run exactly once. Moving between the camp
       and HQ afterwards is handled by the playback effect below. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    /* Walked into Kitchen HQ. Fade the camp down and hold — do not touch the
       member's preference, do not rewind, do not reload. `on` stays true, so
       stepping back out re-runs this effect and the music picks up on the same
       bar it was on when the door closed. */
    if (silent) {
      targetRef.current = 0;
      rateRef.current = LEVEL / FADE_OUT_MS;
      pauseAtZeroRef.current = true;
      ensureLoop();
      return;
    }

    /* Coming back from HQ the element is paused mid-track with its buffer
       intact, and already at volume 0 from the fade-out — so this one line
       covers both cases: a new track lifts from silence, and a returning one
       lifts from the silence it was left in, on the bar it stopped at. */
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
        setBlocked(false);
        disarmGesture();
      })
      .catch(() => {
        /* Autoplay refused. No amount of code gets around that: browsers
           require a gesture before a page may make noise. Silence is what is
           actually happening, so the button must not claim otherwise — but it
           must also not look like the member switched it off, because the
           music arrives on its own the moment they touch anything.

           Stay armed. A refusal is not a verdict, it is "not yet": the member
           has not interacted with the page *yet*, and the next thing they do
           is the thing that starts the camp. Giving up here is what left the
           product silent for a whole visit. */
        setOn(false);
        if (wantedRef.current) {
          setBlocked(true);
          armGesture();
        }
      });
  }, [on, index, silent, ensureLoop, armGesture, disarmGesture]);

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
      setBlocked(false);
      disarmGesture();
      try {
        sessionStorage.setItem(STORAGE_KEY, "off");
      } catch {}
    } else {
      wantedRef.current = true;
      disarmGesture();
      setOn(true);
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  }

  return (
    <SoundContext.Provider value={{ on, blocked, toggle }}>
      {children}

      {/* THERE IS NO "TAP TO PLAY" INVITATION HERE, AND THERE MUST NOT BE ONE.

          One used to sit under the header: a banner reading "יש כאן מוזיקה —
          הקישו להפעלה". It was removed on the product owner's instruction in
          session 3, for two separate reasons, and both matter if anybody is
          ever tempted to bring it back.

          The product reason: asking somebody to press a button before the camp
          will play to them is a worse welcome than silence. The music is meant
          to arrive on its own, the way a room you walk into is already playing.
          A request for permission turns a gift into a chore.

          The engineering reason: it did not work. The banner was the single
          largest cause of permanent silence in the product — its full-bleed
          container swallowed the member's first click and killed the gesture
          bridge with it (see `armGesture`). The screen element asking people to
          tap was eating the taps.

          `SoundToggle` in the header is the whole interface. When the browser
          has not let the music start it breathes, which is an honest report of
          state and not an instruction. Members do not need one: the music
          starts by itself the moment they touch anything on the page. */}

      <audio
        ref={audioRef}
        src={TRACKS[index]}
        /* "auto", not "none". With "none" the file was not fetched until the
           member's first gesture, so the moment meant to welcome them was
           spent watching a download instead — measured at readyState 0 more
           than two seconds after playback was supposed to have begun. The
           track has to be ready and waiting before the gesture arrives, or the
           gesture buys silence.

           Set imperatively rather than declaratively so nothing is downloaded
           for a member who has switched sound off — see the mount effect. */
        preload="none"
        onEnded={handleEnded}
      />
    </SoundContext.Provider>
  );
}

/* ============================================================================
   THE CONTROL — one button, dropped into whichever header wants it.

   Deliberately absent from Kitchen HQ. HQ is silent by design (§28), so a
   sound button in there would be a switch that promises something the room
   does not do. The camp header and the welcome poster carry it; HQ carries
   nothing, and the music the Lead left playing is waiting for them when they
   walk back out.

   Renders nothing at all outside the provider rather than throwing, so a
   header can never take the whole page down over a music button.
   ========================================================================= */
export function SoundToggle() {
  const ctx = useContext(SoundContext);
  if (!ctx) return null;

  const { on, blocked, toggle } = ctx;

  const label = on
    ? "לכבות את המוזיקה"
    : blocked
      ? "יש מוזיקה — הקישו כדי להפעיל"
      : "להדליק מוזיקת רקע";

  return (
    <button
      type="button"
      data-sound-control
      onClick={toggle}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={[
        "no-print flex h-9 w-9 items-center justify-center rounded-[10px_8px_11px_9px]",
        "border-2 transition-colors",
        on
          ? "border-sun text-sun"
          : blocked
            ? /* Waiting for a tap, not switched off. Breathes so the eye
                 finds it, which is the whole point. */
              "animate-breathe border-sun/70 text-sun/90"
            : "border-charcoal-5 text-cream-dim hover:border-cream-dim hover:text-cream-2",
      ].join(" ")}
    >
      <Glyph name={on || blocked ? "sound" : "silence"} strokeWidth={2} />
    </button>
  );
}
