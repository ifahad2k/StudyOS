# StudyOS — Complete Application Build Plan v2.0
### A Focus-First, Learning-Aware Study Environment for Windows

---

## TABLE OF CONTENTS

1. Project Philosophy & Architecture Principles
2. Design System
3. Extensible App Architecture
4. Feature Specifications (All Features)
   - 4.1 Fullscreen Focus Mode
   - 4.2 Study Timer
   - 4.3 App Blocker + Focus Monitor
   - 4.4 Distraction Intelligence Engine
   - 4.5 Built-in Browser
   - 4.6 PDF Viewer
   - 4.7 Active Recall Engine ⭐
   - 4.8 Study Streak System
   - 4.9 Quick Start (Friction Killer)
   - 4.10 Study Replay Mode
   - 4.11 Session Analytics Dashboard
   - 4.12 Settings Panel
5. Complete Database Schema
6. Complete IPC Communication Map
7. Plugin/Extension Architecture (Future-Proofing)
8. Build Phases (Week-by-Week)
9. Key Libraries & Tools
10. AI Builder Prompting Guide
11. Future Features Roadmap

---

## 1. Project Philosophy & Architecture Principles

**App Name:** StudyOS
**Platform:** Windows 10/11
**Framework:** Electron.js + React + TypeScript
**Philosophy:** StudyOS is not a timer app. It is a complete study operating system. Every feature exists to answer one question: *Did you actually learn something today?*

### Core Architectural Principles (Read Before Building Anything)

These principles exist so the app can grow without being rewritten:

**Principle 1 — Event-Driven Core**
Every meaningful action in the app emits an event to a central EventBus. Features listen to events independently. Adding a new feature never requires modifying existing features — only subscribing to existing events.

```
Example: When the timer pauses, it emits → { type: "TIMER_PAUSED", reason, timestamp }
The Distraction Intelligence module listens to this.
The Study Replay module listens to this.
The Streak module listens to this.
None of them know about each other.
```

**Principle 2 — Feature Modules**
Each feature is a self-contained module folder with:
- Its own React components
- Its own IPC handlers
- Its own DB queries
- Its own Zustand slice

Adding a new feature = adding a new folder. Never touching old code.

**Principle 3 — Schema-First DB**
Every table has `created_at`, `updated_at`, and a `metadata` JSON column. The metadata column absorbs future fields without schema migrations.

**Principle 4 — Settings as a Registry**
All feature configuration lives in the `settings` table as key-value JSON. Features declare their default config on first run. This means new settings can be added without schema changes.

**Principle 5 — UI Slots**
The layout has named "slots" where panels can mount:
- `sidebar-nav` — navigation icons
- `topbar-right` — persistent widgets (timer, streak badge)
- `main-panel` — the large content area
- `overlay` — full-screen takeover panels
- `modal` — dialog boxes
- `toast` — notification stack

New features use these slots. They don't restructure the layout.

---

## 2. Design System

### Color Palette
```
Background Primary:    #0D0F14   (near-black slate — main canvas)
Background Secondary:  #13161E   (card surfaces, panels)
Background Tertiary:   #1A1E2A   (elevated elements, hover states)
Background Glass:      rgba(19, 22, 30, 0.85)  (overlay panels, blur backgrounds)
Border Subtle:         #252A38
Border Active:         #00D4AA33  (glowing border for active elements)

Accent Primary:        #00D4AA   (cyan-green — timer running, success, active)
Accent Secondary:      #4F8EF7   (blue — browser chrome, links)
Accent Recall:         #A78BFA   (purple — Active Recall features)
Accent Warning:        #F5A623   (orange — paused, caution)
Accent Danger:         #E05A5A   (red — blocked, danger)
Accent Streak:         #F59E0B   (amber/gold — streak, gamification)
Accent Replay:         #34D399   (emerald — replay mode timeline)

Text Primary:          #E8EAF0
Text Secondary:        #8B90A0
Text Muted:            #4A5068

Gradient Focus:        linear-gradient(135deg, #00D4AA15, #4F8EF715)
Gradient Danger:       linear-gradient(135deg, #E05A5A20, #F5A62320)
```

### Typography
```
Timer / Data:          "JetBrains Mono"  — monospaced precision
Headings / UI:         "Sora"            — geometric, clean
Body / Reading:        "DM Sans"         — neutral, comfortable
Labels / Tags:         "JetBrains Mono"  — for metrics, codes, timestamps
```

### Spacing Scale (8px base unit)
```
xs:   4px
sm:   8px
md:   16px
lg:   24px
xl:   32px
2xl:  48px
3xl:  64px
```

### Core UI Rules
- Single persistent window. Always-on-top during active sessions.
- Left sidebar: icon nav (64px wide), expands to labeled nav (200px) on hover or setting
- Top bar: 48px tall, always shows timer + session state + streak badge
- Fullscreen mode removes top bar and sidebar — only content + a floating minimal HUD
- Smooth CSS transitions on all panel switches (200ms ease)
- All overlays use backdrop-filter blur for depth
- Toasts stack in bottom-right, auto-dismiss after 4s unless actionable

---

## 3. Extensible App Architecture

```
StudyOS/
├── main/                              # Electron main process (Node.js/TS)
│   ├── main.ts                        # Bootstrap: window, tray, startup
│   ├── eventBus.ts                    # Central event emitter (main process)
│   ├── db/
│   │   ├── connection.ts              # SQLite connection singleton
│   │   ├── schema.sql                 # Full DB schema
│   │   └── migrations/               # Version migration scripts
│   │       └── v1_initial.sql
│   ├── modules/                       # Each feature is a module
│   │   ├── timer/
│   │   │   ├── timer.service.ts       # Timer logic
│   │   │   └── timer.ipc.ts          # IPC handlers for timer
│   │   ├── focusMonitor/
│   │   │   ├── focusMonitor.service.ts
│   │   │   └── focusMonitor.ipc.ts
│   │   ├── distractionIntel/
│   │   │   ├── distractionIntel.service.ts
│   │   │   └── distractionIntel.ipc.ts
│   │   ├── browser/
│   │   │   ├── browser.service.ts     # BrowserView lifecycle
│   │   │   ├── tabTracker.service.ts  # Tab time tracking
│   │   │   └── browser.ipc.ts
│   │   ├── activeRecall/
│   │   │   ├── activeRecall.service.ts
│   │   │   └── activeRecall.ipc.ts
│   │   ├── streak/
│   │   │   ├── streak.service.ts
│   │   │   └── streak.ipc.ts
│   │   ├── quickStart/
│   │   │   ├── quickStart.service.ts
│   │   │   └── quickStart.ipc.ts
│   │   ├── sessionReplay/
│   │   │   ├── replay.service.ts      # Event timeline recorder
│   │   │   └── replay.ipc.ts
│   │   └── pdf/
│   │       └── pdf.ipc.ts
│   └── utils/
│       ├── windowManager.ts           # Fullscreen, always-on-top, window state
│       └── processDetector.ts         # Windows foreground process detection
│
├── renderer/                          # React + TypeScript frontend
│   ├── main.tsx                       # React root
│   ├── App.tsx
│   ├── eventBus.ts                    # Renderer-side event bus (mirrors main)
│   ├── layout/
│   │   ├── AppShell.tsx               # Root layout with slots
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── FullscreenHUD.tsx          # Minimal floating HUD for fullscreen mode
│   ├── modules/                       # Feature UI modules (mirrors main/modules)
│   │   ├── timer/
│   │   │   ├── TimerDisplay.tsx
│   │   │   ├── SessionControls.tsx
│   │   │   ├── SubjectPicker.tsx
│   │   │   └── timerStore.ts          # Zustand slice
│   │   ├── browser/
│   │   │   ├── BrowserShell.tsx
│   │   │   ├── TabBar.tsx
│   │   │   ├── AddressBar.tsx
│   │   │   ├── BlockedSiteOverlay.tsx
│   │   │   └── browserStore.ts
│   │   ├── pdf/
│   │   │   ├── PdfViewer.tsx
│   │   │   ├── PdfToolbar.tsx
│   │   │   ├── PdfSidebar.tsx
│   │   │   └── pdfStore.ts
│   │   ├── activeRecall/
│   │   │   ├── RecallPrompt.tsx       # Post-session modal
│   │   │   ├── RecallCard.tsx         # Pre-session review card
│   │   │   ├── RevisionQueue.tsx      # Queue management panel
│   │   │   └── recallStore.ts
│   │   ├── distractionIntel/
│   │   │   ├── DistractionInsights.tsx
│   │   │   ├── PatternAlert.tsx
│   │   │   └── distractionStore.ts
│   │   ├── streak/
│   │   │   ├── StreakBadge.tsx        # TopBar widget
│   │   │   ├── StreakPanel.tsx        # Full streak view
│   │   │   └── streakStore.ts
│   │   ├── quickStart/
│   │   │   ├── QuickStartButton.tsx
│   │   │   └── quickStartStore.ts
│   │   ├── sessionReplay/
│   │   │   ├── ReplayTimeline.tsx
│   │   │   ├── ReplayEvent.tsx
│   │   │   └── replayStore.ts
│   │   └── analytics/
│   │       ├── Dashboard.tsx
│   │       ├── HeatmapCalendar.tsx
│   │       ├── TabUsageChart.tsx
│   │       ├── SubjectBreakdown.tsx
│   │       └── analyticsStore.ts
│   ├── settings/
│   │   ├── SettingsPanel.tsx
│   │   ├── WhitelistManager.tsx
│   │   ├── BlocklistManager.tsx
│   │   └── sections/                  # Each settings section is a component
│   │       ├── AppearanceSettings.tsx
│   │       ├── PomodoroSettings.tsx
│   │       ├── RecallSettings.tsx
│   │       └── StreakSettings.tsx
│   └── shared/                        # Shared UI components
│       ├── Button.tsx
│       ├── Modal.tsx
│       ├── Toast.tsx
│       ├── Tooltip.tsx
│       └── Badge.tsx
│
├── db/
│   └── schema.sql
│
├── assets/
│   ├── sounds/
│   │   ├── session-start.mp3
│   │   ├── session-end.mp3
│   │   ├── recall-prompt.mp3
│   │   └── streak-achieved.mp3
│   └── icons/
│
└── electron-builder.config.js         # Installer config
```

