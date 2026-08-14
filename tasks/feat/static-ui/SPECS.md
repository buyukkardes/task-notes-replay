# SPECS archive — feat/static-ui

Branch covers Phase 4 static UI unit.

---

## Phase 4 — Static UI

### Serve public/; list notes in browser

- [x] Serve `public/` from Node server (`GET /` → index.html, assets under `/…`)
- [x] API routes (`/health`, `/notes`, …) take precedence over static files
- [x] `public/index.html` + `public/app.js` — fetch `GET /notes`, render list (title, dates, body)
- [x] Empty state and error message if API unreachable
- [x] `tests/static.test.ts` for static routes

**Verification:** `bash scripts/verify.sh` green.
