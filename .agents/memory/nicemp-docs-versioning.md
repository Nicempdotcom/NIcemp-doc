---
name: NicEmp Docs versioning model
description: How version comparison and history are implemented in the NicEmp Docs artifact, and the constraint that drove the design.
---

NicEmp Docs' documentation database (pages, components, hooks, APIs, tables) lives in
localStorage and is upserted in place per project on every ZIP import — it is not
scoped per version. To support version comparison (EPIC 05) and a version history
timeline (EPIC 06), a separate `VersionSnapshotEntity` store was introduced that
captures a lightweight, comparable fingerprint (id/name/location/module/signature)
of every entity at the moment each version is analyzed, keyed 1:1 to `VersionEntity`.

**Why:** without a per-version snapshot, importing a new ZIP overwrites the previous
entities, making it impossible to diff "this version vs. the last one" after the fact.

**How to apply:** any new feature that needs to reason about "what changed between
versions" or "what did version N look like" should read from `VersionSnapshotRepository`
(via `services/storage`), not from the live entity stores. `VersionEntity.stats` holds
the exact counts (files/pages/components/hooks/apis/tables) captured at analysis time.
Diffing itself is generic: `DiffService.diffList` (id + signature comparison) is used by
`VersionComparator` (services/comparison) for both the Comparação screen and the
Histórico timeline's "comparar com anterior" action. Most entity fields are still
static placeholders (props/params always empty), so "changed" detection will mostly
fire once deeper content analysis is added in a future epic — this is expected, not a bug.
