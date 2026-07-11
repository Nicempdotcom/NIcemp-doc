---
name: NicEmp Docs entity relationship arrays are unpopulated
description: PageEntity.components/hooks/apis and similar cross-entity ID arrays are always empty; use module-string grouping instead when linking entities.
---

In NicEmp Docs' documentation database (`services/storage/types.ts`), entities like
`PageEntity` declare relationship arrays (`components: string[]`, `hooks: string[]`,
`apis: string[]`) annotated "populated in future EPIC" — but nothing in the mapper
or analyzers ever fills them in. They are always `[]` at runtime.

**Why:** Several pages (Modules) already aggregate entities correctly by matching
their shared `module` field (derived from `inferModule()` on the file path) rather
than by these relationship arrays. Trusting the unpopulated arrays produces silently
empty UI sections that look broken.

**How to apply:** When building any new feature that needs to associate one entity
with another (e.g. "which interactions belong to this page/component"), group by
the `module` string both sides already carry, not by relationship ID arrays — unless
you are the one implementing the future EPIC that actually populates them.
