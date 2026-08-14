import type { Server } from "node:http";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { NoteStore } from "../src/notes/store.js";
import { createServer } from "../src/server.js";

describe("Notes API", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer(new NoteStore());
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = server.address();
    if (typeof addr !== "object" || addr === null) {
      throw new Error("Expected server to listen on a TCP port");
    }
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("GET /notes/stats returns count 0 for an empty store", async () => {
    const res = await fetch(`${baseUrl}/notes/stats`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ count: 0 });
  });

  it("GET /notes/stats returns the note count after creating notes", async () => {
    const beforeRes = await fetch(`${baseUrl}/notes/stats`);
    const { count: beforeCount } = (await beforeRes.json()) as { count: number };

    await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "First", body: "One" }),
    });
    await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Second", body: "Two" }),
    });

    const res = await fetch(`${baseUrl}/notes/stats`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ count: beforeCount + 2 });
  });

  it("POST /notes/stats returns 404", async () => {
    const res = await fetch(`${baseUrl}/notes/stats`, { method: "POST" });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("POST /notes creates a note", async () => {
    const res = await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "First", body: "Hello" }),
    });

    expect(res.status).toBe(201);
    expect(res.headers.get("content-type")).toContain("application/json");
    const note = await res.json();
    expect(note).toMatchObject({
      id: expect.any(String),
      title: "First",
      body: "Hello",
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it("GET /notes?search= filters by title or body (case-insensitive)", async () => {
    await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Apple pie", body: "Dessert recipe" }),
    });
    await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Shopping", body: "Buy apple juice" }),
    });
    await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Other", body: "Unrelated content" }),
    });

    const res = await fetch(`${baseUrl}/notes?search=apple`);
    expect(res.status).toBe(200);

    const notes = (await res.json()) as Array<{ title: string }>;
    const titles = notes.map((n) => n.title);
    expect(titles).toContain("Apple pie");
    expect(titles).toContain("Shopping");
    expect(titles).not.toContain("Other");
  });

  it("GET /notes?search= returns empty array when nothing matches", async () => {
    const res = await fetch(`${baseUrl}/notes?search=zzznomatchzzzz`);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([]);
  });

  it("GET /notes?search= returns filtered notes sorted by createdAt descending", async () => {
    vi.useFakeTimers();

    vi.setSystemTime(new Date("2026-06-01T00:00:00.000Z"));
    await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "FindMe older", body: "pipeline e2e" }),
    });

    vi.setSystemTime(new Date("2026-06-02T00:00:00.000Z"));
    await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "FindMe newer", body: "pipeline e2e" }),
    });

    const res = await fetch(`${baseUrl}/notes?search=FindMe`);
    expect(res.status).toBe(200);

    const notes = (await res.json()) as Array<{ title: string }>;
    const findMe = notes.filter((n) => n.title.startsWith("FindMe"));
    expect(findMe.map((n) => n.title)).toEqual(["FindMe newer", "FindMe older"]);
  });

  it("GET /notes lists notes", async () => {
    const createRes = await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "List me", body: "Content" }),
    });
    const created = await createRes.json();

    const res = await fetch(`${baseUrl}/notes`);
    expect(res.status).toBe(200);
    const notes = await res.json();
    expect(notes).toEqual(expect.arrayContaining([created]));
  });

  it("GET /notes returns notes sorted by createdAt descending", async () => {
    vi.useFakeTimers();

    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Oldest", body: "First created" }),
    });

    vi.setSystemTime(new Date("2026-01-02T00:00:00.000Z"));
    await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Middle", body: "Second created" }),
    });

    vi.setSystemTime(new Date("2026-01-03T00:00:00.000Z"));
    await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Newest", body: "Third created" }),
    });

    const res = await fetch(`${baseUrl}/notes`);
    expect(res.status).toBe(200);

    const notes = (await res.json()) as Array<{ title: string; createdAt: string }>;

    for (let i = 1; i < notes.length; i++) {
      expect(notes[i - 1]!.createdAt >= notes[i]!.createdAt).toBe(true);
    }

    const created = notes.filter((note) =>
      ["Newest", "Middle", "Oldest"].includes(note.title),
    );
    expect(created.map((note) => note.title)).toEqual(["Newest", "Middle", "Oldest"]);
  });

  it("GET /notes/:id returns 200 and the created note body", async () => {
    const createRes = await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Fetch me", body: "Full note body" }),
    });
    const created = await createRes.json();

    const res = await fetch(`${baseUrl}/notes/${created.id}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(created);
  });

  it("GET /notes/:id returns 404 for a missing id", async () => {
    const res = await fetch(`${baseUrl}/notes/missing-id`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Note not found" });
  });

  it("PUT /notes/:id updates a note", async () => {
    const createRes = await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Old", body: "Body" }),
    });
    const created = await createRes.json();

    await new Promise((resolve) => setTimeout(resolve, 5));

    const res = await fetch(`${baseUrl}/notes/${created.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New" }),
    });

    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated).toEqual({
      ...created,
      title: "New",
      updatedAt: expect.any(String),
    });
    expect(updated.updatedAt).not.toBe(created.updatedAt);
  });

  it("PUT /notes/:id returns 404 for a missing id", async () => {
    const res = await fetch(`${baseUrl}/notes/missing-id`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated title" }),
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Note not found" });
  });

  it("DELETE /notes/:id removes a note", async () => {
    const createRes = await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Delete me", body: "Bye" }),
    });
    const created = await createRes.json();

    const deleteRes = await fetch(`${baseUrl}/notes/${created.id}`, {
      method: "DELETE",
    });
    expect(deleteRes.status).toBe(204);

    const listRes = await fetch(`${baseUrl}/notes`);
    const notes = await listRes.json();
    expect(notes.find((note: { id: string }) => note.id === created.id)).toBeUndefined();
  });

  it("DELETE /notes/:id returns 404 for a missing id", async () => {
    const res = await fetch(`${baseUrl}/notes/missing-id`, { method: "DELETE" });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Note not found" });
  });

  it("POST /notes returns 400 for missing title", async () => {
    const res = await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "Only body" }),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "title is required and must be a non-empty string",
    });
  });

  it("POST /notes returns 400 when title exceeds 1000 characters", async () => {
    const res = await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "a".repeat(1001), body: "Valid body" }),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "title must be at most 1000 characters",
    });
  });

  it("POST /notes returns 400 when body exceeds 1000 characters", async () => {
    const res = await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Valid title", body: "b".repeat(1001) }),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "body must be at most 1000 characters",
    });
  });

  it("POST /notes returns 400 for empty body field", async () => {
    const res = await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Title", body: "   " }),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "body is required and must be a non-empty string",
    });
  });

  it("POST /notes returns 400 for invalid JSON", async () => {
    const res = await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-json",
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON body" });
  });

  it("PUT /notes/:id returns 400 when title exceeds 1000 characters", async () => {
    const createRes = await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Update me", body: "Body" }),
    });
    const created = await createRes.json();

    const res = await fetch(`${baseUrl}/notes/${created.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "t".repeat(1001) }),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "title must be at most 1000 characters",
    });
  });

  it("PUT /notes/:id returns 400 when body exceeds 1000 characters", async () => {
    const createRes = await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Update me", body: "Body" }),
    });
    const created = await createRes.json();

    const res = await fetch(`${baseUrl}/notes/${created.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "b".repeat(1001) }),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "body must be at most 1000 characters",
    });
  });

  it("GET /notes?limit=&offset= returns paginated items and total", async () => {
    vi.useFakeTimers();

    for (let i = 1; i <= 5; i++) {
      vi.setSystemTime(new Date(`2026-02-0${i}T00:00:00.000Z`));
      await fetch(`${baseUrl}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `PaginatePage ${i}`, body: `Body ${i}` }),
      });
    }

    const firstPage = await fetch(
      `${baseUrl}/notes?search=PaginatePage&limit=2&offset=0`,
    );
    expect(firstPage.status).toBe(200);
    const page1 = (await firstPage.json()) as {
      items: Array<{ title: string }>;
      total: number;
    };
    expect(page1.items.map((note) => note.title)).toEqual([
      "PaginatePage 5",
      "PaginatePage 4",
    ]);
    expect(page1.total).toBe(5);

    const secondPage = await fetch(
      `${baseUrl}/notes?search=PaginatePage&limit=2&offset=2`,
    );
    expect(secondPage.status).toBe(200);
    const page2 = (await secondPage.json()) as {
      items: Array<{ title: string }>;
      total: number;
    };
    expect(page2.items.map((note) => note.title)).toEqual([
      "PaginatePage 3",
      "PaginatePage 2",
    ]);
    expect(page2.total).toBe(5);
  });

  it("GET /notes?offset= beyond total returns empty items with total", async () => {
    const beforeRes = await fetch(`${baseUrl}/notes/stats`);
    const { count } = (await beforeRes.json()) as { count: number };

    const res = await fetch(`${baseUrl}/notes?limit=10&offset=${count + 100}`);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      items: [],
      total: count,
    });
  });

  it("GET /notes?limit= without offset defaults offset to 0", async () => {
    const res = await fetch(`${baseUrl}/notes?limit=1`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      items: unknown[];
      total: number;
    };
    expect(body.items).toHaveLength(1);
    expect(body.total).toBeGreaterThanOrEqual(1);
  });

  it("GET /notes?offset= without limit defaults limit to 50", async () => {
    const res = await fetch(`${baseUrl}/notes?offset=0`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      items: unknown[];
      total: number;
    };
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.total).toBe("number");
  });

  it("GET /notes pagination returns 400 for invalid limit or offset", async () => {
    const invalidLimit = await fetch(`${baseUrl}/notes?limit=0`);
    expect(invalidLimit.status).toBe(400);
    await expect(invalidLimit.json()).resolves.toEqual({
      error: "limit must be a positive integer",
    });

    const limitTooLarge = await fetch(`${baseUrl}/notes?limit=101`);
    expect(limitTooLarge.status).toBe(400);
    await expect(limitTooLarge.json()).resolves.toEqual({
      error: "limit must be at most 100",
    });

    const invalidOffset = await fetch(`${baseUrl}/notes?offset=-1`);
    expect(invalidOffset.status).toBe(400);
    await expect(invalidOffset.json()).resolves.toEqual({
      error: "offset must be a non-negative integer",
    });

    const nonNumeric = await fetch(`${baseUrl}/notes?limit=abc`);
    expect(nonNumeric.status).toBe(400);
    await expect(nonNumeric.json()).resolves.toEqual({
      error: "limit must be a positive integer",
    });
  });

  it("GET /notes?search= with pagination filters then paginates", async () => {
    vi.useFakeTimers();

    vi.setSystemTime(new Date("2026-07-01T00:00:00.000Z"));
    await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Paginate alpha one", body: "x" }),
    });

    vi.setSystemTime(new Date("2026-07-02T00:00:00.000Z"));
    await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Paginate alpha two", body: "x" }),
    });

    await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Paginate beta", body: "x" }),
    });

    const res = await fetch(`${baseUrl}/notes?search=alpha&limit=1&offset=0`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      items: Array<{ title: string }>;
      total: number;
    };
    expect(body.total).toBeGreaterThanOrEqual(2);
    expect(body.items).toHaveLength(1);
    expect(body.items[0]!.title).toBe("Paginate alpha two");
  });

  it("PUT /notes/:id returns 400 when no fields provided", async () => {
    const createRes = await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "T", body: "B" }),
    });
    const created = await createRes.json();

    const res = await fetch(`${baseUrl}/notes/${created.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "At least one of title, body, or tags is required",
    });
  });
});
