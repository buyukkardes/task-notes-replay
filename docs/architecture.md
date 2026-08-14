# Architecture

Product: see `specs/SPECS.md`. Update paths here as you implement (pointers only, no code dumps).

```text
src/
  index.ts        # Entry — starts HTTP server
  server.ts       # Node http server + routing + static fallback
  static.ts       # Serve public/ (GET /, assets)
  notes/
    types.ts      # Note model
    store.ts      # In-memory Map store
    validation.ts # Request body validation
    routes.ts     # CRUD /notes + GET /notes/stats + ?search= filter + createdAt desc sort
public/
  index.html      # Notes list page
  app.js          # Fetch GET /notes, render list
  styles.css
tests/
  health.test.ts  # GET /health integration test
  store.test.ts   # NoteStore unit tests
  notes.test.ts   # Notes API integration tests
  static.test.ts  # Static file serving
  smoke.test.ts
```

Harness: `docs/HARNESS.md`.
