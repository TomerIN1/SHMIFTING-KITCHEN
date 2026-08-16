import type { Metadata, Viewport } from "next";
import { Heebo, Suez_One } from "next/font/google";
import "./globals.css";
import { ShmiftingDefs } from "@/components/shmifting/ShmiftingDefs";
import { AmbientSoundProvider } from "@/components/shmifting/AmbientSound";

/* Design Book §32: "A beautiful Latin typeface that produces poor Hebrew is
   unacceptable." Both faces below were designed with Hebrew, not extended to
   it — Heebo carries every form, table and number, Suez One carries the
   poster voice. */
const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "700", "800", "900"],
  display: "swap",
});

const suez = Suez_One({
  variable: "--font-suez",
  subsets: ["hebrew", "latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SHMIFTING KITCHEN",
  description:
    "מטבח קמפ שמיפטינג. מתכננים ביחד לפני שיוצאים לאבק — כדי שבמדבר אף אחד לא יצטרך טלפון.",
  applicationName: "SHMIFTING KITCHEN",
};

export const viewport: Viewport = {
  themeColor: "#12131A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${heebo.variable} ${suez.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ShmiftingDefs />
        {/* The music lives here, above every route, so that moving between the
            door, the camp and Kitchen HQ never unmounts it. A player that
            unmounts has to ask the browser for permission again on the other
            side, and the browser is entitled to say no — which is how a member
            used to lose the soundtrack simply by signing in. */}
        <AmbientSoundProvider>{children}</AmbientSoundProvider>
      </body>
    </html>
  );
}
