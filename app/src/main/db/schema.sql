-- StudyOS Database Schema v2.1
-- ═══════════════════════════════════════════════
-- CORE SESSIONS
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sessions (
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
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata             TEXT DEFAULT '{}'
);

-- ═══════════════════════════════════════════════
-- SESSION EVENTS (Replay Timeline — only REPLAY_RELEVANT)
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS session_events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id   INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL,
  event_data   TEXT DEFAULT '{}',
  occurred_at  INTEGER NOT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata     TEXT DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_session_events_session ON session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_session_events_occurred ON session_events(occurred_at);

-- ═══════════════════════════════════════════════
-- FOCUS AGGREGATES (written every 10s by Focus Engine)
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS focus_aggregates (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id          INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  minute_index        INTEGER NOT NULL,
  avg_score           REAL NOT NULL,
  min_score           REAL NOT NULL,
  max_score           REAL NOT NULL,
  score_state         TEXT,
  distraction_count   INTEGER DEFAULT 0,
  bypass_count        INTEGER DEFAULT 0,
  was_paused          BOOLEAN DEFAULT 0,
  avg_engagement      REAL DEFAULT 50,
  active_domain       TEXT,
  content_type        TEXT,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata            TEXT DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_fa_session ON focus_aggregates(session_id);
CREATE INDEX IF NOT EXISTS idx_fa_minute ON focus_aggregates(session_id, minute_index);

-- ═══════════════════════════════════════════════
-- DAILY STATS (one row per day — analytics reads this)
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS daily_stats (
  date                       TEXT PRIMARY KEY,
  total_study_seconds        INTEGER DEFAULT 0,
  total_sessions             INTEGER DEFAULT 0,
  avg_focus_score            REAL DEFAULT 0,
  min_focus_score            REAL DEFAULT 0,
  max_focus_score            REAL DEFAULT 0,
  total_distraction_attempts INTEGER DEFAULT 0,
  total_bypasses             INTEGER DEFAULT 0,
  total_pause_seconds        INTEGER DEFAULT 0,
  recall_submitted           BOOLEAN DEFAULT 0,
  streak_valid               BOOLEAN DEFAULT 0,
  top_subject                TEXT,
  top_domain                 TEXT,
  total_lecture_seconds       INTEGER DEFAULT 0,
  total_shorts_seconds        INTEGER DEFAULT 0,
  total_aitool_seconds        INTEGER DEFAULT 0,
  updated_at                 DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata                   TEXT DEFAULT '{}'
);

-- ═══════════════════════════════════════════════
-- PAUSES
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pauses (
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

CREATE INDEX IF NOT EXISTS idx_pauses_session ON pauses(session_id);

-- ═══════════════════════════════════════════════
-- DISTRACTION ATTEMPTS
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS distraction_attempts (
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

CREATE INDEX IF NOT EXISTS idx_distraction_session ON distraction_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_distraction_target  ON distraction_attempts(target);
CREATE INDEX IF NOT EXISTS idx_distraction_elapsed ON distraction_attempts(elapsed_seconds);

-- ═══════════════════════════════════════════════
-- BROWSER TABS
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tab_sessions (
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
  content_type    TEXT,
  lecture_seconds INTEGER DEFAULT 0,
  shorts_seconds  INTEGER DEFAULT 0,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata        TEXT DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_tab_session ON tab_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_tab_domain  ON tab_sessions(domain);

-- ═══════════════════════════════════════════════
-- PDF
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pdf_sessions (
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

CREATE TABLE IF NOT EXISTS pdf_state (
  file_path_hash  TEXT PRIMARY KEY,
  file_path       TEXT NOT NULL,
  last_page       INTEGER DEFAULT 1,
  zoom_level      INTEGER DEFAULT 100,
  sidebar_open    BOOLEAN DEFAULT 1,
  last_opened     DATETIME,
  metadata        TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS pdf_annotations (
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

CREATE INDEX IF NOT EXISTS idx_annotation_file ON pdf_annotations(file_path_hash);

-- ═══════════════════════════════════════════════
-- ACTIVE RECALL
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS recall_entries (
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

CREATE TABLE IF NOT EXISTS revision_queue (
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

CREATE INDEX IF NOT EXISTS idx_revision_status  ON revision_queue(status);
CREATE INDEX IF NOT EXISTS idx_revision_subject ON revision_queue(subject);
CREATE INDEX IF NOT EXISTS idx_revision_snooze  ON revision_queue(snooze_until);

-- ═══════════════════════════════════════════════
-- STREAKS
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS streak_days (
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

CREATE TABLE IF NOT EXISTS streak_history (
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

CREATE TABLE IF NOT EXISTS quick_start_state (
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
-- WHITELIST / BLOCKLIST
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS whitelist (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern  TEXT NOT NULL UNIQUE,
  enabled  BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO whitelist (pattern) VALUES
  ('*.google.com'),('*.wikipedia.org'),('*.stackoverflow.com'),
  ('*.github.com'),('*.claude.ai'),('*.openai.com'),
  ('*.youtube.com'),('*.docs.google.com'),('*.drive.google.com'),
  ('*.scholar.google.com'),('*.arxiv.org'),('*.khanacademy.org'),
  ('*.coursera.org'),('*.edx.org'),('*.wolframalpha.com');

CREATE TABLE IF NOT EXISTS blocklist (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  process_name TEXT NOT NULL UNIQUE,
  enabled      BOOLEAN DEFAULT 1,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO blocklist (process_name) VALUES
  ('discord'),('steam'),('epicgameslauncher'),('slack'),
  ('telegram'),('whatsapp'),('spotify');

-- ═══════════════════════════════════════════════
-- SETTINGS
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS settings (
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
  ('browser.defaultHomepage',         '"https://www.google.com"', 'browser'),
  ('browser.bypassLimitPerSession',   '0',                'browser'),
  ('general.launchOnStartup',         'false',            'general'),
  ('general.autoStartSession',        'false',            'general');
