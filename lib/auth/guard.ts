import "server-only";
import { redirect } from "next/navigation";
import { currentUser } from "./session";
import type { User } from "@/lib/db/schema";

/* ============================================================================
   ACCESS GUARDS — Bible §50
   Two roles, checked on the server, on every protected page and every action.

   Bible §34 is the reason this is not "check it in the layout and relax":
   food profiles contain personal medical information, and camp members must
   not automatically see each other's allergy data. Every server action that
   touches someone else's data calls requireAdmin() itself.
   ========================================================================= */

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/welcome");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/welcome");
  if (user.role !== "admin") redirect("/");
  return user;
}

/* For server actions, where redirecting is the wrong response — the caller
   needs to render an error inside its form. */
export async function assertAdmin(): Promise<User> {
  const user = await currentUser();
  if (!user || user.role !== "admin") {
    throw new Error("אין לך הרשאה לפעולה הזו.");
  }
  return user;
}

export async function assertUser(): Promise<User> {
  const user = await currentUser();
  if (!user) throw new Error("צריך להתחבר כדי לבצע את הפעולה הזו.");
  return user;
}
