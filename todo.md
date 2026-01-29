# Sticky – Remaining Features

Features still to implement for the Sticky todo app.

---

## Cloud sync (Google)

- [ ] **Google OAuth (PKCE)**
  - [ ] Register app in Google Cloud Console (OAuth 2.0 client, redirect URI for custom protocol).
  - [ ] Implement PKCE flow in frontend (authorization URL, code verifier/challenge, token exchange).
  - [ ] Handle redirect via custom protocol (e.g. `com.sticky.todo://`) and parse auth code.
  - [ ] Store tokens securely (e.g. Tauri store or encrypted local file); support refresh token.

- [ ] **Google Drive sync**
  - [ ] Use Drive API (REST or JS client) to read/write a single file (e.g. `Sticky/todos.json`) in App Data folder (hidden app-specific folder).
  - [ ] Sync on app launch: if logged in, fetch remote file and merge with local (e.g. last-write-wins by `updated_at`).
  - [ ] Sync on todo change: debounced upload after edits.
  - [ ] Sync on app close: ensure pending changes are uploaded before exit.
  - [ ] Conflict resolution: last-write-wins using timestamps; optional “local vs remote” choice for edge cases.

- [ ] **Guest mode / offline**
  - [ ] If user skips login, keep current behavior: local-only storage, no sync.
  - [ ] Add “Sign in with Google” and “Continue as guest” (or “Use offline”) in UI when sync is implemented.
  - [ ] When logged in, show sync status (e.g. “Synced” / “Syncing…” / “Offline”) and optional “Sign out”.

---

## Optional app behavior

- [ ] **Auto-launch**
  - [ ] Option in settings (or first-run) to launch Sticky at system startup (e.g. via Tauri plugin or platform-specific auto-launch).
  - [ ] Persist preference and register/unregister with OS startup.

---

## Polish and UX (optional)

- [ ] **Settings / preferences**
  - [ ] Persist window position/size (or “last position”) so app reopens where user left it.
  - [ ] Optional: theme (dark/light) if you add a second theme later.
  - [ ] Optional: startup minimized to tray (if you add system tray).

- [ ] **System tray (optional)**
  - [ ] Minimize to tray instead of taskbar; show/hide window from tray icon.
  - [ ] Tray menu: Open, Pin, Quit.

- [ ] **Error and edge cases**
  - [ ] Handle read/write errors for `todos.json` (e.g. show message, retry).
  - [ ] Handle Drive API errors (network, quota, 401) and show user-friendly message or “Use offline”.

---

## Done (reference)

- Local todo storage (read/write `todos.json` in app data).
- Frameless window, transparent, always-on-top, pin, snap to corners, minimize, close.
- Sticky-note UI: add, complete, edit, delete todos; debounced save; done tasks not un-done.
- Taskbar visibility (minimize/restore from taskbar).
- MSI installer; app icon and all generated assets.
- Gitignore and Cargo.lock committed.
