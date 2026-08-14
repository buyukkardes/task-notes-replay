import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NoteStore } from "../src/notes/store.js";
import { createServer } from "../src/server.js";

describe("Note tags API", () => {
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

  it("POST /notes accepts tags and returns them on the note", async () => {
    const response = await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Tagged note",
        body: "Body",
        tags: ["Work", "work", " urgent "],
      }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      id: expect.any(String),
      title: "Tagged note",
      body: "Body",
      tags: ["Work", "urgent"],
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it("POST /notes defaults tags to an empty array", async () => {
    const response = await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Plain", body: "Body" }),
    });

    const note = await response.json();
    expect(note.tags).toEqual([]);
  });

  it("POST /notes returns 400 for invalid tags", async () => {
    const response = await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Bad tags",
        body: "Body",
        tags: ["ok", ""],
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "tags must not contain empty strings",
    });
  });

  it("PUT /notes/:id updates tags", async () => {
    const createResponse = await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Update tags", body: "Body", tags: ["a"] }),
    });
    const created = await createResponse.json();

    const response = await fetch(`${baseUrl}/notes/${created.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: ["b", "c"] }),
    });

    expect(response.status).toBe(200);
    const updated = await response.json();
    expect(updated.tags).toEqual(["b", "c"]);
  });

  it("GET /notes?tag= filters by tag case-insensitively", async () => {
    await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Work task",
        body: "Do thing",
        tags: ["work"],
      }),
    });
    await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Personal",
        body: "Other",
        tags: ["home"],
      }),
    });

    const response = await fetch(`${baseUrl}/notes?tag=WORK`);
    expect(response.status).toBe(200);

    const notes = (await response.json()) as Array<{ title: string; tags: string[] }>;
    const workTasks = notes.filter((note) => note.title === "Work task");
    expect(workTasks).toHaveLength(1);
    expect(workTasks[0]!.tags).toContain("work");
  });

  it("GET /notes?tag= works with search and pagination", async () => {
    for (let i = 1; i <= 3; i++) {
      await fetch(`${baseUrl}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Tagged item ${i}`,
          body: "filter combo",
          tags: ["combo"],
        }),
      });
    }

    const response = await fetch(
      `${baseUrl}/notes?tag=combo&search=Tagged&limit=2&offset=0`,
    );
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      items: Array<{ title: string }>;
      total: number;
    };
    expect(body.total).toBe(3);
    expect(body.items).toHaveLength(2);
  });
});
