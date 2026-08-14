# SPECS archive — feat/notes-get-by-id

Branch covers Phase 3 first unit.

---

## Phase 3 — API quality

### GET /notes/:id happy path; PUT/DELETE 404

- [x] GET /notes/:id returns 200 with note body
- [x] GET /notes/:id returns 404 for missing id
- [x] PUT /notes/:id returns 404 for missing id
- [x] DELETE /notes/:id returns 404 for missing id

**Verification:** tests pass.
