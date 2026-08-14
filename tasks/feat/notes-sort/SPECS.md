# SPECS archive — feat/notes-sort

Branch covers Phase 3 sort unit.

---

## Phase 3 — API quality

### Sort by createdAt descending

- [x] `GET /notes` returns notes sorted by `createdAt` descending (newest first)
- [x] Sort applies after search filter on `GET /notes?search=`
- [x] Integration tests with fake timers

**Verification:** tests pass.
