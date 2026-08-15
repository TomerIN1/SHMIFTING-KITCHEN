import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, type User } from "@/lib/db/schema";

/* ============================================================================
   SESSIONS
   Stateless signed cookie. No session table, no third-party auth provider.

   Why (CLAUDE.md §25): this is one camp of a few dozen friends. An OAuth
   provider would add an external dependency, a dashboard, and a bill, to solve
   a problem this product does not have. A signed HttpOnly cookie does the job,
   keeps every camp member's dietary and allergy data on our own database
   (Bible §34), and can be replaced later without touching a single page.
   ========================================================================= */

const COOKIE = "shmifting_session";
const MAX_AGE = 60 * 60 * 24 * 90; // a planning season

function secret(): Uint8Array {
  /* Trimmed, because a hosting dashboard hands an unset variable back as ""
     rather than undefined. That is how this failed in production: the
     variable existed, so it looked configured, and every sign-up got as far
     as writing the account to the database and then died signing the cookie. */
  const value = process.env.AUTH_SECRET?.trim();
  if (!value) {
    /* Name where it is actually missing from. The old message said "add it to
       .env.local", which is useless advice when you are staring at a 500 from
       a serverless function that has no such file. */
    const where = process.env.VERCEL
      ? `the Vercel project (${process.env.VERCEL_ENV ?? "production"}) — ` +
        `\`vercel env add AUTH_SECRET\`, then redeploy`
      : ".env.local — see .env.example";
    throw new Error(`AUTH_SECRET is missing or empty. Set it in ${where}.`);
  }
  return new TextEncoder().encode(value);
}

export interface SessionPayload {
  userId: string;
  role: "shmifter" | "admin";
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.userId !== "string") return null;
    return {
      userId: payload.userId,
      role: payload.role === "admin" ? "admin" : "shmifter",
    };
  } catch {
    return null;
  }
}

/* Deduped per request: a page and its nested components all ask "who is this?"
   and should not each hit the database. */
export const currentUser = cache(async (): Promise<User | null> => {
  const session = await readSession();
  if (!session) return null;
  const row = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });
  return row ?? null;
});

export const isAdmin = cache(async (): Promise<boolean> => {
  const user = await currentUser();
  return user?.role === "admin";
});
