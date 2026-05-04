import EventEmitter from 'eventemitter3'

/**
 * Renderer-side EventBus — mirrors the main process EventBus.
 * Used for intra-renderer communication between modules.
 */
class RendererEventBus extends EventEmitter {
  emit(event: string, data?: Record<string, unknown>): boolean {
    console.log(`[Renderer EventBus] ${event}`, data ?? '')
    return super.emit(event, data)
  }
}

export const rendererEventBus = new RendererEventBus()
