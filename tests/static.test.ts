import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "../src/server.js";
import { defaultPublicDir } from "../src/static.js";
import { NoteStore } from "../src/notes/store.js";

describe("static files", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer(new NoteStore(), defaultPublicDir());
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it("GET / returns index.html", async () => {
    const response = await fetch(`${baseUrl}/`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    const body = await response.text();
    expect(body).toContain("<title>Task Notes</title>");
    expect(body).toContain('src="/app.js"');
    expect(body).toContain('id="notes-list"');
    expect(body).toContain('id="create-form"');
    expect(body).toContain('id="search-input"');
    expect(body).toContain('id="stats-count"');
    expect(body).toContain('id="pagination"');
    expect(body).toContain('id="page-prev"');
    expect(body).toContain('id="page-next"');
  });

  it("GET /styles.css returns CSS", async () => {
    const response = await fetch(`${baseUrl}/styles.css`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/css");
  });

  it("GET /app.js returns JavaScript", async () => {
    const response = await fetch(`${baseUrl}/app.js`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("javascript");
    const body = await response.text();
    expect(body).toContain("loadNotes");
    expect(body).toContain("loadStats");
    expect(body).toContain("PAGE_SIZE");
    expect(body).toContain("changePage");
  });

  it("does not serve API paths as static files", async () => {
    const response = await fetch(`${baseUrl}/notes`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