---

## 4. Feature Specifications

---

### 4.1 Fullscreen Focus Mode

**Purpose:** Eliminate all OS-level visual distractions (taskbar, other windows) when studying.

**How It Works:**

When a session starts, the user can optionally enter Fullscreen Focus Mode:

```typescript
// windowManager.ts
function enterFullscreenFocus() {
  mainWindow.setFullScreen(true);
  mainWindow.setAlwaysOnTop(true, "screen-saver"); // Highest z-order on Windows
  mainWindow.setKiosk(false);  // Kiosk = true would be too extreme (can't Alt+F4)
  // Hide Windows taskbar via shell command (optional, reversible)
  exec('powershell -command "& {$p = \'HKCU:SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StuckRects3\'; $v = (Get-ItemProperty -Path $p).Settings; $v[8] = 3; Set-ItemProperty -Path $p -Name Settings -Value $v; Stop-Process -f -ProcessName explorer}"');
  emitEvent("FULLSCREEN_ENTERED");
}

function exitFullscreenFocus() {
  mainWindow.setFullScreen(false);
  mainWindow.setAlwaysOnTop(false);
  // Restore taskbar
  emitEvent("FULLSCREEN_EXITED");
}
```

**Fullscreen HUD (Floating Minimal Overlay):**
In fullscreen mode, the sidebar and topbar are hidden. A small floating HUD appears in the top-right corner showing:
```
[⏱ 45:23] [📗 Physics] [🔥 6d] [⊠]
```
- Timer elapsed
- Current subject
- Streak badge
- Exit fullscreen button (with confirmation if session is active)

HUD fades to 20% opacity after 3 seconds of inactivity. Returns to full opacity on mouse-near.

**Toggling:**
- Keyboard shortcut: `F11` to enter/exit fullscreen
- Button in TopBar
- Can be set to auto-enter fullscreen on session start (setting)
- Exiting fullscreen mid-session shows: "Exit fullscreen? Your session will continue."

---

### 4.2 Study Timer

**Behavior:**
- Displays HH:MM:SS in large JetBrains Mono in TopBar (always visible outside fullscreen, in HUD inside fullscreen)
- Three modes: **Stopwatch** (count up), **Pomodoro** (configurable cycles), **Countdown** (target duration)
- Subject tag required before starting — chosen from history or typed fresh
- Timer state machine: `idle → running → paused → running → ended`
- Visual state: Running = cyan glow, Paused = orange, Ended = green flash animation

**Session Lifecycle Events (emitted to EventBus):**
```
SESSION_STARTED    { sessionId, subject, mode, startedAt }
SESSION_PAUSED     { sessionId, reason, pausedAt }
SESSION_RESUMED    { sessionId, resumedAt }
SESSION_ENDED      { sessionId, endedAt, actualSeconds }
POMODORO_CYCLE     { sessionId, cycleNumber, type: 'work'|'break' }
```

**Controls:**
- Start / Pause / Resume / End Session buttons
- Shortcuts: `Space` = start/pause, `Esc` = end with confirmation dialog

---

### 4.3 App Blocker + Focus Monitor

**How It Works:**

Polls foreground window every 1500ms using a native call:

```typescript
// processDetector.ts
import { execSync } from "child_process";

function getForegroundWindowProcess(): string {
  const result = execSync(
    `powershell -command "Get-Process | Where-Object {$_.MainWindowHandle -eq (Add-Type '[DllImport(\"user32.dll\")] public static extern IntPtr GetForegroundWindow();' -Name W -PassThru)::GetForegroundWindow()} | Select-Object -ExpandProperty Name"`,
    { encoding: "utf8" }
  ).trim();
  return result.toLowerCase(); // e.g., "discord"
}
```

**App Switch Confirmation Flow:**
1. Foreground leaves StudyOS while session is running
2. A full-screen dark overlay appears instantly (before the other app is visible)
3. Overlay shows:
   - App name + icon (looked up from process list)
   - "Are you sure you want to open [Discord]?"
   - "Your timer will pause and this will be logged."
   - Buttons: **"Stay Focused"** | **"Open Anyway — I know"**
4. "Stay Focused" → brings StudyOS back to front, session continues
5. "Open Anyway" → logs exit event, pauses timer, lets them proceed
6. On return to StudyOS → toast: *"Welcome back. Away for 6m 14s. Resume when ready."*

**Events emitted:**
```
FOCUS_LOST          { appName, lostAt }
FOCUS_RETURNED      { appName, returnedAt, awaySeconds }
APP_BLOCKED_ATTEMPT { appName, attemptedAt }
```

---

### 4.4 Distraction Intelligence Engine

**Purpose:** Don't just block distractions — understand them. Turn the data into insight.

**What It Tracks:**

Every time the user tries to open a blocked app or blocked URL, an event is stored:
```
{ timestamp, type: 'app'|'url', target, session_elapsed_seconds, session_id }
```

**Metrics Displayed (in Analytics > Distraction tab):**

**1. Distraction Attempts / Hour**
```
This session: 3.2 attempts/hour
Your average: 1.8 attempts/hour
```
Shown as a colored gauge: green (<1), yellow (1–3), red (>3).

**2. Distraction Timeline (per session)**
A horizontal bar showing the session timeline. Red tick marks appear at each distraction attempt. Clusters become visually obvious.

