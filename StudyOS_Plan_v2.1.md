# StudyOS — Complete Application Build Plan v2.1
### Critical Engineering Fixes + Full Integrated Specification

---

> **What changed in v2.1:**
> This version fixes 4 critical engineering failures from v2.0:
> 1. ✅ Focus Engine — now a real computation pipeline with continuous scoring
> 2. ✅ Event Filtering Layer — prevents DB flood and performance collapse
> 3. ✅ Browser Intelligence — injected scripts for deep engagement signals
> 4. ✅ Data Aggregation Strategy — periodic rollup tables for fast analytics
> All other sections are updated to reflect these fixes end-to-end.

---

## TABLE OF CONTENTS

1. Project Philosophy & Architecture Principles
2. Design System
3. Extensible App Architecture (Updated)
4. Feature Specifications
   - 4.1  Fullscreen Focus Mode
   - 4.2  Study Timer
   - 4.3  App Blocker + Focus Monitor
   - 4.4  **Focus Engine** ✅ (New — replaces abstract concept)
   - 4.5  **Event Filtering Layer** ✅ (New — prevents DB overload)
   - 4.6  Distraction Intelligence Engine
   - 4.7  **Built-in Browser + Engagement Intelligence** ✅ (Upgraded)
   - 4.8  PDF Viewer
   - 4.9  Active Recall Engine ⭐
   - 4.10 Study Streak System
   - 4.11 Quick Start — Friction Killer
   - 4.12 Study Replay Mode (Updated — uses filtered events)
   - 4.13 Session Analytics Dashboard
   - 4.14 Settings Panel
5. Complete Database Schema (Updated — aggregation tables added)
6. Complete IPC Communication Map (Updated)
7. Data Pipeline Architecture (New Section)
8. Plugin/Extension Architecture
9. Build Phases (Week-by-Week, Updated)
10. Key Libraries & Tools
11. AI Builder Prompting Guide (Updated)
12. Future Features Roadmap

---

## 1. Project Philosophy & Architecture Principles

**App Name:** StudyOS
**Platform:** Windows 10/11
**Framework:** Electron.js + React + TypeScript
**Philosophy:** StudyOS is not a timer app. It is a complete study operating system. Every feature exists to answer one question: *Did you actually learn something today?*

### Core Architectural Principles

**Principle 1 — Event-Driven Core**
Every meaningful action emits to a central EventBus. Modules subscribe independently. Adding a feature never modifies existing ones.

**Principle 2 — Event Filtering Layer (NEW — Critical)**
Not every event is stored. Events pass through a filter that classifies them as:
- `REPLAY_RELEVANT` → stored in `session_events` (timeline reconstruction)
- `AGGREGATE_INPUT` → fed into aggregation pipeline (analytics)
- `EPHEMERAL` → used in-memory only, never written to disk
This prevents DB flooding and keeps the app performant.

**Principle 3 — Focus Engine as Ground Truth (NEW — Critical)**
The focus score is not computed once at session end. It is computed continuously every 10 seconds by a dedicated Focus Engine that collects signals from all other modules. The score is the single source of truth for session quality.

**Principle 4 — Aggregation Layer (NEW — Critical)**
Raw events are never queried directly for analytics. A periodic aggregation job (runs every 60s during session, and once at session end) computes rolled-up stats into `focus_aggregates` and `daily_stats`. Analytics queries only hit these tables — never raw event tables.

**Principle 5 — Feature Modules**
Each feature is a self-contained folder (main + renderer). Adding a feature = adding a folder.

**Principle 6 — Schema-First DB**
Every table has `created_at`, `updated_at`, and `metadata TEXT DEFAULT '{}'` for forward compatibility.

**Principle 7 — Settings as a Registry**
All configuration in the `settings` table as key-value JSON. Features declare defaults at init.

**Principle 8 — UI Slots**
Named layout slots: `sidebar-nav`, `topbar-right`, `main-panel`, `overlay`, `modal`, `toast`.

---

## 2. Design System

### Color Palette
```
Background Primary:    #0D0F14
Background Secondary:  #13161E
Background Tertiary:   #1A1E2A
Background Glass:      rgba(19, 22, 30, 0.85)
Border Subtle:         #252A38
Border Active:         #00D4AA33

Accent Primary:        #00D4AA   (timer running, success, active)
Accent Secondary:      #4F8EF7   (browser chrome, links)
Accent Recall:         #A78BFA   (Active Recall features)
Accent Warning:        #F5A623   (paused, caution)
Accent Danger:         #E05A5A   (blocked, danger)
Accent Streak:         #F59E0B   (gamification)
Accent Replay:         #34D399   (replay timeline)
Accent FocusHigh:      #00D4AA   (focus score 70–100)
Accent FocusMid:       #F5A623   (focus score 40–69)
Accent FocusLow:       #E05A5A   (focus score 0–39)

Text Primary:          #E8EAF0
Text Secondary:        #8B90A0
Text Muted:            #4A5068
```

### Typography
```
Timer / Data / Metrics:   "JetBrains Mono"
Headings / Navigation:    "Sora"
Body / Reading:           "DM Sans"
```

### Spacing (8px base unit)
```
xs: 4px  |  sm: 8px  |  md: 16px  |  lg: 24px  |  xl: 32px  |  2xl: 48px  |  3xl: 64px
```

---

## 3. Extensible App Architecture

```
StudyOS/
├── main/
│   ├── main.ts                            # Bootstrap: window, tray, startup, module registration
│   ├── eventBus.ts                        # Central EventEmitter (eventemitter3)
│   ├── eventFilter.ts                ✅   # Event filtering layer — classifies all events
│   ├── db/
│   │   ├── connection.ts                  # SQLite singleton (better-sqlite3)
│   │   ├── schema.sql                     # Full schema
│   │   ├── aggregator.ts             ✅   # Periodic aggregation job
│   │   └── migrations/
│   │       └── v1_initial.sql
│   ├── modules/
│   │   ├── timer/
│   │   │   ├── timer.service.ts
│   │   │   └── timer.ipc.ts
│   │   ├── focusMonitor/
│   │   │   ├── focusMonitor.service.ts
│   │   │   └── focusMonitor.ipc.ts
│   │   ├── focusEngine/              ✅   # NEW — replaces abstract focus_score
│   │   │   ├── focusEngine.service.ts     # Signal collector + score computer
│   │   │   ├── signalCollector.ts         # Gathers all inputs every 1s
│   │   │   ├── scoreFormula.ts            # Pure function: signals → score
│   │   │   └── focusEngine.ipc.ts
│   │   ├── distractionIntel/
│   │   │   ├── distractionIntel.service.ts
│   │   │   └── distractionIntel.ipc.ts
│   │   ├── browser/
│   │   │   ├── browser.service.ts
│   │   │   ├── tabTracker.service.ts
│   │   │   ├── engagementInjector.ts ✅   # NEW — injects scripts into BrowserView
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
│   │   │   ├── replay.service.ts          # Now uses eventFilter — not eventBus("*")
│   │   │   └── replay.ipc.ts
│   │   └── pdf/
│   │       └── pdf.ipc.ts
│   └── utils/
│       ├── windowManager.ts
│       └── processDetector.ts
│
├── renderer/
│   ├── main.tsx
│   ├── App.tsx
│   ├── eventBus.ts
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── FullscreenHUD.tsx
│   ├── modules/
│   │   ├── timer/
│   │   ├── focusEngine/              ✅
│   │   │   ├── FocusScoreWidget.tsx       # Live score in TopBar
│   │   │   ├── FocusBreakdown.tsx         # Per-signal breakdown panel
│   │   │   └── focusEngineStore.ts
│   │   ├── browser/
│   │   │   ├── BrowserShell.tsx
│   │   │   ├── TabBar.tsx
│   │   │   ├── AddressBar.tsx
│   │   │   ├── BlockedSiteOverlay.tsx
│   │   │   ├── EngagementBadge.tsx   ✅   # Shows "Shorts detected", "Lecture mode"
│   │   │   └── browserStore.ts
│   │   ├── pdf/
│   │   ├── activeRecall/
│   │   ├── distractionIntel/
│   │   ├── streak/
│   │   ├── quickStart/
│   │   ├── sessionReplay/
│   │   └── analytics/
│   │       ├── Dashboard.tsx
│   │       ├── FocusTrendChart.tsx   ✅   # Uses aggregated data, not raw events
│   │       ├── HeatmapCalendar.tsx
│   │       ├── TabUsageChart.tsx
│   │       ├── SubjectBreakdown.tsx
│   │       └── analyticsStore.ts
│   ├── settings/
│   └── shared/
│
├── db/
│   └── schema.sql
├── assets/
└── electron-builder.config.js
```

---

## 4. Feature Specifications

---

### 4.1 Fullscreen Focus Mode

**Purpose:** Eliminate OS-level visual distractions during sessions.

**Implementation:**
```typescript
// windowManager.ts
export function enterFullscreenFocus(): void {
  mainWindow.setFullScreen(true);
  mainWindow.setAlwaysOnTop(true, "screen-saver"); // Highest z-order on Windows
  emitEvent("FULLSCREEN_ENTERED", { timestamp: Date.now() });
}

export function exitFullscreenFocus(confirmed: boolean): void {
  if (!confirmed) return; // Must confirm if session is active
  mainWindow.setFullScreen(false);
  mainWindow.setAlwaysOnTop(false);
  emitEvent("FULLSCREEN_EXITED", { timestamp: Date.now() });
}
```

