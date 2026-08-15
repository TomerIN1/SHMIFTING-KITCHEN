"use client";

import { useActionState, useState } from "react";
import {
  addEquipment,
  updateEquipment,
  deleteEquipment,
  cycleStatus,
  type EquipmentState,
} from "./actions";
import { ToolInput, ToolSelect, ToolTextArea } from "@/components/shmifting/Field";
import { ToolButton } from "@/components/shmifting/StickerButton";
import { Glyph } from "@/components/shmifting/Glyph";
import {
  EQUIPMENT_CATEGORIES,
  ACQUISITION,
  EQUIPMENT_STATUS,
  acquisitionLabel,
  acquisitionCosts,
  equipmentStatusLabel,
} from "@/lib/domain/equipment";
import { money, cn } from "@/lib/utils";

/* ============================================================================
   THE KIT LIST

   Not a shopping list. These things are rented, borrowed or already owned,
   they do not scale with head count, and half of them come back afterwards.
   What the Kitchen Lead needs from this screen is different too: not "how
   much", but "who is bringing the fridge, and have they actually said yes".

   So status is one click rather than a form — צריך למצוא → מצאנו מאיפה →
   סגור — because the thing that changes weekly is confidence, not price.
   ========================================================================= */

export interface EquipmentView {
  id: string;
  name: string;
  category: string;
  acquisition: string;
  quantity: number;
  estimatedCost: number;
  actualCost: number | null;
  status: string;
  supplier: string | null;
  link: string | null;
  notes: string | null;
  cost: number;
}

const EMPTY: EquipmentState = {};

const STATUS_STYLE: Record<string, string> = {
  needed: "border-alarm/60 text-alarm",
  sourced: "border-attention/60 text-attention",
  secured: "border-good/60 text-good",
};

export function EquipmentBoard({
  groups,
  currency,
}: {
  groups: { key: string; label: string; items: EquipmentView[] }[];
  currency: string;
}) {
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.key}>
          <h2 className="mb-2.5 flex items-baseline gap-2 font-display text-[15px] text-cream">
            {group.label}
            <span className="text-[12px] text-cream-dim">
              {group.items.length}
            </span>
          </h2>
          <div className="space-y-2">
            {group.items.map((item) => (
              <EquipmentRow key={item.id} item={item} currency={currency} />
            ))}
          </div>
        </section>
      ))}

      <AddEquipment />
    </div>
  );
}

