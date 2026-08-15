"use client";

import { StickerButton } from "@/components/shmifting/StickerButton";
import { Glyph } from "@/components/shmifting/Glyph";

/* The product's final output is paper (Bible §33). The browser's own print
   engine handles it — a PDF library would be one more thing to break, and the
   print stylesheet in globals.css already does the design work. */

export function PrintButton() {
  return (
    <StickerButton
      type="button"
      accent="terracotta"
      size="md"
      tilt
      onClick={() => window.print()}
    >
      <Glyph name="print" strokeWidth={2.2} />
      להדפיס את החבילה
    </StickerButton>
  );
}