**Fullscreen HUD (floating top-right, always visible):**
```
[⏱ 45:23] [📗 Physics] [🔥 6d] [Focus: 84] [⊠]
```
- Fades to 15% opacity after 3s of mouse inactivity
- Returns to full on mouse-near (within 100px)
- F11 to toggle in/out
- Exiting during session requires confirmation

**EventBus events:**
```
FULLSCREEN_ENTERED   { timestamp }
FULLSCREEN_EXITED    { timestamp }
```
**Event filter classification:** `REPLAY_RELEVANT`

---

### 4.2 Study Timer

**Behavior:**
- Three modes: Stopwatch, Pomodoro, Countdown
- Requires subject tag before start
- State machine: `idle → running → paused → running → ended`
- Visual: Running = cyan glow, Paused = orange, Ended = green flash

**EventBus events (all REPLAY_RELEVANT + AGGREGATE_INPUT):**
```
SESSION_STARTED     { sessionId, subject, mode, startedAt }
SESSION_PAUSED      { sessionId, reason, pausedAt, elapsedSeconds }
SESSION_RESUMED     { sessionId, resumedAt }
SESSION_ENDED       { sessionId, endedAt, actualSeconds, finalFocusScore }
POMODORO_CYCLE      { sessionId, cycleNumber, type: 'work'|'break' }
```

---

### 4.3 App Blocker + Focus Monitor

Polls foreground window every 1500ms via PowerShell.

**App Switch Confirmation Flow:**
1. Focus leaves StudyOS during active session
2. Full-screen overlay appears instantly
3. Shows: app name, "Your timer will pause and this will be logged"
4. Buttons: **"Stay Focused"** | **"Open Anyway"**
5. Either choice emits an EventBus event

**EventBus events:**
```
FOCUS_LOST          { appName, processName, lostAt }     → REPLAY_RELEVANT + AGGREGATE_INPUT
FOCUS_RETURNED      { appName, returnedAt, awaySeconds } → REPLAY_RELEVANT + AGGREGATE_INPUT
APP_SWITCH_RESISTED { appName, at }                      → AGGREGATE_INPUT only
APP_SWITCH_ALLOWED  { appName, at }                      → REPLAY_RELEVANT + AGGREGATE_INPUT
```

---

### 4.4 Focus Engine ✅ (Critical Fix — New Module)

**Problem it solves:** In v2.0, `focus_score` was a field in the DB with no pipeline to populate it. It was computed once, imprecisely, at session end. This module replaces that with a real-time, multi-signal computation engine.

#### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FOCUS ENGINE                          │
│                                                          │
│  ┌──────────────────┐    ┌───────────────────────────┐  │
│  │ Signal Collector │───▶│    Score Formula          │  │
│  │  (every 1s)      │    │  (pure function)          │  │
│  └──────────────────┘    └──────────┬────────────────┘  │
│          │                          │                    │
│  Inputs: │               Outputs:   │                    │
│  - Timer state           - current_score (0–100)        │
│  - Focus monitor         - score_state (label)          │
│  - Browser signals       - signal_breakdown             │
│  - Distraction events    - trend (rising/falling/flat)  │
│  - Engagement data       └──────────┬─────────────────  │
│                                     │                    │
│  ┌──────────────────┐    ┌──────────▼────────────────┐  │
│  │  Snapshot Buffer │    │  Aggregation Trigger      │  │
│  │  (in-memory,     │    │  (every 10s → DB write)   │  │
│  │   last 60 ticks) │    │  (session end → final)    │  │
│  └──────────────────┘    └───────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

#### Signal Collector (runs every 1000ms)

```typescript
// signalCollector.ts

interface FocusSignals {
  // From timer.service
  timerRunning: boolean;
  elapsedSeconds: number;

  // From focusMonitor.service
  appInForeground: boolean;
  secondsSinceFocusLoss: number;   // 0 if in focus

  // From browser (last received engagement payload)
  activeTabDomain: string | null;
  browserEngagementScore: number;  // 0–100, computed from injected script signals
  isWatchingShorts: boolean;
  isWatchingLecture: boolean;
  videoCurrentTime: number | null;
  scrollVelocity: number;          // pixels/second (0 = idle)

  // From distraction tracker (in-memory counters for current session)
  distractionAttemptsThisSession: number;
  bypassesThisSession: number;

  // From session state
  sessionElapsedSeconds: number;
}

// Called every 1s by focusEngine.service.ts
export function collectSignals(): FocusSignals {
  return {
    timerRunning: timerService.isRunning(),
    elapsedSeconds: timerService.elapsed(),
    appInForeground: focusMonitorService.isInForeground(),
    secondsSinceFocusLoss: focusMonitorService.secondsSinceFocusLoss(),
    activeTabDomain: tabTrackerService.activeTabDomain(),
    browserEngagementScore: engagementInjector.lastScore(),
    isWatchingShorts: engagementInjector.isShorts(),
    isWatchingLecture: engagementInjector.isLecture(),
    videoCurrentTime: engagementInjector.videoTime(),
    scrollVelocity: engagementInjector.scrollVelocity(),
    distractionAttemptsThisSession: distractionIntelService.sessionAttempts(),
    bypassesThisSession: distractionIntelService.sessionBypasses(),
    sessionElapsedSeconds: timerService.elapsed(),
  };
}
```

#### Score Formula (Pure Function — Easy to Test and Modify)

```typescript
// scoreFormula.ts

export interface ScoreResult {
  score: number;            // 0–100
  state: 'deep' | 'focused' | 'distracted' | 'idle' | 'paused';
  breakdown: SignalBreakdown;
  trend: 'rising' | 'falling' | 'flat';
}

export interface SignalBreakdown {
  base: number;
  timerPenalty: number;
  focusLossPenalty: number;
  distractionPenalty: number;
  bypassPenalty: number;
  engagementBonus: number;
  lectureBonus: number;
  shortsPenalty: number;
  idlePenalty: number;
}

export function computeFocusScore(
  signals: FocusSignals,
  previousScores: number[]   // last 6 computed scores (for trend)
): ScoreResult {

  // If timer is not running, score is not computed
  if (!signals.timerRunning) {
    return { score: 0, state: 'paused', breakdown: emptyBreakdown(), trend: 'flat' };
  }

  let score = 100;
  const breakdown: SignalBreakdown = {
    base: 100,
    timerPenalty: 0,
    focusLossPenalty: 0,
    distractionPenalty: 0,
    bypassPenalty: 0,
    engagementBonus: 0,
    lectureBonus: 0,
    shortsPenalty: 0,
    idlePenalty: 0,
  };

  // ── PENALTIES ──

  // App not in foreground (lost focus within this 1s tick)
  if (!signals.appInForeground) {
    const penalty = Math.min(30, signals.secondsSinceFocusLoss * 2);
    breakdown.focusLossPenalty = -penalty;
    score += breakdown.focusLossPenalty;
  }

  // Distraction attempts this session (cumulative, diminishing)
  if (signals.distractionAttemptsThisSession > 0) {
    const penalty = Math.min(25, signals.distractionAttemptsThisSession * 4);
    breakdown.distractionPenalty = -penalty;
    score += breakdown.distractionPenalty;
  }

  // Bypasses (much heavier penalty per bypass)
  if (signals.bypassesThisSession > 0) {
    const penalty = Math.min(40, signals.bypassesThisSession * 15);
    breakdown.bypassPenalty = -penalty;
    score += breakdown.bypassPenalty;
  }

  // YouTube Shorts detected (low-value content)
  if (signals.isWatchingShorts) {
    breakdown.shortsPenalty = -20;
    score += breakdown.shortsPenalty;
  }

  // Scroll idle — browser open but no activity for 60s
  if (signals.activeTabDomain && signals.scrollVelocity === 0 && signals.videoCurrentTime === null) {
    breakdown.idlePenalty = -5;
    score += breakdown.idlePenalty;
  }

  // ── BONUSES ──

  // Watching a lecture (video progressing, not Shorts)
  if (signals.isWatchingLecture && !signals.isWatchingShorts) {
    breakdown.lectureBonus = +10;
    score += breakdown.lectureBonus;
  }

  // Good engagement signal from browser
  if (signals.browserEngagementScore > 70) {
    breakdown.engagementBonus = +5;
    score += breakdown.engagementBonus;
  }

  // Clamp 0–100
  score = Math.max(0, Math.min(100, Math.round(score)));

  // ── STATE LABEL ──
  const state: ScoreResult['state'] =
    score >= 80 ? 'deep' :
    score >= 60 ? 'focused' :
    score >= 30 ? 'distracted' :
    'idle';

  // ── TREND ──
  const avg = previousScores.length > 0
    ? previousScores.reduce((a, b) => a + b, 0) / previousScores.length
    : score;
  const trend: ScoreResult['trend'] =
    score > avg + 5 ? 'rising' :
    score < avg - 5 ? 'falling' :
    'flat';

  return { score, state, breakdown, trend };
}
```

#### Focus Engine Service (Orchestrator)