**3. Pattern Detection**
Computed nightly from the last 14 days of sessions:

```typescript
// distractionIntel.service.ts
function detectPatterns(attempts: DistractionAttempt[]): Pattern[] {
  // Group attempts by elapsed_minutes bucket (every 5 min)
  // Find buckets with significantly above-average attempts
  // Return human-readable insight strings
  return [
    { message: "You typically try to open YouTube after ~18 minutes of studying", confidence: 0.82 },
    { message: "Discord attempts spike in the first 5 minutes of sessions", confidence: 0.74 },
  ];
}
```

Patterns are shown as notification cards in the Analytics panel and as a subtle pre-session reminder:
> "Heads up — you usually get distracted around 18 minutes in. Push through it today."

**4. Most-Attempted Blocked Content**
Ranked list: `YouTube.com (14 attempts this week)`, `Discord (9)`, `Steam (3)`

**Events this module listens to:**
```
APP_BLOCKED_ATTEMPT, BROWSER_BLOCKED_URL
```

**Events this module emits:**
```
DISTRACTION_PATTERN_DETECTED  { pattern, confidence }
```

---

### 4.5 Built-in Browser

**Architecture:**
Electron `BrowserView` per tab. Each view is managed in the main process. Tab state is synced to renderer via IPC.

**Chrome Profile Persistence:**
```typescript
const view = new BrowserView({
  webPreferences: {
    partition: "persist:studyos-user",  // Persists across app restarts
    contextIsolation: true,
  }
});
```
User signs into Google once inside the app. Gmail, Drive, Docs, YouTube (whitelisted) all stay signed in forever.

**URL Filtering:**
```typescript
view.webContents.on("will-navigate", (event, url) => {
  if (!isWhitelisted(url)) {
    event.preventDefault();
    mainWindow.webContents.send("browser:site-blocked", { url, domain: getDomain(url) });
    emitEvent("BROWSER_BLOCKED_URL", { url, sessionId: currentSessionId, timestamp: Date.now() });
  }
});
// Also handle: will-redirect, new-window, did-start-navigation
```

**Tab Time Tracking:**
- A 1-second setInterval in main process adds 1 second to the active tab's `active_seconds` counter
- Counter pauses when the session timer pauses
- Flushed to `tab_sessions` table when tab closes or session ends

**Tab Bar UI:**
- VS Code-style compact tabs: favicon + truncated title
- Drag to reorder (HTML5 drag API on tab elements)
- Middle-click to close
- Right-click context menu: Duplicate, Pin, Close, Close Others

**Blocked Site Overlay (inside browser panel):**
- Clean centered card with domain name, padlock-crossed icon
- "This site isn't in your study whitelist"
- Button: "Add to Whitelist" (opens whitelist editor pre-filled)
- Button: "One-Time Bypass" (logs exception, allows once, notifies distraction tracker)

**Events emitted:**
```
BROWSER_TAB_OPENED   { tabId, url, domain }
BROWSER_TAB_CLOSED   { tabId, activeSeconds }
BROWSER_BLOCKED_URL  { url, domain, sessionId }
BROWSER_BYPASS_USED  { url }
```

---

### 4.6 PDF Viewer (Sumatra-style)

Built with PDF.js. Philosophy: keyboard-first, zero clutter, fast.

**Layout:**
```
[Left Sidebar — toggleable]      [Main Reading Area]
  📄 Thumbnails                    Continuous vertical scroll
  🔖 Bookmarks                     OR page-by-page mode
  📑 Table of Contents             OR two-page spread
  🖊 Annotations list
```

**Toolbar (top, minimal dark strip):**
```
[📂] [← →] [Page 12/240] [−  115%  +] [↔ Fit] [🔍] [☾ Night] [📑] [⛶ Focus Read]
```

**Keyboard Shortcuts:**
```
J / K or ↑↓:    Scroll
Space / Shift+Space: Page down/up
Ctrl+F:         Search
Ctrl+G:         Go to page
Ctrl++ / −:     Zoom
F:              Fit width
B:              Toggle sidebar
R:              Rotate page
N:              Night mode toggle
F11:            Focus read mode (hides everything except the page)
Ctrl+D:         Bookmark current page
```

**Persistence per file (stored in SQLite by file path hash):**
- Last scroll position
- Zoom level
- Sidebar open/closed state
- Bookmarks and annotations

**Annotation System:**
- Highlight text (4 color options: yellow, green, pink, blue)
- Sticky note on any page position
- Stored in `pdf_annotations` table — never modifies the original PDF file
- Annotations visible as colored markers in the thumbnail sidebar

**Focus Read Mode:**
- Hides everything except the PDF page
- Thin progress bar at bottom (current page / total)
- Press Esc or F11 to exit

**Events emitted:**
```
PDF_OPENED       { filePath, fileName, totalPages }
PDF_CLOSED       { filePath, timeSpentSeconds }
PDF_ANNOTATED    { filePath, page, type }
```

---

### 4.7 Active Recall Engine ⭐ (Most Important Feature)

**Philosophy:** Tracking time is easy. Tracking understanding is what actually matters. This feature ensures every session produces knowledge artifacts, not just logged minutes.

#### Post-Session Recall Prompt

Triggered automatically when a session ends (after the "Good job!" moment, not before).

**The Prompt Modal (full-screen overlay, cannot be skipped without penalty):**

```
╔══════════════════════════════════════════════════════╗
║  SESSION COMPLETE — Physics — 1h 23m                 ║
║                                                       ║
║  Before you close, take 2 minutes to recall.          ║
║  This is the most important part of studying.         ║
║                                                       ║
║  ✏️ What are 3 things you learned today?              ║
║  ┌───────────────────────────────────────────────┐   ║
║  │ 1. _______________________________________    │   ║
║  │ 2. _______________________________________    │   ║
║  │ 3. _______________________________________    │   ║
║  └───────────────────────────────────────────────┘   ║
║                                                       ║
║  ❓ What are 2 things you're still unsure about?      ║
║  ┌───────────────────────────────────────────────┐   ║
║  │ 1. _______________________________________    │   ║
║  │ 2. _______________________________________    │   ║
║  └───────────────────────────────────────────────┘   ║
║                                                       ║
║  🏷 Tag this to subject:  [Physics ▼]                 ║
║                                                       ║
║  [Skip — lose 5 streak points]   [Save Recall →]     ║
╚══════════════════════════════════════════════════════╝
```

Skipping is allowed but costs streak points — this creates gentle accountability without being oppressive.

All entries are stored linked to the session.

#### Pre-Session Recall Review

Before starting the next session on the same subject, the app shows a review card:

```
╔══════════════════════════════════════════════════════╗
║  📖 LAST TIME IN PHYSICS (2 days ago)                ║
║                                                       ║
║  You learned:                                         ║
║  • Newton's 3rd law applications in fluid systems     ║
║  • How drag force scales with velocity squared        ║
║  • Bernoulli's principle derivation                   ║
║                                                       ║
║  You weren't sure about:                              ║
║  • Why the continuity equation assumes incompressibility║
║  • When to use gauge vs absolute pressure             ║
║                                                       ║
║  These 2 questions are in your Revision Queue.       ║
║                                                       ║
║  [Start Session →]            [Review Queue First]   ║
╚══════════════════════════════════════════════════════╝
```

#### Revision Queue

A dedicated panel in the sidebar showing all unresolved questions across all subjects.

**Queue item structure:**
```
Subject: Physics
Created: 2 days ago (from session #47)
Question: "Why does the continuity equation assume incompressibility?"
Status: Unresolved
[Mark Resolved ✓]   [Snooze 3 days]   [Delete]
```

