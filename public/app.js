const MAX_FIELD_LENGTH = 1000;
const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 10;

const createForm = document.getElementById("create-form");
const titleInput = document.getElementById("note-title");
const bodyInput = document.getElementById("note-body");
const formError = document.getElementById("form-error");
const searchInput = document.getElementById("search-input");
const statsStatus = document.getElementById("stats-status");
const statsCount = document.getElementById("stats-count");
const statsError = document.getElementById("stats-error");
const notesList = document.getElementById("notes-list");
const notesStatus = document.getElementById("notes-status");
const notesError = document.getElementById("notes-error");
const pagination = document.getElementById("pagination");
const pagePrev = document.getElementById("page-prev");
const pageNext = document.getElementById("page-next");
const pageStatus = document.getElementById("page-status");

let cachedNotes = [];
let currentSearch = "";
let currentOffset = 0;
let totalNotes = 0;
let editingNoteId = null;
let searchDebounceTimer = null;

function formatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function clampOffset(offset, total) {
  if (total <= 0) {
    return 0;
  }
  const maxOffset = Math.max(0, Math.ceil(total / PAGE_SIZE) * PAGE_SIZE - PAGE_SIZE);
  return Math.min(offset, maxOffset);
}

function showListError(message) {
  notesError.hidden = false;
  notesError.textContent = message;
  notesList.hidden = true;
  notesStatus.hidden = true;
  pagination.hidden = true;
}

function clearFormError() {
  formError.hidden = true;
  formError.textContent = "";
}

function showFormError(message) {
  formError.hidden = false;
  formError.textContent = message;
}

function validateNoteFields(title, body) {
  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();

  if (!trimmedTitle) {
    return "title is required";
  }
  if (!trimmedBody) {
    return "body is required";
  }
  if (trimmedTitle.length > MAX_FIELD_LENGTH) {
    return "title must be at most 1000 characters";
  }
  if (trimmedBody.length > MAX_FIELD_LENGTH) {
    return "body must be at most 1000 characters";
  }

  return null;
}

function createActionButtons(note) {
  const actions = document.createElement("div");
  actions.className = "note-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "btn btn-secondary btn-small";
  editButton.textContent = "Edit";
  editButton.addEventListener("click", () => startEdit(note.id));

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "btn btn-danger btn-small";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", () => deleteNote(note.id));

  actions.append(editButton, deleteButton);
  return actions;
}

function renderEditForm(note) {
  const item = document.createElement("li");
  item.className = "note-item note-item-editing";

  const form = document.createElement("form");
  form.className = "edit-form";
  form.noValidate = true;

  const titleField = document.createElement("label");
  titleField.className = "field";
  titleField.innerHTML = "<span>Title</span>";
  const titleControl = document.createElement("input");
  titleControl.type = "text";
  titleControl.maxLength = MAX_FIELD_LENGTH;
  titleControl.value = note.title;
  titleField.append(titleControl);

  const bodyField = document.createElement("label");
  bodyField.className = "field";
  bodyField.innerHTML = "<span>Body</span>";
  const bodyControl = document.createElement("textarea");
  bodyControl.rows = 4;
  bodyControl.maxLength = MAX_FIELD_LENGTH;
  bodyControl.value = note.body;
  bodyField.append(bodyControl);

  const editError = document.createElement("p");
  editError.className = "form-error";
  editError.hidden = true;
  editError.setAttribute("role", "alert");

  const buttonRow = document.createElement("div");
  buttonRow.className = "edit-actions";

  const saveButton = document.createElement("button");
  saveButton.type = "submit";
  saveButton.className = "btn btn-primary btn-small";
  saveButton.textContent = "Save";

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "btn btn-secondary btn-small";
  cancelButton.textContent = "Cancel";
  cancelButton.addEventListener("click", () => cancelEdit());

  buttonRow.append(saveButton, cancelButton);
  form.append(titleField, bodyField, editError, buttonRow);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveEdit(note.id, titleControl.value, bodyControl.value, editError, saveButton);
  });

  item.append(form);
  return item;
}

