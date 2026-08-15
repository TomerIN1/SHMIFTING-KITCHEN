"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users, foodProfiles, settings } from "@/lib/db/schema";
import { createSession, destroySession } from "./session";
import { newId } from "@/lib/utils";

export interface AuthState {
  error?: string;
  field?: "name" | "email" | "password" | "code";
  /* What they typed, handed back so a rejected form is a correction rather
     than a retype. Losing four fields because one code was wrong is how a
     sign-up reads as "nothing happened". The password is deliberately never
     returned — it would end up in the HTML. */
  values?: { name?: string; email?: string; code?: string };
}

const joinSchema = z.object({
  name: z.string().trim().min(2, "צריך שם שאפשר לקרוא בקול"),
  email: z.string().trim().toLowerCase().email("כתובת מייל לא תקינה"),
  password: z.string().min(8, "לפחות 8 תווים"),
  code: z.string().trim().min(1, "צריך את קוד הקמפ"),
});

export async function joinCamp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  /* Captured before validation so even a rejected parse comes back filled. */
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    code: String(formData.get("code") ?? ""),
  };

  const parsed = joinSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    code: formData.get("code"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      error: first.message,
      field: first.path[0] as AuthState["field"],
      values,
    };
  }

  const { name, email, password, code } = parsed.data;

  const camp = await db.query.settings.findFirst();
  if (!camp) {
    return { error: "המטבח עוד לא הוגדר. דברו עם מנהל.ת המטבח.", values };
  }

  if (code.toUpperCase() !== camp.inviteCode.toUpperCase()) {
    return { error: "קוד הקמפ לא נכון", field: "code", values };
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) {
    return {
      error: "המייל הזה כבר רשום. אפשר פשוט להתחבר.",
      field: "email",
      values,
    };
  }

  /* The very first person through the door is the Kitchen Lead. Without this
     the product would need a database console to become usable at all, and
     Bible §53 leaves setup to us to solve sensibly. */
  const firstEver = await campIsEmpty();
  const role = firstEver ? "admin" : "shmifter";

  const userId = newId();
  await db.insert(users).values({
    id: userId,
    email,
    name,
    passwordHash: await bcrypt.hash(password, 10),
    role,
  });

  /* Every person gets a profile row immediately, unfinished. The Home can then
     honestly say "your profile is waiting" instead of "no data". */
  await db.insert(foodProfiles).values({
    id: newId(),
    userId,
    dietaryPattern: "omnivore",
    spiceLevel: 2,
  });

  await db
    .update(settings)
    .set({ updatedAt: new Date() })
    .where(eq(settings.id, camp.id));

  await createSession({ userId, role });
  /* Home, not straight into the profile form. The Home is the only screen
     that shows all three things we need from a new member — profile, votes,
     shifts — as one trail with the next step called out. Dropping somebody
     into the longest form in the product before they have seen where they
     are is how the other two get forgotten. */
  redirect("/?welcome=1");
}

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("כתובת מייל לא תקינה"),
  password: z.string().min(1, "צריך סיסמה"),
});

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      error: first.message,
      field: first.path[0] as AuthState["field"],
      values: { email: String(formData.get("email") ?? "") },
    };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
  });

  /* Deliberately one message for both cases — it should not be possible to
     discover who is in the camp by probing the login form. */
  const ok =
    user && (await bcrypt.compare(parsed.data.password, user.passwordHash));

  if (!ok || !user) {
    return {
      error: "מייל או סיסמה לא נכונים",
      values: { email: parsed.data.email },
    };
  }

  await createSession({ userId: user.id, role: user.role });
  redirect(user.role === "admin" ? "/hq" : "/");
}

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/welcome");
}

/* True when nobody has joined yet — the very first person to arrive becomes
   the Kitchen Lead, so the product can be set up without a seed script or a
   database console. */
export async function campIsEmpty(): Promise<boolean> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users);
  return (row?.count ?? 0) === 0;
}
