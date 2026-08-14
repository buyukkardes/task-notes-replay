const notesList = document.getElementById("notes-list");
const notesStatus = document.getElementById("notes-status");
const notesError = document.getElementById("notes-error");

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

function showError(message) {
  notesError.hidden = false;
  notesError.textContent = message;
  notesList.hidden = true;
  notesStatus.hidden = true;
}

function renderNotes(notes) {
  notesError.hidden = true;
  notesStatus.hidden = true;
  notesList.hidden = false;
  notesList.replaceChildren();

  if (notes.length === 0) {
    notesStatus.hidden = false;
    notesStatus.textContent = "No notes yet. Create one via the API or the form in a later unit.";
    return;
  }

  for (const note of notes) {
    const item = document.createElement("li");
    item.className = "note-item";

    const title = document.createElement("h3");
    title.className = "note-title";
    title.textContent = note.title;

    const meta = document.createElement("p");
    meta.className = "note-meta";
    meta.textContent = `Created ${formatDate(note.createdAt)} · Updated ${formatDate(note.updatedAt)}`;

    const body = document.createElement("p");
    body.className = "note-body";
    body.textContent = note.body;

    item.append(title, meta, body);
    notesList.append(item);
  }
}

async function loadNotes() {
  notesError.hidden = true;
  notesStatus.hidden = false;
  notesStatus.textContent = "Loading notes…";
  notesList.hidden = true;

  try {
    const response = await fetch("/notes");
    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }
    const notes = await response.json();
    if (!Array.isArray(notes)) {
      throw new Error("Unexpected response from server");
    }
    renderNotes(notes);
  } catch (err) {
    const message =
      err instanceof TypeError
        ? "Could not reach the API. Is the server running?"
        : err instanceof Error
          ? err.message
          : "Failed to load notes";
    showError(message);
  }
}

loadNotes();