**Queue behavior:**
- Items are sorted by age (oldest unresolved first)
- Resolved items are moved to an archive with the resolution date
- Snoozed items reappear after the snooze period
- Badge on sidebar icon shows count of unresolved items
- Weekly summary: "You resolved 4 of 7 revision items this week"

**Database tables used:**
```
recall_entries, revision_queue
```

**Events emitted:**
```
RECALL_SUBMITTED       { sessionId, learnedCount, questionsCount }
RECALL_SKIPPED         { sessionId, streakPenalty }
REVISION_RESOLVED      { itemId }
REVISION_SNOOZED       { itemId, snoozeUntil }
```

---

### 4.8 Study Streak System (Smart Gamification)

**Philosophy:** Streaks should reward consistency, not obsession. A 19-minute session shouldn't count. A focused 25-minute session should.

#### What Counts as a Valid Study Day

A day counts toward the streak if **all three conditions** are met:
1. At least **20 minutes** of actual study time (pause time excluded)
2. At least **one completed session** (session was formally ended, not just abandoned)
3. Focus score ≥ 40 (not severely distracted — calculated below)

#### Focus Score Formula
```
focus_score = 100
  - (pause_count × 3)                    # Each pause costs 3 points
  - (distraction_attempts × 5)           # Each blocked attempt costs 5 points
  - (bypass_count × 15)                  # Each bypass costs 15 points
  + (recall_submitted ? 10 : 0)          # Bonus for submitting recall

Clamped to [0, 100]
```

#### Streak Display (TopBar Badge)
```
[🔥 6] — amber flame icon + current streak number
```
Tapping/clicking the badge opens the Streak Panel.

#### Streak Panel
```
Current Streak:   🔥 6 days
Best Streak:      14 days (March 2025)
Total Study Days: 47

THIS WEEK:
Mon ✅  Tue ✅  Wed ✅  Thu ✅  Fri ✅  Sat ⬜  Sun (Today) ⏳

[Heatmap calendar — last 90 days]

STREAK HISTORY:
▸ Current: 6 days (started May 12)
▸ Previous: 14 days (Feb 20 – Mar 6)
▸ Before that: 9 days
```

#### Streak Protection (Grace Rules)
- **1 Grace Day per 7-day streak** — missing one day doesn't immediately break a streak ≥7 days. The grace is consumed silently.
- Grace used = shown as a 🛡️ icon on the calendar that day.
- Grace can only be used once per streak. Two consecutive misses always breaks.

#### Milestone Notifications (non-intrusive toast)
```
🔥 7-day streak! You've studied every day this week.
🔥 30-day streak! You're building a real habit.
```

**Events emitted:**
```
STREAK_UPDATED       { current, best, graceUsed }
STREAK_BROKEN        { previous, newStreak: 0 }
STREAK_MILESTONE     { milestone, current }
```

---

### 4.9 Quick Start — Friction Killer

**Philosophy:** The hardest part of studying is starting. Every decision removed from the start flow is a win.

#### Quick Start Button

Shown prominently on the home/idle screen. One single large button:

```
┌─────────────────────────────────────────┐
│                                          │
│   ▶  QUICK START                         │
│   Continue Physics · Last PDF: ch12.pdf  │
│   Restore 3 tabs · Pomodoro 25m          │
│                                          │
└─────────────────────────────────────────┘
```