function renderReadOnlyNote(note) {
  const item = document.createElement("li");
  item.className = "note-item";

  const header = document.createElement("div");
  header.className = "note-header";

  const title = document.createElement("h3");
  title.className = "note-title";
  title.textContent = note.title;

  header.append(title, createActionButtons(note));

  const meta = document.createElement("p");
  meta.className = "note-meta";
  meta.textContent = `Created ${formatDate(note.createdAt)} · Updated ${formatDate(note.updatedAt)}`;

  const body = document.createElement("p");
  body.className = "note-body";
  body.textContent = note.body;

  item.append(header, meta, body);
  return item;
}

function updatePaginationControls() {
  if (totalNotes <= PAGE_SIZE) {
    pagination.hidden = true;
    return;
  }

  pagination.hidden = false;
  const start = totalNotes === 0 ? 0 : currentOffset + 1;
  const end = Math.min(currentOffset + cachedNotes.length, totalNotes);
  pageStatus.textContent = `Showing ${start}–${end} of ${totalNotes}`;
  pagePrev.disabled = currentOffset <= 0;
  pageNext.disabled = currentOffset + PAGE_SIZE >= totalNotes;
}

function renderNotes(notes) {
  notesError.hidden = true;
  notesStatus.hidden = true;
  notesList.hidden = false;
  notesList.replaceChildren();

  if (notes.length === 0) {
    notesStatus.hidden = false;
    pagination.hidden = true;
    notesStatus.textContent = currentSearch
      ? "No notes match your search."
      : "No notes yet. Add one with the form above.";
    return;
  }

  for (const note of notes) {
    if (note.id === editingNoteId) {
      notesList.append(renderEditForm(note));
    } else {
      notesList.append(renderReadOnlyNote(note));
    }
  }

  updatePaginationControls();
}

function notesUrl() {
  const params = new URLSearchParams();
  params.set("limit", String(PAGE_SIZE));
  params.set("offset", String(currentOffset));

  const trimmed = currentSearch.trim();
  if (trimmed) {
    params.set("search", trimmed);
  }

  return `/notes?${params.toString()}`;
}

function formatNoteCount(count) {
  const label = count === 1 ? "note" : "notes";
  return `${count} ${label} total`;
}

async function loadStats() {
  statsError.hidden = true;
  statsCount.hidden = true;
  statsStatus.hidden = false;
  statsStatus.textContent = "Loading stats…";

  try {
    const response = await fetch("/notes/stats");
    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }
    const data = await response.json();
    if (!data || typeof data.count !== "number") {
      throw new Error("Unexpected response from server");
    }

    statsStatus.hidden = true;
    statsCount.hidden = false;
    statsCount.textContent = formatNoteCount(data.count);
  } catch (err) {
    statsStatus.hidden = true;
    statsError.hidden = false;
    statsError.textContent =
      err instanceof TypeError
        ? "Could not load stats. Is the server running?"
        : err instanceof Error
          ? err.message
          : "Failed to load stats";
  }
}

async function refreshNotesAndStats() {
  await Promise.all([loadNotes(), loadStats()]);
}

async function loadNotes(retryOnEmptyPage = true) {
  notesError.hidden = true;
  notesStatus.hidden = false;
  notesStatus.textContent = "Loading notes…";
  notesList.hidden = true;
  pagination.hidden = true;

  try {
    const response = await fetch(notesUrl());
    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }
    const body = await response.json();
    if (!body || !Array.isArray(body.items) || typeof body.total !== "number") {
      throw new Error("Unexpected response from server");
    }

    totalNotes = body.total;
    const clampedOffset = clampOffset(currentOffset, totalNotes);
    if (clampedOffset !== currentOffset) {
      currentOffset = clampedOffset;
      if (retryOnEmptyPage) {
        return loadNotes(false);
      }
    }

    cachedNotes = body.items;
    renderNotes(body.items);
  } catch (err) {
    const message =
      err instanceof TypeError
        ? "Could not reach the API. Is the server running?"
        : err instanceof Error
          ? err.message
          : "Failed to load notes";
    showListError(message);
  }
}

