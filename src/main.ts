import { invoke } from "@tauri-apps/api/core";
import {
  getCurrentWindow,
  currentMonitor,
  PhysicalPosition,
  PhysicalSize,
} from "@tauri-apps/api/window";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  updated_at: number;
  created_at?: number;
  completed_at?: number | null;
}

interface TodosPayload {
  todos: Todo[];
  updated_at: number;
}

const DEBOUNCE_MS = 400;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function now(): number {
  return Math.floor(Date.now() / 1000);
}

function formatDateTime(ts: number): string {
  const d = new Date(ts * 1000);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const dateStr = isToday ? "Today" : isYesterday ? "Yesterday" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
  const timeStr = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${dateStr} ${timeStr}`;
}

async function loadTodos(): Promise<TodosPayload> {
  return await invoke<TodosPayload>("read_todos");
}

async function saveTodos(payload: TodosPayload): Promise<void> {
  await invoke("write_todos", { payload });
}

function debouncedSave(payload: TodosPayload): void {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    saveTodos(payload).catch(console.error);
  }, DEBOUNCE_MS);
}

function renderTodo(item: Todo, listEl: HTMLUListElement, payload: TodosPayload, setPayload: (p: TodosPayload) => void): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "todo-item" + (item.completed ? " done" : "");
  li.dataset.id = item.id;

  const check = document.createElement("button");
  check.type = "button";
  check.className = "todo-check" + (item.completed ? " is-done" : "");
  check.setAttribute("aria-label", item.completed ? "Done" : "Mark complete");
  if (item.completed) {
    check.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12l5 5L20 7"/></svg>';
  }
  check.addEventListener("click", () => {
    if (item.completed) return;
    const todos = payload.todos.map((t) =>
      t.id === item.id
        ? { ...t, completed: true, updated_at: now(), completed_at: now() }
        : t
    );
    const next = { todos, updated_at: now() };
    setPayload(next);
    debouncedSave(next);
    renderList(listEl, next, setPayload);
  });

  const body = document.createElement("div");
  body.className = "todo-body";

  const row = document.createElement("div");
  row.className = "todo-row";

  const titleWrap = document.createElement("div");
  titleWrap.className = "todo-title-wrap";

  const title = document.createElement("textarea");
  title.className = "todo-title";
  title.rows = 1;
  title.value = item.title;
  title.title = item.title;
  title.placeholder = "Task...";
  function syncTitleHeight(): void {
    title.style.height = "auto";
    title.style.height = `${Math.max(22, title.scrollHeight)}px`;
  }
  title.addEventListener("input", syncTitleHeight);
  title.addEventListener("blur", () => {
    const v = title.value.trim();
    title.title = v;
    syncTitleHeight();
    const todos = v
      ? payload.todos.map((t) => (t.id === item.id ? { ...t, title: v, updated_at: now() } : t))
      : payload.todos.filter((t) => t.id !== item.id);
    const next = { todos, updated_at: now() };
    if (next.todos.length !== payload.todos.length || (next.todos.find((t) => t.id === item.id)?.title !== item.title)) {
      setPayload(next);
      debouncedSave(next);
      renderList(listEl, next, setPayload);
    }
  });
  title.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      title.blur();
    }
  });
  syncTitleHeight();

  titleWrap.appendChild(title);

  const del = document.createElement("button");
  del.type = "button";
  del.className = "todo-delete";
  del.setAttribute("aria-label", "Delete");
  del.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  del.addEventListener("click", () => {
    const todos = payload.todos.filter((t) => t.id !== item.id);
    const next = { todos, updated_at: now() };
    setPayload(next);
    debouncedSave(next);
    renderList(listEl, next, setPayload);
  });

  row.append(titleWrap, del);

  const meta = document.createElement("div");
  meta.className = "todo-meta";
  const createdAt = item.created_at ?? item.updated_at;
  meta.innerHTML = `<span class="todo-date">Added ${formatDateTime(createdAt)}</span>`;
  if (item.completed_at != null && item.completed_at > 0) {
    const doneSpan = document.createElement("span");
    doneSpan.className = "todo-date todo-date-done";
    doneSpan.textContent = ` · Done ${formatDateTime(item.completed_at)}`;
    meta.appendChild(doneSpan);
  }

  body.append(row, meta);
  li.append(check, body);
  return li;
}

function syncAllTitleHeights(listEl: HTMLUListElement): void {
  requestAnimationFrame(() => {
    listEl.querySelectorAll<HTMLTextAreaElement>(".todo-title").forEach((ta) => {
      ta.style.height = "auto";
      ta.style.height = `${Math.max(22, ta.scrollHeight)}px`;
    });
  });
}

function renderList(listEl: HTMLUListElement, payload: TodosPayload, setPayload: (p: TodosPayload) => void): void {
  listEl.innerHTML = "";
  payload.todos.forEach((item) => {
    listEl.appendChild(renderTodo(item, listEl, payload, setPayload));
  });
  syncAllTitleHeights(listEl);
}

async function init(): Promise<void> {
  const listEl = document.getElementById("todo-list") as HTMLUListElement;
  const formEl = document.getElementById("todo-form") as HTMLFormElement;
  const inputEl = document.getElementById("todo-input") as HTMLInputElement;
  const addTaskBtn = document.getElementById("add-task-btn");
  const addTaskWrap = formEl.querySelector(".add-task-wrap");

  let payload: TodosPayload = { todos: [], updated_at: 0 };
  try {
    payload = await loadTodos();
  } catch (e) {
    console.error("load todos", e);
  }

  const setPayload = (p: TodosPayload) => {
    payload = p;
  };

  renderList(listEl, payload, setPayload);

  addTaskBtn?.addEventListener("click", () => {
    addTaskWrap?.classList.add("open");
    requestAnimationFrame(() => inputEl.focus());
  });

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    const titleText = inputEl.value.trim();
    if (!titleText) return;
    inputEl.value = "";
    const ts = now();
    const todo: Todo = {
      id: genId(),
      title: titleText,
      completed: false,
      updated_at: ts,
      created_at: ts,
    };
    const next: TodosPayload = {
      todos: [...payload.todos, todo],
      updated_at: ts,
    };
    setPayload(next);
    debouncedSave(next);
    renderList(listEl, next, setPayload);

    listEl.scrollTop = listEl.scrollHeight;
    setTimeout(() => {
      addTaskWrap?.classList.remove("open");
    }, 2000);
  });

  const win = getCurrentWindow();

  // Restore window position and size from last session
  try {
    const state = await invoke<{ x: number; y: number; width: number; height: number } | null>("read_window_state");
    if (state) {
      await win.setPosition(new PhysicalPosition(state.x, state.y));
      await win.setSize(new PhysicalSize(state.width, state.height));
    }
  } catch (e) {
    console.error("restore window state", e);
  }

  // Save window state when moved, resized, or hidden (debounced)
  let windowStateTimeout: ReturnType<typeof setTimeout> | null = null;
  async function saveWindowState(): Promise<void> {
    try {
      const pos = await win.outerPosition();
      const size = await win.outerSize();
      await invoke("save_window_state", {
        state: { x: pos.x, y: pos.y, width: size.width, height: size.height },
      });
    } catch (e) {
      console.error("save window state", e);
    }
  }
  function debouncedSaveWindowState(): void {
    if (windowStateTimeout) clearTimeout(windowStateTimeout);
    windowStateTimeout = setTimeout(() => {
      windowStateTimeout = null;
      saveWindowState();
    }, 300);
  }
  win.onMoved(() => debouncedSaveWindowState());
  win.onResized(() => debouncedSaveWindowState());

  const pinBtn = document.getElementById("btn-pin");
  let isPinned = true;
  function updatePinIcon(): void {
    pinBtn?.classList.toggle("pinned", isPinned);
    pinBtn?.setAttribute("title", isPinned ? "Unpin window" : "Pin window");
    pinBtn?.setAttribute("aria-label", isPinned ? "Unpin window" : "Pin window");
  }
  pinBtn?.addEventListener("click", async () => {
    isPinned = !isPinned;
    await win.setAlwaysOnTop(isPinned);
    updatePinIcon();
  });
  updatePinIcon();

  document.getElementById("btn-minimize")?.addEventListener("click", () => win.minimize());
  document.getElementById("btn-close")?.addEventListener("click", () => win.hide());

  // On close (titlebar X, Alt+F4, taskbar): save position and hide to tray
  win.onCloseRequested(async (event) => {
    event.preventDefault();
    await saveWindowState();
    win.hide();
  });

  const snapBtn = document.getElementById("btn-snap");
  snapBtn?.addEventListener("click", (e) => e.stopPropagation());

  type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";
  async function snapToCorner(corner: Corner): Promise<void> {
    const monitor = await currentMonitor();
    if (!monitor) return;
    const size = await win.outerSize();
    const { position, size: monSize } = monitor;
    const x = position.x;
    const y = position.y;
    const w = size.width;
    const h = size.height;
    const sw = monSize.width;
    const sh = monSize.height;
    let px: number, py: number;
    switch (corner) {
      case "top-left":
        px = x;
        py = y;
        break;
      case "top-right":
        px = x + sw - w;
        py = y;
        break;
      case "bottom-left":
        px = x;
        py = y + sh - h;
        break;
      case "bottom-right":
        px = x + sw - w;
        py = y + sh - h;
        break;
      default:
        return;
    }
    await win.setPosition(new PhysicalPosition(px, py));
  }

  document.querySelectorAll(".snap-option").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const corner = (el as HTMLElement).dataset.corner as Corner;
      if (corner) snapToCorner(corner).catch(console.error);
    });
  });
}

init();