```typescript
// focusEngine.service.ts

const SIGNAL_INTERVAL_MS = 1000;    // collect signals every 1s
const SNAPSHOT_INTERVAL_MS = 10000; // write to DB every 10s
const SNAPSHOT_BUFFER_SIZE = 60;    // keep last 60 ticks in memory

class FocusEngineService {
  private ticker: NodeJS.Timeout | null = null;
  private snapshotTicker: NodeJS.Timeout | null = null;
  private signalBuffer: FocusSignals[] = [];
  private scoreBuffer: number[] = [];   // for trend computation
  private currentScore: ScoreResult = { score: 0, state: 'idle', breakdown: emptyBreakdown(), trend: 'flat' };
  private currentSessionId: number | null = null;

  start(sessionId: number) {
    this.currentSessionId = sessionId;
    this.scoreBuffer = [];

    // 1s signal + score tick
    this.ticker = setInterval(() => this.tick(), SIGNAL_INTERVAL_MS);

    // 10s DB write
    this.snapshotTicker = setInterval(() => this.flushSnapshot(), SNAPSHOT_INTERVAL_MS);
  }

  stop() {
    clearInterval(this.ticker!);
    clearInterval(this.snapshotTicker!);
    this.flushSnapshot();  // Final flush on session end
    this.computeFinalScore();
  }

  private tick() {
    const signals = collectSignals();

    // Keep signal buffer (last 60 ticks = 60s window)
    this.signalBuffer.push(signals);
    if (this.signalBuffer.length > SNAPSHOT_BUFFER_SIZE) this.signalBuffer.shift();

    // Keep score buffer (last 6 = 6s for trend)
    const result = computeFocusScore(signals, this.scoreBuffer.slice(-6));
    this.scoreBuffer.push(result.score);
    if (this.scoreBuffer.length > SNAPSHOT_BUFFER_SIZE) this.scoreBuffer.shift();

    this.currentScore = result;

    // Emit to renderer (TopBar widget + HUD)
    mainWindow.webContents.send("focusEngine:scoreUpdated", {
      score: result.score,
      state: result.state,
      trend: result.trend,
      breakdown: result.breakdown,
    });

    // Emit to EventBus (for streak, distraction intel — EPHEMERAL, not stored)
    eventBus.emit("FOCUS_SCORE_TICK", { score: result.score, state: result.state });
  }

  private flushSnapshot() {
    if (!this.currentSessionId || this.signalBuffer.length === 0) return;

    // Average the last N signals into one snapshot row
    const avgScore = this.scoreBuffer.slice(-10).reduce((a, b) => a + b, 0) /
                     Math.min(this.scoreBuffer.length, 10);

    db.run(`
      INSERT INTO focus_aggregates
        (session_id, minute_index, avg_score, min_score, max_score,
         distraction_count, bypass_count, was_paused, avg_engagement, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '{}')
    `, [
      this.currentSessionId,
      Math.floor((Date.now() - sessionStartTime) / 60000),  // minute index
      avgScore,
      Math.min(...this.scoreBuffer.slice(-10)),
      Math.max(...this.scoreBuffer.slice(-10)),
      distractionIntelService.sessionAttempts(),
      distractionIntelService.sessionBypasses(),
      !timerService.isRunning() ? 1 : 0,
      engagementInjector.lastScore(),
    ]);
  }

  private computeFinalScore() {
    if (!this.currentSessionId || this.scoreBuffer.length === 0) return;
    const final = this.scoreBuffer.reduce((a, b) => a + b, 0) / this.scoreBuffer.length;
    db.run(`UPDATE sessions SET focus_score = ? WHERE id = ?`,
           [Math.round(final), this.currentSessionId]);
  }

  getCurrentScore(): ScoreResult {
    return this.currentScore;
  }
}

export const focusEngineService = new FocusEngineService();
```

**EventBus events:**
```
FOCUS_SCORE_TICK        { score, state }              → EPHEMERAL (not stored)
FOCUS_SCORE_UPDATED     { score, state, breakdown }   → EPHEMERAL (sent to renderer via IPC)
```

**IPC:**
```
focusEngine:getScore    {} → ScoreResult
focusEngine:getHistory  { sessionId } → focus_aggregates rows
```

---

### 4.5 Event Filtering Layer ✅ (Critical Fix — New Module)

**Problem it solves:** In v2.0, the replay service did `eventBus.on("*", storeEvent)`. Every single event — including FOCUS_SCORE_TICK (fired every 1 second), UI interactions, internal signals — would flood the DB with thousands of rows per hour, making the app progressively slower and the replay query unbearably heavy.

#### Event Classification Registry

Every event type is registered in the filter with a classification:

```typescript
// eventFilter.ts

export type EventClass =
  | 'REPLAY_RELEVANT'   // Written to session_events (replay timeline)
  | 'AGGREGATE_INPUT'   // Fed to aggregation pipeline
  | 'EPHEMERAL'         // In-memory only, never stored
  | 'BOTH';             // REPLAY_RELEVANT + AGGREGATE_INPUT

export const EVENT_CLASSIFICATIONS: Record<string, EventClass> = {

  // ── TIMER ──
  'SESSION_STARTED':          'BOTH',
  'SESSION_PAUSED':           'BOTH',
  'SESSION_RESUMED':          'BOTH',
  'SESSION_ENDED':            'BOTH',
  'POMODORO_CYCLE':           'REPLAY_RELEVANT',
  'TIMER_TICK':               'EPHEMERAL',         // ← Every 1s, NEVER stored

  // ── FOCUS ENGINE ──
  'FOCUS_SCORE_TICK':         'EPHEMERAL',         // ← Every 1s, NEVER stored
  'FOCUS_SCORE_UPDATED':      'EPHEMERAL',         // ← IPC broadcast, not stored

  // ── FOCUS MONITOR ──
  'FOCUS_LOST':               'BOTH',
  'FOCUS_RETURNED':           'BOTH',
  'APP_SWITCH_RESISTED':      'AGGREGATE_INPUT',
  'APP_SWITCH_ALLOWED':       'BOTH',

  // ── DISTRACTION ──
  'BROWSER_BLOCKED_URL':      'BOTH',
  'APP_BLOCKED_ATTEMPT':      'BOTH',
  'BYPASS_GRANTED':           'BOTH',
  'DISTRACTION_PATTERN_FOUND':'EPHEMERAL',         // Computed insight, not raw event

  // ── BROWSER ──
  'BROWSER_TAB_OPENED':       'REPLAY_RELEVANT',
  'BROWSER_TAB_CLOSED':       'AGGREGATE_INPUT',
  'BROWSER_TAB_SWITCHED':     'REPLAY_RELEVANT',
  'BROWSER_NAVIGATED':        'REPLAY_RELEVANT',
  'ENGAGEMENT_SIGNAL':        'EPHEMERAL',         // ← Every 1s from injected script
  'ENGAGEMENT_TYPE_CHANGED':  'REPLAY_RELEVANT',   // Shorts → Lecture transition (meaningful)

  // ── PDF ──
  'PDF_OPENED':               'REPLAY_RELEVANT',
  'PDF_CLOSED':               'AGGREGATE_INPUT',
  'PDF_PAGE_CHANGED':         'EPHEMERAL',         // Too frequent — never stored
  'PDF_ANNOTATED':            'REPLAY_RELEVANT',

  // ── WINDOW ──
  'FULLSCREEN_ENTERED':       'REPLAY_RELEVANT',
  'FULLSCREEN_EXITED':        'REPLAY_RELEVANT',

  // ── RECALL ──
  'RECALL_SUBMITTED':         'BOTH',
  'RECALL_SKIPPED':           'BOTH',
  'REVISION_RESOLVED':        'AGGREGATE_INPUT',

  // ── STREAK ──
  'STREAK_UPDATED':           'EPHEMERAL',
  'STREAK_MILESTONE':         'EPHEMERAL',

  // ── QUICK START ──
  'QUICK_START_TRIGGERED':    'REPLAY_RELEVANT',
};

export function isReplayRelevant(eventType: string): boolean {
  const cls = EVENT_CLASSIFICATIONS[eventType];
  return cls === 'REPLAY_RELEVANT' || cls === 'BOTH';
}

export function isAggregateInput(eventType: string): boolean {
  const cls = EVENT_CLASSIFICATIONS[eventType];
  return cls === 'AGGREGATE_INPUT' || cls === 'BOTH';
}

export function isEphemeral(eventType: string): boolean {
  return EVENT_CLASSIFICATIONS[eventType] === 'EPHEMERAL';
}
```

#### Replay Service (Fixed)

```typescript
// replay.service.ts  — FIXED version (replaces v2.0 wildcard listener)

import { eventBus } from "../../eventBus";
import { isReplayRelevant } from "../../eventFilter";
import { db } from "../../db/connection";

class ReplayService {
  private currentSessionId: number | null = null;

  init() {
    // Listen to ALL events but only store REPLAY_RELEVANT ones
    eventBus.on("*", (eventType: string, data: unknown) => {
      if (!this.currentSessionId) return;
      if (!isReplayRelevant(eventType)) return;   // ← THE FIX

      db.run(`
        INSERT INTO session_events (session_id, event_type, event_data, occurred_at)
        VALUES (?, ?, ?, ?)
      `, [this.currentSessionId, eventType, JSON.stringify(data), Date.now()]);
    });
  }

  setSession(sessionId: number) { this.currentSessionId = sessionId; }
  clearSession() { this.currentSessionId = null; }
}

export const replayService = new ReplayService();
```

**Result:** Instead of storing 3,600+ rows/hour (1 per second), the replay service stores only meaningful state transitions — typically 5–30 events per hour. DB stays lean. Replay queries are instant.

