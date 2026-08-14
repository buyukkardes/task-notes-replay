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
    tags.ts       # Tag normalization, ?tag= query parsing, filtering
    validation.ts # Request body validation
    routes.ts     # CRUD /notes + GET /notes/stats + ?search= + ?tag= + ?limit=&offset= pagination
public/
  index.html      # Notes page — stats, create form, search, list
  app.js          # CRUD UI: POST/PUT/DELETE /notes, GET ?search= + ?limit=&offset= pagination, GET /notes/stats
  styles.css
tests/
  health.test.ts  # GET /health integration test
  store.test.ts   # NoteStore unit tests
  notes.test.ts   # Notes API integration tests
  tags.test.ts    # Note tags API integration tests
  static.test.ts  # Static file serving
  smoke.test.ts
```

Harness: `docs/HARNESS.md`.
