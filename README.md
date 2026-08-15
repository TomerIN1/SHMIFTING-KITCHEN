# SHMIFTING KITCHEN

**Plan the camp kitchen so thoroughly before Midburn that once the festival begins, nobody needs technology to run it.**

A pre-Midburn kitchen planning product for Camp Shmifting. It ends with **LOCK THE KITCHEN** and a printable Master Pack — and then it gets out of the way.

> אנחנו לא מחלקים דברים. אנחנו מחלקים רגעים.

---

## Two experiences, one kitchen

**The Shmifter experience** — a camp member tells the kitchen what they eat and what will hurt them, gives their flames to the meals they want, takes a shift, and eventually discovers the menu. It should never feel like management software.

**Kitchen HQ** — the Kitchen Lead's command centre. People, allergies, voting, menu, recipes and quantities, shifts, shopping, budget, readiness. It leads with what needs attention, not with data.

---

## Getting started

```bash
npm install
npm run db:push      # create the local SQLite database
npm run db:seed      # a believable camp, deliberately half-finished
npm run dev
```

Open <http://localhost:3000>.

The seed signs you in with any of its emails and the password `shmifting`.
Kitchen Lead: `tomer@shmifting.camp`. Camp invite code: `SHMIFT`.

Starting from an empty database instead? Skip the seed — the first person to join becomes the Kitchen Lead.

### Environment

`.env.local`
```
AUTH_SECRET=<a long random string>
```

`.env` (never read by agents — see `CLAUDE.md` §0.3)
```
OPENAI_API_KEY=...   # generating Shmifting artwork
FAL_KEY=...          # animating artwork that already exists
```

Production adds `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`; nothing else changes.

---

## Scripts

| | |
|---|---|
| `npm run dev` / `build` / `start` | the app |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:push` / `db:seed` / `db:reset` / `db:studio` | database |
| `npm run assets:generate` | OpenAI → `public/assets` (creates artwork) |
| `npm run assets:wordmark` | cuts the wordmark out of Golden Reference 02 |
| `npm run assets:optimize` | PNG → WebP |
| `npm run assets:animate` | FAL → `public/motion` (animates artwork only) |

---

## How it's built

Next.js 16 (App Router, Server Components, Server Actions) · React 19 · Tailwind v4 · Drizzle + libSQL · JWT cookie sessions.

The interesting part is not the stack, it's `lib/domain/` — pure functions with no database access that do the boring work so the humans can make the meaningful decisions:

- **recipe scaling** that keeps three numbers visible at once: what the maths says, what a kitchen would actually buy, and what the Kitchen Lead decided
- **ingredient aggregation** across every recipe in the menu, unit-aware, so three recipes wanting tomatoes become one line
- **allergy conflict detection** that answers "which planned dishes conflict with this person's allergy?" live, from ingredients
- **a readiness engine** where every check is a countable piece of real work, never a score

Automation assists. Humans decide. Every derived number has an explicit override.

---

## The rules

Three documents govern this repository, and they outrank convenience:

- `docs/SHMIFTING_PRODUCT_BIBLE.md` — what we are building and why
- `design_book/SHMIFTING_DESIGN_BOOK.md` — how it looks, feels and moves
- `design_book/golden_reference/` — what "right" looks like

`CLAUDE.md` is the project constitution for anyone — human or agent — working here. It includes the session protocol: read `docs/sessions/` before starting, update it before committing.

---

# PEOPLE FIRST. FEED THEM WELL. MAKE IT WEIRD. KEEP IT HUMAN.

**Feeding people is our gift.**
