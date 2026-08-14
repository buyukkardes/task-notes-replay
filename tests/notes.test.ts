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

  it("PUT /notes/:id updates a note", async () => {
    const createRes = await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Old", body: "Body" }),
    });
    const created = await createRes.json();

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
