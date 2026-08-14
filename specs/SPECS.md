# SPECS — Task Notes (product only)

TypeScript, Node `http`, Vitest, vanilla `public/` UI. **No harness meta** — use harness-infra-template for agent workflow.

---

## Phase 1 — Bootstrap

### Unit 1.1 — Tooling

- [x] package.json scripts: test, build, dev; TypeScript + Vitest
- [x] Smoke test

**Verification:** `npm ci && npm test && npm run build`

### Unit 1.2 — Health endpoint

- [x] `GET /health` → `{ "status": "ok" }`
- [x] Integration test

**Verification:** test or curl passes.

---

## Phase 2 — Notes API

### Unit 2.1 — Model + store

- [x] `Note { id, title, body, createdAt, updatedAt }`, Map store, store tests

### Unit 2.2 — HTTP CRUD

- [x] POST/GET/PUT/DELETE `/notes`, validation → 400, API tests

### Unit 2.3 — Completion

- [ ] verify green, handoff

---

## Phase 3 — API quality

- [ ] GET /notes/:id happy path; PUT/DELETE 404
- [ ] Max field length 1000
- [ ] GET /notes/stats → `{ count }`
- [ ] GET /notes?search= filter
- [ ] Sort by createdAt descending

**Verification:** tests pass.

---

## Phase 4 — Static UI

- [ ] Serve `public/`; list notes in browser

---

## Phase 5 — UI features

- [ ] Create, delete, edit, search, stats panel

---

## Phase 6 — Pagination

- [ ] API: `?limit=&offset=` → `{ items, total }`
- [ ] UI: prev/next, search + pagination

---

## Phase 7 — Tags (optional)

- [ ] `tags: string[]`, GET `?tag=`, validation, tests

**Verification:** `bash scripts/verify.sh` green; feature parity with harness-lab reference app.