function EquipmentRow({
  item,
  currency,
}: {
  item: EquipmentView;
  currency: string;
}) {
  const [editing, setEditing] = useState(false);
  const free = !acquisitionCosts(item.acquisition);

  if (editing) {
    return (
      <form
        action={async (fd) => {
          await updateEquipment(fd);
          setEditing(false);
        }}
        className="space-y-2.5 rounded-[13px_16px_12px_15px] border-2 border-sun/50 bg-charcoal-2 p-3"
      >
        <input type="hidden" name="id" value={item.id} />

        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <Labelled label="שם">
            <ToolInput name="name" defaultValue={item.name} required maxLength={80} />
          </Labelled>
          <Labelled label="כמות">
            <ToolInput
              type="number"
              name="quantity"
              min={1}
              defaultValue={item.quantity}
              className="w-20"
            />
          </Labelled>
          <Labelled label="קטגוריה">
            <ToolSelect name="category" defaultValue={item.category}>
              {EQUIPMENT_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.he}
                </option>
              ))}
            </ToolSelect>
          </Labelled>
        </div>

        <div className="grid gap-2 sm:grid-cols-4">
          <Labelled label="איך משיגים">
            <ToolSelect name="acquisition" defaultValue={item.acquisition}>
              {Object.entries(ACQUISITION).map(([key, v]) => (
                <option key={key} value={key}>
                  {v.he}
                </option>
              ))}
            </ToolSelect>
          </Labelled>
          <Labelled label={`עלות ליחידה (${currency})`}>
            <ToolInput
              type="number"
              name="estimatedCost"
              min={0}
              step="1"
              defaultValue={item.estimatedCost}
            />
          </Labelled>
          <Labelled label="שולם בפועל">
            <ToolInput
              type="number"
              name="actualCost"
              min={0}
              step="1"
              defaultValue={item.actualCost ?? ""}
              placeholder="—"
            />
          </Labelled>
          <Labelled label="סטטוס">
            <ToolSelect name="status" defaultValue={item.status}>
              {Object.entries(EQUIPMENT_STATUS).map(([key, v]) => (
                <option key={key} value={key}>
                  {v.he}
                </option>
              ))}
            </ToolSelect>
          </Labelled>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Labelled label="מאיפה / ממי">
            <ToolInput
              name="supplier"
              defaultValue={item.supplier ?? ""}
              placeholder="השכרת ציוד בבאר שבע"
              maxLength={120}
            />
          </Labelled>
          <Labelled label="קישור או טלפון">
            <ToolInput
              name="link"
              defaultValue={item.link ?? ""}
              placeholder="050-0000000"
              maxLength={200}
              dir="ltr"
            />
          </Labelled>
        </div>

        <Labelled label="הערות">
          <ToolTextArea name="notes" defaultValue={item.notes ?? ""} rows={2} />
        </Labelled>

        <div className="flex gap-2">
          <ToolButton type="submit" accent="sun" active>
            לשמור
          </ToolButton>
          <ToolButton type="button" onClick={() => setEditing(false)}>
            ביטול
          </ToolButton>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[13px_16px_12px_15px] border-2 border-charcoal-5 bg-charcoal-2 px-3.5 py-2.5">
      {/* Status is the field that changes most, so it is the control, not a
          badge you have to open a form to move. */}
      <form action={cycleStatus}>
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="status" value={item.status} />
        <button
          type="submit"
          title="ללחוץ כדי לקדם את הסטטוס"
          className={cn(
            "rounded-full border-2 px-2.5 py-1 text-[11.5px] font-medium transition-colors",
            STATUS_STYLE[item.status] ?? "border-charcoal-5 text-cream-dim",
          )}
        >
          {equipmentStatusLabel(item.status)}
        </button>
      </form>

      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] text-cream">
          {item.name}
          {item.quantity > 1 && (
            <span className="text-cream-dim"> × {item.quantity}</span>
          )}
        </p>
        <p className="text-[12px] text-cream-dim">
          {acquisitionLabel(item.acquisition)}
          {item.supplier && ` · ${item.supplier}`}
          {item.link && ` · ${item.link}`}
        </p>
        {item.notes && (
          <p className="mt-0.5 text-[12px] text-cream-2/70">{item.notes}</p>
        )}
      </div>

      <div className="shrink-0 text-end">
        <p
          className={cn(
            "font-display text-[15px] tabular-nums",
            free ? "text-good" : "text-cream",
          )}
        >
          {free ? "חינם" : money(item.cost, currency)}
        </p>
        {item.actualCost !== null && !free && (
          <p className="text-[11.5px] text-cream-dim">שולם</p>
        )}
      </div>

      <div className="flex shrink-0 gap-1.5">
        <ToolButton type="button" onClick={() => setEditing(true)}>
          <Glyph name="pencil" strokeWidth={2.2} />
        </ToolButton>
        <form action={deleteEquipment}>
          <input type="hidden" name="id" value={item.id} />
          <ToolButton type="submit" className="hover:border-alarm hover:text-alarm">
            <Glyph name="cross" strokeWidth={2.4} />
          </ToolButton>
        </form>
      </div>
    </div>
  );
}

function AddEquipment() {
  const [state, action, pending] = useActionState(addEquipment, EMPTY);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <ToolButton type="button" accent="sun" onClick={() => setOpen(true)}>
        <Glyph name="plus" strokeWidth={2.6} />
        להוסיף פריט
      </ToolButton>
    );
  }

  return (
    <form
      action={async (fd) => {
        await action(fd);
      }}
      className="space-y-2.5 rounded-[13px_16px_12px_15px] border-2 border-charcoal-4 bg-charcoal-2 p-3"
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <Labelled label="מה צריך">
          <ToolInput name="name" placeholder="מקרר 200 ליטר" required maxLength={80} />
        </Labelled>
        <Labelled label="כמות">
          <ToolInput type="number" name="quantity" min={1} defaultValue={1} className="w-20" />
        </Labelled>
        <Labelled label="קטגוריה">
          <ToolSelect name="category" defaultValue="cold">
            {EQUIPMENT_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.he}
              </option>
            ))}
          </ToolSelect>
        </Labelled>
        <Labelled label="איך משיגים">
          <ToolSelect name="acquisition" defaultValue="rent">
            {Object.entries(ACQUISITION).map(([key, v]) => (
              <option key={key} value={key}>
                {v.he}
              </option>
            ))}
          </ToolSelect>
        </Labelled>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Labelled label="עלות משוערת ליחידה">
          <ToolInput type="number" name="estimatedCost" min={0} step="1" defaultValue={0} />
        </Labelled>
        <Labelled label="מאיפה / ממי">
          <ToolInput name="supplier" placeholder="עוד לא יודעים" maxLength={120} />
        </Labelled>
        <Labelled label="קישור או טלפון">
          <ToolInput name="link" maxLength={200} dir="ltr" />
        </Labelled>
      </div>

      {state.error && (
        <p role="alert" className="text-[13px] text-alarm">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        <ToolButton type="submit" accent="sun" active disabled={pending}>
          {pending ? "מוסיפים…" : "להוסיף"}
        </ToolButton>
        <ToolButton type="button" onClick={() => setOpen(false)}>
          ביטול
        </ToolButton>
      </div>
    </form>
  );
}

function Labelled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] text-cream-dim">{label}</span>
      {children}
    </label>
  );
}
