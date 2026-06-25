# Decision Log

Significant architecture and product decisions. Append; never delete.

---

## 2026-06-24 — Tech Stack Selection

**Decision**: Next.js 14+ App Router, Supabase (PostgreSQL + Auth + Storage), TypeScript strict, Tailwind CSS, npm.

**Rationale**: App Router + Server Components minimize client JS. Supabase provides auth, RLS, and storage in one managed service — no separate auth layer needed. TypeScript strict catches integration bugs at compile time, critical for multi-platform API work.

**Alternatives considered**: Remix (less ecosystem maturity for this use case), Prisma + PlanetScale (separate auth management), plain PostgreSQL (operational overhead).

---

## 2026-06-24 — Deployment Target: Vercel

**Decision**: Deploy to Vercel from the start rather than running locally first.

**Rationale**: User preference. Avoids local environment drift. Vercel's Supabase integration auto-syncs environment variables.

**Implications**: First deployment happens before any features are built. Need Supabase project created before initializing Next.js.

---

## 2026-06-24 — Feature Module Structure

**Decision**: Feature code lives in `src/features/{name}/` with `queries.ts`, `actions.ts`, `validation.ts`, `constants.ts`. Vertical slices — schema through UI, complete end-to-end.

**Rationale**: Carries over from prior project (Proscene). Keeps feature logic co-located, prevents cross-feature coupling, makes it clear where to add code without hunting across `lib/`, `components/`, and `app/`.

**Implications**: `src/components/` holds only genuinely shared UI primitives. Feature-specific components live in `src/features/{name}/components/` if needed.

---

## 2026-06-24 — Platform Integrations: Separate from Feature Modules

**Decision**: Ad platform API clients (`google-ads/`, `meta/`, `linkedin/`, `tiktok/`) live in `src/lib/integrations/` and are not feature modules.

**Rationale**: Platform clients are shared infrastructure, not features. Multiple features (budget dashboard, creative manager) consume the same platform client.

---

## 2026-06-24 — No Local Supabase

**Decision**: Not using `supabase start` for local development. All development targets the remote Supabase project via environment variables.

**Rationale**: Vercel-first deployment means parity with production from day one. Local Supabase adds setup complexity with limited benefit at this stage.

**Risk**: Schema migrations affect the shared remote DB immediately. Mitigation: use a separate Supabase project for development vs production when the project reaches that stage.

---

## 2026-06-25 — Standing Quality Bar & Agent-Usage Policy

**Decision**: Adopt a standing quality bar — clean, safe, stable architecture — enforced through proactive use of the repo's review agents plus a hard pre-commit gate (`type-check` + `lint` + `build` must pass). Claude uses judgment on which agents to invoke per task (not a fixed pipeline) and escalates any change to architecture, dependencies, or security/data integrity before acting. Full policy in `.claude/rules/working-style.md` → "Quality Bar & Agent Usage".

**Rationale**: User delegated execution judgment for the project but wants code quality, safety, and architectural stability held constant. Encoding it in the auto-loaded working-style rules makes the bar durable across sessions rather than dependent on in-context memory.

**Implications**: Applies from now on without needing to be re-requested each session. The bar can be tightened or loosened by editing the working-style section; changes of substance get logged here.
