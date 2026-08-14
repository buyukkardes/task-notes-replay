import { randomUUID } from "node:crypto";
import type { CreateNoteInput, Note, UpdateNoteInput } from "./types.js";

export class NoteStore {
  private notes = new Map<string, Note>();

  create(input: CreateNoteInput): Note {
    const now = new Date().toISOString();
    const note: Note = {
      id: randomUUID(),
      title: input.title,
      body: input.body,
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
    this.notes.set(note.id, note);
    return note;
  }

  get(id: string): Note | undefined {
    return this.notes.get(id);
  }

  getAll(): Note[] {
    return [...this.notes.values()];
  }

  update(id: string, input: UpdateNoteInput): Note | undefined {
    const existing = this.notes.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: Note = {
      ...existing,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      updatedAt: new Date().toISOString(),
    };
    this.notes.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.notes.delete(id);
  }
}
