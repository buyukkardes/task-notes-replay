# SPECS archive — feat/notes-max-field-length

Branch covers Phase 3 max field length unit.

---

## Phase 3 — API quality

### Max field length 1000

- [x] Reject `title` or `body` longer than 1000 characters with HTTP 400 on POST /notes
- [x] Reject `title` or `body` longer than 1000 characters with HTTP 400 on PUT /notes/:id

**Verification:** tests pass.
