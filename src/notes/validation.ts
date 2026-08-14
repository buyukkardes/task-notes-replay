import type { CreateNoteInput, UpdateNoteInput } from "./types.js";

export const MAX_FIELD_LENGTH = 1000;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function fieldTooLong(value: string): boolean {
  return value.trim().length > MAX_FIELD_LENGTH;
}

export function validateCreateInput(
  body: unknown,
): { ok: true; value: CreateNoteInput } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Request body must be a JSON object" };
  }

  const record = body as Record<string, unknown>;
  if (!isNonEmptyString(record.title)) {
    return { ok: false, error: "title is required and must be a non-empty string" };
  }
  if (!isNonEmptyString(record.body)) {
    return { ok: false, error: "body is required and must be a non-empty string" };
  }

  const title = record.title.trim();
  const noteBody = record.body.trim();

  if (fieldTooLong(title)) {
    return { ok: false, error: "title must be at most 1000 characters" };
  }
  if (fieldTooLong(noteBody)) {
    return { ok: false, error: "body must be at most 1000 characters" };
  }

  return { ok: true, value: { title, body: noteBody } };
}

export function validateUpdateInput(
  body: unknown,
): { ok: true; value: UpdateNoteInput } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Request body must be a JSON object" };
  }

  const record = body as Record<string, unknown>;
  const hasTitle = Object.prototype.hasOwnProperty.call(record, "title");
  const hasBody = Object.prototype.hasOwnProperty.call(record, "body");

  if (!hasTitle && !hasBody) {
    return { ok: false, error: "At least one of title or body is required" };
  }

  const input: UpdateNoteInput = {};

  if (hasTitle) {
    if (!isNonEmptyString(record.title)) {
      return { ok: false, error: "title must be a non-empty string" };
    }
    const title = record.title.trim();
    if (fieldTooLong(title)) {
      return { ok: false, error: "title must be at most 1000 characters" };
    }
    input.title = title;
  }

  if (hasBody) {
    if (!isNonEmptyString(record.body)) {
      return { ok: false, error: "body must be a non-empty string" };
    }
    const noteBody = record.body.trim();
    if (fieldTooLong(noteBody)) {
      return { ok: false, error: "body must be at most 1000 characters" };
    }
    input.body = noteBody;
  }

  return { ok: true, value: input };
}
