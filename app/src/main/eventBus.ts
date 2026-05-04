import EventEmitter from 'eventemitter3'

/**
 * Central EventBus for the main process.
 * All inter-module communication flows through here.
 * Features subscribe to events they care about — no direct imports between modules.
 */
class StudyOSEventBus extends EventEmitter {
  emit(event: string, data?: Record<string, unknown>): boolean {
    console.log(`[EventBus] ${event}`, data ?? '')
    return super.emit(event, data)
  }
}

export const eventBus = new StudyOSEventBus()