function startEdit(id) {
  editingNoteId = id;
  renderNotes(cachedNotes);
}

function cancelEdit() {
  editingNoteId = null;
  renderNotes(cachedNotes);
}

async function saveEdit(id, title, body, errorElement, submitButton) {
  errorElement.hidden = true;
  errorElement.textContent = "";

  const validationError = validateNoteFields(title, body);
  if (validationError) {
    errorElement.hidden = false;
    errorElement.textContent = validationError;
    return;
  }

  submitButton.disabled = true;

  try {
    const response = await fetch(`/notes/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), body: body.trim() }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const message =
        payload && typeof payload.error === "string"
          ? payload.error
          : `Request failed (${response.status})`;
      errorElement.hidden = false;
      errorElement.textContent = message;
      return;
    }

    editingNoteId = null;
    await refreshNotesAndStats();
  } catch (err) {
    const message =
      err instanceof TypeError
        ? "Could not reach the API. Is the server running?"
        : err instanceof Error
          ? err.message
          : "Failed to update note";
    errorElement.hidden = false;
    errorElement.textContent = message;
  } finally {
    submitButton.disabled = false;
  }
}

async function createNote(event) {
  event.preventDefault();
  clearFormError();

  const title = titleInput.value;
  const body = bodyInput.value;
  const validationError = validateNoteFields(title, body);

  if (validationError) {
    showFormError(validationError);
    return;
  }

  const submitButton = createForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    const response = await fetch("/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), body: body.trim() }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const message =
        payload && typeof payload.error === "string"
          ? payload.error
          : `Request failed (${response.status})`;
      showFormError(message);
      return;
    }

    titleInput.value = "";
    bodyInput.value = "";
    currentOffset = 0;
    await refreshNotesAndStats();
  } catch (err) {
    const message =
      err instanceof TypeError
        ? "Could not reach the API. Is the server running?"
        : err instanceof Error
          ? err.message
          : "Failed to create note";
    showFormError(message);
  } finally {
    submitButton.disabled = false;
  }
}

async function deleteNote(id) {
  notesError.hidden = true;

  if (editingNoteId === id) {
    editingNoteId = null;
  }

  try {
    const response = await fetch(`/notes/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const message =
        payload && typeof payload.error === "string"
          ? payload.error
          : `Delete failed (${response.status})`;
      showListError(message);
      return;
    }

    if (cachedNotes.length === 1 && currentOffset > 0) {
      currentOffset = Math.max(0, currentOffset - PAGE_SIZE);
    }

    await refreshNotesAndStats();
  } catch (err) {
    const message =
      err instanceof TypeError
        ? "Could not reach the API. Is the server running?"
        : err instanceof Error
          ? err.message
          : "Failed to delete note";
    showListError(message);
  }
}

function handleSearchInput() {
  currentSearch = searchInput.value;
  if (searchDebounceTimer !== null) {
    clearTimeout(searchDebounceTimer);
  }
  searchDebounceTimer = setTimeout(() => {
    searchDebounceTimer = null;
    editingNoteId = null;
    currentOffset = 0;
    loadNotes();
  }, SEARCH_DEBOUNCE_MS);
}

function changePage(delta) {
  const nextOffset = clampOffset(currentOffset + delta * PAGE_SIZE, totalNotes);
  if (nextOffset === currentOffset) {
    return;
  }
  currentOffset = nextOffset;
  editingNoteId = null;
  loadNotes();
}

createForm.addEventListener("submit", createNote);
searchInput.addEventListener("input", handleSearchInput);
pagePrev.addEventListener("click", () => changePage(-1));
pageNext.addEventListener("click", () => changePage(1));
refreshNotesAndStats();
