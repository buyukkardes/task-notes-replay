# SPECS archive — feat/notes-search

Branch covers Phase 3 search filter unit.

---

## Phase 3 — API quality

### GET /notes?search= filter

- [x] `GET /notes?search=` filters notes by title or body (case-insensitive substring)
- [x] Empty or whitespace-only search returns all notes
- [x] No matches returns empty array
- [x] Integration tests

**Verification:** tests pass.
