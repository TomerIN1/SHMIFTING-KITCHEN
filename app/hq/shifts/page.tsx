import { getShifts, getShiftStats } from "@/lib/data/shifts";
import { getPeople, getSettings } from "@/lib/data/camp";
import { groupByDay } from "@/lib/data/menu";
import { HqHeading, Metric, Table, Th, Td, Tr } from "@/components/hq/primitives";
import { Panel } from "@/components/shmifting/surfaces";
import { Capacity } from "@/components/shmifting/Status";
import {
  ShiftCard,
  AddShiftForm,
  GenerateShiftsForm,
  type ShiftView,
} from "./ShiftAdmin";
import { shiftTypeLabel, SHIFT_TYPES } from "@/lib/domain/categories";
import { hebrewDay, hebrewDate, shortDate, cn } from "@/lib/utils";

export const metadata = { title: "משמרות — Kitchen HQ" };

/* ============================================================================
   SHIFT ADMINISTRATION — Bible §22, §23

   §23 asks for exactly one thing: "immediate visibility into staffing gaps."
   So the page opens with the grid the Bible sketches — meals down the side,
   days across — and only then offers the per-shift detail underneath.
   ========================================================================= */

export default async function HqShiftsPage() {
  const [shifts, stats, people, camp] = await Promise.all([
    getShifts(),
    getShiftStats(),
    getPeople(),
    getSettings(),
  ]);

  const locked = Boolean(camp.lockedAt);
  const days = groupByDay(shifts);
  const defaultDate = (camp.festivalStart ?? new Date())
    .toISOString()
    .slice(0, 10);

  /* The Bible's grid: one row per shift type, one column per day. */
  const typesPresent = (
    Object.keys(SHIFT_TYPES) as (keyof typeof SHIFT_TYPES)[]
  ).filter((type) => shifts.some((s) => s.mealType === type));

  const shiftCountByUser = new Map<string, number>();
  for (const shift of shifts) {
    for (const a of shift.assignments) {
      shiftCountByUser.set(a.userId, (shiftCountByUser.get(a.userId) ?? 0) + 1);
    }
  }
  const belowQuota = people
    .map((p) => ({ ...p, taken: shiftCountByUser.get(p.id) ?? 0 }))
    .filter((p) => p.taken < camp.shiftsPerPerson)
    .sort((a, b) => a.taken - b.taken);

  const views: ShiftView[] = shifts.map((s) => ({
    id: s.id,
    date: s.date.toISOString().slice(0, 10),
    mealType: s.mealType,
    label: s.label,
    startTime: s.startTime,
    endTime: s.endTime,
    requiredPeople: s.requiredPeople,
    notes: s.notes,
    filled: s.filled,
    missing: s.missing,
    assignments: s.assignments.map((a) => ({
      id: a.id,
      userId: a.userId,
      name: a.user.name,
      source: a.source,
    })),
  }));

  const viewById = new Map(views.map((v) => [v.id, v]));
  const peopleOptions = people.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="space-y-6">
      <HqHeading
        title="משמרות"
        lead="מי במטבח, מתי, ואיפה חסרים אנשים. משמרת לא מאוישת היא ארוחה שלא תוגש."
        action={!locked && shifts.length > 0 && <AddShiftForm defaultDate={defaultDate} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="תקנים מאוישים"
          value={`${stats.positionsFilled}/${stats.positionsRequired}`}
          sub={
            stats.positionsRequired - stats.positionsFilled > 0
              ? `חסרים ${stats.positionsRequired - stats.positionsFilled} אנשים`
              : "הכל מאויש"
          }
          tone={stats.understaffed > 0 ? "attention" : "done"}
          accent="dust-blue"
        />
        <Metric
          label="משמרות חסרות"
          value={stats.understaffed}
          sub={stats.empty > 0 ? `${stats.empty} ריקות לגמרי` : "אף אחת לא ריקה"}
          tone={stats.empty > 0 ? "alarm" : stats.understaffed > 0 ? "attention" : "done"}
          accent="pink"
        />
        <Metric
          label="בלי אף משמרת"
          value={stats.peopleWithoutShift}
          sub={`מכסה: ${stats.quota} לאדם`}
          tone={stats.peopleWithoutShift > 0 ? "attention" : "done"}
          accent="lavender"
        />
        <Metric
          label="מתחת למכסה"
          value={stats.peopleBelowQuota}
          sub="לקחו פחות מהמכסה"
          accent="sun"
        />
      </div>

      {shifts.length === 0 ? (
        !locked && <GenerateShiftsForm defaultDate={defaultDate} />
      ) : (
        <>
          {/* ---- The grid from Bible §23 -------------------------------- */}
          <Panel title="מבט על" accent="dust-blue">
            <Table
              head={
                <>
                  <Th>משמרת</Th>
                  {days.map(({ date }) => (
                    <Th key={date.toISOString()} numeric>
                      <span className="block">{hebrewDay(date)}</span>
                      <span className="block font-normal text-cream-dim">
                        {shortDate(date)}
                      </span>
                    </Th>
                  ))}
                </>
              }
            >
              {typesPresent.map((type) => (
                <Tr key={type}>
                  <Td className="font-medium text-cream">
                    {shiftTypeLabel(type)}
                  </Td>
                  {days.map(({ date, items }) => {
                    const cell = items.find((s) => s.mealType === type);
                    return (
                      <Td key={date.toISOString()} numeric>
                        {cell ? (
                          <a
                            href={`#shift-${cell.id}`}
                            className={cn(
                              "inline-block rounded px-1.5 py-0.5 transition-colors hover:bg-charcoal-4",
                            )}
                          >
                            <Capacity
                              filled={cell.filled}
                              required={cell.requiredPeople}
                            />
                          </a>
                        ) : (
                          <span className="text-charcoal-5">—</span>
                        )}
                      </Td>
                    );
                  })}
                </Tr>
              ))}
            </Table>
          </Panel>

          {/* ---- Per-day detail ------------------------------------------ */}
          <div className="space-y-4">
            {days.map(({ date, items }) => (
              <Panel
                key={date.toISOString()}
                accent="sun"
                title={
                  <span className="flex items-baseline gap-2">
                    {hebrewDay(date)}
                    <span className="text-[12.5px] font-normal text-cream-dim">
                      {hebrewDate(date)}
                    </span>
                  </span>
                }
              >
                <div className="grid gap-3 p-4 lg:grid-cols-2">
                  {items.map((shift) => (
                    <div key={shift.id} id={`shift-${shift.id}`}>
                      <ShiftCard
                        shift={viewById.get(shift.id)!}
                        people={peopleOptions}
                        locked={locked}
                      />
                    </div>
                  ))}
                </div>
              </Panel>
            ))}
          </div>

          {!locked && (
            <div className="flex justify-center">
              <AddShiftForm defaultDate={defaultDate} />
            </div>
          )}
        </>
      )}

      {/* Bible §22: "make it easy to identify members who have not yet
          selected the required amount of kitchen participation." */}
      {belowQuota.length > 0 && (
        <Panel
          title="מי עוד לא לקח מספיק משמרות"
          accent="lavender"
          action={
            <span className="text-[12.5px] text-cream-dim">
              מכסה: {camp.shiftsPerPerson} לאדם
            </span>
          }
        >
          <ul className="flex flex-wrap gap-2 p-4">
            {belowQuota.map((p) => (
              <li
                key={p.id}
                className={cn(
                  "rounded-[9px_11px_8px_10px] border-2 px-2.5 py-1 text-sm",
                  p.taken === 0
                    ? "border-attention/60 bg-attention/10 text-cream"
                    : "border-charcoal-5 text-cream-2",
                )}
              >
                {p.name}
                <span className="ms-1.5 text-[12px] tabular-nums text-cream-dim" dir="ltr">
                  {p.taken}/{camp.shiftsPerPerson}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
