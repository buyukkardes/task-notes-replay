# SPECS archive — feat/ui-features

Branch covers Phase 5 UI features unit.

---

## Phase 5 — UI features

### Create, delete, edit, search, stats panel

- [x] Stats section showing `{ count }` from `GET /notes/stats`; refresh after CRUD
- [x] Create form: title + body → `POST /notes`; refresh list on success
- [x] Delete button per row → `DELETE /notes/:id`
- [x] Inline edit → `PUT /notes/:id` (Save/Cancel)
- [x] Search input → `GET /notes?search=` with 300ms debounce
- [x] Client-side validation aligned with API (non-empty title/body, max 1000 chars)
- [x] `tests/static.test.ts` asserts create form, search input, stats count in HTML

**Verification:** `bash scripts/verify.sh` green.
