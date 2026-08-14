# SPECS archive — feat/notes-stats

Branch covers Phase 3 stats endpoint unit.

---

## Phase 3 — API quality

### GET /notes/stats

- [x] `GET /notes/stats` → `{ "count": number }` (count of notes in store)
- [x] Wrong methods on `/notes/stats` return 404
- [x] Tests for empty store and after creating notes

**Verification:** tests pass.
