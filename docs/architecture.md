# Architecture

Product: see `specs/SPECS.md`. Update paths here as you implement (pointers only, no code dumps).

```text
src/
  index.ts        # Entry — starts HTTP server
  server.ts       # Node http server + routing
  notes/
    types.ts      # Note model
    store.ts      # In-memory Map store
    validation.ts # Request body validation
    routes.ts     # POST/GET/PUT/DELETE /notes handlers
tests/
  health.test.ts  # GET /health integration test
  store.test.ts   # NoteStore unit tests
  notes.test.ts   # Notes API integration tests
  smoke.test.ts
```

Harness: `docs/HARNESS.md`.
