# SPECS archive — feat/notes-pagination

Branch covers Phase 6 pagination API unit.

---

## Phase 6 — Pagination

### API: `?limit=&offset=` → `{ items, total }`

- [x] `limit` + `offset` query params (default limit 50 when only offset given; max limit 100)
- [x] Paginated response: `{ items, total }` when `limit` and/or `offset` present
- [x] Unpaginated `GET /notes` still returns a plain array (backward compatible)
- [x] Tests for pagination, validation, and `?search=` interaction

**Verification:** `bash scripts/verify.sh` green.
