import Image from "next/image";
import { requireUser } from "@/lib/auth/guard";
import { getUserWithProfile } from "@/lib/data/camp";
import { ProfileForm, type ProfileFormValues } from "./ProfileForm";
import { HERO } from "@/components/shmifting/assets";

export const metadata = { title: "הפרופיל שלי — SHMIFTING KITCHEN" };

/* ============================================================================
   FOOD PROFILE — Bible §10
   "Its emotional message is: We want you to eat well. Help us understand what
    that means for you."

   So the page opens with that sentence, in the world, before it asks for a
   single field.
   ========================================================================= */

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const user = await requireUser();
  const params = await searchParams;
  const isWelcome = params?.welcome === "1";

  const me = await getUserWithProfile(user.id);
  const isFirstTime = !me?.profile?.completedAt;

  const initial: ProfileFormValues = {
    name: user.name,
    dietaryPattern: me?.profile?.dietaryPattern ?? "omnivore",
    spiceLevel: me?.profile?.spiceLevel ?? 2,
    restrictions: me?.profile?.restrictions ?? [],
    dislikes: me?.profile?.dislikes ?? [],
    wish: me?.profile?.wish ?? "",
    allergies: (me?.allergies ?? []).map((a) => ({
      id: a.id,
      key: a.id,
      allergen: a.allergen,
      label: a.label ?? "",
      details: a.details ?? "",
      severity: a.severity,
      wasReviewed: Boolean(a.reviewedAt),
    })),
  };

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[24px_30px_22px_28px] border-[3px] border-ink shadow-[5px_6px_0_0_var(--color-ink)]">
        <Image
          src={HERO.profile}
          alt=""
          priority
          placeholder="blur"
          className="absolute inset-0 h-full w-full object-cover"
          sizes="(max-width: 1024px) 100vw, 1100px"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(115%_100%_at_75%_35%,rgba(18,19,26,0.35),rgba(18,19,26,0.9)_70%)]"
        />
        <div className="relative px-5 py-9 sm:px-9 sm:py-12">
          <p className="font-display text-xs tracking-[0.24em] text-sun">
            {isWelcome ? "ברוכים הבאים" : "הפרופיל שלכם"}
          </p>
          <h1 className="shm-poster mt-2 max-w-lg text-3xl leading-tight text-cream sm:text-4xl">
            אנחנו רוצים שתאכלו טוב.
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-cream-2 sm:text-base">
            תעזרו לנו להבין מה זה אומר בשבילכם. זה לוקח שתי דקות, ומשנה את מה
            שיהיה בצלחת שלכם במדבר.
          </p>
        </div>
      </section>

      <ProfileForm initial={initial} isFirstTime={isFirstTime} />
    </div>
  );
}
