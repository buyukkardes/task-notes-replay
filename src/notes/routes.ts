import type { IncomingMessage, ServerResponse } from "node:http";
import type { NoteStore } from "./store.js";
import type { Note } from "./types.js";
import { validateCreateInput, validateUpdateInput } from "./validation.js";

const JSON_HEADERS = { "Content-Type": "application/json" };

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (raw.length === 0) {
    throw new SyntaxError("Empty request body");
  }

  return JSON.parse(raw) as unknown;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, JSON_HEADERS);
  res.end(JSON.stringify(body));
}

function sendError(res: ServerResponse, status: number, error: string): void {
  sendJson(res, status, { error });
}

function noteIdFromPath(pathname: string): string | undefined {
  const match = /^\/notes\/([^/]+)$/.exec(pathname);
  return match?.[1];
}

function parseSearchQuery(url: string | undefined): string | undefined {
  const query = new URL(url ?? "", "http://localhost").searchParams.get("search");
  if (query === null) {
    return undefined;
  }
  const trimmed = query.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function filterNotesBySearch(notes: Note[], search: string): Note[] {
  const needle = search.toLowerCase();
  return notes.filter(
    (note) =>
      note.title.toLowerCase().includes(needle) ||
      note.body.toLowerCase().includes(needle),
  );
}

function sortNotesByCreatedAtDesc(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function handleNotesRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  store: NoteStore,
): Promise<boolean> {
  const method = req.method ?? "GET";

  if (pathname === "/notes/stats") {
    if (method === "GET") {
      sendJson(res, 200, { count: store.getAll().length });
      return true;
    }

    sendError(res, 404, "Not found");
    return true;
  }

  if (pathname === "/notes" && method === "GET") {
    const all = store.getAll();
    const search = parseSearchQuery(req.url);
    const filtered = search ? filterNotesBySearch(all, search) : all;
    const notes = sortNotesByCreatedAtDesc(filtered);
    sendJson(res, 200, notes);
    return true;
  }

  if (pathname === "/notes" && method === "POST") {
    let body: unknown;
    try {
      body = await readJsonBody(req);
    } catch {
      sendError(res, 400, "Invalid JSON body");
      return true;
    }

    const validated = validateCreateInput(body);
    if (!validated.ok) {
      sendError(res, 400, validated.error);
      return true;
    }

    const note = store.create(validated.value);
    sendJson(res, 201, note);
    return true;
  }

  const id = noteIdFromPath(pathname);
  if (id === undefined) {
    return false;
  }

  if (method === "GET") {
    const note = store.get(id);
    if (!note) {
      sendError(res, 404, "Note not found");
      return true;
    }

    sendJson(res, 200, note);
    return true;
  }

  if (method === "PUT") {
    let body: unknown;
    try {
      body = await readJsonBody(req);
    } catch {
      sendError(res, 400, "Invalid JSON body");
      return true;
    }

    const validated = validateUpdateInput(body);
    if (!validated.ok) {
      sendError(res, 400, validated.error);
      return true;
    }

    const updated = store.update(id, validated.value);
    if (!updated) {
      sendError(res, 404, "Note not found");
      return true;
    }

    sendJson(res, 200, updated);
    return true;
  }

  if (method === "DELETE") {
    const deleted = store.delete(id);
    if (!deleted) {
      sendError(res, 404, "Note not found");
      return true;
    }

    res.writeHead(204);
    res.end();
    return true;
  }

  return false;
}
