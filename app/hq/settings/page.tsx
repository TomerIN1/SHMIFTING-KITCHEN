import { getSettings, getPeople } from "@/lib/data/camp";
import { currentUser } from "@/lib/auth/session";
import { HqHeading } from "@/components/hq/primitives";
import { Panel } from "@/components/shmifting/surfaces";
import { CampSettingsForm, RoleToggle } from "./SettingsForm";
import { Glyph } from "@/components/shmifting/Glyph";

export const metadata = { title: "הגדרות — Kitchen HQ" };

/* ============================================================================
   CAMP SETTINGS — Bible §38, §50

   "Deadlines should be configurable where appropriate rather than scattered
    through the product as fixed assumptions."

   Everything the product treats as a deadline or a rule lives here: the
   countdown, the festival window, the shift quota, when shift selection
   opens, and who holds the keys.
   ========================================================================= */

const iso = (d: Date | null | undefined) =>
  d ? d.toISOString().slice(0, 10) : "";

export default async function SettingsPage() {
  const [camp, people, me] = await Promise.all([
    getSettings(),
    getPeople(),
    currentUser(),
  ]);

  const locked = Boolean(camp.lockedAt);
  const admins = people.filter((p) => p.role === "admin");

  return (
    <div className="space-y-6">
      <HqHeading
        title="הגדרות המטבח"
        lead="התאריכים, המכסות והכללים שכל שאר המוצר נשען עליהם."
      />

      {locked && (
        <p className="flex items-center gap-2 rounded-md border-2 border-good/50 border-s-[6px] border-s-good bg-good/[0.07] p-3 text-[13px] text-cream-2">
          <Glyph name="lock" className="text-good" strokeWidth={2.4} />
          המטבח נעול, אז ההגדרות נעולות איתו. אפשר לפתוח אותו בעמוד המוכנות.
        </p>
      )}

      <Panel title="הקמפ" accent="lavender">
        <div className="p-4">
          <CampSettingsForm
            camp={{
              campName: camp.campName,
              inviteCode: camp.inviteCode,
              departureDate: iso(camp.departureDate),
              festivalStart: iso(camp.festivalStart),
              festivalEnd: iso(camp.festivalEnd),
              shiftsPerPerson: camp.shiftsPerPerson,
              shiftsOpenAt: iso(camp.shiftsOpenAt),
            }}
            locked={locked}
          />
        </div>
      </Panel>

      <Panel
        title="מי מנהל את המטבח"
        accent="sun"
        action={
          <span className="text-[12.5px] text-cream-dim">
            {admins.length} {admins.length === 1 ? "מנהל.ת" : "מנהלים"}
          </span>
        }
      >
        <div className="space-y-3 p-4">
          <p className="max-w-2xl text-[13px] leading-relaxed text-cream-2/80">
            מנהל.ת מטבח רואה את המידע התזונתי והרפואי של כל הקמפ, כי אי אפשר
            לבשל בבטחה בלעדיו. שמיפטרים רגילים רואים רק את עצמם ואת התפריט.
            תנו את ההרשאה הזו רק למי שבאמת מתכנן.ת את האוכל.
          </p>

          <ul className="divide-y divide-charcoal-4">
            {people.map((person) => (
              <li
                key={person.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <span className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-lavender font-display text-[13px] text-ink"
                  >
                    {person.name.trim().charAt(0)}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-cream">
                      {person.name}
                    </span>
                    <span className="block text-[12px] text-cream-dim" dir="ltr">
                      {person.email}
                    </span>
                  </span>
                </span>

                {!locked && (
                  <RoleToggle
                    userId={person.id}
                    name={person.name}
                    role={person.role}
                    isSelf={person.id === me?.id}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      <Panel title="פרטיות" accent="dust-blue">
        <div className="space-y-2 p-4 text-[13px] leading-relaxed text-cream-2/85">
          <p>
            פרופילי האוכל מכילים מידע אישי ורפואי. המוצר בנוי כך שהוא נגלה רק
            איפה שהוא באמת נחוץ:
          </p>
          <ul className="space-y-1 ps-4">
            <li>· שמיפטר.ית רואה רק את הפרופיל של עצמו.ה.</li>
            <li>
              · בתפריט החשוף, כל אחד רואה אזהרה אישית רק על האלרגיות של עצמו.
            </li>
            <li>· ברשימת המשמרות מופיעים שמות בלבד — בלי שום מידע תזונתי.</li>
            <li>
              · המידע המלא מופיע רק כאן ב-Kitchen HQ, ובחבילת המטבח המודפסת.
            </li>
          </ul>
        </div>
      </Panel>
    </div>
  );
}
