/**
 * Event Filtering Layer (v2.1 Critical Fix)
 * Classifies all events to prevent DB flooding.
 * EPHEMERAL events (fired every 1s) are NEVER stored.
 */

export type EventClass = 'REPLAY_RELEVANT' | 'AGGREGATE_INPUT' | 'EPHEMERAL' | 'BOTH'

export const EVENT_CLASSIFICATIONS: Record<string, EventClass> = {
  // Timer
  'SESSION_STARTED':          'BOTH',
  'SESSION_PAUSED':           'BOTH',
  'SESSION_RESUMED':          'BOTH',
  'SESSION_ENDED':            'BOTH',
  'POMODORO_CYCLE':           'REPLAY_RELEVANT',
  'TIMER_TICK':               'EPHEMERAL',

  // Focus Engine
  'FOCUS_SCORE_TICK':         'EPHEMERAL',
  'FOCUS_SCORE_UPDATED':      'EPHEMERAL',

  // Focus Monitor
  'FOCUS_LOST':               'BOTH',
  'FOCUS_RETURNED':           'BOTH',
  'APP_SWITCH_RESISTED':      'AGGREGATE_INPUT',
  'APP_SWITCH_ALLOWED':       'BOTH',

  // Distraction
  'BROWSER_BLOCKED_URL':      'BOTH',
  'APP_BLOCKED_ATTEMPT':      'BOTH',
  'BYPASS_GRANTED':           'BOTH',
  'DISTRACTION_PATTERN_FOUND':'EPHEMERAL',

  // Browser
  'BROWSER_TAB_OPENED':       'REPLAY_RELEVANT',
  'BROWSER_TAB_CLOSED':       'AGGREGATE_INPUT',
  'BROWSER_TAB_SWITCHED':     'REPLAY_RELEVANT',
  'BROWSER_NAVIGATED':        'REPLAY_RELEVANT',
  'ENGAGEMENT_SIGNAL':        'EPHEMERAL',
  'ENGAGEMENT_TYPE_CHANGED':  'REPLAY_RELEVANT',

  // PDF
  'PDF_OPENED':               'REPLAY_RELEVANT',
  'PDF_CLOSED':               'AGGREGATE_INPUT',
  'PDF_PAGE_CHANGED':         'EPHEMERAL',
  'PDF_ANNOTATED':            'REPLAY_RELEVANT',

  // Window
  'FULLSCREEN_ENTERED':       'REPLAY_RELEVANT',
  'FULLSCREEN_EXITED':        'REPLAY_RELEVANT',

  // Recall
  'RECALL_SUBMITTED':         'BOTH',
  'RECALL_SKIPPED':           'BOTH',
  'REVISION_RESOLVED':        'AGGREGATE_INPUT',

  // Streak
  'STREAK_UPDATED':           'EPHEMERAL',
  'STREAK_MILESTONE':         'EPHEMERAL',
  'STREAK_BROKEN':            'EPHEMERAL',

  // Quick Start
  'QUICK_START_TRIGGERED':    'REPLAY_RELEVANT',
  'SESSION_STATE_SAVED':      'EPHEMERAL',

  // App lifecycle
  'APP_STARTED':              'EPHEMERAL',
}

export function isReplayRelevant(eventType: string): boolean {
  const cls = EVENT_CLASSIFICATIONS[eventType]
  return cls === 'REPLAY_RELEVANT' || cls === 'BOTH'
}

export function isAggregateInput(eventType: string): boolean {
  const cls = EVENT_CLASSIFICATIONS[eventType]
  return cls === 'AGGREGATE_INPUT' || cls === 'BOTH'
}

export function isEphemeral(eventType: string): boolean {
  return EVENT_CLASSIFICATIONS[eventType] === 'EPHEMERAL'
}