---

### 4.6 Distraction Intelligence Engine

**Tracks:** Every blocked app/URL attempt, with elapsed session time at time of attempt.

**Metrics:**
- Distraction Attempts/Hour (current session vs. your average)
- Distraction timeline (tick marks on session timeline)
- Pattern detection: 14-day bucket analysis
- Most-attempted blocked content

**Pattern Detection:**
```typescript
// distractionIntel.service.ts
function detectPatterns(attempts: DistractionAttempt[]): Pattern[] {
  // Group by elapsed_seconds bucket (every 5 min = 300s)
  const buckets: Record<number, number> = {};
  for (const a of attempts) {
    const bucket = Math.floor(a.elapsed_seconds / 300);
    buckets[bucket] = (buckets[bucket] || 0) + 1;
  }
  // Find buckets with 2+ std deviations above mean
  const avg = Object.values(buckets).reduce((a, b) => a + b, 0) / Object.keys(buckets).length;
  const std = Math.sqrt(Object.values(buckets).map(v => (v - avg) ** 2).reduce((a, b) => a + b, 0) / Object.keys(buckets).length);
  const hotBuckets = Object.entries(buckets).filter(([, v]) => v > avg + std * 1.5);

  return hotBuckets.map(([bucket]) => ({
    message: `You typically try to get distracted around ${Number(bucket) * 5}–${Number(bucket) * 5 + 5} minutes into a session`,
    confidence: Math.min(0.95, 0.5 + hotBuckets.length * 0.1),
  }));
}
```

**EventBus events:**
```
DISTRACTION_PATTERN_FOUND    { message, confidence }    → EPHEMERAL
```

---

### 4.7 Built-in Browser + Engagement Intelligence ✅ (Critical Upgrade)

**Problem it solves:** In v2.0, the browser only tracked domain + time. This gave zero signal quality information. A user watching a 2-hour physics lecture on YouTube got the same score as someone watching Shorts for 2 hours. This module fixes that.

#### Engagement Script Injector

After every tab navigation, a monitoring script is injected into the page's context:

```typescript
// engagementInjector.ts

const INJECTION_SCRIPT = `
(function() {
  if (window.__studyOSInjected) return;
  window.__studyOSInjected = true;

  let lastScrollY = window.scrollY;
  let lastScrollTime = Date.now();
  let scrollVelocity = 0;

  function detectContentType() {
    const path = location.pathname;
    const isYouTube = location.hostname.includes('youtube.com');

    return {
      isShorts: isYouTube && path.includes('/shorts'),
      isLecture: isYouTube && !path.includes('/shorts') && !!document.querySelector('video'),
      isYouTubeMusic: location.hostname.includes('music.youtube.com'),
      isAITool: ['claude.ai','chat.openai.com','gemini.google.com'].includes(location.hostname),
      isSearchPage: path === '/search' || path === '/results',
    };
  }

  function computeEngagementScore(payload) {
    let score = 50; // neutral baseline

    if (payload.isLecture && payload.videoProgressSeconds > 30) score += 30;
    if (payload.isAITool && payload.scrollVelocity > 0) score += 20;
    if (payload.isShorts) score -= 40;
    if (payload.scrollVelocity > 800) score -= 10;  // frantic scrolling = distracted
    if (payload.scrollVelocity === 0 && !payload.isLecture) score -= 15; // idle

    return Math.max(0, Math.min(100, score));
  }

  setInterval(() => {
    const now = Date.now();
    const scrollDelta = Math.abs(window.scrollY - lastScrollY);
    scrollVelocity = scrollDelta / ((now - lastScrollTime) / 1000);
    lastScrollY = window.scrollY;
    lastScrollTime = now;

    const video = document.querySelector('video');
    const contentType = detectContentType();

    const payload = {
      type: 'ENGAGEMENT_SIGNAL',
      url: location.href,
      scrollY: window.scrollY,
      scrollVelocity,
      videoCurrentTime: video ? video.currentTime : null,
      videoDuration: video ? video.duration : null,
      videoProgressSeconds: video ? video.currentTime : 0,
      isPaused: video ? video.paused : null,
      ...contentType,
    };

    payload.engagementScore = computeEngagementScore(payload);

    window.postMessage(payload, '*');
  }, 1000);
})();
`;

export class EngagementInjector {
  private lastPayload: EngagementPayload | null = null;
  private previousContentType: string | null = null;

  injectIntoView(view: Electron.BrowserView) {
    // Inject on load
    view.webContents.on("did-finish-load", () => {
      view.webContents.executeJavaScript(INJECTION_SCRIPT).catch(() => {
        // Silent fail — some pages block scripts (CSP). That's fine.
      });
    });

    // Receive messages from injected script
    view.webContents.on("ipc-message", (event, channel, payload) => {
      // Note: use preload bridge to receive postMessage safely
    });

    // Safer: use session.webRequest to intercept or use preload script
    // Recommended: use webContents.executeJavaScript polling instead
    this.startPolling(view);
  }

  private startPolling(view: Electron.BrowserView) {
    setInterval(async () => {
      try {
        const result = await view.webContents.executeJavaScript(`
          window.__studyOSLastPayload || null
        `);
        if (result) {
          const prevType = this.getContentTypeKey(this.lastPayload);
          this.lastPayload = result;
          const newType = this.getContentTypeKey(result);

          // Only emit to EventBus if content TYPE changed (not every tick)
          if (prevType !== newType) {
            eventBus.emit("ENGAGEMENT_TYPE_CHANGED", {
              from: prevType,
              to: newType,
              url: result.url,
            });
          }
          // NEVER emit ENGAGEMENT_SIGNAL to EventBus — it's EPHEMERAL
        }
      } catch { /* view may have navigated — safe to ignore */ }
    }, 1000);
  }

  private getContentTypeKey(payload: EngagementPayload | null): string {
    if (!payload) return 'unknown';
    if (payload.isShorts) return 'yt-shorts';
    if (payload.isLecture) return 'yt-lecture';
    if (payload.isYouTubeMusic) return 'yt-music';
    if (payload.isAITool) return 'ai-tool';
    return 'general';
  }

  lastScore(): number  { return this.lastPayload?.engagementScore ?? 50; }
  isShorts(): boolean  { return this.lastPayload?.isShorts ?? false; }
  isLecture(): boolean { return this.lastPayload?.isLecture ?? false; }
  videoTime(): number | null { return this.lastPayload?.videoCurrentTime ?? null; }
  scrollVelocity(): number { return this.lastPayload?.scrollVelocity ?? 0; }
}

export const engagementInjector = new EngagementInjector();
```

**Important security note for AI builder:**
The injection uses `executeJavaScript` polling rather than `postMessage` + IPC because Electron's content security policy can block cross-context messaging. Polling `window.__studyOSLastPayload` (set by the injected script) is more reliable. The injected script is sandboxed in the page context. It cannot access Electron APIs.

**EngagementBadge UI (shown in browser toolbar):**
```
[🎓 Lecture Mode]   — green, when isLecture = true
[⚡ Shorts Detected] — red pulse, when isShorts = true
[🎵 Music]           — blue, when isYouTubeMusic = true
[🤖 AI Tool]         — purple, when isAITool = true
```

**EventBus events:**
```
ENGAGEMENT_SIGNAL          → EPHEMERAL  (1/s from injected script — never stored)
ENGAGEMENT_TYPE_CHANGED    → REPLAY_RELEVANT  (only on meaningful content switch)
BROWSER_TAB_OPENED         → REPLAY_RELEVANT
BROWSER_TAB_SWITCHED       → REPLAY_RELEVANT
BROWSER_BLOCKED_URL        → BOTH
BYPASS_GRANTED             → BOTH
```

---

### 4.8 PDF Viewer (Sumatra-style)

Built with PDF.js. Philosophy: keyboard-first, zero clutter, fast, minimal.

**Layout:**
```
[Left Sidebar — toggleable B]    [Main Reading Area]
  📄 Thumbnails                    Continuous vertical scroll (default)
  🔖 Bookmarks                     OR page-by-page
  📑 Table of Contents             OR two-page spread
  🖊 Annotations list
```

**Toolbar:**
```
[📂 Open] [← →] [Page 12/240] [−  115%  +] [↔ Fit] [☾ Night] [📑] [⛶ Focus Read]
```

**All keyboard shortcuts:**
```
J/K or ↑↓:    Scroll          F:    Fit width
Space/Shift:  Page down/up    B:    Toggle sidebar
Ctrl+F:       Search          R:    Rotate
Ctrl+G:       Go to page      N:    Night mode
Ctrl++ / −:   Zoom            F11:  Focus read mode
Ctrl+D:       Bookmark page
```

**Annotation system:** Highlights + notes stored in SQLite per file hash. Never modifies original PDF.

**EventBus events (classifications):**
```
PDF_OPENED          → REPLAY_RELEVANT
PDF_CLOSED          → AGGREGATE_INPUT
PDF_PAGE_CHANGED    → EPHEMERAL           (too frequent to store)
PDF_ANNOTATED       → REPLAY_RELEVANT
```

---

### 4.9 Active Recall Engine ⭐

**Post-Session Prompt (modal — blocks close until action taken):**

Triggered after `SESSION_ENDED`. User must either submit or explicitly skip (with streak penalty).

