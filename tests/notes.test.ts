import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
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
      error: "At least one of title or body is required",
    });
  });
});
