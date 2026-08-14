import type { Note } from "./types.js";

export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 50;

export function normalizeTags(value: unknown): string[] | { error: string } {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    return { error: "tags must be an array of strings" };
  }

  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (typeof entry !== "string") {
      return { error: "tags must be an array of strings" };
    }

    const trimmed = entry.trim();
    if (!trimmed) {
      return { error: "tags must not contain empty strings" };
    }

    if (trimmed.length > MAX_TAG_LENGTH) {
      return {
        error: `each tag must be at most ${MAX_TAG_LENGTH} characters`,
      };
    }

    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(trimmed);
    }
  }

  if (normalized.length > MAX_TAGS) {
    return { error: `at most ${MAX_TAGS} tags allowed` };
  }

  return normalized;
}

export function parseTagQuery(url: string | undefined): string | undefined {
  const query = new URL(url ?? "", "http://localhost").searchParams.get("tag");
  if (query === null) {
    return undefined;
  }
  const trimmed = query.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function filterNotesByTag(notes: Note[], tag: string): Note[] {
  const needle = tag.toLowerCase();
  return notes.filter((note) =>
    note.tags.some((entry) => entry.toLowerCase() === needle),
  );
}
