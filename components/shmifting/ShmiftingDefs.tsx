/* ============================================================================
   SHARED SVG DEFS
   Design Book §12: lines should "occasionally feel slightly irregular" and
   "reinforce the handmade feeling".

   These filters are applied to decorative stroke layers only — never to an
   element containing text, because displacing Hebrew glyphs makes them
   illegible (Design Book §61: art direction is not an excuse for poor
   accessibility).
   ========================================================================= */

export function ShmiftingDefs() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="absolute h-0 w-0 overflow-hidden"
    >
      <defs>
        {/* A gentle hand-drawn wobble for card and button outlines. */}
        <filter id="shm-wobble" x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.022"
            numOctaves="3"
            seed="7"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="4.5"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* Stronger, for purely decorative flourishes. */}
        <filter id="shm-wobble-strong" x="-12%" y="-12%" width="124%" height="124%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.014"
            numOctaves="2"
            seed="19"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="9"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* Riso ink tooth for illustrated fills. */}
        <filter id="shm-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="3"
            result="grain"
          />
          <feColorMatrix in="grain" type="saturate" values="0" result="mono" />
          <feBlend in="SourceGraphic" in2="mono" mode="multiply" />
        </filter>
      </defs>
    </svg>
  );
}