Fields:
- 3× text inputs: "What did you learn?"
- 2× text inputs: "What are you still unsure about?"
- Subject tag dropdown
- Skip button (shows penalty: "−5 streak points")
- Save button

Learned items → stored in `recall_entries.learned` (JSON array)
Unsure items → stored in `recall_entries.questions` AND inserted into `revision_queue`

**Pre-Session Review Card:**

Before session start, if subject matches a previous recall entry, shows:
- Last session's learned points
- Unresolved questions (with "Go to queue" link)
- Age of last recall ("3 days ago")

**Revision Queue Panel:**
- Sorted: oldest unresolved first
- Per item: question text, subject, age, status
- Actions: Resolve (with optional note), Snooze 3/7/14 days, Archive
- Sidebar badge = count of unresolved items

**EventBus events:**
```
RECALL_SUBMITTED        → BOTH
RECALL_SKIPPED          → BOTH
REVISION_RESOLVED       → AGGREGATE_INPUT
```

---

### 4.10 Study Streak System

**Valid study day = ALL THREE met:**
1. ≥20 minutes actual study time (pause time excluded)
2. At least one session formally ended
3. Session's final `focus_score` ≥ 40

**TopBar badge:** `[🔥 6]` — amber flame + current streak count.

**StreakPanel:**
- Current streak + best streak
- Weekly grid (Mon–Sun) with ✅/⬜/🛡️ (grace)
- 90-day heatmap calendar
- Streak history log

**Grace Rule:** 1 grace day per 7-day streak. Two consecutive misses always breaks.

**Milestones:** 7, 14, 30, 60, 100-day toasts.

**EventBus events:**
```
STREAK_UPDATED          → EPHEMERAL
STREAK_BROKEN           → EPHEMERAL
STREAK_MILESTONE        → EPHEMERAL
```

---

### 4.11 Quick Start — Friction Killer

**One button. Zero decisions. Start studying immediately.**

QuickStart saves full session state on `SESSION_ENDED`:
```json
{
  "subject": "Physics",
  "mode": "pomodoro",
  "browser_tabs": [{ "url": "...", "title": "..." }],
  "last_pdf": { "path": "...", "page": 47, "zoom": 115 }
}
```

On Quick Start trigger:
1. Load last subject
2. Restore browser tabs
3. Open last PDF at last page
4. Start timer immediately

3 custom profiles supported (named, editable).

**EventBus events:**
```
QUICK_START_TRIGGERED   → REPLAY_RELEVANT
SESSION_STATE_SAVED     → EPHEMERAL
```

---

### 4.12 Study Replay Mode (Updated)

**Now uses event filter — not wildcard listener.**

The replay timeline is built by querying `session_events` (which only contains REPLAY_RELEVANT events — ~5–30 per hour, not 3,600+).

**Timeline visualization (SVG, horizontal):**
```
Physics — May 19 — 1h 23m

0:00         15:00         30:00         45:00         1:00:00       1:23:00
├────────────────⏸────────⏸──────────────────────────────⚠──────────┤
  🌐22m         🎓          🎓            📄 ch12.pdf     ⚠Discord
```

**Event marker types:**
- ⏸ Pause (manual or auto)
- ⚠ Distraction attempt
- 🌐 Tab switch
- 🎓 Content type change (e.g., Shorts → Lecture)
- 📄 PDF opened
- ⛶ Fullscreen entered/exited

**Clicking a marker expands to a detail card.**

**Summary card below timeline:**
```
Focus Score:         87/100 (Deep Focus)
Effective Study:     1h 16m
Pauses:              2 (total 7m)
Distraction Resisted: 1 (Discord — returned in 12s)
Most Active Tab:     Claude.ai (38m)
Content Type Trend:  [Lecture 45m] [AI Tool 38m] [Music 0m]
```

---

### 4.13 Session Analytics Dashboard

All analytics queries hit `focus_aggregates` and `daily_stats` tables — never raw event tables.

**Tabs:**

**Overview** — today's study time, sessions list, focus score sparkline, streak widget

**Focus Trends** — minute-by-minute focus score chart per session (from `focus_aggregates`), 7-day average trend

**Weekly/Monthly** — hours per day bar chart, heatmap calendar, longest session

**Distraction Report** — attempts/hour gauge, pattern detection insights, top blocked content

**Browser Intelligence** — time per domain + content type breakdown (lecture/shorts/AI/music), tab usage table

**Subject Breakdown** — hours + recall rate + revision queue count per subject

**Recall & Revision** — submission rate, resolution rate, oldest unresolved items

**Export** — CSV export (all tables), session summary PDF

---

### 4.14 Settings Panel

Sections (each is an independent component):

- **General** — startup behavior, default mode, default subject
- **Fullscreen & Window** — auto-fullscreen, taskbar hide, HUD position/opacity, always-on-top
- **Timer & Pomodoro** — all Pomodoro intervals, auto-start breaks, sound
- **Active Recall** — prompt toggle, min session length, skip penalty, pre-session review
- **Streak** — min study time, min focus score, grace days, milestones
- **Focus Engine** — view signal weights (read-only), reset calibration
- **Browser & Whitelist** — whitelist editor (patterns, import/export), default homepage, bypass limit
- **Blocklist** — app blocklist, process picker, sensitivity mode
- **Appearance** — accent color, font scale, sidebar mode, animations
- **Data & Privacy** — export ZIP, delete options, DB file path

---

## 5. Complete Database Schema

