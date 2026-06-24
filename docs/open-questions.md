# Open Questions

Unresolved questions, risks, and decisions that need to be made. Resolve and move to decision-log.md when closed.

---

## SETUP-001 — Vercel + Supabase accounts

**Status**: Open
**Question**: Does the user have existing Vercel and Supabase accounts? Do they want to use the Supabase ↔ Vercel integration for automatic env var sync?
**Blocking**: Cannot initialize project or configure env vars until resolved.
**Owner**: User

---

## SETUP-002 — Supabase project region

**Status**: Open
**Question**: Which region should the Supabase database be in?
**Default if no answer**: US East (us-east-1)
**Blocking**: Supabase project creation.
**Owner**: User

---

## SETUP-003 — Development vs production Supabase projects

**Status**: Open
**Question**: Should we use one Supabase project (simpler, but migrations hit prod immediately) or two (dev + prod, safer but more setup)?
**Recommendation**: Start with one. Add a second when the project approaches launch.
**Blocking**: Nothing immediately. Decide before first migration.
**Owner**: User + Claude

---

## ARCH-001 — First slice selection

**Status**: Open
**Question**: Which feature do we build first? Recommendation is UTM Generator (no OAuth dependencies, bounded scope, validates full stack).
**Alternatives**: Budget dashboard (higher value but requires OAuth + platform API setup first).
**Blocking**: Feature planning and scope definition.
**Owner**: User
