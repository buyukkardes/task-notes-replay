import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NoteStore } from "../src/notes/store.js";

describe("NoteStore", () => {
  let store: NoteStore;

  beforeEach(() => {
    store = new NoteStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("create returns a note with id and timestamps", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T12:00:00.000Z"));

    const note = store.create({ title: "Hello", body: "World" });

    expect(note).toEqual({
      id: expect.any(String),
      title: "Hello",
      body: "World",
      tags: [],
      createdAt: "2026-08-14T12:00:00.000Z",
      updatedAt: "2026-08-14T12:00:00.000Z",
    });
    expect(note.id.length).toBeGreaterThan(0);
  });

  it("get returns the note by id", () => {
    const created = store.create({ title: "T", body: "B" });
    expect(store.get(created.id)).toEqual(created);
  });

  it("get returns undefined for unknown id", () => {
    expect(store.get("missing")).toBeUndefined();
  });

  it("getAll returns all notes", () => {
    const a = store.create({ title: "A", body: "1" });
    const b = store.create({ title: "B", body: "2" });
    expect(store.getAll()).toEqual(expect.arrayContaining([a, b]));
    expect(store.getAll()).toHaveLength(2);
  });

  it("update changes fields and updatedAt", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T12:00:00.000Z"));
    const created = store.create({ title: "Old", body: "Body" });

    vi.setSystemTime(new Date("2026-08-14T13:00:00.000Z"));
    const updated = store.update(created.id, { title: "New" });

    expect(updated).toEqual({
      id: created.id,
      title: "New",
      body: "Body",
      tags: [],
      createdAt: "2026-08-14T12:00:00.000Z",
      updatedAt: "2026-08-14T13:00:00.000Z",
    });
    expect(store.get(created.id)).toEqual(updated);
  });

  it("update returns undefined for unknown id", () => {
    expect(store.update("missing", { title: "X" })).toBeUndefined();
  });

  it("delete removes the note", () => {
    const note = store.create({ title: "T", body: "B" });
    expect(store.delete(note.id)).toBe(true);
    expect(store.get(note.id)).toBeUndefined();
    expect(store.delete(note.id)).toBe(false);
  });
});