```sql
-- ═══════════════════════════════════════════════
-- CORE SESSIONS
-- ═══════════════════════════════════════════════

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
  focus_score          REAL,         -- final average, written by focusEngine on session end
  recall_submitted     BOOLEAN DEFAULT 0,
  fullscreen_used      BOOLEAN DEFAULT 0,
  quick_start_used     BOOLEAN DEFAULT 0,
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata             TEXT DEFAULT '{}'
);

-- ═══════════════════════════════════════════════
-- SESSION EVENTS (Replay Timeline)
-- Only REPLAY_RELEVANT events are stored here.
-- Ephemeral events (TIMER_TICK, FOCUS_SCORE_TICK, etc.) are NEVER written here.
-- Expected volume: 5–30 rows per hour of study.
-- ═══════════════════════════════════════════════

CREATE TABLE session_events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id   INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL,
  event_data   TEXT DEFAULT '{}',
  occurred_at  INTEGER NOT NULL,  -- Unix ms
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata     TEXT DEFAULT '{}'
);

CREATE INDEX idx_session_events_session ON session_events(session_id);
CREATE INDEX idx_session_events_occurred ON session_events(occurred_at);

-- ═══════════════════════════════════════════════
-- FOCUS AGGREGATES ✅ NEW
-- Written every 10s by focusEngine.service.ts
-- Each row = one ~10s window of a session.
-- Analytics queries this table, not raw events.
-- Expected volume: ~360 rows per hour of study.
-- ═══════════════════════════════════════════════

CREATE TABLE focus_aggregates (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id          INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  minute_index        INTEGER NOT NULL,   -- minutes since session start (0, 1, 2...)
  avg_score           REAL NOT NULL,
  min_score           REAL NOT NULL,
  max_score           REAL NOT NULL,
  score_state         TEXT,              -- 'deep' | 'focused' | 'distracted' | 'paused'
  distraction_count   INTEGER DEFAULT 0, -- cumulative at this point
  bypass_count        INTEGER DEFAULT 0,
  was_paused          BOOLEAN DEFAULT 0,
  avg_engagement      REAL DEFAULT 50,   -- from browser engagement signal
  active_domain       TEXT,             -- which domain was active at this snapshot
  content_type        TEXT,             -- 'yt-lecture' | 'yt-shorts' | 'ai-tool' | etc.
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata            TEXT DEFAULT '{}'
);

CREATE INDEX idx_fa_session ON focus_aggregates(session_id);
CREATE INDEX idx_fa_minute ON focus_aggregates(session_id, minute_index);

-- ═══════════════════════════════════════════════
-- DAILY STATS ✅ NEW
-- Written by aggregator.ts at session end and nightly.
-- One row per calendar day.
-- Analytics dashboard reads ONLY this table for day-level queries.
-- ═══════════════════════════════════════════════

CREATE TABLE daily_stats (
  date                  TEXT PRIMARY KEY,  -- YYYY-MM-DD
  total_study_seconds   INTEGER DEFAULT 0,
  total_sessions        INTEGER DEFAULT 0,
  avg_focus_score       REAL DEFAULT 0,
  min_focus_score       REAL DEFAULT 0,
  max_focus_score       REAL DEFAULT 0,
  total_distraction_attempts INTEGER DEFAULT 0,
  total_bypasses        INTEGER DEFAULT 0,
  total_pause_seconds   INTEGER DEFAULT 0,
  recall_submitted      BOOLEAN DEFAULT 0,
  streak_valid          BOOLEAN DEFAULT 0,
  top_subject           TEXT,
  top_domain            TEXT,
  total_lecture_seconds INTEGER DEFAULT 0,
  total_shorts_seconds  INTEGER DEFAULT 0,
  total_aitool_seconds  INTEGER DEFAULT 0,
  updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata              TEXT DEFAULT '{}'
);

-- ═══════════════════════════════════════════════
-- PAUSES
-- ═══════════════════════════════════════════════

CREATE TABLE pauses (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id       INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  reason           TEXT CHECK(reason IN ('manual','focus_lost','blocked_app','pomodoro_break','fullscreen_exit')),
  app_name         TEXT,
  paused_at        DATETIME NOT NULL,
  resumed_at       DATETIME,
  duration_seconds INTEGER,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata         TEXT DEFAULT '{}'
);

CREATE INDEX idx_pauses_session ON pauses(session_id);

-- ═══════════════════════════════════════════════
-- DISTRACTION ATTEMPTS
-- ═══════════════════════════════════════════════

CREATE TABLE distraction_attempts (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id            INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
  type                  TEXT NOT NULL CHECK(type IN ('app','url')),
  target                TEXT NOT NULL,
  domain                TEXT,
  elapsed_seconds       INTEGER,
  was_bypassed          BOOLEAN DEFAULT 0,
  user_returned_seconds INTEGER,
  attempted_at          DATETIME NOT NULL,
  created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata              TEXT DEFAULT '{}'
);

CREATE INDEX idx_distraction_session ON distraction_attempts(session_id);
CREATE INDEX idx_distraction_target  ON distraction_attempts(target);
CREATE INDEX idx_distraction_elapsed ON distraction_attempts(elapsed_seconds);

-- ═══════════════════════════════════════════════
-- BROWSER TABS
-- ═══════════════════════════════════════════════

CREATE TABLE tab_sessions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id      INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
  tab_id          TEXT NOT NULL,
  url             TEXT NOT NULL,
  domain          TEXT NOT NULL,
  title           TEXT,
  opened_at       DATETIME NOT NULL,
  closed_at       DATETIME,
  active_seconds  INTEGER DEFAULT 0,
  visit_count     INTEGER DEFAULT 1,
  was_pinned      BOOLEAN DEFAULT 0,
  content_type    TEXT,   -- final content type at close ('yt-lecture','yt-shorts',etc.)
  lecture_seconds INTEGER DEFAULT 0,
  shorts_seconds  INTEGER DEFAULT 0,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata        TEXT DEFAULT '{}'
);

CREATE INDEX idx_tab_session ON tab_sessions(session_id);
CREATE INDEX idx_tab_domain  ON tab_sessions(domain);

-- ═══════════════════════════════════════════════
-- PDF SESSIONS + STATE + ANNOTATIONS
-- ═══════════════════════════════════════════════

CREATE TABLE pdf_sessions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id      INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
  file_path       TEXT NOT NULL,
  file_path_hash  TEXT NOT NULL,
  file_name       TEXT NOT NULL,
  total_pages     INTEGER,
  opened_at       DATETIME NOT NULL,
  closed_at       DATETIME,
  time_seconds    INTEGER DEFAULT 0,
  pages_visited   TEXT DEFAULT '[]',
  max_page        INTEGER DEFAULT 1,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata        TEXT DEFAULT '{}'
);

CREATE TABLE pdf_state (
  file_path_hash  TEXT PRIMARY KEY,
  file_path       TEXT NOT NULL,
  last_page       INTEGER DEFAULT 1,
  zoom_level      INTEGER DEFAULT 100,
  sidebar_open    BOOLEAN DEFAULT 1,
  last_opened     DATETIME,
  metadata        TEXT DEFAULT '{}'
);

CREATE TABLE pdf_annotations (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path_hash TEXT NOT NULL,
  page_number    INTEGER NOT NULL,
  type           TEXT NOT NULL CHECK(type IN ('bookmark','highlight','note')),
  content        TEXT,
  position_data  TEXT DEFAULT '{}',
  color          TEXT DEFAULT '#F5A623',
  is_archived    BOOLEAN DEFAULT 0,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata       TEXT DEFAULT '{}'
);

CREATE INDEX idx_annotation_file ON pdf_annotations(file_path_hash);

-- ═══════════════════════════════════════════════
-- ACTIVE RECALL
-- ═══════════════════════════════════════════════

CREATE TABLE recall_entries (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id   INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  subject      TEXT NOT NULL,
  learned      TEXT NOT NULL DEFAULT '[]',
  questions    TEXT NOT NULL DEFAULT '[]',
  was_skipped  BOOLEAN DEFAULT 0,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
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
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata        TEXT DEFAULT '{}'
);

CREATE INDEX idx_revision_status  ON revision_queue(status);
CREATE INDEX idx_revision_subject ON revision_queue(subject);
CREATE INDEX idx_revision_snooze  ON revision_queue(snooze_until);

-- ═══════════════════════════════════════════════
-- STREAKS
-- ═══════════════════════════════════════════════

CREATE TABLE streak_days (
  date          TEXT PRIMARY KEY,
  is_valid      BOOLEAN DEFAULT 0,
  study_seconds INTEGER DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  focus_score   REAL DEFAULT 0,
  grace_used    BOOLEAN DEFAULT 0,
  recall_done   BOOLEAN DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata      TEXT DEFAULT '{}'
);

CREATE TABLE streak_history (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  start_date   TEXT NOT NULL,
  end_date     TEXT,
  length_days  INTEGER DEFAULT 0,
  reason_ended TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata     TEXT DEFAULT '{}'
);

-- ═══════════════════════════════════════════════
-- QUICK START STATE
-- ═══════════════════════════════════════════════

CREATE TABLE quick_start_state (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_name TEXT NOT NULL DEFAULT 'default',
  subject      TEXT,
  mode         TEXT DEFAULT 'pomodoro',
  browser_tabs TEXT DEFAULT '[]',
  last_pdf     TEXT DEFAULT '{}',
  whitelist_preset TEXT,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata     TEXT DEFAULT '{}'
);

-- ═══════════════════════════════════════════════
-- SETTINGS
-- ═══════════════════════════════════════════════

CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  section    TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

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

```
═══════════════════════════════════════════════════════════════
RENDERER → MAIN (ipcMain.handle — awaitable)
═══════════════════════════════════════════════════════════════

TIMER
  timer:start                { subject, mode, duration? }
  timer:pause                { reason }
  timer:resume               {}
  timer:end                  {}
  timer:getState             {}

WINDOW
  window:enterFullscreen     {}
  window:exitFullscreen      {}
  window:setAlwaysOnTop      { value: boolean }

FOCUS ENGINE  ✅
  focusEngine:getScore       {}                         → ScoreResult
  focusEngine:getHistory     { sessionId }             → focus_aggregates[]
  focusEngine:getBreakdown   {}                         → SignalBreakdown

BROWSER
  browser:newTab             { url? }
  browser:closeTab           { tabId }
  browser:navigate           { tabId, url }
  browser:switchTab          { tabId }
  browser:reorderTabs        { orderedTabIds: string[] }
  browser:pinTab             { tabId, pinned: boolean }
  browser:addToWhitelist     { url }
  browser:requestBypass      { url }
  browser:getEngagement      { tabId }                 → EngagementPayload

PDF
  pdf:open                   { filePath }
  pdf:close                  { filePath }
  pdf:saveState              { filePathHash, page, zoom, sidebarOpen }
  pdf:getState               { filePathHash }
  pdf:saveAnnotation         { annotation }
  pdf:deleteAnnotation       { annotationId }
  pdf:getAnnotations         { filePathHash }
  pdf:openDialog             {}

ACTIVE RECALL
  recall:submit              { sessionId, learned: string[], questions: string[] }
  recall:skip                { sessionId }
  recall:getQueue            {}
  recall:resolveItem         { itemId, note? }
  recall:snoozeItem          { itemId, days: number }
  recall:getPreSession       { subject }

STREAK
  streak:getState            {}
  streak:getHistory          {}
  streak:getCalendar         { months: number }

QUICK START
  quickstart:trigger         { profileId?: string }
  quickstart:saveProfile     { profileId, config }
  quickstart:getProfiles     {}
  quickstart:getState        {}

SESSION REPLAY
  replay:getTimeline         { sessionId }             → session_events[]
  replay:getSummary          { sessionId }             → ReplaySummary

ANALYTICS
  analytics:getDaily         { date: string }          → queries daily_stats
  analytics:getWeekly        { startDate: string }     → queries daily_stats
  analytics:getFocusTrend    { sessionId }             → queries focus_aggregates
  analytics:getTabReport     { sessionId? }            → queries tab_sessions
  analytics:getDistraction   { period }                → queries distraction_attempts
  analytics:getRecallStats   {}
  analytics:exportCsv        {}

SETTINGS
  settings:get               { key }
  settings:getAll            {}
  settings:set               { key, value }
  settings:setMany           { pairs: {key, value}[] }
  settings:reset             { key? }

BLOCKLIST / WHITELIST
  blocklist:get              {}
  blocklist:add              { processName }
  blocklist:remove           { processName }
  whitelist:get              {}
  whitelist:add              { pattern }
  whitelist:remove           { pattern }
  whitelist:toggle           { pattern, enabled }
  whitelist:importJson       { json }
  whitelist:exportJson       {}

═══════════════════════════════════════════════════════════════
MAIN → RENDERER (webContents.send — fire and forget)
═══════════════════════════════════════════════════════════════

TIMER
  timer:tick                 { elapsed, state, pomodoroPhase?, cycleNumber? }
  timer:autoPaused           { reason, appName? }
  timer:cycleComplete        { type: 'work'|'break', next }

FOCUS ENGINE  ✅
  focusEngine:scoreUpdated   { score, state, trend, breakdown }   ← every 1s

WINDOW
  window:fullscreenChanged   { isFullscreen }