**What Quick Start does automatically:**
1. Loads the **last used subject** as the session subject
2. Restores all **browser tabs** from the last session (using saved tab state)
3. Re-opens the **last PDF** at the exact last scroll position
4. Starts the **timer immediately** (in the user's preferred mode)
5. If Pomodoro mode, starts the first 25-minute cycle
6. If fullscreen-on-start is enabled, enters fullscreen

**The user goes from idle → studying in 1 click.**

**Custom Quick Start Profiles:**
Users can save up to 3 Quick Start profiles:
```
Profile 1: "Physics Deep Dive" — Pomodoro, whitelist preset A, specific PDFs
Profile 2: "Project Work" — Stopwatch, browser tabs for GitHub/Docs
Profile 3: "Morning Review" — 20-min countdown, revision queue first
```

**Last Session State (stored in SQLite `quick_start_state` table):**
```json
{
  "subject": "Physics",
  "mode": "pomodoro",
  "browser_tabs": [
    { "url": "https://claude.ai", "title": "Claude" },
    { "url": "https://youtube.com/watch?v=abc", "title": "Fluid Dynamics Lecture" }
  ],
  "last_pdf": {
    "path": "C:/Users/User/Documents/Physics/ch12.pdf",
    "page": 47,
    "zoom": 115
  }
}
```

**Events emitted:**
```
QUICK_START_TRIGGERED   { profileId, restoredTabs, restoredPdf }
SESSION_STATE_SAVED     { state }
```

---

### 4.10 Study Replay Mode

**Philosophy:** Show the user *exactly* what happened during a session — like a GPS track but for your focus.

#### How It Works

During every session, the **Session Replay Recorder** listens to all EventBus events and stores them as a timestamped timeline:

```typescript
// replay.service.ts
eventBus.on("*", (event) => {
  if (currentSession) {
    db.run(
      `INSERT INTO session_events (session_id, event_type, event_data, occurred_at) VALUES (?, ?, ?, ?)`,
      [currentSession.id, event.type, JSON.stringify(event.data), Date.now()]
    );
  }
});
```

#### Replay Viewer (accessible from session history)

A horizontal timeline visualization of the full session:

```
Session: Physics — May 19, 2025 — 1h 23m

0:00         15:00         30:00         45:00         1:00:00       1:23:00
├─────────────────╮─────────╮──────────────────────────────╮──────────┤
                  ⏸          ⏸                              ⚠️

LEGEND:
━━━  Studying (Timer running)
╌╌╌  Paused
⏸    Manual pause (at 14:32 and 31:05)
⚠️   Focus lost (at 1:02:44 — tried to open Discord)
🌐   Tab switch events (shown as dots)
📄   PDF opened (shown as bookmark)
```

**Clicking any event on the timeline expands it:**
```
⚠️ 1:02:44 — Focus Attempt
You tried to open Discord.
You chose "Stay Focused" and returned in 12 seconds.
Impact: 0 seconds lost (you resisted).
```

```
⏸ 14:32 — Manual Pause
Paused for 3 minutes 41 seconds.
Reason: Not recorded.
```

```
🌐 22:15 — Tab Activity
Switched to: YouTube Music — "Lo-fi beats playlist"
Time on tab: 18 minutes
```

**Summary card below timeline:**
```
Total Focus Time:      1h 23m
Effective Study Time:  1h 16m  (excludes pauses)
Pause Count:           2
Focus Loss Attempts:   1 (resisted)
Most-used tab:         Claude.ai (38 min)
Focus Score:           87/100 — Excellent
```

**Events this module listens to:** ALL events on EventBus.
**Events this module emits:** None (read-only observer).

---

### 4.11 Session Analytics Dashboard

**Tabs in Analytics panel:**

#### Overview
- Today's total study time (large display)
- Session list for today (collapsible cards)
- Focus score trend (last 7 days sparkline)
- Streak widget

#### Weekly / Monthly
- Bar chart: hours per day (Recharts)
- Heatmap calendar: last 90 days, colored by study duration
- Longest session this period
- Average session length

#### Distraction Report
- Distraction Attempts / Hour gauge
- Distraction timeline chart (attempts over elapsed time, averaged)
- Pattern detection insights ("You struggle most after 18 minutes")
- Most-attempted blocked apps/sites ranking

#### Tab Intelligence
- Time per domain (donut chart)
- Table: Domain | Total Time | Sessions | Last Visit
- Top 5 most visited study sites

#### Subject Breakdown
- Time per subject tag (bar chart + donut)
- Sessions per subject
- Recall completion rate per subject
- Unresolved revision items per subject

#### Recall & Revision
- Total recall entries submitted
- Resolution rate: "You resolve 68% of your revision questions"
- Oldest unresolved question
- Recall submission streak ("You've done recall after 12 consecutive sessions")

#### Export
- Export all data as CSV (one file per table)
- Export session summary as PDF report

---

### 4.12 Settings Panel

Organized into sections, each section is its own React component that can be added/removed independently:

#### General
- App name display (customize if desired)
- Language (English only for now — hook for future i18n)
- Launch on Windows startup (toggle — writes to registry)
- Auto-start session on launch (toggle)
- Default session mode (Stopwatch / Pomodoro / Countdown)
- Default subject (pre-fills subject picker)

#### Fullscreen & Window
- Auto-enter fullscreen on session start (toggle)
- Hide taskbar in fullscreen (toggle — requires admin on some systems)
- Fullscreen HUD position (top-left / top-right / bottom-right)
- HUD opacity when idle (10%–80% slider)
- Always on top during sessions (toggle)

#### Timer & Pomodoro
- Pomodoro work duration (default: 25 min)
- Short break duration (default: 5 min)
- Long break duration (default: 15 min)
- Cycles before long break (default: 4)
- Auto-start breaks (toggle)
- Sound on cycle change (toggle)

#### Active Recall
- Show recall prompt after sessions (toggle)
- Minimum session length before showing prompt (default: 15 min)
- Recall skip penalty (streak points lost — 0 to disable)
- Show pre-session review (toggle)
- Revision queue reminder frequency (Daily / Weekly / Never)

#### Streak
- Minimum session length for streak (default: 20 min)
- Minimum focus score for streak (default: 40)
- Grace days per 7-day streak (default: 1, max: 2)
- Milestone notifications (toggle)

#### Browser & Whitelist
- Default homepage (shown in new tab)
- Whitelist editor (add/remove/toggle entries)
- Wildcard support (*.edu, *.ac.uk)
- Import / Export whitelist as JSON
- One-time bypass limit per session (0 = unlimited)

#### Blocklist
- App blocklist editor
- Process picker (shows running processes for easy add)
- Sensitivity: "Pause on ANY focus loss" vs "Only pause on blocklisted apps"

#### Appearance
- Accent color (5 preset options: Cyan, Blue, Purple, Green, Amber)
- Font size scale (100% / 115% / 130%)
- Sidebar mode (Auto-expand / Always expanded / Always icon-only)
- Animations (Enabled / Reduced)

#### Data & Privacy
- Export all data (ZIP of CSV files)
- Delete all session data (with confirmation)
- Delete recall entries only
- Data location (show path to SQLite DB file)

---

## 5. Complete Database Schema

```sql
-- ─────────────────────────────────────
-- CORE SESSIONS
-- ─────────────────────────────────────

CREATE TABLE sessions (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  subject              TEXT NOT NULL,
  mode                 TEXT NOT NULL CHECK(mode IN ('stopwatch','pomodoro','countdown')),
  started_at           DATETIME NOT NULL,
  ended_at             DATETIME,
  planned_seconds      INTEGER,
  actual_seconds       INTEGER DEFAULT 0,
  pause_count          INTEGER DEFAULT 0,
  pause_total_seconds  INTEGER DEFAULT 0,
  distraction_attempts INTEGER DEFAULT 0,
  bypass_count         INTEGER DEFAULT 0,
  focus_score          REAL,
  recall_submitted     BOOLEAN DEFAULT 0,
  fullscreen_used      BOOLEAN DEFAULT 0,
  quick_start_used     BOOLEAN DEFAULT 0,
  metadata             TEXT DEFAULT '{}'   -- JSON for future fields
);

-- ─────────────────────────────────────
-- SESSION EVENTS (Replay Timeline)
-- ─────────────────────────────────────

CREATE TABLE session_events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id   INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL,    -- e.g. 'TIMER_PAUSED', 'BROWSER_BLOCKED_URL', etc.
  event_data   TEXT DEFAULT '{}', -- JSON payload
  occurred_at  INTEGER NOT NULL,  -- Unix timestamp in ms
  metadata     TEXT DEFAULT '{}'
);

CREATE INDEX idx_session_events_session ON session_events(session_id);
CREATE INDEX idx_session_events_type ON session_events(event_type);

-- ─────────────────────────────────────
-- PAUSES
-- ─────────────────────────────────────

CREATE TABLE pauses (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id       INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  reason           TEXT CHECK(reason IN ('manual','focus_lost','blocked_app','pomodoro_break','fullscreen_exit')),
  app_name         TEXT,
  paused_at        DATETIME NOT NULL,
  resumed_at       DATETIME,
  duration_seconds INTEGER,
  metadata         TEXT DEFAULT '{}'
);

-- ─────────────────────────────────────
-- DISTRACTION ATTEMPTS
-- ─────────────────────────────────────

CREATE TABLE distraction_attempts (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id            INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
  type                  TEXT NOT NULL CHECK(type IN ('app','url')),
  target                TEXT NOT NULL,   -- app name or URL
  domain                TEXT,
  elapsed_seconds       INTEGER,         -- how far into session when this happened
  was_bypassed          BOOLEAN DEFAULT 0,
  user_returned_seconds INTEGER,         -- seconds until user came back (if app attempt)
  attempted_at          DATETIME NOT NULL,
  metadata              TEXT DEFAULT '{}'
);

CREATE INDEX idx_distraction_session ON distraction_attempts(session_id);
CREATE INDEX idx_distraction_target ON distraction_attempts(target);

-- ─────────────────────────────────────
-- BROWSER TABS
-- ─────────────────────────────────────

CREATE TABLE tab_sessions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id      INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
  tab_id          TEXT NOT NULL,         -- Electron BrowserView internal ID
  url             TEXT NOT NULL,
  domain          TEXT NOT NULL,
  title           TEXT,
  opened_at       DATETIME NOT NULL,
  closed_at       DATETIME,
  active_seconds  INTEGER DEFAULT 0,
  visit_count     INTEGER DEFAULT 1,
  was_pinned      BOOLEAN DEFAULT 0,
  metadata        TEXT DEFAULT '{}'
);

CREATE INDEX idx_tab_session ON tab_sessions(session_id);
CREATE INDEX idx_tab_domain ON tab_sessions(domain);

-- ─────────────────────────────────────
-- PDF SESSIONS
-- ─────────────────────────────────────

CREATE TABLE pdf_sessions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id      INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
  file_path       TEXT NOT NULL,
  file_path_hash  TEXT NOT NULL,        -- MD5 of path for fast lookup
  file_name       TEXT NOT NULL,
  total_pages     INTEGER,
  opened_at       DATETIME NOT NULL,
  closed_at       DATETIME,
  time_seconds    INTEGER DEFAULT 0,
  pages_visited   TEXT DEFAULT '[]',   -- JSON array of page numbers
  max_page        INTEGER DEFAULT 1,   -- furthest page reached
  metadata        TEXT DEFAULT '{}'
);

-- PDF persistent state (survives across sessions)
CREATE TABLE pdf_state (
  file_path_hash  TEXT PRIMARY KEY,
  file_path       TEXT NOT NULL,
  last_page       INTEGER DEFAULT 1,
  zoom_level      INTEGER DEFAULT 100,
  sidebar_open    BOOLEAN DEFAULT 1,
  last_opened     DATETIME,
  metadata        TEXT DEFAULT '{}'
);

-- PDF annotations (never modifies original file)
CREATE TABLE pdf_annotations (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path_hash TEXT NOT NULL,
  page_number    INTEGER NOT NULL,
  type           TEXT NOT NULL CHECK(type IN ('bookmark','highlight','note')),
  content        TEXT,                  -- highlighted text or note text
  position_data  TEXT DEFAULT '{}',    -- JSON: { x, y, width, height }
  color          TEXT DEFAULT '#F5A623',
  is_archived    BOOLEAN DEFAULT 0,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata       TEXT DEFAULT '{}'
);

CREATE INDEX idx_annotation_file ON pdf_annotations(file_path_hash);

-- ─────────────────────────────────────
-- ACTIVE RECALL
-- ─────────────────────────────────────

CREATE TABLE recall_entries (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id   INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  subject      TEXT NOT NULL,
  learned      TEXT NOT NULL DEFAULT '[]',   -- JSON array of strings
  questions    TEXT NOT NULL DEFAULT '[]',   -- JSON array of strings
  was_skipped  BOOLEAN DEFAULT 0,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata     TEXT DEFAULT '{}'
);

CREATE TABLE revision_queue (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  recall_entry_id INTEGER NOT NULL REFERENCES recall_entries(id) ON DELETE CASCADE,
  session_id      INTEGER REFERENCES sessions(id),
  subject         TEXT NOT NULL,
  question        TEXT NOT NULL,
  status          TEXT DEFAULT 'unresolved' CHECK(status IN ('unresolved','resolved','snoozed','archived')),
  snooze_until    DATETIME,
  resolved_at     DATETIME,
  resolution_note TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata        TEXT DEFAULT '{}'
);

CREATE INDEX idx_revision_status ON revision_queue(status);
CREATE INDEX idx_revision_subject ON revision_queue(subject);

-- ─────────────────────────────────────
-- STREAKS
-- ─────────────────────────────────────

CREATE TABLE streak_days (
  date          TEXT PRIMARY KEY,        -- YYYY-MM-DD
  is_valid      BOOLEAN DEFAULT 0,       -- met all criteria?
  study_seconds INTEGER DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  focus_score   REAL DEFAULT 0,
  grace_used    BOOLEAN DEFAULT 0,
  recall_done   BOOLEAN DEFAULT 0,
  metadata      TEXT DEFAULT '{}'
);

CREATE TABLE streak_history (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  start_date   TEXT NOT NULL,
  end_date     TEXT,
  length_days  INTEGER DEFAULT 0,
  reason_ended TEXT,                    -- 'missed_day' | 'low_focus' | 'ongoing'
  metadata     TEXT DEFAULT '{}'
);

-- ─────────────────────────────────────
-- QUICK START STATE
-- ─────────────────────────────────────

CREATE TABLE quick_start_state (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_name TEXT NOT NULL DEFAULT 'default',
  subject      TEXT,
  mode         TEXT DEFAULT 'pomodoro',
  browser_tabs TEXT DEFAULT '[]',       -- JSON array of {url, title}
  last_pdf     TEXT DEFAULT '{}',       -- JSON: {path, page, zoom}
  whitelist_preset TEXT,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata     TEXT DEFAULT '{}'
);

-- ─────────────────────────────────────
-- SETTINGS
-- ─────────────────────────────────────

CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,             -- JSON value
  section    TEXT,                      -- e.g. 'timer', 'recall', 'streak'
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default settings (INSERT OR IGNORE at startup)
INSERT OR IGNORE INTO settings (key, value, section) VALUES
  ('timer.defaultMode',               '"pomodoro"',       'timer'),
  ('timer.defaultSubject',            'null',             'timer'),
  ('pomodoro.workMinutes',            '25',               'timer'),
  ('pomodoro.shortBreakMinutes',      '5',                'timer'),
  ('pomodoro.longBreakMinutes',       '15',               'timer'),
  ('pomodoro.cyclesBeforeLongBreak',  '4',                'timer'),
  ('pomodoro.autoStartBreaks',        'false',            'timer'),
  ('fullscreen.autoOnSessionStart',   'false',            'window'),
  ('fullscreen.hideTaskbar',          'false',            'window'),
  ('fullscreen.hudPosition',          '"top-right"',      'window'),
  ('fullscreen.hudOpacity',           '20',               'window'),
  ('recall.enabled',                  'true',             'recall'),
  ('recall.minSessionMinutes',        '15',               'recall'),
  ('recall.skipPenaltyPoints',        '5',                'recall'),
  ('recall.showPreSessionReview',     'true',             'recall'),
  ('streak.minSessionMinutes',        '20',               'streak'),
  ('streak.minFocusScore',            '40',               'streak'),
  ('streak.graceDaysPerWeek',         '1',                'streak'),
  ('streak.milestoneNotifications',   'true',             'streak'),
  ('focus.sensitivity',               '"blocklist-only"', 'focus'),
  ('appearance.accentColor',          '"#00D4AA"',        'appearance'),
  ('appearance.fontScale',            '100',              'appearance'),
  ('appearance.sidebarMode',          '"auto"',           'appearance'),
  ('appearance.animations',           '"enabled"',        'appearance'),
  ('browser.defaultHomepage',         '"https://claude.ai"', 'browser'),
  ('browser.bypassLimitPerSession',   '0',                'browser');
```

---

## 6. Complete IPC Communication Map

All IPC is typed and follows the pattern: `module:action` for commands, `module:event` for broadcasts.

```
═══════════════════════════════════════════════════════
RENDERER → MAIN (invoke / send)
═══════════════════════════════════════════════════════

TIMER
  timer:start              { subject, mode, duration? }
  timer:pause              { reason }
  timer:resume             {}
  timer:end                {}
  timer:getState           {}

WINDOW / FULLSCREEN
  window:enterFullscreen   {}
  window:exitFullscreen    {}
  window:setAlwaysOnTop    { value: boolean }

BROWSER
  browser:newTab           { url? }
  browser:closeTab         { tabId }
  browser:navigate         { tabId, url }
  browser:switchTab        { tabId }
  browser:reorderTabs      { orderedTabIds: string[] }
  browser:pinTab           { tabId, pinned: boolean }
  browser:addToWhitelist   { url }
  browser:requestBypass    { url }

PDF
  pdf:open                 { filePath }
  pdf:close                { filePath }
  pdf:saveState            { filePathHash, page, zoom, sidebarOpen }
  pdf:getState             { filePathHash }
  pdf:saveAnnotation       { annotation }
  pdf:deleteAnnotation     { annotationId }
  pdf:getAnnotations       { filePathHash }
  pdf:openDialog           {}                    -- triggers file picker

ACTIVE RECALL
  recall:submit            { sessionId, learned[], questions[] }
  recall:skip              { sessionId }
  recall:getQueue          {}
  recall:resolveItem       { itemId, note? }
  recall:snoozeItem        { itemId, days }
  recall:getPreSession     { subject }           -- returns last recall for subject

STREAK
  streak:getState          {}
  streak:getHistory        {}
  streak:getCalendar       { months: 3 }

QUICK START
  quickstart:trigger       { profileId? }
  quickstart:saveProfile   { profileId, config }
  quickstart:getProfiles   {}
  quickstart:getState      {}

SESSION REPLAY
  replay:getTimeline       { sessionId }
  replay:getSummary        { sessionId }

ANALYTICS
  analytics:getDaily       { date }
  analytics:getWeekly      { startDate }
  analytics:getMonthly     { month }
  analytics:getTabReport   { sessionId? }
  analytics:getDistraction { period: 'week'|'month'|'all' }
  analytics:getRecallStats {}
  analytics:exportCsv      {}

SETTINGS
  settings:get             { key }
  settings:getAll          {}
  settings:set             { key, value }
  settings:setMany         { pairs: {key, value}[] }
  settings:reset           { key? }            -- reset one or all

BLOCKLIST / WHITELIST
  blocklist:get            {}
  blocklist:add            { processName }
  blocklist:remove         { processName }
  whitelist:get            {}
  whitelist:add            { pattern }
  whitelist:remove         { pattern }
  whitelist:toggle         { pattern, enabled }
  whitelist:importJson     { json }
  whitelist:exportJson     {}

═══════════════════════════════════════════════════════
MAIN → RENDERER (send / broadcast)
═══════════════════════════════════════════════════════

TIMER
  timer:tick               { elapsed, state, pomodoroPhase?, cycleNumber? }
  timer:autoPaused         { reason, appName? }
  timer:cycleComplete      { type: 'work'|'break', next }

WINDOW
  window:fullscreenChanged { isFullscreen }

BROWSER
  browser:siteBlocked      { url, domain }
  browser:tabsUpdated      { tabs: TabState[] }
  browser:bypassGranted    { url }

FOCUS MONITOR
  focus:warning            { appName, processName }
  focus:returned           { appName, awaySeconds }
  focus:monitorState       { active }

DISTRACTION INTEL
  distraction:patternFound { message, confidence, subject? }

RECALL
  recall:promptReady       { sessionId, sessionSummary }
  recall:preSessionReady   { subject, lastRecall, queueCount }

STREAK
  streak:updated           { current, best, todayValid, graceUsed }
  streak:broken            { previous }
  streak:milestone         { days }

QUICK START
  quickstart:stateLoaded   { state }

NOTIFICATIONS
  toast:show               { message, type: 'info'|'success'|'warning'|'error', duration? }
```

---

## 7. Plugin/Extension Architecture (Future-Proofing)

The app is designed so new features can be added as modules without touching core code. Here is the pattern for any future feature:

### Adding a New Feature Module (Template)

**Step 1 — Create main module:**
```typescript
// main/modules/myFeature/myFeature.service.ts
import { eventBus } from "../../eventBus";
import { db } from "../../db/connection";

export class MyFeatureService {
  init() {
    // Subscribe to events you care about
    eventBus.on("SESSION_STARTED", this.onSessionStart.bind(this));
    eventBus.on("SESSION_ENDED", this.onSessionEnd.bind(this));
  }

  private onSessionStart(event: SessionStartedEvent) {
    // Your logic here
  }
  
  private onSessionEnd(event: SessionEndedEvent) {
    // Your logic here
  }
}
```

**Step 2 — Register IPC handlers:**
```typescript
// main/modules/myFeature/myFeature.ipc.ts
import { ipcMain } from "electron";
import { myFeatureService } from "./myFeature.service";

export function registerMyFeatureIPC() {
  ipcMain.handle("myfeature:getData", async () => {
    return myFeatureService.getData();
  });
}
```

**Step 3 — Register in main.ts:**
```typescript
// main/main.ts
import { registerMyFeatureIPC } from "./modules/myFeature/myFeature.ipc";
registerMyFeatureIPC();
myFeatureService.init();
```

**Step 4 — Create renderer module:**
```typescript
// renderer/modules/myFeature/myFeatureStore.ts
import { create } from "zustand";

// renderer/modules/myFeature/MyFeaturePanel.tsx
// renderer/modules/myFeature/index.ts — exports components + sidebar slot registration
```

**Step 5 — Register in App.tsx:**
```typescript
import { MyFeatureSidebarIcon } from "./modules/myFeature";
// Add to sidebar nav array — done.
```

This is the complete pattern. **No existing files need modification** other than two lines in `main.ts` and one line in `App.tsx`.

---

## 8. Build Phases (Week-by-Week)

### Phase 1 — Foundation & Design System (Week 1–2)
- [ ] Electron + React + TypeScript + Vite boilerplate
- [ ] SQLite setup (`better-sqlite3`), run schema.sql
- [ ] Insert default settings on first run
- [ ] EventBus implementation (main + renderer)
- [ ] AppShell layout: Sidebar, TopBar, slot system
- [ ] Design tokens: CSS variables for all colors, spacing, typography
- [ ] Font loading: JetBrains Mono, Sora, DM Sans
- [ ] Shared components: Button, Modal, Toast, Badge, Tooltip
- [ ] Basic IPC bridge (typed)

### Phase 2 — Timer & Session Core (Week 2–3)
- [ ] TimerDisplay component (JetBrains Mono, large, state colors)
- [ ] SessionControls (Start / Pause / Resume / End)
- [ ] SubjectPicker (dropdown from history + text input)
- [ ] Timer IPC handlers + timerStore (Zustand)
- [ ] Session saved to DB on end
- [ ] Pomodoro cycle logic
- [ ] Keyboard shortcuts: Space, Esc
- [ ] Session lifecycle events on EventBus

### Phase 3 — Fullscreen Mode (Week 3)
- [ ] `window:enterFullscreen` / `exitFullscreen` IPC
- [ ] Windows taskbar hide/restore (PowerShell, optional)
- [ ] FullscreenHUD component (floating, draggable position)
- [ ] HUD auto-fade on inactivity (CSS opacity transition)
- [ ] F11 keyboard shortcut
- [ ] Setting: auto-enter on session start
- [ ] Confirmation dialog on fullscreen exit during session

### Phase 4 — Focus Monitor & App Blocker (Week 4)
- [ ] `processDetector.ts` — foreground window detection
- [ ] `focusMonitor.service.ts` — polling loop, event emission
- [ ] App switch confirmation overlay (full-screen, dark)
- [ ] Blocklist stored in settings table
- [ ] Pauses logged to DB with reason and app name
- [ ] "Welcome back" toast with away duration
- [ ] Blocklist manager in settings (with process picker)
- [ ] FOCUS_LOST / FOCUS_RETURNED events on EventBus

### Phase 5 — Distraction Intelligence (Week 4–5)
- [ ] `distraction_attempts` table + insert on each blocked event
- [ ] Distraction metrics calculation (attempts/hour)
- [ ] Pattern detection algorithm (bucket analysis)
- [ ] DistractionInsights panel in Analytics
- [ ] PatternAlert component (pre-session reminder)
- [ ] Pattern notifications emitted to renderer

### Phase 6 — Built-in Browser (Week 5–6)
- [ ] BrowserView management in main process
- [ ] Tab lifecycle (open, close, switch, pin, reorder)
- [ ] TabBar UI component (drag to reorder)
- [ ] AddressBar with URL validation
- [ ] will-navigate interceptor + whitelist check
- [ ] BlockedSiteOverlay component
- [ ] Bypass request flow + logging
- [ ] Google account persistent partition
- [ ] Tab active-seconds ticker (1s interval, pauses with session)
- [ ] Tab state flush to DB on close/session end
- [ ] Whitelist manager in settings (patterns, import/export)
- [ ] Browser IPC events on EventBus

### Phase 7 — PDF Viewer (Week 7)
- [ ] PDF.js integration in renderer
- [ ] File open dialog via IPC
- [ ] Continuous vertical scroll with lazy rendering
- [ ] Toolbar: zoom, page jump, search, fit modes
- [ ] Left sidebar: thumbnails, TOC, bookmarks, annotations list
- [ ] PDF state persistence (page, zoom, sidebar) per file hash
- [ ] Annotation system (highlight, note, bookmark)
- [ ] Night mode overlay
- [ ] Focus Read Mode (F11 inside PDF)
- [ ] Full keyboard shortcut set
- [ ] Recent files list (last 10)
- [ ] PDF events on EventBus

### Phase 8 — Active Recall Engine (Week 8) ⭐
- [ ] Post-session recall modal (cannot be dismissed without action)
- [ ] Skip with penalty logic (streak points deducted)
- [ ] Recall data saved to `recall_entries` table
- [ ] Questions inserted into `revision_queue`
- [ ] RevisionQueue panel (list, resolve, snooze, archive)
- [ ] Pre-session review card (loads last recall for subject)
- [ ] Sidebar badge showing unresolved queue count
- [ ] RecallSettings in settings panel
- [ ] Recall events on EventBus

### Phase 9 — Streak System (Week 9)
- [ ] `streak_days` table population after each session
- [ ] Streak validity check (time + focus score + session complete)
- [ ] Grace day logic
- [ ] Current streak + best streak calculation
- [ ] StreakBadge in TopBar
- [ ] StreakPanel (full view, heatmap, history)
- [ ] HeatmapCalendar component (90-day view)
- [ ] Milestone detection + toast notifications
- [ ] StreakSettings in settings panel

### Phase 10 — Quick Start (Week 9–10)
- [ ] `quick_start_state` table — save on session end
- [ ] QuickStartButton on home screen (shows preview of what will restore)
- [ ] Restore: subject, tabs, PDF, timer mode
- [ ] Custom profile support (3 profiles)
- [ ] Profile editor in settings
- [ ] quickStart events on EventBus

### Phase 11 — Study Replay (Week 10)
- [ ] EventBus → `session_events` table (all events logged during session)
- [ ] ReplayTimeline component (SVG horizontal timeline)
- [ ] Event markers (pause, distraction, tab switch, PDF open)
- [ ] Clickable event cards (expand detail)
- [ ] Session summary card below timeline
- [ ] Replay accessible from session history in Analytics

### Phase 12 — Analytics Dashboard (Week 11)
- [ ] Overview tab (today summary, sparklines)
- [ ] Weekly/Monthly charts (Recharts bar + heatmap)
- [ ] Distraction Report tab
- [ ] Tab Intelligence tab (donut chart + table)
- [ ] Subject Breakdown tab
- [ ] Recall & Revision tab
- [ ] Export CSV functionality
- [ ] Export summary PDF

### Phase 13 — Settings, Polish & Release (Week 12)
- [ ] All settings sections implemented
- [ ] Sound system (session events trigger audio cues)
- [ ] Windows startup registry entry
- [ ] App icon design + tray icon
- [ ] electron-builder config (installer, auto-update hook)
- [ ] Error boundaries in React
- [ ] DB crash recovery (backup on start)
- [ ] Performance audit (memory < 250MB idle, < 400MB with browser)
- [ ] Edge cases: session orphans, corrupted DB, PDF not found
- [ ] First-run onboarding flow (3-step wizard)

---

## 9. Key Libraries & Tools

| Purpose | Library |
|---|---|
| Desktop framework | `electron` (latest stable) |
| UI framework | `react` + `typescript` + `vite` |
| State management | `zustand` |
| Database | `better-sqlite3` |
| PDF rendering | `pdfjs-dist` (PDF.js by Mozilla) |
| Charts | `recharts` |
| Foreground window detection | PowerShell via `child_process` (no native dependency) |
| Build / Installer | `electron-builder` |
| Styling | CSS Modules + CSS custom properties |
| IPC typing | `electron-typed-ipc` or custom typed wrappers |
| EventBus | `eventemitter3` (tiny, fast) |
| Date utilities | `date-fns` |
| File hash | Node built-in `crypto` (MD5 for PDF path hash) |
| Sound | `howler.js` |

---

## 10. AI Builder Prompting Guide

### Master System Prompt (paste at start of every AI coding session)

```
You are building a Windows desktop app called StudyOS using Electron.js, React, and TypeScript.

ARCHITECTURE RULES (never violate these):
1. All feature logic lives in main/modules/<feature>/ — each module is self-contained.
2. All UI lives in renderer/modules/<feature>/ — mirrors main structure.
3. All inter-feature communication goes through the EventBus, never direct imports between modules.
4. All state management uses Zustand slices in each renderer module folder.
5. Never use localStorage — all persistence goes through SQLite via better-sqlite3.
6. All main/renderer communication uses typed IPC only. No global window vars.
7. Every DB table has: id, created_at, updated_at, metadata TEXT DEFAULT '{}'.
8. All settings are stored in the settings table as JSON values by key.

DESIGN SYSTEM:
- Background: #0D0F14 (primary), #13161E (cards), #1A1E2A (elevated)
- Accent: #00D4AA (primary), #4F8EF7 (browser), #A78BFA (recall), #F5A623 (warning), #E05A5A (danger), #F59E0B (streak)
- Fonts: "JetBrains Mono" (timer, data), "Sora" (headings), "DM Sans" (body)
- Spacing: 8px base unit (4, 8, 16, 24, 32, 48, 64)
- Transitions: 200ms ease on all panel switches
- All overlays use backdrop-filter blur

CURRENT DB SCHEMA: [paste schema.sql here]
CURRENT IPC MAP: [paste relevant section of IPC map here]
```

### Phase Prompt Templates

**Starting a new module (example: Active Recall):**
```
Build the Active Recall module for StudyOS following the module pattern.

Main process:
- activeRecall.service.ts: Listen to SESSION_ENDED event. Emit RECALL_PROMPT_READY to renderer. Handle recall:submit and recall:skip IPC. Write to recall_entries and revision_queue tables.
- activeRecall.ipc.ts: Register all IPC handlers listed in the IPC map.

Renderer:
- RecallPrompt.tsx: Full-screen modal. Shows after session ends. 3 text areas for "learned" items. 2 text areas for "questions". Subject dropdown. Skip button (shows penalty warning). Save button.
- RecallCard.tsx: Pre-session card showing last recall entries for a subject. "Start Session" and "Review Queue" buttons.
- RevisionQueue.tsx: List panel. Each item shows question, subject, age. Resolve/Snooze/Archive buttons.
- recallStore.ts: Zustand slice for all recall state.

Follow all architecture rules. Use the design system. No localStorage.
```

**Debugging prompt:**
```
I'm working on StudyOS (Electron + React + TypeScript). The architecture uses:
- EventBus for cross-module communication
- Typed IPC for main/renderer communication
- Zustand for renderer state
- better-sqlite3 for persistence

Problem: [describe issue]
Relevant files: [paste file contents]

Fix the issue following the existing architecture patterns.
```

---

## 11. Future Features Roadmap

These are designed to plug into the existing architecture without modification:

**v2.1 — AI Study Assistant**
New module: `aiAssistant`
- Floating chat panel powered by Claude API
- Context-aware: knows your current PDF page, current subject, recent recall entries
- Can generate practice questions from your "unsure about" items in revision queue
- Connects to: SESSION_STARTED, PDF_OPENED events

**v2.2 — Smart Session Goals**
New module: `sessionGoals`
- Set goals before session: "Read 20 pages", "Solve 10 problems", "Complete 2 Pomodoros"
- Goal tracker shown in HUD during fullscreen
- Connects to: timer events, PDF page tracking

**v2.3 — Markdown Notes Panel**
New module: `notes`
- Split-pane notes editor (markdown) alongside PDF or browser
- Notes auto-linked to session + subject + PDF page
- Search across all notes
- Export as markdown file

**v2.4 — Webcam Focus Detection**
New module: `webcamFocus`
- Optional feature — detect if user looks away from screen for 30+ seconds
- Uses MediaPipe Face Mesh via WebWorker in renderer
- Emits FOCUS_LOST if face not detected — integrates with existing pause system

**v2.5 — Mobile Companion (Local Network)**
New module: `companionServer`
- Express.js server running locally during sessions
- Mobile browser on same WiFi can view: current session stats, streak, replay timeline
- Read-only. No control from mobile.

**v2.6 — Cloud Backup**
New module: `cloudSync`
- Export session data JSON to user's Google Drive or Dropbox
- Restore from backup on new machine
- Never syncs browser data (privacy)

**v2.7 — Hard Block Mode (Opt-in)**
New module: `hardBlock`
- Installs a Windows kernel filter driver (requires admin)
- Truly prevents blocked apps from launching during sessions
- Opt-in, with clear warning about admin requirement
- Uninstalls cleanly on app uninstall

---

*StudyOS v2.0 — Track not just your time. Track your understanding.*
