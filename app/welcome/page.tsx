import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { campIsEmpty } from "@/lib/auth/actions";
import { getSettings } from "@/lib/data/camp";
import { Wordmark } from "@/components/shmifting/Wordmark";
import { Countdown } from "@/components/shmifting/Countdown";
import { AuthForms } from "./AuthForms";
import { AmbientPoster } from "@/components/shmifting/AmbientPoster";
import { AmbientSound } from "@/components/shmifting/AmbientSound";
import { HERO } from "@/components/shmifting/assets";


/* ============================================================================
   WELCOME — the door into the camp.

   Design Book §29/§30: this is a poster that happens to contain a form, not a
   login page with a picture behind it. The illustration owns the left half of
   a wide screen and the whole background of a narrow one; the form sits on
   cream paper inside it.
   ========================================================================= */

export const metadata = {
  title: "SHMIFTING KITCHEN — כניסה",
};

export default async function WelcomePage() {
  const user = await currentUser();
  if (user) redirect(user.role === "admin" ? "/hq" : "/");

  const [camp, firstEver] = await Promise.all([getSettings(), campIsEmpty()]);

  return (
    <main className="relative flex min-h-dvh flex-col lg:flex-row">
      {/* ---- The world ---------------------------------------------------- */}
      <div className="relative flex min-h-[52vh] flex-1 items-center justify-center overflow-hidden lg:min-h-dvh">
        {/* The door is the first thing anybody sees, so the world is alive
            here too — same clip as the Home, and still just the still poster
            for anyone who asked for reduced motion. */}
        <AmbientPoster
          name="hero-home"
          image={HERO.home}
          priority
          sizes="(max-width: 1024px) 100vw, 55vw"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(115%_90%_at_50%_30%,rgba(18,19,26,0.22),rgba(18,19,26,0.88)_75%)]"
        />

        {/* Sound before you have an account: the camp should be playing when
            you walk in, not once you have filled in a form. There is no header
            out here to hang the control on, so it sits in the corner of the
            poster — still one button, still switchable off (§51). */}
        <div className="absolute start-4 top-4 z-10">
          <AmbientSound />
        </div>

        <div className="relative flex flex-col items-center gap-7 px-6 py-14 text-center">
          <Wordmark withTagline priority className="w-[min(78vw,460px)]" />

          <p className="max-w-sm text-balance text-sm leading-relaxed text-cream-2 sm:text-base">
            אנחנו מתכננים את המטבח של הקמפ ביחד — לפני שיוצאים לאבק.
            <br />
            כדי שבמדבר אף אחד לא יצטרך את זה.
          </p>

          <Countdown date={camp.departureDate} />
        </div>
      </div>

      {/* ---- The door ----------------------------------------------------- */}
      <div className="relative flex w-full items-center justify-center border-t-[3px] border-ink bg-charcoal-2 px-5 py-10 sm:px-8 lg:w-[440px] lg:border-s-[3px] lg:border-t-0 xl:w-[480px]">
        <div className="w-full max-w-sm">
          <h1 className="shm-poster mb-1.5 text-3xl text-cream">
            מי שם?
          </h1>
          <p className="mb-6 text-sm leading-relaxed text-cream-2/80">
            כדי שנדע מה לבשל, אנחנו צריכים לדעת מי אתם ומה אתם אוכלים.
          </p>

          <AuthForms firstEver={firstEver} />

          <p className="mt-7 border-t-2 border-charcoal-4 pt-5 text-center text-[13px] leading-relaxed text-cream-dim">
            המידע על האלרגיות והאוכל שלכם נשמר אצלנו בלבד,
            <br />
            ומשמש רק את מי שמבשל.ת עבורכם.
          </p>
        </div>
      </div>
    </main>
  );
}