BROWSER
  browser:siteBlocked        { url, domain }
  browser:tabsUpdated        { tabs: TabState[] }
  browser:bypassGranted      { url }
  browser:engagementChanged  { tabId, contentType, score }        ← on type change only

FOCUS MONITOR
  focus:warning              { appName, processName }
  focus:returned             { appName, awaySeconds }

DISTRACTION INTEL
  distraction:patternFound   { message, confidence }

RECALL
  recall:promptReady         { sessionId, sessionSummary }
  recall:preSessionReady     { subject, lastRecall, queueCount }

STREAK
  streak:updated             { current, best, todayValid, graceUsed }
  streak:broken              { previous }
  streak:milestone           { days }

NOTIFICATIONS
  toast:show                 { message, type, duration? }
```

---

## 7. Data Pipeline Architecture ✅ (New Section)

This section explains how data flows from raw events to analytics, without causing performance collapse.

```
RAW SIGNALS (1s tick)
│
│  Timer state, focusMonitor, browser engagement,
│  distraction counters — all in-memory
│
▼
FOCUS ENGINE (1s compute cycle)
│
│  Collects signals → runs scoreFormula → currentScore
│  Sends to renderer via IPC (focusEngine:scoreUpdated)
│
▼
SNAPSHOT BUFFER (in-memory, last 60 ticks)
│
│  scoreBuffer[], signalBuffer[] — rolling window
│
▼ (every 10s)
FOCUS_AGGREGATES TABLE
│
│  One row per ~10s window
│  avg_score, content_type, domain, distraction_count
│  ~360 rows per hour — manageable
│
▼ (on SESSION_ENDED)
AGGREGATOR JOB
│
│  Reads focus_aggregates for this session
│  Reads tab_sessions, distraction_attempts, pauses
│  Computes daily_stats row (upsert by date)
│  Updates sessions.focus_score (final average)
│
▼
DAILY_STATS TABLE
│
│  One row per calendar day
│  Pre-computed totals, averages, top subject, etc.
│
▼
ANALYTICS QUERIES (UI)
│
│  Dashboard reads daily_stats → instant
│  Focus trend reads focus_aggregates → fast (indexed)
│  Replay reads session_events → fast (5–30 rows/hour)
│  Raw tables (distraction_attempts, tab_sessions) only
│  queried for specific deep-dives, not overview dashboards
```

#### Aggregator Job (runs at session end + nightly at 00:05)

```typescript
// db/aggregator.ts

export async function aggregateSession(sessionId: number): Promise<void> {
  const session = db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(sessionId);
  const date = session.started_at.split('T')[0]; // YYYY-MM-DD

  // Compute from focus_aggregates
  const focusStats = db.prepare(`
    SELECT
      AVG(avg_score) as avg_score,
      MIN(min_score) as min_score,
      MAX(max_score) as max_score,
      SUM(CASE WHEN content_type = 'yt-lecture' THEN 10 ELSE 0 END) as lecture_seconds,
      SUM(CASE WHEN content_type = 'yt-shorts' THEN 10 ELSE 0 END) as shorts_seconds,
      SUM(CASE WHEN content_type = 'ai-tool' THEN 10 ELSE 0 END) as aitool_seconds
    FROM focus_aggregates WHERE session_id = ?
  `).get(sessionId);

  // Upsert daily_stats
  db.prepare(`
    INSERT INTO daily_stats
      (date, total_study_seconds, total_sessions, avg_focus_score,
       min_focus_score, max_focus_score, total_distraction_attempts,
       total_bypasses, total_pause_seconds, recall_submitted,
       lecture_seconds, shorts_seconds, aitool_seconds)
    VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      total_study_seconds       = total_study_seconds + excluded.total_study_seconds,
      total_sessions            = total_sessions + 1,
      avg_focus_score           = (avg_focus_score * total_sessions + excluded.avg_focus_score) / (total_sessions + 1),
      total_distraction_attempts= total_distraction_attempts + excluded.total_distraction_attempts,
      total_bypasses            = total_bypasses + excluded.total_bypasses,
      total_pause_seconds       = total_pause_seconds + excluded.total_pause_seconds,
      recall_submitted          = recall_submitted OR excluded.recall_submitted,
      lecture_seconds           = lecture_seconds + excluded.lecture_seconds,
      shorts_seconds            = shorts_seconds + excluded.shorts_seconds,
      aitool_seconds            = aitool_seconds + excluded.aitool_seconds,
      updated_at                = CURRENT_TIMESTAMP
  `).run(
    date,
    session.actual_seconds,
    focusStats.avg_score,
    focusStats.min_score,
    focusStats.max_score,
    session.distraction_attempts,
    session.bypass_count,
    session.pause_total_seconds,
    session.recall_submitted,
    focusStats.lecture_seconds,
    focusStats.shorts_seconds,
    focusStats.aitool_seconds,
  );
}
```

---

## 8. Plugin/Extension Architecture

Adding a new feature = adding a new module folder. The pattern:

**Step 1 — main module:**
```typescript
// main/modules/myFeature/myFeature.service.ts
import { eventBus } from "../../eventBus";
import { isReplayRelevant, isAggregateInput } from "../../eventFilter";  // ✅ Use filter

export class MyFeatureService {
  init() {
    eventBus.on("SESSION_STARTED", this.onSessionStart.bind(this));
    // Only emit events if they add meaningful info
    // Register new event types in eventFilter.ts
  }
}
```

**Step 2 — Register in eventFilter.ts:**
```typescript
// Add your new event types with correct classification
'MY_FEATURE_IMPORTANT_EVENT':  'REPLAY_RELEVANT',
'MY_FEATURE_TICK':             'EPHEMERAL',         // if fired frequently
```

**Step 3 — IPC, renderer store, UI components, DB table** (see v2.0 template)

**Step 4 — Register in main.ts + App.tsx** (2 lines total)

---

## 9. Build Phases (Week-by-Week)

### Phase 1 — Foundation (Week 1–2)
- [ ] Electron + React + TypeScript + Vite boilerplate
- [ ] SQLite (`better-sqlite3`), run schema.sql, insert default settings
- [ ] **EventBus** implementation (eventemitter3, main + renderer)
- [ ] **EventFilter** (`eventFilter.ts`) with full classification registry
- [ ] AppShell: Sidebar, TopBar, UI slot system
- [ ] Design tokens: CSS variables, font loading
- [ ] Shared components: Button, Modal, Toast, Badge, Tooltip
- [ ] Typed IPC bridge

### Phase 2 — Timer + Session Core (Week 2–3)
- [ ] TimerDisplay, SessionControls, SubjectPicker components
- [ ] Timer IPC + timerStore (Zustand)
- [ ] Session lifecycle events on EventBus
- [ ] Pomodoro cycle logic
- [ ] Session saved to DB on `SESSION_ENDED`
- [ ] Keyboard shortcuts: Space, Esc

### Phase 3 — Fullscreen Mode (Week 3)
- [ ] `windowManager.ts` — setFullScreen, setAlwaysOnTop
- [ ] FullscreenHUD component (floating, fade-on-idle)
- [ ] F11 shortcut
- [ ] Fullscreen events on EventBus (classified in eventFilter)
- [ ] Auto-fullscreen setting

### Phase 4 — App Blocker + Focus Monitor (Week 4)
- [ ] `processDetector.ts` — PowerShell foreground window poll
- [ ] `focusMonitor.service.ts` — 1500ms polling loop
- [ ] App switch confirmation overlay
- [ ] Pauses logged to DB
- [ ] FOCUS_LOST / FOCUS_RETURNED events (BOTH classification)
- [ ] "Welcome back" toast

### Phase 5 — Focus Engine (Week 4–5) ✅
- [ ] `signalCollector.ts` — all signal sources
- [ ] `scoreFormula.ts` — pure function, fully unit-tested
- [ ] `focusEngine.service.ts` — 1s tick, 10s snapshot, session start/stop
- [ ] DB writes to `focus_aggregates` every 10s
- [ ] Final score write to `sessions.focus_score` on end
- [ ] `FocusScoreWidget.tsx` — live score in TopBar
- [ ] `FocusBreakdown.tsx` — expandable breakdown panel
- [ ] `focusEngine:scoreUpdated` IPC event

### Phase 6 — Event Filtering + Replay (Week 5) ✅
- [ ] Verify `eventFilter.ts` covers all events emitted so far
- [ ] `replay.service.ts` — filtered listener (not wildcard)
- [ ] Verify DB insert count is ~5–30 rows/hour (not 3600+)
- [ ] `ReplayTimeline.tsx` — SVG horizontal timeline
- [ ] Event marker components
- [ ] Replay summary card

### Phase 7 — Distraction Intelligence (Week 5–6)
- [ ] `distraction_attempts` insert on every blocked event
- [ ] Session counters in `distractionIntelService`
- [ ] Pattern detection algorithm
- [ ] DistractionInsights panel
- [ ] PatternAlert pre-session component

### Phase 8 — Built-in Browser + Engagement Intelligence (Week 6–7) ✅
- [ ] BrowserView management in main process
- [ ] Tab lifecycle (open, close, switch, pin, reorder)
- [ ] TabBar UI + AddressBar
- [ ] URL whitelist interceptor
- [ ] BlockedSiteOverlay + bypass request flow
- [ ] Google account persistent partition
- [ ] Tab active-seconds ticker (pauses with session timer)
- [ ] **`engagementInjector.ts`** — script injection + polling
- [ ] `EngagementBadge.tsx` — content type indicator in toolbar
- [ ] Engagement data fed to `focusEngine.signalCollector`
- [ ] `ENGAGEMENT_TYPE_CHANGED` event (REPLAY_RELEVANT)
- [ ] Whitelist manager in settings

### Phase 9 — PDF Viewer (Week 7–8)
- [ ] PDF.js integration
- [ ] File open dialog via IPC
- [ ] Continuous scroll viewer
- [ ] Toolbar + sidebar (thumbnails, TOC, bookmarks, annotations)
- [ ] PDF state persistence per file hash
- [ ] Annotation system
- [ ] Night mode + Focus Read mode
- [ ] Full keyboard shortcut set
- [ ] Recent files list

### Phase 10 — Active Recall Engine (Week 8) ⭐
- [ ] Post-session recall modal
- [ ] Skip with penalty logic (integrates with streak module)
- [ ] Data saved to `recall_entries` + `revision_queue`
- [ ] RevisionQueue panel
- [ ] Pre-session review card
- [ ] Sidebar badge (unresolved count)
- [ ] RecallSettings section

### Phase 11 — Data Aggregation Pipeline (Week 8–9) ✅
- [ ] `aggregator.ts` — `aggregateSession()` function
- [ ] Wire to `SESSION_ENDED` event
- [ ] Nightly aggregation job (scheduled at 00:05)
- [ ] `daily_stats` upsert logic
- [ ] Verify analytics dashboard only queries `daily_stats` + `focus_aggregates`
- [ ] Performance test: query times with 90 days of data

### Phase 12 — Streak System (Week 9)
- [ ] `streak_days` population from `daily_stats`
- [ ] Validity check (time + focus + ended formally)
- [ ] Grace day logic
- [ ] StreakBadge in TopBar
- [ ] StreakPanel + HeatmapCalendar
- [ ] Milestone toasts
- [ ] StreakSettings section

### Phase 13 — Quick Start (Week 9–10)
- [ ] State save on `SESSION_ENDED`
- [ ] QuickStartButton with preview
- [ ] Tab restore on trigger
- [ ] PDF restore at exact page
- [ ] 3 custom profiles

### Phase 14 — Analytics Dashboard (Week 10–11)
- [ ] Overview tab (reads `daily_stats`)
- [ ] Focus Trends tab (reads `focus_aggregates`)
- [ ] Weekly/Monthly charts (reads `daily_stats`)
- [ ] Distraction Report tab
- [ ] Browser Intelligence tab (content type breakdown)
- [ ] Subject Breakdown tab
- [ ] Recall & Revision tab
- [ ] Export CSV

### Phase 15 — Settings, Polish & Release (Week 11–12)
- [ ] All settings sections
- [ ] Sound system (Howler.js)
- [ ] Windows startup registry entry
- [ ] App icon + tray icon
- [ ] electron-builder installer config
- [ ] React error boundaries
- [ ] DB crash recovery (backup on startup)
- [ ] Memory audit (target: <300MB idle, <500MB with browser open)
- [ ] First-run onboarding wizard
- [ ] Edge cases: orphaned sessions, corrupted DB, PDF not found

---

## 10. Key Libraries & Tools

| Purpose | Library |
|---|---|
| Desktop framework | `electron` |
| UI | `react` + `typescript` + `vite` |
| State | `zustand` |
| Database | `better-sqlite3` |
| EventBus | `eventemitter3` |
| PDF rendering | `pdfjs-dist` |
| Charts | `recharts` |
| Sound | `howler.js` |
| Date utils | `date-fns` |
| Foreground window | PowerShell via `child_process` |
| Build/installer | `electron-builder` |
| Styling | CSS Modules + CSS custom properties |

---

## 11. AI Builder Prompting Guide

### Master System Prompt

```
You are building a Windows desktop app called StudyOS using Electron.js, React, and TypeScript.

