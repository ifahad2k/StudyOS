# StudyOS

StudyOS is a focus-first desktop study environment for Windows built with Electron, React, TypeScript, and SQLite.

It combines:
- A session timer
- A constrained in-app browser
- A continuous-scroll PDF reader
- Recall prompts and review queue
- Focus and distraction analytics

## Current Version

- App version: `1.1.0`

## Key Features

- Focus timer with run/pause/end tracking
- Browser module with tabs, whitelist/block behavior, and distraction logging
- PDF reader with:
  - Continuous scrolling through full document
  - Zoom in/out
  - Bookmarks and notes
  - Fullscreen toggle
  - Saved reading state
- Recall workflow after sessions
- Streak and session analytics

## Tech Stack

- Electron + electron-vite
- React 19 + TypeScript
- better-sqlite3
- NSIS packaging via electron-builder

## Project Structure

- `app/` main desktop application
- `prototype/` UI prototype sandbox
- `app/src/main/` Electron main process modules
- `app/src/renderer/` React UI
- `app/src/preload/` secure renderer bridge

## Local Development

From `app/`:

```bash
npm install
npm run dev
```

Build app bundles:

```bash
npm run build
```

Create Windows installer:

```bash
npm run make
```

Generated artifacts are placed in `app/release/`.

## Packaging Output

For `1.1.0`, expected files are:
- `app/release/StudyOS Setup 1.1.0.exe`
- `app/release/StudyOS Setup 1.1.0.exe.blockmap`
- `app/release/win-unpacked/StudyOS.exe`

## Roadmap Ideas

- Richer browser controls (downloads/history manager)
- Better PDF text selection and highlights
- Auto-update pipeline with signed builds
- Deeper spaced-repetition scheduling

## License

No license file is currently defined. Add one before public distribution.