ARCHITECTURE RULES (never violate):
1. All feature logic in main/modules/<feature>/. Self-contained. No cross-module imports.
2. All UI in renderer/modules/<feature>/. Mirrors main structure.
3. Cross-feature communication ONLY through EventBus (eventemitter3). Never direct imports.
4. All renderer state in Zustand slices. Never use localStorage.
5. All persistence through SQLite (better-sqlite3). Never write to files directly.
6. All main/renderer communication via typed IPC only.
7. Every new event type MUST be registered in eventFilter.ts with a classification.
8. EPHEMERAL events (fired every 1s) are NEVER written to the DB.
9. Analytics queries ONLY hit daily_stats and focus_aggregates — never raw event tables.
10. Every DB table has: created_at, updated_at, metadata TEXT DEFAULT '{}'.

FOCUS ENGINE RULES:
- focusEngine.service.ts runs a 1s tick (signalCollector → scoreFormula → emit IPC)
- It writes to focus_aggregates every 10s
- It writes sessions.focus_score once at session end
- scoreFormula.ts is a pure function — no side effects, fully testable
- FOCUS_SCORE_TICK is classified EPHEMERAL — never stored in DB

EVENT FILTER RULES:
- replay.service.ts listens to eventBus("*") but calls isReplayRelevant() before every DB write
- Expected session_events volume: 5–30 rows/hour (not 3600+)
- Any new event type added must be added to EVENT_CLASSIFICATIONS in eventFilter.ts

DESIGN SYSTEM:
- Background: #0D0F14 / #13161E / #1A1E2A
- Accents: #00D4AA (primary), #4F8EF7 (browser), #A78BFA (recall), #F5A623 (warning), #E05A5A (danger), #F59E0B (streak)
- Fonts: JetBrains Mono (timer/data), Sora (headings), DM Sans (body)
- Spacing: 8px base unit

CURRENT SCHEMA: [paste schema.sql]
CURRENT IPC MAP: [paste relevant section]
CURRENT EVENT CLASSIFICATIONS: [paste eventFilter.ts]
```

### Phase Prompt Template (Focus Engine)

```
Build the Focus Engine module for StudyOS.

Files to create:
1. main/modules/focusEngine/signalCollector.ts
   - collectSignals() returns FocusSignals interface
   - Pulls from: timerService.isRunning(), focusMonitorService.isInForeground(),
     engagementInjector.lastScore(), distractionIntelService.sessionAttempts(), etc.
   - All service references are injected (no direct imports — use service registry pattern)

2. main/modules/focusEngine/scoreFormula.ts
   - computeFocusScore(signals: FocusSignals, previousScores: number[]): ScoreResult
   - Pure function — no imports, no side effects
   - Returns: { score, state, breakdown, trend }
   - Implement the penalty/bonus formula from the spec

3. main/modules/focusEngine/focusEngine.service.ts
   - Manages 1s tick (collect → compute → emit IPC)
   - Manages 10s snapshot (average last 10 scores → INSERT into focus_aggregates)
   - start(sessionId), stop() methods
   - stop() flushes final snapshot and updates sessions.focus_score
   - FOCUS_SCORE_TICK is emitted to eventBus as EPHEMERAL (do NOT store in DB)

4. main/modules/focusEngine/focusEngine.ipc.ts
   - focusEngine:getScore → returns current ScoreResult
   - focusEngine:getHistory { sessionId } → returns focus_aggregates rows

5. renderer/modules/focusEngine/FocusScoreWidget.tsx
   - Displayed in TopBar, always visible
   - Shows: score number (JetBrains Mono), colored ring (cyan/orange/red by score)
   - Listens to focusEngine:scoreUpdated IPC
   - Click expands FocusBreakdown popover

6. renderer/modules/focusEngine/focusEngineStore.ts
   - Zustand slice: currentScore, state, trend, breakdown

Follow all architecture rules. Register all new events in eventFilter.ts.
```

---

## 12. Future Features Roadmap

Designed to plug into the existing architecture — no existing code needs modification:

**v2.1 — AI Study Assistant**
Module: `aiAssistant` — floating Claude API chat aware of your current PDF page, subject, recent recall entries. Generates practice questions from revision queue.

**v2.2 — Smart Session Goals**
Module: `sessionGoals` — set page/problem/time goals before session. Goal progress shown in HUD. Connects to PDF page tracking + timer events.

**v2.3 — Markdown Notes**
Module: `notes` — markdown editor alongside PDF/browser. Notes linked to session + subject + PDF page. Search. Export to `.md`.

**v2.4 — Webcam Focus Detection**
Module: `webcamFocus` — MediaPipe Face Mesh in a WebWorker. Emits FOCUS_LOST when face absent for 30s. Integrates with existing pause system and focus engine (new signal: `faceDetected: boolean`).

**v2.5 — Mobile Companion (Local Network)**
Module: `companionServer` — Express.js reads `daily_stats` and streams via WebSocket. Mobile browser sees live session + streak + recent replay.

**v2.6 — Focus Score Calibration**
Module: `focusCalibration` — after 30 sessions, analyze user's score distribution. Auto-adjust formula weights per user. E.g., if a user always scrolls fast but studies well, reduce `scrollVelocity` penalty weight.

**v2.7 — Hard Block Mode (Opt-in)**
Module: `hardBlock` — Windows filter driver (requires admin). Actually prevents blocked apps from launching. Uninstalls cleanly on app uninstall.

---

*StudyOS v2.1 — Four critical engineering failures fixed. One coherent system.*
